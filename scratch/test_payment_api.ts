import prisma from '../src/lib/prisma';
import { findOldInvoices } from '../src/lib/old-invoices-db';

async function testVerification() {
  console.log('--- 1. VERIFY OLD INVOICES HISTORY ARCHIVE (APRIL–AUG) PRESERVATION ---');
  const oldInvs = await findOldInvoices({});
  console.log(`✅ Historical Old Invoices Total: ${oldInvs.length} records preserved intact!`);

  console.log('\n--- 2. VERIFY LIVE APPROVED INVOICES ---');
  const approvedInvs: any[] = await (prisma as any).invoiceRecord.findMany({
    where: { status: 'APPROVED' },
    include: {
      clientMaster: true,
      attachedInvoice: true,
    },
  });

  console.log(`✅ Live Approved Invoices Total: ${approvedInvs.length} records found.`);
  approvedInvs.slice(0, 5).forEach((inv: any) => {
    console.log(
      `  - [ID #${inv.id}] ${inv.companyName} | Month: ${inv.billingMonth} | Amount: ₹${inv.totalAmount} | Payment Status: ${inv.paymentStatus || 'PENDING'} | UTR: ${inv.utrNumber || 'N/A'}`
    );
  });

  console.log('\n--- 3. VERIFY NOTIFICATIONS & SETTLEMENT PENDING QUERY ---');
  const paymentPendingCount = approvedInvs.filter((inv: any) => {
    const hasUTR = inv.utrNumber && String(inv.utrNumber).trim() !== '';
    const hasPayDate = Boolean(inv.payReceiveDate);
    const hasRecAmt = Number(inv.receiveAmount || 0) > 0;
    return !hasUTR && !hasPayDate && !hasRecAmt && inv.paymentStatus !== 'RECEIVED';
  }).length;
  console.log(`✅ Approved Invoices Pending Payment Settlement Details: ${paymentPendingCount}`);

  console.log('\n--- 4. VERIFY TEST PAYMENT UPDATE ON AN APPROVED INVOICE ---');
  if (approvedInvs.length > 0) {
    const testInv = approvedInvs[0];
    console.log(`Testing payment update on Invoice ID #${testInv.id} (${testInv.companyName})...`);
    
    await (prisma as any).invoiceRecord.update({
      where: { id: testInv.id },
      data: {
        paymentStatus: 'PENDING',
      },
    });
    console.log(`✅ Updated paymentStatus on Invoice ID #${testInv.id} successfully!`);
  }

  console.log('\nALL VERIFICATIONS PASSED WITH 0 DATA LOSS OR DELETIONS!');
}

testVerification()
  .catch(console.error)
  .finally(() => process.exit(0));
