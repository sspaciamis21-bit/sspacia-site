"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface Props {
  label: string;
  subtitle?: string;
  initials: string;
  accentColor?: string;
  onCapture: (dataUrl: string) => void;
  disabled?: boolean;
}

export default function SignaturePad({
  label,
  subtitle,
  initials,
  accentColor = "#7C6FFF",
  onCapture,
  disabled = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasContent, setHasContent] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // Make canvas resolution-aware
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [accentColor]);

  const getPos = useCallback(
    (e: MouseEvent | TouchEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      if ("touches" in e) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        };
      }
      return { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top };
    },
    []
  );

  const startDraw = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (disabled) return;
      const pos = getPos(e);
      if (!pos) return;
      setIsDrawing(true);
      lastPos.current = pos;
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
      }
    },
    [disabled, getPos]
  );

  const draw = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDrawing || disabled) return;
      const pos = getPos(e);
      if (!pos || !lastPos.current) return;
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        setHasContent(true);
      }
      lastPos.current = pos;
    },
    [isDrawing, disabled, getPos]
  );

  const stopDraw = useCallback(() => {
    setIsDrawing(false);
    lastPos.current = null;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Mouse events
    canvas.addEventListener("mousedown", startDraw);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDraw);
    canvas.addEventListener("mouseleave", stopDraw);
    
    // Touch events
    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      startDraw(e);
    }, { passive: false });
    canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      draw(e);
    }, { passive: false });
    canvas.addEventListener("touchend", stopDraw);
    
    return () => {
      canvas.removeEventListener("mousedown", startDraw);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", stopDraw);
      canvas.removeEventListener("mouseleave", stopDraw);
      canvas.removeEventListener("touchstart", startDraw);
      canvas.removeEventListener("touchmove", draw);
      canvas.removeEventListener("touchend", stopDraw);
    };
  }, [startDraw, draw, stopDraw]);

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
  }

  function handleConfirm() {
    const canvas = canvasRef.current;
    if (!canvas || !hasContent) return;
    onCapture(canvas.toDataURL("image/png"));
  }

  return (
    <div
      className={`clm-signature-pad border rounded-lg overflow-hidden transition-all bg-gray-50 dark:bg-gray-900 ${
        disabled ? "opacity-50 grayscale pointer-events-none" : ""
      }`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between bg-gray-100 dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center text-xs font-bold ring-1 ring-blue-200 dark:ring-blue-800">
            {initials}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{label}</div>
            {subtitle && <div className="text-[10px] text-gray-500 font-mono">{subtitle}</div>}
          </div>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="block w-full h-40 bg-white dark:bg-black cursor-crosshair"
      />

      {/* Actions */}
      <div className="px-4 py-2 border-t flex gap-2 justify-end bg-gray-50 dark:bg-gray-900">
        <button 
          onClick={clearCanvas} 
          disabled={!hasContent || disabled} 
          className="text-xs px-3 py-1.5 border rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30"
        >
          Clear
        </button>
        <button
          onClick={handleConfirm}
          disabled={!hasContent || disabled}
          className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-30"
        >
          Confirm Signature
        </button>
      </div>
    </div>
  );
}
