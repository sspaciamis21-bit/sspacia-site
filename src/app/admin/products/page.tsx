'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Loader2, 
  Edit2, 
  Trash2, 
  Package, 
  Search, 
  MapPin, 
  Layers, 
  CheckCircle2, 
  XCircle, 
  Power,
  RotateCcw,
  SlidersHorizontal,
  Building2,
  Tag
} from 'lucide-react';
import { toast } from 'sonner';
import { useSidebar } from '@/context/SidebarContext';
import { AddProductModal } from '@/components/admin/add-product-modal';

interface LocationItem {
  id: number;
  name: string;
  slug?: string;
}

interface ProductTypeItem {
  id: number;
  name: string;
  displayName: string;
}

interface SpaceCategoryItem {
  id: number;
  name: string;
  displayName: string;
}

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
  const { setIsSidebarOpen } = useSidebar();
  const [products, setProducts] = useState<RecentProduct[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [productTypes, setProductTypes] = useState<ProductTypeItem[]>([]);
  const [categories, setCategories] = useState<SpaceCategoryItem[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<RecentProduct | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<RecentProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Auto-shrink left sidebar whenever modal is opened
  useEffect(() => {
    if (isModalOpen) {
      setIsSidebarOpen(false);
    }
  }, [isModalOpen, setIsSidebarOpen]);

  // Filter States (Centre-wise, Product Type-wise, Category, Status, Search)
  const [selectedLocationId, setSelectedLocationId] = useState<string>('ALL');
  const [selectedTypeId, setSelectedTypeId] = useState<string>('ALL');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/products');
      const json = await res.json();
      setProducts(json.data || []);
    } catch {
      toast.error('Failed to load products');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFilterConfigs = async () => {
    try {
      const [locRes, typeRes, catRes] = await Promise.all([
        fetch('/api/admin/locations').then(r => r.json()),
        fetch('/api/admin/config/product-types').then(r => r.json()),
        fetch('/api/admin/config/space-categories').then(r => r.json()),
      ]);

      if (locRes.data) setLocations(locRes.data);
      if (typeRes.data) setProductTypes(typeRes.data);
      if (catRes.data) setCategories(catRes.data);
    } catch (err) {
      console.error('Error loading filter configs:', err);
    }
  };

  useEffect(() => {
    loadProducts();
    loadFilterConfigs();
  }, []);

  const handleEditProduct = (product: RecentProduct) => {
    setEditingProduct(product);
    setIsSidebarOpen(false);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (product: RecentProduct) => {
    try {
      const newStatus = !product.isActive;
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (!res.ok) throw new Error('Status update failed');
      toast.success(`${product.name} is now ${newStatus ? 'ACTIVE' : 'INACTIVE'}`);
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isActive: newStatus } : p));
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    const targetProduct = deletingProduct;
    try {
      const response = await fetch(`/api/admin/products/${targetProduct.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed');
      toast.success(`Product "${targetProduct.name}" deleted permanently.`);
      setDeletingProduct(null);
      setProducts((prev) => prev.filter((p) => p.id !== targetProduct.id));
      await loadProducts();
    } catch {
      toast.error('Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedLocationId('ALL');
    setSelectedTypeId('ALL');
    setSelectedCategoryId('ALL');
    setSelectedStatus('ALL');
    setSearchQuery('');
  };

  // Filtered Products Calculation
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Centre Filter
      if (selectedLocationId !== 'ALL' && p.location.id !== Number(selectedLocationId)) {
        return false;
      }
      // 2. Product Type Filter
      if (selectedTypeId !== 'ALL') {
        const typeName = typeof p.type === 'object' ? p.type?.name : p.type;
        if (typeName !== selectedTypeId) return false;
      }
      // 3. Category Filter
      if (selectedCategoryId !== 'ALL') {
        const catName = typeof p.category === 'object' ? p.category?.name : p.category;
        if (catName !== selectedCategoryId) return false;
      }
      // 4. Status Filter
      if (selectedStatus === 'ACTIVE' && !p.isActive) return false;
      if (selectedStatus === 'INACTIVE' && p.isActive) return false;

      // 5. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchLoc = p.location?.name?.toLowerCase().includes(q);
        const matchId = String(p.id).includes(q);
        const typeDisplayName = typeof p.type === 'object' ? p.type?.displayName?.toLowerCase() : String(p.type).toLowerCase();
        const matchType = typeDisplayName?.includes(q);
        if (!matchName && !matchLoc && !matchId && !matchType) return false;
      }

      return true;
    });
  }, [products, selectedLocationId, selectedTypeId, selectedCategoryId, selectedStatus, searchQuery]);

  const activeCount = products.filter(p => p.isActive).length;
  const isFilterActive = selectedLocationId !== 'ALL' || selectedTypeId !== 'ALL' || selectedCategoryId !== 'ALL' || selectedStatus !== 'ALL' || searchQuery.trim() !== '';

  return (
    <div className="space-y-8 pb-20 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 bg-white text-[#006064] flex items-center justify-center border border-gray-200 shadow-md">
            <Package size={32} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-display font-bold text-[#1B1C1C] tracking-tight uppercase">
                Product Inventory
              </h1>
              <span className="text-[9px] font-black uppercase tracking-wider bg-[#006064] text-white px-2.5 py-0.5">
                Super Admin
              </span>
            </div>
            <p className="text-[#616161] font-bold text-[11px] uppercase tracking-widest mt-1 opacity-70">
              Centre-wise and type-wise workspace catalog &amp; photo gallery management
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingProduct(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-[#006064] text-white text-xs font-black uppercase tracking-[0.2em] hover:bg-[#004D40] transition-all shadow-lg cursor-pointer"
        >
          <Plus size={16} />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Stats KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 border border-gray-200 shadow-xs">
          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Total Products</p>
          <p className="text-2xl font-display font-black text-[#1B1C1C] mt-1">{products.length}</p>
        </div>
        <div className="bg-white p-4 border border-gray-200 shadow-xs">
          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Active Spaces</p>
          <p className="text-2xl font-display font-black text-emerald-600 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white p-4 border border-gray-200 shadow-xs">
          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Filtered Result</p>
          <p className="text-2xl font-display font-black text-[#006064] mt-1">{filteredProducts.length}</p>
        </div>
        <div className="bg-white p-4 border border-gray-200 shadow-xs">
          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Active Centres</p>
          <p className="text-2xl font-display font-black text-gray-800 mt-1">{locations.length}</p>
        </div>
      </div>

      {/* ── Advanced Centre-Wise & Type-Wise Filter Controls ── */}
      <div className="bg-white border border-gray-200 p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-700">
            <SlidersHorizontal size={14} className="text-[#006064]" />
            <span>Filter Inventory By Centre &amp; Space Classification</span>
          </div>

          {isFilterActive && (
            <button
              onClick={handleResetFilters}
              className="text-[10px] font-bold text-rose-600 hover:underline uppercase tracking-wider flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw size={11} /> Reset All
            </button>
          )}
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* 1. Centre Filter */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block flex items-center gap-1">
              <Building2 size={11} className="text-[#006064]" /> Centre / Location
            </label>
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="w-full bg-neutral-50 border border-gray-200 px-3 py-2.5 text-xs font-medium text-gray-800 outline-none focus:border-[#006064] focus:bg-white cursor-pointer"
            >
              <option value="ALL">All Centres ({locations.length})</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Product Type Filter */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block flex items-center gap-1">
              <Tag size={11} className="text-[#006064]" /> Product Type
            </label>
            <select
              value={selectedTypeId}
              onChange={(e) => setSelectedTypeId(e.target.value)}
              className="w-full bg-neutral-50 border border-gray-200 px-3 py-2.5 text-xs font-medium text-gray-800 outline-none focus:border-[#006064] focus:bg-white cursor-pointer"
            >
              <option value="ALL">All Space Types</option>
              {productTypes.map((type) => (
                <option key={type.id} value={type.name}>
                  {type.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Category Filter */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block flex items-center gap-1">
              <Layers size={11} className="text-[#006064]" /> Category
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full bg-neutral-50 border border-gray-200 px-3 py-2.5 text-xs font-medium text-gray-800 outline-none focus:border-[#006064] focus:bg-white cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Status Filter */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block flex items-center gap-1">
              <CheckCircle2 size={11} className="text-[#006064]" /> Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-neutral-50 border border-gray-200 px-3 py-2.5 text-xs font-medium text-gray-800 outline-none focus:border-[#006064] focus:bg-white cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative pt-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            placeholder="Search by space name, center, ID, or specifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-gray-200 text-xs font-medium text-[#1B1C1C] placeholder:text-gray-400 outline-none focus:bg-white focus:border-[#006064]"
          />
        </div>
      </div>

      {/* ── Products Table ── */}
      <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-28 flex flex-col items-center justify-center text-center">
            <Loader2 className="h-8 w-8 text-[#006064] animate-spin mb-4" />
            <p className="text-xs font-bold text-gray-700 uppercase tracking-widest animate-pulse">Loading Products Registry...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-24 text-center space-y-3">
             <Package size={40} className="mx-auto text-gray-300" />
             <p className="text-sm font-bold text-gray-700 uppercase tracking-wider">No matching products found</p>
             {isFilterActive && (
               <button
                 onClick={handleResetFilters}
                 className="text-xs font-bold text-[#006064] hover:underline uppercase tracking-wider cursor-pointer"
               >
                 Clear active filters
               </button>
             )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[950px]">
              <thead>
                <tr className="bg-neutral-50 border-b border-gray-200 text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em]">
                  <th className="py-4 px-6">Asset &amp; Cover Photo</th>
                  <th className="py-4 px-6">Centre Node</th>
                  <th className="py-4 px-6">Classification</th>
                  <th className="py-4 px-6 text-center">Capacity / Units</th>
                  <th className="py-4 px-6 text-center">Starting Price</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white text-xs">
                {filteredProducts.map((product) => {
                  const coverImage = product.images?.[0]?.url || '/IMAGES_SSPACIA/PREMIER HOUSE/Reception.JPG';
                  const price = product.pricingPlans?.[0]?.price;
                  const durationLabel = product.pricingPlans?.[0]?.durationType?.displayName || product.pricingPlans?.[0]?.durationType?.name || 'Month';

                  return (
                    <tr key={product.id} className="hover:bg-neutral-50/80 transition-colors group">
                      {/* Asset & Photo */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-10 bg-neutral-100 border border-gray-200 overflow-hidden shrink-0">
                            <img src={coverImage} alt={product.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <span className="font-bold text-[#1B1C1C] uppercase group-hover:text-[#006064] transition-colors block">
                              {product.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] text-gray-400 font-mono">ID #{product.id}</span>
                              {product.isFeatured && (
                                <span className="text-[7px] font-black uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-xs">
                                  Featured
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-neutral-100 text-[#1B1C1C] text-[10px] font-bold uppercase tracking-wider border border-gray-200">
                          <MapPin size={11} className="text-[#006064]" />
                          <span>{product.location.name}</span>
                        </span>
                      </td>

                      {/* Classification */}
                      <td className="py-4 px-6">
                        <div>
                          <span className="font-bold text-[#1B1C1C] text-[11px] uppercase block">
                            {typeof product.type === 'object' ? product.type.displayName : String(product.type).replace('_', ' ')}
                          </span>
                          <span className="text-[9px] text-gray-500 uppercase tracking-wider">
                            {typeof product.category === 'object' ? product.category.displayName : String(product.category).replace('_', ' ')}
                          </span>
                        </div>
                      </td>

                      {/* Capacity / Units */}
                      <td className="py-4 px-6 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-display font-bold text-sm text-gray-900">
                            {product.capacity ? `${product.capacity} Pax` : '1 Pax'}
                          </span>
                          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">
                            {product.quantity} Units
                          </span>
                        </div>
                      </td>

                      {/* Starting Price */}
                      <td className="py-4 px-6 text-center">
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

                      {/* Status Toggle */}
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => handleToggleStatus(product)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                            product.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          }`}
                          title="Click to toggle status"
                        >
                          <Power size={10} />
                          <span>{product.isActive ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="p-2 text-gray-600 hover:text-[#006064] hover:bg-neutral-100 border border-gray-200 transition-all cursor-pointer"
                            title="Edit Space Specifications & Photos"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setDeletingProduct(product)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 border border-gray-200 transition-all cursor-pointer"
                            title="Decommission Space"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Product Modal (with Pre-Available Images & Specs) ── */}
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

      {/* ── Centered Decommission Confirmation Modal ── */}
      <AnimatePresence>
        {deletingProduct && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 lg:p-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingProduct(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white border border-gray-200 shadow-2xl overflow-hidden"
            >
              <div className="h-1 w-full bg-red-600" />
              <div className="px-8 py-8 text-center space-y-4">
                <div className="h-14 w-14 bg-red-50 text-red-600 flex items-center justify-center mx-auto rounded-full">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-display font-bold text-[#1B1C1C] uppercase">
                    Confirm Delete Product
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Are you sure you want to permanently delete <span className="font-bold text-gray-900">&quot;{deletingProduct.name}&quot;</span> from the workspace catalog?
                  </p>
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setDeletingProduct(null)}
                    disabled={isDeleting}
                    className="flex-1 py-3 border border-gray-300 text-gray-700 text-xs font-bold uppercase tracking-wider hover:bg-neutral-100 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 py-3 bg-red-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-red-700 transition-colors disabled:opacity-60 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <span>Confirm Delete</span>}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
