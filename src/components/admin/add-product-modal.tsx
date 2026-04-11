'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Package, Loader2, Plus, Trash2 } from 'lucide-react';
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
    <label htmlFor={htmlFor} className="block text-xs font-bold text-[#616161] uppercase tracking-widest mb-1.5">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

const inputClass =
  'w-full px-4 py-2.5 bg-[#F8F9FA] border border-[#CFD8DC]/50 rounded-lg text-sm text-[#212121] placeholder:text-[#9E9E9E] focus:outline-none focus:ring-4 focus:ring-[#006064]/8 focus:border-[#006064] transition-all';

const selectClass =
  'w-full px-4 py-2.5 bg-[#F8F9FA] border border-[#CFD8DC]/50 rounded-lg text-sm text-[#212121] focus:outline-none focus:ring-4 focus:ring-[#006064]/8 focus:border-[#006064] transition-all appearance-none cursor-pointer';

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

    // Fetch Locations
    fetch('/api/admin/locations')
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setLocations(json.data);
      })
      .catch(() => toast.error('Failed to load locations'))
      .finally(() => setLocationsLoading(false));

    // Fetch Amenities
    fetch('/api/admin/config/amenities')
      .then((r) => r.json())
      .then((json) => {
         if (json.data) setAmenitiesOptions(json.data.filter((a: Amenity & { isActive: boolean }) => a.isActive));
      })
      .catch(() => console.error('Failed to load amenities'));

    // Fetch Dynamic Options
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
    }).catch(err => {
      console.error('Failed to load configuration options', err);
      toast.error('Failed to load configuration options');
    }).finally(() => setOptionsLoading(false));

  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (product) {
      setLocationId(String(product.locationId ?? product.location?.id ?? ''));
      setName(product.name);
      setSlug(product.slug);
      
      const typeName = typeof product.type === 'object' ? product.type.name : product.type;
      setType(typeName);
      
      const catName = typeof product.category === 'object' ? product.category.name : product.category;
      setCategory(catName);
      
      setDescription(product.description ?? '');
      
      const accessName = typeof product.accessTime === 'object' ? product.accessTime.name : (product.accessTime ?? '');
      setAccessTime(accessName);
      
      setCapacity(product.capacity?.toString() ?? '');
      setQuantity(String(product.quantity ?? 1));
      
      setSdr(product.sdr?.toString() ?? '');
      setAdv(product.adv?.toString() ?? '');
      setSecurityDepositMonths(product.securityDepositMonths?.toString() ?? '3');
      setComplementaryMeetingHours(product.complementaryMeetingHours?.toString() ?? '');
      
      const mappedPlans = product.pricingPlans?.map(p => ({
        ...p,
        durationType: typeof p.durationType === 'object' ? (p.durationType as any).name : p.durationType
      })) ?? [];
      setPricingPlans(mappedPlans);
      
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
      setExistingImages([]);
    }
  }, [isOpen, product]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugManuallyEdited) {
      setSlug(toSlug(val));
    }
  };

  const handleSlugChange = (val: string) => {
    setSlugManuallyEdited(true);
    setSlug(val);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) {
      setImageFiles([]);
      setImagePreviewUrls([]);
      return;
    }

    setImageFiles(files);
    setImagePreviewUrls(files.map((file) => URL.createObjectURL(file)));
  };

  const removeNewImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, idx) => idx !== index));
    setImagePreviewUrls((prev) => prev.filter((_, idx) => idx !== index));
  };

  const uploadImageFiles = async (): Promise<string[]> => {
    if (!imageFiles.length) return [];

    setIsImageUploading(true);
    try {
      const uploadedUrls = await Promise.all(
        imageFiles.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);

          const res = await fetch('/api/admin/upload-image', {
            method: 'POST',
            body: formData,
          });

          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? 'Image upload failed');
          return json.data.url as string;
        })
      );
      return uploadedUrls;
    } finally {
      setIsImageUploading(false);
    }
  };

  const handleRemoveExistingImage = async (imageId: number) => {
    if (!product) return;

    try {
      const response = await fetch(`/api/admin/products/${product.id}/images/${imageId}`, {
        method: 'DELETE',
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? 'Unable to remove image');

      setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
      toast.success('Image removed successfully.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to remove image');
    }
  };

  const addPricingPlan = () => {
    setPricingPlans(prev => [...prev, { durationType: '', price: 0, priceType: 'PER_SEAT' }]);
  };

  const updatePricingPlan = (index: number, field: keyof PricingPlanData, value: any) => {
    setPricingPlans(prev => prev.map((plan, i) => i === index ? { ...plan, [field]: value } : plan));
  };

  const removePricingPlan = (index: number) => {
    setPricingPlans(prev => prev.filter((_, i) => i !== index));
  };

  const addUnit = () => {
    setUnits(prev => [...prev, { name: '', code: '', capacity: 1, description: '' }]);
  };

  const updateUnit = (index: number, field: keyof ProductUnitData, value: any) => {
    setUnits(prev => prev.map((unit, i) => i === index ? { ...unit, [field]: value } : unit));
  };

  const removeUnit = (index: number) => {
    setUnits(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!locationId || !name || !slug || !type || !category) {
      toast.error('Please fill in Location, Name, Slug, Type, and Category.');
      return;
    }

    if (isOwnedSpace && units.length > Number(quantity)) {
      toast.error(`You cannot add more units than the total quantity (${quantity})`);
      return;
    }

    setIsSubmitting(true);

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
      pricingPlans: pricingPlans.filter(p => p.durationType && p.price > 0).map(p => ({
        durationType: p.durationType,
        price: p.price,
        oldPrice: p.oldPrice,
        discount: p.discount,
        priceType: p.priceType || 'PER_SEAT',
      })),
      units: units.filter(u => u.name).map(u => ({
        ...u,
        capacity: Number(u.capacity) || 1,
        description: u.description || '',
      })),
    };

    try {
      const uploadedImageUrls = imageFiles.length ? await uploadImageFiles() : [];

      const method = product ? 'PATCH' : 'POST';
      const url = product ? `/api/admin/products/${product.id}` : '/api/admin/products';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? `Failed to ${product ? 'update' : 'create'} product`);

      const createdOrUpdatedProduct = json.data;

      if (createdOrUpdatedProduct?.id && uploadedImageUrls.length > 0) {
        const hasOtherImages = existingImages.length > 0;

        await Promise.all(
          uploadedImageUrls.map((url, index) =>
            fetch(`/api/admin/products/${createdOrUpdatedProduct.id}/images`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url,
                isPrimary: !hasOtherImages && index === 0,
                sortOrder: existingImages.length + index,
              }),
            })
          )
        );
      }

      toast.success(`Product "${name}" ${product ? 'updated' : 'added'} successfully!`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${product ? 'update' : 'create'} product`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategorySlug = categories.find(c => c.name === category)?.slug;
  const isOwnedSpace = selectedCategorySlug === 'owned-space' || category === 'WORKSPACE'; // Fallback for old data

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative flex flex-col w-full max-w-4xl bg-white shadow-2xl max-h-[90vh] rounded-[2rem] overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#CFD8DC]/30 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#E0F7FA] text-[#006064]">
                  <Package size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#004D40]">
                    {product ? 'Edit Product' : 'Add New Product'}
                  </h2>
                  <p className="text-xs text-[#9E9E9E]">
                    {product ? 'Update product details' : 'Create a new product listing'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-[#9E9E9E] hover:text-[#212121] hover:bg-[#F8F9FA] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div ref={bodyRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              <form id="add-product-form" onSubmit={handleSubmit} className="space-y-6">
                <section className="space-y-4">
                  <h3 className="text-xs font-bold text-[#9E9E9E] uppercase tracking-widest border-b border-[#CFD8DC]/30 pb-2">
                    Product Details
                  </h3>

                  <div>
                    <Label htmlFor="locationId" required>Location</Label>
                    <div className="relative">
                      <select
                        id="locationId"
                        value={locationId}
                        onChange={(e) => setLocationId(e.target.value)}
                        className={selectClass}
                        required
                      >
                        <option value="">{locationsLoading ? 'Loading locations…' : 'Select a location'}</option>
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="productImage">Upload Images</Label>
                    <input
                      id="productImage"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="mt-1 block w-full text-sm text-[#616161] file:border file:border-[#CFD8DC] file:bg-white file:px-3 file:py-2 file:text-[#212121] file:rounded-lg"
                    />
                    <p className="text-[10px] text-[#9E9E9E] mt-1">Optional. You can select multiple images. Existing images are editable too.</p>

                    {(existingImages.length > 0 || imagePreviewUrls.length > 0) && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {existingImages.map((img) => (
                          <div key={`existing-${img.id}`} className="relative border border-[#CFD8DC] rounded-lg overflow-hidden">
                            <img src={img.url} alt={`Product image ${img.id}`} className="w-full h-20 object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemoveExistingImage(img.id)}
                              className="absolute top-1 right-1 bg-white/90 text-red-600 p-1 rounded-full hover:bg-white"
                              aria-label="Remove existing image"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}

                        {imagePreviewUrls.map((url, index) => (
                          <div key={`new-${index}`} className="relative border border-[#CFD8DC] rounded-lg overflow-hidden">
                            <img src={url} alt={`New product preview ${index + 1}`} className="w-full h-20 object-cover" />
                            <button
                              type="button"
                              onClick={() => removeNewImage(index)}
                              className="absolute top-1 right-1 bg-white/90 text-red-600 p-1 rounded-full hover:bg-white"
                              aria-label="Remove selected image"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {isImageUploading && (
                      <p className="text-[10px] text-[#006064] mt-1">Uploading images…</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="name" required>Name</Label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="e.g. DSP Flex Desk"
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="slug" required>URL Slug</Label>
                    <input
                      id="slug"
                      type="text"
                      value={slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="dsp-flex-desk"
                      className={inputClass}
                      required
                    />
                    <p className="text-[10px] text-[#9E9E9E] mt-1">Auto-generated from name; must be unique.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="type" required>Type</Label>
                      <select
                        id="type"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className={selectClass}
                        required
                        disabled={optionsLoading}
                      >
                        <option value="">{optionsLoading ? 'Loading types...' : 'Select Type'}</option>
                        {productTypes.map((opt) => (
                          <option key={opt.id} value={opt.name}>
                            {opt.displayName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="category" required>Category</Label>
                      <select
                        id="category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className={selectClass}
                        required
                        disabled={optionsLoading}
                      >
                        <option value="">{optionsLoading ? 'Loading categories...' : 'Select Category'}</option>
                        {categories.map((opt) => (
                          <option key={opt.id} value={opt.name}>
                            {opt.displayName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Optional product details"
                      rows={3}
                      className={inputClass + ' resize-y'}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="accessTime">Access Time</Label>
                      <select
                        id="accessTime"
                        value={accessTime}
                        onChange={(e) => setAccessTime(e.target.value)}
                        className={selectClass}
                        disabled={optionsLoading}
                      >
                        <option value="">Choose an access option</option>
                        {accessTimeOptionsList.map((opt) => (
                          <option key={opt.id} value={opt.name}>
                            {opt.displayName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {!isOwnedSpace && (
                      <div>
                        <Label htmlFor="capacity">Capacity (Pax)</Label>
                        <input
                          id="capacity"
                          type="number"
                          min={0}
                          value={capacity}
                          onChange={(e) => setCapacity(e.target.value)}
                          placeholder="e.g. 5"
                          className={inputClass}
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="sdr">Security Deposit (SDR)</Label>
                      <input
                        id="sdr"
                        type="number"
                        min={0}
                        value={sdr}
                        onChange={(e) => setSdr(e.target.value)}
                        placeholder="0"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <Label htmlFor="adv">Advance Rent (ADV)</Label>
                      <input
                        id="adv"
                        type="number"
                        min={0}
                        value={adv}
                        onChange={(e) => setAdv(e.target.value)}
                        placeholder="0"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <Label htmlFor="complementaryMeetingHours">Free Meeting Hrs (Per Month)</Label>
                      <input
                        id="complementaryMeetingHours"
                        type="number"
                        min={0}
                        value={complementaryMeetingHours}
                        onChange={(e) => setComplementaryMeetingHours(e.target.value)}
                        placeholder="0"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="quantity">Quantity</Label>
                      <input
                        id="quantity"
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <Label htmlFor="sortOrder">Sort Order</Label>
                      <input
                        id="sortOrder"
                        type="number"
                        min={0}
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 mt-6">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isFeatured}
                          onChange={() => setIsFeatured((v) => !v)}
                          className="h-4 w-4 text-[#006064] border-[#CFD8DC] rounded"
                        />
                        <span className="text-sm font-bold text-[#212121]">Featured</span>
                      </label>
                    </div>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => setIsActive((v) => !v)}
                      className={`relative w-10 h-6 rounded-full transition-colors ${isActive ? 'bg-[#006064]' : 'bg-[#CFD8DC]'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isActive ? 'translate-x-5' : 'translate-x-1'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#212121]">Active</p>
                      <p className="text-[10px] text-[#9E9E9E]">Toggle to hide or show this product on listings</p>
                    </div>
                  </label>

                  {/* Pricing Plans Section */}
                  <div className="space-y-4 pt-4 border-t border-[#CFD8DC]/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-[#9E9E9E] uppercase tracking-widest">
                          Pricing Plans
                        </h3>
                        <p className="text-[10px] text-[#9E9E9E]">Set prices for different billing durations</p>
                      </div>
                      <button
                        type="button"
                        onClick={addPricingPlan}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E0F7FA] text-[#006064] rounded-lg text-xs font-bold hover:bg-[#B2EBF2] transition-colors"
                      >
                        <Plus size={14} /> Add Plan
                      </button>
                    </div>

                    <div className="space-y-3">
                      {pricingPlans.map((plan, index) => (
                        <div key={index} className="flex items-end gap-3 p-3 bg-[#F8F9FA] rounded-xl border border-[#CFD8DC]/30">
                          <div className="flex-1">
                            <Label htmlFor={`duration-${index}`}>Duration</Label>
                            <select
                              id={`duration-${index}`}
                              value={plan.durationType}
                              onChange={(e) => updatePricingPlan(index, 'durationType', e.target.value)}
                              className={selectClass}
                            >
                              <option value="">Select Duration</option>
                              {durationTypes.map(d => (
                                <option key={d.id} value={d.name}>{d.displayName}</option>
                              ))}
                            </select>
                          </div>
                          <div className="w-28">
                            <Label htmlFor={`price-${index}`}>Price (₹)</Label>
                            <input
                              id={`price-${index}`}
                              type="number"
                              value={plan.price}
                              onChange={(e) => updatePricingPlan(index, 'price', Number(e.target.value))}
                              className={inputClass}
                            />
                          </div>
                          <div className="w-32">
                            <Label htmlFor={`priceType-${index}`}>Type</Label>
                            <select
                              id={`priceType-${index}`}
                              value={plan.priceType || 'PER_SEAT'}
                              onChange={(e) => updatePricingPlan(index, 'priceType', e.target.value)}
                              className={selectClass}
                            >
                              <option value="PER_SEAT">Per Seat</option>
                              <option value="FIXED">Fixed (Per Unit)</option>
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={() => removePricingPlan(index)}
                            className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                      {pricingPlans.length === 0 && (
                        <p className="text-center py-4 text-xs text-[#9E9E9E] italic underline decoration-[#CFD8DC]">No pricing plans added yet.</p>
                      )}
                    </div>
                  </div>

                  {/* Product Units Section (Owned Space only) */}
                  {isOwnedSpace && (
                    <div className="space-y-4 pt-4 border-t border-[#CFD8DC]/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-bold text-[#9E9E9E] uppercase tracking-widest">
                            Physical Units
                          </h3>
                          <p className="text-[10px] text-[#9E9E9E]">Manage specific desks/cabins for this product</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className={`text-xs font-bold ${units.length > Number(quantity) ? 'text-red-500' : 'text-[#006064]'}`}>
                            {units.length} / {quantity} Units
                          </p>
                          <button
                            type="button"
                            onClick={addUnit}
                            disabled={units.length >= Number(quantity)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E0F7FA] text-[#006064] rounded-lg text-xs font-bold hover:bg-[#B2EBF2] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus size={14} /> Add Unit
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {units.map((unit, index) => (
                          <div key={index} className="flex items-end gap-3 p-3 bg-[#F8F9FA] rounded-xl border border-[#CFD8DC]/30">
                            <div className="flex-1">
                              <Label htmlFor={`unit-name-${index}`}>Unit Name (e.g. Desk #1)</Label>
                              <input
                                id={`unit-name-${index}`}
                                type="text"
                                value={unit.name}
                                onChange={(e) => updateUnit(index, 'name', e.target.value)}
                                className={inputClass}
                                placeholder="Desk #1"
                              />
                            </div>
                            <div className="w-20">
                              <Label htmlFor={`unit-code-${index}`}>Code</Label>
                              <input
                                id={`unit-code-${index}`}
                                type="text"
                                value={unit.code ?? ''}
                                onChange={(e) => updateUnit(index, 'code', e.target.value)}
                                className={inputClass}
                                placeholder="D1"
                              />
                            </div>
                            <div className="w-20">
                              <Label htmlFor={`unit-seats-${index}`}>Seats</Label>
                              <input
                                id={`unit-seats-${index}`}
                                type="number"
                                min={1}
                                value={unit.capacity ?? 1}
                                onChange={(e) => updateUnit(index, 'capacity', Number(e.target.value))}
                                className={inputClass}
                              />
                            </div>
                            <div className="flex-1">
                              <Label htmlFor={`unit-desc-${index}`}>Description / Notes</Label>
                              <input
                                id={`unit-desc-${index}`}
                                type="text"
                                value={unit.description ?? ''}
                                onChange={(e) => updateUnit(index, 'description', e.target.value)}
                                className={inputClass}
                                placeholder="Near window, extra space..."
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeUnit(index)}
                              className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ))}
                        {units.length === 0 && (
                          <p className="text-center py-4 text-xs text-[#9E9E9E] italic underline decoration-[#CFD8DC]">No units added. This product will be booked without specific unit assignment.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Amenities Selection */}
                  <div className="space-y-4 pt-4 border-t border-[#CFD8DC]/30">
                     <div className="flex items-center justify-between">
                       <h3 className="text-xs font-bold text-[#9E9E9E] uppercase tracking-widest">
                         Available Amenities
                       </h3>
                       <span className="text-[10px] bg-[#E0F7FA] text-[#006064] px-2 py-0.5 rounded-full font-bold">
                         {selectedAmenities.length} Selected
                       </span>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-3">
                        {amenitiesOptions.map((amenity) => {
                          const isSelected = selectedAmenities.includes(amenity.id);
                          return (
                            <div 
                              key={amenity.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedAmenities(prev => prev.filter(id => id !== amenity.id));
                                } else {
                                  setSelectedAmenities(prev => [...prev, amenity.id]);
                                }
                              }}
                              className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-[#E0F7FA] border-[#006064] text-[#006064] shadow-sm' 
                                  : 'bg-white border-[#CFD8DC]/50 text-[#616161] hover:border-[#006064]/30'
                              }`}
                            >
                              <div className="text-lg">{amenity.icon || '✨'}</div>
                              <span className="text-sm font-bold truncate">{amenity.name}</span>
                            </div>
                          );
                        })}
                     </div>
                  </div>
                </section>
              </form>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#CFD8DC]/30 bg-white flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-lg border border-[#CFD8DC]/50 text-sm font-bold text-[#616161] hover:bg-[#F8F9FA] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-product-form"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#006064] text-white rounded-lg text-sm font-bold shadow-md shadow-[#006064]/20 hover:bg-[#004D40] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Saving
                  </>
                ) : (
                  <>
                    <Package size={15} />
                    {product ? 'Update Product' : 'Add Product'}
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
