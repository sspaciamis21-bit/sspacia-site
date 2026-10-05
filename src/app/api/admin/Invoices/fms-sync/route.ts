import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  formatFmsTimestamp,
  getInvoiceStep1PlannedTimestamp,
  setupInvoiceWorkflowFmsHeaders,
} from '@/lib/invoiceWorkflowFmsSync';

const WEBHOOK_URL =
  process.env.EXPENSE_FMS_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbzUagdoyhVrN-e-mmfe3oBfpH8ue1fB2hGLyrkTynE41J5VHbe9eiKDPVOklLG2AYVuDQ/exec';

const MONTH_MAP: Record<string, number> = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
};

export function parseBillingMonthSortKey(monthStr?: string | null, fallbackDate?: Date): number {
  if (monthStr) {
    const clean = String(monthStr).trim().toLowerCase();

    // Check for ISO format: YYYY-MM
    const isoMatch = clean.match(/^(\d{4})[-/](\d{1,2})/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10);
      return year * 100 + month;
    }

    let year = 0;
    let month = 0;
    const tokens = clean.split(/[\s,_\-]+/).filter(Boolean);
    for (const token of tokens) {
      if (/^\d{4}$/.test(token)) {
        year = parseInt(token, 10);
      } else if (MONTH_MAP[token]) {
        month = MONTH_MAP[token];
      }
    }

    if (year > 0 && month > 0) {
      return year * 100 + month;
    }
  }

  if (fallbackDate) {
    const d = new Date(fallbackDate);
    return d.getFullYear() * 100 + (d.getMonth() + 1);
  }

  return 0;
}

async function fetchAugSepItems() {
  const invoices = await (prisma as any).invoiceRecord.findMany({
    include: {
      clientMaster: {
        include: {
          createdBy: {
            include: {
              assignedLocations: {
                include: { location: true },
              },
            },
          },
        },
      },
      createdBy: {
        include: {
          assignedLocations: {
            include: { location: true },
          },
        },
      },
      attachedInvoice: true,
    },
  });

  // Chronologically sort by billingMonth (August -> September -> October etc.) then by ID
  invoices.sort((a: any, b: any) => {
    const keyA = parseBillingMonthSortKey(a.billingMonth, a.createdAt);
    const keyB = parseBillingMonthSortKey(b.billingMonth, b.createdAt);
    if (keyA !== keyB) return keyA - keyB;
    return (a.id || 0) - (b.id || 0);
  });

  return invoices.map((inv: any) => {
    const centerName =
      inv.createdBy?.assignedLocations?.[0]?.location?.name ||
      inv.clientMaster?.createdBy?.assignedLocations?.[0]?.location?.name ||
      'Mercado';

    const invoiceMonth = inv.billingMonth || 'August 2026';
    const companyName = inv.companyName || inv.clientMaster?.companyName || 'Unknown Client';
    const status = inv.status || 'PENDING_CM_REVIEW';

    const updatedTime = formatFmsTimestamp(inv.updatedAt);
    const attachedTime = inv.attachedInvoice?.createdAt ? formatFmsTimestamp(inv.attachedInvoice.createdAt) : updatedTime;
    const signedTime = inv.signedAt ? formatFmsTimestamp(inv.signedAt) : updatedTime;

    // Step 1: Review Invoices & Send to Accountant to attach tally pdf
    const isSentToAccountant = ['SENT_TO_ACCOUNTANT', 'REJECTED_WITH_REMARKS', 'INVOICE_ATTACHED', 'APPROVED'].includes(status);
    const step1Planned = getInvoiceStep1PlannedTimestamp(inv);
    let step1Actual = '';
    if (isSentToAccountant) {
      if (inv.sentAt && Math.abs(new Date(inv.sentAt).getTime() - new Date(inv.createdAt).getTime()) > 5000) {
        step1Actual = formatFmsTimestamp(inv.sentAt);
      } else if (inv.status === 'SENT_TO_ACCOUNTANT') {
        step1Actual = formatFmsTimestamp(inv.updatedAt);
      } else if (inv.sentAt) {
        step1Actual = formatFmsTimestamp(inv.sentAt);
      }
    }
    const step1Status = isSentToAccountant ? 'Done' : 'Pending';

    // Step 2: Attach Tally Invoice PDF and send back to CM
    const isAttached = ['INVOICE_ATTACHED', 'APPROVED', 'REJECTED_WITH_REMARKS'].includes(status) && Boolean(inv.attachedInvoice?.fileUrl || inv.attachedInvoice?.createdAt);
    const step2Planned = isSentToAccountant ? step1Actual : '';
    const step2Actual = isAttached ? attachedTime : '';
    const step2Status = isAttached ? 'Done' : (isSentToAccountant ? 'Pending' : '');

    // Step 3: Approve or reject accountant attached invoice pdf
    const isApproved = status === 'APPROVED';
    const isRejected = status === 'REJECTED_WITH_REMARKS';
    const step3Planned = isAttached ? step2Actual : '';
    const step3Actual = isApproved ? (inv.signedAt ? formatFmsTimestamp(inv.signedAt) : updatedTime) : (isRejected ? updatedTime : '');
    const step3Status = (isApproved || isRejected) ? 'Done' : (isAttached ? 'Pending' : '');

    const logTimestamp = formatFmsTimestamp(inv.createdAt);
    const emailStatus = inv.clientEmailSentAt ? 'Sent' : 'Pending';

    return {
      id: inv.id,
      centerName,
      invoiceMonth,
      companyName,
      status,
      logTimestamp,
      step1Planned,
      step1Actual,
      step1Status,
      step2Planned,
      step2Actual,
      step2Status,
      step3Planned,
      step3Actual,
      step3Status,
      clientEmailSentAt: inv.clientEmailSentAt ? formatFmsTimestamp(inv.clientEmailSentAt) : null,
      emailStatus,
    };
  });
}

export async function GET(request: Request) {
  try {
    const items = await fetchAugSepItems();
    return NextResponse.json({
      success: true,
      count: items.length,
      items,
    });
  } catch (error: any) {
    console.error('Fetch Aug/Sep items error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch items' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || 'sync_aug_sep';

    if (action === 'setup_headers') {
      const result = await setupInvoiceWorkflowFmsHeaders();
      return NextResponse.json({ success: true, result });
    }

    if (action === 'sync_aug_sep' || action === 'sync_all') {
      const items = await fetchAugSepItems();

      // Send in one fast batch to Master Google Apps Script Webhook
      const fmsRes = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'invoice_fms_bootstrap_sync',
          items,
        }),
      });

      const fmsText = await fmsRes.text();
      let parsed = {};
      try {
        parsed = JSON.parse(fmsText);
      } catch {
        parsed = { raw: fmsText };
      }

      return NextResponse.json({
        success: true,
        message: `Successfully sent ${items.length} August & September invoice workflow records to Google Sheets!`,
        count: items.length,
        fmsResponse: parsed,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Invoice FMS sync error:', error);
    return NextResponse.json({ error: error?.message || 'FMS sync error' }, { status: 500 });
  }
}
