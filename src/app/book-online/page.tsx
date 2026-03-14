"use client";

import { siteConfig } from "../../config/site";
import Link from "next/link";
import { BookOnlineForm } from "../../components/book-online-form";
import { FadeUp } from "../../components/ui/fade-up";
import { SectionLabel } from "../../components/ui/section-label";
import { CalendarCheck, ShieldCheck, Mail, ArrowRight, CheckCircle2 } from "lucide-react";

export default function BookOnlinePage() {
  return (
    <div className="space-y-24 py-12">
      {/* ── Header ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#E0F7FA] via-[#F8F9FA] to-[#E0F2F1] px-6 py-16 sm:px-12 sm:py-24 text-center">
        {/* Decorative blur orbs */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[#006064]/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#4DB6AC]/15 blur-3xl" />
        
        <div className="relative z-10 space-y-6">
          <FadeUp className="flex justify-center">
            <SectionLabel>
              <CalendarCheck className="h-3 w-3" /> Booking Request
            </SectionLabel>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h1 className="text-4xl font-bold tracking-tight text-[#004D40] sm:text-6xl">
              Reserve Your Space
            </h1>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="mx-auto max-w-2xl text-lg text-[#616161]">
              Share your details and preferred location, and our team will get in
              touch to confirm availability, pricing, and the best plan for your
              work style.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ── Main Booking Section ── */}
      <div className="grid gap-16 lg:grid-cols-[1.2fr,0.8fr]">
        <FadeUp>
          <div className="rounded-3xl border border-[#CFD8DC] bg-white p-8 shadow-2xl shadow-[#006064]/5 lg:p-12">
             <h2 className="mb-8 text-2xl font-bold text-[#212121] flex items-center gap-3">
               Booking Details
               <div className="h-px flex-1 bg-[#CFD8DC]" />
             </h2>
             <BookOnlineForm />
          </div>
        </FadeUp>

        <div className="space-y-10">
          <FadeUp delay={0.2} className="space-y-8 rounded-3xl border border-[#CFD8DC] bg-[#F8F9FA] p-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-[#212121]">
                Booking Support
              </h2>
              <p className="text-[#616161]">
                Need help choosing the right plan? Our experts are here to guide you through our various membership options.
              </p>
            </div>
            
            <Link
              href={`mailto:${siteConfig.site.contact.email}`}
              className="group flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-[#006064] bg-white px-6 py-4 text-base font-bold text-[#006064] transition-all hover:bg-[#006064] hover:text-white"
            >
              <Mail className="h-5 w-5" />
              {siteConfig.site.contact.email}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <div className="space-y-6 pt-6 border-t border-[#CFD8DC]">
              <h3 className="font-bold text-[#212121] flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#006064]" />
                Our Commitment
              </h3>
              <div className="space-y-4">
                {[
                  "Rapid response within 4 business hours",
                  "Personalized walkthrough of your chosen space",
                  "No-commitment initial consultation",
                  "Flexible start dates for all memberships"
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#006064]" />
                    <span className="text-sm text-[#424242]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>

          <FadeUp delay={0.4} className="rounded-3xl bg-[#004D40] p-8 text-white shadow-xl shadow-[#00251A]/20">
            <h3 className="text-xl font-bold mb-4">Why Book Early?</h3>
            <p className="text-[#B2DFDB] text-sm leading-relaxed mb-6">
              Our premium cabins and dedicated desks at high-demand locations like Premier House often fill up quickly. 
              Secure your spot today to ensure the best workspace for your team.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white/90">
               <span className="h-2 w-2 rounded-full bg-[#4DB6AC] animate-pulse" />
               Current active community: 450+ Professionals
            </div>
          </FadeUp>
        </div>
      </div>
    </div>
  );
}
