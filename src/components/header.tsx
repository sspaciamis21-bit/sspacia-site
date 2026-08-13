"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { siteConfig } from "../config/site";
import { Menu, X, ChevronDown, LayoutDashboard, LogOut, Phone, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { BookTourModal } from "./ui/book-tour-modal";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, isLoggedIn, logout } = useAuth();

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
      <header className="sticky top-0 z-[90] bg-surface/90 backdrop-blur-xl shadow-xs border-b border-outline-variant/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo - left */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
              <Image
                src="/SspaciaLogo.png"
                alt={siteConfig.site.name}
                width={100}
                height={35}
                className="h-12 w-auto object-contain sm:h-16"
                priority
              />
            </Link>
          </div>

          {/* Desktop Nav links - center */}
          <nav className="hidden md:flex flex-1 justify-center items-center gap-8 text-xs font-bold uppercase tracking-[0.2em] text-on-surface/60">
            {siteConfig.navigation.map((item) => (
              <div key={item.href} className="relative group">
                <Link
                  href={item.href}
                  className="relative transition-all hover:text-primary py-2 flex items-center gap-1"
                >
                  <span className="relative z-10">{item.label}</span>
                  {item.subItems && <ChevronDown size={14} className="group-hover:rotate-180 transition-transform" />}
                  <span className="absolute left-0 bottom-0 w-full h-[1px] bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></span>
                </Link>
                
                {/* Dropdown Menu */}
                {item.subItems && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white shadow-xl rounded-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform origin-top-left scale-95 group-hover:scale-100 border border-outline-variant/10 z-[120]">
                    <div className="py-2 flex flex-col">
                      {item.subItems.map((subItem) => (
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
          <div className="hidden md:flex items-center gap-3">
            {/* BOOK A TOUR & PHONE CALL LINKS (FOR UNREGISTERED VISITORS) */}
            {!isLoggedIn && (
              <div className="flex items-center gap-2">
                {/* BOOK A TOUR BUTTON */}
                <button
                  onClick={() => setIsTourModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3.5 py-2 border border-red-200 transition-all shadow-xs cursor-pointer"
                  title="Book a Workspace Tour"
                >
                  <Calendar className="w-3.5 h-3.5 text-red-600" />
                  <span>Book a Tour</span>
                </button>

                {/* PHONE CALL LINK (DIRECT DIAL +91 7600393779) */}
                <a
                  href="tel:+917600393779"
                  className="flex items-center gap-1.5 text-xs font-mono font-bold text-gray-700 hover:text-red-600 bg-gray-50 hover:bg-red-50 px-3 py-2 border border-gray-200 hover:border-red-200 transition-all shadow-xs cursor-pointer"
                  title="Call SSPACIA +91 7600393779"
                >
                  <Phone className="w-3.5 h-3.5 text-red-600" />
                  <span>+91 7600393779</span>
                </a>
              </div>
            )}

            {isLoggedIn ? (
              <div className="relative" ref={menuRef}>
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  <div className="h-9 w-9 rounded-sm bg-surface-low text-primary flex items-center justify-center font-bold">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-on-surface leading-none">{user?.name}</p>
                  </div>
                  <ChevronDown size={14} className={`text-tertiary transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
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
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-xs font-bold uppercase tracking-widest text-on-surface/70 hover:text-primary transition-colors"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="bg-[#1ab0bc] text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-teal-600 transition-all shadow-xs"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            {!isLoggedIn && (
              <button
                onClick={() => setIsTourModalOpen(true)}
                className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-1.5 border border-red-200"
              >
                Book Tour
              </button>
            )}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-on-surface hover:text-primary p-2 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
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
              className="md:hidden border-t border-outline-variant/10 bg-surface/95 backdrop-blur-2xl overflow-hidden"
            >
              <div className="px-4 pt-3 pb-6 space-y-4">
                {/* Main Nav Items */}
                <div className="flex flex-col space-y-1">
                  {siteConfig.navigation.map((item) => (
                    <div key={item.href} className="py-1">
                      <Link
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className="block px-3 py-2 text-sm font-bold uppercase tracking-widest text-on-surface/80 hover:text-primary hover:bg-surface-low transition-colors rounded-sm"
                      >
                        {item.label}
                      </Link>
                      {item.subItems && (
                        <div className="ml-4 pl-3 border-l-2 border-primary/20 space-y-1 mt-1">
                          {item.subItems.map((subItem) => (
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
                  ))}
                </div>

                {/* Call & Tour Buttons for Mobile */}
                <div className="pt-2 border-t border-outline-variant/10 flex flex-col gap-2.5">
                  <a
                    href="tel:+917600393779"
                    className="flex items-center justify-center gap-2 w-full text-xs font-mono font-bold text-gray-700 bg-gray-50 py-2.5 border border-gray-200"
                  >
                    <Phone className="w-3.5 h-3.5 text-red-600" />
                    <span>Call Us: +91 7600393779</span>
                  </a>
                  {!isLoggedIn && (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        setIsTourModalOpen(true);
                      }}
                      className="flex items-center justify-center gap-2 w-full text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 py-2.5 border border-red-200"
                    >
                      <Calendar className="w-3.5 h-3.5 text-red-600" />
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
                        Go to Dashboard
                      </Link>
                      <button
                        onClick={() => {
                          setIsOpen(false);
                          logout();
                        }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
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
                        className="flex items-center justify-center px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-on-surface border border-outline-variant/20 hover:bg-surface-low transition-colors"
                      >
                        Log In
                      </Link>
                      <Link
                        href="/signup"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center justify-center bg-[#1ab0bc] text-white px-4 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-teal-600 transition-colors"
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

      <BookTourModal isOpen={isTourModalOpen} onClose={() => setIsTourModalOpen(false)} />
    </>
  );
}