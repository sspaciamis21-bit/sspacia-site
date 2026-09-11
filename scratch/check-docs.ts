import prisma from '../src/lib/prisma';

async function main() {
  const doc = await prisma.storedDocument.findUnique({
    where: { id: 172 }
  });
  console.log('Doc 172:', doc?.fileName, doc?.mimeType, doc?.fileSize);

  const cmRecordsWithInvoice = await prisma.expenseRecord.findMany({
    where: {
      createdByRole: 'COMMUNITY_MANAGER',
      invoiceUrl: { not: null }
    },
    select: { id: true, invoiceUrl: true, attachmentUrl: true, description: true }
  });
  console.log('CM records with invoiceUrl:', cmRecordsWithInvoice.length);
  console.log('First 5:', cmRecordsWithInvoice.slice(0, 5));
}

main().catch(console.error).finally(() => process.exit(0));
