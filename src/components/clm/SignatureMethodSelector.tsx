/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { userContractsApi } from "@/lib/clm/api";
import { toast } from "sonner";
import {
  Loader2, PenTool, RotateCcw, Check, FileSignature,
  Fingerprint, AlertCircle, Upload, Download,
  Image as ImageIcon, X
} from "lucide-react";

interface Props {
  contractId: string | number;
  onSigned: () => void;
}

type Method = "CANVAS" | "MANUAL";

export default function SignatureMethodSelector({ contractId, onSigned }: Props) {
  const [method, setMethod] = useState<Method>("CANVAS");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // Manual
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [manualPreview, setManualPreview] = useState<string | null>(null);

  // ── Canvas ─────────────────────────────────────────────────────────
  const drawGuide = (ctx: CanvasRenderingContext2D, w: number) => {
    ctx.save(); ctx.strokeStyle = "#E5E5E5"; ctx.lineWidth = 1; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(32, 150); ctx.lineTo(w - 32, 150); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();
    ctx.save(); ctx.font = "600 9px 'Inter', sans-serif"; ctx.fillStyle = "#C4C4C4";
    ctx.fillText("✕  SIGN HERE", 32, 170); ctx.restore();
  };

  const initCanvas = useCallback(() => {
    const c = canvasRef.current, ct = containerRef.current;
    if (!c || !ct) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = ct.getBoundingClientRect();
    c.style.width = rect.width + "px"; c.style.height = "200px";
    c.width = rect.width * dpr; c.height = 200 * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr); ctx.strokeStyle = "#1B1B1B"; ctx.lineWidth = 2.5;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    drawGuide(ctx, rect.width);
  }, []);

  useEffect(() => {
    if (method === "CANVAS") { const t = setTimeout(initCanvas, 120); return () => clearTimeout(t); }
  }, [method, initCanvas]);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const c = canvasRef.current; if (!c) return null;
    const r = c.getBoundingClientRect();
    if ("touches" in e) return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
    return { x: (e as React.MouseEvent).clientX - r.left, y: (e as React.MouseEvent).clientY - r.top };
  }, []);

  const onDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (loading || signed) return; const p = getPos(e); if (!p) return;
    setIsDrawing(true); lastPos.current = p;
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) { ctx.strokeStyle = "#1B1B1B"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(p.x, p.y); }
  }, [loading, signed, getPos]);

  const onMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || loading || signed) return; const p = getPos(e);
    if (!p || !lastPos.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) { ctx.lineTo(p.x, p.y); ctx.stroke(); setHasDrawn(true); }
    lastPos.current = p;
  }, [isDrawing, loading, signed, getPos]);

  const onUp = useCallback(() => { setIsDrawing(false); lastPos.current = null; }, []);

  const clearCanvas = () => {
    const c = canvasRef.current, ct = containerRef.current;
    if (!c || !ct) return;
    const ctx = c.getContext("2d")!; const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, c.width, c.height); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr); drawGuide(ctx, ct.getBoundingClientRect().width);
    setHasDrawn(false);
  };

  // ── Canvas Sign ────────────────────────────────────────────────────
  const handleCanvasSign = async () => {
    const c = canvasRef.current; if (!c || !hasDrawn) return;
    setLoading(true); setError(null);
    try {
      await userContractsApi.sign(Number(contractId), c.toDataURL("image/png"));
      setSigned(true);
      toast.success("Agreement signed. Awaiting management counter-signature.");
      onSigned();
    } catch (err: any) { setError(err.message || "Failed to sign"); }
    finally { setLoading(false); }
  };

  // ── Manual Handlers ────────────────────────────────────────────────
  const downloadPDF = () => { window.location.href = `/api/contracts/${contractId}/sign-manual`; };

  const handleManualFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setManualFile(f); setManualPreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : null); }
  };

  const uploadManual = async () => {
    if (!manualFile) return;
    setLoading(true); setError(null);
    const formData = new FormData();
    formData.append("file", manualFile);
    try {
      const res = await fetch(`/api/contracts/${contractId}/sign-manual`, { method: "POST", body: formData });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setSigned(true); toast.success("Signed copy uploaded."); onSigned();
    } catch (err: any) { setError(err.message || "Upload failed"); }
    finally { setLoading(false); }
  };

  // ── Success ────────────────────────────────────────────────────────
  if (signed) {
    return (
      <div className="p-10 bg-emerald-50 border border-emerald-200 text-center space-y-4">
        <div className="w-14 h-14 mx-auto flex items-center justify-center bg-emerald-500 text-white"><Check size={28} /></div>
        <h4 className="text-sm font-bold text-emerald-800 uppercase tracking-widest">Signature Applied</h4>
        <p className="text-[10px] text-emerald-600 font-medium uppercase tracking-widest">
          Your signature has been recorded. The final document will be generated after management counter-signs.
        </p>
      </div>
    );
  }

  const methods: { key: Method; icon: any; label: string }[] = [
    { key: "CANVAS", icon: PenTool, label: "Draw Signature" },
    { key: "MANUAL", icon: Upload, label: "Print & Sign" },
  ];

  return (
    <div className="space-y-6" style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}>
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 flex items-center gap-3">
          <AlertCircle size={16} className="text-red-500 shrink-0" />
          <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest flex-1">{error}</p>
          <button onClick={() => setError(null)}><X size={14} className="text-red-300" /></button>
        </div>
      )}

      {/* Tab selector */}
      <div className="grid grid-cols-2 gap-2 p-1.5 bg-neutral-100 border border-neutral-200">
        {methods.map(m => (
          <button key={m.key} onClick={() => { setMethod(m.key); setError(null); }}
            className={`flex items-center justify-center gap-3 py-4 transition-all ${
              method === m.key ? "bg-white shadow-lg text-[var(--primary)] border border-neutral-200" : "text-neutral-400 hover:text-neutral-600"
            }`}>
            <m.icon size={16} />
            <span className="text-[9px] font-black uppercase tracking-[0.15em]">{m.label}</span>
          </button>
        ))}
      </div>

      {/* ── CANVAS ──────────────────────────────────── */}
      {method === "CANVAS" && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PenTool size={14} className="text-neutral-400" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500">Draw Your Signature</span>
            </div>
            <button onClick={clearCanvas} disabled={!hasDrawn || loading}
              className="flex items-center gap-2 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-all disabled:opacity-30">
              <RotateCcw size={12} /> Clear
            </button>
          </div>
          <div ref={containerRef} className="w-full border-2 border-dashed overflow-hidden bg-white transition-colors"
            style={{ borderColor: isDrawing ? "var(--primary)" : hasDrawn ? "#22C55E" : "#E5E5E5" }}>
            <canvas ref={canvasRef} className="block w-full cursor-crosshair touch-none" style={{ height: "200px" }}
              onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
              onTouchStart={e => { e.preventDefault(); onDown(e); }}
              onTouchMove={e => { e.preventDefault(); onMove(e); }}
              onTouchEnd={onUp} />
          </div>
          <button onClick={handleCanvasSign} disabled={!hasDrawn || loading}
            className="w-full py-4 flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white bg-[var(--primary)] hover:brightness-110 transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Signing...</> : <><FileSignature size={16} /> Confirm & Sign</>}
          </button>
        </div>
      )}

      {/* ── MANUAL ──────────────────────────────────── */}
      {method === "MANUAL" && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="p-6 bg-neutral-50 border border-neutral-200 space-y-4">
            <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Step-by-Step</p>
            <ol className="text-[9px] text-neutral-400 font-medium space-y-2 list-decimal list-inside">
              <li>Download and print the contract PDF</li>
              <li>Sign it physically with pen</li>
              <li>Scan or photograph the signed copy</li>
              <li>Upload the file below</li>
            </ol>
            <button onClick={downloadPDF}
              className="w-full py-3 flex items-center justify-center gap-3 bg-white border border-neutral-200 text-neutral-700 text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-100 transition-all">
              <Download size={16} /> Download Contract PDF
            </button>
          </div>
          <label className="block w-full cursor-pointer">
            <div className="p-8 border-2 border-dashed border-neutral-200 bg-white hover:border-[var(--primary)] transition-colors text-center">
              <Upload size={24} className="mx-auto text-neutral-300 mb-3" />
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{manualFile ? manualFile.name : "Click to upload signed scan"}</p>
              <p className="text-[8px] text-neutral-300 uppercase tracking-widest mt-1">Images or PDF</p>
            </div>
            <input type="file" accept="image/*,application/pdf" onChange={handleManualFile} className="hidden" />
          </label>
          {manualPreview && (
            <div className="relative aspect-[4/3] border border-neutral-200 overflow-hidden bg-neutral-50">
              <img src={manualPreview} alt="Preview" className="object-contain w-full h-full" />
              <button onClick={() => { setManualFile(null); setManualPreview(null); }}
                className="absolute top-2 right-2 p-1.5 bg-white/90 border border-neutral-200"><X size={12} /></button>
            </div>
          )}
          {manualFile && !manualPreview && (
            <div className="p-4 bg-neutral-50 border border-neutral-200 flex items-center gap-3">
              <ImageIcon size={16} className="text-neutral-400" />
              <span className="text-[10px] font-bold text-neutral-600 uppercase truncate flex-1">{manualFile.name}</span>
              <button onClick={() => { setManualFile(null); setManualPreview(null); }}><X size={14} className="text-neutral-300" /></button>
            </div>
          )}
          <button onClick={uploadManual} disabled={loading || !manualFile}
            className="w-full py-4 flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white bg-[var(--primary)] hover:brightness-110 transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Uploading...</> : <><Upload size={16} /> Upload Signed Copy</>}
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <Fingerprint size={10} className="text-neutral-300" />
          <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-neutral-300">Sspacia Digital Signature Module</span>
        </div>
        <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-neutral-300">
          {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </div>
    </div>
  );
}
