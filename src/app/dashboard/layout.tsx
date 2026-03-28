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
  Ticket
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/context/AuthContext';

const sidebarItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Support', href: '/dashboard/support', icon: LifeBuoy },
  { name: 'My Tickets', href: '/dashboard/tickets', icon: Ticket },
];

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else if (user.role === 'MANAGER') {
        router.push('/manager/dashboard');
      }
    }
  }, [user, isLoading, router]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch {
      toast.error('Logout failed');
    }
  };

  if (isLoading || !user || user.role === 'ADMIN' || user.role === 'MANAGER') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <Loader2 className="h-8 w-8 text-[#006064] animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[#F8F9FA] flex">
      {/* Sidebar */}
      <aside 
        className={`${
          isSidebarOpen ? 'w-72' : 'w-20'
        } bg-white border-r border-[#CFD8DC]/50 transition-all duration-300 ease-in-out flex flex-col z-50 relative`}
      >
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-8 p-1.5 bg-white border border-[#CFD8DC] rounded-full text-[#006064] shadow-sm hover:bg-[#E0F7FA] transition-colors z-[60]"
        >
          {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        <div className="p-6 flex items-center justify-between overflow-hidden">
          <AnimatePresence mode="wait">
            {isSidebarOpen ? (
              <motion.div
                key="logo-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-bold text-xl text-[#006064] whitespace-nowrap"
              >
                SSPACIA <span className="text-[#004D40]">Member</span>
              </motion.div>
            ) : (
              <motion.div
                key="logo-mini"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-bold text-xl text-[#006064] mx-auto"
              >
                S
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all group ${
                  isActive 
                    ? 'bg-[#006064] text-white shadow-lg shadow-[#006064]/20' 
                    : 'text-[#616161] hover:bg-[#E0F7FA] hover:text-[#006064]'
                }`}
              >
                <item.icon size={22} className={isActive ? '' : 'group-hover:scale-110 transition-transform'} />
                {isSidebarOpen && (
                  <span className="font-bold whitespace-nowrap">{item.name}</span>
                )}
                {!isSidebarOpen && isActive && (
                  <div className="absolute left-full ml-4 px-3 py-1 bg-[#006064] text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="border-t border-[#CFD8DC]/30 p-4 shrink-0 flex flex-col gap-2">
            {isSidebarOpen ? (
              <div className="flex items-center gap-3 px-2 mb-2 w-full">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-[#E0F7FA] text-[#006064] flex items-center justify-center border border-[#006064]/10 shadow-inner font-bold">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div className="w-full min-w-0 overflow-hidden">
                  <p className="text-sm font-bold text-[#004D40] truncate w-full">{user.name}</p>
                  <p className="text-xs text-[#616161] uppercase tracking-widest truncate">{user.role}</p>
                </div>
              </div>
            ) : (
              <div className="flex justify-center mb-2 w-full">
                 <div className="h-10 w-10 shrink-0 rounded-lg bg-[#E0F7FA] text-[#006064] flex items-center justify-center border border-[#006064]/10 shadow-inner font-bold">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
            
            <button
               onClick={handleLogout}
               className="w-full flex items-center gap-4 px-3 py-2.5 text-[#616161] hover:bg-red-50 hover:text-red-600 rounded-lg transition-all group"
               title="Logout"
            >
               <LogOut size={20} className="shrink-0 group-hover:rotate-12 transition-transform" />
               {isSidebarOpen && <span className="font-bold text-sm whitespace-nowrap">Logout</span>}
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        <div className="flex-1 p-8 overflow-y-auto relative z-0">
          {children}
        </div>
      </main>
    </div>
  );
}
