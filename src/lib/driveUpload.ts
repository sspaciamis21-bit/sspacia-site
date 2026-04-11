// =============================================================================
// drive-upload.ts — Backend helper to upload documents via Apps Script
// =============================================================================
// Store these in your .env:
//   APPS_SCRIPT_DRIVE_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
//   APPS_SCRIPT_TOKEN=YOUR_SECRET_TOKEN_HERE

import fs   from "fs";
import path from "path";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface UploadDocumentParams {
  /** Top-level company folder name — e.g. "SSPACIA" */
  companyName:  string;
  /** Customer sub-folder — e.g. "Rahul Shah" */
  customerName: string;
  /** Category sub-folder — e.g. "KYC", "Agreement", "Invoice" */
  category:     string;
  /** Original file name — e.g. "aadhaar.pdf" */
  fileName:     string;
  /** MIME type — e.g. "application/pdf", "image/jpeg" */
  mimeType:     string;
  /** Raw file buffer (from multer, formidable, etc.) */
  fileBuffer:   Buffer;
}

export interface UploadDocumentResult {
  fileId:    string;  // Google Drive file ID  → store as Document.fileUrl key
  fileUrl:   string;  // Shareable view link   → store as Document.fileUrl
  folderUrl: string;  // Parent folder link    → store as Document.folderUrl (if needed)
  fileName:  string;
  mimeType:  string;
  fileSize:  number;  // bytes
}

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Uploads a file to Google Drive via the Apps Script web app.
 * Returns the file URL, file ID, and folder URL to store in the Document table.
 *
 * @example
 * const result = await uploadDocument({
 *   companyName:  "SSPACIA",
 *   customerName: "Rahul Shah",
 *   category:     "KYC",
 *   fileName:     "aadhaar.pdf",
 *   mimeType:     "application/pdf",
 *   fileBuffer:   req.file.buffer,
 * });
 *
 * await prisma.document.create({
 *   data: {
 *     customerId: customer.id,
 *     categoryId: kycCategory.id,
 *     statusId:   pendingStatus.id,
 *     title:      "Aadhaar Card",
 *     fileUrl:    result.fileUrl,
 *     fileName:   result.fileName,
 *     fileSize:   result.fileSize,
 *     mimeType:   result.mimeType,
 *   }
 * });
 */
export async function uploadDocument(params: UploadDocumentParams): Promise<UploadDocumentResult> {
  const appsScriptUrl = process.env.APPS_SCRIPT_DRIVE_URL;
  const authToken     = process.env.APPS_SCRIPT_TOKEN;

  if (!appsScriptUrl || !authToken) {
    throw new Error("APPS_SCRIPT_DRIVE_URL and APPS_SCRIPT_TOKEN must be set in environment variables.");
  }

  // Encode file as base64
  const fileData = params.fileBuffer.toString("base64");

  // Build form body — Apps Script reads from e.parameter (URL-encoded form)
  const body = new URLSearchParams({
    token:       authToken,
    companyName: params.companyName,
    customerName: params.customerName,
    category:    params.category,
    fileName:    params.fileName,
    mimeType:    params.mimeType,
    fileData,
  });

  const response = await fetch(appsScriptUrl, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    body.toString(),
    // Apps Script redirects — follow them
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Apps Script request failed with HTTP ${response.status}`);
  }

  const json = await response.json() as {
    success:    boolean;
    error?:     string;
    fileId?:    string;
    fileUrl?:   string;
    folderUrl?: string;
    fileName?:  string;
    mimeType?:  string;
    fileSize?:  number;
  };

  if (!json.success) {
    throw new Error(`Drive upload failed: ${json.error ?? "Unknown error"}`);
  }

  return {
    fileId:    json.fileId!,
    fileUrl:   json.fileUrl!,
    folderUrl: json.folderUrl!,
    fileName:  json.fileName!,
    mimeType:  json.mimeType!,
    fileSize:  json.fileSize!,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVENIENCE — upload from a local file path (useful for testing)
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadDocumentFromPath(
  filePath: string,
  params:   Omit<UploadDocumentParams, "fileBuffer" | "fileName" | "mimeType"> & {
    fileName?: string;
    mimeType?: string;
  }
): Promise<UploadDocumentResult> {
  const fileBuffer = fs.readFileSync(filePath);
  const fileName   = params.fileName ?? path.basename(filePath);
  // Naive MIME fallback — use a proper library like `mime-types` in production
  const mimeType   = params.mimeType ?? guessMime(fileName);

  return uploadDocument({ ...params, fileBuffer, fileName, mimeType });
}

function guessMime(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const map: Record<string, string> = {
    ".pdf":  "application/pdf",
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png":  "image/png",
    ".doc":  "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  return map[ext] ?? "application/octet-stream";
}