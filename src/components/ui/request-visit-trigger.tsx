"use client";

import React, { useState } from "react";
import { Calendar } from "lucide-react";
import { BookTourModal } from "./book-tour-modal";
import { useAuth } from "@/context/AuthContext";

export function RequestVisitTrigger() {
  const [isOpen, setIsOpen] = useState(false);
  const { isLoggedIn } = useAuth();

  // Hide floating Request a Visit trigger for logged-in / registered users
  if (isLoggedIn) {
    return null;
  }

  return (
    <>
      {/* ── FLOATING RIGHT EDGE VERTICAL TAB (AWFIS STYLE) ── */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-[990]">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-red-600 hover:bg-red-700 text-white py-4 px-2.5 shadow-2xl flex items-center justify-center transition-all hover:pr-4 border-l border-y border-red-500 rounded-l-md font-sans text-xs font-black uppercase tracking-[0.2em] [writing-mode:vertical-rl] rotate-180 gap-2 cursor-pointer group"
          title="Book a Tour / Request a Visit"
        >
          <Calendar className="w-4 h-4 rotate-180 text-amber-300 group-hover:scale-110 transition-transform" />
          <span>REQUEST A VISIT</span>
        </button>
      </div>

      <BookTourModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
