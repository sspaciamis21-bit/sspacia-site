"use client";

import React, { useState } from "react";
import Image from "next/image";
import { MoveRight, Phone, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { BookTourModal } from "./book-tour-modal";

function Hero() {
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);

  return (
    <>
      <section className="relative w-full overflow-hidden bg-gradient-to-br from-[#EBF7F8] via-[#F4FBFC] to-white pt-6 pb-12 lg:pt-8 lg:pb-16 border-b border-teal-100">
        
        {/* Subtle Ambient Background Lighting Overlay */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-teal-200/20 to-transparent pointer-events-none" />
        <div className="absolute -bottom-24 left-1/4 w-96 h-96 bg-teal-300/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* ── LEFT COLUMN: TYPOGRAPHY & CALL TO ACTION ── */}
            <div className="lg:col-span-6 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="space-y-6"
              >
                {/* Dynamic Shining Badge */}
                <span className="inline-flex items-center gap-3 rounded-full border border-[#006064]/30 bg-white/60 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] shadow-sm backdrop-blur-md">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#006064] opacity-60"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#006064]"></span>
                  </span>
                  <span
                    className="inline-block animate-text-shimmer bg-clip-text text-transparent"
                    style={{
                      backgroundImage: "linear-gradient(100deg, rgb(0, 96, 100) 0%, rgb(0, 96, 100) 35%, rgb(255, 255, 255) 50%, rgb(0, 96, 100) 65%, rgb(0, 96, 100) 100%)",
                      backgroundSize: "200% 100%",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    PREMIUM COWORKING IN AHMEDABAD
                  </span>
                </span>

                {/* Main Headline */}
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-black text-[#004D40] tracking-tight leading-[1.06]">
                  Top <br />
                  Coworking <br />
                  Spaces
                </h1>

                {/* Description */}
                <p className="text-base sm:text-lg text-gray-700 font-normal leading-relaxed max-w-xl">
                  SSPACIA offers modern coworking spaces in Ahmedabad, designed to foster creativity and collaboration in a professional environment. Join our vibrant community today.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <button
                    onClick={() => setIsTourModalOpen(true)}
                    className="px-7 py-3.5 bg-white text-gray-900 font-bold text-sm rounded-full shadow-md hover:shadow-xl hover:bg-gray-50 border border-gray-200 transition-all transform hover:-translate-y-0.5 flex items-center gap-2.5 cursor-pointer"
                  >
                    <span>Book a tour</span>
                    <Phone className="w-4 h-4 text-[#1ab0bc]" />
                  </button>

                  <a
                    href="#spaces"
                    className="px-8 py-3.5 bg-[#004D40] hover:bg-[#00382F] text-white font-bold text-sm rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer"
                  >
                    <span>View Spaces</span>
                    <MoveRight className="w-4 h-4" />
                  </a>
                </div>

                {/* Key Highlights */}
                <div className="pt-4 flex flex-wrap items-center gap-6 text-xs font-bold text-gray-600 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 3 Prime Locations
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> High-Speed Wi-Fi
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Flexible Desk & Cabins
                  </span>
                </div>
              </motion.div>
            </div>

            {/* ── RIGHT COLUMN: FEATURED WORKSPACE IMAGES GRID ── */}
            <div className="lg:col-span-6 relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="grid grid-cols-12 gap-4 items-center relative"
              >
                
                {/* Main Feature Card: New SSPACIA Reception Lobby */}
                <div className="col-span-7 relative group">
                  <div className="relative h-[380px] sm:h-[440px] rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white">
                    <Image
                      src="/sspacia-reception-v2.png"
                      alt="SSPACIA Premium Reception Lobby Ahmedabad"
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    
                    <div className="absolute bottom-5 left-5 right-5 text-white">
                      <h3 className="font-display text-lg font-bold">Welcome Concierge</h3>
                    </div>
                  </div>
                </div>

                {/* Side Stacked Cards */}
                <div className="col-span-5 space-y-4">
                  {/* Top Right Card: Reception Lounge */}
                  <div className="relative h-[180px] sm:h-[210px] rounded-[1.8rem] overflow-hidden shadow-lg border-4 border-white group">
                    <Image
                      src="/Pictures/Reception.jpeg"
                      alt="SSPACIA Reception Area"
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                    <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-gray-900">
                      Welcome Lounge
                    </div>
                  </div>

                  {/* Bottom Right Card: Executive Lounge */}
                  <div className="relative h-[180px] sm:h-[210px] rounded-[1.8rem] overflow-hidden shadow-lg border-4 border-white group">
                    <Image
                      src="/IMAGES_SSPACIA/MERCADO IMAGES/Reception.jpg"
                      alt="SSPACIA Executive Lounge"
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                    <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-gray-900">
                      Executive Cabins
                    </div>
                  </div>
                </div>


              </motion.div>
            </div>

          </div>
        </div>
      </section>

      {/* Tour Booking Modal */}
      <BookTourModal
        isOpen={isTourModalOpen}
        onClose={() => setIsTourModalOpen(false)}
      />
    </>
  );
}

export { Hero };
