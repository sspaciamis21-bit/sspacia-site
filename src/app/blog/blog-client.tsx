"use client";

import { siteConfig } from "@/config/site";
import Image from "next/image";
import { FadeUp } from "@/components/ui/fade-up";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function BlogClient() {
  const { blog } = siteConfig;

  return (
    <div className="space-y-24 py-24 pb-12 max-w-7xl mx-auto px-6 md:px-12 font-sans">
      {/* ── Hero: The Journal ── */}
      <section className="relative min-h-[50vh] flex items-center">
        <div className="relative z-10 w-full">
            <FadeUp className="space-y-10">
              <div className="flex items-center gap-4">
                <span className="h-[1px] w-12 bg-primary"></span>
                <span className="font-sans text-[10px] uppercase tracking-[0.6em] text-primary font-bold">
                  Shared Intelligence
                </span>
              </div>
              
              <h1 className="font-display text-5xl md:text-8xl font-black tracking-tighter leading-[0.9] text-on-surface max-w-4xl">
                The <br />
                <span className="text-primary italic">Journal.</span>
              </h1>
              
              <div className="grid lg:grid-cols-2 gap-16 pt-8">
                <p className="text-xl md:text-2xl leading-tight text-on-surface font-medium max-w-xl">
                  Documenting the evolution of workspace culture and collaborative success.
                </p>
                <div className="flex items-start">
                  <p className="text-lg leading-relaxed text-tertiary font-light max-w-md border-l-2 border-primary/20 pl-8">
                    {blog.heading}. Explore Ahmedabad&apos;s leading insights into productivity and architectural design.
                  </p>
                </div>
              </div>
            </FadeUp>
        </div>
      </section>

      {/* ── Featured Flow: Modular Grid ── */}
      <section className="relative">
        <div className="space-y-16">
          <FadeUp className="max-w-3xl space-y-6">
            <div className="flex items-center gap-4">
              <span className="h-[1px] w-8 bg-primary"></span>
              <span className="font-sans text-[10px] uppercase tracking-[0.4em] text-primary font-bold">Curated Content</span>
            </div>
            <h2 className="font-display text-4xl md:text-6xl font-bold tracking-tighter text-on-surface leading-tight">Latest Insights.</h2>
          </FadeUp>

          <div className="grid gap-16 lg:grid-cols-2">
            {blog.posts.map((post, i) => (
              <FadeUp key={post.id} delay={i * 0.1}>
                <Link href={post.href} className="group block space-y-6">
                  <div className="relative aspect-[16/10] overflow-hidden bg-white shadow-[0_40px_100px_rgba(0,105,111,0.06)] border border-outline-variant/10 rounded-sm">
                      <Image
                          src={post.image.src}
                          alt={post.image.alt}
                          fill
                          className="object-cover transition-all duration-1000 transform group-hover:scale-105 group-hover:rotate-1 grayscale group-hover:grayscale-0"
                          priority={i < 2}
                      />
                      <div className="absolute inset-0 bg-primary/5 transition-opacity duration-700"></div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-6 text-[9px] font-black uppercase tracking-[0.4em] text-primary">
                      <span className="flex items-center gap-2">
                         <Calendar className="h-3.5 w-3.5" />
                         {new Date(post.date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-2">
                         <Clock className="h-3.5 w-3.5" />
                         {post.readTime}
                      </span>
                    </div>
                    
                    <h3 className="font-display text-2xl md:text-3xl font-bold tracking-tighter text-on-surface group-hover:text-primary transition-colors leading-tight">
                      {post.title}
                    </h3>
                    
                    <p className="text-base text-tertiary font-light leading-relaxed line-clamp-2">
                      {post.excerpt}
                    </p>
                    
                    <div className="flex items-center gap-4 pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-on-surface group-hover:text-primary transition-colors">Read Article</span>
                      <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-2" />
                    </div>
                  </div>
                </Link>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA: Contribution ── */}
      <section className="relative overflow-hidden py-12">
        <FadeUp>
          <div className="relative bg-white p-10 md:p-20 text-left border border-outline-variant/10 shadow-[0_40px_100px_rgba(0,105,111,0.06)] group rounded-sm">
            <div className="grid md:grid-cols-2 gap-12 items-center">
               <div className="space-y-6">
                  <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tighter text-on-surface leading-tight">
                    Become part of <br />the <span className="text-primary italic">discourse.</span>
                  </h2>
                  <p className="text-lg text-tertiary font-light leading-relaxed">
                    Ahmedabad&apos;s most influential professionals share their journeys within our ecosystem.
                  </p>
               </div>
               <div className="flex justify-start md:justify-end">
                  <Link 
                    href="/contact"
                    className="inline-flex items-center gap-6 bg-primary px-12 py-5 text-[10px] font-bold uppercase tracking-[0.4em] text-white transition-all hover:bg-primary-container shadow-xl rounded-sm active:scale-95"
                  >
                    Collaborate with Us
                    <ArrowRight className="w-4 h-4" />
                  </Link>
               </div>
            </div>
          </div>
        </FadeUp>
      </section>
    </div>
  );
}
