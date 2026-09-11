import prisma from '../src/lib/prisma';

async function main() {
  const records = await prisma.expenseRecord.findMany({
    select: {
      id: true,
      receiptNo: true,
      attachmentUrl: true,
      invoiceUrl: true,
      sourceSheetRowId: true,
      createdByRole: true,
      description: true,
    }
  });

  const urlReceipts = records.filter(r => r.receiptNo && (r.receiptNo.startsWith('http') || r.receiptNo.startsWith('/') || r.receiptNo.includes('.pdf') || r.receiptNo.includes('.jpg') || r.receiptNo.includes('.png')));
  console.log('Total records:', records.length);
  console.log('Records where receiptNo looks like a URL/file:', urlReceipts.length);
  console.log('Sample url receipts:', urlReceipts.slice(0, 5));

  const withAttachment = records.filter(r => !!r.attachmentUrl);
  const withInvoice = records.filter(r => !!r.invoiceUrl);
  console.log('Records with attachmentUrl:', withAttachment.length);
  console.log('Records with invoiceUrl:', withInvoice.length);
  console.log('Sample records with invoiceUrl but no attachmentUrl:');
  console.log(records.filter(r => !r.attachmentUrl && !!r.invoiceUrl).slice(0, 5));
}

main().catch(console.error).finally(() => process.exit(0));
