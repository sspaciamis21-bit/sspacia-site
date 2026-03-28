'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, MapPin, Building2, CheckCircle2, XCircle, Map } from 'lucide-react';
import { AddLocationModal } from '@/components/admin/add-location-modal';
import { AddCityModal } from '@/components/admin/add-city-modal';
import { useRouter } from 'next/navigation';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function LocationsClient({ initialLocations }: { initialLocations: any[] }) {
  const [locations] = useState(initialLocations);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddCityModalOpen, setIsAddCityModalOpen] = useState(false);
  const router = useRouter();

  const handleSuccess = () => {
    // Refresh the current route to fetch updated data from server
    router.refresh();
  };

  return (
    <>
      <div className="bg-white border border-[#CFD8DC]/50 rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-[#CFD8DC]/50 flex items-center justify-between bg-[#F8F9FA]/50">
          <div className="flex items-center gap-2 text-sm font-bold text-[#616161]">
            <MapPin size={18} className="text-[#006064]" />
            {locations.length} Locations Total
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddCityModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-[#006064] border border-[#006064] rounded-lg text-sm font-bold shadow-sm hover:bg-[#E0F7FA] transition-colors"
            >
              <Map size={16} />
              Add City
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#006064] text-white rounded-lg text-sm font-bold shadow-md shadow-[#006064]/20 hover:bg-[#004D40] transition-colors"
            >
              <Plus size={16} />
              Add Location
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8F9FA] text-xs font-bold text-[#9E9E9E] uppercase tracking-widest border-b border-[#CFD8DC]/50">
                <th className="px-6 py-4 font-bold">Location</th>
                <th className="px-6 py-4 font-bold">City</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold">Sort</th>
                <th className="px-6 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CFD8DC]/30">
              {locations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#9E9E9E]">
                    <Building2 size={32} className="mx-auto mb-3 opacity-50 text-[#006064]" />
                    <p className="font-bold text-[#616161]">No locations found</p>
                    <p className="text-sm mt-1">Click &quot;Add Location&quot; to create your first one.</p>
                  </td>
                </tr>
              ) : (
                locations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-[#F8F9FA]/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-[#212121]">{loc.name}</span>
                        <span className="text-xs text-[#9E9E9E] font-mono">{loc.slug}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#616161]">
                      {loc.city?.name || '—'}
                    </td>
                    <td className="px-6 py-4">
                      {loc.isActive ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-md">
                          <CheckCircle2 size={14} /> Active
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#9E9E9E] bg-[#F8F9FA] w-fit px-2 py-1 rounded-md">
                          <XCircle size={14} /> Inactive
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#616161]">
                      {loc.sortOrder}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 text-[#9E9E9E] hover:text-[#006064] hover:bg-[#E0F7FA] rounded-md transition-colors" title="Edit (Coming soon)">
                          <Edit2 size={16} />
                        </button>
                        <button className="p-1.5 text-[#9E9E9E] hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Delete (Coming soon)">
                          <Trash2 size={16} />
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

      <AddCityModal
        isOpen={isAddCityModalOpen}
        onClose={() => setIsAddCityModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
}
