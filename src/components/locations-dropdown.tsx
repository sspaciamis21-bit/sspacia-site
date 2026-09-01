"use client";

import React, { useState } from "react";
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
  Sparkles
} from "lucide-react";
import { locationsNavData } from "@/config/locations-nav";

interface LocationsDropdownProps {
  onLinkClick?: () => void;
}

export function LocationsDropdown({ onLinkClick }: LocationsDropdownProps) {
  const router = useRouter();
  const [activeAreaId, setActiveAreaId] = useState<string | null>(null);
  const [activeCenterId, setActiveCenterId] = useState<string | null>(null);
  const [activeCategoryType, setActiveCategoryType] = useState<"guest" | "coworking" | null>(null);

  const activeArea = locationsNavData.find(a => a.id === activeAreaId);
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
          <MapPin size={11} className="text-[#1ab0bc]" />
        </div>

        <div className="py-1">
          {locationsNavData.map((area) => {
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
                    ? "bg-[#1ab0bc] text-white"
                    : "text-gray-700 hover:bg-gray-50 hover:text-[#1ab0bc]"
                }`}
              >
                <Link
                  href={`/products?area=${encodeURIComponent(area.name)}`}
                  onClick={onLinkClick}
                  className="flex items-center gap-1.5 flex-1"
                >
                  <MapPin className={`w-3.5 h-3.5 ${isAreaActive ? "text-white" : "text-[#1ab0bc]"}`} />
                  <span>{area.name}</span>
                </Link>
                <ChevronRight className={`w-3.5 h-3.5 ${isAreaActive ? "text-white" : "text-gray-300"}`} />
              </div>
            );
          })}
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
            <Building2 size={11} className="text-[#1ab0bc]" />
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
                      ? "bg-[#1ab0bc] text-white"
                      : "text-gray-700 hover:bg-gray-50 hover:text-[#1ab0bc]"
                  }`}
                >
                  <Link
                    href={`/products?centre=${center.id}`}
                    onClick={onLinkClick}
                    className="flex items-center gap-1.5 flex-1 min-w-0"
                  >
                    <Building2 className={`w-3.5 h-3.5 shrink-0 ${isCenterActive ? "text-white" : "text-[#1ab0bc]"}`} />
                    <div className="truncate">
                      <span className="block leading-tight truncate">{center.name}</span>
                      <span className={`text-[8.5px] font-normal normal-case block truncate opacity-80 ${isCenterActive ? "text-teal-100" : "text-gray-400"}`}>
                        {center.shortName}
                      </span>
                    </div>
                  </Link>
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isCenterActive ? "text-white" : "text-gray-300"}`} />
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
                  ? "bg-[#1ab0bc] text-white"
                  : "text-gray-700 hover:bg-gray-50 hover:text-[#1ab0bc]"
              }`}
            >
              <Link
                href={`/guest-spaces?centre=${activeCenter.id}`}
                onClick={onLinkClick}
                className="flex items-center gap-1.5 flex-1"
              >
                <Calendar className={`w-3.5 h-3.5 shrink-0 ${activeCategoryType === "guest" ? "text-white" : "text-teal-600"}`} />
                <div>
                  <span className="block leading-tight">Guest Spaces</span>
                  <span className={`text-[8.5px] font-normal normal-case block opacity-80 ${activeCategoryType === "guest" ? "text-teal-100" : "text-gray-400"}`}>
                    Hourly / Daily
                  </span>
                </div>
              </Link>
              <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${activeCategoryType === "guest" ? "text-white" : "text-gray-300"}`} />
            </div>

            {/* Co-working option */}
            <div
              onMouseEnter={() => setActiveCategoryType("coworking")}
              className={`flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-colors border-t border-gray-50 ${
                activeCategoryType === "coworking"
                  ? "bg-[#1ab0bc] text-white"
                  : "text-gray-700 hover:bg-gray-50 hover:text-[#1ab0bc]"
              }`}
            >
              <Link
                href={`/coworking-spaces?centre=${activeCenter.id}`}
                onClick={onLinkClick}
                className="flex items-center gap-1.5 flex-1"
              >
                <Briefcase className={`w-3.5 h-3.5 shrink-0 ${activeCategoryType === "coworking" ? "text-white" : "text-teal-600"}`} />
                <div>
                  <span className="block leading-tight">Co-Working</span>
                  <span className={`text-[8.5px] font-normal normal-case block opacity-80 ${activeCategoryType === "coworking" ? "text-teal-100" : "text-gray-400"}`}>
                    Monthly / Dedicated
                  </span>
                </div>
              </Link>
              <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${activeCategoryType === "coworking" ? "text-white" : "text-gray-300"}`} />
            </div>
          </div>

          <div className="p-1.5 border-t border-gray-100 bg-gray-50/70 mt-1">
            <Link
              href={`/products?centre=${activeCenter.id}`}
              onClick={onLinkClick}
              className="text-[9px] font-bold text-[#1ab0bc] hover:text-[#004D40] hover:underline flex items-center justify-center gap-1 uppercase tracking-wider py-0.5"
            >
              <span>View {activeCenter.name} →</span>
            </Link>
          </div>
        </div>
      )}

      {/* ── TIER 4: AVAILABLE PRODUCTS MINI TABLE WITH IMAGES (w-[460px]) ── */}
      {activeCategory && activeCenter && (
        <div 
          className="w-[460px] bg-white/98 backdrop-blur-xl shadow-2xl rounded-sm border border-gray-200/90 z-[123] text-left font-sans shrink-0 animate-in fade-in slide-in-from-left-1 duration-150 overflow-hidden"
          style={{ marginLeft: "1px" }}
        >
          {/* Header */}
          <div className="px-3.5 py-2.5 bg-gradient-to-r from-[#00696F] to-[#004D40] text-white flex items-center justify-between border-b border-teal-600/30">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-white">
                {activeCategory.title}
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/15 text-teal-200 uppercase tracking-widest">
                {activeCenter.name}
              </span>
            </div>
            <Link
              href={activeCategory.href}
              onClick={onLinkClick}
              className="text-[9px] font-bold uppercase tracking-wider text-teal-200 hover:text-white flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded transition-colors"
            >
              <span>View All</span>
              <ArrowRight size={9} />
            </Link>
          </div>

          {/* Table view with Thumbnail Images */}
          <div className="p-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[8.5px] font-black uppercase tracking-wider text-gray-400">
                  <th className="py-1 px-2 w-[46%]">Space / Workspace</th>
                  <th className="py-1 px-2">Facilities & Setup</th>
                  <th className="py-1 px-1 w-5 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {activeCategory.products.map((prod, idx) => (
                  <tr
                    key={idx}
                    className="group hover:bg-teal-50/80 transition-colors cursor-pointer"
                  >
                    <td className="py-1.5 px-2 align-middle">
                      <Link 
                        href={prod.href}
                        onClick={onLinkClick}
                        className="flex items-center gap-2"
                      >
                        <div className="relative w-8 h-8 rounded overflow-hidden shrink-0 border border-gray-200 shadow-2xs group-hover:border-[#1ab0bc] transition-colors">
                          <Image
                            src={prod.image}
                            alt={prod.name}
                            fill
                            sizes="32px"
                            className="object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-[11px] text-gray-900 group-hover:text-[#00696F] transition-colors leading-tight truncate">
                            {prod.name}
                          </span>
                          {prod.badge && (
                            <span className="w-fit text-[8px] font-semibold text-teal-700 bg-teal-50 border border-teal-200/60 px-1 py-0.2 rounded mt-0.5">
                              {prod.badge}
                            </span>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="py-1.5 px-2 align-middle text-[10px] text-gray-500 font-normal leading-tight">
                      <Link 
                        href={prod.href}
                        onClick={onLinkClick}
                        className="block text-gray-600 group-hover:text-gray-900 transition-colors line-clamp-2"
                      >
                        {prod.description}
                      </Link>
                    </td>
                    <td className="py-1.5 px-1 text-right align-middle">
                      <Link 
                        href={prod.href}
                        onClick={onLinkClick}
                        className="text-gray-300 group-hover:text-[#00696F] transition-colors inline-block"
                      >
                        <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-2 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between">
            <Link
              href={activeCategory.href}
              onClick={onLinkClick}
              className="text-[9px] font-bold text-[#1ab0bc] hover:text-teal-800 flex items-center gap-1 uppercase tracking-wider group"
            >
              <span>Explore All {activeCategory.title} in {activeCenter.name}</span>
              <ArrowRight className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
