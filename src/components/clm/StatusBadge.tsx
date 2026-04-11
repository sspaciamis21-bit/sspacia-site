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
      className="clm-status-badge"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size === "sm" ? 5 : 6,
        padding: size === "sm" ? "2px 8px" : "4px 10px",
        borderRadius: 20,
        fontSize: size === "sm" ? 10 : 11,
        fontWeight: 500,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        fontFamily: "var(--font-mono)",
        color: meta.color,
        background: meta.bg,
        border: `1px solid ${meta.border}`,
      }}
    >
      <span
        className="clm-status-dot"
        style={{
          width: size === "sm" ? 5 : 6,
          height: size === "sm" ? 5 : 6,
          borderRadius: "50%",
          background: meta.color,
          flexShrink: 0,
          boxShadow: isPulse ? `0 0 0 0 ${meta.color}` : undefined,
          animation: isPulse ? "statusPulse 1.5s infinite" : undefined,
        }}
      />
      {meta.label}
      <style jsx>{`
        @keyframes statusPulse {
          0% { box-shadow: 0 0 0 0 ${meta.color}66; }
          70% { box-shadow: 0 0 0 6px ${meta.color}00; }
          100% { box-shadow: 0 0 0 0 ${meta.color}00; }
        }
      `}</style>
    </span>
  );
}
