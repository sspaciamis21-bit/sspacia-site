import process from 'node:process';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';

async function seedHrAndJobs() {
  console.log('Seeding HR Role, User, and Initial Job Positions...');

  // 1. Create or Find HR Role
  let hrRole = await prisma.role.findUnique({
    where: { name: 'HR' },
  });

  if (!hrRole) {
    hrRole = await prisma.role.create({
      data: {
        name: 'HR',
        displayName: 'Human Resources',
        description: 'Exclusive access to manage SSPACIA Career Positions & Candidate Applications',
      },
    });
    console.log('✅ Created HR role');
  } else {
    console.log('ℹ️ HR role already exists');
  }

  // 2. Create or Update HR User
  const hashedPassword = await bcrypt.hash('Hr@112', 12);
  const hrEmail = 'hr.ssinfrazone@gmail.com';
  const hrUsername = 'human resource';

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: hrEmail },
        { name: hrUsername },
      ],
    },
  });

  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name: hrUsername,
        email: hrEmail,
        password: hashedPassword,
        roleId: hrRole.id,
        isActive: true,
        mustChangePassword: false,
      },
    });
    console.log(`✅ Updated existing HR user (ID: ${existingUser.id}) with credentials`);
  } else {
    const newUser = await prisma.user.create({
      data: {
        name: hrUsername,
        email: hrEmail,
        password: hashedPassword,
        roleId: hrRole.id,
        isActive: true,
        mustChangePassword: false,
      },
    });
    console.log(`✅ Created new HR user (ID: ${newUser.id})`);
  }


  // 3. Seed 8 Job Positions from Flyer
  const initialPositions = [
    {
      title: 'Front Desk Executive',
      openings: '2 Openings',
      gender: 'Female',
      description: 'Guest & visitor management, front office reception, and client hospitality.',
      location: 'CG Road, Ahmedabad',
      sortOrder: 1,
      isActive: true,
    },
    {
      title: 'Process Coordinator',
      openings: '1 Opening',
      gender: 'Female',
      description: 'Operations support, process tracking, workflow documentation, and team coordination.',
      location: 'CG Road, Ahmedabad',
      sortOrder: 2,
      isActive: true,
    },
    {
      title: 'CRM – GeM',
      openings: '1 Opening',
      gender: 'Male / Female',
      description: 'Government e-Marketplace (GeM) client management, tender handling, and excellent communication skills.',
      location: 'CG Road, Ahmedabad',
      sortOrder: 3,
      isActive: true,
    },
    {
      title: 'CRM – SSPACIA',
      openings: '1 Opening',
      gender: 'Male / Female',
      description: 'Client relationship management, member onboarding, query resolution, and communication.',
      location: 'CG Road, Ahmedabad',
      sortOrder: 4,
      isActive: true,
    },
    {
      title: 'Store Incharge',
      openings: '1 Opening',
      gender: 'Male',
      description: 'Inventory & stock management, supply auditing, inward/outward registers, and buffer tracking.',
      location: 'CG Road, Ahmedabad',
      sortOrder: 5,
      isActive: true,
    },
    {
      title: 'Purchase Executive – NVD',
      openings: '1 Opening',
      gender: 'Male',
      description: 'Vendor management, procurement lifecycle, purchase orders, quotations, and rate negotiation.',
      location: 'CG Road, Ahmedabad',
      sortOrder: 6,
      isActive: true,
    },
    {
      title: 'Sales Coordinator',
      openings: '1 Opening',
      gender: 'Female',
      description: 'SSPACIA sales support, lead follow-ups, center tour scheduling, and CRM updates.',
      location: 'CG Road, Ahmedabad',
      sortOrder: 7,
      isActive: true,
    },
    {
      title: 'DR – Tender Research',
      openings: '1 Opening',
      gender: 'Male',
      description: 'Internet & research skills, tender portal scanning, qualification matching, and bid document prep.',
      location: 'CG Road, Ahmedabad',
      sortOrder: 8,
      isActive: true,
    },
  ];

  for (const pos of initialPositions) {
    const existing = await (prisma as any).jobPosition.findFirst({
      where: { title: pos.title },
    });

    if (!existing) {
      await (prisma as any).jobPosition.create({ data: pos });
      console.log(`✅ Seeded position: ${pos.title}`);
    } else {
      console.log(`ℹ️ Position already exists: ${pos.title}`);
    }
  }

  console.log('Seeding completed successfully!');
}

seedHrAndJobs()
  .catch((err) => {
    console.error('Seeding error:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
