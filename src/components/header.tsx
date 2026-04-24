"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { siteConfig } from "../config/site";
import { Menu, X, ChevronDown, LayoutDashboard, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
    <header className="fixed inset-x-0 top-0 z-[100] bg-surface/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
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
            {/* <span className="ml-2 font-display text-xl sm:text-2xl font-bold tracking-tight text-primary-container select-none">SSPACIA</span> */}
          </Link>
        </div>

        {/* Desktop Nav links - center */}
        <nav className="hidden md:flex flex-1 justify-center items-center gap-10 text-xs font-bold uppercase tracking-[0.2em] text-on-surface/60">
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
        <div className="hidden md:flex items-center gap-4">
          {isLoggedIn ? (
            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="h-10 w-10 rounded-sm bg-surface-low text-primary flex items-center justify-center font-bold">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-on-surface leading-none">{user?.name}</p>
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
                    className="absolute right-0 top-full mt-2 w-48 bg-surface-lowest shadow-[0_20px_50px_rgba(27,28,28,0.05)] overflow-hidden z-[110] flex flex-col p-1"
                  >
                    <Link 
                      href={user?.role === 'ADMIN' ? '/admin/dashboard' : user?.role === 'MANAGER' ? '/manager/dashboard' : '/dashboard'}
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
            <>
              <Link
                href="/login"
                className="text-xs font-bold uppercase tracking-widest text-on-surface/60 hover:text-primary transition-colors"
              >
                Log In
              </Link>
              <Link

                href="/signup"
                className="liquid-hover rounded-none bg-primary-container px-8 py-3 text-xs font-bold uppercase tracking-widest text-on-primary-container shadow-[0_20px_50px_rgba(0,105,111,0.1)] transition-all hover:text-white"
              >
                Join us
              </Link>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <button 
          className="flex h-10 w-10 items-center justify-center rounded-sm bg-surface-low text-primary md:hidden"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle Menu"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-surface-low bg-surface md:hidden overflow-hidden"
          >
            <div className="flex flex-col space-y-1 p-4">
              {siteConfig.navigation.map((item) => (
                <div key={item.href} className="flex flex-col">
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="rounded-sm px-4 py-3 text-base font-medium text-on-surface transition-colors hover:bg-surface-low hover:text-primary"
                  >
                    {item.label}
                  </Link>
                  {item.subItems && (
                    <div className="flex flex-col pl-6 space-y-1 mt-1 border-l-2 border-surface-low ml-4">
                      {item.subItems.map((subItem) => (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          onClick={() => setIsOpen(false)}
                          className="rounded-sm px-4 py-2 text-sm font-medium text-on-surface/70 transition-colors hover:bg-surface-low hover:text-primary"
                        >
                          {subItem.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="pt-4 mt-2 flex flex-col gap-3">
                {isLoggedIn ? (
                  <>
                    <Link
                      href={user?.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard'}
                      onClick={() => setIsOpen(false)}
                      className="flex w-full items-center justify-center rounded-sm border-2 border-outline-variant/15 py-3 text-base font-bold text-primary"
                    >
                      Go to Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setIsOpen(false);
                      }}
                      className="flex w-full items-center justify-center rounded-sm bg-red-50 py-4 text-base font-bold text-red-600"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setIsOpen(false)}
                      className="flex w-full items-center justify-center rounded-sm border-2 border-outline-variant/15 py-3 text-base font-bold text-primary"
                    >
                      Log In
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setIsOpen(false)}
                      className="flex w-full items-center justify-center rounded-sm bg-primary-container py-4 text-base font-bold text-on-primary-container shadow-[0_20px_50px_rgba(27,28,28,0.05)]"
                    >
                      Join us
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}