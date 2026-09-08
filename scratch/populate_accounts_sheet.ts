import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import prisma from '../src/lib/prisma';
import { findOldInvoices } from '../src/lib/old-invoices-db';
import { formatIstTimestamp, computePlannedDueDate, normalizeMonthYear } from '../src/lib/accountsFmsSync';

const WEBHOOK_URL =
  process.env.EXPENSE_FMS_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbzUagdoyhVrN-e-mmfe3oBfpH8ue1fB2hGLyrkTynE41J5VHbe9eiKDPVOklLG2AYVuDQ/exec';

function formatInvoiceHyperlink(rawUrl?: string | null): string {
  if (!rawUrl || !rawUrl.trim() || rawUrl === 'N/A' || rawUrl === '-') return '-';
  const trimmed = rawUrl.trim();
  let fullUrl = trimmed;
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    const base = process.env.NEXT_PUBLIC_APP_URL || 'https://sspacia.com';
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
    fullUrl = `${cleanBase}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
  }
  return `=HYPERLINK("${fullUrl}", "View")`;
}

async function main() {
  console.log('🚀 Fetching Live Approved Invoices & Old Invoices for Accounts FMS sync...');

  // 1. Fetch Live Approved Invoices
  const liveInvoices = await (prisma as any).invoiceRecord.findMany({
    where: { status: 'APPROVED' },
    include: { clientMaster: true, attachedInvoice: true },
    orderBy: [{ billingMonth: 'asc' }, { companyName: 'asc' }, { id: 'asc' }],
  });

  const liveItems = liveInvoices.map((inv: any) => {
    const companyName = String(inv.companyName || inv.clientMaster?.companyName || 'Client').trim();
    const billingMonth = normalizeMonthYear(inv.billingMonth || 'Current Month');

    let invoiceLink = inv.digitallySignedPdfUrl || inv.attachedInvoice?.fileUrl || '';
    const hyperlinkFormula = formatInvoiceHyperlink(invoiceLink);

    const dueDay = Number(inv.paymentDueDay || inv.clientMaster?.paymentDueDay || 5);
    const planned = computePlannedDueDate(billingMonth, dueDay, inv.dueDate);

    const totalAmt = Number(inv.totalAmount || inv.amount || 0);
    const recAmt = Number(inv.receiveAmount || 0);
    const balance = Math.max(0, totalAmt - recAmt);

    const isPaid = balance <= 0 || (recAmt >= totalAmt && totalAmt > 0) || inv.paymentStatus === 'RECEIVED';
    const actual = isPaid ? formatIstTimestamp(inv.payReceiveDate ? new Date(inv.payReceiveDate) : new Date(inv.updatedAt || inv.createdAt)) : '';
    const status = isPaid ? 'Done' : 'Pending';

    return {
      invoiceMonth: billingMonth,
      companyName,
      invoiceLink: hyperlinkFormula,
      planned,
      actual,
      status,
    };
  });

  console.log(`✅ Prepared ${liveItems.length} Live Approved Invoices with 'View' hyperlinks.`);

  // 2. Fetch Old Invoices Archive (April - July 2026)
  const oldInvoices = await findOldInvoices({ includeLiveMonths: false });

  const oldItems = oldInvoices.map((oldInv: any) => {
    const companyName = String(oldInv.companyName || '').trim();
    const month = String(oldInv.month || '').trim();
    const invoiceLink = String(oldInv.invoiceUrl || '').trim();
    const hyperlinkFormula = formatInvoiceHyperlink(invoiceLink);

    // Planned timestamp: upload date or April 2026 / month date
    const planned = formatIstTimestamp(oldInv.createdAt ? new Date(oldInv.createdAt) : new Date());

    const amount = Number(oldInv.amount || 0);
    const recAmount = Number(oldInv.receiveAmount || 0);
    const balance = Math.max(0, amount - recAmount);

    const isPaid = balance <= 0 || (recAmount >= amount && amount > 0) || (oldInv.utrNumber && String(oldInv.utrNumber).trim() !== '');
    const actual = isPaid ? formatIstTimestamp(oldInv.payReceiveDate ? new Date(oldInv.payReceiveDate) : new Date(oldInv.updatedAt || oldInv.createdAt)) : '';
    const status = isPaid ? 'Done' : 'Pending';

    return {
      invoiceMonth: month,
      companyName,
      invoiceLink: hyperlinkFormula,
      planned,
      actual,
      status,
    };
  });

  console.log(`✅ Prepared ${oldItems.length} Old Invoices with 'View' hyperlinks.`);

  const payload = {
    action: 'accounts_bootstrap_sync',
    sheetName: 'Accounts',
    liveItems,
    oldItems,
  };

  console.log(`📤 Dispatching bootstrap sync to Google Sheet (${WEBHOOK_URL})...`);
  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const responseText = await res.text();
  console.log('Response from Apps Script:', responseText);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error in populate script:', err);
    process.exit(1);
  });
