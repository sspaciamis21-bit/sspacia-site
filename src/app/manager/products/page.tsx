'use client';

import { useEffect, useState } from 'react';
import { Package, CheckCircle, XCircle, Loader } from 'lucide-react';
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
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader size={40} className="text-[var(--primary)] animate-spin mb-4" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <FadeUp>
        <div className="flex items-center gap-4 mb-10">
          <div className="inline-flex p-3.5 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
            <Package size={28} />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-[#1B1C1C] tracking-tight">Products & Spaces</h1>
            <p className="text-[#616161] font-medium text-sm mt-1">View and manage spaces in your assigned locations</p>
          </div>
        </div>

        <div className="bg-[var(--surface-lowest)] rounded-3xl p-8 border border-[var(--outline-variant)]/50 shadow-sm overflow-hidden">
          {products.length === 0 ? (
            <div className="text-center py-20 text-[#9E9E9E]">
              <div className="inline-flex p-6 rounded-3xl bg-[var(--surface-low)] text-[#9E9E9E] mb-6">
                <Package size={48} />
              </div>
              <p className="font-display font-bold text-xl text-[#1B1C1C]">No products available</p>
              <p className="text-sm font-medium mt-2">No workspace products were found for your assigned locations.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-8 px-8">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-[var(--outline-variant)]/30">
                    <th className="pb-5 px-4 text-[11px] font-bold text-[#9E9E9E] uppercase tracking-widest">Product Name</th>
                    <th className="pb-5 px-4 text-[11px] font-bold text-[#9E9E9E] uppercase tracking-widest">Location</th>
                    <th className="pb-5 px-4 text-[11px] font-bold text-[#9E9E9E] uppercase tracking-widest">Type</th>
                    <th className="pb-5 px-4 text-[11px] font-bold text-[#9E9E9E] uppercase tracking-widest">Quantity</th>
                    <th className="pb-5 px-4 text-[11px] font-bold text-[#9E9E9E] uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--outline-variant)]/10">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-[var(--surface-low)]/30 transition-colors group">
                      <td className="py-5 px-4 font-bold text-[#1B1C1C] group-hover:text-[var(--primary)] transition-colors">{product.name}</td>
                      <td className="py-5 px-4 text-[#616161] font-medium text-sm">{product.location.name}</td>
                      <td className="py-5 px-4">
                        <span className="inline-block px-3 py-1 bg-[var(--surface-low)] text-[var(--primary)] rounded-full text-[10px] font-bold whitespace-nowrap border border-[var(--primary)]/10">
                          {typeof product.type === 'object' 
                            ? (product.type.displayName || product.type.name?.replace('_', ' ')) 
                            : product.type?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-5 px-4 text-[#1B1C1C] font-bold text-sm">{product.quantity}</td>
                      <td className="py-5 px-4 text-left">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${
                          product.isActive 
                            ? 'bg-green-50 text-green-700 border border-green-100' 
                            : 'bg-gray-50 text-gray-700 border border-gray-100'
                        }`}>
                          {product.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          {product.isActive ? 'Active' : 'Inactive'}
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
