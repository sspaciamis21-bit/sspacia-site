import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const BRIDGE_SECRET = 'sspacia_dsc_secure_2026';

// Persistent shared state directory on server disk (shared across all Node processes)
const STATE_DIR = path.join(process.cwd(), 'public', 'uploads', 'test-invoices');
const STATE_FILE = path.join(STATE_DIR, 'dsc_bridge_shared_state.json');

interface DscJob {
  jobId: string;
  invoiceId?: number;
  splitIndex?: number;
  splitName?: string;
  companyName: string;
  isTest?: boolean;
  pdfBase64: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  signedPdfUrl?: string;
  signedPdfName?: string;
  signerName?: string;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

interface DscBridgeSharedState {
  gateway: {
    center: string;
    status: 'ONLINE' | 'TOKEN_UNPLUGGED' | 'OFFLINE';
    tokenLabel: string;
    lastSeen: number;
  } | null;
  jobs: DscJob[];
  testInvoice: {
    signedPdfUrl: string | null;
    signedPdfName: string | null;
    signedAt: string | null;
    signerName: string | null;
  };
}

function loadSharedState(): DscBridgeSharedState {
  try {
    if (!fs.existsSync(STATE_DIR)) {
      fs.mkdirSync(STATE_DIR, { recursive: true });
    }
    if (fs.existsSync(STATE_FILE)) {
      const content = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        return {
          gateway: parsed.gateway || null,
          jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
          testInvoice: parsed.testInvoice || {
            signedPdfUrl: null,
            signedPdfName: null,
            signedAt: null,
            signerName: null,
          },
        };
      }
    }
  } catch (err) {
    console.warn('[DSC Bridge] loadSharedState notice:', err);
  }

  return {
    gateway: null,
    jobs: [],
    testInvoice: {
      signedPdfUrl: null,
      signedPdfName: null,
      signedAt: null,
      signerName: null,
    },
  };
}

function saveSharedState(state: DscBridgeSharedState) {
  try {
    if (!fs.existsSync(STATE_DIR)) {
      fs.mkdirSync(STATE_DIR, { recursive: true });
    }
    // Keep all PENDING & IN_PROGRESS jobs; keep last 30 COMPLETED/FAILED jobs
    const activeJobs = state.jobs.filter((j) => j.status === 'PENDING' || j.status === 'IN_PROGRESS');
    const finishedJobs = state.jobs.filter((j) => j.status === 'COMPLETED' || j.status === 'FAILED').slice(-30);
    state.jobs = [...activeJobs, ...finishedJobs];
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[DSC Bridge] saveSharedState notice:', err);
  }
}

/**
 * GET /api/admin/Invoices/dsc-bridge
 * Returns live status of the Mercado USB DSC Gateway and test invoice status
 */
export async function GET(request: Request) {
  const state = loadSharedState();
  const { searchParams } = new URL(request.url);

  if (searchParams.get('reset') === 'true') {
    state.testInvoice = {
      signedPdfUrl: null,
      signedPdfName: null,
      signedAt: null,
      signerName: null,
    };
    saveSharedState(state);
  }

  const now = Date.now();
  const lastSeen = state.gateway?.lastSeen || 0;
  const isOnline = Boolean(
    state.gateway &&
    state.gateway.status === 'ONLINE' &&
    now - lastSeen < 12000
  );

  const displayStatus = isOnline
    ? 'ONLINE'
    : state.gateway && now - lastSeen < 12000
    ? state.gateway.status
    : 'OFFLINE';

  const pendingCount = state.jobs.filter((j) => j.status === 'PENDING').length;

  return NextResponse.json({
    success: true,
    isOnline,
    gatewayStatus: displayStatus,
    center: state.gateway?.center || 'Mercado',
    tokenLabel: state.gateway?.tokenLabel || 'None',
    lastSeenMsAgo: lastSeen ? now - lastSeen : null,
    pendingJobsCount: pendingCount,
    testInvoice: state.testInvoice,
    gateway: state.gateway,
  });
}

/**
 * Helper to load PDF buffer from StoredDocument ID URL, external HTTP, local disk, or database by filename
 */
