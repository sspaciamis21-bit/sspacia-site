'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Package, 
  Loader2, 
  Plus, 
  Trash2, 
  ChevronDown, 
  Check, 
  Star, 
  Upload, 
  Sparkles,
  Layers,
  Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';

interface LocationOption {
  id: number;
  name: string;
}

interface ProductImageData {
  id: number;
  url: string;
  isPrimary: boolean;
  alt?: string;
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

// Pre-available curated SSPACIA workspace images library
const SSPACIA_LIBRARY_PRESETS = [
  { label: 'Premier House - Reception', url: '/IMAGES_SSPACIA/PREMIER HOUSE/Reception.JPG' },
  { label: 'Premier House - Event Room', url: '/IMAGES_SSPACIA/PREMIER HOUSE/Event_Room.JPG' },
  { label: 'Premier House - Director Cabin', url: '/IMAGES_SSPACIA/PREMIER HOUSE/Director_Cabin.JPG' },
  { label: 'Premier House - Open Work Space', url: '/IMAGES_SSPACIA/PREMIER HOUSE/Open_Work_Space.JPG' },
  { label: 'Mercado - Reception', url: '/IMAGES_SSPACIA/MERCADO IMAGES/Reception.jpg' },
  { label: 'Mercado - Meeting Room', url: '/IMAGES_SSPACIA/MERCADO IMAGES/Meeting_Room.jpg' },
  { label: 'Mercado - Executive Lounge', url: '/IMAGES_SSPACIA/MERCADO IMAGES/Executive_Lounge.jpg' },
  { label: 'Mercado - Dedicated Cabin', url: '/IMAGES_SSPACIA/MERCADO IMAGES/Dedicated_Cabin.jpg' },
  { label: 'Agarwal - Meeting Room', url: '/IMAGES_SSPACIA/AGARWAL IMAGES/Meeting_Room_1.jpg' },
  { label: 'Agarwal - Reception Lounge', url: '/IMAGES_SSPACIA/AGARWAL IMAGES/Reception.jpg' },
  { label: 'Agarwal - Flexible Workspace', url: '/IMAGES_SSPACIA/AGARWAL IMAGES/Flexible_Workspace.jpg' },
];

function Label({ htmlFor, children, required }: { htmlFor?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-[10px] font-bold text-[#616161] uppercase tracking-widest mb-2 font-sans">
      {children} {required && <span className="text-[var(--primary)]">*</span>}
    </label>
  );
}

const inputClass =
  'w-full px-5 py-4 bg-white border border-[var(--outline-variant)]/40 rounded-none text-sm text-[#1B1B1B] placeholder:text-[#9E9E9E] focus:outline-none focus:border-[var(--primary)] transition-all font-medium';

const selectClass =
  'w-full px-5 py-4 bg-white border border-[var(--outline-variant)]/40 rounded-none text-sm text-[#1B1B1B] focus:outline-none focus:border-[var(--primary)] transition-all appearance-none cursor-pointer font-medium';

export function AddProductModal({ isOpen, onClose, onSuccess, product }: AddProductModalProps) {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [productTypes, setProductTypes] = useState<ProductTypeOption[]>([]);
  const [categories, setCategories] = useState<SpaceCategoryOption[]>([]);
  const [accessTimeOptionsList, setAccessTimeOptionsList] = useState<AccessTimeOption[]>([]);
  const [durationTypes, setDurationTypes] = useState<DurationTypeOption[]>([]);
  const [amenitiesOptions, setAmenitiesOptions] = useState<Amenity[]>([]);
  
  const [selectedAmenities, setSelectedAmenities] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState('');

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
  const [newPresetImages, setNewPresetImages] = useState<string[]>([]);

  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/admin/locations')
      .then((r) => r.json())
      .then((json) => { if (json.data) setLocations(json.data); })
      .catch(() => {});

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
    }).catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (product) {
      setLocationId(String(product.locationId ?? product.location?.id ?? ''));
      setName(product.name || '');
      setSlug(product.slug || '');
      setType(typeof product.type === 'object' ? product.type.name : product.type || '');
      setCategory(typeof product.category === 'object' ? product.category.name : product.category || '');
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
      setIsActive(product.isActive ?? true);
      setIsFeatured(product.isFeatured ?? false);
      setSortOrder(String(product.sortOrder ?? 0));
      setSelectedAmenities(product.amenities?.map(a => a.amenity.id) || []);
      setSlugManuallyEdited(true);
      setImageFiles([]);
      setImagePreviewUrls([]);
      setNewPresetImages([]);
      setExistingImages(product.images ?? []);

      // Fetch fresh, complete details including all pre-available images from server
      fetch(`/api/admin/products/${product.id}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.data) {
            const p = json.data;
            if (p.images && p.images.length > 0) {
              setExistingImages(p.images);
            }
            if (p.amenities && p.amenities.length > 0) {
              setSelectedAmenities(p.amenities.map((a: any) => a.amenity.id));
            }
            if (p.pricingPlans && p.pricingPlans.length > 0) {
              setPricingPlans(p.pricingPlans.map((pl: any) => ({
                ...pl,
                durationType: typeof pl.durationType === 'object' ? pl.durationType?.name : pl.durationType
              })));
            }
            if (p.units && p.units.length > 0) {
              setUnits(p.units);
            }
          }
        })
        .catch((err) => console.error('Fetch product detail failed:', err));

    } else {
      setLocationId('');
      setName('');
      setSlug('');
      setType('');
      setCategory('');
      setDescription('');
      setAccessTime('');
      setCapacity('');
      setQuantity('1');
      setSdr('');
      setAdv('');
      setSecurityDepositMonths('3');
      setComplementaryMeetingHours('');
      setPricingPlans([]);
      setUnits([]);
      setIsActive(true);
      setIsFeatured(false);
      setSortOrder('0');
      setSelectedAmenities([]);
      setSlugManuallyEdited(false);
      setImageFiles([]);
      setImagePreviewUrls([]);
      setNewPresetImages([]);
      setExistingImages([]);
    }
  }, [isOpen, product]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugManuallyEdited) setSlug(toSlug(val));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setImageFiles(prev => [...prev, ...files]);
    setImagePreviewUrls(prev => [...prev, ...files.map((file) => URL.createObjectURL(file))]);
  };

  const handleAddPresetImage = (url: string) => {
    if (existingImages.some(img => img.url === url) || newPresetImages.includes(url)) {
      toast.info('Image already added');
      return;
    }
    setNewPresetImages(prev => [...prev, url]);
    toast.success('Image added from library');
  };

  const handleAddCustomImageUrl = () => {
    if (!customImageUrl.trim()) return;
    const trimmed = customImageUrl.trim();
    if (existingImages.some(img => img.url === trimmed) || newPresetImages.includes(trimmed)) {
      toast.info('Image URL already added');
      return;
    }
    setNewPresetImages(prev => [...prev, trimmed]);
    setCustomImageUrl('');
    toast.success('Custom image URL added');
  };

  const handleSetPrimaryExistingImage = async (imageId: number) => {
    if (!product?.id) {
      setExistingImages(prev => prev.map(img => ({ ...img, isPrimary: img.id === imageId })));
      return;
    }

    try {
      const res = await fetch(`/api/admin/products/${product.id}/images/${imageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrimary: true }),
      });

      if (!res.ok) throw new Error();
      setExistingImages(prev => prev.map(img => ({ ...img, isPrimary: img.id === imageId })));
      toast.success('Set as primary cover image');
    } catch {
      toast.error('Failed to update primary image');
    }
  };

  const handleRemoveExistingImage = async (imageId: number) => {
    if (!product?.id) {
      setExistingImages(prev => prev.filter(img => img.id !== imageId));
      return;
    }
    try {
      const response = await fetch(`/api/admin/products/${product.id}/images/${imageId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
      toast.success('Image removed.');
    } catch {
      toast.error('Failed to delete image.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationId || !name || !slug || !type || !category) {
      toast.error('Required parameters missing: Location, Name, Slug, Type, Category.');
      return;
    }
    setIsSubmitting(true);
    try {
      // 1. Upload local file images
      const uploadedFileUrls = imageFiles.length ? await (async () => {
        const urls = await Promise.all(imageFiles.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch('/api/admin/upload-image', { method: 'POST', body: formData });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || 'Upload failed');
          return json.data.url as string;
        }));
        return urls;
      })() : [];

      const allNewImageUrls = [...newPresetImages, ...uploadedFileUrls];

      const body = {
        locationId: Number(locationId),
        name,
        slug,
        type,
        category,
        description: description || undefined,
        accessTime: accessTime || undefined,
        capacity: capacity ? Number(capacity) : undefined,
        quantity: quantity ? Number(quantity) : 1,
        sdr: sdr ? Number(sdr) : undefined,
        adv: adv ? Number(adv) : undefined,
        securityDepositMonths: Number(securityDepositMonths),
        complementaryMeetingHours: complementaryMeetingHours ? Number(complementaryMeetingHours) : undefined,
        isActive,
        isFeatured,
        sortOrder: sortOrder ? Number(sortOrder) : 0,
        amenityIds: selectedAmenities,
        pricingPlans: pricingPlans.filter(p => p.durationType && p.price > 0).map(p => ({ ...p, priceType: p.priceType || 'PER_SEAT' })),
        units: units.filter(u => u.name).map(u => ({ ...u, capacity: Number(u.capacity) || 1 })),
      };

      const method = product ? 'PATCH' : 'POST';
      const url = product ? `/api/admin/products/${product.id}` : '/api/admin/products';
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Request failed');

      const targetProductId = product?.id || json.data?.id;

      // 2. Attach new image URLs to product
      if (targetProductId && allNewImageUrls.length > 0) {
        await Promise.all(allNewImageUrls.map((imgUrl, i) =>
          fetch(`/api/admin/products/${targetProductId}/images`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: imgUrl,
              isPrimary: existingImages.length === 0 && i === 0,
              sortOrder: existingImages.length + i,
            }),
          })
        ));
      }

      toast.success(`Product ${product ? 'updated' : 'registered'} successfully: ${name}`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 md:p-6 lg:p-8 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 360 }}
            className="relative flex flex-col w-full max-w-6xl bg-white border border-gray-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] z-10"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-[var(--primary)]" />
             
            <div className="flex items-center justify-between px-6 sm:px-10 py-5 sm:py-6 border-b border-gray-200 bg-white flex-shrink-0">
              <div className="flex items-center gap-3.5 sm:gap-4">
                <div className="p-2.5 sm:p-3 bg-[#006064]/5 text-[#006064] border border-[#006064]/20 shadow-xs">
                  <Package size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-display font-bold text-[#1B1C1C] uppercase tracking-tight">
                      {product ? `Edit Product Details: ${product.name}` : 'Register New Workspace Product'}
                    </h2>
                    <span className="text-[9px] font-black uppercase tracking-wider bg-[#1ab0bc]/10 text-[#006064] px-2.5 py-0.5 border border-[#1ab0bc]/20">
                      Super Admin
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium uppercase tracking-widest mt-0.5">
                    Modify centre specifications, pricing plans, amenities, and image gallery
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                title="Close Modal"
              >
                <X size={20} />
              </button>
            </div>

            <div ref={bodyRef} className="flex-1 overflow-y-auto px-6 sm:px-10 py-6 sm:py-8 space-y-8 custom-scrollbar font-sans bg-white">
              <form id="add-product-form" onSubmit={handleSubmit} className="space-y-8">
                
                {/* ── 1. Basic & Center Info ── */}
                <section className="space-y-6">
                  <div className="flex items-center justify-between border-b border-[var(--outline-variant)]/20 pb-4">
                     <span className="text-[11px] font-bold text-[#1B1C1C] uppercase tracking-widest flex items-center gap-2">
                       <Layers size={14} className="text-[var(--primary)]" />
                       <span>Centre &amp; Classification</span>
                     </span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <Label htmlFor="locationId" required>Centre / Location Node</Label>
                       <div className="relative">
                         <select id="locationId" value={locationId} onChange={(e) => setLocationId(e.target.value)} className={selectClass} required>
                           <option value="">Select Centre</option>
                           {locations.map((loc) => (<option key={loc.id} value={loc.id}>{loc.name}</option>))}
                         </select>
                         <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9E9E9E] pointer-events-none" />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <Label htmlFor="name" required>Product Name</Label>
                       <input id="name" type="text" value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Dedicated Cabin A @ Premier House" className={inputClass} required />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                       <Label htmlFor="type" required>Product Type</Label>
                       <div className="relative">
                         <select id="type" value={type} onChange={(e) => setType(e.target.value)} className={selectClass} required>
                           <option value="">Select Product Type</option>
                           {productTypes.map((opt) => (<option key={opt.id} value={opt.name}>{opt.displayName}</option>))}
                         </select>
                         <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9E9E9E] pointer-events-none" />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <Label htmlFor="category" required>Space Category</Label>
                       <div className="relative">
                         <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass} required>
                           <option value="">Select Space Category</option>
                           {categories.map((opt) => (<option key={opt.id} value={opt.name}>{opt.displayName}</option>))}
                         </select>
                         <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9E9E9E] pointer-events-none" />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <Label htmlFor="accessTime">Access Timing</Label>
                       <div className="relative">
                         <select id="accessTime" value={accessTime} onChange={(e) => setAccessTime(e.target.value)} className={selectClass}>
                           <option value="">Select Access Timing</option>
                           {accessTimeOptionsList.map((opt) => (<option key={opt.id} value={opt.name}>{opt.displayName}</option>))}
                         </select>
                         <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9E9E9E] pointer-events-none" />
                       </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6 pt-2">
                    <div className="space-y-2">
                       <Label htmlFor="slug" required>Product URL Slug</Label>
                       <input id="slug" type="text" value={slug} onChange={(e) => { setSlug(e.target.value); setSlugManuallyEdited(true); }} className={inputClass} required />
                    </div>
                    <div className="space-y-2">
                       <Label htmlFor="capacity">Seating Capacity (Pax)</Label>
                       <input id="capacity" type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="e.g. 10" className={inputClass} />
                    </div>
                    <div className="space-y-2">
                       <Label htmlFor="quantity">Available Units / Quantity</Label>
                       <input id="quantity" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="1" className={inputClass} />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <Label htmlFor="description">Product Description</Label>
                    <textarea
                      id="description"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter detailed description of this workspace asset..."
                      className="w-full px-5 py-4 bg-white border border-[var(--outline-variant)]/40 rounded-none text-sm text-[#1B1B1B] focus:outline-none focus:border-[var(--primary)]"
                    />
                  </div>
                </section>

                {/* ── 2. Pre-Available Images & Gallery Manager ── */}
                <section className="space-y-6">
                   <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--outline-variant)]/20 pb-4 gap-3">
                     <div>
                       <span className="text-[11px] font-bold text-[#1B1C1C] uppercase tracking-widest flex items-center gap-2">
                         <ImageIcon size={14} className="text-[var(--primary)]" />
                         <span>Pre-Available Photos &amp; Image Gallery</span>
                       </span>
                       <p className="text-[10px] text-gray-500 font-normal mt-0.5">
                         All active photos for this space. Click Star to make an image the primary cover photo.
                       </p>
                     </div>

                     <div className="flex gap-2">
                       <button
                         type="button"
                         onClick={() => setShowLibraryPicker(!showLibraryPicker)}
                         className="text-[10px] font-bold uppercase tracking-wider bg-neutral-100 hover:bg-[#1ab0bc] hover:text-white px-3 py-2 border border-gray-200 transition-colors cursor-pointer flex items-center gap-1.5"
                       >
                         <Sparkles size={12} />
                         <span>{showLibraryPicker ? 'Hide Library' : 'Choose Preset'}</span>
                       </button>
                     </div>
                  </div>

                  {/* Preset Library Picker Drawer */}
                  {showLibraryPicker && (
                    <div className="bg-neutral-50 p-4 border border-neutral-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-700">
                          SSPACIA High-Res Photography Library
                        </span>
                        <span className="text-[9px] text-gray-500">Click any image to add to this product</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {SSPACIA_LIBRARY_PRESETS.map((preset, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleAddPresetImage(preset.url)}
                            className="group relative border border-gray-200 bg-white cursor-pointer hover:border-[#1ab0bc] transition-all overflow-hidden"
                          >
                            <div className="relative aspect-video w-full">
                              <img src={preset.url} alt={preset.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            </div>
                            <div className="p-1.5 bg-white text-[9px] font-bold text-gray-800 truncate">
                              {preset.label}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upload & Add Direct URL */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <label className="flex-1 flex items-center justify-center gap-2 p-3.5 border-2 border-dashed border-[var(--outline-variant)]/40 hover:border-[var(--primary)] transition-all cursor-pointer bg-neutral-50/50 group">
                      <Upload size={16} className="text-[#9E9E9E] group-hover:text-[var(--primary)]" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#9E9E9E] group-hover:text-black">
                        Upload Files (Multi-Select)
                      </span>
                      <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                    </label>

                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={customImageUrl}
                        onChange={(e) => setCustomImageUrl(e.target.value)}
                        placeholder="Paste image path or URL (e.g. /IMAGES_SSPACIA/...)"
                        className="flex-1 px-3 py-2 text-xs border border-gray-300 outline-none focus:border-[#1ab0bc]"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomImageUrl}
                        className="px-4 bg-neutral-800 hover:bg-[#1ab0bc] text-white text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Add URL
                      </button>
                    </div>
                  </div>

                  {/* Active Gallery Thumbnails Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {/* Existing Saved Images */}
                    {existingImages.map((img, idx) => (
                      <div key={img.id ?? `existing-${img.url || 'img'}-${idx}`} className={`relative aspect-square border-2 overflow-hidden group ${img.isPrimary ? 'border-[#1ab0bc] shadow-md' : 'border-gray-200'}`}>
                        <img src={img.url} className="w-full h-full object-cover" alt="space photo" />
                        
                        {/* Primary Badge / Action */}
                        <div className="absolute top-1.5 left-1.5 z-10">
                          {img.isPrimary ? (
                            <span className="bg-[#1ab0bc] text-white text-[8px] font-black uppercase px-2 py-0.5 shadow-sm">
                              PRIMARY
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryExistingImage(img.id)}
                              className="bg-black/70 hover:bg-[#1ab0bc] text-white text-[8px] font-bold uppercase px-2 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 cursor-pointer"
                              title="Make Primary Cover"
                            >
                              <Star size={10} /> Set Primary
                            </button>
                          )}
                        </div>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingImage(img.id)}
                          className="absolute top-1.5 right-1.5 p-1 bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 cursor-pointer"
                          title="Remove Image"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}

                    {/* Newly Added Preset Images */}
                    {newPresetImages.map((url, i) => (
                      <div key={`preset-${i}`} className="relative aspect-square border-2 border-emerald-400 overflow-hidden group">
                        <img src={url} className="w-full h-full object-cover" alt="new preset" />
                        <span className="absolute top-1.5 left-1.5 bg-emerald-600 text-white text-[7px] font-bold uppercase px-1.5 py-0.5">
                          New Added
                        </span>
                        <button
                          type="button"
                          onClick={() => setNewPresetImages(p => p.filter((_, idx) => idx !== i))}
                          className="absolute top-1.5 right-1.5 p-1 bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}

                    {/* Local Selected Upload Previews */}
                    {imagePreviewUrls.map((url, i) => (
                      <div key={`local-${i}`} className="relative aspect-square border-2 border-indigo-400 overflow-hidden group">
                        <img src={url} className="w-full h-full object-cover" alt="local upload" />
                        <span className="absolute top-1.5 left-1.5 bg-indigo-600 text-white text-[7px] font-bold uppercase px-1.5 py-0.5">
                          Upload Pending
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setImageFiles(p => p.filter((_, idx) => idx !== i));
                            setImagePreviewUrls(p => p.filter((_, idx) => idx !== i));
                          }}
                          className="absolute top-1.5 right-1.5 p-1 bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                {/* ── 3. Pricing Plans ── */}
                <section className="space-y-6">
                   <div className="flex items-center justify-between border-b border-[var(--outline-variant)]/20 pb-4">
                     <span className="text-[11px] font-bold text-[#1B1C1C] uppercase tracking-widest">
                       Pricing Plans &amp; Rates (₹)
                     </span>
                     <button
                       type="button"
                       onClick={() => setPricingPlans(p => [...p, { durationType: 'PER_MONTH', price: 10000, priceType: 'PER_SEAT' }])}
                       className="text-[10px] font-bold text-[#006064] uppercase tracking-widest hover:underline cursor-pointer flex items-center gap-1"
                     >
                       <Plus size={12} /> Add Pricing Tier
                     </button>
                  </div>
                  
                  <div className="space-y-4">
                    {pricingPlans.length === 0 ? (
                      <div className="p-6 bg-neutral-50 border border-neutral-200 text-center text-xs text-gray-500">
                        No pricing tiers configured. Click &quot;+ Add Pricing Tier&quot; to configure Hourly, Daily, or Monthly rates.
                      </div>
                    ) : (
                      pricingPlans.map((plan, i) => (
                        <div key={plan.id ?? `plan-${plan.durationType || 'dur'}-${i}`} className="grid md:grid-cols-4 gap-4 items-end bg-neutral-50/50 p-4 border border-[var(--outline-variant)]/20">
                           <div className="space-y-1.5">
                              <Label htmlFor={`dur-${i}`}>Duration</Label>
                              <div className="relative">
                                <select
                                  value={plan.durationType}
                                  onChange={(e) => setPricingPlans(prev => prev.map((p, idx) => idx === i ? { ...p, durationType: e.target.value } : p))}
                                  className={selectClass}
                                >
                                   <option value="">Select Duration</option>
                                   {durationTypes.map(d => <option key={d.id} value={d.name}>{d.displayName}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9E9E9E] pointer-events-none" />
                              </div>
                           </div>
                           <div className="space-y-1.5">
                              <Label htmlFor={`pr-${i}`}>Price (₹ INR)</Label>
                              <input
                                type="number"
                                value={plan.price}
                                onChange={(e) => setPricingPlans(prev => prev.map((p, idx) => idx === i ? { ...p, price: Number(e.target.value) } : p))}
                                className={inputClass}
                              />
                           </div>
                           <div className="space-y-1.5">
                              <Label htmlFor={`ty-${i}`}>Price Model</Label>
                              <div className="relative">
                                <select
                                  value={plan.priceType || 'PER_SEAT'}
                                  onChange={(e) => setPricingPlans(prev => prev.map((p, idx) => idx === i ? { ...p, priceType: e.target.value as any } : p))}
                                  className={selectClass}
                                >
                                   <option value="PER_SEAT">Per Seat / Per Slot</option>
                                   <option value="FIXED">Fixed Room / Entire Space</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9E9E9E] pointer-events-none" />
                              </div>
                           </div>
                           <button
                             type="button"
                             onClick={() => setPricingPlans(p => p.filter((_, idx) => idx !== i))}
                             className="p-3 text-red-500 hover:text-red-700 font-bold text-[10px] uppercase tracking-widest text-right flex items-center justify-end gap-1 cursor-pointer"
                           >
                             <Trash2 size={14} /> Remove
                           </button>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                {/* ── 4. Space Amenities ── */}
                <section className="space-y-6">
                   <div className="flex items-center gap-4 border-b border-[var(--outline-variant)]/20 pb-4">
                     <span className="text-[11px] font-bold text-[#1B1C1C] uppercase tracking-widest">
                       Included Space Amenities
                     </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                     {amenitiesOptions.map((amenity) => {
                       const isSelected = selectedAmenities.includes(amenity.id);
                       return (
                         <button
                           key={amenity.id}
                           type="button"
                           onClick={() => setSelectedAmenities(p => isSelected ? p.filter(id => id !== amenity.id) : [...p, amenity.id])}
                           className={`flex items-center justify-between p-3.5 border transition-all cursor-pointer ${
                             isSelected ? 'bg-[#006064] text-white border-[#006064]' : 'bg-white text-[#616161] border-[var(--outline-variant)]/40 hover:border-[#006064]/60'
                           }`}
                         >
                           <span className="text-[10px] font-bold uppercase tracking-wider truncate">{amenity.name}</span>
                           {isSelected && <Check size={14} className="text-white shrink-0" />}
                         </button>
                       );
                     })}
                  </div>
                </section>

                {/* ── 5. Status & Featured ── */}
                <section className="space-y-6">
                   <div className="flex items-center gap-4 border-b border-[var(--outline-variant)]/20 pb-4">
                     <span className="text-[11px] font-bold text-[#1B1C1C] uppercase tracking-widest">Visibility &amp; Status</span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div onClick={() => setIsActive(!isActive)} className="flex items-center justify-between p-5 bg-neutral-50 border border-[var(--outline-variant)]/40 cursor-pointer group hover:border-[#1ab0bc] transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`h-3 w-3 ${isActive ? 'bg-emerald-500' : 'bg-red-400'} shadow-[0_0_8px_currentColor]`} />
                        <div>
                          <p className="text-[11px] font-bold text-[#1B1C1C] uppercase tracking-widest">
                            {isActive ? 'Product Active' : 'Product Inactive'}
                          </p>
                          <p className="text-[9px] text-gray-500">Visible on public workspace catalog</p>
                        </div>
                      </div>
                      <div className={`w-11 h-6 p-0.5 bg-neutral-300 rounded-full transition-colors ${isActive ? 'bg-[#1ab0bc]' : ''}`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${isActive ? 'translate-x-5' : ''}`} />
                      </div>
                    </div>

                    <div onClick={() => setIsFeatured(!isFeatured)} className="flex items-center justify-between p-5 bg-neutral-50 border border-[var(--outline-variant)]/40 cursor-pointer group hover:border-[#1ab0bc] transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`h-3 w-3 ${isFeatured ? 'text-amber-500' : 'text-neutral-400'}`}>
                          <Star size={14} className={isFeatured ? 'fill-amber-500 text-amber-500' : ''} />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-[#1B1C1C] uppercase tracking-widest">
                            {isFeatured ? 'Featured on Home' : 'Standard Listing'}
                          </p>
                          <p className="text-[9px] text-gray-500">Highlight in prime recommendation blocks</p>
                        </div>
                      </div>
                      <div className={`w-11 h-6 p-0.5 bg-neutral-300 rounded-full transition-colors ${isFeatured ? 'bg-[#1ab0bc]' : ''}`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${isFeatured ? 'translate-x-5' : ''}`} />
                      </div>
                    </div>
                  </div>
                </section>
              </form>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 sm:px-10 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-6 py-3 border border-gray-300 text-gray-700 font-bold text-xs uppercase tracking-widest hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-product-form"
                disabled={isSubmitting}
                className="px-8 py-3 bg-[#006064] text-white font-bold text-xs uppercase tracking-widest hover:bg-[#004D40] transition-colors disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin inline" />
                    <span>Saving Product...</span>
                  </>
                ) : (
                  <>
                    <Package size={16} className="inline" />
                    <span>{product ? 'Update Asset Specifications' : 'Save New Product'}</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
