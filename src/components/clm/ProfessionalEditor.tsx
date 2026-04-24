'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';


import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { 
  AlignLeft,
  AlignCenter, 
  AlignRight,
  Heading1,
  Heading2,
  List, 
  ListOrdered,
  Undo,
  Redo,
  Bold, 
  Italic, 
  Underline as UnderlineIcon,
  MessageCircle,
  FileCode,
  Sparkles,
  Layout
} from 'lucide-react';
import { generateInitialAgreement } from '@/lib/clm/templates';





interface ProfessionalEditorProps {
  content: string; // JSON string
  onChange: (json: string) => void;
  readOnly?: boolean;
  onNegotiate?: (selectedText: string) => void;
}


export function ProfessionalEditor({ content, onChange, readOnly = false, onNegotiate }: ProfessionalEditorProps) {

  const parseContent = (c: string) => {
    try {
      if (!c || c === '' || c === '{}') {
        // Return default agreement template if empty
        return generateInitialAgreement({
          date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
          companyAddress: "Sspacia India Private Limited",
          customerName: "________________",
          customerOrg: "________________",
          customerDesignation: "Authorized Signatory",
          customerPan: "________________",
          customerPhone: "________________",
          customerEmail: "________________",
          userId: "_____",
          productType: "Office Space",
          productName: "Workspace",
          centerAddress: "Sspacia Center",
          period: "12 Months",
          startDate: "____________",
          expiryDate: "____________",
          cost: "______",
          costInWords: "________________",
          calculatedCost: "______",
          calculatedCostInWords: "________________",
          capacity: "__",
          depositAmount: "______",
          depositAmountInWords: "________________",
          lockInPeriod: "12 Months",
          noticePeriod: "2 Months",
          escalationPercentage: "5%",
          renewalDate: "____________",
          contractNumber: "[CONTRACT NUMBER]"
        });
      }
      return JSON.parse(c);
    } catch {
      return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: c }] }] };
    }


  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: 'Start typing the agreement...',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: parseContent(content),
    editable: !readOnly,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(JSON.stringify(editor.getJSON()));
    },

    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none max-w-none leading-relaxed text-[#1B1C1C]',
      },
    },
  });

  // Sync external content changes into TipTap (it's uncontrolled by default)
  useEffect(() => {
    if (!editor || !content || content === '') return;
    const newContent = parseContent(content);
    // Only update if content actually differs to avoid cursor jumping
    const currentJson = JSON.stringify(editor.getJSON());
    const newJson = JSON.stringify(newContent);
    if (currentJson !== newJson) {
      editor.commands.setContent(newContent, false);
    }
  }, [content]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!editor) return null;

  return (
    <div className="flex flex-col w-full bg-[#f3f4f6] rounded-xl overflow-hidden border border-[var(--outline-variant)]/20 shadow-inner">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1 p-2 bg-white border-b border-[var(--outline-variant)]/20 sticky top-0 z-40 shadow-sm">
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleBold().run()} 
            active={editor.isActive('bold')}
            icon={<Bold size={16} />}
            label="Bold"
          />
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleItalic().run()} 
            active={editor.isActive('italic')}
            icon={<Italic size={16} />}
            label="Italic"
          />
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleUnderline().run()} 
            active={editor.isActive('underline')}
            icon={<UnderlineIcon size={16} />}
            label="Underline"
          />
          
          <div className="w-px h-6 bg-[var(--outline-variant)]/30 mx-1" />
          
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
            active={editor.isActive('heading', { level: 1 })}
            icon={<Heading1 size={16} />}
            label="H1"
          />
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
            active={editor.isActive('heading', { level: 2 })}
            icon={<Heading2 size={16} />}
            label="H2"
          />
          
          <div className="w-px h-6 bg-[var(--outline-variant)]/30 mx-1" />
          
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleBulletList().run()} 
            active={editor.isActive('bulletList')}
            icon={<List size={16} />}
            label="Bullet List"
          />
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleOrderedList().run()} 
            active={editor.isActive('orderedList')}
            icon={<ListOrdered size={16} />}
            label="Ordered List"
          />
          
          <div className="w-px h-6 bg-[var(--outline-variant)]/30 mx-1" />
          
          <ToolbarButton 
            onClick={() => editor.chain().focus().setTextAlign('left').run()} 
            active={editor.isActive({ textAlign: 'left' })}
            icon={<AlignLeft size={16} />}
            label="Align Left"
          />
          <ToolbarButton 
            onClick={() => editor.chain().focus().setTextAlign('center').run()} 
            active={editor.isActive({ textAlign: 'center' })}
            icon={<AlignCenter size={16} />}
            label="Align Center"
          />
          <ToolbarButton 
            onClick={() => editor.chain().focus().setTextAlign('right').run()} 
            active={editor.isActive({ textAlign: 'right' })}
            icon={<AlignRight size={16} />}
            label="Align Right"
          />
          
          <div className="ms-auto flex items-center gap-1">
            <ToolbarButton 
              onClick={() => editor.chain().focus().undo().run()} 
              disabled={!editor.can().undo()}
              icon={<Undo size={16} />}
              label="Undo"
            />
            <ToolbarButton 
              onClick={() => editor.chain().focus().redo().run()} 
              disabled={!editor.can().redo()}
              icon={<Redo size={16} />}
              label="Redo"
            />
            
            <div className="w-px h-6 bg-[var(--outline-variant)]/30 mx-1" />
            
            <button
               onClick={() => {
                 const template = generateInitialAgreement({
                    date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
                    companyAddress: "Sspacia India Private Limited",
                    customerName: "[CUSTOMER NAME]",
                    customerOrg: "[ORGANIZATION]",
                    customerDesignation: "Authorized Signatory",
                    customerPan: "[PAN]",
                    customerPhone: "[PHONE]",
                    customerEmail: "[EMAIL]",
                    userId: "[ID]",
                    productType: "Office Space",
                    productName: "Workspace",
                    centerAddress: "Sspacia Center",
                    period: "12 Months",
                    startDate: "[START DATE]",
                    expiryDate: "[EXPIRY DATE]",
                    cost: "[COST/MONTH]",
                    costInWords: "[AMOUNT IN WORDS]",
                    calculatedCost: "[TOTAL AMOUNT]",
                    calculatedCostInWords: "[TOTAL IN WORDS]",
                    capacity: "[SEATS]",
                    depositAmount: "[DEPOSIT]",
                    depositAmountInWords: "[DEPOSIT IN WORDS]",
                    lockInPeriod: "12 Months",
                    noticePeriod: "2 Months",
                    escalationPercentage: "5%",
                    renewalDate: "[RENEWAL DATE]",
                    contractNumber: "[CONTRACT NUMBER]"
                 });
                 editor.commands.setContent(template);
               }}
               className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors border border-indigo-200/50"
            >
               <Layout size={14} />
               Reset Template
            </button>
          </div>
        </div>
      )}

      {editor && !readOnly && (
        <BubbleMenu editor={editor}>
          <div className="flex items-center gap-0.5 bg-white text-neutral-900 p-1 rounded-none shadow-xl border border-neutral-200">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded-none hover:bg-neutral-50 transition-colors ${editor.isActive('bold') ? 'text-[var(--primary)]' : ''}`}
            >
              <Bold size={14} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded-none hover:bg-neutral-50 transition-colors ${editor.isActive('italic') ? 'text-[var(--primary)]' : ''}`}
            >
              <Italic size={14} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-1.5 rounded-none hover:bg-neutral-50 transition-colors ${editor.isActive('underline') ? 'text-[var(--primary)]' : ''}`}
            >
              <UnderlineIcon size={14} />
            </button>
          </div>
        </BubbleMenu>
      )}

      {editor && readOnly && onNegotiate && (
        <BubbleMenu 
          editor={editor} 
          updateDelay={50}
          pluginKey="read-only-negotiation-menu"
          shouldShow={({ editor, from, to }) => from !== to}
        >
          <button
            onClick={() => {
              const { from, to } = editor.state.selection;
              const text = editor.state.doc.textBetween(from, to, ' ');
              if (text.trim()) onNegotiate(text);
            }}
            className="flex items-center gap-2 bg-neutral-900 text-white px-4 py-2 rounded-none shadow-xl hover:bg-black transition-all font-bold text-[10px] uppercase tracking-widest"
          >
            <MessageCircle size={14} /> Add to negotiation
          </button>
        </BubbleMenu>
      )}

      {/* A4 Workspace */}
      <div className="flex-1 overflow-auto p-4 md:p-6 flex justify-center custom-scrollbar">
        <div className="a4-page bg-white shadow-2xl border border-gray-200/50 relative">
          <EditorContent editor={editor} />
        </div>
      </div>
      
      <style jsx global>{`
        .a4-page {
          width: 210mm;
          min-height: 297mm;
          padding: 15mm 20mm; /* Standard margins */
          margin-bottom: 2rem;
        }

        @media (max-width: 210mm) {
          .a4-page {
            width: 100%;
            padding: 1rem;
          }
        }

        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror {
          outline: none !important;
          font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
          font-size: 11pt;
          line-height: 1.5;
        }
        .prose h1 {
          font-size: 16pt;
          font-weight: bold;
          text-align: center;
          margin-bottom: 2rem;
          text-transform: uppercase;
        }
        .prose h2 {
          font-size: 13pt;
          font-weight: bold;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .prose p {
          margin-bottom: 1rem;
          text-align: justify;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #ccc;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #bbb;
        }
      `}</style>
    </div>
  );
}

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
}

function ToolbarButton({ onClick, active, disabled, icon, label }: ToolbarButtonProps) {

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`p-2 rounded-lg transition-all flex items-center justify-center
        ${active 
          ? 'bg-white text-[var(--primary)] shadow-sm border border-[var(--outline-variant)]/30' 
          : 'text-gray-500 hover:bg-white hover:text-gray-900 border border-transparent'}
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {icon}
    </button>
  );
}
