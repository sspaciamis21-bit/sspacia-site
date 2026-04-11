// ─── CLM API Client ───────────────────────────────────────────────────────────
// Central fetch wrapper for all CLM API calls.
// Both admin and user routes follow { data } | { error } response shape.

import type {
  Contract,
  ContractRequest,
  ContractSummary,
  ContractVersion,
  ApiSuccess,
} from "@/types/clm";

async function req<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  
  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error("Invalid server response");
  }

  if (!res.ok) {
    throw new Error(json.error || json.message || "Request failed");
  }
  
  return (json as ApiSuccess<T>).data;
}

// ─── Admin: Contract Requests ─────────────────────────────────────────────────
export const adminRequestsApi = {
  list: (params?: { status?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append("status", params.status);
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    
    const qs = searchParams.toString();
    return req<ContractRequest[]>(`/api/admin/contract-requests${qs ? `?${qs}` : ""}`);
  },
  accept: (id: number) =>
    req<{ id: number }>(`/api/admin/contract-requests/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "ACCEPT" }),
    }),
  reject: (id: number, rejectedNote: string) =>
    req<{ id: number }>(`/api/admin/contract-requests/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "REJECT", rejectedNote }),
    }),
};

// ─── Admin: Contracts ─────────────────────────────────────────────────────────
export const adminContractsApi = {
  list: () => req<ContractSummary[]>("/api/admin/contracts"),

  create: (body: {
    requestId: number;
    bookingId: number;
    title: string;
    content: string;
    changeNote?: string;
    expiresAt?: string;
  }) =>
    req<{ id: number; contractNumber: string }>("/api/admin/contracts", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  get: (id: number) => req<Contract>(`/api/admin/contracts/${id}`),

  patch: (
    id: number,
    body: { statusId?: number; title?: string; notes?: string; expiresAt?: string }
  ) =>
    req<Contract>(`/api/admin/contracts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  send: (id: number, targetStatus: string) =>
    req<{ contractId: number }>(`/api/admin/contracts/${id}/send`, {
      method: "POST",
      body: JSON.stringify({ targetStatus })
    }),


  finalise: (id: number) =>
    req<{ finalDriveUrl: string }>(`/api/admin/contracts/${id}/finalise`, {
      method: "POST",
    }),

  versions: {
    list: (contractId: number) =>
      req<ContractVersion[]>(`/api/admin/contracts/${contractId}/versions`),
    get: (contractId: number, versionId: number) =>
      req<ContractVersion>(`/api/admin/contracts/${contractId}/versions/${versionId}`),
    create: (contractId: number, body: { content: string; changeNote?: string }) =>
      req<{ versionNumber: number }>(`/api/admin/contracts/${contractId}/versions`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },

  negotiate: (id: number, message: string, negotiationId?: number, action?: string) =>
    req<{ id: number }>(`/api/admin/contracts/${id}/negotiate`, {
      method: "POST",
      body: JSON.stringify({ message, negotiationId, action }),
    }),
    
  signCounter: (id: number, body: { 
    signatureData: string; 
    signerName: string; 
    method: string; 
    certificate?: string 
  }) =>
    req<{ message: string }>(`/api/admin/contracts/${id}/sign-counter`, {
      method: "POST",
      body: JSON.stringify(body),
    }),


  transition: (id: number, action: "SEND" | "FINALISE" | "ARCHIVE") =>
    req<{ id: number }>(`/api/admin/contracts/${id}/send`, {
      method: "POST",
      body: JSON.stringify({ action }),
    }),
};

// ─── User: Contracts ──────────────────────────────────────────────────────────
export const userContractsApi = {
  submitRequest: (body: { bookingId?: number; requestNote?: string }) =>
    req<{ id: number; status: string }>("/api/user/contracts/request", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  list: () => req<ContractSummary[]>("/api/user/contracts"),

  get: (id: number) => req<Contract>(`/api/user/contracts/${id}`),

  openNegotiation: (id: number, body: { title: string; message: string }) =>
    req<{ negotiationId: number }>(`/api/user/contracts/${id}/negotiate`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  replyNegotiation: (
    contractId: number,
    nid: number,
    body: { message: string; attachmentUrl?: string }
  ) =>
    req<{ messageId: number }>(
      `/api/user/contracts/${contractId}/negotiate/${nid}`,
      { method: "POST", body: JSON.stringify(body) }
    ),

  sign: (id: number, signatureData: string) =>
    req<{ signedAt: string }>(`/api/user/contracts/${id}/sign`, {
      method: "POST",
      body: JSON.stringify({ signatureData }),
    }),

  accept: (id: number) =>
    req<{ message: string }>(`/api/user/contracts/${id}/accept`, {
      method: "POST",
    }),
};
