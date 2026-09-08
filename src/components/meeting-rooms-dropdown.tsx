"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  DoorOpen, 
  Users, 
  Presentation, 
  Sparkles, 
  ChevronRight, 
  ArrowRight, 
  MapPin, 
  Loader2,
  Calendar,
  Globe
} from "lucide-react";

interface MeetingRoomsDropdownProps {
  onLinkClick?: () => void;
}

interface ProductDetail {
  id: number;
  name: string;
  slug?: string;
  type?: string;
  badge?: string;
  badgeColor?: string;
  centreName?: string;
  image: string;
  facilities?: string;
  href: string;
}

interface CentreOption {
  id: string;
  locationId?: number;
  name: string;
  shortName: string;
  guestProducts: ProductDetail[];
}

const DEFAULT_GUEST_ROOMS: ProductDetail[] = [
  {
    id: 16,
    name: "Meeting Room",
    slug: "meeting-room",
    type: "MEETING_ROOM",
    badge: "5 Seater",
    badgeColor: "bg-teal-50 text-teal-800 border-teal-200",
    centreName: "Agarwal Complex",
    image: "https://res.cloudinary.com/dmgwi8dqd/image/upload/v1787635417/sspacia/zn8uhmxi970pwbicxfvo.jpg",
    facilities: "High-Speed WiFi, 24/7 Access, Air Conditioning, Gourmet Brews",
    href: "/products?city=1&area=CG%20Road&centre=1&category=2&type=6&product=16",
  },
  {
    id: 17,
    name: "Board Room",
    slug: "board-room",
    type: "BOARD_ROOM",
    badge: "11 Seater",
    badgeColor: "bg-cyan-50 text-cyan-800 border-cyan-200",
    centreName: "Agarwal Complex",
    image: "https://res.cloudinary.com/dmgwi8dqd/image/upload/v1787635368/sspacia/wmgzactuei1zw9bybxjd.jpg",
    facilities: "High-Speed WiFi, 24/7 Access, Air Conditioning, Gourmet Brews",
    href: "/products?city=1&area=CG%20Road&centre=1&category=2&type=7&product=17",
  },
  {
    id: 19,
    name: "Meeting Room",
    slug: "meeting-room",
    type: "MEETING_ROOM",
    badge: "6 Seater",
    badgeColor: "bg-cyan-50 text-cyan-800 border-cyan-200",
    centreName: "Mercado",
    image: "https://res.cloudinary.com/dmgwi8dqd/image/upload/v1787634689/sspacia/spxy536xlynfktvqopwt.jpg",
    facilities: "24/7 Access, Homely Staff, Ultra-Fast WiFi, Advanced Tech",
    href: "/products?city=1&area=CG%20Road&centre=2&category=2&type=6&product=19",
  },
  {
    id: 20,
    name: "Board Room",
    slug: "board-room",
    type: "BOARD_ROOM",
    badge: "14 Seater",
    badgeColor: "bg-purple-50 text-purple-800 border-purple-200",
    centreName: "Mercado",
    image: "https://res.cloudinary.com/dmgwi8dqd/image/upload/v1787634504/sspacia/folrtl4pgrpfxaxd6afc.jpg",
    facilities: "24/7 Access, Homely Staff, Ultra-Fast WiFi, Advanced Tech",
    href: "/products?city=1&area=CG%20Road&centre=2&category=2&type=7&product=20",
  },
  {
    id: 22,
    name: "Meeting Room",
    slug: "meeting-room",
    type: "MEETING_ROOM",
    badge: "4 Seater",
    badgeColor: "bg-teal-50 text-teal-800 border-teal-200",
    centreName: "Premier House",
    image: "https://res.cloudinary.com/dmgwi8dqd/image/upload/v1787637449/sspacia/zyqeedod9lxhnzixspdf.jpg",
    facilities: "High-Speed WiFi, 24/7 Access, Air Conditioning, Gourmet Brews",
    href: "/products?city=1&area=SG%20Highway&centre=3&category=2&type=6&product=22",
  },
  {
    id: 23,
    name: "Board Room",
    slug: "board-room",
    type: "BOARD_ROOM",
    badge: "12 Seater",
    badgeColor: "bg-purple-50 text-purple-800 border-purple-200",
    centreName: "Premier House",
    image: "https://res.cloudinary.com/dmgwi8dqd/image/upload/v1787637125/sspacia/vjk4ttvafaojoy3c11ag.jpg",
    facilities: "High-Speed WiFi, 24/7 Access, Air Conditioning, Gourmet Brews",
    href: "/products?city=1&area=SG%20Highway&centre=3&category=2&type=7&product=23",
  },
  {
    id: 24,
    name: "Event Room",
    slug: "event-room",
    type: "EVENT_ROOM",
    badge: "40 Seater",
    badgeColor: "bg-purple-50 text-purple-800 border-purple-200",
    centreName: "Premier House",
    image: "https://res.cloudinary.com/dmgwi8dqd/image/upload/v1787637220/sspacia/ombcwnvxurdyiwc2atud.jpg",
    facilities: "High-Speed WiFi, 24/7 Access, Air Conditioning, Gourmet Brews",
    href: "/products?city=1&area=SG%20Highway&centre=3&category=2&type=8&product=24",
  },
];

