'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Ticket,
  Calendar,
  Sparkles,
  X,
  Phone,
  Briefcase,
  Building2,
  ArrowRight,
  User,
  FileText,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/context/AuthContext';

const sidebarItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'My Bookings', href: '/dashboard/bookings', icon: Calendar },
  { name: 'Review Documents', href: '/dashboard/contracts', icon: ShieldCheck },
  { name: 'Documents', href: '/dashboard/documents', icon: FileText },
  { name: 'Support', href: '/dashboard/support', icon: LifeBuoy },
  { name: 'My Tickets', href: '/dashboard/tickets', icon: Ticket },
  { name: 'Profile', href: '/dashboard/profile', icon: User },
];

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const { user, isLoading, logout, isRole, refreshUser } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '', phone: '', designation: '', companyName: '',
    companyStreet: '', companyCity: '', companyState: '', companyZip: ''
  });

  const isRegularUser = user && !isRole('ADMIN') && !isRole('MANAGER');
  
  const [hasSkippedProfile, setHasSkippedProfile] = useState(false);

  useEffect(() => {
    if (user?.id) {
      setHasSkippedProfile(localStorage.getItem(`sspacia_skipped_profile_${user.id}`) === 'true');
      
      // Initialize form with existing user data if available
      setProfileData({
        name: user.name || '',
        phone: user.phone || '',
        designation: user.designation || '',
        companyName: user.companyName || '',
        companyStreet: user.companyStreet || '',
        companyCity: user.companyCity || '',
        companyState: user.companyState || '',
        companyZip: user.companyZip || '',
      });
    }
  }, [user]);

  const isProfileComplete = !!(user?.companyName && user?.phone && user?.designation);
  const needsProfileCompletion = isRegularUser && !isProfileComplete && !hasSkippedProfile;

  useEffect(() => {
    if (!isLoading && isRegularUser) {
      if (needsProfileCompletion) return; // Don't show welcome if profile is pending
      const hasSeenWelcome = localStorage.getItem(`sspacia_welcomed_${user.id}`);
      if (!hasSeenWelcome) {
        const timer = setTimeout(() => setShowWelcome(true), 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [user, isLoading, isRegularUser, needsProfileCompletion]);

  const closeWelcome = () => {
    setShowWelcome(false);
    if (user?.id) {
      localStorage.setItem(`sspacia_welcomed_${user.id}`, 'true');
    }
  };

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (isRole('ADMIN')) {
        router.push('/admin/dashboard');
      } else if (isRole('MANAGER')) {
        router.push('/manager/dashboard');
      }
    }
  }, [user, isLoading, router, isRole]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch {
      toast.error('Logout failed');
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });

      if (!res.ok) throw new Error('Failed to update profile');
      toast.success('Profile created successfully!');
      await refreshUser();
    } catch {
      toast.error('Could not save profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSkipProfile = () => {
    if (user?.id) {
      localStorage.setItem(`sspacia_skipped_profile_${user.id}`, 'true');
      setHasSkippedProfile(true);
    }
  };

  if (isLoading || !user || isRole('ADMIN') || isRole('MANAGER')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface)]">
        <Loader2 className="h-10 w-10 text-[var(--primary)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[var(--surface)] flex relative font-sans">
      {/* ── Welcome Dialog: One-Time Onboarding ── */}
      <AnimatePresence>
        {showWelcome && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 bg-[var(--surface-low)]/60 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative max-w-lg w-full bg-[var(--surface-lowest)] shadow-[0_50px_100px_rgba(0,0,0,0.1)] p-12 md:p-14 border border-[var(--outline-variant)]/40 overflow-hidden rounded-[3.5rem] group"
            >
               <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--primary)]/5 blur-[80px] -mr-16 -mt-16 group-hover:bg-[var(--primary)]/10 transition-colors duration-1000" />
               <button 
                onClick={closeWelcome}
                className="absolute top-10 right-10 p-3 hover:bg-[var(--primary)]/10 rounded-full transition-all group/btn"
                title="Dismiss"
              >
                <X className="h-5 w-5 text-[#616161] group-hover/btn:text-[var(--primary)] group-hover/btn:rotate-90 transition-all duration-300" />
              </button>

              <div className="relative z-10 space-y-10">
                 <div className="h-20 w-20 bg-[var(--primary)]/10 rounded-[2rem] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-700">
                   <Sparkles className="h-10 w-10 text-[var(--primary)]" />
                 </div>
                 
                 <div className="space-y-6">
                    <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-[var(--primary)] italic uppercase leading-[0.9]">
                      Welcome to <br />
                      <span className="text-[#1B1C1C] not-italic">Sspacia.</span>
                    </h2>
                    <p className="text-lg text-[#616161] font-bold leading-relaxed opacity-80 uppercase tracking-tighter">
                      Experience Ahmedabad&apos;s most dynamic workspace ecosystem. Redefining professional clusters.
                    </p>
                 </div>

                 <div className="pt-6 flex flex-col gap-6">
                    <button 
                      onClick={closeWelcome}
                      className="w-full bg-[#1B1B1B] text-white py-6 rounded-[2rem] font-bold text-[11px] uppercase tracking-[0.3em] shadow-2xl hover:bg-[var(--primary)] active:scale-[0.97] transition-all duration-500"
                    >
                      Initialize Dashboard
                    </button>
                    <div className="flex flex-col items-center gap-2">
                       <p className="text-[10px] text-center text-[#9E9E9E] font-bold uppercase tracking-[0.2em] opacity-60">Verified Identity Node Active</p>
                    </div>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {needsProfileCompletion && (
          <div className="fixed inset-0 z-[9999] bg-[var(--surface-lowest)] overflow-y-auto w-full h-full flex flex-col md:p-10">
            <motion.div 
              initial={{ opacity: 0, filter: 'blur(10px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              className="relative max-w-5xl w-full mx-auto px-10 py-16 md:py-20 flex-1 flex flex-col justify-center bg-[var(--surface-lowest)] rounded-none md:rounded-[4rem] border-none md:border border-[var(--outline-variant)] shadow-none md:shadow-2xl overflow-hidden"
            >
               <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[var(--primary)]/5 blur-[120px] -mr-[200px] -mt-[200px] pointer-events-none" />
               <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[var(--primary)]/5 blur-[120px] -ml-[200px] -mb-[200px] pointer-events-none" />

               <button 
                onClick={handleSkipProfile}
                className="absolute top-8 right-8 md:top-12 md:right-12 p-4 hover:bg-[var(--primary)]/10 rounded-full transition-all group z-20"
                title="Dismiss"
              >
                <X className="h-6 w-6 text-[#9E9E9E] group-hover:text-[var(--primary)] group-hover:rotate-90 transition-all duration-300" />
              </button>

              <div className="space-y-14 relative z-10">
                 <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                   <div>
                      <h2 className="font-display text-5xl md:text-6xl font-bold text-[var(--primary)] tracking-tighter italic uppercase leading-none">Assemble <br /><span className="text-[#1B1C1C] not-italic">Identity</span></h2>
                      <p className="text-[#616161] mt-4 font-bold text-sm max-w-md uppercase tracking-[0.05em] leading-relaxed opacity-70">
                        Map your professional metadata to the ecosystem. Identity is currency.
                      </p>
                   </div>
                   <div className="h-24 w-24 bg-[var(--primary)]/10 rounded-[2.5rem] flex items-center justify-center shrink-0 shadow-inner border border-[var(--primary)]/20">
                     <User className="h-10 w-10 text-[var(--primary)]" />
                   </div>
                 </div>

                 <form onSubmit={handleProfileSubmit} className="space-y-14">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                      <div className="space-y-10">
                        <div className="space-y-4">
                           <div className="flex items-center gap-3 ml-1 mb-2">
                              <div className="h-8 w-8 bg-[var(--primary)]/5 rounded-xl flex items-center justify-center text-[var(--primary)]">
                                 <User size={16} />
                              </div>
                              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1B1C1C] opacity-40 italic">Member Logistics</h3>
                           </div>
                           
                           <div className="space-y-8">
                              <div className="space-y-2.5">
                                <label className="text-[10px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em] ml-1">Legal Designation <span className="text-red-500">*</span></label>
                                <div className="relative group/field">
                                  <Briefcase className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E9E9E] group-focus-within/field:text-[var(--primary)] transition-colors" />
                                  <input required type="text" value={profileData.designation} onChange={e => setProfileData(p => ({...p, designation: e.target.value}))} className="w-full pl-16 pr-6 py-5 rounded-2xl border border-[var(--outline-variant)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/5 outline-none text-[15px] transition-all bg-[var(--surface-low)]/50 font-bold text-[#1B1C1C] placeholder:text-[#9E9E9E]/50" placeholder="E.g., Creative Director" />
                                </div>
                              </div>

                              <div className="space-y-2.5">
                                <label className="text-[10px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em] ml-1">Contact Protocol <span className="text-red-500">*</span></label>
                                <div className="relative group/field">
                                  <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E9E9E] group-focus-within/field:text-[var(--primary)] transition-colors" />
                                  <input required type="tel" value={profileData.phone} onChange={e => setProfileData(p => ({...p, phone: e.target.value}))} className="w-full pl-16 pr-6 py-5 rounded-2xl border border-[var(--outline-variant)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/5 outline-none text-[15px] transition-all bg-[var(--surface-low)]/50 font-bold text-[#1B1C1C] placeholder:text-[#9E9E9E]/50" placeholder="+91 90000 00000" />
                                </div>
                              </div>
                           </div>
                        </div>
                      </div>

                      <div className="space-y-10">
                        <div className="space-y-4">
                           <div className="flex items-center gap-3 ml-1 mb-2">
                              <div className="h-8 w-8 bg-[var(--primary)]/5 rounded-xl flex items-center justify-center text-[var(--primary)]">
                                 <Building2 size={16} />
                              </div>
                              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1B1C1C] opacity-40 italic">Organization Matrix</h3>
                           </div>

                           <div className="space-y-8">
                              <div className="space-y-2.5">
                                <label className="text-[10px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em] ml-1">Firm Architecture <span className="text-red-500">*</span></label>
                                <div className="relative group/field">
                                  <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E9E9E] group-focus-within/field:text-[var(--primary)] transition-colors" />
                                  <input required type="text" value={profileData.companyName} onChange={e => setProfileData(p => ({...p, companyName: e.target.value}))} className="w-full pl-16 pr-6 py-5 rounded-2xl border border-[var(--outline-variant)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/5 outline-none text-[15px] transition-all bg-[var(--surface-low)]/50 font-bold text-[#1B1C1C] placeholder:text-[#9E9E9E]/50" placeholder="Acme International" />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2.5">
                                  <label className="text-[10px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em] ml-1">City Node</label>
                                  <input type="text" value={profileData.companyCity} onChange={e => setProfileData(p => ({...p, companyCity: e.target.value}))} className="w-full px-6 py-5 rounded-2xl border border-[var(--outline-variant)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/5 outline-none text-[15px] transition-all bg-[var(--surface-low)]/50 font-bold text-[#1B1C1C] placeholder:text-[#9E9E9E]/50" placeholder="Ahmedabad" />
                                </div>
                                <div className="space-y-2.5">
                                  <label className="text-[10px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em] ml-1">Postal Map</label>
                                  <input type="text" value={profileData.companyZip} onChange={e => setProfileData(p => ({...p, companyZip: e.target.value}))} className="w-full px-6 py-5 rounded-2xl border border-[var(--outline-variant)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/5 outline-none text-[15px] transition-all bg-[var(--surface-low)]/50 font-bold text-[#1B1C1C] placeholder:text-[#9E9E9E]/50" placeholder="380001" />
                                </div>
                              </div>
                           </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-12 border-t border-[var(--outline-variant)]/40 flex flex-col sm:flex-row items-center justify-between gap-10">
                      <button 
                        type="button" 
                        onClick={handleSkipProfile} 
                        className="w-full sm:w-auto px-8 py-5 rounded-2xl font-bold text-[11px] text-[#616161] hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all uppercase tracking-[0.3em] italic"
                      >
                        Bypass Configuration
                      </button>
                      <button 
                        disabled={savingProfile} 
                        type="submit" 
                        className="w-full sm:w-auto bg-[#1B1B1B] text-white px-14 py-6 rounded-3xl font-bold text-[12px] uppercase tracking-[0.4em] shadow-2xl hover:bg-[var(--primary)] hover:-translate-y-2 active:translate-y-0 transition-all duration-700 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-4 group/btn"
                      >
                        {savingProfile ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                        {savingProfile ? 'Synchronizing Archive' : 'Commit Identity'}
                        {!savingProfile && <ArrowRight className="w-6 h-6 group-hover/btn:translate-x-2 transition-transform duration-500" />}
                      </button>
                    </div>
                 </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Sidebar */}
      <aside
        className={`${isSidebarOpen ? 'w-80' : 'w-24'
          } bg-[var(--surface-lowest)] border-r border-[var(--outline-variant)]/30 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) flex flex-col z-50 relative`}
      >
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-4 top-10 h-8 w-8 bg-[var(--surface-lowest)] border border-[var(--outline-variant)]/50 rounded-full text-[var(--primary)] shadow-md hover:scale-110 active:scale-95 transition-all z-[60] flex items-center justify-center"
        >
          {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        <div className="p-8 flex items-center justify-between overflow-hidden">
          <AnimatePresence mode="wait">
            {isSidebarOpen ? (
              <motion.div
                key="logo-full"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-display text-2xl font-bold text-[var(--primary)] whitespace-nowrap uppercase tracking-tighter italic"
              >
                SSPACIA <span className="text-[#1B1C1C] opacity-30 not-italic ml-1">MEMBER</span>
              </motion.div>
            ) : (
              <motion.div
                key="logo-mini"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="font-display font-bold text-2xl text-[var(--primary)] mx-auto italic"
              >
                S
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 px-5 py-6 space-y-2 overflow-y-auto no-scrollbar">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group relative ${isActive
                    ? 'bg-[var(--primary)] text-white shadow-xl shadow-[var(--primary)]/20'
                    : 'text-[#616161] hover:bg-[var(--primary)]/5 hover:text-[var(--primary)]'
                  }`}
              >
                <item.icon size={22} className={`${isActive ? '' : 'opacity-70 group-hover:opacity-100 group-hover:scale-110'} transition-all`} />
                {isSidebarOpen && (
                  <span className="font-bold text-[12px] whitespace-nowrap uppercase tracking-widest">{item.name}</span>
                )}
                {!isSidebarOpen && (
                  <div className={`absolute left-full ml-4 px-4 py-2 bg-[#1B1C1C] text-white text-[10px] font-bold uppercase tracking-widest rounded-xl opacity-0 translate-x-[-10px] group-hover:opacity-100 group-hover:translate-x-0 transition-all shadow-2xl pointer-events-none whitespace-nowrap z-[100]`}>
                    {item.name}
                  </div>
                )}
                {isActive && (
                   <motion.div layoutId="active-pill" className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white/40" />
                )}
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="border-t border-[var(--outline-variant)]/20 p-6 shrink-0 flex flex-col gap-4">
            {isSidebarOpen ? (
              <div className="flex items-center gap-4 px-1 mb-2 w-full group cursor-pointer">
                <div className="h-12 w-12 shrink-0 rounded-2xl bg-[var(--surface-low)] text-[var(--primary)] flex items-center justify-center border border-[var(--outline-variant)]/50 font-display font-bold text-lg shadow-inner group-hover:bg-[var(--primary)] group-hover:text-white transition-all">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div className="w-full min-w-0 overflow-hidden">
                  <p className="text-[13px] font-bold text-[#1B1C1C] truncate w-full uppercase tracking-tight">{user.name}</p>
                  <p className="text-[10px] text-[var(--primary)] font-bold uppercase tracking-[0.15em] opacity-80">{user.role || 'Member'}</p>
                </div>
              </div>
            ) : (
              <div className="flex justify-center mb-2 w-full">
                <div className="h-12 w-12 shrink-0 rounded-2xl bg-[var(--surface-low)] text-[var(--primary)] flex items-center justify-center border border-[var(--outline-variant)]/50 font-display font-bold text-lg shadow-inner shadow-black/5">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-5 py-3.5 text-[#616161] hover:bg-red-50 hover:text-red-600 rounded-2xl transition-all group"
              title="Logout"
            >
              <LogOut size={20} className="shrink-0 group-hover:-translate-x-1 transition-transform" />
              {isSidebarOpen && <span className="font-bold text-[12px] uppercase tracking-widest">Logout</span>}
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        <div className="flex-1 p-10 overflow-y-auto relative z-0 bg-[var(--surface)] custom-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
}
