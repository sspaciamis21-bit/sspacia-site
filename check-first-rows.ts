import { PrismaClient } from '@prisma/client';

const DB_URL = 'mysql://u434618106_vrajesh_test:ShriShyam%231234@srv2088.hstgr.io:3306/u434618106_sspacia_test';

const prisma = new PrismaClient({
  datasources: { db: { url: DB_URL } },
});

const MONTH_MAP: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
  may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8,
  september: 9, sep: 9, sept: 9, october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
};

function parseBillingMonthSortKey(monthStr?: string | null, fallbackDate?: Date): number {
  if (monthStr) {
    const clean = String(monthStr).trim().toLowerCase();
    const isoMatch = clean.match(/^(\d{4})[-/](\d{1,2})/);
    if (isoMatch) return parseInt(isoMatch[1], 10) * 100 + parseInt(isoMatch[2], 10);
    let year = 0, month = 0;
    const tokens = clean.split(/[\s,_\-]+/).filter(Boolean);
    for (const token of tokens) {
      if (/^\d{4}$/.test(token)) year = parseInt(token, 10);
      else if (MONTH_MAP[token]) month = MONTH_MAP[token];
    }
    if (year > 0 && month > 0) return year * 100 + month;
  }
  if (fallbackDate) {
    const d = new Date(fallbackDate);
    return d.getFullYear() * 100 + (d.getMonth() + 1);
  }
  return 0;
}

async function main() {
  try {
    const invoices = await (prisma as any).invoiceRecord.findMany({
      include: {
        clientMaster: true,
        createdBy: true,
      },
    });

    invoices.sort((a: any, b: any) => {
      const keyA = parseBillingMonthSortKey(a.billingMonth, a.createdAt);
      const keyB = parseBillingMonthSortKey(b.billingMonth, b.createdAt);
      if (keyA !== keyB) return keyA - keyB;
      return (a.id || 0) - (b.id || 0);
    });

    console.log('Rows 7 to 25:');
    for (let i = 0; i < 18; i++) {
      const inv = invoices[i];
      console.log(`Row ${7 + i}: ID=${inv.id} | Month=${inv.billingMonth} | Company=${inv.companyName}`);
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
