"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Building2, 
  DoorOpen, 
  ChevronRight, 
  ArrowRight,
  MapPin,
  Sparkles,
  Layers
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ProductsDropdownProps {
  onLinkClick?: () => void;
}

interface ProductDetail {
  name: string;
  badge?: string;
  badgeColor?: string;
  centreName?: string;
  image: string;
  facilities: string;
  href: string;
}

interface CentreOption {
  id: string;
  name: string;
  shortName: string;
  guestProducts: ProductDetail[];
  coworkingProducts: ProductDetail[];
}

const AGARWAL_GUEST_PRODUCTS: ProductDetail[] = [
  {
    name: "Meeting Room",
    badge: "4–6 Seater",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    centreName: "Agarwal Complex",
    image: "/IMAGES_SSPACIA/AGARWAL COMPLEX IMAGES/Meeting Room.jpeg",
    facilities: "Smart Display, Whiteboard, High-Speed WiFi & Complimentary Gourmet Coffee",
    href: "/products?centre=agarwal-complex&type=meeting-room",
  },
  {
    name: "Conference Room",
    badge: "10–12 Seater",
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
    centreName: "Agarwal Complex",
    image: "/IMAGES_SSPACIA/AGARWAL COMPLEX IMAGES/Board Room.jpeg",
    facilities: "Video Conferencing, Projector Setup & Soundproofing for Board Meetings",
    href: "/products?centre=agarwal-complex&type=conference-room",
  },
  {
    name: "Day Pass (Hot Desk)",
    badge: "Per Day",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    centreName: "Agarwal Complex",
    image: "/IMAGES_SSPACIA/AGARWAL COMPLEX IMAGES/flexi cabin .jpeg",
    facilities: "Full Day Workstation Access with High-Speed WiFi & Power Backup",
    href: "/products?centre=agarwal-complex",
  },
  {
    name: "Training Room",
    badge: "20–30 Seater",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    centreName: "Agarwal Complex",
    image: "/IMAGES_SSPACIA/AGARWAL COMPLEX IMAGES/Traning Room-1.jpeg",
    facilities: "Modular Workshop & Seminar Setup with PA Audio System",
    href: "/products?centre=agarwal-complex",
  },
];

const AGARWAL_COWORKING_PRODUCTS: ProductDetail[] = [
  {
    name: "Dedicated Desk",
    badge: "Monthly",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    centreName: "Agarwal Complex",
    image: "/IMAGES_SSPACIA/AGARWAL COMPLEX IMAGES/4 seater dedicated cabin.jpeg",
    facilities: "Fixed Personal Desk with Lockable Storage Pedestal & 24x7 Biometric Access",
    href: "/products?centre=agarwal-complex",
  },
  {
    name: "Flexi / Hot Desk",
    badge: "Monthly",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    centreName: "Agarwal Complex",
    image: "/IMAGES_SSPACIA/AGARWAL COMPLEX IMAGES/flexi cabin .jpeg",
    facilities: "Flexible Seating Across Open Coworking Lounge with High-Speed Internet",
    href: "/products?centre=agarwal-complex",
  },
  {
    name: "Private Cabin",
    badge: "1–4 Seater",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    centreName: "Agarwal Complex",
    image: "/IMAGES_SSPACIA/AGARWAL COMPLEX IMAGES/Private Cabin.jpeg",
    facilities: "Fully Furnished Enclosed Glass Cabin with 24x7 Access & Meeting Credits",
    href: "/products?centre=agarwal-complex",
  },
  {
    name: "Executive Cabin",
    badge: "VIP Suite",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    centreName: "Agarwal Complex",
    image: "/IMAGES_SSPACIA/AGARWAL COMPLEX IMAGES/Executive Cabin.jpeg",
    facilities: "Managerial Suite with Private Meeting Room Privileges & Premium Ergonomics",
    href: "/products?centre=agarwal-complex",
  },
];

