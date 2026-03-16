"use client";

import { siteConfig } from "../../config/site";
import Image from "next/image";
import { FadeUp } from "../../components/ui/fade-up";
import { SectionLabel } from "../../components/ui/section-label";
import { BookOpen, Calendar, Clock, ArrowRight, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function BlogClient() {
  const { blog } = siteConfig;

  return (
    <div className="space-y-24 py-12 container mx-auto px-4 sm:px-6 lg:px-8">
      {/* ── Header ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#E0F7FA] via-[#F8F9FA] to-[#E0F2F1] px-6 py-16 sm:px-12 sm:py-24">
        {/* Decorative blur orbs */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[#006064]/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#4DB6AC]/15 blur-3xl" />
        
        <div className="relative z-10 text-center space-y-6">
          <FadeUp className="flex justify-center">
            <SectionLabel>
              <BookOpen className="h-3 w-3" /> Our Insights
            </SectionLabel>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h1 className="text-4xl font-bold tracking-tight text-[#004D40] sm:text-6xl">
              {blog.heading}
            </h1>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="mx-auto max-w-2xl text-lg text-[#616161]">
              Explore the latest trends in workspaces, productivity tips, 
              and community stories from Ahmedabad&apos;s leading coworking space.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ── Blog Grid ── */}
      <section className="space-y-6">
        <div className="sr-only">
          <h2>Latest Blog Posts</h2>
        </div>
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          {blog.posts.map((post, i) => (
            <FadeUp key={post.id} delay={i * 0.1}>
              <Link
                href={post.href}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col overflow-hidden rounded-3xl border border-[#CFD8DC] bg-white shadow-sm shadow-[#006064]/5 transition-all duration-300 hover:-translate-y-2 hover:border-[#006064] hover:shadow-2xl"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden">
                  <Image
                    src={post.image.src}
                    alt={post.image.alt}
                    width={800}
                    height={500}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                    priority={i < 3}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 transition-opacity group-hover:opacity-80" />
                  
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(post.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider">
                      <Clock className="h-3 w-3" />
                      <span>{post.readTime}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-1 flex-col justify-between p-7 pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#006064]">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span>{post.author}</span>
                    </div>
                    <h3 className="line-clamp-2 text-xl font-bold leading-tight text-[#212121] transition group-hover:text-[#006064]">
                      {post.title}
                    </h3>
                    <p className="line-clamp-3 text-sm leading-relaxed text-[#616161]">
                      {post.excerpt}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-[#CFD8DC] pt-4">
                    <span className="text-sm font-bold text-[#006064]">
                      Read Now
                    </span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E0F7FA] text-[#006064] transition-all group-hover:bg-[#006064] group-hover:text-white">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </Link>
            </FadeUp>
          ))}
        </div>
      </section>
    </div>
  );
}
