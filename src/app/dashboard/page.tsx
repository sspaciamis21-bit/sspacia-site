'use client';

import { motion } from 'motion/react';
import { Layout, Home, Settings, Bell, BookOpen } from 'lucide-react';
import { FadeUp } from '@/components/ui/fade-up';

export default function UserDashboardPage() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <FadeUp className="text-center max-w-2xl">
        <div className="inline-flex p-6 rounded-3xl bg-indigo-50 text-[#006064] mb-8">
          <Layout size={48} />
        </div>
        <h1 className="text-4xl font-bold text-[#004D40] mb-4">Your Membership Dashboard</h1>
        <p className="text-lg text-[#616161] leading-relaxed">
          Hello! Welcome to your personal SSPACIA member area. We are currently building a premium experience for managing your bookings and workspace preferences.
        </p>
        
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6 opacity-40 grayscale pointer-events-none">
           {[BookOpen, Bell, Settings, Home].map((Icon, i) => (
             <div key={i} className="flex flex-col items-center gap-2">
               <div className="p-4 bg-white rounded-2xl border border-[#CFD8DC]/30">
                 <Icon size={24} className="text-[#006064]" />
               </div>
               <span className="text-xs font-bold text-[#9E9E9E] uppercase tracking-wider">Module {i+1}</span>
             </div>
           ))}
        </div>
        
        <div className="mt-12 flex gap-4">
          <button 
            onClick={() => window.location.href = '/'}
            className="px-8 py-3 bg-[#006064] text-white rounded-2xl font-bold hover:bg-[#004D40] transition-all shadow-lg shadow-[#006064]/20"
          >
            Explore Spaces
          </button>
        </div>
      </FadeUp>
    </div>
  );
}
