import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { onOffSAApproval } from '@/lib/expense-approval-config';

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

    // Check permissions if editing base expense attributes (description, amount, date, payment mode, receipt)
    const isEditingBaseExpense =
      body.description !== undefined ||
      body.amount !== undefined ||
      body.expenseDate !== undefined ||
      body.paymentMode !== undefined ||
      body.receiptNo !== undefined ||
      body.attachmentUrl !== undefined;

    const isRecordByAccountant =
      existing.createdByRole === "ACCOUNTANT" ||
      existing.createdByName?.toLowerCase()?.includes("account");
    const isRecordByAdmin = existing.createdByRole === "ADMIN";

    if (isEditingBaseExpense && !isSuperAdmin) {
      if (isAccountant && !isRecordByAccountant && existing.createdById !== user.id) {
        return NextResponse.json(
          { error: 'Accountants can only edit their own expense entries.' },
          { status: 403 }
        );
      }
      const isManager = roleName === 'COMMUNITY_MANAGER' || roleName === 'MANAGER';
      if (isManager && (isRecordByAccountant || isRecordByAdmin) && existing.createdById !== user.id) {
        return NextResponse.json(
          { error: 'Community Managers can only edit their own expense entries.' },
          { status: 403 }
        );
      }
    }

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
      updateData.remarks = body.remarks ? String(body.remarks).trim() : null;
    }
    if (body.vendorId !== undefined) {
      updateData.vendorId = body.vendorId ? Number(body.vendorId) : null;
    }
    if (body.vendorName !== undefined) {
      updateData.vendorName = body.vendorName ? body.vendorName.trim() : null;
    }

    // Payment Due Date Tracking & Late Fee Avoidance
    if (body.dueDate !== undefined) {
      if (body.dueDate) {
        const d = new Date(body.dueDate);
        if (!isNaN(d.getTime())) {
          updateData.dueDate = d;
          const day = String(d.getDate()).padStart(2, '0');
          const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
          const year = d.getFullYear();
          updateData.dueDateStr = `${day} ${month} ${year}`;
        } else {
          updateData.dueDate = null;
          updateData.dueDateStr = null;
        }
      } else {
        updateData.dueDate = null;
        updateData.dueDateStr = null;
      }
    }
    if (body.dueDateStr !== undefined && body.dueDate === undefined) {
      updateData.dueDateStr = body.dueDateStr ? String(body.dueDateStr).trim() : null;
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
    if (body.vendorInvoiceUrl !== undefined) {
      updateData.vendorInvoiceUrl = body.vendorInvoiceUrl || null;
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
    if (body.accountantApprovalStatus !== undefined) {
      updateData.accountantApprovalStatus = body.accountantApprovalStatus;
    }
    if (body.accountantRemarks !== undefined) {
      updateData.accountantRemarks = body.accountantRemarks ? String(body.accountantRemarks).trim() : null;
    }
    if (body.superAdminApprovalStatus !== undefined) {
      updateData.superAdminApprovalStatus = body.superAdminApprovalStatus;
    }
    if (body.superAdminRemarks !== undefined) {
      updateData.superAdminRemarks = body.superAdminRemarks ? String(body.superAdminRemarks).trim() : null;
    }
    if (body.rejectionStage !== undefined) {
      updateData.rejectionStage = body.rejectionStage;
    }
    if (body.rejectionRemarks !== undefined) {
      updateData.rejectionRemarks = body.rejectionRemarks;
    }
    if (body.paymentApprovalStatus !== undefined) {
      updateData.paymentApprovalStatus = body.paymentApprovalStatus;
    }
    if (body.paymentApprovalRemarks !== undefined) {
      updateData.paymentApprovalRemarks = body.paymentApprovalRemarks ? String(body.paymentApprovalRemarks).trim() : null;
    }
    if (body.paymentApprovedById !== undefined) {
      updateData.paymentApprovedById = body.paymentApprovedById ? Number(body.paymentApprovedById) : null;
    }
    if (body.paymentApprovedByName !== undefined) {
      updateData.paymentApprovedByName = body.paymentApprovedByName ? String(body.paymentApprovedByName).trim() : null;
    }
    if (body.paymentApprovedAt !== undefined) {
      updateData.paymentApprovedAt = body.paymentApprovedAt ? new Date(body.paymentApprovedAt) : null;
    }

    // Handle Resubmission of Rejected Records
    const isCurrentlyRejected =
      existing.approvalStatus === 'REJECTED_BY_ACCOUNTANT' ||
      existing.approvalStatus === 'REJECTED_BY_SUPER_ADMIN' ||
      existing.approvalStatus === 'REJECTED';

    if (body.resubmit || (isCurrentlyRejected && body.approvalStatus === undefined)) {
      if (existing.createdByRole === 'ACCOUNTANT' || isAccountant) {
        if (!onOffSAApproval) {
          updateData.approvalStatus = 'APPROVED';
          updateData.accountantApprovalStatus = 'APPROVED';
          updateData.superAdminApprovalStatus = 'APPROVED';
          updateData.superAdminApprovedById = user.id;
          updateData.superAdminApprovedByName = `${user.name} (Auto Approved)`;
          updateData.superAdminApprovedAt = new Date();
          updateData.paymentApprovalStatus = 'APPROVED';
          updateData.paymentApprovedById = user.id;
          updateData.paymentApprovedByName = `${user.name} (Auto Approved)`;
          updateData.paymentApprovedAt = new Date();
        } else {
          updateData.approvalStatus = 'PENDING_SUPER_ADMIN_APPROVAL';
          updateData.accountantApprovalStatus = 'APPROVED';
          updateData.superAdminApprovalStatus = 'PENDING';
        }
      } else {
        updateData.approvalStatus = 'PENDING_ACCOUNTANT_APPROVAL';
        updateData.accountantApprovalStatus = 'PENDING';
        updateData.superAdminApprovalStatus = 'PENDING';
      }
      updateData.rejectionStage = null;
      updateData.rejectionRemarks = null;
    }

    const isAccountantRecord = existing.createdByRole === 'ACCOUNTANT' || existing.createdById === user.id;
    if (!onOffSAApproval && (isAccountant || isAccountantRecord)) {
      if (existing.approvalStatus !== 'APPROVED') {
        updateData.approvalStatus = 'APPROVED';
        updateData.accountantApprovalStatus = 'APPROVED';
        updateData.superAdminApprovalStatus = 'APPROVED';
        updateData.superAdminApprovedById = user.id;
        updateData.superAdminApprovedByName = `${user.name} (Auto Approved)`;
        updateData.superAdminApprovedAt = new Date();
      }
      if (existing.paymentApprovalStatus !== 'APPROVED') {
        updateData.paymentApprovalStatus = 'APPROVED';
        updateData.paymentApprovedById = user.id;
        updateData.paymentApprovedByName = `${user.name} (Auto Approved)`;
        updateData.paymentApprovedAt = new Date();
      }
    }

    // Accountant Settlement Fields (only applicable once approved by Super Admin OR when onOffSAApproval is false for accountants)
    const canDisburse =
      existing.approvalStatus === 'APPROVED' ||
      updateData.approvalStatus === 'APPROVED' ||
      isSuperAdmin ||
      (!onOffSAApproval && (isAccountant || isAccountantRecord));

    if (canDisburse) {
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

      // Determine payment status
      if (body.paymentStatus !== undefined) {
        updateData.paymentStatus = body.paymentStatus;
      } else {
        const finalUtr = updateData.utrNumber !== undefined ? updateData.utrNumber : existing.utrNumber;
        const finalPayDate = updateData.payReceiveDate !== undefined ? updateData.payReceiveDate : existing.payReceiveDate;
        const isSettled = Boolean(finalUtr || finalPayDate);
        updateData.paymentStatus = isSettled ? 'PAID' : 'PENDING';
      }
    } else {
      // Strictly prevent setting or modifying payment details before Super Admin approval
      delete updateData.payReceiveDate;
      delete updateData.utrNumber;
      delete updateData.utrDate;
      delete updateData.accPaymentMode;
      delete updateData.utrFileUrl;
      updateData.paymentStatus = 'PENDING';
    }

    let updated;
    try {
      updated = await (prisma as any).expenseRecord.update({
        where: { id: recordId },
        data: updateData,
      });
    } catch (prismaErr: any) {
      console.warn('[EXPENSE_RECORD_PUT] Fallback to raw query update:', prismaErr?.message);
      const setClauses: string[] = [];
      const params: any[] = [];
      for (const [k, v] of Object.entries(updateData)) {
        setClauses.push(`\`${k}\` = ?`);
        params.push(v);
      }
      if (setClauses.length > 0) {
        params.push(recordId);
        await (prisma as any).$executeRawUnsafe(
          `UPDATE \`ExpenseRecord\` SET ${setClauses.join(', ')} WHERE \`id\` = ?`,
          ...params
        );
      }
      updated = await (prisma as any).expenseRecord.findUnique({ where: { id: recordId } });
    }

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

    const roleName = user.role?.name?.toUpperCase() || '';
    const userEmail = user.email.toLowerCase();
    const isSuperAdmin = roleName === 'SUPER_ADMIN' || roleName === 'ADMIN';
    const isAccountant =
      roleName === 'ACCOUNTANT' ||
      roleName === 'ACCOUNTS' ||
      userEmail === ACCOUNTANT_EMAIL ||
      user.name.toLowerCase() === 'accounts';
    const isManager = roleName === 'COMMUNITY_MANAGER' || roleName === 'MANAGER';
    const assignedLocationIds = user.assignedLocations ? user.assignedLocations.map((al: any) => al.locationId) : [];

    const isRecordByAccountant =
      existing.createdByRole === "ACCOUNTANT" ||
      existing.createdByName?.toLowerCase()?.includes("account");
    const isRecordByAdmin = existing.createdByRole === "ADMIN";

    let canDelete = false;
    if (isSuperAdmin) {
      canDelete = true; // Super admin can delete everyone's
    } else if (isAccountant) {
      // Accountant can ONLY delete their own entries
      canDelete = isRecordByAccountant || existing.createdById === user.id;
    } else if (isManager) {
      // Community Manager can ONLY delete CM entries (not accountant, not admin)
      canDelete = (!isRecordByAccountant && !isRecordByAdmin) || existing.createdById === user.id;
    }

    if (!canDelete) {
      return NextResponse.json(
        {
          error: isAccountant
            ? 'Accountants can only delete their own expense entries.'
            : 'Community Managers can only delete their own expense entries.',
        },
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
