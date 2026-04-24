'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Loader2, XCircle, CheckCircle2, Edit2, Trash2, Package, Search, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { FadeUp } from '@/components/ui/fade-up';
import { AddProductModal } from '@/components/admin/add-product-modal';

interface RecentProduct {
  id: number;
  locationId: number;
  name: string;
  slug: string;
  type: any;
  category: any;
  description?: string;
  accessTime?: string;
  capacity?: number;
  quantity: number;
  sdr?: number;
  adv?: number;
  securityDepositMonths?: number;
  complementaryMeetingHours?: number;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  location: { id: number; name: string };
  images?: { id: number; url: string; alt?: string; isPrimary: boolean; sortOrder?: number }[];
  pricingPlans?: any[];
  units?: any[];
  amenities?: any[];
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<RecentProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<RecentProduct | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<RecentProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/products');
      const json = await res.json();
      setProducts(json.data || []);
    } catch {
      toast.error('Registry link failed');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, []);

  const handleEditProduct = (product: RecentProduct) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/products/${deletingProduct.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Decommission failed');
      toast.success(`Asset "${deletingProduct.name}" decommissioned.`);
      setDeletingProduct(null);
      await loadProducts();
    } catch {
      toast.error('Security handshake failed: Unable to decommission asset');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.location.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-12 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 font-sans">
        <div className="flex items-center gap-6">
          <div className="h-20 w-20 bg-white text-[var(--primary)] flex items-center justify-center rounded-none border border-[var(--outline-variant)]/40 shadow-xl">
            <Package size={40} />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-[#1B1C1C] tracking-tight uppercase">Product Inventory</h1>
            <p className="text-[#616161] font-medium text-[11px] uppercase tracking-widest mt-1 opacity-60">Manage your workspace products and inventory levels</p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-3 px-10 py-5 bg-[var(--primary)] text-white rounded-none text-[11px] font-bold uppercase tracking-widest hover:bg-neutral-900 transition-all shadow-2xl border border-transparent group"
        >
          <Plus size={18} className="group-hover:scale-110 transition-transform" />
          Add New Product
        </button>
      </div>

      {/* Modern Toolbar */}
      <div className="bg-white border border-[var(--outline-variant)]/40 p-2 flex flex-col md:flex-row items-stretch gap-2 shadow-sm rounded-none font-sans">
        <div className="relative flex-1">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#9E9E9E]" size={18} />
          <input
            type="text"
            placeholder="Search products or locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-16 pr-6 py-5 bg-neutral-50 border-none focus:ring-0 text-[11px] font-bold uppercase tracking-widest text-[#1B1C1C] placeholder:text-[#9E9E9E]"
          />
        </div>
        <div className="px-8 flex items-center gap-4 bg-neutral-50 text-[10px] font-bold text-[#616161] uppercase tracking-widest border-l border-[var(--outline-variant)]/10">
          <span>Total Products:</span>
          <span className="bg-white text-[var(--primary)] px-3 py-1 font-bold border border-[var(--outline-variant)]/30 shadow-sm">{filteredProducts.length}</span>
        </div>
      </div>

      {/* Registry Grid/Table */}
      <div className="bg-white border border-[var(--outline-variant)]/40 rounded-none shadow-2xl overflow-hidden font-sans">
        {isLoading ? (
          <div className="px-10 py-40 flex flex-col items-center justify-center text-center">
            <Loader2 className="h-10 w-10 text-[var(--primary)] animate-spin mb-6" />
            <p className="text-[11px] font-bold text-[#1B1C1C] uppercase tracking-widest animate-pulse">Loading Inventory...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="px-10 py-40 text-center">
             <Package size={48} className="mx-auto mb-6 text-[#1B1C1C] opacity-20" />
             <p className="text-[11px] font-bold text-[#1B1C1C] uppercase tracking-widest">No Products Found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-neutral-50/50 border-b border-[var(--outline-variant)]/20">
                  <th className="px-10 py-6 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-widest">Product</th>
                  <th className="px-10 py-6 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-widest">Location</th>
                  <th className="px-10 py-6 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-widest">Details</th>
                  <th className="px-10 py-6 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-widest">Status</th>
                  <th className="px-10 py-6 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--outline-variant)]/10">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-neutral-50/80 transition-colors group">
                    <td className="px-10 py-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-[#1B1C1C] uppercase tracking-wide group-hover:text-[var(--primary)] transition-colors">{product.name}</span>
                        <span className="text-[9px] text-[#9E9E9E] font-medium tracking-tight uppercase opacity-60">ID: #{product.id}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                       <span className="inline-flex items-center px-3 py-1 bg-neutral-100 text-[#1B1C1C] text-[8px] font-bold uppercase tracking-widest border border-[var(--outline-variant)]/20">
                        {product.location.name}
                      </span>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-[#1B1C1C] uppercase tracking-wide">
                          {typeof product.type === 'object' ? product.type.displayName : product.type?.replace('_', ' ')}
                          {product.capacity && ` (${product.capacity} Seater)`}
                        </span>
                        <span className="text-[9px] text-[#616161] font-medium uppercase tracking-widest opacity-60">{typeof product.category === 'object' ? product.category.displayName : product.category?.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                       <div className={`flex items-center gap-3 text-[9px] font-bold uppercase tracking-widest ${product.isActive ? 'text-[#4DB6AC]' : 'text-red-400 opacity-60'}`}>
                        <div className={`h-2 w-2 ${product.isActive ? 'bg-[#4DB6AC]' : 'bg-red-400'}`} />
                        {product.isActive ? 'Active' : 'Inactive'}
                      </div>
                    </td>
                    <td className="px-10 py-6 text-right">
                       <div className="flex justify-end gap-2">
                        <button onClick={() => handleEditProduct(product)} className="p-3 text-[#616161] hover:text-[var(--primary)] hover:bg-neutral-100 transition-all border border-transparent" title="Edit Product">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => setDeletingProduct(product)} className="p-3 text-[#616161] hover:text-red-600 hover:bg-neutral-100 transition-all border border-transparent" title="Delete Product">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddProductModal
        isOpen={isModalOpen}
        product={editingProduct ?? undefined}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
        }}
        onSuccess={async () => {
          await loadProducts();
          setEditingProduct(null);
        }}
      />

      {/* Centered Decommission Confirmation */}
      <AnimatePresence>
        {deletingProduct && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 lg:p-10">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeletingProduct(null)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-white border border-white/10 shadow-2xl overflow-hidden">
               <div className="h-1 w-full bg-red-600" />
               <div className="px-10 py-10 text-center">
                  <div className="h-16 w-16 bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-6">
                    <Trash2 size={32} />
                  </div>
                  <h3 className="text-xl font-display font-black text-[#1B1C1C] tracking-tighter uppercase mb-2">Confirm Decommission</h3>
                  <p className="text-[10px] text-[#616161] font-bold uppercase tracking-[0.2em] mb-8 leading-relaxed">System directive: are you authorized to purge <span className="text-[#1B1C1C] font-black">[{deletingProduct.name}]</span> from active lists?</p>
                  
                  <div className="flex items-stretch gap-0 border-t border-[var(--outline-variant)]/20 -mx-10 -mb-10 mt-10">
                    <button onClick={() => setDeletingProduct(null)} disabled={isDeleting} className="flex-1 py-6 text-[10px] font-black text-[#616161] uppercase tracking-[0.3em] hover:bg-neutral-100 transition-all border-r border-[var(--outline-variant)]/20 disabled:opacity-50">Abort</button>
                    <button onClick={handleDelete} disabled={isDeleting} className="flex-1 py-6 bg-red-600 text-white font-black text-[10px] uppercase tracking-[0.3em] hover:bg-red-700 transition-all disabled:opacity-60">{isDeleting ? 'PURGING...' : 'PROCEED'}</button>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
