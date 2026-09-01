"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  CreditCard,
  X,
  Search,
  Building2,
  Download,
  Printer,
  Filter,
  ArrowUpDown,
  TrendingDown,
  Layers,
  CheckCircle2,
  Calendar
} from "lucide-react";
import { toast } from "sonner";

export interface ItemizedExpense {
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

interface ExpensesBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: ItemizedExpense[];
  totalExpenses: number;
  centreComparison: CentreComparison[];
  categoryBreakdown: CategoryBreakdown[];
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

export function ExpensesBreakdownModal({
  isOpen,
  onClose,
  expenses = [],
  totalExpenses = 0,
  centreComparison = [],
  categoryBreakdown = [],
  periodInfo,
  initialLocationId = "ALL",
}: ExpensesBreakdownModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedCentre, setSelectedCentre] = useState<string>(initialLocationId);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"DATE_DESC" | "DATE_ASC" | "AMT_DESC" | "AMT_ASC">("DATE_DESC");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSelectedCentre(initialLocationId);
      setSelectedCategory("ALL");
      setSearchQuery("");
      setSortOrder("DATE_DESC");
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

  // Unique list of categories for filter dropdown
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    expenses.forEach((e) => {
      if (e.category) cats.add(e.category);
    });
    return Array.from(cats).sort();
  }, [expenses]);

  // Map of centre statistics
  const centreStats = useMemo(() => {
    const map: Record<string, { name: string; id: string; total: number; count: number }> = {
      ALL: { name: "All Centres", id: "ALL", total: 0, count: expenses.length },
      "1": { name: "Agarwal Complex", id: "1", total: 0, count: 0 },
      "2": { name: "Mercado", id: "2", total: 0, count: 0 },
      "3": { name: "Premier House", id: "3", total: 0, count: 0 },
    };

    expenses.forEach((exp) => {
      map.ALL.total += exp.amount;
      const locKey = String(exp.locationId);
      if (map[locKey]) {
        map[locKey].total += exp.amount;
        map[locKey].count += 1;
      }
    });

    return map;
  }, [expenses]);

  // Filtered & Sorted Expenses
  const filteredExpenses = useMemo(() => {
    let list = [...expenses];

    // Filter by Centre
    if (selectedCentre !== "ALL") {
      const targetId = parseInt(selectedCentre, 10);
      list = list.filter((e) => {
        if (!isNaN(targetId)) return e.locationId === targetId;
        return e.locationName.toLowerCase().includes(selectedCentre.toLowerCase());
      });
    }

    // Filter by Category
    if (selectedCategory !== "ALL") {
      list = list.filter((e) => e.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.locationName.toLowerCase().includes(q) ||
          e.date.toLowerCase().includes(q) ||
          String(e.amount).includes(q) ||
          (e.paymentMode && e.paymentMode.toLowerCase().includes(q))
      );
    }

    // Sort list
    return list.sort((a, b) => {
      if (sortOrder === "AMT_DESC") return b.amount - a.amount;
      if (sortOrder === "AMT_ASC") return a.amount - b.amount;
      if (sortOrder === "DATE_ASC") return new Date(a.date).getTime() - new Date(b.date).getTime();
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [expenses, selectedCentre, selectedCategory, searchQuery, sortOrder]);

  // Current Filtered Sum
  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  }, [filteredExpenses]);

  // Export filtered expenses as CSV
  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) {
      toast.error("No expenses to export.");
      return;
    }

    const rows = [
      ["Date", "Centre / Location", "Expense Description", "Section / Category", "Payment Mode", "Amount (INR)"],
      ...filteredExpenses.map((e) => [
        e.date,
        e.locationName,
        `"${(e.description || "").replace(/"/g, '""')}"`,
        `"${(e.category || "").replace(/"/g, '""')}"`,
        e.paymentMode || "Cash/Online",
        e.amount,
      ]),
      ["TOTAL", "", "", "", "", filteredTotal],
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((r) => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SSPACIA_Expenses_${selectedCentre}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Expense ledger exported to CSV successfully.");
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
                <div className="w-10 h-10 bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300">
                  <CreditCard size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                      Operational Expenses Breakdown
                    </h2>
                    <span className="text-[10px] font-bold bg-rose-500/20 text-rose-300 px-2 py-0.5 border border-rose-400/30 uppercase tracking-widest">
                      Live Ledger
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 font-light mt-0.5 flex items-center gap-2">
                    <span>
                      Total Outflow: <strong className="text-rose-300 font-bold font-mono">{formatINR(totalExpenses)}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      {expenses.length} Entries parsed from Centre Expense Sheets
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
                  title="Print Expenses Statement"
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

            {/* ── 2. CENTRE SELECTION CHIPS ── */}
            <div className="px-5 py-3 bg-neutral-50 border-b border-neutral-200 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: "ALL", name: "All Centres" },
                { id: "1", name: "Agarwal Complex" },
                { id: "2", name: "Mercado" },
                { id: "3", name: "Premier House" },
              ].map((c) => {
                const stat = centreStats[c.id] || { total: 0, count: 0 };
                const isSelected = selectedCentre === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCentre(c.id)}
                    className={`p-2.5 text-left border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-rose-50/90 border-rose-400 shadow-xs ring-1 ring-rose-400/50"
                        : "bg-white border-neutral-200 hover:bg-neutral-100/80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase tracking-wider truncate ${isSelected ? "text-rose-900" : "text-neutral-600"}`}>
                        {c.name}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 border ${
                        isSelected ? "bg-rose-100 text-rose-800 border-rose-300" : "bg-neutral-100 text-neutral-600 border-neutral-200"
                      }`}>
                        {stat.count} items
                      </span>
                    </div>
                    <div className={`text-xs sm:text-sm font-black font-mono mt-1 ${isSelected ? "text-rose-700" : "text-neutral-900"}`}>
                      {formatINR(stat.total)}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ── 3. FILTER & SEARCH TOOLBAR ── */}
            <div className="px-5 py-2.5 bg-white border-b border-neutral-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 flex-wrap">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search description, category, amount..."
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

                {/* Category Filter */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-neutral-500 font-bold uppercase text-[9.5px] whitespace-nowrap">Category:</span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-neutral-50 border border-neutral-300 px-2 py-1 text-xs font-bold text-neutral-800 focus:outline-none focus:border-[#006064] cursor-pointer max-w-[170px] truncate"
                  >
                    <option value="ALL">All Categories</option>
                    {allCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort Filter */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-neutral-500 font-bold uppercase text-[9.5px] whitespace-nowrap">Sort:</span>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    className="bg-neutral-50 border border-neutral-300 px-2 py-1 text-xs font-bold text-neutral-800 focus:outline-none focus:border-[#006064] cursor-pointer"
                  >
                    <option value="DATE_DESC">Date (Newest First)</option>
                    <option value="DATE_ASC">Date (Oldest First)</option>
                    <option value="AMT_DESC">Amount (Highest First)</option>
                    <option value="AMT_ASC">Amount (Lowest First)</option>
                  </select>
                </div>
              </div>

              {/* Filtered Result Metrics */}
              <div className="flex items-center gap-2 self-end md:self-auto text-xs">
                <span className="text-neutral-500 font-medium">
                  Showing <strong className="text-neutral-900 font-bold">{filteredExpenses.length}</strong> of {expenses.length}
                </span>
                <span className="font-bold text-rose-700 bg-rose-50 px-2.5 py-1 border border-rose-200 font-mono text-xs">
                  Sum: {formatINR(filteredTotal)}
                </span>
              </div>
            </div>

            {/* ── 4. ITEMIZED EXPENSES TABLE ── */}
            <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[50vh] scrollbar-thin">
              <table className="w-full text-left border-collapse table-fixed min-w-[700px]">
                <colgroup>
                  <col className="w-[120px]" />
                  <col className="w-[160px]" />
                  <col className="w-auto" />
                  <col className="w-[200px]" />
                  <col className="w-[130px]" />
                </colgroup>
                <thead className="sticky top-0 bg-neutral-100 z-10 shadow-2xs">
                  <tr className="border-b border-neutral-200 text-[10.5px] font-black uppercase tracking-wider text-neutral-600">
                    <th className="py-3 px-4 text-left">Date</th>
                    <th className="py-3 px-4 text-left">Centre</th>
                    <th className="py-3 px-4 text-left">Expense Description</th>
                    <th className="py-3 px-4 text-left">Section / Category</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-xs">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-neutral-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Layers size={28} className="text-neutral-300" />
                          <p className="text-sm font-semibold text-neutral-600">No expense entries found</p>
                          <p className="text-xs text-neutral-400">Try changing your search query or centre/category filters.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp, idx) => (
                      <tr
                        key={`${exp.locationId}_${exp.id}_${idx}`}
                        className="hover:bg-rose-50/40 transition-colors group"
                      >
                        <td className="py-3 px-4 font-mono text-[11px] text-neutral-600 whitespace-nowrap text-left truncate">
                          {exp.date}
                        </td>
                        <td className="py-3 px-4 font-bold text-neutral-900 text-left truncate">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                            <span className="truncate">{exp.locationName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-neutral-900 font-medium text-left">
                          <div className="flex flex-col">
                            <span className="break-words leading-relaxed">{exp.description}</span>
                            {exp.paymentMode && (
                              <span className="text-[10px] text-neutral-400 font-mono mt-0.5">
                                Mode: {exp.paymentMode}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-left">
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-neutral-100 text-neutral-700 border border-neutral-200 inline-block truncate max-w-full">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-rose-700 font-mono text-xs whitespace-nowrap">
                          {formatINR(exp.amount)}
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
                  Filtering: <strong className="text-neutral-900 font-bold">{centreStats[selectedCentre]?.name || selectedCentre}</strong>
                  {selectedCategory !== "ALL" && (
                    <> • Category: <strong className="text-neutral-900 font-bold">{selectedCategory}</strong></>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-auto">
                <span className="text-neutral-600 font-bold">
                  Total Filtered Outflow:
                </span>
                <span className="text-sm sm:text-base font-black text-rose-700 font-mono bg-rose-100/70 px-3 py-1 border border-rose-300">
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
