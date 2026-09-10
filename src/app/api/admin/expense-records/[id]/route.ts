import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

const ACCOUNTANT_EMAIL = 'ssinfrazone21@gmail.com';

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;

  try {
    const payload = await verifyToken(token);
    if (!payload?.id) return null;

    const user = await prisma.user.findUnique({
      where: { id: Number(payload.id) },
      include: {
        role: true,
        assignedLocations: true,
      },
    });

    return user;
  } catch {
    return null;
  }
}

// GET /api/admin/expense-records/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const recordId = parseInt(id, 10);
    if (isNaN(recordId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const record = await prisma.expenseRecord.findUnique({
      where: { id: recordId },
      include: {
        location: { select: { id: true, name: true } },
      },
    });

    if (!record) {
      return NextResponse.json({ error: 'Expense record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error('[EXPENSE_RECORD_GET_ONE]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch expense record' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/expense-records/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roleName = user.role?.name?.toUpperCase() || '';
    const userEmail = user.email.toLowerCase();
    const isSuperAdmin = roleName === 'SUPER_ADMIN' || roleName === 'ADMIN';
    const isAccountant =
      roleName === 'ACCOUNTANT' ||
      roleName === 'ACCOUNTS' ||
      userEmail === ACCOUNTANT_EMAIL ||
      user.name.toLowerCase() === 'accounts';

    const { id } = await params;
    const recordId = parseInt(id, 10);
    if (isNaN(recordId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const existing = await prisma.expenseRecord.findUnique({
      where: { id: recordId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Expense record not found' }, { status: 404 });
    }

    const body = await request.json();
    const updateData: any = {};

    // Fields that can be updated
    if (body.locationId !== undefined) {
      const locId = Number(body.locationId);
      updateData.location = { connect: { id: locId } };
      const loc = await prisma.location.findUnique({
        where: { id: locId },
        select: { name: true },
      });
      if (loc) updateData.locationName = loc.name;
    }

    if (body.expenseDate !== undefined) {
      updateData.expenseDate = new Date(body.expenseDate);
    }
    if (body.expenseDateStr !== undefined) {
      updateData.expenseDateStr = body.expenseDateStr;
    }
    if (body.category !== undefined) {
      updateData.category = body.category ? body.category.trim().toUpperCase() : 'GENERAL EXPENSE';
    }
    if (body.description !== undefined) {
      updateData.description = body.description.trim();
    }
    if (body.amount !== undefined) {
      updateData.amount = parseFloat(String(body.amount)) || 0;
    }
    if (body.paymentMode !== undefined) {
      updateData.paymentMode = body.paymentMode;
    }
    if (body.receiptNo !== undefined) {
      updateData.receiptNo = body.receiptNo ? body.receiptNo.trim() : null;
    }
    if (body.attachmentUrl !== undefined) {
      updateData.attachmentUrl = body.attachmentUrl || null;
    }
    if (body.remarks !== undefined) {
      updateData.remarks = body.remarks ? body.remarks.trim() : null;
    }
    if (body.vendorId !== undefined) {
      updateData.vendorId = body.vendorId ? Number(body.vendorId) : null;
    }
    if (body.vendorName !== undefined) {
      updateData.vendorName = body.vendorName ? body.vendorName.trim() : null;
    }

    // Vendor Bill Fields
    if (body.accountNo !== undefined) {
      updateData.accountNo = body.accountNo ? String(body.accountNo).trim() : null;
    }
    if (body.quantity !== undefined) {
      updateData.quantity = body.quantity !== null ? parseFloat(String(body.quantity)) : 1;
    }
    if (body.unit !== undefined) {
      updateData.unit = body.unit ? String(body.unit).trim() : 'Nos';
    }
    if (body.rate !== undefined) {
      updateData.rate = body.rate !== null ? parseFloat(String(body.rate)) : null;
    }
    if (body.invoiceUrl !== undefined) {
      updateData.invoiceUrl = body.invoiceUrl || null;
    }
    if (body.paymentProofUrl !== undefined) {
      updateData.paymentProofUrl = body.paymentProofUrl || null;
    }
    if (body.uploadedInBankPortal !== undefined) {
      updateData.uploadedInBankPortal = Boolean(body.uploadedInBankPortal);
    }
    if (body.approvalStatus !== undefined) {
      updateData.approvalStatus = body.approvalStatus;
    }
    if (body.approvalRemarks !== undefined) {
      updateData.approvalRemarks = body.approvalRemarks ? String(body.approvalRemarks).trim() : null;
    }

    // Accountant Settlement Fields
    if (body.payReceiveDate !== undefined) {
      updateData.payReceiveDate = body.payReceiveDate ? String(body.payReceiveDate).trim() : null;
    }
    if (body.receiveAmount !== undefined) {
      updateData.receiveAmount = body.receiveAmount ? parseFloat(String(body.receiveAmount)) : null;
    }
    if (body.accPaymentMode !== undefined) {
      updateData.accPaymentMode = body.accPaymentMode || null;
    }
    if (body.utrNumber !== undefined) {
      updateData.utrNumber = body.utrNumber ? String(body.utrNumber).trim() : null;
    }

    // Auto-sync UTR date to payReceiveDate if payReceiveDate changed and utrDate is not explicitly different
    if (body.utrDate !== undefined) {
      updateData.utrDate = body.utrDate ? String(body.utrDate).trim() : null;
    } else if (updateData.payReceiveDate && !existing.utrDate) {
      updateData.utrDate = updateData.payReceiveDate;
    }

    if (body.utrFileUrl !== undefined) {
      updateData.utrFileUrl = body.utrFileUrl || null;
    }
    if (body.tdsDeducted !== undefined) {
      updateData.tdsDeducted = body.tdsDeducted || 'No';
    }
    if (body.tdsAmount !== undefined) {
      updateData.tdsAmount = body.tdsAmount ? parseFloat(String(body.tdsAmount)) : null;
    }

    // Determine status
    if (body.paymentStatus !== undefined) {
      updateData.paymentStatus = body.paymentStatus;
    } else {
      const finalUtr = updateData.utrNumber !== undefined ? updateData.utrNumber : existing.utrNumber;
      const finalPayDate = updateData.payReceiveDate !== undefined ? updateData.payReceiveDate : existing.payReceiveDate;
      const isSettled = Boolean(finalUtr || finalPayDate);
      updateData.paymentStatus = isSettled ? 'PAID' : 'PENDING';
    }

    const updated = await (prisma as any).expenseRecord.update({
      where: { id: recordId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Expense record updated successfully',
    });
  } catch (error: any) {
    console.error('[EXPENSE_RECORD_PUT]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update expense record' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/expense-records/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roleName = user.role?.name?.toUpperCase() || '';
    const isSuperAdmin = roleName === 'SUPER_ADMIN' || roleName === 'ADMIN';

    const { id } = await params;
    const recordId = parseInt(id, 10);
    if (isNaN(recordId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const existing = await prisma.expenseRecord.findUnique({
      where: { id: recordId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Expense record not found' }, { status: 404 });
    }

    // Check permission: Super Admin or creator
    if (!isSuperAdmin && existing.createdById !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this expense record' },
        { status: 403 }
      );
    }

    await prisma.expenseRecord.delete({
      where: { id: recordId },
    });

    return NextResponse.json({
      success: true,
      message: 'Expense record deleted successfully',
    });
  } catch (error: any) {
    console.error('[EXPENSE_RECORD_DELETE]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete expense record' },
      { status: 500 }
    );
  }
}
