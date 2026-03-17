"use client";

import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "../config/site";
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

export default function HomeClient() {
  const { locations, features, blog } = siteConfig;

  return (
    <div className="space-y-24">
      {/* ── Hero ── */}
      <section className="relative left-1/2 -translate-x-1/2 w-screen">
        <Hero />
      </section>

      {/* ── LOCATIONS ── */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <FadeUp className="space-y-3">
          <SectionLabel>
            <MapPin className="h-3 w-3" /> Our Spaces
          </SectionLabel>
          <h2 className="text-3xl font-bold tracking-tight text-[#004D40] sm:text-4xl">
            Ahmedabad&apos;s premium coworking locations
          </h2>
          <p className="max-w-2xl text-base text-[#616161]">
            Choose from three thoughtfully designed spaces across the city, each
            offering its own character while keeping the same SSPACIA warmth and
            professionalism.
          </p>
        </FadeUp>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
          {locations.map((location, i) => (
            <FadeUp key={location.id} delay={i * 0.1}>
              <motion.article
                className="group flex flex-col h-full overflow-hidden rounded-[2rem] border border-[#CFD8DC] bg-white shadow-sm transition-all hover:shadow-xl hover:shadow-[#006064]/5"
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
              >
                <div className="relative h-56 overflow-hidden">
                  <Image
                    src={location.image.src}
                    alt={location.image.alt}
                    width={480}
                    height={320}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <span className="absolute bottom-4 left-5 rounded-full bg-white/90 backdrop-blur-md px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-[#006064]">
                    {location.name}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-4 p-6">
                  <p className="text-sm leading-relaxed text-[#616161] line-clamp-2">{location.description}</p>
                  <a
                    href={location.link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-auto inline-flex items-center gap-2 text-sm font-bold text-[#006064] transition-colors hover:text-[#004D40]"
                  >
                    Get directions <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              </motion.article>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-[#E0F7FA]/40 to-white py-20 sm:py-32">
        {/* Decorative elements */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-[#006064]/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-[#4DB6AC]/5 blur-3xl" />
        
        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <FadeUp className="space-y-4 text-center">
            <SectionLabel className="mx-auto">
              <Cpu className="h-3 w-3" /> Why SSPACIA
              </SectionLabel>
            <h2 className="text-4xl font-bold tracking-tight text-[#004D40] sm:text-6xl">
              {siteConfig.featuresSection.heading}
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-[#616161] leading-relaxed">
              {siteConfig.featuresSection.description}
            </p>
          </FadeUp>

          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature: any, i: number) => (
              <FadeUp key={feature.id} delay={i * 0.05}>
                <motion.div
                  className="group flex flex-col gap-5 rounded-[2rem] border border-[#CFD8DC]/60 bg-white p-8 shadow-sm transition-all hover:bg-white hover:border-[#006064]/30"
                  whileHover={{ y: -8, boxShadow: "0 30px 60px -12px rgba(0,96,100,0.15)" }}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E0F7FA] text-[#006064] shadow-inner shadow-[#006064]/5 transition-colors group-hover:bg-[#006064] group-hover:text-white">
                    {iconMap[feature.icon] ?? <span className="h-6 w-6" />}
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-[#004D40] text-lg">{feature.title}</h3>
                    <p className="text-sm leading-relaxed text-[#616161]">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── BLOG ── */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <FadeUp className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-4">
            <SectionLabel>
              <BookOpen className="h-3 w-3" /> Articles
            </SectionLabel>
            <h2 className="text-3xl font-bold tracking-tight text-[#004D40] sm:text-4xl">
              {blog.heading}
            </h2>
            <p className="max-w-xl text-base text-[#616161]">
              Learn more about coworking, community, and how SSPACIA can support
              your business growth.
            </p>
          </div>
          <Link
            href="/blog"
            className="group inline-flex shrink-0 items-center gap-2 rounded-full border-2 border-[#006064] bg-white px-6 py-3 text-sm font-bold text-[#006064] transition-all hover:bg-[#006064] hover:text-white"
          >
            All articles <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </FadeUp>

        <div className="grid gap-8 lg:grid-cols-2">
          {blog.posts.slice(0, 2).map((post, i) => (
            <FadeUp key={post.id} delay={i * 0.1}>
              <motion.a
                href={post.href}
                className="group flex flex-col overflow-hidden rounded-[2.5rem] border border-[#CFD8DC] bg-white shadow-sm transition-all hover:shadow-2xl hover:shadow-[#006064]/5"
                whileHover={{ y: -6 }}
              >
                <div className="relative h-64 overflow-hidden">
                  <Image
                    src={post.image.src}
                    alt={post.image.alt}
                    width={720}
                    height={400}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </div>
                <div className="flex flex-1 flex-col gap-4 p-8">
                  <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-[#9E9E9E]">
                    <span>{post.author}</span>
                    <span className="h-1 w-1 rounded-full bg-[#CFD8DC]" />
                    <span>{post.readTime}</span>
                    <span className="h-1 w-1 rounded-full bg-[#CFD8DC]" />
                    <span>
                      {new Date(post.date).toLocaleString("en-US", {
                        month: "short",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold leading-tight text-[#212121] transition group-hover:text-[#006064]">
                    {post.title}
                  </h3>
                  <p className="line-clamp-2 text-sm leading-relaxed text-[#616161]">
                    {post.excerpt}
                  </p>
                  <span className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-[#006064]">
                    Read article <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </span>
                </div>
              </motion.a>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8">
        <FaqSection />
      </section>
    </div>
  );
}
