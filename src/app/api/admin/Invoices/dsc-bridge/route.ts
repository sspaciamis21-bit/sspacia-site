import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const BRIDGE_SECRET = 'sspacia_dsc_secure_2026';

// Global state container for Node server to hold gateway heartbeats and active signing jobs
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

interface DscBridgeGlobal {
  gateway: {
    center: string;
    status: 'ONLINE' | 'TOKEN_UNPLUGGED' | 'OFFLINE';
    tokenLabel: string;
    lastSeen: number;
  } | null;
  jobs: Map<string, DscJob>;
  testInvoice: {
    signedPdfUrl: string | null;
    signedPdfName: string | null;
    signedAt: string | null;
    signerName: string | null;
  };
}

const g = global as unknown as { __sspaciaDscBridge?: DscBridgeGlobal };
if (!g.__sspaciaDscBridge) {
  g.__sspaciaDscBridge = {
    gateway: null,
    jobs: new Map<string, DscJob>(),
    testInvoice: {
      signedPdfUrl: null,
      signedPdfName: null,
      signedAt: null,
      signerName: null,
    },
  };
}
const state = g.__sspaciaDscBridge;

/**
 * GET /api/admin/Invoices/dsc-bridge
 * Returns live status of the Mercado USB DSC Gateway and test invoice status
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('reset') === 'true') {
    state.testInvoice = {
      signedPdfUrl: null,
      signedPdfName: null,
      signedAt: null,
      signerName: null,
    };
  }

  const now = Date.now();
  const lastSeen = state.gateway?.lastSeen || 0;
  const isOnline = Boolean(
    state.gateway &&
    state.gateway.status === 'ONLINE' &&
    now - lastSeen < 8000
  );

  const displayStatus = isOnline
    ? 'ONLINE'
    : state.gateway && now - lastSeen < 8000
    ? state.gateway.status
    : 'OFFLINE';

  return NextResponse.json({
    success: true,
    isOnline,
    gatewayStatus: displayStatus,
    center: state.gateway?.center || 'Mercado',
    tokenLabel: state.gateway?.tokenLabel || 'None',
    lastSeenMsAgo: lastSeen ? now - lastSeen : null,
    pendingJobsCount: Array.from(state.jobs.values()).filter((j) => j.status === 'PENDING').length,
    testInvoice: state.testInvoice,
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

      const pendingCount = Array.from(state.jobs.values()).filter((j) => j.status === 'PENDING').length;
      return NextResponse.json({ success: true, pendingJobsCount: pendingCount });
    }

    // ── 2. GATEWAY POLLS FOR SIGNING WORK ──────────────────────────────────
    if (action === 'POLL') {
      const { secret } = body;
      if (secret !== BRIDGE_SECRET) {
        return NextResponse.json({ error: 'Unauthorized gateway secret' }, { status: 401 });
      }

      // Mark gateway alive
      if (state.gateway) {
        state.gateway.lastSeen = Date.now();
      }

      // Find oldest pending job
      let nextJob: DscJob | null = null;
      for (const job of state.jobs.values()) {
        if (job.status === 'PENDING') {
          nextJob = job;
          break;
        }
      }

      if (nextJob) {
        nextJob.status = 'IN_PROGRESS';
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

      const job = state.jobs.get(jobId);
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

      // 4. If this is the test invoice, update test state
      if (job?.isTest || jobId.startsWith('test_')) {
        state.testInvoice = {
          signedPdfUrl: signedUrl,
          signedPdfName: fileName,
          signedAt: new Date().toISOString(),
          signerName: signerName || 'PRAVEEN DILIPKUMAR AGARWAL',
        };
      }

      // 5. If this is a real invoice record, update prisma
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
        } catch (invErr) {
          console.error('[DSC Bridge] Invoice record update error:', invErr);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Signed PDF successfully received and saved!',
        signedPdfUrl: signedUrl,
      });
    }

    // ── 4. WEB CLIENT QUEUES TEST INVOICE FOR SIGNING ──────────────────────
    if (action === 'QUEUE_TEST') {
      const now = Date.now();
      const lastSeen = state.gateway?.lastSeen || 0;
      const isOnline = Boolean(
        state.gateway &&
        state.gateway.status === 'ONLINE' &&
        now - lastSeen < 8000
      );

      if (!isOnline) {
        return NextResponse.json(
          {
            error:
              'Mercado DSC Gateway is offline. Please start the gateway script on the Mercado laptop with the USB key plugged in.',
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
      state.jobs.set(jobId, {
        jobId,
        companyName: 'Fake Client (Agarwal Complex) - Test DSC',
        isTest: true,
        pdfBase64: pdfBytes.toString('base64'),
        status: 'PENDING',
        createdAt: Date.now(),
      });

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

      const job = state.jobs.get(jobId);
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        status: job.status,
        signedPdfUrl: job.signedPdfUrl,
        signerName: job.signerName,
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
      return NextResponse.json({ success: true, message: 'Test invoice reset to unsigned' });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error('[DSC Bridge Route Error]:', error);
    return NextResponse.json({ error: error?.message || 'Server error in DSC bridge' }, { status: 500 });
  }
}