const DEFAULT_CENTRES: CentreOption[] = [
  { id: "all", name: "All Centres", shortName: "Across Ahmedabad", guestProducts: DEFAULT_GUEST_ROOMS },
  { id: "agarwal-complex", name: "Agarwal Complex", shortName: "C.G. Road", guestProducts: DEFAULT_GUEST_ROOMS.filter(r => r.centreName === "Agarwal Complex") },
  { id: "mercado", name: "Mercado", shortName: "C.G. Road", guestProducts: DEFAULT_GUEST_ROOMS.filter(r => r.centreName === "Mercado") },
  { id: "premier-house", name: "Premier House", shortName: "S.G. Highway", guestProducts: DEFAULT_GUEST_ROOMS.filter(r => r.centreName === "Premier House") },
];

export function MeetingRoomsDropdown({ onLinkClick }: MeetingRoomsDropdownProps) {
  const [activeRoomType, setActiveRoomType] = useState<"all" | "BOARD_ROOM" | "MEETING_ROOM" | "EVENT_ROOM">("all");
  const [selectedCenterId, setSelectedCenterId] = useState<string>("all");
  const [centresData, setCentresData] = useState<CentreOption[]>(DEFAULT_CENTRES);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch live catalog from database to guarantee accurate photos, titles, and exact product redirection links
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
  const allCenterRooms = currentCenter?.guestProducts || [];

  const displayedProducts = allCenterRooms.filter((prod) => {
    if (activeRoomType === "all") return true;
    if (activeRoomType === "BOARD_ROOM") return prod.type === "BOARD_ROOM" || prod.name.toLowerCase().includes("board");
    if (activeRoomType === "MEETING_ROOM") return prod.type === "MEETING_ROOM" || (prod.name.toLowerCase().includes("meeting") && !prod.name.toLowerCase().includes("board"));
    if (activeRoomType === "EVENT_ROOM") return prod.type === "EVENT_ROOM" || prod.name.toLowerCase().includes("event");
    return true;
  });

  return (
    <div className="relative font-sans text-left select-none pt-1">
      {/* ── UNIFIED MEGA PANEL CONTAINER (Exact 720px width & styling as ProductsDropdown) ── */}
      <div className="w-[720px] max-w-[calc(100vw-24px)] bg-white/98 backdrop-blur-xl rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.22)] border border-[#006064]/25 overflow-hidden flex flex-col md:flex-row">
        
        {/* ── LEFT SIDEBAR: ROOM TYPE FILTER & QUICK ACTIONS (~200px) ── */}
        <div className="w-full md:w-[200px] bg-slate-50/95 border-b md:border-b-0 md:border-r border-slate-200 p-3.5 flex flex-col justify-between shrink-0">
          <div className="space-y-3">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block px-1">
              Select Category
            </span>

            {/* Room Type 1: All Meeting Rooms */}
            <button
              type="button"
              onClick={() => setActiveRoomType("all")}
              onMouseEnter={() => setActiveRoomType("all")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeRoomType === "all"
                  ? "bg-[#006064] text-white shadow-md font-extrabold scale-[1.02]"
                  : "bg-white text-slate-700 hover:bg-teal-50 hover:text-[#006064] border border-slate-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <DoorOpen size={15} className={activeRoomType === "all" ? "text-amber-300" : "text-teal-700"} />
                <span>All Rooms</span>
              </div>
              <ChevronRight size={14} className={activeRoomType === "all" ? "text-white" : "text-slate-300"} />
            </button>

            {/* Room Type 2: Board Rooms */}
            <button
              type="button"
              onClick={() => setActiveRoomType("BOARD_ROOM")}
              onMouseEnter={() => setActiveRoomType("BOARD_ROOM")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeRoomType === "BOARD_ROOM"
                  ? "bg-[#006064] text-white shadow-md font-extrabold scale-[1.02]"
                  : "bg-white text-slate-700 hover:bg-teal-50 hover:text-[#006064] border border-slate-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <Users size={15} className={activeRoomType === "BOARD_ROOM" ? "text-amber-300" : "text-teal-700"} />
                <span>Board Rooms</span>
              </div>
              <ChevronRight size={14} className={activeRoomType === "BOARD_ROOM" ? "text-white" : "text-slate-300"} />
            </button>

            {/* Room Type 3: Meeting Rooms */}
            <button
              type="button"
              onClick={() => setActiveRoomType("MEETING_ROOM")}
              onMouseEnter={() => setActiveRoomType("MEETING_ROOM")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeRoomType === "MEETING_ROOM"
                  ? "bg-[#006064] text-white shadow-md font-extrabold scale-[1.02]"
                  : "bg-white text-slate-700 hover:bg-teal-50 hover:text-[#006064] border border-slate-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <Presentation size={15} className={activeRoomType === "MEETING_ROOM" ? "text-amber-300" : "text-teal-700"} />
                <span>Meeting Rooms</span>
              </div>
              <ChevronRight size={14} className={activeRoomType === "MEETING_ROOM" ? "text-white" : "text-slate-300"} />
            </button>

            {/* Room Type 4: Event Space */}
            <button
              type="button"
              onClick={() => setActiveRoomType("EVENT_ROOM")}
              onMouseEnter={() => setActiveRoomType("EVENT_ROOM")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeRoomType === "EVENT_ROOM"
                  ? "bg-[#006064] text-white shadow-md font-extrabold scale-[1.02]"
                  : "bg-white text-slate-700 hover:bg-teal-50 hover:text-[#006064] border border-slate-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles size={15} className={activeRoomType === "EVENT_ROOM" ? "text-amber-300" : "text-teal-700"} />
                <span>Event Space</span>
              </div>
              <ChevronRight size={14} className={activeRoomType === "EVENT_ROOM" ? "text-white" : "text-slate-300"} />
            </button>
          </div>

          {/* Quick Hub Links */}
          <div className="pt-2.5 mt-2.5 border-t border-slate-200 space-y-1.5">
            <span className="text-[8.5px] font-black uppercase tracking-[0.18em] text-slate-400 block px-1">
              Direct Catalogs
            </span>
            <Link
              href="/guest-spaces"
              onClick={onLinkClick}
              className="block text-[10.5px] font-bold text-[#006064] hover:text-[#004D40] hover:underline px-1 py-0.5"
            >
              ⚡ Instant Slot Booking →
            </Link>
            <Link
              href="/coworking-spaces"
              onClick={onLinkClick}
              className="block text-[10.5px] font-bold text-[#006064] hover:text-[#004D40] hover:underline px-1 py-0.5"
            >
              🏢 Dedicated Private Cabins →
            </Link>
            <Link
              href="/virtual-office"
              onClick={onLinkClick}
              className="block text-[10.5px] font-bold text-indigo-700 hover:text-indigo-900 hover:underline px-1 py-0.5 flex items-center justify-between"
            >
              <span>🌐 Virtual Office →</span>
              <span className="text-[8px] font-extrabold bg-indigo-100 text-indigo-800 px-1 py-0.5 rounded-2xs">3 Centres</span>
            </Link>
          </div>
        </div>

        {/* ── RIGHT MAIN PANEL: MINI TABLE WITH CENTRE PILLS (FLEX-1) ── */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          
          {/* Header Bar */}
          <div className="px-4 py-2.5 bg-gradient-to-r from-[#006064] to-[#004D40] text-white flex items-center justify-between border-b border-teal-600/30">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.15em] text-white">
                Meeting Rooms Available
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white uppercase tracking-wider">
                {displayedProducts.length} Spaces
              </span>
            </div>
            <Link
              href="/guest-spaces"
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

          {/* Mini Table Body (Scrollable, Clean, Exact Matching) */}
          <div className="p-2 flex-1 min-h-[220px]">
            {isLoading && centresData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-slate-400 text-xs gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#006064]" />
                <span>Loading live catalog...</span>
              </div>
            ) : displayedProducts.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-slate-400 text-xs italic">
                No meeting spaces currently available in this category.
              </div>
            ) : (
              <div className="max-h-[340px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-400">
                      <th className="py-1.5 px-2.5">Workspace / Room</th>
                      <th className="py-1.5 px-2.5 text-right w-24">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {displayedProducts.map((prod, idx) => (
                      <tr
                        key={`${prod.id}-${prod.name}-${idx}`}
                        className="group hover:bg-teal-50/70 transition-colors cursor-pointer"
                      >
                        {/* Product Thumbnail + Name & Badge (Links directly to product details!) */}
                        <td className="py-2.5 px-2.5 align-middle">
                          <Link 
                            href={prod.href}
                            onClick={onLinkClick}
                            className="flex items-center gap-3"
                          >
                            {/* Photo Thumbnail (84px x 54px) */}
                            <div className="relative w-[84px] h-[54px] rounded-lg overflow-hidden shrink-0 border border-slate-200 shadow-xs group-hover:border-[#006064] group-hover:shadow-md transition-all">
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
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {prod.centreName && (
                                  <span className="w-fit text-[8px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-[#006064] border border-teal-200 shrink-0">
                                    📍 {prod.centreName}
                                  </span>
                                )}
                                {prod.badge && (
                                  <span className="w-fit text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                                    {prod.badge}
                                  </span>
                                )}
                              </div>
                            </div>
                          </Link>
                        </td>

                        {/* Action Button (Links directly to product details) */}
                        <td className="py-2.5 px-2.5 text-right align-middle">
                          <Link 
                            href={prod.href}
                            onClick={onLinkClick}
                            className="inline-flex items-center gap-1 text-[9.5px] font-bold text-[#006064] group-hover:text-[#004D40] bg-teal-50/80 group-hover:bg-teal-100 px-2.5 py-1 rounded transition-colors uppercase tracking-wider"
                          >
                            <span>Explore</span>
                            <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
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
              <MapPin size={12} /> {selectedCenterId === "all" ? "Showing all meeting rooms across Ahmedabad" : `Showing ${currentCenter?.name || ''} (${currentCenter?.shortName || ''})`}
            </span>
            <Link
              href={selectedCenterId === "all" ? "/guest-spaces" : `/products?city=1&area=${encodeURIComponent(currentCenter?.shortName || '')}&centre=${currentCenter?.locationId || selectedCenterId}&category=2`}
              onClick={onLinkClick}
              className="font-bold text-[#006064] hover:text-[#004D40] flex items-center gap-1 uppercase tracking-wider group"
            >
              <span>{selectedCenterId === "all" ? "Open Booking Calendar" : `Explore ${currentCenter?.name || ''}`}</span>
              <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
