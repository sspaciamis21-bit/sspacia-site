'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';

interface PaginatedDocViewerProps {
  htmlContent: string;
  /** number of chars per page (approximate) */
  charsPerPage?: number;
}

// Split HTML into pages by inserting page breaks at natural paragraph boundaries
function splitHtmlIntoPages(html: string, charsPerPage = 3200): string[] {
  // Parse into blocks (tags)
  const blockRegex = /<(h[1-6]|p|li|ol|ul)[^>]*>[\s\S]*?<\/\1>/gi;
  const blocks: string[] = [];
  let match: RegExpExecArray | null;

  // Reset regex
  blockRegex.lastIndex = 0;

  while ((match = blockRegex.exec(html)) !== null) {
    blocks.push(match[0]);
  }

  // If no blocks matched, fall back to splitting by character count
  if (blocks.length === 0) {
    const pages: string[] = [];
    for (let i = 0; i < html.length; i += charsPerPage) {
      pages.push(html.slice(i, i + charsPerPage));
    }
    return pages.length ? pages : [html];
  }

  const pages: string[] = [];
  let currentPage = '';
  let currentLen = 0;

  for (const block of blocks) {
    const stripped = block.replace(/<[^>]+>/g, '');
    if (currentLen > 0 && currentLen + stripped.length > charsPerPage) {
      pages.push(currentPage);
      currentPage = block;
      currentLen = stripped.length;
    } else {
      currentPage += block;
      currentLen += stripped.length;
    }
  }

  if (currentPage) pages.push(currentPage);
  return pages.length ? pages : [html];
}

export function PaginatedDocViewer({ htmlContent, charsPerPage = 3200 }: PaginatedDocViewerProps) {
  const pages = useMemo(() => splitHtmlIntoPages(htmlContent, charsPerPage), [htmlContent, charsPerPage]);
  const [currentPage, setCurrentPage] = useState(0);

  const totalPages = pages.length;

  const goTo = (p: number) => {
    if (p >= 0 && p < totalPages) setCurrentPage(p);
  };

  return (
    <div className="flex flex-col items-center w-full gap-6">
      {/* Page display */}
      <div className="w-full flex justify-center">
        <div
          className="doc-page"
          style={{
            background: '#fff',
            width: '210mm',
            minHeight: '297mm',
            padding: '20mm 15mm',
            boxShadow: '0 1px 10px rgba(0,0,0,0.05)',
            borderRadius: '0',
            position: 'relative',
            fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            fontSize: '10pt',
            lineHeight: '1.6',
            color: '#111',
            maxWidth: '100%',
            boxSizing: 'border-box',
          }}
        >
          {/* Page number watermark */}
          <div style={{
            position: 'absolute',
            bottom: '12mm',
            right: '20mm',
            fontSize: '9pt',
            color: '#aaa',
            fontFamily: 'Arial, sans-serif',
            userSelect: 'none',
          }}>
            Page {currentPage + 1} of {totalPages}
          </div>

          <div
            className="agreement-content"
            dangerouslySetInnerHTML={{ __html: pages[currentPage] || '' }}
          />
        </div>
      </div>

      {/* Navigation bar */}
      <div className="flex items-center gap-4 bg-white border border-neutral-200 rounded-none px-4 py-2 shadow-sm">
        <button
          onClick={() => goTo(currentPage - 1)}
          disabled={currentPage === 0}
          className={`p-2 rounded-xl transition-all flex items-center justify-center
            ${currentPage === 0
              ? 'opacity-30 cursor-not-allowed text-neutral-300'
              : 'text-neutral-600 hover:bg-neutral-50 cursor-pointer'
            }`}
          title="Previous page"
        >
          <ChevronLeft size={20} />
        </button>

        {/* Page pills */}
        <div className="flex items-center gap-2">
          {Array.from({ length: totalPages }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              className={`transition-all rounded-lg text-xs font-bold px-3 py-1.5
                ${idx === currentPage
                  ? 'bg-[var(--clm-primary)] text-white shadow-sm'
                  : 'text-neutral-400 hover:bg-neutral-50 hover:text-neutral-900'
                }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        <button
          onClick={() => goTo(currentPage + 1)}
          disabled={currentPage === totalPages - 1}
          className={`p-2 rounded-xl transition-all flex items-center justify-center
            ${currentPage === totalPages - 1
              ? 'opacity-30 cursor-not-allowed text-neutral-300'
              : 'text-neutral-600 hover:bg-neutral-50 cursor-pointer'
            }`}
          title="Next page"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Page info */}
      <div className="flex items-center gap-2 text-neutral-400">
        <FileText size={12} />
        <span className="text-[10px] font-bold uppercase tracking-widest">
          Page {currentPage + 1} of {totalPages}
        </span>
      </div>

      <style>{`
        .agreement-content, .agreement-content * {
          font-family: var(--font-inter), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
        }
        .agreement-content h1 {
          font-size: 14pt;
          font-weight: bold;
          text-align: center;
          text-transform: uppercase;
          margin-bottom: 18pt;
          margin-top: 0;
          letter-spacing: 1px;
        }
        .agreement-content h2 {
          font-size: 12pt;
          font-weight: bold;
          margin-bottom: 10pt;
          margin-top: 14pt;
        }
        .agreement-content p {
          margin-bottom: 10pt;
          text-align: justify;
          font-size: 11pt;
        }
        .agreement-content ol {
          padding-left: 20pt;
          margin-bottom: 10pt;
        }
        .agreement-content ul {
          padding-left: 20pt;
          margin-bottom: 10pt;
        }
        .agreement-content li {
          margin-bottom: 8pt;
          text-align: justify;
          font-size: 11pt;
        }
        .agreement-content strong {
          font-weight: bold;
        }
        .agreement-content em {
          font-style: italic;
        }
        .agreement-content sup {
          font-size: 7pt;
          vertical-align: super;
        }
      `}</style>
    </div>
  );
}
