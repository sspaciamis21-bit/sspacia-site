import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing contract-related data...');

  try {
    // Delete in order of dependency
    await prisma.negotiationMessage.deleteMany({});
    await prisma.contractNegotiation.deleteMany({});
    await prisma.contractSignature.deleteMany({});
    await prisma.contractVersion.deleteMany({});
    await prisma.contract.deleteMany({});
    await prisma.contractRequest.deleteMany({});
    
    console.log('Successfully cleared all contract data.');
  } catch (error) {
    console.error('Error clearing contract data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
