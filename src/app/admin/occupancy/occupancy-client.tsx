"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import {
  Building2,
  Users,
  Armchair,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Download,
  Printer,
  RotateCcw,
  LayoutGrid,
  Layers,
  ArrowLeft,
  ShieldCheck,
  DoorClosed,
  Laptop,
  Users2,
  Calendar,
  Sparkles,
  Ticket,
  Maximize2,
  Info,
  ChevronRight,
  X,
  Compass,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { FadeUp } from "@/components/ui/fade-up";

interface OccupancyFloorUnit {
  id: string;
  code: string;
  name: string;
  centreId: number;
  centreName: string;
  category: "CABIN" | "DESK" | "MEETING" | "EVENT";
  typeName: string;
  capacity: number;
  occupiedSeats: number;
  availableSeats: number;
  basePrice: number;
  status: "OCCUPIED" | "AVAILABLE" | "PARTIALLY_AVAILABLE" | "ON_NOTICE" | "GUEST_BOOKABLE";
  grid: {
    x: number;
    y: number;
    w: number;
    h: number;
    zone: string;
  };
  occupant: {
    companyName: string;
    clientId: string;
    seats: number;
    monthlyAmount: number;
    sdr?: number;
    sdrDeposit?: number;
    status?: string;
    clientStatus?: string;
    startDate?: string;
    agreementStartDate?: string;
    agreementEndDate?: string;
    lockInMonths?: number;
    lockInPeriod?: string;
    noticeMonths?: number;
  } | null;
  ops: {
    openTicketsCount: number;
    housekeepingStatus: string;
    isReadyForMoveIn: boolean;
  };
}

interface CentreTelemetry {
  id: number;
  name: string;
  slug: string;
  area: string;
  address?: string;
  metrics: {
    totalCabins: number;
    occupiedCabins: number;
    availableCabins: number;
    cabinOccupancyRate: number;

    totalDesks: number;
    occupiedDesks: number;
    availableDesks: number;
    deskOccupancyRate: number;

    totalSeats: number;
    occupiedSeats: number;
    availableSeats: number;
    overallOccupancyRate: number;

    activeClientsCount: number;
    monthlyRevenue: number;
    openTicketsCount: number;
    housekeepingStatus: string;
  };
  units: OccupancyFloorUnit[];
}

interface OccupancyApiResponse {
  success: boolean;
  selectedLocation: string;
  grandTotals: {
    totalCabins: number;
    occupiedCabins: number;
    availableCabins: number;
    cabinOccupancyRate: number;

    totalDesks: number;
    occupiedDesks: number;
    availableDesks: number;
    deskOccupancyRate: number;

    totalSeats: number;
    occupiedSeats: number;
    availableSeats: number;
    overallOccupancyRate: number;

    totalClientsCount: number;
    totalMonthlyRunRate: number;
    totalOpenTickets: number;
  };
  centres: CentreTelemetry[];
  allUnits: OccupancyFloorUnit[];
  locations: Array<{ id: number; name: string; slug: string; area?: string }>;
}

