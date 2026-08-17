"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  MapPin, 
  Building2, 
  ChevronRight, 
  Calendar, 
  Briefcase, 
  ArrowRight,
  Sparkles
} from "lucide-react";
import { locationsNavData, LocationArea, CenterInfo, SpaceCategory } from "@/config/locations-nav";

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
      className="relative flex items-start"
      onMouseLeave={() => {
        setActiveAreaId(null);
        setActiveCenterId(null);
        setActiveCategoryType(null);
      }}
    >
      {/* ── TIER 1: LOCATIONS DROPDOWN (Shown on hovering 'Locations' navbar item) ── */}
      <div className="w-52 bg-white shadow-2xl rounded-sm border border-outline-variant/15 py-1 z-[120] text-left font-sans">
        <div className="px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">
          Locations
        </div>

        {locationsNavData.map((area) => {
          const isAreaActive = area.id === activeAreaId;
          return (
            <div
              key={area.id}
              onMouseEnter={() => {
                setActiveAreaId(area.id);
                // Reset deeper levels on area switch
                setActiveCenterId(null);
                setActiveCategoryType(null);
              }}
              className={`relative flex items-center justify-between px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                isAreaActive
                  ? "bg-[#1ab0bc] text-white"
                  : "text-gray-700 hover:bg-gray-50 hover:text-[#1ab0bc]"
              }`}
            >
              <div className="flex items-center gap-2">
                <MapPin className={`w-3.5 h-3.5 ${isAreaActive ? "text-white" : "text-[#1ab0bc]"}`} />
                <span>{area.name}</span>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 ${isAreaActive ? "text-white" : "text-gray-300"}`} />
            </div>
          );
        })}
      </div>

      {/* ── TIER 2: CENTRES (Appears immediately to the right when hovering a Location) ── */}
      {activeArea && (
        <div 
          className="w-56 bg-white shadow-2xl rounded-sm border border-outline-variant/15 py-1 z-[121] text-left font-sans animate-in fade-in slide-in-from-left-1 duration-150"
          style={{ marginLeft: "1px" }}
        >
          <div className="px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100 flex items-center justify-between">
            <span>Centres in {activeArea.name}</span>
          </div>

          {activeArea.centres.map((center) => {
            const isCenterActive = center.id === activeCenterId;
            return (
              <div
                key={center.id}
                onMouseEnter={() => {
                  setActiveCenterId(center.id);
                  setActiveCategoryType(null); // Reset space category
                }}
                className={`relative flex items-center justify-between px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                  isCenterActive
                    ? "bg-[#1ab0bc] text-white"
                    : "text-gray-700 hover:bg-gray-50 hover:text-[#1ab0bc]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Building2 className={`w-3.5 h-3.5 ${isCenterActive ? "text-white" : "text-[#1ab0bc]"}`} />
                  <div>
                    <span className="block leading-tight">{center.name}</span>
                    <span className={`text-[9px] font-normal normal-case block opacity-70 ${isCenterActive ? "text-white" : "text-gray-400"}`}>
                      {center.shortName}
                    </span>
                  </div>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isCenterActive ? "text-white" : "text-gray-300"}`} />
              </div>
            );
          })}
        </div>
      )}

      {/* ── TIER 3: SPACE TYPES (Guest Spaces & Co-working Spaces, Appears when hovering a Centre) ── */}
      {activeCenter && (
        <div 
          className="w-52 bg-white shadow-2xl rounded-sm border border-outline-variant/15 py-1 z-[122] text-left font-sans animate-in fade-in slide-in-from-left-1 duration-150"
          style={{ marginLeft: "1px" }}
        >
          <div className="px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">
            Space Types
          </div>

          {/* Guest Spaces option */}
          <div
            onMouseEnter={() => setActiveCategoryType("guest")}
            className={`flex items-center justify-between px-3.5 py-3 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${
              activeCategoryType === "guest"
                ? "bg-[#1ab0bc] text-white"
                : "text-gray-700 hover:bg-gray-50 hover:text-[#1ab0bc]"
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className={`w-3.5 h-3.5 ${activeCategoryType === "guest" ? "text-white" : "text-blue-600"}`} />
              <div>
                <span className="block leading-tight">Guest Spaces</span>
                <span className={`text-[9px] font-normal normal-case block opacity-75 ${activeCategoryType === "guest" ? "text-white" : "text-blue-600"}`}>
                  Hourly / Daily
                </span>
              </div>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 ${activeCategoryType === "guest" ? "text-white" : "text-gray-300"}`} />
          </div>

          {/* Co-working Spaces option */}
          <div
            onMouseEnter={() => setActiveCategoryType("coworking")}
            className={`flex items-center justify-between px-3.5 py-3 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors border-t border-gray-50 ${
              activeCategoryType === "coworking"
                ? "bg-[#1ab0bc] text-white"
                : "text-gray-700 hover:bg-gray-50 hover:text-[#1ab0bc]"
            }`}
          >
            <div className="flex items-center gap-2">
              <Briefcase className={`w-3.5 h-3.5 ${activeCategoryType === "coworking" ? "text-white" : "text-teal-600"}`} />
              <div>
                <span className="block leading-tight">Co-working</span>
                <span className={`text-[9px] font-normal normal-case block opacity-75 ${activeCategoryType === "coworking" ? "text-white" : "text-teal-600"}`}>
                  Monthly / Dedicated
                </span>
              </div>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 ${activeCategoryType === "coworking" ? "text-white" : "text-gray-300"}`} />
          </div>

          {/* Quick link to center page */}
          <div className="p-2 border-t border-gray-100 bg-gray-50/50">
            <Link
              href={activeCenter.href}
              onClick={onLinkClick}
              className="text-[10px] font-bold text-[#1ab0bc] hover:underline flex items-center justify-center gap-1 uppercase tracking-wider py-1"
            >
              <span>View {activeCenter.name} →</span>
            </Link>
          </div>
        </div>
      )}

      {/* ── TIER 4: AVAILABLE PRODUCTS (Appears when hovering Guest Spaces or Co-working Spaces) ── */}
      {activeCategory && activeCenter && (
        <div 
          className="w-64 bg-white shadow-2xl rounded-sm border border-outline-variant/15 py-1 z-[123] text-left font-sans animate-in fade-in slide-in-from-left-1 duration-150"
          style={{ marginLeft: "1px" }}
        >
          <div className="px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 border-b border-gray-100 flex items-center justify-between">
            <span className="truncate max-w-[140px]">{activeCategory.title}</span>
            <span className="text-[9px] text-[#1ab0bc] font-bold uppercase tracking-widest">{activeCenter.name}</span>
          </div>

          <div className="py-1">
            {activeCategory.products.map((prod, idx) => (
              <Link
                key={idx}
                href={prod.href}
                onClick={onLinkClick}
                className="group flex flex-col px-3.5 py-2 text-xs hover:bg-teal-50/70 transition-colors border-b border-gray-50 last:border-0"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800 group-hover:text-[#1ab0bc] transition-colors">
                    {prod.name}
                  </span>
                  {prod.badge && (
                    <span className="text-[9px] font-semibold text-gray-400 group-hover:text-teal-600 px-1 py-0.5 rounded">
                      {prod.badge}
                    </span>
                  )}
                </div>
                {prod.description && (
                  <span className="text-[10px] text-gray-400 group-hover:text-gray-600 line-clamp-1 mt-0.5">
                    {prod.description}
                  </span>
                )}
              </Link>
            ))}
          </div>

          <div className="p-2.5 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between">
            <Link
              href={activeCategory.href}
              onClick={onLinkClick}
              className="text-[10px] font-bold text-[#1ab0bc] hover:text-teal-800 flex items-center gap-1 uppercase tracking-wider group"
            >
              <span>Explore All {activeCategory.title}</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
