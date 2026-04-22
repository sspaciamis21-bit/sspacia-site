import { Metadata } from 'next';
import { Suspense } from 'react';
import { cookies } from 'next/headers';
import LocationsClient from './locations-client';

export const metadata: Metadata = {
  title: 'Manage Locations | Admin',
};

// Force dynamic rendering to ensure fresh locations list
export const dynamic = 'force-dynamic';

async function fetchLocations() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  // Use absolute URL for server-side fetch in Next.js
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/admin/locations`, {
    headers: {
      Cookie: `auth-token=${token}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    return [];
  }

  const json = await res.json();
  return json.data || [];
}

import { MapPin } from 'lucide-react';

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
            <h1 className="text-4xl font-display font-black text-[#1B1C1C] tracking-tighter uppercase">Spatial Grid</h1>
            <p className="text-[#616161] font-bold text-[11px] uppercase tracking-widest mt-1 opacity-60 italic">Mapping metropolitan vertices and nodes</p>
          </div>
        </div>
      </div>

      <Suspense fallback={
        <div className="h-96 rounded-none border border-[var(--outline-variant)]/20 bg-white shadow-2xl animate-pulse flex flex-col items-center justify-center">
           <div className="h-8 w-8 bg-neutral-100 animate-bounce" />
           <p className="text-[10px] font-black text-[#9E9E9E] uppercase tracking-widest mt-4">Syncing Coordinates...</p>
        </div>
      }>
        <LocationsClient initialLocations={locations} />
      </Suspense>
    </div>
  );
}
