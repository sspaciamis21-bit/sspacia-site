/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { FadeUp } from "../../components/ui/fade-up";
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
      className="group relative aspect-[4/3] cursor-pointer overflow-hidden bg-surface-high border border-outline-variant/10 shadow-sm transition-all hover:shadow-2xl"
      onClick={onSelect}
      whileHover={{ y: -5 }}
    >
      {/* Skeleton Loader */}
      <AnimatePresence>
        {!isLoaded && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 bg-surface-high animate-pulse flex items-center justify-center"
          >
            <ImageIcon className="h-8 w-8 text-tertiary/20" />
          </motion.div>
        )}
      </AnimatePresence>

      <Image
        src={image.src}
        alt={image.alt}
        width={800}
        height={600}
        onLoad={() => setIsLoaded(true)}
        className={`w-full h-full object-cover transition-all duration-1000 ease-out group-hover:scale-105 ${
          isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105"
        }`}
        loading="lazy"
      />
      
      {/* Overlay Label */}
      <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-6 md:p-8 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="translate-y-4 transition-transform duration-500 group-hover:translate-y-0 text-left">
          <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mb-2 shadow-sm">
            {image.category}
          </p>
          <p className="text-xl md:text-2xl font-display font-bold text-white mb-4 line-clamp-1">
            {image.alt}
          </p>
          <div className="inline-flex items-center gap-2 rounded-none bg-white/10 border border-white/20 px-4 py-2 backdrop-blur-md transition-colors hover:bg-primary hover:border-primary">
            <Maximize2 className="h-3 w-3 text-white" />
            <span className="text-[10px] font-bold text-white uppercase tracking-widest">View Full</span>
          </div>
        </div>
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
    <div className="space-y-16 py-24 mb-32 max-w-7xl mx-auto px-4 md:px-8">
      {/* ── Header ── */}
      <section className="relative overflow-hidden bg-surface-lowest p-8 md:p-16 border border-outline-variant/10 shadow-[0_40px_80px_rgba(27,28,28,0.05)] text-center mb-16">
        <div className="absolute top-0 left-1/2 w-[1px] h-full bg-outline-variant/10 hidden md:block"></div>
        <div className="relative z-10 space-y-8">
          <FadeUp className="flex justify-center">
            <span className="font-sans text-[10px] uppercase tracking-[0.4em] text-primary block font-bold">Visual Tour</span>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tighter text-on-surface leading-none">
              Our Gallery
            </h1>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="mx-auto max-w-2xl text-xl text-tertiary font-light">
              Explore the premium interiors and vibrant work environments 
              across all our SSPACIA locations in Ahmedabad.
            </p>
          </FadeUp>
        </div>
        <div className="absolute bottom-[-1px] left-[50%] -translate-x-1/2 w-24 h-[4px] bg-primary z-20"></div>
      </section>

      {/* ── Filter ── */}
      <div className="flex flex-wrap justify-center gap-4 px-4 mb-16">
        {categories.map((cat, i) => (
          <FadeUp key={cat} delay={i * 0.05}>
            <button
              onClick={() => {
                setDirection(0);
                setActiveCategory(cat);
                setVisibleCount(12); // Reset count on category change
              }}
              className={`relative rounded-none px-8 py-4 text-[10px] uppercase tracking-[0.2em] font-bold transition-all duration-300 active:scale-95 border ${
                activeCategory === cat
                  ? "bg-primary text-white border-primary shadow-xl shadow-primary/20"
                  : "bg-surface-lowest text-tertiary border-outline-variant/30 hover:border-primary hover:text-primary"
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
            className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
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
              className="liquid-hover group relative flex items-center justify-center gap-4 rounded-none bg-surface-lowest border border-outline-variant/30 px-12 py-5 text-[10px] font-bold uppercase tracking-[0.3em] text-on-surface shadow-md transition-all hover:bg-primary hover:text-white hover:border-primary hover:shadow-xl mt-8"
            >
              Load More
            </button>
          </FadeUp>
        </div>
      )}

      {/* ── Lightbox Modal ── */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm h-[100dvh] w-screen m-0 p-0"
            onClick={() => setSelectedIndex(null)}
          >
            {/* Navigation Buttons */}
            <button 
              className="absolute left-6 top-1/2 -translate-y-1/2 z-[120] text-white/50 hover:text-white transition-all bg-white/5 hover:bg-white/10 p-4 rounded-none border border-white/10 backdrop-blur-md"
              onClick={handlePrev}
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button 
              className="absolute right-6 top-1/2 -translate-y-1/2 z-[120] text-white/50 hover:text-white transition-all bg-white/5 hover:bg-white/10 p-4 rounded-none border border-white/10 backdrop-blur-md"
              onClick={handleNext}
            >
              <ChevronRight className="w-8 h-8" />
            </button>

            <button 
              className="absolute top-8 right-8 z-[120] text-white/70 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-3 rounded-none border border-white/10 backdrop-blur-md"
              onClick={() => setSelectedIndex(null)}
            >
              <X className="w-8 h-8" />
            </button>

            <div className="relative z-[110] flex flex-col items-center justify-center w-full max-w-6xl px-12 min-h-[70vh]">
              <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div 
                  key={selectedImage.src}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="flex flex-col items-center justify-center w-full"
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
              className="absolute bottom-12 left-12 z-[120] text-left space-y-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold text-primary uppercase tracking-[0.4em]">
                  {selectedImage.category}
                </span>
                <span className="h-4 w-[1px] bg-white/30"></span>
                <span className="text-[10px] font-bold text-white/60 tracking-widest whitespace-nowrap">
                  {(selectedIndex ?? 0) + 1} / {filteredImages.length}
                </span>
              </div>
              <h3 className="text-3xl font-display font-bold text-white leading-tight">
                {selectedImage.alt}
              </h3>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CTA Section ── */}
      <FadeUp>
        <section className="relative overflow-hidden bg-primary px-8 py-24 text-center text-white sm:px-16 shadow-2xl">
          <div className="absolute top-0 right-24 w-[1px] h-full bg-white/10 hidden md:block"></div>
          <div className="absolute left-0 bottom-24 w-full h-[1px] bg-white/10 hidden md:block"></div>
          <div className="relative z-10 mx-auto max-w-3xl space-y-8">
            <span className="font-sans text-[10px] uppercase tracking-[0.4em] text-primary-container block font-bold">Visit Us</span>
            <h2 className="font-display text-4xl font-bold sm:text-6xl tracking-tighter">Experience it in person</h2>
            <p className="text-xl text-white/80 font-light mx-auto max-w-xl">
              Photos can only show so much. Schedule a free tour to breathe in the atmosphere 
              and find your perfect spot at SSPACIA.
            </p>
            <div className="pt-8">
              <a 
                href="/book-online"
                className="liquid-hover inline-flex items-center gap-4 bg-white px-10 py-5 text-[10px] font-bold uppercase tracking-widest text-primary transition-all hover:bg-surface-lowest shadow-xl"
              >
                Book a Free Tour
              </a>
            </div>
          </div>
        </section>
      </FadeUp>
    </div>
  );
}
