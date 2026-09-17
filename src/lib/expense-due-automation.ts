import nodemailer from 'nodemailer';
import prisma from '@/lib/prisma';

export const EXPENSE_DUE_PRIMARY_RECIPIENT = 'praveen@sspacia.com';
export const EXPENSE_DUE_CC_RECIPIENTS = [
  'ssinfrazone003@gmail.com',
  'ssinfrazone21@gmail.com',
];

/**
 * Format a Date or date string to "20 OCT 2026"
 */
export function formatExpenseDueDate(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Calculate difference in calendar days between today and due date
 * Returns positive if due in the future, 0 if today, negative if past
 */
export function getDaysUntilDueDate(dueDateInput: Date | string): number {
  const due = new Date(dueDateInput);
  const now = new Date();
  const dueZero = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const nowZero = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((dueZero - nowZero) / (1000 * 60 * 60 * 24));
}

/**
 * Creates Nodemailer SMTP transport for Zoho Mail (cm@sspacia.com)
 */
function createSmtpTransport() {
  const hostCandidates = [
    process.env.SMTP_HOST || 'smtppro.zoho.in',
    'smtp.zoho.in',
    'smtppro.zoho.com',
    'smtp.zoho.com',
  ];
  const port = Number(process.env.SMTP_PORT || 465);
  const user = (process.env.SMTP_USER || 'cm@sspacia.com').trim();
  const rawPass = (process.env.SMTP_PASS || 'VXQxVpCnBDZg').trim();
  const pass = rawPass.replace(/\s+/g, '');

  return {
    transporter: nodemailer.createTransport({
      host: hostCandidates[0],
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    } as nodemailer.TransportOptions),
    sender: user,
  };
}

export interface DueAlertResultItem {
  id: number;
  description: string;
  vendorName: string;
  locationName: string;
  amount: number;
  dueDate: string;
  daysRemaining: number;
  status: 'SENT' | 'ALREADY_SENT_TODAY' | 'SKIPPED' | 'FAILED';
  message?: string;
}

/**
 * Scans unpaid expense records and dispatches daily warning emails
 * for any expense whose due date is within 7 days (0 <= daysRemaining <= 7).
 * Stops sending once the expense is marked PAID or after the due date.
 */
export async function runExpenseDueDateAlertEmails(options?: {
  forceDispatch?: boolean; // If true, bypasses duplicate check for testing
  overrideTo?: string;
  overrideCc?: string[];
}): Promise<{
  success: boolean;
  totalPendingDueExpenses: number;
  sentCount: number;
  skippedCount: number;
  items: DueAlertResultItem[];
  error?: string;
}> {
  const items: DueAlertResultItem[] = [];
  let sentCount = 0;
  let skippedCount = 0;

  try {
    const today = new Date();
    const todayYMD = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // 1. Query unpaid expenses that have a due date
    const candidateExpenses = await (prisma as any).expenseRecord.findMany({
      where: {
        dueDate: { not: null },
        paymentStatus: { not: 'PAID' },
      },
      include: {
        location: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    // 2. Filter records where 0 <= daysRemaining <= 7
    const qualifyingRecords = candidateExpenses.filter((rec: any) => {
      if (!rec.dueDate) return false;
      const days = getDaysUntilDueDate(rec.dueDate);
      return days >= 0 && days <= 7;
    });

    if (qualifyingRecords.length === 0) {
      return {
        success: true,
        totalPendingDueExpenses: candidateExpenses.length,
        sentCount: 0,
        skippedCount: 0,
        items: [],
      };
    }

    const { transporter, sender } = createSmtpTransport();
    const recipientTo = options?.overrideTo || EXPENSE_DUE_PRIMARY_RECIPIENT;
    const recipientCc = options?.overrideCc || EXPENSE_DUE_CC_RECIPIENTS;

    for (const rec of qualifyingRecords) {
      const daysRemaining = getDaysUntilDueDate(rec.dueDate);
      const formattedDueDate = formatExpenseDueDate(rec.dueDate);
      const centerName = rec.locationName || rec.location?.name || 'Center';
      const vendorName = rec.vendorName || 'Vendor Bill';
      const amountStr = `₹${Number(rec.amount || 0).toLocaleString('en-IN')}`;

      // Check if already sent today
      let sentDates: string[] = [];
      try {
        if (rec.dueDateAlertSentDates) {
          sentDates = JSON.parse(rec.dueDateAlertSentDates);
        }
      } catch {
        sentDates = [];
      }

      if (!options?.forceDispatch && sentDates.includes(todayYMD)) {
        skippedCount++;
        items.push({
          id: rec.id,
          description: rec.description,
          vendorName,
          locationName: centerName,
          amount: rec.amount,
          dueDate: formattedDueDate,
          daysRemaining,
          status: 'ALREADY_SENT_TODAY',
          message: `Already dispatched today (${todayYMD})`,
        });
        continue;
      }

      const daysLeftNotice =
        daysRemaining === 0
          ? 'TODAY IS DUE DATE'
          : daysRemaining === 1
          ? '1 DAY LEFT'
          : `${daysRemaining} DAYS LEFT`;

      const subject = `⚠️ URGENT: Expense Payment Due on ${formattedDueDate} (${daysLeftNotice}) - ${centerName} [Late Fee Risk]`;

      // Simple, readable, clean email text & HTML
      const plainText = `
URGENT: Operating Expense Payment Due Alert
Avoid Late Fee Charges

Hello Team,

This is an automated alert from Sspacia Center Management.
The following expense is due on ${formattedDueDate} (${daysLeftNotice}).
Please proceed with the payment settlement on or before this due date to avoid late fee charges.

--------------------------------------------------
EXPENSE DETAILS:
--------------------------------------------------
Expense ID: #${rec.id} ${rec.receiptNo ? `(Receipt: ${rec.receiptNo})` : ''}
Center: ${centerName}
Vendor / Beneficiary: ${vendorName} ${rec.accountNo ? `(A/C: ${rec.accountNo})` : ''}
Description: ${rec.description}
Category: ${rec.category || 'OPERATING EXPENSE'}
Amount: ${amountStr}
Payment Due Date: ${formattedDueDate} (${daysLeftNotice})
Payment Status: ${rec.paymentStatus || 'PENDING'}
--------------------------------------------------

IMPORTANT NOTICE:
Please complete the payment on or before ${formattedDueDate}.
Any delay beyond the due date will lead to late fee charges.

Please verify bank balance and disburse funds via Accountant Payment Settlement in the portal.

Automated Alert from Sspacia Coworking ERP (cm@sspacia.com)
Sent 7 days prior to payment due date at 10:00 AM IST daily.
`.trim();

      const htmlBody = `
<div style="font-family: Arial, sans-serif; color: #1a1a1a; max-width: 650px; line-height: 1.6; border: 1px solid #e2e8f0; padding: 24px; background-color: #ffffff;">
  <div style="border-bottom: 2px solid #b91c1c; padding-bottom: 12px; margin-bottom: 20px;">
    <h2 style="color: #b91c1c; margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 0.5px;">
      ⚠️ Operating Expense Payment Due Alert
    </h2>
    <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">
      Urgent: Action required to avoid late fee charges
    </p>
  </div>

  <p style="font-size: 14px; margin-bottom: 16px;">
    Hello Team,
  </p>

  <p style="font-size: 14px; margin-bottom: 16px;">
    This is an automated reminder that payment for the following center operating expense is due on <strong style="color: #b91c1c;">${formattedDueDate}</strong> (<strong>${daysLeftNotice}</strong>). Please proceed with the payment process on or before the due date to avoid late fee charges.
  </p>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
    <tbody>
      <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px; font-weight: bold; width: 35%; color: #334155;">Expense ID / Ref</td>
        <td style="padding: 10px; color: #0f172a;">#${rec.id} ${rec.receiptNo ? `(Receipt: ${rec.receiptNo})` : ''}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px; font-weight: bold; color: #334155;">Coworking Center</td>
        <td style="padding: 10px; color: #0f172a;">${centerName}</td>
      </tr>
      <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px; font-weight: bold; color: #334155;">Vendor / Beneficiary</td>
        <td style="padding: 10px; color: #0f172a;">${vendorName} ${rec.accountNo ? `(A/C: ${rec.accountNo})` : ''}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px; font-weight: bold; color: #334155;">Description</td>
        <td style="padding: 10px; color: #0f172a;">${rec.description}</td>
      </tr>
      <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px; font-weight: bold; color: #334155;">Category</td>
        <td style="padding: 10px; color: #0f172a;">${rec.category || 'OPERATING EXPENSE'}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px; font-weight: bold; color: #334155;">Total Amount</td>
        <td style="padding: 10px; font-weight: bold; color: #b91c1c; font-size: 15px;">${amountStr}</td>
      </tr>
      <tr style="background-color: #fef3c7; border-bottom: 1px solid #fde68a;">
        <td style="padding: 10px; font-weight: bold; color: #92400e;">Payment Due Date</td>
        <td style="padding: 10px; font-weight: bold; color: #92400e; font-size: 14px;">${formattedDueDate} (${daysLeftNotice})</td>
      </tr>
      <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px; font-weight: bold; color: #334155;">Current Payment Status</td>
        <td style="padding: 10px; font-weight: bold; color: #d97706;">${rec.paymentStatus || 'PENDING'}</td>
      </tr>
    </tbody>
  </table>

  <div style="background-color: #fee2e2; border-left: 4px solid #b91c1c; padding: 12px; margin-bottom: 20px; font-size: 13px; color: #991b1b;">
    <strong>Important Notice:</strong> Payment must be completed before or on <strong>${formattedDueDate}</strong>. Any payment settled after this date will attract late fee charges.
  </div>

  <p style="font-size: 13px; color: #475569; margin-bottom: 6px;">
    Please verify bank balance and proceed with payment settlement in the ERP portal.
  </p>

  <p style="font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 24px;">
    This is an automated system alert sent by Sspacia Coworking ERP (${sender}) daily at 10:00 AM IST until payment is completed.
  </p>
</div>
`;

      try {
        await transporter.sendMail({
          from: `"Sspacia Center Management" <${sender}>`,
          to: recipientTo,
          cc: recipientCc,
          subject,
          text: plainText,
          html: htmlBody,
        });

        // Record today in dueDateAlertSentDates
        if (!sentDates.includes(todayYMD)) {
          sentDates.push(todayYMD);
        }

        await (prisma as any).expenseRecord.update({
          where: { id: rec.id },
          data: {
            dueDateAlertSentDates: JSON.stringify(sentDates),
          },
        });

        sentCount++;
        items.push({
          id: rec.id,
          description: rec.description,
          vendorName,
          locationName: centerName,
          amount: rec.amount,
          dueDate: formattedDueDate,
          daysRemaining,
          status: 'SENT',
        });
      } catch (sendError: any) {
        console.error(`[EXPENSE_DUE_ALERT] Failed to send email for expense #${rec.id}:`, sendError);
        items.push({
          id: rec.id,
          description: rec.description,
          vendorName,
          locationName: centerName,
          amount: rec.amount,
          dueDate: formattedDueDate,
          daysRemaining,
          status: 'FAILED',
          message: sendError?.message || 'SMTP Error',
        });
      }
    }

    return {
      success: true,
      totalPendingDueExpenses: candidateExpenses.length,
      sentCount,
      skippedCount,
      items,
    };
  } catch (error: any) {
    console.error('[EXPENSE_DUE_ALERT_CRON] Error running due date alerts:', error);
    return {
      success: false,
      totalPendingDueExpenses: 0,
      sentCount,
      skippedCount,
      items,
      error: error?.message || 'Internal error running due date alerts',
    };
  }
}
