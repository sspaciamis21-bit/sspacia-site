"use client";

import { useState } from "react";
import { siteConfig } from "@/config/site";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, ArrowRight } from "lucide-react";
import { FadeUp } from "./ui/fade-up";

export function FaqSection() {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => setOpenId(openId === id ? null : id);

  return (
    <div className="space-y-24 py-12">
      {/* ── Header: Asymmetrical Intro ── */}
      <div className="grid lg:grid-cols-12 gap-16 items-end">
        <div className="lg:col-span-12 xl:col-span-11">
           <FadeUp className="space-y-10">
              <div className="flex items-center gap-4">
                <span className="h-[1px] w-12 bg-primary"></span>
                <span className="font-sans text-[10px] uppercase tracking-[0.6em] text-primary font-bold">
                  Support Engine
                </span>
              </div>
              
              <div className="grid lg:grid-cols-2 gap-12 lg:items-end">
                <h2 className="font-display text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] text-on-surface">
                  Common <br />
                  <span className="text-primary italic">Inquiries.</span>
                </h2>
                <div className="space-y-6">
                  <p className="text-lg leading-relaxed text-tertiary font-light max-w-md border-l-2 border-primary/20 pl-8">
                    Everything you need to know about Ahmedabad&apos;s most dynamic workspace ecosystem. Can&apos;t find an answer? Connect with our spatial curators.
                  </p>
                  <a href="/contact" className="inline-flex items-center gap-4 group text-[10px] font-black uppercase tracking-[0.4em] text-primary ml-8">
                    Contact Relations
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-2" />
                  </a>
                </div>
              </div>
           </FadeUp>
        </div>
      </div>

      {/* ── Accordion: Architectural Stack ── */}
      <div className="max-w-4xl mx-auto w-full">
        <div className="divide-y divide-outline-variant/10 border-t border-b border-outline-variant/10">
          {siteConfig.faq.map((item, i) => {
            const isOpen = openId === item.id;
            return (
              <FadeUp key={item.id} delay={i * 0.05}>
                <div className="group">
                  <button
                    className="flex w-full items-center justify-between gap-8 py-8 text-left transition-all"
                    onClick={() => toggle(item.id)}
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center gap-8">
                       <span className="font-sans text-[10px] font-black text-primary/30 group-hover:text-primary transition-colors">0{i + 1}</span>
                       <span className={`text-xl md:text-2xl font-display font-bold tracking-tight transition-colors ${isOpen ? 'text-primary' : 'text-on-surface group-hover:text-primary'}`}>
                         {item.question}
                       </span>
                    </div>
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-none border border-outline-variant/20 transition-all duration-300 ${isOpen ? 'bg-primary border-primary rotate-90 text-white' : 'bg-transparent text-primary group-hover:border-primary'}`}>
                      {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </div>
                  </button>
                  
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="pb-8 pl-16 max-w-2xl">
                          <p className="text-lg leading-relaxed text-tertiary font-light">
                            {item.answer}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FadeUp>
            );
          })}
        </div>
      </div>
    </div>
  );
}
