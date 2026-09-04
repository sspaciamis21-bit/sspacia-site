import prisma from '../src/lib/prisma';

async function main() {
  try {
    const result = await prisma.$queryRaw`SHOW TABLES LIKE 'ExecutiveExpense'`;
    console.log('ExecutiveExpense table in DB:', result);
  } catch (err) {
    console.error('Error checking table:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
