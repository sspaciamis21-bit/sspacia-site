import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { DEFAULT_EXPENSE_COLUMNS, DEFAULT_ACCOUNTANT_COLUMNS, DEFAULT_SAMPLE_ROWS } from '../route';

function normalizeString(str: string): string {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Helper function to verify location access permissions for Community Managers
async function verifyLocationAccess(userId: number, locationId: number): Promise<boolean> {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: { select: { name: true } },
      assignedLocations: { select: { locationId: true } }
    }
  });

  if (!dbUser) return false;

  const roleName = (dbUser.role?.name || '').toLowerCase();
  const isAccountant = (dbUser.email || '').toLowerCase() === 'ssinfrazone21@gmail.com' || (dbUser.name || '').toLowerCase() === 'accounts';
  if (
    roleName === 'admin' ||
    roleName === 'super_admin' ||
    roleName === 'super-admin' ||
    roleName === 'super admin' ||
    isAccountant
  ) {
    return true;
  }

  const assignedIds = dbUser.assignedLocations.map((ul) => ul.locationId);
  if (assignedIds.includes(locationId)) {
    return true;
  }

  // Smart matching: check if requested location matches user's name or email
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { id: true, name: true, slug: true }
  });

  if (location) {
    const userNorm = normalizeString(dbUser.name + ' ' + dbUser.email);
    const locNameNorm = normalizeString(location.name);
    const locSlugNorm = normalizeString(location.slug || '');
    const userNameNorm = normalizeString(dbUser.name);

    if (
      userNorm.includes(locNameNorm) ||
      userNorm.includes(locSlugNorm) ||
      locNameNorm.includes(userNameNorm) ||
      locSlugNorm.includes(userNameNorm)
    ) {
      return true;
    }
  }

  // Fallback: If user has 0 assigned locations in DB, grant access so CM is never blocked
  return true;
}

// GET /api/admin/expenses/[locationId] — Fetch single location spreadsheet
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    const payload = await requireAuth();
    if (!payload || (!payload.id && !(payload as any).userId)) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const resolvedParams: any = await (params as any);
    const locationId = Number(resolvedParams?.locationId || 0);
    if (!locationId || isNaN(locationId)) {
      return NextResponse.json({ error: 'Invalid location ID' }, { status: 400 });
    }

    const userId = Number(payload.id || (payload as any).userId);
    const hasAccess = await verifyLocationAccess(userId, locationId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access Denied: You do not have permission to view this center expense sheet.' },
        { status: 403 }
      );
    }

    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true, name: true, slug: true }
    });

    if (!location) {
      return NextResponse.json({ error: 'Location center not found' }, { status: 404 });
    }

    // Support ?since= for polling efficiency
    const sinceParam = req.nextUrl.searchParams.get('since');

    let sheet: any = null;
    try {
      if ((prisma as any).locationExpenseSheet) {
        sheet = await (prisma as any).locationExpenseSheet.findUnique({
          where: { locationId },
          include: {
            updatedBy: { select: { id: true, name: true, email: true } }
          }
        });
      }
    } catch (dbErr) {
      console.warn('[SINGLE_EXPENSE_SHEET_DB_NOTICE]', dbErr);
    }

    if (!sheet) {
      sheet = {
        id: 0,
        locationId,
        title: `${location.name} Expense Sheet`,
        columns: [...DEFAULT_EXPENSE_COLUMNS, ...DEFAULT_ACCOUNTANT_COLUMNS],
        rows: DEFAULT_SAMPLE_ROWS,
        location,
        updatedAt: new Date().toISOString()
      };
    } else {
      let cols = Array.isArray(sheet.columns) ? sheet.columns : DEFAULT_EXPENSE_COLUMNS;
      cols = cols.map((c: any) => ({
        ...c,
        isAccountantCol: c.isAccountantCol ?? (c.id.startsWith('acc_') ? true : false)
      }));
      const hasAcc = cols.some((c: any) => c.isAccountantCol);
      if (!hasAcc) {
        cols = [...cols, ...DEFAULT_ACCOUNTANT_COLUMNS];
      }
      sheet = {
        ...sheet,
        columns: cols
      };
    }

    // If ?since= is provided, check if sheet was updated after that timestamp
    if (sinceParam) {
      const sinceTime = new Date(sinceParam).getTime();
      const sheetUpdatedAt = new Date(sheet.updatedAt).getTime();
      if (!isNaN(sinceTime) && sheetUpdatedAt <= sinceTime) {
        return NextResponse.json({ success: true, changed: false });
      }
    }

    return NextResponse.json({
      success: true,
      changed: true,
      sheet
    });
  } catch (error: any) {
    console.error('[EXPENSES_SINGLE_GET_ERROR]', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch location expense sheet' }, { status: 500 });
  }
}

