"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Building2,
  Download,
  Printer,
  Filter,
  ArrowUpRight,
  Layers,
  Calendar,
  CreditCard,
  Eye,
  Receipt,
  Paperclip,
  ExternalLink,
  Clock
} from "lucide-react";
import { toast } from "sonner";

export interface ItemizedInvoice {
  id: number;
  srNo: number;
  clientMasterId: number;
  companyName: string;
  cabinName: string;
  locationId: number;
  locationName: string;
  taxableAmount: number;
  gstPercent: number;
  totalAmount: number;
  receiveAmount?: number;
  balanceAmount?: number;
  paymentStatus?: string;
  paymentMode?: string | null;
  utrNumber?: string | null;
  utrDate?: string | null;
  utrFileUrl?: string | null;
  utrFileName?: string | null;
  tdsDeducted?: string;
  tdsAmount?: number;
  paymentsJson?: string | null;
  payReceiveDate?: string | null;
  status: string;
  sendType?: string | null;
  billingMonth: string;
  dueDate: string | null;
  sentAt?: string | null;
  createdAt: string | null;
  attachedInvoice?: {
    id: number;
    fileName: string;
    fileUrl: string;
  } | null;
  isApproved: boolean;
}

interface InvoicesBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: ItemizedInvoice[];
  kpi: {
    invoicesRaised?: number;
    paymentReceived?: number;
    balancePayment?: number;
    transactionCount?: number;
  };
  initialTab?: "ALL" | "APPROVED" | "PENDING";
  initialLocationId?: string;
  periodInfo?: {
    type: string;
    startDate: string;
    endDate: string;
    month?: string;
    year: number;
    quarter?: string;
  };
}

