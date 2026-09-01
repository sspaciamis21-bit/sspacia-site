"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Building2, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  Send, 
  Upload, 
  ShieldCheck, 
  DollarSign, 
  CreditCard, 
  ChevronRight,
  Eye,
  Loader2,
  X,
  FileSpreadsheet
} from "lucide-react";
import { toast } from "sonner";
import { FadeUp } from "@/components/ui/fade-up";

interface TerminationItem {
  id: number;
  clientMasterId: number;
  agreementStartDate: string | null;
  agreementEndDate: string | null;
  lockinEndDate: string | null;
  noticePeriodMonths: number | null;
  noticeReceivedDate: string | null;
  noticeApplicableEndDate: string | null;
  sorAmountHeld: number | null;
  duesHeld: number | null;
  tdsPending: number | null;
  isSdrRefundApplicable: boolean;
  sdrRefundAmount: number | null;
  remarks: string | null;
  status: string;
  saApproval1At: string | null;
  saApproval1Remarks: string | null;
  closureFormPdfUrl: string | null;
  closureFormSentAt: string | null;
  closureFormSentToEmail: string | null;
  signedClosurePdfUrl: string | null;
  signedClosureUploadedAt: string | null;
  saApproval2At: string | null;
  saApproval2Remarks: string | null;
  refundPaymentMode: string | null;
  refundUtrNumber: string | null;
  refundUtrDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  clientMaster: {
    id: number;
    companyName: string;
    clientId: string | null;
    cabinName: string | null;
    noOfSeats: number | null;
    clientStatus: string | null;
    createdBy?: {
      name: string;
    };
    contactPersons?: Array<{
      name: string;
      email: string;
      mobileNo: string;
    }>;
  };
}

interface TerminationsClientProps {
  isManagerView?: boolean;
}

