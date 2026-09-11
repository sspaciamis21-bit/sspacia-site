"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Landmark,
  X,
  Search,
  Calendar,
  Download,
  Printer,
  Edit3,
  RefreshCw,
  Check,
  Building2,
  FileSpreadsheet,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

export interface BankTransactionItem {
  id: number;
  valueDate: string;
  postDate: string;
  details: string;
  refNo: string;
  debit: number | null;
  credit: number | null;
  balance: number;
  vendorName?: string | null;
  category?: string | null;
  locationName?: string | null;
  paymentMode?: string | null;
  expenseId?: number;
  invoiceUrl?: string | null;
  receiptUrl?: string | null;
}

export interface BankConfig {
  bankName: string;
  accountNo: string;
  openingBalance: number;
  asOfDate: string;
}

export interface BankStatementSummary {
  broughtForward: number;
  drCount: number;
  crCount: number;
  totalDebits: number;
  totalCredits: number;
  closingBalance: number;
}

interface BankStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  isAccountant: boolean;
}

export function BankStatementModal({
  isOpen,
  onClose,
  isAdmin,
  isAccountant,
}: BankStatementModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<BankTransactionItem[]>([]);
  const [config, setConfig] = useState<BankConfig>({
    bankName: "ICICI BANK",
    accountNo: "136705002010",
    openingBalance: 50000,
    asOfDate: "2026-08-01",
  });
  const [summary, setSummary] = useState<BankStatementSummary>({
    broughtForward: 50000,
    drCount: 0,
    crCount: 0,
    totalDebits: 0,
    totalCredits: 0,
    closingBalance: 50000,
  });

  // Comprehensive Filters: Month-wise, Year-wise, Date-wise, Custom Date Range
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "MONTH" | "YEAR" | "DATE" | "CUSTOM">("ALL");
  const [selectedMonth, setSelectedMonth] = useState("ALL");
  const [selectedYear, setSelectedYear] = useState("ALL");
  const [selectedDate, setSelectedDate] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Edit Opening Balance Modal
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [newOpeningBalance, setNewOpeningBalance] = useState("50000");
  const [newAsOfDate, setNewAsOfDate] = useState("2026-08-01");
  const [savingBalance, setSavingBalance] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch Statement on Open
  useEffect(() => {
    if (isOpen) {
      fetchStatement(true);
    }
  }, [isOpen]);

  const fetchStatement = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      else setRefreshing(true);

      const res = await fetch("/api/admin/bank-statement");
      const data = await res.json();

      if (data.success) {
        setConfig(data.config);
        setNewOpeningBalance(String(data.config.openingBalance || 50000));
        setNewAsOfDate(data.config.asOfDate || "2026-08-01");
        setTransactions(data.transactions || []);
        setSummary(data.summary);
      } else {
        toast.error(data.error || "Failed to load bank statement");
      }
    } catch (err) {
      console.error("Error fetching bank statement:", err);
      toast.error("Network error loading bank statement");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSaveOpeningBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingBalance(true);
      const parsedVal = parseFloat(newOpeningBalance);
      if (isNaN(parsedVal)) {
        toast.error("Please enter a valid opening balance amount");
        return;
      }

      const res = await fetch("/api/admin/bank-statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          openingBalance: parsedVal,
          asOfDate: newAsOfDate,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Opening balance updated and recalculated!");
        setIsEditingBalance(false);
        fetchStatement(false);
      } else {
        toast.error(data.error || "Failed to update opening balance");
      }
    } catch (err) {
      console.error("Error updating balance:", err);
      toast.error("Error saving opening balance");
    } finally {
      setSavingBalance(false);
    }
  };

  // Month options derived from transactions
  const availableMonths = useMemo(() => {
    const monthMap = new Map<string, string>();
    transactions.forEach((t) => {
      const parts = t.valueDate.split("/");
      if (parts.length === 3) {
        const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleString("en-US", { month: "short", year: "numeric" });
        monthMap.set(key, label);
      }
    });
    return Array.from(monthMap.entries()).map(([value, label]) => ({ value, label }));
  }, [transactions]);

  // Year options derived from transactions
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    transactions.forEach((t) => {
      const parts = t.valueDate.split("/");
      if (parts.length === 3 && parts[2]) {
        yearsSet.add(parts[2]);
      }
    });
    if (yearsSet.size === 0) {
      yearsSet.add(new Date().getFullYear().toString());
    }
    return Array.from(yearsSet).sort().reverse();
  }, [transactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // 1. Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const detailsMatch = t.details?.toLowerCase().includes(q);
        const refMatch = t.refNo?.toLowerCase().includes(q);
        const vendorMatch = t.vendorName?.toLowerCase().includes(q);
        const amountMatch = String(t.debit || "").includes(q) || String(t.credit || "").includes(q);
        if (!detailsMatch && !refMatch && !vendorMatch && !amountMatch) return false;
      }

      // 2. Date Filtering
      const parts = t.valueDate.split("/"); // DD/MM/YYYY
      if (parts.length === 3) {
        const yyyy = parts[2];
        const mm = parts[1];
        const dd = parts[0];
        const isoDate = `${yyyy}-${mm}-${dd}`;
        const monthKey = `${yyyy}-${mm}`;

        if (filterType === "MONTH" && selectedMonth !== "ALL") {
          if (monthKey !== selectedMonth) return false;
        } else if (filterType === "YEAR" && selectedYear !== "ALL") {
          if (yyyy !== selectedYear) return false;
        } else if (filterType === "DATE" && selectedDate) {
          if (isoDate !== selectedDate) return false;
        } else if (filterType === "CUSTOM") {
          if (fromDate && isoDate < fromDate) return false;
          if (toDate && isoDate > toDate) return false;
        }
      }

      return true;
    });
  }, [transactions, searchQuery, filterType, selectedMonth, selectedYear, selectedDate, fromDate, toDate]);

  // Filtered summary
  const filteredSummary = useMemo(() => {
    const isFiltered =
      filterType !== "ALL" ||
      searchQuery.trim() !== "" ||
      selectedMonth !== "ALL" ||
      selectedYear !== "ALL" ||
      selectedDate !== "" ||
      fromDate !== "" ||
      toDate !== "";

    if (!isFiltered) {
      return summary;
    }
    const drSum = filteredTransactions.reduce((acc, t) => acc + (t.debit || 0), 0);
    const crSum = filteredTransactions.reduce((acc, t) => acc + (t.credit || 0), 0);
    return {
      broughtForward: summary.broughtForward,
      drCount: filteredTransactions.filter((t) => t.debit && t.debit > 0).length,
      crCount: filteredTransactions.filter((t) => t.credit && t.credit > 0).length,
      totalDebits: Math.round(drSum * 100) / 100,
      totalCredits: Math.round(crSum * 100) / 100,
      closingBalance: Math.round((summary.broughtForward - drSum + crSum) * 100) / 100,
    };
  }, [filteredTransactions, summary, filterType, searchQuery, selectedMonth, selectedYear, selectedDate, fromDate, toDate]);

  // Dynamic Statement Period Label for the Summary Box Header
  const statementPeriodLabel = useMemo(() => {
    if (filterType === "MONTH" && selectedMonth !== "ALL") {
      const match = availableMonths.find((m) => m.value === selectedMonth);
      return match ? match.label.toUpperCase() : selectedMonth;
    }
    if (filterType === "YEAR" && selectedYear !== "ALL") {
      return `YEAR ${selectedYear}`;
    }
    if (filterType === "DATE" && selectedDate) {
      const parts = selectedDate.split("-");
      return `FOR DATE : ${parts.reverse().join("/")}`;
    }
    if (filterType === "CUSTOM") {
      const f = fromDate ? fromDate.split("-").reverse().join("/") : "START";
      const t = toDate ? toDate.split("-").reverse().join("/") : "END";
      return `${f} TO ${t}`;
    }
    return `${config.asOfDate.split("-").reverse().join("/")} TO ${new Date().toISOString().split("T")[0].split("-").reverse().join("/")}`;
  }, [filterType, selectedMonth, selectedYear, selectedDate, fromDate, toDate, availableMonths, config.asOfDate]);

  if (!isOpen || !mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 p-2 sm:p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white border border-gray-300 w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 font-sans my-auto">
        {/* ── TOP ICICI BRANDED BANNER & HEADER ── */}
        <div className="bg-[#283593] text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-sm text-[#283593] shadow-xs">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-display font-black tracking-wide uppercase">
                {config.bankName}
              </h2>
              <p className="text-xs text-indigo-200 mt-0.5 font-mono">
                A/C NO: <span className="font-bold text-white tracking-wider">{config.accountNo}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Edit Opening Balance Button (Accountant / Super Admin) */}
            {(isAccountant || isAdmin) && (
              <button
                type="button"
                onClick={() => setIsEditingBalance(true)}
                className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider border border-white/30 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Define initial Brought Forward balance"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-300" />
                <span>Opening Balance</span>
              </button>
            )}

            {/* Refresh */}
            <button
              type="button"
              onClick={() => fetchStatement(false)}
              disabled={refreshing}
              className="bg-white/10 hover:bg-white/20 text-white p-2 border border-white/30 transition-all cursor-pointer"
              title="Refresh Statement"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>

            {/* Print Statement */}
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-white/10 hover:bg-white/20 text-white p-2 border border-white/30 transition-all cursor-pointer"
              title="Print Bank Statement"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="bg-white/20 hover:bg-red-600 text-white p-2 rounded-xs transition-colors cursor-pointer ml-1"
              title="Close Bank Statement"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── ACCOUNT SUMMARY STRIP ── */}
        <div className="bg-indigo-50/60 border-b border-indigo-100 p-3 px-5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <span className="text-gray-500 font-medium">Brought Forward: </span>
              <span className="font-bold text-gray-900 font-mono text-sm">
                {formatCurrency(summary.broughtForward)}
              </span>
            </div>
            <div className="h-4 w-px bg-gray-300 hidden sm:block" />
            <div>
              <span className="text-gray-500 font-medium">Total Debits: </span>
              <span className="font-bold text-red-700 font-mono text-sm">
                -{formatCurrency(filteredSummary.totalDebits)}
              </span>
            </div>
            <div className="h-4 w-px bg-gray-300 hidden sm:block" />
            <div>
              <span className="text-gray-500 font-medium">Current Balance: </span>
              <span className="font-black text-[#006064] font-mono text-base bg-white px-2.5 py-0.5 border border-indigo-200 shadow-2xs">
                {formatCurrency(filteredSummary.closingBalance)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-500">
              Source: <strong className="text-gray-700">Super Admin Approved Expense Disbursements</strong>
            </span>
          </div>
        </div>

        {/* ── SEARCH & COMPREHENSIVE MULTI-MODE FILTER BAR ── */}
        <div className="p-3 px-5 bg-white border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-[240px] max-w-sm">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search narration, UTR, vendor, or amount..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 focus:outline-none focus:border-[#283593] bg-gray-50/50"
              />
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Filter Mode Selector */}
            <div className="flex items-center gap-1 bg-gray-100 p-0.5 border border-gray-300 text-xs">
              <button
                type="button"
                onClick={() => setFilterType("ALL")}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase cursor-pointer transition-all ${
                  filterType === "ALL" ? "bg-[#283593] text-white shadow-2xs" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterType("MONTH")}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase cursor-pointer transition-all ${
                  filterType === "MONTH" ? "bg-[#283593] text-white shadow-2xs" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => setFilterType("YEAR")}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase cursor-pointer transition-all ${
                  filterType === "YEAR" ? "bg-[#283593] text-white shadow-2xs" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Year
              </button>
              <button
                type="button"
                onClick={() => setFilterType("DATE")}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase cursor-pointer transition-all ${
                  filterType === "DATE" ? "bg-[#283593] text-white shadow-2xs" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Date
              </button>
              <button
                type="button"
                onClick={() => setFilterType("CUSTOM")}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase cursor-pointer transition-all ${
                  filterType === "CUSTOM" ? "bg-[#283593] text-white shadow-2xs" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Custom Range
              </button>
            </div>

            {/* Sub-filters based on Filter Mode */}
            {filterType === "MONTH" && (
              <div className="flex items-center gap-1.5 animate-in fade-in">
                <Calendar className="w-3.5 h-3.5 text-gray-500" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-800 bg-white focus:outline-none focus:border-[#283593] cursor-pointer"
                >
                  <option value="ALL">All Months ({transactions.length})</option>
                  {availableMonths.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {filterType === "YEAR" && (
              <div className="flex items-center gap-1.5 animate-in fade-in">
                <Calendar className="w-3.5 h-3.5 text-gray-500" />
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-800 bg-white focus:outline-none focus:border-[#283593] cursor-pointer"
                >
                  <option value="ALL">All Years</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      Year {yr}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {filterType === "DATE" && (
              <div className="flex items-center gap-1.5 animate-in fade-in">
                <Calendar className="w-3.5 h-3.5 text-gray-500" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border border-gray-300 px-2.5 py-1 text-xs bg-white focus:outline-none focus:border-[#283593]"
                />
              </div>
            )}

            {filterType === "CUSTOM" && (
              <div className="flex items-center gap-1.5 animate-in fade-in">
                <span className="text-[11px] text-gray-500 font-bold">From:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="border border-gray-300 px-2 py-1 text-xs bg-white focus:outline-none focus:border-[#283593]"
                />
                <span className="text-[11px] text-gray-500 font-bold">To:</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="border border-gray-300 px-2 py-1 text-xs bg-white focus:outline-none focus:border-[#283593]"
                />
              </div>
            )}

            {/* Clear Filters button if filtered */}
            {(filterType !== "ALL" || searchQuery || selectedMonth !== "ALL" || selectedYear !== "ALL" || selectedDate || fromDate || toDate) && (
              <button
                type="button"
                onClick={() => {
                  setFilterType("ALL");
                  setSearchQuery("");
                  setSelectedMonth("ALL");
                  setSelectedYear("ALL");
                  setSelectedDate("");
                  setFromDate("");
                  setToDate("");
                }}
                className="text-[11px] text-red-600 hover:text-red-800 underline font-bold px-1 cursor-pointer ml-1"
                title="Reset all filters"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* ── STATEMENT TABLE (AUTHENTIC ICICI BANK FORMAT) ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-gray-50/40">
          {loading ? (
            <div className="py-16 text-center text-gray-500 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#283593] mb-2" />
              <span>Generating ICICI Bank Statement...</span>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-16 text-center text-gray-500 text-xs bg-white border border-gray-200 p-8">
              <Landmark className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <h4 className="font-bold text-gray-800 text-sm">No Transactions Recorded Yet</h4>
              <p className="text-gray-500 mt-1 max-w-md mx-auto">
                Once Super Admin approves vendor expense payments, they will automatically populate as official debit entries in this ICICI Bank Statement.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-gray-300 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  {/* ── PURPLE / INDIGO BANK HEADER ── */}
                  <thead>
                    <tr className="bg-[#283593] text-white font-mono text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-3 whitespace-nowrap text-center border-r border-indigo-700 w-24">
                        Value Date
                      </th>
                      <th className="py-3 px-3 whitespace-nowrap text-center border-r border-indigo-700 w-24">
                        Post Date
                      </th>
                      <th className="py-3 px-4 min-w-[280px] border-r border-indigo-700">
                        Details / Transaction Narration
                      </th>
                      <th className="py-3 px-3 whitespace-nowrap text-center border-r border-indigo-700 font-mono">
                        Ref No/ Cheque No
                      </th>
                      <th className="py-3 px-3 text-right whitespace-nowrap border-r border-indigo-700 w-28">
                        ₹ Debit
                      </th>
                      <th className="py-3 px-3 text-right whitespace-nowrap border-r border-indigo-700 w-28">
                        ₹ Credit
                      </th>
                      <th className="py-3 px-3 text-right whitespace-nowrap font-bold w-32">
                        Balance (₹)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {/* Opening Balance Row */}
                    <tr className="bg-amber-50/50 font-mono text-gray-800 border-b border-amber-200">
                      <td className="py-2.5 px-3 text-center text-gray-500 text-[11px]">
                        {config.asOfDate.split("-").reverse().join("/")}
                      </td>
                      <td className="py-2.5 px-3 text-center text-gray-500 text-[11px]">
                        {config.asOfDate.split("-").reverse().join("/")}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-amber-900 tracking-wide text-[11px]">
                        OPENING BALANCE BROUGHT FORWARD
                      </td>
                      <td className="py-2.5 px-3 text-center text-gray-400 font-mono">-</td>
                      <td className="py-2.5 px-3 text-right text-gray-400 font-mono">-</td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 font-mono font-bold">
                        {formatCurrency(summary.broughtForward)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900 bg-amber-50">
                        {formatCurrency(summary.broughtForward)}
                      </td>
                    </tr>

                    {/* Transaction Rows */}
                    {filteredTransactions.map((tx, idx) => (
                      <tr
                        key={tx.id || idx}
                        className={`hover:bg-indigo-50/30 transition-colors ${
                          idx % 2 === 0 ? "bg-white" : "bg-[#fafafa]"
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center font-mono text-gray-600 text-[11px] whitespace-nowrap border-r border-gray-100">
                          {tx.valueDate}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-gray-600 text-[11px] whitespace-nowrap border-r border-gray-100">
                          {tx.postDate}
                        </td>
                        <td className="py-2.5 px-4 text-gray-800 border-r border-gray-100 leading-relaxed">
                          <div className="font-mono text-[11.5px] font-semibold text-gray-900">
                            {tx.details}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                            <span className="font-medium text-[#283593]">{tx.category}</span>
                            <span>•</span>
                            <span>{tx.locationName}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-gray-700 text-[11px] border-r border-gray-100 whitespace-nowrap">
                          {tx.refNo || "-"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-red-700 border-r border-gray-100 whitespace-nowrap">
                          {tx.debit ? Number(tx.debit).toFixed(2) : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 border-r border-gray-100 whitespace-nowrap">
                          {tx.credit ? Number(tx.credit).toFixed(2) : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900 bg-gray-50/60 whitespace-nowrap">
                          {Number(tx.balance).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── STATEMENT SUMMARY TABLE (MATCHING EXACT ICICI SUMMARY BOX IN IMAGE 1) ── */}
          <div className="mt-6 space-y-3">
            <div className="border border-indigo-900 bg-white overflow-hidden shadow-xs">
              <div className="bg-[#283593] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                <span>
                  Statement Summary : {statementPeriodLabel}
                </span>
                <span className="text-indigo-200 text-[11px]">
                  Account No: {config.accountNo}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200 text-[11px]">
                      <th className="py-2.5 px-3 border-r border-gray-200">Brought Forward (₹)</th>
                      <th className="py-2.5 px-3 border-r border-gray-200">Dr Count</th>
                      <th className="py-2.5 px-3 border-r border-gray-200">Cr Count</th>
                      <th className="py-2.5 px-3 border-r border-gray-200">Total Debits (₹)</th>
                      <th className="py-2.5 px-3 border-r border-gray-200">Total Credits (₹)</th>
                      <th className="py-2.5 px-3 font-black text-[#283593]">Closing Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="font-mono text-xs font-bold text-gray-900">
                      <td className="py-3 px-3 border-r border-gray-200">
                        {formatCurrency(filteredSummary.broughtForward)} CR
                      </td>
                      <td className="py-3 px-3 border-r border-gray-200 text-red-700">
                        {filteredSummary.drCount}
                      </td>
                      <td className="py-3 px-3 border-r border-gray-200 text-emerald-700">
                        {filteredSummary.crCount}
                      </td>
                      <td className="py-3 px-3 border-r border-gray-200 text-red-700 font-black">
                        {Number(filteredSummary.totalDebits).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 border-r border-gray-200 text-emerald-700 font-black">
                        {Number(filteredSummary.totalCredits).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 bg-indigo-50 font-black text-indigo-950 text-sm">
                        {formatCurrency(filteredSummary.closingBalance)} CR
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Regulatory Footer Note */}
            <div className="p-3 bg-gray-50 border border-gray-200 text-[10.5px] text-gray-500 space-y-0.5">
              <p>• Please do not share your ATM, Debit/Credit Card number, PIN, OTP, Username or Password with anyone.</p>
              <p>• If your account is operated by a Power of Attorney holder, please review the transactions with extra care.</p>
              <p className="font-medium text-gray-600">• This is a computer generated bank statement from SSPāCIA ICICI portal and does not require a physical signature.</p>
            </div>
          </div>
        </div>

        {/* ── MODAL FOOTER ── */}
        <div className="p-3 px-5 border-t border-gray-200 bg-white flex items-center justify-between shrink-0">
          <div className="text-[11px] text-gray-500">
            Showing <strong className="text-gray-900">{filteredTransactions.length}</strong> transactions
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-100 border border-gray-300 cursor-pointer"
          >
            Close Statement
          </button>
        </div>
      </div>

      {/* ── NESTED MODAL: EDIT OPENING / BROUGHT FORWARD BALANCE ── */}
      {isEditingBalance && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="bg-white border border-gray-300 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-[#283593] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-300" />
                <h3 className="text-sm font-bold uppercase tracking-wide">
                  Set Initial Brought Forward Balance
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingBalance(false)}
                className="p-1 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOpeningBalance} className="p-5 space-y-4 text-xs">
              <p className="text-[11.5px] text-gray-600 leading-relaxed">
                Enter the initial available balance of <strong>{config.bankName}</strong> A/C{" "}
                <strong>{config.accountNo}</strong>. All approved expenses will automatically deduct from this base balance.
              </p>

              <div>
                <label className="block font-bold text-gray-800 uppercase tracking-wider mb-1">
                  Available Opening Balance (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newOpeningBalance}
                  onChange={(e) => setNewOpeningBalance(e.target.value)}
                  placeholder="e.g. 100000"
                  className="w-full border border-gray-300 p-2 text-sm font-mono font-bold text-gray-900 focus:outline-none focus:border-[#283593]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-800 uppercase tracking-wider mb-1">
                  As of Date *
                </label>
                <input
                  type="date"
                  required
                  value={newAsOfDate}
                  onChange={(e) => setNewAsOfDate(e.target.value)}
                  className="w-full border border-gray-300 p-2 text-xs font-mono focus:outline-none focus:border-[#283593]"
                />
              </div>

              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingBalance(false)}
                  className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-600 hover:bg-gray-100 border border-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBalance}
                  className="bg-[#283593] hover:bg-indigo-900 text-white px-5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{savingBalance ? "Saving..." : "Save & Recalculate"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
