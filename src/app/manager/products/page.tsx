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
  type: string;
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
      if (!hasPermission('view_location_details') && !hasPermission('manage_location_products')) {
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
      const response = await fetch('/api/manager/dashboard', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch data');

      const data = await response.json();
      setProducts(data.products || []);
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
        <Loader size={48} className="text-[#006064] animate-spin mb-4" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <FadeUp>
        <div className="flex items-center gap-3 mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-[#006064]/10">
            <Package size={32} className="text-[#006064]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#004D40]">Products & Spaces</h1>
            <p className="text-[#616161]">View and manage spaces in your assigned locations</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-[#E0E0E0] shadow-sm">
          {products.length === 0 ? (
            <div className="text-center py-12 text-[#9E9E9E]">
              <Package size={48} className="mx-auto mb-4 opacity-50" />
              <p className="font-semibold text-lg">No products available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#E0E0E0]">
                    <th className="p-4 text-sm font-semibold text-[#616161] uppercase tracking-wider">Product Name</th>
                    <th className="p-4 text-sm font-semibold text-[#616161] uppercase tracking-wider">Location</th>
                    <th className="p-4 text-sm font-semibold text-[#616161] uppercase tracking-wider">Type</th>
                    <th className="p-4 text-sm font-semibold text-[#616161] uppercase tracking-wider">Quantity</th>
                    <th className="p-4 text-sm font-semibold text-[#616161] uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0]">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-[#F8F9FA] transition-colors">
                      <td className="p-4 font-semibold text-[#004D40]">{product.name}</td>
                      <td className="p-4 text-[#616161]">{product.location.name}</td>
                      <td className="p-4 text-[#616161]">
                        <span className="inline-block px-3 py-1 bg-[#E8F5E9] text-[#2E7D32] rounded-full text-xs font-bold whitespace-nowrap">
                          {product.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-[#616161] font-semibold">{product.quantity}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          product.isActive 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {product.isActive ? <CheckCircle size={14} /> : <XCircle size={14} />}
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
