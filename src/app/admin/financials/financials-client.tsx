"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  Building2, 
  Calendar, 
  ArrowLeft, 
  Download, 
  Printer, 
  RefreshCw, 
  ShieldCheck, 
  Filter, 
  Layers,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  Maximize2
} from "lucide-react";
import { toast } from "sonner";

import { FadeUp } from "@/components/ui/fade-up";
import { ExpensesBreakdownModal } from "@/components/admin/expenses-breakdown-modal";
import { InvoicesBreakdownModal, ItemizedInvoice } from "@/components/admin/invoices-breakdown-modal";
import { GrossProfitModal } from "@/components/admin/gross-profit-modal";

interface LocationComparison {
  locationId: number;
  locationName: string;
  area: string;
  revenue: number;
  expenses: number;
  grossProfit: number;
  grossMarginPercent: number;
  isProfitable: boolean;
}

interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: string;
}

interface ItemizedExpense {
  id: string;
  locationId: number;
  locationName: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  paymentMode: string;
  receipt: string;
}

interface FinancialData {
  period: {
    type: string;
    startDate: string;
    endDate: string;
    year: number;
    month?: string;
    quarter?: string;
  };
  selectedLocationId: string;
  kpi: {
    totalRevenue: number;
    invoicesRaised?: number;
    paymentReceived?: number;
    balancePayment?: number;
    totalExpenses: number;
    grossProfit: number;
    grossProfitMargin: number;
    isProfitable: boolean;
    transactionCount: number;
    expenseCount: number;
  };
  centreComparison: LocationComparison[];
  revenueBreakdown: CategoryBreakdown[];
  expenseBreakdown: CategoryBreakdown[];
  recentExpenses: ItemizedExpense[];
  recentInvoices?: ItemizedInvoice[];
}

