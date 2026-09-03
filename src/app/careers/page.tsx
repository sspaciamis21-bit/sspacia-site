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

export default async function CareersPage() {
  let positions: any[] = [];
  try {
    positions = await (prisma as any).jobPosition.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  } catch (error) {

    console.error('Error fetching careers positions for SSR:', error);
  }

  return <CareersClient initialPositions={JSON.parse(JSON.stringify(positions))} />;
}
