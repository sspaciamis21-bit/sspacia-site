"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Building2, 
  DoorOpen, 
  ChevronRight, 
  ArrowRight,
  MapPin,
  Loader2
} from "lucide-react";

interface ProductsDropdownProps {
  onLinkClick?: () => void;
}

interface ProductDetail {
  id: number;
  name: string;
  slug?: string;
  badge?: string;
  badgeColor?: string;
  centreName?: string;
  image: string;
  facilities: string;
  href: string;
}

interface CentreOption {
  id: string;
  locationId?: number;
  name: string;
  shortName: string;
  guestProducts: ProductDetail[];
  coworkingProducts: ProductDetail[];
}

export function ProductsDropdown({ onLinkClick }: ProductsDropdownProps) {
  const [activeCategory, setActiveCategory] = useState<"guest" | "coworking">("guest");
  const [selectedCenterId, setSelectedCenterId] = useState<string>("all");
  const [centresData, setCentresData] = useState<CentreOption[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch live catalog from database
  useEffect(() => {
    let isMounted = true;
    async function loadLiveCatalog() {
      try {
        const res = await fetch("/api/nav/catalog", { cache: "no-store" });
        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.productsDropdownData)) {
          setCentresData(data.productsDropdownData);
        }
      } catch (err) {
        console.warn("Notice: Live nav catalog loading:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadLiveCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  const currentCenter = centresData.find(c => c.id === selectedCenterId) || centresData[0];
  const displayedProducts = currentCenter 
    ? (activeCategory === "guest" ? currentCenter.guestProducts : currentCenter.coworkingProducts)
    : [];

  return (
    <div className="relative font-sans text-left select-none pt-1">
      {/* ── UNIFIED MEGA PANEL CONTAINER (840px width with rich visuals) ── */}
      <div className="w-[840px] max-w-[calc(100vw-24px)] bg-white/98 backdrop-blur-xl rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.22)] border border-[#006064]/25 overflow-hidden flex flex-col md:flex-row">
        
        {/* ── LEFT SIDEBAR: CATEGORY & QUICK ACTIONS (~200px) ── */}
        <div className="w-full md:w-[200px] bg-slate-50/95 border-b md:border-b-0 md:border-r border-slate-200 p-3.5 flex flex-col justify-between shrink-0">
          <div className="space-y-3">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block px-1">
              Select Category
            </span>

            {/* Category Option 1: Guest Spaces */}
            <button
              type="button"
              onClick={() => setActiveCategory("guest")}
              onMouseEnter={() => setActiveCategory("guest")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeCategory === "guest"
                  ? "bg-[#006064] text-white shadow-md font-extrabold scale-[1.02]"
                  : "bg-white text-slate-700 hover:bg-teal-50 hover:text-[#006064] border border-slate-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <DoorOpen size={15} className={activeCategory === "guest" ? "text-amber-300" : "text-teal-700"} />
                <span>Guest Spaces</span>
              </div>
              <ChevronRight size={14} className={activeCategory === "guest" ? "text-white" : "text-slate-300"} />
            </button>

            {/* Category Option 2: Co-Working Spaces */}
            <button
              type="button"
              onClick={() => setActiveCategory("coworking")}
              onMouseEnter={() => setActiveCategory("coworking")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeCategory === "coworking"
                  ? "bg-[#006064] text-white shadow-md font-extrabold scale-[1.02]"
                  : "bg-white text-slate-700 hover:bg-teal-50 hover:text-[#006064] border border-slate-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <Building2 size={15} className={activeCategory === "coworking" ? "text-amber-300" : "text-teal-700"} />
                <span>Co-working</span>
              </div>
              <ChevronRight size={14} className={activeCategory === "coworking" ? "text-white" : "text-slate-300"} />
            </button>
          </div>

          {/* Quick Hub Links */}
          <div className="pt-3 mt-3 border-t border-slate-200 space-y-1.5">
            <span className="text-[8.5px] font-black uppercase tracking-[0.18em] text-slate-400 block px-1">
              Direct Catalogs
            </span>
            <Link
              href="/guest-spaces"
              onClick={onLinkClick}
              className="block text-[10.5px] font-bold text-[#006064] hover:text-[#004D40] hover:underline px-1 py-0.5"
            >
              ⚡ Hourly Meeting Rooms →
            </Link>
            <Link
              href="/coworking-spaces"
              onClick={onLinkClick}
              className="block text-[10.5px] font-bold text-[#006064] hover:text-[#004D40] hover:underline px-1 py-0.5"
            >
              🏢 Dedicated Private Cabins →
            </Link>
          </div>
        </div>

        {/* ── RIGHT MAIN PANEL: MINI TABLE WITH CENTRE PILLS (FLEX-1) ── */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          
          {/* Header Bar */}
          <div className="px-4 py-2.5 bg-gradient-to-r from-[#006064] to-[#004D40] text-white flex items-center justify-between border-b border-teal-600/30">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.15em] text-white">
                {activeCategory === "guest" ? "Guest Spaces Available" : "Co-Working Spaces Available"}
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white uppercase tracking-wider">
                {displayedProducts.length} Spaces
              </span>
            </div>
            <Link
              href={activeCategory === "guest" ? "/guest-spaces" : "/coworking-spaces"}
              onClick={onLinkClick}
              className="text-[10px] font-bold uppercase tracking-wider text-teal-100 hover:text-white flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-md transition-colors"
            >
              <span>View All</span>
              <ArrowRight size={10} />
            </Link>
          </div>

          {/* Centre Filter Pills Bar */}
          <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1 mr-1">
              <MapPin size={11} className="text-[#006064]" /> Filter:
            </span>
            {centresData.map((centre) => {
              const isSelected = centre.id === selectedCenterId;
              return (
                <button
                  key={centre.id}
                  type="button"
                  onClick={() => setSelectedCenterId(centre.id)}
                  className={`text-[9.5px] font-bold px-3 py-1 rounded-full uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? "bg-[#006064] text-white shadow-xs scale-102"
                      : "bg-white text-slate-600 border border-slate-300 hover:border-teal-500 hover:text-[#006064]"
                  }`}
                >
                  {centre.name}
                </button>
              );
            })}
          </div>

          {/* Mini Table Body (Scrollable) */}
          <div className="p-2 flex-1 min-h-[220px]">
            {isLoading && centresData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-slate-400 text-xs gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#006064]" />
                <span>Loading live catalog...</span>
              </div>
            ) : displayedProducts.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-slate-400 text-xs italic">
                No spaces currently available in this category.
              </div>
            ) : (
              <div className="max-h-[340px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-400">
                      <th className="py-1.5 px-2.5 w-[52%]">Workspace / Room</th>
                      <th className="py-1.5 px-2.5">Facilities & Setup</th>
                      <th className="py-1.5 px-1 w-6 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {displayedProducts.map((prod, idx) => (
                      <tr
                        key={`${prod.id}-${prod.name}-${idx}`}
                        className="group hover:bg-teal-50/70 transition-colors cursor-pointer"
                      >
                        {/* Product Thumbnail + Name & Badge */}
                        <td className="py-2 px-2.5 align-middle">
                          <Link 
                            href={prod.href}
                            onClick={onLinkClick}
                            className="flex items-center gap-3"
                          >
                            {/* Larger Photo Thumbnail (90px x 58px) */}
                            <div className="relative w-[90px] h-[58px] rounded-lg overflow-hidden shrink-0 border border-slate-200 shadow-xs group-hover:border-[#006064] group-hover:shadow-md transition-all">
                              <Image
                                src={prod.image}
                                alt={prod.name}
                                fill
                                sizes="90px"
                                className="object-cover group-hover:scale-108 transition-transform duration-300"
                              />
                            </div>
                            <div className="flex flex-col gap-1 min-w-0">
                              <span className="font-bold text-xs text-slate-900 group-hover:text-[#006064] transition-colors leading-tight">
                                {prod.name}
                              </span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {prod.centreName && (
                                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-[#006064] border border-teal-200 shrink-0">
                                    📍 {prod.centreName}
                                  </span>
                                )}
                                {prod.badge && (
                                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${prod.badgeColor || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                                    {prod.badge}
                                  </span>
                                )}
                              </div>
                            </div>
                          </Link>
                        </td>

                        {/* Amenities / Facilities (clean typography) */}
                        <td className="py-2 px-2.5 align-middle text-[10px] text-slate-500 font-medium leading-snug">
                          <Link 
                            href={prod.href}
                            onClick={onLinkClick}
                            className="block text-slate-500 group-hover:text-slate-800 transition-colors line-clamp-2"
                          >
                            {prod.facilities}
                          </Link>
                        </td>

                        {/* Action Chevron */}
                        <td className="py-2 px-1 text-right align-middle">
                          <Link 
                            href={prod.href}
                            onClick={onLinkClick}
                            className="text-slate-300 group-hover:text-[#006064] transition-colors inline-block"
                          >
                            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bottom Action Footer */}
          <div className="px-3.5 py-2.5 border-t border-slate-200 bg-slate-50/90 flex items-center justify-between text-[10.5px]">
            <span className="text-[#006064] font-semibold flex items-center gap-1">
              <MapPin size={12} /> {selectedCenterId === "all" ? "Showing all workspaces across Ahmedabad" : `Showing ${currentCenter?.name || ''} (${currentCenter?.shortName || ''})`}
            </span>
            <Link
              href={selectedCenterId === "all" ? (activeCategory === "guest" ? "/guest-spaces" : "/coworking-spaces") : `/products?centre=${currentCenter?.locationId || selectedCenterId}`}
              onClick={onLinkClick}
              className="font-bold text-[#006064] hover:text-[#004D40] flex items-center gap-1 uppercase tracking-wider group"
            >
              <span>{selectedCenterId === "all" ? "View Full Catalog" : `Explore ${currentCenter?.name || ''}`}</span>
              <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
