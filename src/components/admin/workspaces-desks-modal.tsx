"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Package,
  X,
  Search,
  Building2,
  Download,
  Printer,
  CheckCircle2,
  Armchair,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  DoorClosed,
  Laptop,
  Users2
} from "lucide-react";
import { toast } from "sonner";

export interface WorkspaceItem {
  id: number;
  name: string;
  type: string;
  category: string;
  locationId: number;
  locationName: string;
  capacity: number;
  quantity: number;
  price: number;
  durationType: string;
  isActive: boolean;
}

interface WorkspacesDesksModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaces: WorkspaceItem[];
  initialCentre?: string;
  initialCategory?: string;
}

export function WorkspacesDesksModal({
  isOpen,
  onClose,
  workspaces = [],
  initialCentre = "ALL",
  initialCategory = "ALL",
}: WorkspacesDesksModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedCentre, setSelectedCentre] = useState<string>(initialCentre);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"CAP_DESC" | "PRICE_DESC" | "NAME_ASC">("CAP_DESC");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSelectedCentre(initialCentre);
      setSelectedCategory(initialCategory);
      setSearchQuery("");
      setSortOrder("CAP_DESC");
    }
  }, [isOpen, initialCentre, initialCategory]);

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

  const getDurationLabel = (dur: any) => {
    if (!dur) return "month";
    if (typeof dur === "string") {
      const lower = dur.toLowerCase();
      if (lower.includes("hour")) return "hour";
      if (lower.includes("day")) return "day";
      if (lower.includes("week")) return "week";
      if (lower.includes("year")) return "year";
      return "month";
    }
    if (typeof dur === "object") {
      const raw = (dur.displayName || dur.name || dur.slug || "").toLowerCase();
      if (raw.includes("hour")) return "hour";
      if (raw.includes("day")) return "day";
      if (raw.includes("week")) return "week";
      if (raw.includes("year")) return "year";
      return "month";
    }
    return "month";
  };

  // Compute category counts
  const categoryCounts = useMemo(() => {
    let cabins = 0, desks = 0, meeting = 0, eventSpaces = 0, totalCap = 0;
    workspaces.forEach((w) => {
      const type = (w.type || "").toUpperCase();
      const cat = (w.category || "").toUpperCase();
      const name = (w.name || "").toUpperCase();
      const cap = Number(w.capacity || 1) * Number(w.quantity || 1);
      totalCap += cap;

      if (type.includes("CABIN") || name.includes("CABIN")) cabins += 1;
      else if (type.includes("DESK") || name.includes("DESK")) desks += 1;
      else if (type.includes("EVENT") || name.includes("EVENT")) eventSpaces += 1;
      else if (type.includes("MEETING") || name.includes("MEETING") || cat.includes("GUEST")) meeting += 1;
      else cabins += 1;
    });

    return { cabins, desks, meeting, eventSpaces, totalCap };
  }, [workspaces]);

  // Filtered & Sorted Workspaces
  const filteredWorkspaces = useMemo(() => {
    let list = [...workspaces];

    // Category Filter
    if (selectedCategory !== "ALL") {
      const catQ = selectedCategory.toUpperCase();
      list = list.filter((w) => {
        const type = (w.type || "").toUpperCase();
        const cat = (w.category || "").toUpperCase();
        const name = (w.name || "").toUpperCase();
        if (catQ === "CABIN") return type.includes("CABIN") || name.includes("CABIN");
        if (catQ === "DESK") return type.includes("DESK") || name.includes("DESK");
        if (catQ === "MEETING") return type.includes("MEETING") || name.includes("MEETING") || cat.includes("GUEST");
        if (catQ === "EVENT") return type.includes("EVENT") || name.includes("EVENT");
        return true;
      });
    }

    // Centre Filter
    if (selectedCentre !== "ALL") {
      list = list.filter((w) => w.locationName.toLowerCase().includes(selectedCentre.toLowerCase()));
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          w.type.toLowerCase().includes(q) ||
          w.category.toLowerCase().includes(q) ||
          w.locationName.toLowerCase().includes(q)
      );
    }

    // Sorting
    return list.sort((a, b) => {
      if (sortOrder === "CAP_DESC") return (b.capacity || 0) - (a.capacity || 0);
      if (sortOrder === "PRICE_DESC") return (b.price || 0) - (a.price || 0);
      return a.name.localeCompare(b.name);
    });
  }, [workspaces, selectedCategory, selectedCentre, searchQuery, sortOrder]);

  const totalFilteredCapacity = useMemo(() => {
    return filteredWorkspaces.reduce((acc, w) => acc + ((Number(w.capacity) || 1) * (Number(w.quantity) || 1)), 0);
  }, [filteredWorkspaces]);

  const handleExportCSV = () => {
    if (filteredWorkspaces.length === 0) {
      toast.error("No workspaces to export.");
      return;
    }

    const rows = [
      ["Space ID", "Space Name", "Type / Category", "Centre / Location", "Capacity", "Quantity", "Price (INR)", "Billing Plan", "Status"],
      ...filteredWorkspaces.map((w) => [
        `#WS-${w.id}`,
        `"${(w.name || "").replace(/"/g, '""')}"`,
        `"${w.type} / ${w.category}"`,
        w.locationName,
        w.capacity || 1,
        w.quantity || 1,
        w.price || 0,
        getDurationLabel(w.durationType),
        w.isActive ? "ACTIVE" : "INACTIVE",
      ]),
      ["TOTAL", `${filteredWorkspaces.length} Spaces`, "", "", totalFilteredCapacity, "", "", "", ""],
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((r) => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SSPACIA_Workspaces_Inventory_${selectedCentre}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Workspaces inventory exported to CSV.");
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
                  <Package size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                      Workspaces &amp; Desks Inventory Ledger
                    </h2>
                    <span className="text-[10px] font-bold bg-teal-500/20 text-teal-300 px-2 py-0.5 border border-teal-400/30 uppercase tracking-widest">
                      Live Assets
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 font-light mt-0.5 flex items-center gap-2">
                    <span>
                      Total: <strong className="text-white font-bold">{workspaces.length} Spaces Available</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Capacity: <strong className="text-teal-300 font-bold">{categoryCounts.totalCap} Seats Total</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Status: <strong className="text-emerald-300 font-bold">100% Operational</strong>
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 text-xs font-bold text-teal-300 bg-white/10 hover:bg-white/20 border border-white/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Export Workspaces as CSV"
                >
                  <Download size={13} />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Print Inventory"
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

            {/* ── 2. CATEGORY QUICK TABS ── */}
            <div className="px-5 py-3 bg-neutral-100/70 border-b border-neutral-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => setSelectedCategory("ALL")}
                className={`p-3 text-left border transition-all cursor-pointer ${
                  selectedCategory === "ALL"
                    ? "bg-white border-[#006064] shadow-xs ring-1 ring-[#006064]/40"
                    : "bg-white/80 border-neutral-200 hover:bg-white"
                }`}
              >
                <div className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
                  All Workspaces
                </div>
                <div className="text-lg font-black text-neutral-900 font-display mt-0.5">
                  {workspaces.length} Units
                </div>
                <div className="text-[10px] text-neutral-500 font-medium mt-0.5">
                  {categoryCounts.totalCap} Total Capacity
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory("CABIN")}
                className={`p-3 text-left border transition-all cursor-pointer ${
                  selectedCategory === "CABIN"
                    ? "bg-teal-50/90 border-teal-500 shadow-xs ring-1 ring-teal-500/40"
                    : "bg-white/80 border-neutral-200 hover:bg-white"
                }`}
              >
                <div className="text-[10px] font-black uppercase tracking-wider text-[#006064]">
                  Private Cabins
                </div>
                <div className="text-lg font-black text-[#004D40] font-display mt-0.5">
                  {categoryCounts.cabins} Cabins
                </div>
                <div className="text-[10px] text-teal-700 font-medium mt-0.5">
                  Executive &amp; Team Spaces
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory("DESK")}
                className={`p-3 text-left border transition-all cursor-pointer ${
                  selectedCategory === "DESK"
                    ? "bg-purple-50/90 border-purple-500 shadow-xs ring-1 ring-purple-500/40"
                    : "bg-white/80 border-neutral-200 hover:bg-white"
                }`}
              >
                <div className="text-[10px] font-black uppercase tracking-wider text-purple-800">
                  Dedicated Desks
                </div>
                <div className="text-lg font-black text-purple-950 font-display mt-0.5">
                  {categoryCounts.desks} Units
                </div>
                <div className="text-[10px] text-purple-700 font-medium mt-0.5">
                  Flex &amp; Fixed Desks
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory("MEETING")}
                className={`p-3 text-left border transition-all cursor-pointer ${
                  selectedCategory === "MEETING"
                    ? "bg-amber-50/90 border-amber-500 shadow-xs ring-1 ring-amber-500/40"
                    : "bg-white/80 border-neutral-200 hover:bg-white"
                }`}
              >
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                  Meeting &amp; Events
                </div>
                <div className="text-lg font-black text-amber-950 font-display mt-0.5">
                  {categoryCounts.meeting + categoryCounts.eventSpaces} Rooms
                </div>
                <div className="text-[10px] text-amber-700 font-medium mt-0.5">
                  Hourly &amp; Daily Bookings
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
                    placeholder="Search space name, type, centre..."
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
                    <option value="CAP_DESC">Capacity (Largest First)</option>
                    <option value="PRICE_DESC">Pricing (Highest First)</option>
                    <option value="NAME_ASC">Space Name (A-Z)</option>
                  </select>
                </div>
              </div>

              {/* Metrics */}
              <div className="flex items-center gap-2 self-end md:self-auto text-xs">
                <span className="text-neutral-500 font-medium">
                  Showing <strong className="text-neutral-900 font-bold">{filteredWorkspaces.length}</strong> of {workspaces.length}
                </span>
                <span className="font-bold text-teal-800 bg-teal-50 px-2.5 py-1 border border-teal-200 font-mono text-xs">
                  {totalFilteredCapacity} Total Seats Capacity
                </span>
              </div>
            </div>

            {/* ── 4. WORKSPACES TABLE ── */}
            <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[48vh] scrollbar-thin">
              <table className="w-full text-left border-collapse table-fixed min-w-[780px]">
                <colgroup>
                  <col className="w-[80px]" />
                  <col className="w-auto" />
                  <col className="w-[150px]" />
                  <col className="w-[160px]" />
                  <col className="w-[90px]" />
                  <col className="w-[140px]" />
                  <col className="w-[100px]" />
                </colgroup>
                <thead className="sticky top-0 bg-neutral-100 z-10 shadow-2xs">
                  <tr className="border-b border-neutral-200 text-[10.5px] font-black uppercase tracking-wider text-neutral-600">
                    <th className="py-3 px-4 text-left">UID</th>
                    <th className="py-3 px-4 text-left">Workspace Name</th>
                    <th className="py-3 px-4 text-left">Category / Type</th>
                    <th className="py-3 px-4 text-left">Centre</th>
                    <th className="py-3 px-4 text-center">Capacity</th>
                    <th className="py-3 px-4 text-right">Base Pricing</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-xs">
                  {filteredWorkspaces.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-neutral-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Layers size={28} className="text-neutral-300" />
                          <p className="text-sm font-semibold text-neutral-600">No workspace assets found</p>
                          <p className="text-xs text-neutral-400">Try adjusting your centre or category filter.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredWorkspaces.map((w, idx) => (
                      <tr
                        key={`${w.id}_${idx}`}
                        className="hover:bg-teal-50/40 transition-colors group"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-[11px] text-neutral-600 text-left">
                          #{w.id}
                        </td>
                        <td className="py-3 px-4 font-bold text-neutral-900 text-left truncate">
                          {w.name}
                        </td>
                        <td className="py-3 px-4 text-neutral-700 font-medium text-left truncate">
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-neutral-100 text-neutral-700 border border-neutral-200">
                            {w.type || w.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-neutral-800 text-left truncate">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#006064] shrink-0" />
                            <span className="truncate">{w.locationName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-black text-neutral-800 font-mono">
                          {w.capacity || 1} Seats
                        </td>
                        <td className="py-3 px-4 text-right font-black text-[#006064] font-mono text-xs whitespace-nowrap">
                          {w.price > 0 ? `${formatINR(w.price)} / ${getDurationLabel(w.durationType)}` : 'Custom Quote'}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider inline-flex items-center gap-1">
                            <CheckCircle2 size={10} />
                            Active
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
                  {" • "}Category: <strong className="text-neutral-900 font-bold">{selectedCategory}</strong>
                </span>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-auto">
                <span className="text-neutral-600 font-bold">
                  Total Active Seating Capacity:
                </span>
                <span className="text-sm sm:text-base font-black text-teal-900 font-mono bg-teal-100/70 px-3 py-1 border border-teal-300">
                  {totalFilteredCapacity} Seats Total
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
