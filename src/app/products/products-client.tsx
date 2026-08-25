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
  ChevronDown,
  Sparkles,
  Building,
  MapPin,
  CheckCircle,
  HelpCircle,
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
  const [selectedArea, setSelectedArea] = useState<string | undefined>(undefined);
  const [selectedLocationId, setSelectedLocationId] = useState<number | undefined>(undefined);
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // ─── Slot selections & Lightbox gallery state ─────────────────────────────────────────
  const [selectedSlotsByProduct, setSelectedSlotsByProduct] = useState<Record<number, string[]>>({});
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
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

  const availableAreas = useMemo(() => {
    const targetProducts = selectedCityId
      ? products.filter(p => (p.location?.cityId ?? (p.location as any)?.city?.id) === selectedCityId)
      : products;
    const areaSet = new Set<string>();
    targetProducts.forEach(p => {
      if (p.location?.area) {
        areaSet.add(p.location.area.trim());
      }
    });
    return Array.from(areaSet).map(area => ({ id: area, name: area }));
  }, [products, selectedCityId]);

  const availableLocations = useMemo(() => {
    let targetProducts = products;
    if (selectedCityId) {
      targetProducts = targetProducts.filter(p => (p.location?.cityId ?? (p.location as any)?.city?.id) === selectedCityId);
    }
    if (selectedArea) {
      targetProducts = targetProducts.filter(p => p.location?.area?.trim() === selectedArea.trim());
    }
    const locMap = new Map<number, { id: number; name: string }>();
    targetProducts.forEach(p => {
      if (p.location) {
        locMap.set(p.location.id, { id: p.location.id, name: p.location.name });
      }
    });
    return Array.from(locMap.values());
  }, [products, selectedCityId, selectedArea]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const catId = product.categoryId ?? product.category?.id;
      const typeId = product.typeId ?? product.type?.id;
      const cityId = product.location?.cityId ?? (product.location as any)?.city?.id;
      const locId = product.locationId ?? product.location?.id;
      const area = product.location?.area?.trim();

      if (selectedCityId && cityId !== selectedCityId) return false;
      if (selectedArea && area !== selectedArea.trim()) return false;
      if (selectedLocationId && locId !== selectedLocationId) return false;
      if (selectedCategoryId && catId !== selectedCategoryId) return false;
      if (selectedTypeId && typeId !== selectedTypeId) return false;

      if (selectedAmenityIds.length > 0 && Array.isArray(product.amenities)) {
        const productAmenityIds = product.amenities.map((a: any) => a.amenity?.id || a.amenityId || a.id);
        const hasAll = selectedAmenityIds.every(id => productAmenityIds.includes(id));
        if (!hasAll) return false;
      }

      return true;
    });
  }, [
    products, 
    selectedCategoryId, 
    selectedTypeId, 
    selectedCityId, 
    selectedArea, 
    selectedLocationId, 
    selectedAmenityIds
  ]);

  // Active filter count for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCityId) count++;
    if (selectedArea) count++;
    if (selectedLocationId) count++;
    if (initialCategoryId ? selectedCategoryId !== initialCategoryId : selectedCategoryId !== undefined) count++;
    if (selectedTypeId) count++;
    if (selectedAmenityIds.length > 0) count += selectedAmenityIds.length;
    return count;
  }, [selectedCityId, selectedArea, selectedLocationId, selectedCategoryId, initialCategoryId, selectedTypeId, selectedAmenityIds]);

  const handleResetFilters = () => {
    setSelectedCityId(undefined);
    setSelectedArea(undefined);
    setSelectedLocationId(undefined);
    setSelectedCategoryId(initialCategoryId);
    setSelectedTypeId(undefined);
    setSelectedAmenityIds([]);
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const isGuestCategory = (p: Product) => (p.categoryId === 2 || p.category?.slug === 'guest-space' || p.category?.name?.toLowerCase().includes('guest'));

  // Group into Guest Spaces vs Other Workspaces
  const guestSpaces = useMemo(() => filteredProducts.filter(isGuestCategory), [filteredProducts]);
  const workspaces = useMemo(() => filteredProducts.filter(p => !isGuestCategory(p)), [filteredProducts]);

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

  const formatPrice = (price: string | number) => {
    const num = typeof price === "number" ? price : parseFloat(price);
    if (isNaN(num)) return "₹0/-";
    return `₹${num.toLocaleString("en-IN")}/-`;
  };

  // Filter Form Content Renderer (used in both Desktop Sidebar and Mobile Sheet)
  const renderFilterContent = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <FilterDropdown
          label="CITY"
          options={cities}
          selectedId={selectedCityId}
          onSelect={(val: any) => {
            setSelectedCityId(val ? Number(val) : undefined);
            setSelectedArea(undefined);
            setSelectedLocationId(undefined);
          }}
          placeholder="Select City"
        />
      </div>

      <div className="space-y-2">
        <FilterDropdown
          label="AREA"
          options={availableAreas}
          selectedId={selectedArea}
          onSelect={(val: any) => {
            setSelectedArea(val ? String(val) : undefined);
            setSelectedLocationId(undefined);
          }}
          placeholder="Select Area"
          disabled={availableAreas.length === 0}
        />
      </div>

      <div className="space-y-2">
        <FilterDropdown
          label="CENTRE"
          options={availableLocations}
          selectedId={selectedLocationId}
          onSelect={(val: any) => setSelectedLocationId(val ? Number(val) : undefined)}
          placeholder="Select Centre"
          disabled={availableLocations.length === 0}
        />
      </div>

      <div className="space-y-2">
        <FilterDropdown
          label="SPACE CATEGORY"
          options={categories}
          selectedId={selectedCategoryId}
          onSelect={(val: any) => setSelectedCategoryId(val ? Number(val) : undefined)}
          placeholder="All Categories"
        />
      </div>

      <div className="space-y-2">
        <FilterDropdown
          label="SPACE TYPE"
          options={productTypes}
          selectedId={selectedTypeId}
          onSelect={(val: any) => setSelectedTypeId(val ? Number(val) : undefined)}
          placeholder="All Space Types"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-sans font-bold text-primary uppercase tracking-[0.4em] ml-1">DATE</label>
        <input 
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full h-14 bg-surface-lowest px-4 text-sm border-b-2 border-outline-variant/20 focus:border-primary outline-none transition-all font-mono"
        />
      </div>

      <div className="space-y-3">
        <label className="text-[10px] font-sans font-bold text-primary uppercase tracking-[0.4em] ml-1">AMENITIES</label>
        <div className="flex flex-wrap gap-2 pb-2 border-b border-outline-variant/30">
          {amenities.slice(0, 4).map(amenity => (
            <button
              key={amenity.id}
              onClick={() => toggleAmenity(amenity.id)}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
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
  );

  return (
    <div className="min-h-screen bg-surface font-sans text-on-surface antialiased">
      <div className="space-y-6 sm:space-y-8 py-6 sm:py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* ── Compact Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-[#CFD8DC]/60">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#006064]">SSPACIA // AHMEDABAD</span>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-[#004D40] tracking-tight uppercase">
            {initialCategoryId === 2 ? "Guest Spaces" : initialCategoryId === 1 ? "Coworking Spaces" : "All Workspaces"}
          </h1>
        </div>
        <p className="text-xs text-gray-500 max-w-md">
          {initialCategoryId === 2 
            ? "Book premium meeting rooms, event spaces, and day passes on-demand."
            : "Flexible dedicated desks, shared offices, and private cabins across Ahmedabad."}
        </p>
      </div>

      {/* ── Mobile Filter Bar ── */}
      <div className="lg:hidden flex items-center justify-between p-3 bg-white border border-[#CFD8DC] shadow-xs rounded-sm">
        <button
          onClick={() => setIsMobileFilterOpen(true)}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#006064] bg-[#E0F7FA] px-3.5 py-2 rounded-sm border border-[#006064]/20 active:scale-95 transition-all cursor-pointer"
        >
          <Filter size={14} className="text-[#006064]" />
          <span>Filters {activeFilterCount > 0 && `(${activeFilterCount})`}</span>
        </button>

        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-bold text-gray-600 font-mono">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'space' : 'spaces'}
          </span>
          {activeFilterCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="text-[10px] font-bold text-rose-600 uppercase tracking-wider hover:underline cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile Filter Slide-up Drawer ── */}
      {isMobileFilterOpen && (
        <div className="lg:hidden fixed inset-0 z-[150] flex flex-col justify-end bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-t-2xl max-h-[88vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-[#006064]" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#004D40]">Filter Workspaces</h3>
              </div>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-6 flex-1">
              {renderFilterContent()}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center gap-3">
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex-1 py-3 bg-[#006064] text-white text-xs font-bold uppercase tracking-wider rounded-sm shadow-md hover:bg-[#004D40] transition-colors text-center cursor-pointer"
              >
                Show {filteredProducts.length} Results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Layout: Sidebar Filter + Catalog ── */}
      <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-12">
        {/* ── STICKY SIDEBAR FILTER (DESKTOP) ── */}
        <aside className="hidden lg:block w-72 shrink-0 space-y-6 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto overscroll-contain bg-surface-lowest p-6 border border-outline-variant/10 shadow-[0_20px_50px_rgba(27,28,28,0.02)] sidebar-scrollbar">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
             <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#1ab0bc]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">FILTER SPACES</span>
             </div>
             {activeFilterCount > 0 && (
               <button 
                onClick={handleResetFilters}
                className="text-[9px] font-bold text-rose-500 uppercase tracking-widest hover:underline cursor-pointer"
               >
                 Reset
               </button>
             )}
          </div>
          {renderFilterContent()}
        </aside>

        {/* ── MAIN CATALOG ── */}
        <main className="flex-1 space-y-16 sm:space-y-24 w-full">
          {filteredProducts.length === 0 ? (
            <div className="py-20 sm:py-32 text-center space-y-6 bg-surface-container-low/5 rounded-none border border-dashed border-outline-variant/20 px-4">
               <p className="text-base sm:text-lg font-medium text-gray-500 italic">No workspaces match your selected filters.</p>
            </div>
          ) : (
            <section className="space-y-16 sm:space-y-20">
              {guestSpaces.length > 0 && (
                <div className="space-y-8 sm:space-y-12">
                  <div className="flex items-center gap-4 sm:gap-6">
                    <span className="text-[9px] font-bold uppercase tracking-[0.5em] text-secondary/60">GUEST_SPACES</span>
                    <div className="h-[1px] flex-1 bg-outline-variant/20"></div>
                  </div>
                  <div className="grid grid-cols-1 gap-8 sm:gap-12">
                    {guestSpaces.map((gs: Product) => {
                      const allImgs = (gs.images && gs.images.length > 0)
                        ? gs.images.map((i: any) => i.url)
                        : [fallbackImages[gs.id % 3]];

                      return (
                        <div
                          key={gs.id}
                          className="group bg-white rounded-none overflow-hidden border border-outline-variant/10 shadow-[0_20px_50px_rgba(27,28,28,0.03)] hover:shadow-[0_40px_80px_rgba(0,105,111,0.08)] transition-all duration-500 flex flex-col lg:flex-row items-stretch min-w-0"
                        >
                           {/* Multi-Image Carousel Component */}
                           <ProductCardCarousel
                             productName={gs.name}
                             images={allImgs}
                             onOpenLightbox={(imgs, idx) => setLightbox({ isOpen: true, title: gs.name, images: imgs, activeIndex: idx })}
                             className="w-full lg:w-80 xl:w-96 h-56 sm:h-64 lg:h-auto min-h-[220px] lg:min-h-full shrink-0"
                           />

                           <div className="p-4 sm:p-6 lg:p-8 flex-1 min-w-0 flex flex-col justify-between gap-4 sm:gap-6">
                              <div className="space-y-4 sm:space-y-6">
                                  <div className="flex flex-wrap sm:flex-nowrap justify-between items-start gap-2 sm:gap-4">
                                      <h3 className="font-display text-base sm:text-lg md:text-xl font-bold tracking-tight text-on-surface leading-tight">
                                        {gs.name} @ {gs.location.name}
                                      </h3>
                                      <div className="bg-surface-container-low px-2.5 py-1 rounded-none border border-outline-variant/10 whitespace-nowrap shrink-0">
                                          <span className="text-[8px] font-bold uppercase tracking-widest text-primary">{gs.capacity} SEATER</span>
                                      </div>
                                  </div>
                                  
                                  <div className="space-y-3">
                                      <AvailabilityTimeline 
                                          productId={gs.id} 
                                          selectedDate={selectedDate} 
                                          selectedSlots={selectedSlotsByProduct[gs.id] || []}
                                          onToggleSlot={(slot) => handleToggleSlot(gs.id, slot)}
                                      />
                                  </div>
                              </div>

                              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-4 sm:pt-6 border-t border-outline-variant/10">
                                   <div className="space-y-1">
                                      <span className="text-[9px] font-bold text-tertiary/40 uppercase tracking-widest block">Total Price</span>
                                      <div className="text-xl sm:text-2xl font-display font-black text-secondary leading-none">
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
                                       className="bg-[#006064] hover:bg-[#004D40] text-white px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] shadow-md hover:shadow-lg transition-all text-center block w-full sm:w-auto rounded-xs"
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
                <div className="space-y-8 sm:space-y-12 pt-8 sm:pt-12">
                  <div className="flex items-center gap-4 sm:gap-6">
                    <span className="text-[9px] font-bold uppercase tracking-[0.5em] text-primary/60">WORK_SYSTEMS</span>
                    <div className="h-[1px] flex-1 bg-outline-variant/20"></div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
                    {workspaces.map((ws: Product) => {
                      const allImgs = (ws.images && ws.images.length > 0)
                        ? ws.images.map((i: any) => i.url)
                        : [fallbackImages[ws.id % 3]];

                      return (
                        <div
                          key={ws.id}
                          className="group bg-white rounded-none overflow-hidden border border-outline-variant/10 shadow-[0_20px_50px_rgba(27,28,28,0.03)] hover:shadow-[0_40px_80px_rgba(0,105,111,0.08)] transition-all duration-500 flex flex-col justify-between"
                        >
                           <ProductCardCarousel
                             productName={ws.name}
                             images={allImgs}
                             onOpenLightbox={(imgs, idx) => setLightbox({ isOpen: true, title: ws.name, images: imgs, activeIndex: idx })}
                           />
                           
                           <div className="p-5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 flex-1 flex flex-col justify-between">
                              <div className="space-y-3">
                                  <div className="flex justify-between items-start gap-2">
                                      <h3 className="font-display text-lg sm:text-xl font-bold tracking-tight text-on-surface">{ws.name}</h3>
                                      <span className="text-[8px] font-bold uppercase tracking-widest text-primary bg-primary/5 px-2 py-1 shrink-0">{ws.capacity} SEATS</span>
                                  </div>
                                  <p className="text-xs text-gray-500 line-clamp-2">{ws.description || "Premium dedicated office workspace with enterprise features."}</p>
                              </div>

                              <div className="flex items-center justify-between pt-4 sm:pt-6 border-t border-outline-variant/10">
                                  <div>
                                      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block">Monthly Rent</span>
                                      <span className="text-lg sm:text-xl font-display font-black text-[#006064]">{formatPrice(ws.pricingPlans[0]?.price || 0)}</span>
                                  </div>
                                  <Link
                                      href={`/products/${ws.id}`}
                                      className="bg-[#006064] hover:bg-[#004D40] text-white px-5 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] shadow-md hover:shadow-lg transition-all rounded-xs"
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

        {/* ── AWFIS-INSPIRED DYNAMIC SECTIONS ── */}
        <div className="border-t border-gray-200 pt-16 space-y-16">
          
          {/* SECTION 1: WHY CHOOSE SSPACIA */}
          <section className="space-y-6">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-[#1B1C1C] tracking-tight italic">
              Why Choose a Cowork Space in Ahmedabad?
            </h2>
            <p className="text-xs text-gray-600 leading-relaxed max-w-4xl">
              Ahmedabad, a rapidly growing business hub, is home to a thriving ecosystem of entrepreneurs and enterprises. Choosing a coworking space in Ahmedabad offers several advantages:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
              <div className="p-6 bg-white border border-gray-200 shadow-sm space-y-2 hover:border-[#1ab0bc] transition-all">
                <span className="text-[#1ab0bc] font-mono text-xs font-black">01 // VALUE</span>
                <h4 className="font-bold text-sm text-[#1B1C1C]">Cost-Effective Solutions</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Traditional office spaces can be expensive and inflexible. SSPACIA provides affordable alternatives with all necessary enterprise amenities.
                </p>
              </div>

              <div className="p-6 bg-white border border-gray-200 shadow-sm space-y-2 hover:border-[#1ab0bc] transition-all">
                <span className="text-[#1ab0bc] font-mono text-xs font-black">02 // NETWORK</span>
                <h4 className="font-bold text-sm text-[#1B1C1C]">Networking Opportunities</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Sharing a workspace in Ahmedabad with like-minded professionals creates opportunities to build connections, share ideas, and grow.
                </p>
              </div>

              <div className="p-6 bg-white border border-gray-200 shadow-sm space-y-2 hover:border-[#1ab0bc] transition-all">
                <span className="text-[#1ab0bc] font-mono text-xs font-black">03 // LOCATIONS</span>
                <h4 className="font-bold text-sm text-[#1B1C1C]">Convenient Prime Locations</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  SSPACIA centers are strategically located on SG Highway, Sindhu Bhavan Marg, and C.G. Road ensuring ease of access to transit and dining.
                </p>
              </div>

              <div className="p-6 bg-white border border-gray-200 shadow-sm space-y-2 hover:border-[#1ab0bc] transition-all">
                <span className="text-[#1ab0bc] font-mono text-xs font-black">04 // FLEXIBILITY</span>
                <h4 className="font-bold text-sm text-[#1B1C1C]">Flexibility & Scalability</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Choose from a range of options, whether you need a private cabin, dedicated desk, shared office, or guest meeting room.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 2: PRIME LOCATIONS IN AHMEDABAD */}
          <section className="space-y-6 pt-8 border-t border-gray-200">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-[#1B1C1C] tracking-tight italic">
              Prime Locations for Coworking Spaces in Ahmedabad
            </h2>
            <p className="text-xs text-gray-600 leading-relaxed max-w-4xl">
              SSPACIA has carefully selected locations across Ahmedabad to provide the best accessibility and top-tier workspace facilities:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
              <div className="bg-white border border-gray-200 p-6 space-y-3">
                <div className="flex items-center gap-2 text-[#1ab0bc]">
                  <MapPin className="w-5 h-5" />
                  <h3 className="font-bold text-base text-[#1B1C1C]">Premier House</h3>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Situated on SG Highway, Bodakdev, Premier House offers breathtaking executive cabins, dedicated desks, and seamless airport connectivity.
                </p>
              </div>

              <div className="bg-white border border-gray-200 p-6 space-y-3">
                <div className="flex items-center gap-2 text-[#1ab0bc]">
                  <MapPin className="w-5 h-5" />
                  <h3 className="font-bold text-base text-[#1B1C1C]">Mercado</h3>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Located on Sindhu Bhavan Marg, Mercado offers premium corporate office suites and vibrant networking event spaces.
                </p>
              </div>

              <div className="bg-white border border-gray-200 p-6 space-y-3">
                <div className="flex items-center gap-2 text-[#1ab0bc]">
                  <MapPin className="w-5 h-5" />
                  <h3 className="font-bold text-base text-[#1B1C1C]">Agarwal Complex</h3>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Positioned at C.G. Road, Navrangpura, offering instant access to commercial banking districts and retail centers.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 3: BOOK YOUR SHARED OFFICE TODAY CALLOUT */}
          <section className="bg-[#1B1C1C] text-white p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 max-w-2xl">
              <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-[#1ab0bc]">
                Book Your Shared Office Space in Ahmedabad Today!
              </h2>
              <p className="text-xs text-white/70 leading-relaxed">
                Ready to experience the benefits of a premium coworking space? SSPACIA offers state-of-the-art office setups designed to help you work efficiently and connect with industry leaders.
              </p>
            </div>
            <Link
              href="/contact"
              className="bg-[#1ab0bc] text-white px-8 py-4 text-xs font-black uppercase tracking-[0.2em] shadow-lg hover:bg-teal-600 transition-all shrink-0"
            >
              BOOK A SPACE TOUR
            </Link>
          </section>

          {/* SECTION 4: FAQ'S ACCORDION */}
          <section className="space-y-6 pt-8 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-[#1ab0bc]" />
              <h2 className="text-2xl md:text-3xl font-display font-bold text-[#1B1C1C] tracking-tight italic">
                Frequently Asked Questions (FAQ's)
              </h2>
            </div>

            <div className="space-y-4 max-w-4xl">
              {[
                {
                  q: "Is a shared office space in Ahmedabad suitable for freelancers?",
                  a: "Absolutely! Shared office spaces in Ahmedabad offer an affordable, flexible, and high-productivity environment ideal for freelancers and independent contractors."
                },
                {
                  q: "How can coworking spaces in Ahmedabad benefit startups?",
                  a: "Coworking spaces provide cost-effective infrastructure, flexible month-to-month contracts, meeting rooms, and networking events for rapid business growth."
                },
                {
                  q: "Can I use a coworking space in Ahmedabad for virtual office services?",
                  a: "Yes! SSPACIA offers virtual office business address plans, mail handling, and GST registration assistance."
                },
                {
                  q: "What amenities are included in SSPACIA coworking plans?",
                  a: "High-speed Wi-Fi, 24/7 access options, complimentary tea/coffee, ergonomic seating, printing facilities, and air-conditioned conference rooms."
                }
              ].map((faq, idx) => (
                <div key={idx} className="border border-gray-200 bg-white">
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full text-left p-5 flex items-center justify-between font-bold text-sm text-[#1B1C1C] hover:text-[#1ab0bc] transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${openFaq === idx ? 'rotate-180 text-[#1ab0bc]' : 'text-gray-400'}`} />
                  </button>
                  {openFaq === idx && (
                    <div className="px-5 pb-5 text-xs text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

        </div>

      </div>

    </div>
  );
}

// ─── CARD MULTI-IMAGE CAROUSEL SUBCOMPONENT ───
function ProductCardCarousel({
  productName,
  images,
  onOpenLightbox,
  className = "w-full h-56 sm:h-64 aspect-[16/10]"
}: {
  productName: string;
  images: string[];
  onOpenLightbox: (allImgs: string[], startIdx: number) => void;
  className?: string;
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
    <div className={`relative overflow-hidden group bg-neutral-100 border-b lg:border-b-0 lg:border-r border-gray-100 ${className}`}>
      <img
        src={images[currentIdx] || images[0]}
        alt={`${productName} image ${currentIdx + 1}`}
        className="absolute inset-0 w-full h-full object-cover transition-all duration-500 transform group-hover:scale-105"
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