export function OccupancyClient() {
  const [data, setData] = useState<OccupancyApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedLocation, setSelectedLocation] = useState<string>("ALL");
  const [activeCadCentre, setActiveCadCentre] = useState<string>("1"); // Default to Agarwal Complex
  const [viewMode, setViewMode] = useState<"CAD" | "TABLE" | "COMPANIES">("CAD");
  const [selectedUnit, setSelectedUnit] = useState<OccupancyFloorUnit | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cadTheme, setCadTheme] = useState<"WHITE" | "BLUEPRINT" | "STUDIO">("WHITE");
  const [isExpandedModalOpen, setIsExpandedModalOpen] = useState<boolean>(false);
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  
  // Hover and Overlay Mode State (Default to HOVER_ONLY as requested)
  const [hoveredUnit, setHoveredUnit] = useState<OccupancyFloorUnit | null>(null);
  const [overlayMode, setOverlayMode] = useState<"HOVER_ONLY" | "SHOW_ALL">("HOVER_ONLY");
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchOccupancyData = useCallback(async (locId = selectedLocation) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (locId && locId !== "ALL") params.set("locationId", locId);
      const res = await fetch(`/api/admin/occupancy?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load occupancy report");
      }
      const json: OccupancyApiResponse = await res.json();
      setData(json);
    } catch (err) {
      console.error("[Occupancy Fetch Error]", err);
      toast.error("Failed to load live occupancy telemetry.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedLocation]);


  useEffect(() => {
    fetchOccupancyData(selectedLocation);
  }, [selectedLocation]);

  const formatINR = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Active Centre or Grand Totals metrics
  const activeMetrics = useMemo(() => {
    if (!data) return null;
    if (selectedLocation === "ALL") {
      return {
        ...data.grandTotals,
        name: "All Operating Centres",
        openTicketsCount: data.grandTotals.totalOpenTickets,
        housekeepingStatus: "All Centres Monitored",
        activeClientsCount: data.grandTotals.totalClientsCount,
      };
    }
    const found = data.centres.find((c) => String(c.id) === selectedLocation);
    if (found) {
      return {
        ...found.metrics,
        name: found.name,
        totalMonthlyRunRate: found.metrics.monthlyRevenue,
      };
    }
    return {
      ...data.grandTotals,
      name: "All Operating Centres",
      openTicketsCount: data.grandTotals.totalOpenTickets,
      housekeepingStatus: "All Centres Monitored",
      activeClientsCount: data.grandTotals.totalClientsCount,
    };
  }, [data, selectedLocation]);

  // Filtered Floor Units
  const filteredUnits = useMemo(() => {
    if (!data) return [];
    let list = data.allUnits;

    // Filter by Centre
    if (selectedLocation !== "ALL") {
      list = list.filter((u) => String(u.centreId) === selectedLocation);
    }

    // Filter by Category
    if (categoryFilter !== "ALL") {
      list = list.filter((u) => u.category === categoryFilter);
    }

    // Filter by Status
    if (statusFilter !== "ALL") {
      list = list.filter((u) => u.status === statusFilter);
    }

    // Filter by Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.code.toLowerCase().includes(q) ||
          u.centreName.toLowerCase().includes(q) ||
          u.typeName.toLowerCase().includes(q) ||
          (u.occupant?.companyName && u.occupant.companyName.toLowerCase().includes(q)) ||
          (u.occupant?.clientId && u.occupant.clientId.toLowerCase().includes(q))
      );
    }

    return list;
  }, [data, selectedLocation, categoryFilter, statusFilter, searchQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsExpandedModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const currentCadLocationId = selectedLocation === "ALL" ? activeCadCentre : selectedLocation;

  // CAD Units dedicated strictly to currentCadLocationId
  const cadDisplayUnits = useMemo(() => {
    if (!data) return [];
    let list = data.allUnits.filter((u) => String(u.centreId) === currentCadLocationId);

    if (categoryFilter !== "ALL") {
      list = list.filter((u) => u.category === categoryFilter);
    }
    if (statusFilter !== "ALL") {
      list = list.filter((u) => u.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.code.toLowerCase().includes(q) ||
          u.typeName.toLowerCase().includes(q) ||
          (u.occupant?.companyName && u.occupant.companyName.toLowerCase().includes(q))
      );
    }
    return list;
  }, [data, currentCadLocationId, categoryFilter, statusFilter, searchQuery]);

  const handleExportCSV = () => {
    if (filteredUnits.length === 0) {
      toast.error("No occupancy records to export.");
      return;
    }

    const rows = [
      ["Space Code", "Space Name", "Centre", "Type", "Capacity (Seats)", "Occupied Seats", "Available Seats", "Status", "Occupant Company", "Client ID", "Monthly Agreement (INR)", "Ops Status"],
      ...filteredUnits.map((u) => [
        u.code,
        `"${u.name}"`,
        u.centreName,
        `"${u.typeName}"`,
        u.capacity,
        u.occupiedSeats,
        u.availableSeats,
        u.status,
        u.occupant ? `"${u.occupant.companyName}"` : "VACANT / AVAILABLE",
        u.occupant ? u.occupant.clientId : "N/A",
        u.occupant ? u.occupant.monthlyAmount : 0,
        u.ops.housekeepingStatus,
      ]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((r) => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SSPACIA_Occupancy_Report_${selectedLocation}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Occupancy report exported to CSV.");
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusVisualBadge = (status: string, availableSeats?: number, capacity?: number) => {
    switch (status) {
      case "OCCUPIED":
        return (
          <span className="px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            100% Leased
          </span>
        );
      case "PARTIALLY_AVAILABLE":
        return (
          <span className="px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Partially Leased ({availableSeats} Free)
          </span>
        );
      case "AVAILABLE":
        return (
          <span className="px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Available (Vacant)
          </span>
        );
      case "ON_NOTICE":
        return (
          <span className="px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            On Notice
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            Bookable Space
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      {/* ── TOP HEADER & TOOLBAR ── */}
      <div className="bg-white border-b border-neutral-200 relative z-10 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <Link
              href="/admin/dashboard"
              className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
              title="Return to Super Admin Dashboard"
            >
              <ArrowLeft size={18} />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#006064] bg-teal-50 px-2 py-0.5 border border-teal-200">
                  Super Admin Exclusive
                </span>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                  Live CAD Telemetry
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight uppercase font-display flex items-center gap-2">
                <LayoutGrid size={22} className="text-[#006064]" />
                Occupancy Intelligence &amp; CAD Blueprint
              </h1>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
            {/* View Mode Toggle */}
            <div className="bg-neutral-100 p-0.5 flex items-center border border-neutral-200">
              <button
                type="button"
                onClick={() => setViewMode("CAD")}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === "CAD"
                    ? "bg-white text-[#006064] shadow-xs font-black"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <Compass size={13} />
                <span>2D CAD Blueprint</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("TABLE")}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === "TABLE"
                    ? "bg-white text-[#006064] shadow-xs font-black"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <FileSpreadsheet size={13} />
                <span>Inventory Ledger</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Export Full Occupancy Report as CSV"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-[#006064] hover:bg-[#004D40] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Print Statement"
            >
              <Printer size={13} />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              type="button"
              onClick={() => fetchOccupancyData(selectedLocation)}
              className="p-1.5 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 transition-colors cursor-pointer shadow-2xs"
              title="Refresh Live Telemetry"
            >
              <RotateCcw size={14} className={isLoading ? "animate-spin text-[#006064]" : ""} />
            </button>
          </div>

        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">

        {/* ── 1. COMPACT EXECUTIVE CENTRE FILTER & TELEMETRY HUD ── */}
        <FadeUp>
          <div className="bg-white border border-neutral-200 shadow-xs divide-y divide-neutral-100">
            {/* Top Row: Centre Selector & Quick Actions */}
            <div className="p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral-50/50">
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <span className="text-xs font-black uppercase text-neutral-600 tracking-wider flex items-center gap-1">
                  <Building2 size={15} className="text-[#006064]" /> Centre Filter:
                </span>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedLocation("ALL")}
                    className={`px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                      selectedLocation === "ALL"
                        ? "bg-[#006064] text-white shadow-xs"
                        : "bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100"
                    }`}
                  >
                    All Centres (Global)
                  </button>

                  {data?.locations.map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => {
                        setSelectedLocation(String(loc.id));
                        setActiveCadCentre(String(loc.id));
                      }}
                      className={`px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                        selectedLocation === String(loc.id)
                          ? "bg-[#006064] text-white shadow-xs"
                          : "bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100"
                      }`}
                    >
                      {loc.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-neutral-500 self-end sm:self-auto">
                <span>
                  Active Scope: <strong className="text-neutral-900 font-bold">{activeMetrics?.name}</strong>
                </span>
                <span>•</span>
                <span className="font-mono text-emerald-700 font-bold">
                  {activeMetrics?.activeClientsCount} Companies Occupying
                </span>
              </div>
            </div>

            {/* Bottom Row: Slim Inline Telemetry Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 text-xs">
              {/* Telemetry 1: Cabins */}
              <div className="flex items-center justify-between bg-neutral-50 p-2.5 border border-neutral-200/70">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-teal-100 text-[#006064] flex items-center justify-center font-bold text-xs">
                    <DoorClosed size={14} />
                  </div>
                  <div>
                    <span className="font-black text-neutral-800 uppercase tracking-wider text-[10px] block">Cabins</span>
                    <span className="font-mono font-bold text-neutral-600 text-[11px]">
                      {activeMetrics?.occupiedCabins}/{activeMetrics?.totalCabins} Leased
                    </span>
                  </div>
                </div>
                <span className="font-mono font-black text-teal-800 bg-teal-50 px-2 py-0.5 border border-teal-200 text-[10.5px]">
                  {activeMetrics?.cabinOccupancyRate ?? 100}% Leased
                </span>
              </div>

              {/* Telemetry 2: Desks */}
              <div className="flex items-center justify-between bg-neutral-50 p-2.5 border border-neutral-200/70">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                    <Laptop size={14} />
                  </div>
                  <div>
                    <span className="font-black text-neutral-800 uppercase tracking-wider text-[10px] block">Desks</span>
                    <span className="font-mono font-bold text-neutral-600 text-[11px]">
                      {activeMetrics?.occupiedDesks}/{activeMetrics?.totalDesks} Occupied ({activeMetrics?.availableDesks} Free)
                    </span>
                  </div>
                </div>
                <span className="font-mono font-black text-purple-800 bg-purple-50 px-2 py-0.5 border border-purple-200 text-[10.5px]">
                  {activeMetrics?.deskOccupancyRate ?? 13.9}%
                </span>
              </div>

              {/* Telemetry 3: Total Seating & Revenue */}
              <div className="flex items-center justify-between bg-neutral-50 p-2.5 border border-neutral-200/70">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    <Armchair size={14} />
                  </div>
                  <div>
                    <span className="font-black text-neutral-800 uppercase tracking-wider text-[10px] block">Capacity &amp; Yield</span>
                    <span className="font-mono font-bold text-neutral-600 text-[11px]">
                      {activeMetrics?.occupiedSeats}/{activeMetrics?.totalSeats} Seats ({formatINR(activeMetrics?.totalMonthlyRunRate ?? 0)}/mo)
                    </span>
                  </div>
                </div>
                <span className="font-mono font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-200 text-[10.5px]">
                  {activeMetrics?.overallOccupancyRate ?? 57.8}%
                </span>
              </div>
            </div>
          </div>
        </FadeUp>

        {/* ── 2. INTERACTIVE 2D CAD ARCHITECTURAL BLUEPRINT CANVAS ── */}
        {viewMode === "CAD" && (
          <FadeUp delay={0.05}>
            <div className="bg-white border border-neutral-200 shadow-xs overflow-hidden">
              
              {/* CAD Control Header */}
              <div className="px-4 sm:px-5 py-3 bg-neutral-900 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded bg-teal-500/20 text-teal-300 flex items-center justify-center border border-teal-400/30">
                    <Compass size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                      <span>Architectural 2D CAD Floor Plan Visualizer</span>
                      <span className="text-[9.5px] font-bold bg-teal-500/20 text-teal-300 px-2 py-0.2 border border-teal-400/30 uppercase">
                        {overlayMode === "HOVER_ONLY" ? "Hover Reveal Active" : "All Overlays Visible"}
                      </span>
                    </h3>
                    <p className="text-[11px] text-neutral-400 font-light">
                      Hover over any cabin or workspace to reveal live tenancy details without cluttering the architectural drawing.
                    </p>
                  </div>
                </div>

                {/* CAD Centre Quick Switcher + Mode + Theme Toggle */}
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  
                  {/* Mode Toggle: Hover Only vs Show All */}
                  <div className="bg-neutral-800 p-0.5 flex items-center border border-neutral-700">
                    <button
                      type="button"
                      onClick={() => setOverlayMode("HOVER_ONLY")}
                      className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        overlayMode === "HOVER_ONLY"
                          ? "bg-teal-600 text-white shadow-xs"
                          : "text-neutral-400 hover:text-white"
                      }`}
                      title="Keep blueprint clean and only show color coding and tenant tags when hovering over a space"
                    >
                      🎯 Hover Reveal
                    </button>
                    <button
                      type="button"
                      onClick={() => setOverlayMode("SHOW_ALL")}
                      className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        overlayMode === "SHOW_ALL"
                          ? "bg-teal-600 text-white shadow-xs"
                          : "text-neutral-400 hover:text-white"
                      }`}
                      title="Display all colored boxes and labels simultaneously"
                    >
                      👁️ Show All
                    </button>
                  </div>

                  {/* Centre switcher inside CAD header */}
                  <div className="bg-neutral-800 p-0.5 flex items-center border border-neutral-700">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCadCentre("1");
                        const first = data?.allUnits.find(u => String(u.centreId) === "1");
                        if (first) setSelectedUnit(first);
                      }}
                      className={`px-2.5 py-1 text-[10px] font-bold uppercase transition-all cursor-pointer ${
                        currentCadLocationId === "1" ? "bg-teal-600 text-white font-black shadow-xs" : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      Agarwal Complex
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCadCentre("2");
                        const first = data?.allUnits.find(u => String(u.centreId) === "2");
                        if (first) setSelectedUnit(first);
                      }}
                      className={`px-2.5 py-1 text-[10px] font-bold uppercase transition-all cursor-pointer ${
                        currentCadLocationId === "2" ? "bg-teal-600 text-white font-black shadow-xs" : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      Mercado
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCadCentre("3");
                        const first = data?.allUnits.find(u => String(u.centreId) === "3");
                        if (first) setSelectedUnit(first);
                      }}
                      className={`px-2.5 py-1 text-[10px] font-bold uppercase transition-all cursor-pointer ${
                        currentCadLocationId === "3" ? "bg-teal-600 text-white font-black shadow-xs" : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      Premier House
                    </button>
                  </div>

                  {/* Theme Switcher */}
                  <div className="bg-neutral-800 p-0.5 flex items-center border border-neutral-700">
                    <button
                      type="button"
                      onClick={() => setCadTheme("WHITE")}
                      className={`px-2 py-0.5 text-[9.5px] font-bold uppercase cursor-pointer ${
                        cadTheme === "WHITE" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      White
                    </button>
                    <button
                      type="button"
                      onClick={() => setCadTheme("STUDIO")}
                      className={`px-2 py-0.5 text-[9.5px] font-bold uppercase cursor-pointer ${
                        cadTheme === "STUDIO" ? "bg-teal-700 text-white" : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      Studio
                    </button>
                    <button
                      type="button"
                      onClick={() => setCadTheme("BLUEPRINT")}
                      className={`px-2 py-0.5 text-[9.5px] font-bold uppercase cursor-pointer ${
                        cadTheme === "BLUEPRINT" ? "bg-cyan-800 text-cyan-200" : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      Blueprint
                    </button>
                  </div>

                  {/* Expand Fullscreen Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsExpandedModalOpen(true);
                      setZoomScale(1.0);
                    }}
                    className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-teal-600 hover:bg-teal-500 text-white rounded-2xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <Maximize2 size={12} />
                    <span>Expand Full CAD View</span>
                  </button>
                </div>
              </div>

              {/* Main CAD Blueprint Stage + Side Inspector Drawer */}
              <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
                
                {/* 2D Architectural Floor Plan Grid */}
                <div className={`lg:col-span-8 p-4 sm:p-6 relative overflow-hidden flex flex-col justify-between ${
                  cadTheme === "WHITE"
                    ? "bg-neutral-100"
                    : cadTheme === "BLUEPRINT"
                    ? "bg-[#0b1d3a] bg-[radial-gradient(#1e3a8a_1px,transparent_1px)] [background-size:16px_16px]"
                    : "bg-neutral-900 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px]"
                }`}>
                  
                  {/* Floor Plan Structural Container with Image-Fitted Overlay */}
                  <div className="w-full flex items-center justify-center overflow-auto p-2 min-h-[540px]">
                    <div className="relative inline-block max-w-full overflow-hidden border border-neutral-300 rounded p-1 shadow-md bg-white">
                      
                      {/* Real High-Resolution CAD Architectural Floor Plan Backdrop */}
                      <img
                        src={
                          currentCadLocationId === "1"
                            ? "/cad-previews/agarwal_cad.png"
                            : currentCadLocationId === "2"
                            ? "/cad-previews/mercado_cad.png"
                            : "/cad-previews/premier_cad.png"
                        }
                        alt="AutoCAD Floor Plan"
                        className="max-h-[680px] w-auto h-auto max-w-full block mx-auto select-none pointer-events-none"
                        style={{
                          filter:
                            cadTheme === "WHITE"
                              ? "none"
                              : cadTheme === "BLUEPRINT"
                              ? "invert(1) sepia(1) saturate(6) hue-rotate(170deg) brightness(1.2) contrast(1.4)"
                              : "invert(1) hue-rotate(180deg) brightness(1.25) contrast(1.35)",
                        }}
                      />

                      {/* Floor Plan Title Badge */}
                      <div className="absolute top-2 left-3 bg-teal-700/95 text-white px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-2xs z-20 shadow-md border border-teal-400/40 flex items-center gap-1.5 backdrop-blur-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                        <span>{currentCadLocationId === "1" ? "Agarwal Complex" : currentCadLocationId === "2" ? "Mercado Flagship" : "Premier House"}</span>
                      </div>

                      <div className="absolute bottom-2 right-3 bg-neutral-900/90 text-neutral-300 px-2 py-0.5 text-[8.5px] font-mono border border-neutral-700 z-20 shadow-xs backdrop-blur-xs">
                        AutoCAD: {currentCadLocationId === "1" ? "Agrawal.dwg" : currentCadLocationId === "2" ? "Mercadol.dwg" : "Premier House.dwg"}
                      </div>

                      {/* Hotspots Overlay locked to 100% of the image bounding box */}
                      <div 
                        className="absolute inset-0 w-full h-full pointer-events-auto"
                        onMouseLeave={() => setHoveredUnit(null)}
                      >
                        {cadDisplayUnits.map((unit) => {
                          const isHovered = hoveredUnit?.id === unit.id;
                          const isVisible = overlayMode === "SHOW_ALL" ? true : isHovered;

                          const isOccupied = unit.status === "OCCUPIED";
                          const isPartiallyAvailable = unit.status === "PARTIALLY_AVAILABLE";
                          const isMeeting = unit.status === "GUEST_BOOKABLE";
                          const isAvailableCabin = unit.status === "AVAILABLE" && unit.category === "CABIN";

                          return (
                            <div
                              key={unit.id}
                              onMouseEnter={() => setHoveredUnit(unit)}
                              style={{
                                position: "absolute",
                                left: `${unit.grid.x}%`,
                                top: `${unit.grid.y}%`,
                                width: `${unit.grid.w}%`,
                                height: `${unit.grid.h}%`,
                              }}
                              className={`rounded-2xs transition-all duration-150 cursor-pointer ${
                                isVisible
                                  ? `border-2 z-30 shadow-lg ${
                                      isOccupied
                                        ? "bg-rose-500/35 border-rose-600 text-rose-950 shadow-rose-500/20"
                                        : isPartiallyAvailable
                                        ? "bg-amber-400/35 border-amber-500 text-amber-950 shadow-amber-500/20"
                                        : isAvailableCabin
                                        ? "bg-amber-400/35 border-amber-500 text-amber-950 shadow-amber-500/20"
                                        : isMeeting
                                        ? "bg-purple-500/35 border-purple-600 text-purple-950 shadow-purple-500/20"
                                        : "bg-emerald-500/35 border-emerald-600 text-emerald-950 shadow-emerald-500/20"
                                    } ring-2 ring-[#006064]/60 ring-offset-1 scale-[1.01]`
                                  : "bg-transparent border border-transparent hover:bg-black/5 z-10"
                              }`}
                            >
                              {/* Content visible only on hover / show all */}
                              {isVisible && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ duration: 0.1 }}
                                  className="h-full flex flex-col justify-between p-1 select-none pointer-events-none"
                                >
                                  {/* Top Tag: Room Code + Seat count */}
                                  <div className="flex items-center justify-between gap-1 leading-none w-full">
                                    <span className="text-[7.5px] sm:text-[8.5px] font-mono font-black uppercase tracking-tight text-neutral-900 bg-white/95 px-1 py-0.2 rounded-2xs shadow-md border border-neutral-300/70">
                                      {unit.code}
                                    </span>
                                    <span className={`text-[7px] sm:text-[7.5px] font-black px-1 py-0.2 rounded-2xs text-white shadow-md ${
                                      isOccupied
                                        ? "bg-rose-700"
                                        : isPartiallyAvailable
                                        ? "bg-amber-600"
                                        : isAvailableCabin
                                        ? "bg-amber-600"
                                        : isMeeting
                                        ? "bg-purple-700"
                                        : "bg-emerald-700"
                                    }`}>
                                      {isPartiallyAvailable ? `${unit.occupiedSeats}/${unit.capacity}s` : `${unit.capacity}s`}
                                    </span>
                                  </div>

                                  {/* Bottom Label: Company Name or Available status */}
                                  <div className="mt-auto pt-0.5 w-full">
                                    {unit.occupant ? (
                                      <div className="bg-neutral-900/95 text-white px-1 py-0.5 rounded-2xs truncate shadow-md border border-white/20">
                                        <p className="font-bold text-[7.5px] sm:text-[8px] truncate leading-tight text-white">
                                          {unit.occupant.companyName}
                                        </p>
                                        {isPartiallyAvailable && (
                                          <span className="text-[7px] text-amber-300 font-bold block truncate">
                                            ({unit.availableSeats} Free)
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <div className={`px-1 py-0.2 rounded-2xs text-center font-black text-[7px] sm:text-[7.5px] uppercase tracking-wider shadow-md ${
                                        isAvailableCabin
                                          ? "bg-amber-500 text-neutral-950"
                                          : isMeeting
                                          ? "bg-purple-700 text-white"
                                          : "bg-emerald-700 text-white"
                                      }`}>
                                        {isAvailableCabin ? "🟡 Available" : isMeeting ? "🟣 Meeting" : "🟢 Available"}
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  </div>

                  {/* CAD Bottom Status Bar */}
                  <div className="mt-3 pt-2 border-t border-neutral-300 text-[10px] text-neutral-600 flex items-center justify-between font-mono flex-wrap gap-2">
                    <span className="flex items-center gap-1.5">
                      <Compass size={12} className="text-[#006064]" />
                      <span>
                        Active CAD Drawing:{" "}
                        <strong className="text-neutral-900">
                          {currentCadLocationId === "1"
                            ? "Agrawal.dwg (Agarwal Complex, C.G. Road)"
                            : currentCadLocationId === "2"
                            ? "Mercadol.dwg (Mercado Location, Navrangpura)"
                            : "Premier House.dwg (Premier House, SG Highway)"}
                        </strong>
                      </span>
                    </span>
                    <span>Rendering: {cadDisplayUnits.length} Physical Units • Architectural Scale 1:50</span>
                  </div>
                </div>

                {/* Right Space Inspection Panel */}
                <div className="lg:col-span-4 bg-white border-t lg:border-t-0 lg:border-l border-neutral-200 p-6 flex flex-col justify-between">
                  {(() => {
                    const inspected = hoveredUnit;
                    if (!inspected) {
                      return (
                        <div className="py-24 text-center text-neutral-400">
                          <Compass size={40} className="text-neutral-300 mx-auto mb-3 animate-pulse" />
                          <p className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                            Interactive Hover Inspection
                          </p>
                          <p className="text-[11px] text-neutral-500 max-w-xs mx-auto leading-relaxed">
                            Hover over any cabin or workspace in the floor plan to inspect tenant agreements, capacity, lock-in dates, and SDR security deposits.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div>
                        {/* Status Header */}
                        <div className="flex items-center justify-between pb-3.5 border-b border-neutral-200">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block mb-0.5 flex items-center gap-1">
                              <span>Space Inspection</span>
                              {hoveredUnit && <span className="text-teal-600 font-bold">(Live Hover)</span>}
                            </span>
                            <span className="text-xs font-mono font-bold text-neutral-800">
                              {inspected.code} • {inspected.centreName}
                            </span>
                          </div>
                          
                          {inspected.status === "OCCUPIED" ? (
                            <span className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-300 rounded-2xs flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                              100% Leased
                            </span>
                          ) : inspected.status === "PARTIALLY_AVAILABLE" ? (
                            <span className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300 rounded-2xs flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                              Partially Leased ({inspected.availableSeats} Free)
                            </span>
                          ) : inspected.category === "CABIN" ? (
                            <span className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300 rounded-2xs flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              Available Cabin
                            </span>
                          ) : inspected.category === "MEETING" || inspected.category === "EVENT" ? (
                            <span className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider bg-purple-50 text-purple-800 border border-purple-300 rounded-2xs flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-purple-500" />
                              Meeting / Event
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-2xs flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              Available Desk
                            </span>
                          )}
                        </div>

                        <div className="mt-4 space-y-3.5">
                          
                          {/* 1. Company Name */}
                          <div className="bg-neutral-50 p-3.5 border border-neutral-200/80 rounded-xs">
                            <span className="text-[9.5px] font-black uppercase tracking-wider text-neutral-400 block mb-0.5">
                              Company Name
                            </span>
                            <h3 className="text-base font-black text-neutral-900 font-display leading-snug">
                              {inspected.occupant?.companyName || (
                                <span className="text-neutral-400 font-medium italic">
                                  Vacant Space (Ready for Allocation)
                                </span>
                              )}
                            </h3>
                            {inspected.occupant?.clientId && (
                              <span className="text-[10px] font-mono text-neutral-500 mt-1 block">
                                Client UID: <strong className="text-neutral-800">{inspected.occupant.clientId}</strong>
                              </span>
                            )}
                          </div>

                          {/* 2. Product Details */}
                          <div className="bg-neutral-50 p-3.5 border border-neutral-200/80 rounded-xs space-y-2 text-xs">
                            <span className="text-[9.5px] font-black uppercase tracking-wider text-neutral-400 block mb-0.5">
                              Product Details
                            </span>
                            <div className="flex items-center justify-between">
                              <span className="text-neutral-500">Space Name:</span>
                              <span className="font-black text-neutral-900">{inspected.name}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-neutral-500">Product Category:</span>
                              <span className="font-bold text-neutral-800">{inspected.typeName}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-neutral-500">Total Capacity:</span>
                              <span className="font-black text-neutral-900 font-mono">{inspected.capacity} Seats</span>
                            </div>
                            <div className="flex items-center justify-between bg-white p-2 border border-neutral-200/60 rounded-2xs">
                              <span className="text-neutral-600 font-bold">Occupancy Breakdown:</span>
                              <span className="font-mono font-black text-neutral-900">
                                {inspected.occupiedSeats} Occupied / {inspected.capacity} Total
                                {inspected.availableSeats > 0 && (
                                  <span className="text-amber-700 ml-1 font-bold">
                                    ({inspected.availableSeats} Available)
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>

                          {/* 3. Agreement Dates & Lock-in Date */}
                          <div className="bg-neutral-50 p-3.5 border border-neutral-200/80 rounded-xs space-y-2 text-xs">
                            <span className="text-[9.5px] font-black uppercase tracking-wider text-neutral-400 block mb-0.5">
                              Tenancy &amp; Agreement Terms
                            </span>

                            <div className="flex items-center justify-between">
                              <span className="text-neutral-500">Agreement Start Date:</span>
                              <span className="font-mono font-black text-neutral-900">
                                {inspected.occupant?.agreementStartDate || "N/A"}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-neutral-500">Agreement End Date:</span>
                              <span className="font-mono font-black text-neutral-900">
                                {inspected.occupant?.agreementEndDate || "N/A"}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-neutral-500">Lock-In Period / Date:</span>
                              <span className="font-black text-[#006064] font-mono">
                                {inspected.occupant?.lockInPeriod || "11 Months"}
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-neutral-200">
                              <span className="text-neutral-600 font-bold">SDR Security Deposit:</span>
                              <span className="font-black text-teal-800 font-mono text-xs">
                                {inspected.occupant?.sdrDeposit ? formatINR(inspected.occupant.sdrDeposit) : "N/A / As per Agreement"}
                              </span>
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })()}

                  <div className="mt-4 pt-3 border-t border-neutral-200 text-[11px] text-neutral-500 flex items-center justify-between">
                    <Link
                      href="/admin/client-master"
                      className="text-[#006064] font-bold hover:underline flex items-center gap-1"
                    >
                      <span>Open in Client Master</span>
                      <ChevronRight size={12} />
                    </Link>
                  </div>
                </div>

              </div>

            </div>
          </FadeUp>
        )}


        {/* ── 4. INVENTORY & OCCUPANCY LEDGER TABLE ── */}
        <FadeUp delay={0.15}>
          <div className="bg-white border border-neutral-200 shadow-xs overflow-hidden">
            
            {/* Table Header Controls */}
            <div className="px-5 py-4 border-b border-neutral-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-neutral-50/70">
              <div>
                <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                  <FileSpreadsheet size={16} className="text-[#006064]" />
                  Centre Workspaces &amp; Tenancy Allocation Ledger
                </h3>
                <p className="text-xs text-neutral-500">
                  Itemized mapping of all physical cabins, desks, and meeting rooms with current tenant occupancy.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative w-full sm:w-60">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search space, company, code..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-neutral-300 outline-none focus:border-[#006064]"
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
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-white border border-neutral-300 px-2 py-1.5 text-xs font-bold text-neutral-800 focus:outline-none focus:border-[#006064] cursor-pointer"
                >
                  <option value="ALL">All Categories</option>
                  <option value="CABIN">Cabins Only</option>
                  <option value="DESK">Desks Only</option>
                  <option value="MEETING">Meeting Rooms</option>
                  <option value="EVENT">Event Spaces</option>
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white border border-neutral-300 px-2 py-1.5 text-xs font-bold text-neutral-800 focus:outline-none focus:border-[#006064] cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="OCCUPIED">Occupied Only</option>
                  <option value="AVAILABLE">Available Only</option>
                  <option value="ON_NOTICE">On Notice</option>
                </select>
              </div>
            </div>

            {/* Table Body */}
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto scrollbar-thin">
              <table className="w-full text-left border-collapse table-fixed min-w-[850px]">
                <colgroup>
                  <col className="w-[100px]" />
                  <col className="w-[180px]" />
                  <col className="w-[150px]" />
                  <col className="w-[140px]" />
                  <col className="w-[90px]" />
                  <col className="w-auto" />
                  <col className="w-[130px]" />
                  <col className="w-[110px]" />
                </colgroup>
                <thead className="sticky top-0 bg-neutral-100 z-10 shadow-2xs">
                  <tr className="border-b border-neutral-200 text-[10.5px] font-black uppercase tracking-wider text-neutral-600">
                    <th className="py-3 px-4 text-left">Code</th>
                    <th className="py-3 px-4 text-left">Space Unit Name</th>
                    <th className="py-3 px-4 text-left">Centre</th>
                    <th className="py-3 px-4 text-left">Type / Category</th>
                    <th className="py-3 px-4 text-center">Capacity</th>
                    <th className="py-3 px-4 text-left">Occupying Tenant</th>
                    <th className="py-3 px-4 text-right">Agreement (₹)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-xs">
                  {filteredUnits.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-neutral-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Layers size={28} className="text-neutral-300" />
                          <p className="text-sm font-semibold text-neutral-600">No workspace records found</p>
                          <p className="text-xs text-neutral-400">Try adjusting your centre or status filters.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUnits.map((u) => (
                      <tr
                        key={u.id}
                        onClick={() => {
                          setSelectedUnit(u);
                          if (viewMode !== "CAD") setViewMode("CAD");
                        }}
                        className="hover:bg-teal-50/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-[11px] text-neutral-600 text-left">
                          {u.code}
                        </td>
                        <td className="py-3 px-4 font-bold text-neutral-900 text-left truncate">
                          {u.name}
                        </td>
                        <td className="py-3 px-4 font-semibold text-neutral-700 text-left truncate">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#006064] shrink-0" />
                            <span className="truncate">{u.centreName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-neutral-600 font-medium text-left truncate">
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-neutral-100 text-neutral-700 border border-neutral-200">
                            {u.typeName}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-black text-neutral-800 font-mono">
                          <div>{u.capacity} Seats</div>
                          {u.availableSeats > 0 && u.occupiedSeats > 0 && (
                            <span className="text-[9.5px] text-amber-700 font-bold block">
                              ({u.availableSeats} Available)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-left truncate">
                          {u.occupant ? (
                            <div className="flex flex-col truncate">
                              <span className="font-bold text-neutral-900 truncate">{u.occupant.companyName}</span>
                              <span className="text-[10px] text-neutral-400 font-mono">
                                {u.occupant.clientId}
                                {u.availableSeats > 0 && ` • Leased: ${u.occupiedSeats}/${u.capacity}s`}
                              </span>
                            </div>
                          ) : (
                            <span className="text-emerald-700 font-bold uppercase tracking-wider text-[10px]">
                              {u.category === "MEETING" || u.category === "EVENT" ? "Hourly / Day Bookable" : "🟢 Available For Move-In"}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-[#006064] font-mono text-xs whitespace-nowrap">
                          {u.occupant ? formatINR(u.occupant.monthlyAmount) : `${formatINR(u.basePrice)} base`}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {getStatusVisualBadge(u.status, u.availableSeats, u.capacity)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Summary */}
            <div className="px-5 py-3 bg-neutral-50 border-t border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-neutral-500">
                <Building2 size={14} className="text-[#006064]" />
                <span>
                  Showing: <strong className="text-neutral-900 font-bold">{filteredUnits.length} Spaces</strong>
                  {" • "}Scope: <strong className="text-neutral-900 font-bold">{activeMetrics?.name}</strong>
                </span>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-auto">
                <span className="text-neutral-600 font-bold">
                  Total Active Seating:
                </span>
                <span className="text-sm sm:text-base font-black text-teal-900 font-mono bg-teal-100/70 px-3 py-1 border border-teal-300">
                  {activeMetrics?.occupiedSeats} / {activeMetrics?.totalSeats} Seats Occupied ({activeMetrics?.overallOccupancyRate}%)
                </span>
              </div>
            </div>

          </div>
        </FadeUp>

        {/* ── 4. EXPANDED FULLSCREEN CAD BLUEPRINT STUDIO MODAL ── */}
        {mounted && typeof document !== "undefined" && isExpandedModalOpen && createPortal(
          <div className="fixed inset-0 z-[9999999] bg-[#0b1329] flex flex-col w-screen h-screen overflow-hidden">
            {/* Top Fullscreen Header Toolbar */}
            <div className="bg-neutral-950 border-b border-neutral-800 px-4 py-2.5 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0 shadow-2xl z-50">
              
              {/* Left: Studio Title & Current Scope */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded bg-teal-500/20 text-teal-300 flex items-center justify-center border border-teal-400/30 shrink-0">
                  <Compass size={18} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-2 truncate">
                    <span>CAD Blueprint Fullscreen Studio</span>
                    <span className="text-[9px] bg-teal-500/20 text-teal-300 px-2 py-0.5 border border-teal-400/30 uppercase font-bold shrink-0">
                      {overlayMode === "HOVER_ONLY" ? "Hover Reveal Active" : "All Overlays"}
                    </span>
                  </h2>
                  <span className="text-[11px] text-neutral-400 font-mono block truncate">
                    {currentCadLocationId === "1"
                      ? "Agarwal Complex (C.G. Road) • Agrawal.dwg"
                      : currentCadLocationId === "2"
                      ? "Mercado Flagship (Navrangpura) • Mercadol.dwg"
                      : "Premier House (SG Highway) • Premier House.dwg"}
                  </span>
                </div>
              </div>

              {/* Center: Prominent Centre Filter Dropdown + Quick Buttons */}
              <div className="flex items-center gap-2.5 bg-neutral-900 px-3 py-1.5 rounded-md border border-neutral-700 flex-wrap">
                <div className="flex items-center gap-2">
                  <Building2 size={15} className="text-teal-400 shrink-0" />
                  <span className="text-xs font-black uppercase tracking-wider text-teal-300 whitespace-nowrap">
                    Centre Filter:
                  </span>
                  <select
                    value={currentCadLocationId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedLocation(val);
                      setActiveCadCentre(val);
                      setHoveredUnit(null);
                    }}
                    className="bg-neutral-800 text-white text-xs font-bold px-3 py-1.5 rounded border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer min-w-[200px]"
                  >
                    <option value="1">🏢 Agarwal Complex (C.G. Road)</option>
                    <option value="2">🏢 Mercado Flagship (Navrangpura)</option>
                    <option value="3">🏢 Premier House (SG Highway)</option>
                  </select>
                </div>

                {/* Quick Switcher Buttons */}
                <div className="hidden sm:flex items-center gap-1 border-l border-neutral-700 pl-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLocation("1");
                      setActiveCadCentre("1");
                      setHoveredUnit(null);
                    }}
                    className={`px-2.5 py-1 text-[11px] font-bold uppercase transition-all cursor-pointer rounded-xs ${
                      currentCadLocationId === "1"
                        ? "bg-[#006064] text-white font-black shadow-md"
                        : "bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700"
                    }`}
                  >
                    Agarwal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLocation("2");
                      setActiveCadCentre("2");
                      setHoveredUnit(null);
                    }}
                    className={`px-2.5 py-1 text-[11px] font-bold uppercase transition-all cursor-pointer rounded-xs ${
                      currentCadLocationId === "2"
                        ? "bg-[#006064] text-white font-black shadow-md"
                        : "bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700"
                    }`}
                  >
                    Mercado
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLocation("3");
                      setActiveCadCentre("3");
                      setHoveredUnit(null);
                    }}
                    className={`px-2.5 py-1 text-[11px] font-bold uppercase transition-all cursor-pointer rounded-xs ${
                      currentCadLocationId === "3"
                        ? "bg-[#006064] text-white font-black shadow-md"
                        : "bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700"
                    }`}
                  >
                    Premier House
                  </button>
                </div>
              </div>

                {/* Right: Mode + Theme + Zoom + Close */}
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  
                  {/* Mode Toggle */}
                  <div className="bg-neutral-900 p-0.5 flex items-center border border-neutral-700 rounded-md">
                    <button
                      type="button"
                      onClick={() => setOverlayMode("HOVER_ONLY")}
                      className={`px-2 py-1 text-[10px] font-black uppercase transition-all cursor-pointer rounded-xs ${
                        overlayMode === "HOVER_ONLY" ? "bg-teal-600 text-white shadow-xs" : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      🎯 Hover Reveal
                    </button>
                    <button
                      type="button"
                      onClick={() => setOverlayMode("SHOW_ALL")}
                      className={`px-2 py-1 text-[10px] font-black uppercase transition-all cursor-pointer rounded-xs ${
                        overlayMode === "SHOW_ALL" ? "bg-teal-600 text-white shadow-xs" : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      👁️ Show All
                    </button>
                  </div>

                  {/* Theme Switcher */}
                  <div className="bg-neutral-900 p-0.5 flex items-center border border-neutral-700 rounded-md">
                    <button
                      type="button"
                      onClick={() => setCadTheme("WHITE")}
                      className={`px-2 py-1 text-[10px] font-bold uppercase cursor-pointer rounded-xs ${
                        cadTheme === "WHITE" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      White
                    </button>
                    <button
                      type="button"
                      onClick={() => setCadTheme("STUDIO")}
                      className={`px-2 py-1 text-[10px] font-bold uppercase cursor-pointer rounded-xs ${
                        cadTheme === "STUDIO" ? "bg-teal-700 text-white" : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      Studio
                    </button>
                    <button
                      type="button"
                      onClick={() => setCadTheme("BLUEPRINT")}
                      className={`px-2 py-1 text-[10px] font-bold uppercase cursor-pointer rounded-xs ${
                        cadTheme === "BLUEPRINT" ? "bg-cyan-800 text-cyan-200" : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      Blueprint
                    </button>
                  </div>

                  {/* Zoom Controls */}
                  <div className="bg-neutral-900 p-0.5 flex items-center border border-neutral-700 rounded-md gap-0.5">
                    <button
                      type="button"
                      onClick={() => setZoomScale(prev => Math.max(0.8, Number((prev - 0.2).toFixed(1))))}
                      className="px-2 py-1 text-xs font-black text-neutral-300 hover:text-white hover:bg-neutral-700 rounded-xs cursor-pointer"
                      title="Zoom Out"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomScale(1.0)}
                      className={`px-2 py-1 text-[10px] font-mono rounded-xs cursor-pointer ${
                        zoomScale === 1.0 ? "bg-teal-700 text-white font-bold" : "text-neutral-300 hover:text-white"
                      }`}
                    >
                      Fit (100%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomScale(1.4)}
                      className={`px-2 py-1 text-[10px] font-mono rounded-xs cursor-pointer ${
                        zoomScale === 1.4 ? "bg-teal-700 text-white font-bold" : "text-neutral-300 hover:text-white"
                      }`}
                    >
                      140%
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomScale(1.8)}
                      className={`px-2 py-1 text-[10px] font-mono rounded-xs cursor-pointer ${
                        zoomScale === 1.8 ? "bg-teal-700 text-white font-bold" : "text-neutral-300 hover:text-white"
                      }`}
                    >
                      180%
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomScale(prev => Math.min(2.5, Number((prev + 0.2).toFixed(1))))}
                      className="px-2 py-1 text-xs font-black text-neutral-300 hover:text-white hover:bg-neutral-700 rounded-xs cursor-pointer"
                      title="Zoom In"
                    >
                      +
                    </button>
                  </div>

                  {/* Close Fullscreen Button */}
                  <button
                    type="button"
                    onClick={() => setIsExpandedModalOpen(false)}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-md shadow-lg flex items-center gap-1.5 border border-rose-400 cursor-pointer transition-all hover:scale-105 active:scale-95 shrink-0"
                  >
                    <X size={15} />
                    <span>CLOSE (ESC)</span>
                  </button>

                </div>
              </div>

              {/* Modal Main Stage & Space Inspector */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden bg-neutral-900 min-h-0">
                
                {/* Floor Plan Canvas with No-Clipping Physical Zoom Scroll */}
                <div className={`lg:col-span-8 p-4 sm:p-6 overflow-auto relative flex min-h-0 ${
                  cadTheme === "WHITE"
                    ? "bg-neutral-200"
                    : cadTheme === "BLUEPRINT"
                    ? "bg-[#0b1d3a] bg-[radial-gradient(#1e3a8a_1px,transparent_1px)] [background-size:16px_16px]"
                    : "bg-neutral-900 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px]"
                }`}>
                  <div className="m-auto inline-block p-2 sm:p-4">
                    <div
                      style={{
                        width: zoomScale === 1.0 ? "100%" : `${Math.round(zoomScale * 1100)}px`,
                        maxWidth: zoomScale === 1.0 ? "1150px" : "none",
                        minWidth: zoomScale > 1.0 ? `${Math.round(zoomScale * 1100)}px` : "auto",
                        transition: "width 0.12s ease-out",
                      }}
                      className="relative block border-2 border-neutral-300 rounded p-2 shadow-2xl bg-white select-none"
                    >
                      {/* Architectural Drawing Backdrop */}
                      <img
                        src={
                          currentCadLocationId === "1"
                            ? "/cad-previews/agarwal_cad.png"
                            : currentCadLocationId === "2"
                            ? "/cad-previews/mercado_cad.png"
                            : "/cad-previews/premier_cad.png"
                        }
                        alt="AutoCAD Floor Plan"
                        className="w-full h-auto block select-none pointer-events-none"
                        style={{
                          filter:
                            cadTheme === "WHITE"
                              ? "none"
                              : cadTheme === "BLUEPRINT"
                              ? "invert(1) sepia(1) saturate(6) hue-rotate(170deg) brightness(1.2) contrast(1.4)"
                              : "invert(1) hue-rotate(180deg) brightness(1.25) contrast(1.35)",
                        }}
                      />

                      {/* Floor Plan Title Badge */}
                      <div className="absolute top-2 left-3 bg-teal-700/95 text-white px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-2xs z-20 shadow-md border border-teal-400/40 flex items-center gap-1.5 backdrop-blur-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                        <span>{currentCadLocationId === "1" ? "Agarwal Complex" : currentCadLocationId === "2" ? "Mercado Flagship" : "Premier House"}</span>
                      </div>

                      {/* Room Hotspots in Modal */}
                      <div 
                        className="absolute inset-0 w-full h-full pointer-events-auto"
                        onMouseLeave={() => setHoveredUnit(null)}
                      >
                        {cadDisplayUnits.map((unit) => {
                          const isHovered = hoveredUnit?.id === unit.id;
                          const isVisible = overlayMode === "SHOW_ALL" ? true : isHovered;

                          const isOccupied = unit.status === "OCCUPIED";
                          const isPartiallyAvailable = unit.status === "PARTIALLY_AVAILABLE";
                          const isMeeting = unit.status === "GUEST_BOOKABLE";
                          const isAvailableCabin = unit.status === "AVAILABLE" && unit.category === "CABIN";

                          return (
                            <div
                              key={`modal_${unit.id}`}
                              onMouseEnter={() => setHoveredUnit(unit)}
                              style={{
                                position: "absolute",
                                left: `${unit.grid.x}%`,
                                top: `${unit.grid.y}%`,
                                width: `${unit.grid.w}%`,
                                height: `${unit.grid.h}%`,
                              }}
                              className={`rounded-2xs transition-all duration-150 cursor-pointer ${
                                isVisible
                                  ? `border-2 z-30 shadow-lg ${
                                      isOccupied
                                        ? "bg-rose-500/35 border-rose-600 text-rose-950 shadow-rose-500/20"
                                        : isPartiallyAvailable
                                        ? "bg-amber-400/35 border-amber-500 text-amber-950 shadow-amber-500/20"
                                        : isAvailableCabin
                                        ? "bg-amber-400/35 border-amber-500 text-amber-950 shadow-amber-500/20"
                                        : isMeeting
                                        ? "bg-purple-500/35 border-purple-600 text-purple-950 shadow-purple-500/20"
                                        : "bg-emerald-500/35 border-emerald-600 text-emerald-950 shadow-emerald-500/20"
                                    } ring-2 ring-[#006064]/60 ring-offset-1 scale-[1.01]`
                                  : "bg-transparent border border-transparent hover:bg-black/5 z-10"
                              }`}
                            >
                              {/* Content visible only on hover / show all */}
                              {isVisible && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ duration: 0.1 }}
                                  className="h-full flex flex-col justify-between p-1 select-none pointer-events-none"
                                >
                                  {/* Top Tag: Room Code + Seat count */}
                                  <div className="flex items-center justify-between gap-1 leading-none w-full">
                                    <span className="text-[7.5px] sm:text-[8.5px] font-mono font-black uppercase tracking-tight text-neutral-900 bg-white/95 px-1 py-0.2 rounded-2xs shadow-md border border-neutral-300/70">
                                      {unit.code}
                                    </span>
                                    <span className={`text-[7px] sm:text-[7.5px] font-black px-1 py-0.2 rounded-2xs text-white shadow-md ${
                                      isOccupied
                                        ? "bg-rose-700"
                                        : isPartiallyAvailable
                                        ? "bg-amber-600"
                                        : isAvailableCabin
                                        ? "bg-amber-600"
                                        : isMeeting
                                        ? "bg-purple-700"
                                        : "bg-emerald-700"
                                    }`}>
                                      {isPartiallyAvailable ? `${unit.occupiedSeats}/${unit.capacity}s` : `${unit.capacity}s`}
                                    </span>
                                  </div>

                                  {/* Bottom Label: Company Name or Available status */}
                                  <div className="mt-auto pt-0.5 w-full">
                                    {unit.occupant ? (
                                      <div className="bg-neutral-900/95 text-white px-1 py-0.5 rounded-2xs truncate shadow-md border border-white/20">
                                        <p className="font-bold text-[7.5px] sm:text-[8px] truncate leading-tight text-white">
                                          {unit.occupant.companyName}
                                        </p>
                                        {isPartiallyAvailable && (
                                          <span className="text-[7px] text-amber-300 font-bold block truncate">
                                            ({unit.availableSeats} Free)
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <div className={`px-1 py-0.2 rounded-2xs text-center font-black text-[7px] sm:text-[7.5px] uppercase tracking-wider shadow-md ${
                                        isAvailableCabin
                                          ? "bg-amber-500 text-neutral-950"
                                          : isMeeting
                                          ? "bg-purple-700 text-white"
                                          : "bg-emerald-700 text-white"
                                      }`}>
                                        {isAvailableCabin ? "🟡 Available" : isMeeting ? "🟣 Meeting" : "🟢 Available"}
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  </div>
                </div>

                {/* Modal Space Inspection Panel (Right Side) */}
                <div className="lg:col-span-4 bg-white border-t lg:border-t-0 lg:border-l border-neutral-200 p-6 flex flex-col justify-between overflow-y-auto">
                  {(() => {
                    const inspected = hoveredUnit;
                    if (!inspected) {
                      return (
                        <div className="py-24 text-center text-neutral-400">
                          <Compass size={40} className="text-neutral-300 mx-auto mb-3 animate-pulse" />
                          <p className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                            Interactive Hover Inspection
                          </p>
                          <p className="text-[11px] text-neutral-500 max-w-xs mx-auto leading-relaxed">
                            Hover over any cabin or workspace in the floor plan to inspect tenant agreements, capacity, lock-in dates, and SDR security deposits.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div>
                        {/* Header */}
                        <div className="flex items-center justify-between pb-3.5 border-b border-neutral-200">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block mb-0.5 flex items-center gap-1">
                              <span>Space Inspection Panel</span>
                              {hoveredUnit && <span className="text-teal-600 font-bold">(Live Hover)</span>}
                            </span>
                            <span className="text-xs font-mono font-bold text-neutral-800">
                              {inspected.code} • {inspected.centreName}
                            </span>
                          </div>
                          
                          {inspected.status === "OCCUPIED" ? (
                            <span className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-300 rounded-2xs flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                              100% Leased
                            </span>
                          ) : inspected.status === "PARTIALLY_AVAILABLE" ? (
                            <span className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300 rounded-2xs flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                              Partially Leased ({inspected.availableSeats} Free)
                            </span>
                          ) : inspected.category === "CABIN" ? (
                            <span className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300 rounded-2xs flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              Available Cabin
                            </span>
                          ) : inspected.category === "MEETING" || inspected.category === "EVENT" ? (
                            <span className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider bg-purple-50 text-purple-800 border border-purple-300 rounded-2xs flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-purple-500" />
                              Meeting / Event
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-2xs flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              Available Desk
                            </span>
                          )}
                        </div>

                        <div className="mt-4 space-y-3.5">
                          
                          {/* 1. Company Name */}
                          <div className="bg-neutral-50 p-3.5 border border-neutral-200/80 rounded-xs">
                            <span className="text-[9.5px] font-black uppercase tracking-wider text-neutral-400 block mb-0.5">
                              Company Name
                            </span>
                            <h3 className="text-base font-black text-neutral-900 font-display leading-snug">
                              {inspected.occupant?.companyName || (
                                <span className="text-neutral-400 font-medium italic">
                                  Vacant Space (Ready for Allocation)
                                </span>
                              )}
                            </h3>
                            {inspected.occupant?.clientId && (
                              <span className="text-[10px] font-mono text-neutral-500 mt-1 block">
                                Client UID: <strong className="text-neutral-800">{inspected.occupant.clientId}</strong>
                              </span>
                            )}
                          </div>

                          {/* 2. Product Details */}
                          <div className="bg-neutral-50 p-3.5 border border-neutral-200/80 rounded-xs space-y-2 text-xs">
                            <span className="text-[9.5px] font-black uppercase tracking-wider text-neutral-400 block mb-0.5">
                              Product Details
                            </span>
                            <div className="flex items-center justify-between">
                              <span className="text-neutral-500">Space Name:</span>
                              <span className="font-black text-neutral-900">{inspected.name}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-neutral-500">Product Category:</span>
                              <span className="font-bold text-neutral-800">{inspected.typeName}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-neutral-500">Total Capacity:</span>
                              <span className="font-black text-neutral-900 font-mono">{inspected.capacity} Seats</span>
                            </div>
                            <div className="flex items-center justify-between bg-white p-2 border border-neutral-200/60 rounded-2xs">
                              <span className="text-neutral-600 font-bold">Occupancy Breakdown:</span>
                              <span className="font-mono font-black text-neutral-900">
                                {inspected.occupiedSeats} Occupied / {inspected.capacity} Total
                                {inspected.availableSeats > 0 && (
                                  <span className="text-amber-700 ml-1 font-bold">
                                    ({inspected.availableSeats} Available)
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>

                          {/* 3. Agreement Dates & Lock-in Date */}
                          <div className="bg-neutral-50 p-3.5 border border-neutral-200/80 rounded-xs space-y-2 text-xs">
                            <span className="text-[9.5px] font-black uppercase tracking-wider text-neutral-400 block mb-0.5">
                              Tenancy &amp; Agreement Terms
                            </span>

                            <div className="flex items-center justify-between">
                              <span className="text-neutral-500">Agreement Start Date:</span>
                              <span className="font-mono font-black text-neutral-900">
                                {inspected.occupant?.agreementStartDate || "N/A"}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-neutral-500">Agreement End Date:</span>
                              <span className="font-mono font-black text-neutral-900">
                                {inspected.occupant?.agreementEndDate || "N/A"}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-neutral-500">Lock-In Period / Date:</span>
                              <span className="font-black text-[#006064] font-mono">
                                {inspected.occupant?.lockInPeriod || "11 Months"}
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-neutral-200">
                              <span className="text-neutral-600 font-bold">SDR Security Deposit:</span>
                              <span className="font-black text-teal-800 font-mono text-xs">
                                {inspected.occupant?.sdrDeposit ? formatINR(inspected.occupant.sdrDeposit) : "N/A / As per Agreement"}
                              </span>
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })()}

                  <div className="mt-5 pt-3 border-t border-neutral-200 text-[11px] text-neutral-500 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setIsExpandedModalOpen(false)}
                      className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
                    >
                      <X size={14} className="text-rose-400" />
                      <span>Close Fullscreen CAD Studio (Esc)</span>
                    </button>
                    <Link
                      href="/admin/client-master"
                      className="text-[#006064] font-bold hover:underline flex items-center justify-between pt-1"
                    >
                      <span>Open in Client Master</span>
                      <ChevronRight size={12} />
                    </Link>
                  </div>
                </div>

              </div>
            </div>,
            document.body
          )}


      </div>
    </div>
  );
}
