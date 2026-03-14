"use client";

import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "../config/site";
import { NewsletterForm } from "../components/newsletter-form";
import { Hero } from "../components/ui/hero-with-group-of-images-text-and-two-buttons";
import { FaqSection } from "../components/faq-section";
import { motion } from "motion/react";
import {
  MapPin, Clock, Users, Coffee,
  Home as HomeIcon, Cpu, Tag, Wifi,
  ArrowUpRight, BookOpen,
} from "lucide-react";
import { FadeUp } from "../components/ui/fade-up";
import { SectionLabel } from "../components/ui/section-label";

const iconMap: Record<string, React.ReactNode> = {
  MapPin: <MapPin className="h-5 w-5" />,
  Clock: <Clock className="h-5 w-5" />,
  Users: <Users className="h-5 w-5" />,
  Coffee: <Coffee className="h-5 w-5" />,
  Home: <HomeIcon className="h-5 w-5" />,
  Cpu: <Cpu className="h-5 w-5" />,
  Tag: <Tag className="h-5 w-5" />,
  Wifi: <Wifi className="h-5 w-5" />,
};


export default function Home() {
  const { locations, features, blog, newsletter } = siteConfig;

  return (
    <div className="space-y-24">
      {/* ── Hero — full viewport width breakout ── */}
      <section className="relative left-1/2 -translate-x-1/2 w-screen">
        <Hero />
      </section>

      {/* ══════════════════════════════════════
          LOCATIONS
      ══════════════════════════════════════ */}
      <section className="space-y-10">
        <FadeUp className="space-y-3">
          <SectionLabel>
            <MapPin className="h-3 w-3" /> Our Spaces
          </SectionLabel>
          <h2 className="text-3xl font-semibold tracking-tight text-[#212121] sm:text-4xl">
            Ahmedabad&apos;s premium coworking locations
          </h2>
          <p className="max-w-2xl text-[#616161]">
            Choose from three thoughtfully designed spaces across the city, each
            offering its own character while keeping the same SSPACIA warmth and
            professionalism.
          </p>
        </FadeUp>

        <div className="grid gap-6 md:grid-cols-3">
          {locations.map((location, i) => (
            <FadeUp key={location.id} delay={i * 0.1}>
              <motion.article
                className="group flex flex-col overflow-hidden rounded-3xl border border-[#CFD8DC] bg-white shadow-sm shadow-[#006064]/10 transition-shadow hover:shadow-xl"
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
              >
                <div className="relative h-52 overflow-hidden">
                  <Image
                    src={location.image.src}
                    alt={location.image.alt}
                    width={480}
                    height={320}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <span className="absolute bottom-3 left-4 rounded-full bg-white/90 px-3 py-0.5 text-[11px] font-semibold text-[#006064]">
                    {location.name}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-4 p-5">
                  <p className="text-sm text-[#616161]">{location.description}</p>
                  <a
                    href={location.link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-[#006064] hover:text-[#004D40]"
                  >
                    Get directions <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              </motion.article>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════
          FEATURES
      ══════════════════════════════════════ */}
      <section className="relative left-1/2 -translate-x-1/2 w-screen space-y-10 rounded-3xl bg-[#E0F7FA] px-50 py-12 sm:px-50 sm:py-16">
        <FadeUp className="space-y-3 text-center">
          <SectionLabel>
            <Cpu className="h-3 w-3" /> Why SSPACIA
          </SectionLabel>
          <h2 className="text-3xl font-semibold tracking-tight text-[#212121] sm:text-4xl">
            {siteConfig.featuresSection.heading}
          </h2>
          <p className="mx-auto max-w-2xl text-[#616161]">
            {siteConfig.featuresSection.description}
          </p>
        </FadeUp>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => (
            <FadeUp key={feature.id} delay={i * 0.07}>
              <motion.div
                className="flex flex-col gap-4 rounded-2xl border border-[#CFD8DC]/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm"
                whileHover={{ y: -4, boxShadow: "0 12px 30px -8px rgba(0,96,100,0.15)" }}
                transition={{ type: "spring", stiffness: 320, damping: 24 }}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E0F7FA] text-[#006064]">
                  {iconMap[feature.icon] ?? <span className="h-5 w-5" />}
                </span>
                <div>
                  <p className="font-semibold text-[#212121]">{feature.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#616161]">
                    Designed to support focused work, warm hospitality, and
                    professional presence every day.
                  </p>
                </div>
              </motion.div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════
          BLOG
      ══════════════════════════════════════ */}
      <section className="space-y-10">
        <FadeUp className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <SectionLabel>
              <BookOpen className="h-3 w-3" /> Articles
            </SectionLabel>
            <h2 className="text-3xl font-semibold tracking-tight text-[#212121] sm:text-4xl">
              {blog.heading}
            </h2>
            <p className="max-w-xl text-[#616161]">
              Learn more about coworking, community, and how SSPACIA can support
              your business growth.
            </p>
          </div>
          <Link
            href="/blog"
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#006064] px-4 py-2 text-sm font-semibold text-[#006064] transition hover:bg-[#E0F7FA]"
          >
            All articles <ArrowUpRight className="h-4 w-4" />
          </Link>
        </FadeUp>

        <div className="grid gap-8 md:grid-cols-2">
          {blog.posts.map((post, i) => (
            <FadeUp key={post.id} delay={i * 0.12}>
              <motion.a
                href={post.href}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col overflow-hidden rounded-3xl border border-[#CFD8DC] bg-white shadow-sm shadow-[#006064]/5"
                whileHover={{ y: -6, boxShadow: "0 20px 40px -12px rgba(0,96,100,0.2)" }}
                transition={{ type: "spring", stiffness: 280, damping: 22 }}
              >
                <div className="relative h-52 overflow-hidden">
                  <Image
                    src={post.image.src}
                    alt={post.image.alt}
                    width={720}
                    height={400}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                </div>
                <div className="flex flex-1 flex-col gap-3 p-6">
                  <div className="flex items-center gap-3 text-[11px] uppercase tracking-widest text-[#757575]">
                    <span>{post.author}</span>
                    <span className="h-[1px] w-5 bg-[#CFD8DC]" />
                    <span>{post.readTime}</span>
                    <span className="h-[1px] w-5 bg-[#CFD8DC]" />
                    <span>{new Date(post.date).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
                  </div>
                  <h3 className="text-lg font-semibold leading-snug text-[#212121] transition group-hover:text-[#006064]">
                    {post.title}
                  </h3>
                  <p className="line-clamp-2 text-sm leading-relaxed text-[#616161]">
                    {post.excerpt}
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[#006064]">
                    Read article <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </div>
              </motion.a>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <FaqSection />

      {/* ── Newsletter ── */}
      <FadeUp>
        <section className="rounded-3xl border border-[#B2EBF2] bg-gradient-to-r from-[#E0F7FA] via-[#E0F2F1] to-[#E0F7FA] px-8 py-12 sm:px-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-[#004D40] sm:text-3xl">
                {newsletter.heading}
              </h2>
              <p className="max-w-xl text-sm text-[#006064]">
                Get updates about new spaces, community events, and coworking
                insights straight to your inbox.
              </p>
            </div>
            <NewsletterForm newsletter={newsletter} />
          </div>
        </section>
      </FadeUp>
    </div>
  );
}
