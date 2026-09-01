"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  Calendar, 
  DollarSign, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight, 
  Loader2,
  FileSpreadsheet,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

interface ClientTerminationModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: any;
  onSuccess?: () => void;
}

export function ClientTerminationModal({
  isOpen,
  onClose,
  client,
  onSuccess,
}: ClientTerminationModalProps) {
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [agreementStartDate, setAgreementStartDate] = useState("");
  const [agreementEndDate, setAgreementEndDate] = useState("");
  const [lockinEndDate, setLockinEndDate] = useState("");
  const [noticePeriodMonths, setNoticePeriodMonths] = useState("3");
  const [noticeReceivedDate, setNoticeReceivedDate] = useState("");
  const [noticeApplicableEndDate, setNoticeApplicableEndDate] = useState("");
  const [sorAmountHeld, setSorAmountHeld] = useState("0");
  const [duesHeld, setDuesHeld] = useState("0");
  const [tdsPending, setTdsPending] = useState("0");
  const [isSdrRefundApplicable, setIsSdrRefundApplicable] = useState(true);
  const [remarks, setRemarks] = useState("");

  // Initialize and auto-fetch from ClientMaster
  useEffect(() => {
    if (client) {
      const formatDateForInput = (d: any) => {
        if (!d) return "";
        try {
          const date = new Date(d);
          return date.toISOString().split("T")[0];
        } catch {
          return "";
        }
      };

      setAgreementStartDate(formatDateForInput(client.agreementStartDate));
      setAgreementEndDate(formatDateForInput(client.agreementEndDate));
      setLockinEndDate(formatDateForInput(client.lockinEndDate));
      setNoticePeriodMonths(String(client.noticePeriodMonths || 3));
      
      const today = new Date().toISOString().split("T")[0];
      setNoticeReceivedDate(today);

      // Auto-compute notice applicable end date (e.g. today + notice period months)
      const noticeMonths = Number(client.noticePeriodMonths || 3);
      const exitDate = new Date();
      exitDate.setMonth(exitDate.getMonth() + noticeMonths);
      setNoticeApplicableEndDate(exitDate.toISOString().split("T")[0]);

      // Security Deposit SOR
      const sor = Number(client.sorAmount || client.sdrAmount || 0);
      setSorAmountHeld(String(sor));
      setDuesHeld("0");
      setTdsPending("0");
      setIsSdrRefundApplicable(sor > 0);
    }
  }, [client]);

  // Recalculate Notice End Date when Notice Received Date or Notice Period changes
  const handleNoticeDateChange = (receivedDateStr: string, monthsStr: string) => {
    setNoticeReceivedDate(receivedDateStr);
    if (!receivedDateStr) return;
    try {
      const d = new Date(receivedDateStr);
      const m = parseInt(monthsStr, 10) || 3;
      d.setMonth(d.getMonth() + m);
      setNoticeApplicableEndDate(d.toISOString().split("T")[0]);
    } catch (e) {
      console.warn(e);
    }
  };

  // Real-time Net SDR Refund Calculation
  const sorNum = parseFloat(sorAmountHeld) || 0;
  const duesNum = parseFloat(duesHeld) || 0;
  const tdsNum = parseFloat(tdsPending) || 0;
  const calculatedRefund = Math.max(0, sorNum - duesNum - tdsNum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/client-master/terminations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientMasterId: client.id,
          agreementStartDate,
          agreementEndDate,
          lockinEndDate,
          noticePeriodMonths: parseInt(noticePeriodMonths, 10),
          noticeReceivedDate,
          noticeApplicableEndDate,
          sorAmountHeld: sorNum,
          duesHeld: duesNum,
          tdsPending: tdsNum,
          isSdrRefundApplicable,
          sdrRefundAmount: isSdrRefundApplicable ? calculatedRefund : 0,
          remarks,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit termination checklist");
      }

      toast.success("Termination Checklist submitted for Super Admin review!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error("[Termination Submit Error]:", err);
      toast.error(err.message || "Failed to submit checklist");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !client) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white border border-neutral-300 w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        
        {/* HEADER */}
        <div className="px-6 py-4 bg-[#006064] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center">
              <FileSpreadsheet size={18} className="text-amber-300" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-teal-200">
                Formal Exit &amp; Handover Lifecycle
              </span>
              <h2 className="text-base font-black uppercase tracking-tight">
                Client Termination Checklist
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* CLIENT QUICK INFO BANNER */}
        <div className="px-6 py-3 bg-teal-50/80 border-b border-teal-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px] block">
              Company Name
            </span>
            <span className="font-black text-gray-900 text-sm">
              {client.companyName}
            </span>
          </div>
          <div className="text-right">
            <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px] block">
              Allocated Cabin / Seats
            </span>
            <span className="font-bold text-[#006064]">
              {client.cabinName || "Dedicated Cabin"} ({client.noOfSeats || 1} Seats)
            </span>
          </div>
        </div>

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          
          {/* SECTION 1: DATES & NOTICE TIMELINE */}
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-wider text-[#006064] flex items-center gap-1.5 pb-2 border-b border-gray-200">
              <Calendar size={14} /> 1. Agreement &amp; Notice Timeline
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
              <div>
                <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">
                  Agreement Start Date
                </label>
                <input
                  type="date"
                  value={agreementStartDate}
                  onChange={(e) => setAgreementStartDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded bg-gray-50 focus:bg-white focus:border-[#006064] outline-none font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">
                  Agreement End Date
                </label>
                <input
                  type="date"
                  value={agreementEndDate}
                  onChange={(e) => setAgreementEndDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded bg-gray-50 focus:bg-white focus:border-[#006064] outline-none font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">
                  Lock-in End Date
                </label>
                <input
                  type="date"
                  value={lockinEndDate}
                  onChange={(e) => setLockinEndDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded bg-gray-50 focus:bg-white focus:border-[#006064] outline-none font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">
                  Notice Period (Months)
                </label>
                <select
                  value={noticePeriodMonths}
                  onChange={(e) => handleNoticeDateChange(noticeReceivedDate, e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded bg-gray-50 focus:bg-white focus:border-[#006064] outline-none font-bold"
                >
                  <option value="1">1 Month</option>
                  <option value="2">2 Months</option>
                  <option value="3">3 Months</option>
                  <option value="4">4 Months</option>
                  <option value="6">6 Months</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">
                  Notice Received Date
                </label>
                <input
                  type="date"
                  value={noticeReceivedDate}
                  onChange={(e) => handleNoticeDateChange(e.target.value, noticePeriodMonths)}
                  className="w-full p-2 border border-gray-300 rounded bg-gray-50 focus:bg-white focus:border-[#006064] outline-none font-bold text-emerald-800"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">
                  Notice Applicable End Date
                </label>
                <input
                  type="date"
                  value={noticeApplicableEndDate}
                  onChange={(e) => setNoticeApplicableEndDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded bg-gray-50 focus:bg-white focus:border-[#006064] outline-none font-bold text-amber-800"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: FINANCIAL RECONCILIATION & SDR REFUND */}
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-wider text-[#006064] flex items-center gap-1.5 pb-2 border-b border-gray-200">
              <DollarSign size={14} /> 2. Security Deposit (SOR) &amp; Refund Settlement
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
              <div>
                <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">
                  SOR Deposit Held (₹)
                </label>
                <input
                  type="number"
                  value={sorAmountHeld}
                  onChange={(e) => setSorAmountHeld(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded bg-gray-50 focus:bg-white focus:border-[#006064] outline-none font-bold text-gray-900"
                />
              </div>

              <div>
                <label className="block font-bold text-rose-700 uppercase text-[10px] mb-1">
                  Pending Dues / Invoices (₹)
                </label>
                <input
                  type="number"
                  value={duesHeld}
                  onChange={(e) => setDuesHeld(e.target.value)}
                  placeholder="0"
                  className="w-full p-2 border border-rose-200 rounded bg-rose-50/50 focus:bg-white focus:border-rose-500 outline-none font-bold text-rose-700"
                />
              </div>

              <div>
                <label className="block font-bold text-rose-700 uppercase text-[10px] mb-1">
                  TDS Pending / Deductions (₹)
                </label>
                <input
                  type="number"
                  value={tdsPending}
                  onChange={(e) => setTdsPending(e.target.value)}
                  placeholder="0"
                  className="w-full p-2 border border-rose-200 rounded bg-rose-50/50 focus:bg-white focus:border-rose-500 outline-none font-bold text-rose-700"
                />
              </div>
            </div>

            {/* SDR CALCULATION SUMMARY CARD */}
            <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="sdr_refund_applicable"
                  checked={isSdrRefundApplicable}
                  onChange={(e) => setIsSdrRefundApplicable(e.target.checked)}
                  className="w-4 h-4 text-[#006064] accent-[#006064] cursor-pointer"
                />
                <label htmlFor="sdr_refund_applicable" className="cursor-pointer">
                  <span className="font-black text-gray-900 block text-xs uppercase">
                    SDR Refund Applicable?
                  </span>
                  <span className="text-[10px] text-gray-500 font-medium">
                    Calculated Net Refund = SOR Held (₹{sorNum}) − Dues (₹{duesNum}) − TDS (₹{tdsNum})
                  </span>
                </label>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
                  Net Refund Amount
                </span>
                <span className="text-xl font-black text-[#004D40]">
                  ₹{calculatedRefund.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 3: REMARKS & CM NOTES */}
          <div>
            <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">
              Handover Remarks / Community Manager Notes
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Notice served on email; 46 access cards returned; physical cabin inspected."
              className="w-full p-2.5 border border-gray-300 rounded bg-gray-50 focus:bg-white focus:border-[#006064] outline-none text-xs"
            />
          </div>

          {/* WORKFLOW NOTICE */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 text-[11px] flex items-start gap-2">
            <ShieldAlert size={16} className="text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong>Next Step in Workflow:</strong> Submitting this checklist will notify the <strong>Super Admin</strong> for 1st Approval. Once approved, you can generate and dispatch the <strong>Service Closure &amp; NOC Form</strong> to the client.
            </div>
          </div>

          {/* SUBMIT BUTTONS */}
          <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 text-xs font-bold text-white bg-[#006064] hover:bg-[#004D40] rounded flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Submitting Checklist...</span>
                </>
              ) : (
                <>
                  <span>Submit Checklist for SA Approval</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
