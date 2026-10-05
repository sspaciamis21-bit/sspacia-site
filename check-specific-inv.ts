import { PrismaClient } from '@prisma/client';

const DB_URL = 'mysql://u434618106_vrajesh_test:ShriShyam%231234@srv2088.hstgr.io:3306/u434618106_sspacia_test';

const prisma = new PrismaClient({
  datasources: { db: { url: DB_URL } },
});

async function main() {
  try {
    const helios = await (prisma as any).invoiceRecord.findMany({
      where: { companyName: { contains: 'Helios' } },
      include: { attachedInvoice: true },
    });
    console.log('Helios invoices:', JSON.stringify(helios, null, 2));

    const novel = await (prisma as any).invoiceRecord.findMany({
      where: { companyName: { contains: 'Novel' } },
      include: { attachedInvoice: true },
    });
    console.log('Novel invoices:', JSON.stringify(novel, null, 2));

    const s360 = await (prisma as any).invoiceRecord.findMany({
      where: { companyName: { contains: '360 ONE' } },
      include: { attachedInvoice: true },
    });
    console.log('360 ONE invoices:', JSON.stringify(s360, null, 2));

  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
