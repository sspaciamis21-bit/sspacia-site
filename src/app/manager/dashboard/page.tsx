'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Briefcase, AlertCircle, Package, Clock, Loader } from 'lucide-react';
import { FadeUp } from '@/components/ui/fade-up';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

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
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader size={40} className="text-[var(--primary)] animate-spin mb-4" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      <FadeUp>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-4">
            <div className="inline-flex p-3.5 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
              <Briefcase size={28} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-[#1B1C1C] capitalize tracking-tight">
                Welcome back, {user?.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-[#616161] font-medium text-sm">Managing:</span>
                {locations.length > 0 ? (
                  locations.map((loc) => (
                    <span key={loc.id} className="bg-[var(--surface-low)] text-[var(--primary)] px-3 py-1 rounded-full text-xs font-bold border border-[var(--primary)]/10">
                      {loc.name}
                    </span>
                  ))
                ) : (
                  <span className="text-[#9E9E9E] text-sm">No locations assigned</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Assigned Locations', value: stats?.totalLocations || 0, icon: Briefcase, color: 'bg-white', iconColor: 'text-blue-600', border: 'border-[var(--outline-variant)]/50' },
            { label: 'Total Tickets', value: stats?.totalTickets || 0, icon: AlertCircle, color: 'bg-white', iconColor: 'text-red-600', border: 'border-[var(--outline-variant)]/50' },
            { label: 'Open Tickets', value: stats?.openTickets || 0, icon: Clock, color: 'bg-white', iconColor: 'text-orange-600', border: 'border-[var(--outline-variant)]/50' },
            { label: 'Total Products', value: stats?.totalProducts || 0, icon: Package, color: 'bg-white', iconColor: 'text-green-600', border: 'border-[var(--outline-variant)]/50' },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -4, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
                className={`${stat.color} rounded-3xl p-7 border ${stat.border} shadow-sm transition-all`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2.5 rounded-xl bg-[var(--surface-low)] ${stat.iconColor}`}>
                    <Icon size={20} />
                  </div>
                </div>
                <div>
                  <p className="text-4xl font-display font-bold text-[#1B1C1C] mb-1">{stat.value}</p>
                  <p className="text-[#616161] font-bold text-[11px] uppercase tracking-wider">{stat.label}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </FadeUp>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Bookings */}
        <FadeUp delay={0.2}>
          <div className="bg-[var(--surface-lowest)] rounded-3xl border border-[var(--outline-variant)]/50 shadow-sm overflow-hidden h-full">
            <div className="p-6 border-b border-[var(--outline-variant)]/30 flex justify-between items-center bg-[var(--surface-low)]/30">
              <h2 className="text-lg font-display font-bold text-[#1B1C1C] flex items-center gap-2">
                <Clock size={18} className="text-[var(--primary)]" />
                Recent Bookings
              </h2>
              <a href="/manager/bookings" className="text-sm font-bold text-[var(--primary)] hover:underline">View All</a>
            </div>
            <div className="divide-y divide-[var(--outline-variant)]/20">
              {bookings.length > 0 ? (
                bookings.map((booking) => (
                  <div key={booking.id} className="p-5 hover:bg-[var(--surface-low)]/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-[#1B1C1C] text-sm">{booking.bookingNumber}</p>
                        <p className="text-xs text-[#616161] font-medium">{booking.customer.name}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        booking.status.name === 'CONFIRMED' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-gray-50 text-gray-700 border border-gray-100'
                      }`}>
                        {booking.status.displayName}
                      </span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="text-[11px] text-[#9E9E9E]">
                        <p className="font-semibold text-[#616161]">{booking.product.name}</p>
                        <p>{new Date(booking.startDate).toLocaleDateString()} • {booking.startTime}</p>
                      </div>
                      <p className="font-display font-bold text-[#1B1C1C] text-base">₹{parseFloat(booking.grandTotal.toString()).toFixed(0)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-[#9E9E9E] font-medium">No recent bookings</div>
              )}
            </div>
          </div>
        </FadeUp>

        {/* Recent Tickets */}
        <FadeUp delay={0.3}>
          <div className="bg-[var(--surface-lowest)] rounded-3xl border border-[var(--outline-variant)]/50 shadow-sm overflow-hidden h-full">
            <div className="p-6 border-b border-[var(--outline-variant)]/30 flex justify-between items-center bg-[var(--surface-low)]/30">
              <h2 className="text-lg font-display font-bold text-[#1B1C1C] flex items-center gap-2">
                <AlertCircle size={18} className="text-[var(--primary)]" />
                Recent Tickets
              </h2>
              <a href="/manager/tickets" className="text-sm font-bold text-[var(--primary)] hover:underline">View All</a>
            </div>
            <div className="divide-y divide-[var(--outline-variant)]/20">
              {tickets.length > 0 ? (
                tickets.map((ticket) => (
                  <div key={ticket.id} className="p-5 hover:bg-[var(--surface-low)]/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-[#1B1C1C] text-sm">{ticket.ticketNumber}</p>
                        <p className="text-xs text-[#616161] font-medium">{ticket.name}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        ticket.status === 'OPEN' ? 'bg-red-50 text-red-700 border border-red-100' : 
                        ticket.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                        'bg-green-50 text-green-700 border border-green-100'
                      }`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex justify-between items-end">
                      <p className="text-[11px] text-[#9E9E9E] truncate max-w-[200px] font-medium">{ticket.location}</p>
                      <p className="text-[10px] text-[#9E9E9E] italic">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-[#9E9E9E] font-medium">No recent tickets</div>
              )}
            </div>
          </div>
        </FadeUp>
      </div>
      
      <FadeUp delay={0.4}>
        <div className="bg-[#1B1C1C] rounded-3xl p-10 text-white relative overflow-hidden shadow-2xl shadow-black/10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary)]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[var(--primary)]/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10">
                <h2 className="text-3xl font-display font-bold mb-4 tracking-tight">Quick Navigation</h2>
                <p className="text-white/60 leading-relaxed mb-10 font-medium max-w-xl">
                    Easily manage your assets, bookings, and support tickets through the following sections.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {[
                    { name: 'Products', href: '/manager/products', icon: Package, desc: 'Manage workspaces' },
                    { name: 'Bookings', href: '/manager/bookings', icon: Clock, desc: 'View reservations' },
                    { name: 'Tickets', href: '/manager/tickets', icon: AlertCircle, desc: 'Handle support' },
                    { name: 'Users', href: '/manager/users', icon: Briefcase, desc: 'View members' },
                  ].map((item, idx) => (
                    <motion.a
                      key={idx}
                      href={item.href}
                      whileHover={{ y: -4, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                      className="p-5 rounded-2xl bg-white/10 border border-white/5 backdrop-blur-md transition-all flex items-center gap-4 group"
                    >
                      <div className="p-2.5 rounded-xl bg-white/10 text-white group-hover:bg-[var(--primary)] group-hover:text-white transition-all">
                        <item.icon size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-sm tracking-tight">{item.name}</p>
                        <p className="text-[10px] text-white/40 group-hover:text-white/60 transition-colors uppercase font-bold tracking-widest">{item.desc}</p>
                      </div>
                    </motion.a>
                  ))}
                </div>
            </div>
        </div>
      </FadeUp>
    </div>
  );
}
