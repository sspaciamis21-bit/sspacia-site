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
  Briefcase
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

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 px-4 md:px-8 relative font-sans">
      
      {/* ── Section 1: The Identity Hub ── */}
      <FadeUp>
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Greeting & Quick Link */}
          <div className="lg:col-span-2 bg-[var(--primary)] rounded-[3rem] p-10 md:p-14 text-white relative overflow-hidden shadow-2xl shadow-[var(--primary)]/20 group">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-[100px] group-hover:bg-white/20 transition-all duration-700"></div>
            
            <div className="relative z-10 flex flex-col h-full justify-between gap-12">
              <div className="space-y-8">
                <div className="flex items-center gap-3">
                  <div className="h-2.5 w-2.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_15px_rgba(74,222,128,0.6)]"></div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/80 italic">Operational Profile // Active</span>
                </div>
                <div className="space-y-3">
                  <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tighter leading-none text-white italic uppercase">
                    Hello, <br />
                    <span className="text-white/90 not-italic uppercase">{user?.name?.split(' ')[0] || 'Member'}.</span>
                  </h1>
                  <div className="flex items-center gap-3 text-white/70 font-bold uppercase tracking-[0.2em] text-[11px] mt-6 bg-white/10 w-fit px-4 py-2 rounded-full backdrop-blur-sm border border-white/10 shadow-sm">
                     <Building2 className="w-4 h-4" />
                     {user?.companyName || "Sspacia Member"}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-5">
                <Link href="/products" className="bg-white text-[var(--primary)] px-10 py-5 rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
                   Browse Clusters <Compass className="h-4 w-4" />
                </Link>
                <Link href="/dashboard/tickets" className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-10 py-5 rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-white/20 transition-all flex items-center gap-3">
                   Raise Ticket <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Credits Summary */}
          <div className="bg-[#1B1B1B] rounded-[3rem] p-12 flex flex-col justify-between relative overflow-hidden border border-white/5 shadow-2xl">
             <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--primary)]/20 blur-[100px] -mr-20 -mt-20"></div>
             <div className="relative z-10">
                <div className="flex justify-between items-center mb-12">
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">Resource Pool</span>
                  <div className="p-3 bg-white/5 rounded-2xl text-[var(--primary)] shadow-inner">
                    <Zap className="w-6 h-6" />
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-6xl font-bold text-white tracking-tighter">{membershipData.guestCredits}<span className="text-white/20 text-2xl ml-2 tracking-tighter">/ {membershipData.totalCredits}</span></p>
                  <p className="text-[11px] font-bold text-white/50 uppercase tracking-[0.2em] italic">Guest Room Credits Available</p>
                </div>
                
                <div className="mt-10 space-y-6">
                   <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-[var(--primary)] shadow-[0_0_15px_rgba(0,105,111,0.5)] transition-all duration-1000 cubic-bezier(0.4, 0, 0.2, 1)" style={{ width: `${(membershipData.guestCredits/membershipData.totalCredits)*100}%` }}></div>
                   </div>
                   <p className="text-[10px] text-white/30 font-bold leading-relaxed italic uppercase tracking-wider">Credits reset on the 1st of every month as per your agreement.</p>
                </div>
             </div>
             
             <div className="mt-10 pt-10 border-t border-white/5 flex items-center justify-between">
                <div>
                   <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.3em]">Support Priority</p>
                   <p className="text-sm font-bold text-[var(--primary)] italic mt-1 uppercase tracking-tight">Tier 1 Elite</p>
                </div>
                <div className="p-2.5 bg-green-500/10 rounded-xl">
                  <ShieldCheck className="w-5 h-5 text-green-500/60" />
                </div>
             </div>
          </div>
        </div>
      </FadeUp>

      {/* ── Section 2: Membership Details Hub ── */}
      <section className="grid lg:grid-cols-12 gap-8">
         {/* Active Contract Card */}
         <div className="lg:col-span-8">
           <FadeUp delay={0.1}>
             <div className="bg-[var(--surface-lowest)] rounded-[3rem] p-10 md:p-14 border border-[var(--outline-variant)]/50 shadow-sm relative overflow-hidden group min-h-[420px] flex flex-col justify-center">
                <div className="absolute top-0 right-0 p-10">
                   <div className="h-16 w-16 bg-[var(--primary)]/5 rounded-3xl flex items-center justify-center border border-[var(--primary)]/5 shadow-inner group-hover:scale-110 transition-transform duration-500">
                      <Briefcase className="w-7 h-7 text-[var(--primary)]" />
                   </div>
                </div>
                
                <div className="space-y-12">
                   <div>
                      <h2 className="text-[11px] font-bold text-[var(--primary)] uppercase tracking-[0.4em] mb-6 flex items-center gap-3 italic">
                         <div className="h-1.5 w-1.5 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary)]"></div> 
                         Active Membership
                      </h2>
                      <h3 className="text-4xl md:text-5xl font-display font-bold text-[#1B1C1C] uppercase tracking-tight leading-none max-w-lg mb-6">
                         {membershipData.productName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-6 mt-4 text-[11px] font-bold text-[#9E9E9E] uppercase tracking-[0.15em] italic">
                         <span className="flex items-center gap-2 bg-[var(--surface-low)] px-3 py-1.5 rounded-xl border border-[var(--outline-variant)]/30">Agreement ID: <span className="text-[#1B1C1C]">SSP-2026-X8</span></span>
                         <span className="flex items-center gap-2 bg-[var(--surface-low)] px-3 py-1.5 rounded-xl border border-[var(--outline-variant)]/30">Status: <span className="text-[var(--primary)]">{membershipData.status}</span></span>
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div className="space-y-4 p-8 rounded-[2rem] bg-[var(--surface-low)]/50 border border-[var(--outline-variant)]/20 hover:bg-[var(--surface-low)] transition-all">
                         <div className="flex items-center gap-3">
                            <Calendar className="w-4 h-4 text-[var(--primary)]" />
                            <span className="text-[10px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em]">Commencement Date</span>
                         </div>
                         <p className="text-2xl font-bold text-[#1B1C1C] tracking-tight">{new Date(membershipData.startDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      </div>
                      
                      <div className="space-y-4 p-8 rounded-[2rem] bg-[var(--surface-low)]/50 border border-[var(--outline-variant)]/20 hover:bg-[var(--surface-low)] transition-all">
                         <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4 text-orange-500" />
                            <span className="text-[10px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em]">Cycle Termination</span>
                         </div>
                         <p className="text-2xl font-bold text-[#1B1C1C] tracking-tight">{new Date(membershipData.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      </div>
                   </div>
                </div>
             </div>
           </FadeUp>
         </div>

         {/* Mini Operational Stats */}
         <div className="lg:col-span-4 space-y-8">
            <FadeUp delay={0.2}>
               <div className="bg-[var(--surface-lowest)] rounded-[3rem] p-12 border border-[var(--outline-variant)]/50 shadow-sm min-h-[300px] flex flex-col justify-center">
                  <div className="space-y-10">
                    <div className="flex items-center justify-between">
                       <h3 className="text-xs font-bold text-[#1B1C1C] uppercase tracking-[0.3em] flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-[var(--primary)]"></div>
                         Current Stream
                       </h3>
                       <Users className="w-5 h-5 text-[#9E9E9E]" />
                    </div>
                    
                    <div className="space-y-8">
                       <div className="flex items-center justify-between group cursor-help transition-all">
                          <span className="text-xs font-bold text-[#616161] uppercase tracking-widest group-hover:text-[var(--primary)] transition-colors">Pending Tickets</span>
                          <span className="text-3xl font-bold text-[#1B1C1C] group-hover:scale-110 transition-transform">{loading ? '--' : stats.pendingTickets}</span>
                       </div>
                       <div className="flex items-center justify-between group cursor-help transition-all">
                          <span className="text-xs font-bold text-[#616161] uppercase tracking-widest group-hover:text-[var(--primary)] transition-colors">Active Bookings</span>
                          <span className="text-3xl font-bold text-[#1B1C1C] group-hover:scale-110 transition-transform">{loading ? '--' : stats.totalBookings}</span>
                       </div>
                       <div className="flex items-center justify-between group cursor-help transition-all border-t border-[var(--outline-variant)]/20 pt-6">
                          <span className="text-xs font-bold text-[#616161] uppercase tracking-widest group-hover:text-[var(--primary)] transition-colors">Support Volume</span>
                          <span className="text-3xl font-bold text-[#1B1C1C] group-hover:scale-110 transition-transform">{loading ? '--' : stats.totalTickets}</span>
                       </div>
                    </div>
                  </div>
               </div>
            </FadeUp>
            
            <FadeUp delay={0.3}>
               <Link href="/dashboard/tickets" className="bg-[#1B1B1B] hover:bg-[var(--primary)] p-10 rounded-[2.5rem] flex items-center justify-between group transition-all duration-700 shadow-2xl hover:shadow-[var(--primary)]/30">
                  <div className="space-y-2">
                     <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] italic group-hover:text-white/60">Need Assistance?</p>
                     <p className="text-xl font-bold text-white uppercase tracking-tight group-hover:translate-x-2 transition-transform duration-500">Open Support Node</p>
                  </div>
                  <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center group-hover:rotate-45 group-hover:bg-white group-hover:text-[var(--primary)] transition-all duration-500 shadow-inner">
                     <ArrowRight className="w-6 h-6" />
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
               className="bg-[var(--surface-lowest)] p-10 rounded-[3rem] border border-[var(--outline-variant)]/50 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group"
             >
                <div className="h-14 w-14 bg-[var(--surface-low)] rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-[var(--primary)] group-hover:text-white transition-all duration-500 shadow-inner">
                   <action.icon size={26} className="text-[var(--primary)] group-hover:text-white transition-colors" />
                </div>
                <p className="text-[12px] font-bold text-[#1B1C1C] uppercase tracking-widest group-hover:text-[var(--primary)] transition-colors">{action.title}</p>
             </Link>
           ))}
         </div>
      </FadeUp>
    </div>
  );
}
