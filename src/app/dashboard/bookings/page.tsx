'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { FadeUp } from '@/components/ui/fade-up';
import { Loader2, MapPin, Calendar, FileCheck, ArrowRight, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface Booking {
  id: number;
  bookingNumber: string;
  createdAt: string;
  startDate: string;
  startTime: string;
  endTime: string;
  grandTotal: number;
  customer: { name: string; email: string };
  product: { name: string; location: { name: string } };
  status: { name: string; displayName: string };
  payments: Array<{ method: string }>;
  contracts?: Array<{ id: number; status: { name: string } }>;
  contractRequests?: Array<{ id: number; status: string }>;
}

export default function UserBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    try {
      const r = await fetch('/api/user/bookings');
      const json = await r.json();
      if (json.data) setBookings(json.data);
    } catch {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleRequestAgreement = async (bookingId: number) => {
    const tid = toast.loading('Submitting agreement request...');
    try {
      const res = await fetch('/api/user/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Request failed');
      
      toast.success('Agreement request submitted successfully.', { id: tid });
      fetchBookings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(msg, { id: tid });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      <FadeUp>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="inline-flex p-3.5 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
               <Calendar size={28} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-[#1B1C1C] tracking-tight italic uppercase">My Bookings</h1>
              <p className="text-[#616161] font-medium text-sm mt-1">View your past and upcoming workspace reservations.</p>
            </div>
          </div>
        </div>
      </FadeUp>

      <FadeUp delay={0.2}>
        <div className="bg-[var(--surface-lowest)] rounded-[2.5rem] border border-[var(--outline-variant)]/50 shadow-sm overflow-hidden min-h-[400px]">
          {loading ? (
             <div className="flex flex-col items-center justify-center p-24">
               <Loader2 className="h-10 w-10 text-[var(--primary)] animate-spin mb-4" />
               <p className="text-[#616161] font-bold text-sm tracking-widest uppercase italic">Initializing...</p>
             </div>
          ) : bookings.length === 0 ? (
             <div className="flex flex-col items-center justify-center p-24 text-center">
               <div className="inline-flex p-8 rounded-3xl bg-[var(--surface-low)] text-[#9E9E9E] mb-6 shadow-inner">
                 <Calendar size={48} />
               </div>
               <p className="font-display font-bold text-xl text-[#1B1C1C] uppercase tracking-tight">No bookings found</p>
               <p className="text-sm font-medium text-[#9E9E9E] mt-2 max-w-xs leading-relaxed">It seems you haven&apos;t reserved any spaces yet. Explore our locations to get started.</p>
             </div>
          ) : (
             <div className="overflow-x-auto min-w-full">
               <table className="w-full text-left border-collapse min-w-[850px]">
                 <thead>
                   <tr className="bg-[var(--surface-low)]/30 border-b border-[var(--outline-variant)]/30">
                     <th className="p-6 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em]">Booking ID</th>
                     <th className="p-6 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em]">Space</th>
                     <th className="p-6 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em]">Date & Time</th>
                     <th className="p-6 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em]">Status</th>
                     <th className="p-6 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em] text-right">Amount</th>
                     <th className="p-6 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em] text-center">Agreement</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-[var(--outline-variant)]/10">
                   {bookings.map(booking => (
                      <motion.tr 
                        key={booking.id} 
                        initial={{opacity:0}} 
                        animate={{opacity:1}} 
                        className="hover:bg-[var(--surface-low)]/30 transition-colors group"
                      >
                        <td className="p-6">
                           <p className="text-sm font-bold text-[#1B1C1C] group-hover:text-[var(--primary)] transition-colors">{booking.bookingNumber}</p>
                           <p className="text-[10px] text-[#9E9E9E] uppercase font-bold tracking-tight mt-1">{new Date(booking.createdAt).toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' })}</p>
                        </td>
                        <td className="p-6">
                           <p className="text-sm font-bold text-[#1B1C1C]">{booking.product.name}</p>
                           <p className="text-[11px] flex items-center gap-1.5 text-[#616161] font-medium mt-1"><MapPin size={12} className="text-[var(--primary)]"/> {booking.product.location.name}</p>
                        </td>
                        <td className="p-6">
                           <p className="text-sm font-bold text-[#1B1C1C]">{new Date(booking.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                           <p className="text-[11px] text-[#9E9E9E] font-bold mt-1 uppercase tracking-tighter italic">{booking.startTime} — {booking.endTime}</p>
                        </td>
                        <td className="p-6">
                           <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${
                             booking.status.name === 'CONFIRMED' 
                             ? 'bg-blue-50 text-blue-700 border-blue-100 shadow-sm shadow-blue-500/10' 
                             : 'bg-gray-50 text-gray-700 border-gray-100 shadow-sm'
                           }`}>
                              {booking.status.displayName}
                           </span>
                        </td>
                        <td className="p-6 text-right">
                           <p className="text-lg font-display font-bold text-[#1B1C1C]">₹{parseFloat(booking.grandTotal.toString()).toLocaleString()}</p>
                           <p className="text-[10px] text-[#9E9E9E] font-bold uppercase tracking-tighter mt-1 opacity-70">via {booking.payments?.[0]?.method || 'N/A'}</p>
                        </td>
                        <td className="p-6">
                           <div className="flex justify-center">
                              {booking.status.name === 'CONFIRMED' ? (
                                <>
                                  {booking.contracts && booking.contracts.length > 0 ? (
                                    <button 
                                      onClick={() => window.location.href = `/dashboard/contracts/${booking.contracts?.[0]?.id}`}
                                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1B1B1B] text-white text-[9px] font-bold uppercase tracking-widest hover:bg-[var(--primary)] transition-all shadow-lg shadow-black/10"
                                    >
                                      View <ArrowRight size={12}/>
                                    </button>
                                  ) : booking.contractRequests && booking.contractRequests.length > 0 ? (
                                    <div className="flex flex-col items-center gap-1 opacity-60">
                                      <ShieldCheck size={16} className="text-amber-500" />
                                      <span className="text-[8px] font-bold uppercase text-[#9E9E9E]">Pending</span>
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={() => handleRequestAgreement(booking.id)}
                                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[var(--outline-variant)] text-[#1B1C1C] text-[9px] font-bold uppercase tracking-widest hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all shadow-sm"
                                    >
                                      Request <FileCheck size={12}/>
                                    </button>
                                  )}
                                </>
                              ) : (
                                <span className="text-[9px] font-bold text-[#bdbdbd] uppercase italic">N/A</span>
                              )}
                           </div>
                        </td>
                      </motion.tr>
                   ))}
                 </tbody>
               </table>
             </div>
          )}
        </div>
      </FadeUp>
    </div>
  );
}
