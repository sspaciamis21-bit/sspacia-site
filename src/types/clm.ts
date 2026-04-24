// ─── CLM Types ────────────────────────────────────────────────────────────────
// Matches the Prisma schema defined in CLM.md

export type ContractStatusName =
  | "REQUESTED"
  | "DRAFT"
  | "SENT"
  | "NEGOTIATION"
  | "PENDING_SIGN"
  | "SIGNED"
  | "EXPIRED"
  | "TERMINATED";

export interface ContractStatus {
  id: number;
  name: ContractStatusName;
  displayName: string;
  color: string;
  isFinal: boolean;
  sortOrder: number;
}

export interface ContractRequest {
  id: number;
  customerId: number;
  bookingId?: number;
  requestNote?: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  rejectedNote?: string;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: number;
    name: string;
    email: string;
    organization?: string;
  };
  booking?: {
    id: number;
    bookingNumber: string;
    product?: { name: string };
    location?: { name: string };
  };
  contract?: ContractSummary;
}

export interface ContractSummary {
  id: number;
  contractNumber: string;
  title: string;
  status: ContractStatus;
  createdAt: string;
  updatedAt: string;
  customer?: { id: number; name: string; organization?: string };
  booking?: {
    id: number;
    bookingNumber: string;
    startDate: string;
    endDate: string;
    product?: { name: string };
    location?: { name: string; address: string };
  };
  _count?: { versions: number; negotiations: number };
}

export interface ContractVersion {
  id: number;
  contractId: number;
  versionNumber: number;
  content?: string; // Tiptap JSON stringified — only present on single-version fetch
  changeNote?: string;
  createdBy: { id: number; name: string };
  createdAt: string;
}

export interface NegotiationMessage {
  id: number;
  negotiationId: number;
  authorType: "CUSTOMER" | "STAFF";
  body: string;
  attachmentUrl?: string;
  createdAt: string;
  authorCustomer?: { id: number; name: string };
  authorUser?: { id: number; name: string };
}

export interface ContractNegotiation {
  id: number;
  contractId: number;
  customerId?: number;
  status: "OPEN" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";
  title: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  customer?: { id: number; name: string };
  messages: NegotiationMessage[];
}

export interface ContractSignature {
  id: number;
  contractId: number;
  contractVersionId: number;
  signedById: number;
  signatureData: string; // base64 PNG
  ipAddress?: string;
  signedAt: string;
}

export interface Contract {
  id: number;
  contractNumber: string;
  requestId: number;
  bookingId: number;
  statusId: number;
  title: string;
  expiresAt?: string;
  notes?: string;
  finalDriveUrl?: string;
  finalVersionId?: number;
  createdAt: string;
  updatedAt: string;
  status: ContractStatus;
  request?: ContractRequest;
  booking: {
    id: number;
    bookingNumber: string;
    startDate: string;
    endDate: string;
    customer?: { id: number; name: string; email: string; organization?: string };
    product?: { 
      id: number; 
      name: string; 
      type?: { id: number; name: string; displayName: string };
      location?: { 
        name: string;
        address?: string;
      } 
    };
  };

  versions: ContractVersion[];
  negotiations: ContractNegotiation[];
  signature?: ContractSignature;

  // New multi-method signature fields
  signatureType?: "CANVAS" | "DSC" | "MANUAL";
  signatureData?: string;
  signerCertificate?: string;
  signerName?: string;
  signedAt?: string;
  manualUploadUrl?: string;

  // Manager Counter-Signature
  counterSignatureType?: "CANVAS" | "DSC" | "MANUAL";
  counterSignatureData?: string;
  counterSignerName?: string;
  counterSignedAt?: string;
}

// ─── API Response Wrappers ────────────────────────────────────────────────────
export interface ApiSuccess<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
