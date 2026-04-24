'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, MapPin, Building2, CheckCircle2, XCircle, Map } from 'lucide-react';
import { AddLocationModal } from '@/components/admin/add-location-modal';
import { EditLocationModal } from '@/components/admin/edit-location-modal';
import { AddCityModal } from '@/components/admin/add-city-modal';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function LocationsClient({ initialLocations }: { initialLocations: any[] }) {
  const [locations] = useState(initialLocations);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddCityModalOpen, setIsAddCityModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const router = useRouter();

  const handleSuccess = () => {
    router.refresh();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to deactivate this location?')) return;
    setIsDeleting(id);
    try {
      const res = await fetch(`/api/admin/locations/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete location');
      toast.success('Location deactivated successfully');
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete location');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <>
      <div className="bg-white border border-[var(--outline-variant)]/40 rounded-none shadow-2xl overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="px-10 py-8 border-b border-[var(--outline-variant)]/20 flex flex-col md:flex-row items-center justify-between gap-6 bg-neutral-50/30">
          <div className="flex items-center gap-4 text-[10px] font-black text-[#616161] uppercase tracking-[0.3em]">
            <div className="p-2 bg-white text-[var(--primary)] border border-[var(--outline-variant)]/40 shadow-sm">
              <MapPin size={18} />
            </div>
            <span>Total Locations:</span>
            <span className="bg-neutral-50 text-[var(--primary)] px-3 py-1 font-black border border-[var(--outline-variant)]/40 shadow-sm">{locations.length}</span>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button
              onClick={() => setIsAddCityModalOpen(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-3 px-6 py-4 bg-white text-[#1B1B1B] border border-[#1B1B1B] rounded-none text-[10px] font-black uppercase tracking-[0.2em] hover:bg-neutral-100 transition-all shadow-sm group"
            >
              <Map size={16} className="group-hover:rotate-12 transition-transform" />
              Add City
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-[var(--primary)] text-white rounded-none text-[10px] font-black uppercase tracking-[0.2em] hover:bg-neutral-900 transition-all shadow-xl group border border-transparent"
            >
              <Plus size={16} className="group-hover:scale-110 transition-transform" />
              Add Location
            </button>
          </div>
        </div>

        {/* Registry Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-50/50 border-b border-[var(--outline-variant)]/20">
                <th className="px-10 py-5 text-[10px] font-black text-[#9E9E9E] uppercase tracking-[0.3em]">Location</th>
                <th className="px-10 py-5 text-[10px] font-black text-[#9E9E9E] uppercase tracking-[0.3em]">City</th>
                <th className="px-10 py-5 text-[10px] font-black text-[#9E9E9E] uppercase tracking-[0.3em]">Status</th>
                <th className="px-10 py-5 text-[10px] font-black text-[#9E9E9E] uppercase tracking-[0.3em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--outline-variant)]/10 font-bold">
              {locations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-10 py-32 text-center text-[#9E9E9E]">
                    <div className="flex flex-col items-center justify-center">
                       <Building2 size={48} className="mb-6 opacity-20 text-[#1B1C1C]" />
                       <p className="text-[11px] font-black text-[#1B1C1C] uppercase tracking-[0.3em]">No Locations Found</p>
                       <p className="text-[9px] text-[#616161] font-bold uppercase tracking-widest mt-2 opacity-60 italic">No locations available in the system</p>
                    </div>
                  </td>
                </tr>
              ) : (
                locations.map((loc, i) => (
                  <tr key={loc.id} className="hover:bg-neutral-50/80 transition-colors group">
                    <td className="px-10 py-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-black text-[#1B1C1C] uppercase tracking-wider group-hover:text-[var(--primary)] transition-colors">{loc.name}</span>
                        <span className="text-[9px] text-[#9E9E9E] font-mono tracking-tighter uppercase opacity-60">REF_ID: {loc.slug}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                       <span className="inline-flex items-center px-3 py-1 bg-neutral-100 text-[#1B1B1B] text-[9px] font-black uppercase tracking-widest border border-[var(--outline-variant)]/20">
                        {loc.city?.name || 'NO CITY'}
                      </span>
                    </td>
                    <td className="px-10 py-6">
                      <div className={`flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.2em] ${loc.isActive ? 'text-[#4DB6AC]' : 'text-red-400 opacity-60'}`}>
                        <div className={`h-2 w-2 ${loc.isActive ? 'bg-[#4DB6AC]' : 'bg-red-400'} shadow-[0_0_6px_currentColor]`} />
                        {loc.isActive ? 'Active' : 'Inactive'}
                      </div>
                    </td>

                    <td className="px-10 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => { setSelectedLocation(loc); setIsEditModalOpen(true); }}
                          className="p-2.5 text-[#616161] hover:text-[var(--primary)] hover:bg-neutral-50 transition-all border border-transparent hover:border-[var(--outline-variant)]/20" title="Edit Location">
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(loc.id)}
                          disabled={isDeleting === loc.id}
                          className="p-2.5 text-[#616161] hover:text-red-600 hover:bg-neutral-100 transition-all border border-transparent disabled:opacity-50" title="Delete Location">
                          {isDeleting === loc.id ? <span className="animate-spin text-xs">...</span> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddLocationModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={handleSuccess}
      />

      <EditLocationModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleSuccess}
        location={selectedLocation}
      />

      <AddCityModal
        isOpen={isAddCityModalOpen}
        onClose={() => setIsAddCityModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
}
