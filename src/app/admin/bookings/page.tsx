'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { FadeUp } from '@/components/ui/fade-up';
import { Loader2, MapPin } from 'lucide-react';
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

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/bookings')
      .then(r => r.json())
      .then(json => {
        if (json.data) setBookings(json.data);
      })
      .catch(() => toast.error('Failed to load bookings'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <FadeUp>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#004D40]">Manage Bookings</h1>
            <p className="text-[#616161]">View and manage all workspace bookings globally.</p>
          </div>
        </div>
      </FadeUp>

      <FadeUp delay={0.2}>
        <div className="bg-white rounded-xl shadow-sm border border-[#CFD8DC]/50 overflow-hidden">
          {loading ? (
             <div className="flex flex-col items-center justify-center p-12">
               <Loader2 className="h-8 w-8 text-[#006064] animate-spin mb-4" />
               <p className="text-[#616161] font-medium">Loading bookings...</p>
             </div>
          ) : bookings.length === 0 ? (
             <div className="p-12 text-center text-[#616161]">
               No bookings found.
             </div>
          ) : (
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-[#F8F9FA] border-b border-[#CFD8DC]/50">
                     <th className="p-4 text-xs font-bold text-[#9E9E9E] uppercase tracking-wider">Booking ID</th>
                     <th className="p-4 text-xs font-bold text-[#9E9E9E] uppercase tracking-wider">Customer</th>
                     <th className="p-4 text-xs font-bold text-[#9E9E9E] uppercase tracking-wider">Space</th>
                     <th className="p-4 text-xs font-bold text-[#9E9E9E] uppercase tracking-wider">Date & Time</th>
                     <th className="p-4 text-xs font-bold text-[#9E9E9E] uppercase tracking-wider">Status</th>
                     <th className="p-4 text-xs font-bold text-[#9E9E9E] uppercase tracking-wider text-right">Amount</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-[#CFD8DC]/30">
                   {bookings.map(booking => (
                      <motion.tr key={booking.id} initial={{opacity:0}} animate={{opacity:1}} className="hover:bg-[#E0F7FA]/30 transition-colors">
                        <td className="p-4">
                           <p className="text-sm font-bold text-[#004D40]">{booking.bookingNumber}</p>
                           <p className="text-xs text-[#9E9E9E]">{new Date(booking.createdAt).toLocaleDateString()}</p>
                        </td>
                        <td className="p-4">
                           <p className="text-sm font-bold text-[#212121]">{booking.customer.name}</p>
                           <p className="text-xs text-[#9E9E9E]">{booking.customer.email}</p>
                        </td>
                        <td className="p-4">
                           <p className="text-sm font-medium text-[#212121]">{booking.product.name}</p>
                           <p className="text-xs flex items-center gap-1 text-[#616161]"><MapPin size={12}/> {booking.product.location.name}</p>
                        </td>
                        <td className="p-4">
                           <p className="text-sm text-[#212121]">{new Date(booking.startDate).toLocaleDateString()}</p>
                           <p className="text-xs text-[#616161]">{booking.startTime} - {booking.endTime}</p>
                        </td>
                        <td className="p-4">
                           <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${booking.status.name === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                              {booking.status.displayName}
                           </span>
                        </td>
                        <td className="p-4 text-right">
                           <p className="text-sm font-bold text-[#004D40]">₹{parseFloat(booking.grandTotal.toString()).toFixed(2)}</p>
                           <p className="text-[10px] text-[#9E9E9E] uppercase">Paid via {booking.payments?.[0]?.method || 'N/A'}</p>
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
