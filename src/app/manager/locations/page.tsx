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
      const response = await fetch('/api/admin/locations', {
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
        <Loader size={40} className="text-[var(--primary)] animate-spin mb-4" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      <FadeUp>
        <div className="flex items-center gap-4 mb-10">
          <div className="inline-flex p-3.5 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
            <MapPin size={28} />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-[#1B1C1C] tracking-tight">Assigned Locations</h1>
            <p className="text-[#616161] font-medium text-sm mt-1">View the facilities you currently manage</p>
          </div>
        </div>

        {locations.length === 0 ? (
          <div className="bg-[var(--surface-lowest)] rounded-3xl p-12 border border-[var(--outline-variant)]/50 text-center py-24 shadow-sm">
            <div className="inline-flex p-6 rounded-3xl bg-[var(--surface-low)] text-[#9E9E9E] mb-6">
              <Building2 size={64} />
            </div>
            <h2 className="text-2xl font-display font-bold text-[#1B1C1C] mb-2">No Assigned Locations</h2>
            <p className="text-[#616161] font-medium max-w-sm mx-auto">You haven&apos;t been assigned to manage any locations yet. Please contact the administrator.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {locations.map((loc, idx) => (
              <motion.div
                key={loc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -8, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
                className="bg-[var(--surface-lowest)] rounded-3xl p-8 border border-[var(--outline-variant)]/50 shadow-sm transition-all flex flex-col gap-6 group"
              >
                <div className="flex justify-between items-start">
                  <div className="p-4 bg-[var(--surface-low)] rounded-2xl text-[var(--primary)] group-hover:bg-[var(--primary)] group-hover:text-white transition-all shadow-inner">
                    <Building2 size={28} />
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface-low)] border border-[var(--outline-variant)]/30 text-[10px] font-bold text-[#616161] uppercase tracking-widest">
                    ID: {loc.id}
                  </div>
                </div>
                <div>
                  <h3 className="font-display font-bold text-2xl text-[#1B1C1C] mb-2 group-hover:text-[var(--primary)] transition-colors">{loc.name}</h3>
                  <div className="flex items-center gap-2 text-[#616161] font-medium text-sm">
                    <MapPin size={16} className="text-[var(--primary)]" />
                    <span>View Location Details</span>
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
