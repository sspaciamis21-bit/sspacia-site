'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Briefcase, AlertCircle, Package, Clock, Loader2, ChevronRight } from 'lucide-react';
import { FadeUp } from '@/components/ui/fade-up';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

interface ManagerStats {
  totalTickets: number;
  openTickets: number;
  totalProducts: number;
  totalLocations: number;
}

interface Location {
  id: number;
  name: string;
}

interface Ticket {
  id: number;
  ticketNumber: string;
  name: string;
  status: string;
  location: string;
  createdAt: string;
}

interface Booking {
  id: number;
  bookingNumber: string;
  customer: { name: string; email: string };
  product: { name: string; location: { name: string } };
  status: { name: string; displayName: string };
  grandTotal: number;
  startDate: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  paymentMethod: string;
}

export default function ManagerDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<ManagerStats | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      fetchDashboardData();
    }
  }, [user, authLoading]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/dashboard', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          toast.error('Failed to load dashboard. Please refresh.');
          return;
        }
        throw new Error('Failed to fetch dashboard data');
      }

      const json = await response.json();
      const dashData = json.data;

      if (dashData) {
        setStats(dashData.stats);
        setLocations(dashData.user?.locations || []);
        setTickets(dashData.tickets || []);
        setBookings(dashData.bookings || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 size={40} className="text-[var(--primary)] animate-spin" />
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9E9E9E] animate-pulse">Initializing Terminal...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20 px-4">
      <FadeUp>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-6">
            <div className="inline-flex p-4 bg-white border border-[var(--outline-variant)] text-[var(--primary)]">
              <Briefcase size={28} />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-display font-bold text-[#1B1C1C] uppercase tracking-tight italic">
                {user?.name?.split(' ')[0]} / ARCHITECT
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-[#616161] font-bold text-[9px] uppercase tracking-widest opacity-50">Controlled Nodes:</span>
                {locations.length > 0 ? (
                  locations.map((loc) => (
                    <span key={loc.id} className="bg-neutral-50 text-[#1B1C1C] px-3 py-1 rounded-none text-[8px] font-black uppercase border border-neutral-200 tracking-widest">
                      {loc.name}
                    </span>
                  ))
                ) : (
                  <span className="text-[#9E9E9E] text-[10px] font-bold uppercase tracking-widest">Awaiting Assignment</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Network Nodes', value: stats?.totalLocations || 0, icon: Briefcase },
            { label: 'Dispatch Requests', value: stats?.totalTickets || 0, icon: AlertCircle },
            { label: 'Active Signals', value: stats?.openTickets || 0, icon: Clock },
            { label: 'Space Assets', value: stats?.totalProducts || 0, icon: Package },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-none p-8 border border-[var(--outline-variant)] shadow-sm relative group hover:border-[var(--primary)] transition-all"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-neutral-50 border border-neutral-100 text-[#1B1C1C]">
                    <Icon size={20} />
                  </div>
                </div>
                <div>
                  <p className="text-4xl font-display font-bold text-[#1B1C1C] mb-2 tracking-tighter">{stat.value}</p>
                  <p className="text-[#616161] font-bold text-[9px] uppercase tracking-[0.3em] font-sans">{stat.label}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </FadeUp>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Recent Bookings */}
        <FadeUp delay={0.2}>
          <div className="bg-white rounded-none border border-[var(--outline-variant)] shadow-sm overflow-hidden h-full flex flex-col">
            <div className="px-8 py-6 border-b border-[var(--outline-variant)] flex justify-between items-center bg-neutral-50/50">
              <div className="flex items-center gap-3">
                <div className="h-1.5 w-6 bg-[var(--primary)]"></div>
                <h2 className="text-[10px] font-bold text-[#1B1C1C] uppercase tracking-[0.4em]">Operations Log</h2>
              </div>
              <Link href="/manager/bookings" className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--primary)] hover:text-black transition-colors">Audit trail</Link>
            </div>
            <div className="divide-y divide-neutral-100 flex-1 overflow-y-auto">
              {bookings.length > 0 ? (
                bookings.map((booking) => (
                  <div key={booking.id} className="p-8 hover:bg-neutral-50 transition-colors group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-bold text-[#1B1C1C] text-[14px] uppercase tracking-tight">{booking.bookingNumber}</p>
                        <p className="text-[10px] text-[var(--primary)] font-bold uppercase tracking-widest mt-1 opacity-60">{booking.customer.name}</p>
                      </div>
                      <span className={`px-3 py-1.5 rounded-none text-[8px] font-black uppercase tracking-widest border transition-all ${
                        booking.status.name === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-neutral-50 text-neutral-400 border-neutral-100'
                      }`}>
                        {booking.status.displayName}
                      </span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="text-[10px] text-[#9E9E9E] font-bold uppercase tracking-widest leading-relaxed">
                        <p className="text-[#616161]">{booking.product.name}</p>
                        <p className="opacity-40">{new Date(booking.startDate).toLocaleDateString()} • {booking.startTime}</p>
                      </div>
                      <p className="font-display font-bold text-[#1B1C1C] text-xl">₹{Math.round(booking.grandTotal)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-20 text-center">
                   <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#9E9E9E] animate-pulse">Scanning Archive...</p>
                </div>
              )}
            </div>
          </div>
        </FadeUp>

        {/* Agreement Registry */}
        <FadeUp delay={0.25}>
          <div className="bg-white rounded-none border border-[var(--outline-variant)] shadow-sm overflow-hidden h-full flex flex-col">
            <div className="px-8 py-6 border-b border-[var(--outline-variant)] flex justify-between items-center bg-neutral-50/50">
              <div className="flex items-center gap-3">
                <div className="h-1.5 w-6 bg-indigo-600"></div>
                <h2 className="text-[10px] font-bold text-[#1B1C1C] uppercase tracking-[0.4em]">Agreement Registry</h2>
              </div>
              <Link href="/manager/contracts" className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--primary)] hover:text-black transition-colors">Protocol Sync</Link>
            </div>
            <div className="divide-y divide-neutral-100 flex-1 overflow-y-auto">
               <div className="p-10 text-center py-24">
                  <ShieldCheck size={32} className="mx-auto text-[var(--primary)] opacity-20 mb-4" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#9E9E9E]">Contract Engine Active</p>
                  <p className="text-[8px] text-[#BDBDBD] font-bold uppercase tracking-widest mt-2">All legal protocols currently synchronized.</p>
                  <Link 
                    href="/manager/contracts"
                    className="inline-block mt-8 px-6 py-2 border border-[var(--outline-variant)] text-[9px] font-black uppercase tracking-widest hover:bg-[var(--primary)] hover:text-white transition-all"
                  >
                    Open Contract Center
                  </Link>
               </div>
            </div>
          </div>
        </FadeUp>

        {/* Pending Verifications */}
        <FadeUp delay={0.3}>
          <div className="bg-white rounded-none border border-[var(--outline-variant)] shadow-sm overflow-hidden h-full flex flex-col">
            <div className="px-8 py-6 border-b border-[var(--outline-variant)] flex justify-between items-center bg-neutral-50/50">
              <div className="flex items-center gap-3">
                <div className="h-1.5 w-6 bg-amber-500"></div>
                <h2 className="text-[10px] font-bold text-[#1B1C1C] uppercase tracking-[0.4em]">Identity Queue</h2>
              </div>
              <Link href="/manager/documents" className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--primary)] hover:text-black transition-colors">Audit Node</Link>
            </div>
            <div className="divide-y divide-neutral-100 flex-1 overflow-y-auto">
               <div className="p-10 text-center py-24">
                  <FileText size={32} className="mx-auto text-[var(--primary)] opacity-20 mb-4" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#9E9E9E]">Verification Engine Active</p>
                  <p className="text-[8px] text-[#BDBDBD] font-bold uppercase tracking-widest mt-2">All subscriber nodes currently synchronized.</p>
               </div>
            </div>
          </div>
        </FadeUp>

        {/* Recent Tickets */}
        <FadeUp delay={0.35}>
          <div className="bg-white rounded-none border border-[var(--outline-variant)] shadow-sm overflow-hidden h-full flex flex-col">
            <div className="px-8 py-6 border-b border-[var(--outline-variant)] flex justify-between items-center bg-neutral-50/50">
              <div className="flex items-center gap-3">
                <div className="h-1.5 w-6 bg-red-600"></div>
                <h2 className="text-[10px] font-bold text-[#1B1C1C] uppercase tracking-[0.4em]">Signal Registry</h2>
              </div>
              <Link href="/manager/tickets" className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--primary)] hover:text-black transition-colors">Dispatch</Link>
            </div>
            <div className="divide-y divide-neutral-100 flex-1 overflow-y-auto">
              {tickets.length > 0 ? (
                tickets.map((ticket) => (
                  <div key={ticket.id} className="p-8 hover:bg-neutral-50 transition-colors group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-bold text-[#1B1C1C] text-[14px] uppercase tracking-tight">{ticket.ticketNumber}</p>
                        <p className="text-[10px] text-[#616161] font-bold uppercase tracking-widest mt-1 opacity-60">{ticket.name}</p>
                      </div>
                      <span className={`px-3 py-1.5 rounded-none text-[8px] font-black uppercase tracking-widest border transition-all ${
                        ticket.status === 'OPEN' ? 'bg-red-50 text-red-600 border-red-100' : 
                        ticket.status === 'IN_PROGRESS' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                        'bg-emerald-50 text-emerald-600 border-emerald-100'
                      }`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex justify-between items-end">
                      <p className="text-[10px] text-[#9E9E9E] font-bold uppercase tracking-widest truncate max-w-[180px] opacity-60">LOC: {ticket.location}</p>
                      <p className="text-[9px] text-[#9E9E9E] font-bold uppercase tracking-widest opacity-40">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-20 text-center">
                   <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#9E9E9E] animate-pulse">Awaiting Signals...</p>
                </div>
              )}
            </div>
          </div>
        </FadeUp>
      </div>
      
      <FadeUp delay={0.4}>
        <div className="bg-[#1B1C1C] rounded-none p-12 text-white relative overflow-hidden">
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                   <div className="h-1 w-8 bg-[var(--primary)]"></div>
                   <h2 className="text-[10px] font-bold uppercase tracking-[0.5em] text-white/40 italic">Global Ops Hub</h2>
                </div>
                <h2 className="text-4xl font-display font-bold mb-10 tracking-tight uppercase italic">Directive Center</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/10 border border-white/10">
                  {[
                    { name: 'Assets', href: '/manager/products', icon: Package, desc: 'SPACE INVENTORY' },
                    { name: 'Reservations', href: '/manager/bookings', icon: Clock, desc: 'SCHEDULES' },
                    { name: 'Support', href: '/manager/tickets', icon: AlertCircle, desc: 'DISPATCH' },
                    { name: 'Identity', href: '/manager/documents', icon: ShieldCheck, desc: 'VERIFICATION' },
                  ].map((item, idx) => (
                    <Link
                      key={idx}
                      href={item.href}
                      className="p-10 bg-[#1B1C1C] transition-all flex flex-col gap-6 group hover:bg-[var(--primary)]"
                    >
                      <div className="p-3 bg-white/5 border border-white/10 text-white w-fit group-hover:bg-black group-hover:border-transparent transition-all">
                        <item.icon size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-lg tracking-tight uppercase">{item.name}</p>
                        <p className="text-[9px] text-white/30 font-bold uppercase tracking-[0.2em] mt-1 group-hover:text-white/70">{item.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
            </div>
        </div>
      </FadeUp>
    </div>
  );
}
