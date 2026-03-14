"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { FadeUp } from "../../components/ui/fade-up";
import { SectionLabel } from "../../components/ui/section-label";
import { ImageIcon, Maximize2, X } from "lucide-react";

interface GalleryImage {
  src: string;
  alt: string;
  category: string;
}

const galleryImages: GalleryImage[] = [
  // Agarwal Complex
  {
    src: "/IMAGES_SSPACIA/AGARWAL COMPLEX IMAGES/Reception Area.jpg",
    alt: "Agarwal Complex Reception",
    category: "Agarwal Complex",
  },
  {
    src: "/IMAGES_SSPACIA/AGARWAL COMPLEX IMAGES/AG 6 seater 2.jpeg",
    alt: "Agarwal Complex AG 6 Seater",
    category: "Agarwal Complex",
  },
  {
    src: "/IMAGES_SSPACIA/AGARWAL COMPLEX IMAGES/Executive Cabin.jpeg",
    alt: "Agarwal Complex Executive Cabin",
    category: "Agarwal Complex",
  },
  {
    src: "/IMAGES_SSPACIA/AGARWAL COMPLEX IMAGES/Traning Room.jpeg",
    alt: "Agarwal Complex Training Room",
    category: "Agarwal Complex",
  },
  // Mercardo
  {
    src: "/IMAGES_SSPACIA/MERCADO IMAGES/Mercado reception.jpg",
    alt: "Mercardo Reception",
    category: "Mercardo",
  },
  {
    src: "/IMAGES_SSPACIA/MERCADO IMAGES/Mercado conference room.jpg",
    alt: "Mercardo Conference Room",
    category: "Mercardo",
  },
  {
    src: "/IMAGES_SSPACIA/MERCADO IMAGES/Mercado meeting room.jpg",
    alt: "Mercardo Meeting Room",
    category: "Mercardo",
  },
  {
    src: "/IMAGES_SSPACIA/MERCADO IMAGES/Mercado Private cabin.jpg",
    alt: "Mercardo Private Cabin",
    category: "Mercardo",
  },
  // Premier House
  {
    src: "/IMAGES_SSPACIA/PREMIER HOUSE/ESL04996.JPG",
    alt: "Premier House Main",
    category: "Premier House",
  },
  {
    src: "/IMAGES_SSPACIA/PREMIER HOUSE/board room.jpg",
    alt: "Premier House Board Room",
    category: "Premier House",
  },
  {
    src: "/IMAGES_SSPACIA/PREMIER HOUSE/meeting room.jpg",
    alt: "Premier House Meeting Room",
    category: "Premier House",
  },
  {
    src: "/IMAGES_SSPACIA/PREMIER HOUSE/flexi desk PH 1.jpg",
    alt: "Premier House Desk Area",
    category: "Premier House",
  },
];

const categories = ["All", "Agarwal Complex", "Mercardo", "Premier House"];

export default function GalleryPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  const filteredImages = activeCategory === "All" 
    ? galleryImages 
    : galleryImages.filter(img => img.category === activeCategory);

  return (
    <div className="space-y-16 py-12">
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
      <div className="flex flex-wrap justify-center gap-3">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`rounded-full px-6 py-2 text-sm font-semibold transition-all ${
              activeCategory === cat
                ? "bg-[#006064] text-white shadow-lg shadow-[#006064]/30"
                : "bg-white text-[#616161] border border-[#CFD8DC] hover:border-[#006064] hover:text-[#006064]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Gallery Grid ── */}
      <motion.div 
        layout
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <AnimatePresence mode="popLayout">
          {filteredImages.map((image, index) => (
            <motion.div
              layout
              key={image.src}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="group relative aspect-square cursor-pointer overflow-hidden rounded-2xl bg-[#F8F9FA] shadow-sm transition-all hover:shadow-xl"
              onClick={() => setSelectedImage(image)}
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
                <Maximize2 className="text-white w-8 h-8 opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0" />
              </div>
              <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-3 rounded-xl transform translate-y-12 group-hover:translate-y-0 transition-transform duration-300">
                <p className="text-xs font-bold text-[#006064] uppercase tracking-wider">{image.category}</p>
                <p className="text-sm font-semibold text-[#212121] truncate">{image.alt}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* ── Lightbox Modal ── */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 sm:p-10"
            onClick={() => setSelectedImage(null)}
          >
            <button 
              className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors"
              onClick={() => setSelectedImage(null)}
            >
              <X className="w-10 h-10" />
            </button>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-h-full max-w-full overflow-hidden rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={selectedImage.src} 
                alt={selectedImage.alt}
                className="max-h-[85vh] w-auto object-contain rounded-xl"
              />
              <div className="mt-4 text-center">
                <h3 className="text-xl font-bold text-white">{selectedImage.alt}</h3>
                <p className="text-white/60">{selectedImage.category}</p>
              </div>
            </motion.div>
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