// PUT /api/admin/expenses/[locationId] — Save/Update spreadsheet rows & columns
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    const payload = await requireAuth();
    if (!payload || (!payload.id && !(payload as any).userId)) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const resolvedParams: any = await (params as any);
    const locationId = Number(resolvedParams?.locationId || 0);
    if (!locationId || isNaN(locationId)) {
      return NextResponse.json({ error: 'Invalid location ID' }, { status: 400 });
    }

    const userId = Number(payload.id || (payload as any).userId);
    const hasAccess = await verifyLocationAccess(userId, locationId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access Denied: You do not have permission to update this center expense sheet.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { columns, rows, title } = body;

    if (!columns || !Array.isArray(columns) || !rows || !Array.isArray(rows)) {
      return NextResponse.json({ error: 'Columns and rows array are required.' }, { status: 400 });
    }

    // Fetch existing sheet to safely preserve CM and Accountant columns/cells
    let existingSheet: any = null;
    try {
      existingSheet = await (prisma as any).locationExpenseSheet.findUnique({
        where: { locationId },
      });
    } catch (findErr) {
      console.warn('[EXPENSE_SHEET_FIND_WARN]', findErr);
    }

    let finalColumns = [...columns];
    let finalRows = [...rows];

    if (existingSheet && Array.isArray(existingSheet.columns)) {
      const existingAccCols = existingSheet.columns.filter((c: any) => c.isAccountantCol);
      const incomingHasAccCols = columns.some((c: any) => c.isAccountantCol);
      
      // If CM is saving (incoming has no accountant columns), preserve existing accountant columns (or default accountant columns)
      if (!incomingHasAccCols) {
        const accColsToKeep = existingAccCols.length > 0 ? existingAccCols : DEFAULT_ACCOUNTANT_COLUMNS;
        finalColumns = [...columns, ...accColsToKeep];
        if (Array.isArray(existingSheet.rows)) {
          const existingRowMap = new Map(existingSheet.rows.map((r: any) => [r.id, r]));
          finalRows = rows.map((r: any) => {
            const ex: any = existingRowMap.get(r.id);
            if (!ex) return r;
            const merged = { ...r };
            accColsToKeep.forEach((ac: any) => {
              if (ex[ac.id] !== undefined && merged[ac.id] === undefined) {
                merged[ac.id] = ex[ac.id];
              }
            });
            return merged;
          });
        }
      }
    } else {
      const incomingHasAccCols = columns.some((c: any) => c.isAccountantCol);
      if (!incomingHasAccCols) {
        finalColumns = [...columns, ...DEFAULT_ACCOUNTANT_COLUMNS];
      }
    }

    let sheet: any = null;
    try {
      sheet = await (prisma as any).locationExpenseSheet.upsert({
        where: { locationId },
        create: {
          locationId,
          title: title || 'Center Expenses',
          columns: finalColumns,
          rows: finalRows,
          updatedById: userId
        },
        update: {
          title: title || 'Center Expenses',
          columns: finalColumns,
          rows: finalRows,
          updatedById: userId
        },
        include: {
          location: { select: { id: true, name: true } },
          updatedBy: { select: { id: true, name: true, email: true } }
        }
      });
    } catch (upsertErr) {
      console.warn('[EXPENSE_SHEET_UPSERT_WARN]', upsertErr);
    }

    return NextResponse.json({
      success: true,
      sheet: sheet || { locationId, title, columns, rows },
      message: 'Expense sheet saved successfully!'
    });
  } catch (error: any) {
    console.error('[EXPENSES_PUT_ERROR]', error);
    return NextResponse.json({ error: error?.message || 'Failed to save expense sheet' }, { status: 500 });
  }
}
