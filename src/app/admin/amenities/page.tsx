'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  Sparkles,
  MapPin,
  Clock,
  Users,
  Coffee,
  Armchair,
  Wifi,
  Monitor,
  Home,
  Cpu,
  Tag,
  Shield,
  Zap,
  Lock,
  Key,
  Printer,
  Server,
  Car,
  Tv,
  Phone,
  Layers,
  Briefcase,
  Wind,
  Droplets,
  Utensils,
  Lightbulb,
} from 'lucide-react';
import { toast } from 'sonner';
import { FadeUp } from '@/components/ui/fade-up';

const LUCIDE_ICON_MAP: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  mappin: MapPin,
  clock: Clock,
  users: Users,
  coffee: Coffee,
  sofa: Armchair,
  armchair: Armchair,
  wifi: Wifi,
  monitor: Monitor,
  tv: Tv,
  home: Home,
  cpu: Cpu,
  tag: Tag,
  shield: Shield,
  sparkles: Sparkles,
  zap: Zap,
  lock: Lock,
  key: Key,
  printer: Printer,
  server: Server,
  car: Car,
  phone: Phone,
  layers: Layers,
  briefcase: Briefcase,
  wind: Wind,
  droplets: Droplets,
  utensils: Utensils,
  lightbulb: Lightbulb,
};

const PRESET_ICONS = [
  { key: 'MapPin', label: 'Location', icon: MapPin },
  { key: 'Clock', label: '24/7 Access', icon: Clock },
  { key: 'Users', label: 'Community', icon: Users },
  { key: 'Coffee', label: 'Coffee & Brews', icon: Coffee },
  { key: 'Sofa', label: 'Lounge / Cozy', icon: Armchair },
  { key: 'Wifi', label: 'High-Speed WiFi', icon: Wifi },
  { key: 'Monitor', label: 'Monitors & Screens', icon: Monitor },
  { key: 'Zap', label: 'Power Backup', icon: Zap },
  { key: 'Lock', label: 'Security & Lock', icon: Lock },
  { key: 'Printer', label: 'Print / Scan', icon: Printer },
  { key: 'Car', label: 'Parking', icon: Car },
  { key: 'Utensils', label: 'Pantry / Food', icon: Utensils },
  { key: 'Wind', label: 'Air Conditioning', icon: Wind },
  { key: 'Phone', label: 'Phone Booth', icon: Phone },
  { key: 'Sparkles', label: 'Premium', icon: Sparkles },
  { key: 'Shield', label: 'Safety & CCTV', icon: Shield },
];

function renderAmenityIcon(iconStr: string | null | undefined, className = "w-5 h-5") {
  if (!iconStr) return <Sparkles className={className} />;
  
  const cleanKey = iconStr.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const IconComponent = LUCIDE_ICON_MAP[cleanKey];

  if (IconComponent) {
    return <IconComponent className={className} />;
  }

  // If it's an emoji (single or double char, or contains emoji characters)
  if (/\p{Emoji}/u.test(iconStr)) {
    return <span className="text-xl leading-none select-none">{iconStr}</span>;
  }

  // Fallback for custom or unknown name
  return <Sparkles className={className} />;
}

