import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { sendEmail } from '@/lib/email';
import { onOffSAApproval } from '@/lib/expense-approval-config';

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
      },
    });

    return user;
  } catch {
    return null;
  }
}

// POST /api/admin/expense-records/[id]/approve
export async function POST(
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
      userEmail === 'ssinfrazone21@gmail.com' ||
      user.name.toLowerCase() === 'accounts';

    // Disbursing payments and recording UTR is authorized for Super Admin and Accountant
    if (!isSuperAdmin && !isAccountant) {
      return NextResponse.json(
        { error: 'Only Super Admin or Accountant can record disbursement and UTR details' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const recordId = parseInt(id, 10);
    if (isNaN(recordId)) {
      return NextResponse.json({ error: 'Invalid expense ID' }, { status: 400 });
    }

    const record = await (prisma as any).expenseRecord.findUnique({
      where: { id: recordId },
      include: {
        location: { select: { id: true, name: true } },
      },
    });

    if (!record) {
      return NextResponse.json({ error: 'Expense record not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      action, // 'ACCOUNTANT_APPROVE' | 'ACCOUNTANT_REJECT' | 'SUPER_ADMIN_APPROVE' | 'SUPER_ADMIN_REJECT' | 'DISBURSE_PAYMENT'
      remarks,
      rejectionRemarks,
      paymentDate,
      utrNumber,
      paymentMode,
      paymentProofUrl,
      approvalRemarks,
      sendAlertEmail = true,
      alertEmailRecipient = null,
    } = body;

    // ── 1. ACCOUNTANT ACTIONS ──
    if (action === 'ACCOUNTANT_APPROVE') {
      if (!isAccountant && !isSuperAdmin) {
        return NextResponse.json(
          { error: 'Only Accountant or Super Admin can perform Accountant validation.' },
          { status: 403 }
        );
      }

      const updated = await (prisma as any).expenseRecord.update({
        where: { id: recordId },
        data: {
          approvalStatus: 'PENDING_SUPER_ADMIN_APPROVAL',
          accountantApprovalStatus: 'APPROVED',
          accountantApprovedById: user.id,
          accountantApprovedByName: user.name,
          accountantApprovedAt: new Date(),
          accountantRemarks: remarks ? String(remarks).trim() : null,
          rejectionStage: null,
          rejectionRemarks: null,
        },
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: 'Expense validated and approved by Accountant! Forwarded to Super Admin for final approval.',
      });
    }

    if (action === 'ACCOUNTANT_REJECT') {
      if (!isAccountant && !isSuperAdmin) {
        return NextResponse.json(
          { error: 'Only Accountant or Super Admin can reject during Accountant validation.' },
          { status: 403 }
        );
      }

      const reason = (remarks || rejectionRemarks || '').trim();
      if (!reason) {
        return NextResponse.json(
          { error: 'Rejection remarks/reason are required so the creator knows what needs correction.' },
          { status: 400 }
        );
      }

      const updated = await (prisma as any).expenseRecord.update({
        where: { id: recordId },
        data: {
          approvalStatus: 'REJECTED_BY_ACCOUNTANT',
          accountantApprovalStatus: 'REJECTED',
          rejectionStage: 'ACCOUNTANT',
          rejectionRemarks: reason,
          accountantRemarks: reason,
        },
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: 'Expense rejected by Accountant with remarks and returned for correction.',
      });
    }

const CATEGORY_SETTING_KEY = 'EXPENSE_CATEGORY_HEADERS';

async function addCategoryToDropdown(catName: string) {
  const norm = String(catName || '').trim().toUpperCase();
  if (!norm) return;

  try {
    const setting = await prisma.setting.findUnique({
      where: { key: CATEGORY_SETTING_KEY },
    });

    let list: string[] = [];
    if (setting && setting.value) {
      try {
        const parsed = JSON.parse(setting.value);
        if (Array.isArray(parsed)) list = parsed;
      } catch {}
    }

    if (!list.includes(norm)) {
      list.push(norm);
      await prisma.setting.upsert({
        where: { key: CATEGORY_SETTING_KEY },
        create: {
          key: CATEGORY_SETTING_KEY,
          value: JSON.stringify(list),
          group: 'expenses',
        },
        update: {
          value: JSON.stringify(list),
        },
      });
    }
  } catch (err) {
    console.error('Failed to add category to dropdown:', err);
  }
}

    // ── SUPER ADMIN UPDATE / ACCEPT / REASSIGN CATEGORY HEADER ──
    if (action === 'SUPER_ADMIN_UPDATE_CATEGORY' || action === 'UPDATE_CATEGORY') {
      if (!isSuperAdmin) {
        return NextResponse.json(
          { error: 'Only Super Admin can edit, accept or reassign expense categories during review.' },
          { status: 403 }
        );
      }

      const targetCategory = body.category ? String(body.category).trim().toUpperCase() : '';
      if (!targetCategory) {
        return NextResponse.json(
          { error: 'Category name is required.' },
          { status: 400 }
        );
      }

      const acceptIntoDropdown = Boolean(body.acceptCategoryIntoDropdown);
      if (acceptIntoDropdown) {
        await addCategoryToDropdown(targetCategory);
      }

      const updated = await (prisma as any).expenseRecord.update({
        where: { id: recordId },
        data: {
          category: targetCategory,
        },
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: acceptIntoDropdown
          ? `Header "${targetCategory}" accepted into official dropdown and assigned to Expense #${recordId}!`
          : `Expense #${recordId} category updated to "${targetCategory}".`,
      });
    }

    // ── 2. SUPER ADMIN ACTIONS ──
    if (action === 'SUPER_ADMIN_APPROVE') {
      if (!isSuperAdmin) {
        return NextResponse.json(
          { error: 'Only Super Admin can grant final approval.' },
          { status: 403 }
        );
      }

      let categoryToSave = body.category ? String(body.category).trim().toUpperCase() : undefined;
      const acceptCategoryIntoDropdown = Boolean(body.acceptCategoryIntoDropdown);

      if (categoryToSave && acceptCategoryIntoDropdown) {
        await addCategoryToDropdown(categoryToSave);
      }

      const updateData: any = {
        approvalStatus: 'APPROVED',
        superAdminApprovalStatus: 'APPROVED',
        superAdminApprovedById: user.id,
        superAdminApprovedByName: user.name,
        superAdminApprovedAt: new Date(),
        superAdminRemarks: remarks ? String(remarks).trim() : null,
        approvedById: user.id,
        approvedByName: user.name,
        approvedAt: new Date(),
        approvalRemarks: remarks ? String(remarks).trim() : null,
        rejectionStage: null,
        rejectionRemarks: null,
      };

      if (categoryToSave) {
        updateData.category = categoryToSave;
      }

      const updated = await (prisma as any).expenseRecord.update({
        where: { id: recordId },
        data: updateData,
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: 'Expense approved by Super Admin! Ready for payment disbursement.',
      });
    }

    if (action === 'SUPER_ADMIN_REJECT') {
      if (!isSuperAdmin) {
        return NextResponse.json(
          { error: 'Only Super Admin can reject at the final approval stage.' },
          { status: 403 }
        );
      }

      const reason = (remarks || rejectionRemarks || '').trim();
      if (!reason) {
        return NextResponse.json(
          { error: 'Rejection remarks/reason are required so the creator knows what needs correction.' },
          { status: 400 }
        );
      }

      const updated = await (prisma as any).expenseRecord.update({
        where: { id: recordId },
        data: {
          approvalStatus: 'REJECTED_BY_SUPER_ADMIN',
          superAdminApprovalStatus: 'REJECTED',
          rejectionStage: 'SUPER_ADMIN',
          rejectionRemarks: reason,
          superAdminRemarks: reason,
        },
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: 'Expense rejected by Super Admin with remarks and returned for correction.',
      });
    }

    // ── 3. PAYMENT APPROVAL ACTIONS (2ND SUPER ADMIN APPROVAL: SIR PAYS & DISBURSAL) ──
    const updatePaymentApprovalRecord = async (dataToUpdate: Record<string, any>) => {
      try {
        return await (prisma as any).expenseRecord.update({
          where: { id: recordId },
          data: dataToUpdate,
        });
      } catch (prismaErr: any) {
        console.warn('[Expense Payment Approval] Prisma update fallback to raw query:', prismaErr?.message);
        const setClauses: string[] = [];
        const params: any[] = [];
        for (const [k, v] of Object.entries(dataToUpdate)) {
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
        return await (prisma as any).expenseRecord.findUnique({ where: { id: recordId } });
      }
    };

    if (action === 'REQUEST_PAYMENT_APPROVAL') {
      const isAccountantRecord = record.createdByRole === 'ACCOUNTANT' || record.createdByName?.toLowerCase()?.includes('account');
      const bypassSA = !onOffSAApproval && (isAccountant || isAccountantRecord);

      if (bypassSA) {
        const updated = await updatePaymentApprovalRecord({
          approvalStatus: 'APPROVED',
          superAdminApprovalStatus: 'APPROVED',
          paymentApprovalStatus: 'APPROVED',
          paymentApprovedById: user.id,
          paymentApprovedByName: `${user.name} (Auto Approved)`,
          paymentApprovedAt: new Date(),
          paymentApprovalRemarks: remarks ? String(remarks).trim() : 'Auto Approved (onOffSAApproval)',
        });

        return NextResponse.json({
          success: true,
          data: updated,
          message: 'Payment auto-approved (onOffSAApproval is off)!',
        });
      }

      if (record.approvalStatus !== 'APPROVED') {
        return NextResponse.json(
          { error: 'Cannot request payment approval. Base expense must first be approved by Super Admin.' },
          { status: 400 }
        );
      }

      const updated = await updatePaymentApprovalRecord({
        paymentApprovalStatus: 'PENDING',
        paymentApprovalRemarks: remarks ? String(remarks).trim() : null,
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: 'Payment approval request submitted to Super Admin (Sir)!',
      });
    }

    if (action === 'PAYMENT_SUPER_ADMIN_APPROVE' || action === 'SUPER_ADMIN_APPROVE_PAYMENT') {
      if (!isSuperAdmin) {
        return NextResponse.json(
          { error: 'Only Super Admin can approve payment disbursal.' },
          { status: 403 }
        );
      }

      if (record.approvalStatus !== 'APPROVED') {
        return NextResponse.json(
          { error: 'Base expense must first be approved by Super Admin before payment approval.' },
          { status: 400 }
        );
      }

      const updated = await updatePaymentApprovalRecord({
        paymentApprovalStatus: 'APPROVED',
        paymentApprovedById: user.id,
        paymentApprovedByName: user.name,
        paymentApprovedAt: new Date(),
        paymentApprovalRemarks: remarks ? String(remarks).trim() : null,
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: 'Payment approved by Super Admin (Sir)! Accountant can now enter UTR, payment date, proof, and send vendor advice.',
      });
    }

    if (action === 'PAYMENT_SUPER_ADMIN_REJECT' || action === 'SUPER_ADMIN_REJECT_PAYMENT') {
      if (!isSuperAdmin) {
        return NextResponse.json(
          { error: 'Only Super Admin can reject payment requests.' },
          { status: 403 }
        );
      }

      const reason = (remarks || rejectionRemarks || '').trim();
      if (!reason) {
        return NextResponse.json(
          { error: 'Rejection remarks/reason are required so the accountant knows what needs correction.' },
          { status: 400 }
        );
      }

      const updated = await updatePaymentApprovalRecord({
        paymentApprovalStatus: 'REJECTED',
        paymentApprovalRemarks: reason,
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: 'Payment rejected by Super Admin with remarks.',
      });
    }

    // ── 4. DISBURSEMENT / PAYMENT RECORDING ACTION (FINAL STEP) ──
    const isAccountantRecord = record.createdByRole === 'ACCOUNTANT' || record.createdByName?.toLowerCase()?.includes('account');
    const bypassSA = !onOffSAApproval && (isAccountant || isAccountantRecord);

    if (record.approvalStatus !== 'APPROVED' && !bypassSA) {
      return NextResponse.json(
        { error: 'Payment details and UTR cannot be recorded yet. This expense must first receive Super Admin approval.' },
        { status: 400 }
      );
    }

    if (record.paymentApprovalStatus !== 'APPROVED' && !isSuperAdmin && !bypassSA) {
      return NextResponse.json(
        { error: 'Payment details and UTR cannot be recorded yet. Super Admin must first approve the payment (Sir Pays).' },
        { status: 400 }
      );
    }

    const finalUtr = utrNumber ? String(utrNumber).trim() : (record.utrNumber ? String(record.utrNumber).trim() : null);
    const finalPayDate = paymentDate ? String(paymentDate).trim() : (record.utrDate || record.payReceiveDate || new Date().toISOString().split('T')[0]);
    const finalMode = paymentMode ? String(paymentMode).trim() : (record.accPaymentMode || record.paymentMode || 'Bank Transfer');

    // Resolve real vendor email from input or VendorMaster database
    let recipientEmail: string | null = null;
    if (alertEmailRecipient && typeof alertEmailRecipient === 'string' && alertEmailRecipient.includes('@')) {
      recipientEmail = alertEmailRecipient.trim();
    }

    if (!recipientEmail && record.vendorId) {
      try {
        const vm = await (prisma as any).vendorMaster.findUnique({
          where: { id: record.vendorId },
          select: { email: true, vendorName: true },
        });
        if (vm?.email && vm.email.trim()) {
          recipientEmail = vm.email.trim();
        }
      } catch (err) {
        console.warn('[VENDOR_ID_LOOKUP_WARNING]', err);
      }
    }

    if (!recipientEmail && record.vendorName) {
      try {
        const vm = await (prisma as any).vendorMaster.findFirst({
          where: { vendorName: record.vendorName.trim() },
          select: { email: true, vendorName: true },
        });
        if (vm?.email && vm.email.trim()) {
          recipientEmail = vm.email.trim();
        }
      } catch (err) {
        console.warn('[VENDOR_NAME_LOOKUP_WARNING]', err);
      }
    }

    let emailSent = false;
    let emailError: string | null = null;

    if (sendAlertEmail && recipientEmail) {
      const formattedAmount = `₹${record.amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

      const emailSubject = `Payment Acknowledgement - ${record.vendorName || 'Vendor'} - ${formattedAmount}`;

      const emailText = `Dear ${record.vendorName || 'Sir / Madam'},

We have processed the payment of ${formattedAmount} towards ${record.description}${record.receiptNo ? ` (Invoice / Bill Ref: ${record.receiptNo})` : ''}.

Payment Details:
- Amount: ${formattedAmount}
- UTR / Reference No: ${finalUtr}
- Payment Date: ${finalPayDate}
- Payment Mode: ${finalMode}
- Center: ${record.locationName || record.location?.name || 'SSPACIA'}
${record.accountNo ? `- Bank Account: ${record.accountNo}\n` : ''}
Please verify the receipt in your account and acknowledge.

Thanks & Regards,
SSPACIA Coworking
`;

      const emailHtml = `<div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color: #222222; white-space: pre-wrap;">${emailText}</div>`;

      try {
        const mailResult = await sendEmail({
          to: recipientEmail,
          cc: 'praveen@sspacia.com',
          fromName: 'SSPACIA Coworking',
          subject: emailSubject,
          text: emailText,
          html: emailHtml,
        });

        emailSent = Boolean(mailResult.success);
        if (!mailResult.success) {
          emailError = mailResult.error || 'Failed to dispatch email';
        }
      } catch (err: any) {
        console.error('[EXPENSE_APPROVAL_EMAIL_ERROR]', err);
        emailError = err?.message || 'Error dispatching approval email';
      }
    } else if (sendAlertEmail && !recipientEmail) {
      // If no email on file for vendor, acknowledgement email is skipped cleanly
      emailError = null;
    }

    // Update expense record with payment details and email status
    const updated = await (prisma as any).expenseRecord.update({
      where: { id: recordId },
      data: {
        paymentStatus: 'PAID',
        approvalStatus: 'APPROVED',
        superAdminApprovalStatus: 'APPROVED',
        paymentApprovalStatus: 'APPROVED',
        utrNumber: finalUtr,
        utrDate: finalPayDate,
        payReceiveDate: finalPayDate,
        receiveAmount: record.amount,
        accPaymentMode: finalMode,
        paymentProofUrl: paymentProofUrl || record.paymentProofUrl || null,
        approvalRemarks: approvalRemarks !== undefined ? (approvalRemarks ? String(approvalRemarks).trim() : null) : record.approvalRemarks,
        alertEmailSent: emailSent || Boolean(record.alertEmailSent),
        alertEmailSentTo: emailSent && recipientEmail ? recipientEmail : record.alertEmailSentTo,
      },
    });

    const statusMsg = finalUtr
      ? `Expense approved successfully! Payment UTR: ${finalUtr}${
          emailSent
            ? ` | Alert email sent to ${recipientEmail}`
            : recipientEmail && emailError
            ? ` | Email note: ${emailError}`
            : ''
        }`
      : 'Expense payment and disbursal details saved successfully!';

    return NextResponse.json({
      success: true,
      data: updated,
      emailSent,
      emailError,
      message: statusMsg,
    });
  } catch (error: any) {
    console.error('[EXPENSE_RECORD_APPROVE_ERROR]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to approve expense' },
      { status: 500 }
    );
  }
}
