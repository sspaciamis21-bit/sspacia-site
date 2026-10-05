import { PrismaClient } from '@prisma/client';

const DB_URL = 'mysql://u434618106_vrajesh_test:ShriShyam%231234@srv2088.hstgr.io:3306/u434618106_sspacia_test';
const prisma = new PrismaClient({
  datasources: { db: { url: DB_URL } },
});

async function main() {
  const companies = [
    'Novel Jewels Limited',
    'Helios Capital',
    'Respect Returns',
    'Ecap Equities',
    'India SME Forum'
  ];

  for (const comp of companies) {
    const records = await (prisma as any).invoiceRecord.findMany({
      where: { companyName: { contains: comp } },
      include: { attachedInvoice: true },
      orderBy: { id: 'desc' }
    });
    console.log(`\n=== Found ${records.length} records for ${comp} ===`);
    for (const r of records) {
      console.log({
        id: r.id,
        billingMonth: r.billingMonth,
        status: r.status,
        createdAt: r.createdAt,
        sentAt: r.sentAt,
        updatedAt: r.updatedAt,
        signedAt: r.signedAt,
        clientEmailSentAt: r.clientEmailSentAt,
        attachedInvoiceCreatedAt: r.attachedInvoice?.createdAt,
      });
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