export function InvoicesBreakdownModal({
  isOpen,
  onClose,
  invoices = [],
  kpi,
  initialTab = "ALL",
  initialLocationId = "ALL",
  periodInfo,
}: InvoicesBreakdownModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"ALL" | "APPROVED" | "PENDING">(initialTab);
  const [selectedCentre, setSelectedCentre] = useState<string>(initialLocationId);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"AMT_DESC" | "AMT_ASC" | "NAME_ASC">("AMT_DESC");
  const [workflowStatusFilter, setWorkflowStatusFilter] = useState<string>("ALL");
  const [viewingPaymentInvoice, setViewingPaymentInvoice] = useState<ItemizedInvoice | null>(null);
  const [viewingWorkflowInvoice, setViewingWorkflowInvoice] = useState<ItemizedInvoice | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSelectedCentre(initialLocationId);
      setSearchQuery("");
      setSortOrder("AMT_DESC");
      setWorkflowStatusFilter("ALL");
      setViewingPaymentInvoice(null);
      setViewingWorkflowInvoice(null);
    }
  }, [isOpen, initialTab, initialLocationId]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (viewingWorkflowInvoice) {
          setViewingWorkflowInvoice(null);
        } else if (viewingPaymentInvoice) {
          setViewingPaymentInvoice(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, viewingPaymentInvoice, viewingWorkflowInvoice]);

  const formatINR = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Centre statistics for quick chips
  const centreStats = useMemo(() => {
    const map: Record<string, { name: string; id: string; raised: number; received: number; balance: number; count: number }> = {
      ALL: { name: "All Centres", id: "ALL", raised: 0, received: 0, balance: 0, count: invoices.length },
      "1": { name: "Agarwal Complex", id: "1", raised: 0, received: 0, balance: 0, count: 0 },
      "2": { name: "Mercado", id: "2", raised: 0, received: 0, balance: 0, count: 0 },
      "3": { name: "Premier House", id: "3", raised: 0, received: 0, balance: 0, count: 0 },
    };

    invoices.forEach((inv) => {
      const rec = Number(inv.receiveAmount || 0);
      const bal = inv.balanceAmount !== undefined ? Number(inv.balanceAmount) : Math.max(0, inv.totalAmount - rec);
      map.ALL.raised += inv.totalAmount;
      map.ALL.received += rec;
      map.ALL.balance += bal;

      const locKey = String(inv.locationId);
      if (map[locKey]) {
        map[locKey].raised += inv.totalAmount;
        map[locKey].count += 1;
        map[locKey].received += rec;
        map[locKey].balance += bal;
      }
    });

    return map;
  }, [invoices]);

  // Filtered & Sorted Invoices
  const filteredInvoices = useMemo(() => {
    let list = [...invoices];

    // Filter by Tab (Status)
    if (activeTab === "APPROVED") {
      list = list.filter((inv) => (inv.receiveAmount && inv.receiveAmount > 0) || inv.paymentStatus === 'RECEIVED' || inv.paymentStatus === 'PARTIAL');
    } else if (activeTab === "PENDING") {
      list = list.filter((inv) => (inv.balanceAmount && inv.balanceAmount > 0) || (!inv.receiveAmount || inv.receiveAmount === 0));
    }

    // Filter by Workflow Status (when in Invoices Raised tab)
    if (activeTab === "ALL" && workflowStatusFilter !== "ALL") {
      if (workflowStatusFilter === "PENDING_CM") {
        list = list.filter((inv) => inv.status === "PENDING_CM_REVIEW" || !inv.status);
      } else if (workflowStatusFilter === "ACCOUNTANT") {
        list = list.filter((inv) => inv.status === "SENT_TO_ACCOUNTANT");
      } else if (workflowStatusFilter === "TALLY_ATTACHED") {
        list = list.filter((inv) => inv.status === "INVOICE_ATTACHED" || (inv.attachedInvoice && !inv.isApproved));
      } else if (workflowStatusFilter === "APPROVED") {
        list = list.filter((inv) => inv.isApproved || inv.status === "APPROVED");
      }
    }

    // Filter by Centre
    if (selectedCentre !== "ALL") {
      const targetId = parseInt(selectedCentre, 10);
      list = list.filter((inv) => {
        if (!isNaN(targetId)) return inv.locationId === targetId;
        return inv.locationName.toLowerCase().includes(selectedCentre.toLowerCase());
      });
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (inv) =>
          inv.companyName.toLowerCase().includes(q) ||
          inv.cabinName.toLowerCase().includes(q) ||
          inv.locationName.toLowerCase().includes(q) ||
          inv.status.toLowerCase().includes(q) ||
          inv.billingMonth.toLowerCase().includes(q) ||
          (inv.utrNumber && inv.utrNumber.toLowerCase().includes(q)) ||
          String(inv.srNo).includes(q) ||
          String(inv.totalAmount).includes(q)
      );
    }

    // Sort list
    return list.sort((a, b) => {
      if (sortOrder === "AMT_DESC") return b.totalAmount - a.totalAmount;
      if (sortOrder === "AMT_ASC") return a.totalAmount - b.totalAmount;
      return a.companyName.localeCompare(b.companyName);
    });
  }, [invoices, activeTab, selectedCentre, searchQuery, sortOrder, workflowStatusFilter]);

  // Current Filtered Sums
  const filteredTotal = useMemo(() => {
    if (activeTab === "APPROVED") {
      return filteredInvoices.reduce((acc, inv) => acc + (Number(inv.receiveAmount) || 0), 0);
    }
    if (activeTab === "PENDING") {
      return filteredInvoices.reduce((acc, inv) => acc + (Number(inv.balanceAmount !== undefined ? inv.balanceAmount : inv.totalAmount) || 0), 0);
    }
    return filteredInvoices.reduce((acc, inv) => acc + (Number(inv.totalAmount) || 0), 0);
  }, [filteredInvoices, activeTab]);

  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) {
      toast.error("No invoices to export.");
      return;
    }

    const rows = [
      ["Invoice #", "Company Name", "Cabin / Product", "Centre / Location", "Billing Month", "Due Date", "Workflow Status", "Approval Status", "Payment Status", "UTR #", "Total Amount (INR)", "Received (INR)", "Balance (INR)"],
      ...filteredInvoices.map((inv) => [
        `#${inv.srNo || inv.id}`,
        `"${(inv.companyName || "").replace(/"/g, '""')}"`,
        `"${(inv.cabinName || "").replace(/"/g, '""')}"`,
        inv.locationName,
        inv.billingMonth,
        inv.dueDate || "N/A",
        inv.status,
        inv.isApproved || inv.status === 'APPROVED' ? 'Approved' : 'Pending',
        inv.paymentStatus || "PENDING",
        inv.utrNumber || "N/A",
        inv.totalAmount,
        inv.receiveAmount || 0,
        inv.balanceAmount !== undefined ? inv.balanceAmount : Math.max(0, inv.totalAmount - (inv.receiveAmount || 0)),
      ]),
      ["TOTAL", "", "", "", "", "", "", "", "", "", filteredTotal, "", ""],
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((r) => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SSPACIA_Invoices_${activeTab}_${selectedCentre}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Invoice ledger exported successfully.");
  };

  const handlePrint = () => {
    window.print();
  };

  const getWorkflowBadge = (inv: ItemizedInvoice) => {
    const { status, isApproved } = inv;
    if (isApproved || status === "APPROVED") {
      return (
        <span className="text-[9.5px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 uppercase tracking-wider inline-flex items-center gap-1">
          <CheckCircle2 size={10} />
          CM Approved (Live)
        </span>
      );
    }
    if (status === "INVOICE_ATTACHED") {
      return (
        <span className="text-[9.5px] font-bold px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-300 uppercase tracking-wider inline-flex items-center gap-1">
          <Paperclip size={10} />
          Tally Attached (Pending CM)
        </span>
      );
    }
    if (status === "SENT_TO_ACCOUNTANT") {
      return (
        <span className="text-[9.5px] font-bold px-2 py-0.5 bg-sky-50 text-sky-800 border border-sky-300 uppercase tracking-wider inline-flex items-center gap-1">
          <Clock size={10} />
          With Accountant (Pending Tally)
        </span>
      );
    }
    if (status === "REJECTED_WITH_REMARKS") {
      return (
        <span className="text-[9.5px] font-bold px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-300 uppercase tracking-wider inline-flex items-center gap-1">
          <AlertCircle size={10} />
          Rejected w/ Remarks
        </span>
      );
    }
    return (
      <span className="text-[9.5px] font-bold px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 uppercase tracking-wider inline-flex items-center gap-1">
        <AlertCircle size={10} />
        Pending CM Review
      </span>
    );
  };

  const getStatusBadge = (status: string, isApproved: boolean, paymentStatus?: string, utrNumber?: string | null) => {
    if (paymentStatus === "RECEIVED" || (utrNumber && utrNumber.trim())) {
      return (
        <span className="text-[9.5px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider inline-flex items-center gap-1">
          <CheckCircle2 size={10} />
          Paid / UTR Realized
        </span>
      );
    }
    if (paymentStatus === "PARTIAL") {
      return (
        <span className="text-[9.5px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 uppercase tracking-wider inline-flex items-center gap-1">
          Partially Paid
        </span>
      );
    }
    if (isApproved || status === "APPROVED") {
      return (
        <span className="text-[9.5px] font-bold px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider inline-flex items-center gap-1">
          <AlertCircle size={10} />
          Approved (Pending Payment)
        </span>
      );
    }
    if (status === "SENT_TO_ACCOUNTANT") {
      return (
        <span className="text-[9.5px] font-bold px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 uppercase tracking-wider inline-flex items-center gap-1">
          Accountant Review
        </span>
      );
    }
    return (
      <span className="text-[9.5px] font-bold px-2 py-0.5 bg-neutral-100 text-neutral-700 border border-neutral-200 uppercase tracking-wider inline-flex items-center gap-1">
        Pending CM Review
      </span>
    );
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5">
          {/* Backdrop Blur & Fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-neutral-950/75 backdrop-blur-xs cursor-pointer"
          />

          {/* Modal Content Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="relative bg-white w-full max-w-5xl max-h-[92vh] shadow-2xl border border-neutral-200 flex flex-col overflow-hidden z-10 rounded-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── 1. MODAL TOP HEADER ── */}
            <div className="px-5 py-4 bg-gradient-to-r from-neutral-900 via-neutral-800 to-[#004D40] text-white flex items-center justify-between border-b border-neutral-700">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 border flex items-center justify-center ${
                  activeTab === "APPROVED"
                    ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-300"
                    : activeTab === "PENDING"
                    ? "bg-amber-500/20 border-amber-400/30 text-amber-300"
                    : "bg-purple-500/20 border-purple-400/30 text-purple-300"
                }`}>
                  <FileText size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                      Invoice Collection &amp; Pipeline Ledger
                    </h2>
                    <span className="text-[10px] font-bold bg-teal-500/20 text-teal-300 px-2 py-0.5 border border-teal-400/30 uppercase tracking-widest">
                      Live Telemetry
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 font-light mt-0.5">
                    Invoice workflow tracking, approval pipeline &amp; bank collections
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 text-xs font-bold text-teal-300 bg-white/10 hover:bg-white/20 border border-white/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Export Current Table as CSV"
                >
                  <Download size={13} />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Print Statement"
                >
                  <Printer size={13} />
                  <span className="hidden sm:inline">Print</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
                  title="Close (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* ── 2. THREE CORE STATUS TABS (Invoices Raised / Received / Balance) ── */}
            <div className="px-5 py-3 bg-neutral-100/70 border-b border-neutral-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* TAB 1: ALL INVOICES RAISED */}
              <button
                type="button"
                onClick={() => setActiveTab("ALL")}
                className={`p-3 text-left border transition-all cursor-pointer ${
                  activeTab === "ALL"
                    ? "bg-purple-50/90 border-purple-400 shadow-xs ring-1 ring-purple-400/50"
                    : "bg-white border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10.5px] font-black uppercase tracking-wider ${activeTab === "ALL" ? "text-purple-950" : "text-neutral-600"}`}>
                    1. Invoices Raised
                  </span>
                  <span className="text-[9.5px] font-bold px-1.5 py-0.2 bg-purple-100 text-purple-800 border border-purple-200">
                    {invoices.length} Dispatched
                  </span>
                </div>
                <div className={`text-base font-black font-mono mt-1 ${activeTab === "ALL" ? "text-purple-950" : "text-neutral-900"}`}>
                  {formatINR(kpi.invoicesRaised || 0)}
                </div>
              </button>

              {/* TAB 2: PAYMENT RECEIVED */}
              <button
                type="button"
                onClick={() => setActiveTab("APPROVED")}
                className={`p-3 text-left border transition-all cursor-pointer ${
                  activeTab === "APPROVED"
                    ? "bg-emerald-50/90 border-emerald-400 shadow-xs ring-1 ring-emerald-400/50"
                    : "bg-white border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10.5px] font-black uppercase tracking-wider ${activeTab === "APPROVED" ? "text-emerald-950" : "text-neutral-600"}`}>
                    2. Payment Received
                  </span>
                  <span className="text-[9.5px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Realized
                  </span>
                </div>
                <div className={`text-base font-black font-mono mt-1 ${activeTab === "APPROVED" ? "text-emerald-800" : "text-neutral-900"}`}>
                  {formatINR(kpi.paymentReceived || 0)}
                </div>
              </button>

              {/* TAB 3: BALANCE PAYMENT */}
              <button
                type="button"
                onClick={() => setActiveTab("PENDING")}
                className={`p-3 text-left border transition-all cursor-pointer ${
                  activeTab === "PENDING"
                    ? "bg-amber-50/90 border-amber-400 shadow-xs ring-1 ring-amber-400/50"
                    : "bg-white border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10.5px] font-black uppercase tracking-wider ${activeTab === "PENDING" ? "text-amber-950" : "text-neutral-600"}`}>
                    3. Balance Payment
                  </span>
                  <span className="text-[9.5px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-800 border border-amber-200">
                    Pending
                  </span>
                </div>
                <div className={`text-base font-black font-mono mt-1 ${activeTab === "PENDING" ? "text-amber-800" : "text-neutral-900"}`}>
                  {formatINR(kpi.balancePayment || 0)}
                </div>
              </button>
            </div>

            {/* ── 3. CENTRE QUICK CHIPS & SEARCH TOOLBAR ── */}
            <div className="px-5 py-2.5 bg-white border-b border-neutral-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 flex-wrap">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search company, cabin, invoice #, UTR..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-300 outline-none focus:border-[#006064] focus:bg-white font-medium"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Centre Filter Dropdown */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-neutral-500 font-bold uppercase text-[9.5px] whitespace-nowrap">Centre:</span>
                  <select
                    value={selectedCentre}
                    onChange={(e) => setSelectedCentre(e.target.value)}
                    className="bg-neutral-50 border border-neutral-300 px-2 py-1 text-xs font-bold text-neutral-800 focus:outline-none focus:border-[#006064] cursor-pointer"
                  >
                    <option value="ALL">All Centres</option>
                    <option value="1">Agarwal Complex</option>
                    <option value="2">Mercado</option>
                    <option value="3">Premier House</option>
                  </select>
                </div>

                {/* Workflow Stage Filter (Only in Invoices Raised tab) */}
                {activeTab === "ALL" && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-purple-800 font-bold uppercase text-[9.5px] whitespace-nowrap">Stage:</span>
                    <select
                      value={workflowStatusFilter}
                      onChange={(e) => setWorkflowStatusFilter(e.target.value)}
                      className="bg-purple-50 border border-purple-300 px-2 py-1 text-xs font-bold text-purple-900 focus:outline-none focus:border-purple-700 cursor-pointer"
                    >
                      <option value="ALL">All Stages</option>
                      <option value="PENDING_CM">1. Pending CM Review</option>
                      <option value="ACCOUNTANT">2. With Accountant</option>
                      <option value="TALLY_ATTACHED">3. Tally PDF Attached</option>
                      <option value="APPROVED">4. Live Approved</option>
                    </select>
                  </div>
                )}

                {/* Sort Order */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-neutral-500 font-bold uppercase text-[9.5px] whitespace-nowrap">Sort:</span>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    className="bg-neutral-50 border border-neutral-300 px-2 py-1 text-xs font-bold text-neutral-800 focus:outline-none focus:border-[#006064] cursor-pointer"
                  >
                    <option value="AMT_DESC">Amount (Highest First)</option>
                    <option value="AMT_ASC">Amount (Lowest First)</option>
                    <option value="NAME_ASC">Company Name (A-Z)</option>
                  </select>
                </div>
              </div>

              {/* Metrics */}
              <div className="flex items-center gap-2 self-end md:self-auto text-xs">
                <span className="text-neutral-500 font-medium">
                  Showing <strong className="text-neutral-900 font-bold">{filteredInvoices.length}</strong> of {invoices.length}
                </span>
                <span className="font-bold text-teal-800 bg-teal-50 px-2.5 py-1 border border-teal-200 font-mono text-xs">
                  Sum: {formatINR(filteredTotal)}
                </span>
              </div>
            </div>

            {/* ── 4. ITEMIZED INVOICE TABLE ── */}
            <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[48vh] scrollbar-thin">
              <table className="w-full text-left border-collapse table-fixed min-w-[860px]">
                <colgroup>
                  <col className="w-[75px]" />
                  <col className="w-auto" />
                  <col className="w-[125px]" />
                  <col className="w-[105px]" />
                  <col className="w-[200px]" />
                  <col className="w-[105px]" />
                  <col className="w-[115px]" />
                </colgroup>
                <thead className="sticky top-0 bg-neutral-100 z-10 shadow-2xs">
                  <tr className="border-b border-neutral-200 text-[10.5px] font-black uppercase tracking-wider text-neutral-600">
                    <th className="py-3 px-4 text-left">Inv #</th>
                    <th className="py-3 px-4 text-left">Client &amp; Space</th>
                    <th className="py-3 px-4 text-left">Centre</th>
                    <th className="py-3 px-4 text-left">Billing Month</th>
                    <th className="py-3 px-4 text-left">
                      {activeTab === "ALL" ? "Workflow Lifecycle & Status" : activeTab === "APPROVED" ? "Collection Status & UTR" : "Balance Status"}
                    </th>
                    <th className="py-3 px-4 text-right">Received (₹)</th>
                    <th className="py-3 px-4 text-right">Total / Bal (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-xs">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-neutral-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Layers size={28} className="text-neutral-300" />
                          <p className="text-sm font-semibold text-neutral-600">No invoice records found</p>
                          <p className="text-xs text-neutral-400">Try switching tabs or adjusting search query.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv, idx) => (
                      <tr
                        key={`${inv.id}_${idx}`}
                        className="hover:bg-teal-50/40 transition-colors group"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-[11px] text-neutral-600 text-left">
                          #{inv.srNo || inv.id}
                        </td>
                        <td className="py-3 px-4 font-bold text-neutral-900 text-left">
                          <div className="flex flex-col">
                            <span className="truncate">{inv.companyName}</span>
                            <span className="text-[10px] text-neutral-400 font-normal truncate mt-0.5">
                              {inv.cabinName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-neutral-800 text-left truncate">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#006064] shrink-0" />
                            <span className="truncate">{inv.locationName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-neutral-600 font-mono text-[11px] text-left whitespace-nowrap">
                          <div>{inv.billingMonth}</div>
                          {inv.sendType && (
                            <div className="text-[9px] text-neutral-400">
                              {inv.sendType === 'AUTOMATIC_MONTH_END' ? 'Month-End Dispatch' : 'Manual Dispatch'}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-left">
                          {activeTab === "ALL" ? (
                            <div className="flex flex-col gap-1 items-start">
                              {getWorkflowBadge(inv)}
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingWorkflowInvoice(inv);
                                  }}
                                  className="px-1.5 py-0.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 text-[9px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                  title="View full workflow step-by-step progress"
                                >
                                  <FileText size={9} />
                                  <span>Workflow Details</span>
                                </button>

                                {inv.attachedInvoice?.fileUrl && (
                                  <a
                                    href={inv.attachedInvoice.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="px-1.5 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-[9px] font-bold inline-flex items-center gap-1 transition-colors shadow-2xs"
                                    title="View Tally Invoice PDF uploaded by Accountant"
                                  >
                                    <Paperclip size={9} />
                                    <span>Tally PDF</span>
                                    <ExternalLink size={8} />
                                  </a>
                                )}

                                {((inv.receiveAmount && inv.receiveAmount > 0) || (inv.utrNumber && inv.utrNumber.trim())) && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setViewingPaymentInvoice(inv);
                                    }}
                                    className="px-1.5 py-0.5 bg-teal-50 hover:bg-teal-100 text-[#006064] border border-teal-200 text-[9px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                    title="View payment receipt & UTR details"
                                  >
                                    <Eye size={9} />
                                    <span>Payment</span>
                                  </button>
                                )}
                              </div>
                              {inv.utrNumber && (
                                <div className="text-[10px] text-neutral-500 font-mono truncate max-w-[190px]" title={inv.utrNumber}>
                                  UTR: {inv.utrNumber}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1 items-start">
                              {getStatusBadge(inv.status, inv.isApproved, inv.paymentStatus, inv.utrNumber)}
                              {((inv.receiveAmount && inv.receiveAmount > 0) || (inv.utrNumber && inv.utrNumber.trim())) && (
                                <div className="mt-0.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setViewingPaymentInvoice(inv);
                                    }}
                                    className="px-2 py-0.5 bg-teal-50 hover:bg-teal-100 text-[#006064] border border-teal-200 text-[9.5px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                    title="Click to view full payment receive & UTR details"
                                  >
                                    <Eye size={10} />
                                    <span>View Payment Details</span>
                                  </button>
                                </div>
                              )}
                              {inv.utrNumber && (
                                <div className="text-[10px] text-neutral-500 font-mono truncate max-w-[160px] mt-0.5" title={inv.utrNumber}>
                                  UTR: {inv.utrNumber}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs whitespace-nowrap">
                          <span className={(inv.receiveAmount || 0) > 0 ? "font-bold text-emerald-800" : "text-neutral-400"}>
                            {formatINR(inv.receiveAmount || 0)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs whitespace-nowrap">
                          <div className="flex flex-col items-end">
                            <span className="font-black text-neutral-900">{formatINR(inv.totalAmount)}</span>
                            {(inv.balanceAmount !== undefined && inv.balanceAmount > 0) ? (
                              <span className="text-[10px] text-amber-800 font-bold">
                                Bal: {formatINR(inv.balanceAmount)}
                              </span>
                            ) : (inv.receiveAmount && inv.receiveAmount >= inv.totalAmount && inv.totalAmount > 0) ? (
                              <span className="text-[10px] text-emerald-700 font-bold">
                                Fully Settled
                              </span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ── 5. MODAL FOOTER SUMMARY BAR ── */}
            <div className="px-5 py-3 bg-neutral-50 border-t border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-neutral-500">
                <Building2 size={14} className="text-[#006064]" />
                <span>
                  Showing: <strong className="text-neutral-900 font-bold">{centreStats[selectedCentre]?.name || selectedCentre}</strong>
                  {" • "}Tab: <strong className="text-neutral-900 font-bold">
                    {activeTab === "ALL" ? "All Invoices Raised" : activeTab === "APPROVED" ? "Payment Received" : "Balance Payment"}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-auto">
                <span className="text-neutral-600 font-bold">
                  Total Filtered Amount:
                </span>
                <span className="text-sm sm:text-base font-black text-teal-900 font-mono bg-teal-100/70 px-3 py-1 border border-teal-300">
                  {formatINR(filteredTotal)}
                </span>
              </div>
            </div>

          </motion.div>

          {/* ── 6. SUB-MODAL: DETAILED PAYMENT SETTLEMENT VIEW ── */}
          <AnimatePresence>
            {viewingPaymentInvoice && (
              <div 
                className="fixed inset-0 z-[100002] flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs"
                onClick={() => setViewingPaymentInvoice(null)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-white border border-neutral-300 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-800 to-[#006064] text-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-white/10 rounded-xs">
                        <Receipt size={20} className="text-teal-200" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base sm:text-lg">Payment Settlement Details</h3>
                        <p className="text-xs text-teal-100 font-sans">
                          #{viewingPaymentInvoice.srNo || viewingPaymentInvoice.id} • {viewingPaymentInvoice.companyName} • {viewingPaymentInvoice.billingMonth}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewingPaymentInvoice(null)}
                      className="text-white/70 hover:text-white p-1 cursor-pointer transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="p-4 sm:p-6 space-y-5 text-xs text-gray-800 font-sans">
                    {/* Summary Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-50 p-3.5 border border-neutral-200">
                      <div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase">Total Invoiced</div>
                        <div className="font-mono font-bold text-sm text-gray-900 mt-0.5">
                          {formatINR(viewingPaymentInvoice.totalAmount)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase">Total Received</div>
                        <div className="font-mono font-bold text-sm text-emerald-700 mt-0.5">
                          {formatINR(viewingPaymentInvoice.receiveAmount || 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase">Balance Due</div>
                        <div className="font-mono font-bold text-sm text-amber-700 mt-0.5">
                          {formatINR(viewingPaymentInvoice.balanceAmount !== undefined ? viewingPaymentInvoice.balanceAmount : Math.max(0, viewingPaymentInvoice.totalAmount - (viewingPaymentInvoice.receiveAmount || 0)))}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase">Status</div>
                        <div className="mt-0.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded-xs border ${
                            viewingPaymentInvoice.paymentStatus === 'RECEIVED' || (viewingPaymentInvoice.receiveAmount && viewingPaymentInvoice.receiveAmount >= viewingPaymentInvoice.totalAmount)
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : viewingPaymentInvoice.paymentStatus === 'PARTIAL' || (viewingPaymentInvoice.receiveAmount && viewingPaymentInvoice.receiveAmount > 0)
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}>
                            {viewingPaymentInvoice.paymentStatus || 'RECORDED'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Breakdown / Parts */}
                    <div className="space-y-3">
                      <div className="text-xs font-bold uppercase text-gray-700 tracking-wider flex items-center gap-1.5 border-b border-neutral-200 pb-1.5">
                        <CreditCard size={14} className="text-[#006064]" />
                        <span>Recorded Payment Transactions</span>
                      </div>

                      {(() => {
                        let parts: any[] = [];
                        if (viewingPaymentInvoice.paymentsJson) {
                          try {
                            const parsed = JSON.parse(viewingPaymentInvoice.paymentsJson);
                            if (Array.isArray(parsed) && parsed.length > 0) parts = parsed;
                          } catch {}
                        }

                        if (parts.length === 0 && ((viewingPaymentInvoice.receiveAmount && viewingPaymentInvoice.receiveAmount > 0) || viewingPaymentInvoice.utrNumber)) {
                          parts = [{
                            payReceiveDate: viewingPaymentInvoice.payReceiveDate,
                            receiveAmount: viewingPaymentInvoice.receiveAmount,
                            paymentMode: viewingPaymentInvoice.paymentMode || 'NEFT',
                            utrNumber: viewingPaymentInvoice.utrNumber || 'N/A',
                            utrDate: viewingPaymentInvoice.utrDate,
                            tdsDeducted: viewingPaymentInvoice.tdsDeducted || 'No',
                            tdsAmount: viewingPaymentInvoice.tdsAmount || 0,
                            utrFileUrl: viewingPaymentInvoice.utrFileUrl,
                            utrFileName: viewingPaymentInvoice.utrFileName,
                          }];
                        }

                        if (parts.length === 0) {
                          return (
                            <div className="py-6 text-center text-gray-400 bg-gray-50 border border-dashed border-gray-200">
                              No payment transactions recorded yet.
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-3">
                            {parts.map((p, idx) => (
                              <div key={idx} className="p-3 bg-gray-50 border border-gray-200 space-y-2">
                                <div className="flex items-center justify-between border-b border-gray-200 pb-1.5 flex-wrap gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-800">Payment Entry #{idx + 1}</span>
                                    <span className="px-1.5 py-0.2 bg-teal-100 text-teal-800 text-[10px] font-bold rounded">
                                      {p.paymentMode || viewingPaymentInvoice.paymentMode || 'NEFT'}
                                    </span>
                                  </div>
                                  <div className="font-mono font-bold text-sm text-emerald-800">
                                    {formatINR(Number(p.receiveAmount || 0))}
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                  <div>
                                    <span className="text-gray-500">Payment Date: </span>
                                    <strong className="text-gray-800 font-mono">
                                      {p.payReceiveDate ? String(p.payReceiveDate).split('T')[0] : viewingPaymentInvoice.payReceiveDate || 'N/A'}
                                    </strong>
                                  </div>

                                  <div>
                                    <span className="text-gray-500">UTR / Ref #: </span>
                                    <strong className="text-gray-900 font-mono select-all">
                                      {p.utrNumber || viewingPaymentInvoice.utrNumber || 'N/A'}
                                    </strong>
                                  </div>

                                  <div>
                                    <span className="text-gray-500">UTR Date: </span>
                                    <strong className="text-gray-800 font-mono">
                                      {p.utrDate ? String(p.utrDate).split('T')[0] : viewingPaymentInvoice.utrDate || 'N/A'}
                                    </strong>
                                  </div>

                                  <div>
                                    <span className="text-gray-500">TDS Deducted: </span>
                                    <strong className="text-gray-800">
                                      {p.tdsDeducted === 'Yes' || viewingPaymentInvoice.tdsDeducted === 'Yes'
                                        ? `Yes (${formatINR(Number(p.tdsAmount || viewingPaymentInvoice.tdsAmount || 0))})`
                                        : 'No'}
                                    </strong>
                                  </div>
                                </div>

                                {(p.utrFileUrl || viewingPaymentInvoice.utrFileUrl) && (
                                  <div className="pt-1.5 border-t border-gray-200 flex items-center justify-between">
                                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                      <Paperclip size={11} />
                                      <span>Bank Receipt / Advice:</span>
                                    </span>
                                    <a
                                      href={p.utrFileUrl || viewingPaymentInvoice.utrFileUrl || '#'}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[10px] font-bold text-teal-700 hover:text-teal-900 underline flex items-center gap-1"
                                    >
                                      <span>{p.utrFileName || viewingPaymentInvoice.utrFileName || 'View Receipt PDF'}</span>
                                      <ExternalLink size={10} />
                                    </a>
                                  </div>
                                )}

                                {p.remarks && (
                                  <div className="pt-1 border-t border-gray-200 text-[10px] text-gray-500">
                                    <span>Remarks: </span>
                                    <span className="text-gray-700">{p.remarks}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-3 bg-gray-50 border-t border-neutral-200 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setViewingPaymentInvoice(null)}
                      className="px-4 py-1.5 bg-[#006064] hover:bg-[#004D40] text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* ── 7. SUB-MODAL: INVOICE LIFECYCLE & WORKFLOW PROGRESS ── */}
          <AnimatePresence>
            {viewingWorkflowInvoice && (
              <div
                className="fixed inset-0 z-[100002] flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs"
                onClick={() => setViewingWorkflowInvoice(null)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-white border border-neutral-300 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-neutral-900 via-neutral-800 to-[#004D40] text-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-white/10 rounded-xs">
                        <FileText size={20} className="text-teal-200" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base sm:text-lg">Invoice Workflow Lifecycle</h3>
                        <p className="text-xs text-neutral-300 font-sans">
                          #{viewingWorkflowInvoice.srNo || viewingWorkflowInvoice.id} • {viewingWorkflowInvoice.companyName} • {viewingWorkflowInvoice.billingMonth}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewingWorkflowInvoice(null)}
                      className="text-white/70 hover:text-white p-1 cursor-pointer transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="p-4 sm:p-6 space-y-5 text-xs text-gray-800 font-sans">
                    {/* Top KPI row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-50 p-3.5 border border-neutral-200">
                      <div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase">Total Billed</div>
                        <div className="font-mono font-bold text-sm text-gray-900 mt-0.5">
                          {formatINR(viewingWorkflowInvoice.totalAmount)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase">Dispatch Type</div>
                        <div className="font-bold text-xs text-neutral-800 mt-0.5">
                          {viewingWorkflowInvoice.sendType === 'AUTOMATIC_MONTH_END' ? 'Month-End Auto' : 'Manual Dispatch'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase">Approval Stage</div>
                        <div className="mt-0.5">
                          {getWorkflowBadge(viewingWorkflowInvoice)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase">Payment Realized</div>
                        <div className="font-mono font-bold text-sm text-emerald-700 mt-0.5">
                          {formatINR(viewingWorkflowInvoice.receiveAmount || 0)}
                        </div>
                      </div>
                    </div>

                    {/* Step-by-Step Progress Pipeline */}
                    <div className="space-y-4">
                      <div className="text-xs font-bold uppercase text-gray-700 tracking-wider border-b border-neutral-200 pb-1.5 flex items-center justify-between">
                        <span>Workflow Steps &amp; Review Pipeline</span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {viewingWorkflowInvoice.locationName}
                        </span>
                      </div>

                      {/* Step 1: Dispatched to Invoice Section */}
                      <div className="flex gap-3 p-3 bg-emerald-50/50 border border-emerald-200">
                        <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          ✓
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-emerald-950 text-xs">
                              1. Dispatched to Invoice Section
                            </span>
                            <span className="text-[10px] font-mono text-emerald-800 font-bold">
                              {viewingWorkflowInvoice.sentAt || viewingWorkflowInvoice.createdAt || 'Done'}
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-900/80 leading-relaxed">
                            {viewingWorkflowInvoice.sendType === 'AUTOMATIC_MONTH_END'
                              ? 'Automatically queued on working month-end (e.g., 31 Aug for Sept) for Community Manager review.'
                              : 'Manually generated and sent to Community Manager queue.'}
                          </p>
                        </div>
                      </div>

                      {/* Step 2: Community Manager Review */}
                      {(() => {
                        const isCMReviewed = viewingWorkflowInvoice.status !== 'PENDING_CM_REVIEW';
                        return (
                          <div className={`flex gap-3 p-3 border ${isCMReviewed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/70 border-amber-300'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                              isCMReviewed ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white animate-pulse'
                            }`}>
                              {isCMReviewed ? '✓' : '2'}
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className={`font-bold text-xs ${isCMReviewed ? 'text-emerald-950' : 'text-amber-950'}`}>
                                  2. Community Manager (CM) Review
                                </span>
                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 border ${
                                  isCMReviewed ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                                }`}>
                                  {isCMReviewed ? 'Reviewed' : 'Review Pending'}
                                </span>
                              </div>
                              <p className={`text-[11px] leading-relaxed ${isCMReviewed ? 'text-emerald-900/80' : 'text-amber-900/80'}`}>
                                {isCMReviewed
                                  ? 'Community Manager reviewed client cabins, billing cycle days, and workspace configuration.'
                                  : 'Awaiting Community Manager review and verification before dispatching to accountant.'}
                              </p>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Step 3: Sent to Accountant */}
                      {(() => {
                        const isSentToAccountant = viewingWorkflowInvoice.status !== 'PENDING_CM_REVIEW';
                        return (
                          <div className={`flex gap-3 p-3 border ${isSentToAccountant ? 'bg-emerald-50/50 border-emerald-200' : 'bg-neutral-50 border-neutral-200'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                              isSentToAccountant ? 'bg-emerald-600 text-white' : 'bg-neutral-300 text-neutral-600'
                            }`}>
                              {isSentToAccountant ? '✓' : '3'}
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className={`font-bold text-xs ${isSentToAccountant ? 'text-emerald-950' : 'text-neutral-600'}`}>
                                  3. Dispatched to Accountant
                                </span>
                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 border ${
                                  isSentToAccountant ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                                }`}>
                                  {isSentToAccountant ? 'Sent to Accountant' : 'Pending CM Send'}
                                </span>
                              </div>
                              <p className={`text-[11px] leading-relaxed ${isSentToAccountant ? 'text-emerald-900/80' : 'text-neutral-500'}`}>
                                {isSentToAccountant
                                  ? 'Invoice dispatched to Finance & Accounts queue for Tally ERP entry.'
                                  : 'Waiting for Community Manager to complete review and dispatch to Accountant.'}
                              </p>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Step 4: Accountant Tally Invoice Attachment */}
                      {(() => {
                        const hasTallyPdf = Boolean(viewingWorkflowInvoice.attachedInvoice?.fileUrl) || viewingWorkflowInvoice.status === 'INVOICE_ATTACHED' || viewingWorkflowInvoice.status === 'APPROVED';
                        return (
                          <div className={`flex gap-3 p-3 border ${hasTallyPdf ? 'bg-emerald-50/50 border-emerald-200' : viewingWorkflowInvoice.status === 'SENT_TO_ACCOUNTANT' ? 'bg-sky-50/70 border-sky-300' : 'bg-neutral-50 border-neutral-200'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                              hasTallyPdf ? 'bg-emerald-600 text-white' : viewingWorkflowInvoice.status === 'SENT_TO_ACCOUNTANT' ? 'bg-sky-600 text-white animate-pulse' : 'bg-neutral-300 text-neutral-600'
                            }`}>
                              {hasTallyPdf ? '✓' : '4'}
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className={`font-bold text-xs ${hasTallyPdf ? 'text-emerald-950' : viewingWorkflowInvoice.status === 'SENT_TO_ACCOUNTANT' ? 'text-sky-950' : 'text-neutral-600'}`}>
                                  4. Accountant Tally Invoice Attachment
                                </span>
                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 border ${
                                  hasTallyPdf ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                                }`}>
                                  {hasTallyPdf ? 'Tally PDF Attached' : 'Awaiting Tally Upload'}
                                </span>
                              </div>
                              <p className={`text-[11px] leading-relaxed ${hasTallyPdf ? 'text-emerald-900/80' : 'text-neutral-500'}`}>
                                {hasTallyPdf
                                  ? 'Accountant generated the official Tally Tax Invoice and attached the PDF for CM final approval.'
                                  : 'Accountant is currently processing the Tally invoice entry and attaching the PDF.'}
                              </p>
                              {viewingWorkflowInvoice.attachedInvoice?.fileUrl && (
                                <div className="pt-2">
                                  <a
                                    href={viewingWorkflowInvoice.attachedInvoice.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] inline-flex items-center gap-1.5 shadow-xs transition-colors"
                                  >
                                    <Paperclip size={11} />
                                    <span>{viewingWorkflowInvoice.attachedInvoice.fileName || 'View Attached Tally Invoice PDF'}</span>
                                    <ExternalLink size={10} />
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Step 5: CM Final Approval (Live Approved) */}
                      {(() => {
                        const isApproved = viewingWorkflowInvoice.isApproved || viewingWorkflowInvoice.status === 'APPROVED';
                        return (
                          <div className={`flex gap-3 p-3 border ${isApproved ? 'bg-emerald-50/50 border-emerald-200' : viewingWorkflowInvoice.status === 'INVOICE_ATTACHED' ? 'bg-purple-50/70 border-purple-300' : 'bg-neutral-50 border-neutral-200'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                              isApproved ? 'bg-emerald-600 text-white' : viewingWorkflowInvoice.status === 'INVOICE_ATTACHED' ? 'bg-purple-600 text-white animate-pulse' : 'bg-neutral-300 text-neutral-600'
                            }`}>
                              {isApproved ? '✓' : '5'}
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className={`font-bold text-xs ${isApproved ? 'text-emerald-950' : 'text-neutral-700'}`}>
                                  5. CM Final Approval (Live Approved)
                                </span>
                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 border ${
                                  isApproved ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                                }`}>
                                  {isApproved ? 'Live Approved' : 'Pending CM Approval'}
                                </span>
                              </div>
                              <p className={`text-[11px] leading-relaxed ${isApproved ? 'text-emerald-900/80' : 'text-neutral-500'}`}>
                                {isApproved
                                  ? 'Community Manager reviewed the Tally invoice and gave final approval. The invoice is active and sent to client.'
                                  : 'Awaiting Community Manager final review of the attached Tally PDF.'}
                              </p>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Step 6: Payment Realization (Bank Collection) */}
                      {(() => {
                        const rec = Number(viewingWorkflowInvoice.receiveAmount || 0);
                        const isPaid = rec >= viewingWorkflowInvoice.totalAmount && viewingWorkflowInvoice.totalAmount > 0;
                        const isPartial = rec > 0 && !isPaid;
                        return (
                          <div className={`flex gap-3 p-3 border ${isPaid ? 'bg-emerald-50/50 border-emerald-200' : isPartial ? 'bg-blue-50/70 border-blue-300' : 'bg-neutral-50 border-neutral-200'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                              isPaid ? 'bg-emerald-600 text-white' : isPartial ? 'bg-blue-600 text-white' : 'bg-neutral-300 text-neutral-600'
                            }`}>
                              {isPaid ? '✓' : '6'}
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className={`font-bold text-xs ${isPaid ? 'text-emerald-950' : isPartial ? 'text-blue-950' : 'text-neutral-700'}`}>
                                  6. Payment Realization (Bank Collection)
                                </span>
                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 border ${
                                  isPaid ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : isPartial ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                                }`}>
                                  {isPaid ? 'Fully Realized' : isPartial ? 'Partially Paid' : 'Awaiting Collection'}
                                </span>
                              </div>
                              <p className={`text-[11px] leading-relaxed ${isPaid ? 'text-emerald-900/80' : isPartial ? 'text-blue-900/80' : 'text-neutral-500'}`}>
                                {isPaid
                                  ? `Full payment of ${formatINR(rec)} received in bank with verified UTR ${viewingWorkflowInvoice.utrNumber || ''}.`
                                  : isPartial
                                  ? `Partial payment of ${formatINR(rec)} received. Remaining balance: ${formatINR(viewingWorkflowInvoice.balanceAmount || Math.max(0, viewingWorkflowInvoice.totalAmount - rec))}.`
                                  : 'Payment pending from client. Accountant will enter UTR and bank receipt details once deposited.'}
                              </p>
                              {(rec > 0 || viewingWorkflowInvoice.utrNumber) && (
                                <div className="pt-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const target = viewingWorkflowInvoice;
                                      setViewingWorkflowInvoice(null);
                                      setViewingPaymentInvoice(target);
                                    }}
                                    className="px-2.5 py-1 bg-[#006064] hover:bg-[#004D40] text-white font-bold text-[10px] inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                                  >
                                    <Receipt size={11} />
                                    <span>View Payment Settlement Details &amp; UTR</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-3 bg-gray-50 border-t border-neutral-200 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setViewingWorkflowInvoice(null)}
                      className="px-4 py-1.5 bg-[#006064] hover:bg-[#004D40] text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
