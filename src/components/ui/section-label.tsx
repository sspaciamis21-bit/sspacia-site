import React from "react";

export function SectionLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-[#006064]/25 bg-[#E0F7FA] px-3 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-[#006064] ${className}`}>
      {children}
    </span>
  );
}
