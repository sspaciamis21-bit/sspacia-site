"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { siteConfig } from "../config/site";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isLoggedIn, logout } = useAuth();

  return (
    <header className="fixed inset-x-0 top-0 z-[100] border-b border-[#CFD8DC] bg-[#F8F9FA]/70 backdrop-blur">
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
          </Link>
        </div>

        {/* Desktop Nav links - center */}
        <nav className="hidden md:flex flex-1 justify-center items-center gap-8 text-md font-medium text-[#424242]">
          {siteConfig.navigation
            // .filter((item) => item.label !== "Careers")
            .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative transition-colors hover:text-[#006064] group py-2"
            >
              <span className="relative z-10">
                {item.label}
              </span>
              <span className="absolute left-0 bottom-0 w-full h-[2px] bg-[#006064] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
            </Link>
          ))}
        </nav>

        {/* Desktop Buttons - right */}
        <div className="hidden md:flex items-center gap-4">
          {isLoggedIn ? (
            <div className="flex items-center gap-4">
              <Link
                href={user?.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard'}
                className="text-md font-bold text-[#006064] hover:text-[#004D40] transition-colors"
              >
                Dashboard
              </Link>
              <button
                onClick={logout}
                className="text-md font-bold text-[#424242] hover:text-red-600 transition-colors"
              >
                Logout
              </button>
              <div className="h-10 w-10 rounded-full bg-[#E0F7FA] text-[#006064] flex items-center justify-center font-bold border border-[#006064]/20 shadow-inner">
                {user?.name.charAt(0).toUpperCase()}
              </div>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="text-md font-bold text-[#424242] hover:text-[#006064] transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-[#006064] px-6 py-2.5 text-md font-bold text-white shadow-lg shadow-[#006064]/20 transition-all hover:bg-[#004D40] active:scale-95"
              >
                Join us
              </Link>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <button 
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#006064]/5 text-[#006064] md:hidden"
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
            className="border-t border-[#CFD8DC] bg-white md:hidden overflow-hidden"
          >
            <div className="flex flex-col space-y-1 p-4">
              {siteConfig.navigation
                // .filter((item) => item.label !== "Careers")
                .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl px-4 py-3 text-base font-medium text-[#424242] transition-colors hover:bg-[#E0F7FA] hover:text-[#006064]"
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-[#CFD8DC]/50 mt-2 flex flex-col gap-3">
                {isLoggedIn ? (
                  <>
                    <Link
                      href={user?.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard'}
                      onClick={() => setIsOpen(false)}
                      className="flex w-full items-center justify-center rounded-xl border-2 border-[#006064] py-3 text-base font-bold text-[#006064]"
                    >
                      Go to Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setIsOpen(false);
                      }}
                      className="flex w-full items-center justify-center rounded-xl bg-red-50 py-4 text-base font-bold text-red-600 border border-red-100"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setIsOpen(false)}
                      className="flex w-full items-center justify-center rounded-xl border-2 border-[#006064] py-3 text-base font-bold text-[#006064]"
                    >
                      Log In
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setIsOpen(false)}
                      className="flex w-full items-center justify-center rounded-xl bg-[#006064] py-4 text-base font-bold text-white shadow-xl shadow-[#006064]/20"
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