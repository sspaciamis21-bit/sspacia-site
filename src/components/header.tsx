"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { siteConfig } from "../config/site";
import { Menu, X, ChevronDown, ChevronRight, LayoutDashboard, LogOut, Phone, Calendar, MapPin, Building2, Globe, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { BookTourModal } from "./ui/book-tour-modal";
import { LocationsDropdown } from "./locations-dropdown";
import { ProductsDropdown } from "./products-dropdown";
import { MeetingRoomsDropdown } from "./meeting-rooms-dropdown";
import { locationsNavData } from "@/config/locations-nav";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);
  const [mobileLocationsOpen, setMobileLocationsOpen] = useState(false);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const [mobileMeetingRoomsOpen, setMobileMeetingRoomsOpen] = useState(false);
  const [mobileAreaOpen, setMobileAreaOpen] = useState<string | null>(null);
  const [mobileCenterOpen, setMobileCenterOpen] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, isLoggedIn, logout } = useAuth();
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const isSignupPage = pathname === '/signup';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-[90] bg-[#F8F9FA]/80 backdrop-blur border-b border-[#CFD8DC] shadow-xs">
        <div className="mx-auto flex max-w-[1440px] w-full items-center justify-between px-3 sm:px-6 lg:px-8">
          {/* Logo - left */}
          <div className="flex items-center shrink-0">
            <Link href="/" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
              <Image
                src="/SspaciaLogo.png"
                alt={siteConfig.site.name}
                width={120}
                height={42}
                className="h-13 w-auto object-contain sm:h-16 xl:h-[72px]"
                priority
              />
            </Link>
          </div>

          {/* Desktop Nav links - center */}
          <nav suppressHydrationWarning className="hidden md:flex flex-1 justify-center items-center gap-3 lg:gap-4 xl:gap-5 text-xs font-bold uppercase tracking-[0.06em] xl:tracking-[0.12em] text-on-surface/75 shrink-0">
            {siteConfig.navigation.map((item: any) => (
              <div key={item.label} className="relative group">
                <Link
                  href={item.href}
                  onClick={() => {
                    if (item.href === "/products" && typeof window !== "undefined") {
                      try {
                        sessionStorage.removeItem("sspacia_active_filters");
                      } catch { }
                    }
                  }}
                  className="relative transition-all hover:text-primary py-2 flex items-center gap-1 whitespace-nowrap text-xs font-bold uppercase tracking-wider"
                >
                  <span className="relative z-10">{item.label}</span>
                  {(item.subItems || item.isLocationsMenu || item.isMeetingRoomsMenu) && (
                    <ChevronDown size={13} className="group-hover:rotate-180 transition-transform" />
                  )}
                  <span className="absolute left-0 bottom-0 w-full h-[1px] bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></span>
                </Link>

                {/* 1. LOCATIONS MULTI-TIER CASCADING FLYOUT MENU */}
                {item.isLocationsMenu && (
                  <div className="absolute top-full -left-36 pt-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-left scale-95 group-hover:scale-100 z-[120]">
                    <LocationsDropdown
                      onLinkClick={() => { }}
                    />
                  </div>
                )}

                {/* 2. PRODUCTS DYNAMIC HIERARCHY MEGA-DROPDOWN */}
                {item.label === "Products" && !item.isLocationsMenu && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top scale-95 group-hover:scale-100 z-[130]">
                    <ProductsDropdown onLinkClick={() => { }} />
                  </div>
                )}

                {/* 3. BOOK ONLINE MEETING ROOM DEDICATED MEGA-DROPDOWN */}
                {item.isMeetingRoomsMenu && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top scale-95 group-hover:scale-100 z-[135]">
                    <MeetingRoomsDropdown onLinkClick={() => { }} />
                  </div>
                )}

                {/* 4. STANDARD SUB-ITEMS DROPDOWN (Other items like More) */}
                {item.subItems && !item.isLocationsMenu && item.label !== "Products" && !item.isMeetingRoomsMenu && item.href !== "/products" && (
                  <div className="absolute top-full left-0 mt-1.5 w-44 bg-white shadow-xl rounded-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-left scale-95 group-hover:scale-100 border border-slate-200 z-[120] py-1">
                    <div className="flex flex-col">
                      {item.subItems.map((subItem: any) => (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className="px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-on-surface/75 hover:text-primary hover:bg-surface-low transition-colors"
                        >
                          {subItem.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Desktop Right Section - Awfis 2-Row Stacked Layout */}
          <div className="hidden md:flex flex-col items-end justify-center gap-1 shrink-0 whitespace-nowrap text-right py-1">
            {/* Top Row: Auth / Member Access */}
            {isLoggedIn ? (
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-gray-800">
                  <div className="w-5 h-5 rounded-full bg-[#006064] text-white flex items-center justify-center text-[10px] font-bold">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[11px] truncate max-w-[120px]">{user?.name}</span>
                </div>
                <span className="text-gray-300">|</span>
                <Link
                  href={user?.role === 'ADMIN' ? '/admin/dashboard' : (user?.role === 'MANAGER' || user?.role === 'COMMUNITY_MANAGER') ? '/manager/dashboard' : '/dashboard'}
                  className="text-[10.5px] font-bold uppercase tracking-wider text-[#006064] hover:underline flex items-center gap-1"
                >
                  <LayoutDashboard size={11} />
                  <span>Dashboard</span>
                </Link>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => logout()}
                  className="text-[10.5px] font-bold uppercase tracking-wider text-red-600 hover:underline cursor-pointer"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link
                  href="/login"
                  className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition-all rounded-sm border ${isLoginPage
                    ? "bg-[#006064] text-white border-[#006064] shadow-md"
                    : "bg-white text-[#006064] hover:bg-[#006064] hover:text-white border-[#006064]/25 animate-brand-glow"
                    }`}
                >
                  Log In
                </Link>
                <span className="text-gray-300">|</span>
                <Link
                  href="/signup"
                  className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition-all rounded-sm border ${isSignupPage
                    ? "bg-[#006064] text-white border-[#006064] shadow-md"
                    : "bg-white text-[#006064] hover:bg-[#006064] hover:text-white border-[#006064]/25 animate-brand-glow"
                    }`}
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Bottom Row: Tour CTA & Direct Phone (Like Awfis) */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsTourModalOpen(true)}
                className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-[#006064] hover:text-[#004D40] bg-[#E0F7FA] hover:bg-[#B2EBF2] px-2.5 py-1 border border-[#006064]/20 transition-all rounded-xs cursor-pointer shadow-2xs"
                title="Book a Workspace Tour"
              >
                <Calendar className="w-3 h-3 text-[#006064]" />
                <span>Book a Tour</span>
              </button>
              <a
                href="tel:+917600393779"
                className="inline-flex items-center gap-1 text-[10.5px] font-mono font-bold text-gray-700 hover:text-[#006064] bg-white hover:bg-slate-50 px-2 py-1 border border-slate-200 transition-all rounded-xs shadow-2xs"
                title="Call SSPACIA +91 7600393779"
              >
                <Phone className="w-3 h-3 text-[#006064]" />
                <span>+91 7600393779</span>
              </a>
            </div>
          </div>

          {/* Mobile header action buttons */}
          <div className="flex md:hidden items-center gap-1.5">
            {!isLoggedIn ? (
              <>
                <Link
                  href="/login"
                  className="text-[11px] font-bold uppercase tracking-wider text-[#006064] bg-white border border-[#006064]/30 hover:bg-[#006064] hover:text-white px-2.5 py-1.5 rounded-sm transition-all shadow-xs"
                >
                  Log In
                </Link>
                <button
                  onClick={() => setIsTourModalOpen(true)}
                  className="text-[10px] font-bold uppercase tracking-wider text-white bg-[#006064] hover:bg-[#004D40] px-2.5 py-1.5 rounded-sm transition-all shadow-xs"
                >
                  Book Tour
                </button>
              </>
            ) : (
              <Link
                href={user?.role === 'ADMIN' ? '/admin/dashboard' : (user?.role === 'MANAGER' || user?.role === 'COMMUNITY_MANAGER') ? '/manager/dashboard' : '/dashboard'}
                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white bg-[#006064] px-2.5 py-1.5 rounded-sm"
              >
                <LayoutDashboard size={12} />
                <span>Portal</span>
              </Link>
            )}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-on-surface hover:text-primary p-1.5 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {isOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* ── CAREERS DIRECT LINK BELOW SSPACIA LOGO ── */}
        <div>
          <Link
            href="/careers"
            className="absolute left-3 sm:left-6 lg:left-8 top-full mt-2 flex items-center gap-1.5 bg-white/95 hover:bg-[#006064] text-[#006064] hover:text-white border border-teal-300/80 hover:border-[#006064] shadow-md hover:shadow-lg px-3 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider transition-all duration-300 ease-out z-[95] cursor-pointer group hover:scale-105 active:scale-95"
            title="Explore Careers at SSPACIA"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 group-hover:bg-emerald-300 transition-colors"></span>
            </span>
            <span className="transition-colors">Careers</span>
            <ArrowUpRight size={11} className="text-teal-600 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300 shrink-0" />
          </Link>
        </div>

        {/* ── VIRTUAL OFFICE DIRECT LINK BELOW LOGIN / SIGN UP ── */}
        <div className="hidden md:block">
          <Link
            href="/virtual-office"
            className="absolute right-4 sm:right-6 lg:right-8 top-full mt-2 flex items-center gap-1.5 bg-white/95 hover:bg-[#006064] text-[#006064] hover:text-white border border-teal-300/80 hover:border-[#006064] shadow-md px-3 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider transition-all z-[95] cursor-pointer group"
            title="Go to Virtual Office page"
          >
            <Globe size={12} className="text-teal-600 group-hover:text-white transition-colors" />
            <span>Virtual Office</span>
          </Link>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="md:hidden border-t border-outline-variant/10 bg-white shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto"
            >
              <div className="px-4 pt-3 pb-6 space-y-4">
                {/* 1. Quick Auth Action Card at TOP of Mobile Drawer */}
                <div className="p-3 bg-[#E0F7FA]/40 border border-[#006064]/15 rounded-sm">
                  {isLoggedIn ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-sm bg-[#006064] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                          {user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-gray-900 truncate">{user?.name}</p>
                          <p className="text-[10px] text-gray-500 font-mono truncate">{user?.email}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#006064]/10">
                        <Link
                          href={user?.role === 'ADMIN' ? '/admin/dashboard' : (user?.role === 'MANAGER' || user?.role === 'COMMUNITY_MANAGER') ? '/manager/dashboard' : '/dashboard'}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase tracking-wider text-white bg-[#006064] hover:bg-[#004D40] rounded-sm transition-colors text-center"
                        >
                          <LayoutDashboard size={13} />
                          <span>Dashboard</span>
                        </Link>
                        <button
                          onClick={() => { setIsOpen(false); logout(); }}
                          className="flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 hover:bg-red-100 rounded-sm transition-colors text-center border border-red-200"
                        >
                          <LogOut size={13} />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">
                        Member &amp; Client Access
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          href="/login"
                          onClick={() => setIsOpen(false)}
                          className="text-center py-2.5 text-xs font-bold uppercase tracking-wider rounded-sm bg-[#006064] text-white shadow-xs transition-all hover:bg-[#004D40]"
                        >
                          Log In
                        </Link>
                        <Link
                          href="/signup"
                          onClick={() => setIsOpen(false)}
                          className="text-center py-2.5 text-xs font-bold uppercase tracking-wider rounded-sm bg-white text-[#006064] border border-[#006064]/30 shadow-xs transition-all hover:bg-neutral-50"
                        >
                          Sign Up
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* Main Nav Items */}
                <div suppressHydrationWarning className="flex flex-col space-y-1">
                  {siteConfig.navigation.map((item: any) => {
                    if (item.isLocationsMenu) {
                      return (
                        <div key={item.label} className="py-1">
                          <button
                            onClick={() => setMobileLocationsOpen(!mobileLocationsOpen)}
                            className="flex items-center justify-between w-full px-3 py-2 text-sm font-bold uppercase tracking-widest text-on-surface/80 hover:text-primary hover:bg-surface-low transition-colors rounded-sm"
                          >
                            <span className="flex items-center gap-2">
                              <MapPin size={15} className="text-primary" />
                              <span>Locations</span>
                            </span>
                            <ChevronDown size={15} className={`transition-transform ${mobileLocationsOpen ? "rotate-180 text-primary" : ""}`} />
                          </button>

                          {mobileLocationsOpen && (
                            <div className="ml-3 pl-3 border-l-2 border-primary/20 space-y-2 mt-1 py-1">
                              {locationsNavData.map((area) => (
                                <div key={area.id} className="space-y-1">
                                  <button
                                    onClick={() => setMobileAreaOpen(mobileAreaOpen === area.id ? null : area.id)}
                                    className="flex items-center justify-between w-full py-1 text-xs font-bold text-gray-800 hover:text-primary"
                                  >
                                    <span>📍 {area.name}</span>
                                    <ChevronDown size={13} className={`transition-transform ${mobileAreaOpen === area.id ? "rotate-180 text-primary" : ""}`} />
                                  </button>

                                  {mobileAreaOpen === area.id && (
                                    <div className="ml-3 pl-2 border-l border-gray-200 space-y-2 py-1">
                                      {area.centres.map((center) => (
                                        <div key={center.id} className="space-y-1">
                                          <button
                                            onClick={() => setMobileCenterOpen(mobileCenterOpen === center.id ? null : center.id)}
                                            className="flex items-center justify-between w-full py-1 text-[11px] font-bold text-teal-700 hover:text-teal-900"
                                          >
                                            <span>🏢 {center.name}</span>
                                            <ChevronDown size={12} className={`transition-transform ${mobileCenterOpen === center.id ? "rotate-180" : ""}`} />
                                          </button>

                                          {mobileCenterOpen === center.id && (
                                            <div className="ml-3 pl-2 border-l border-teal-100 space-y-1 text-[10px] py-1 bg-teal-50/40 rounded p-1.5">
                                              <div className="font-bold text-blue-700">Guest Spaces:</div>
                                              {center.guestSpaces.products.map((p, pIdx) => (
                                                <Link
                                                  key={pIdx}
                                                  href={p.href}
                                                  onClick={() => setIsOpen(false)}
                                                  className="block py-0.5 text-gray-600 hover:text-primary"
                                                >
                                                  • {p.name}
                                                </Link>
                                              ))}

                                              <div className="font-bold text-teal-700 mt-2">Co-working Spaces:</div>
                                              {center.coworkingSpaces.products.map((p, pIdx) => (
                                                <Link
                                                  key={pIdx}
                                                  href={p.href}
                                                  onClick={() => setIsOpen(false)}
                                                  className="block py-0.5 text-gray-600 hover:text-primary"
                                                >
                                                  • {p.name}
                                                </Link>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }

                    if (item.label === "Products") {
                      return (
                        <div key={item.label} className="py-1">
                          <button
                            onClick={() => setMobileProductsOpen(!mobileProductsOpen)}
                            className="flex items-center justify-between w-full px-3 py-2 text-sm font-bold uppercase tracking-widest text-on-surface/80 hover:text-primary hover:bg-surface-low transition-colors rounded-sm cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <Building2 size={15} className="text-primary" />
                              <span>Products</span>
                            </span>
                            <ChevronDown size={15} className={`transition-transform ${mobileProductsOpen ? "rotate-180 text-primary" : ""}`} />
                          </button>

                          {mobileProductsOpen && (
                            <div className="ml-3 pl-3 border-l-2 border-primary/20 space-y-2.5 mt-1 py-1">
                              <Link
                                href="/products"
                                onClick={() => setIsOpen(false)}
                                className="block py-1 text-xs font-bold text-teal-800 hover:text-primary"
                              >
                                🏢 All Workspaces Catalog
                              </Link>

                              <div className="bg-teal-50/60 p-2.5 rounded border border-teal-100 space-y-1.5">
                                <Link
                                  href="/guest-spaces"
                                  onClick={() => setIsOpen(false)}
                                  className="block text-xs font-bold text-[#006064] hover:underline"
                                >
                                  🚪 Guest Spaces (Hourly / Daily)
                                </Link>
                                <div className="pl-2 space-y-1 text-[11px] text-gray-600">
                                  <Link href="/products?type=meeting-room" onClick={() => setIsOpen(false)} className="block hover:text-teal-800">• Meeting Rooms (4-6 Seats)</Link>
                                  <Link href="/products?type=conference-room" onClick={() => setIsOpen(false)} className="block hover:text-teal-800">• Board Rooms (10-14 Seats)</Link>
                                  <Link href="/guest-spaces" onClick={() => setIsOpen(false)} className="block hover:text-teal-800">• Day Pass &amp; Training Rooms</Link>
                                </div>
                              </div>

                              <div className="bg-teal-50/60 p-2.5 rounded border border-teal-100 space-y-1.5">
                                <Link
                                  href="/coworking-spaces"
                                  onClick={() => setIsOpen(false)}
                                  className="block text-xs font-bold text-[#006064] hover:underline"
                                >
                                  🏢 Co-Working Spaces (Monthly)
                                </Link>
                                <div className="pl-2 space-y-1 text-[11px] text-gray-600">
                                  <Link href="/coworking-spaces" onClick={() => setIsOpen(false)} className="block hover:text-teal-800">• Dedicated Desks</Link>
                                  <Link href="/coworking-spaces" onClick={() => setIsOpen(false)} className="block hover:text-teal-800">• Private Cabins (1-8 Seats)</Link>
                                  <Link href="/coworking-spaces" onClick={() => setIsOpen(false)} className="block hover:text-teal-800">• Executive VIP Suites</Link>
                                </div>
                              </div>

                              <div className="bg-indigo-50/70 p-2.5 rounded border border-indigo-200 space-y-1.5">
                                <Link
                                  href="/virtual-office"
                                  onClick={() => setIsOpen(false)}
                                  className="block text-xs font-bold text-indigo-900 hover:underline flex items-center justify-between"
                                >
                                  <span>🌐 Virtual Office (Address &amp; GST)</span>
                                  <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-black uppercase">Buy</span>
                                </Link>
                                <div className="pl-2 space-y-1 text-[11px] text-indigo-800/80">
                                  <Link href="/virtual-office" onClick={() => setIsOpen(false)} className="block hover:text-indigo-950">• GST &amp; MCA / ROC Registration</Link>
                                  <Link href="/virtual-office" onClick={() => setIsOpen(false)} className="block hover:text-indigo-950">• Mail &amp; Courier Handling</Link>
                                  <Link href="/virtual-office" onClick={() => setIsOpen(false)} className="block hover:text-indigo-950">• All 3 Prime Ahmedabad Centres</Link>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }

                    if (item.isMeetingRoomsMenu) {
                      return (
                        <div key={item.label} className="py-1">
                          <button
                            onClick={() => setMobileMeetingRoomsOpen(!mobileMeetingRoomsOpen)}
                            className="flex items-center justify-between w-full px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-[#004D40] to-[#006064] hover:from-[#00382E] hover:to-[#004D40] transition-colors rounded-sm shadow-xs border border-[#004D40]/30 cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <Calendar size={15} className="text-teal-200" />
                              <span>{item.label}</span>
                            </span>
                            <ChevronDown size={15} className={`transition-transform text-teal-200 ${mobileMeetingRoomsOpen ? "rotate-180" : ""}`} />
                          </button>

                          {mobileMeetingRoomsOpen && (
                            <div className="ml-3 pl-3 border-l-2 border-[#006064]/40 space-y-2 mt-2 py-1">
                              <Link
                                href="/guest-spaces"
                                onClick={() => setIsOpen(false)}
                                className="block py-1.5 px-2.5 bg-teal-50 text-xs font-black text-[#006064] rounded border border-teal-200/60 hover:underline"
                              >
                                📅 Open Full Booking Calendar
                              </Link>

                              {/* Agarwal Complex */}
                              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1.5">
                                <div className="text-[11px] font-bold text-slate-900 flex items-center justify-between">
                                  <span>🏢 Agarwal Complex</span>
                                  <span className="text-[9px] font-normal text-slate-500">C.G. Road</span>
                                </div>
                                <div className="pl-2 space-y-1.5 text-xs">
                                  <Link
                                    href="/products/17"
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center justify-between py-1 border-b border-slate-100 text-slate-700 hover:text-[#006064]"
                                  >
                                    <div>
                                      <span className="font-semibold block">• Board Room</span>
                                      <span className="text-[10px] text-slate-500">11 seats • 4K Screen</span>
                                    </div>
                                    <span className="font-bold text-[#006064] text-xs">₹600/hr</span>
                                  </Link>
                                  <Link
                                    href="/products/16"
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center justify-between py-1 text-slate-700 hover:text-[#006064]"
                                  >
                                    <div>
                                      <span className="font-semibold block">• Meeting Room</span>
                                      <span className="text-[10px] text-slate-500">4 seats • Quiet sync</span>
                                    </div>
                                    <span className="font-bold text-[#006064] text-xs">₹400/hr</span>
                                  </Link>
                                </div>
                              </div>

                              {/* Mercado */}
                              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1.5">
                                <div className="text-[11px] font-bold text-slate-900 flex items-center justify-between">
                                  <span>🏢 Mercado</span>
                                  <span className="text-[9px] font-normal text-slate-500">C.G. Road</span>
                                </div>
                                <div className="pl-2 space-y-1.5 text-xs">
                                  <Link
                                    href="/products/20"
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center justify-between py-1 border-b border-slate-100 text-slate-700 hover:text-[#006064]"
                                  >
                                    <div>
                                      <span className="font-semibold block">• Board Room</span>
                                      <span className="text-[10px] text-slate-500">10 seats • Executive</span>
                                    </div>
                                    <span className="font-bold text-[#006064] text-xs">₹600/hr</span>
                                  </Link>
                                  <Link
                                    href="/products/19"
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center justify-between py-1 text-slate-700 hover:text-[#006064]"
                                  >
                                    <div>
                                      <span className="font-semibold block">• Meeting Room</span>
                                      <span className="text-[10px] text-slate-500">4 seats • Interviews</span>
                                    </div>
                                    <span className="font-bold text-[#006064] text-xs">₹400/hr</span>
                                  </Link>
                                </div>
                              </div>

                              {/* Premier House */}
                              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1.5">
                                <div className="text-[11px] font-bold text-slate-900 flex items-center justify-between">
                                  <span>🏢 Premier House</span>
                                  <span className="text-[9px] font-normal text-slate-500">S.G. Highway</span>
                                </div>
                                <div className="pl-2 space-y-1.5 text-xs">
                                  <Link
                                    href="/products/23"
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center justify-between py-1 border-b border-slate-100 text-slate-700 hover:text-[#006064]"
                                  >
                                    <div>
                                      <span className="font-semibold block">• Board Room</span>
                                      <span className="text-[10px] text-slate-500">12 seats • Smart TV</span>
                                    </div>
                                    <span className="font-bold text-[#006064] text-xs">₹600/hr</span>
                                  </Link>
                                  <Link
                                    href="/products/22"
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center justify-between py-1 border-b border-slate-100 text-slate-700 hover:text-[#006064]"
                                  >
                                    <div>
                                      <span className="font-semibold block">• Meeting Room</span>
                                      <span className="text-[10px] text-slate-500">4 seats • High-Speed WiFi</span>
                                    </div>
                                    <span className="font-bold text-[#006064] text-xs">₹400/hr</span>
                                  </Link>
                                  <Link
                                    href="/products/24"
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center justify-between py-1 text-slate-700 hover:text-[#006064]"
                                  >
                                    <div>
                                      <span className="font-semibold block">• Event Room</span>
                                      <span className="text-[10px] text-slate-500">50 seats • Audio & Stage</span>
                                    </div>
                                    <span className="font-bold text-[#006064] text-xs">₹1500/hr</span>
                                  </Link>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Mobile Virtual Office Access Card */}
                          <div className="pt-1">
                            <Link
                              href="/virtual-office"
                              onClick={() => setIsOpen(false)}
                              className="flex items-center justify-between w-full px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#006064] bg-[#E0F7FA]/70 hover:bg-[#E0F7FA] transition-colors rounded-sm border border-[#006064]/20"
                            >
                              <span className="flex items-center gap-2">
                                <Globe size={15} className="text-[#006064]" />
                                <span>Virtual Office</span>
                              </span>
                              <span className="text-[9px] bg-[#006064] text-white px-1.5 py-0.5 rounded font-black">
                                Plans
                              </span>
                            </Link>
                          </div>
                        </div>
                      );
                    }

                    if (item.subItems) {
                      return (
                        <div key={item.label} className="py-1">
                          <span className="block px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                            {item.label}
                          </span>
                          <div className="ml-3 pl-3 border-l-2 border-primary/20 space-y-1 mt-1">
                            {item.subItems.map((subItem: any) => (
                              <Link
                                key={subItem.href}
                                href={subItem.href}
                                onClick={() => setIsOpen(false)}
                                className="block py-1.5 text-xs font-semibold text-slate-700 hover:text-primary transition-colors"
                              >
                                {subItem.label}
                              </Link>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={item.label} className="py-1">
                        <Link
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className="block px-3 py-2 text-sm font-bold uppercase tracking-widest text-on-surface/80 hover:text-primary hover:bg-surface-low transition-colors rounded-sm"
                        >
                          {item.label}
                        </Link>
                      </div>
                    );
                  })}
                </div>

                {/* Careers - We're Hiring for Mobile Drawer */}
                <div className="pt-1">
                  <Link
                    href="/careers"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#006064] bg-[#E0F7FA]/70 border border-[#006064]/25 hover:bg-[#006064] hover:text-white transition-all rounded-sm group"
                  >
                    <span className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span>Careers</span>
                    </span>
                    <ArrowUpRight size={13} className="text-teal-600 group-hover:text-white transition-colors" />
                  </Link>
                </div>

                {/* Call & Tour Buttons for Mobile */}
                <div className="pt-2 border-t border-outline-variant/10 flex flex-col gap-2.5">
                  <a
                    href="tel:+917600393779"
                    className="flex items-center justify-center gap-2 w-full text-xs font-mono font-bold text-gray-700 bg-white py-2.5 border border-[#CFD8DC]"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#006064]" />
                    <span>Call Us: +91 7600393779</span>
                  </a>
                  {!isLoggedIn && (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        setIsTourModalOpen(true);
                      }}
                      className="flex items-center justify-center gap-2 w-full text-xs font-bold uppercase tracking-wider text-[#006064] bg-[#E0F7FA] py-2.5 border border-[#006064]/20"
                    >
                      <Calendar className="w-3.5 h-3.5 text-[#006064]" />
                      <span>Book a Workspace Tour</span>
                    </button>
                  )}
                </div>

                {/* Auth Actions for Mobile */}
                <div className="pt-3 border-t border-outline-variant/10">
                  {isLoggedIn ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 px-3 py-2 bg-surface-low rounded-sm">
                        <div className="h-8 w-8 rounded-sm bg-primary text-white flex items-center justify-center font-bold">
                          {user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-on-surface">{user?.name}</p>
                          <p className="text-[10px] text-on-surface/60">{user?.email}</p>
                        </div>
                      </div>
                      <Link
                        href={user?.role === 'ADMIN' ? '/admin/dashboard' : (user?.role === 'MANAGER' || user?.role === 'COMMUNITY_MANAGER') ? '/manager/dashboard' : '/dashboard'}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-bold uppercase tracking-wider text-on-surface bg-surface-low hover:bg-surface-high transition-colors"
                      >
                        <LayoutDashboard size={16} />
                        Dashboard
                      </Link>
                      <button
                        onClick={() => { setIsOpen(false); logout(); }}
                        className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                      >
                        <LogOut size={16} />
                        Logout
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href="/login"
                        onClick={() => setIsOpen(false)}
                        className={`text-center py-2.5 text-xs font-bold uppercase tracking-wider rounded-sm border transition-all ${isLoginPage
                          ? "bg-[#006064] text-white border-[#006064] shadow-md"
                          : "bg-white text-[#006064] border-[#006064]/25 animate-brand-glow"
                          }`}
                      >
                        Log In
                      </Link>
                      <Link
                        href="/signup"
                        onClick={() => setIsOpen(false)}
                        className={`text-center py-2.5 text-xs font-bold uppercase tracking-wider rounded-sm border transition-all ${isSignupPage
                          ? "bg-[#006064] text-white border-[#006064] shadow-md"
                          : "bg-white text-[#006064] border-[#006064]/25 animate-brand-glow"
                          }`}
                      >
                        Sign Up
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Tour Booking Modal */}
      <BookTourModal
        isOpen={isTourModalOpen}
        onClose={() => setIsTourModalOpen(false)}
      />
    </>
  );
}