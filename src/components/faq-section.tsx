"use client";

import { useState } from "react";
import { siteConfig } from "@/config/site";

export function FaqSection() {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => setOpenId(openId === id ? null : id);

  return (
    <section className="space-y-6">
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight text-[#212121] sm:text-3xl">
          Frequently Asked Questions
        </h2>
        <p className="mx-auto max-w-2xl text-sm text-[#616161]">
          Everything you need to know about SSPACIA coworking spaces. Can&apos;t find an answer?{" "}
          <a href="/contact" className="font-medium text-[#006064] hover:underline">
            Contact our team.
          </a>
        </p>
      </div>

      <div className="mx-auto max-w-3xl divide-y divide-[#CFD8DC] rounded-2xl border border-[#CFD8DC] bg-white shadow-sm shadow-[#006064]/5 overflow-hidden">
        {siteConfig.faq.map((item) => {
          const isOpen = openId === item.id;
          return (
            <div key={item.id}>
              <button
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-[#E0F7FA]/40"
                onClick={() => toggle(item.id)}
                aria-expanded={isOpen}
              >
                <span className="text-sm font-semibold text-[#212121]">
                  {item.question}
                </span>
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#CFD8DC] text-[#006064] transition-transform duration-300 ${
                    isOpen ? "rotate-45 bg-[#E0F7FA]" : "bg-white"
                  }`}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <line x1="6" y1="1" x2="6" y2="11" />
                    <line x1="1" y1="6" x2="11" y2="6" />
                  </svg>
                </span>
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <p className="px-6 pb-5 text-sm leading-relaxed text-[#616161]">
                  {item.answer}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
