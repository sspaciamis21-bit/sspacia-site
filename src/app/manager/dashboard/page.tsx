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

export default function ManagerDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<ManagerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      if (user.assignedLocations && user.assignedLocations.length > 0) {
        fetchDashboardData();
      }
    }
  }, [user, authLoading]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/manager/dashboard', {
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

      const data = await response.json();
      setStats(data.stats);
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
        <Loader size={48} className="text-[#006064] animate-spin mb-4" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <FadeUp>
        <div className="flex items-center gap-3 mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-[#006064]/10">
            <Briefcase size={32} className="text-[#006064]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#004D40] capitalize">
              Welcome back, {user?.name}
            </h1>
            <p className="text-[#616161]">Here&apos;s an overview of the locations you manage</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Total Assigned Locations', value: stats?.totalLocations || 0, icon: Briefcase, color: 'bg-blue-50', iconColor: 'text-blue-600', border: 'border-blue-100' },
            { label: 'Total Tickets', value: stats?.totalTickets || 0, icon: AlertCircle, color: 'bg-red-50', iconColor: 'text-red-600', border: 'border-red-100' },
            { label: 'Open Tickets', value: stats?.openTickets || 0, icon: Clock, color: 'bg-orange-50', iconColor: 'text-orange-600', border: 'border-orange-100' },
            { label: 'Total Products', value: stats?.totalProducts || 0, icon: Package, color: 'bg-green-50', iconColor: 'text-green-600', border: 'border-green-100' },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -4, scale: 1.02 }}
                className={`${stat.color} rounded-3xl p-6 border ${stat.border} shadow-sm transition-all`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-2xl bg-white shadow-sm ${stat.iconColor}`}>
                    <Icon size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-4xl font-black text-[#004D40] mb-1">{stat.value}</p>
                  <p className="text-[#616161] font-bold text-sm tracking-wide">{stat.label}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </FadeUp>
      
      <FadeUp>
        <div className="bg-white rounded-3xl p-8 border border-[#CFD8DC]/50 shadow-lg shadow-[#006064]/5 relative overflow-hidden mt-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#E0F7FA]/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10 max-w-2xl">
                <h2 className="text-2xl font-bold text-[#004D40] mb-4">Quick Navigation</h2>
                <p className="text-[#616161] leading-relaxed mb-6 font-medium">
                    Use the sidebar on the left to navigate through your authorized sections. Depending on your assigned role and permissions, you can manage location assets, oversee support tickets, and view members within your domains.
                </p>
            </div>
        </div>
      </FadeUp>
    </div>
  );
}