const MERCADO_GUEST_PRODUCTS: ProductDetail[] = [
  {
    name: "Meeting Room",
    badge: "4–6 Seater",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    centreName: "Mercado",
    image: "/IMAGES_SSPACIA/MERCADO IMAGES/Meeting Room.jpg",
    facilities: "HD Display, Conference Audio System & Gourmet Coffee on Order",
    href: "/products?centre=mercardo",
  },
  {
    name: "Board Room",
    badge: "10–14 Seater",
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
    centreName: "Mercado",
    image: "/IMAGES_SSPACIA/MERCADO IMAGES/Board room.jpg",
    facilities: "Executive Board Setup with AV Systems & Full Acoustic Soundproofing",
    href: "/products?centre=mercardo",
  },
  {
    name: "Day Pass (Flex Desk)",
    badge: "Per Day",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    centreName: "Mercado",
    image: "/IMAGES_SSPACIA/MERCADO IMAGES/Fix-flexi desk.jpg",
    facilities: "Single Day Premium Coworking Pass in Vibrant 6th Floor Business Lounge",
    href: "/products?centre=mercardo",
  },
  {
    name: "Conference Area",
    badge: "25–35 Seater",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    centreName: "Mercado",
    image: "/IMAGES_SSPACIA/MERCADO IMAGES/Mercado conference area.jpg",
    facilities: "Ideal for Corporate Seminars, Community Meetups & Product Demos",
    href: "/products?centre=mercardo",
  },
];

const MERCADO_COWORKING_PRODUCTS: ProductDetail[] = [
  {
    name: "Dedicated Desk",
    badge: "Monthly",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    centreName: "Mercado",
    image: "/IMAGES_SSPACIA/MERCADO IMAGES/Fix-flexi desk.jpg",
    facilities: "Assigned Workstation with Power Backup, Lockable Drawer & 24x7 Entry",
    href: "/products?centre=mercardo",
  },
  {
    name: "Dedicated Cabin",
    badge: "4–6 Seater",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    centreName: "Mercado",
    image: "/IMAGES_SSPACIA/MERCADO IMAGES/MERCADO 4-SEATER CABIN.jpg",
    facilities: "Fully Key-Lockable Team Workspace with High-Speed LAN & WiFi",
    href: "/products?centre=mercardo",
  },
  {
    name: "Private Cabin",
    badge: "1–6 Seater",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    centreName: "Mercado",
    image: "/IMAGES_SSPACIA/MERCADO IMAGES/Private Cabin.jpg",
    facilities: "Acoustic Glass Partitioned Fully Furnished Suite with 2h Meeting Credits",
    href: "/products?centre=mercardo",
  },
  {
    name: "Executive Suite",
    badge: "VIP Suite",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    centreName: "Mercado",
    image: "/IMAGES_SSPACIA/MERCADO IMAGES/Executive Cabin.jpg",
    facilities: "Premium Director Suite with Receptionist Support & Guest Lounge Access",
    href: "/products?centre=mercardo",
  },
];

const PREMIER_GUEST_PRODUCTS: ProductDetail[] = [
  {
    name: "Executive Meeting Room",
    badge: "4–6 Seater",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    centreName: "Premier House",
    image: "/IMAGES_SSPACIA/PREMIER HOUSE/meeting room.jpg",
    facilities: "Ergonomic Chairs, 4K Screen & High-Speed WiFi in Bodakdev Hub",
    href: "/products?centre=premier-house",
  },
  {
    name: "Conference Hall",
    badge: "12–16 Seater",
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
    centreName: "Premier House",
    image: "/IMAGES_SSPACIA/PREMIER HOUSE/board room.jpg",
    facilities: "Large Format Corporate Conference Room Setup with HD Projector",
    href: "/products?centre=premier-house",
  },
  {
    name: "Day Pass (Coworking)",
    badge: "Per Day",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    centreName: "Premier House",
    image: "/IMAGES_SSPACIA/PREMIER HOUSE/Flexi Desk.jpeg",
    facilities: "Access Premium Amenities, Cafeteria & Collaborative Workspace",
    href: "/products?centre=premier-house",
  },
  {
    name: "Event & Workshop Hall",
    badge: "30–50 Seater",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    centreName: "Premier House",
    image: "/IMAGES_SSPACIA/PREMIER HOUSE/EVENT ROOM 1.jpg",
    facilities: "State-of-the-Art AV & Modular Event Setup for Large Audiences",
    href: "/products?centre=premier-house",
  },
];

