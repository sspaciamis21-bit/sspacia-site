"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { 
  Building2, 
  DoorOpen, 
  ChevronRight, 
  ChevronLeft,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ProductsDropdownProps {
  onLinkClick?: () => void;
}

interface ProductDetail {
  name: string;
  badge?: string;
  badgeColor?: string;
  facilities: string;
  href: string;
}

const GUEST_PRODUCTS: ProductDetail[] = [
  {
    name: "Meeting Room",
    badge: "5–6 Seater",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    facilities: "Smart TV / AV screen, Whiteboard, High-Speed WiFi, Complimentary Tea/Coffee",
    href: "/guest-spaces",
  },
  {
    name: "Board Room",
    badge: "11–14 Seater",
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
    facilities: "High-End Video Conferencing, Executive Leather Seating, Acoustic Soundproofing",
    href: "/guest-spaces",
  },
  {
    name: "Day Pass / Flex Desk",
    badge: "Single User",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    facilities: "Business Hours Access, High-Speed WiFi, Hot-Desk in Vibrant Open Coworking Area",
    href: "/guest-spaces",
  },
  {
    name: "Event & Training Space",
    badge: "25–40 Seater",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    facilities: "Projector + Sound System, Modular Seating Setup, Workshop & Seminar Infrastructure",
    href: "/guest-spaces",
  },
];

const COWORKING_PRODUCTS: ProductDetail[] = [
  {
    name: "Flex Desk",
    badge: "Hot Desk",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    facilities: "Business Hours Access, Ergonomic Setup, High-Speed WiFi, Unlimited Tea/Coffee",
    href: "/coworking-spaces",
  },
  {
    name: "Fixed Desk",
    badge: "Dedicated Seat",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    facilities: "24x7 Biometric Access, Dedicated Desk with Lockable Pedestal, 2h Meeting Room/mo",
    href: "/coworking-spaces",
  },
  {
    name: "Dedicated Cabin",
    badge: "2–6 Seats",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    facilities: "24x7 Access, Private Lockable Key Cabin, 2h Meeting Room/mo, High-Speed LAN & WiFi",
    href: "/coworking-spaces",
  },
  {
    name: "Private Cabin",
    badge: "4–10 Seats",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    facilities: "24x7 Access, Acoustic Glass Partition, 5h Meeting Room/mo, Fully Furnished Suite",
    href: "/coworking-spaces",
  },
  {
    name: "Executive Cabin",
    badge: "VIP Suite",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    facilities: "24x7 Access, Private Manager Desk + Team Pod, 5h Meeting Room/mo, VIP Amenities",
    href: "/coworking-spaces",
  },
];

