'use client';

import React, { useMemo } from 'react';

interface ContentRendererProps {
  content: string | any;
  className?: string;
}

/**
 * Premium Tiptap JSON Renderer
 * High-fidelity rendering for legal documents with serif typography.
 */
export const ContentRenderer: React.FC<ContentRendererProps> = ({ content, className = '' }) => {
  const parsedContent = useMemo(() => {
    try {
      if (!content) return null;
      return typeof content === 'string' ? JSON.parse(content) : content;
    } catch (e: any) {
      console.error("Failed to parse content in ContentRenderer", e);
      return null;
    }
  }, [content]);


  if (!parsedContent || !parsedContent.content) {
    return (
      <div className="flex items-center justify-center h-40 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/50">
        <p className="text-gray-400 italic text-sm">No agreement content available.</p>
      </div>
    );
  }

  const renderContent = (nodes: any[]) => {
    if (!nodes) return null;
    return nodes.map((node: any, idx: number) => {
      if (node.type === 'text') {
        let element = <>{node.text}</>;
        if (node.marks) {
          node.marks.forEach((mark: any) => {
            if (mark.type === 'bold') element = <strong>{element}</strong>;
            if (mark.type === 'italic') element = <em>{element}</em>;
            if (mark.type === 'underline') element = <u className="decoration-1 underline-offset-4">{element}</u>;
            if (mark.type === 'link') {
              element = <a href={mark.attrs.href} target="_blank" rel="noreferrer" className="text-[var(--primary)] underline">{element}</a>;
            }
          });
        }
        return <React.Fragment key={idx}>{element}</React.Fragment>;
      }
      return null;
    });
  };

  const renderNode = (node: any, index: number) => {
    const alignClass = node.attrs?.textAlign ? `text-${node.attrs.textAlign}` : '';
    
    switch (node.type) {
      case 'heading': {
        const level = node.attrs?.level || 1;
        const Tag = `h${level}` as any;
        const headingStyles: Record<number, string> = {
          1: 'text-3xl font-extrabold mb-8 mt-4 tracking-tight uppercase border-b-2 border-black pb-4 text-center',
          2: 'text-xl font-bold mb-4 mt-8 tracking-tight uppercase',
          3: 'text-lg font-bold mb-3 mt-6 uppercase',
        };
        return (
          <Tag key={index} className={`${headingStyles[level] || headingStyles[1]} ${alignClass} font-sans text-black`}>
            {renderContent(node.content)}
          </Tag>
        );
      }

      case 'paragraph':
        return (
          <p key={index} className={`mb-5 text-[15px] leading-relaxed text-gray-800 font-sans ${alignClass}`}>
            {renderContent(node.content)}
          </p>
        );
      case 'bulletList':
        return (
          <ul key={index} className="list-disc pl-8 mb-6 space-y-3 font-sans text-gray-800">
            {node.content?.map((li: any, i: number) => (
              <li key={i}>{li.content?.map((p: any) => renderContent(p.content))}</li>
            ))}
          </ul>
        );
      case 'orderedList':
        return (
          <ol key={index} className="list-decimal pl-8 mb-6 space-y-3 font-sans text-gray-800">
            {node.content?.map((li: any, i: number) => (
              <li key={i}>{li.content?.map((p: any) => renderContent(p.content))}</li>
            ))}
          </ol>
        );
      case 'blockquote':
        return (
          <blockquote key={index} className="border-l-4 border-gray-200 pl-6 my-8 italic text-gray-600 font-sans">
            {node.content?.map((p: any) => renderContent(p.content))}
          </blockquote>
        );

      case 'horizontalRule':
        return <hr key={index} className="my-10 border-gray-200" />;
      default:
        return null;
    }
  };

  return (
    <div className={`clm-content-renderer max-w-none ${className}`}>
      {parsedContent.content.map((node: any, index: number) => renderNode(node, index))}
      <style jsx global>{`
        .clm-content-renderer strong { font-weight: 700; }
        .clm-content-renderer {
           font-family: var(--font-inter), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
        }
      `}</style>
    </div>
  );
};

