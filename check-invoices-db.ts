import { PrismaClient } from '@prisma/client';

const DB_URL = 'mysql://u434618106_vrajesh_test:ShriShyam%231234@srv2088.hstgr.io:3306/u434618106_sspacia_test';

const prisma = new PrismaClient({
  datasources: { db: { url: DB_URL } },
});

async function main() {
  try {
    const invoices = await (prisma as any).invoiceRecord.findMany({
      select: {
        id: true,
        companyName: true,
        billingMonth: true,
        status: true,
        createdAt: true,
        sentAt: true,
      },
      orderBy: { id: 'asc' },
    });

    console.log('Total invoices in DB:', invoices.length);

    // Group by billingMonth
    const byMonth: Record<string, number> = {};
    for (const inv of invoices) {
      const m = inv.billingMonth || 'Unknown';
      byMonth[m] = (byMonth[m] || 0) + 1;
    }
    console.log('Invoices by Month in DB:', byMonth);

    // Find Aristo Global
    const aristo = invoices.filter((i: any) => i.companyName.toLowerCase().includes('aristo'));
    console.log('Aristo Global count in DB:', aristo.length);
    aristo.forEach((a: any) => console.log('  Aristo:', a.id, a.billingMonth, a.companyName, a.status));

    // Find JK Paper
    const jk = invoices.filter((i: any) => i.companyName.toLowerCase().includes('jk paper'));
    console.log('JK Paper in DB:', jk.length, jk.map((j: any) => ({ id: j.id, month: j.billingMonth })));

    // Find Chaintechpluss
    const chain = invoices.filter((i: any) => i.companyName.toLowerCase().includes('chaintech'));
    console.log('Chaintech in DB:', chain.length, chain.map((j: any) => ({ id: j.id, month: j.billingMonth })));

  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
