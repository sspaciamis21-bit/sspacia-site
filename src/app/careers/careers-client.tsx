"use client";

import React from "react";
import { FadeUp } from "@/components/ui/fade-up";
import { SectionLabel } from "@/components/ui/section-label";
import { 
  Users, 
  Rocket, 
  Heart, 
  Coffee, 
  MapPin, 
  Clock, 
  Briefcase, 
  ArrowRight,
  Sparkles,
  Zap,
  CheckCircle2
} from "lucide-react";
import { siteConfig } from "@/config/site";

const iconMap: Record<string, React.ReactNode> = {
  Users: <Users className="h-5 w-5" />,
  Rocket: <Rocket className="h-5 w-5" />,
  Clock: <Clock className="h-5 w-5" />,
  Coffee: <Coffee className="h-5 w-5" />,
};

export default function CareersClient() {
  const { careers } = siteConfig;
  return (
    <div className="space-y-24 py-12 container mx-auto px-4 sm:px-6 lg:px-8">
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden rounded-[3rem] bg-[#004D40] px-6 py-12 sm:px-12 sm:py-20 text-center text-white">
        {/* Background Visuals */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[#006064]/20 blur-3xl opacity-60" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#4DB6AC]/15 blur-3xl opacity-40" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] border border-white/5 rounded-full scale-150" />
        
        <div className="relative z-10 max-w-4xl mx-auto space-y-6">
          <FadeUp className="flex justify-center">
            <SectionLabel className="bg-white/10 text-white border-white/20 px-4 py-1.5">
              <Sparkles className="h-3 w-3" /> Join the Team
            </SectionLabel>
          </FadeUp> 
          <FadeUp delay={0.1}>
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl leading-tight">
              {careers.heading.split(' Ahmedabad')[0]} <br />
              <span className="text-[#4DB6AC]">Ahmedabad</span>
            </h1>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="mx-auto max-w-xl text-base text-[#B2DFDB] leading-relaxed">
              {careers.subheading}
            </p>
          </FadeUp>
          <FadeUp delay={0.3}>
            <div className="flex flex-wrap justify-center gap-3">
              <a href="#openings" className="rounded-full bg-white px-6 py-3 text-sm font-bold text-[#004D40] transition-all hover:bg-[#E0F2F1] hover:scale-105">
                View Openings
              </a>
              <a href={`mailto:${siteConfig.site.contact.careersEmail}`} className="rounded-full border border-white/30 bg-white/5 px-6 py-3 text-sm font-bold text-white backdrop-blur-md transition-all hover:bg-white/10">
                Contact Recruiting
              </a>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Culture Section ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-8">
          <FadeUp>
            <SectionLabel>
              <Heart className="h-3 w-3" /> Life at SSPACIA
            </SectionLabel>
            <h2 className="text-3xl font-bold tracking-tight text-[#212121] sm:text-5xl mt-4">
              Where your career <br /> finds a home
            </h2>
          </FadeUp>
          <FadeUp delay={0.1}>
            <p className="text-lg text-[#616161] leading-relaxed">
              We believe that an inspired team builds an inspired community. Our culture is built on 
              trust, empowerment, and a shared mission to redefine the professional landscape.
            </p>
          </FadeUp>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {careers.benefits.map((benefit: any, i: number) => (
              <FadeUp key={benefit.title} delay={0.2 + i * 0.1} className="p-6 rounded-2xl border border-[#CFD8DC] bg-white hover:border-[#006064] transition-colors group">
                <div className="h-10 w-10 rounded-xl bg-[#E0F7FA] text-[#006064] flex items-center justify-center mb-4 group-hover:bg-[#006064] group-hover:text-white transition-all">
                  {iconMap[benefit.icon]}
                </div>
                <h3 className="font-bold text-[#212121] mb-2">{benefit.title}</h3>
                <p className="text-sm text-[#757575] leading-relaxed">{benefit.description}</p>
              </FadeUp>
            ))}
          </div>
        </div>
        <FadeUp delay={0.4} className="relative aspect-square rounded-[3rem] overflow-hidden shadow-2xl">
          <img 
            src="https://static.wixstatic.com/media/38bf31_ab6cf1c9730341ca86013938519b8374~mv2.png/v1/fill/w_713,h_475,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/38bf31_ab6cf1c9730341ca86013938519b8374~mv2.png" 
            alt="Life at SSPACIA" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#004D40]/60 to-transparent" />
          <div className="absolute bottom-10 left-10 text-white space-y-2">
            <p className="text-sm font-bold uppercase tracking-widest text-[#4DB6AC]">Work is Life</p>
            <h3 className="text-3xl font-bold">Thrive where you belong</h3>
          </div>
        </FadeUp>
      </section>

      {/* ── Open Positions ── */}
      <section id="openings" className="space-y-12">
        <div className="text-center space-y-4">
          <FadeUp className="flex justify-center font-bold">
            <SectionLabel>
              <Briefcase className="h-3 w-3" /> Current Opportunities
            </SectionLabel>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2 className="text-3xl font-bold tracking-tight text-[#212121] sm:text-5xl leading-tight">
              Ready to start your <br /> next chapter?
            </h2>
          </FadeUp>
        </div>

        <div className="max-w-5xl mx-auto space-y-6">
          {careers.jobs.map((job: any, i: number) => (
            <FadeUp key={job.id} delay={0.2 + i * 0.1} className="group flex flex-col sm:flex-row items-center justify-between gap-6 p-8 rounded-3xl border border-[#CFD8DC] bg-white hover:border-[#006064] transition-all hover:shadow-xl hover:-translate-y-1">
              <div className="space-y-4 flex-1">
                <div className="flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F7FA] px-3 py-1 text-[11px] font-bold text-[#006064] uppercase tracking-wider">
                    <Zap className="h-3 w-3" /> {job.type}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5F5F5] px-3 py-1 text-[11px] font-bold text-[#616161] uppercase tracking-wider">
                    <MapPin className="h-3 w-3" /> {job.location}
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-[#212121] group-hover:text-[#006064] transition-colors">{job.title}</h3>
                  <p className="text-[#616161] mt-2 leading-relaxed">{job.description}</p>
                </div>
              </div>
              <a 
                href={`mailto:${siteConfig.site.contact.careersEmail}?subject=Job Application: ${job.title}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[#006064] px-8 py-4 text-sm font-bold text-white transition-all hover:bg-[#004D40] group-hover:shadow-lg active:scale-95"
              >
                Apply Now <ArrowRight className="h-4 w-4" />
              </a>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── Closing CTA ── */}
      <section className="relative overflow-hidden rounded-[3rem] bg-[#F8F9FA] border border-[#CFD8DC] p-8 sm:p-16 text-center">
        <div className="max-w-2xl mx-auto space-y-6 relative z-10">
          <FadeUp>
            <h2 className="text-2xl font-bold sm:text-4xl text-[#212121]">Don&apos;t see a fit?</h2>
            <p className="text-base text-[#616161] mt-4 leading-relaxed">
              We&apos;re always on the lookout for talented individuals. If you share our values, 
              send us your resume and tell us how you can make a difference.
            </p>
          </FadeUp>
          <FadeUp delay={0.2}>
            <a href={`mailto:${siteConfig.site.contact.careersEmail}`} className="text-[#006064] font-bold text-base hover:underline underline-offset-8 flex items-center justify-center gap-2">
              Send your Resume <ArrowRight className="h-4 w-4" />
            </a>
          </FadeUp>
        </div>
      </section>
    </div>
  );
}
