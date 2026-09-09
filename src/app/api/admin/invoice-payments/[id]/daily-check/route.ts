import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';
import { getNodeScopedUserIds } from '@/lib/auth/getNodeScopedUserIds';

export interface DailyPaymentCheckEntry {
  date: string; // YYYY-MM-DD
  status: 'YES' | 'NO';
  checkedById: number | null;
  checkedByName: string;
  checkedByEmail: string;
  checkedAt: string;
  remarks?: string | null;
}

// POST /api/admin/invoice-payments/[id]/daily-check — Record or update everyday payment check (Yes/No)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    let userId: number | null = null;
    let userName = 'Accountant';
    let userEmail = '';
    let isAdmin = false;
    let isAccountant = false;

    if (token) {
      const payload = await verifyToken(token);
      if (payload?.id) {
        userId = Number(payload.id);
        const role = String(payload.role || '').toUpperCase().replace(/[\s_-]/g, '');

        const dbUser = await (prisma as any).user.findUnique({
          where: { id: userId },
          select: {
            name: true,
            email: true,
            role: { select: { name: true } },
          },
        });

        if (dbUser) {
          userName = dbUser.name || 'Accountant';
          userEmail = dbUser.email || '';
          const roleName = (dbUser.role?.name || '').toUpperCase().replace(/[\s_-]/g, '');
          isAdmin = roleName === 'ADMIN' || roleName === 'SUPERADMIN';
          isAccountant =
            (dbUser.email || '').toLowerCase() === 'ssinfrazone21@gmail.com' ||
            (dbUser.name || '').toLowerCase() === 'accounts' ||
            roleName === 'ACCOUNTS' ||
            roleName === 'ACCOUNTANT';
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: rawId } = await params;
    const invoiceId = parseInt(rawId, 10);
    if (isNaN(invoiceId)) {
      return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
    }

    // Node scoping verification for non-admins / non-accountants
    if (!isAdmin && !isAccountant) {
      const scopedUserIds = await getNodeScopedUserIds(userId);
      if (scopedUserIds !== null) {
        const checkOwnership = await (prisma as any).invoiceRecord.findFirst({
          where: {
            id: invoiceId,
            OR: [
              { createdById: { in: scopedUserIds } },
              { clientMaster: { createdById: { in: scopedUserIds } } },
            ],
          },
        });
        if (!checkOwnership) {
          return NextResponse.json(
            { error: 'Unauthorized access to this invoice node' },
            { status: 403 }
          );
        }
      }
    }

    const body = await request.json();
    const { date, status, remarks } = body;

    if (!date || typeof date !== 'string') {
      return NextResponse.json({ error: 'Date is required (YYYY-MM-DD)' }, { status: 400 });
    }

    const normalizedStatus = String(status || '').toUpperCase();
    if (normalizedStatus !== 'YES' && normalizedStatus !== 'NO') {
      return NextResponse.json({ error: 'Status must be YES or NO' }, { status: 400 });
    }

    // Fetch existing invoice
    const existing = await (prisma as any).invoiceRecord.findUnique({
      where: { id: invoiceId },
      select: { id: true, dailyChecksJson: true, companyName: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    let checks: DailyPaymentCheckEntry[] = [];
    if (existing.dailyChecksJson) {
      try {
        const parsed = JSON.parse(existing.dailyChecksJson);
        if (Array.isArray(parsed)) checks = parsed;
      } catch {
        checks = [];
      }
    }

    const targetDate = date.trim().split('T')[0];
    const newEntry: DailyPaymentCheckEntry = {
      date: targetDate,
      status: normalizedStatus as 'YES' | 'NO',
      checkedById: userId,
      checkedByName: userName,
      checkedByEmail: userEmail,
      checkedAt: new Date().toISOString(),
      remarks: remarks?.trim() || null,
    };

    // Find and update existing check for this date or prepend new one
    const existingIndex = checks.findIndex((c) => c.date === targetDate);
    if (existingIndex >= 0) {
      checks[existingIndex] = newEntry;
    } else {
      checks.unshift(newEntry);
    }

    // Sort descending by date
    checks.sort((a, b) => b.date.localeCompare(a.date));

    const updatedChecksJson = JSON.stringify(checks);

    await (prisma as any).invoiceRecord.update({
      where: { id: invoiceId },
      data: {
        dailyChecksJson: updatedChecksJson,
      },
    });

    return NextResponse.json({
      success: true,
      invoiceId,
      dailyChecksJson: updatedChecksJson,
      updatedEntry: newEntry,
    });
  } catch (error: any) {
    console.error('Error saving daily payment check:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/invoice-payments/[id]/daily-check?date=YYYY-MM-DD
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    let userId: number | null = null;
    let isAdmin = false;
    let isAccountant = false;

    if (token) {
      const payload = await verifyToken(token);
      if (payload?.id) {
        userId = Number(payload.id);
        const dbUser = await (prisma as any).user.findUnique({
          where: { id: userId },
          select: { role: { select: { name: true } }, email: true, name: true },
        });

        if (dbUser) {
          const roleName = (dbUser.role?.name || '').toUpperCase().replace(/[\s_-]/g, '');
          isAdmin = roleName === 'ADMIN' || roleName === 'SUPERADMIN';
          isAccountant =
            (dbUser.email || '').toLowerCase() === 'ssinfrazone21@gmail.com' ||
            (dbUser.name || '').toLowerCase() === 'accounts' ||
            roleName === 'ACCOUNTS' ||
            roleName === 'ACCOUNTANT';
        }
      }
    }

    if (!userId || (!isAdmin && !isAccountant)) {
      return NextResponse.json({ error: 'Unauthorized to delete check' }, { status: 401 });
    }

    const { id: rawId } = await params;
    const invoiceId = parseInt(rawId, 10);
    const { searchParams } = new URL(request.url);
    const dateToDelete = searchParams.get('date');

    if (!dateToDelete) {
      return NextResponse.json({ error: 'Date query param is required' }, { status: 400 });
    }

    const existing = await (prisma as any).invoiceRecord.findUnique({
      where: { id: invoiceId },
      select: { id: true, dailyChecksJson: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    let checks: DailyPaymentCheckEntry[] = [];
    if (existing.dailyChecksJson) {
      try {
        const parsed = JSON.parse(existing.dailyChecksJson);
        if (Array.isArray(parsed)) checks = parsed;
      } catch {}
    }

    checks = checks.filter((c) => c.date !== dateToDelete);
    const updatedChecksJson = JSON.stringify(checks);

    await (prisma as any).invoiceRecord.update({
      where: { id: invoiceId },
      data: {
        dailyChecksJson: updatedChecksJson,
      },
    });

    return NextResponse.json({
      success: true,
      invoiceId,
      dailyChecksJson: updatedChecksJson,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