const PREMIER_COWORKING_PRODUCTS: ProductDetail[] = [
  {
    name: "Dedicated Desk",
    badge: "Monthly",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    centreName: "Premier House",
    image: "/IMAGES_SSPACIA/PREMIER HOUSE/Fixed Desk Cabin.jpeg",
    facilities: "Reserved Workstation with Personal Lockable Storage & 24x7 Access",
    href: "/products?centre=premier-house",
  },
  {
    name: "Flexi / Hot Desk",
    badge: "Monthly",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    centreName: "Premier House",
    image: "/IMAGES_SSPACIA/PREMIER HOUSE/Flexi Desk.jpeg",
    facilities: "Dynamic Seating in Premium Vibrant Lounges with Unlimited Coffee",
    href: "/products?centre=premier-house",
  },
  {
    name: "Private Cabin",
    badge: "1–8 Seater",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    centreName: "Premier House",
    image: "/IMAGES_SSPACIA/PREMIER HOUSE/Private Cabin.jpeg",
    facilities: "Sound-Treated Dedicated Private Glass Cabins with Meeting Credits",
    href: "/products?centre=premier-house",
  },
  {
    name: "Executive Cabin",
    badge: "VIP Suite",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    centreName: "Premier House",
    image: "/IMAGES_SSPACIA/PREMIER HOUSE/Executive Cabin.jpeg",
    facilities: "Custom Scalable Wing for High-Growth IT & Corporate Teams",
    href: "/products?centre=premier-house",
  },
];

const ALL_CENTRES_DATA: CentreOption[] = [
  {
    id: "all",
    name: "All Centres",
    shortName: "Across Ahmedabad",
    guestProducts: [
      ...AGARWAL_GUEST_PRODUCTS,
      ...MERCADO_GUEST_PRODUCTS,
      ...PREMIER_GUEST_PRODUCTS,
    ],
    coworkingProducts: [
      ...AGARWAL_COWORKING_PRODUCTS,
      ...MERCADO_COWORKING_PRODUCTS,
      ...PREMIER_COWORKING_PRODUCTS,
    ]
  },
  {
    id: "agarwal-complex",
    name: "Agarwal Complex",
    shortName: "CG Road, Navrangpura",
    guestProducts: AGARWAL_GUEST_PRODUCTS,
    coworkingProducts: AGARWAL_COWORKING_PRODUCTS,
  },
  {
    id: "mercardo",
    name: "Mercado",
    shortName: "CG Road / Ellisbridge",
    guestProducts: MERCADO_GUEST_PRODUCTS,
    coworkingProducts: MERCADO_COWORKING_PRODUCTS,
  },
  {
    id: "premier-house",
    name: "Premier House",
    shortName: "SG Highway, Bodakdev",
    guestProducts: PREMIER_GUEST_PRODUCTS,
    coworkingProducts: PREMIER_COWORKING_PRODUCTS,
  }
];

