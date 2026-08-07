'use client';

import { useState, useEffect } from 'react';
import { 
  Calendar, 
  CreditCard, 
  Ticket, 
  Settings, 
  Building2, 
  ArrowRight, 
  Compass,
  Clock,
  ShieldCheck,
  Zap,
  Users,
  Briefcase,
  Loader2
} from 'lucide-react';
import { FadeUp } from '@/components/ui/fade-up';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function UserDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalBookings: 0, activePasses: 0, pendingTickets: 0, totalTickets: 0 });

  // Mock data for UI demonstration until API is ready
  const membershipData = {
    productName: "Premium Dedicated Desk Cluster",
    companyName: user?.companyName || "Personal Account",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    guestCredits: 12,
    totalCredits: 20,
    status: "Active"
  };

  useEffect(() => {
    fetch('/api/user/dashboard')
      .then(r => r.json())
      .then(json => {
        if (json.data) {
          setStats(json.data.stats);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const quickActions = [
    { title: 'My Bookings', icon: Calendar, href: '/dashboard/bookings' },
    { title: 'Support Node', icon: Ticket, href: '/dashboard/tickets' },
    { title: 'Billing Stack', icon: CreditCard, href: '/dashboard/billing' },
    { title: 'Profile Info', icon: Settings, href: '/dashboard/profile' }
  ];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 size={40} className="text-[var(--primary)] animate-spin" />
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9E9E9E] animate-pulse">Initializing...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 px-4 md:px-8 relative font-sans">
      
      {/* ── Section 1: Overview ── */}
      <FadeUp>
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Greeting & Quick Link */}
          <div className="lg:col-span-2 bg-[var(--primary)] rounded-none p-10 md:p-14 text-white relative overflow-hidden shadow-xl group">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/10 blur-[100px] group-hover:bg-white/20 transition-all duration-700"></div>
            
            <div className="relative z-10 flex flex-col h-full justify-between gap-12">
              <div className="space-y-8">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-400"></div>
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/70">Active Profile</span>
                </div>
                <div className="space-y-2">
                  <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight text-white uppercase leading-none">
                    Hello, <br />
                    <span className="text-white/90">{user?.name?.split(' ')[0] || 'Member'}.</span>
                  </h1>
                  <div className="flex items-center gap-2 text-white/80 font-bold uppercase tracking-widest text-[10px] mt-4 border-l border-white/20 pl-4 py-1">
                     <Building2 className="w-3.5 h-3.5" />
                     {user?.companyName || "Sspacia Member"}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <Link href="/products" className="bg-white text-[var(--primary)] px-8 py-4 rounded-none text-[10px] font-bold uppercase tracking-widest shadow-md hover:bg-neutral-50 active:scale-[0.98] transition-all flex items-center gap-3">
                   Browse Rooms <Compass className="h-4 w-4" />
                </Link>
                <Link href="/dashboard/tickets" className="bg-white/10 backdrop-blur-sm text-white border border-white/20 px-8 py-4 rounded-none text-[10px] font-bold uppercase tracking-widest hover:bg-white/20 transition-all flex items-center gap-3">
                   Raise Ticket <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Credits Summary */}
          <div className="bg-[#1B1B1B] rounded-none p-12 flex flex-col justify-between relative overflow-hidden border border-white/10 shadow-xl">
             <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--primary)]/20 blur-[100px] -mr-20 -mt-20"></div>
             <div className="relative z-10">
                <div className="flex justify-between items-center mb-10">
                   <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">Credits Summary</span>
                   <div className="p-2.5 bg-white/5 border border-white/10 text-[var(--primary)]">
                     <Zap className="w-5 h-5" />
                   </div>
                </div>
                <div className="space-y-1">
                  <p className="text-5xl font-bold text-white tracking-tighter">{membershipData.guestCredits}<span className="text-white/20 text-xl ml-2 tracking-tighter">/ {membershipData.totalCredits}</span></p>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Guest Room Credits Available</p>
                </div>
                
                <div className="mt-8 space-y-4">
                   <div className="w-full h-1.5 bg-white/5 rounded-none overflow-hidden">
                      <div className="h-full bg-[var(--primary)] transition-all duration-1000 cubic-bezier(0.4, 0, 0.2, 1)" style={{ width: `${(membershipData.guestCredits/membershipData.totalCredits)*100}%` }}></div>
                   </div>
                   <p className="text-[9px] text-white/20 font-bold uppercase tracking-wider">Credits reset on the 1st of every month.</p>
                </div>
             </div>
             
             <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
                <div>
                   <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Support Priority</p>
                   <p className="text-xs font-bold text-[var(--primary)] mt-1 uppercase tracking-tight">Tier 1 Elite</p>
                </div>
                <div className="p-2 bg-green-500/5 border border-green-500/10">
                  <ShieldCheck className="w-4 h-4 text-green-500/40" />
                </div>
             </div>
          </div>
        </div>
      </FadeUp>

      {/* ── Section 2: Membership Details ── */}
      <section className="grid lg:grid-cols-12 gap-8">
         <div className="lg:col-span-8">
           <FadeUp delay={0.1}>
             <div className="bg-[var(--surface-lowest)] rounded-none p-10 md:p-14 border border-[var(--outline-variant)] shadow-sm relative overflow-hidden group min-h-[420px] flex flex-col justify-center">
                <div className="absolute top-0 right-0 p-8">
                   <div className="h-14 w-14 bg-[var(--primary)]/5 rounded-none flex items-center justify-center border border-[var(--primary)]/5 transition-transform duration-500 group-hover:scale-105">
                      <Briefcase className="w-6 h-6 text-[var(--primary)]" />
                   </div>
                </div>
                                <div className="space-y-10">
                   <div>
                      <h2 className="text-[9px] font-bold text-[var(--primary)] uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                         <div className="h-1 w-1 bg-[var(--primary)]"></div> 
                         Active Membership
                      </h2>
                      <h3 className="text-4xl md:text-5xl font-display font-bold text-[#1B1C1C] uppercase tracking-tight leading-none max-w-lg mb-6">
                         {membershipData.productName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 mt-4 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-widest">
                         <span className="flex items-center gap-2 bg-[var(--surface-low)] px-3 py-1.5 border border-[var(--outline-variant)]">Agreement ID: <span className="text-[#1B1C1C]">SSP-2026-X8</span></span>
                         <span className="flex items-center gap-2 bg-[var(--surface-low)] px-3 py-1.5 border border-[var(--outline-variant)]">Status: <span className="text-[var(--primary)]">{membershipData.status}</span></span>
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-3 p-8 border border-[var(--outline-variant)] hover:bg-[var(--surface-low)] transition-all rounded-none bg-[var(--surface-low)]/30">
                         <div className="flex items-center gap-3">
                            <Calendar className="w-3.5 h-3.5 text-[var(--primary)]" />
                             <span className="text-[9px] font-bold text-[#9E9E9E] uppercase tracking-widest">Start Date</span>
                         </div>
                         <p className="text-2xl font-bold text-[#1B1C1C] tracking-tight">{new Date(membershipData.startDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      </div>
                      
                      <div className="space-y-3 p-8 border border-[var(--outline-variant)] hover:bg-[var(--surface-low)] transition-all rounded-none bg-[var(--surface-low)]/30">
                         <div className="flex items-center gap-3">
                            <Clock className="w-3.5 h-3.5 text-orange-500" />
                             <span className="text-[9px] font-bold text-[#9E9E9E] uppercase tracking-widest">End Date</span>
                         </div>
                         <p className="text-2xl font-bold text-[#1B1C1C] tracking-tight">{new Date(membershipData.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      </div>
                   </div>
                </div>
             </div>
           </FadeUp>
         </div>

         {/* Current Stats */}
         <div className="lg:col-span-4 space-y-8">
             <FadeUp delay={0.2}>
                <div className="bg-[var(--surface-lowest)] rounded-none p-10 border border-[var(--outline-variant)] shadow-sm min-h-[300px] flex flex-col justify-center">
                   <div className="space-y-8">
                     <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-bold text-[#1B1C1C] uppercase tracking-[0.2em] flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-[var(--primary)]"></div>
                           Summary
                        </h3>
                        <Users className="w-4 h-4 text-[#9E9E9E]" />
                     </div>
                          <div className="space-y-6">
                        <div className="flex items-center justify-between group transition-all">
                           <span className="text-[11px] font-bold text-[#616161] uppercase tracking-wider group-hover:text-[var(--primary)]">Pending Tickets</span>
                           <span className="text-3xl font-bold text-[#1B1C1C]">{loading ? '--' : stats.pendingTickets}</span>
                        </div>
                        <div className="flex items-center justify-between group transition-all">
                           <span className="text-[11px] font-bold text-[#616161] uppercase tracking-wider group-hover:text-[var(--primary)]">Active Bookings</span>
                           <span className="text-3xl font-bold text-[#1B1C1C]">{loading ? '--' : stats.totalBookings}</span>
                        </div>
                        <div className="flex items-center justify-between group transition-all border-t border-[var(--outline-variant)] pt-6">
                           <span className="text-[11px] font-bold text-[#616161] uppercase tracking-wider group-hover:text-[var(--primary)]">Support Volume</span>
                           <span className="text-3xl font-bold text-[#1B1C1C]">{loading ? '--' : stats.totalTickets}</span>
                        </div>
                     </div>
                  </div>
               </div>
            </FadeUp>
                        <FadeUp delay={0.3}>
                <Link href="/dashboard/tickets" className="bg-[#1B1B1B] hover:bg-[var(--primary)] p-10 rounded-none flex items-center justify-between group transition-all duration-500 shadow-xl border border-white/5">
                   <div className="space-y-2">
                      <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Need Assistance?</p>
                       <p className="text-lg font-bold text-white uppercase tracking-tight">Get Support</p>
                   </div>
                   <div className="w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-[var(--primary)] transition-all duration-300">
                      <ArrowRight className="w-5 h-5" />
                   </div>
                </Link>
             </FadeUp>
         </div>
      </section>

      {/* ── Section 3: Navigation Grid ── */}
      <FadeUp delay={0.4}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {quickActions.map((action) => (
              <Link 
                key={action.title}
                href={action.href}
                className="bg-[var(--surface-lowest)] p-10 rounded-none border border-[var(--outline-variant)] shadow-sm hover:border-[var(--primary)] hover:shadow-lg transition-all duration-300 group"
              >
                 <div className="h-12 w-12 bg-[var(--surface-low)] border border-[var(--outline-variant)]/50 flex items-center justify-center mb-6 group-hover:bg-[var(--primary)] group-hover:text-white transition-all duration-300">
                    <action.icon size={22} className="text-[var(--primary)] group-hover:text-white transition-colors" />
                 </div>
                 <p className="text-[11px] font-bold text-[#1B1C1C] uppercase tracking-widest">{action.title}</p>
              </Link>
            ))}
          </div>
      </FadeUp>
    </div>
  );
}
