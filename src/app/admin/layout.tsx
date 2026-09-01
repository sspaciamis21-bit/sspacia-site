'use client';

import { useState, useEffect } from 'react';
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
  Shield,
  Calendar,
  Sparkles,
  ShieldCheck,
  FileText,
  Mail,
  MessageSquare,
  FileSpreadsheet,
  Menu,
  X,
  Tag,
  Boxes,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { ManageProfileModal } from '@/components/profile/ManageProfileModal';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { VisitorChatDrawer } from '@/components/ui/visitor-chat-drawer';
import { VisitorChatButton } from '@/components/ui/visitor-chat-button';

const sidebarItems = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Locations', href: '/admin/locations', icon: MapPin },
  { name: 'Products', href: '/admin/products', icon: Package },
  { name: 'Amenities', href: '/admin/amenities', icon: Sparkles },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Roles', href: '/admin/roles', icon: Shield },
  { name: 'Tickets', href: '/admin/tickets', icon: Ticket },
  { name: 'Bookings', href: '/admin/bookings', icon: Calendar },
  { name: 'Expenses', href: '/admin/expenses', icon: FileSpreadsheet },
  { name: 'Internal Inventory', href: '/admin/inventory', icon: Boxes },
  { name: 'Contracts', href: '/manager/contracts', icon: ShieldCheck },
  { name: 'Documents', href: '/manager/documents', icon: FileText },
  { name: 'Client Master', href: '/admin/client-master', icon: FileText },
  { name: 'Invoices', href: '/admin/Invoices', icon: FileText },
  { name: 'Announcements', href: '/admin/announcements', icon: Sparkles },
  { name: 'Promo Codes', href: '/admin/promocodes', icon: Tag },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSidebarOpen, setIsSidebarOpen } = useSidebar();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isVisitorChatOpen, setIsVisitorChatOpen] = useState(false);
  const { user, isLoading, logout, isRole } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isAccountant =
    user?.email?.toLowerCase() === 'ssinfrazone21@gmail.com' ||
    user?.role?.toUpperCase() === 'ACCOUNTS' ||
    user?.role?.toUpperCase() === 'ACCOUNTANT' ||
    user?.name?.toLowerCase() === 'accounts';

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (!isRole('ADMIN')) {
        toast.error('Unauthorized access');
        router.push('/');
      }
    }
  }, [user, isLoading, router, isRole]);

  // Auto-shrink sidebar on Occupancy CAD page to maximize architectural canvas
  useEffect(() => {
    if (pathname?.includes('/admin/occupancy')) {
      setIsSidebarOpen(false);
    }
  }, [pathname, setIsSidebarOpen]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch {
      toast.error('Logout failed');
    }
  };

  if (isLoading || !user || !isRole('ADMIN')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <Loader2 className="h-8 w-8 text-[#006064] animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[#F8F9FA] flex">
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

      {/* Sidebar (Slide-out drawer on Mobile, Expandable on Desktop) */}
      <aside
        className={`fixed md:relative top-0 bottom-0 left-0 ${
          isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'
        } ${
          isSidebarOpen ? 'md:w-72' : 'md:w-20'
        } bg-white border-r border-[var(--outline-variant)]/40 transition-all duration-300 ease-in-out flex flex-col z-50 md:z-40`}
      >
        {/* Desktop Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="hidden md:flex absolute -right-3 top-8 p-1.5 bg-white border border-[var(--outline-variant)]/60 rounded-none text-[#1B1C1C] shadow-sm hover:bg-[var(--primary)] hover:text-white transition-all z-[60]"
        >
          {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-display font-bold text-xl text-[#1B1C1C] whitespace-nowrap tracking-tighter"
              >
                SSPACIA <span className="text-[var(--primary)]">ADMIN</span>
              </motion.div>
            ) : (
              <motion.div
                key="logo-mini"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-display font-black text-xl text-[var(--primary)] mx-auto"
              >
                S
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 px-3 md:px-4 py-4 md:py-8 space-y-1.5 overflow-y-auto no-scrollbar">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 md:gap-4 px-3.5 md:px-4 py-3 md:py-3.5 rounded-none transition-all group relative ${isActive
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-[#616161] hover:bg-neutral-50 hover:text-[#1B1C1C]'
                  }`}
              >
                <item.icon size={20} className={`${isActive ? 'text-white' : 'group-hover:scale-110 transition-transform'} shrink-0`} />
                {(isSidebarOpen || isMobileMenuOpen) && (
                  <span className="font-bold text-[10px] uppercase tracking-[0.2em] whitespace-nowrap">{item.name}</span>
                )}
                {isActive && (
                  <motion.div
                    layoutId="active-indicator"
                    className="absolute left-0 w-1 h-8 bg-white/40"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="border-t border-[var(--outline-variant)]/30 p-4 md:p-6 shrink-0 flex flex-col gap-3">
            {(isSidebarOpen || isMobileMenuOpen) ? (
              <div 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsProfileModalOpen(true);
                }}
                className="flex items-center gap-3 px-2 w-full cursor-pointer hover:opacity-80 transition-opacity"
                title="Manage Profile"
              >
                <div className="h-9 w-9 shrink-0 rounded-none bg-white text-[var(--primary)] flex items-center justify-center border border-[var(--outline-variant)]/40 font-black text-sm">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div className="w-full min-w-0 overflow-hidden">
                  <p className="text-[11px] font-black text-[#1B1C1C] truncate w-full uppercase tracking-widest">{user.name}</p>
                  <p className="text-[9px] text-[#616161] font-bold uppercase tracking-[0.3em] truncate opacity-50">{user.role}</p>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => setIsProfileModalOpen(true)}
                className="flex justify-center w-full cursor-pointer hover:opacity-80 transition-opacity"
                title="Manage Profile"
              >
                <div className="h-9 w-9 shrink-0 rounded-none bg-white text-[var(--primary)] flex items-center justify-center border border-[var(--outline-variant)]/40 font-black text-sm">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-[#616161] hover:bg-neutral-100 hover:text-red-600 rounded-none transition-all group border border-transparent hover:border-red-100"
              title="Logout"
            >
              <LogOut size={16} className="shrink-0 group-hover:translate-x-1 transition-transform" />
              {(isSidebarOpen || isMobileMenuOpen) && <span className="font-bold text-[9px] uppercase tracking-[0.3em] whitespace-nowrap">DISPATCH NODE</span>}
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative w-full h-full overflow-hidden">
        {/* Top Navigation / Notification Header */}
        <header className="h-16 bg-white border-b border-[var(--outline-variant)]/40 px-4 md:px-8 flex items-center justify-between z-30 shrink-0 shadow-xs gap-3">
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

            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#006064] truncate">
              SSPACIA Admin Portal
            </span>
          </div>

          {!isAccountant && (
            <div className="flex items-center gap-2.5 sm:gap-4">
              <VisitorChatButton onClick={() => setIsVisitorChatOpen(true)} />
              <NotificationBell />
            </div>
          )}
        </header>

        {/* Dynamic Route Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative z-0">
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
