'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Package, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
// ─── Local Enums (since Prisma models aren't enums at runtime) ────────────────
const ProductType = {
  FLEX_DESK: 'FLEX_DESK',
  FIXED_DESK: 'FIXED_DESK',
  DEDICATED_CABIN: 'DEDICATED_CABIN',
  PRIVATE_CABIN: 'PRIVATE_CABIN',
  EXECUTIVE_CABIN: 'EXECUTIVE_CABIN',
  MEETING_ROOM: 'MEETING_ROOM',
  BOARD_ROOM: 'BOARD_ROOM',
  EVENT_ROOM: 'EVENT_ROOM',
} as const;

const SpaceCategory = {
  WORKSPACE: 'WORKSPACE',
  GUEST_SPACE: 'GUEST_SPACE',
} as const;

const AccessTime = {
  BUSINESS_HOURS: 'BUSINESS_HOURS',
  TWENTY_FOUR_SEVEN: '24X7',
} as const;

type ProductType = (typeof ProductType)[keyof typeof ProductType];
type SpaceCategory = (typeof SpaceCategory)[keyof typeof SpaceCategory];
type AccessTime = (typeof AccessTime)[keyof typeof AccessTime];

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

interface ProductToEdit {
  id: number;
  locationId: number;
  location?: { id: number; name: string };
  name: string;
  slug: string;
  type: string;
  category: string;
  description?: string;
  accessTime?: string;
  capacity?: number;
  quantity: number;
  sdrPlusAdv?: string;
  complementaryMeetingRoom?: string;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  images?: ProductImageData[];
  amenities?: { amenity: Amenity }[];
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

const typeOptions: Array<{ value: ProductType; label: string }> = [
  { value: ProductType.FLEX_DESK, label: 'Flex Desk' },
  { value: ProductType.FIXED_DESK, label: 'Fixed Desk' },
  { value: ProductType.DEDICATED_CABIN, label: 'Dedicated Cabin' },
  { value: ProductType.PRIVATE_CABIN, label: 'Private Cabin' },
  { value: ProductType.EXECUTIVE_CABIN, label: 'Executive Cabin' },
  { value: ProductType.MEETING_ROOM, label: 'Meeting Room' },
  { value: ProductType.BOARD_ROOM, label: 'Board Room' },
  { value: ProductType.EVENT_ROOM, label: 'Event Room' },
];

const categoryOptions: Array<{ value: SpaceCategory; label: string }> = [
  { value: SpaceCategory.WORKSPACE, label: 'Workspace' },
  { value: SpaceCategory.GUEST_SPACE, label: 'Guest Space' },
];

const accessTimeOptions: Array<{ value: AccessTime; label: string }> = [
  { value: AccessTime.BUSINESS_HOURS, label: 'Business Hours' },
  { value: AccessTime.TWENTY_FOUR_SEVEN, label: '24/7 Access' },
];

export function AddProductModal({ isOpen, onClose, onSuccess, product }: AddProductModalProps) {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [amenitiesOptions, setAmenitiesOptions] = useState<Amenity[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const [locationId, setLocationId] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState<string>(ProductType.FLEX_DESK);
  const [category, setCategory] = useState<string>(SpaceCategory.WORKSPACE);
  const [description, setDescription] = useState('');
  const [accessTime, setAccessTime] = useState<string | ''>('');
  const [capacity, setCapacity] = useState('');
  const [quantity, setQuantity] = useState('1');
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
    fetch('/api/admin/locations')
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setLocations(json.data);
      })
      .catch(() => toast.error('Failed to load locations'))
      .finally(() => setLocationsLoading(false));

    fetch('/api/admin/amenities')
      .then((r) => r.json())
      .then((json) => {
         if (json.data) setAmenitiesOptions(json.data.filter((a: any) => a.isActive));
      })
      .catch(() => console.error('Failed to load amenities'));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (product) {
      setLocationId(String(product.locationId ?? product.location?.id ?? ''));
      setName(product.name);
      setSlug(product.slug);
      setType(typeof product.type === 'object' ? (product.type as any).name : product.type);
      setCategory(typeof product.category === 'object' ? (product.category as any).name : product.category);
      setDescription(product.description ?? '');
      setAccessTime(typeof product.accessTime === 'object' ? (product.accessTime as any).name : (product.accessTime ?? ''));
      setCapacity(product.capacity?.toString() ?? '');
      setQuantity(String(product.quantity ?? 1));
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
      setType(ProductType.FLEX_DESK);
      setCategory(SpaceCategory.WORKSPACE);
      setDescription('');
      setAccessTime('');
      setCapacity('');
      setQuantity('1');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!locationId || !name || !slug || !type || !category) {
      toast.error('Please fill in Location, Name, Slug, Type, and Category.');
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
      isActive,
      isFeatured,
      sortOrder: sortOrder ? Number(sortOrder) : 0,
      amenityIds: selectedAmenities,
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative flex flex-col w-full max-w-xl bg-white shadow-2xl h-full"
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
                        onChange={(e) => setType(e.target.value as ProductType)}
                        className={selectClass}
                        required
                      >
                        {typeOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="category" required>Category</Label>
                      <select
                        id="category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value as SpaceCategory)}
                        className={selectClass}
                        required
                      >
                        {categoryOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
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
                        onChange={(e) => setAccessTime(e.target.value as AccessTime | '')}
                        className={selectClass}
                      >
                        <option value="">Choose an access option</option>
                        {accessTimeOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="capacity">Capacity</Label>
                      <input
                        id="capacity"
                        type="number"
                        min={0}
                        value={capacity}
                        onChange={(e) => setCapacity(e.target.value)}
                        placeholder="e.g. 8"
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
                    Add Product
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