interface Amenity {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

export default function AdminAmenitiesPage() {
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState<Amenity | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    icon: '',
    description: '',
    isActive: true,
    sortOrder: 0
  });

  const fetchAmenities = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/config/amenities');
      if (!res.ok) throw new Error('Failed to load amenities');
      const json = await res.json();
      setAmenities(json.data ?? []);
    } catch {
      toast.error('Could not load amenities.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAmenities();
  }, []);

  const openAddModal = () => {
    setEditingAmenity(null);
    setFormData({ name: '', icon: 'Wifi', description: '', isActive: true, sortOrder: 0 });
    setIsModalOpen(true);
  };

  const openEditModal = (amenity: Amenity) => {
    setEditingAmenity(amenity);
    setFormData({
      name: amenity.name,
      icon: amenity.icon || '',
      description: amenity.description || '',
      isActive: amenity.isActive,
      sortOrder: amenity.sortOrder
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const mode = editingAmenity ? 'PATCH' : 'POST';
      const body = editingAmenity ? { ...formData, id: editingAmenity.id } : formData;

      const res = await fetch('/api/admin/config/amenities', {
        method: mode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Operation failed');

      toast.success(editingAmenity ? 'Amenity updated!' : 'Amenity created!');
      setIsModalOpen(false);
      fetchAmenities();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/config/amenities?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Amenity deleted.');
      fetchAmenities();
    } catch {
      toast.error('Failed to delete amenity');
    }
  };

  const filteredAmenities = amenities.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <FadeUp>
          <h1 className="text-3xl font-black text-[#004D40] tracking-tight">Amenities</h1>
          <p className="text-[#616161] font-medium">Manage features and facilities across all your spaces.</p>
        </FadeUp>
        
        <FadeUp delay={0.1}>
          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#006064] text-white rounded-xl font-bold shadow-lg shadow-[#006064]/20 hover:bg-[#004D40] transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <Plus size={20} />
            New Amenity
          </button>
        </FadeUp>
      </div>

      <FadeUp delay={0.2}>
        <div className="bg-white rounded-2xl border border-[#CFD8DC]/40 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#CFD8DC]/40 bg-[#F8F9FA]/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9E9E9E] w-4 h-4" />
              <input
                type="text"
                placeholder="Search amenities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-[#CFD8DC] rounded-xl outline-none focus:ring-4 focus:ring-[#006064]/5 transition-all text-sm font-medium"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-[#CFD8DC]/40">
                  <th className="px-6 py-4 text-xs font-bold text-[#9E9E9E] uppercase tracking-widest">Icon</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#9E9E9E] uppercase tracking-widest">Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#9E9E9E] uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#9E9E9E] uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CFD8DC]/30">
                {isLoading ? (
                   <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="w-8 h-8 text-[#006064] animate-spin mx-auto" /></td></tr>
                ) : filteredAmenities.length === 0 ? (
                  <tr><td colSpan={4} className="py-20 text-center text-[#757575] font-medium">No amenities found.</td></tr>
                ) : (
                  filteredAmenities.map((a) => (
                    <motion.tr 
                      key={a.id} 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }}
                      className="hover:bg-[#F8F9FA] transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200/70 flex items-center justify-center text-[#006064] shadow-xs group-hover:scale-105 group-hover:bg-[#006064] group-hover:text-white transition-all">
                          {renderAmenityIcon(a.icon, "w-5 h-5")}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-[#212121]">{a.name}</p>
                        <p className="text-xs text-[#9E9E9E] mt-0.5 line-clamp-1">{a.description || 'No description'}</p>
                      </td>
                      <td className="px-6 py-4">
                        {a.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E0F2F1] text-[#00695C] text-xs font-bold border border-[#00695C]/10">
                            <CheckCircle2 size={12} /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold border border-red-100">
                            <XCircle size={12} /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <button onClick={() => openEditModal(a)} className="p-2 text-[#9E9E9E] hover:text-[#006064] hover:bg-white rounded-lg transition-all border border-transparent hover:border-[#CFD8DC]/30 cursor-pointer" title="Edit Amenity"><Edit2 size={16} /></button>
                           <button onClick={() => handleDelete(a.id, a.name)} className="p-2 text-[#9E9E9E] hover:text-red-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-red-100 cursor-pointer" title="Delete Amenity"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </FadeUp>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-[#002B2D]/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-[#CFD8DC]/30 flex items-center justify-between bg-[#F8F9FA]">
                <h2 className="text-xl font-black text-[#004D40]">{editingAmenity ? 'Edit Amenity' : 'Add New Amenity'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-full text-[#757575] transition-colors"><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#616161] uppercase tracking-widest mb-2">Amenity Name</label>
                    <input 
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-[#CFD8DC] focus:border-[#006064] focus:ring-4 focus:ring-[#006064]/5 transition-all outline-none font-medium"
                      placeholder="e.g. High-Speed WiFi"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#616161] uppercase tracking-widest mb-2">
                      Amenity Icon (Select or Type Icon / Emoji)
                    </label>
                    <div className="flex items-center gap-3 mb-2.5">
                      <div className="w-12 h-12 rounded-xl bg-teal-50 border-2 border-teal-500/40 flex items-center justify-center text-[#006064] shadow-xs shrink-0">
                        {renderAmenityIcon(formData.icon, "w-6 h-6")}
                      </div>
                      <input 
                        value={formData.icon}
                        onChange={(e) => setFormData({...formData, icon: e.target.value})}
                        className="flex-1 px-4 py-3 rounded-xl border border-[#CFD8DC] focus:border-[#006064] focus:ring-4 focus:ring-[#006064]/5 transition-all outline-none font-medium"
                        placeholder="e.g. Wifi, Coffee, MapPin, 📶, ☕..."
                      />
                    </div>

                    {/* Quick Preset Icons */}
                    <div className="p-2.5 bg-[#F8F9FA] rounded-xl border border-[#CFD8DC]/40">
                      <span className="text-[10px] font-bold text-[#757575] uppercase tracking-wider block mb-1.5">
                        Quick Select Icon:
                      </span>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                        {PRESET_ICONS.map((p) => {
                          const IconComp = p.icon;
                          const isSelected = formData.icon?.toLowerCase() === p.key.toLowerCase();
                          return (
                            <button
                              key={p.key}
                              type="button"
                              onClick={() => setFormData({ ...formData, icon: p.key })}
                              className={`p-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#006064] text-white shadow-xs scale-105'
                                  : 'bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200/70'
                              }`}
                              title={p.label}
                            >
                              <IconComp size={16} />
                              <span className="text-[8.5px] font-bold truncate max-w-full leading-none">{p.key}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#616161] uppercase tracking-widest mb-2">Description</label>
                    <textarea 
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-[#CFD8DC] focus:border-[#006064] focus:ring-4 focus:ring-[#006064]/5 transition-all outline-none font-medium resize-none"
                      placeholder="Describe this feature..."
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[#F8F9FA] rounded-2xl border border-[#CFD8DC]/30">
                     <div>
                       <p className="text-sm font-bold text-[#212121]">Active Status</p>
                       <p className="text-xs text-[#757575]">Show this amenity in product forms</p>
                     </div>
                     <button
                        type="button"
                        onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                        className={`w-12 h-6 flex items-center rounded-full transition-colors ${formData.isActive ? 'bg-[#006064]' : 'bg-[#CFD8DC]'}`}
                     >
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform mx-1 ${formData.isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                     </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3.5 border border-[#CFD8DC] text-[#616161] rounded-xl font-bold hover:bg-[#F8F9FA] transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3.5 bg-[#006064] text-white rounded-xl font-bold hover:bg-[#004D40] transition-all shadow-lg shadow-[#006064]/20"
                  >
                    {editingAmenity ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