export function TerminationsClient({ isManagerView = false }: TerminationsClientProps) {
  const [terminations, setTerminations] = useState<TerminationItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [selectedLocationId, setSelectedLocationId] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Action Modals State
  const [selectedItem, setSelectedItem] = useState<TerminationItem | null>(null);
  const [actionModalType, setActionModalType] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionRemarks, setActionRemarks] = useState<string>("");
  const [signedFileUrl, setSignedFileUrl] = useState<string>("");
  const [recipientEmail, setRecipientEmail] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState<string>("NEFT");
  const [utrNumber, setUtrNumber] = useState<string>("");
  const [utrDate, setUtrDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const fetchTerminations = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("locationId", selectedLocationId);
      params.set("status", statusFilter);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/admin/client-master/terminations?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || `Failed to load termination records (${res.status})`);
      }
      const json = await res.json();
      if (json.success) {
        setTerminations(json.terminations || []);
        setStats(json.stats || {});
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load terminations");
    } finally {
      setIsLoading(false);
    }
  }, [selectedLocationId, statusFilter, searchQuery]);

  useEffect(() => {
    fetchTerminations();
  }, [fetchTerminations]);

  const handleAction = async (action: string, extraData: any = {}) => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/client-master/terminations/${selectedItem.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          remarks: actionRemarks,
          ...extraData,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");

      toast.success(data.message || "Action processed successfully");
      if (data.closureHtml) {
        setPreviewHtml(data.closureHtml);
      } else {
        setActionModalType(null);
        setSelectedItem(null);
      }
      fetchTerminations();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to process action");
    } finally {
      setActionLoading(false);
    }
  };

  const formatINR = (val: any) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(val || 0));

  const getStepProgress = (status: string) => {
    switch (status) {
      case "PENDING_SA_APPROVAL_1":
        return 1;
      case "SA_APPROVED_1":
        return 2;
      case "CLOSURE_FORM_SENT":
        return 3;
      case "SIGNED_FORM_UPLOADED":
        return 4;
      case "IN_ACCOUNTS_QUEUE":
        return 5;
      case "COMPLETED_TERMINATED":
        return 6;
      case "REJECTED":
        return 0;
      default:
        return 1;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ── 1. TOP HEADER ── */}
      <FadeUp delay={0}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <Link
              href={isManagerView ? "/manager/client-master" : "/admin/client-master"}
              className="p-2 rounded-none bg-neutral-100 hover:bg-neutral-200 text-gray-700 transition-colors flex items-center justify-center border border-neutral-200 cursor-pointer"
              title="Back to Client Master"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#006064] bg-teal-50 px-2 py-0.5 border border-teal-200">
                  CLIENT MASTER WORKFLOW
                </span>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 border border-amber-200 font-mono">
                  Clearance &amp; Handover
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#1B1C1C] font-display tracking-tight uppercase mt-0.5">
                Termination Checklist &amp; Approval Hub
              </h1>
              <p className="text-xs text-gray-500 font-light mt-0.5">
                Review client clearance checklists, SDR refund calculations, generate NOC certificates, and finalize settlements.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchTerminations()}
              className="px-3.5 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-neutral-50 border border-neutral-200 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
            <Link
              href={isManagerView ? "/manager/client-master" : "/admin/client-master"}
              className="px-4 py-2 text-xs font-bold text-white bg-[#006064] hover:bg-[#004D40] shadow-xs transition-colors"
            >
              + Client Master CRM
            </Link>
          </div>
        </div>
      </FadeUp>

      {/* ── 2. FILTERING & TABS SUITE ── */}
      <FadeUp delay={0.05}>
        <div className="space-y-4">
          
          {/* CENTRE SELECTION (For Super Admin) */}
          {!isManagerView && (
            <div className="bg-white p-4 sm:p-5 border border-neutral-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <Building2 size={15} className="text-[#006064]" />
                <span>Select Centre:</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                {[
                  { id: "ALL", name: "All Centres" },
                  { id: "1", name: "Agarwal Complex" },
                  { id: "2", name: "Mercado" },
                  { id: "3", name: "Premier House" },
                ].map((centre) => (
                  <button
                    key={centre.id}
                    onClick={() => setSelectedLocationId(centre.id)}
                    className={`text-xs font-bold px-3.5 py-1.5 transition-all whitespace-nowrap cursor-pointer uppercase tracking-wider border ${
                      selectedLocationId === centre.id
                        ? "bg-[#006064] text-white border-[#006064] shadow-xs font-black"
                        : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100"
                    }`}
                  >
                    {centre.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* WORKFLOW STAGES FILTER TABS */}
          <div className="bg-white p-3 sm:p-4 border border-neutral-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-wrap">
              {[
                { id: "ALL", label: "All Records", count: stats?.total || 0 },
                { id: "PENDING_SA_APPROVAL_1", label: "1. Pending SA Review", count: stats?.pendingApproval1 || 0 },
                { id: "CLOSURE_FORM_SENT", label: "2. Form Sent to Client", count: stats?.closureSent || 0 },
                { id: "SIGNED_FORM_UPLOADED", label: "3. Signed Form Uploaded", count: stats?.signedUploaded || 0 },
                { id: "IN_ACCOUNTS_QUEUE", label: "4. In Accounts Queue", count: stats?.inAccounts || 0 },
                { id: "COMPLETED_TERMINATED", label: "5. Fully Terminated", count: stats?.completed || 0 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`text-xs font-bold px-3 py-1.5 transition-all cursor-pointer flex items-center gap-1.5 border ${
                    statusFilter === tab.id
                      ? "bg-teal-100/80 text-[#004D40] border-teal-300 font-extrabold shadow-xs"
                      : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="text-[10px] font-black px-1.5 py-0.2 bg-white text-gray-700 border border-neutral-200">
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="w-full lg:w-64">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search company / ID..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-300 outline-none focus:border-[#006064]"
                />
              </div>
            </div>
          </div>

        </div>
      </FadeUp>

      {/* ── 3. TERMINATION RECORDS LIST ── */}
      <FadeUp delay={0.1}>
        {isLoading ? (
          <div className="py-20 text-center text-gray-500 font-bold flex flex-col items-center justify-center gap-2 bg-white border border-neutral-200">
            <Loader2 size={24} className="animate-spin text-[#006064]" />
            <span>Loading Termination Pipeline...</span>
          </div>
        ) : terminations.length === 0 ? (
          <div className="py-16 text-center bg-white border border-neutral-200 space-y-2">
            <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
            <h3 className="text-sm font-bold text-gray-900">No active terminations in this stage</h3>
            <p className="text-xs text-gray-500">
              When a Community Manager initiates a termination checklist from Client Master, it will appear here for review.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {terminations.map((term) => {
              const currentStep = getStepProgress(term.status);

              return (
                <div
                  key={term.id}
                  className="bg-white border border-neutral-200 shadow-xs hover:border-[#006064]/50 transition-all overflow-hidden"
                >
                  {/* CARD HEADER */}
                  <div className="p-5 border-b border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-neutral-50/50">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-mono">
                          {term.clientMaster?.clientId || `ID #${term.clientMasterId}`}
                        </span>
                        <h2 className="text-base font-black text-gray-900 uppercase tracking-tight">
                          {term.clientMaster?.companyName}
                        </h2>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-3">
                        <span><strong>Cabin:</strong> {term.clientMaster?.cabinName || "Dedicated Space"} ({term.clientMaster?.noOfSeats || 1} Seats)</span>
                        <span>•</span>
                        <span><strong>Handled by:</strong> {term.clientMaster?.createdBy?.name || "Community Team"}</span>
                      </p>
                    </div>

                    {/* FINANCIAL SNAPSHOT PILL */}
                    <div className="flex items-center gap-3 bg-white px-3.5 py-2 rounded-lg border border-gray-200">
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                          Net SDR Refund
                        </span>
                        <span className="text-sm font-black text-[#006064]">
                          {term.isSdrRefundApplicable ? formatINR(term.sdrRefundAmount) : "₹0 (No Refund)"}
                        </span>
                      </div>
                      <div className="pl-3 border-l border-gray-100 text-[10px] text-gray-500">
                        <div>SOR Held: {formatINR(term.sorAmountHeld)}</div>
                        <div className="text-rose-600">Dues: -{formatINR(term.duesHeld)}</div>
                      </div>
                    </div>
                  </div>

                  {/* 7-STEP VISUAL PROGRESS TRACKER */}
                  <div className="px-5 py-4 bg-white border-b border-gray-100">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Approval &amp; Settlement Stepper
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
                      {[
                        { step: 1, label: "1. Checklist Done" },
                        { step: 2, label: "2. SA 1st Approval" },
                        { step: 3, label: "3. Form to Client" },
                        { step: 4, label: "4. Signed Upload" },
                        { step: 5, label: "5. A/c Queue" },
                        { step: 6, label: "6. Terminated" },
                      ].map((s) => {
                        const isDone = currentStep >= s.step;
                        const isCurrent = currentStep === s.step;

                        return (
                          <div
                            key={s.step}
                            className={`p-2 rounded border transition-all ${
                              isDone
                                ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-bold"
                                : isCurrent
                                ? "bg-amber-50 border-amber-300 text-amber-900 font-black animate-pulse"
                                : "bg-gray-50 border-gray-200 text-gray-400"
                            }`}
                          >
                            <span className="text-[10.5px] block">{s.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* DATES & ACTION CONTROLS FOOTER */}
                  <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-600">
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Notice Received</span>
                        <span className="font-bold text-gray-900">{term.noticeReceivedDate ? new Date(term.noticeReceivedDate).toLocaleDateString("en-GB") : "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Vacation End Date</span>
                        <span className="font-bold text-amber-800">{term.noticeApplicableEndDate ? new Date(term.noticeApplicableEndDate).toLocaleDateString("en-GB") : "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Lock-in Status</span>
                        <span className="font-bold text-gray-700">{term.lockinEndDate ? new Date(term.lockinEndDate).toLocaleDateString("en-GB") : "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Current Status</span>
                        <span className="font-black text-[#006064]">{term.status.replace(/_/g, " ")}</span>
                      </div>
                    </div>

                    {/* DYNAMIC ACTION BUTTONS */}
                    <div className="flex items-center gap-2 flex-wrap">
                      
                      {/* STEP 2: SUPER ADMIN 1ST APPROVAL */}
                      {term.status === "PENDING_SA_APPROVAL_1" && !isManagerView && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedItem(term);
                              setActionModalType("sa_approval_1");
                            }}
                            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <ShieldCheck size={14} />
                            <span>Approve Checklist (SA 1)</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedItem(term);
                              setActionModalType("reject");
                            }}
                            className="px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {/* STEP 3: GENERATE & EMAIL CLOSURE FORM */}
                      {(term.status === "SA_APPROVED_1" || term.status === "CLOSURE_FORM_SENT") && (
                        <button
                          onClick={() => {
                            setSelectedItem(term);
                            setRecipientEmail(term.clientMaster?.contactPersons?.[0]?.email || "");
                            setActionModalType("send_closure_email");
                          }}
                          className="px-4 py-2 text-xs font-bold text-white bg-[#006064] hover:bg-[#004D40] rounded flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Send size={14} />
                          <span>{term.status === "CLOSURE_FORM_SENT" ? "Resend Closure Form" : "Generate & Email Closure Form"}</span>
                        </button>
                      )}

                      {/* STEP 4: UPLOAD SIGNED CLOSURE FORM */}
                      {(term.status === "CLOSURE_FORM_SENT" || term.status === "SA_APPROVED_1") && (
                        <button
                          onClick={() => {
                            setSelectedItem(term);
                            setActionModalType("upload_signed_closure");
                          }}
                          className="px-4 py-2 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded flex items-center gap-1.5 cursor-pointer"
                        >
                          <Upload size={14} />
                          <span>Upload Client-Signed NOC</span>
                        </button>
                      )}

                      {/* STEP 5: SUPER ADMIN 2ND APPROVAL (FINAL SIGN-OFF) */}
                      {term.status === "SIGNED_FORM_UPLOADED" && !isManagerView && (
                        <button
                          onClick={() => {
                            setSelectedItem(term);
                            setActionModalType("sa_approval_2");
                          }}
                          className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <ShieldCheck size={14} />
                          <span>Final Sign-off &amp; Forward to Accounts</span>
                        </button>
                      )}

                      {/* STEP 6: ACCOUNTANT SETTLEMENT */}
                      {term.status === "IN_ACCOUNTS_QUEUE" && (
                        <button
                          onClick={() => {
                            setSelectedItem(term);
                            setActionModalType("accounts_settlement");
                          }}
                          className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <CreditCard size={14} />
                          <span>Record Refund Payment &amp; Terminate</span>
                        </button>
                      )}

                      {/* STEP 7: COMPLETED TERMINATION */}
                      {term.status === "COMPLETED_TERMINATED" && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded flex items-center gap-1.5">
                            <CheckCircle2 size={14} />
                            <span>UTR: {term.refundUtrNumber || "Settled"}</span>
                          </span>
                        </div>
                      )}

                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </FadeUp>

      {/* ── ACTION MODALS ── */}
      {actionModalType && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-neutral-300 w-full max-w-lg shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h3 className="text-sm font-black uppercase text-gray-900">
                {actionModalType === "sa_approval_1" && "Super Admin 1st Approval"}
                {actionModalType === "send_closure_email" && "Dispatch Closure Form to Client"}
                {actionModalType === "upload_signed_closure" && "Upload Client Signed NOC"}
                {actionModalType === "sa_approval_2" && "Super Admin Final Sign-off"}
                {actionModalType === "accounts_settlement" && "Record Accountant Refund Settlement"}
                {actionModalType === "reject" && "Reject Termination Request"}
              </h3>
              <button
                onClick={() => setActionModalType(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>

            {/* ACTION 1: SA APPROVAL 1 */}
            {actionModalType === "sa_approval_1" && (
              <div className="space-y-3 text-xs">
                <p className="text-gray-600">
                  Reviewing termination checklist for <strong>{selectedItem.clientMaster.companyName}</strong>. 
                  Net SDR Refund of <strong>{formatINR(selectedItem.sdrRefundAmount)}</strong> will be approved.
                </p>
                <div>
                  <label className="block font-bold text-gray-600 mb-1">Approval Remarks</label>
                  <textarea
                    rows={2}
                    value={actionRemarks}
                    onChange={(e) => setActionRemarks(e.target.value)}
                    placeholder="e.g. Terms verified; authorized to issue Service Closure form."
                    className="w-full p-2 border border-gray-300 rounded text-xs outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setActionModalType(null)}
                    className="px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleAction("sa_approval_1")}
                    disabled={actionLoading}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? "Approving..." : "Confirm 1st Approval"}
                  </button>
                </div>
              </div>
            )}

            {/* ACTION 2: SEND CLOSURE EMAIL */}
            {actionModalType === "send_closure_email" && (
              <div className="space-y-3 text-xs">
                <p className="text-gray-600">
                  Generates the official Service Closure &amp; NOC document and emails it to the client for signature.
                </p>
                <div>
                  <label className="block font-bold text-gray-600 mb-1">Client Recipient Email</label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="client@company.com"
                    className="w-full p-2 border border-gray-300 rounded text-xs outline-none font-bold text-gray-900"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setActionModalType(null)}
                    className="px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleAction("send_closure_email", { clientEmail: recipientEmail })}
                    disabled={actionLoading}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-[#006064] hover:bg-[#004D40] rounded cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? "Generating & Sending..." : "Dispatch Closure Form"}
                  </button>
                </div>
              </div>
            )}

            {/* ACTION 3: UPLOAD SIGNED CLOSURE */}
            {actionModalType === "upload_signed_closure" && (
              <div className="space-y-3 text-xs">
                <p className="text-gray-600">
                  Enter the URL or attachment path of the signed closure PDF received from <strong>{selectedItem.clientMaster.companyName}</strong>.
                </p>
                <div>
                  <label className="block font-bold text-gray-600 mb-1">Signed Document URL / Path</label>
                  <input
                    type="text"
                    value={signedFileUrl}
                    onChange={(e) => setSignedFileUrl(e.target.value)}
                    placeholder="/api/admin/stored-documents/xyz or URL"
                    className="w-full p-2 border border-gray-300 rounded text-xs outline-none font-mono"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setActionModalType(null)}
                    className="px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleAction("upload_signed_closure", { signedFileUrl })}
                    disabled={actionLoading || !signedFileUrl}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 rounded cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? "Uploading..." : "Save Signed Document"}
                  </button>
                </div>
              </div>
            )}

            {/* ACTION 4: SA APPROVAL 2 */}
            {actionModalType === "sa_approval_2" && (
              <div className="space-y-3 text-xs">
                <p className="text-gray-600">
                  Verify the client-signed closure form and grant final sign-off to send this file to the <strong>Accountant Queue</strong> for refund disbursement.
                </p>
                <div>
                  <label className="block font-bold text-gray-600 mb-1">Final Sign-off Remarks</label>
                  <textarea
                    rows={2}
                    value={actionRemarks}
                    onChange={(e) => setActionRemarks(e.target.value)}
                    placeholder="e.g. Signed NOC verified. Approved for refund payment."
                    className="w-full p-2 border border-gray-300 rounded text-xs outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setActionModalType(null)}
                    className="px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleAction("sa_approval_2")}
                    disabled={actionLoading}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? "Processing..." : "Grant Final Sign-off"}
                  </button>
                </div>
              </div>
            )}

            {/* ACTION 5: ACCOUNTS SETTLEMENT */}
            {actionModalType === "accounts_settlement" && (
              <div className="space-y-3 text-xs">
                <p className="text-gray-600">
                  Record the refund bank transfer details for <strong>{selectedItem.clientMaster.companyName}</strong> (Net SDR: <strong>{formatINR(selectedItem.sdrRefundAmount)}</strong>).
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-600 mb-1">Payment Mode</label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded bg-gray-50 outline-none font-bold"
                    >
                      <option value="NEFT">NEFT</option>
                      <option value="RTGS">RTGS</option>
                      <option value="IMPS">IMPS</option>
                      <option value="UPI">UPI</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-600 mb-1">Payment Date</label>
                    <input
                      type="date"
                      value={utrDate}
                      onChange={(e) => setUtrDate(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded bg-gray-50 outline-none font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-gray-600 mb-1">Bank UTR / Transaction Reference #</label>
                  <input
                    type="text"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    placeholder="e.g. HDFC00019283746"
                    className="w-full p-2 border border-gray-300 rounded text-xs outline-none font-mono font-bold"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setActionModalType(null)}
                    className="px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleAction("accounts_settlement", { paymentMode, utrNumber, utrDate })}
                    disabled={actionLoading || !utrNumber}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? "Recording Settlement..." : "Complete Termination & Mark Settled"}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── CLOSURE DOCUMENT PREVIEW DRAWER ── */}
      {previewHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white border border-neutral-300 w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl">
            <div className="px-6 py-3 bg-[#006064] text-white flex items-center justify-between">
              <span className="font-bold text-xs uppercase">Generated Service Closure &amp; NOC Document</span>
              <button onClick={() => setPreviewHtml(null)} className="text-white/80 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
              <iframe
                srcDoc={previewHtml}
                className="w-full h-[650px] bg-white border border-gray-300 shadow-sm"
                title="Service Closure Document"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