async function loadPdfBufferFromUrl(pdfUrl: string, fallbackFileName?: string): Promise<Buffer | null> {
  if (!pdfUrl) return null;

  // 1. From StoredDocument ID URL: /api/admin/stored-documents/:id
  if (pdfUrl.includes('/api/admin/stored-documents/')) {
    const match = pdfUrl.match(/\/api\/admin\/stored-documents\/(\d+)/);
    if (match && match[1]) {
      const doc = await (prisma as any).storedDocument.findUnique({
        where: { id: Number(match[1]) },
        select: { fileData: true },
      });
      if (doc?.fileData) return Buffer.from(doc.fileData);
    }
  }

  // 2. Full HTTP/HTTPS URL
  if (pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://')) {
    const res = await fetch(pdfUrl).catch(() => null);
    if (res && res.ok) return Buffer.from(await res.arrayBuffer());
  }

  // 3. Local disk in public/
  const localPath = path.join(process.cwd(), 'public', pdfUrl.startsWith('/') ? pdfUrl.slice(1) : pdfUrl);
  if (fs.existsSync(localPath)) {
    return fs.readFileSync(localPath);
  }

  // 4. By filename in StoredDocument table
  const fileNameToSearch = fallbackFileName || path.basename(pdfUrl);
  if (fileNameToSearch) {
    const cleanFileName = fileNameToSearch.replace(/^\d+_/, '');
    const doc = await (prisma as any).storedDocument.findFirst({
      where: {
        OR: [
          { fileName: fileNameToSearch },
          { fileName: cleanFileName },
        ],
      },
      select: { fileData: true },
      orderBy: { id: 'desc' },
    });
    if (doc?.fileData) return Buffer.from(doc.fileData);
  }

  return null;
}

/**
 * Programmatic helper to queue an attached invoice for background USB DSC signing
 * Supports silent offline queueing: if the USB token is currently unplugged,
 * the jobs stay as PENDING and will be signed automatically when the USB token is inserted.
 * Full multi-split invoice support: queues all attached sub-invoices in splitsJson.
 */
