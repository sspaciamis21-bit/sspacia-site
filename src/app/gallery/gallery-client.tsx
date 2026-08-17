"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { FadeUp } from "../../components/ui/fade-up";
import { SectionLabel } from "../../components/ui/section-label";
import { ImageIcon, Maximize2, X, ChevronLeft, ChevronRight } from "lucide-react";

import imagesData from "../../config/images.json";

interface GalleryImage {
  src: string;
  alt: string;
  category: string;
}

// Function to format filename into a readable alt text
const formatAltText = (src: string) => {
  const filename = src.split('/').pop()?.split('.')[0] || "";
  return filename
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
};

const categoryMapping: Record<string, string> = {
  "Agarwal Complex": "AGARWAL COMPLEX IMAGES",
  "Mercardo": "MERCADO IMAGES",
  "Premier House": "PREMIER HOUSE"
};

const galleryImages: GalleryImage[] = Object.entries(categoryMapping).flatMap(([displayCat, jsonKey]) => {
  const images = (imagesData as any)[jsonKey] || [];
  return images.map((src: string) => ({
    src,
    alt: formatAltText(src),
    category: displayCat,
  }));
});

const categories = ["All", ...Object.keys(categoryMapping)];

const GalleryCard = ({ 
  image, 
  onSelect 
}: { 
  image: GalleryImage; 
  onSelect: () => void;
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-3xl bg-[#F1F5F9] shadow-sm transition-all hover:shadow-2xl"
      onClick={onSelect}
      whileHover={{ y: -5 }}
    >
      {/* Skeleton Loader */}
      <AnimatePresence>
        {!isLoaded && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 bg-[#F1F5F9] animate-pulse flex items-center justify-center"
          >
            <ImageIcon className="h-8 w-8 text-[#006064]/20" />
          </motion.div>
        )}
      </AnimatePresence>

      <img
        src={image.src}
        alt={image.alt}
        onLoad={() => setIsLoaded(true)}
        className={`w-full h-full object-cover transition-all duration-1000 ease-out group-hover:scale-110 ${
          isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105"
        }`}
        loading="lazy"
      />
      
      {/* Minimal Overlay Label */}
      <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="translate-y-4 transition-transform duration-300 group-hover:translate-y-0 text-left">
          <p className="text-[10px] font-bold text-[#4DB6AC] uppercase tracking-[0.2em] mb-1">
            {image.category}
          </p>
          <p className="text-sm font-bold text-white mb-2 line-clamp-1">
            {image.alt}
          </p>
          <div className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-3 py-1.5 backdrop-blur-md">
            <Maximize2 className="h-3 w-3 text-white" />
            <span className="text-[10px] font-bold text-white uppercase tracking-wider">View Full</span>
          </div>
        </div>
      </div>

      {/* Constant Subtle Indicator */}
      <div className="absolute top-4 right-4 z-30 rounded-full bg-white/10 p-2 opacity-100 backdrop-blur-md transition-all group-hover:bg-white/30 group-hover:scale-110">
        <ImageIcon className="h-3 w-3 text-white" />
      </div>
    </motion.div>
  );
};

export default function GalleryClient() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState(0);
  const [visibleCount, setVisibleCount] = useState(12);

  const filteredImages = activeCategory === "All" 
    ? galleryImages 
    : galleryImages.filter(img => img.category === activeCategory);

  const displayedImages = filteredImages.slice(0, visibleCount);
  const canLoadMore = visibleCount < filteredImages.length;

  const loadMore = () => {
    setVisibleCount(prev => prev + 8);
  };

  const selectedImage = selectedIndex !== null ? filteredImages[selectedIndex] : null;

  useEffect(() => {
    if (selectedIndex !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [selectedIndex]);

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIndex !== null) {
      setDirection(1);
      setSelectedIndex((selectedIndex + 1) % filteredImages.length);
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIndex !== null) {
      setDirection(-1);
      setSelectedIndex((selectedIndex - 1 + filteredImages.length) % filteredImages.length);
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 40 : -40,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      transition: {
        x: { type: "tween" as const, duration: 0.4, ease: "easeOut" as const },
        opacity: { duration: 0.3 }
      }
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 40 : -40,
      opacity: 0,
      transition: {
        x: { type: "tween" as const, duration: 0.2, ease: "easeIn" as const },
        opacity: { duration: 0.2 }
      }
    })
  };

  return (
    <div className="space-y-16 py-12 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* ── Header ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#E0F7FA] via-[#F8F9FA] to-[#E0F2F1] px-6 py-16 sm:px-12 sm:py-24 text-center">
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[#006064]/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#4DB6AC]/15 blur-3xl" />
        
        <div className="relative z-10 space-y-6">
          <FadeUp className="flex justify-center">
            <SectionLabel>
              <ImageIcon className="h-3 w-3" /> Visual Tour
            </SectionLabel>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h1 className="text-4xl font-bold tracking-tight text-[#004D40] sm:text-6xl">
              Our Gallery
            </h1>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="mx-auto max-w-2xl text-lg text-[#616161]">
              Explore the premium interiors and vibrant work environments 
              across all our SSPACIA locations in Ahmedabad.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ── Filter ── */}
      <div className="flex flex-wrap justify-center gap-4 px-4">
        {categories.map((cat, i) => (
          <FadeUp key={cat} delay={i * 0.05}>
            <button
              onClick={() => {
                setDirection(0);
                setActiveCategory(cat);
                setVisibleCount(12); // Reset count on category change
              }}
              className={`relative rounded-full px-8 py-3 text-sm font-bold transition-all duration-300 active:scale-95 ${
                activeCategory === cat
                  ? "bg-[#006064] text-white shadow-xl shadow-[#006064]/20"
                  : "bg-white text-[#455A64] hover:bg-[#F0F4F8] hover:text-[#006064] border border-[#ECEFF1]"
              }`}
            >
              {cat}
            </button>
          </FadeUp>
        ))}
      </div>

      {/* ── Gallery Uniform Grid ── */}
      <div className="px-4 md:px-0 min-h-[600px]">
        <AnimatePresence mode="popLayout">
          <motion.div 
            key={activeCategory} 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {displayedImages.map((image) => (
              <GalleryCard 
                key={image.src}
                image={image}
                onSelect={() => setSelectedIndex(displayedImages.indexOf(image))}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Load More Button ── */}
      {canLoadMore && (
        <div className="flex justify-center pt-8">
          <FadeUp>
            <button
              onClick={loadMore}
              className="group relative flex items-center gap-3 rounded-2xl bg-white px-10 py-5 text-sm font-bold text-[#006064] shadow-md transition-all hover:bg-[#006064] hover:text-white hover:shadow-xl active:scale-95 border border-[#ECEFF1]"
            >
              <div className="rounded-full bg-[#006064]/10 p-2 transition-colors group-hover:bg-white/20">
                <ImageIcon className="h-4 w-4" />
              </div>
              Load More Masterpieces
            </button>
          </FadeUp>
        </div>
      )}

      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black h-[100dvh] w-screen m-0 p-0"
            onClick={() => setSelectedIndex(null)}
          >
            {/* Background elements are now redundant with bg-black, but keep for safety/transitions */}
            <div className="absolute inset-0 bg-black" />

            {/* Navigation Buttons */}
            <button 
              className="absolute left-6 top-1/2 -translate-y-1/2 z-[120] text-white/50 hover:text-white transition-all bg-white/10 hover:bg-white/20 p-4 rounded-full backdrop-blur-md"
              onClick={handlePrev}
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button 
              className="absolute right-6 top-1/2 -translate-y-1/2 z-[120] text-white/50 hover:text-white transition-all bg-white/10 hover:bg-white/20 p-4 rounded-full backdrop-blur-md"
              onClick={handleNext}
            >
              <ChevronRight className="w-8 h-8" />
            </button>

            <button 
              className="absolute top-6 right-6 z-[120] text-white/70 hover:text-white transition-colors bg-white/10 p-3 rounded-2xl backdrop-blur-md"
              onClick={() => setSelectedIndex(null)}
            >
              <X className="w-8 h-8" />
            </button>

            <div className="relative z-[110] flex flex-col items-center justify-center w-full max-w-5xl px-4 min-h-[70vh]">
              <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div 
                  key={selectedImage.src}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="flex flex-col items-center justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <img 
                    src={selectedImage.src} 
                    alt={selectedImage.alt}
                    className="max-h-[75vh] sm:max-h-[80vh] w-auto object-contain rounded-xl shadow-2xl"
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Repositioned Label - Bottom Left */}
            <div 
              className="absolute bottom-10 left-10 z-[120] text-left space-y-1"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-[#E0F2F1] uppercase tracking-[0.3em]">
                  {selectedImage.category}
                </span>
                <span className="h-4 w-[1px] bg-white/20"></span>
                <span className="text-[10px] text-white/60 font-medium whitespace-nowrap">
                  {(selectedIndex ?? 0) + 1} / {filteredImages.length}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white leading-tight">
                {selectedImage.alt}
              </h3>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CTA Section ── */}
      <FadeUp>
        <section className="rounded-3xl bg-[#004D40] px-6 py-12 text-center text-white sm:px-12 sm:py-20">
          <div className="mx-auto max-w-2xl space-y-6">
            <h2 className="text-3xl font-bold sm:text-4xl">Experience it in person</h2>
            <p className="text-[#B2DFDB]">
              Photos can only show so much. Schedule a free tour to breathe in the atmosphere 
              and find your perfect spot at SSPACIA.
            </p>
            <a 
              href="/book-online"
              className="inline-block rounded-full bg-[#006064] px-8 py-4 text-base font-bold text-white transition-all hover:bg-[#007C91] hover:scale-105 active:scale-95 shadow-lg shadow-[#00251A]/40"
            >
              Book a Free Tour
            </a>
          </div>
        </section>
      </FadeUp>
    </div>
  );
}
