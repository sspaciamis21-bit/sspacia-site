const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, phone: true, contactNumber: true }
  });
  console.log('USERS IN DB:', users);
}

main().finally(() => prisma.$disconnect());
