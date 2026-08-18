'use client';

import { useEffect, useState } from 'react';
import { Package, Loader2, Eye, ShieldAlert, MapPin, Users, IndianRupee, Layers, CheckCircle2, XCircle, X } from 'lucide-react';
import { FadeUp } from '@/components/ui/fade-up';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface ProductImageItem {
  id?: number;
  url: string;
  isPrimary?: boolean;
}

interface ProductPricingPlan {
  id?: number;
  price: string | number;
  oldPrice?: string | number | null;
  discount?: string | number | null;
  durationType?: {
    id: number;
    name: string;
    displayName?: string;
  };
}

interface Product {
  id: number;
  name: string;
  slug?: string;
  type: { name: string; displayName?: string } | string;
  category?: { name: string; displayName?: string } | string;
  location: { name: string; id: number; address?: string };
  quantity: number;
  capacity?: number;
  isActive: boolean;
  pricingPlans?: ProductPricingPlan[];
  images?: ProductImageItem[];
}

export default function ManagerProductsPage() {
  const { user, hasPermission, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Read-only modal state
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (!authLoading && user) {
      if (!hasPermission('products.view') && !hasPermission('products.read')) {
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

  const handleOpenViewModal = (product: Product) => {
    setViewingProduct(product);
    setActiveImageIndex(0);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 size={40} className="text-[#1ab0bc] animate-spin" />
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9E9E9E] animate-pulse">Loading Asset Inventory...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4">
      <FadeUp>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-6">
            <div className="inline-flex p-4 bg-white border border-gray-200 text-[#1ab0bc]">
              <Package size={24} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl md:text-4xl font-display font-bold text-[#1B1C1C] uppercase tracking-tight italic">
                  Asset Inventory
                </h1>
                <span className="text-[9px] font-black uppercase tracking-wider bg-neutral-100 text-gray-700 px-2.5 py-1 border border-neutral-300">
                  Read Only
                </span>
              </div>
              <p className="text-[#616161] font-bold text-[11px] uppercase tracking-widest mt-1 opacity-70">
                Center Space Catalog • Modifications and additions are restricted to Super Admin
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2 text-[11px] font-medium">
            <ShieldAlert size={14} className="text-amber-700 shrink-0" />
            <span>Product Edit &amp; Add privileges reserved for Super Admin</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 shadow-sm overflow-hidden rounded-none">
          {products.length === 0 ? (
            <div className="text-center py-24 bg-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#9E9E9E]">No assets registered for assigned center</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-neutral-50/50">
                    <th className="py-5 px-8 text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.3em]">Asset Profile</th>
                    <th className="py-5 px-8 text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.3em]">Location Node</th>
                    <th className="py-5 px-8 text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.3em]">Classification</th>
                    <th className="py-5 px-8 text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.3em] text-center">Capacity / Units</th>
                    <th className="py-5 px-8 text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.3em] text-center">Starting Rate</th>
                    <th className="py-5 px-8 text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.3em] text-center">Status</th>
                    <th className="py-5 px-8 text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.3em] text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 bg-white">
                  {products.map((product) => {
                    const price = product.pricingPlans?.[0]?.price;
                    const durationLabel = product.pricingPlans?.[0]?.durationType?.displayName || product.pricingPlans?.[0]?.durationType?.name || 'Month';
                    
                    return (
                      <tr key={product.id} className="hover:bg-neutral-50/80 transition-all group">
                        <td className="py-6 px-8">
                          <div className="font-bold text-[#1B1C1C] text-[14px] uppercase tracking-tight group-hover:text-[#1ab0bc] transition-colors">
                            {product.name}
                          </div>
                          <p className="text-[10px] text-[#9E9E9E] font-bold uppercase mt-1 opacity-60 tracking-widest">
                            ID: #{product.id}
                          </p>
                        </td>
                        <td className="py-6 px-8">
                          <div className="flex items-center gap-2 font-black text-[9px] uppercase text-[#1B1C1C] tracking-widest bg-neutral-100 px-3 py-1 border border-neutral-200 inline-flex">
                            {product.location?.name}
                          </div>
                        </td>
                        <td className="py-6 px-8">
                          <span className="text-[#616161] text-[10px] font-black uppercase tracking-[0.2em] block">
                            {typeof product.type === 'string' ? product.type : product.type?.displayName || product.type?.name}
                          </span>
                          <span className="text-[9px] text-[#9E9E9E] uppercase font-medium tracking-wider">
                            {typeof product.category === 'string' ? product.category : product.category?.displayName || product.category?.name || 'Workspace'}
                          </span>
                        </td>
                        <td className="py-6 px-8 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-display font-bold text-base text-[#1B1C1C]">
                              {product.capacity ? `${product.capacity} Pax` : `${product.quantity} Units`}
                            </span>
                            <span className="text-[8px] font-black text-[#9E9E9E] uppercase tracking-[0.15em] -mt-0.5">
                              {product.quantity} Inventory
                            </span>
                          </div>
                        </td>
                        <td className="py-6 px-8 text-center">
                          {price ? (
                            <div>
                              <span className="font-bold text-xs text-[#006064]">
                                ₹{Number(price).toLocaleString()}
                              </span>
                              <span className="text-[9px] text-gray-400 block font-mono">
                                /{durationLabel.toLowerCase()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">Custom</span>
                          )}
                        </td>
                        <td className="py-6 px-8 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 text-[8px] font-black uppercase tracking-[0.2em] border ${
                              product.isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {product.isActive ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <XCircle className="w-3 h-3 text-rose-600" />
                            )}
                            <span>{product.isActive ? 'ACTIVE' : 'INACTIVE'}</span>
                          </span>
                        </td>
                        <td className="py-6 px-8 text-right">
                          <button
                            onClick={() => handleOpenViewModal(product)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-[#1ab0bc] hover:text-white text-gray-700 text-[10px] font-black uppercase tracking-wider transition-all border border-gray-200 cursor-pointer"
                            title="View Asset Specifications & Gallery"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </FadeUp>

      {/* ── READ-ONLY ASSET VIEW MODAL ── */}
      {viewingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white border border-gray-200 max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto my-auto relative">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b pb-4 border-gray-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] bg-[#1ab0bc]/10 text-[#006064] px-2.5 py-0.5 border border-[#1ab0bc]/20">
                    Asset #{viewingProduct.id}
                  </span>
                  <span
                    className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 border ${
                      viewingProduct.isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {viewingProduct.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <h3 className="text-2xl font-bold font-display uppercase tracking-tight text-gray-900 mt-2">
                  {viewingProduct.name}
                </h3>
              </div>
              <button
                onClick={() => setViewingProduct(null)}
                className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Gallery Preview */}
            <div className="space-y-3">
              <div className="relative w-full h-64 sm:h-72 bg-neutral-900 overflow-hidden border border-gray-200 flex items-center justify-center">
                {viewingProduct.images && viewingProduct.images.length > 0 ? (
                  <Image
                    src={viewingProduct.images[activeImageIndex]?.url || viewingProduct.images[0]?.url}
                    alt={viewingProduct.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="text-center text-white/50 space-y-2">
                    <Package className="w-10 h-10 mx-auto opacity-40" />
                    <p className="text-xs uppercase tracking-widest">No Photos Uploaded</p>
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {viewingProduct.images && viewingProduct.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {viewingProduct.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-16 h-12 shrink-0 border-2 overflow-hidden cursor-pointer transition-all ${
                        idx === activeImageIndex ? 'border-[#1ab0bc] scale-105' : 'border-gray-200 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <Image src={img.url} alt="thumbnail" fill className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details Grid */}
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
              <div className="bg-neutral-50 p-3.5 border border-neutral-200">
                <p className="text-[9px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1">
                  <MapPin size={12} className="text-[#1ab0bc]" /> Location Node
                </p>
                <p className="text-xs font-bold text-gray-900 mt-1">{viewingProduct.location?.name}</p>
              </div>

              <div className="bg-neutral-50 p-3.5 border border-neutral-200">
                <p className="text-[9px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1">
                  <Layers size={12} className="text-[#1ab0bc]" /> Space Type
                </p>
                <p className="text-xs font-bold text-gray-900 mt-1">
                  {typeof viewingProduct.type === 'string'
                    ? viewingProduct.type
                    : viewingProduct.type?.displayName || viewingProduct.type?.name}
                </p>
              </div>

              <div className="bg-neutral-50 p-3.5 border border-neutral-200">
                <p className="text-[9px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1">
                  <Users size={12} className="text-[#1ab0bc]" /> Capacity &amp; Units
                </p>
                <p className="text-xs font-bold text-gray-900 mt-1">
                  {viewingProduct.capacity ? `${viewingProduct.capacity} Persons` : '1 Person'} • {viewingProduct.quantity} Available
                </p>
              </div>
            </div>

            {/* Pricing Plans */}
            {viewingProduct.pricingPlans && viewingProduct.pricingPlans.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1">
                  <IndianRupee size={13} className="text-[#1ab0bc]" /> Active Pricing Plans
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {viewingProduct.pricingPlans.map((plan, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white p-3 border border-gray-200">
                      <span className="text-xs font-medium text-gray-700">
                        {plan.durationType?.displayName || plan.durationType?.name || 'Standard'}
                      </span>
                      <span className="font-bold text-xs text-[#006064]">
                        ₹{Number(plan.price).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Read-Only Notice */}
            <div className="bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-900 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldAlert size={14} className="text-amber-700 shrink-0" />
                <span>To modify specifications, rates, or gallery images, contact Super Admin.</span>
              </span>
              <button
                onClick={() => setViewingProduct(null)}
                className="bg-white border border-amber-300 text-amber-900 px-3 py-1 font-bold text-[10px] uppercase tracking-wider hover:bg-amber-100 cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
