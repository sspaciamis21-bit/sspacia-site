"use client";
import Image from "next/image";
import { MoveRight, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import ShinyText from "@/components/ui/ShinyText";
import { motion, Variants} from "motion/react";

// Reusable variants with explicit typing
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { 
      duration: 0.55, 
      ease: [0.22, 1, 0.36, 1] as const, // Added as const
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
      ease: [0.22, 1, 0.36, 1] as const, // Added as const
      delay 
    },
  }),
};

function Hero() {
  return (
    <div className="relative w-full py-10 lg:py-20 overflow-hidden bg-gradient-to-br from-[#E0F7FA] via-[#F8F9FA] to-[#E0F2F1]">
      {/* Decorative blur orbs */}
      <div className="pointer-events-none absolute -top-20 -left-20 w-96 h-96 rounded-full bg-[#006064]/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 right-0 w-80 h-80 -translate-y-1/2 rounded-full bg-[#4DB6AC]/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 w-72 h-72 rounded-full bg-[#B2EBF2]/40 blur-2xl" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-50 relative z-10">
        <div className="grid grid-cols-1 gap-8 items-center md:grid-cols-2">

          {/* ── Left: Text + Buttons ── */}
          <div className="flex gap-6 flex-col">

            {/* Badge */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={0}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-[#006064]/30 bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#006064] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#006064]" />
                </span>
                <ShinyText
                  text="Premium Coworking in Ahmedabad"
                  color="#006064"
                  shineColor="#ffffff"
                  speed={3}
                  spread={100}
                />
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
              <h1 className="text-5xl md:text-7xl max-w-lg tracking-tighter text-left font-semibold text-[#004D40]">
                Top Coworking Spaces
              </h1>
              <p className="text-lg leading-relaxed tracking-tight text-[#616161] max-w-md text-left">
                SSPACIA offers modern coworking spaces in Ahmedabad, designed to
                foster creativity and collaboration in a professional
                environment. Join our vibrant community today.
              </p>
            </motion.div>

            {/* Buttons */}
            <div className="flex flex-row gap-4 flex-wrap">
              <motion.div
                variants={fadeIn}
                initial="hidden"
                animate="show"
                custom={0.22}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                <a href="/book-online">
                  <Button size="lg" className="gap-3 rounded-full" variant="outline">
                    Book a tour <PhoneCall className="w-4 h-4" />
                  </Button>
                </a>
              </motion.div>
              <motion.div
                variants={fadeIn}
                initial="hidden"
                animate="show"
                custom={0.32}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                <a href="/gallary">
                  <Button size="lg" className="gap-3 rounded-full">
                    View Spaces <MoveRight className="w-4 h-4" />
                  </Button>
                </a>
              </motion.div>
            </div>
          </div>

          {/* ── Right: Image Grid ── */}
          <div className="grid grid-cols-2 gap-4 h-[480px]">
            {/* Top-left */}
            <motion.div
              className="rounded-2xl overflow-hidden ring-1 ring-[#006064]/20 shadow-lg shadow-[#006064]/10"
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
              whileHover={{ scale: 1.03, transition: { duration: 0.25 } }}
            >
              <Image
                src="/IMAGES_SSPACIA/AGARWAL COMPLEX IMAGES/Reception Area.jpg"
                alt="SSPACIA Coworking Space"
                width={400}
                height={240}
                className="w-full h-full object-cover"
              />
            </motion.div>

            {/* Right — tall, spans 2 rows */}
            <motion.div
              className="rounded-2xl overflow-hidden row-span-2 ring-1 ring-[#006064]/20 shadow-xl shadow-[#006064]/15"
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
              whileHover={{ scale: 1.02, transition: { duration: 0.25 } }}
            >
              <Image
                src="/IMAGES_SSPACIA/PREMIER HOUSE/ESL04996.JPG"
                alt="SSPACIA Premier House"
                width={400}
                height={480}
                className="w-full h-full object-cover"
              />
            </motion.div>

            {/* Bottom-left */}
            <motion.div
              className="rounded-2xl overflow-hidden ring-1 ring-[#006064]/20 shadow-lg shadow-[#006064]/10"
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.42 }}
              whileHover={{ scale: 1.03, transition: { duration: 0.25 } }}
            >
              <Image
                src="/IMAGES_SSPACIA/MERCADO IMAGES/Mercado reception.jpg"
                alt="SSPACIA Mercardo"
                width={400}
                height={240}
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>

        </div>
      </div>
    </div>
  );
}

export { Hero };
