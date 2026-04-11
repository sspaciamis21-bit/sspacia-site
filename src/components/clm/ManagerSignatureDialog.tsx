"use client";

import { useState, useEffect } from "react";
import SignaturePad from "./SignaturePad";
import { adminContractsApi } from "@/lib/clm/api";
import { toast } from "sonner";
import { 
  X, 
  CheckCircle2, 
  Loader2,
  ShieldCheck,
  AlertCircle,
  PenTool,
  Cpu,
  Monitor
} from "lucide-react";

interface Props {
  contractId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type SignMethod = "CANVAS" | "DSC";

export default function ManagerSignatureDialog({ contractId, isOpen, onClose, onSuccess }: Props) {
  const [method, setMethod] = useState<SignMethod>("CANVAS");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signerName, setSignerName] = useState("");

  // DSC States
  const [dscStep, setDscStep] = useState(1);
  const [dscChallenge, setDscChallenge] = useState<{ 
    challengeToken: string; 
    documentHash: string; 
    expiresAt: string 
  } | null>(null);
  const [dscPayload, setDscPayload] = useState({ signedData: "", certificate: "" });
  const [dscTimeLeft, setDscTimeLeft] = useState(600);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (dscStep === 2 && dscTimeLeft > 0) {
      timer = setInterval(() => {
        setDscTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [dscStep, dscTimeLeft]);

  if (!isOpen) return null;

  // --- CANVAS HANDLER ---
  const handleCanvasSign = async (dataURL: string) => {
    if (!signerName.trim()) {
      toast.error("Please enter your name for authorization log.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await adminContractsApi.signCounter(contractId, {
        method: "CANVAS",
        signatureData: dataURL,
        signerName: signerName.trim()
      });
      toast.success("Authorization seal applied.");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to sign";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // --- DSC HANDLERS ---
  const connectDSC = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/contracts/${contractId}/sign-dsc`);
      const { data, error } = await res.json();
      if (error) throw new Error(error);
      setDscChallenge(data);
      setDscStep(2);
      setDscTimeLeft(600);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect to DSC service";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDSCSign = async () => {
    if (!signerName.trim()) {
      toast.error("Please enter your name for the certificate matching.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (!dscChallenge) throw new Error("Signing challenge not initialized");
      
      // 1. Verify DSC with special admin route
      const res = await fetch(`/api/admin/contracts/${contractId}/sign-dsc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeToken: dscChallenge.challengeToken,
          signedData: dscPayload.signedData,
          certificate: dscPayload.certificate,
          algorithm: "SHA256withRSA"
        }),
      });
      const { data, error: vError } = await res.json();
      if (vError) throw new Error(vError);

      // 2. Submit counter-sign if verification ok
      await adminContractsApi.signCounter(contractId, {
        method: "DSC",
        signatureData: dscPayload.signedData,
        signerName: signerName.trim() || data.signerName,
        certificate: dscPayload.certificate
      });

      toast.success("Managerial DSC authorization applied.");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "DSC Verification failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-[#0F0F0F] w-full max-w-2xl rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-orange-500/10 rounded-xl">
                <ShieldCheck className="text-orange-500 w-5 h-5"/>
             </div>
             <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-[#1B1B1B] dark:text-white">Management Authorization</h2>
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">Official Sspacia Execution Node</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="p-10 space-y-8">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl flex items-center gap-3">
               <AlertCircle size={18} className="text-red-500" />
               <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-4 p-2 bg-gray-50 dark:bg-white/5 rounded-3xl">
             <button 
               onClick={() => setMethod("CANVAS")}
               className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                 method === "CANVAS" ? "bg-white dark:bg-white/10 shadow-xl text-orange-500" : "text-gray-400 hover:text-gray-600"
               }`}
             >
               <PenTool size={14} /> Digital Canvas
             </button>
             <button 
               onClick={() => setMethod("DSC")}
               className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                 method === "DSC" ? "bg-white dark:bg-white/10 shadow-xl text-orange-500" : "text-gray-400 hover:text-gray-600"
               }`}
             >
               <Cpu size={14} /> USB DSC Token
             </button>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] italic ml-1">Official Name for Record</label>
            <input 
              type="text"
              placeholder="Full Legal Name"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-orange-500/50 outline-none text-sm font-bold uppercase tracking-widest"
              disabled={loading}
            />
          </div>

          <div className="min-h-[200px]">
            {method === "CANVAS" ? (
              <div className="space-y-4 animate-in fade-in duration-500">
                 <div className="rounded-3xl border-2 border-dashed border-gray-100 dark:border-white/10 p-2 bg-gray-50/50 dark:bg-black/20">
                    <SignaturePad 
                      label="Manager Signature" 
                      initials="SM" 
                      onCapture={handleCanvasSign}
                      disabled={loading}
                    />
                 </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-500">
                {dscStep === 1 ? (
                  <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-100 dark:border-white/10 rounded-[2.5rem] bg-gray-50/30">
                     <Monitor size={48} className="text-gray-300 mb-6" />
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-6 text-center">Ensure USB DSC Token is inserted and middleware active</p>
                     <button 
                       onClick={connectDSC}
                       disabled={loading}
                       className="px-10 py-4 bg-[#1B1B1B] text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
                     >
                       {loading ? <Loader2 className="animate-spin" size={16}/> : "Initialize DSC Challenge"}
                     </button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex justify-between items-center bg-orange-500/5 p-4 rounded-2xl border border-orange-500/10">
                       <span className="text-[9px] font-bold text-orange-600 uppercase tracking-widest">Hash ID: {dscChallenge?.documentHash.substring(0, 16)}...</span>
                       <span className="text-[10px] font-mono text-orange-500 font-bold">
                         {Math.floor(dscTimeLeft / 60)}:{(dscTimeLeft % 60).toString().padStart(2, '0')}
                       </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Payload Output</label>
                          <textarea 
                            value={dscPayload.signedData}
                            onChange={(e) => setDscPayload({...dscPayload, signedData: e.target.value})}
                            className="w-full h-24 p-4 text-[9px] font-mono bg-gray-50 dark:bg-black/40 rounded-2xl border border-transparent focus:border-orange-500/30 outline-none"
                            placeholder="Paste Base64 Signed Data"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Certificate PEM</label>
                          <textarea 
                            value={dscPayload.certificate}
                            onChange={(e) => setDscPayload({...dscPayload, certificate: e.target.value})}
                            className="w-full h-24 p-4 text-[9px] font-mono bg-gray-50 dark:bg-black/40 rounded-2xl border border-transparent focus:border-orange-500/30 outline-none"
                            placeholder="Paste Certificate PEM"
                          />
                       </div>
                    </div>

                    <button 
                      onClick={handleDSCSign}
                      disabled={loading || !dscPayload.signedData || !dscPayload.certificate}
                      className="w-full py-5 bg-orange-500 text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/20"
                    >
                      {loading ? "Verifying Authorization..." : "Confirm & Execute DSC Sign"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-[2.5rem] border border-gray-100 dark:border-white/5">
            <div className="flex gap-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-700 dark:text-gray-200 uppercase tracking-widest">Management Attestation</p>
                <p className="text-[9px] text-gray-400 font-medium leading-relaxed uppercase tracking-tighter">
                  By applying this signature, I verify that I hold authority to execute this contract on behalf of Sspacia. {method === "DSC" ? "This action will be cryptographically bound to your provided certificate." : ""}
                </p>
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
            <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] animate-pulse italic">Authenticating Execution Node...</p>
          </div>
        )}
      </div>
    </div>
  );
}
