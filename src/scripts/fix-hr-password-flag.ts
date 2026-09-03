import process from 'node:process';
import prisma from '../lib/prisma';

async function fixHrUserPasswordFlag() {
  console.log('Updating HR user mustChangePassword flag...');

  const result = await prisma.user.updateMany({
    where: {
      OR: [
        { name: 'human resource' },
        { email: 'hr.ssinfrazone@gmail.com' },
      ],
    },
    data: {
      mustChangePassword: false,
    },
  });

  console.log(`✅ Updated ${result.count} HR user records to mustChangePassword: false`);
}

fixHrUserPasswordFlag()
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
