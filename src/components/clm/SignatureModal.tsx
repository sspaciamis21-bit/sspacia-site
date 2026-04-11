"use client";

import { ReactNode, useState } from "react";
import { Loader2, X, ShieldAlert } from "lucide-react";
import SignaturePad from "./SignaturePad";

interface Props {
  trigger: ReactNode;
  onSign: (dataUrl: string) => Promise<void>;
  loading?: boolean;
}

export default function SignatureModal({ trigger, onSign, loading }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSign = async (data: string) => {
    await onSign(data);
    setIsOpen(false);
  };

  return (
    <>
      <div onClick={() => setIsOpen(true)}>{trigger}</div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0A0A0F]/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-[#12121A] border border-[#2A2A3E] rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="px-8 py-6 border-b border-[#2A2A3E] flex items-center justify-between bg-[#161621]">
              <div className="flex items-center gap-3">
                 <div className="h-2 w-2 rounded-full bg-[#7C6FFF] animate-pulse shadow-[0_0_8px_#7C6FFF]"></div>
                 <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-white italic">Secure Execution Terminal</h3>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/5 rounded-full text-[#5A5A72] transition-colors"
                disabled={loading}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-10">
               <div className="mb-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex gap-4">
                  <ShieldAlert className="text-amber-500 shrink-0" size={20} />
                  <p className="text-[10px] text-amber-200/80 font-medium leading-relaxed uppercase tracking-tight">
                    By providing your signature below, you acknowledge that you have read, understood, and agreed to all terms outlined in this agreement. This action is legally binding.
                  </p>
               </div>

               <div className="bg-[#0A0A0F] rounded-2xl border border-[#2A2A3E] overflow-hidden shadow-inner">
                  <SignaturePad 
                    label="Customer Signature"
                    initials="JD" // Fallback initials
                    accentColor="#7C6FFF"
                    onCapture={handleSign}
                    disabled={loading}
                  />
               </div>

               {loading && (
                 <div className="mt-8 flex items-center justify-center gap-3 text-[#7C6FFF]">
                   <Loader2 className="animate-spin" size={18} />
                   <span className="text-[10px] font-bold uppercase tracking-widest italic">Synchronizing Signature...</span>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
