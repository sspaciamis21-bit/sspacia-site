'use client';

import React, { useRef } from 'react';
import { X, Printer, Download, CheckCircle, ShieldCheck } from 'lucide-react';
import Image from 'next/image';

export interface ShortTermAgreementData {
  clientName: string;
  companyName?: string;
  registeredOffice?: string;
  gstNumber?: string;
  seats: number;
  centreName: string;
  centreAddress: string;
  startDate: string;
  endDate?: string;
  passType: 'DAILY' | 'WEEKLY' | string;
  bookingNumber?: string;
}

interface ShortTermAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ShortTermAgreementData;
  onConfirmSign?: () => void;
  isSigned?: boolean;
}

export function ShortTermAgreementModal({
  isOpen,
  onClose,
  data,
  onConfirmSign,
  isSigned = false,
}: ShortTermAgreementModalProps) {
  const agreementRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const displayName = data.companyName ? `${data.clientName} (${data.companyName})` : data.clientName;
  const officeAddress = data.registeredOffice || 'Ahmedabad, Gujarat';
  const gst = data.gstNumber && data.gstNumber.trim() ? data.gstNumber : 'N/A';

  // Format date display
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const displayDate =
    data.passType === 'WEEKLY' && data.endDate
      ? `${formatDate(data.startDate)} to ${formatDate(data.endDate)}`
      : formatDate(data.startDate);

  return (
    <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static print:h-auto">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-agreement, #printable-agreement * {
            visibility: visible;
          }
          #printable-agreement {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 24px;
            box-shadow: none;
            border: none;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-3xl bg-white shadow-2xl border border-gray-200 overflow-hidden my-auto print:border-none print:shadow-none">
        {/* Action Header bar (hidden on print) */}
        <div className="no-print flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#1ab0bc]" />
            <span className="font-display text-sm font-bold tracking-wider uppercase">
              Short Term Agreement — {data.passType === 'WEEKLY' ? 'Weekly Pass' : 'Daily Pass'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#006064] hover:bg-[#004d40] text-white text-xs font-bold uppercase tracking-wider rounded transition-colors cursor-pointer"
            >
              <Printer size={14} />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white cursor-pointer"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 1-PAGE RTF AGREEMENT CANVAS */}
        <div
          id="printable-agreement"
          ref={agreementRef}
          className="p-8 sm:p-12 text-slate-800 leading-relaxed font-sans text-xs sm:text-[13px] bg-white"
        >
          {/* Header Branding */}
          <div className="flex items-center justify-between border-b border-gray-200 pb-5 mb-6">
            <div className="flex items-center gap-3">
              <Image
                src="/SspaciaLogo.png"
                alt="SSPACIA"
                width={130}
                height={45}
                className="h-10 w-auto object-contain"
                priority
              />
            </div>
            <div className="text-right">
              <p className="font-mono text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Ref: {data.bookingNumber || `PASS-${Date.now().toString().slice(-6)}`}
              </p>
              <p className="text-[10px] text-gray-400 font-medium">SSPACIA India Private Limited</p>
            </div>
          </div>

          <h2 className="text-center font-serif text-lg sm:text-xl font-bold uppercase tracking-wider text-slate-900 mb-6 underline decoration-[#006064] decoration-2 underline-offset-8">
            Short Term Agreement
          </h2>

          {/* Opening Paragraph */}
          <p className="text-justify mb-5 leading-relaxed text-slate-700">
            Name <strong className="text-slate-900 border-b border-dotted border-slate-900 px-1">{displayName}</strong>{' '}
            having registered office at{' '}
            <strong className="text-slate-900 border-b border-dotted border-slate-900 px-1">{officeAddress}</strong>,
            bearing GST No.{' '}
            <strong className="text-slate-900 border-b border-dotted border-slate-900 px-1">{gst}</strong> hereinafter
            referred as &ldquo;Client&rdquo; has occupied{' '}
            <strong className="text-rose-700 font-bold border-b border-rose-300 px-1">
              {data.seats} flexi desk{data.seats > 1 ? 's' : ''}
            </strong>{' '}
            for Conference/Working purpose at SSPACIA,{' '}
            <strong className="text-slate-900 font-semibold">{data.centreAddress || data.centreName}</strong> ({displayDate}) and will abide with following conditions:
          </p>

          {/* 4 Conditions */}
          <ol className="space-y-4 mb-10 pl-2 text-justify text-slate-700">
            <li className="flex gap-2.5 items-start">
              <span className="font-bold text-slate-900 shrink-0">1.</span>
              <div>
                <strong className="text-slate-900 font-bold uppercase">COMPLY WITH THE LAW:</strong> The Client must comply with all relevant laws and regulations in the conduct of its business in relation to this agreement. The Client must do nothing illegal in connection with its use of the Co working Space. The Client must not do anything that may interfere with the use of the Centre by the Provider or by others cause any nuisance or annoyance, or cause loss or damage to the Provider (including damage to reputation) or to the owner of any interest in the building which contains the Centre the Client is using.
              </div>
            </li>

            <li className="flex gap-2.5 items-start">
              <span className="font-bold text-slate-900 shrink-0">2.</span>
              <div>
                <strong className="text-slate-900 font-bold">Indemnity:</strong> The client shall be responsible for compliance with all the necessary provisions of the Companies Act / other relevant laws of Government of India as well as any other country&apos;s laws as applicable to Client and hereby agrees to indemnify and keep and hold Provider fully indemnified and harmless from and against all claims, proceedings, damages, losses, actions, costs and expenses arising as a consequence of or out of this agreement or arising from any breach of rules and regulations of any applicable law.
              </div>
            </li>

            <li className="flex gap-2.5 items-start">
              <span className="font-bold text-slate-900 shrink-0">3.</span>
              <div>
                The Client will not undertake any unlawful activity at the premise of SSPACIA and will not indulge in fraudulence or anti-national activity with any visitor meeting him at SSPACIA. The client fully indemnifies the Provider against any such activity and the consequences arising out of any fraudulent activity conducted at SSPACIA.
              </div>
            </li>

            <li className="flex gap-2.5 items-start">
              <span className="font-bold text-slate-900 shrink-0">4.</span>
              <div>
                <strong className="text-slate-900 font-bold">Client&apos;s Undertaking:</strong> - The information furnished above and the documents submitted in support are true to the best of my knowledge and if any information is found incorrect, I will be solely responsible for it. I am signing this agreement after reading and understanding all terms and clauses of this agreement. I and my company will be legally bound to obey all clauses governed under this agreement.
              </div>
            </li>
          </ol>

          {/* Signatures & Execution block */}
          <div className="pt-6 border-t border-gray-200 grid grid-cols-2 gap-8 items-end">
            <div className="space-y-1.5 text-xs text-slate-700">
              <p>
                <span className="font-semibold text-slate-900">Date:</span>{' '}
                <span className="font-mono">{formatDate(data.startDate)}</span>
              </p>
              <p>
                <span className="font-semibold text-slate-900">Place:</span> Ahmedabad, Gujarat
              </p>
              <p className="text-[10px] text-gray-400 font-mono mt-2">
                Valid for: {data.passType === 'WEEKLY' ? '7-Day Pass Period' : '1-Day Pass Period'}
              </p>
            </div>

            <div className="text-right space-y-2">
              <div className="h-12 border-b border-gray-400 w-48 ml-auto flex items-end justify-center pb-1">
                {isSigned ? (
                  <span className="text-xs font-serif italic text-slate-800 font-bold">
                    ✓ Digitally Agreed: {displayName}
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-400 italic">Signature / Digital Confirmation</span>
                )}
              </div>
              <p className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                Signature of Client
              </p>
            </div>
          </div>
        </div>

        {/* Footer Confirmation (when not signed and confirm sign is offered) */}
        {onConfirmSign && !isSigned && (
          <div className="no-print p-4 bg-slate-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-gray-600 font-medium">
              By confirming, you acknowledge and agree to abide by all 4 clauses above.
            </p>
            <button
              type="button"
              onClick={() => {
                onConfirmSign();
                onClose();
              }}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#006064] hover:bg-[#004d40] text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <CheckCircle size={14} />
              <span>Accept &amp; Attach Agreement</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
