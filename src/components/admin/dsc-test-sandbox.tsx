'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ArrowLeft,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Usb,
  RotateCcw,
  Clock,
  Laptop,
} from 'lucide-react';
import { toast } from 'sonner';

interface DscTestSandboxProps {
  onBack: () => void;
  userRole?: string;
  userEmail?: string;
}

interface BridgeStatus {
  isOnline: boolean;
  gatewayStatus: 'ONLINE' | 'TOKEN_UNPLUGGED' | 'OFFLINE';
  center: string;
  tokenLabel: string;
  lastSeenMsAgo: number | null;
  pendingJobsCount: number;
  testInvoice?: {
    signedPdfUrl: string | null;
    signedPdfName: string | null;
    signedAt: string | null;
    signerName: string | null;
  };
}

export default function DscTestSandbox({ onBack, userEmail }: DscTestSandboxProps) {
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>({
    isOnline: false,
    gatewayStatus: 'OFFLINE',
    center: 'Mercado',
    tokenLabel: 'None',
    lastSeenMsAgo: null,
    pendingJobsCount: 0,
  });

  const [isSigning, setIsSigning] = useState(false);
  const [signingStepText, setSigningStepText] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Fetch bridge and test invoice status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/Invoices/dsc-bridge', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setBridgeStatus({
          isOnline: data.isOnline,
          gatewayStatus: data.gatewayStatus,
          center: data.center,
          tokenLabel: data.tokenLabel,
          lastSeenMsAgo: data.lastSeenMsAgo,
          pendingJobsCount: data.pendingJobsCount,
          testInvoice: data.testInvoice,
        });
      }
    } catch (err) {
      console.warn('Error fetching bridge status:', err);
    }
  }, []);

  // Poll status every 2.5 seconds
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2500);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Handle Apply Digital Signature
  const handleApplySignature = async () => {
    if (!bridgeStatus.isOnline) {
      toast.error(
        'Mercado USB Gateway is OFFLINE! Please start start-mercado-gateway.bat on the Mercado laptop with the USB key plugged in.',
        { duration: 5000 }
      );
      return;
    }

    setIsSigning(true);
    setSigningStepText('Dispatching signing job to Mercado USB Host...');

    try {
      // 1. Queue job
      const res = await fetch('/api/admin/Invoices/dsc-bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'QUEUE_TEST' }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch signing job');
      }

      const jobId = data.jobId;
      setSigningStepText('Waiting for Mercado USB Token to sign PDF...');

      // 2. Poll job status until completed (timeout after 25s)
      const startTime = Date.now();
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch('/api/admin/Invoices/dsc-bridge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'JOB_STATUS', jobId }),
          });
          const statusData = await statusRes.json();

          if (statusData.status === 'IN_PROGRESS') {
            setSigningStepText('Applying cryptographic signature inside "for SSPACIA INDIA PVT LTD" box...');
          }

          if (statusData.status === 'COMPLETED') {
            clearInterval(pollInterval);
            setIsSigning(false);
            setSigningStepText('');
            toast.success('Test Invoice Digitally Signed successfully via Mercado USB Token! ✅', {
              duration: 5000,
            });
            fetchStatus();
          } else if (statusData.status === 'FAILED') {
            clearInterval(pollInterval);
            setIsSigning(false);
            setSigningStepText('');
            toast.error(statusData.error || 'Signing failed on Mercado Host');
          } else if (Date.now() - startTime > 25000) {
            clearInterval(pollInterval);
            setIsSigning(false);
            setSigningStepText('');
            toast.error('Signing timed out. Make sure the Python gateway script is running on the Mercado laptop.');
          }
        } catch {
          // Retry next tick
        }
      }, 1200);
    } catch (err: any) {
      setIsSigning(false);
      setSigningStepText('');
      toast.error(err.message || 'Error triggering digital signature');
    }
  };

  // Handle Reset Test Invoice
  const handleResetTest = async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/admin/Invoices/dsc-bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET_TEST' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Test invoice reset to unsigned state');
        fetchStatus();
      }
    } catch {
      toast.error('Failed to reset test invoice');
    } finally {
      setIsResetting(false);
    }
  };

  const isSigned = Boolean(bridgeStatus.testInvoice?.signedPdfUrl);

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--outline-variant)]/40">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--primary)] hover:underline mb-2 cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Active Invoices
          </button>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 font-black text-[10px] uppercase tracking-wider rounded">
              🧪 Isolated Testing Sandbox
            </span>
            <span className="text-xs text-neutral-500 font-mono">
              Live Invoices Unaffected
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-[#1B1C1C] mt-1">
            DSC Remote Digital Signature Sandbox
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 mt-1">
            Simulates an Agarwal Complex CM applying digital signature remotely via the Mercado Host USB Token.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchStatus}
            className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 rounded transition-colors cursor-pointer"
            title="Refresh Bridge Status"
          >
            <RefreshCw size={13} /> Refresh Status
          </button>
        </div>
      </div>

      {/* GATEWAY STATUS CARD */}
      <div
        className={`p-5 rounded-lg border transition-all ${
          bridgeStatus.isOnline
            ? 'bg-emerald-50/70 border-emerald-300 shadow-xs'
            : bridgeStatus.gatewayStatus === 'TOKEN_UNPLUGGED'
            ? 'bg-amber-50/70 border-amber-300 shadow-xs'
            : 'bg-red-50/60 border-red-200 shadow-xs'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`p-2.5 rounded-full shrink-0 ${
                bridgeStatus.isOnline
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : bridgeStatus.gatewayStatus === 'TOKEN_UNPLUGGED'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-red-500 text-white shadow-sm'
              }`}
            >
              {bridgeStatus.isOnline ? (
                <ShieldCheck size={24} />
              ) : bridgeStatus.gatewayStatus === 'TOKEN_UNPLUGGED' ? (
                <Usb size={24} />
              ) : (
                <Laptop size={24} />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-2.5 h-2.5 rounded-full ${
                    bridgeStatus.isOnline
                      ? 'bg-emerald-500 animate-pulse'
                      : bridgeStatus.gatewayStatus === 'TOKEN_UNPLUGGED'
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  }`}
                />
                <span className="font-extrabold text-sm uppercase tracking-wider text-[#1B1C1C]">
                  {bridgeStatus.isOnline
                    ? `Mercado Host Gateway: ONLINE & READY TO SIGN`
                    : bridgeStatus.gatewayStatus === 'TOKEN_UNPLUGGED'
                    ? `Mercado Host: CONNECTED BUT USB TOKEN IS UNPLUGGED`
                    : `Mercado Host Gateway: OFFLINE`}
                </span>
              </div>

              <div className="mt-1 text-xs text-neutral-700 flex flex-wrap items-center gap-3">
                <span>
                  <strong>Host Centre:</strong> {bridgeStatus.center}
                </span>
                <span>•</span>
                <span>
                  <strong>Signer Certificate:</strong>{' '}
                  <code className="bg-white/80 px-1.5 py-0.5 rounded border border-neutral-200 text-[11px] font-mono text-teal-950 font-bold">
                    {bridgeStatus.tokenLabel}
                  </code>
                </span>
                {bridgeStatus.lastSeenMsAgo !== null && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-neutral-500">
                      <Clock size={11} /> Last Heartbeat:{' '}
                      {Math.round(bridgeStatus.lastSeenMsAgo / 1000)}s ago
                    </span>
                  </>
                )}
              </div>

              {!bridgeStatus.isOnline && (
                <div className="mt-2.5 text-xs text-neutral-800 bg-white/90 p-2.5 rounded border border-neutral-300">
                  💡 <strong>To start the Mercado Host Gateway:</strong>
                  <ol className="list-decimal list-inside mt-1 space-y-0.5 text-[11px] text-neutral-700">
                    <li>Make sure the Watchdata ProxKey USB token is inserted into this Mercado laptop.</li>
                    <li>
                      Double-click <code className="bg-neutral-100 px-1 py-0.2 rounded font-mono font-bold text-teal-800">start-mercado-gateway.bat</code> in the project folder.
                    </li>
                    <li>This card will turn green automatically within 3 seconds!</li>
                  </ol>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                bridgeStatus.isOnline
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-neutral-200 text-neutral-700'
              }`}
            >
              {bridgeStatus.isOnline ? '🟢 Connected' : '🔴 Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* FAKE INVOICE TABLE FOR AGARWAL COMPLEX */}
      <div className="bg-white border border-[var(--outline-variant)]/60 shadow-xs rounded-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-200 bg-neutral-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-black text-lg text-[#1B1C1C] flex items-center gap-2">
              <FileText className="text-[var(--primary)]" size={18} />
              Test Invoice Entry (Simulating Agarwal Complex Centre)
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Simulates how an invoice awaiting CM review looks to the Agarwal Complex CM before and after digital signing.
            </p>
          </div>

          {isSigned && (
            <button
              type="button"
              onClick={handleResetTest}
              disabled={isResetting}
              className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 rounded transition-colors self-start sm:self-auto cursor-pointer"
            >
              {isResetting ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
              Reset Test to Unsigned
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#004D40] text-white uppercase text-[10px] tracking-wider border-b border-[#00382E]">
                <th className="py-3 px-3 font-bold text-center w-12">Sr.No</th>
                <th className="py-3 px-4 font-bold">Company Name</th>
                <th className="py-3 px-3 font-bold">Payment Cycle</th>
                <th className="py-3 px-3 font-bold">Node &amp; Person</th>
                <th className="py-3 px-3 font-bold">Cabin &amp; Seats</th>
                <th className="py-3 px-3 font-bold">Billing Month</th>
                <th className="py-3 px-3 font-bold text-right">Total Amt (₹)</th>
                <th className="py-3 px-4 font-bold text-center">Workflow Status</th>
                <th className="py-3 px-4 font-bold text-center w-64">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              <tr className="hover:bg-neutral-50 transition-colors">
                <td className="py-4 px-3 font-mono font-bold text-center text-neutral-400">
                  #TEST
                </td>

                <td className="py-4 px-4 font-medium text-neutral-900">
                  <div className="font-bold text-neutral-900 text-sm">
                    Fake Client (Agarwal Complex) - Test DSC
                  </div>
                  <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                    GST: 24ABCDE1234F1Z5 • Test Inv #479
                  </div>
                </td>

                <td className="py-4 px-3">
                  <span className="px-2 py-0.5 bg-teal-50 border border-teal-200 text-teal-800 rounded text-[10px] font-bold uppercase tracking-wider">
                    Monthly
                  </span>
                  <div className="text-[10px] text-neutral-500 mt-1">Due: 5th</div>
                </td>

                <td className="py-4 px-3">
                  <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-900 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-max">
                    🏛️ Agarwal Complex
                  </span>
                  <div className="text-[10px] text-neutral-500 mt-1">agarwal.cm@sspacia.com</div>
                </td>

                <td className="py-4 px-3">
                  <div className="font-medium text-neutral-800">Dedicated Cabin</div>
                  <div className="text-[10px] text-neutral-500">5 seats @ ₹6,000</div>
                </td>

                <td className="py-4 px-3 font-semibold text-neutral-700">
                  October 2026
                </td>

                <td className="py-4 px-3 text-right font-mono font-bold text-sm text-neutral-900">
                  ₹7,080
                </td>

                {/* WORKFLOW STATUS */}
                <td className="py-4 px-4 text-center">
                  {isSigned ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="px-2.5 py-1 bg-emerald-100 border border-emerald-300 text-emerald-900 font-extrabold text-[10px] uppercase tracking-wider rounded-sm flex items-center gap-1 shadow-2xs">
                        <CheckCircle2 size={12} className="text-emerald-700" /> Digitally Signed ✅
                      </span>
                      <span className="text-[9px] text-emerald-700 font-semibold">
                        Ready for CM Approval
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <span className="px-2.5 py-1 bg-amber-100 border border-amber-300 text-amber-900 font-bold text-[10px] uppercase tracking-wider rounded-sm flex items-center gap-1 shadow-2xs">
                        <Clock size={11} className="text-amber-700" /> Pending CM Approval
                      </span>
                      <span className="px-1.5 py-0.5 bg-purple-100 border border-purple-300 text-purple-900 font-black text-[9px] uppercase tracking-wider rounded">
                        ✍️ Digital Sign Required
                      </span>
                    </div>
                  )}
                </td>

                {/* ACTION COLUMN */}
                <td className="py-4 px-4 text-center">
                  <div className="flex flex-col gap-2 items-center">
                    {/* View Attached Simple PDF */}
                    <a
                      href="/uploads/test-invoices/HARDIK.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 w-full rounded border border-neutral-300 transition-colors"
                    >
                      <FileText size={12} className="text-neutral-600" /> View Attached Tally PDF
                    </a>

                    {/* Apply Digital Signature Button OR View Signed PDF */}
                    {!isSigned ? (
                      <button
                        type="button"
                        onClick={handleApplySignature}
                        disabled={isSigning}
                        className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10.5px] uppercase tracking-wider flex items-center justify-center gap-1.5 w-full rounded shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                        title="Calls Mercado USB Host to stamp digital signature"
                      >
                        {isSigning ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            <span>Signing Remotely...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={13} />
                            <span>Apply Digital Signature</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <a
                        href={bridgeStatus.testInvoice?.signedPdfUrl || '/uploads/test-invoices/HARDIK.pdf'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10.5px] uppercase tracking-wider flex items-center justify-center gap-1.5 w-full rounded shadow-xs transition-colors"
                      >
                        <ExternalLink size={13} />
                        <span>📥 View Signed PDF</span>
                      </a>
                    )}

                    {isSigning && (
                      <div className="text-[10px] text-teal-800 font-semibold animate-pulse text-center">
                        {signingStepText}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* HOW TO RUN THE CROSS-PC TEST GUIDE */}
      <div className="p-5 bg-neutral-50 border border-neutral-200 rounded-sm">
        <h3 className="font-bold text-sm text-[#1B1C1C] flex items-center gap-2">
          <span>📋</span> How to Perform the Test Right Now
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-xs text-neutral-700 leading-relaxed">
          <div className="p-3 bg-white rounded border border-neutral-200 space-y-1.5">
            <div className="font-bold text-teal-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-black inline-flex items-center justify-center text-[11px]">
                1
              </span>
              On This Laptop (Mercado Host):
            </div>
            <ul className="list-disc list-inside space-y-1 text-neutral-600 pl-1">
              <li>Plug your ProxKey USB Dongle into this laptop.</li>
              <li>
                Run: <code className="bg-neutral-100 px-1 py-0.5 rounded font-mono font-bold text-teal-900">start-mercado-gateway.bat</code>
              </li>
              <li>Notice the status card above turns <strong className="text-emerald-700">🟢 ONLINE</strong>.</li>
            </ul>
          </div>

          <div className="p-3 bg-white rounded border border-neutral-200 space-y-1.5">
            <div className="font-bold text-purple-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 font-black inline-flex items-center justify-center text-[11px]">
                2
              </span>
              On Your Other PC (Agarwal Complex CM):
            </div>
            <ul className="list-disc list-inside space-y-1 text-neutral-600 pl-1">
              <li>Open <code className="bg-neutral-100 px-1 py-0.5 rounded font-mono font-bold text-purple-900">sspacia.com/admin/Invoices</code> and click <strong>TEST</strong>.</li>
              <li>Click <strong>"Apply Digital Signature"</strong> on the fake invoice row.</li>
              <li>
                Watch this Mercado laptop automatically sign the PDF and return it to the Agarwal screen in ~2 seconds!
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
