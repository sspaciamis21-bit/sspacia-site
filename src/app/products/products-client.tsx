"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import productsData from "@/config/products.json";
import { FadeUp } from "@/components/ui/fade-up";
import { SectionLabel } from "@/components/ui/section-label";
import { 
  Briefcase, 
  Clock, 
  Users, 
  ShieldCheck, 
  Coffee,
  Calendar,
  Layers,
  ArrowRight
} from "lucide-react";
import Link from "next/link";

// Types
interface CommitmentPeriods {
  [key: string]: number | null;
}

interface Workspace {
  type: string;
  commitment_periods: CommitmentPeriods;
  access_time: string;
  complementary_meeting_room: string | null;
  image: string;
}

interface GuestSpace {
  type: string;
  capacity: string;
  commitment_periods: CommitmentPeriods;
  image: string;
}

interface LocationData {
  location: string;
  workspaces: Workspace[];
  guest_spaces: GuestSpace[];
}

const locations = productsData as unknown as LocationData[];

export default function ProductsClient() {
  const [activeLocation, setActiveLocation] = useState(locations[0].location);

  const currentLocationData = locations.find(l => l.location === activeLocation) || locations[0];

  const formatPeriodLabel = (key: string) => {
    return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getCommitmentLabels = (periods: CommitmentPeriods) => {
    return Object.entries(periods)
      .filter(([_, value]) => value !== null)
      .map(([key]) => formatPeriodLabel(key))
      .join(", ");
  };

  return (
    <div className="space-y-16 py-12 container mx-auto px-4 sm:px-6 lg:px-8">
      {/* ── Header ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#E0F7FA] via-[#F8F9FA] to-[#E0F2F1] px-6 py-16 sm:px-12 sm:py-24 text-center">
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[#006064]/10 blur-3xl opacity-50" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#4DB6AC]/15 blur-3xl opacity-50" />
        
        <div className="relative z-10 space-y-6">
          <FadeUp className="flex justify-center">
            <SectionLabel>
              <Briefcase className="h-3 w-3" /> Our Solutions
            </SectionLabel>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h1 className="text-4xl font-bold tracking-tight text-[#004D40] sm:text-6xl">
              Workspaces & Plans
            </h1>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="mx-auto max-w-2xl text-lg text-[#616161]">
              Explore our flexible workspace options across Ahmedabad. 
              Find the perfect environment to grow your business.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ── Location Selector ── */}
      <FadeUp delay={0.3}>
        <div className="flex flex-wrap justify-center gap-3">
          {locations.map((loc) => (
            <button
              key={loc.location}
              onClick={() => setActiveLocation(loc.location)}
              className={`rounded-full px-6 py-2 text-sm font-semibold transition-all ${
                activeLocation === loc.location
                  ? "bg-[#006064] text-white shadow-lg shadow-[#006064]/30"
                  : "bg-white text-[#616161] border border-[#CFD8DC] hover:border-[#006064] hover:text-[#006064]"
              }`}
            >
              {loc.location}
            </button>
          ))}
        </div>
      </FadeUp>

      {/* ── Workspaces Section ── */}
      <section className="space-y-10">
        <FadeUp className="space-y-3">
          <SectionLabel>
            <Layers className="h-3 w-3" /> Product Categories
          </SectionLabel>
          <h2 className="text-3xl font-semibold tracking-tight text-[#212121] sm:text-4xl text-center">
            Professional Workspaces
          </h2>
        </FadeUp>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="wait">
            {currentLocationData.workspaces.map((ws, index) => (
              <motion.article
                key={`${activeLocation}-workspace-${ws.type}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.1 }}
                className="group flex flex-col overflow-hidden rounded-3xl border border-[#CFD8DC] bg-white shadow-sm shadow-[#006064]/5 transition-all hover:shadow-xl hover:-translate-y-1"
              >
                <div className="relative h-56 overflow-hidden">
                  <Image
                    src={ws.image}
                    alt={ws.type}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    priority={index < 3}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <span className="absolute bottom-3 left-4 rounded-full bg-[#006064]/90 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                    {ws.type}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-6 space-y-5">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E0F7FA] text-[#006064]">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-[#757575] tracking-wider">Access</p>
                        <p className="text-sm font-semibold text-[#424242]">{ws.access_time}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E0F7FA] text-[#006064]">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-[#757575] tracking-wider">Plans</p>
                        <p className="text-sm font-semibold text-[#424242]">{getCommitmentLabels(ws.commitment_periods)}</p>
                      </div>
                    </div>

                    {ws.complementary_meeting_room && (
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E0F7FA] text-[#006064]">
                          <Coffee className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-[#757575] tracking-wider">Perks</p>
                          <p className="text-sm font-semibold text-[#424242] truncate">{ws.complementary_meeting_room} Meeting Room Access</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <Link 
                    href="/book-online"
                    className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#006064] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#007C91] hover:shadow-md active:scale-95"
                  >
                    Inquire Now <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* ── Guest Spaces Section ── */}
      <section className="space-y-10">
        <FadeUp className="space-y-3">
          <SectionLabel>
            <Users className="h-3 w-3" /> Shared Spaces
          </SectionLabel>
          <h2 className="text-3xl font-semibold tracking-tight text-[#212121] sm:text-4xl text-center">
            Meeting & Event Rooms
          </h2>
        </FadeUp>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="wait">
            {currentLocationData.guest_spaces.map((gs, index) => (
              <motion.article
                key={`${activeLocation}-guest-${gs.type}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.1 }}
                className="group flex flex-col overflow-hidden rounded-3xl border border-[#CFD8DC] bg-white shadow-sm shadow-[#006064]/5 transition-all hover:shadow-xl hover:-translate-y-1"
              >
                <div className="relative h-56 overflow-hidden">
                  <Image
                    src={gs.image}
                    alt={gs.type}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <div className="absolute top-3 right-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold text-[#006064] backdrop-blur-sm shadow-sm flex items-center gap-1.5">
                    <Users className="w-3 h-3" /> {gs.capacity}
                  </div>
                  <span className="absolute bottom-3 left-4 rounded-full bg-[#4DB6AC]/90 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                    {gs.type}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-6 space-y-5">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E0F7FA] text-[#006064]">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-[#757575] tracking-wider">Booking</p>
                        <p className="text-sm font-semibold text-[#424242]">{getCommitmentLabels(gs.commitment_periods)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E0F7FA] text-[#006064]">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-[#757575] tracking-wider">Features</p>
                        <p className="text-sm font-semibold text-[#424242]">Hi-Speed WiFi & Facilities</p>
                      </div>
                    </div>
                  </div>

                  <Link 
                    href="/book-online"
                    className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl border border-[#006064] px-4 py-2.5 text-sm font-bold text-[#006064] transition-all hover:bg-[#006064] hover:text-white active:scale-95"
                  >
                    Inquire Now <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <FadeUp>
        <section className="rounded-3xl bg-[#004D40] px-6 py-12 text-center text-white sm:px-12 sm:py-20">
          <div className="mx-auto max-w-2xl space-y-6">
            <h2 className="text-3xl font-bold sm:text-4xl text-white">Experience it in person</h2>
            <p className="text-[#B2DFDB]">
              Not sure which plan fits you best? Schedule a free tour to explore 
              all our workspaces and find your perfect spot at SSPACIA.
            </p>
            <Link 
              href="/book-online"
              className="inline-block rounded-full bg-[#006064] px-8 py-4 text-base font-bold text-white transition-all hover:bg-[#007C91] hover:scale-105 active:scale-95 shadow-lg shadow-[#00251A]/40"
            >
              Book a Free Tour
            </Link>
          </div>
        </section>
      </FadeUp>
    </div>
  );
}
