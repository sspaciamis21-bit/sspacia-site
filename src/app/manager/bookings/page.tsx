'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { FadeUp } from '@/components/ui/fade-up';
import { Loader2, MapPin, Calendar } from 'lucide-react';
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
}

export default function ManagerBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/user/bookings')
      .then(r => r.json())
      .then(json => {
        if (json.data) setBookings(json.data);
      })
      .catch(() => toast.error('Failed to load bookings'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      <FadeUp>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="inline-flex p-3.5 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
               <Calendar size={28} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-[#1B1C1C] tracking-tight">Location Bookings</h1>
              <p className="text-[#616161] font-medium text-sm mt-1">View workspace bookings for your assigned locations.</p>
            </div>
          </div>
        </div>
      </FadeUp>

      <FadeUp delay={0.2}>
        <div className="bg-[var(--surface-lowest)] rounded-3xl border border-[var(--outline-variant)]/50 shadow-sm overflow-hidden min-h-[400px]">
          {loading ? (
             <div className="flex flex-col items-center justify-center p-24">
               <Loader2 className="h-10 w-10 text-[var(--primary)] animate-spin mb-4" />
               <p className="text-[#616161] font-bold text-sm tracking-widest uppercase">Loading bookings</p>
             </div>
          ) : bookings.length === 0 ? (
             <div className="flex flex-col items-center justify-center p-24 text-center">
               <div className="inline-flex p-6 rounded-3xl bg-[var(--surface-low)] text-[#9E9E9E] mb-6">
                 <Calendar size={48} />
               </div>
               <p className="font-display font-bold text-xl text-[#1B1C1C]">No bookings found</p>
               <p className="text-sm font-medium text-[#9E9E9E] mt-2 max-w-xs">There are no reservations for your locations yet.</p>
             </div>
          ) : (
             <div className="overflow-x-auto min-w-full">
               <table className="w-full text-left border-collapse min-w-[800px]">
                 <thead>
                   <tr className="bg-[var(--surface-low)]/50 border-b border-[var(--outline-variant)]/30">
                     <th className="p-5 text-[11px] font-bold text-[#9E9E9E] uppercase tracking-widest">Booking ID</th>
                     <th className="p-5 text-[11px] font-bold text-[#9E9E9E] uppercase tracking-widest">Customer</th>
                     <th className="p-5 text-[11px] font-bold text-[#9E9E9E] uppercase tracking-widest">Space</th>
                     <th className="p-5 text-[11px] font-bold text-[#9E9E9E] uppercase tracking-widest">Date & Time</th>
                     <th className="p-5 text-[11px] font-bold text-[#9E9E9E] uppercase tracking-widest">Status</th>
                     <th className="p-5 text-[11px] font-bold text-[#9E9E9E] uppercase tracking-widest text-right">Amount</th>
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
                        <td className="p-5">
                           <p className="text-sm font-bold text-[#1B1C1C] group-hover:text-[var(--primary)] transition-colors">{booking.bookingNumber}</p>
                           <p className="text-[10px] text-[#9E9E9E] uppercase font-bold tracking-tight mt-1">{new Date(booking.createdAt).toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' })}</p>
                        </td>
                        <td className="p-5">
                           <p className="text-sm font-bold text-[#1B1C1C]">{booking.customer.name}</p>
                           <p className="text-[11px] text-[#9E9E9E] font-medium">{booking.customer.email}</p>
                        </td>
                        <td className="p-5">
                           <p className="text-sm font-bold text-[#1B1C1C]">{booking.product.name}</p>
                           <p className="text-[11px] flex items-center gap-1.5 text-[#616161] font-medium mt-1"><MapPin size={12} className="text-[var(--primary)]"/> {booking.product.location.name}</p>
                        </td>
                        <td className="p-5">
                           <p className="text-sm font-bold text-[#1B1C1C]">{new Date(booking.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                           <p className="text-[11px] text-[#9E9E9E] font-bold mt-1 uppercase tracking-tighter">{booking.startTime} — {booking.endTime}</p>
                        </td>
                        <td className="p-5">
                           <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                             booking.status.name === 'CONFIRMED' 
                             ? 'bg-blue-50 text-blue-700 border-blue-100' 
                             : 'bg-gray-50 text-gray-700 border-gray-100'
                           }`}>
                              {booking.status.displayName}
                           </span>
                        </td>
                        <td className="p-5 text-right">
                           <p className="text-base font-display font-bold text-[#1B1C1C]">₹{parseFloat(booking.grandTotal.toString()).toFixed(0)}</p>
                           <p className="text-[10px] text-[#9E9E9E] font-bold uppercase tracking-tighter mt-1 opacity-70">via {booking.payments?.[0]?.method || 'N/A'}</p>
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
