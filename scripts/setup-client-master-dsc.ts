import { PrismaClient } from '@prisma/client';

const dbUrl = process.env.DATABASE_URL || 'mysql://u434618106_vrajesh_test:ShriShyam%231234@srv2088.hstgr.io:3306/u434618106_sspacia_test';
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

// List of companies that require DSC
const DSC_REQUIRED_COMPANIES = [
  '360 ONE Asset Management Ltd,',
  '360 ONE Asset Management',
  'Helios Capital Asset Management (India) Private Limited',
  'Helios Capital Asset Management',
  'YES Securities (India) Limited',
  'YES Securities',
  'INDUS Environmental Services Pvt. Ltd.',
  'INDUS Environmental',
  'Abakkus Investment Managers Pvt Ltd',
  'Abakkus Investment',
  'Angle One Limited',
  'Angel One',
  'CHAINTECHPLUSS VENTURES PRIVATE LIMITED',
  'CHAINTECHPLUSS',
  'JK Paper Limited',
  'JK Paper',
  'Senvion Wind Technology Pvt Ltd',
  'Senvion Wind',
  'Matrix Business Services India Private Limited',
  'Matrix Business',
  'Jainam Broking Limited',
  'Jainam Broking',
  'SPORTSCLICK PRIVATE LIMITED',
  'SPORTSCLICK',
  'CANARA HSBC LIFE INSURANCE COMPANY LIMITED',
  'CANARA HSBC',
];

async function main() {
  try {
    const cols: any = await prisma.$queryRawUnsafe('DESCRIBE ClientMaster');
    const hasCol = cols.some((c: any) => c.Field === 'isDigitalSignRequired');
    console.log('ClientMaster has isDigitalSignRequired column:', hasCol);

    if (!hasCol) {
      console.log('Adding isDigitalSignRequired column to ClientMaster table...');
      await prisma.$queryRawUnsafe('ALTER TABLE ClientMaster ADD COLUMN isDigitalSignRequired BOOLEAN DEFAULT FALSE');
      console.log('Added isDigitalSignRequired column successfully!');
    }

    // Now update the 13 verified companies in ClientMaster to isDigitalSignRequired = true
    const allClients = await (prisma as any).clientMaster.findMany({
      select: { id: true, companyName: true, isDigitalSignRequired: true }
    });

    console.log(`Checking ${allClients.length} clients in ClientMaster...`);
    let updatedCount = 0;

    for (const client of allClients) {
      const cName = (client.companyName || '').toLowerCase();
      const needsDsc = DSC_REQUIRED_COMPANIES.some(comp => cName.includes(comp.toLowerCase()));

      if (needsDsc) {
        await (prisma as any).clientMaster.update({
          where: { id: client.id },
          data: { isDigitalSignRequired: true }
        });
        console.log(`[SET YES] Client #${client.id}: ${client.companyName} -> isDigitalSignRequired = true`);
        updatedCount++;
      } else if (client.isDigitalSignRequired) {
        // Leave as is if already set
      } else {
        await (prisma as any).clientMaster.update({
          where: { id: client.id },
          data: { isDigitalSignRequired: false }
        });
      }
    }

    console.log(`\nDone! Successfully updated ${updatedCount} DSC client records in ClientMaster.`);

  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
