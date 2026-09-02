import prisma from '../src/lib/prisma';

async function main() {
  const invCols: any = await prisma.$queryRawUnsafe('SHOW COLUMNS FROM `InvoiceRecord`');
  console.log('InvoiceRecord columns:\n', invCols.map((c: any) => `${c.Field} (${c.Type})`).join('\n'));

  const oldCols: any = await prisma.$queryRawUnsafe('SHOW COLUMNS FROM `OldInvoiceHistory`');
  console.log('\nOldInvoiceHistory columns:\n', oldCols.map((c: any) => `${c.Field} (${c.Type})`).join('\n'));
}

main().catch(console.error);
