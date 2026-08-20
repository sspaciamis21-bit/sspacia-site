import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Helper: verify location access (same logic as parent route)
function normalizeString(str: string): string {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

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
  if (
    roleName === 'admin' ||
    roleName === 'super_admin' ||
    roleName === 'super-admin' ||
    roleName === 'super admin'
  ) {
    return true;
  }

  const assignedIds = dbUser.assignedLocations.map((ul) => ul.locationId);
  if (assignedIds.includes(locationId)) {
    return true;
  }

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

  return true;
}

// PATCH /api/admin/expenses/[locationId]/cell — Merge-save a single cell
export async function PATCH(
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
    const { rowId, colId, value, cells } = body;

    // Fetch existing sheet
    let sheet: any = null;
    try {
      sheet = await (prisma as any).locationExpenseSheet.findUnique({
        where: { locationId },
      });
    } catch (e) {
      console.error('[CELL_PATCH_FIND_ERROR]', e);
    }

    if (!sheet) {
      return NextResponse.json({ error: 'Expense sheet not found for this location' }, { status: 404 });
    }

    let existingRows: any[] = Array.isArray(sheet.rows) ? [...sheet.rows] : [];

    // Support batch cell updates: cells = [{ rowId, colId, value }]
    const updates = cells && Array.isArray(cells) ? cells : [{ rowId, colId, value }];

    for (const update of updates) {
      if (!update.rowId || !update.colId) continue;

      const rowIndex = existingRows.findIndex((r: any) => r.id === update.rowId);
      if (rowIndex !== -1) {
        // Merge: only update the specific cell
        existingRows[rowIndex] = {
          ...existingRows[rowIndex],
          [update.colId]: update.value !== undefined ? update.value : '',
        };
      } else {
        // Row doesn't exist yet — add it
        existingRows.push({
          id: update.rowId,
          [update.colId]: update.value !== undefined ? update.value : '',
        });
      }
    }

    // Write back the merged rows
    const updatedSheet = await (prisma as any).locationExpenseSheet.update({
      where: { locationId },
      data: {
        rows: existingRows,
        updatedById: userId,
      },
    });

    return NextResponse.json({
      success: true,
      updatedAt: updatedSheet.updatedAt,
    });
  } catch (error: any) {
    console.error('[CELL_PATCH_ERROR]', error);
    return NextResponse.json({ error: error?.message || 'Failed to save cell' }, { status: 500 });
  }
}
