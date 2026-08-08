'use client';

import { useEffect, useState } from 'react';
import { Package, Loader2, Plus, Edit2, Trash2, Power, Image as ImageIcon, Star, X, Upload } from 'lucide-react';
import { FadeUp } from '@/components/ui/fade-up';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface ProductImageItem {
  id?: number;
  url: string;
  isPrimary?: boolean;
}

interface Product {
  id: number;
  name: string;
  type: { name: string; displayName?: string } | string;
  category?: { name: string; displayName?: string } | string;
  location: { name: string; id: number };
  quantity: number;
  capacity?: number;
  isActive: boolean;
  pricingPlans?: { price: string | number }[];
  images?: ProductImageItem[];
}

export default function ManagerProductsPage() {
  const { user, hasPermission, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    type: 'DEDICATED_DESK',
    category: 'OWNED_SPACE',
    capacity: 1,
    quantity: 1,
    price: 10000,
  });

  const [imageInputs, setImageInputs] = useState<{ url: string; isPrimary: boolean }[]>([
    { url: '', isPrimary: true }
  ]);

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

  const handleToggleStatus = async (product: Product) => {
    try {
      const newStatus = !product.isActive;
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update status');

      toast.success(`${product.name} is now ${newStatus ? 'ACTIVE' : 'INACTIVE'}`);
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isActive: newStatus } : p));
    } catch (err) {
      console.error(err);
      toast.error('Failed to update asset status');
    }
  };

  const handleDelete = async (productId: number, name: string) => {
    if (!confirm(`Are you sure you want to deactivate ${name}?`)) return;

    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete asset');

      toast.success(`${name} deactivated successfully`);
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (err) {
      console.error(err);
      toast.error('Failed to deactivate asset');
    }
  };

  const handleOpenEditModal = async (product: Product) => {
    setEditingProduct(product);
    const fallbackList = [
      "/IMAGES_SSPACIA/MERCADO IMAGES/Reception.jpg",
      "/IMAGES_SSPACIA/PREMIER HOUSE/Reception.JPG",
      "/IMAGES_SSPACIA/AGARWAL IMAGES/Meeting_Room_1.jpg"
    ];
    const defaultImage = fallbackList[product.id % 3];

    try {
      const res = await fetch(`/api/admin/products/${product.id}`);
      if (res.ok) {
        const fullData = await res.json();
        const p = fullData.data || product;
        const currentPrice = p.pricingPlans?.[0]?.price ? Number(p.pricingPlans[0].price) : 10000;
        const currentType = typeof p.type === 'string' ? p.type : p.type?.name || 'DEDICATED_DESK';
        const currentCategory = typeof p.category === 'string' ? p.category : p.category?.name || 'OWNED_SPACE';

        const fetchedImgs: ProductImageItem[] = p.images || [];
        const mappedImgs = fetchedImgs.length > 0
          ? fetchedImgs.map((img, idx) => ({ url: img.url, isPrimary: img.isPrimary ?? (idx === 0) }))
          : [{ url: defaultImage, isPrimary: true }];

        setFormData({
          name: p.name,
          slug: p.slug || '',
          type: currentType,
          category: currentCategory,
          capacity: p.capacity || 1,
          quantity: p.quantity || 1,
          price: currentPrice,
        });

        setImageInputs(mappedImgs);
        return;
      }
    } catch (err) {
      console.error("Fetch product detail error:", err);
    }

    const currentPrice = product.pricingPlans?.[0]?.price ? Number(product.pricingPlans[0].price) : 10000;
    const currentType = typeof product.type === 'string' ? product.type : product.type?.name || 'DEDICATED_DESK';
    const currentCategory = typeof product.category === 'string' ? product.category : product.category?.name || 'OWNED_SPACE';

    setFormData({
      name: product.name,
      slug: '',
      type: currentType,
      category: currentCategory,
      capacity: product.capacity || 1,
      quantity: product.quantity || 1,
      price: currentPrice,
    });

    setImageInputs([{ url: defaultImage, isPrimary: true }]);
  };

  const handleAddImageInput = () => {
    setImageInputs(prev => [...prev, { url: '', isPrimary: prev.length === 0 }]);
  };

  const handleRemoveImageInput = (index: number) => {
    setImageInputs(prev => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length > 0 && !next.some(img => img.isPrimary)) {
        next[0].isPrimary = true;
      }
      return next;
    });
  };

  const handleSetPrimaryImage = (index: number) => {
    setImageInputs(prev => prev.map((img, i) => ({ ...img, isPrimary: i === index })));
  };

  const handleImageChange = (index: number, val: string) => {
    setImageInputs(prev => prev.map((img, i) => i === index ? { ...img, url: val } : img));
  };

  const handleFileUpload = async (index: number, file: File) => {
    try {
      toast.loading('Uploading image file...', { id: 'img-upload' });
      const uploadData = new FormData();
      uploadData.append('file', file);

      const res = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: uploadData,
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Upload failed');
      }

      const resData = await res.json();
      const uploadedUrl = resData.data?.url;

      if (!uploadedUrl) throw new Error('No URL returned');

      handleImageChange(index, uploadedUrl);
      toast.success('Image uploaded successfully!', { id: 'img-upload' });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to upload file', { id: 'img-upload' });
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const userLocationId = (user?.assignedLocations?.[0] as any)?.locationId || (user?.assignedLocations?.[0] as any)?.id || 2;
      const slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const validImages = imageInputs.filter(img => img.url.trim() !== '');

      if (editingProduct) {
        // PATCH Edit existing
        const res = await fetch(`/api/admin/products/${editingProduct.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            capacity: Number(formData.capacity),
            quantity: Number(formData.quantity),
            pricingPlans: [
              { durationType: 'MONTHLY', price: Number(formData.price), priceType: 'PER_SEAT' }
            ],
            images: validImages
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to update product');
        }

        toast.success(`${formData.name} updated successfully!`);
      } else {
        // POST Create new
        const res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locationId: userLocationId,
            name: formData.name,
            slug,
            type: formData.type,
            category: formData.category,
            capacity: Number(formData.capacity),
            quantity: Number(formData.quantity),
            pricingPlans: [
              { durationType: 'MONTHLY', price: Number(formData.price), priceType: 'PER_SEAT' }
            ],
            images: validImages
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to create product');
        }

        toast.success('New product registered successfully!');
      }

      setIsAddModalOpen(false);
      setEditingProduct(null);
      setFormData({
        name: '',
        slug: '',
        type: 'DEDICATED_DESK',
        category: 'OWNED_SPACE',
        capacity: 1,
        quantity: 1,
        price: 10000,
      });
      setImageInputs([{ url: '', isPrimary: true }]);
      fetchProducts();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Error saving product');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 size={40} className="text-[#1ab0bc] animate-spin" />
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9E9E9E] animate-pulse">Inventory Initialization...</p>
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
              <h1 className="text-3xl md:text-4xl font-display font-bold text-[#1B1C1C] uppercase tracking-tight italic">Asset Inventory</h1>
              <p className="text-[#616161] font-bold text-[11px] uppercase tracking-widest mt-1 opacity-60">Directory & Multi-Image Gallery Manager for Center Assets</p>
            </div>
          </div>

          <button
            onClick={() => {
              setEditingProduct(null);
              setFormData({
                name: '',
                slug: '',
                type: 'DEDICATED_DESK',
                category: 'OWNED_SPACE',
                capacity: 1,
                quantity: 1,
                price: 10000,
              });
              setImageInputs([{ url: '', isPrimary: true }]);
              setIsAddModalOpen(true);
            }}
            className="bg-[#1ab0bc] text-white px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-teal-600 transition-all flex items-center gap-2 active:scale-95"
          >
            <Plus size={16} />
            <span>Add New Product</span>
          </button>
        </div>

        <div className="bg-white border border-gray-200 shadow-sm overflow-hidden rounded-none">
          {products.length === 0 ? (
            <div className="text-center py-24 bg-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#9E9E9E]">No assets registered in terminal</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-neutral-50/50">
                    <th className="py-5 px-8 text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.3em]">Asset Profile</th>
                    <th className="py-5 px-8 text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.3em]">Location Node</th>
                    <th className="py-5 px-8 text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.3em]">Classification</th>
                    <th className="py-5 px-8 text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.3em] text-center">Units</th>
                    <th className="py-5 px-8 text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.3em] text-center">Status</th>
                    <th className="py-5 px-8 text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.3em] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 bg-white">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-neutral-50/80 transition-all group">
                      <td className="py-6 px-8">
                         <div className="font-bold text-[#1B1C1C] text-[14px] uppercase tracking-tight group-hover:text-[#1ab0bc] transition-colors">{product.name}</div>
                         <p className="text-[10px] text-[#9E9E9E] font-bold uppercase mt-1 opacity-60 tracking-widest">ID: #{product.id}</p>
                      </td>
                      <td className="py-6 px-8">
                        <div className="flex items-center gap-2 font-black text-[9px] uppercase text-[#1B1C1C] tracking-widest bg-neutral-100 px-3 py-1 border border-neutral-200 inline-flex">
                          {product.location?.name}
                        </div>
                      </td>
                      <td className="py-6 px-8">
                        <span className="text-[#616161] text-[10px] font-black uppercase tracking-[0.2em]">
                          {typeof product.type === 'string' ? product.type : product.type?.displayName || product.type?.name}
                        </span>
                      </td>
                      <td className="py-6 px-8 text-center">
                        <div className="inline-flex flex-col items-center">
                           <span className="font-display font-bold text-lg text-[#1B1C1C]">{product.quantity}</span>
                           <span className="text-[7px] font-black text-[#9E9E9E] uppercase tracking-[0.2em] -mt-1">UNITS</span>
                        </div>
                      </td>
                      <td className="py-6 px-8 text-center">
                        <button
                          onClick={() => handleToggleStatus(product)}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-none text-[8px] font-black uppercase tracking-[0.2em] border transition-all ${
                            product.isActive 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' 
                              : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                          }`}
                          title="Click to toggle status"
                        >
                          <Power className="w-3 h-3" />
                          {product.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </button>
                      </td>
                      <td className="py-6 px-8 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEditModal(product)}
                          className="p-2 text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all"
                          title="Edit Product Details & Gallery"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id, product.name)}
                          className="p-2 text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all"
                          title="Deactivate Product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </FadeUp>

      {/* ── ADD / EDIT PRODUCT MULTI-IMAGE MODAL ── */}
      {(isAddModalOpen || editingProduct) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white border border-gray-200 max-w-2xl w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex justify-between items-center border-b pb-4 border-gray-100">
              <h3 className="text-xl font-bold font-display uppercase tracking-tight text-gray-900">
                {editingProduct ? `Edit Asset Gallery: ${editingProduct.name}` : 'Register New Asset'}
              </h3>
              <button 
                onClick={() => { setIsAddModalOpen(false); setEditingProduct(null); }} 
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-6">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Executive Cabin #104"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 focus:border-[#1ab0bc] outline-none text-sm font-bold"
                />
              </div>

              {/* ── MULTI-IMAGE GALLERY MANAGER ── */}
              <div className="space-y-4 border border-gray-200 p-5 bg-neutral-50/50">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#1ab0bc]" />
                    <span>Product Image Gallery ({imageInputs.length} Images)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddImageInput}
                    className="bg-[#1ab0bc] text-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider hover:bg-teal-600 transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Image URL</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {imageInputs.map((img, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white p-2 border border-gray-200 shadow-sm">
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryImage(idx)}
                        className={`p-1.5 text-[10px] font-bold uppercase flex items-center gap-1 border transition-all ${
                          img.isPrimary
                            ? 'bg-amber-100 text-amber-700 border-amber-300'
                            : 'bg-gray-100 text-gray-400 border-gray-200 hover:text-amber-600'
                        }`}
                        title={img.isPrimary ? "Primary Cover Image" : "Click to set as Primary Cover"}
                      >
                        <Star className={`w-3.5 h-3.5 ${img.isPrimary ? 'fill-amber-500 text-amber-500' : ''}`} />
                        <span>{img.isPrimary ? "PRIMARY" : "COVER"}</span>
                      </button>

                      <input
                        type="text"
                        required
                        placeholder="Image URL (e.g. /IMAGES_SSPACIA/... or upload file)"
                        value={img.url}
                        onChange={e => handleImageChange(idx, e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-gray-300 focus:border-[#1ab0bc] outline-none text-xs font-mono"
                      />

                      <label className="cursor-pointer bg-neutral-100 hover:bg-[#1ab0bc] text-neutral-700 hover:text-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-gray-200 flex items-center gap-1 transition-all">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload File</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(idx, file);
                          }}
                        />
                      </label>

                      {imageInputs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveImageInput(idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all"
                          title="Remove Image"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* ── IMAGE THUMBNAIL PREVIEW GRID ── */}
                {imageInputs.some(img => img.url.trim() !== '') && (
                  <div className="pt-2 border-t border-gray-200">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Live Gallery Previews:</span>
                    <div className="grid grid-cols-4 gap-2">
                      {imageInputs.map((img, idx) => img.url.trim() !== '' && (
                        <div key={idx} className="relative aspect-video bg-neutral-200 border border-gray-300 overflow-hidden group">
                          <img
                            src={img.url}
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                          {img.isPrimary && (
                            <span className="absolute top-1 left-1 bg-amber-500 text-white text-[7px] font-bold px-1.5 py-0.5 uppercase tracking-wider">
                              PRIMARY
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {!editingProduct && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 focus:border-[#1ab0bc] outline-none text-xs font-bold"
                    >
                      <option value="OWNED_SPACE">Owned Space</option>
                      <option value="GUEST_SPACE">Guest Space</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Type</label>
                    <select
                      value={formData.type}
                      onChange={e => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 focus:border-[#1ab0bc] outline-none text-xs font-bold"
                    >
                      <option value="DEDICATED_DESK">Dedicated Desk</option>
                      <option value="PRIVATE_CABIN">Private Cabin</option>
                      <option value="EXECUTIVE_CABIN">Executive Cabin</option>
                      <option value="MEETING_ROOM">Meeting Room</option>
                      <option value="BOARD_ROOM">Board Room</option>
                      <option value="EVENT_SPACE">Event Space</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Seats/Cap.</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.capacity}
                    onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 focus:border-[#1ab0bc] outline-none text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 focus:border-[#1ab0bc] outline-none text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Rate (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 focus:border-[#1ab0bc] outline-none text-sm font-bold"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setEditingProduct(null); }}
                  className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#1ab0bc] text-white px-6 py-2 text-xs font-bold uppercase tracking-wider shadow-md hover:bg-teal-600 transition-all flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingProduct ? 'Update Gallery & Asset' : 'Save Asset'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
