'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Package, Loader2, Plus, Trash2, ChevronDown, Check } from 'lucide-react';
import { toast } from 'sonner';

interface LocationOption {
  id: number;
  name: string;
}

interface ProductImageData {
  id: number;
  url: string;
  isPrimary: boolean;
}

interface Amenity {
  id: number;
  name: string;
  icon: string | null;
}

interface ProductTypeOption {
  id: number;
  name: string;
  displayName: string;
}

interface SpaceCategoryOption {
  id: number;
  name: string;
  displayName: string;
  slug: string;
}

interface AccessTimeOption {
  id: number;
  name: string;
  displayName: string;
}

interface DurationTypeOption {
  id: number;
  name: string;
  displayName: string;
}

interface PricingPlanData {
  id?: number;
  durationType: string;
  price: number;
  oldPrice?: number;
  discount?: number;
  priceType?: 'PER_SEAT' | 'FIXED';
}

interface ProductUnitData {
  id?: number;
  name: string;
  code?: string;
  capacity?: number;
  description?: string;
}

interface ProductToEdit {
  id: number;
  locationId: number;
  location?: { id: number; name: string };
  name: string;
  slug: string;
  type: ProductTypeOption | string;
  category: SpaceCategoryOption | string;
  description?: string;
  accessTime?: AccessTimeOption | string;
  capacity?: number;
  quantity: number;
  sdr?: number;
  adv?: number;
  securityDepositMonths?: number;
  complementaryMeetingHours?: number;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  images?: ProductImageData[];
  amenities?: { amenity: Amenity }[];
  pricingPlans?: PricingPlanData[];
  units?: ProductUnitData[];
}

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: ProductToEdit;
}

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function Label({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-[10px] font-bold text-[#616161] uppercase tracking-widest mb-2 font-sans">
      {children} {required && <span className="text-[var(--primary)]">*</span>}
    </label>
  );
}

const inputClass =
  'w-full px-5 py-4 bg-white border border-[var(--outline-variant)]/40 rounded-none text-sm text-[#1B1B1B] placeholder:text-[#9E9E9E] focus:outline-none focus:border-[var(--primary)] transition-all uppercase font-bold tracking-wider';

const selectClass =
  'w-full px-5 py-4 bg-white border border-[var(--outline-variant)]/40 rounded-none text-sm text-[#1B1B1B] focus:outline-none focus:border-[var(--primary)] transition-all appearance-none cursor-pointer uppercase font-bold tracking-wider';

export function AddProductModal({ isOpen, onClose, onSuccess, product }: AddProductModalProps) {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [productTypes, setProductTypes] = useState<ProductTypeOption[]>([]);
  const [categories, setCategories] = useState<SpaceCategoryOption[]>([]);
  const [accessTimeOptionsList, setAccessTimeOptionsList] = useState<AccessTimeOption[]>([]);
  const [durationTypes, setDurationTypes] = useState<DurationTypeOption[]>([]);
  const [amenitiesOptions, setAmenitiesOptions] = useState<Amenity[]>([]);
  
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const [locationId, setLocationId] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [accessTime, setAccessTime] = useState('');
  const [capacity, setCapacity] = useState('');
  const [quantity, setQuantity] = useState('1');
  
  const [sdr, setSdr] = useState('');
  const [adv, setAdv] = useState('');
  const [securityDepositMonths, setSecurityDepositMonths] = useState('3');
  const [complementaryMeetingHours, setComplementaryMeetingHours] = useState('');
  
  const [pricingPlans, setPricingPlans] = useState<PricingPlanData[]>([]);
  const [units, setUnits] = useState<ProductUnitData[]>([]);
  
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [sortOrder, setSortOrder] = useState('0');

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<ProductImageData[]>([]);
  const [isImageUploading, setIsImageUploading] = useState(false);

  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    setLocationsLoading(true);
    setOptionsLoading(true);

    fetch('/api/admin/locations')
      .then((r) => r.json())
      .then((json) => { if (json.data) setLocations(json.data); })
      .catch(() => {})
      .finally(() => setLocationsLoading(false));

    fetch('/api/admin/config/amenities')
      .then((r) => r.json())
      .then((json) => {
         if (json.data) setAmenitiesOptions(json.data.filter((a: Amenity & { isActive: boolean }) => a.isActive));
      })
      .catch(() => {});

    Promise.all([
      fetch('/api/admin/config/product-types').then(r => r.json()),
      fetch('/api/admin/config/space-categories').then(r => r.json()),
      fetch('/api/admin/config/access-time-options').then(r => r.json()),
      fetch('/api/admin/config/duration-types').then(r => r.json()),
    ]).then(([typesJson, catsJson, accessJson, durationsJson]) => {
      if (typesJson.data) setProductTypes(typesJson.data);
      if (catsJson.data) setCategories(catsJson.data);
      if (accessJson.data) setAccessTimeOptionsList(accessJson.data);
      if (durationsJson.data) setDurationTypes(durationsJson.data);
    }).catch(() => {}).finally(() => setOptionsLoading(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (product) {
      setLocationId(String(product.locationId ?? product.location?.id ?? ''));
      setName(product.name);
      setSlug(product.slug);
      setType(typeof product.type === 'object' ? product.type.name : product.type);
      setCategory(typeof product.category === 'object' ? product.category.name : product.category);
      setDescription(product.description ?? '');
      setAccessTime(typeof product.accessTime === 'object' ? product.accessTime.name : (product.accessTime ?? ''));
      setCapacity(product.capacity?.toString() ?? '');
      setQuantity(String(product.quantity ?? 1));
      setSdr(product.sdr?.toString() ?? '');
      setAdv(product.adv?.toString() ?? '');
      setSecurityDepositMonths(product.securityDepositMonths?.toString() ?? '3');
      setComplementaryMeetingHours(product.complementaryMeetingHours?.toString() ?? '');
      setPricingPlans(product.pricingPlans?.map(p => ({ ...p, durationType: typeof p.durationType === 'object' ? (p.durationType as any).name : p.durationType })) ?? []);
      setUnits(product.units ?? []);
      setIsActive(product.isActive);
      setIsFeatured(product.isFeatured);
      setSortOrder(String(product.sortOrder ?? 0));
      setSelectedAmenities(product.amenities?.map(a => a.amenity.id) || []);
      setSlugManuallyEdited(true);
      setImageFiles([]);
      setImagePreviewUrls([]);
      setExistingImages(product.images ?? []);
    } else {
      setLocationId(''); setName(''); setSlug(''); setType(''); setCategory(''); setDescription(''); setAccessTime(''); setCapacity(''); setQuantity('1'); setSdr(''); setAdv(''); setSecurityDepositMonths('3'); setComplementaryMeetingHours(''); setPricingPlans([]); setUnits([]); setIsActive(true); setIsFeatured(false); setSortOrder('0'); setSelectedAmenities([]); setSlugManuallyEdited(false); setImageFiles([]); setImagePreviewUrls([]); setExistingImages([]);
    }
  }, [isOpen, product]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugManuallyEdited) setSlug(toSlug(val));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setImageFiles(files);
    setImagePreviewUrls(files.map((file) => URL.createObjectURL(file)));
  };

  const handleRemoveExistingImage = async (imageId: number) => {
    if (!product) return;
    try {
      const response = await fetch(`/api/admin/products/${product.id}/images/${imageId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
      toast.success('Image purged.');
    } catch {
      toast.error('Purge failed.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationId || !name || !slug || !type || !category) {
      toast.error('Required asset parameters missing.');
      return;
    }
    setIsSubmitting(true);
    try {
      const uploadedImageUrls = imageFiles.length ? await (async () => {
        setIsImageUploading(true);
        const urls = await Promise.all(imageFiles.map(async (file) => {
          const formData = new FormData(); formData.append('file', file);
          const res = await fetch('/api/admin/upload-image', { method: 'POST', body: formData });
          const json = await res.json(); if (!res.ok) throw new Error();
          return json.data.url as string;
        }));
        setIsImageUploading(false); return urls;
      })() : [];

      const body = {
        locationId: Number(locationId), name, slug, type, category, description: description || undefined, accessTime: accessTime || undefined, capacity: capacity ? Number(capacity) : undefined, quantity: quantity ? Number(quantity) : 1, sdr: sdr ? Number(sdr) : undefined, adv: adv ? Number(adv) : undefined, securityDepositMonths: Number(securityDepositMonths), complementaryMeetingHours: complementaryMeetingHours ? Number(complementaryMeetingHours) : undefined, isActive, isFeatured, sortOrder: sortOrder ? Number(sortOrder) : 0, amenityIds: selectedAmenities,
        pricingPlans: pricingPlans.filter(p => p.durationType && p.price > 0).map(p => ({ ...p, priceType: p.priceType || 'PER_SEAT' })),
        units: units.filter(u => u.name).map(u => ({ ...u, capacity: Number(u.capacity) || 1 })),
      };

      const method = product ? 'PATCH' : 'POST';
      const url = product ? `/api/admin/products/${product.id}` : '/api/admin/products';
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error);

      if (json.data?.id && uploadedImageUrls.length > 0) {
        await Promise.all(uploadedImageUrls.map((url, i) => fetch(`/api/admin/products/${json.data.id}/images`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, isPrimary: existingImages.length === 0 && i === 0, sortOrder: existingImages.length + i }) })));
      }

      toast.success(`Asset ${product ? 'updated' : 'initialized'}: ${name}`);
      onSuccess(); onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'System modification failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategorySlug = categories.find(c => c.name === category)?.slug;
  const isOwnedSpace = selectedCategorySlug === 'owned-space' || category === 'WORKSPACE';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-10">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-md" />

          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 350 }} className="relative flex flex-col w-full max-w-5xl bg-white rounded-none border border-white/10 shadow-2xl overflow-hidden max-h-[90vh]">
             <div className="absolute top-0 left-0 w-full h-1 bg-[var(--primary)]" />
             
            <div className="flex items-center justify-between px-10 py-8 border-b border-[var(--outline-variant)]/20 flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white text-[var(--primary)] border border-[var(--outline-variant)]/40 shadow-xl">
                  <Package size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-sans font-bold text-[#1B1C1C] uppercase tracking-tight">{product ? 'Update Product' : 'Add New Product'}</h2>
                  <p className="text-[10px] text-[#616161] font-medium uppercase tracking-widest mt-1 opacity-60">Complete the details below to register the asset</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-[#9E9E9E] hover:text-[#1B1B1B] hover:bg-neutral-100 transition-colors"><X size={20} /></button>
            </div>

            <div ref={bodyRef} className="flex-1 overflow-y-auto px-10 py-10 space-y-10 custom-scrollbar font-sans">
              <form id="add-product-form" onSubmit={handleSubmit} className="space-y-10">
                
                {/* ── Basic Info ── */}
                <section className="space-y-6">
                  <div className="flex items-center gap-4 border-b border-[var(--outline-variant)]/20 pb-4">
                     <span className="text-[11px] font-bold text-[#1B1C1C] uppercase tracking-widest">Basic Information</span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <Label htmlFor="locationId" required>Location</Label>
                       <div className="relative">
                         <select id="locationId" value={locationId} onChange={(e) => setLocationId(e.target.value)} className={selectClass} required>
                           <option value="">Select Location</option>
                           {locations.map((loc) => (<option key={loc.id} value={loc.id}>{loc.name}</option>))}
                         </select>
                         <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9E9E9E] pointer-events-none" />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <Label htmlFor="name" required>Product Name</Label>
                       <input id="name" type="text" value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Dedicated Cabin A" className={inputClass} required />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                       <Label htmlFor="type" required>Product Type</Label>
                       <div className="relative">
                         <select id="type" value={type} onChange={(e) => setType(e.target.value)} className={selectClass} required>
                           <option value="">Select Type</option>
                           {productTypes.map((opt) => (<option key={opt.id} value={opt.name}>{opt.displayName}</option>))}
                         </select>
                         <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9E9E9E] pointer-events-none" />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <Label htmlFor="category" required>Category</Label>
                       <div className="relative">
                         <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass} required>
                           <option value="">Select Category</option>
                           {categories.map((opt) => (<option key={opt.id} value={opt.name}>{opt.displayName}</option>))}
                         </select>
                         <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9E9E9E] pointer-events-none" />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <Label htmlFor="accessTime">Access Time</Label>
                       <div className="relative">
                         <select id="accessTime" value={accessTime} onChange={(e) => setAccessTime(e.target.value)} className={selectClass}>
                           <option value="">Select Access Time</option>
                           {accessTimeOptionsList.map((opt) => (<option key={opt.id} value={opt.name}>{opt.displayName}</option>))}
                         </select>
                         <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9E9E9E] pointer-events-none" />
                       </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-2">
                       <Label htmlFor="capacity">Capacity (Seats)</Label>
                       <input 
                         id="capacity" 
                         type="number" 
                         value={capacity} 
                         onChange={(e) => setCapacity(e.target.value)} 
                         placeholder="0" 
                         className={inputClass} 
                       />
                    </div>
                    <div className="space-y-2">
                       <Label htmlFor="quantity">Quantity</Label>
                       <input 
                         id="quantity" 
                         type="number" 
                         value={quantity} 
                         onChange={(e) => setQuantity(e.target.value)} 
                         placeholder="1" 
                         className={inputClass} 
                       />
                    </div>
                  </div>
                </section>

                {/* ── Images ── */}
                <section className="space-y-6">
                   <div className="flex items-center gap-4 border-b border-[var(--outline-variant)]/20 pb-4">
                     <span className="text-[11px] font-bold text-[#1B1C1C] uppercase tracking-widest">Product Images</span>
                  </div>
                  
                  <div className="grid md:grid-cols-4 gap-4">
                     <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[var(--outline-variant)]/40 hover:border-[var(--primary)] transition-all cursor-pointer bg-neutral-50/50 group">
                        <Plus size={24} className="text-[#9E9E9E] group-hover:text-[var(--primary)] mb-2" />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-[#9E9E9E]">Add Image</span>
                        <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                     </label>
                     {existingImages.map((img) => (
                       <div key={img.id} className="relative aspect-square border border-[var(--outline-variant)]/40 overflow-hidden group">
                         <img src={img.url} className="w-full h-full object-cover" alt="prev" />
                         <button type="button" onClick={() => handleRemoveExistingImage(img.id)} className="absolute top-2 right-2 p-1.5 bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"><X size={14} /></button>
                       </div>
                     ))}
                     {imagePreviewUrls.map((url, i) => (
                       <div key={i} className="relative aspect-square border border-[var(--outline-variant)]/40 overflow-hidden group">
                         <img src={url} className="w-full h-full object-cover" alt="prev" />
                         <button type="button" onClick={() => { setImageFiles(p => p.filter((_, idx) => idx !== i)); setImagePreviewUrls(p => p.filter((_, idx) => idx !== i)); }} className="absolute top-2 right-2 p-1.5 bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"><X size={14} /></button>
                       </div>
                     ))}
                  </div>
                </section>

                {/* ── Pricing ── */}
                <section className="space-y-6">
                   <div className="flex items-center justify-between border-b border-[var(--outline-variant)]/20 pb-4">
                     <span className="text-[11px] font-bold text-[#1B1C1C] uppercase tracking-widest">Pricing Details</span>
                     <button type="button" onClick={() => setPricingPlans(p => [...p, { durationType: '', price: 0, priceType: 'PER_SEAT' }])} className="text-[9px] font-bold text-[var(--primary)] uppercase tracking-widest hover:underline">+ Add Plan</button>
                  </div>
                  
                  <div className="space-y-4">
                    {pricingPlans.map((plan, i) => (
                      <div key={i} className="grid md:grid-cols-4 gap-4 items-end bg-neutral-50/50 p-6 border border-[var(--outline-variant)]/20">
                         <div className="space-y-2">
                            <Label htmlFor={`dur-${i}`}>Duration</Label>
                            <select value={plan.durationType} onChange={(e) => setPricingPlans(prev => prev.map((p, idx) => idx === i ? { ...p, durationType: e.target.value } : p))} className={selectClass}>
                               <option value="">Select</option>
                               {durationTypes.map(d => <option key={d.id} value={d.name}>{d.displayName}</option>)}
                            </select>
                         </div>
                         <div className="space-y-2">
                            <Label htmlFor={`pr-${i}`}>Price (₹)</Label>
                            <input type="number" value={plan.price} onChange={(e) => setPricingPlans(prev => prev.map((p, idx) => idx === i ? { ...p, price: Number(e.target.value) } : p))} className={inputClass} />
                         </div>
                         <div className="space-y-2">
                            <Label htmlFor={`ty-${i}`}>Price Type</Label>
                            <select value={plan.priceType || 'PER_SEAT'} onChange={(e) => setPricingPlans(prev => prev.map((p, idx) => idx === i ? { ...p, priceType: e.target.value as any } : p))} className={selectClass}>
                               <option value="PER_SEAT">Per Seat</option>
                               <option value="FIXED">Fixed</option>
                            </select>
                         </div>
                         <button type="button" onClick={() => setPricingPlans(p => p.filter((_, idx) => idx !== i))} className="mb-4 text-red-500 hover:text-red-700 font-bold text-[9px] uppercase tracking-widest text-right">Remove</button>
                      </div>
                    ))}
                  </div>
                </section>

                {/* ── Amenities ── */}
                <section className="space-y-6">
                   <div className="flex items-center gap-4 border-b border-[var(--outline-variant)]/20 pb-4">
                     <span className="text-[11px] font-bold text-[#1B1C1C] uppercase tracking-widest">Amenities</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     {amenitiesOptions.map((amenity) => {
                       const isSelected = selectedAmenities.includes(amenity.id);
                       return (
                         <button key={amenity.id} type="button" onClick={() => setSelectedAmenities(p => isSelected ? p.filter(id => id !== amenity.id) : [...p, amenity.id])} className={`flex items-center justify-between p-4 border transition-all ${isSelected ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-white text-[#616161] border-[var(--outline-variant)]/40 hover:border-[var(--primary)]/60'}`}>
                           <span className="text-[10px] font-bold uppercase tracking-widest truncate">{amenity.name}</span>
                           {isSelected && <Check size={14} className="text-white shrink-0" />}
                         </button>
                       );
                     })}
                  </div>
                </section>

                {/* ── Status ── */}
                <section className="space-y-6">
                   <div className="flex items-center gap-4 border-b border-[var(--outline-variant)]/20 pb-4">
                     <span className="text-[11px] font-bold text-[#1B1C1C] uppercase tracking-widest">Status</span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div onClick={() => setIsActive(!isActive)} className="flex items-center justify-between p-6 bg-neutral-50 border border-[var(--outline-variant)]/40 cursor-pointer group hover:border-[var(--primary)]/60 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`h-3 w-3 ${isActive ? 'bg-[#4DB6AC]' : 'bg-red-400'} shadow-[0_0_8px_currentColor]`} />
                        <div><p className="text-[11px] font-bold text-[#1B1C1C] uppercase tracking-widest">Active Product</p></div>
                      </div>
                      <div className={`w-12 h-6 p-1 bg-neutral-300 transition-colors ${isActive ? 'bg-[var(--primary)]' : ''}`}><div className={`w-4 h-4 bg-white shadow-sm transition-transform ${isActive ? 'translate-x-6' : ''}`} /></div>
                    </div>
                    <div onClick={() => setIsFeatured(!isFeatured)} className="flex items-center justify-between p-6 bg-neutral-50 border border-[var(--outline-variant)]/40 cursor-pointer group hover:border-[var(--primary)]/60 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`h-3 w-3 ${isFeatured ? 'text-[var(--primary)]' : 'text-neutral-400'} fill-current`}><Check size={12} /></div>
                        <div><p className="text-[11px] font-bold text-[#1B1C1C] uppercase tracking-widest">Featured Product</p></div>
                      </div>
                      <div className={`w-12 h-6 p-1 bg-neutral-300 transition-colors ${isFeatured ? 'bg-[var(--primary)]' : ''}`}><div className={`w-4 h-4 bg-white shadow-sm transition-transform ${isFeatured ? 'translate-x-6' : ''}`} /></div>
                    </div>
                  </div>
                </section>
              </form>
            </div>

            <div className="flex items-center justify-end gap-0 px-0 py-0 border-t border-[var(--outline-variant)]/20 bg-neutral-50 flex-shrink-0">
              <button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 py-6 text-[10px] font-bold text-[#616161] uppercase tracking-[0.3em] hover:bg-neutral-100 transition-all border-r border-[var(--outline-variant)]/20 disabled:opacity-50">Cancel</button>
              <button type="submit" form="add-product-form" disabled={isSubmitting} className="flex-[2] py-6 bg-[var(--primary)] text-white font-bold text-[10px] uppercase tracking-[0.3em] hover:bg-neutral-900 transition-all disabled:opacity-60">{isSubmitting ? <><Loader2 size={16} className="animate-spin inline mr-3" />Updating Registry...</> : <><Package size={16} className="inline mr-3" />{product ? 'Save Changes' : 'Add Product'}</>}</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
