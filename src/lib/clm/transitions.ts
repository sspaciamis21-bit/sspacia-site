import type { ContractStatusName } from "@/types/clm";

// Mirror of the server-side transitions — used client-side to disable invalid actions
export const CONTRACT_TRANSITIONS: Record<ContractStatusName, ContractStatusName[]> = {
  REQUESTED:    ["DRAFT"],
  DRAFT:        ["SENT", "TERMINATED"],
  SENT:         ["NEGOTIATION", "PENDING_SIGN", "TERMINATED"],
  NEGOTIATION:  ["SENT", "TERMINATED"],
  PENDING_SIGN: ["SIGNED", "TERMINATED"],
  SIGNED:       ["EXPIRED", "TERMINATED"],
  EXPIRED:      [],
  TERMINATED:   [],
};

export function canTransition(from: ContractStatusName, to: ContractStatusName): boolean {
  return (CONTRACT_TRANSITIONS[from] ?? []).includes(to);
}

export const STATUS_META: Record<ContractStatusName, { label: string; color: string; bg: string; border: string }> = {
  REQUESTED:    { label: "Requested",         color: "#9CA3AF", bg: "rgba(156,163,175,0.1)",  border: "rgba(156,163,175,0.3)" },
  DRAFT:        { label: "Draft",             color: "#F59E0B", bg: "rgba(245,158,11,0.1)",   border: "rgba(245,158,11,0.3)"  },
  SENT:         { label: "Sent for Review",   color: "#3B82F6", bg: "rgba(59,130,246,0.1)",   border: "rgba(59,130,246,0.3)"  },
  NEGOTIATION:  { label: "In Negotiation",    color: "#F97316", bg: "rgba(249,115,22,0.1)",   border: "rgba(249,115,22,0.3)"  },
  PENDING_SIGN: { label: "Pending Signature", color: "#8B5CF6", bg: "rgba(139,92,246,0.1)",   border: "rgba(139,92,246,0.3)"  },
  SIGNED:       { label: "Signed",            color: "#10B981", bg: "rgba(16,185,129,0.1)",   border: "rgba(16,185,129,0.3)"  },
  EXPIRED:      { label: "Expired",           color: "#EF4444", bg: "rgba(239,68,68,0.1)",    border: "rgba(239,68,68,0.3)"   },
  TERMINATED:   { label: "Terminated",        color: "#DC2626", bg: "rgba(220,38,38,0.1)",    border: "rgba(220,38,38,0.3)"   },
};

export const STATE_FLOW: ContractStatusName[] = [
  "REQUESTED", "DRAFT", "SENT", "NEGOTIATION", "PENDING_SIGN", "SIGNED",
];

export function isTerminal(status: ContractStatusName): boolean {
  return ["SIGNED", "EXPIRED", "TERMINATED"].includes(status);
}

export function isLocked(status: ContractStatusName): boolean {
  return ["PENDING_SIGN", "SIGNED", "EXPIRED", "TERMINATED"].includes(status);
}
