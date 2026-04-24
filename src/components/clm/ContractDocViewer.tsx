'use client';

import { useEffect, useState, useMemo } from 'react';
import { Loader2, MessageCircle } from 'lucide-react';
import { PaginatedDocViewer } from './PaginatedDocViewer';

interface ContractDocViewerProps {
  /** Tiptap JSON string (existing contract content) */
  content?: string;
  /** Template params - when provided, fetches fresh HTML from DOCX */
  templateParams?: {
    date?: string;
    customerOrg?: string;
    customerName?: string;
    customerDesignation?: string;
    customerPan?: string;
    userId?: string;
    productType?: string;
    productName?: string;
    centerAddress?: string;
    period?: string;
    startDate?: string;
    expiryDate?: string;
    cost?: string;
    costInWords?: string;
    capacity?: string;
    calculatedCost?: string;
  };
  onNegotiate?: (selectedText: string) => void;
}

/** Convert Tiptap JSON to basic HTML for display in the paginated viewer */
function tiptapToHtml(json: object): string {
  const doc = json as { type: string; content?: object[] };
  if (!doc || doc.type !== 'doc' || !doc.content) return '';

  function nodeToHtml(node: {
    type: string;
    attrs?: Record<string, string | number | null>;
    content?: object[];
    marks?: Array<{ type: string }>;
    text?: string;
  }): string {
    if (node.type === 'text') {
      let t = (node.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (node.marks) {
        for (const m of node.marks) {
          if (m.type === 'bold') t = `<strong>${t}</strong>`;
          if (m.type === 'italic') t = `<em>${t}</em>`;
          if (m.type === 'underline') t = `<u>${t}</u>`;
        }
      }
      return t;
    }

    const inner = (node.content || []).map(c => nodeToHtml(c as Parameters<typeof nodeToHtml>[0])).join('');
    const align = node.attrs?.textAlign ? ` style="text-align:${node.attrs.textAlign}"` : '';

    switch (node.type) {
      case 'heading':
        return `<h${node.attrs?.level || 1}${align}>${inner}</h${node.attrs?.level || 1}>`;
      case 'paragraph':
        return `<p${align}>${inner}</p>`;
      case 'bulletList':
        return `<ul>${inner}</ul>`;
      case 'orderedList':
        return `<ol>${inner}</ol>`;
      case 'listItem':
        return `<li>${inner}</li>`;
      case 'hardBreak':
        return '<br/>';
      case 'table':
        return `<table style="width:100%; border-collapse:collapse; margin-top:20pt;">${inner}</table>`;
      case 'tableRow':
        return `<tr>${inner}</tr>`;
      case 'tableCell':
        const cellAlign = node.attrs?.textAlign ? `text-align:${node.attrs.textAlign};` : '';
        return `<td style="${cellAlign} width:50%; vertical-align:top; padding:10pt 0;">${inner}</td>`;
      default:
        return inner;
    }
  }

  return doc.content.map(n => nodeToHtml(n as Parameters<typeof nodeToHtml>[0])).join('');
}

/** Parse tiptap JSON content to HTML synchronously */
function parseContentToHtml(content?: string): string | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    return tiptapToHtml(parsed);
  } catch {
    return `<p>${content}</p>`;
  }
}

export function ContractDocViewer({ content, templateParams, onNegotiate }: ContractDocViewerProps) {
  // For DOCX-based rendering (async fetch), we use state
  // Using null = not yet fetched, string = ready
  const [fetchedHtml, setFetchedHtml] = useState<string | null>(null);
  const [fetchDone, setFetchDone] = useState(!templateParams); // if no templateParams, starts as "done"
  const [error, setError] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<{ text: string, x: number, y: number } | null>(null);

  // For Tiptap JSON content, derive HTML synchronously with useMemo (no setState in effect)
  const localHtml = useMemo(() => {
    if (templateParams) return null; // handled by fetch
    return parseContentToHtml(content);
  }, [content, templateParams]);

  useEffect(() => {
    if (!templateParams) return;
    // Reset on new templateParams
    setFetchDone(false);
    setFetchedHtml(null);
    setError(null);

    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(templateParams)) {
      if (v) params.set(k, v);
    }
    fetch(`/api/contracts/doc-preview?${params.toString()}`)
      .then(r => r.json())
      .then((d: { html?: string; error?: string }) => {
        if (d.error) throw new Error(d.error);
        setFetchedHtml(d.html ?? null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setFetchDone(true));
  }, [templateParams]);

  const loading = !fetchDone;
  const html = templateParams ? fetchedHtml : localHtml;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 text-[var(--clm-primary)] animate-spin" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
          Loading Document...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-red-400 text-sm font-bold">{error}</p>
      </div>
    );
  }

  if (!html) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
          No content available
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative"
      onMouseUp={(e) => {
        if (!onNegotiate) return;
        const sel = window.getSelection();
        const text = sel?.toString().trim();
        if (text && sel && !sel.isCollapsed && sel.rangeCount > 0) {
           const range = sel.getRangeAt(0);
           const rect = range.getBoundingClientRect();
           setSelectedText({ text, x: rect.left + rect.width / 2, y: Math.max(rect.top, 60) });
        } else {
           // Allow clicking inside the text to dismiss selection without breaking UI
           setTimeout(() => {
             const currentSel = window.getSelection();
             if (!currentSel || currentSel.isCollapsed) {
               setSelectedText(null);
             }
           }, 10);
        }
      }}
    >
      <PaginatedDocViewer htmlContent={html} charsPerPage={3200} />
      
      {selectedText && (
          <div 
             className="fixed z-50 animate-in fade-in zoom-in-95 duration-200"
             style={{ top: selectedText.y - 10, left: selectedText.x, transform: 'translate(-50%, -100%)' }}
          >
            <button
               onMouseDown={(e) => {
                   e.preventDefault(); 
                   e.stopPropagation();
                   if (onNegotiate) {
                     onNegotiate(selectedText.text);
                   }
                   setSelectedText(null);
                   window.getSelection()?.removeAllRanges();
               }}
               className="flex items-center gap-2 bg-neutral-900 text-white px-4 py-2 rounded-none shadow-xl hover:bg-black transition-all font-bold text-[10px] uppercase tracking-widest whitespace-nowrap"
            >
               <MessageCircle size={14} /> Add to negotiation
            </button>
          </div>
      )}
    </div>
  );
}
