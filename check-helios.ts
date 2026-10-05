import { PrismaClient } from '@prisma/client';

const DB_URL = 'mysql://u434618106_vrajesh_test:ShriShyam%231234@srv2088.hstgr.io:3306/u434618106_sspacia_test';

const prisma = new PrismaClient({
  datasources: { db: { url: DB_URL } },
});

async function main() {
  try {
    const helios = await (prisma as any).invoiceRecord.findMany({
      where: { companyName: { contains: 'Helios' } },
      select: {
        id: true,
        companyName: true,
        billingMonth: true,
        status: true,
        sentAt: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    console.log('Helios invoices:', helios);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
