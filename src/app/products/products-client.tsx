"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { 
  X, 
  Filter, 
  MapPin, 
  Zap, 
  Coffee, 
  Wifi, 
  Monitor
} from "lucide-react";
import { BookOnlineForm } from "@/components/book-online-form";
import { AvailabilityTimeline } from "@/components/ui/availability-timeline";

import type { Product, City, Amenity } from "./page";

interface ProductsClientProps {
  products: Product[];
  cities: City[];
  amenities: Amenity[];
  categories: { id: number; name: string }[];
  productTypes: { id: number; name: string }[];
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
  productTypes = [] 
}: ProductsClientProps) {
  // ─── Filter States ─────────────────────────────────────────
  const [selectedCityId, setSelectedCityId] = useState<number | undefined>();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>();
  const [selectedTypeId, setSelectedTypeId] = useState<number | undefined>();
  const [selectedLocationId, setSelectedLocationId] = useState<number | undefined>();
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  });
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedSlotsByProduct, setSelectedSlotsByProduct] = useState<Record<number, string[]>>({});
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ location: "", spaceType: "" });

  const handleToggleSlot = (productId: number, slot: string) => {
    setSelectedSlotsByProduct(prev => {
      const current = prev[productId] || [];
      const updated = current.includes(slot) 
        ? current.filter(s => s !== slot) 
        : [...current, slot];
      return { ...prev, [productId]: updated };
    });
  };

  const handleCityChange = (cityId: number | string | undefined) => {
    const id = cityId ? Number(cityId) : undefined;
    setSelectedCityId(id);
    setSelectedLocationId(undefined); 
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (selectedCityId && p.location.cityId !== selectedCityId) return false;
      if (selectedCategoryId && p.categoryId !== selectedCategoryId) return false;
      if (selectedTypeId && p.typeId !== selectedTypeId) return false;
      if (selectedLocationId && p.location.id !== selectedLocationId) return false;
      if (selectedAmenityIds.length > 0) {
        const productAmenityIds = p.amenities.map(pa => pa.amenity.id);
        const hasAllAmenities = selectedAmenityIds.every(id => productAmenityIds.includes(id));
        if (!hasAllAmenities) return false;
      }
      return true;
    });
  }, [products, selectedCityId, selectedLocationId, selectedAmenityIds, selectedCategoryId, selectedTypeId]);

  const filteredTypeOptions = useMemo(() => {
    if (!selectedCategoryId) return [];
    const validTypeIdSet = new Set(products.filter(p => p.categoryId === selectedCategoryId).map(p => p.typeId));
    return productTypes.filter(t => validTypeIdSet.has(t.id));
  }, [selectedCategoryId, productTypes, products]);

  const guestSpaces = useMemo(() => filteredProducts.filter(p => p.categoryId === 1), [filteredProducts]);
  const workspaces = useMemo(() => filteredProducts.filter(p => p.categoryId !== 1), [filteredProducts]);

  const toggleAmenity = (id: number) => {
    setSelectedAmenityIds(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const openInquiryModal = (locationName: string, spaceType: string) => {
    setModalData({ location: locationName, spaceType });
    setIsModalOpen(true);
  };

  const formatPrice = (price: number) => `₹${price.toLocaleString()}/-`;

  const getAmenityIcon = (slug: string) => {
    switch (slug) {
      case 'wifi': return <Wifi className="w-3.5 h-3.5" />;
      case 'coffee': return <Coffee className="w-3.5 h-3.5" />;
      case 'monitor': return <Monitor className="w-3.5 h-3.5" />;
      case 'power': return <Zap className="w-3.5 h-3.5" />;
      default: return <Zap className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="min-h-screen py-16 bg-[#FBF9F8]">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ── SIDEBAR: MASTER FILTER ── */}
        <aside className="w-full lg:w-72 flex-shrink-0">
          <div className="sticky top-28 bg-white/80 p-8 rounded-sm border border-outline-variant/5 shadow-[0_40px_100px_rgba(0,105,111,0.06)] backdrop-blur-3xl max-h-[calc(100vh-140px)] overflow-y-auto no-scrollbar">
            <div className="space-y-8">
               {/* Category Hub */}
               <div className="space-y-2">
                  <label className="text-[9px] font-sans font-bold text-tertiary/50 uppercase tracking-[0.2em]">CATEGORY</label>
                  <FilterDropdown 
                    label="" 
                    options={categories} 
                    selectedId={selectedCategoryId}
                    onSelect={(id) => {
                      setSelectedCategoryId(id ? Number(id) : undefined);
                      setSelectedTypeId(undefined);
                    }}
                    placeholder="Select Category"
                    icon={<Zap className="w-3.5 h-3.5" />}
                  />
               </div>

               {/* Type Hub */}
               <div className="space-y-2">
                  <label className="text-[9px] font-sans font-bold text-tertiary/50 uppercase tracking-[0.2em]">SPACE TYPE</label>
                  <FilterDropdown 
                    label="" 
                    options={filteredTypeOptions} 
                    selectedId={selectedTypeId}
                    onSelect={(id) => setSelectedTypeId(id ? Number(id) : undefined)}
                    placeholder="Select Type"
                    disabled={!selectedCategoryId}
                    icon={<Filter className="w-3.5 h-3.5" />}
                  />
               </div>

               {/* City Hub */}
               <div className="space-y-2">
                  <label className="text-[9px] font-sans font-bold text-tertiary/50 uppercase tracking-[0.2em]">CITY</label>
                  <FilterDropdown 
                    label="" 
                    options={cities} 
                    selectedId={selectedCityId}
                    onSelect={handleCityChange}
                    placeholder="Select City"
                    icon={<MapPin className="w-3.5 h-3.5" />}
                  />
               </div>

               {/* Date Selector */}
               <div className="space-y-2">
                  <label className="text-[9px] font-sans font-bold text-tertiary/50 uppercase tracking-[0.2em]">DATE</label>
                  <input 
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full h-10 bg-transparent text-[13px] border-b border-outline-variant/30 focus:border-cyan-500 outline-none transition-all placeholder:text-tertiary/20"
                  />
               </div>

               {/* Time Selector */}
               <div className="space-y-2">
                  <label className="text-[9px] font-sans font-bold text-tertiary/50 uppercase tracking-[0.2em]">TIME</label>
                  <input 
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full h-10 bg-transparent text-[13px] border-b border-outline-variant/30 focus:border-cyan-500 outline-none transition-all"
                  />
               </div>

               {/* Amenities Stack */}
               <div className="space-y-4">
                  <label className="text-[9px] font-sans font-bold text-tertiary/50 uppercase tracking-[0.2em]">AMENITIES</label>
                  <div className="flex flex-wrap gap-2 pb-2 border-b border-outline-variant/30">
                    {amenities.slice(0, 4).map(amenity => (
                        <button
                          key={amenity.id}
                          onClick={() => toggleAmenity(amenity.id)}
                          className={`p-2 rounded-lg transition-all ${
                              selectedAmenityIds.includes(amenity.id)
                              ? "text-cyan-500 scale-110"
                              : "text-tertiary/20 hover:text-tertiary/60"
                          }`}
                          title={amenity.name}
                        >
                          {getAmenityIcon(amenity.slug)}
                        </button>
                    ))}
                  </div>
               </div>

               {/* Main CTA */}
               <div className="pt-4">
                 <button className="w-full bg-[#1ab0bc] text-white py-4 rounded-sm text-[10px] font-bold uppercase tracking-[0.1em] hover:brightness-95 transition-all shadow-lg active:scale-95">
                   SEARCH SPACES
                 </button>
                 
                 {(selectedCityId || selectedLocationId || selectedAmenityIds.length > 0 || selectedCategoryId || selectedTypeId) && (
                   <button 
                    onClick={() => {
                        setSelectedCityId(undefined);
                        setSelectedLocationId(undefined);
                        setSelectedAmenityIds([]);
                        setSelectedCategoryId(undefined);
                        setSelectedTypeId(undefined);
                        setSelectedDate(new Date().toISOString().split('T')[0]);
                        setSelectedTime("");
                    }}
                    className="w-full mt-4 text-[9px] font-bold text-tertiary/30 uppercase tracking-[0.1em] hover:text-cyan-600 transition-colors"
                   >
                     Reset Filters
                   </button>
                 )}
               </div>
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT: CATALOG ── */}
        <main className="flex-1 space-y-24">
          {filteredProducts.length === 0 ? (
            <div className="py-32 text-center space-y-6 bg-surface-container-low/5 rounded-none border border-dashed border-outline-variant/20">
               <div className="w-16 h-16 bg-surface-container-low mx-auto rounded-full flex items-center justify-center text-primary/5">
                  <Filter className="w-8 h-8" />
               </div>
               <p className="text-xl font-medium text-tertiary/40 italic">No matches for your current system filters.</p>
            </div>
          ) : (
            <section className="space-y-20">
              {/* Collaborative Nodes */}
              {guestSpaces.length > 0 && (
                <div className="space-y-12">
                  <div className="flex items-center gap-6">
                    <span className="text-[9px] font-bold uppercase tracking-[0.5em] text-secondary/40">COLLABORATION_NODES</span>
                    <div className="h-[1px] flex-1 bg-outline-variant/10"></div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-12">
                    {guestSpaces.map((gs) => {
                      const primaryImage = gs.images.find(img => img.isPrimary)?.url || gs.images[0]?.url || fallbackImages[gs.id % 3];
                      return (
                        <motion.div
                          key={gs.id}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="group bg-white rounded-none overflow-hidden border border-outline-variant/5 shadow-[0_20px_50px_rgba(27,28,28,0.03)] hover:shadow-[0_40px_80px_rgba(0,105,111,0.08)] transition-all duration-700 flex flex-col md:flex-row h-full"
                        >
                           <div className="w-full md:w-[40%] aspect-[4/3] md:aspect-auto relative overflow-hidden">
                              <Image 
                                src={primaryImage} 
                                alt={gs.name} 
                                fill 
                                className="object-cover transform group-hover:scale-110 transition-transform duration-[2000ms] grayscale group-hover:grayscale-0" 
                              />
                              <div className="absolute top-6 left-6">
                                  <span className="bg-primary/95 text-white text-[8px] font-bold px-4 py-2 uppercase tracking-[0.3em] rounded-none backdrop-blur-md">GUEST_O{gs.id}</span>
                              </div>
                           </div>
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
                                              const basePrice = parseFloat(gs.pricingPlans.find(p => p.type?.toLowerCase().includes("hour"))?.price || gs.pricingPlans[0]?.price || "0");
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
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Work Systems */}
              {workspaces.length > 0 && (
                <div className="space-y-12 pt-12">
                  <div className="flex items-center gap-6">
                    <span className="text-[9px] font-bold uppercase tracking-[0.5em] text-primary/40">WORK_SYSTEMS</span>
                    <div className="h-[1px] flex-1 bg-outline-variant/10"></div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {workspaces.map((ws) => {
                      const primaryImage = ws.images.find(img => img.isPrimary)?.url || ws.images[0]?.url || fallbackImages[ws.id % 3];
                      return (
                        <motion.div
                          key={`ws-${ws.id}`}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          className="group bg-white rounded-none overflow-hidden border border-outline-variant/5 shadow-[0_20px_50px_rgba(27,28,28,0.03)] hover:shadow-[0_40px_80px_rgba(0,105,111,0.08)] transition-all duration-700 flex flex-col h-full"
                        >
                           <div className="aspect-[16/9] relative overflow-hidden">
                              <Image 
                                src={primaryImage} 
                                alt={ws.name} 
                                fill 
                                className="object-cover transform group-hover:scale-110 transition-transform duration-[2000ms] grayscale group-hover:grayscale-0" 
                              />
                              <div className="absolute top-6 left-6">
                                  <span className="bg-primary/95 text-white text-[8px] font-bold px-4 py-2 uppercase tracking-[0.3em] rounded-none backdrop-blur-md">SYSTEM_O{ws.id}</span>
                              </div>
                           </div>
                           <div className="p-8 flex-1 flex flex-col justify-between gap-8">
                              <div className="space-y-4">
                                  <h3 className="font-display text-xl font-bold tracking-tight text-on-surface leading-tight">{ws.name} @ {ws.location.name}</h3>
                                  <div className="flex flex-wrap gap-2">
                                    {ws.amenities.slice(0, 4).map(pa => (
                                      <div key={pa.amenity.id} className="p-2 bg-surface-container-low/50 rounded-sm text-primary border border-outline-variant/5 shadow-sm" title={pa.amenity.name}>
                                        {getAmenityIcon(pa.amenity.slug)}
                                      </div>
                                    ))}
                                  </div>
                              </div>
                              
                              <div className="flex justify-center pt-6 border-t border-outline-variant/5">
                                   <button 
                                       onClick={() => openInquiryModal(ws.location.name, ws.name)}
                                       className="w-full sm:w-auto bg-[#1ab0bc] text-white px-10 py-4 text-[11px] font-black uppercase tracking-[0.2em] rounded-sm shadow-[0_20px_40px_rgba(26,176,188,0.2)] hover:shadow-[0_25px_50px_rgba(26,176,188,0.3)] transition-all transform hover:-translate-y-1 active:scale-95 text-center"
                                   >
                                       ENQUIRE NOW
                                   </button>
                               </div>
                           </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      {/* Inquiry Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-on-surface/90 backdrop-blur-xl" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar bg-white shadow-2xl rounded-2xl">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="absolute right-8 top-8 z-[110] bg-surface-high p-3 text-tertiary hover:bg-primary transition-all rounded-sm"
              >
                <X className="h-4 w-4" />
              </button>
              <BookOnlineForm initialLocation={modalData.location} initialSpaceType={modalData.spaceType} onSuccess={() => setIsModalOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
