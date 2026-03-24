'use client';

import { Package, Plus, Search, Filter } from 'lucide-react';
import { FadeUp } from '@/components/ui/fade-up';

export default function AdminProductsPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <FadeUp>
          <h1 className="text-3xl font-bold text-[#004D40]">Product Inventory</h1>
          <p className="text-[#616161]">Manage SSPACIA workspace products, desks, and amenities.</p>
        </FadeUp>
        
        <FadeUp delay={0.1}>
          <button className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#006064] text-white rounded-lg font-bold shadow-lg shadow-[#006064]/20 hover:bg-[#004D40] transition-all transform hover:-translate-y-0.5 active:translate-y-0">
            <Plus size={20} />
            Add New Product
          </button>
        </FadeUp>
      </div>

      <FadeUp delay={0.2}>
        <div className="bg-white rounded-xl border border-[#CFD8DC]/30 shadow-sm p-20 text-center group">
          <div className="inline-flex p-6 rounded-lg bg-[#E0F7FA] text-[#006064] mb-6 group-hover:scale-110 transition-transform">
            <Package size={48} />
          </div>
          <h2 className="text-2xl font-bold text-[#004D40]">Products Management</h2>
          <p className="max-w-md mx-auto text-[#616161] mt-3">
            This module is currently under development. Soon you will be able to manage all SSPACIA inventory from here.
          </p>
          
          <div className="mt-10 flex flex-wrap justify-center gap-4 opacity-50 grayscale pointer-events-none">
             <div className="flex items-center gap-2 px-4 py-2 bg-[#F8F9FA] rounded-md border border-[#CFD8DC]/30">
               <Search size={16} /> Search
             </div>
             <div className="flex items-center gap-2 px-4 py-2 bg-[#F8F9FA] rounded-md border border-[#CFD8DC]/30">
               <Filter size={16} /> Filter
             </div>
          </div>
        </div>
      </FadeUp>
    </div>
  );
}
