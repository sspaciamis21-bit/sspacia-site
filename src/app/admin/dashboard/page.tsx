'use client';

import { Users, Package, TrendingUp, DollarSign } from 'lucide-react';
import { FadeUp } from '@/components/ui/fade-up';

const stats = [
  { name: 'Total Users', value: '128', icon: Users, change: '+12%', color: 'text-blue-600', bg: 'bg-blue-50' },
  { name: 'Active Products', value: '24', icon: Package, change: '+2', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { name: 'Sales Growth', value: '14.2%', icon: TrendingUp, change: '+3.1%', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { name: 'Total Revenue', value: '₹4,32,000', icon: DollarSign, change: '+₹42k', color: 'text-amber-600', bg: 'bg-amber-50' },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-10">
      <FadeUp>
        <h1 className="text-3xl font-bold text-[#004D40]">Admin Dashboard</h1>
        <p className="text-[#616161] mt-2">Welcome back! Here&apos;s an overview of your workspace.</p>
      </FadeUp>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <FadeUp key={stat.name} delay={i * 0.1}>
            <div className="bg-white p-6 rounded-xl border border-[#CFD8DC]/30 shadow-sm hover:shadow-xl hover:shadow-[#006064]/5 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.bg} ${stat.color} transition-transform group-hover:scale-110`}>
                  <stat.icon size={24} />
                </div>
                <span className="text-xs font-bold text-[#4DB6AC] px-2 py-1 bg-[#E0F7FA] rounded-full">
                  {stat.change}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-[#616161]">{stat.name}</p>
                <h3 className="text-2xl font-black text-[#004D40] mt-1">{stat.value}</h3>
              </div>
            </div>
          </FadeUp>
        ))}
      </div>

      {/* Chart Placeholders or Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <FadeUp delay={0.4}>
          <div className="bg-white p-8 rounded-xl border border-[#CFD8DC]/30 shadow-sm h-80 flex items-center justify-center relative overflow-hidden group">
             <div className="absolute inset-0 bg-gradient-to-br from-[#E0F7FA]/10 to-transparent pointer-events-none" />
             <div className="text-center">
               <TrendingUp className="mx-auto h-12 w-12 text-[#006064] mb-4 opacity-50 group-hover:scale-110 transition-transform" />
               <h3 className="text-lg font-bold text-[#004D40]">Activity Analytics</h3>
               <p className="text-[#616161] text-sm mt-1">Data visualization placeholder</p>
             </div>
          </div>
        </FadeUp>
        
        <FadeUp delay={0.5}>
          <div className="bg-white p-8 rounded-xl border border-[#CFD8DC]/30 shadow-sm h-80 flex flex-col group">
            <h3 className="text-lg font-bold text-[#004D40] mb-6">Recent Users</h3>
            <div className="space-y-4">
              {[1, 2, 3].map((u) => (
                <div key={u} className="flex items-center gap-4 p-3 rounded-lg hover:bg-[#F8F9FA] transition-colors border border-transparent hover:border-[#CFD8DC]/30">
                  <div className="h-10 w-10 rounded-md bg-[#E0F7FA] flex items-center justify-center text-[#006064] font-bold">
                    U{u}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[#212121]">User {u}</p>
                    <p className="text-xs text-[#616161]">user{u}@example.com</p>
                  </div>
                  <div className="text-xs font-bold text-[#006064]">
                    2m ago
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeUp>
      </div>
    </div>
  );
}
