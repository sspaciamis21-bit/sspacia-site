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
  FileText,
  ShieldCheck,
  Receipt,
  MessageSquare,
  FileSpreadsheet,
  Menu,
  X,
  Boxes,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { ManageProfileModal } from '@/components/profile/ManageProfileModal';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { VisitorChatDrawer } from '@/components/ui/visitor-chat-drawer';
import { VisitorChatButton } from '@/components/ui/visitor-chat-button';

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSidebarOpen, setIsSidebarOpen } = useSidebar();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { user, isLoading, logout, isRole, hasPermission } = useAuth();
  const pathname = usePathname();
  const [isVisitorChatOpen, setIsVisitorChatOpen] = useState(false);
  const router = useRouter();

  const isAccountant =
    user?.email?.toLowerCase() === 'ssinfrazone21@gmail.com' ||
    user?.role?.toUpperCase() === 'ACCOUNTS' ||
    user?.role?.toUpperCase() === 'ACCOUNTANT' ||
    user?.name?.toLowerCase() === 'accounts';

  // 1. Core Auth Check
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
        return;
      }

      // Allow any role that is not USER (or explicitly ADMIN/MANAGER/COMMUNITY_MANAGER/ACCOUNTS)
      if (isRole('USER')) {
        toast.error('Unauthorized access.');
        router.push('/dashboard');
        return;
      }

      // Ensure they have assigned locations if they aren't admin/community manager/accounts and just a basic staff
      if (
        !isRole('ADMIN') &&
        !isRole('COMMUNITY_MANAGER') &&
        !isRole('ACCOUNTS') &&
        !isRole('ACCOUNTANT') &&
        !isAccountant &&
        (!user.assignedLocations || user.assignedLocations.length === 0)
      ) {
        toast.error('No assigned locations. Contact admin.');
        router.push('/dashboard');
      }
    }
  }, [user, isLoading, router, isRole, isAccountant]);

  // 2. Restrict Accountant URL access
  useEffect(() => {
    if (!isLoading && user && isAccountant && !isRole('ADMIN')) {
      const allowedPaths = ['/manager/dashboard', '/manager/invoices', '/manager/expenses'];
      const currentLower = pathname.toLowerCase();
      const isAllowed = allowedPaths.some((p) => currentLower.startsWith(p));
      if (!isAllowed) {
        toast.error('This section is not accessible to Accounts.');
        router.push('/manager/Invoices');
      }
    }
  }, [pathname, isAccountant, isRole, isLoading, user, router]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch {
      toast.error('Logout failed');
    }
  };

  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [pendingQrCount, setPendingQrCount] = useState(0);

  useEffect(() => {
    if (user && !isAccountant) {
      fetchCounts();
    }
  }, [user, pathname, isAccountant]);

  const fetchCounts = async () => {
    try {
      const [reqRes, qrRes] = await Promise.all([
        fetch('/api/admin/contract-requests?status=PENDING'),
        fetch('/api/admin/qr-bookings?status=PENDING'),
      ]);
      const reqJson = await reqRes.json();
      const qrJson = await qrRes.json();

      if (reqJson.data) setPendingRequestsCount(reqJson.data.length);
      if (qrJson.data) setPendingQrCount(qrJson.data.length);
    } catch {
      // Ignore
    }
  };

  const sidebarItems = useMemo(() => {
    const isAcc =
      user?.email?.toLowerCase() === 'ssinfrazone21@gmail.com' ||
      user?.role?.toUpperCase() === 'ACCOUNTS' ||
      user?.role?.toUpperCase() === 'ACCOUNTANT' ||
      user?.name?.toLowerCase() === 'accounts';

    if (isAcc && !isRole('ADMIN')) {
      return [
        { name: 'Dashboard', href: '/manager/dashboard', icon: LayoutDashboard },
        { name: 'Invoices', href: '/manager/Invoices', icon: Receipt },
        { name: 'Expenses', href: '/manager/expenses', icon: FileSpreadsheet },
      ];
    }

    const items: Array<{ name: string; href: string; icon: any; badge?: number }> = [
      { name: 'Dashboard', href: '/manager/dashboard', icon: LayoutDashboard }
    ];

    // Core Manager Routes
    items.push({ name: 'Products', href: '/manager/products', icon: Package });
    items.push({ 
      name: 'Bookings', 
      href: '/manager/bookings', 
      icon: Calendar,
      badge: pendingQrCount > 0 ? pendingQrCount : undefined
    });
    items.push({ name: 'Tickets', href: '/manager/tickets', icon: Ticket });
    items.push({ name: 'Expenses', href: '/manager/expenses', icon: FileSpreadsheet });
    items.push({ 
      name: 'Contracts', 
      href: '/manager/contracts', 
      icon: ShieldCheck,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined
    });
    items.push({ name: 'Documents', href: '/manager/documents', icon: FileText });
    items.push({ name: 'Agreements', href: '/manager/agreements', icon: FileText });
    items.push({ name: 'Users', href: '/manager/users', icon: Users });
    items.push({ name: 'Client Master', href: '/manager/client-master', icon: FileText });
    items.push({ name: 'Internal Inventory', href: '/manager/inventory', icon: Boxes });
    items.push({ name: 'Invoices', href: '/manager/Invoices', icon: Receipt });

    // Optional/Permission based routes (Keeping Locations if managed by some)
    if (hasPermission('view_location_details') || isRole('ADMIN')) {
      items.push({ name: 'Locations', href: '/manager/locations', icon: MapPin });
    }

    return items;
  }, [hasPermission, isRole, user, pendingQrCount, pendingRequestsCount]);

  if (isLoading || !user || isRole('USER')) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--surface)] gap-4">
        <Loader2 size={40} className="text-[var(--primary)] animate-spin" />
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9E9E9E] animate-pulse">Initializing...</p>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[var(--surface)] flex font-sans">
      {/* Mobile Drawer Backdrop */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 z-50 md:hidden backdrop-blur-xs"
          />
        )}
      </AnimatePresence>

      <aside 
        className={`fixed md:relative top-0 bottom-0 left-0 ${
          isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'
        } ${
          isSidebarOpen ? 'md:w-80' : 'md:w-24'
        } bg-[var(--surface-lowest)] border-r border-[var(--outline-variant)]/30 transition-all duration-300 ease-in-out flex flex-col z-50 md:z-40`}
      >
        {/* Desktop Toggle Button */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="hidden md:flex absolute -right-3.5 top-10 h-7 w-7 bg-[var(--surface-lowest)] border border-[var(--outline-variant)] text-[var(--primary)] shadow-sm hover:bg-[var(--primary)] hover:text-white transition-all z-[60] items-center justify-center rounded-none"
        >
          {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* Mobile Close Button */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="md:hidden absolute right-4 top-4 p-2 text-gray-500 hover:text-black z-[60]"
        >
          <X size={20} />
        </button>

        <div className="p-6 md:p-8 flex items-center justify-between overflow-hidden">
          <AnimatePresence mode="wait">
            {(isSidebarOpen || isMobileMenuOpen) ? (
              <motion.div
                key="logo-full"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-display text-xl font-bold text-[var(--primary)] whitespace-nowrap uppercase tracking-widest"
              >
                SSPACIA <span className="text-[#1B1C1C] opacity-30 ml-1">{user.role?.split('_')[0] || 'PORTAL'}</span>
              </motion.div>
            ) : (
              <motion.div
                key="logo-mini"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="font-display font-bold text-2xl text-[var(--primary)] mx-auto"
              >
                S
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 px-4 md:px-5 py-4 md:py-6 space-y-1.5 overflow-y-auto no-scrollbar">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-4 px-4 md:px-5 py-3.5 md:py-4 rounded-none transition-all group relative ${
                  isActive 
                    ? 'bg-[var(--primary)] text-white' 
                    : 'text-[#616161] hover:bg-[var(--primary)]/5 hover:text-[var(--primary)]'
                }`}
              >
                <item.icon size={22} className={`${isActive ? '' : 'opacity-70 group-hover:opacity-100 group-hover:scale-110'} transition-all shrink-0`} />
                {(isSidebarOpen || isMobileMenuOpen) && (
                  <span className="font-bold text-[12px] whitespace-nowrap uppercase tracking-widest flex-1">{item.name}</span>
                )}
                {item.badge !== undefined && (
                  <span className={`${(isSidebarOpen || isMobileMenuOpen) ? '' : 'absolute top-2 right-2'} bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs shrink-0 animate-pulse`}>
                    {item.badge}
                  </span>
                )}
                {!isSidebarOpen && !isMobileMenuOpen && (
                  <div className={`hidden md:block absolute left-full ml-4 px-3 py-1.5 bg-[#1B1C1C] text-white text-[9px] font-bold uppercase tracking-widest rounded-none opacity-0 translate-x-[-5px] group-hover:opacity-100 group-hover:translate-x-0 transition-all shadow-xl pointer-events-none whitespace-nowrap z-[100]`}>
                    {item.name} {item.badge ? `(${item.badge})` : ''}
                  </div>
                )}
                {isActive && (
                   <motion.div layoutId="active-pill" className="absolute right-0 w-1 h-full bg-white/30" />
                )}
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="border-t border-[var(--outline-variant)]/20 p-4 md:p-6 shrink-0 flex flex-col gap-3">
            {(isSidebarOpen || isMobileMenuOpen) ? (
              <div 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsProfileModalOpen(true);
                }}
                className="flex items-center gap-3 px-1 mb-1 w-full group cursor-pointer hover:opacity-80 transition-opacity"
                title="Manage Profile"
              >
                <div className="h-9 w-9 shrink-0 rounded-none bg-[var(--surface-low)] text-[var(--primary)] flex items-center justify-center border border-[var(--outline-variant)] font-display font-bold text-sm transition-all group-hover:bg-[var(--primary)] group-hover:text-white">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div className="w-full min-w-0 overflow-hidden">
                  <p className="text-[12px] font-bold text-[#1B1C1C] truncate w-full uppercase tracking-tight">{user.name}</p>
                  <p className="text-[9px] text-[var(--primary)] font-bold uppercase tracking-widest opacity-60 truncate">{user.role}</p>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => setIsProfileModalOpen(true)}
                className="flex justify-center mb-1 w-full cursor-pointer hover:opacity-80 transition-opacity"
                title="Manage Profile"
              >
                 <div className="h-9 w-9 shrink-0 rounded-none bg-[var(--surface-low)] text-[var(--primary)] flex items-center justify-center border border-[var(--outline-variant)] font-display font-bold text-sm shadow-inner shadow-black/5">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
            
            <button
               onClick={() => {
                 setIsMobileMenuOpen(false);
                 handleLogout();
               }}
               className="w-full flex items-center gap-3 px-4 py-3 text-[#616161] hover:bg-neutral-100 hover:text-black rounded-none transition-all group"
               title="Logout"
            >
               <LogOut size={16} className="shrink-0 group-hover:-translate-x-0.5 transition-transform" />
               {(isSidebarOpen || isMobileMenuOpen) && <span className="font-bold text-[11px] uppercase tracking-widest">Logout</span>}
            </button>
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col min-w-0 relative w-full h-full overflow-hidden">
        {/* Top Navigation / Notification Header */}
        <header className="h-16 bg-[var(--surface-lowest)] border-b border-[var(--outline-variant)]/30 px-4 md:px-8 flex items-center justify-between z-30 shrink-0 shadow-xs gap-3">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 text-gray-700 hover:text-black hover:bg-gray-100 rounded-sm"
              title="Open Navigation Menu"
            >
              <Menu size={20} />
            </button>

            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--primary)] truncate">
              SSPACIA Portal
            </span>
          </div>

          {!isAccountant && (
            <div className="flex items-center gap-2.5 sm:gap-4">
              <VisitorChatButton onClick={() => setIsVisitorChatOpen(true)} />
              <NotificationBell />
            </div>
          )}
        </header>

        <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto relative z-0">
          {children}
        </div>
      </main>

      <ManageProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {!isAccountant && (
        <VisitorChatDrawer
          isOpen={isVisitorChatOpen}
          onClose={() => setIsVisitorChatOpen(false)}
        />
      )}
    </div>
  );
}
