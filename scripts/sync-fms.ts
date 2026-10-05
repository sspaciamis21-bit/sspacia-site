import { PrismaClient } from '@prisma/client';

const DB_URL = 'mysql://u434618106_vrajesh_test:ShriShyam%231234@srv2088.hstgr.io:3306/u434618106_sspacia_test';
const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbzUagdoyhVrN-e-mmfe3oBfpH8ue1fB2hGLyrkTynE41J5VHbe9eiKDPVOklLG2AYVuDQ/exec';

const prisma = new PrismaClient({
  datasources: { db: { url: DB_URL } },
});

function formatFmsTimestamp(date: Date = new Date()): string {
  const istDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = String(istDate.getDate()).padStart(2, '0');
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const year = istDate.getFullYear();
  const hours = String(istDate.getHours()).padStart(2, '0');
  const minutes = String(istDate.getMinutes()).padStart(2, '0');
  const seconds = String(istDate.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

const MONTH_MAP: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
  may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8,
  september: 9, sep: 9, sept: 9, october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
};

function parseBillingMonthSortKey(monthStr?: string | null, fallbackDate?: Date): number {
  if (monthStr) {
    const clean = String(monthStr).trim().toLowerCase();
    const isoMatch = clean.match(/^(\d{4})[-/](\d{1,2})/);
    if (isoMatch) {
      return parseInt(isoMatch[1], 10) * 100 + parseInt(isoMatch[2], 10);
    }
    let year = 0, month = 0;
    const tokens = clean.split(/[\s,_\-]+/).filter(Boolean);
    for (const token of tokens) {
      if (/^\d{4}$/.test(token)) year = parseInt(token, 10);
      else if (MONTH_MAP[token]) month = MONTH_MAP[token];
    }
    if (year > 0 && month > 0) return year * 100 + month;
  }
  if (fallbackDate) {
    const d = new Date(fallbackDate);
    return d.getFullYear() * 100 + (d.getMonth() + 1);
  }
  return 0;
}

async function main() {
  try {
    console.log('1. Setting up INV PROCESS FMS headers...');
    const hRes = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'invoice_fms_setup_headers' }),
    });
    console.log('Headers result:', await hRes.json());

    console.log('2. Fetching invoices from database...');
    const invoices = await (prisma as any).invoiceRecord.findMany({
      include: {
        clientMaster: {
          include: {
            createdBy: {
              include: { assignedLocations: { include: { location: true } } },
            },
          },
        },
        createdBy: {
          include: { assignedLocations: { include: { location: true } } },
        },
        attachedInvoice: true,
      },
    });

    console.log(`Fetched ${invoices.length} invoices.`);

    invoices.sort((a: any, b: any) => {
      const keyA = parseBillingMonthSortKey(a.billingMonth, a.createdAt);
      const keyB = parseBillingMonthSortKey(b.billingMonth, b.createdAt);
      if (keyA !== keyB) return keyA - keyB;
      return (a.id || 0) - (b.id || 0);
    });

    const items = invoices.map((inv: any) => {
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

      // Col D: Log Timestamp (Exact timestamp when invoice entry was created/generated in invoice section)
      const logTimestamp = formatFmsTimestamp(inv.createdAt);

      // Col E: Step 1 Planned
      const isAutoMonth = inv?.sendType === 'AUTOMATIC_MONTH_END' || inv?.productGroupKey === 'MONTHLY_CONSOLIDATED';
      let step1Planned = logTimestamp;
      if (isAutoMonth && inv?.createdAt) {
        const createdDate = new Date(inv.createdAt);
        const istDate = new Date(createdDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        const day = String(istDate.getDate()).padStart(2, '0');
        const month = String(istDate.getMonth() + 1).padStart(2, '0');
        const year = istDate.getFullYear();
        step1Planned = `${day}/${month}/${year} 10:00:00`;
      }

      // Col F: Step 1 Actual (when CM sent to accountant)
      const isSentToAccountant = ['SENT_TO_ACCOUNTANT', 'REJECTED_WITH_REMARKS', 'INVOICE_ATTACHED', 'APPROVED'].includes(status);
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

      // Col J: Step 2 Actual (when accountant attached PDF)
      const isAttached = ['INVOICE_ATTACHED', 'APPROVED', 'REJECTED_WITH_REMARKS'].includes(status) && Boolean(inv.attachedInvoice?.fileUrl || inv.attachedInvoice?.createdAt);
      const step2Actual = isAttached ? attachedTime : '';

      // Col N: Step 3 Actual (when CM approved or rejected tally PDF)
      const isApproved = status === 'APPROVED';
      const isRejected = status === 'REJECTED_WITH_REMARKS';
      const step3Actual = isApproved ? signedTime : (isRejected ? updatedTime : '');

      // Col Q: Website Auto send Email to Client with Attached Invoice (Sent or Pending)
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
        step2Actual,
        step3Actual,
        emailStatus,
        clientEmailSentAt: inv.clientEmailSentAt ? formatFmsTimestamp(inv.clientEmailSentAt) : null,
      };
    });

    console.log('3. Pushing items to INV PROCESS FMS via bootstrap sync...');
    const syncRes = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'invoice_fms_bootstrap_sync',
        items,
      }),
    });
    console.log('Sync result:', await syncRes.json());

    console.log('4. Checking Suspense FMS...');
    const suspensePayments = await (prisma as any).$queryRawUnsafe(`
      SELECT p.*, a.id as allocId, a.centerName, a.decision, a.actualTimestamp, a.reviewedAt, a.fmsStatus
      FROM SuspensePayment p
      LEFT JOIN SuspenseCenterAllocation a ON p.id = a.suspensePaymentId
      ORDER BY p.id ASC
    `);

    // Group allocations by payment
    const paymentMap: Record<number, any> = {};
    for (const row of suspensePayments as any[]) {
      if (!paymentMap[row.id]) {
        paymentMap[row.id] = {
          id: row.id,
          payReceiveDate: row.payReceiveDate,
          suspensePaymentType: row.suspensePaymentType,
          logTimestamp: formatFmsTimestamp(new Date(row.createdAt || row.enteredAt)),
          plannedTimestamp: row.plannedTimestamp,
          allocations: [],
        };
      }
      if (row.centerName) {
        paymentMap[row.id].allocations.push({
          centerName: row.centerName,
          decision: row.decision,
          actualTimestamp: row.actualTimestamp,
          actual: row.actualTimestamp,
          reviewedAt: row.reviewedAt ? formatFmsTimestamp(new Date(row.reviewedAt)) : null,
          fmsStatus: row.fmsStatus,
        });
      }
    }

    const sItems = Object.values(paymentMap);
    console.log(`Pushing ${sItems.length} suspense records to SUSPENSE tab...`);
    const sSyncRes = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'suspense_bootstrap_sync',
        items: sItems,
      }),
    });
    console.log('Suspense sync result:', await sSyncRes.json());

    console.log('✅ ALL FMS TABS SYNCHRONIZED SUCCESSFULLY!');
  } catch (err) {
    console.error('Error during live push:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