export async function queueInvoiceForDsc(
  invoiceId: number,
  options?: { force?: boolean }
): Promise<{ success: boolean; jobId?: string; jobIds?: string[]; message?: string; error?: string; isOnline?: boolean }> {
  const state = loadSharedState();
  const now = Date.now();
  const lastSeen = state.gateway?.lastSeen || 0;
  const isOnline = Boolean(
    state.gateway &&
    state.gateway.status === 'ONLINE' &&
    now - lastSeen < 12000
  );

  // Fetch invoice record and attached PDF
  const invoice = await (prisma as any).invoiceRecord.findUnique({
    where: { id: Number(invoiceId) },
    include: { attachedInvoice: true },
  });

  if (!invoice) {
    return { success: false, error: 'Invoice record not found' };
  }

  // Check for split sub-invoices in splitsJson
  let splits: any[] = [];
  if (invoice.splitsJson) {
    try {
      splits = JSON.parse(invoice.splitsJson);
    } catch {}
  }

  const isMultiSplit = Array.isArray(splits) && splits.length > 1;

  if (isMultiSplit) {
    const queuedJobIds: string[] = [];
    let newlyQueued = 0;

    for (let idx = 0; idx < splits.length; idx++) {
      const grp = splits[idx];
      const splitPdfUrl = grp.attachedInvoice?.fileUrl;
      if (!splitPdfUrl) continue; // No PDF attached for this sub-invoice yet

      // If already signed and not forcing, skip
      if (!options?.force && grp.digitallySignedPdfUrl) {
        continue;
      }

      // If force, remove old pending/in-progress jobs for this split
      if (options?.force) {
        state.jobs = state.jobs.filter(
          (j) => !(j.invoiceId === invoice.id && j.splitIndex === idx && (j.status === 'PENDING' || j.status === 'IN_PROGRESS'))
        );
      } else {
        const existingJob = state.jobs.find(
          (j) => j.invoiceId === invoice.id && j.splitIndex === idx && (j.status === 'PENDING' || j.status === 'IN_PROGRESS')
        );
        if (existingJob) {
          queuedJobIds.push(existingJob.jobId);
          continue;
        }
      }

      const pdfBuffer = await loadPdfBufferFromUrl(splitPdfUrl, grp.attachedInvoice?.fileName);
      if (!pdfBuffer) {
        console.warn(`[Auto-DSC] Could not load PDF buffer for ${invoice.companyName} Sub-Invoice #${idx + 1} (${splitPdfUrl})`);
        continue;
      }

      const jobId = `inv_${invoice.id}_split_${idx}_${Date.now()}`;
      state.jobs.push({
        jobId,
        invoiceId: invoice.id,
        splitIndex: idx,
        splitName: grp.name || `Sub-Invoice #${idx + 1}`,
        companyName: `${invoice.companyName} (${grp.name || `Sub-Inv #${idx + 1}`})`,
        isTest: false,
        pdfBase64: pdfBuffer.toString('base64'),
        status: 'PENDING',
        createdAt: Date.now(),
      });
      queuedJobIds.push(jobId);
      newlyQueued++;
    }

    if (queuedJobIds.length === 0) {
      return { success: true, message: 'All sub-invoices are already digitally signed.', isOnline };
    }

    saveSharedState(state);
    console.log(`[Auto-DSC] ⚡ Queued ${newlyQueued} sub-invoices for #${invoice.id} (${invoice.companyName})! (Gateway: ${isOnline ? 'ONLINE' : 'OFFLINE_PENDING_USB'})`);
    return {
      success: true,
      jobId: queuedJobIds[0],
      jobIds: queuedJobIds,
      message: isOnline
        ? `Queued ${queuedJobIds.length} sub-invoices for USB DSC signing!`
        : `Queued ${queuedJobIds.length} sub-invoices. Will be signed automatically when USB key is inserted.`,
      isOnline,
    };
  }

  // ── SINGLE INVOICE SIGNING FLOW ──
  const pdfUrl = invoice.attachedInvoice?.fileUrl || (splits[0]?.attachedInvoice?.fileUrl);
  if (!pdfUrl) {
    return { success: false, error: 'No accountant invoice PDF attached for this record.' };
  }

  if (!options?.force && invoice.digitallySignedPdfUrl) {
    return { success: true, message: 'Invoice is already digitally signed.' };
  }

  if (options?.force) {
    state.jobs = state.jobs.filter(
      (j) => !(j.invoiceId === invoice.id && (j.status === 'PENDING' || j.status === 'IN_PROGRESS'))
    );
  } else {
    const existingJob = state.jobs.find(
      (j) => j.invoiceId === invoice.id && (j.status === 'PENDING' || j.status === 'IN_PROGRESS')
    );
    if (existingJob) {
      return { success: true, jobId: existingJob.jobId, message: 'Invoice already in DSC signing queue.', isOnline };
    }
  }

  const pdfBuffer = await loadPdfBufferFromUrl(pdfUrl, invoice.attachedInvoice?.fileName || splits[0]?.attachedInvoice?.fileName);
  if (!pdfBuffer) {
    return { success: false, error: `Could not load invoice PDF to sign: ${pdfUrl}` };
  }

  const jobId = `inv_${invoice.id}_${Date.now()}`;
  state.jobs.push({
    jobId,
    invoiceId: invoice.id,
    splitIndex: 0,
    companyName: invoice.companyName,
    isTest: false,
    pdfBase64: pdfBuffer.toString('base64'),
    status: 'PENDING',
    createdAt: Date.now(),
  });

  saveSharedState(state);
  console.log(`[Auto-DSC] ⚡ Invoice #${invoice.id} (${invoice.companyName}) queued for USB DSC signing! (Gateway: ${isOnline ? 'ONLINE' : 'PENDING_USB_DETECTION'})`);
  return {
    success: true,
    message: isOnline
      ? `Invoice for ${invoice.companyName} queued for USB DSC signing!`
      : `Invoice for ${invoice.companyName} queued. Will be signed automatically when USB key is connected.`,
    jobId,
    jobIds: [jobId],
    isOnline,
  };
}

