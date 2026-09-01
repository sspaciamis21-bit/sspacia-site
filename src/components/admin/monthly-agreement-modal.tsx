"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Building2,
  X,
  Search,
  Download,
  Printer,
  TrendingUp,
  CheckCircle2,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { CorporateClientItem } from "./corporate-clients-modal";

interface MonthlyAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: CorporateClientItem[];
  totalValue: number;
  initialCentre?: string;
}

export function MonthlyAgreementModal({
  isOpen,
  onClose,
  clients = [],
  totalValue,
  initialCentre = "ALL",
}: MonthlyAgreementModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedCentre, setSelectedCentre] = useState<string>(initialCentre);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"VAL_DESC" | "VAL_ASC" | "SEATS_DESC" | "NAME_ASC">("VAL_DESC");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSelectedCentre(initialCentre);
      setSearchQuery("");
      setSortOrder("VAL_DESC");
    }
  }, [isOpen, initialCentre]);

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

  // Filtered & Sorted Clients
  const filteredClients = useMemo(() => {
    let list = [...clients];

    // Centre Filter
    if (selectedCentre !== "ALL") {
      list = list.filter((c) => c.centreName.toLowerCase().includes(selectedCentre.toLowerCase()));
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.companyName.toLowerCase().includes(q) ||
          (c.clientId && c.clientId.toLowerCase().includes(q)) ||
          (c.cabinName && c.cabinName.toLowerCase().includes(q)) ||
          c.centreName.toLowerCase().includes(q)
      );
    }

    // Sorting
    return list.sort((a, b) => {
      if (sortOrder === "VAL_DESC") return (b.monthlyAmount || 0) - (a.monthlyAmount || 0);
      if (sortOrder === "VAL_ASC") return (a.monthlyAmount || 0) - (b.monthlyAmount || 0);
      if (sortOrder === "SEATS_DESC") return (b.noOfSeats || 0) - (a.noOfSeats || 0);
      return a.companyName.localeCompare(b.companyName);
    });
  }, [clients, selectedCentre, searchQuery, sortOrder]);

  const filteredTotalValue = useMemo(() => {
    return filteredClients.reduce((acc, c) => acc + (Number(c.monthlyAmount) || 0), 0);
  }, [filteredClients]);

  const avgDealSize = useMemo(() => {
    return filteredClients.length > 0 ? Math.round(filteredTotalValue / filteredClients.length) : 0;
  }, [filteredClients, filteredTotalValue]);

  const handleExportCSV = () => {
    if (filteredClients.length === 0) {
      toast.error("No agreement data to export.");
      return;
    }

    const rows = [
      ["Client ID", "Company Name", "Centre", "Cabin / Unit", "Seats", "Monthly Agreement (INR)", "% Contribution", "Status"],
      ...filteredClients.map((c) => [
        c.clientId || "N/A",
        `"${(c.companyName || "").replace(/"/g, '""')}"`,
        c.centreName,
        `"${(c.cabinName || "").replace(/"/g, '""')}"`,
        c.noOfSeats || 0,
        c.monthlyAmount || 0,
        filteredTotalValue > 0 ? `${(((c.monthlyAmount || 0) / filteredTotalValue) * 100).toFixed(1)}%` : "0.0%",
        c.clientStatus || "Active",
      ]),
      ["TOTAL", `${filteredClients.length} Agreements`, "", "", "", filteredTotalValue, "100.0%", ""],
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((r) => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SSPACIA_Monthly_Agreements_${selectedCentre}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Monthly agreements statement exported to CSV.");
  };

  const handlePrint = () => {
    window.print();
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-neutral-950/75 backdrop-blur-xs cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="relative bg-white w-full max-w-5xl max-h-[92vh] shadow-2xl border border-neutral-200 flex flex-col overflow-hidden z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── 1. TOP HEADER ── */}
            <div className="px-5 py-4 bg-gradient-to-r from-neutral-900 via-neutral-800 to-[#004D40] text-white flex items-center justify-between border-b border-neutral-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                      Monthly Agreement Value &amp; Run-Rate Intelligence
                    </h2>
                    <span className="text-[10px] font-bold bg-teal-500/20 text-teal-300 px-2 py-0.5 border border-teal-400/30 uppercase tracking-widest">
                      Run-Rate
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 font-light mt-0.5 flex items-center gap-2">
                    <span>
                      Total Run-Rate: <strong className="text-emerald-300 font-bold font-mono">{formatINR(totalValue || filteredTotalValue)} / month</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Agreements: <strong className="text-white font-bold">{clients.length} Active Tenancies</strong>
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 text-xs font-bold text-teal-300 bg-white/10 hover:bg-white/20 border border-white/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Export Run-Rate as CSV"
                >
                  <Download size={13} />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Print Run-Rate Statement"
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

            {/* ── 2. EXECUTIVE 3-METRIC SUMMARY ── */}
            <div className="px-5 py-3.5 bg-neutral-50 border-b border-neutral-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white p-3.5 border border-neutral-200 shadow-2xs">
                <div className="text-[10px] font-black uppercase text-neutral-500 tracking-wider">
                  Total Monthly Run-Rate
                </div>
                <div className="text-xl font-black text-[#006064] font-mono mt-1">
                  {formatINR(filteredTotalValue)}
                </div>
                <div className="text-[10px] text-teal-700 mt-0.5">
                  ₹{(filteredTotalValue / 100000).toFixed(2)} Lakhs recurring
                </div>
              </div>

              <div className="bg-white p-3.5 border border-neutral-200 shadow-2xs">
                <div className="text-[10px] font-black uppercase text-neutral-500 tracking-wider">
                  Active Agreements
                </div>
                <div className="text-xl font-black text-neutral-900 font-display mt-1">
                  {filteredClients.length} Tenancies
                </div>
                <div className="text-[10px] text-neutral-500 mt-0.5">
                  Across selected centres
                </div>
              </div>

              <div className="bg-white p-3.5 border border-neutral-200 shadow-2xs">
                <div className="text-[10px] font-black uppercase text-neutral-500 tracking-wider">
                  Average Deal Size
                </div>
                <div className="text-xl font-black text-neutral-900 font-mono mt-1">
                  {formatINR(avgDealSize)}
                </div>
                <div className="text-[10px] text-neutral-500 mt-0.5">
                  Per corporate client / month
                </div>
              </div>
            </div>

            {/* ── 3. FILTER TOOLBAR ── */}
            <div className="px-5 py-2.5 bg-white border-b border-neutral-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 flex-wrap">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search company, client ID, cabin..."
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

                {/* Centre Filter */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-neutral-500 font-bold uppercase text-[9.5px] whitespace-nowrap">Centre:</span>
                  <select
                    value={selectedCentre}
                    onChange={(e) => setSelectedCentre(e.target.value)}
                    className="bg-neutral-50 border border-neutral-300 px-2 py-1 text-xs font-bold text-neutral-800 focus:outline-none focus:border-[#006064] cursor-pointer"
                  >
                    <option value="ALL">All Centres</option>
                    <option value="Agarwal Complex">Agarwal Complex</option>
                    <option value="Mercado">Mercado Location</option>
                    <option value="Premier House">Premier House</option>
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
                    <option value="VAL_DESC">Agreement Value (Highest First)</option>
                    <option value="VAL_ASC">Agreement Value (Lowest First)</option>
                    <option value="SEATS_DESC">Seats (Largest First)</option>
                    <option value="NAME_ASC">Company Name (A-Z)</option>
                  </select>
                </div>
              </div>

              {/* Metrics */}
              <div className="flex items-center gap-2 self-end md:self-auto text-xs">
                <span className="text-neutral-500 font-medium">
                  Showing <strong className="text-neutral-900 font-bold">{filteredClients.length}</strong> of {clients.length}
                </span>
                <span className="font-bold text-teal-800 bg-teal-50 px-2.5 py-1 border border-teal-200 font-mono text-xs">
                  Sum: {formatINR(filteredTotalValue)} / mo
                </span>
              </div>
            </div>

            {/* ── 4. AGREEMENTS TABLE ── */}
            <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[48vh] scrollbar-thin">
              <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
                <colgroup>
                  <col className="w-[100px]" />
                  <col className="w-[210px]" />
                  <col className="w-[160px]" />
                  <col className="w-auto" />
                  <col className="w-[80px]" />
                  <col className="w-[140px]" />
                  <col className="w-[110px]" />
                  <col className="w-[100px]" />
                </colgroup>
                <thead className="sticky top-0 bg-neutral-100 z-10 shadow-2xs">
                  <tr className="border-b border-neutral-200 text-[10.5px] font-black uppercase tracking-wider text-neutral-600">
                    <th className="py-3 px-4 text-left">Client ID</th>
                    <th className="py-3 px-4 text-left">Company Name</th>
                    <th className="py-3 px-4 text-left">Centre</th>
                    <th className="py-3 px-4 text-left">Cabin / Unit</th>
                    <th className="py-3 px-4 text-center">Seats</th>
                    <th className="py-3 px-4 text-right">Agreement (₹)</th>
                    <th className="py-3 px-4 text-right">% Share</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-xs">
                  {filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-neutral-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Layers size={28} className="text-neutral-300" />
                          <p className="text-sm font-semibold text-neutral-600">No agreement entries found</p>
                          <p className="text-xs text-neutral-400">Try adjusting your centre filter or search query.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map((c, idx) => {
                      const sharePercent = filteredTotalValue > 0 ? (((c.monthlyAmount || 0) / filteredTotalValue) * 100).toFixed(1) : "0.0";
                      return (
                        <tr
                          key={`${c.id}_${idx}`}
                          className="hover:bg-teal-50/40 transition-colors group"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-[11px] text-neutral-600 text-left truncate">
                            {c.clientId || `#CL-${c.id}`}
                          </td>
                          <td className="py-3 px-4 font-bold text-neutral-900 text-left truncate">
                            {c.companyName}
                          </td>
                          <td className="py-3 px-4 font-semibold text-neutral-700 text-left truncate">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#006064] shrink-0" />
                              <span className="truncate">{c.centreName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-neutral-600 font-medium text-left truncate">
                            {c.cabinName || "Dedicated Space"}
                          </td>
                          <td className="py-3 px-4 text-center font-black text-neutral-800 font-mono">
                            {c.noOfSeats || 1}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-[#006064] font-mono text-xs whitespace-nowrap">
                            {formatINR(c.monthlyAmount)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-teal-800 text-xs whitespace-nowrap">
                            <span className="px-1.5 py-0.5 bg-teal-50 border border-teal-200">
                              {sharePercent}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className={`text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider border ${
                              c.clientStatus === "On Notice"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : c.clientStatus === "Terminated"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}>
                              {c.clientStatus || "Active"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* ── 5. FOOTER SUMMARY ── */}
            <div className="px-5 py-3 bg-neutral-50 border-t border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-neutral-500">
                <Building2 size={14} className="text-[#006064]" />
                <span>
                  Filtering: <strong className="text-neutral-900 font-bold">{selectedCentre === "ALL" ? "All Operating Centres" : selectedCentre}</strong>
                </span>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-auto">
                <span className="text-neutral-600 font-bold">
                  Total Monthly Run-Rate:
                </span>
                <span className="text-sm sm:text-base font-black text-teal-900 font-mono bg-teal-100/70 px-3 py-1 border border-teal-300">
                  {formatINR(filteredTotalValue)} / month
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
