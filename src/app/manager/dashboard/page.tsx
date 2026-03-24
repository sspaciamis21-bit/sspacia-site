'use client';

import { motion } from 'motion/react';
import { Briefcase, TrendingUp, Users, Calendar } from 'lucide-react';
import { FadeUp } from '@/components/ui/fade-up';

export default function ManagerDashboardPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 bg-[#F8F9FA]">
      <FadeUp className="text-center max-w-2xl">
        <div className="inline-flex p-6 rounded-3xl bg-[#006064]/5 text-[#006064] mb-8">
          <Briefcase size={48} />
        </div>
        <h1 className="text-4xl font-bold text-[#004D40] mb-4">Manager Dashboard</h1>
        <p className="text-lg text-[#616161] leading-relaxed">
          Welcome to the SSPACIA Management Portal. This area is designated for location managers to oversee daily operations.
        </p>
        
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6 opacity-40 grayscale pointer-events-none">
           {[Users, TrendingUp, Calendar, Briefcase].map((Icon, i) => (
             <div key={i} className="flex flex-col items-center gap-2">
               <div className="p-4 bg-white rounded-2xl border border-[#CFD8DC]/30">
                 <Icon size={24} className="text-[#006064]" />
               </div>
               <span className="text-xs font-bold text-[#9E9E9E] uppercase tracking-wider">Module {i+1}</span>
             </div>
           ))}
        </div>
        
        <button 
          onClick={() => window.location.href = '/'}
          className="mt-12 px-8 py-3 bg-white border border-[#006064] text-[#006064] rounded-2xl font-bold hover:bg-[#E0F7FA] transition-all"
        >
          Return to Home
        </button>
      </FadeUp>
    </div>
  );
}
