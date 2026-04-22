'use client';

import { useEffect, useState } from 'react';
import { Package, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { FadeUp } from '@/components/ui/fade-up';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface Product {
  id: number;
  name: string;
  type: { name: string; displayName?: string } | string;
  location: { name: string; id: number };
  quantity: number;
  isActive: boolean;
}

export default function ManagerProductsPage() {
  const { user, hasPermission, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      if (!hasPermission('products.view')) {
        toast.error('Unauthorized to view products.');
        router.push('/manager/dashboard');
        return;
      }
      fetchProducts();
    }
  }, [user, authLoading, hasPermission, router]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/products', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch data');

      const data = await response.json();
      setProducts(data.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 size={40} className="text-[var(--primary)] animate-spin" />
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9E9E9E] animate-pulse">Inventory Initialization...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20 px-4">
      <FadeUp>
        <div className="flex items-center gap-6 mb-10">
          <div className="inline-flex p-4 bg-white border border-[var(--outline-variant)] text-[var(--primary)]">
            <Package size={24} />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-[#1B1C1C] uppercase tracking-tight italic">Asset Inventory</h1>
            <p className="text-[#616161] font-bold text-[11px] uppercase tracking-widest mt-1 opacity-60">Directory of registered network nodes and space assets</p>
          </div>
        </div>

        <div className="bg-white border border-[var(--outline-variant)] shadow-sm overflow-hidden rounded-none">
          {products.length === 0 ? (
            <div className="text-center py-24 bg-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#9E9E9E]">No assets registered in terminal</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-[var(--outline-variant)] bg-neutral-50/50">
                    <th className="py-6 px-10 text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.3em]">Asset Profile</th>
                    <th className="py-6 px-10 text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.3em]">Location Node</th>
                    <th className="py-6 px-10 text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.3em]">Classification</th>
                    <th className="py-6 px-10 text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.3em] text-center">Resources Available</th>
                    <th className="py-6 px-10 text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.3em] text-right">System State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 bg-white">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-neutral-50 transition-all group">
                      <td className="py-10 px-10">
                         <div className="font-bold text-[#1B1C1C] text-[14px] uppercase tracking-tight group-hover:text-[var(--primary)] transition-colors">{product.name}</div>
                         <p className="text-[10px] text-[#9E9E9E] font-bold uppercase mt-1.5 opacity-60 tracking-widest">UID: #{product.id}</p>
                      </td>
                      <td className="py-10 px-10">
                        <div className="flex items-center gap-2 font-black text-[9px] uppercase text-[#1B1C1C] tracking-widest bg-neutral-100 px-3 py-1 border border-neutral-200 inline-flex">
                          {product.location?.name}
                        </div>
                      </td>
                      <td className="py-10 px-10">
                        <span className="text-[#616161] text-[10px] font-black uppercase tracking-[0.2em]">
                          {typeof product.type === 'string' ? product.type : product.type?.displayName || product.type?.name}
                        </span>
                      </td>
                      <td className="py-10 px-10 text-center">
                        <div className="inline-flex flex-col items-center">
                           <span className="font-display font-bold text-lg text-[#1B1C1C]">{product.quantity}</span>
                           <span className="text-[7px] font-black text-[#9E9E9E] uppercase tracking-[0.2em] -mt-1">UNITS</span>
                        </div>
                      </td>
                      <td className="py-10 px-10 text-right">
                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-none text-[8px] font-black uppercase tracking-[0.4em] border transition-all ${
                          product.isActive 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                            : 'bg-neutral-100 text-neutral-400 border-neutral-200'
                        }`}>
                          <div className={`h-1 w-1 ${product.isActive ? 'bg-emerald-600' : 'bg-neutral-400'}`}></div>
                          {product.isActive ? 'ACTIVE_ASSET' : 'INACTIVE_SIGNAL'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </FadeUp>
    </div>
  );
}
