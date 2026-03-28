'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { MapPin, Loader, Building2 } from 'lucide-react';
import { FadeUp } from '@/components/ui/fade-up';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface LocationInfo {
  id: number;
  name: string;
}

export default function ManagerLocationsPage() {
  const { user, hasPermission, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [locations, setLocations] = useState<LocationInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      if (!hasPermission('view_location_details') && !hasPermission('manage_location_products')) {
        toast.error('Unauthorized to view locations.');
        router.push('/manager/dashboard');
        return;
      }
      fetchLocations();
    }
  }, [user, authLoading, hasPermission, router]);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/manager/dashboard', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch data');

      const data = await response.json();
      setLocations(data.locations || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader size={48} className="text-[#006064] animate-spin mb-4" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <FadeUp>
        <div className="flex items-center gap-3 mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-[#006064]/10">
            <MapPin size={32} className="text-[#006064]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#004D40]">Assigned Locations</h1>
            <p className="text-[#616161]">View the facilities you currently manage</p>
          </div>
        </div>

        {locations.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 border border-[#E0E0E0] text-center py-16">
            <Building2 size={64} className="mx-auto text-[#CFD8DC] mb-4" />
            <h2 className="text-xl font-bold text-[#004D40] mb-2">No Assigned Locations</h2>
            <p className="text-[#616161]">You haven&apos;t been assigned to manage any locations yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {locations.map((loc, idx) => (
              <motion.div
                key={loc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -4 }}
                className="bg-white rounded-2xl p-6 border border-[#E0E0E0] shadow-sm hover:shadow-xl hover:border-[#006064]/30 transition-all flex items-start gap-5"
              >
                <div className="p-4 bg-[#E0F7FA] rounded-2xl text-[#006064] shrink-0">
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-[#004D40] mb-1">{loc.name}</h3>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F5F5F5] border border-[#E0E0E0] text-xs font-bold text-[#616161]">
                    ID: {loc.id}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </FadeUp>
    </div>
  );
}
