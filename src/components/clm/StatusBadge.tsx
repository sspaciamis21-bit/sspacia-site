"use client";

import { STATUS_META } from "@/lib/clm/transitions";
import type { ContractStatusName } from "@/types/clm";

interface Props {
  status: ContractStatusName;
  size?: "sm" | "md";
  pulse?: boolean;
}

export default function StatusBadge({ status, size = "md", pulse = false }: Props) {
  const meta = STATUS_META[status];
  if (!meta) return null;
  
  const isPulse = pulse && status === "PENDING_SIGN";

  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 border font-bold uppercase tracking-widest text-[9px]"
      style={{
        color: meta.color,
        backgroundColor: `${meta.color}08`,
        borderColor: `${meta.color}33`,
      }}
    >
      <span
        className={`w-1.5 h-1.5 shrink-0 ${isPulse ? 'animate-pulse' : ''}`}
        style={{
          backgroundColor: meta.color,
        }}
      />
      {meta.label}
    </span>
  );
}
