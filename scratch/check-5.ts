import prisma from '../src/lib/prisma';

async function main() {
  const records = await prisma.expenseRecord.findMany({
    where: {
      createdByRole: 'COMMUNITY_MANAGER',
      invoiceUrl: { not: null }
    },
    select: { id: true, invoiceUrl: true, attachmentUrl: true, description: true }
  });
  console.log('Remaining 5 CM records with invoiceUrl:', records);
}

main().catch(console.error).finally(() => process.exit(0));
