/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import SignaturePad from "./SignaturePad";

interface Props {
  contractId: string | number;
  onSigned: () => void;
}

type Method = "CANVAS" | "DSC" | "MANUAL";

export default function SignatureMethodSelector({ contractId, onSigned }: Props) {
  const [selectedMethod, setSelectedMethod] = useState<Method>("CANVAS");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // DSC States
  const [dscStep, setDscStep] = useState(1);
  const [dscChallenge, setDscChallenge] = useState<any>(null);
  const [dscPayload, setDscPayload] = useState({ signedData: "", certificate: "" });
  const [dscTimeLeft, setDscTimeLeft] = useState(600);
  const [dscSigner, setDscSigner] = useState("");
  const [dscPin, setDscPin] = useState("");
  const [showPin, setShowPin] = useState(false);

  // Manual States
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [manualPreview, setManualPreview] = useState<string | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (dscStep === 3 && dscTimeLeft > 0) {
      timer = setInterval(() => {
        setDscTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [dscStep, dscTimeLeft]);

  // --- CANVAS HANDLER ---
  const handleCanvasSign = async (dataURL: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contracts/${contractId}/sign-canvas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureData: dataURL }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onSigned();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- DSC HANDLERS ---
  const connectDSC = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contracts/${contractId}/sign-dsc`);
      const { data, error } = await res.json();
      if (error) throw new Error(error);
      setDscChallenge(data);
      setDscStep(2);
      setDscTimeLeft(600);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyDSC = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contracts/${contractId}/sign-dsc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeToken: dscChallenge.challengeToken,
          signedData: dscPayload.signedData,
          certificate: dscPayload.certificate,
          algorithm: "SHA256withRSA",
          pin: dscPin
        }),
      });
      const { data, error } = await res.json();
      if (error) throw new Error(error);
      setDscSigner(data.signerName);
      setDscStep(4);
      onSigned();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- MANUAL HANDLERS ---
  const downloadPDF = () => {
    window.location.href = `/api/contracts/${contractId}/sign-manual`;
  };

  const handleManualFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setManualFile(file);
      if (file.type.startsWith("image/")) {
        setManualPreview(URL.createObjectURL(file));
      } else {
        setManualPreview(null);
      }
    }
  };

  const uploadManual = async () => {
    if (!manualFile) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", manualFile);

    try {
      const res = await fetch(`/api/contracts/${contractId}/sign-manual`, {
        method: "POST",
        body: formData,
      });
      const { data, error } = await res.json();
      if (error) throw new Error(error);
      onSigned();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <h3 className="text-lg font-semibold text-gray-900">Choose Signature Method</h3>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* CARD 1: CANVAS */}
      <div 
        className={`bg-white border rounded-xl overflow-hidden transition-all shadow-sm ${
          selectedMethod === "CANVAS" ? "ring-2 ring-[var(--primary)] border-transparent" : "border-gray-200 hover:border-gray-300"
        }`}
        onClick={() => setSelectedMethod("CANVAS")}
      >
        <div className="p-4 cursor-pointer hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-gray-900">Draw Signature</div>
              <p className="text-xs text-gray-500">Sign using your mouse, trackpad, or touchscreen</p>
            </div>
          </div>
        </div>
        {selectedMethod === "CANVAS" && (
          <div className="p-4 pt-0 border-t border-gray-100">
            <div className="mt-4">
              <SignaturePad 
                label="Sign here" 
                initials="JD" 
                onCapture={handleCanvasSign}
                disabled={loading}
              />
            </div>
          </div>
        )}
      </div>

      {/* CARD 2: DSC */}
      <div 
        className={`bg-white border rounded-xl overflow-hidden transition-all shadow-sm ${
          selectedMethod === "DSC" ? "ring-2 ring-[var(--primary)] border-transparent" : "border-gray-200 hover:border-gray-300"
        }`}
        onClick={() => setSelectedMethod("DSC")}
      >
        <div className="p-4 cursor-pointer hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-gray-900">USB Digital Signature (DSC)</div>
              <p className="text-xs text-gray-500">Secure cryptographic signing via your USB Token</p>
            </div>
          </div>
        </div>
        {selectedMethod === "DSC" && (
          <div className="p-4 pt-0 border-t border-gray-100 space-y-4">
            {/* Step 1: Connect USB Token */}
            {dscStep === 1 && (
              <button 
                onClick={connectDSC}
                disabled={loading}
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? "Connecting..." : "Connect USB Token"}
              </button>
            )}

            {/* Step 2: Enter USB Token PIN */}
            {dscStep === 2 && (
              <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg mt-0.5 flex-shrink-0">
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-amber-800">USB Token Detected</p>
                      <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                        Your USB token is password-protected. Enter your token PIN/password to unlock the signing key. This is the PIN you set when configuring your DSC dongle.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">USB Token PIN / Password</label>
                  <div className="relative">
                    <input 
                      type={showPin ? "text" : "password"}
                      value={dscPin}
                      onChange={(e) => setDscPin(e.target.value)}
                      placeholder="Enter your USB token PIN"
                      autoFocus
                      className="w-full p-3 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all pr-12"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && dscPin.trim()) {
                          setDscStep(3);
                          setDscTimeLeft(600);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPin ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5 italic">Your PIN is transmitted securely and never stored in plain text.</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setDscStep(1); setDscPin(""); setError(null); }}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-lg transition-colors text-sm"
                  >
                    Back
                  </button>
                  <button 
                    onClick={() => { setDscStep(3); setDscTimeLeft(600); }}
                    disabled={!dscPin.trim()}
                    className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 text-sm"
                  >
                    Unlock &amp; Proceed
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Paste signed output & certificate */}
            {dscStep === 3 && (
              <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Hash: <code className="bg-gray-100 px-1 rounded">{dscChallenge.documentHash.substring(0, 16)}...</code></span>
                  <span className={`font-mono ${dscTimeLeft < 60 ? 'text-red-500' : 'text-blue-500'}`}>
                    {Math.floor(dscTimeLeft / 60)}:{(dscTimeLeft % 60).toString().padStart(2, '0')}
                  </span>
                </div>

                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="text-xs font-semibold text-indigo-700">Token unlocked successfully</span>
                  </div>
                  <p className="text-xs text-indigo-600 leading-relaxed">
                    Open your DSC middleware (eMudhra SafeSign / Sify ePass), select your certificate, and paste the signed output below.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Signed Output (Base64)</label>
                    <textarea 
                      className="w-full h-20 p-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="Paste base64 signed output here"
                      value={dscPayload.signedData}
                      onChange={(e) => setDscPayload({...dscPayload, signedData: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Certificate (Base64 PEM)</label>
                    <textarea 
                      className="w-full h-20 p-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="Paste your certificate (base64 PEM)"
                      value={dscPayload.certificate}
                      onChange={(e) => setDscPayload({...dscPayload, certificate: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setDscStep(2)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 rounded-lg transition-colors text-sm"
                  >
                    Back
                  </button>
                  <button 
                    onClick={verifyDSC}
                    disabled={loading || !dscPayload.signedData || !dscPayload.certificate}
                    className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? "Verifying..." : "Verify & Sign"}
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Success */}
            {dscStep === 4 && (
              <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3">
                <div className="p-1.5 bg-green-500 text-white rounded-full">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-green-800">Signed Successfully</div>
                  <div className="text-xs text-green-600">Signed as {dscSigner}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CARD 3: MANUAL */}
      <div 
        className={`bg-white border rounded-xl overflow-hidden transition-all shadow-sm ${
          selectedMethod === "MANUAL" ? "ring-2 ring-[var(--primary)] border-transparent" : "border-gray-200 hover:border-gray-300"
        }`}
        onClick={() => setSelectedMethod("MANUAL")}
      >
        <div className="p-4 cursor-pointer hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-gray-900">Print & Sign Manually</div>
              <p className="text-xs text-gray-500">Download, physically sign, and upload a scan</p>
            </div>
          </div>
        </div>
        {selectedMethod === "MANUAL" && (
          <div className="p-4 pt-0 border-t border-gray-100 space-y-4">
            <button 
              onClick={downloadPDF}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download PDF
            </button>

            <div className="text-sm text-gray-600 space-y-1 mt-2">
              <p>1. Download and print the contract PDF</p>
              <p>2. Sign it physically</p>
              <p>3. Scan or photograph the signed copy</p>
              <p>4. Upload it below</p>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="sr-only">Choose file</span>
                <input 
                  type="file" 
                  accept="image/*,application/pdf"
                  onChange={handleManualFile}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-[var(--primary)] hover:file:bg-blue-100"
                />
              </label>

              {manualPreview && (
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-gray-200">
                  <img src={manualPreview} alt="Preview" className="object-cover w-full h-full" />
                </div>
              )}

              {manualFile && !manualPreview && (
                <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600 flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414L14.586 2H9z" />
                    <path d="M11 2a2 2 0 012 2v4a2 2 0 012 2v4a2 2 0 11-4 0V4a2 2 0 012-2z" />
                  </svg>
                  {manualFile.name}
                </div>
              )}

              <button 
                onClick={uploadManual}
                disabled={loading || !manualFile}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? "Uploading..." : "Upload Signed Copy"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
