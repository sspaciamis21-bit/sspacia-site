"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { siteConfig } from "../config/site";
import { Menu, X, ChevronDown, ChevronRight, LayoutDashboard, LogOut, Phone, Calendar, MapPin, Building2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { BookTourModal } from "./ui/book-tour-modal";
import { LocationsDropdown } from "./locations-dropdown";
import { ProductsDropdown } from "./products-dropdown";
import { locationsNavData } from "@/config/locations-nav";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);
  const [mobileLocationsOpen, setMobileLocationsOpen] = useState(false);
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
          <nav className="hidden md:flex flex-1 justify-center items-center gap-3.5 lg:gap-5 xl:gap-6 text-[11px] xl:text-xs font-bold uppercase tracking-[0.1em] xl:tracking-[0.18em] text-on-surface/70 shrink-0">
            {siteConfig.navigation.map((item: any) => (
              <div key={item.label} className="relative group">
                <Link
                  href={item.href}
                  className="relative transition-all hover:text-primary py-2 flex items-center gap-1 whitespace-nowrap"
                >
                  <span className="relative z-10">{item.label}</span>
                  {(item.subItems || item.isLocationsMenu) && (
                    <ChevronDown size={13} className="group-hover:rotate-180 transition-transform" />
                  )}
                  <span className="absolute left-0 bottom-0 w-full h-[1px] bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></span>
                </Link>
                
                {/* 1. LOCATIONS MULTI-TIER CASCADING FLYOUT MENU */}
                {item.isLocationsMenu && (
                  <div className="absolute top-full -left-36 pt-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-left scale-95 group-hover:scale-100 z-[120]">
                    <LocationsDropdown 
                      onLinkClick={() => {}} 
                    />
                  </div>
                )}

                {/* 2. PRODUCTS DYNAMIC HIERARCHY MEGA-DROPDOWN */}
                {item.label === "Products" && !item.isLocationsMenu && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top scale-95 group-hover:scale-100 z-[130]">
                    <ProductsDropdown onLinkClick={() => {}} />
                  </div>
                )}

                {/* 3. STANDARD SUB-ITEMS DROPDOWN (Other items) */}
                {item.subItems && !item.isLocationsMenu && item.label !== "Products" && item.href !== "/products" && (
                  <div className="absolute top-full left-0 mt-1.5 w-48 bg-white shadow-xl rounded-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-left scale-95 group-hover:scale-100 border border-outline-variant/10 z-[120]">
                    <div className="py-2 flex flex-col">
                      {item.subItems.map((subItem: any) => (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className="px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-on-surface/70 hover:text-primary hover:bg-surface-low transition-colors"
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

          {/* Desktop Buttons - right */}
          <div className="hidden md:flex items-center gap-2 xl:gap-2.5 shrink-0 whitespace-nowrap">
            {/* BOOK A TOUR & PHONE CALL LINKS (FOR UNREGISTERED VISITORS) */}
            {!isLoggedIn && (
              <div className="flex items-center gap-1.5 xl:gap-2">
                {/* BOOK A TOUR BUTTON */}
                <button
                  onClick={() => setIsTourModalOpen(true)}
                  className="flex items-center gap-1.5 text-[11px] xl:text-xs font-bold uppercase tracking-wider text-[#006064] hover:text-[#004D40] bg-[#E0F7FA] hover:bg-[#B2EBF2] px-2.5 py-1.5 xl:px-3.5 xl:py-2 border border-[#006064]/20 transition-all shadow-xs cursor-pointer rounded-sm"
                  title="Book a Workspace Tour"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#006064]" />
                  <span>Book a Tour</span>
                </button>

                {/* PHONE CALL LINK (DIRECT DIAL +91 7600393779) */}
                <a
                  href="tel:+917600393779"
                  className="flex items-center gap-1.5 text-[11px] xl:text-xs font-mono font-bold text-gray-700 hover:text-[#006064] bg-white hover:bg-[#E0F7FA]/50 px-2.5 py-1.5 xl:px-3 xl:py-2 border border-[#CFD8DC] hover:border-[#006064]/30 transition-all shadow-xs cursor-pointer rounded-sm"
                  title="Call SSPACIA +91 7600393779"
                >
                  <Phone className="w-3.5 h-3.5 text-[#006064]" />
                  <span>+91 7600393779</span>
                </a>
              </div>
            )}

            {isLoggedIn ? (
              <div className="relative" ref={menuRef}>
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <div className="h-8 w-8 xl:h-9 xl:w-9 rounded-sm bg-surface-low text-primary flex items-center justify-center font-bold text-xs xl:text-sm">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-on-surface leading-none">{user?.name}</p>
                  </div>
                  <ChevronDown size={13} className={`text-tertiary transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-48 bg-surface-lowest shadow-[0_20px_50px_rgba(27,28,28,0.05)] overflow-hidden z-[110] flex flex-col p-1 border border-outline-variant/10"
                    >
                      <Link 
                        href={user?.role === 'ADMIN' ? '/admin/dashboard' : (user?.role === 'MANAGER' || user?.role === 'COMMUNITY_MANAGER') ? '/manager/dashboard' : '/dashboard'}
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-low hover:text-primary transition-colors"
                      >
                        <LayoutDashboard size={16} />
                        Dashboard
                      </Link>
                      <button 
                        onClick={() => { setIsMenuOpen(false); logout(); }}
                        className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <LogOut size={16} />
                        Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 xl:gap-2">
                <Link
                  href="/login"
                  className={`px-2.5 py-1.5 xl:px-3.5 xl:py-2 text-[11px] xl:text-xs font-bold uppercase tracking-wider transition-all rounded-sm border ${
                    isLoginPage
                      ? "bg-[#006064] text-white border-[#006064] shadow-md"
                      : "bg-white text-[#006064] hover:bg-[#006064] hover:text-white border-[#006064]/25 animate-brand-glow"
                  }`}
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className={`px-2.5 py-1.5 xl:px-3.5 xl:py-2 text-[11px] xl:text-xs font-bold uppercase tracking-wider transition-all rounded-sm border ${
                    isSignupPage
                      ? "bg-[#006064] text-white border-[#006064] shadow-md"
                      : "bg-white text-[#006064] hover:bg-[#006064] hover:text-white border-[#006064]/25 animate-brand-glow"
                  }`}
                >
                  Sign Up
                </Link>
              </div>
            )}
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
                <div className="flex flex-col space-y-1">
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

                    return (
                      <div key={item.label} className="py-1">
                        <Link
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className="block px-3 py-2 text-sm font-bold uppercase tracking-widest text-on-surface/80 hover:text-primary hover:bg-surface-low transition-colors rounded-sm"
                        >
                          {item.label}
                        </Link>
                        {item.subItems && (
                          <div className="ml-4 pl-3 border-l-2 border-primary/20 space-y-1 mt-1">
                            {item.subItems.map((subItem: any) => (
                              <Link
                                key={subItem.href}
                                href={subItem.href}
                                onClick={() => setIsOpen(false)}
                                className="block py-1.5 text-xs font-semibold text-on-surface/60 hover:text-primary transition-colors"
                              >
                                {subItem.label}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                        className={`text-center py-2.5 text-xs font-bold uppercase tracking-wider rounded-sm border transition-all ${
                          isLoginPage
                            ? "bg-[#006064] text-white border-[#006064] shadow-md"
                            : "bg-white text-[#006064] border-[#006064]/25 animate-brand-glow"
                        }`}
                      >
                        Log In
                      </Link>
                      <Link
                        href="/signup"
                        onClick={() => setIsOpen(false)}
                        className={`text-center py-2.5 text-xs font-bold uppercase tracking-wider rounded-sm border transition-all ${
                          isSignupPage
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