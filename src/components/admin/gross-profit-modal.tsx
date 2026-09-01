"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  TrendingUp,
  TrendingDown,
  Building2,
  X,
  Download,
  Printer,
  DollarSign,
  PieChart,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

export interface CentreComparison {
  locationId: number;
  locationName: string;
  area: string;
  revenue: number;
  expenses: number;
  grossProfit: number;
  grossMarginPercent: number;
  isProfitable: boolean;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: string;
}

interface GrossProfitModalProps {
  isOpen: boolean;
  onClose: () => void;
  kpi: {
    totalRevenue: number;
    totalExpenses: number;
    grossProfit: number;
    grossProfitMargin: number;
    isProfitable: boolean;
  };
  centreComparison: CentreComparison[];
  revenueBreakdown: CategoryBreakdown[];
  expenseBreakdown: CategoryBreakdown[];
  periodInfo?: {
    type: string;
    startDate: string;
    endDate: string;
    month?: string;
    year: number;
    quarter?: string;
  };
  initialLocationId?: string;
}

export function GrossProfitModal({
  isOpen,
  onClose,
  kpi,
  centreComparison = [],
  revenueBreakdown = [],
  expenseBreakdown = [],
  periodInfo,
  initialLocationId = "ALL",
}: GrossProfitModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedCentre, setSelectedCentre] = useState<string>(initialLocationId);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSelectedCentre(initialLocationId);
    }
  }, [isOpen, initialLocationId]);

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

  const handleExportCSV = () => {
    const rows = [
      ["Centre / Branch", "Area", "Revenue (INR)", "Expenses (INR)", "Gross Profit (INR)", "Gross Margin (%)", "Status"],
      ...centreComparison.map((c) => [
        c.locationName,
        c.area,
        c.revenue,
        c.expenses,
        c.grossProfit,
        `${c.grossMarginPercent}%`,
        c.isProfitable ? "PROFITABLE" : "DEFICIT",
      ]),
      ["TOTAL", "All Centres", kpi.totalRevenue, kpi.totalExpenses, kpi.grossProfit, `${kpi.grossProfitMargin}%`, kpi.isProfitable ? "PROFITABLE" : "DEFICIT"],
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((r) => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SSPACIA_GrossProfit_Summary_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Gross profit statement exported to CSV.");
  };

  const handlePrint = () => {
    window.print();
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
                <div className="w-10 h-10 bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                      Gross Profit &amp; Net Margin Intelligence
                    </h2>
                    <span className="text-[10px] font-bold bg-teal-500/20 text-teal-300 px-2 py-0.5 border border-teal-400/30 uppercase tracking-widest">
                      Executive P&amp;L
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 font-light mt-0.5 flex items-center gap-2">
                    <span>
                      Formula: <strong>Revenue ({formatINR(kpi.totalRevenue)})</strong> − <strong>Expenses ({formatINR(kpi.totalExpenses)})</strong> = <strong className="text-teal-300 font-bold font-mono">{kpi.grossProfit >= 0 ? "+" : ""}{formatINR(kpi.grossProfit)}</strong>
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
                  title="Export Statement as CSV"
                >
                  <Download size={13} />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Print P&L Summary"
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

            {/* ── 2. EXECUTIVE 3-METRIC SUMMARY CARDS ── */}
            <div className="px-5 py-4 bg-neutral-50 border-b border-neutral-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* REVENUE */}
              <div className="bg-white p-3.5 border border-emerald-200 shadow-2xs">
                <div className="text-[10px] font-black uppercase text-emerald-900 tracking-wider">
                  Total Inflow Revenue
                </div>
                <div className="text-xl font-black text-emerald-950 font-mono mt-1">
                  {formatINR(kpi.totalRevenue)}
                </div>
                <div className="text-[10px] text-emerald-700 mt-0.5">
                  100% Operational Topline
                </div>
              </div>

              {/* EXPENSES */}
              <div className="bg-white p-3.5 border border-rose-200 shadow-2xs">
                <div className="text-[10px] font-black uppercase text-rose-900 tracking-wider">
                  Total Operational Outflows
                </div>
                <div className="text-xl font-black text-rose-950 font-mono mt-1">
                  {formatINR(kpi.totalExpenses)}
                </div>
                <div className="text-[10px] text-rose-700 mt-0.5">
                  Centre Operational Expenses
                </div>
              </div>

              {/* NET PROFIT & MARGIN */}
              <div className={`p-3.5 border shadow-2xs ${
                kpi.isProfitable ? "bg-teal-50/90 border-teal-300" : "bg-rose-50/90 border-rose-300"
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-[#004D40] tracking-wider">
                    Net Margin / P&amp;L
                  </span>
                  <span className={`text-[9.5px] font-bold px-1.5 py-0.2 border ${
                    kpi.isProfitable ? "bg-teal-100 text-teal-800 border-teal-300" : "bg-rose-100 text-rose-800 border-rose-300"
                  }`}>
                    {kpi.isProfitable ? "🟢 Surplus" : "🔴 Deficit"}
                  </span>
                </div>
                <div className={`text-xl font-black font-mono mt-1 ${
                  kpi.isProfitable ? "text-[#004D40]" : "text-rose-700"
                }`}>
                  {kpi.grossProfit >= 0 ? "+" : ""}{formatINR(kpi.grossProfit)}
                </div>
                <div className="text-[10px] font-bold text-[#006064] mt-0.5">
                  {kpi.grossProfitMargin}% Profit Margin
                </div>
              </div>
            </div>

            {/* ── 3. SCROLLABLE BODY WITH COMPARISONS & BREAKDOWNS ── */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 max-h-[55vh] scrollbar-thin">
              
              {/* CENTRE COMPARISON TABLE */}
              <div className="bg-white border border-neutral-200 overflow-hidden">
                <div className="px-4 py-3 bg-neutral-100/70 border-b border-neutral-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 size={15} className="text-[#006064]" />
                    <span className="text-xs font-black uppercase text-neutral-800 tracking-wider">
                      Centre-by-Centre Contribution Breakdown
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-500 font-medium">
                    {centreComparison.length} Centres Active
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse table-fixed min-w-[650px]">
                    <colgroup>
                      <col className="w-[180px]" />
                      <col className="w-[120px]" />
                      <col className="w-[120px]" />
                      <col className="w-[130px]" />
                      <col className="w-[100px]" />
                    </colgroup>
                    <thead className="bg-neutral-50 text-[10px] font-black uppercase text-neutral-600 border-b border-neutral-200">
                      <tr>
                        <th className="py-2.5 px-4 text-left">Centre</th>
                        <th className="py-2.5 px-4 text-right">Revenue (₹)</th>
                        <th className="py-2.5 px-4 text-right">Expenses (₹)</th>
                        <th className="py-2.5 px-4 text-right">Gross Profit (₹)</th>
                        <th className="py-2.5 px-4 text-center">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-xs">
                      {centreComparison.map((c) => (
                        <tr key={c.locationId} className="hover:bg-neutral-50/80 transition-colors">
                          <td className="py-3 px-4 font-bold text-neutral-900 text-left truncate">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className={`w-1.5 h-1.5 rounded-full ${c.isProfitable ? "bg-emerald-500" : "bg-rose-500"}`} />
                              <span>{c.locationName}</span>
                              <span className="text-[10px] text-neutral-400 font-normal">({c.area})</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-emerald-800 font-mono">
                            {formatINR(c.revenue)}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-rose-800 font-mono">
                            {formatINR(c.expenses)}
                          </td>
                          <td className={`py-3 px-4 text-right font-black font-mono ${
                            c.grossProfit >= 0 ? "text-[#004D40]" : "text-rose-600"
                          }`}>
                            {c.grossProfit >= 0 ? "+" : ""}{formatINR(c.grossProfit)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 border ${
                              c.isProfitable
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-rose-50 text-rose-800 border-rose-200"
                            }`}>
                              {c.grossMarginPercent}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* REVENUE VS EXPENSE COMPARATIVE PANELS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* INFLOW STREAMS */}
                <div className="bg-white border border-neutral-200 p-4">
                  <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                      <TrendingUp size={14} /> Revenue Sources
                    </span>
                    <span className="text-xs font-bold text-neutral-800 font-mono">
                      {formatINR(kpi.totalRevenue)}
                    </span>
                  </div>
                  <div className="divide-y divide-neutral-100 mt-2">
                    {revenueBreakdown.map((item, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between text-xs">
                        <span className="font-semibold text-neutral-800 truncate pr-2">{item.category}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-neutral-900 font-mono">{formatINR(item.amount)}</span>
                          <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 border border-emerald-200">
                            {item.percentage}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* EXPENSE CATEGORIES */}
                <div className="bg-white border border-neutral-200 p-4">
                  <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100">
                    <span className="text-xs font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                      <TrendingDown size={14} /> Outflow Categories
                    </span>
                    <span className="text-xs font-bold text-neutral-800 font-mono">
                      {formatINR(kpi.totalExpenses)}
                    </span>
                  </div>
                  <div className="divide-y divide-neutral-100 mt-2">
                    {expenseBreakdown.slice(0, 5).map((item, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between text-xs">
                        <span className="font-semibold text-neutral-800 truncate pr-2">{item.category}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-neutral-900 font-mono">{formatINR(item.amount)}</span>
                          <span className="text-[9.5px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 border border-rose-200">
                            {item.percentage}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* ── 4. MODAL FOOTER ── */}
            <div className="px-5 py-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-neutral-500">
                <ShieldCheck size={14} className="text-[#006064]" />
                <span>Executive Live P&amp;L Margin Intelligence</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#006064] hover:bg-[#004D40] transition-colors cursor-pointer"
              >
                Close Statement
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