/**
 * POST /api/admin/Invoices/dsc-bridge
 * Handles Gateway heartbeats, job polling, job completion, and client queueing
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action } = body;
    const state = loadSharedState();

    // ── 1. GATEWAY HEARTBEAT ───────────────────────────────────────────────
    if (action === 'HEARTBEAT') {
      const { center, status, tokenLabel, secret } = body;
      if (secret !== BRIDGE_SECRET) {
        return NextResponse.json({ error: 'Unauthorized gateway secret' }, { status: 401 });
      }

      state.gateway = {
        center: center || 'Mercado',
        status: status || 'ONLINE',
        tokenLabel: tokenLabel || 'PRAVEEN DILIPKUMAR AGARWAL',
        lastSeen: Date.now(),
      };

      saveSharedState(state);
      const pendingCount = state.jobs.filter((j) => j.status === 'PENDING').length;
      return NextResponse.json({ success: true, pendingJobsCount: pendingCount });
    }

    // ── 2. GATEWAY POLLS FOR SIGNING WORK ──────────────────────────────────
    if (action === 'POLL') {
      const { secret } = body;
      if (secret !== BRIDGE_SECRET) {
        return NextResponse.json({ error: 'Unauthorized gateway secret' }, { status: 401 });
      }

      if (state.gateway) {
        state.gateway.lastSeen = Date.now();
      }

      // Find oldest pending job
      const nextJob = state.jobs.find((j) => j.status === 'PENDING');

      if (nextJob) {
        nextJob.status = 'IN_PROGRESS';
        saveSharedState(state);
        return NextResponse.json({
          success: true,
          job: {
            jobId: nextJob.jobId,
            invoiceId: nextJob.invoiceId,
            companyName: nextJob.companyName,
            pdfBase64: nextJob.pdfBase64,
          },
        });
      }

      saveSharedState(state);
      return NextResponse.json({ success: true, job: null });
    }

    // ── 3. GATEWAY DELIVERS COMPLETED SIGNED PDF ───────────────────────────
    if (action === 'COMPLETE') {
      const { jobId, signedPdfBase64, signerName, secret } = body;
      if (secret !== BRIDGE_SECRET) {
        return NextResponse.json({ error: 'Unauthorized gateway secret' }, { status: 401 });
      }

      if (!jobId || !signedPdfBase64) {
        return NextResponse.json({ error: 'Missing jobId or signedPdfBase64' }, { status: 400 });
      }

      const job = state.jobs.find((j) => j.jobId === jobId);
      const signedBuffer = Buffer.from(signedPdfBase64, 'base64');
      const fileName = `signed_dsc_${job?.isTest ? 'test_' : ''}${Date.now()}.pdf`;

      // 1. Write to public/uploads/signed-invoices/
      try {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'signed-invoices');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        fs.writeFileSync(path.join(uploadDir, fileName), signedBuffer);
      } catch (fsErr) {
        console.warn('[DSC Bridge] File write notice:', fsErr);
      }

      // 2. Write to StoredDocument in SQL Database (Permanent & Serverless Safe)
      let signedUrl = `/uploads/signed-invoices/${fileName}`;
      try {
        const storedDoc = await (prisma as any).storedDocument.create({
          data: {
            fileName,
            fileData: signedBuffer,
            mimeType: 'application/pdf',
            fileSize: signedBuffer.length,
            uploadedById: 1, // System/Admin ID ensures foreign key constraint passes
          },
        });
        if (storedDoc?.id) {
          signedUrl = `/api/admin/stored-documents/${storedDoc.id}`;
        }
      } catch (dbErr) {
        console.warn('[DSC Bridge] StoredDocument DB save notice (using disk url fallback):', dbErr);
      }

      // 3. Update job record
      if (job) {
        job.status = 'COMPLETED';
        job.signedPdfUrl = signedUrl;
        job.signedPdfName = fileName;
        job.signerName = signerName || 'PRAVEEN DILIPKUMAR AGARWAL';
        job.completedAt = Date.now();
      }

      // 4. Update test invoice state (persistent on disk!)
      if (job?.isTest || jobId.startsWith('test_')) {
        state.testInvoice = {
          signedPdfUrl: signedUrl,
          signedPdfName: fileName,
          signedAt: new Date().toISOString(),
          signerName: signerName || 'PRAVEEN DILIPKUMAR AGARWAL',
        };
      }

      // 5. Update real invoice record if present
      if (job?.invoiceId) {
        try {
          const invRecord = await (prisma as any).invoiceRecord.findUnique({
            where: { id: job.invoiceId },
            select: { id: true, splitsJson: true },
          });

          let updatedSplitsJson: string | null = null;
          let allSplitsSigned = false;

          if (invRecord?.splitsJson) {
            try {
              const parsedSplits = JSON.parse(invRecord.splitsJson);
              if (Array.isArray(parsedSplits) && parsedSplits.length > 0) {
                const targetIdx = (job.splitIndex !== undefined && job.splitIndex < parsedSplits.length) ? job.splitIndex : 0;
                if (parsedSplits[targetIdx]) {
                  parsedSplits[targetIdx].digitallySignedPdfUrl = signedUrl;
                  parsedSplits[targetIdx].digitallySignedPdfName = fileName;
                  parsedSplits[targetIdx].signedAt = new Date().toISOString();
                  parsedSplits[targetIdx].signedByName = signerName || 'PRAVEEN DILIPKUMAR AGARWAL';
                  if (parsedSplits[targetIdx].attachedInvoice) {
                    parsedSplits[targetIdx].attachedInvoice.fileUrl = signedUrl;
                    parsedSplits[targetIdx].attachedInvoice.fileName = fileName;
                    parsedSplits[targetIdx].attachedInvoice.fileSize = signedBuffer.length;
                  }
                }

                // Check if all splits with attached invoices are now signed
                allSplitsSigned = parsedSplits.every((s: any) => !s.attachedInvoice?.fileUrl || s.digitallySignedPdfUrl);
                updatedSplitsJson = JSON.stringify(parsedSplits);
              }
            } catch {}
          } else {
            allSplitsSigned = true;
          }

          // If single invoice or all splits signed, mark main invoice record signed
          const shouldUpdateMain = allSplitsSigned || job.splitIndex === undefined || job.splitIndex === 0;

          await (prisma as any).invoiceRecord.update({
            where: { id: job.invoiceId },
            data: {
              ...(shouldUpdateMain ? {
                digitallySignedPdfUrl: signedUrl,
                digitallySignedPdfName: fileName,
                signedAt: new Date(),
                signedByName: signerName || 'PRAVEEN DILIPKUMAR AGARWAL',
              } : {}),
              ...(updatedSplitsJson ? { splitsJson: updatedSplitsJson } : {}),
            },
          });

          // Also replace the attached invoice PDF with the signed PDF for primary/single
          if (job.splitIndex === undefined || job.splitIndex === 0) {
            await (prisma as any).attachedInvoice.updateMany({
              where: { invoiceRecordId: job.invoiceId },
              data: {
                fileUrl: signedUrl,
                fileName: fileName,
                fileSize: signedBuffer.length,
              },
            });
          }
        } catch (invErr) {
          console.error('[DSC Bridge] Invoice record update error:', invErr);
        }
      }

      saveSharedState(state);

      return NextResponse.json({
        success: true,
        message: 'Signed PDF successfully received and saved!',
        signedPdfUrl: signedUrl,
      });
    }

    // ── 4. WEB CLIENT QUEUES REAL INVOICE FOR SIGNING ──────────────────────
    if (action === 'QUEUE_INVOICE') {
      const { invoiceId, force } = body;
      if (!invoiceId) {
        return NextResponse.json({ error: 'Missing invoiceId' }, { status: 400 });
      }
      const qRes = await queueInvoiceForDsc(Number(invoiceId), { force: Boolean(force) });
      if (!qRes.success) {
        return NextResponse.json({ error: qRes.error }, { status: 400 });
      }
      return NextResponse.json(qRes);
    }

    // ── 4. WEB CLIENT QUEUES TEST INVOICE FOR SIGNING ──────────────────────
    if (action === 'QUEUE_TEST') {
      const now = Date.now();
      const lastSeen = state.gateway?.lastSeen || 0;
      const isOnline = Boolean(
        state.gateway &&
        state.gateway.status === 'ONLINE' &&
        now - lastSeen < 12000
      );

      if (!isOnline) {
        return NextResponse.json(
          {
            error:
              'Mercado DSC Gateway is offline. Please ensure the USB token is plugged into the Mercado PC and setup-autostart-on-boot.bat was run.',
          },
          { status: 400 }
        );
      }

      // Read HARDIK.pdf
      let pdfBytes: Buffer | null = null;
      const candidates = [
        path.join(process.cwd(), 'scratch', 'HARDIK.pdf'),
        path.join(process.cwd(), 'public', 'uploads', 'test-invoices', 'HARDIK.pdf'),
      ];

      for (const p of candidates) {
        if (fs.existsSync(p)) {
          pdfBytes = fs.readFileSync(p);
          break;
        }
      }

      if (!pdfBytes) {
        return NextResponse.json({ error: 'Test PDF (HARDIK.pdf) not found on server.' }, { status: 500 });
      }

      const jobId = `test_${Date.now()}`;
      state.jobs.push({
        jobId,
        companyName: 'Fake Client (Agarwal Complex) - Test DSC',
        isTest: true,
        pdfBase64: pdfBytes.toString('base64'),
        status: 'PENDING',
        createdAt: Date.now(),
      });

      saveSharedState(state);

      return NextResponse.json({
        success: true,
        message: 'Test invoice sent to Mercado Host for signing!',
        jobId,
      });
    }

    // ── 5. WEB CLIENT CHECKS STATUS OF A SIGNING JOB ───────────────────────
    if (action === 'JOB_STATUS') {
      const { jobId, invoiceId } = body;
      if (!jobId && !invoiceId) {
        return NextResponse.json({ error: 'Missing jobId or invoiceId' }, { status: 400 });
      }

      if (invoiceId) {
        const invJobs = state.jobs.filter((j) => j.invoiceId === Number(invoiceId));
        if (invJobs.length > 0) {
          const hasPending = invJobs.some((j) => j.status === 'PENDING' || j.status === 'IN_PROGRESS');
          const hasFailed = invJobs.some((j) => j.status === 'FAILED');
          const allCompleted = invJobs.every((j) => j.status === 'COMPLETED');
          if (hasPending) {
            return NextResponse.json({ success: true, status: 'IN_PROGRESS', jobs: invJobs });
          }
          if (allCompleted) {
            return NextResponse.json({
              success: true,
              status: 'COMPLETED',
              signedPdfUrl: invJobs[0]?.signedPdfUrl,
              signedPdfName: invJobs[0]?.signedPdfName,
              signerName: invJobs[0]?.signerName,
              jobs: invJobs,
            });
          }
          if (hasFailed) {
            return NextResponse.json({ success: false, status: 'FAILED', error: invJobs.find((j) => j.error)?.error || 'Signing failed' });
          }
        }
      }

      const job = state.jobs.find((j) => j.jobId === jobId);
      if (!job) {
        // Check if test invoice already finished
        if (state.testInvoice?.signedPdfUrl) {
          return NextResponse.json({
            success: true,
            status: 'COMPLETED',
            signedPdfUrl: state.testInvoice.signedPdfUrl,
            signerName: state.testInvoice.signerName,
          });
        }
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        status: job.status,
        signedPdfUrl: job.signedPdfUrl || state.testInvoice?.signedPdfUrl,
        signerName: job.signerName || state.testInvoice?.signerName,
        completedAt: job.completedAt,
        error: job.error,
      });
    }

    // ── 6. WEB CLIENT RESETS TEST INVOICE ──────────────────────────────────
    if (action === 'RESET_TEST') {
      state.testInvoice = {
        signedPdfUrl: null,
        signedPdfName: null,
        signedAt: null,
        signerName: null,
      };
      saveSharedState(state);
      return NextResponse.json({ success: true, message: 'Test invoice reset to unsigned' });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error('[DSC Bridge Route Error]:', error);
    return NextResponse.json({ error: error?.message || 'Server error in DSC bridge' }, { status: 500 });
  }
}
