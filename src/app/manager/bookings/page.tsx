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
            <div className="h-20 w-20 rounded-[2.5rem] bg-[var(--primary)] text-white flex items-center justify-center shadow-2xl shadow-[var(--primary)]/30">
              <ShoppingBag size={40} />
            </div>
            <div>
              <h1 className="text-4xl font-display font-black text-[#1B1C1C] tracking-tighter uppercase italic italic-none">Purchase Logs</h1>
              <p className="text-[#616161] font-medium text-lg mt-1 group">Confirm and manage system purchase requests</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-1.5 bg-[var(--surface-low)] rounded-2xl border border-[var(--outline-variant)]/30 backdrop-blur-sm">
              {(['PENDING', 'CONFIRMED', 'ALL'] as const).map(tab => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === tab ? 'bg-white text-[var(--primary)] shadow-sm border border-[var(--primary)]/10' : 'text-[#9E9E9E] hover:text-[#1B1C1C]'}`}
                  >
                      {tab === 'PENDING' && stats.pending > 0 && <span className="mr-2 h-2 w-2 rounded-full bg-amber-500 inline-block animate-pulse"></span>}
                      {tab}
                  </button>
              ))}
          </div>
        </div>
      </FadeUp>

      {/* Control Strip */}
      <FadeUp delay={0.1}>
          <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#BDBDBD] group-focus-within:text-[var(--primary)] transition-colors" size={20} />
              <input 
                  type="text"
                  placeholder="Search by Booking ID, Customer Name, or Cluster System..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-[var(--outline-variant)]/40 rounded-[2rem] pl-16 pr-8 py-6 text-sm font-bold text-[#1B1C1C] focus:ring-4 focus:ring-[var(--primary)]/5 outline-none shadow-sm transition-all placeholder:text-[#BDBDBD] placeholder:font-medium"
              />
          </div>
      </FadeUp>

      {/* Catalog Display */}
      <div className="grid grid-cols-1 gap-8 relative z-10">
          {loading ? (
              <div className="min-h-[400px] flex flex-col items-center justify-center bg-white/50 rounded-[3rem] border border-dashed border-[var(--outline-variant)]">
                  <Loader2 className="h-12 w-12 text-[var(--primary)] animate-spin mb-4 opacity-20" />
                  <p className="text-[10px] font-black text-[#9E9E9E] uppercase tracking-[0.4em] italic">Synchronizing Logs...</p>
              </div>
          ) : filteredBookings.length === 0 ? (
              <div className="min-h-[400px] flex flex-col items-center justify-center bg-white/50 rounded-[3rem] border border-dashed border-[var(--outline-variant)]">
                  <div className="p-8 bg-[var(--surface-low)] rounded-full mb-6 opacity-20">
                      <ShoppingBag size={64} />
                  </div>
                  <p className="text-xl font-display font-black text-[#1B1C1C] uppercase tracking-tight">Zero Activity Found</p>
                  <p className="text-sm font-medium text-[#9E9E9E] mt-2">No purchase requests match your current filters.</p>
              </div>
          ) : (
              <AnimatePresence mode="popLayout">
                  {filteredBookings.map((b, idx) => (
                      <motion.div 
                        key={b.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-white rounded-[3rem] border border-[var(--outline-variant)]/40 shadow-sm hover:shadow-2xl hover:shadow-[#1B1C1C]/5 transition-all overflow-hidden group"
                      >
                          <div className="p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-12">
                              {/* Left: Core Info */}
                              <div className="flex-1 space-y-8">
                                  <div className="flex items-center gap-4">
                                      <div className={`p-3 rounded-2xl border ${b.status.name === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                          <Clock size={20} />
                                      </div>
                                      <div>
                                          <div className="flex items-center gap-3 mb-1">
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--primary)] opacity-60 italic">Request ID</span>
                                            <span className="text-lg font-black text-[#1B1C1C] tracking-tight">{b.bookingNumber}</span>
                                          </div>
                                          <div className="flex items-center gap-2 text-[#9E9E9E] text-xs font-bold uppercase tracking-widest leading-none">
                                              <span>{new Date(b.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                              <span className="h-1 w-1 bg-[#BDBDBD] rounded-full"></span>
                                              <span>{new Date(b.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                                          </div>
                                      </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                      {/* Product Detail */}
                                      <div className="space-y-4">
                                          <h4 className="text-[10px] font-black text-[#1B1C1C] opacity-30 uppercase tracking-[0.3em] italic">System Configuration</h4>
                                          <div className="space-y-2">
                                              <p className="text-2xl font-display font-black text-[#1B1C1C] max-w-sm leading-none">{b.product.name}</p>
                                              <div className="flex items-center gap-2 text-[var(--primary)] font-bold text-xs uppercase tracking-wider italic">
                                                  <MapPin size={14} />
                                                  {b.product.location.name}
                                              </div>
                                          </div>
                                      </div>

                                      {/* Customer Detail */}
                                      <div className="space-y-4">
                                          <h4 className="text-[10px] font-black text-[#1B1C1C] opacity-30 uppercase tracking-[0.3em] italic">Member Profile</h4>
                                          <div className="flex items-center gap-4">
                                              <div className="h-12 w-12 rounded-2xl bg-[var(--surface-low)] flex items-center justify-center font-black text-[#1B1C1C] border border-[var(--outline-variant)]/40 shadow-inner group-hover:bg-[var(--primary)] group-hover:text-white transition-all">
                                                  {b.customer.name.charAt(0)}
                                              </div>
                                              <div>
                                                  <p className="font-black text-[#1B1C1C] leading-none mb-1.5">{b.customer.name}</p>
                                                  <p className="text-[11px] text-[#9E9E9E] font-bold lowercase tracking-tight italic opacity-80">{b.customer.email}</p>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              </div>

                              {/* Right: Actions & Amount */}
                              <div className="lg:w-80 flex flex-col items-center lg:items-end justify-between gap-10 lg:pl-12 lg:border-l border-[var(--outline-variant)]/20">
                                  <div className="text-center lg:text-right space-y-1">
                                      <p className="text-[10px] font-black text-[#1B1C1C] opacity-30 uppercase tracking-[0.3em] italic">Amount Payload</p>
                                      <p className="text-4xl font-display font-black text-[#1B1C1C]">₹{parseFloat(b.grandTotal.toString()).toLocaleString()}</p>
                                      <div className={`inline-flex px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border mt-2 ${b.status.name === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                          Status: {b.status.displayName}
                                      </div>
                                  </div>

                                  <div className="w-full flex gap-3">
                                      {b.status.name === 'PENDING' ? (
                                          <>
                                              <button 
                                                onClick={() => handleUpdateStatus(b.id, 'CONFIRMED')}
                                                className="flex-1 bg-[var(--primary)] text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[var(--primary)]/20 flex items-center justify-center gap-2"
                                              >
                                                  <CheckCircle2 size={16} /> Confirm
                                              </button>
                                              <button 
                                                onClick={() => handleUpdateStatus(b.id, 'CANCELLED')}
                                                className="flex-1 bg-white text-rose-600 border border-rose-100 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
                                              >
                                                  <XCircle size={16} /> Cancel
                                              </button>
                                          </>
                                      ) : (
                                          <button className="w-full bg-[var(--surface-low)] text-[#9E9E9E] py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-[var(--outline-variant)]/30 cursor-not-allowed flex items-center justify-center gap-2">
                                              Workflow Complete <CheckCircle2 size={16} />
                                          </button>
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
