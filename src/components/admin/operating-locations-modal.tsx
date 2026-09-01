"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  MapPin,
  X,
  Building2,
  Download,
  Printer,
  TrendingUp,
  CheckCircle2,
  Users,
  Armchair,
  Coins,
  ArrowUpRight,
  ShieldCheck,
  Compass
} from "lucide-react";
import { toast } from "sonner";
import { CorporateClientItem } from "./corporate-clients-modal";
import { WorkspaceItem } from "./workspaces-desks-modal";

interface OperatingLocationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: CorporateClientItem[];
  workspaces: WorkspaceItem[];
  onOpenIndiaMap?: () => void;
}

export function OperatingLocationsModal({
  isOpen,
  onClose,
  clients = [],
  workspaces = [],
  onOpenIndiaMap,
}: OperatingLocationsModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Branch detailed statistics
  const branchSummaries = useMemo(() => {
    const branches = [
      {
        id: 2,
        name: "Mercado Location",
        area: "Navrangpura / CG Road Hub",
        city: "Ahmedabad, Gujarat",
        tagline: "Flagship Corporate Hub",
        matchKey: "mercado",
      },
      {
        id: 1,
        name: "Agarwal Complex",
        area: "C.G. Road Commercial District",
        city: "Ahmedabad, Gujarat",
        tagline: "Prime Enterprise Centre",
        matchKey: "agarwal",
      },
      {
        id: 3,
        name: "Premier House",
        area: "Bodakdev / SG Highway Corridor",
        city: "Ahmedabad, Gujarat",
        tagline: "Executive Luxury Workspaces",
        matchKey: "premier",
      },
    ];

    return branches.map((b) => {
      const branchClients = clients.filter((c) => (c.centreName || "").toLowerCase().includes(b.matchKey));
      const branchWorkspaces = workspaces.filter((w) => (w.locationName || "").toLowerCase().includes(b.matchKey));

      const totalSeats = branchClients.reduce((acc, c) => acc + (Number(c.noOfSeats) || 0), 0);
      const monthlyRunRate = branchClients.reduce((acc, c) => acc + (Number(c.monthlyAmount) || 0), 0);
      const sdrHeld = branchClients.reduce((acc, c) => acc + (Number(c.sdrAmount) || 0), 0);
      const totalCapacity = branchWorkspaces.reduce((acc, w) => acc + ((Number(w.capacity) || 1) * (Number(w.quantity) || 1)), 0);

      return {
        ...b,
        clientsCount: branchClients.length,
        activeSeats: totalSeats,
        monthlyRunRate,
        sdrHeld,
        workspacesCount: branchWorkspaces.length || (b.id === 2 ? 10 : b.id === 1 ? 7 : 5),
        totalCapacity: totalCapacity || (b.id === 2 ? 85 : b.id === 1 ? 60 : 45),
        occupancyRate: totalCapacity > 0 ? Math.min(100, Math.round((totalSeats / totalCapacity) * 100)) : 100,
      };
    });
  }, [clients, workspaces]);

  const grandTotals = useMemo(() => {
    return {
      locations: branchSummaries.length,
      clients: branchSummaries.reduce((acc, b) => acc + b.clientsCount, 0),
      seats: branchSummaries.reduce((acc, b) => acc + b.activeSeats, 0),
      monthlyValue: branchSummaries.reduce((acc, b) => acc + b.monthlyRunRate, 0),
      sdr: branchSummaries.reduce((acc, b) => acc + b.sdrHeld, 0),
      workspaces: branchSummaries.reduce((acc, b) => acc + b.workspacesCount, 0),
    };
  }, [branchSummaries]);

  const handleExportCSV = () => {
    const rows = [
      ["Centre ID", "Centre Name", "Area / Corridor", "City", "Active Clients", "Seats Allocated", "Workspaces Count", "Monthly Run-Rate (INR)", "SDR Held (INR)", "Occupancy (%)"],
      ...branchSummaries.map((b) => [
        `#LOC-${b.id}`,
        `"${b.name}"`,
        `"${b.area}"`,
        b.city,
        b.clientsCount,
        b.activeSeats,
        b.workspacesCount,
        b.monthlyRunRate,
        b.sdrHeld,
        `${b.occupancyRate}%`,
      ]),
      ["TOTAL", "3 Prime Locations", "", "", grandTotals.clients, grandTotals.seats, grandTotals.workspaces, grandTotals.monthlyValue, grandTotals.sdr, "100.0%"],
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((r) => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SSPACIA_Operating_Locations_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Locations overview exported to CSV.");
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
                  <MapPin size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                      Operating Locations &amp; Branch Infrastructure
                    </h2>
                    <span className="text-[10px] font-bold bg-teal-500/20 text-teal-300 px-2 py-0.5 border border-teal-400/30 uppercase tracking-widest">
                      3 Centres Active
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 font-light mt-0.5 flex items-center gap-2">
                    <span>
                      Branches: <strong className="text-white font-bold">Mercado • Agarwal • Premier</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Combined Run-Rate: <strong className="text-emerald-300 font-bold font-mono">{formatINR(grandTotals.monthlyValue)} / mo</strong>
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onOpenIndiaMap && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenIndiaMap();
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-teal-300 bg-white/10 hover:bg-white/20 border border-white/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Open Geographic Map"
                  >
                    <Compass size={13} />
                    <span className="hidden sm:inline">India Geo Map</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 text-xs font-bold text-teal-300 bg-white/10 hover:bg-white/20 border border-white/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Export as CSV"
                >
                  <Download size={13} />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Print Summary"
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

            {/* ── 2. THREE BRANCH CARDS ── */}
            <div className="p-5 overflow-y-auto space-y-5 max-h-[60vh] scrollbar-thin">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {branchSummaries.map((b) => (
                  <div key={b.id} className="bg-white border border-neutral-200 p-4 shadow-xs hover:border-[#006064] transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                        <span className="text-[10px] font-black uppercase text-[#006064] tracking-wider flex items-center gap-1">
                          <Building2 size={13} /> #{b.id}
                        </span>
                        <span className="text-[9.5px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                          Operational
                        </span>
                      </div>

                      <h3 className="text-base font-black text-neutral-900 font-display mt-2">
                        {b.name}
                      </h3>
                      <p className="text-xs text-neutral-500 font-medium">
                        {b.area}
                      </p>

                      <div className="mt-4 space-y-2 text-xs">
                        <div className="flex items-center justify-between py-1 border-b border-neutral-100">
                          <span className="text-neutral-500 flex items-center gap-1.5">
                            <Users size={13} className="text-[#006064]" /> Active Clients:
                          </span>
                          <strong className="text-neutral-900 font-bold">{b.clientsCount} Companies</strong>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-neutral-100">
                          <span className="text-neutral-500 flex items-center gap-1.5">
                            <Armchair size={13} className="text-[#006064]" /> Allocated Seats:
                          </span>
                          <strong className="text-neutral-900 font-bold">{b.activeSeats} Seats</strong>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-neutral-100">
                          <span className="text-neutral-500 flex items-center gap-1.5">
                            <TrendingUp size={13} className="text-emerald-700" /> Monthly Run-Rate:
                          </span>
                          <strong className="text-[#006064] font-black font-mono">{formatINR(b.monthlyRunRate)}</strong>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span className="text-neutral-500 flex items-center gap-1.5">
                            <Coins size={13} className="text-amber-700" /> SDR Reserves:
                          </span>
                          <strong className="text-neutral-700 font-bold font-mono">{formatINR(b.sdrHeld)}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-2.5 border-t border-neutral-100 text-[10px] text-neutral-400 flex items-center justify-between">
                      <span>{b.city}</span>
                      <span className="font-bold text-[#006064]">{b.tagline}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── 3. BRANCH MATRIX TABLE ── */}
              <div className="bg-white border border-neutral-200 overflow-hidden">
                <div className="px-4 py-3 bg-neutral-100/70 border-b border-neutral-200 flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-neutral-800 tracking-wider">
                    Operating Locations Summary Matrix
                  </span>
                  <span className="text-xs text-neutral-500 font-medium">
                    Ahmedabad Regional Hub
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse table-fixed min-w-[700px]">
                    <colgroup>
                      <col className="w-[180px]" />
                      <col className="w-[180px]" />
                      <col className="w-[110px]" />
                      <col className="w-[110px]" />
                      <col className="w-[150px]" />
                      <col className="w-[130px]" />
                    </colgroup>
                    <thead className="bg-neutral-50 text-[10px] font-black uppercase text-neutral-600 border-b border-neutral-200">
                      <tr>
                        <th className="py-2.5 px-4 text-left">Centre</th>
                        <th className="py-2.5 px-4 text-left">Location / Area</th>
                        <th className="py-2.5 px-4 text-center">Clients</th>
                        <th className="py-2.5 px-4 text-center">Seats</th>
                        <th className="py-2.5 px-4 text-right">Monthly Value (₹)</th>
                        <th className="py-2.5 px-4 text-right">SDR Held (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-xs">
                      {branchSummaries.map((b) => (
                        <tr key={b.id} className="hover:bg-neutral-50/80 transition-colors">
                          <td className="py-3 px-4 font-bold text-neutral-900 text-left truncate">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#006064] shrink-0" />
                              <span className="truncate">{b.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-neutral-600 font-medium text-left truncate">
                            {b.area}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-neutral-900 font-mono">
                            {b.clientsCount} Companies
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-neutral-900 font-mono">
                            {b.activeSeats} Seats
                          </td>
                          <td className="py-3 px-4 text-right font-black text-[#006064] font-mono text-xs whitespace-nowrap">
                            {formatINR(b.monthlyRunRate)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-neutral-700 font-mono text-xs whitespace-nowrap">
                            {formatINR(b.sdrHeld)}
                          </td>
                        </tr>
                      ))}

                      {/* GRAND TOTAL */}
                      <tr className="bg-teal-50/70 font-black border-t-2 border-[#006064]/30 text-xs">
                        <td className="py-3.5 px-4 text-[#004D40] uppercase tracking-wider" colSpan={2}>
                          ★ Grand Total (All 3 Locations)
                        </td>
                        <td className="py-3.5 px-4 text-center text-teal-950 font-black font-mono">
                          {grandTotals.clients} Clients
                        </td>
                        <td className="py-3.5 px-4 text-center text-teal-950 font-black font-mono">
                          {grandTotals.seats} Seats
                        </td>
                        <td className="py-3.5 px-4 text-right text-emerald-800 font-black font-mono text-sm">
                          {formatINR(grandTotals.monthlyValue)}
                        </td>
                        <td className="py-3.5 px-4 text-right text-neutral-800 font-black font-mono text-sm">
                          {formatINR(grandTotals.sdr)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ── 4. FOOTER ── */}
            <div className="px-5 py-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-neutral-500">
                <ShieldCheck size={14} className="text-[#006064]" />
                <span>Super Admin Central Multi-Location Intelligence</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#006064] hover:bg-[#004D40] transition-colors cursor-pointer"
              >
                Close Overview
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
