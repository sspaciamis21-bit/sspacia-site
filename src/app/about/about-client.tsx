"use client";

import { siteConfig } from "../../config/site";
import { FadeUp } from "../../components/ui/fade-up";
import { SectionLabel } from "../../components/ui/section-label";
import { Info, Target, Users as UsersIcon, CheckCircle2 } from "lucide-react";
import Image from "next/image";

export default function AboutClient() {
  const { about } = siteConfig;

  return (
    <div className="space-y-24 py-12 container mx-auto px-4 sm:px-6 lg:px-8">
      {/* ── Header ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#E0F7FA] via-[#F8F9FA] to-[#E0F2F1] px-6 py-16 sm:px-12 sm:py-24">
        {/* Decorative blur orbs */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[#006064]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-[#4DB6AC]/15 blur-3xl" />
        
        <div className="relative z-10 max-w-3xl">
          <FadeUp className="space-y-6">
            <SectionLabel>
              <Info className="h-3 w-3" /> About {siteConfig.site.name}
            </SectionLabel>
            <h1 className="text-4xl font-bold tracking-tight text-[#004D40] sm:text-6xl">
              {about.heading}
            </h1>
            <p className="text-lg leading-relaxed text-[#616161] sm:text-xl">
              {about.shortDescription}
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ── Mission & Vision ── */}
      <section className="grid gap-16 lg:grid-cols-2 lg:items-center">
        <FadeUp className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold tracking-tight text-[#212121]">Our Mission</h2>
            <div className="h-1 w-20 rounded-full bg-[#006064]" />
          </div>
          <div className="space-y-6 text-[#424242]">
            <p className="text-lg leading-relaxed italic border-l-4 border-[#006064] pl-6 py-2 bg-[#E0F7FA]/30 rounded-r-xl">
              "{about.missionStatement}"
            </p>
            <p className="text-base leading-relaxed">
              {about.fullDescription}
            </p>
          </div>
        </FadeUp>

        <FadeUp delay={0.2} className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-2xl">
           <Image
            src="/IMAGES_SSPACIA/MERCADO IMAGES/Reception.jpg"
            alt="SSPACIA Coworking Space"
            fill
            className="object-cover"
            priority
          />
        </FadeUp>
      </section>

      {/* ── Who we're built for ── */}
      <section className="rounded-3xl bg-[#004D40] px-6 py-16 text-white sm:px-12 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[1fr,1.5fr]">
          <FadeUp className="space-y-6">
            <SectionLabel className="border-white/20 bg-white/10 text-white">
              <Target className="h-3 w-3" /> Our Focus
            </SectionLabel>
            <h2 className="text-3xl font-semibold sm:text-4xl">Who we&apos;re built for</h2>
            <p className="text-[#B2DFDB]">
              We provide a nurturing environment for a diverse range of professionals, 
              ensuring everyone has the space they need to thrive.
            </p>
          </FadeUp>

          <div className="grid gap-4 sm:grid-cols-2">
            {about.targetAudience.map((audience, i) => (
              <FadeUp key={audience} delay={i * 0.1}>
                <div className="flex items-center gap-4 rounded-2xl bg-white/5 p-4 transition-colors hover:bg-white/10 group">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#006064] text-white group-hover:bg-[#007C91] transition-colors">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <span className="text-lg font-medium text-white/90">{audience}</span>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Community ── */}
      <section className="text-center space-y-12">
        <FadeUp className="space-y-4">
          <SectionLabel>
            <UsersIcon className="h-3 w-3" /> Community
          </SectionLabel>
          <h2 className="text-3xl font-semibold text-[#212121]">Join our growing network</h2>
          <p className="mx-auto max-w-2xl text-[#616161]">
            Experience more than just a desk. Become part of Ahmedabad's most dynamic professional ecosystem.
          </p>
        </FadeUp>
        
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <FadeUp delay={0.1}>
            <div className="group relative h-64 overflow-hidden rounded-2xl shadow-lg">
              <Image src="/IMAGES_SSPACIA/PREMIER HOUSE/ESL04996.JPG" alt="SSPACIA Workspace" fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <p className="absolute bottom-4 left-4 text-left font-semibold text-white">Premier Facilities</p>
            </div>
          </FadeUp>
          <FadeUp delay={0.2}>
             <div className="group relative h-64 overflow-hidden rounded-2xl shadow-lg">
              <Image src="/IMAGES_SSPACIA/MERCADO IMAGES/Reception.jpg" alt="SSPACIA Community" fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <p className="absolute bottom-4 left-4 text-left font-semibold text-white">Dynamic Spaces</p>
            </div>
          </FadeUp>
          <FadeUp delay={0.3}>
             <div className="group relative h-64 overflow-hidden rounded-2xl shadow-lg">
              <Image src="/Pictures/Reception.jpeg" alt="SSPACIA Quality" fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <p className="absolute bottom-4 left-4 text-left font-semibold text-white">Professional Support</p>
            </div>
          </FadeUp>
        </div>
      </section>
    </div>
  );
}
