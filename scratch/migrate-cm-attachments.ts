import prisma from '../src/lib/prisma';

async function main() {
  const records = await prisma.expenseRecord.findMany({
    where: {
      createdByRole: 'COMMUNITY_MANAGER',
      invoiceUrl: { not: null },
      OR: [
        { attachmentUrl: null },
        { attachmentUrl: '' }
      ]
    },
    select: { id: true, invoiceUrl: true }
  });

  console.log(`Found ${records.length} CM records to migrate from invoiceUrl to attachmentUrl.`);

  let updatedCount = 0;
  for (const r of records) {
    await prisma.expenseRecord.update({
      where: { id: r.id },
      data: {
        attachmentUrl: r.invoiceUrl,
        invoiceUrl: null,
      }
    });
    updatedCount++;
  }

  console.log(`Successfully migrated ${updatedCount} records.`);
}

main().catch(console.error).finally(() => process.exit(0));
