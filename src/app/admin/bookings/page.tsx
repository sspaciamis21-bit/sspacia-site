'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Loader2, MapPin, Briefcase, Calendar, Clock, CreditCard, ChevronRight, Search } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');

  const loadBookings = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/bookings');
      const json = await r.json();
      setBookings(json.data || []);
    } catch {
      toast.error('Telemetry link failed: Unable to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBookings(); }, []);

  const filteredBookings = bookings.filter(b => 
    b.bookingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-12 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="h-20 w-20 bg-white text-[var(--primary)] flex items-center justify-center rounded-none border border-[var(--outline-variant)]/40 shadow-xl">
            <Briefcase size={40} />
          </div>
          <div>
            <h1 className="text-4xl font-display font-black text-[#1B1C1C] tracking-tighter uppercase">Activity Logs</h1>
            <p className="text-[#616161] font-bold text-[11px] uppercase tracking-widest mt-1 opacity-60 italic">Real-time telemetry of global workspace utilization</p>
          </div>
        </div>
      </div>

      {/* Modern Toolbar */}
      <div className="bg-white border border-[var(--outline-variant)]/40 p-2 flex flex-col md:flex-row items-stretch gap-2 shadow-sm rounded-none">
        <div className="relative flex-1">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#9E9E9E]" size={18} />
          <input
            type="text"
            placeholder="FILTER_LOGS_BY_ID_CUSTOMER_OR_ASSET..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-16 pr-6 py-5 bg-neutral-50 border-none focus:ring-0 text-[11px] font-bold uppercase tracking-widest text-[#1B1C1C] placeholder:text-[#9E9E9E]"
          />
        </div>
        <div className="px-8 flex items-center gap-4 bg-neutral-50 text-[10px] font-black text-[#616161] uppercase tracking-widest border-l border-[var(--outline-variant)]/10">
          <span>Total Transactions:</span>
          <span className="bg-white text-[var(--primary)] px-3 py-1 font-black border border-[var(--outline-variant)]/30 shadow-sm">{bookings.length}</span>
        </div>
      </div>

      {/* Registry Table */}
      <div className="bg-white border border-[var(--outline-variant)]/40 rounded-none shadow-2xl overflow-hidden">
        {loading ? (
          <div className="px-10 py-40 flex flex-col items-center justify-center text-center">
            <Loader2 className="h-10 w-10 text-[var(--primary)] animate-spin mb-6" />
            <p className="text-[11px] font-black text-[#1B1C1C] uppercase tracking-[0.4em] animate-pulse">Scanning Transmission History...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="px-10 py-40 text-center">
             <Briefcase size={48} className="mx-auto mb-6 text-[#1B1C1C] opacity-20" />
             <p className="text-[11px] font-black text-[#1B1C1C] uppercase tracking-[0.4em]">Log Buffer Empty</p>
             <p className="text-[9px] text-[#616161] font-bold uppercase tracking-widest mt-2 opacity-60 italic">No activity detected matching current filter parameters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-neutral-50/50 border-b border-[var(--outline-variant)]/20">
                  <th className="px-10 py-6 text-[10px] font-black text-[#9E9E9E] uppercase tracking-[0.3em]">Log Entry / UID</th>
                  <th className="px-10 py-6 text-[10px] font-black text-[#9E9E9E] uppercase tracking-[0.3em]">Authorized Actor</th>
                  <th className="px-10 py-6 text-[10px] font-black text-[#9E9E9E] uppercase tracking-[0.3em]">Asset Deployment</th>
                  <th className="px-10 py-6 text-[10px] font-black text-[#9E9E9E] uppercase tracking-[0.3em]">Temporal Window</th>
                  <th className="px-10 py-6 text-[10px] font-black text-[#9E9E9E] uppercase tracking-[0.3em]">Status</th>
                  <th className="px-10 py-6 text-[10px] font-black text-[#9E9E9E] uppercase tracking-[0.3em] text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--outline-variant)]/10 font-bold">
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-neutral-50/80 transition-colors group">
                    <td className="px-10 py-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-black text-[var(--primary)] uppercase tracking-wider">{booking.bookingNumber}</span>
                        <span className="text-[9px] text-[#9E9E9E] font-mono tracking-tighter uppercase opacity-60">{new Date(booking.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-black text-[#1B1C1C] uppercase tracking-wider">{booking.customer.name}</span>
                        <span className="text-[9px] text-[#616161] font-bold uppercase tracking-widest opacity-60">{booking.customer.email}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-black text-[#1B1C1C] uppercase tracking-wider">{booking.product.name}</span>
                        <span className="text-[9px] flex items-center gap-1.5 text-[#616161] font-bold uppercase tracking-widest opacity-60">
                          <MapPin size={10}/> {booking.product.location.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-[#1B1C1C]">
                          <Calendar size={12} className="opacity-40" />
                          <span className="text-[10px] font-black uppercase tracking-wider">{new Date(booking.startDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[#616161]">
                          <Clock size={12} className="opacity-40" />
                          <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">{booking.startTime} - {booking.endTime}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                       <span className={`inline-flex px-3 py-1 bg-neutral-100 text-[9px] font-black uppercase tracking-widest border border-[var(--outline-variant)]/20 ${booking.status.name === 'CONFIRMED' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {booking.status.displayName}
                       </span>
                    </td>
                    <td className="px-10 py-6 text-right">
                       <div className="flex flex-col items-end gap-1">
                        <span className="text-xs font-black text-[#1B1C1C] uppercase tracking-wider">₹{parseFloat(booking.grandTotal.toString()).toLocaleString()}</span>
                        <span className="flex items-center gap-1.5 text-[8px] text-[#9E9E9E] font-bold uppercase tracking-[0.2em] opacity-60">
                           <CreditCard size={10} /> {booking.payments?.[0]?.method || 'N/A'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
