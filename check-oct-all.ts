import { PrismaClient } from '@prisma/client';

const DB_URL = 'mysql://u434618106_vrajesh_test:ShriShyam%231234@srv2088.hstgr.io:3306/u434618106_sspacia_test';

const prisma = new PrismaClient({
  datasources: { db: { url: DB_URL } },
});

async function main() {
  try {
    const octInvs = await (prisma as any).invoiceRecord.findMany({
      where: { billingMonth: 'October 2026' },
      select: {
        id: true,
        companyName: true,
        status: true,
        createdAt: true,
        sentAt: true,
        clientEmailSentAt: true,
        attachedInvoice: { select: { createdAt: true } },
      },
      orderBy: { id: 'asc' },
    });

    console.log(`October invoices count: ${octInvs.length}`);
    octInvs.forEach((inv: any, i: number) => {
      console.log(`${i + 1}. ID=${inv.id} | Created=${inv.createdAt?.toISOString()} | Company=${inv.companyName} | Status=${inv.status} | HasPdf=${Boolean(inv.attachedInvoice)} | EmailSent=${Boolean(inv.clientEmailSentAt)}`);
    });
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