export function FinancialsClient() {
  const [data, setData] = useState<FinancialData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [selectedLocationId, setSelectedLocationId] = useState<string>("ALL");
  const [periodType, setPeriodType] = useState<"month" | "quarter" | "fy" | "custom">("month");
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-08");
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedQuarter, setSelectedQuarter] = useState<string>("Q2");
  const [startDate, setStartDate] = useState<string>("2026-04-01");
  const [endDate, setEndDate] = useState<string>("2026-08-31");
  const [expenseSearch, setExpenseSearch] = useState<string>("");

  // Modal State Controllers
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);
  const [invoiceModalTab, setInvoiceModalTab] = useState<"ALL" | "APPROVED" | "PENDING">("ALL");
  const [isGrossProfitModalOpen, setIsGrossProfitModalOpen] = useState<boolean>(false);

  const handleOpenInvoicesModal = (tab: "ALL" | "APPROVED" | "PENDING" = "ALL") => {
    setInvoiceModalTab(tab);
    setIsInvoiceModalOpen(true);
  };

  const fetchFinancials = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("locationId", selectedLocationId);
      params.set("periodType", periodType);
      params.set("year", String(selectedYear));

      if (periodType === "month") {
        params.set("month", selectedMonth);
      } else if (periodType === "quarter") {
        params.set("quarter", selectedQuarter);
      } else if (periodType === "custom") {
        params.set("startDate", startDate);
        params.set("endDate", endDate);
      }

      const res = await fetch(`/api/admin/financials?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load financial records");
      }
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        toast.error(json.error || "Unable to fetch financial data");
      }
    } catch (err: any) {
      console.error("[Financials Fetch Error]:", err);
      toast.error(err.message || "Failed to load financials");
    } finally {
      setIsLoading(false);
    }
  }, [selectedLocationId, periodType, selectedMonth, selectedYear, selectedQuarter, startDate, endDate]);

  useEffect(() => {
    fetchFinancials();
  }, [fetchFinancials]);

  const formatINR = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const handleExportCSV = () => {
    if (!data) return;
    const rows = [
      ["Centre / Branch", "Revenue (INR)", "Expenses (INR)", "Gross Profit (INR)", "Gross Margin (%)"],
      ...data.centreComparison.map((c) => [
        c.locationName,
        c.revenue,
        c.expenses,
        c.grossProfit,
        `${c.grossMarginPercent}%`,
      ]),
      ["TOTAL", data.kpi.totalRevenue, data.kpi.totalExpenses, data.kpi.grossProfit, `${data.kpi.grossProfitMargin}%`],
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SSPACIA_Financials_${selectedLocationId}_${periodType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Financial summary CSV exported successfully");
  };

  const filteredExpenses = data?.recentExpenses.filter((exp) => {
    if (!expenseSearch) return true;
    const s = expenseSearch.toLowerCase();
    return (
      exp.description.toLowerCase().includes(s) ||
      exp.category.toLowerCase().includes(s) ||
      exp.locationName.toLowerCase().includes(s) ||
      String(exp.amount).includes(s)
    );
  }) || [];

  return (
    <div className="space-y-6">
      
      {/* ── 1. TOP EXECUTIVE BANNER ── */}
      <FadeUp delay={0}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/dashboard"
              className="p-2 rounded-none bg-neutral-100 hover:bg-neutral-200 text-gray-700 transition-colors flex items-center justify-center border border-neutral-200"
              title="Back to Admin Dashboard"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#006064] bg-teal-50 px-2 py-0.5 border border-teal-200">
                  SUPER ADMIN EXCLUSIVE
                </span>
                <span className="text-[10px] font-bold text-gray-400 font-mono">
                  P&amp;L Intelligence
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#1B1C1C] font-display tracking-tight uppercase mt-0.5">
                Financial Analytics &amp; Gross Profit
              </h1>
              <p className="text-xs text-gray-500 font-light mt-0.5">
                Live centre-by-centre revenue, operational expenses, invoice collection pipeline, and net profit margins.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => fetchFinancials()}
              className="px-3 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-neutral-50 border border-neutral-200 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3 py-2 text-xs font-bold text-[#006064] bg-teal-50 hover:bg-teal-100 border border-teal-200 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-2 text-xs font-bold text-white bg-[#006064] hover:bg-[#004D40] shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer size={13} />
              <span>Print Statement</span>
            </button>
          </div>
        </div>
      </FadeUp>

      {/* ── 2. FILTERING SUITE ── */}
      <FadeUp delay={0.05}>
        <div className="bg-white border border-neutral-200 shadow-xs p-4 sm:p-5 space-y-4">
          
          {/* CENTRE SELECTION TABS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
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

          {/* PERIOD SELECTION CONTROLS */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
            {/* Period Mode Selector */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mr-1">
                <Calendar size={14} className="text-[#006064]" /> Period:
              </span>
              {[
                { id: "month", label: "Month-Wise" },
                { id: "quarter", label: "Quarterly" },
                { id: "fy", label: "Financial Year" },
                { id: "custom", label: "Custom Range" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriodType(p.id as any)}
                  className={`text-xs font-bold px-3 py-1 transition-all cursor-pointer border ${
                    periodType === p.id
                      ? "bg-teal-100/80 text-[#004D40] border-teal-300 font-extrabold shadow-xs"
                      : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Dynamic Controls based on selected period mode */}
            <div className="flex items-center gap-2 flex-wrap">
              {periodType === "month" && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-gray-500">Month:</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="text-xs font-bold bg-neutral-50 border border-neutral-300 px-2.5 py-1.5 outline-none focus:border-[#006064] cursor-pointer"
                  >
                    <option value="2026-04">April 2026</option>
                    <option value="2026-05">May 2026</option>
                    <option value="2026-06">June 2026</option>
                    <option value="2026-07">July 2026</option>
                    <option value="2026-08">August 2026</option>
                    <option value="2026-09">September 2026</option>
                    <option value="2026-10">October 2026</option>
                    <option value="2026-11">November 2026</option>
                    <option value="2026-12">December 2026</option>
                  </select>
                </div>
              )}

              {periodType === "quarter" && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-gray-500">Quarter:</label>
                  <select
                    value={selectedQuarter}
                    onChange={(e) => setSelectedQuarter(e.target.value)}
                    className="text-xs font-bold bg-neutral-50 border border-neutral-300 px-2.5 py-1.5 outline-none focus:border-[#006064] cursor-pointer"
                  >
                    <option value="Q1">Q1 (Apr – Jun 2026)</option>
                    <option value="Q2">Q2 (Jul – Sep 2026)</option>
                    <option value="Q3">Q3 (Oct – Dec 2026)</option>
                    <option value="Q4">Q4 (Jan – Mar 2027)</option>
                  </select>
                </div>
              )}

              {periodType === "fy" && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-gray-500">Financial Year:</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="text-xs font-bold bg-neutral-50 border border-neutral-300 px-2.5 py-1.5 outline-none focus:border-[#006064] cursor-pointer"
                  >
                    <option value={2026}>FY 2026–2027</option>
                    <option value={2025}>FY 2025–2026</option>
                  </select>
                </div>
              )}

              {periodType === "custom" && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-xs font-bold bg-neutral-50 border border-neutral-300 px-2 py-1 outline-none"
                  />
                  <span className="text-xs text-gray-400">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-xs font-bold bg-neutral-50 border border-neutral-300 px-2 py-1 outline-none"
                  />
                </div>
              )}
            </div>

          </div>

        </div>
      </FadeUp>

      {/* ── 3. 5 FINANCIAL TELEMETRY KPI CARDS ── */}
      <FadeUp delay={0.1}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* 1. INVOICES RAISED */}
          <div
            onClick={() => handleOpenInvoicesModal("ALL")}
            className="bg-white p-4 sm:p-5 border border-purple-200 shadow-xs flex flex-col justify-between hover:border-purple-400 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group relative overflow-hidden"
            title="Click to view all dispatched invoices in dynamic popup"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-purple-900 uppercase tracking-widest">
                  Invoices Raised
                </span>
                <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 border border-purple-200 opacity-0 group-hover:opacity-100 transition-opacity">
                  Inspect ↗
                </span>
              </div>
              <div className="w-8 h-8 bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200 group-hover:bg-purple-700 group-hover:text-white transition-all">
                <Maximize2 size={14} className="group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="my-2.5">
              <div className="text-xl sm:text-2xl font-black text-purple-950 tracking-tight font-display">
                {formatINR(data?.kpi.invoicesRaised ?? data?.kpi.totalRevenue ?? 0)}
              </div>
            </div>
            <div className="text-[10px] text-purple-700 font-medium flex items-center justify-between pt-2 border-t border-purple-100">
              <span>{data?.kpi.transactionCount ?? 0} Invoices</span>
              <span className="font-bold text-purple-700 flex items-center gap-0.5 group-hover:underline">
                <span>View Dispatched</span>
                <ArrowUpRight size={11} />
              </span>
            </div>
          </div>

          {/* 2. PAYMENT RECEIVED */}
          <div
            onClick={() => handleOpenInvoicesModal("APPROVED")}
            className="bg-white p-4 sm:p-5 border border-emerald-200 shadow-xs flex flex-col justify-between hover:border-emerald-400 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group relative overflow-hidden"
            title="Click to view collected / approved payments in dynamic popup"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-widest">
                  Payment Received
                </span>
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 border border-emerald-200 opacity-0 group-hover:opacity-100 transition-opacity">
                  Inspect ↗
                </span>
              </div>
              <div className="w-8 h-8 bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 group-hover:bg-emerald-700 group-hover:text-white transition-all">
                <Maximize2 size={14} className="group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="my-2.5">
              <div className="text-xl sm:text-2xl font-black text-emerald-950 tracking-tight font-display">
                {formatINR(data?.kpi.paymentReceived ?? 0)}
              </div>
            </div>
            <div className="text-[10px] text-emerald-700 font-medium flex items-center justify-between pt-2 border-t border-emerald-100">
              <span>Invoices Approved</span>
              <span className="font-bold text-emerald-700 flex items-center gap-0.5 group-hover:underline">
                <span>{data?.kpi.invoicesRaised ? Math.round(((data.kpi.paymentReceived || 0) / data.kpi.invoicesRaised) * 100) : 100}% Collection</span>
                <ArrowUpRight size={11} />
              </span>
            </div>
          </div>

          {/* 3. BALANCE PAYMENT */}
          <div
            onClick={() => handleOpenInvoicesModal("PENDING")}
            className="bg-white p-4 sm:p-5 border border-amber-200 shadow-xs flex flex-col justify-between hover:border-amber-400 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group relative overflow-hidden"
            title="Click to view pending invoice pipeline in dynamic popup"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-amber-900 uppercase tracking-widest">
                  Balance Payment
                </span>
                <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 border border-amber-200 opacity-0 group-hover:opacity-100 transition-opacity">
                  Inspect ↗
                </span>
              </div>
              <div className="w-8 h-8 bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200 group-hover:bg-amber-700 group-hover:text-white transition-all">
                <Maximize2 size={14} className="group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="my-2.5">
              <div className="text-xl sm:text-2xl font-black text-amber-950 tracking-tight font-display">
                {formatINR(data?.kpi.balancePayment ?? 0)}
              </div>
            </div>
            <div className="text-[10px] text-amber-700 font-medium flex items-center justify-between pt-2 border-t border-amber-100">
              <span>Pending Review</span>
              <span className="font-bold text-amber-700 flex items-center gap-0.5 group-hover:underline">
                <span>In Pipeline</span>
                <ArrowUpRight size={11} />
              </span>
            </div>
          </div>

          {/* 4. TOTAL EXPENSES (INTERACTIVE TRIGGER FOR DYNAMIC EXPENSES MODAL) */}
          <div
            onClick={() => setIsExpenseModalOpen(true)}
            className="bg-white p-4 sm:p-5 border border-rose-200 shadow-xs flex flex-col justify-between hover:border-rose-400 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group relative overflow-hidden"
            title="Click to open dynamic itemized expense breakdown ledger"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-rose-900 uppercase tracking-widest">
                  Total Expenses
                </span>
                <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 border border-rose-200 opacity-0 group-hover:opacity-100 transition-opacity">
                  Inspect ↗
                </span>
              </div>
              <div className="w-8 h-8 bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 group-hover:bg-rose-600 group-hover:text-white transition-all">
                <Maximize2 size={14} className="group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="my-2.5">
              <div className="text-xl sm:text-2xl font-black text-rose-950 tracking-tight font-display">
                {formatINR(data?.kpi.totalExpenses ?? 0)}
              </div>
            </div>
            <div className="text-[10px] text-rose-600 font-medium flex items-center justify-between pt-2 border-t border-rose-100">
              <span>{data?.kpi.expenseCount ?? 0} Entries</span>
              <span className="font-bold text-rose-700 flex items-center gap-0.5 group-hover:underline">
                <span>View Full Ledger</span>
                <ArrowUpRight size={11} />
              </span>
            </div>
          </div>

          {/* 5. GROSS PROFIT & MARGIN */}
          <div
            onClick={() => setIsGrossProfitModalOpen(true)}
            className={`p-4 sm:p-5 border shadow-xs flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group relative overflow-hidden ${
              (data?.kpi.grossProfit || 0) >= 0
                ? "bg-gradient-to-br from-white to-teal-50/60 border-teal-300 hover:border-teal-500"
                : "bg-gradient-to-br from-white to-rose-50/60 border-rose-300 hover:border-rose-500"
            }`}
            title="Click to view Gross Profit & P&L Intelligence breakdown"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-[#004D40] uppercase tracking-widest">
                  Gross Profit (P&amp;L)
                </span>
                <span className="text-[9px] font-bold text-[#006064] bg-teal-50 px-1.5 py-0.5 border border-teal-200 opacity-0 group-hover:opacity-100 transition-opacity">
                  Intelligence ↗
                </span>
              </div>
              <div className={`w-8 h-8 flex items-center justify-center transition-all ${
                (data?.kpi.grossProfit || 0) >= 0
                  ? "bg-[#006064] text-white group-hover:bg-[#004D40]"
                  : "bg-rose-600 text-white group-hover:bg-rose-700"
              }`}>
                <Maximize2 size={14} className="group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="my-2.5">
              <div className={`text-xl sm:text-2xl font-black tracking-tight font-display ${
                (data?.kpi.grossProfit || 0) >= 0 ? "text-[#004D40]" : "text-rose-600"
              }`}>
                {(data?.kpi.grossProfit || 0) >= 0 ? "+" : ""}{formatINR(data?.kpi.grossProfit ?? 0)}
              </div>
            </div>
            <div className="text-[10px] font-medium flex items-center justify-between pt-2 border-t border-teal-200">
              <span className="font-bold text-[#006064]">{data?.kpi.grossProfitMargin ?? 0}% Margin</span>
              <span className="font-bold text-teal-700 flex items-center gap-0.5 group-hover:underline">
                <span>{(data?.kpi.grossProfit || 0) >= 0 ? "🟢 Net Surplus" : "🔴 Deficit"}</span>
                <ArrowUpRight size={11} />
              </span>
            </div>
          </div>

        </div>
      </FadeUp>

      {/* ── 4. CATEGORY BREAKDOWNS (REVENUE SOURCES & EXPENSE SECTIONS) ── */}
      <FadeUp delay={0.15}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* REVENUE STREAMS */}
          <div className="bg-white border border-neutral-200 shadow-xs p-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <TrendingUp size={15} /> Inflow Streams
              </span>
              <span className="text-xs font-bold text-gray-500 font-mono">
                {formatINR(data?.kpi.totalRevenue || 0)}
              </span>
            </div>
            <div className="divide-y divide-neutral-100 mt-2">
              {data?.revenueBreakdown.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-800">{item.category}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900 font-mono">{formatINR(item.amount)}</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 border border-emerald-200 w-12 text-right">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* EXPENSE CATEGORIES */}
          <div className="bg-white border border-neutral-200 shadow-xs p-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <span className="text-xs font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                <TrendingDown size={15} /> Operational Expense Categories
              </span>
              <span className="text-xs font-bold text-gray-500 font-mono">
                {formatINR(data?.kpi.totalExpenses || 0)}
              </span>
            </div>
            <div className="divide-y divide-neutral-100 mt-2">
              {data?.expenseBreakdown.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-800">{item.category}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900 font-mono">{formatINR(item.amount)}</span>
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 border border-rose-200 w-12 text-right">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </FadeUp>

      {/* ── 6. ITEMIZED EXPENSE LEDGER AUDIT LOG ── */}
      <FadeUp delay={0.25}>
        <div className="bg-white border border-neutral-200 shadow-xs overflow-hidden">
          
          <div className="px-5 py-4 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50/70">
            <div>
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <CreditCard size={16} className="text-[#006064]" />
                Recent Operational Expense Line Items
              </h2>
              <p className="text-xs text-gray-500">
                Direct itemized records parsed from Community Manager Center Expense Sheets
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(true)}
                className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
                title="Open Dynamic Full Ledger Popup"
              >
                <Maximize2 size={13} />
                <span>Open Popup Ledger</span>
              </button>
              <div className="w-full sm:w-60">
                <input
                  type="text"
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                  placeholder="Search description / category..."
                  className="w-full text-xs bg-white border border-neutral-300 px-3 py-1.5 outline-none focus:border-[#006064]"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[360px] overflow-y-auto scrollbar-thin">
            <table className="w-full text-left border-collapse table-fixed min-w-[700px]">
              <colgroup>
                <col className="w-[120px]" />
                <col className="w-[160px]" />
                <col className="w-auto" />
                <col className="w-[200px]" />
                <col className="w-[130px]" />
              </colgroup>
              <thead className="sticky top-0 bg-neutral-100 z-10">
                <tr className="border-b border-neutral-200 text-[10.5px] font-black uppercase tracking-wider text-gray-500">
                  <th className="py-2.5 px-4 text-left">Date</th>
                  <th className="py-2.5 px-4 text-left">Centre</th>
                  <th className="py-2.5 px-4 text-left">Expense Description</th>
                  <th className="py-2.5 px-4 text-left">Section / Category</th>
                  <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">
                      No expense entries matching current filter.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp, idx) => (
                    <tr key={`${exp.locationId}_${exp.id}_${idx}`} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-[11px] text-gray-600 text-left truncate">
                        {exp.date}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-gray-800 text-left truncate">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                          <span className="truncate">{exp.locationName}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-gray-900 font-medium text-left">
                        <div className="flex flex-col">
                          <span className="break-words leading-relaxed">{exp.description}</span>
                          {exp.paymentMode && (
                            <span className="text-[10px] text-neutral-400 font-mono mt-0.5">
                              Mode: {exp.paymentMode}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-left">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-neutral-100 text-neutral-700 border border-neutral-200 inline-block truncate max-w-full">
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-rose-700 font-mono text-xs whitespace-nowrap">
                        {formatINR(exp.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </FadeUp>

      {/* ── 7. DYNAMIC OPERATIONAL EXPENSES MODAL ── */}
      <ExpensesBreakdownModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        expenses={data?.recentExpenses || []}
        totalExpenses={data?.kpi.totalExpenses || 0}
        centreComparison={data?.centreComparison || []}
        categoryBreakdown={data?.expenseBreakdown || []}
        periodInfo={data?.period}
        initialLocationId={selectedLocationId}
      />

      {/* ── 8. DYNAMIC INVOICES & COLLECTION PIPELINE MODAL ── */}
      <InvoicesBreakdownModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        invoices={data?.recentInvoices || []}
        kpi={{
          invoicesRaised: data?.kpi.invoicesRaised,
          paymentReceived: data?.kpi.paymentReceived,
          balancePayment: data?.kpi.balancePayment,
          transactionCount: data?.kpi.transactionCount,
        }}
        initialTab={invoiceModalTab}
        initialLocationId={selectedLocationId}
        periodInfo={data?.period}
      />

      {/* ── 9. DYNAMIC GROSS PROFIT (P&L) INTELLIGENCE MODAL ── */}
      {data && (
        <GrossProfitModal
          isOpen={isGrossProfitModalOpen}
          onClose={() => setIsGrossProfitModalOpen(false)}
          kpi={{
            totalRevenue: data.kpi.totalRevenue,
            totalExpenses: data.kpi.totalExpenses,
            grossProfit: data.kpi.grossProfit,
            grossProfitMargin: data.kpi.grossProfitMargin,
            isProfitable: data.kpi.isProfitable,
          }}
          centreComparison={data.centreComparison || []}
          revenueBreakdown={data.revenueBreakdown || []}
          expenseBreakdown={data.expenseBreakdown || []}
          periodInfo={data.period}
          initialLocationId={selectedLocationId}
        />
      )}

    </div>
  );
}