export function ProductsDropdown({ onLinkClick }: ProductsDropdownProps) {
  // activeHover: null | "guest" | "coworking"
  const [activeHover, setActiveHover] = useState<"guest" | "coworking" | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnterCategory = (cat: "guest" | "coworking") => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveHover(cat);
  };

  const handleMouseLeaveContainer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setActiveHover(null);
    }, 180);
  };

  const handleMouseEnterPanel = (cat: "guest" | "coworking") => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveHover(cat);
  };

  return (
    <div 
      className="relative font-sans text-left select-none pt-2"
      onMouseLeave={handleMouseLeaveContainer}
    >
      {/* ── INVISIBLE HOVER BRIDGE (Dynamically sized so it never touches neighboring nav items) ── */}
      <div 
        className={`absolute -top-3 h-8 pointer-events-auto ${
          activeHover === "guest" 
            ? "left-0 -right-[500px]" 
            : activeHover === "coworking" 
            ? "-left-[500px] right-0" 
            : "left-0 right-0"
        }`} 
      />

      <div className="relative flex items-start justify-center">

        {/* ══════════════════════════════════════════════════════════════
            1. CO-WORKING SPACES: DYNAMIC DRAWING LINE & TABLE (LEFT SIDE)
            ══════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {activeHover === "coworking" && (
            <div 
              onMouseEnter={() => handleMouseEnterPanel("coworking")}
              className="absolute right-[215px] top-0 flex items-start z-30"
            >
              {/* TABLE CARD ON THE LEFT */}
              <motion.div
                initial={{ opacity: 0, x: 25, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                transition={{ delay: 0.18, duration: 0.25, ease: "easeOut" }}
                className="w-[450px] bg-white/98 backdrop-blur-xl rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.18)] border border-[#00696F]/30 overflow-hidden"
              >
                {/* Header */}
                <div className="px-4 py-3 bg-gradient-to-r from-[#004D40] to-[#00696F] text-white flex items-center justify-between border-b border-teal-600/30">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-white/15 flex items-center justify-center">
                      <Building2 size={14} className="text-teal-200" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.15em] text-white">
                      Co-Working Spaces Available
                    </span>
                  </div>
                  <Link
                    href="/coworking-spaces"
                    onClick={onLinkClick}
                    className="text-[10px] font-bold uppercase tracking-wider text-teal-200 hover:text-white flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded transition-colors"
                  >
                    <span>View All</span>
                    <ArrowRight size={10} />
                  </Link>
                </div>

                {/* Table: Name & Facilities only (No price) */}
                <div className="p-2.5">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 text-[9px] font-black uppercase tracking-wider text-gray-400">
                        <th className="py-1 px-2.5 w-[38%]">Workspace Type</th>
                        <th className="py-1 px-2.5">Facilities & Setup</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-xs">
                      {COWORKING_PRODUCTS.map((prod) => (
                        <tr
                          key={prod.name}
                          className="group hover:bg-teal-50/70 transition-colors"
                        >
                          <td className="py-2 px-2.5 align-top">
                            <Link 
                              href={prod.href}
                              onClick={onLinkClick}
                              className="inline-flex flex-col gap-0.5 group-hover:text-[#00696F]"
                            >
                              <span className="font-bold text-gray-900 group-hover:text-[#00696F] transition-colors hover:underline">
                                {prod.name}
                              </span>
                              {prod.badge && (
                                <span className={`w-fit text-[9px] font-bold px-1.5 py-0.2 rounded border ${prod.badgeColor || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                                  {prod.badge}
                                </span>
                              )}
                            </Link>
                          </td>
                          <td className="py-2 px-2.5 align-middle text-[11px] text-gray-500 font-normal leading-tight">
                            <Link 
                              href={prod.href}
                              onClick={onLinkClick}
                              className="block text-gray-600 group-hover:text-gray-900 transition-colors"
                            >
                              {prod.facilities}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500 px-2">
                    <span className="text-teal-700 font-medium">📍 Available across all 3 centers</span>
                    <Link
                      href="/coworking-spaces"
                      onClick={onLinkClick}
                      className="font-bold text-[#00696F] hover:text-[#004D40] flex items-center gap-1 uppercase tracking-wider"
                    >
                      <span>Explore Cabins</span>
                      <ArrowRight size={10} />
                    </Link>
                  </div>
                </div>
              </motion.div>

              {/* LIVE ANIMATED SVG CONNECTOR LINE (LEFT SIDE) */}
              <div 
                className="relative shrink-0 overflow-visible"
                style={{ width: "65px", height: "120px" }}
              >
                <svg className="w-full h-full overflow-visible" viewBox="0 0 65 120" fill="none">
                  <defs>
                    <linearGradient id="liveLeftGrad" x1="65" y1="58" x2="0" y2="28" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#1ab0bc" stopOpacity="1" />
                      <stop offset="50%" stopColor="#00696F" stopOpacity="1" />
                      <stop offset="100%" stopColor="#004D40" stopOpacity="1" />
                    </linearGradient>
                    <filter id="liveGlowLeft" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="2.5" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* 1. Glow Trail Path */}
                  <motion.path
                    d="M 65 58 C 30 58, 35 28, 0 28"
                    stroke="#1ab0bc"
                    strokeWidth="4"
                    strokeLinecap="round"
                    opacity="0.35"
                    filter="url(#liveGlowLeft)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.35 }}
                    exit={{ pathLength: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                  />

                  {/* 2. Main Live Drawing Path: Starts at (65, 58) from button, travels Left, curves Down to (0, 28) */}
                  <motion.path
                    d="M 65 58 C 30 58, 35 28, 0 28"
                    stroke="url(#liveLeftGrad)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    exit={{ pathLength: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                  />

                  {/* 3. Pulsing Start Node Dot (at Co-Working button) */}
                  <motion.circle 
                    cx="63" 
                    cy="58" 
                    r="4.5" 
                    fill="#1ab0bc" 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    exit={{ scale: 0 }}
                    transition={{ duration: 0.15 }}
                  />
                  <circle cx="63" cy="58" r="3" fill="#ffffff" />

                  {/* 4. Glowing End Node Dot (enters at Table edge) */}
                  <motion.circle 
                    cx="2" 
                    cy="28" 
                    r="4.5" 
                    fill="#004D40" 
                    stroke="#1ab0bc"
                    strokeWidth="2"
                    initial={{ scale: 0, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ delay: 0.24, duration: 0.15 }}
                  />
                </svg>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════════════════════════
            CENTRAL 2-OPTION DROPDOWN BOX (INITIAL STATE AS BEFORE)
            ══════════════════════════════════════════════════════════════ */}
        <div className="w-[215px] bg-white rounded-md shadow-2xl border border-outline-variant/15 py-1 z-40 shrink-0">
          <div className="py-1 flex flex-col">
            {/* 1. GUEST SPACES OPTION */}
            <div
              onMouseEnter={() => handleMouseEnterCategory("guest")}
              className={`relative px-3.5 py-2.5 text-xs font-bold uppercase tracking-[0.1em] cursor-pointer transition-all duration-200 flex items-center justify-between ${
                activeHover === "guest"
                  ? "bg-gradient-to-r from-teal-50 to-[#E0F7FA] text-[#00696F] border-r-2 border-[#1ab0bc] shadow-2xs font-extrabold"
                  : "text-on-surface/70 hover:text-primary hover:bg-surface-low"
              }`}
            >
              <Link 
                href="/guest-spaces" 
                onClick={onLinkClick}
                className="flex items-center gap-2 flex-1"
              >
                <DoorOpen size={14} className={activeHover === "guest" ? "text-[#1ab0bc]" : "text-gray-400"} />
                <span>Guest Spaces</span>
              </Link>
              <ChevronRight 
                size={14} 
                className={`transition-all duration-200 ${
                  activeHover === "guest" 
                    ? "text-[#1ab0bc] translate-x-1" 
                    : "text-gray-300"
                }`} 
              />
            </div>

            {/* 2. CO-WORKING SPACES OPTION */}
            <div
              onMouseEnter={() => handleMouseEnterCategory("coworking")}
              className={`relative px-3.5 py-2.5 text-xs font-bold uppercase tracking-[0.1em] cursor-pointer transition-all duration-200 flex items-center justify-between ${
                activeHover === "coworking"
                  ? "bg-gradient-to-r from-[#E0F7FA] to-teal-50 text-[#00696F] border-l-2 border-[#1ab0bc] shadow-2xs font-extrabold"
                  : "text-on-surface/70 hover:text-primary hover:bg-surface-low"
              }`}
            >
              <ChevronLeft 
                size={14} 
                className={`transition-all duration-200 ${
                  activeHover === "coworking" 
                    ? "text-[#1ab0bc] -translate-x-1" 
                    : "text-gray-300"
                }`} 
              />
              <Link 
                href="/coworking-spaces" 
                onClick={onLinkClick}
                className="flex items-center justify-end gap-2 flex-1 text-right"
              >
                <span>Co-working Spaces</span>
                <Building2 size={14} className={activeHover === "coworking" ? "text-[#1ab0bc]" : "text-gray-400"} />
              </Link>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            2. GUEST SPACES: DYNAMIC DRAWING LINE & TABLE (RIGHT SIDE)
            ══════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {activeHover === "guest" && (
            <div 
              onMouseEnter={() => handleMouseEnterPanel("guest")}
              className="absolute left-[215px] top-0 flex items-start z-30"
            >
              {/* LIVE ANIMATED SVG CONNECTOR LINE (RIGHT SIDE) */}
              <div 
                className="relative shrink-0 overflow-visible"
                style={{ width: "65px", height: "120px" }}
              >
                <svg className="w-full h-full overflow-visible" viewBox="0 0 65 120" fill="none">
                  <defs>
                    <linearGradient id="liveRightGrad" x1="0" y1="20" x2="65" y2="40" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#1ab0bc" stopOpacity="1" />
                      <stop offset="50%" stopColor="#00696F" stopOpacity="1" />
                      <stop offset="100%" stopColor="#004D40" stopOpacity="1" />
                    </linearGradient>
                    <filter id="liveGlowRight" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="2.5" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* 1. Glow Trail Path */}
                  <motion.path
                    d="M 0 20 C 35 20, 30 40, 65 40"
                    stroke="#1ab0bc"
                    strokeWidth="4"
                    strokeLinecap="round"
                    opacity="0.35"
                    filter="url(#liveGlowRight)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.35 }}
                    exit={{ pathLength: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                  />

                  {/* 2. Main Live Drawing Path: Starts at (0, 20) from Guest button, travels Right, curves Down to (65, 40) */}
                  <motion.path
                    d="M 0 20 C 35 20, 30 40, 65 40"
                    stroke="url(#liveRightGrad)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    exit={{ pathLength: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                  />

                  {/* 3. Pulsing Start Node Dot (at Guest Spaces button) */}
                  <motion.circle 
                    cx="2" 
                    cy="20" 
                    r="4.5" 
                    fill="#1ab0bc" 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    exit={{ scale: 0 }}
                    transition={{ duration: 0.15 }}
                  />
                  <circle cx="2" cy="20" r="3" fill="#ffffff" />

                  {/* 4. Glowing End Node Dot (enters at Table edge) */}
                  <motion.circle 
                    cx="63" 
                    cy="40" 
                    r="4.5" 
                    fill="#00696F" 
                    stroke="#1ab0bc"
                    strokeWidth="2"
                    initial={{ scale: 0, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ delay: 0.24, duration: 0.15 }}
                  />
                </svg>
              </div>

              {/* TABLE CARD ON THE RIGHT */}
              <motion.div
                initial={{ opacity: 0, x: -25, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.95 }}
                transition={{ delay: 0.18, duration: 0.25, ease: "easeOut" }}
                className="w-[450px] bg-white/98 backdrop-blur-xl rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.18)] border border-[#00696F]/30 overflow-hidden"
              >
                {/* Header */}
                <div className="px-4 py-3 bg-gradient-to-r from-[#00696F] to-[#004D40] text-white flex items-center justify-between border-b border-teal-600/30">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-white/15 flex items-center justify-center">
                      <DoorOpen size={14} className="text-teal-200" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.15em] text-white">
                      Guest Spaces Available
                    </span>
                  </div>
                  <Link
                    href="/guest-spaces"
                    onClick={onLinkClick}
                    className="text-[10px] font-bold uppercase tracking-wider text-teal-200 hover:text-white flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded transition-colors"
                  >
                    <span>View All</span>
                    <ArrowRight size={10} />
                  </Link>
                </div>

                {/* Table: Name & Facilities only (No price) */}
                <div className="p-2.5">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 text-[9px] font-black uppercase tracking-wider text-gray-400">
                        <th className="py-1 px-2.5 w-[38%]">Space / Room</th>
                        <th className="py-1 px-2.5">Facilities & Setup</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-xs">
                      {GUEST_PRODUCTS.map((prod) => (
                        <tr
                          key={prod.name}
                          className="group hover:bg-teal-50/70 transition-colors"
                        >
                          <td className="py-2 px-2.5 align-top">
                            <Link 
                              href={prod.href}
                              onClick={onLinkClick}
                              className="inline-flex flex-col gap-0.5 group-hover:text-[#00696F]"
                            >
                              <span className="font-bold text-gray-900 group-hover:text-[#00696F] transition-colors hover:underline">
                                {prod.name}
                              </span>
                              {prod.badge && (
                                <span className={`w-fit text-[9px] font-bold px-1.5 py-0.2 rounded border ${prod.badgeColor || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                                  {prod.badge}
                                </span>
                              )}
                            </Link>
                          </td>
                          <td className="py-2 px-2.5 align-middle text-[11px] text-gray-500 font-normal leading-tight">
                            <Link 
                              href={prod.href}
                              onClick={onLinkClick}
                              className="block text-gray-600 group-hover:text-gray-900 transition-colors"
                            >
                              {prod.facilities}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500 px-2">
                    <span className="text-teal-700 font-medium">⚡ Hourly & Daily Instant Booking</span>
                    <Link
                      href="/guest-spaces"
                      onClick={onLinkClick}
                      className="font-bold text-[#00696F] hover:text-[#004D40] flex items-center gap-1 uppercase tracking-wider"
                    >
                      <span>Book Meeting Room</span>
                      <ArrowRight size={10} />
                    </Link>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
