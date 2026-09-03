import process from 'node:process';
import prisma from '../lib/prisma';

async function testRawInsert() {
  console.log('Testing raw SQL insert into CareerApplication...');

  const jobPositionId = 1;
  const appliedPosition = 'Front Desk Executive';
  const fullName = 'Test Candidate';
  const cleanEmail = 'test.candidate@example.com';
  const cleanMobile = '9876543210';
  const numAge = 22;
  const gender = 'Female';
  const qualification = 'B.Com';
  const experience = 'Fresher';
  const address = 'Ahmedabad';

  const result = await prisma.$executeRawUnsafe(
    'INSERT INTO `CareerApplication` (`jobPositionId`, `appliedPosition`, `fullName`, `email`, `mobileNo`, `age`, `gender`, `qualification`, `experience`, `address`, `status`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
    jobPositionId,
    appliedPosition,
    fullName,
    cleanEmail,
    cleanMobile,
    numAge,
    gender,
    qualification,
    experience,
    address,
    'APPLIED'
  );

  console.log('✅ Result:', result);
}

testRawInsert()
  .catch((err) => {
    console.error('Test error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
