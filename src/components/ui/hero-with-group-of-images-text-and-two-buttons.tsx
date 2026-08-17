"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MoveRight, PhoneCall } from "lucide-react";
import { motion, type Variants } from "motion/react";
import { BookTourModal } from "./book-tour-modal";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { 
      duration: 0.55, 
      ease: [0.22, 1, 0.36, 1],
      delay 
    },
  }),
};

const fadeIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  show: (delay: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { 
      duration: 0.5, 
      ease: [0.22, 1, 0.36, 1],
      delay 
    },
  }),
};

function Hero() {
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);

  return (
    <>
      <div className="relative w-full py-10 lg:py-20 overflow-hidden bg-gradient-to-br from-[#E0F7FA] via-[#F8F9FA] to-[#E0F2F1] border-b border-[#CFD8DC]">
        {/* Decorative blur orbs */}
        <div className="pointer-events-none absolute -top-20 -left-20 w-96 h-96 rounded-full bg-[#006064]/15 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 right-0 w-80 h-80 -translate-y-1/2 rounded-full bg-[#4DB6AC]/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 w-72 h-72 rounded-full bg-[#B2EBF2]/40 blur-2xl" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 gap-8 items-center md:grid-cols-2">

            {/* ── Left: Text + Buttons ── */}
            <div className="flex gap-6 flex-col text-center md:text-left items-center md:items-start">

              {/* Badge */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="show"
                custom={0}
              >
                <span className="inline-flex items-center gap-3 rounded-full border border-[#006064]/30 bg-white/60 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] shadow-sm">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#006064] opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#006064]" />
                  </span>
                  <span className="text-[#006064] font-bold">
                    Premium Coworking in Ahmedabad
                  </span>
                </span>
              </motion.div>

              {/* Heading + subtext */}
              <motion.div
                className="flex gap-4 flex-col"
                variants={fadeUp}
                initial="hidden"
                animate="show"
                custom={0.1}
              >
                <h1 className="text-5xl md:text-7xl lg:text-8xl max-w-lg tracking-tighter leading-[0.9] font-bold text-[#004D40]">
                  Top Coworking Spaces
                </h1>
                <p className="text-base sm:text-lg leading-relaxed tracking-tight text-[#616161] max-w-md mx-auto md:mx-0">
                  SSPACIA offers modern coworking spaces in Ahmedabad, designed to
                  foster creativity and collaboration in a professional
                  environment. Join our vibrant community today.
                </p>
              </motion.div>

              {/* Buttons */}
              <div className="flex flex-row gap-4 flex-wrap justify-center md:justify-start">
                <motion.div
                  variants={fadeIn}
                  initial="hidden"
                  animate="show"
                  custom={0.22}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <button
                    onClick={() => setIsTourModalOpen(true)}
                    className="inline-flex items-center gap-3 rounded-full h-14 px-8 text-base font-bold shadow-xl shadow-[#006064]/20 border-2 border-[#006064] text-[#006064] bg-white hover:bg-[#E0F7FA]/50 transition-all cursor-pointer"
                  >
                    Book a tour <PhoneCall className="w-4 h-4" />
                  </button>
                </motion.div>

                <motion.div
                  variants={fadeIn}
                  initial="hidden"
                  animate="show"
                  custom={0.32}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Link
                    href="/gallery"
                    className="inline-flex items-center gap-3 rounded-full h-14 px-8 text-base font-bold text-white bg-[#006064] hover:bg-[#004D40] shadow-xl shadow-[#006064]/20 transition-all cursor-pointer"
                  >
                    View Spaces <MoveRight className="w-4 h-4" />
                  </Link>
                </motion.div>
              </div>
            </div>

            {/* ── Right: Image Grid (Pure Images, No Text Labels) ── */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 h-[350px] sm:h-[480px]">
              {/* Top-left */}
              <motion.div
                className="rounded-3xl overflow-hidden ring-1 ring-[#006064]/10 shadow-lg shadow-[#006064]/5 relative"
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                whileHover={{ scale: 1.03, transition: { duration: 0.25 } }}
              >
                <Image
                  src="/Pictures/Reception.jpeg"
                  alt="SSPACIA Coworking Space"
                  width={400}
                  height={240}
                  className="w-full h-full object-cover"
                  priority
                />
              </motion.div>

              {/* Right — tall, spans 2 rows */}
              <motion.div
                className="rounded-3xl overflow-hidden row-span-2 ring-1 ring-[#006064]/10 shadow-xl shadow-[#006064]/10 relative"
                initial={{ opacity: 0, x: 50, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                whileHover={{ scale: 1.02, transition: { duration: 0.25 } }}
              >
                <Image
                  src="/IMAGES_SSPACIA/PREMIER HOUSE/Reception.JPG"
                  alt="SSPACIA Premier House"
                  width={400}
                  height={480}
                  className="w-full h-full object-cover"
                  priority
                />
              </motion.div>

              {/* Bottom-left */}
              <motion.div
                className="rounded-3xl overflow-hidden ring-1 ring-[#006064]/10 shadow-lg shadow-[#006064]/5 relative"
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.42 }}
                whileHover={{ scale: 1.03, transition: { duration: 0.25 } }}
              >
                <Image
                  src="/IMAGES_SSPACIA/MERCADO IMAGES/Reception.jpg"
                  alt="SSPACIA Mercardo"
                  width={400}
                  height={240}
                  className="w-full h-full object-cover"
                  priority
                />
              </motion.div>
            </div>

          </div>
        </div>
      </div>

      {/* Tour Booking Modal */}
      <BookTourModal
        isOpen={isTourModalOpen}
        onClose={() => setIsTourModalOpen(false)}
      />
    </>
  );
}

export { Hero };
