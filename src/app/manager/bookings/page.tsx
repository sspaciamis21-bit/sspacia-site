'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FadeUp } from '@/components/ui/fade-up';
import { 
  Loader2, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  ShoppingBag
} from 'lucide-react';
import { toast } from 'sonner';

interface Booking {
  id: number;
  bookingNumber: string;
  createdAt: string;
  startDate: string;
  startTime: string;
  endTime: string;
  grandTotal: number;
  notes: string | null;
  customer: { name: string; email: string; phone: string | null };
  product: { name: string; location: { name: string } };
  status: { id: number; name: string; displayName: string; color: string | null };
  payments: Array<{ method: string; status: { name: string } }>;
}

interface BookingStatus {
    id: number;
    name: string;
    displayName: string;
}

export default function ManagerBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [statuses, setStatuses] = useState<BookingStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'CANCELLED'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchBookings();
    fetchStatuses();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/admin/bookings');
      const json = await r.json();
      if (json.data) setBookings(json.data);
    } catch {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatuses = async () => {
      try {
          const r = await fetch('/api/admin/config/booking-statuses');
          const json = await r.json();
          if (json.data) setStatuses(json.data);
      } catch { /* Ignore */ }
  };

  const handleUpdateStatus = async (id: number, statusName: string) => {
      const statusObj = statuses.find(s => s.name === statusName);
      if (!statusObj) return toast.error('Status configuration not found');

      const toastId = toast.loading(`Updating to ${statusName}...`);
      try {
          const res = await fetch('/api/admin/bookings', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, statusId: statusObj.id })
          });

          if (res.ok) {
              toast.success(`Booking ${statusName.toLowerCase()} successfully`, { id: toastId });
              fetchBookings();
          } else {
              const json = await res.json();
              toast.error(json.message || 'Update failed', { id: toastId });
          }
      } catch {
          toast.error('Network error', { id: toastId });
      }
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
        const matchesTab = activeTab === 'ALL' || b.status.name === activeTab;
        const matchesSearch = b.bookingNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             b.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             b.product.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
    });
  }, [bookings, activeTab, searchQuery]);

  const stats = useMemo(() => {
      return {
          total: bookings.length,
          pending: bookings.filter(b => b.status.name === 'PENDING').length,
          confirmed: bookings.filter(b => b.status.name === 'CONFIRMED').length,
      };
  }, [bookings]);

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20 px-4">
      <FadeUp>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 bg-[var(--primary)] text-white flex items-center justify-center rounded-none">
              <ShoppingBag size={40} />
            </div>
            <div>
              <h1 className="text-4xl font-display font-black text-[#1B1C1C] tracking-tighter uppercase">Purchase Logs</h1>
              <p className="text-[#616161] font-bold text-[11px] uppercase tracking-widest mt-1 opacity-60">System acquisition and verification</p>
            </div>
          </div>

          <div className="flex items-center gap-px bg-[var(--outline-variant)]/20 border border-[var(--outline-variant)]/30 rounded-none">
              {(['PENDING', 'CONFIRMED', 'ALL'] as const).map(tab => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-8 py-3 text-[9px] font-black uppercase tracking-[0.3em] transition-all rounded-none ${activeTab === tab ? 'bg-[var(--primary)] text-white' : 'bg-white text-[#9E9E9E] hover:text-[#1B1C1C]'}`}
                  >
                      {tab}
                  </button>
              ))}
          </div>
        </div>
      </FadeUp>

      {/* Control Strip */}
      <FadeUp delay={0.1}>
          <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#BDBDBD]" size={18} />
              <input 
                  type="text"
                  placeholder="ID, CUSTOMER, OR CLUSTER..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-[var(--outline-variant)] rounded-none pl-16 pr-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#1B1C1C] focus:border-[var(--primary)] outline-none transition-all placeholder:text-[#BDBDBD]"
              />
          </div>
      </FadeUp>

      {/* Catalog Display */}
      <div className="grid grid-cols-1 gap-8 relative z-10">
          {loading ? (
              <div className="min-h-[400px] flex flex-col items-center justify-center bg-white border border-[var(--outline-variant)] rounded-none gap-4">
                  <Loader2 size={40} className="text-[var(--primary)] animate-spin" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9E9E9E] animate-pulse">Initializing Logs...</p>
              </div>
          ) : filteredBookings.length === 0 ? (
              <div className="min-h-[400px] flex flex-col items-center justify-center bg-white border border-[var(--outline-variant)] rounded-none">
                  <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#9E9E9E]">No Activity Logs Found</p>
              </div>
          ) : (
              <AnimatePresence mode="popLayout">
                  {filteredBookings.map((b, idx) => (
                      <motion.div 
                        key={b.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-white rounded-none border border-[var(--outline-variant)] group hover:border-[var(--primary)] transition-all"
                      >
                          <div className="p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-12">
                              {/* Left: Core Info */}
                              <div className="flex-1 space-y-8">
                                  <div className="flex items-center gap-5">
                                      <div className={`p-3 rounded-none border ${b.status.name === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                          <Clock size={18} />
                                      </div>
                                      <div>
                                          <div className="flex items-center gap-3 mb-1">
                                            <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-[var(--primary)] opacity-40">REF</span>
                                            <span className="text-lg font-bold text-[#1B1C1C] tracking-tight uppercase">{b.bookingNumber}</span>
                                          </div>
                                          <div className="text-[#9E9E9E] text-[9px] font-bold uppercase tracking-[0.2em] flex items-center gap-3">
                                              <span>{new Date(b.createdAt).toLocaleDateString()}</span>
                                              <span className="h-1 w-1 bg-[var(--outline-variant)]"></span>
                                              <span>{new Date(b.createdAt).toLocaleTimeString()}</span>
                                          </div>
                                      </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                      {/* Product Detail */}
                                      <div className="space-y-4">
                                          <h4 className="text-[9px] font-bold text-[#1B1C1C] opacity-30 uppercase tracking-[0.4em]">Asset Config</h4>
                                          <div className="space-y-2">
                                              <p className="text-xl font-display font-bold text-[#1B1C1C] leading-none uppercase tracking-tight">{b.product.name}</p>
                                              <div className="flex items-center gap-2 text-[var(--primary)] font-bold text-[9px] uppercase tracking-widest">
                                                  <MapPin size={12} />
                                                  {b.product.location.name}
                                              </div>
                                          </div>
                                      </div>

                                      {/* Customer Detail */}
                                      <div className="space-y-4">
                                          <h4 className="text-[9px] font-bold text-[#1B1C1C] opacity-30 uppercase tracking-[0.4em]">Subscriber Node</h4>
                                          <div className="flex items-center gap-4">
                                              <div className="h-10 w-10 bg-[var(--surface-low)] flex items-center justify-center font-bold text-[#1B1C1C] border border-[var(--outline-variant)]">
                                                  {b.customer.name.charAt(0)}
                                              </div>
                                              <div>
                                                  <p className="font-bold text-[#1B1C1C] text-[13px] uppercase tracking-tight">{b.customer.name}</p>
                                                  <p className="text-[9px] text-[#9E9E9E] font-bold uppercase tracking-widest mt-1 opacity-60">{b.customer.email}</p>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              </div>

                              {/* Right: Actions & Amount */}
                              <div className="lg:w-72 flex flex-col items-center lg:items-end justify-between gap-12 lg:pl-12 lg:border-l border-[var(--outline-variant)]/20">
                                  <div className="text-center lg:text-right space-y-2">
                                      <p className="text-[9px] font-bold text-[#1B1C1C] opacity-30 uppercase tracking-[0.4em]">Payload Value</p>
                                      <p className="text-3xl font-display font-bold text-[#1B1C1C] tracking-tighter">₹{Math.round(b.grandTotal).toLocaleString()}</p>
                                      <div className={`px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.2em] border inline-block ${b.status.name === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                                          STATUS: {b.status.displayName}
                                      </div>
                                  </div>

                                  <div className="w-full flex flex-col gap-2">
                                      {b.status.name === 'PENDING' ? (
                                          <>
                                              <button 
                                                onClick={() => handleUpdateStatus(b.id, 'CONFIRMED')}
                                                className="w-full bg-[var(--primary)] text-white py-4 text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-black transition-all flex items-center justify-center gap-2 rounded-none"
                                              >
                                                  Update
                                              </button>
                                              <button 
                                                onClick={() => handleUpdateStatus(b.id, 'CANCELLED')}
                                                className="w-full bg-white text-red-600 border border-red-100 py-3 text-[9px] font-bold uppercase tracking-[0.3em] hover:bg-red-50 transition-all flex items-center justify-center gap-2 rounded-none"
                                              >
                                                  Delete
                                              </button>
                                          </>
                                      ) : (
                                          <div className="w-full bg-neutral-50 text-neutral-400 py-4 text-[9px] font-bold uppercase tracking-[0.3em] border border-neutral-100 flex items-center justify-center gap-2 rounded-none">
                                              ARCHIVED
                                          </div>
                                      )}
                                  </div>
                              </div>
                          </div>
                      </motion.div>
                  ))}
              </AnimatePresence>
          )}
      </div>
    </div>
  );
}
