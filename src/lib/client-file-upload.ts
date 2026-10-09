/**
 * Client-side file upload & image compression utilities for Admin modules.
 * Prevents Nginx/proxy 413 "Request Entity Too Large" errors and JSON parse crashes.
 */

/**
 * Compresses an image file (JPEG, PNG, WEBP, etc.) before uploading.
 * Skips compression if file is a PDF or already small (<= 400KB).
 * Reduces 5MB-20MB smartphone camera photos down to ~200KB-400KB while preserving crisp text.
 */
export async function compressImageFile(file: File, maxDimension = 1600, quality = 0.82): Promise<File> {
  if (typeof window === "undefined") return file;

  const isImage = file.type?.startsWith("image/") || /\.(jpe?g|png|webp|bmp)$/i.test(file.name);
  if (!isImage) return file;

  // If already small (<= 400KB), no need to compress
  if (file.size <= 400 * 1024) return file;

  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            let { width, height } = img;
            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve(file);
              return;
            }

            // Fill white background for transparency
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
              (blob) => {
                if (blob && blob.size < file.size) {
                  const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
                  const compressedFile = new File([blob], newName, {
                    type: "image/jpeg",
                    lastModified: Date.now(),
                  });
                  resolve(compressedFile);
                } else {
                  resolve(file);
                }
              },
              "image/jpeg",
              quality
            );
          } catch {
            resolve(file);
          }
        };
        img.onerror = () => resolve(file);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    } catch {
      resolve(file);
    }
  });
}

/**
 * Safely uploads a document or image to /api/admin/upload-pdf.
 * Handles automatic image compression, pre-flight size checks,
 * and safe non-JSON (HTML 413/502/504) response handling to prevent
 * "Unexpected token '<', '<!DOCTYPE '... is not valid JSON" errors.
 */
export async function uploadDocumentToStorage(file: File): Promise<{
  fileUrl: string;
  fileName: string;
  fileSize: number;
  documentId?: number;
}> {
  if (!file) {
    throw new Error("No file selected");
  }

  // Pre-flight file size check (25MB limit)
  if (file.size > 25 * 1024 * 1024) {
    throw new Error(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is 25MB.`);
  }

  // Automatically compress image if applicable
  const fileToUpload = await compressImageFile(file);

  const formData = new FormData();
  formData.append("file", fileToUpload);

  const res = await fetch("/api/admin/upload-pdf", {
    method: "POST",
    body: formData,
  });

  const contentType = res.headers.get("content-type") || "";
  let data: any = null;

  if (contentType.includes("application/json")) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    // Non-JSON response (e.g. Nginx 413, 502, 504 HTML page)
    const text = await res.text().catch(() => "");
    if (res.status === 413 || text.includes("413") || text.includes("Entity Too Large") || text.includes("Payload Too Large")) {
      throw new Error(`File size (${(fileToUpload.size / (1024 * 1024)).toFixed(1)}MB) exceeds server upload limits. Please upload a smaller file or compressed PDF.`);
    }
    if (res.status === 502 || res.status === 504 || text.includes("502 Bad Gateway") || text.includes("504 Gateway Time-out")) {
      throw new Error("Upload timed out or server is temporarily unavailable. Please try again with a smaller file.");
    }
    throw new Error(`Server returned HTTP ${res.status} (${res.statusText || "Upload failed"}). Please try again.`);
  }

  if (!res.ok || !data?.success) {
    throw new Error(data?.error || `Upload failed with status ${res.status}`);
  }

  const fileUrl = data.fileUrl || data.url || data.data?.fileUrl || (data.id ? `/api/admin/stored-documents/${data.id}` : "");
  if (!fileUrl) {
    throw new Error("Failed to obtain document URL from upload response");
  }

  return {
    fileUrl,
    fileName: data.data?.fileName || data.fileName || fileToUpload.name,
    fileSize: data.data?.fileSize || data.fileSize || fileToUpload.size,
    documentId: data.documentId || data.id,
  };
}
