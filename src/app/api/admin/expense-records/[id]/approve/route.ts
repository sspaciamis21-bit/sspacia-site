import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { sendEmail } from '@/lib/email';

const DEFAULT_ALERT_EMAIL = 't6565154@gmail.com';

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
    const isSuperAdmin = roleName === 'SUPER_ADMIN' || roleName === 'ADMIN';

    // Check Super Admin permission
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Only Super Admin can approve and disburse vendor expense payments' },
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
      paymentDate,
      utrNumber,
      paymentMode,
      paymentProofUrl,
      approvalRemarks,
      sendAlertEmail = true,
      alertEmailRecipient = DEFAULT_ALERT_EMAIL,
    } = body;

    if (!utrNumber || !String(utrNumber).trim()) {
      return NextResponse.json(
        { error: 'UTR / Transaction Reference Number is required for payment approval.' },
        { status: 400 }
      );
    }

    const finalPayDate = paymentDate ? String(paymentDate).trim() : new Date().toISOString().split('T')[0];
    const finalUtr = String(utrNumber).trim();
    const finalMode = paymentMode ? String(paymentMode).trim() : record.paymentMode || 'Bank Transfer';

    // Update expense record
    const updated = await (prisma as any).expenseRecord.update({
      where: { id: recordId },
      data: {
        approvalStatus: 'APPROVED',
        paymentStatus: 'PAID',
        utrNumber: finalUtr,
        utrDate: finalPayDate,
        payReceiveDate: finalPayDate,
        receiveAmount: record.amount,
        accPaymentMode: finalMode,
        paymentProofUrl: paymentProofUrl || record.paymentProofUrl || null,
        approvalRemarks: approvalRemarks ? String(approvalRemarks).trim() : null,
        approvedById: user.id,
        approvedByName: user.name,
        approvedAt: new Date(),
        alertEmailSent: Boolean(sendAlertEmail),
        alertEmailSentTo: sendAlertEmail ? (alertEmailRecipient || DEFAULT_ALERT_EMAIL) : null,
      },
    });

    let emailSent = false;
    let emailError: string | null = null;

    if (sendAlertEmail) {
      const recipient = alertEmailRecipient || DEFAULT_ALERT_EMAIL;
      const formattedAmount = `₹${record.amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

      const emailSubject = `Payment Processed & Approved: ${record.vendorName || 'Vendor'} - ${formattedAmount} | Ref: ${finalUtr}`;
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${emailSubject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #1e293b; }
    .card { background-color: #ffffff; max-width: 620px; margin: 0 auto; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #006064 0%, #00838f 100%); color: #ffffff; padding: 24px; text-align: left; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
    .badge { display: inline-block; background: #22c55e; color: #ffffff; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-top: 10px; }
    .content { padding: 24px; }
    .info-table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 20px; }
    .info-table td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
    .info-table td.label { font-weight: 600; color: #64748b; width: 38%; }
    .info-table td.value { font-weight: 600; color: #0f172a; }
    .amount-box { background: #ecfeff; border: 1px solid #a5f3fc; border-radius: 6px; padding: 14px 18px; text-align: center; margin: 18px 0; }
    .amount-box .title { font-size: 11px; font-weight: 700; color: #0891b2; text-transform: uppercase; letter-spacing: 0.5px; }
    .amount-box .amount { font-size: 26px; font-weight: 800; color: #006064; margin-top: 4px; }
    .notice { background: #f8fafc; border-left: 4px solid #006064; padding: 12px 16px; font-size: 12.5px; color: #334155; margin-top: 16px; line-height: 1.5; }
    .footer { padding: 18px 24px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>SSPāCIA Finance & Accounts</h1>
      <p>Vendor Payment Processed & Approved Notice</p>
      <span class="badge">Payment Approved & Settled</span>
    </div>

    <div class="content">
      <div class="amount-box">
        <div class="title">Total Amount Disbursed</div>
        <div class="amount">${formattedAmount}</div>
      </div>

      <table class="info-table">
        <tr>
          <td class="label">Vendor / Supplier:</td>
          <td class="value">${record.vendorName || 'Not Specified'}</td>
        </tr>
        <tr>
          <td class="label">Center / Location:</td>
          <td class="value">${record.locationName || record.location?.name || 'General HQ'}</td>
        </tr>
        <tr>
          <td class="label">Vendor Bank A/C No:</td>
          <td class="value">${record.accountNo || 'Provided in Bank System'}</td>
        </tr>
        <tr>
          <td class="label">Expense Category:</td>
          <td class="value">${record.category || 'GENERAL EXPENSE'}</td>
        </tr>
        <tr>
          <td class="label">Description:</td>
          <td class="value">${record.description}</td>
        </tr>
        <tr>
          <td class="label">Quantity & Rate:</td>
          <td class="value">QTY: ${record.quantity || 1} | Rate: ₹${record.rate || record.amount}</td>
        </tr>
        <tr>
          <td class="label">Payment Date:</td>
          <td class="value">${finalPayDate}</td>
        </tr>
        <tr>
          <td class="label">Payment Mode:</td>
          <td class="value">${finalMode}</td>
        </tr>
        <tr>
          <td class="label">UTR / Reference No:</td>
          <td class="value" style="font-family: monospace; font-size: 14px; color: #006064;">${finalUtr}</td>
        </tr>
        <tr>
          <td class="label">Approved By:</td>
          <td class="value">${user.name} (Super Admin)</td>
        </tr>
        ${approvalRemarks ? `<tr><td class="label">Approval Remarks:</td><td class="value">${approvalRemarks}</td></tr>` : ''}
      </table>

      <div class="notice">
        <strong>Vendor Fulfillment Notice:</strong><br>
        Payment of <strong>${formattedAmount}</strong> has been approved and disbursed by SSPāCIA. The vendor is kindly requested to fulfill and deliver the corresponding goods/services as per agreement.
      </div>
    </div>

    <div class="footer">
      This is an automated operational alert generated by SSPāCIA Enterprise Workspace Management System.
    </div>
  </div>
</body>
</html>
      `;

      try {
        const mailResult = await sendEmail({
          to: recipient,
          subject: emailSubject,
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
    }

    return NextResponse.json({
      success: true,
      data: updated,
      emailSent,
      emailError,
      message: `Expense approved successfully! Payment UTR: ${finalUtr}${emailSent ? ' | Alert email sent to ' + (alertEmailRecipient || DEFAULT_ALERT_EMAIL) : ''}`,
    });
  } catch (error: any) {
    console.error('[EXPENSE_RECORD_APPROVE_ERROR]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to approve expense' },
      { status: 500 }
    );
  }
}
