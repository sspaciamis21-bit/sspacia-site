"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { adminContractsApi } from "@/lib/clm/api";
import { toast } from "sonner";
import {
  X, Loader2, ShieldCheck, AlertCircle, PenTool,
  RotateCcw, Check, FileSignature, Fingerprint
} from "lucide-react";

interface Props {
  contractId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManagerSignatureDialog({ contractId, isOpen, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signerName, setSignerName] = useState("");

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // ── Canvas Setup ───────────────────────────────────────────────────
  const drawGuide = (ctx: CanvasRenderingContext2D, w: number) => {
    ctx.save(); ctx.strokeStyle = "#E5E5E5"; ctx.lineWidth = 1; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(32, 155); ctx.lineTo(w - 32, 155); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();
    ctx.save(); ctx.font = "600 9px 'Inter', sans-serif"; ctx.fillStyle = "#C4C4C4";
    ctx.fillText("✕  SIGN HERE", 32, 175); ctx.restore();
  };

  const initCanvas = useCallback(() => {
    const c = canvasRef.current, ct = containerRef.current;
    if (!c || !ct) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = ct.getBoundingClientRect();
    c.style.width = rect.width + "px"; c.style.height = "190px";
    c.width = rect.width * dpr; c.height = 190 * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr); ctx.strokeStyle = "#1B1B1B"; ctx.lineWidth = 2.5;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    drawGuide(ctx, rect.width);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setHasDrawn(false); setError(null);
      const t = setTimeout(initCanvas, 120);
      return () => clearTimeout(t);
    }
  }, [isOpen, initCanvas]);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const c = canvasRef.current; if (!c) return null;
    const r = c.getBoundingClientRect();
    if ("touches" in e) return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
    return { x: (e as React.MouseEvent).clientX - r.left, y: (e as React.MouseEvent).clientY - r.top };
  }, []);

  const onDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (loading) return; const p = getPos(e); if (!p) return;
    setIsDrawing(true); lastPos.current = p;
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) { ctx.strokeStyle = "#1B1B1B"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(p.x, p.y); }
  }, [loading, getPos]);

  const onMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || loading) return; const p = getPos(e);
    if (!p || !lastPos.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) { ctx.lineTo(p.x, p.y); ctx.stroke(); setHasDrawn(true); }
    lastPos.current = p;
  }, [isDrawing, loading, getPos]);

  const onUp = useCallback(() => { setIsDrawing(false); lastPos.current = null; }, []);

  const clearCanvas = () => {
    const c = canvasRef.current, ct = containerRef.current;
    if (!c || !ct) return;
    const ctx = c.getContext("2d")!; const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, c.width, c.height); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr); drawGuide(ctx, ct.getBoundingClientRect().width);
    setHasDrawn(false);
  };

  // ── Sign Handler ───────────────────────────────────────────────────
  const handleSign = async () => {
    const c = canvasRef.current; if (!c || !hasDrawn) return;
    setLoading(true); setError(null);
    try {
      await adminContractsApi.signCounter(contractId, {
        method: "CANVAS", signatureData: c.toDataURL("image/png"),
        signerName: signerName.trim() || "Authorized Manager"
      });
      toast.success("Counter-signature applied. Final document is being generated.");
      onSuccess(); onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign");
    } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full max-w-2xl shadow-2xl border border-neutral-200 overflow-hidden"
        style={{ animation: "slideUp .3s cubic-bezier(.16,1,.3,1)", fontFamily: "var(--font-inter),'Inter',sans-serif" }}>

        {/* Header */}
        <div className="px-8 py-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 flex items-center justify-center bg-orange-500/10 border border-orange-500/20">
              <ShieldCheck className="text-orange-500 w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-900">Management Counter-Sign</h2>
              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-[0.15em] mt-0.5">Official Authorization</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-neutral-200 transition-colors">
            <X size={16} className="text-neutral-400" />
          </button>
        </div>

        <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 flex items-center gap-3">
              <AlertCircle size={16} className="text-red-500 shrink-0" />
              <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">{error}</p>
            </div>
          )}

          {/* Name input */}
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-[0.2em] ml-1">Signer Name (optional)</label>
            <input type="text" placeholder="Full Name for Record" value={signerName}
              onChange={e => setSignerName(e.target.value)} disabled={loading}
              className="w-full px-5 py-3 bg-neutral-50 border border-neutral-200 outline-none text-sm font-bold uppercase tracking-widest focus:border-orange-500/50 transition-all" />
          </div>

          {/* Canvas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <PenTool size={14} className="text-neutral-400" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500">Draw Your Signature</span>
              </div>
              <button onClick={clearCanvas} disabled={!hasDrawn || loading}
                className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-neutral-400 hover:text-neutral-600 disabled:opacity-30">
                <RotateCcw size={12} /> Clear
              </button>
            </div>
            <div ref={containerRef} className="w-full border-2 border-dashed overflow-hidden bg-white transition-colors"
              style={{ borderColor: isDrawing ? "#F97316" : hasDrawn ? "#22C55E" : "#E5E5E5" }}>
              <canvas ref={canvasRef} className="block w-full cursor-crosshair touch-none" style={{ height: "190px" }}
                onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
                onTouchStart={e => { e.preventDefault(); onDown(e); }}
                onTouchMove={e => { e.preventDefault(); onMove(e); }}
                onTouchEnd={onUp} />
            </div>
            <button onClick={handleSign} disabled={!hasDrawn || loading}
              className="w-full py-4 flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white bg-orange-500 hover:bg-orange-600 transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Applying...</> : <><FileSignature size={16} /> Confirm & Counter-Sign</>}
            </button>
          </div>

          {/* Attestation */}
          <div className="p-5 bg-neutral-50 border border-neutral-100 flex items-start gap-4">
            <Check size={16} className="text-emerald-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-neutral-700 uppercase tracking-widest">Management Attestation</p>
              <p className="text-[9px] text-neutral-400 font-medium leading-relaxed">
                By applying this signature, I verify authority to execute this contract on behalf of Sspacia.
                The final document will be generated after this counter-signature is applied.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-3 border-t border-neutral-100 bg-neutral-50 flex items-center gap-2">
          <Fingerprint size={10} className="text-neutral-300" />
          <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-neutral-300">Sspacia Digital Signature v1.0</span>
        </div>

        {loading && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-50">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.3em] animate-pulse">Applying Counter-Signature...</p>
            <p className="text-[8px] text-neutral-300 uppercase tracking-[0.2em] mt-2">Generating final document</p>
          </div>
        )}
      </div>

      <style jsx>{`@keyframes slideUp { from { opacity:0; transform: translateY(20px) scale(.98); } to { opacity:1; transform: translateY(0) scale(1); } }`}</style>
    </div>
  );
}
