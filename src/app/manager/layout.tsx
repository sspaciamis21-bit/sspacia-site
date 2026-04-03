'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  LogOut, 
  Loader2,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Ticket,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/context/AuthContext';

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, isLoading, logout, isRole, hasPermission } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
        return;
      }

      // Allow any role that is not USER (or explicitly ADMIN/MANAGER/COMMUNITY_MANAGER)
      // The dashboard items are driven strictly by permissions.
      if (isRole('USER')) {
        toast.error('Unauthorized access.');
        router.push('/dashboard');
        return;
      }

      // Ensure they have assigned locations if they aren't admin and just a basic staff
      if (!isRole('ADMIN') && (!user.assignedLocations || user.assignedLocations.length === 0)) {
        toast.error('No assigned locations. Contact admin.');
        router.push('/dashboard');
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

  const sidebarItems = useMemo(() => {
    const items = [
      { name: 'Dashboard', href: '/manager/dashboard', icon: LayoutDashboard }
    ];

    // Core Manager Routes
    items.push({ name: 'Products', href: '/manager/products', icon: Package });
    items.push({ name: 'Bookings', href: '/manager/bookings', icon: Calendar });
    items.push({ name: 'Tickets', href: '/manager/tickets', icon: Ticket });
    items.push({ name: 'Users', href: '/manager/users', icon: Users });

    // Optional/Permission based routes (Keeping Locations if managed by some)
    if (hasPermission('view_location_details') || isRole('ADMIN')) {
      items.push({ name: 'Locations', href: '/manager/locations', icon: MapPin });
    }

    return items;
  }, [hasPermission, isRole]);

  if (isLoading || !user || isRole('USER')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface)]">
        <Loader2 className="h-8 w-8 text-[var(--primary)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[var(--surface)] flex font-sans">
      <aside 
        className={`${
          isSidebarOpen ? 'w-80' : 'w-24'
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
                SSPACIA <span className="text-[#1B1C1C] opacity-30 not-italic ml-1">{user.role?.split('_')[0] || 'PORTAL'}</span>
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
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group relative ${
                  isActive 
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
              <div className="flex items-center gap-4 px-1 mb-2 w-full group cursor-pointer transition-all">
                <div className="h-12 w-12 shrink-0 rounded-2xl bg-[var(--surface-low)] text-[var(--primary)] flex items-center justify-center border border-[var(--outline-variant)]/50 font-display font-bold text-lg shadow-inner group-hover:bg-[var(--primary)] group-hover:text-white transition-all">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div className="w-full min-w-0 overflow-hidden">
                  <p className="text-[13px] font-bold text-[#1B1C1C] truncate w-full uppercase tracking-tight">{user.name}</p>
                  <p className="text-[10px] text-[var(--primary)] font-bold uppercase tracking-[0.15em] opacity-80 truncate">{user.role}</p>
                </div>
              </div>
            ) : (
              <div className="flex justify-center mb-2 w-full">
                 <div className="h-12 w-12 shrink-0 rounded-2xl bg-[var(--surface-low)] text-[var(--primary)] flex items-center justify-center border border-[var(--outline-variant)]/50 font-display font-bold text-lg shadow-inner">
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

      <main className="flex-1 flex flex-col min-w-0 relative">
        <div className="flex-1 p-8 overflow-y-auto relative z-0">
          {children}
        </div>
      </main>
    </div>
  );
}
