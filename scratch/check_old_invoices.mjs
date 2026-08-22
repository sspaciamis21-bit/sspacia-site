import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const rows = await prisma.$queryRawUnsafe('SELECT * FROM `OldInvoiceHistory`');
    console.log('Total rows in OldInvoiceHistory table:', rows.length);
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error('Error querying OldInvoiceHistory:', err);
  }
}

main().finally(() => prisma.$disconnect());
