"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { 
  MapPin, 
  Building2, 
  ChevronRight, 
  Calendar, 
  Briefcase, 
  ArrowRight,
  Loader2
} from "lucide-react";
import { LocationArea } from "@/config/locations-nav";

interface LocationsDropdownProps {
  onLinkClick?: () => void;
}

export function LocationsDropdown({ onLinkClick }: LocationsDropdownProps) {
  const router = useRouter();
  const [areasData, setAreasData] = useState<LocationArea[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [activeAreaId, setActiveAreaId] = useState<string | null>(null);
  const [activeCenterId, setActiveCenterId] = useState<string | null>(null);
  const [activeCategoryType, setActiveCategoryType] = useState<"guest" | "coworking" | null>(null);

  // Fetch live catalog from database
  useEffect(() => {
    let isMounted = true;
    async function loadLiveCatalog() {
      try {
        const res = await fetch("/api/nav/catalog", { cache: "no-store" });
        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.locationsDropdownData)) {
          setAreasData(data.locationsDropdownData);
        }
      } catch (err) {
        console.warn("Notice: Live nav locations loading:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadLiveCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  const activeArea = areasData.find(a => a.id === activeAreaId);
  const activeCenter = activeArea?.centres.find(c => c.id === activeCenterId);
  const activeCategory = activeCenter 
    ? (activeCategoryType === "guest" ? activeCenter.guestSpaces : activeCategoryType === "coworking" ? activeCenter.coworkingSpaces : null)
    : null;

  return (
    <div 
      className="relative flex items-start select-none"
      onMouseLeave={() => {
        setActiveAreaId(null);
        setActiveCenterId(null);
        setActiveCategoryType(null);
      }}
    >
      {/* ── TIER 1: LOCATIONS (w-44 = 176px) ── */}
      <div className="w-44 bg-white shadow-2xl rounded-sm border border-gray-200/90 py-1.5 z-[120] text-left font-sans shrink-0">
        <div className="px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100 flex items-center justify-between">
          <span>Locations</span>
          <MapPin size={11} className="text-[#006064]" />
        </div>

        <div className="py-1">
          {isLoading && areasData.length === 0 ? (
            <div className="px-3 py-4 flex items-center justify-center text-slate-400 text-xs gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#006064]" />
              <span>Loading...</span>
            </div>
          ) : (
            areasData.map((area) => {
              const isAreaActive = area.id === activeAreaId;
              return (
                <div
                  key={area.id}
                  onMouseEnter={() => {
                    setActiveAreaId(area.id);
                    setActiveCenterId(null);
                    setActiveCategoryType(null);
                  }}
                  className={`relative flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                    isAreaActive
                      ? "bg-[#006064] text-white font-extrabold"
                      : "text-slate-700 hover:bg-slate-50 hover:text-[#006064]"
                  }`}
                >
                  <Link
                    href={`/products?area=${encodeURIComponent(area.name)}`}
                    onClick={onLinkClick}
                    className="flex items-center gap-1.5 flex-1"
                  >
                    <MapPin className={`w-3.5 h-3.5 ${isAreaActive ? "text-white" : "text-[#006064]"}`} />
                    <span>{area.name}</span>
                  </Link>
                  <ChevronRight className={`w-3.5 h-3.5 ${isAreaActive ? "text-white" : "text-slate-300"}`} />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── TIER 2: CENTRES IN SELECTED AREA (w-48 = 192px) ── */}
      {activeArea && (
        <div 
          className="w-48 bg-white shadow-2xl rounded-sm border border-gray-200/90 py-1.5 z-[121] text-left font-sans shrink-0 animate-in fade-in slide-in-from-left-1 duration-150"
          style={{ marginLeft: "1px" }}
        >
          <div className="px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100 flex items-center justify-between">
            <span className="truncate">Centres in {activeArea.name}</span>
            <Building2 size={11} className="text-[#006064]" />
          </div>

          <div className="py-1">
            {activeArea.centres.map((center) => {
              const isCenterActive = center.id === activeCenterId;
              return (
                <div
                  key={center.id}
                  onMouseEnter={() => {
                    setActiveCenterId(center.id);
                    setActiveCategoryType(null);
                  }}
                  className={`relative flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                    isCenterActive
                      ? "bg-[#006064] text-white font-extrabold"
                      : "text-slate-700 hover:bg-slate-50 hover:text-[#006064]"
                  }`}
                >
                  <Link
                    href={`/products?centre=${center.id}`}
                    onClick={onLinkClick}
                    className="flex items-center gap-1.5 flex-1 min-w-0"
                  >
                    <Building2 className={`w-3.5 h-3.5 shrink-0 ${isCenterActive ? "text-white" : "text-[#006064]"}`} />
                    <div className="truncate">
                      <span className="block leading-tight truncate">{center.name}</span>
                      <span className={`text-[8.5px] font-normal normal-case block truncate opacity-85 ${isCenterActive ? "text-teal-100" : "text-slate-400"}`}>
                        {center.shortName}
                      </span>
                    </div>
                  </Link>
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isCenterActive ? "text-white" : "text-slate-300"}`} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TIER 3: SPACE TYPES (w-44 = 176px) ── */}
      {activeCenter && (
        <div 
          className="w-44 bg-white shadow-2xl rounded-sm border border-gray-200/90 py-1.5 z-[122] text-left font-sans shrink-0 animate-in fade-in slide-in-from-left-1 duration-150"
          style={{ marginLeft: "1px" }}
        >
          <div className="px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">
            Space Types
          </div>

          <div className="py-1">
            {/* Guest Spaces option */}
            <div
              onMouseEnter={() => setActiveCategoryType("guest")}
              className={`flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                activeCategoryType === "guest"
                  ? "bg-[#006064] text-white font-extrabold"
                  : "text-slate-700 hover:bg-slate-50 hover:text-[#006064]"
              }`}
            >
              <Link
                href={`/guest-spaces?centre=${activeCenter.id}`}
                onClick={onLinkClick}
                className="flex items-center gap-1.5 flex-1"
              >
                <Calendar className={`w-3.5 h-3.5 shrink-0 ${activeCategoryType === "guest" ? "text-white" : "text-[#006064]"}`} />
                <div>
                  <span className="block leading-tight">Guest Spaces</span>
                  <span className={`text-[8.5px] font-normal normal-case block opacity-85 ${activeCategoryType === "guest" ? "text-teal-100" : "text-slate-400"}`}>
                    Hourly / Daily
                  </span>
                </div>
              </Link>
              <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${activeCategoryType === "guest" ? "text-white" : "text-slate-300"}`} />
            </div>

            {/* Co-working option */}
            <div
              onMouseEnter={() => setActiveCategoryType("coworking")}
              className={`flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-colors border-t border-slate-100 ${
                activeCategoryType === "coworking"
                  ? "bg-[#006064] text-white font-extrabold"
                  : "text-slate-700 hover:bg-slate-50 hover:text-[#006064]"
              }`}
            >
              <Link
                href={`/coworking-spaces?centre=${activeCenter.id}`}
                onClick={onLinkClick}
                className="flex items-center gap-1.5 flex-1"
              >
                <Briefcase className={`w-3.5 h-3.5 shrink-0 ${activeCategoryType === "coworking" ? "text-white" : "text-[#006064]"}`} />
                <div>
                  <span className="block leading-tight">Co-Working</span>
                  <span className={`text-[8.5px] font-normal normal-case block opacity-85 ${activeCategoryType === "coworking" ? "text-teal-100" : "text-slate-400"}`}>
                    Monthly / Dedicated
                  </span>
                </div>
              </Link>
              <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${activeCategoryType === "coworking" ? "text-white" : "text-slate-300"}`} />
            </div>
          </div>

          <div className="p-1.5 border-t border-slate-100 bg-slate-50/70 mt-1">
            <Link
              href={`/products?centre=${activeCenter.id}`}
              onClick={onLinkClick}
              className="text-[9px] font-bold text-[#006064] hover:text-[#004D40] hover:underline flex items-center justify-center gap-1 uppercase tracking-wider py-0.5"
            >
              <span>View {activeCenter.name} →</span>
            </Link>
          </div>
        </div>
      )}

      {/* ── TIER 4: AVAILABLE PRODUCTS MINI TABLE WITH IMAGES (w-[500px]) ── */}
      {activeCategory && activeCenter && (
        <div 
          className="w-[500px] max-w-[calc(100vw-24px)] bg-white/98 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.22)] rounded-lg border border-slate-200/90 z-[123] text-left font-sans shrink-0 animate-in fade-in slide-in-from-left-1 duration-150 overflow-hidden"
          style={{ marginLeft: "1px" }}
        >
          {/* Header */}
          <div className="px-3.5 py-2.5 bg-gradient-to-r from-[#006064] to-[#004D40] text-white flex items-center justify-between border-b border-teal-600/30">
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] font-black uppercase tracking-wider text-white">
                {activeCategory.title}
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-teal-100 uppercase tracking-widest">
                {activeCenter.name}
              </span>
            </div>
            <Link
              href={activeCategory.href}
              onClick={onLinkClick}
              className="text-[9.5px] font-bold uppercase tracking-wider text-teal-100 hover:text-white flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-md transition-colors"
            >
              <span>View All</span>
              <ArrowRight size={10} />
            </Link>
          </div>

          {/* Table view with Large Thumbnail Images */}
          <div className="p-2">
            <div className="max-h-[340px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b border-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-400">
                    <th className="py-1.5 px-2.5 w-[52%]">Space / Workspace</th>
                    <th className="py-1.5 px-2.5">Facilities & Setup</th>
                    <th className="py-1.5 px-1 w-6 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {activeCategory.products.map((prod, idx) => (
                    <tr
                      key={`${prod.name}-${idx}`}
                      className="group hover:bg-teal-50/70 transition-colors cursor-pointer"
                    >
                      {/* Product Thumbnail + Name & Badge */}
                      <td className="py-2 px-2.5 align-middle">
                        <Link 
                          href={prod.href}
                          onClick={onLinkClick}
                          className="flex items-center gap-2.5"
                        >
                          {/* Larger Photo Thumbnail (84px x 54px) */}
                          <div className="relative w-[84px] h-[54px] rounded-lg overflow-hidden shrink-0 border border-slate-200 shadow-2xs group-hover:border-[#006064] group-hover:shadow-md transition-all">
                            <Image
                              src={prod.image}
                              alt={prod.name}
                              fill
                              sizes="84px"
                              className="object-cover group-hover:scale-108 transition-transform duration-300"
                            />
                          </div>
                          <div className="flex flex-col gap-1 min-w-0">
                            <span className="font-bold text-xs text-slate-900 group-hover:text-[#006064] transition-colors leading-tight">
                              {prod.name}
                            </span>
                            {prod.badge && (
                              <span className="w-fit text-[8px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">
                                {prod.badge}
                              </span>
                            )}
                          </div>
                        </Link>
                      </td>

                      {/* Amenities / Facilities */}
                      <td className="py-2 px-2.5 align-middle text-[10px] text-slate-500 font-normal leading-snug">
                        <Link 
                          href={prod.href}
                          onClick={onLinkClick}
                          className="block text-slate-500 group-hover:text-slate-800 transition-colors line-clamp-2"
                        >
                          {prod.description}
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
          </div>

          {/* Bottom Action Footer */}
          <div className="px-3.5 py-2.5 border-t border-slate-200 bg-slate-50/90 flex items-center justify-between text-[10.5px]">
            <Link
              href={activeCategory.href}
              onClick={onLinkClick}
              className="font-bold text-[#006064] hover:text-[#004D40] flex items-center gap-1 uppercase tracking-wider group"
            >
              <span>Explore All {activeCategory.title} in {activeCenter.name}</span>
              <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
