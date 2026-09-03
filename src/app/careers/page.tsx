import { Metadata } from 'next';
import prisma from '@/lib/prisma';
import { CareersClient } from './careers-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Careers & Hiring | SSPACIA Coworking Spaces Ahmedabad',
  description:
    'Explore current job openings at SSPACIA Coworking, CG Road, Ahmedabad. Join our energetic team in front office, CRM, sales, operations, and inventory management.',
  openGraph: {
    title: "We're Hiring | SSPACIA Coworking Spaces",
    description: 'Join the SSPACIA team in Ahmedabad. Apply online in 2 minutes.',
  },
};

const DEFAULT_FALLBACK_POSITIONS = [
  {
    id: 1,
    title: 'Front Desk Executive',
    openings: '2 Openings',
    gender: 'Female',
    description: 'Guest & visitor management, front office reception, and client hospitality.',
    location: 'CG Road, Ahmedabad',
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 2,
    title: 'Process Coordinator',
    openings: '1 Opening',
    gender: 'Female',
    description: 'Operations support, process tracking, workflow documentation, and team coordination.',
    location: 'CG Road, Ahmedabad',
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 3,
    title: 'CRM – GeM',
    openings: '1 Opening',
    gender: 'Male / Female',
    description: 'Government e-Marketplace (GeM) client management, tender handling, and excellent communication skills.',
    location: 'CG Road, Ahmedabad',
    sortOrder: 3,
    isActive: true,
  },
  {
    id: 4,
    title: 'CRM – SSPACIA',
    openings: '1 Opening',
    gender: 'Male / Female',
    description: 'Client relationship management, member onboarding, query resolution, and communication.',
    location: 'CG Road, Ahmedabad',
    sortOrder: 4,
    isActive: true,
  },
  {
    id: 5,
    title: 'Store Incharge',
    openings: '1 Opening',
    gender: 'Male',
    description: 'Inventory & stock management, supply auditing, inward/outward registers, and buffer tracking.',
    location: 'CG Road, Ahmedabad',
    sortOrder: 5,
    isActive: true,
  },
  {
    id: 6,
    title: 'Purchase Executive – NVD',
    openings: '1 Opening',
    gender: 'Male',
    description: 'Vendor management, procurement lifecycle, purchase orders, quotations, and rate negotiation.',
    location: 'CG Road, Ahmedabad',
    sortOrder: 6,
    isActive: true,
  },
  {
    id: 7,
    title: 'Sales Coordinator',
    openings: '1 Opening',
    gender: 'Female',
    description: 'SSPACIA sales support, lead follow-ups, center tour scheduling, and CRM updates.',
    location: 'CG Road, Ahmedabad',
    sortOrder: 7,
    isActive: true,
  },
  {
    id: 8,
    title: 'DR – Tender Research',
    openings: '1 Opening',
    gender: 'Male',
    description: 'Internet & research skills, tender portal scanning, qualification matching, and bid document prep.',
    location: 'CG Road, Ahmedabad',
    sortOrder: 8,
    isActive: true,
  },
];

export default async function CareersPage() {
  let positions: any[] = [];
  try {
    positions = await (prisma as any).jobPosition.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  } catch (error) {
    console.warn('Notice: Using fallback positions list during transient DB connection delay:', error);
    positions = DEFAULT_FALLBACK_POSITIONS;
  }

  if (!positions || positions.length === 0) {
    positions = DEFAULT_FALLBACK_POSITIONS;
  }

  return <CareersClient initialPositions={JSON.parse(JSON.stringify(positions))} />;
}
