import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  formatFmsTimestamp,
  setupInvoiceWorkflowFmsHeaders,
} from '@/lib/invoiceWorkflowFmsSync';

const WEBHOOK_URL =
  process.env.EXPENSE_FMS_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbzUagdoyhVrN-e-mmfe3oBfpH8ue1fB2hGLyrkTynE41J5VHbe9eiKDPVOklLG2AYVuDQ/exec';

async function fetchAugSepItems() {
  const invoices = await (prisma as any).invoiceRecord.findMany({
    orderBy: [
      { billingMonth: 'asc' },
      { id: 'asc' },
    ],
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

  return invoices.map((inv: any) => {
    const centerName =
      inv.createdBy?.assignedLocations?.[0]?.location?.name ||
      inv.clientMaster?.createdBy?.assignedLocations?.[0]?.location?.name ||
      'Mercado';

    const invoiceMonth = inv.billingMonth || 'August 2026';
    const companyName = inv.companyName || inv.clientMaster?.companyName || 'Unknown Client';
    const status = inv.status || 'PENDING_CM_REVIEW';

    const createdTime = formatFmsTimestamp(inv.createdAt);
    const updatedTime = formatFmsTimestamp(inv.updatedAt);
    const attachedTime = inv.attachedInvoice?.createdAt ? formatFmsTimestamp(inv.attachedInvoice.createdAt) : updatedTime;
    const signedTime = inv.signedAt ? formatFmsTimestamp(inv.signedAt) : updatedTime;

    // Step 1: Review Invoices & Send to Accountant to attach tally pdf
    const isSentToAccountant = ['SENT_TO_ACCOUNTANT', 'INVOICE_ATTACHED', 'APPROVED'].includes(status);
    const step1Planned = createdTime;
    const step1Actual = isSentToAccountant ? updatedTime : '';
    const step1Status = isSentToAccountant ? 'Done' : 'Pending';

    // Step 2: Attach Tally Invoice PDF and send back to CM
    const isAttached = ['INVOICE_ATTACHED', 'APPROVED'].includes(status);
    const step2Planned = isSentToAccountant ? step1Actual : '';
    const step2Actual = isAttached ? attachedTime : '';
    const step2Status = isAttached ? 'Done' : (isSentToAccountant ? 'Pending' : '');

    // Step 3: Approve and send Inv to client
    const isApproved = status === 'APPROVED';
    const step3Planned = isAttached ? step2Actual : '';
    const step3Actual = isApproved ? signedTime : '';
    const step3Status = isApproved ? 'Done' : (isAttached ? 'Pending' : '');

    return {
      id: inv.id,
      centerName,
      invoiceMonth,
      companyName,
      status,
      step1Planned,
      step1Actual,
      step1Status,
      step2Planned,
      step2Actual,
      step2Status,
      step3Planned,
      step3Actual,
      step3Status,
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
