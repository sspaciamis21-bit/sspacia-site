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

      const emailSubject = `Payment Advice: ${record.vendorName || 'Vendor'} - ${formattedAmount} | Ref: ${finalUtr}`;

      const emailText = `PAYMENT ADVICE & REMITTANCE CONFIRMATION - SSPACIA
--------------------------------------------------

Dear ${record.vendorName || 'Vendor'},

This is an automated payment confirmation from SSPāCIA Coworking Spaces.
A payment of ${formattedAmount} has been approved and disbursed to your bank account.

TRANSACTION DETAILS:
- Beneficiary / Vendor: ${record.vendorName || 'Not Specified'}
- Amount Credited: ${formattedAmount}
- UTR / Reference No: ${finalUtr}
- Payment Date: ${finalPayDate}
- Payment Mode: ${finalMode}
- Coworking Center: ${record.locationName || record.location?.name || 'General HQ'}
${record.receiptNo ? `- Invoice / Ref No: ${record.receiptNo}\n` : ''}${record.accountNo ? `- Credited Bank A/C: ${record.accountNo}\n` : ''}- Description / Purpose: ${record.description}

Kindly verify the credit in your bank account and proceed with fulfillment of the corresponding goods/services as agreed.

If you have any questions, please reply directly to this email or contact our accounts desk at cm@sspacia.com.

Warm regards,
Finance & Accounts Department
SSPāCIA Coworking Spaces
cm@sspacia.com | www.sspacia.com
`;

      const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${emailSubject}</title>
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.5; color: #222222; background-color: #f7f7f7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 4px;">
    <tr>
      <td style="padding: 22px 26px; border-bottom: 2px solid #006064;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td>
              <h2 style="margin: 0; font-size: 20px; font-weight: bold; color: #006064; text-transform: uppercase; letter-spacing: 0.5px;">SSPāCIA</h2>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #666666;">Payment Advice & Remittance Confirmation</p>
            </td>
            <td align="right" style="vertical-align: top;">
              <span style="font-size: 11px; font-weight: bold; color: #0d6832; background-color: #e6f4ea; padding: 4px 8px; border: 1px solid #b7e1cd;">PAYMENT PROCESSED</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px 26px;">
        <p style="margin: 0 0 14px 0; font-size: 14px; color: #333333;">
          Dear <strong>${record.vendorName || 'Vendor'}</strong>,
        </p>
        <p style="margin: 0 0 18px 0; font-size: 13.5px; color: #444444; line-height: 1.5;">
          This is to confirm that a payment of <strong style="color: #006064;">${formattedAmount}</strong> has been processed and disbursed by SSPāCIA towards the invoice/expense details mentioned below.
        </p>

        <table role="presentation" width="100%" cellpadding="8" cellspacing="0" border="0" style="border-collapse: collapse; font-size: 13px; margin-bottom: 20px; border: 1px solid #eeeeee;">
          <tr style="background-color: #f9f9f9;">
            <td width="38%" style="border: 1px solid #eeeeee; font-weight: bold; color: #555555;">Payment Amount</td>
            <td style="border: 1px solid #eeeeee; font-weight: bold; color: #006064; font-size: 15px;">${formattedAmount}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #eeeeee; font-weight: bold; color: #555555;">UTR / Ref Number</td>
            <td style="border: 1px solid #eeeeee; font-family: monospace; font-size: 13px; color: #111111; font-weight: bold;">${finalUtr}</td>
          </tr>
          <tr style="background-color: #f9f9f9;">
            <td style="border: 1px solid #eeeeee; font-weight: bold; color: #555555;">Payment Date</td>
            <td style="border: 1px solid #eeeeee; color: #333333;">${finalPayDate}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #eeeeee; font-weight: bold; color: #555555;">Payment Mode</td>
            <td style="border: 1px solid #eeeeee; color: #333333;">${finalMode}</td>
          </tr>
          <tr style="background-color: #f9f9f9;">
            <td style="border: 1px solid #eeeeee; font-weight: bold; color: #555555;">Center / Location</td>
            <td style="border: 1px solid #eeeeee; color: #333333;">${record.locationName || record.location?.name || 'General HQ'}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #eeeeee; font-weight: bold; color: #555555;">Expense Description</td>
            <td style="border: 1px solid #eeeeee; color: #333333;">${record.description}</td>
          </tr>
          ${record.receiptNo ? `
          <tr style="background-color: #f9f9f9;">
            <td style="border: 1px solid #eeeeee; font-weight: bold; color: #555555;">Invoice / Bill Ref.</td>
            <td style="border: 1px solid #eeeeee; color: #333333;">${record.receiptNo}</td>
          </tr>` : ''}
          ${record.accountNo ? `
          <tr>
            <td style="border: 1px solid #eeeeee; font-weight: bold; color: #555555;">Credited Account</td>
            <td style="border: 1px solid #eeeeee; font-family: monospace; color: #333333;">${record.accountNo}</td>
          </tr>` : ''}
        </table>

        <p style="margin: 0 0 16px 0; font-size: 13px; color: #444444; line-height: 1.5;">
          Kindly verify the credit in your bank account and proceed with the order fulfillment / delivery as agreed. If you have any queries, please reply directly to this email.
        </p>

        <p style="margin: 20px 0 0 0; font-size: 13px; color: #333333;">
          Warm regards,<br>
          <strong>Finance & Accounts Team</strong><br>
          SSPāCIA Coworking Spaces<br>
          <span style="font-size: 12px; color: #777777;">cm@sspacia.com | www.sspacia.com</span>
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 12px 26px; background-color: #fafafa; border-top: 1px solid #eeeeee; font-size: 11px; color: #888888; text-align: center;">
        This is an official transactional payment advice from SSPāCIA. Please retain this email for your accounting records.
      </td>
    </tr>
  </table>
</body>
</html>`;

      try {
        const mailResult = await sendEmail({
          to: recipient,
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
