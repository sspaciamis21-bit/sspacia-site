"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  X,
  Search,
  Building2,
  Download,
  Printer,
  CheckCircle2,
  AlertCircle,
  Armchair,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  FileText,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

export interface CorporateClientItem {
  id: number;
  companyName: string;
  clientId: string | null;
  cabinName: string | null;
  noOfSeats: number | null;
  parkingSlots?: number | null;
  monthlyAmount: number;
  sdrAmount: number;
  clientStatus: string | null;
  clientType?: string | null;
  centreName: string;
  centreId: number | null;
  agreementStartDate?: string | null;
  agreementEndDate?: string | null;
  agreementPdfUrl?: string | null;
  agreementPdfName?: string | null;
  lockInPeriod?: number | null;
  noticePeriodMonths?: number | null;
}

interface CorporateClientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: CorporateClientItem[];
  initialCentre?: string;
  initialStatusTab?: "ALL" | "ACTIVE" | "ON_NOTICE" | "VIRTUAL_OFFICE";
}

export function CorporateClientsModal({
  isOpen,
  onClose,
  clients = [],
  initialCentre = "ALL",
  initialStatusTab = "ALL",
}: CorporateClientsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedCentre, setSelectedCentre] = useState<string>(initialCentre);
  const [statusTab, setStatusTab] = useState<"ALL" | "ACTIVE" | "ON_NOTICE" | "VIRTUAL_OFFICE">(initialStatusTab);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"SEATS_DESC" | "VALUE_DESC" | "NAME_ASC">("VALUE_DESC");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSelectedCentre(initialCentre);
      setStatusTab(initialStatusTab);
      setSearchQuery("");
      setSortOrder("VALUE_DESC");
    }
  }, [isOpen, initialCentre, initialStatusTab]);

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

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "—";
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  // Centre stats computation
  const centreStats = useMemo(() => {
    const map: Record<string, { name: string; count: number; seats: number; parking: number; value: number }> = {
      ALL: { name: "All Centres", count: clients.length, seats: 0, parking: 0, value: 0 },
      "Agarwal Complex": { name: "Agarwal Complex", count: 0, seats: 0, parking: 0, value: 0 },
      "Mercado": { name: "Mercado Location", count: 0, seats: 0, parking: 0, value: 0 },
      "Premier House": { name: "Premier House", count: 0, seats: 0, parking: 0, value: 0 },
    };

    clients.forEach((c) => {
      const seats = Number(c.noOfSeats || 0);
      const parking = Number(c.parkingSlots || 0);
      const val = Number(c.monthlyAmount || 0);
      map.ALL.seats += seats;
      map.ALL.parking += parking;
      map.ALL.value += val;

      const cName = c.centreName || "Mercado";
      const key = Object.keys(map).find((k) => k !== "ALL" && cName.toLowerCase().includes(k.toLowerCase())) || "Mercado";
      if (map[key]) {
        map[key].count += 1;
        map[key].seats += seats;
        map[key].parking += parking;
        map[key].value += val;
      }
    });

    return map;
  }, [clients]);

  // Filtered & Sorted Clients
  const filteredClients = useMemo(() => {
    let list = [...clients];

    // Status Tab Filter
    if (statusTab === "ACTIVE") {
      list = list.filter((c) => c.clientStatus !== "Terminated" && c.clientStatus !== "Inactive" && c.clientStatus !== "On Notice");
    } else if (statusTab === "ON_NOTICE") {
      list = list.filter((c) => c.clientStatus === "On Notice");
    } else if (statusTab === "VIRTUAL_OFFICE") {
      list = list.filter((c) => c.clientType === "VIRTUAL_OFFICE");
    }

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
      if (sortOrder === "VALUE_DESC") return (b.monthlyAmount || 0) - (a.monthlyAmount || 0);
      if (sortOrder === "SEATS_DESC") return (b.noOfSeats || 0) - (a.noOfSeats || 0);
      return a.companyName.localeCompare(b.companyName);
    });
  }, [clients, statusTab, selectedCentre, searchQuery, sortOrder]);

  const totalFilteredSeats = useMemo(() => {
    return filteredClients.reduce((acc, c) => acc + (Number(c.noOfSeats) || 0), 0);
  }, [filteredClients]);

  const totalFilteredParking = useMemo(() => {
    return filteredClients.reduce((acc, c) => acc + (Number(c.parkingSlots) || 0), 0);
  }, [filteredClients]);

  const totalFilteredValue = useMemo(() => {
    return filteredClients.reduce((acc, c) => acc + (Number(c.monthlyAmount) || 0), 0);
  }, [filteredClients]);

  const totalFilteredSdr = useMemo(() => {
    return filteredClients.reduce((acc, c) => acc + (Number(c.sdrAmount) || 0), 0);
  }, [filteredClients]);

  const handleExportCSV = () => {
    if (filteredClients.length === 0) {
      toast.error("No clients to export.");
      return;
    }

    const rows = [
      [
        "Client ID",
        "Company Name",
        "Centre",
        "Cabin / Space",
        "Workstation Seats",
        "Car Parking Slots",
        "Agreement Start Date",
        "Agreement End Date",
        "Agreement Document URL",
        "Monthly Agreement (INR)",
        "SDR Held (INR)",
        "Status",
      ],
      ...filteredClients.map((c) => [
        c.clientId || "N/A",
        `"${(c.companyName || "").replace(/"/g, '""')}"`,
        c.centreName,
        `"${(c.cabinName || "").replace(/"/g, '""')}"`,
        c.noOfSeats || 0,
        c.parkingSlots || 0,
        c.agreementStartDate ? formatDate(c.agreementStartDate) : "N/A",
        c.agreementEndDate ? formatDate(c.agreementEndDate) : "N/A",
        c.agreementPdfUrl ? (typeof window !== "undefined" ? `"${window.location.origin}${c.agreementPdfUrl}"` : `"${c.agreementPdfUrl}"`) : "N/A",
        c.monthlyAmount || 0,
        c.sdrAmount || 0,
        c.clientStatus || "Active",
      ]),
      ["TOTAL", `${filteredClients.length} Companies`, "", "", totalFilteredSeats, totalFilteredParking, "", "", "", totalFilteredValue, totalFilteredSdr, ""],
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((r) => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SSPACIA_Corporate_Clients_${selectedCentre}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Corporate clients directory exported to CSV.");
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
            className="relative bg-white w-full max-w-[96vw] xl:max-w-7xl max-h-[94vh] shadow-2xl border border-neutral-200 flex flex-col overflow-hidden z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── 1. TOP HEADER ── */}
            <div className="px-5 py-4 bg-gradient-to-r from-neutral-900 via-neutral-800 to-[#004D40] text-white flex items-center justify-between border-b border-neutral-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
                  <Users size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                      Corporate Clients Directory &amp; Seat Allocation
                    </h2>
                    <span className="text-[10px] font-bold bg-teal-500/20 text-teal-300 px-2 py-0.5 border border-teal-400/30 uppercase tracking-widest">
                      Live Client Master
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 font-light mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>
                      Total: <strong className="text-white font-bold">{clients.length} Companies</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Workstation Seats: <strong className="text-teal-300 font-bold">{centreStats.ALL.seats} Seats Allocated</strong>
                    </span>
                    {centreStats.ALL.parking > 0 && (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.2 font-bold text-[11px] rounded-xs">
                          🚗 {centreStats.ALL.parking} Car Parking Slots
                        </span>
                      </>
                    )}
                    <span>•</span>
                    <span>
                      Monthly Value: <strong className="text-emerald-300 font-bold font-mono">{formatINR(centreStats.ALL.value)}</strong>
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 text-xs font-bold text-teal-300 bg-white/10 hover:bg-white/20 border border-white/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Export Client Directory as CSV"
                >
                  <Download size={13} />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Print Directory"
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

            {/* ── 2. STATUS SUMMARY TABS ── */}
            <div className="px-5 py-3 bg-neutral-100/70 border-b border-neutral-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => setStatusTab("ALL")}
                className={`p-3 text-left border transition-all cursor-pointer ${
                  statusTab === "ALL"
                    ? "bg-white border-[#006064] shadow-xs ring-1 ring-[#006064]/40"
                    : "bg-white/80 border-neutral-200 hover:bg-white"
                }`}
              >
                <div className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
                  1. All Clients
                </div>
                <div className="text-lg font-black text-neutral-900 font-display mt-0.5">
                  {clients.length} Companies
                </div>
                <div className="text-[10px] text-neutral-500 font-medium mt-0.5">
                  {centreStats.ALL.seats} Workstation Seats{centreStats.ALL.parking > 0 ? ` • 🚗 ${centreStats.ALL.parking} Parking` : ""}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStatusTab("ACTIVE")}
                className={`p-3 text-left border transition-all cursor-pointer ${
                  statusTab === "ACTIVE"
                    ? "bg-emerald-50/90 border-emerald-500 shadow-xs ring-1 ring-emerald-500/40"
                    : "bg-white/80 border-neutral-200 hover:bg-white"
                }`}
              >
                <div className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                  2. Active Agreements
                </div>
                <div className="text-lg font-black text-emerald-950 font-display mt-0.5">
                  {clients.filter((c) => c.clientStatus !== "Terminated" && c.clientStatus !== "Inactive" && c.clientStatus !== "On Notice").length} Companies
                </div>
                <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
                  Regular Recurring Tenancy
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStatusTab("ON_NOTICE")}
                className={`p-3 text-left border transition-all cursor-pointer ${
                  statusTab === "ON_NOTICE"
                    ? "bg-amber-50/90 border-amber-500 shadow-xs ring-1 ring-amber-500/40"
                    : "bg-white/80 border-neutral-200 hover:bg-white"
                }`}
              >
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                  3. On Notice Period
                </div>
                <div className="text-lg font-black text-amber-950 font-display mt-0.5">
                  {clients.filter((c) => c.clientStatus === "On Notice").length} Companies
                </div>
                <div className="text-[10px] text-amber-700 font-medium mt-0.5">
                  Scheduled Exit / Relocation
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStatusTab("VIRTUAL_OFFICE")}
                className={`p-3 text-left border transition-all cursor-pointer ${
                  statusTab === "VIRTUAL_OFFICE"
                    ? "bg-indigo-50/90 border-indigo-500 shadow-xs ring-1 ring-indigo-500/40"
                    : "bg-white/80 border-neutral-200 hover:bg-white"
                }`}
              >
                <div className="text-[10px] font-black uppercase tracking-wider text-indigo-800">
                  4. Virtual Office
                </div>
                <div className="text-lg font-black text-indigo-950 font-display mt-0.5">
                  {clients.filter((c) => c.clientType === "VIRTUAL_OFFICE").length} Companies
                </div>
                <div className="text-[10px] text-indigo-700 font-medium mt-0.5">
                  Address &amp; Mailing Only
                </div>
              </button>
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
                    <option value="VALUE_DESC">Monthly Agreement (Highest)</option>
                    <option value="SEATS_DESC">Allocated Seats (Highest)</option>
                    <option value="NAME_ASC">Company Name (A-Z)</option>
                  </select>
                </div>
              </div>

              {/* Metrics */}
              <div className="flex items-center gap-2 self-end md:self-auto text-xs">
                <span className="text-neutral-500 font-medium">
                  Showing <strong className="text-neutral-900 font-bold">{filteredClients.length}</strong> of {clients.length}
                </span>
                <span className="font-bold text-teal-800 bg-teal-50 px-2.5 py-1 border border-teal-200 font-mono text-xs flex items-center gap-1.5 flex-wrap">
                  <span>{totalFilteredSeats} Workstation Seats</span>
                  {totalFilteredParking > 0 && (
                    <span className="text-amber-800 bg-amber-100/90 px-1.5 py-0.2 border border-amber-300 text-[10.5px] font-bold rounded-xs">
                      🚗 {totalFilteredParking} Parking
                    </span>
                  )}
                  <span>•</span>
                  <span>{formatINR(totalFilteredValue)}/mo</span>
                </span>
              </div>
            </div>

            {/* ── 4. CLIENTS TABLE ── */}
            <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[52vh] scrollbar-thin">
              <table className="w-full text-left border-collapse table-fixed min-w-[1100px]">
                <colgroup>
                  <col className="w-[100px]" />
                  <col className="w-[180px]" />
                  <col className="w-[125px]" />
                  <col className="w-[155px]" />
                  <col className="w-[65px]" />
                  <col className="w-[95px]" />
                  <col className="w-[95px]" />
                  <col className="w-[85px]" />
                  <col className="w-[110px]" />
                  <col className="w-[100px]" />
                  <col className="w-[85px]" />
                </colgroup>
                <thead className="sticky top-0 bg-neutral-100 z-10 shadow-2xs">
                  <tr className="border-b border-neutral-200 text-[10px] font-black uppercase tracking-wider text-neutral-600">
                    <th className="py-3 px-3 text-left">Client ID</th>
                    <th className="py-3 px-3 text-left">Company Name</th>
                    <th className="py-3 px-3 text-left">Centre</th>
                    <th className="py-3 px-3 text-left">Cabin / Space</th>
                    <th className="py-3 px-3 text-center">Seats</th>
                    <th className="py-3 px-3 text-left">Start Date</th>
                    <th className="py-3 px-3 text-left">End Date</th>
                    <th className="py-3 px-3 text-center">Agreement</th>
                    <th className="py-3 px-3 text-right">Monthly (₹)</th>
                    <th className="py-3 px-3 text-right">SDR (₹)</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-xs">
                  {filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-neutral-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Layers size={28} className="text-neutral-300" />
                          <p className="text-sm font-semibold text-neutral-600">No corporate clients found</p>
                          <p className="text-xs text-neutral-400">Try adjusting your centre filter or search query.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map((c, idx) => (
                      <tr
                        key={`${c.id}_${idx}`}
                        className="hover:bg-teal-50/40 transition-colors group"
                      >
                        <td className="py-3 px-3 font-mono font-bold text-[11px] text-neutral-600 text-left truncate">
                          {c.clientId || `#CL-${c.id}`}
                        </td>
                        <td className="py-3 px-3 font-bold text-neutral-900 text-left">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="truncate">{c.companyName}</span>
                            {c.clientType === "VIRTUAL_OFFICE" && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 text-[8.5px] font-black uppercase tracking-wider rounded-xs whitespace-nowrap">
                                Virtual Office
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-neutral-700 text-left truncate">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#006064] shrink-0" />
                            <span className="truncate">{c.centreName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-neutral-600 font-medium text-left">
                          {c.clientType === "VIRTUAL_OFFICE" ? (
                            <span className="text-indigo-700 font-bold">Address Only (Virtual)</span>
                          ) : (
                            <div className="flex flex-col gap-1 items-start">
                              <span className="truncate">{c.cabinName || "Dedicated Space"}</span>
                              {Boolean(c.parkingSlots && c.parkingSlots > 0) && (
                                <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-amber-900 bg-amber-50 border border-amber-300 px-1.5 py-0.2 rounded-xs">
                                  🚗 {c.parkingSlots} Car Parking
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-black text-neutral-800 font-mono">
                          {c.clientType === "VIRTUAL_OFFICE" ? (
                            <span className="text-neutral-400 font-normal text-xs">—</span>
                          ) : (
                            <span>{c.noOfSeats ?? 0}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-left font-medium text-neutral-700 text-[11px] whitespace-nowrap">
                          {c.agreementStartDate ? formatDate(c.agreementStartDate) : <span className="text-neutral-400 font-mono text-xs">—</span>}
                        </td>
                        <td className="py-3 px-3 text-left font-medium text-neutral-700 text-[11px] whitespace-nowrap">
                          {c.agreementEndDate ? (
                            <span className="text-neutral-900 font-semibold">{formatDate(c.agreementEndDate)}</span>
                          ) : (
                            <span className="text-neutral-400 font-mono text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {c.agreementPdfUrl ? (
                            <a
                              href={c.agreementPdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#006064] hover:text-[#004D40] bg-teal-50 hover:bg-teal-100 border border-teal-300 px-2 py-0.5 rounded-xs transition-colors cursor-pointer group/doc shadow-2xs"
                              title={c.agreementPdfName ? `Open ${c.agreementPdfName}` : "View Signed Agreement PDF"}
                            >
                              <FileText size={11} className="text-[#006064] group-hover/doc:scale-110 transition-transform shrink-0" />
                              <span>View</span>
                              <ExternalLink size={9} className="opacity-70 group-hover/doc:opacity-100 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-neutral-400 font-mono text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-[#006064] font-mono text-xs whitespace-nowrap">
                          {formatINR(c.monthlyAmount)}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-neutral-600 font-mono text-xs whitespace-nowrap">
                          {formatINR(c.sdrAmount)}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
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
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ── 5. FOOTER SUMMARY ── */}
            <div className="px-5 py-3 bg-neutral-50 border-t border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-neutral-500">
                <Building2 size={14} className="text-[#006064]" />
                <span>
                  Showing: <strong className="text-neutral-900 font-bold">{selectedCentre === "ALL" ? "All Operating Centres" : selectedCentre}</strong>
                  {" • "}Tab: <strong className="text-neutral-900 font-bold">
                    {statusTab === "ALL" ? "All Clients" : statusTab === "ACTIVE" ? "Active Agreements" : "On Notice"}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-auto">
                <span className="text-neutral-600 font-bold">
                  Total Recurring Agreement:
                </span>
                <span className="text-sm sm:text-base font-black text-teal-900 font-mono bg-teal-100/70 px-3 py-1 border border-teal-300">
                  {formatINR(totalFilteredValue)} / mo
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
