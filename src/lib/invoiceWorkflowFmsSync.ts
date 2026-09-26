/**
 * invoiceWorkflowFmsSync.ts — Multi-step Live Event-Driven Invoice Workflow FMS Synchronization
 * Target Spreadsheet: https://docs.google.com/spreadsheets/d/1a7ajEb9clt8ORnM73rtKem0_bT9Ifl8T5J6mifoonX0/edit
 *
 * Steps synchronized into Tab: "INV PROCESS FMS" (Cols A to O):
 * 1. "Review Invoices & Send to Accountant to attach tally pdf" (Cols D:G)
 *    - Triggered when invoice entry arrives in invoice section (Planned: Col D)
 *    - Actual logged when Community Manager clicks "Send to Accountant" (Actual: Col E, Status: Col F -> "Done")
 * 2. "Attach Tally Invoice PDF and send back to CM" (Cols H:K)
 *    - Planned automatically set = Step 1 Actual (Col H, Status: Col J -> "Pending")
 *    - Actual logged when Accountant (dipendra) attaches Tally Invoice PDF (Actual: Col I, Status: Col J -> "Done")
 * 3. "Approve and send Inv to client" (Cols L:O)
 *    - Planned automatically set = Step 2 Actual (Col L, Status: Col N -> "Pending")
 *    - Actual logged when CM approves invoice (Actual: Col M, Status: Col N -> "Done")
 */

import prisma from '@/lib/prisma';

const WEBHOOK_URL =
  process.env.EXPENSE_FMS_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbzUagdoyhVrN-e-mmfe3oBfpH8ue1fB2hGLyrkTynE41J5VHbe9eiKDPVOklLG2AYVuDQ/exec';

/**
 * Format IST timestamp to match Google Sheet: "dd/MM/yyyy HH:mm:ss" (24-hour, NO AM/PM)
 * e.g. "14/08/2026 16:16:31"
 */
