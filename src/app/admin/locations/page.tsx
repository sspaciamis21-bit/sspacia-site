import { Metadata } from 'next';
import { Suspense } from 'react';
import LocationsClient from './locations-client';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { MapPin } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Manage Locations | Admin',
};

// Force dynamic rendering to ensure fresh locations list
export const dynamic = 'force-dynamic';

async function fetchLocations() {
  try {
    const payload = await requireAuth().catch(() => null);
    const userId = payload?.id ? Number(payload.id) : null;

    let scopeWhere = {};
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId, isActive: true },
        select: {
          assignedLocations: { select: { locationId: true } },
        },
      }).catch(() => null);

      const assignedIds = user?.assignedLocations?.map((al) => al.locationId) || [];
      if (assignedIds.length > 0) {
        scopeWhere = { id: { in: assignedIds } };
      }
    }

    const locations = await prisma.location.findMany({
      where: scopeWhere,
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        phone: true,
        email: true,
        isActive: true,
        sortOrder: true,
        city: { select: { id: true, name: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return locations || [];
  } catch (error) {
    console.error('[LOCATIONS_PAGE_FETCH]', error);
    return [];
  }
}

export default async function AdminLocationsPage() {
  const locations = await fetchLocations();

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="h-20 w-20 bg-white text-[var(--primary)] flex items-center justify-center rounded-none border border-[var(--outline-variant)]/40 shadow-xl">
            <MapPin size={40} />
          </div>
          <div>
            <h1 className="text-4xl font-display font-black text-[#1B1C1C] tracking-tighter uppercase">Locations</h1>
            <p className="text-[#616161] font-bold text-[11px] uppercase tracking-widest mt-1 opacity-60 italic">
              Manage geographic locations and business centres
            </p>
          </div>
        </div>
      </div>

      <Suspense fallback={
        <div className="h-96 rounded-none border border-[var(--outline-variant)]/20 bg-white shadow-2xl animate-pulse flex flex-col items-center justify-center">
          <div className="h-8 w-8 bg-neutral-100 animate-bounce" />
          <p className="text-[10px] font-black text-[#9E9E9E] uppercase tracking-widest mt-4">Loading Locations...</p>
        </div>
      }>
        <LocationsClient initialLocations={locations} />
      </Suspense>
    </div>
  );
}
