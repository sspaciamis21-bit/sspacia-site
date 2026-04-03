"use client";
import Image from "next/image";
import { MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";

function Hero() {
  return (
    <section className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[630px] flex items-center mb-48">
      <div className="grid grid-cols-12 gap-12 relative w-full">
        {/* Drafting Line Accent */}
        <div className="absolute top-0 left-0 w-px h-full bg-primary-container/20 -ml-4 hidden lg:block"></div>
        <div className="absolute top-1/4 left-0 w-1/2 h-px bg-primary-container/20 -mt-4 hidden lg:block"></div>
        <div className="col-span-12 lg:col-span-7 z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          >
            <h1 className="font-display text-5xl md:text-7xl lg:text-[7rem] font-bold leading-[0.85] tracking-tighter text-on-surface mb-8">
              The <span className="text-primary-container"><br/>Spatial</span> Blueprint.
            </h1>
            <p className="text-lg md:text-xl text-tertiary max-w-lg font-light leading-relaxed mb-10">
              Architectural coworking designed for those who build the future. A clinical fusion of form, function, and high-performance flow.
            </p>
            <div className="flex gap-6 items-center">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-primary-container pulse-node"></span>
                <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-outline font-bold">Available in 3 Clusters</span>
              </div>
            </div>
            {/* Buttons */}
            <div className="flex flex-row gap-4 flex-wrap mt-10">
              <a href="/book-online">
                <Button size="lg" className="liquid-hover rounded-none h-12 px-8 text-[10px] font-bold uppercase tracking-widest text-on-primary-container bg-primary-container hover:bg-primary-container" variant="default">
                  Book a Tour <MoveRight className="w-3 h-3 ml-2" />
                </Button>
              </a>
              <a href="/gallery">
                <Button size="lg" className="rounded-none h-12 px-8 border border-outline font-bold uppercase tracking-widest text-[10px] hover:bg-surface-high transition-colors text-on-surface bg-transparent">
                  View Spaces
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
        
        {/* Overlapping Image 1 */}
        <motion.div
          className="col-span-12 lg:col-span-6 lg:absolute lg:right-0 lg:top-0 h-[600px] w-full lg:w-[45%] overflow-hidden bg-surface-container-high shadow-2xl mt-12 lg:mt-0"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, ease: [0.23, 1, 0.32, 1], delay: 0.2 }}
        >
          <Image
            src="/Pictures/Reception.jpeg"
            alt="Ultra-modern architectural office interior"
            fill
            className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000 transform hover:scale-105"
            priority
          />
          <div className="absolute bottom-8 left-8 bg-surface-lowest p-6 shadow-xl z-20">
            <span className="text-[0.65rem] font-sans uppercase tracking-[0.3em] text-primary">Volume 01</span>
            <h3 className="font-display text-2xl font-bold mt-2 text-on-surface">Executive Cabins</h3>
          </div>
        </motion.div>
        
        {/* Floating Geometric Line */}
        <div className="hidden lg:block absolute bottom-[-5%] left-[10%] w-[30%] h-px bg-primary-container z-20"></div>
      </div>
    </section>
  );
}

export { Hero };

