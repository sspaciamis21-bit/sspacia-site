'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { MapPin, Loader2, Building2 } from 'lucide-react';
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 size={40} className="text-[var(--primary)] animate-spin" />
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9E9E9E] animate-pulse">Initializing Nodes...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12 px-4 pb-20">
      <FadeUp>
        <div className="flex items-center gap-6 mb-10">
          <div className="inline-flex p-4 bg-white border border-[var(--outline-variant)] text-[var(--primary)]">
            <MapPin size={24} />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-[#1B1C1C] uppercase tracking-tight">Facility Registry</h1>
            <p className="text-[#616161] font-bold text-[11px] uppercase tracking-widest mt-1 opacity-60">Locations under active management</p>
          </div>
        </div>

        {locations.length === 0 ? (
          <div className="bg-white border border-[var(--outline-variant)] p-20 text-center rounded-none shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#9E9E9E]">No assigned nodes identified</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {locations.map((loc, idx) => (
              <motion.div
                key={loc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white border border-[var(--outline-variant)] p-8 rounded-none group hover:border-[var(--primary)] transition-all flex flex-col gap-8 relative"
              >
                <div className="flex justify-between items-start">
                  <div className="p-4 bg-neutral-50 border border-neutral-100 text-[#9E9E9E] group-hover:text-[var(--primary)] group-hover:bg-white group-hover:border-[var(--primary)]/30 transition-all">
                    <Building2 size={24} />
                  </div>
                  <div className="inline-flex items-center px-3 py-1 bg-neutral-100 border border-neutral-200 text-[8px] font-black text-[#616161] uppercase tracking-[0.2em] rounded-none">
                    NODE: {loc.id}
                  </div>
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl text-[#1B1C1C] mb-2 uppercase tracking-tight group-hover:text-[var(--primary)] transition-colors">{loc.name}</h3>
                  <div className="flex items-center gap-2 text-[#9E9E9E] font-bold text-[9px] uppercase tracking-widest">
                    <MapPin size={12} className="opacity-40" />
                    <span>View Node operations</span>
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
