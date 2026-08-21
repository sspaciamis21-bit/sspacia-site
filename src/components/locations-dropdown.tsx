"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  MapPin, 
  Building2, 
  ChevronRight, 
  Calendar, 
  Briefcase, 
  ArrowRight
} from "lucide-react";
import { locationsNavData } from "@/config/locations-nav";

interface LocationsDropdownProps {
  onLinkClick?: () => void;
}

export function LocationsDropdown({ onLinkClick }: LocationsDropdownProps) {
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
                <div className="flex items-center gap-1.5">
                  <MapPin className={`w-3.5 h-3.5 ${isAreaActive ? "text-white" : "text-[#1ab0bc]"}`} />
                  <span>{area.name}</span>
                </div>
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
                  <div className="flex items-center gap-1.5">
                    <Building2 className={`w-3.5 h-3.5 shrink-0 ${isCenterActive ? "text-white" : "text-[#1ab0bc]"}`} />
                    <div className="truncate">
                      <span className="block leading-tight truncate">{center.name}</span>
                      <span className={`text-[8.5px] font-normal normal-case block truncate opacity-80 ${isCenterActive ? "text-teal-100" : "text-gray-400"}`}>
                        {center.shortName}
                      </span>
                    </div>
                  </div>
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
              <div className="flex items-center gap-1.5">
                <Calendar className={`w-3.5 h-3.5 shrink-0 ${activeCategoryType === "guest" ? "text-white" : "text-teal-600"}`} />
                <div>
                  <span className="block leading-tight">Guest Spaces</span>
                  <span className={`text-[8.5px] font-normal normal-case block opacity-80 ${activeCategoryType === "guest" ? "text-teal-100" : "text-gray-400"}`}>
                    Hourly / Daily
                  </span>
                </div>
              </div>
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
              <div className="flex items-center gap-1.5">
                <Briefcase className={`w-3.5 h-3.5 shrink-0 ${activeCategoryType === "coworking" ? "text-white" : "text-teal-600"}`} />
                <div>
                  <span className="block leading-tight">Co-Working</span>
                  <span className={`text-[8.5px] font-normal normal-case block opacity-80 ${activeCategoryType === "coworking" ? "text-teal-100" : "text-gray-400"}`}>
                    Monthly / Dedicated
                  </span>
                </div>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${activeCategoryType === "coworking" ? "text-white" : "text-gray-300"}`} />
            </div>
          </div>

          <div className="p-1.5 border-t border-gray-100 bg-gray-50/70 mt-1">
            <Link
              href={activeCenter.href}
              onClick={onLinkClick}
              className="text-[9px] font-bold text-[#1ab0bc] hover:text-[#004D40] hover:underline flex items-center justify-center gap-1 uppercase tracking-wider py-0.5"
            >
              <span>View {activeCenter.name} →</span>
            </Link>
          </div>
        </div>
      )}

      {/* ── TIER 4: AVAILABLE PRODUCTS (w-56 = 224px) ── */}
      {activeCategory && activeCenter && (
        <div 
          className="w-56 bg-white shadow-2xl rounded-sm border border-gray-200/90 py-1.5 z-[123] text-left font-sans shrink-0 animate-in fade-in slide-in-from-left-1 duration-150"
          style={{ marginLeft: "1px" }}
        >
          <div className="px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-gray-400 border-b border-gray-100 flex items-center justify-between">
            <span className="truncate max-w-[110px] text-gray-600 font-bold">{activeCategory.title}</span>
            <span className="text-[8.5px] text-[#1ab0bc] font-bold uppercase tracking-widest truncate max-w-[90px]">{activeCenter.name}</span>
          </div>

          <div className="py-1">
            {activeCategory.products.map((prod, idx) => (
              <Link
                key={idx}
                href={prod.href}
                onClick={onLinkClick}
                className="group flex flex-col px-3 py-1.5 text-xs hover:bg-teal-50/70 transition-colors border-b border-gray-50 last:border-0"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-gray-800 group-hover:text-[#1ab0bc] transition-colors leading-tight">
                    {prod.name}
                  </span>
                  {prod.badge && (
                    <span className="text-[8px] font-semibold text-gray-400 group-hover:text-teal-600 px-1 py-0.2 rounded bg-gray-50 group-hover:bg-teal-100/50 shrink-0">
                      {prod.badge}
                    </span>
                  )}
                </div>
                {prod.description && (
                  <span className="text-[9.5px] text-gray-400 group-hover:text-gray-600 line-clamp-1 mt-0.5">
                    {prod.description}
                  </span>
                )}
              </Link>
            ))}
          </div>

          <div className="p-2 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between">
            <Link
              href={activeCategory.href}
              onClick={onLinkClick}
              className="text-[9px] font-bold text-[#1ab0bc] hover:text-teal-800 flex items-center gap-1 uppercase tracking-wider group"
            >
              <span>Explore All {activeCategory.title}</span>
              <ArrowRight className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
