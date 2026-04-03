"use client";

import { siteConfig } from "@/config/site";
import { FadeUp } from "@/components/ui/fade-up";
import { CheckCircle2, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function AboutClient() {
  const { about } = siteConfig;

  return (
    <div className="space-y-24 py-24 pb-12 max-w-7xl mx-auto px-6 md:px-12">
      {/* ── Hero: The Digital Blueprint ── */}
      <section className="relative min-h-[60vh] flex items-center">
        <div className="relative z-10 w-full">
            <FadeUp className="space-y-10">
              <div className="flex items-center gap-4">
                <span className="h-[1px] w-12 bg-primary"></span>
                <span className="font-sans text-[10px] uppercase tracking-[0.6em] text-primary font-bold">
                  About {siteConfig.site.name}
                </span>
              </div>
              
              <h1 className="font-display text-4xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] text-on-surface max-w-4xl">
                The Digital <br />
                <span className="text-primary italic">Blueprint.</span>
              </h1>
              
              <div className="grid lg:grid-cols-2 gap-16 pt-8">
                <div className="space-y-8">
                  <p className="text-xl md:text-2xl leading-tight text-on-surface font-medium max-w-xl">
                    Beyond coworking, we compose spatial environments for your ambition.
                  </p>
                </div>
                <div className="flex items-start">
                  <p className="text-lg leading-relaxed text-tertiary font-light max-w-md border-l-2 border-primary/20 pl-8">
                    {about.shortDescription}
                  </p>
                </div>
              </div>
            </FadeUp>
        </div>
      </section>

      {/* ── Mission & Philosophy: Balanced Split ── */}
      <section className="relative">
        <div className="grid gap-16 md:grid-cols-2 lg:items-center">
          <div className="relative space-y-8">
             <FadeUp className="space-y-10">
                <div className="flex items-center gap-4">
                   <span className="h-[1px] w-8 bg-primary"></span>
                   <span className="font-sans text-[10px] uppercase tracking-[0.4em] text-primary font-black">Our Philosophy</span>
                </div>
                <h2 className="font-display text-4xl md:text-6xl font-bold tracking-tighter text-on-surface leading-tight">Architecting the <br/><span className="text-primary italic">Opportunity.</span></h2>
                <div className="space-y-6">
                   <p className="text-xl leading-relaxed text-on-surface font-light">
                     {about.missionStatement}
                   </p>
                   <p className="text-lg leading-relaxed text-tertiary font-light">
                     {about.fullDescription}
                   </p>
                </div>
             </FadeUp>
          </div>

          <div className="relative">
            <FadeUp delay={0.2} className="relative aspect-[4/5] md:aspect-[3/4] w-full overflow-hidden shadow-[0_40px_100px_rgba(0,105,111,0.1)] group rounded-sm">
              <Image
                src="/IMAGES_SSPACIA/MERCADO IMAGES/Reception.jpg"
                alt="SSPACIA Environment"
                fill
                className="object-cover transition-all duration-1000 transform group-hover:scale-105"
                priority
              />
              <div className="absolute inset-0 bg-primary/5 transition-opacity duration-700"></div>
            </FadeUp>
            
            {/* Contextual Overlay */}
            <div className="absolute -bottom-8 -left-8 bg-white p-8 md:p-12 max-w-xs shadow-2xl z-20 hidden md:block rounded-sm">
              <span className="text-[9px] font-sans uppercase tracking-[0.4em] text-primary font-black mb-4 block">Spatial Intent</span>
              <p className="text-base text-on-surface italic leading-relaxed">
                &ldquo;We don&apos;t just provide desks; we architect opportunities for growth.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── For The Modern Professional: Tonal Stack ── */}
      <section className="grid lg:grid-cols-12 gap-16 py-12">
        <div className="lg:col-span-4">
          <FadeUp className="sticky top-24 space-y-8">
            <h2 className="font-display text-5xl md:text-5xl font-bold tracking-tighter leading-none text-on-surface">
              Who we&apos;re <br />built for.
            </h2>
            <p className="text-lg text-tertiary font-light">
              Designing premium ecosystems for a diverse range of professionals.
            </p>
          </FadeUp>
        </div>
        
        <div className="lg:col-span-8 grid gap-8 sm:grid-cols-2">
          {about.targetAudience.map((audience, i) => (
            <FadeUp key={audience} delay={i * 0.1}>
              <div className="group relative bg-surface-container-low p-12 transition-all duration-500 hover:bg-surface-lowest hover:shadow-2xl hover:-translate-y-2 h-full cursor-default overflow-hidden">
                {/* Architectural Accent Dot */}
                <div className="absolute top-6 right-6 h-2 w-2 rounded-full bg-primary/20 transition-all group-hover:bg-primary"></div>
                
                <div className="space-y-6 relative z-10">
                  <div className="flex h-14 w-14 items-center justify-center bg-primary/5 text-primary transition-all duration-500 group-hover:bg-primary group-hover:text-white group-hover:rotate-[360deg]">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-sans uppercase tracking-[0.4em] text-tertiary group-hover:text-primary transition-colors block mb-2">Category 0{i + 1}</span>
                    <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-on-surface">{audience}</h3>
                  </div>
                </div>
                
                {/* Draft Line */}
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-primary scale-x-0 origin-left transition-transform duration-500 group-hover:scale-x-100"></div>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── Community Gallery: The Editorial Flow ── */}
      <section className="space-y-24">
        <FadeUp className="max-w-3xl space-y-8">
           <div className="flex items-center gap-4">
            <span className="h-[1px] w-8 bg-primary"></span>
            <span className="font-sans text-[10px] uppercase tracking-[0.4em] text-primary font-bold">The Network</span>
          </div>
          <h2 className="font-display text-5xl md:text-8xl font-bold tracking-tighter text-on-surface leading-none">Join the ecosystem.</h2>
          <p className="text-xl text-tertiary font-light leading-relaxed">
            Ahmedabad&apos;s most dynamic professional environment is built through intentional connection.
          </p>
        </FadeUp>
        
        <div className="grid gap-8 lg:grid-cols-3">
          {[
            { img: "/IMAGES_SSPACIA/PREMIER HOUSE/Reception.JPG", title: "Premier Facilities", vol: "01" },
            { img: "/IMAGES_SSPACIA/MERCADO IMAGES/Reception.jpg", title: "Dynamic Spaces", vol: "02" },
            { img: "/Pictures/Reception.jpeg", title: "Professional Support", vol: "03" }
          ].map((item, i) => (
            <FadeUp key={item.vol} delay={i * 0.15}>
              <div 
                className={`group relative overflow-hidden bg-surface-high transition-all duration-700 ${
                  i === 1 ? 'lg:-translate-y-16' : i === 2 ? 'lg:-translate-y-32' : ''
                }`}
              >
                <div className="aspect-[4/5] relative overflow-hidden">
                  <Image 
                    src={item.img} 
                    alt={item.title} 
                    fill 
                    className="object-cover transition-all duration-1000 group-hover:scale-110 group-hover:rotate-1" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-on-surface via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
                </div>
                <div className="absolute bottom-8 left-8 right-8">
                  <span className="text-[10px] font-sans uppercase tracking-[0.4em] text-primary font-bold mb-4 block">Volume / {item.vol}</span>
                  <p className="font-display text-3xl font-bold text-white leading-tight transition-transform group-hover:-translate-y-2">{item.title}</p>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── Call to Action: The Liquid Void ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-surface-container-high/30 -z-10 rotate-1 scale-110"></div>
        <FadeUp>
          <div className="relative bg-surface-lowest p-12 md:p-24 text-center overflow-hidden border-t-4 border-primary group">
            <h2 className="font-display text-5xl md:text-7xl font-bold tracking-tighter text-on-surface mb-12 relative z-10 leading-none">
              Ready to redefine <br />your workspace?
            </h2>
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 relative z-10">
              <Link 
                href="/contact"
                className="liquid-hover inline-flex items-center gap-6 bg-primary px-16 py-6 text-[10px] font-bold uppercase tracking-[0.4em] text-white transition-all hover:bg-primary-container shadow-2xl hover:scale-105 active:scale-95"
              >
                Get in Touch
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-2" />
              </Link>
              <Link 
                href="/products"
                className="inline-flex items-center gap-6 px-16 py-6 text-[10px] font-bold uppercase tracking-[0.4em] text-on-surface border border-outline-variant/30 transition-all hover:bg-surface-container-low hover:border-primary"
              >
                Explore Plans
              </Link>
            </div>
            
            {/* Decorative Architectural Dot */}
            <div className="absolute top-12 right-12 h-4 w-4 bg-primary/10 rounded-full animate-pulse"></div>
          </div>
        </FadeUp>
      </section>
    </div>
  );
}
