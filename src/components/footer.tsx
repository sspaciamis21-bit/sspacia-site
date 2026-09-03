"use client";

import Link from "next/link";
import { Youtube, Instagram, Linkedin, Facebook, MapPin, Phone, Mail, Clock } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#1B1C1C] text-white border-t border-white/10 pt-10 pb-5 md:pt-12 md:pb-6">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 space-y-6 md:space-y-8">
        
        {/* TOP GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 border-b border-white/10 pb-8 md:pb-10">
          
          {/* COLUMN 1: ABOUT */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-display font-black text-2xl tracking-tighter text-[#1ab0bc]">SSPACIA</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] bg-white/10 px-2 py-1 text-white/70">COWORKING</span>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              SSPACIA offers modern, comfortable, and enterprise-grade coworking spaces, private cabins, and guest meeting rooms across prime commercial hubs in Ahmedabad.
            </p>

            {/* SOCIAL MEDIA LINKS */}
            <div className="space-y-3 pt-2">
              <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#1ab0bc] block">CONNECT WITH US</span>
              <div className="flex items-center gap-3">
                <a
                  href="https://www.facebook.com/share/1ESQc7o11n/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/80 hover:text-blue-600 hover:border-blue-600/50 hover:bg-white/10 transition-all"
                  title="SSPACIA Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </a>

                <a
                  href="https://www.instagram.com/sspacia?igsh=aWR3Z2F4MG0yMXRt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/80 hover:text-pink-500 hover:border-pink-500/50 hover:bg-white/10 transition-all"
                  title="SSPACIA Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>

                <a
                  href="https://www.linkedin.com/company/sspacia/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/80 hover:text-blue-500 hover:border-blue-500/50 hover:bg-white/10 transition-all"
                  title="SSPACIA LinkedIn"
                >
                  <Linkedin className="w-4 h-4" />
                </a>

                <a
                  href="https://www.youtube.com/@sspacia_"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/80 hover:text-red-500 hover:border-red-500/50 hover:bg-white/10 transition-all"
                  title="SSPACIA YouTube"
                >
                  <Youtube className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* COLUMN 2: QUICK LINKS */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-[0.3em] text-[#1ab0bc]">NAVIGATE</h4>
            <ul className="space-y-2.5 text-xs text-white/70">
              <li><Link href="/" className="hover:text-[#1ab0bc] transition-colors">Home</Link></li>
              <li><Link href="/coworking-spaces" className="hover:text-[#1ab0bc] transition-colors">All Workspaces</Link></li>
              <li><Link href="/guest-spaces" className="hover:text-[#1ab0bc] transition-colors">Guest Meeting Rooms</Link></li>
              <li><Link href="/about" className="hover:text-[#1ab0bc] transition-colors">About Us</Link></li>
              <li>
                <Link
                  href="/careers"
                  className="inline-flex items-center gap-2 group text-white font-bold hover:text-[#1ab0bc] transition-all bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/10"
                >
                  <span>Careers</span>
                  <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-full shadow-xs tracking-wide uppercase">
                    We're Hiring
                  </span>
                </Link>
              </li>
              <li><Link href="/contact" className="hover:text-[#1ab0bc] transition-colors">Contact Support</Link></li>

            </ul>
          </div>

          {/* COLUMN 3: OUR SPACES */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-[0.3em] text-[#1ab0bc]">OUR SPACES</h4>
            <ul className="space-y-3 text-xs text-white/70">
              <li>
                <Link href="/products#agarwal-complex" className="flex items-center gap-2 group hover:text-[#1ab0bc] transition-colors">
                  <MapPin className="w-4 h-4 text-[#1ab0bc] shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-white group-hover:text-[#1ab0bc]">CG Road – Agarwal Complex</span>
                </Link>
              </li>
              <li>
                <Link href="/products#mercardo" className="flex items-center gap-2 group hover:text-[#1ab0bc] transition-colors">
                  <MapPin className="w-4 h-4 text-[#1ab0bc] shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-white group-hover:text-[#1ab0bc]">CG Road – Mercardo</span>
                </Link>
              </li>
              <li>
                <Link href="/products#premier-house" className="flex items-center gap-2 group hover:text-[#1ab0bc] transition-colors">
                  <MapPin className="w-4 h-4 text-[#1ab0bc] shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-white group-hover:text-[#1ab0bc]">SG Highway – Premier House</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* COLUMN 4: CONTACT & HOURS */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-[0.3em] text-[#1ab0bc]">SUPPORT & CONTACT</h4>
            <div className="space-y-3 text-xs text-white/70">
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-[#1ab0bc] shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <a href="tel:+917600393779" className="hover:text-[#1ab0bc] transition-colors">+91 76003 93779</a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-[#1ab0bc] shrink-0" />
                <a href="mailto:sales@sspacia.com" className="hover:text-[#1ab0bc] transition-colors font-mono">sales@sspacia.com</a>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-[#1ab0bc] shrink-0" />
                <span>24/7</span>
              </div>
            </div>
          </div>

        </div>

        {/* BOTTOM COPYRIGHT BAR */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-[11px] text-white/40 pt-1 md:pt-2">
          <p>© {new Date().getFullYear()} SSPACIA Coworking Solutions Ltd. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-white/80 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white/80 transition-colors">Terms of Service</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
