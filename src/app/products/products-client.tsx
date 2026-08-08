"use client";

import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  X,
  Zap, 
  Coffee, 
  Wifi, 
  Monitor,
  ShieldCheck,
} from "lucide-react";
import { AvailabilityTimeline } from "@/components/ui/availability-timeline";

import type { Product, City, Amenity } from "./page";

interface ProductsClientProps {
  products: Product[];
  cities: City[];
  amenities: Amenity[];
  categories: { id: number; name: string }[];
  productTypes: { id: number; name: string }[];
  initialCategoryId?: number;
}

const fallbackImages = [
  "/IMAGES_SSPACIA/MERCADO IMAGES/Reception.jpg",
  "/IMAGES_SSPACIA/PREMIER HOUSE/Reception.JPG",
  "/IMAGES_SSPACIA/AGARWAL IMAGES/Meeting_Room_1.jpg",
];

export default function ProductsClient({ 
  products = [], 
  cities = [], 
  amenities = [], 
  categories = [], 
  productTypes = [],
  initialCategoryId
}: ProductsClientProps) {
  // ─── Filter States ─────────────────────────────────────────
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(initialCategoryId);
  const [selectedTypeId, setSelectedTypeId] = useState<number | undefined>(undefined);
  const [selectedCityId, setSelectedCityId] = useState<number | undefined>(undefined);
  const [selectedLocationId, setSelectedLocationId] = useState<number | undefined>(undefined);
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // ─── Slot selections & Lightbox gallery state ─────────────────────────────────────────
  const [selectedSlotsByProduct, setSelectedSlotsByProduct] = useState<Record<number, string[]>>({});
  const [lightbox, setLightbox] = useState<{
    isOpen: boolean;
    title: string;
    images: string[];
    activeIndex: number;
  } | null>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightbox(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleSlot = (productId: number, slot: string) => {
    setSelectedSlotsByProduct(prev => {
      const current = prev[productId] || [];
      if (current.includes(slot)) {
        return { ...prev, [productId]: current.filter(s => s !== slot) };
      } else {
        const next = [...current, slot].sort();
        return { ...prev, [productId]: next };
      }
    });
  };

  const availableLocations = useMemo(() => {
    if (!selectedCityId) return [];
    const filtered = products.filter(p => p.location?.cityId === selectedCityId);
    const locMap = new Map<number, { id: number; name: string }>();
    filtered.forEach(p => {
      if (p.location) locMap.set(p.location.id, { id: p.location.id, name: p.location.name });
    });
    return Array.from(locMap.values());
  }, [products, selectedCityId]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      if (selectedCategoryId && product.categoryId !== selectedCategoryId) return false;
      if (selectedTypeId && product.typeId !== selectedTypeId) return false;
      if (selectedCityId && product.location?.cityId !== selectedCityId) return false;
      if (selectedLocationId && product.location?.id !== selectedLocationId) return false;
      if (selectedAmenityIds.length > 0) {
        const productAmenityIds = product.amenities.map(a => a.amenity.id);
        const hasAll = selectedAmenityIds.every(id => productAmenityIds.includes(id));
        if (!hasAll) return false;
      }
      return true;
    });
  }, [products, selectedCategoryId, selectedTypeId, selectedCityId, selectedLocationId, selectedAmenityIds]);

  const guestSpaces = filteredProducts.filter((p: Product) => p.categoryId === 2);
  const workspaces  = filteredProducts.filter((p: Product) => p.categoryId === 1);

  const formatPrice = (price: number | string) => {
    const num = typeof price === "number" ? price : parseFloat(price);
    if (isNaN(num)) return "₹0/-";
    return `₹${num.toLocaleString("en-IN")}/-`;
  };

  const toggleAmenity = (id: number) => {
    setSelectedAmenityIds(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const getAmenityIcon = (slug: string) => {
    switch (slug.toLowerCase()) {
      case "wifi": return <Wifi className="w-4 h-4" />;
      case "coffee": return <Coffee className="w-4 h-4" />;
      case "ac": return <Zap className="w-4 h-4" />;
      case "display": return <Monitor className="w-4 h-4" />;
      default: return <ShieldCheck className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-surface font-sans text-on-surface antialiased py-12 px-4 md:px-8 max-w-[1600px] mx-auto space-y-12">
      
      {/* ── HEADER TITLE ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary/40">SYSTEM_CATALOG // 2026</span>
          <div className="h-[1px] w-12 bg-primary/20"></div>
        </div>
        <h1 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight text-secondary">
          OUR SPACES
        </h1>
      </section>

      {/* ── LAYOUT GRID: SIDEBAR + CATALOG ── */}
      <div className="flex flex-col lg:flex-row gap-12 items-start">

        {/* ── SIDEBAR FILTERS ── */}
        <aside className="w-full lg:w-80 shrink-0 space-y-8 sticky top-28 bg-white p-8 border border-outline-variant/10 shadow-[0_20px_50px_rgba(27,28,28,0.02)]">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
             <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#1ab0bc]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">FILTER SPACES</span>
             </div>
             {(selectedCityId || selectedLocationId || selectedAmenityIds.length > 0 || selectedCategoryId || selectedTypeId) && (
               <button 
                onClick={() => {
                    setSelectedCityId(undefined);
                    setSelectedLocationId(undefined);
                    setSelectedAmenityIds([]);
                    setSelectedCategoryId(undefined);
                    setSelectedTypeId(undefined);
                    setSelectedDate(new Date().toISOString().split('T')[0]);
                }}
                className="text-[9px] font-bold text-rose-500 uppercase tracking-widest hover:underline"
               >
                 Reset
               </button>
             )}
          </div>

          <div className="space-y-6">
             {/* Category Filter */}
             <div className="space-y-2">
                <FilterDropdown
                  label="SPACE CATEGORY"
                  options={categories}
                  selectedId={selectedCategoryId}
                  onSelect={(val: any) => setSelectedCategoryId(val ? Number(val) : undefined)}
                  placeholder="All Categories"
                />
             </div>

             {/* Type Filter */}
             <div className="space-y-2">
                <FilterDropdown
                  label="SPACE TYPE"
                  options={productTypes}
                  selectedId={selectedTypeId}
                  onSelect={(val: any) => setSelectedTypeId(val ? Number(val) : undefined)}
                  placeholder="All Space Types"
                />
             </div>

             {/* City Filter */}
             <div className="space-y-2">
                <FilterDropdown
                  label="CITY"
                  options={cities}
                  selectedId={selectedCityId}
                  onSelect={(val: any) => {
                    setSelectedCityId(val ? Number(val) : undefined);
                    setSelectedLocationId(undefined);
                  }}
                  placeholder="Select City"
                />
             </div>

             {/* Office Location Filter */}
             {selectedCityId && availableLocations.length > 0 && (
               <div className="space-y-2 animate-in fade-in">
                  <FilterDropdown
                    label="OFFICE LOCATION"
                    options={availableLocations}
                    selectedId={selectedLocationId}
                    onSelect={(val: any) => setSelectedLocationId(val ? Number(val) : undefined)}
                    placeholder="Select Office Location"
                  />
               </div>
             )}

             {/* Date Picker */}
             <div className="space-y-2">
                <label className="text-[9px] font-sans font-bold text-tertiary/50 uppercase tracking-[0.2em]">DATE</label>
                <input 
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full h-10 bg-transparent text-[13px] border-b border-outline-variant/30 focus:border-[#1ab0bc] outline-none transition-all font-mono"
                />
             </div>

             {/* Amenities Stack */}
             <div className="space-y-3">
                <label className="text-[9px] font-sans font-bold text-tertiary/50 uppercase tracking-[0.2em]">AMENITIES</label>
                <div className="flex flex-wrap gap-2 pb-2 border-b border-outline-variant/30">
                  {amenities.slice(0, 4).map(amenity => (
                      <button
                        key={amenity.id}
                        onClick={() => toggleAmenity(amenity.id)}
                        className={`p-2 rounded-lg transition-all ${
                            selectedAmenityIds.includes(amenity.id)
                            ? "text-[#1ab0bc] scale-110 bg-[#1ab0bc]/10"
                            : "text-tertiary/20 hover:text-tertiary/60"
                        }`}
                        title={amenity.name}
                      >
                        {getAmenityIcon(amenity.slug)}
                      </button>
                  ))}
                </div>
             </div>
          </div>
        </aside>

        {/* ── MAIN CATALOG ── */}
        <main className="flex-1 space-y-24 w-full">
          {filteredProducts.length === 0 ? (
            <div className="py-32 text-center space-y-6 bg-surface-container-low/5 rounded-none border border-dashed border-outline-variant/20">
               <div className="w-16 h-16 bg-surface-container-low mx-auto rounded-full flex items-center justify-center text-primary/5">
                  <Filter className="w-8 h-8" />
               </div>
               <p className="text-xl font-medium text-tertiary/40 italic">No matches for your current system filters.</p>
            </div>
          ) : (
            <section className="space-y-20">
              {/* Collaborative Nodes (Guest Spaces) */}
              {guestSpaces.length > 0 && (
                <div className="space-y-12">
                  <div className="flex items-center gap-6">
                    <span className="text-[9px] font-bold uppercase tracking-[0.5em] text-secondary/40">COLLABORATION_NODES</span>
                    <div className="h-[1px] flex-1 bg-outline-variant/10"></div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-12">
                    {guestSpaces.map((gs: Product) => {
                      const allImgs = (gs.images && gs.images.length > 0)
                        ? gs.images.map((i: any) => i.url)
                        : [fallbackImages[gs.id % 3]];

                      return (
                        <div
                          key={gs.id}
                          className="group bg-white rounded-none overflow-hidden border border-outline-variant/5 shadow-[0_20px_50px_rgba(27,28,28,0.03)] hover:shadow-[0_40px_80px_rgba(0,105,111,0.08)] transition-all duration-700 flex flex-col md:flex-row h-full"
                        >
                           {/* Multi-Image Carousel Component */}
                           <ProductCardCarousel
                             productName={gs.name}
                             images={allImgs}
                             onOpenLightbox={(imgs, idx) => setLightbox({ isOpen: true, title: gs.name, images: imgs, activeIndex: idx })}
                           />

                           <div className="p-8 flex-1 min-w-0 flex flex-col justify-between gap-8">
                              <div className="space-y-6">
                                  <div className="flex justify-between items-start gap-4">
                                      <h3 className="font-display text-xl md:text-2xl font-bold tracking-tight text-on-surface leading-tight">{gs.name} @ {gs.location.name}</h3>
                                      <div className="bg-surface-container-low px-3 py-1 rounded-none border border-outline-variant/10 whitespace-nowrap">
                                          <span className="text-[8px] font-bold uppercase tracking-widest text-primary">{gs.capacity} SEATER</span>
                                      </div>
                                  </div>
                                  
                                  <div className="space-y-4">
                                      <AvailabilityTimeline 
                                          productId={gs.id} 
                                          selectedDate={selectedDate} 
                                          selectedSlots={selectedSlotsByProduct[gs.id] || []}
                                          onToggleSlot={(slot) => handleToggleSlot(gs.id, slot)}
                                      />
                                  </div>
                              </div>

                              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pt-6 border-t border-outline-variant/5">
                                   <div className="space-y-1">
                                      <span className="text-[9px] font-bold text-tertiary/40 uppercase tracking-widest block">Total Price</span>
                                      <div className="text-2xl font-display font-black text-secondary leading-none">
                                          {(() => {
                                              const numSelected = selectedSlotsByProduct[gs.id]?.length || 0;
                                              const basePrice = parseFloat(gs.pricingPlans.find((p: any) => p.type?.toLowerCase().includes("hour"))?.price || gs.pricingPlans[0]?.price || "0");
                                              const displayPrice = numSelected > 0 ? numSelected * basePrice : basePrice;
                                              return formatPrice(displayPrice);
                                          })()}
                                      </div>
                                      {selectedSlotsByProduct[gs.id]?.length > 0 && (
                                          <span className="text-[8px] font-bold text-primary/60 uppercase tracking-widest">{selectedSlotsByProduct[gs.id].length} slots selected</span>
                                      )}
                                   </div>
                                   <Link 
                                       href={
                                          selectedSlotsByProduct[gs.id]?.length > 0 
                                          ? `/checkout?productId=${gs.id}&slots=${selectedSlotsByProduct[gs.id].join(',')}&date=${selectedDate}`
                                          : `/products/${gs.id}`
                                       }
                                       className="bg-[#1ab0bc] text-white px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(26,176,188,0.2)] hover:shadow-[0_25px_50px_rgba(26,176,188,0.3)] transition-all transform hover:-translate-y-1 active:scale-95 text-center"
                                   >
                                       BOOK NOW
                                   </Link>
                                </div>
                           </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Work Systems (Owned Spaces) */}
              {workspaces.length > 0 && (
                <div className="space-y-12 pt-12">
                  <div className="flex items-center gap-6">
                    <span className="text-[9px] font-bold uppercase tracking-[0.5em] text-primary/40">WORK_SYSTEMS</span>
                    <div className="h-[1px] flex-1 bg-outline-variant/10"></div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {workspaces.map((ws: Product) => {
                      const allImgs = (ws.images && ws.images.length > 0)
                        ? ws.images.map((i: any) => i.url)
                        : [fallbackImages[ws.id % 3]];

                      return (
                        <div
                          key={ws.id}
                          className="group bg-white rounded-none overflow-hidden border border-outline-variant/5 shadow-[0_20px_50px_rgba(27,28,28,0.03)] hover:shadow-[0_40px_80px_rgba(0,105,111,0.08)] transition-all duration-700 flex flex-col justify-between"
                        >
                           <ProductCardCarousel
                             productName={ws.name}
                             images={allImgs}
                             onOpenLightbox={(imgs, idx) => setLightbox({ isOpen: true, title: ws.name, images: imgs, activeIndex: idx })}
                           />
                           
                           <div className="p-8 space-y-6 flex-1 flex flex-col justify-between">
                              <div className="space-y-4">
                                  <div className="flex justify-between items-start">
                                      <h3 className="font-display text-xl font-bold tracking-tight text-on-surface">{ws.name}</h3>
                                      <span className="text-[8px] font-bold uppercase tracking-widest text-primary bg-primary/5 px-2 py-1">{ws.capacity} SEATS</span>
                                  </div>
                                  <p className="text-xs text-tertiary/60 line-clamp-2">{ws.description || "Premium dedicated office workspace with enterprise features."}</p>
                              </div>

                              <div className="flex items-center justify-between pt-6 border-t border-outline-variant/5">
                                  <div>
                                      <span className="text-[8px] font-bold text-tertiary/40 uppercase tracking-widest block">Monthly Rent</span>
                                      <span className="text-xl font-display font-black text-secondary">{formatPrice(ws.pricingPlans[0]?.price || 0)}</span>
                                  </div>
                                  <Link
                                      href={`/products/${ws.id}`}
                                      className="bg-[#1ab0bc] text-white px-5 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] shadow-md hover:bg-teal-600 transition-all"
                                  >
                                      VIEW DETAILS
                                  </Link>
                              </div>
                           </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      {/* ── FULLSCREEN LIGHTBOX BIG GALLERY PREVIEW MODAL ── */}
      {lightbox && (
        <div 
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex flex-col justify-between p-4 md:p-8 animate-in fade-in"
        >
          {/* Top Bar */}
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="flex justify-between items-center text-white border-b border-white/10 pb-4 max-w-7xl mx-auto w-full"
          >
            <div className="space-y-1">
              <h3 className="font-display font-bold text-xl md:text-2xl uppercase tracking-wider text-teal-400">{lightbox.title}</h3>
              <p className="text-xs text-white/60 font-mono">Image {lightbox.activeIndex + 1} of {lightbox.images.length}</p>
            </div>
            
            <button
              onClick={() => setLightbox(null)}
              className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 shadow-2xl hover:scale-105 active:scale-95 border border-rose-400"
              title="Close Image Preview (ESC)"
            >
              <X className="w-5 h-5" />
              <span>CLOSE</span>
            </button>
          </div>

          {/* Center Image Display with Nav Buttons */}
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="relative flex-1 flex items-center justify-center my-4 overflow-hidden max-w-7xl mx-auto w-full"
          >
            <img
              src={lightbox.images[lightbox.activeIndex]}
              alt={`Fullscreen ${lightbox.title}`}
              className="max-h-full max-w-full object-contain shadow-2xl transition-all duration-300"
            />

            {lightbox.images.length > 1 && (
              <>
                <button
                  onClick={() => setLightbox({
                    ...lightbox,
                    activeIndex: lightbox.activeIndex === 0 ? lightbox.images.length - 1 : lightbox.activeIndex - 1
                  })}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-[#1ab0bc] text-white p-4 shadow-2xl transition-all hover:scale-110 active:scale-90 border border-white/20"
                  title="Previous Image"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>

                <button
                  onClick={() => setLightbox({
                    ...lightbox,
                    activeIndex: lightbox.activeIndex === lightbox.images.length - 1 ? 0 : lightbox.activeIndex + 1
                  })}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-[#1ab0bc] text-white p-4 shadow-2xl transition-all hover:scale-110 active:scale-90 border border-white/20"
                  title="Next Image"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              </>
            )}
          </div>

          {/* Bottom Thumbnail Strip */}
          {lightbox.images.length > 1 && (
            <div 
              onClick={(e) => e.stopPropagation()} 
              className="flex justify-center gap-3 overflow-x-auto pt-4 border-t border-white/10 max-w-4xl mx-auto w-full pb-2"
            >
              {lightbox.images.map((imgUrl, i) => (
                <button
                  key={i}
                  onClick={() => setLightbox({ ...lightbox, activeIndex: i })}
                  className={`relative w-20 h-14 border-2 overflow-hidden transition-all shrink-0 ${
                    i === lightbox.activeIndex ? 'border-[#1ab0bc] scale-110 shadow-lg' : 'border-white/20 opacity-40 hover:opacity-100'
                  }`}
                >
                  <img src={imgUrl} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CARD MULTI-IMAGE CAROUSEL SUBCOMPONENT ───
function ProductCardCarousel({
  productName,
  images,
  onOpenLightbox
}: {
  productName: string;
  images: string[];
  onOpenLightbox: (allImgs: string[], startIdx: number) => void;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIdx(prev => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIdx(prev => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="w-full md:w-[40%] aspect-[4/3] md:aspect-auto relative overflow-hidden group bg-neutral-100">
      <img
        src={images[currentIdx] || images[0]}
        alt={`${productName} image ${currentIdx + 1}`}
        className="w-full h-full object-cover transition-all duration-500 transform group-hover:scale-105"
      />

      {/* Top Left Badge */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <span className="bg-black/75 text-white text-[8px] font-bold px-3 py-1 uppercase tracking-[0.2em] backdrop-blur-md">
          IMAGE {currentIdx + 1} / {images.length}
        </span>
      </div>

      {/* Top Right Eye Button for Lightbox */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenLightbox(images, currentIdx);
        }}
        className="absolute top-4 right-4 z-10 bg-black/75 hover:bg-[#1ab0bc] text-white p-2.5 transition-all shadow-lg backdrop-blur-md border border-white/20 hover:scale-110 active:scale-95"
        title="Click for Fullscreen Big Gallery Preview"
      >
        <Eye className="w-4 h-4" />
      </button>

      {/* Prev / Next Carousel Navigation Arrows */}
      {images.length > 1 && (
        <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            onClick={handlePrev}
            className="pointer-events-auto bg-black/75 hover:bg-[#1ab0bc] text-white p-2.5 transition-all shadow-lg active:scale-90"
            title="Previous Image"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            className="pointer-events-auto bg-black/75 hover:bg-[#1ab0bc] text-white p-2.5 transition-all shadow-lg active:scale-90"
            title="Next Image"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
