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

export default async function AdminLocationsPage() {
  const locations = await fetchLocations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#004D40]">Manage Locations</h1>
        <p className="text-[#616161]">Add, view, and organize SSPACIA locations</p>
      </div>

      <Suspense fallback={<div className="h-96 rounded-xl border border-[#CFD8DC]/50 bg-white shadow-sm animate-pulse" />}>
        <LocationsClient initialLocations={locations} />
      </Suspense>
    </div>
  );
}