export function ProductsDropdown({ onLinkClick }: ProductsDropdownProps) {
  const [activeCategory, setActiveCategory] = useState<"guest" | "coworking">("guest");
  const [selectedCenterId, setSelectedCenterId] = useState<string>("all");

  const currentCenter = ALL_CENTRES_DATA.find(c => c.id === selectedCenterId) || ALL_CENTRES_DATA[0];
  const displayedProducts = activeCategory === "guest" ? currentCenter.guestProducts : currentCenter.coworkingProducts;

  return (
    <div className="relative font-sans text-left select-none pt-1">
      {/* ── UNIFIED MEGA PANEL CONTAINER (Fits perfectly on all screens without overflowing) ── */}
      <div className="w-[740px] max-w-[calc(100vw-32px)] bg-white/98 backdrop-blur-xl rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.22)] border border-[#006064]/25 overflow-hidden flex flex-col md:flex-row">
        
        {/* ── LEFT SIDEBAR: CATEGORY & QUICK ACTIONS (~210px) ── */}
        <div className="w-full md:w-[210px] bg-neutral-50/95 border-b md:border-b-0 md:border-r border-neutral-200/80 p-3 flex flex-col justify-between shrink-0">
          <div className="space-y-3">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 block px-1">
              Select Category
            </span>

            {/* Category Option 1: Guest Spaces */}
            <button
              type="button"
              onClick={() => setActiveCategory("guest")}
              onMouseEnter={() => setActiveCategory("guest")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeCategory === "guest"
                  ? "bg-[#006064] text-white shadow-sm font-extrabold"
                  : "bg-white text-gray-700 hover:bg-teal-50 hover:text-[#006064] border border-neutral-200/60"
              }`}
            >
              <div className="flex items-center gap-2">
                <DoorOpen size={15} className={activeCategory === "guest" ? "text-amber-300" : "text-teal-700"} />
                <span>Guest Spaces</span>
              </div>
              <ChevronRight size={14} className={activeCategory === "guest" ? "text-white" : "text-gray-300"} />
            </button>

            {/* Category Option 2: Co-Working Spaces */}
            <button
              type="button"
              onClick={() => setActiveCategory("coworking")}
              onMouseEnter={() => setActiveCategory("coworking")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeCategory === "coworking"
                  ? "bg-[#006064] text-white shadow-sm font-extrabold"
                  : "bg-white text-gray-700 hover:bg-teal-50 hover:text-[#006064] border border-neutral-200/60"
              }`}
            >
              <div className="flex items-center gap-2">
                <Building2 size={15} className={activeCategory === "coworking" ? "text-amber-300" : "text-teal-700"} />
                <span>Co-working</span>
              </div>
              <ChevronRight size={14} className={activeCategory === "coworking" ? "text-white" : "text-gray-300"} />
            </button>
          </div>

          {/* Quick Hub Links */}
          <div className="pt-3 mt-3 border-t border-neutral-200/70 space-y-1.5">
            <span className="text-[8.5px] font-black uppercase tracking-[0.18em] text-gray-400 block px-1">
              Direct Catalogs
            </span>
            <Link
              href="/guest-spaces"
              onClick={onLinkClick}
              className="block text-[10px] font-bold text-[#006064] hover:text-[#004D40] hover:underline px-1 py-0.5"
            >
              ⚡ Hourly Meeting Rooms →
            </Link>
            <Link
              href="/coworking-spaces"
              onClick={onLinkClick}
              className="block text-[10px] font-bold text-[#006064] hover:text-[#004D40] hover:underline px-1 py-0.5"
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
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/20 text-white uppercase tracking-wider">
                {displayedProducts.length} Spaces
              </span>
            </div>
            <Link
              href={activeCategory === "guest" ? "/guest-spaces" : "/coworking-spaces"}
              onClick={onLinkClick}
              className="text-[9.5px] font-bold uppercase tracking-wider text-teal-200 hover:text-white flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2.5 py-0.5 rounded transition-colors"
            >
              <span>View All</span>
              <ArrowRight size={10} />
            </Link>
          </div>

          {/* Centre Filter Pills Bar */}
          <div className="px-3 py-1.5 bg-neutral-50 border-b border-neutral-200 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <span className="text-[8.5px] font-black uppercase tracking-wider text-gray-400 shrink-0 flex items-center gap-1 mr-0.5">
              <MapPin size={10} className="text-[#006064]" /> Filter:
            </span>
            {ALL_CENTRES_DATA.map((centre) => {
              const isSelected = centre.id === selectedCenterId;
              return (
                <button
                  key={centre.id}
                  type="button"
                  onClick={() => setSelectedCenterId(centre.id)}
                  className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? "bg-[#006064] text-white shadow-xs"
                      : "bg-white text-gray-600 border border-neutral-300 hover:border-teal-400 hover:text-[#006064]"
                  }`}
                >
                  {centre.name}
                </button>
              );
            })}
          </div>

          {/* Mini Table Body (Scrollable) */}
          <div className="p-2 flex-1">
            <div className="max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-neutral-200">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b border-neutral-200 text-[8.5px] font-black uppercase tracking-wider text-gray-400">
                    <th className="py-1 px-2 w-[48%]">Workspace / Room</th>
                    <th className="py-1 px-2">Facilities & Setup</th>
                    <th className="py-1 px-1 w-5 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-xs">
                  {displayedProducts.map((prod, idx) => (
                    <tr
                      key={`${prod.name}-${prod.centreName || idx}`}
                      className="group hover:bg-teal-50/80 transition-colors cursor-pointer"
                    >
                      <td className="py-1.5 px-2 align-middle">
                        <Link 
                          href={prod.href}
                          onClick={onLinkClick}
                          className="flex items-center gap-2"
                        >
                          <div className="relative w-9 h-9 rounded overflow-hidden shrink-0 border border-neutral-200 shadow-2xs group-hover:border-[#006064] transition-colors">
                            <Image
                              src={prod.image}
                              alt={prod.name}
                              fill
                              sizes="36px"
                              className="object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          </div>
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="font-bold text-[11px] text-gray-900 group-hover:text-[#006064] transition-colors leading-tight truncate">
                              {prod.name}
                            </span>
                            <div className="flex items-center gap-1 flex-wrap">
                              {prod.centreName && (
                                <span className="text-[7.5px] font-bold px-1.5 py-0.2 rounded bg-teal-50 text-[#006064] border border-teal-200 shrink-0">
                                  📍 {prod.centreName}
                                </span>
                              )}
                              {prod.badge && (
                                <span className={`w-fit text-[7.5px] font-bold px-1.5 py-0.2 rounded border ${prod.badgeColor || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                                  {prod.badge}
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="py-1.5 px-2 align-middle text-[10px] text-gray-600 font-normal leading-tight">
                        <Link 
                          href={prod.href}
                          onClick={onLinkClick}
                          className="block text-gray-600 group-hover:text-gray-900 transition-colors line-clamp-2"
                        >
                          {prod.facilities}
                        </Link>
                      </td>
                      <td className="py-1.5 px-1 text-right align-middle">
                        <Link 
                          href={prod.href}
                          onClick={onLinkClick}
                          className="text-gray-300 group-hover:text-[#006064] transition-colors inline-block"
                        >
                          <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="px-3 py-2 border-t border-neutral-200 bg-neutral-50/80 flex items-center justify-between text-[10px]">
            <span className="text-[#006064] font-semibold flex items-center gap-1">
              <MapPin size={11} /> {selectedCenterId === "all" ? "Showing all workspaces across Ahmedabad" : `Showing ${currentCenter.name} (${currentCenter.shortName})`}
            </span>
            <Link
              href={selectedCenterId === "all" ? (activeCategory === "guest" ? "/guest-spaces" : "/coworking-spaces") : `/products?centre=${selectedCenterId}`}
              onClick={onLinkClick}
              className="font-bold text-[#006064] hover:text-[#004D40] flex items-center gap-1 uppercase tracking-wider group"
            >
              <span>{selectedCenterId === "all" ? "View Full Catalog" : `Explore ${currentCenter.name}`}</span>
              <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
