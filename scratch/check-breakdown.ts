import prisma from '../src/lib/prisma';

async function main() {
  const records = await prisma.expenseRecord.findMany({
    select: {
      id: true,
      createdByRole: true,
      attachmentUrl: true,
      invoiceUrl: true,
      receiptNo: true,
      description: true
    }
  });

  console.log('Breakdown by role:');
  const roleCounts: Record<string, number> = {};
  for (const r of records) {
    const role = r.createdByRole || 'UNKNOWN';
    roleCounts[role] = (roleCounts[role] || 0) + 1;
  }
  console.log(roleCounts);

  const cmWithInvoice = records.filter(r => (r.createdByRole === 'COMMUNITY_MANAGER' || !r.createdByRole) && r.invoiceUrl);
  console.log('CM records with invoiceUrl:', cmWithInvoice.length);

  const accRecords = records.filter(r => r.createdByRole === 'ACCOUNTANT');
  console.log('Accountant records:', accRecords.length);
  for (const a of accRecords) {
    console.log('Acc record:', a.id, a.description, 'attachmentUrl:', a.attachmentUrl, 'invoiceUrl:', a.invoiceUrl);
  }
}

main().catch(console.error).finally(() => process.exit(0));
