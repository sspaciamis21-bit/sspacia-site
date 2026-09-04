import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

async function verifySuperAdmin(userId: number): Promise<boolean> {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: { select: { name: true } }
    }
  });
  if (!dbUser) return false;
  const roleName = (dbUser.role?.name || '').toLowerCase();
  return (
    roleName === 'admin' ||
    roleName === 'super_admin' ||
    roleName === 'super-admin' ||
    roleName === 'super admin'
  );
}

// PUT /api/admin/executive-expenses/[id] — Update an existing executive expense entry
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    const payload = await requireAuth();
    if (!payload || (!payload.id && !(payload as any).userId)) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const userId = Number(payload.id || (payload as any).userId);
    const isSuperAdmin = await verifySuperAdmin(userId);
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const resolvedParams = await params;
    const id = Number(resolvedParams.id);
    if (!id || isNaN(id)) {
      return NextResponse.json({ error: 'Invalid expense ID' }, { status: 400 });
    }

    const body = await req.json();
    const {
      title,
      locationId,
      category,
      amount,
      isProvisional,
      expenseDate,
      paymentMode,
      referenceNo,
      vendorPayee,
      notes
    } = body;

    const parsedAmount = Number(amount);
    const parsedLocationId = locationId && locationId !== 'ALL' && locationId !== 'GLOBAL' ? Number(locationId) : null;
    const parsedCategory = category || 'MISCELLANEOUS';
    const parsedProvisional = Boolean(isProvisional);
    const parsedDate = expenseDate ? new Date(expenseDate) : new Date();

    await prisma.$executeRawUnsafe(
      `UPDATE \`ExecutiveExpense\` SET \`title\` = ?, \`locationId\` = ?, \`category\` = ?, \`amount\` = ?, \`isProvisional\` = ?, \`expenseDate\` = ?, \`paymentMode\` = ?, \`referenceNo\` = ?, \`vendorPayee\` = ?, \`notes\` = ?, \`updatedAt\` = NOW() WHERE \`id\` = ?`,
      title.trim(),
      parsedLocationId,
      parsedCategory,
      parsedAmount,
      parsedProvisional ? 1 : 0,
      parsedDate,
      paymentMode || 'Bank Transfer',
      referenceNo || '',
      vendorPayee || '',
      notes || '',
      id
    );

    return NextResponse.json({
      success: true,
      message: 'Executive expense entry updated successfully.'
    });
  } catch (error: any) {
    console.error('[EXECUTIVE_EXPENSES_PUT_ERROR]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update executive expense entry' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/executive-expenses/[id] — Delete an executive expense entry
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    const payload = await requireAuth();
    if (!payload || (!payload.id && !(payload as any).userId)) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const userId = Number(payload.id || (payload as any).userId);
    const isSuperAdmin = await verifySuperAdmin(userId);
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const resolvedParams = await params;
    const id = Number(resolvedParams.id);
    if (!id || isNaN(id)) {
      return NextResponse.json({ error: 'Invalid expense ID' }, { status: 400 });
    }

    await prisma.$executeRawUnsafe(
      `DELETE FROM \`ExecutiveExpense\` WHERE \`id\` = ?`,
      id
    );

    return NextResponse.json({
      success: true,
      message: 'Executive expense entry deleted successfully.'
    });
  } catch (error: any) {
    console.error('[EXECUTIVE_EXPENSES_DELETE_ERROR]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete executive expense entry' },
      { status: 500 }
    );
  }
}