export function formatFmsTimestamp(date: Date = new Date()): string {
  const istDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = String(istDate.getDate()).padStart(2, '0');
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const year = istDate.getFullYear();
  const hours = String(istDate.getHours()).padStart(2, '0');
  const minutes = String(istDate.getMinutes()).padStart(2, '0');
  const seconds = String(istDate.getSeconds()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Send payload to Master Google Apps Script Webhook asynchronously
 */
async function sendToFmsWebhook(payload: Record<string, any>): Promise<any> {
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  } catch (err: any) {
    console.warn(`[Invoice FMS Sync Error] ${payload.action || 'unknown'}:`, err?.message || err);
    return { error: err?.message || String(err) };
  }
}

/**
 * Retrieve Invoice details for FMS matching
 */
async function getInvoiceFmsDetails(invoiceRecordId: number) {
  const inv = await (prisma as any).invoiceRecord.findUnique({
    where: { id: invoiceRecordId },
    include: {
      clientMaster: {
        include: {
          createdBy: {
            include: {
              assignedLocations: {
                include: {
                  location: true,
                },
              },
            },
          },
        },
      },
      createdBy: {
        include: {
          assignedLocations: {
            include: {
              location: true,
            },
          },
        },
      },
    },
  });

  if (!inv) return null;

  const centerName =
    inv.createdBy?.assignedLocations?.[0]?.location?.name ||
    inv.clientMaster?.createdBy?.assignedLocations?.[0]?.location?.name ||
    'Mercado';

  const invoiceMonth = inv.billingMonth || 'Current Month';
  const companyName = inv.companyName || inv.clientMaster?.companyName || 'Unknown Client';

  return {
    invoice: inv,
    centerName,
    invoiceMonth,
    companyName,
  };
}

/**
 * STEP 1: Invoice Entry Arrives in Invoice Section (Planned)
 * Called when an invoice is created/generated in the invoice section
 */
export async function syncInvoiceWorkflowArrival(invoiceRecordId: number, customTimestamp?: Date) {
  try {
    const details = await getInvoiceFmsDetails(invoiceRecordId);
    if (!details) return;

    const arrivalTime = formatFmsTimestamp(customTimestamp || details.invoice.createdAt || new Date());

    return await sendToFmsWebhook({
      action: 'invoice_fms_arrival',
      centerName: details.centerName,
      invoiceMonth: details.invoiceMonth,
      companyName: details.companyName,
      planned: arrivalTime,
      timestamp: arrivalTime,
    });
  } catch (err) {
    console.warn('[syncInvoiceWorkflowArrival notice]:', err);
  }
}

/**
 * STEP 1 ACTUAL & STEP 2 PLANNED: CM Reviews Invoices Entry
 * Called when Community Manager marks an invoice entry as reviewed
 */
export async function syncInvoiceWorkflowReviewed(invoiceRecordId: number, customTimestamp?: Date) {
  try {
    const details = await getInvoiceFmsDetails(invoiceRecordId);
    if (!details) return;

    const actualTime = formatFmsTimestamp(customTimestamp || new Date());

    return await sendToFmsWebhook({
      action: 'invoice_fms_reviewed',
      centerName: details.centerName,
      invoiceMonth: details.invoiceMonth,
      companyName: details.companyName,
      actual: actualTime,
      nextPlanned: actualTime,
    });
  } catch (err) {
    console.warn('[syncInvoiceWorkflowReviewed notice]:', err);
  }
}

/**
 * STEP 2 ACTUAL & STEP 3 PLANNED: CM Sends to Accountant to attach tally pdf
 * Called when invoice status transitions to 'SENT_TO_ACCOUNTANT'
 */
export async function syncInvoiceWorkflowSentToAccountant(invoiceRecordId: number, customTimestamp?: Date) {
  try {
    const details = await getInvoiceFmsDetails(invoiceRecordId);
    if (!details) return;

    const sentTime = formatFmsTimestamp(customTimestamp || new Date());

    return await sendToFmsWebhook({
      action: 'invoice_fms_sent_accountant',
      centerName: details.centerName,
      invoiceMonth: details.invoiceMonth,
      companyName: details.companyName,
      actual: sentTime,
      nextPlanned: sentTime,
    });
  } catch (err) {
    console.warn('[syncInvoiceWorkflowSentToAccountant notice]:', err);
  }
}

/**
 * STEP 3 ACTUAL & STEP 4 PLANNED: Accountant (dipendra) attaches Tally Invoice PDF
 * Called when accountant uploads Tally PDF (status transitions to 'INVOICE_ATTACHED')
 */
export async function syncInvoiceWorkflowPdfAttached(invoiceRecordId: number, customTimestamp?: Date) {
  try {
    const details = await getInvoiceFmsDetails(invoiceRecordId);
    if (!details) return;

    const attachedTime = formatFmsTimestamp(customTimestamp || new Date());

    return await sendToFmsWebhook({
      action: 'invoice_fms_pdf_attached',
      centerName: details.centerName,
      invoiceMonth: details.invoiceMonth,
      companyName: details.companyName,
      actual: attachedTime,
      nextPlanned: attachedTime,
    });
  } catch (err) {
    console.warn('[syncInvoiceWorkflowPdfAttached notice]:', err);
  }
}

/**
 * STEP 4 ACTUAL: CM Approves and Sends Inv to Client
 * Called when CM approves invoice / sends tax invoice to client (status 'APPROVED')
 */
export async function syncInvoiceWorkflowApprovedClient(invoiceRecordId: number, customTimestamp?: Date) {
  try {
    const details = await getInvoiceFmsDetails(invoiceRecordId);
    if (!details) return;

    const approvedTime = formatFmsTimestamp(customTimestamp || new Date());

    return await sendToFmsWebhook({
      action: 'invoice_fms_approved_client',
      centerName: details.centerName,
      invoiceMonth: details.invoiceMonth,
      companyName: details.companyName,
      actual: approvedTime,
    });
  } catch (err) {
    console.warn('[syncInvoiceWorkflowApprovedClient notice]:', err);
  }
}

/**
 * Master Setup Headers: Initializes the exact headers in 'expense fms' (Cols F:T)
 * and 'Accounts' (Cols U:X)
 */
export async function setupInvoiceWorkflowFmsHeaders() {
  return await sendToFmsWebhook({
    action: 'invoice_fms_setup_headers',
  });
}
