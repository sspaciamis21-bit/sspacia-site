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
            <div className="inline-flex p-3 bg-[var(--surface-low)] border border-[var(--outline-variant)] text-[var(--primary)] shadow-sm">
               <Calendar size={22} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-[#1B1C1C] tracking-tight uppercase">My Bookings</h1>
              <p className="text-[#616161] font-bold text-[10px] uppercase tracking-widest mt-1 opacity-50">View your space reservations and past activity.</p>
            </div>
          </div>
        </div>
      </FadeUp>

      <FadeUp delay={0.2}>
        <div className="bg-white rounded-none border border-[var(--outline-variant)] shadow-sm overflow-hidden min-h-[400px]">
          {loading ? (
             <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
               <Loader2 size={40} className="text-[var(--primary)] animate-spin" />
               <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9E9E9E] animate-pulse">Initializing...</p>
             </div>
          ) : bookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-24 text-center">
                <div className="inline-flex p-8 bg-[var(--surface-low)] border border-[var(--outline-variant)] text-[#9E9E9E] mb-6">
                  <Calendar size={40} />
                </div>
               <p className="font-display font-bold text-xl text-[#1B1C1C] uppercase tracking-tight">No bookings found</p>
               <p className="text-sm font-medium text-[#9E9E9E] mt-2 max-w-xs leading-relaxed">It seems you haven&apos;t reserved any spaces yet. Explore our locations to get started.</p>
             </div>
          ) : (
             <div className="overflow-x-auto min-w-full">
               <table className="w-full text-left border-collapse min-w-[850px]">
                  <thead>
                    <tr className="bg-[var(--surface-low)]/50 border-b border-[var(--outline-variant)]">
                      <th className="px-6 py-4 text-[9px] font-bold text-[#9E9E9E] uppercase tracking-widest">Booking ID</th>
                      <th className="px-6 py-4 text-[9px] font-bold text-[#9E9E9E] uppercase tracking-widest">Space</th>
                      <th className="px-6 py-4 text-[9px] font-bold text-[#9E9E9E] uppercase tracking-widest">Date & Time</th>
                      <th className="px-6 py-4 text-[9px] font-bold text-[#9E9E9E] uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[9px] font-bold text-[#9E9E9E] uppercase tracking-widest text-right">Amount</th>
                      <th className="px-6 py-4 text-[9px] font-bold text-[#9E9E9E] uppercase tracking-widest text-center">Agreement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--outline-variant)]/30">
                   {bookings.map(booking => (
                      <motion.tr 
                        key={booking.id} 
                        initial={{opacity:0}} 
                        animate={{opacity:1}} 
                        className="hover:bg-[var(--surface-low)]/30 transition-colors group"
                      >
                        <td className="px-6 py-6">
                           <p className="text-sm font-bold text-[#1B1C1C] transition-colors">{booking.bookingNumber}</p>
                           <p className="text-[9px] text-[#9E9E9E] uppercase font-bold tracking-widest mt-1">{new Date(booking.createdAt).toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' })}</p>
                        </td>
                        <td className="px-6 py-6">
                           <p className="text-sm font-bold text-[#1B1C1C]">{booking.product.name}</p>
                           <p className="text-[10px] flex items-center gap-1.5 text-[#9E9E9E] font-bold uppercase tracking-wider mt-1"><MapPin size={10} className="text-[var(--primary)]"/> {booking.product.location.name}</p>
                        </td>
                        <td className="px-6 py-6">
                           <p className="text-sm font-bold text-[#1B1C1C]">{new Date(booking.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                           <p className="text-[10px] text-[#9E9E9E] font-bold mt-1 uppercase tracking-widest">{booking.startTime} — {booking.endTime}</p>
                        </td>
                        <td className="px-6 py-6 text-right">
                           <p className="text-lg font-display font-bold text-[#1B1C1C]">₹{parseFloat(booking.grandTotal.toString()).toLocaleString()}</p>
                        </td>
                        <td className="px-6 py-6">
                           <div className="flex justify-center">
                              {booking.status.name === 'CONFIRMED' ? (
                                <>
                                  {booking.contracts && booking.contracts.length > 0 ? (
                                    <button 
                                      onClick={() => window.location.href = `/dashboard/contracts/${booking.contracts?.[0]?.id}`}
                                      className="flex items-center gap-2 px-4 py-2 rounded-none bg-[#1B1B1B] text-white text-[8px] font-bold uppercase tracking-widest hover:bg-black transition-all"
                                    >
                                      View <ArrowRight size={10}/>
                                    </button>
                                  ) : booking.contractRequests && booking.contractRequests.length > 0 ? (
                                    <div className="flex flex-col items-center gap-1 opacity-40">
                                      <ShieldCheck size={14} className="text-amber-500" />
                                      <span className="text-[7px] font-bold uppercase">Pending</span>
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={() => handleRequestAgreement(booking.id)}
                                      className="flex items-center gap-2 px-4 py-2 rounded-none bg-white border border-[var(--outline-variant)] text-[#1B1C1C] text-[8px] font-bold uppercase tracking-widest hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all"
                                    >
                                      Request <FileCheck size={10}/>
                                    </button>
                                  )}
                                </>
                              ) : (
                                <span className="text-[8px] font-bold text-[#bdbdbd] uppercase">N/A</span>
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
