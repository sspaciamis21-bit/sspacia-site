"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar,
  X,
  Search,
  Download,
  Printer,
  Building2,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  TrendingUp,
  Landmark,
  ArrowUpDown,
  Filter,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  Clock,
  MapPin,
  Banknote,
  Receipt,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { LiveApprovedInvoice, PaymentPartItem } from "./invoice-payment-management";

export interface FlatPaymentRecord {
  id: string; // unique key e.g. `${inv.id}_part_${idx}`
  invoiceId: number;
  srNo: number;
  companyName: string;
  cabinName: string;
  gstNo: string;
  centreName: string;
  centreId: number | null;
  billingMonth: string;
  invoiceTotalAmount: number;
  invoiceBalanceAmount: number;
  invoicePaymentStatus: "PENDING" | "RECEIVED" | "PARTIAL";
  // Payment specific details
  payReceiveDate: string; // YYYY-MM-DD
  receiveAmount: number;
  paymentMode: string;
  utrNumber: string;
  utrDate: string;
  tdsDeducted: string;
  tdsAmount: number;
  remarks: string;
  partIndex: number;
  totalParts: number;
}

interface InvoicePaymentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices?: LiveApprovedInvoice[];
  initialLocation?: string;
}

type DatePreset =
  | "LAST_7_DAYS"
  | "PREV_7_DAYS"
  | "LAST_14_DAYS"
  | "LAST_30_DAYS"
  | "THIS_MONTH"
  | "ALL_TIME"
  | "CUSTOM";

