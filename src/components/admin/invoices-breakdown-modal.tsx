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
  CreditCard
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
  status: string;
  billingMonth: string;
  dueDate: string | null;
  createdAt: string | null;
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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSelectedCentre(initialLocationId);
      setSearchQuery("");
      setSortOrder("AMT_DESC");
    }
  }, [isOpen, initialTab, initialLocationId]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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
      map.ALL.raised += inv.totalAmount;
      if (inv.isApproved) map.ALL.received += inv.totalAmount;
      else map.ALL.balance += inv.totalAmount;

      const locKey = String(inv.locationId);
      if (map[locKey]) {
        map[locKey].raised += inv.totalAmount;
        map[locKey].count += 1;
        if (inv.isApproved) map[locKey].received += inv.totalAmount;
        else map[locKey].balance += inv.totalAmount;
      }
    });

    return map;
  }, [invoices]);

  // Filtered & Sorted Invoices
  const filteredInvoices = useMemo(() => {
    let list = [...invoices];

    // Filter by Tab (Status)
    if (activeTab === "APPROVED") {
      list = list.filter((inv) => inv.isApproved);
    } else if (activeTab === "PENDING") {
      list = list.filter((inv) => !inv.isApproved);
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
  }, [invoices, activeTab, selectedCentre, searchQuery, sortOrder]);

  // Current Filtered Sums
  const filteredTotal = useMemo(() => {
    return filteredInvoices.reduce((acc, inv) => acc + (Number(inv.totalAmount) || 0), 0);
  }, [filteredInvoices]);

  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) {
      toast.error("No invoices to export.");
      return;
    }

    const rows = [
      ["Invoice #", "Company Name", "Cabin / Product", "Centre / Location", "Billing Month", "Due Date", "Status", "Taxable Amount (INR)", "Total Amount (INR)"],
      ...filteredInvoices.map((inv) => [
        `#${inv.srNo || inv.id}`,
        `"${(inv.companyName || "").replace(/"/g, '""')}"`,
        `"${(inv.cabinName || "").replace(/"/g, '""')}"`,
        inv.locationName,
        inv.billingMonth,
        inv.dueDate || "N/A",
        inv.status,
        inv.taxableAmount,
        inv.totalAmount,
      ]),
      ["TOTAL", "", "", "", "", "", "", "", filteredTotal],
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

  const getStatusBadge = (status: string, isApproved: boolean) => {
    if (isApproved || status === "APPROVED" || status === "PAID") {
      return (
        <span className="text-[9.5px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider inline-flex items-center gap-1">
          <CheckCircle2 size={10} />
          Approved / Paid
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
      <span className="text-[9.5px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider inline-flex items-center gap-1">
        <AlertCircle size={10} />
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
                  <p className="text-xs text-neutral-300 font-light mt-0.5 flex items-center gap-2">
                    <span>
                      Raised: <strong className="text-purple-300 font-bold font-mono">{formatINR(kpi.invoicesRaised || 0)}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Received: <strong className="text-emerald-300 font-bold font-mono">{formatINR(kpi.paymentReceived || 0)}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Balance: <strong className="text-amber-300 font-bold font-mono">{formatINR(kpi.balancePayment || 0)}</strong>
                    </span>
                    {periodInfo && (
                      <>
                        <span>•</span>
                        <span className="text-neutral-400">
                          {periodInfo.startDate} to {periodInfo.endDate}
                        </span>
                      </>
                    )}
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
                    Approved
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
                    In Pipeline
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
                    placeholder="Search company, cabin, invoice #..."
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
              <table className="w-full text-left border-collapse table-fixed min-w-[760px]">
                <colgroup>
                  <col className="w-[90px]" />
                  <col className="w-auto" />
                  <col className="w-[160px]" />
                  <col className="w-[120px]" />
                  <col className="w-[150px]" />
                  <col className="w-[130px]" />
                </colgroup>
                <thead className="sticky top-0 bg-neutral-100 z-10 shadow-2xs">
                  <tr className="border-b border-neutral-200 text-[10.5px] font-black uppercase tracking-wider text-neutral-600">
                    <th className="py-3 px-4 text-left">Inv #</th>
                    <th className="py-3 px-4 text-left">Client &amp; Space</th>
                    <th className="py-3 px-4 text-left">Centre</th>
                    <th className="py-3 px-4 text-left">Billing Month</th>
                    <th className="py-3 px-4 text-left">Status</th>
                    <th className="py-3 px-4 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-xs">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-neutral-400">
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
                          {inv.billingMonth}
                        </td>
                        <td className="py-3 px-4 text-left whitespace-nowrap">
                          {getStatusBadge(inv.status, inv.isApproved)}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-neutral-900 font-mono text-xs whitespace-nowrap">
                          {formatINR(inv.totalAmount)}
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
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
