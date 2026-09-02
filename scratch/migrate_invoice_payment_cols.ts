import prisma from '../src/lib/prisma';

async function migrate() {
  console.log('Checking and adding payment receive columns to InvoiceRecord...');

  const columnsToAdd = [
    { name: 'payReceiveDate', def: 'DATETIME(3) NULL' },
    { name: 'paymentMode', def: 'VARCHAR(191) NULL' },
    { name: 'receiveAmount', def: 'DECIMAL(12,2) NULL' },
    { name: 'tdsAmount', def: 'DECIMAL(12,2) NULL' },
    { name: 'tdsDeducted', def: 'VARCHAR(191) NULL' },
    { name: 'utrDate', def: 'DATETIME(3) NULL' },
    { name: 'utrFileName', def: 'VARCHAR(191) NULL' },
    { name: 'utrFileUrl', def: 'TEXT NULL' },
    { name: 'utrNumber', def: 'VARCHAR(191) NULL' },
    { name: 'paymentsJson', def: 'TEXT NULL' },
    { name: 'paymentStatus', def: "VARCHAR(191) NULL DEFAULT 'PENDING'" },
  ];

  const existingCols: any = await prisma.$queryRawUnsafe('SHOW COLUMNS FROM `InvoiceRecord`');
  const existingNames = new Set(existingCols.map((c: any) => c.Field.toLowerCase()));

  for (const col of columnsToAdd) {
    if (!existingNames.has(col.name.toLowerCase())) {
      console.log(`Adding column ${col.name} (${col.def}) to InvoiceRecord...`);
      await prisma.$executeRawUnsafe(`ALTER TABLE \`InvoiceRecord\` ADD COLUMN \`${col.name}\` ${col.def}`);
      console.log(`✅ Added ${col.name}`);
    } else {
      console.log(`Column ${col.name} already exists.`);
    }
  }

  console.log('Migration completed successfully.');
}

migrate()
  .catch(console.error)
  .finally(() => process.exit(0));