export function InvoicePaymentReportModal({
  isOpen,
  onClose,
  invoices = [],
  initialLocation = "ALL",
}: InvoicePaymentReportModalProps) {
  const [mounted, setMounted] = useState(false);
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  // All invoices loaded fallback (to ensure we capture all billing cycles even if parent table is filtered)
  const [allInvoices, setAllInvoices] = useState<LiveApprovedInvoice[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);

  // Filters
  const [selectedCentre, setSelectedCentre] = useState<string>(initialLocation);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMode, setSelectedMode] = useState<string>("ALL");
  const [datePreset, setDatePreset] = useState<DatePreset>("LAST_7_DAYS");

  // Custom date range
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const default7DaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  }, []);

  const [customStartDate, setCustomStartDate] = useState<string>(default7DaysAgo);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

  // Sorting
  const [sortBy, setSortBy] = useState<"DATE_DESC" | "DATE_ASC" | "AMOUNT_DESC" | "AMOUNT_ASC" | "NAME_ASC">("DATE_DESC");

  useEffect(() => {
    setMounted(true);
  }, []);

  // When modal opens, sync invoices & fetch global invoices if needed
  useEffect(() => {
    if (!isOpen) return;

    setSelectedCentre(initialLocation || "ALL");
    setSearchQuery("");
    setSelectedMode("ALL");
    setDatePreset("LAST_7_DAYS");

    const d = new Date();
    d.setDate(d.getDate() - 7);
    setCustomStartDate(d.toISOString().split("T")[0]);
    setCustomEndDate(new Date().toISOString().split("T")[0]);

    if (invoices && invoices.length > 0) {
      setAllInvoices(invoices);
    }

    // Always fetch latest approved invoices globally so 7-day payments across ALL months show
    setLoadingAll(true);
    fetch("/api/admin/invoice-payments")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data && Array.isArray(data.data)) {
          setAllInvoices(data.data);
        }
      })
      .catch((err) => {
        console.warn("Failed to load global invoice payments:", err);
      })
      .finally(() => setLoadingAll(false));
  }, [isOpen, initialLocation, invoices]);

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

  // Compute effective date window based on preset
  const { dateRangeStart, dateRangeEnd } = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    if (datePreset === "CUSTOM") {
      return { dateRangeStart: customStartDate || null, dateRangeEnd: customEndDate || null };
    }

    if (datePreset === "LAST_7_DAYS") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return { dateRangeStart: d.toISOString().split("T")[0], dateRangeEnd: today };
    }

    if (datePreset === "PREV_7_DAYS") {
      const dStart = new Date();
      dStart.setDate(dStart.getDate() - 14);
      const dEnd = new Date();
      dEnd.setDate(dEnd.getDate() - 8);
      return { dateRangeStart: dStart.toISOString().split("T")[0], dateRangeEnd: dEnd.toISOString().split("T")[0] };
    }

    if (datePreset === "LAST_14_DAYS") {
      const d = new Date();
      d.setDate(d.getDate() - 14);
      return { dateRangeStart: d.toISOString().split("T")[0], dateRangeEnd: today };
    }

    if (datePreset === "LAST_30_DAYS") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return { dateRangeStart: d.toISOString().split("T")[0], dateRangeEnd: today };
    }

    if (datePreset === "THIS_MONTH") {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return { dateRangeStart: d.toISOString().split("T")[0], dateRangeEnd: today };
    }

    // ALL_TIME
    return { dateRangeStart: null, dateRangeEnd: null };
  }, [datePreset, customStartDate, customEndDate]);

  // Flatten all approved invoice payments into individual payment line items
  const allFlattenedPayments = useMemo<FlatPaymentRecord[]>(() => {
    const records: FlatPaymentRecord[] = [];
    const sourceInvoices = allInvoices.length > 0 ? allInvoices : invoices;

    sourceInvoices.forEach((inv) => {
      const totalAmt = Number(inv.totalAmount || inv.amount || 0);
      const balAmt = Number(inv.balanceAmount ?? totalAmt);

      let parts: PaymentPartItem[] = [];
      if (inv.paymentsJson) {
        try {
          const parsed = JSON.parse(inv.paymentsJson);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parts = parsed;
          }
        } catch {}
      }

      if (parts.length > 0) {
        parts.forEach((p, idx) => {
          const amt = Number(p.receiveAmount || 0);
          const pDate = p.payReceiveDate ? String(p.payReceiveDate).split("T")[0] : "";
          if (amt > 0 || pDate || (p.utrNumber && p.utrNumber.trim())) {
            records.push({
              id: `${inv.id}_part_${p.id || idx}`,
              invoiceId: inv.id,
              srNo: inv.srNo,
              companyName: inv.companyName,
              cabinName: inv.cabinName || "Coworking Space",
              gstNo: inv.gstNo || "",
              centreName: inv.locationName || "Mercado",
              centreId: inv.locationId,
              billingMonth: inv.billingMonth || "",
              invoiceTotalAmount: totalAmt,
              invoiceBalanceAmount: balAmt,
              invoicePaymentStatus: inv.paymentStatus,
              payReceiveDate: pDate,
              receiveAmount: amt,
              paymentMode: p.paymentMode || "NEFT",
              utrNumber: p.utrNumber || "",
              utrDate: p.utrDate ? String(p.utrDate).split("T")[0] : pDate,
              tdsDeducted: p.tdsDeducted || "No",
              tdsAmount: Number(p.tdsAmount || 0),
              remarks: p.remarks || inv.remarks || "",
              partIndex: idx + 1,
              totalParts: parts.length,
            });
          }
        });
      } else {
        const amt = Number(inv.receiveAmount || 0);
        const pDate = inv.payReceiveDate ? String(inv.payReceiveDate).split("T")[0] : "";
        if (amt > 0 || pDate || (inv.utrNumber && inv.utrNumber.trim())) {
          records.push({
            id: `${inv.id}_direct`,
            invoiceId: inv.id,
            srNo: inv.srNo,
            companyName: inv.companyName,
            cabinName: inv.cabinName || "Coworking Space",
            gstNo: inv.gstNo || "",
            centreName: inv.locationName || "Mercado",
            centreId: inv.locationId,
            billingMonth: inv.billingMonth || "",
            invoiceTotalAmount: totalAmt,
            invoiceBalanceAmount: balAmt,
            invoicePaymentStatus: inv.paymentStatus,
            payReceiveDate: pDate,
            receiveAmount: amt,
            paymentMode: inv.paymentMode || "NEFT",
            utrNumber: inv.utrNumber || "",
            utrDate: inv.utrDate ? String(inv.utrDate).split("T")[0] : pDate,
            tdsDeducted: inv.tdsDeducted || "No",
            tdsAmount: Number(inv.tdsAmount || 0),
            remarks: inv.remarks || "",
            partIndex: 1,
            totalParts: 1,
          });
        }
      }
    });

    return records;
  }, [allInvoices, invoices]);

  // Filter payments by date range
  const dateFilteredPayments = useMemo(() => {
    if (!dateRangeStart && !dateRangeEnd) return allFlattenedPayments;

    return allFlattenedPayments.filter((p) => {
      const d = p.payReceiveDate || p.utrDate;
      if (!d) return false;
      if (dateRangeStart && d < dateRangeStart) return false;
      if (dateRangeEnd && d > dateRangeEnd) return false;
      return true;
    });
  }, [allFlattenedPayments, dateRangeStart, dateRangeEnd]);

  // Centre stats summary within the selected date range
  const centreStats = useMemo(() => {
    const map: Record<string, { name: string; count: number; totalAmount: number; companies: Set<string> }> = {
      ALL: { name: "All Centres", count: 0, totalAmount: 0, companies: new Set() },
      "Agarwal Complex": { name: "Agarwal Complex", count: 0, totalAmount: 0, companies: new Set() },
      Mercado: { name: "Mercado", count: 0, totalAmount: 0, companies: new Set() },
      "Premier House": { name: "Premier House", count: 0, totalAmount: 0, companies: new Set() },
    };

    dateFilteredPayments.forEach((p) => {
      map.ALL.count += 1;
      map.ALL.totalAmount += p.receiveAmount;
      map.ALL.companies.add(p.companyName);

      const cName = p.centreName || "Mercado";
      const key = Object.keys(map).find((k) => k !== "ALL" && cName.toLowerCase().includes(k.toLowerCase())) || "Mercado";
      if (map[key]) {
        map[key].count += 1;
        map[key].totalAmount += p.receiveAmount;
        map[key].companies.add(p.companyName);
      }
    });

    return map;
  }, [dateFilteredPayments]);

  // Apply Centre, Mode, Search, and Sort Filters
  const filteredAndSortedRecords = useMemo(() => {
    let list = [...dateFilteredPayments];

    // Centre Filter
    if (selectedCentre !== "ALL") {
      const target = selectedCentre.toLowerCase();
      list = list.filter((p) => p.centreName.toLowerCase().includes(target));
    }

    // Payment Mode Filter
    if (selectedMode !== "ALL") {
      list = list.filter((p) => (p.paymentMode || "").toUpperCase() === selectedMode.toUpperCase());
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.companyName.toLowerCase().includes(q) ||
          p.centreName.toLowerCase().includes(q) ||
          (p.cabinName && p.cabinName.toLowerCase().includes(q)) ||
          (p.utrNumber && p.utrNumber.toLowerCase().includes(q)) ||
          (p.billingMonth && p.billingMonth.toLowerCase().includes(q)) ||
          (p.paymentMode && p.paymentMode.toLowerCase().includes(q)) ||
          (p.gstNo && p.gstNo.toLowerCase().includes(q))
      );
    }

    // Sorting
    return list.sort((a, b) => {
      if (sortBy === "DATE_DESC") {
        return (b.payReceiveDate || "").localeCompare(a.payReceiveDate || "");
      }
      if (sortBy === "DATE_ASC") {
        return (a.payReceiveDate || "").localeCompare(b.payReceiveDate || "");
      }
      if (sortBy === "AMOUNT_DESC") {
        return b.receiveAmount - a.receiveAmount;
      }
      if (sortBy === "AMOUNT_ASC") {
        return a.receiveAmount - b.receiveAmount;
      }
      return a.companyName.localeCompare(b.companyName);
    });
  }, [dateFilteredPayments, selectedCentre, selectedMode, searchQuery, sortBy]);

  // Filtered Totals
  const totalFilteredAmount = useMemo(() => {
    return filteredAndSortedRecords.reduce((acc, r) => acc + r.receiveAmount, 0);
  }, [filteredAndSortedRecords]);

  const uniqueClientsFilteredCount = useMemo(() => {
    return new Set(filteredAndSortedRecords.map((r) => r.companyName)).size;
  }, [filteredAndSortedRecords]);

  const formatINR = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatDateDisplay = (dStr?: string) => {
    if (!dStr) return "—";
    try {
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return dStr;
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dStr;
    }
  };

  const getRelativeDaysBadge = (dStr?: string) => {
    if (!dStr) return null;
    try {
      const target = new Date(dStr).setHours(0, 0, 0, 0);
      const today = new Date().setHours(0, 0, 0, 0);
      const diffDays = Math.round((today - target) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">Today</span>;
      if (diffDays === 1) return <span className="text-[9px] bg-teal-100 text-teal-800 font-bold px-1.5 py-0.2 rounded">Yesterday</span>;
      if (diffDays > 1 && diffDays <= 7) return <span className="text-[9px] bg-neutral-100 text-neutral-700 font-semibold px-1.5 py-0.2 rounded">{diffDays}d ago</span>;
      return null;
    } catch {
      return null;
    }
  };

  const handleCopyUtr = (utr: string) => {
    if (!utr) return;
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    toast.success("UTR Number copied to clipboard");
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredAndSortedRecords.length === 0) {
      toast.error("No payment records to export.");
      return;
    }

    const headers = [
      "Sr No",
      "Corporate Client",
      "Coworking Centre",
      "Billing Month",
      "Payment Receive Date",
      "Amount Received (INR)",
      "Payment Mode",
      "UTR / Reference Number",
      "Invoice Total (INR)",
      "Balance Due (INR)",
      "Settlement Status",
      "Remarks",
    ];

    const rows = [
      headers,
      ...filteredAndSortedRecords.map((r, idx) => [
        idx + 1,
        `"${(r.companyName || "").replace(/"/g, '""')}"`,
        `"${r.centreName}"`,
        `"${r.billingMonth}"`,
        r.payReceiveDate || "N/A",
        r.receiveAmount || 0,
        r.paymentMode || "NEFT",
        `"${(r.utrNumber || "").replace(/"/g, '""')}"`,
        r.invoiceTotalAmount || 0,
        r.invoiceBalanceAmount || 0,
        r.invoicePaymentStatus,
        `"${(r.remarks || "").replace(/"/g, '""')}"`,
      ]),
      [
        "TOTAL",
        `${uniqueClientsFilteredCount} Unique Clients`,
        selectedCentre,
        "",
        `Range: ${dateRangeStart || "All"} to ${dateRangeEnd || "All"}`,
        totalFilteredAmount,
        "",
        "",
        "",
        "",
        "",
        "",
      ],
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((r) => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SSPACIA_7Day_Payment_Report_${selectedCentre}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("7-Day Payment Report exported to CSV.");
  };

  const handlePrint = () => {
    window.print();
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-neutral-950/70 backdrop-blur-xs print:hidden"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative w-full max-w-6xl max-h-[92vh] bg-white border border-neutral-300 shadow-2xl flex flex-col overflow-hidden z-10 print:border-none print:shadow-none print:max-h-none"
          >
            {/* ── 1. MODAL HEADER ── */}
            <div className="bg-[#004d40] px-5 py-4 border-b border-[#00382e] flex items-center justify-between gap-4 text-white print:bg-white print:text-black print:border-b-2 print:border-black">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-sm flex items-center justify-center text-teal-300 border border-white/20 print:hidden">
                  <Banknote size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white print:text-black">
                      7-Day Invoice Payment Collection Report
                    </h2>
                    <span className="text-[10px] font-bold bg-amber-400/20 text-amber-300 px-2 py-0.5 border border-amber-400/30 uppercase tracking-widest flex items-center gap-1 print:border print:border-black print:text-black">
                      <Sparkles size={11} /> 7-Day Window
                    </span>
                    {loadingAll && (
                      <span className="text-[10px] font-mono text-teal-200 flex items-center gap-1 animate-pulse">
                        <RefreshCw size={10} className="animate-spin" /> Syncing all receipts...
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-300 font-light mt-0.5 flex items-center gap-2 flex-wrap print:text-gray-700">
                    <span>
                      Window:{" "}
                      <strong className="text-teal-200 font-mono font-bold">
                        {formatDateDisplay(dateRangeStart || default7DaysAgo)} — {formatDateDisplay(dateRangeEnd || todayStr)}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Total Realized:{" "}
                      <strong className="text-amber-300 font-bold font-mono">
                        {formatINR(totalFilteredAmount)}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Transactions:{" "}
                      <strong className="text-white font-bold font-mono">
                        {filteredAndSortedRecords.length} Receipts
                      </strong>
                    </span>
                  </p>
                </div>
              </div>

              {/* Action Buttons: Export CSV, Print, Close */}
              <div className="flex items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 text-xs font-bold text-teal-200 bg-white/10 hover:bg-white/20 border border-white/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Export 7-day payment report to CSV"
                >
                  <Download size={13} />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Print this report"
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

            {/* ── 2. QUICK DATE WINDOW PRESETS & KPI SUMMARY CARDS ── */}
            <div className="bg-neutral-50 px-5 py-3 border-b border-neutral-200 space-y-3">
              {/* Presets Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider mr-1 flex items-center gap-1">
                    <Clock size={12} /> Time Range:
                  </span>
                  {[
                    { id: "LAST_7_DAYS", label: "Today - 7 Days (Default)" },
                    { id: "PREV_7_DAYS", label: "Previous 7 Days" },
                    { id: "LAST_14_DAYS", label: "Last 14 Days" },
                    { id: "LAST_30_DAYS", label: "Last 30 Days" },
                    { id: "THIS_MONTH", label: "This Month" },
                    { id: "ALL_TIME", label: "All Realized" },
                    { id: "CUSTOM", label: "Custom Range" },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setDatePreset(preset.id as DatePreset)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-xs transition-all cursor-pointer ${
                        datePreset === preset.id
                          ? "bg-[#004d40] text-white shadow-xs"
                          : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Custom Date Pickers (Shown if CUSTOM selected) */}
                {datePreset === "CUSTOM" && (
                  <div className="flex items-center gap-2 text-xs bg-white p-1.5 border border-gray-300 rounded-xs">
                    <span className="text-[10px] font-bold text-gray-500">From:</span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="border border-gray-300 px-1.5 py-0.5 text-xs font-mono focus:outline-none focus:border-[#004d40]"
                    />
                    <span className="text-[10px] font-bold text-gray-500">To:</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="border border-gray-300 px-1.5 py-0.5 text-xs font-mono focus:outline-none focus:border-[#004d40]"
                    />
                  </div>
                )}
              </div>

              {/* 4 Telemetry KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* KPI 1: Total Realized Amount */}
                <div className="bg-white p-3 border border-neutral-200 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                      Total Collections
                    </span>
                    <TrendingUp size={14} className="text-emerald-600" />
                  </div>
                  <div className="text-lg sm:text-xl font-black text-emerald-800 font-mono mt-1">
                    {formatINR(totalFilteredAmount)}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    Realized in chosen period
                  </div>
                </div>

                {/* KPI 2: Total Receipts */}
                <div className="bg-white p-3 border border-neutral-200 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                      Total Receipts
                    </span>
                    <Receipt size={14} className="text-[#004d40]" />
                  </div>
                  <div className="text-lg sm:text-xl font-black text-[#1B1C1C] font-mono mt-1">
                    {filteredAndSortedRecords.length}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    Payment entries / splits
                  </div>
                </div>

                {/* KPI 3: Unique Clients Paid */}
                <div className="bg-white p-3 border border-neutral-200 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                      Unique Clients
                    </span>
                    <Building2 size={14} className="text-blue-600" />
                  </div>
                  <div className="text-lg sm:text-xl font-black text-[#1B1C1C] font-mono mt-1">
                    {uniqueClientsFilteredCount}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    Companies paid dues
                  </div>
                </div>

                {/* KPI 4: Centre Share */}
                <div className="bg-white p-3 border border-neutral-200 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                      Top Centre Realized
                    </span>
                    <MapPin size={14} className="text-purple-600" />
                  </div>
                  <div className="text-xs font-bold text-gray-800 mt-1 flex flex-col gap-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-teal-700">Mercado:</span>
                      <span className="font-mono">{formatINR(centreStats.Mercado?.totalAmount || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-blue-700">Agarwal:</span>
                      <span className="font-mono">{formatINR(centreStats["Agarwal Complex"]?.totalAmount || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-purple-700">Premier:</span>
                      <span className="font-mono">{formatINR(centreStats["Premier House"]?.totalAmount || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 3. CENTRE TABS & FILTER TOOLBAR ── */}
            <div className="px-5 py-2.5 bg-white border-b border-neutral-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Centre Selection Tabs */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider mr-1">
                  Centre:
                </span>
                {[
                  { id: "ALL", label: "All Centres", statsKey: "ALL" },
                  { id: "Mercado", label: "Mercado", statsKey: "Mercado" },
                  { id: "Agarwal Complex", label: "Agarwal Complex", statsKey: "Agarwal Complex" },
                  { id: "Premier House", label: "Premier House", statsKey: "Premier House" },
                ].map((c) => {
                  const stat = centreStats[c.statsKey];
                  const isSel = selectedCentre.toLowerCase() === c.id.toLowerCase();
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCentre(c.id)}
                      className={`px-3 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                        isSel
                          ? "bg-[#004d40] text-white border-[#004d40] shadow-xs"
                          : "bg-neutral-50 text-gray-700 border-neutral-200 hover:bg-neutral-100"
                      }`}
                    >
                      <span>{c.label}</span>
                      <span
                        className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                          isSel ? "bg-white/20 text-white" : "bg-neutral-200 text-neutral-800"
                        }`}
                      >
                        {formatINR(stat?.totalAmount || 0)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search & Sort Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search Bar */}
                <div className="relative min-w-[200px] flex-1">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search client, UTR, cabin..."
                    className="w-full bg-neutral-50 border border-neutral-300 pl-8 pr-3 py-1 text-xs focus:outline-none focus:border-[#004d40]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Mode Filter */}
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-gray-400 text-[10px] uppercase font-bold">Mode:</span>
                  <select
                    value={selectedMode}
                    onChange={(e) => setSelectedMode(e.target.value)}
                    className="bg-neutral-50 border border-neutral-300 px-2 py-1 text-xs font-medium focus:outline-none focus:border-[#004d40] cursor-pointer"
                  >
                    <option value="ALL">All Modes</option>
                    <option value="NEFT">NEFT</option>
                    <option value="RTGS">RTGS</option>
                    <option value="IMPS">IMPS</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                {/* Sort Order */}
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-gray-400 text-[10px] uppercase font-bold">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-neutral-50 border border-neutral-300 px-2 py-1 text-xs font-medium focus:outline-none focus:border-[#004d40] cursor-pointer"
                  >
                    <option value="DATE_DESC">Date (Newest First)</option>
                    <option value="DATE_ASC">Date (Oldest First)</option>
                    <option value="AMOUNT_DESC">Amount (Highest First)</option>
                    <option value="AMOUNT_ASC">Amount (Lowest First)</option>
                    <option value="NAME_ASC">Company Name (A-Z)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ── 4. DETAILED PAYMENTS TABLE ── */}
            <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[50vh] scrollbar-thin">
              <table className="w-full text-left border-collapse table-fixed min-w-[1050px]">
                <colgroup>
                  <col className="w-[50px]" />
                  <col className="w-[200px]" />
                  <col className="w-[120px]" />
                  <col className="w-[110px]" />
                  <col className="w-[110px]" />
                  <col className="w-[125px]" />
                  <col className="w-[120px]" />
                  <col className="w-[90px]" />
                  <col className="w-[180px]" />
                  <col className="w-[100px]" />
                </colgroup>
                <thead className="bg-neutral-100 text-[10.5px] font-black uppercase tracking-wider text-neutral-600 sticky top-0 z-10 border-b border-neutral-300 shadow-2xs">
                  <tr>
                    <th className="py-2.5 px-3 text-center">#</th>
                    <th className="py-2.5 px-3">Corporate Client</th>
                    <th className="py-2.5 px-3">Centre</th>
                    <th className="py-2.5 px-3">Billing Cycle</th>
                    <th className="py-2.5 px-3 text-right">Invoice Sum</th>
                    <th className="py-2.5 px-3 text-center bg-emerald-100/70 text-emerald-900 border-x border-emerald-200">
                      Payment Date
                    </th>
                    <th className="py-2.5 px-3 text-right bg-emerald-50 text-emerald-900 border-r border-emerald-200">
                      Amount Received
                    </th>
                    <th className="py-2.5 px-3 text-center">Mode</th>
                    <th className="py-2.5 px-3">UTR / Reference No</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-xs text-neutral-800">
                  {filteredAndSortedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-16 text-center text-neutral-400">
                        <div className="flex flex-col items-center justify-center gap-2.5">
                          <Calendar size={32} className="text-neutral-300" />
                          <p className="text-sm font-bold text-neutral-700">
                            No payment receipts found for the selected {datePreset === "LAST_7_DAYS" ? "last 7 days" : "range"}.
                          </p>
                          <p className="text-xs text-neutral-400 max-w-md">
                            No payments were recorded between{" "}
                            <strong className="text-neutral-600">
                              {dateRangeStart || "start"} and {dateRangeEnd || "end"}
                            </strong>
                            {selectedCentre !== "ALL" ? ` for ${selectedCentre}` : ""}.
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => setDatePreset("LAST_30_DAYS")}
                              className="px-3 py-1 bg-[#004d40] text-white text-xs font-bold rounded-xs cursor-pointer hover:bg-[#00382e]"
                            >
                              View Last 30 Days
                            </button>
                            <button
                              type="button"
                              onClick={() => setDatePreset("ALL_TIME")}
                              className="px-3 py-1 bg-neutral-200 text-neutral-800 text-xs font-bold rounded-xs cursor-pointer hover:bg-neutral-300"
                            >
                              View All Time Receipts
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedRecords.map((r, idx) => {
                      const isMercado = r.centreName.toLowerCase().includes("mercado");
                      const isAgarwal = r.centreName.toLowerCase().includes("agarwal");
                      const isPremier = r.centreName.toLowerCase().includes("premier");

                      return (
                        <tr
                          key={r.id}
                          className="hover:bg-teal-50/40 transition-colors group"
                        >
                          {/* 1. Sr. No */}
                          <td className="py-2.5 px-3 text-center font-mono text-[11px] text-gray-500">
                            #{idx + 1}
                          </td>

                          {/* 2. Corporate Client */}
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-[#1B1C1C] group-hover:text-[#004d40] transition-colors truncate">
                              {r.companyName}
                            </div>
                            <div className="text-[10px] text-gray-500 truncate flex items-center gap-1.5">
                              <span>{r.cabinName}</span>
                              {r.gstNo && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono text-[9.5px]">{r.gstNo}</span>
                                </>
                              )}
                            </div>
                          </td>

                          {/* 3. Centre */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10.5px] font-bold border ${
                                isMercado
                                  ? "bg-teal-50 text-teal-800 border-teal-200"
                                  : isAgarwal
                                  ? "bg-blue-50 text-blue-800 border-blue-200"
                                  : isPremier
                                  ? "bg-purple-50 text-purple-800 border-purple-200"
                                  : "bg-gray-50 text-gray-700 border-gray-200"
                              }`}
                            >
                              <MapPin size={10} />
                              {r.centreName}
                            </span>
                          </td>

                          {/* 4. Billing Cycle */}
                          <td className="py-2.5 px-3 font-medium text-[11px] text-gray-700 whitespace-nowrap">
                            {r.billingMonth || "—"}
                          </td>

                          {/* 5. Invoice Total */}
                          <td className="py-2.5 px-3 text-right font-mono text-gray-600 text-[11px]">
                            {formatINR(r.invoiceTotalAmount)}
                          </td>

                          {/* 6. Payment Date */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap bg-emerald-50/50 border-x border-emerald-200">
                            <div className="font-bold font-mono text-[#1B1C1C]">
                              {formatDateDisplay(r.payReceiveDate)}
                            </div>
                            <div className="mt-0.5">
                              {getRelativeDaysBadge(r.payReceiveDate)}
                            </div>
                          </td>

                          {/* 7. Amount Received */}
                          <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-800 bg-emerald-50/30 border-r border-emerald-200 text-xs sm:text-sm">
                            {formatINR(r.receiveAmount)}
                            {r.totalParts > 1 && (
                              <div className="text-[9px] text-gray-400 font-normal">
                                Split {r.partIndex} of {r.totalParts}
                              </div>
                            )}
                          </td>

                          {/* 8. Mode */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-800 border border-neutral-200 rounded font-mono text-[10px] font-bold">
                              {r.paymentMode || "NEFT"}
                            </span>
                          </td>

                          {/* 9. UTR / Ref Number */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {r.utrNumber ? (
                              <div className="flex items-center gap-1.5 max-w-[210px]">
                                <span
                                  className="font-mono text-[10px] text-gray-800 truncate"
                                  title={r.utrNumber}
                                >
                                  {r.utrNumber}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyUtr(r.utrNumber)}
                                  className="text-gray-400 hover:text-black transition-colors p-0.5"
                                  title="Copy UTR number"
                                >
                                  {copiedUtr === r.utrNumber ? (
                                    <Check size={11} className="text-emerald-600" />
                                  ) : (
                                    <Copy size={11} />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-300 font-mono text-[10px]">—</span>
                            )}
                          </td>

                          {/* 10. Status */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {r.invoicePaymentStatus === "RECEIVED" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-xs">
                                <CheckCircle2 size={10} /> Fully Settled
                              </span>
                            ) : r.invoicePaymentStatus === "PARTIAL" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-xs">
                                Partial Due
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded-xs">
                                Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* ── 5. MODAL FOOTER ── */}
            <div className="bg-neutral-100 px-5 py-3 border-t border-neutral-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 text-neutral-600 font-medium flex-wrap">
                <span>
                  Showing <strong className="text-neutral-900 font-bold">{filteredAndSortedRecords.length}</strong> of{" "}
                  {allFlattenedPayments.length} total receipts recorded
                </span>
                <span>•</span>
                <span>
                  Unique Paying Clients:{" "}
                  <strong className="text-neutral-900 font-bold">{uniqueClientsFilteredCount} Companies</strong>
                </span>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-3 py-1 font-mono text-xs sm:text-sm">
                  Total Received: {formatINR(totalFilteredAmount)}
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 bg-[#004d40] hover:bg-[#00382e] text-white font-bold text-xs uppercase tracking-wider rounded-xs cursor-pointer shadow-xs transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
