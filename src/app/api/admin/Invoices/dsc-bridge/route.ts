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
    // Keep last 15 jobs only
    if (state.jobs.length > 15) {
      state.jobs = state.jobs.slice(-15);
    }
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

      // 2. Write to StoredDocument in SQL Database
      let signedUrl = `/uploads/signed-invoices/${fileName}`;
      try {
        const storedDoc = await (prisma as any).storedDocument.create({
          data: {
            fileName,
            fileData: signedBuffer,
            mimeType: 'application/pdf',
            fileSize: signedBuffer.length,
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
          await (prisma as any).invoiceRecord.update({
            where: { id: job.invoiceId },
            data: {
              digitallySignedPdfUrl: signedUrl,
              digitallySignedPdfName: fileName,
              signedAt: new Date(),
              signedByName: signerName || 'PRAVEEN DILIPKUMAR AGARWAL',
            },
          });

          // Also replace the attached invoice PDF with the signed PDF
          await (prisma as any).attachedInvoice.updateMany({
            where: { invoiceRecordId: job.invoiceId },
            data: {
              fileUrl: signedUrl,
              fileName: fileName,
            },
          });
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
      const { invoiceId } = body;
      if (!invoiceId) {
        return NextResponse.json({ error: 'Missing invoiceId' }, { status: 400 });
      }

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
            error: 'Please ask the CM of Mercado to insert the USB key, then try again.',
            gatewayStatus: state.gateway?.status || 'OFFLINE',
          },
          { status: 400 }
        );
      }

      // Fetch invoice record and attached PDF
      const invoice = await (prisma as any).invoiceRecord.findUnique({
        where: { id: Number(invoiceId) },
        include: { attachedInvoice: true },
      });

      if (!invoice) {
        return NextResponse.json({ error: 'Invoice record not found' }, { status: 404 });
      }

      const pdfUrl = invoice.attachedInvoice?.fileUrl;
      if (!pdfUrl) {
        return NextResponse.json({ error: 'No accountant invoice PDF attached for this record.' }, { status: 400 });
      }

      // Load PDF Buffer (from DB storedDocument, HTTP URL, or local disk)
      let pdfBuffer: Buffer | null = null;
      if (pdfUrl.includes('/api/admin/stored-documents/')) {
        const match = pdfUrl.match(/\/api\/admin\/stored-documents\/(\d+)/);
        if (match && match[1]) {
          const doc = await (prisma as any).storedDocument.findUnique({
            where: { id: Number(match[1]) },
            select: { fileData: true },
          });
          if (doc?.fileData) pdfBuffer = Buffer.from(doc.fileData);
        }
      }

      if (!pdfBuffer) {
        if (pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://')) {
          const res = await fetch(pdfUrl);
          if (res.ok) pdfBuffer = Buffer.from(await res.arrayBuffer());
        } else {
          const localPath = path.join(process.cwd(), 'public', pdfUrl.startsWith('/') ? pdfUrl.slice(1) : pdfUrl);
          if (fs.existsSync(localPath)) {
            pdfBuffer = fs.readFileSync(localPath);
          } else {
            const doc = await (prisma as any).storedDocument.findFirst({
              where: { fileName: invoice.attachedInvoice?.fileName || '' },
              select: { fileData: true },
            });
            if (doc?.fileData) pdfBuffer = Buffer.from(doc.fileData);
          }
        }
      }

      if (!pdfBuffer) {
        return NextResponse.json({ error: `Could not load invoice PDF to sign: ${pdfUrl}` }, { status: 404 });
      }

      const jobId = `inv_${invoice.id}_${Date.now()}`;
      state.jobs.push({
        jobId,
        invoiceId: invoice.id,
        companyName: invoice.companyName,
        isTest: false,
        pdfBase64: pdfBuffer.toString('base64'),
        status: 'PENDING',
        createdAt: Date.now(),
      });

      saveSharedState(state);

      return NextResponse.json({
        success: true,
        message: `Invoice for ${invoice.companyName} queued for USB DSC signing!`,
        jobId,
      });
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
      const { jobId } = body;
      if (!jobId) {
        return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
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
