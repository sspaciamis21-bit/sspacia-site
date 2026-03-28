import { Metadata } from 'next';
import { Suspense } from 'react';
import prisma from '@/lib/prisma';
import LocationsClient from './locations-client';

export const metadata: Metadata = {
  title: 'Manage Locations | Admin',
};

// Force dynamic rendering to ensure fresh locations list
export const dynamic = 'force-dynamic';

export default async function AdminLocationsPage() {
  const locations = await prisma.location.findMany({
    include: { city: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#004D40]">Manage Locations</h1>
        <p className="text-[#616161]">Add, view, and organize SSPACIA locations</p>
      </div>

      <Suspense fallback={<div className="h-96 rounded-xl border border-[#CFD8DC]/50 bg-white shadow-sm animate-pulse" />}>
        {/* We serialize dates to strings if needed, but Prisma findMany returns Date objects. 
            We pass them to Client Component which might complain about Date objects. 
            Let's convert dates to strings safely. */}
        <LocationsClient initialLocations={JSON.parse(JSON.stringify(locations))} />
      </Suspense>
    </div>
  );
}
