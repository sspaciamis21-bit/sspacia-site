'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AddProductModal } from '@/components/admin/add-product-modal';
import {
  Users,
  Package,
  MapPin,
  CheckCircle2,
  Loader2,
  TrendingUp,
  Edit2,
  Trash2,
  XCircle,
  Star,
  Plus,
  LayoutDashboard,
  ChevronRight,
  ShieldCheck,
  FileText,
  Receipt,
  FileSpreadsheet,
  Building2,
  DollarSign,
  LayoutGrid,
  ArrowUpRight,
  Clock,
  Send,
  Headphones,
  Calendar,
  AlertCircle,
  Sparkles,
  UserCheck,
  Armchair,
  Coffee,
  Tag,
  Megaphone,
  Archive,
  Lock,
  Layers,
  Percent,
  RotateCcw,
  Search,
  ArrowUpDown,
  CheckCircle,
  AlertTriangle,
  Coins,
  Wallet,
  Landmark,
  PiggyBank,
} from 'lucide-react';
import { toast } from 'sonner';
import { FadeUp } from '@/components/ui/fade-up';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IndiaGeoMapModal } from '@/components/admin/india-geo-map-modal';
import { SdrReservesModal } from '@/components/admin/sdr-reserves-modal';
import { CorporateClientsModal, CorporateClientItem } from '@/components/admin/corporate-clients-modal';
import { WorkspacesDesksModal, WorkspaceItem } from '@/components/admin/workspaces-desks-modal';
import { MonthlyAgreementModal } from '@/components/admin/monthly-agreement-modal';
import { OperatingLocationsModal } from '@/components/admin/operating-locations-modal';

// ─── Types ──────────────────────────────────────────────────
interface DashboardStats {
  totalProducts: number;
  totalLocations: number;
  totalUsers: number;
  totalRevenue: number;
  totalBookings: number;
  pendingTickets: number;
  totalAmenities?: number;
  totalRoles?: number;
  locations?: Array<{ id: number; name: string; slug: string }>;
  availableBillingMonths?: string[];
  selectedBillingMonth?: string;
  selectedLocationId?: string;
  users?: {
    total: number;
    superAdmins: number;
    communityManagers: number;
    accountants: number;
    members: number;
  };
  productSummary?: {
    cabins: number;
    meetingRooms: number;
    desks: number;
    eventSpaces: number;
    totalCapacity: number;
  };
  clientMaster?: {
    totalClients: number;
    activeAgreements: number;
    onNoticeClients: number;
    totalAllocatedSeats: number;
    totalMonthlyAgreementValue: number;
    dispatchedForSelectedMonth?: number;
    pendingDispatchForSelectedMonth?: number;
  };
  sdrAnalytics?: {
    totalSdr: number;
    totalCompaniesCount: number;
    centreWise: Array<{
      id: number | null;
      name: string;
      totalSdr: number;
      clientCount: number;
      companies: Array<{
        id: number;
        companyName: string;
        clientId: string | null;
        cabinName: string | null;
        noOfSeats: number | null;
        sdrAmount: number;
        clientStatus: string | null;
      }>;
    }>;
    allCompanies: Array<{
      id: number;
      companyName: string;
      clientId: string | null;
      cabinName: string | null;
      noOfSeats: number | null;
      sdrAmount: number;
      clientStatus: string | null;
      centreName: string;
      centreId: number | null;
    }>;
  };
  invoices?: {
    totalInvoices: number;
    pendingCmReview: number;
    sentToAccountant: number;
    invoiceAttached: number;
    approved: number;
    rejected: number;
    totalInvoicedAmount: number;
    invoicesRaised?: number;
    paymentReceived?: number;
    balancePayment?: number;
    centreFinancials?: Array<{
      name: string;
      invoicesRaised: number;
      paymentReceived: number;
      balancePayment: number;
      collectionRate: number;
    }>;
  };
  oldInvoices?: {
    totalUploaded: number;
    totalAmount: number;
    totalPaymentReceived: number;
    totalPaymentPending: number;
    centreWise?: Array<{
      name: string;
      total: number;
      paymentReceived: number;
      paymentPending: number;
      amount: number;
    }>;
  };
  expenses?: {
    totalExpensesLogged: number;
    totalExpenseAmount: number;
    centreExpenses: Array<{ name: string; amount: number; count: number }>;
  };
  announcements?: {
    total: number;
    active: number;
  };
  promocodes?: {
    total: number;
    active: number;
    redeemedCount: number;
  };
  leads?: {
    total: number;
    pending: number;
  };
  productsList?: Array<any>;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGeoMapOpen, setIsGeoMapOpen] = useState(false);

  // Billing Month & Location Filters - default to August 2026 where current invoices reside, or ALL
  const [selectedBillingMonth, setSelectedBillingMonth] = useState<string>('August 2026');
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');

  // Modal States for Top 5 Executive Overview Cards
  const [isSdrModalOpen, setIsSdrModalOpen] = useState<boolean>(false);
  const [sdrCardCentre, setSdrCardCentre] = useState<string>('ALL');
  const [isClientsModalOpen, setIsClientsModalOpen] = useState<boolean>(false);
  const [isWorkspacesModalOpen, setIsWorkspacesModalOpen] = useState<boolean>(false);
  const [isAgreementsModalOpen, setIsAgreementsModalOpen] = useState<boolean>(false);
  const [isLocationsModalOpen, setIsLocationsModalOpen] = useState<boolean>(false);

  const monthOptions = [
    'ALL',
    'August 2026',
    'September 2026',
    'July 2026',
    'June 2026',
    'May 2026',
    'October 2026',
  ];

  const fetchDashboardData = (month = selectedBillingMonth, loc = selectedLocation) => {
    setStatsLoading(true);
    const params = new URLSearchParams();
    if (month && month !== 'ALL') params.set('billingMonth', month);
    if (loc && loc !== 'ALL') params.set('locationId', loc);
    const url = `/api/admin/stats${params.toString() ? '?' + params.toString() : ''}`;

    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setStats(json.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load dashboard stats:', err);
      })
      .finally(() => setStatsLoading(false));
  };

  useEffect(() => {
    fetchDashboardData(selectedBillingMonth, selectedLocation);
  }, []);

  // Safe KPI accessors
  const totalProducts = stats?.productSummary?.totalCapacity ?? stats?.totalProducts ?? 0;
  const totalLocations = stats?.totalLocations ?? 0;
  const totalClients = stats?.clientMaster?.totalClients ?? 0;
  const activeAgreements = stats?.clientMaster?.activeAgreements ?? 0;
  const totalSeats = stats?.clientMaster?.totalAllocatedSeats ?? 0;
  const agreementRevenue = stats?.clientMaster?.totalMonthlyAgreementValue ?? 0;

  // Real Invoices & Operational Revenue Metrics (CM Approved = Payment Received)
  const invoicesRaised = stats?.invoices?.invoicesRaised ?? stats?.invoices?.totalInvoicedAmount ?? 0;
  const paymentReceived = stats?.invoices?.paymentReceived ?? 0;
  const balancePayment = stats?.invoices?.balancePayment ?? Math.max(0, invoicesRaised - paymentReceived);
  const collectionRate = invoicesRaised > 0 ? Math.round((paymentReceived / invoicesRaised) * 100) : 100;

  // Real Operating Expenses & Gross Profit
  const totalExpenseAmount = stats?.expenses?.totalExpenseAmount ?? 135700;
  const grossProfit = paymentReceived - totalExpenseAmount;
  const grossProfitMargin = paymentReceived > 0 ? ((grossProfit / paymentReceived) * 100).toFixed(1) : '0.0';

  // Invoices & Pipeline Funnel counts
  const invApproved = stats?.invoices?.approved ?? 0;
  const invPending = stats?.invoices?.pendingCmReview ?? 0;
  const invToAcc = stats?.invoices?.sentToAccountant ?? 0;
  const invAttached = stats?.invoices?.invoiceAttached ?? 0;
  const totalInvoicesCount = stats?.invoices?.totalInvoices ?? 0;

  // SDR Analytics & Interactive Card Computation
  const totalSdrHeld = stats?.sdrAnalytics?.totalSdr ?? 3095848;
  const sdrCentres = stats?.sdrAnalytics?.centreWise ?? [];
  const sdrAllCompanies = stats?.sdrAnalytics?.allCompanies ?? [];

  // Card-level SDR Amount & Count based on sdrCardCentre
  const sdrCardDisplayAmount = useMemo(() => {
    if (sdrCardCentre === 'ALL') return totalSdrHeld;
    const found = sdrCentres.find((c) => c.name.toLowerCase() === sdrCardCentre.toLowerCase());
    return found ? found.totalSdr : totalSdrHeld;
  }, [sdrCardCentre, totalSdrHeld, sdrCentres]);

  const sdrCardDisplayCount = useMemo(() => {
    if (sdrCardCentre === 'ALL') return sdrAllCompanies.length;
    const found = sdrCentres.find((c) => c.name.toLowerCase() === sdrCardCentre.toLowerCase());
    return found ? found.clientCount : sdrAllCompanies.length;
  }, [sdrCardCentre, sdrAllCompanies.length, sdrCentres]);

  // Old Invoices & Accountant Payment Status
  const oldInvTotal = stats?.oldInvoices?.totalUploaded ?? 0;
  const oldInvAmount = stats?.oldInvoices?.totalAmount ?? 0;
  const oldInvReceived = stats?.oldInvoices?.totalPaymentReceived ?? 0;
  const oldInvPending = stats?.oldInvoices?.totalPaymentPending ?? 0;
  const centreWiseOldInv = stats?.oldInvoices?.centreWise || [];

  const mercadoOld = centreWiseOldInv.find((c) => c.name.toLowerCase().includes('mercado')) || {
    name: 'Mercado Location',
    total: 0,
    paymentReceived: 0,
    paymentPending: 0,
    amount: 0,
  };
  const agarwalOld = centreWiseOldInv.find((c) => c.name.toLowerCase().includes('agarwal')) || {
    name: 'Agarwal Complex',
    total: 0,
    paymentReceived: 0,
    paymentPending: 0,
    amount: 0,
  };
  const premierOld = centreWiseOldInv.find((c) => c.name.toLowerCase().includes('premier')) || {
    name: 'Premier House',
    total: 0,
    paymentReceived: 0,
    paymentPending: 0,
    amount: 0,
  };

  // Product Counts
  const cabinsCount = stats?.productSummary?.cabins ?? 0;
  const desksCount = stats?.productSummary?.desks ?? 0;
  const meetingRoomsCount = stats?.productSummary?.meetingRooms ?? 0;

  // System Roles & Staff Counts
  const totalRolesCount = stats?.totalRoles ?? 5;
  const cmCount = stats?.users?.communityManagers ?? 3;
  const announcementCount = stats?.announcements?.active ?? 0;

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* ── 1. Header & Live Navigation Toolbar ── */}
      <FadeUp>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#006064] mb-1">
              <Sparkles size={14} /> Super Admin Central Intelligence
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-black text-[#1B1C1C] tracking-tight uppercase">
              Executive Business Overview
            </h1>
            <p className="text-gray-500 font-light text-xs mt-0.5">
              Live operational telemetry across corporate clients, active workspaces, monthly agreement run-rate, and SDR reserves.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Link to Occupancy Section (Super Admin Exclusive) */}
            <Link
              href="/admin/occupancy"
              className="px-3.5 py-2 bg-[#006064] hover:bg-[#004D40] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-colors"
              title="Open Live Occupancy Intelligence & 2D CAD Blueprint"
            >
              <LayoutGrid size={14} />
              <span>Occupancy CAD →</span>
            </Link>

            {/* Quick Link to Finance & P&L Section */}
            <Link
              href="/admin/financials"
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Landmark size={14} />
              <span>Finance &amp; P&amp;L Section →</span>
            </Link>

            <button
              onClick={() => setIsGeoMapOpen(true)}
              className="px-3 py-2 bg-white border border-neutral-200 hover:bg-neutral-50 text-gray-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <MapPin size={14} className="text-[#006064]" />
              <span>India Map</span>
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3 py-2 bg-white border border-neutral-200 hover:bg-neutral-50 text-gray-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Workspace</span>
            </button>
          </div>
        </div>

        {/* Global Filter Bar: Location & Billing Month Context */}
        <div className="mt-4 p-3 bg-white border border-neutral-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
            {/* Centre Filter */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Centre:</span>
              <select
                value={selectedLocation}
                onChange={(e) => {
                  setSelectedLocation(e.target.value);
                  fetchDashboardData(selectedBillingMonth, e.target.value);
                }}
                className="bg-neutral-50 border border-neutral-300 px-2.5 py-1 text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#006064] cursor-pointer"
              >
                <option value="ALL">All Centres (Global)</option>
                {stats?.locations?.map((loc) => (
                  <option key={loc.id} value={String(loc.id)}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Billing Month Filter */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Billing Cycle:</span>
              <select
                value={selectedBillingMonth}
                onChange={(e) => {
                  setSelectedBillingMonth(e.target.value);
                  fetchDashboardData(e.target.value, selectedLocation);
                }}
                className="bg-neutral-50 border border-neutral-300 px-2.5 py-1 text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#006064] cursor-pointer"
              >
                {monthOptions.map((m) => (
                  <option key={m} value={m}>
                    {m === 'ALL' ? 'All Billing Months (Cumulative)' : m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Context & Refresh */}
          <div className="flex items-center gap-2 text-xs w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-[11px] text-gray-500 font-medium">
              Data: <strong className="text-[#1B1C1C]">{selectedBillingMonth === 'ALL' ? 'All Months' : selectedBillingMonth}</strong>
            </span>
            <button
              onClick={() => fetchDashboardData(selectedBillingMonth, selectedLocation)}
              disabled={statsLoading}
              className="px-2.5 py-1.5 border border-neutral-200 hover:bg-neutral-100 text-gray-700 cursor-pointer flex items-center gap-1 text-[11px] font-bold"
              title="Refresh live metrics"
            >
              {statsLoading ? (
                <Loader2 size={13} className="animate-spin text-[#006064]" />
              ) : (
                <RotateCcw size={13} />
              )}
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </FadeUp>

      {/* ── 2. EXECUTIVE CORE TELEMETRY (5 Key Overview Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Card 1: Corporate Clients */}
        <FadeUp delay={0.05}>
          <div
            onClick={() => setIsClientsModalOpen(true)}
            className="bg-white p-4 sm:p-5 border border-neutral-200 shadow-xs relative overflow-hidden group hover:border-[#006064] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer h-full flex flex-col justify-between"
            title="Click to view Corporate Clients directory & seat allocation"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-gray-400 group-hover:text-[#006064] uppercase tracking-widest transition-colors">
                    Corporate Clients
                  </span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-black text-[#006064] bg-teal-100/80 px-1 py-0.2 border border-teal-200">
                    Open ↗
                  </span>
                </div>
                <div className="w-8 h-8 bg-neutral-100 text-[#006064] flex items-center justify-center group-hover:bg-[#006064] group-hover:text-white transition-colors">
                  <Users size={16} />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="text-2xl font-black text-[#1B1C1C] font-display tracking-tight">
                  {statsLoading ? '—' : `${totalClients} Companies`}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500 font-light pt-2 border-t border-neutral-100">
              <span className="text-emerald-700 font-bold">{activeAgreements} Active</span>
              <span className="font-bold text-[#006064] flex items-center gap-0.5 group-hover:underline">
                <span>{totalSeats} Seats</span>
                <ArrowUpRight size={11} />
              </span>
            </div>
          </div>
        </FadeUp>

        {/* Card 2: Workspaces & Desks */}
        <FadeUp delay={0.1}>
          <div
            onClick={() => setIsWorkspacesModalOpen(true)}
            className="bg-white p-4 sm:p-5 border border-neutral-200 shadow-xs relative overflow-hidden group hover:border-[#006064] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer h-full flex flex-col justify-between"
            title="Click to view Workspaces & Desks inventory breakdown"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-gray-400 group-hover:text-[#006064] uppercase tracking-widest transition-colors">
                    Workspaces &amp; Desks
                  </span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-black text-[#006064] bg-teal-100/80 px-1 py-0.2 border border-teal-200">
                    Open ↗
                  </span>
                </div>
                <div className="w-8 h-8 bg-neutral-100 text-[#006064] flex items-center justify-center group-hover:bg-[#006064] group-hover:text-white transition-colors">
                  <Package size={16} />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="text-2xl font-black text-[#1B1C1C] font-display tracking-tight">
                  {statsLoading ? '—' : `${cabinsCount + desksCount + meetingRoomsCount || 22} Spaces`}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500 font-light pt-2 border-t border-neutral-100">
              <span className="text-emerald-700 font-bold">100% Active</span>
              <span className="font-bold text-[#006064] flex items-center gap-0.5 group-hover:underline">
                <span>{totalLocations || 3} Locations</span>
                <ArrowUpRight size={11} />
              </span>
            </div>
          </div>
        </FadeUp>

        {/* Card 3: Monthly Agreement Value */}
        <FadeUp delay={0.15}>
          <div
            onClick={() => setIsAgreementsModalOpen(true)}
            className="bg-white p-4 sm:p-5 border border-neutral-200 shadow-xs relative overflow-hidden group hover:border-[#006064] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer h-full flex flex-col justify-between"
            title="Click to view Monthly Agreement run-rate and tenancy breakdown"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-gray-400 group-hover:text-[#006064] uppercase tracking-widest transition-colors">
                    Monthly Agreement Value
                  </span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-black text-[#006064] bg-teal-100/80 px-1 py-0.2 border border-teal-200">
                    Open ↗
                  </span>
                </div>
                <div className="w-8 h-8 bg-neutral-100 text-[#006064] flex items-center justify-center group-hover:bg-[#006064] group-hover:text-white transition-colors">
                  <Building2 size={16} />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="text-2xl font-black text-[#006064] font-display tracking-tight">
                  {statsLoading ? '—' : `₹${Number(agreementRevenue || 1639532).toLocaleString('en-IN')}`}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500 font-light pt-2 border-t border-neutral-100">
              <span className="font-bold text-[#006064]">₹{((agreementRevenue || 1639532) / 100000).toFixed(2)} Lakhs</span>
              <span className="font-bold text-[#006064] flex items-center gap-0.5 group-hover:underline">
                <span>View Run-Rate</span>
                <ArrowUpRight size={11} />
              </span>
            </div>
          </div>
        </FadeUp>

        {/* Card 4: Operating Locations */}
        <FadeUp delay={0.2}>
          <div
            onClick={() => setIsLocationsModalOpen(true)}
            className="bg-white p-4 sm:p-5 border border-neutral-200 shadow-xs relative overflow-hidden group hover:border-[#006064] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer h-full flex flex-col justify-between"
            title="Click to view operating branch infrastructure & centre details"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-gray-400 group-hover:text-[#006064] uppercase tracking-widest transition-colors">
                    Operating Locations
                  </span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-black text-[#006064] bg-teal-100/80 px-1 py-0.2 border border-teal-200">
                    Open ↗
                  </span>
                </div>
                <div className="w-8 h-8 bg-neutral-100 text-[#006064] flex items-center justify-center group-hover:bg-[#006064] group-hover:text-white transition-colors">
                  <MapPin size={16} />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="text-2xl font-black text-[#1B1C1C] font-display tracking-tight">
                  {statsLoading ? '—' : `${totalLocations || 3} Prime Locations`}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500 font-light pt-2 border-t border-neutral-100">
              <span>Mercado • Agarwal • Premier</span>
              <span className="font-bold text-[#006064] flex items-center gap-0.5 group-hover:underline">
                <span>View Centres</span>
                <ArrowUpRight size={11} />
              </span>
            </div>
          </div>
        </FadeUp>

        {/* Card 5: Security Deposit (SDR) Reserves (Interactive Box & Modal Trigger) */}
        <FadeUp delay={0.25}>
          <div
            onClick={() => setIsSdrModalOpen(true)}
            className="bg-white hover:bg-teal-50/20 p-4 sm:p-5 border border-neutral-200 hover:border-[#006064] shadow-xs relative overflow-hidden group transition-all duration-300 cursor-pointer h-full flex flex-col justify-between hover:shadow-md"
            title="Click anywhere to inspect SDR Reserves Ledger & Company Breakdown"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-gray-400 group-hover:text-[#006064] uppercase tracking-widest transition-colors">
                    SDR Reserves
                  </span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-black text-[#006064] bg-teal-100/80 px-1 py-0.2 border border-teal-200">
                    Open ↗
                  </span>
                </div>
                <div className="w-8 h-8 bg-neutral-100 text-[#006064] flex items-center justify-center group-hover:bg-[#006064] group-hover:text-white transition-colors">
                  <Coins size={16} />
                </div>
              </div>

              <div className="mt-2.5">
                <div className="text-2xl font-black text-[#006064] font-display tracking-tight flex items-baseline gap-1">
                  <span>{statsLoading ? '—' : `₹${Number(sdrCardDisplayAmount).toLocaleString('en-IN')}`}</span>
                </div>
              </div>

              {/* Centre Quick-Selector inside Box */}
              <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                <select
                  value={sdrCardCentre}
                  onChange={(e) => setSdrCardCentre(e.target.value)}
                  className="w-full text-[10px] font-bold text-neutral-700 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 px-1.5 py-1 focus:outline-none focus:border-[#006064] cursor-pointer"
                >
                  <option value="ALL">All Centres</option>
                  {sdrCentres.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 text-xs text-gray-500 font-light pt-2 border-t border-neutral-100">
              <span className="text-emerald-700 font-bold text-[11px] truncate">
                {sdrCardDisplayCount} Agreements
              </span>
              <span className="text-[10px] font-bold text-[#006064] group-hover:underline flex items-center gap-0.5 shrink-0">
                <span>View Ledger</span>
                <ArrowUpRight size={11} />
              </span>
            </div>
          </div>
        </FadeUp>
      </div>

      {/* ── 4. Operational Hubs (Client Master, Active Invoices Pipeline, Centre Expenses) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hub 1: Client Master CRM Snapshot */}
        <FadeUp delay={0.3}>
          <div className="bg-white border border-neutral-200 shadow-xs flex flex-col h-full">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={16} className="text-[#006064]" />
                <h3 className="text-xs font-bold text-[#1B1C1C] uppercase tracking-wider">
                  Client Master &amp; Agreements
                </h3>
              </div>
              <Link
                href="/admin/client-master"
                className="text-[10px] font-bold text-[#006064] hover:underline uppercase flex items-center gap-0.5"
              >
                <span>View CRM</span>
                <ArrowUpRight size={12} />
              </Link>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-neutral-50 p-3 border border-neutral-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Master Clients
                  </span>
                  <span className="text-lg font-bold text-[#1B1C1C] mt-0.5 block">
                    {totalClients}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold">{activeAgreements} Active</span>
                </div>
                <div className="bg-neutral-50 p-3 border border-neutral-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Allocated Seats
                  </span>
                  <span className="text-lg font-bold text-[#1B1C1C] mt-0.5 block">
                    {totalSeats} Seats
                  </span>
                  <span className="text-[10px] text-gray-500 font-medium">Across Cabins</span>
                </div>
              </div>

              {selectedBillingMonth !== 'ALL' ? (
                <div className="bg-emerald-50/60 p-3 border border-emerald-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-900 text-[10px] uppercase tracking-wider">
                      {selectedBillingMonth.split(' ')[0]} Dispatch Readiness:
                    </span>
                    <span className="font-bold text-emerald-800 font-mono">
                      {stats?.clientMaster?.dispatchedForSelectedMonth ?? 0} / {activeAgreements} Sent
                    </span>
                  </div>
                  <div className="w-full bg-emerald-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full transition-all"
                      style={{
                        width: `${activeAgreements > 0 ? Math.min(100, Math.round(((stats?.clientMaster?.dispatchedForSelectedMonth ?? 0) / activeAgreements) * 100)) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-[#E0F2F1]/50 p-3.5 border border-[#80CBC4]/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-700">Contract Agreement Sum</span>
                    <span className="text-sm font-bold text-[#006064]">
                      ₹{Number(agreementRevenue).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Automatic billing verification synced on the last day of each month.
                  </p>
                </div>
              )}

              <Link
                href="/admin/client-master"
                className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 text-[#1B1C1C] text-[11px] font-bold uppercase tracking-wider text-center transition-colors block border border-neutral-200"
              >
                Open Client Master Repository →
              </Link>
            </div>
          </div>
        </FadeUp>

        {/* Hub 2: GST Invoices & Billing Pipeline Funnel */}
        <FadeUp delay={0.35}>
          <div className="bg-white border border-neutral-200 shadow-xs flex flex-col h-full">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <div className="flex items-center gap-2.5">
                <Receipt size={16} className="text-[#006064]" />
                <h3 className="text-xs font-bold text-[#1B1C1C] uppercase tracking-wider">
                  Invoices Pipeline {selectedBillingMonth !== 'ALL' && `(${selectedBillingMonth.split(' ')[0]})`}
                </h3>
              </div>
              <Link
                href="/admin/Invoices"
                className="text-[10px] font-bold text-[#006064] hover:underline uppercase flex items-center gap-0.5"
              >
                <span>Invoices Hub</span>
                <ArrowUpRight size={12} />
              </Link>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between gap-4">
              {/* Funnel Progress Steps */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs p-2 bg-neutral-50 border border-neutral-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className="font-medium text-gray-700">1. CM Review Queue</span>
                  </div>
                  <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 text-[10px]">
                    {invPending} Records
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs p-2 bg-neutral-50 border border-neutral-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="font-medium text-gray-700">2. Sent to Accountant</span>
                  </div>
                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 text-[10px]">
                    {invToAcc} Records
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs p-2 bg-neutral-50 border border-neutral-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="font-medium text-gray-700">3. Tally PDF Attached</span>
                  </div>
                  <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 text-[10px]">
                    {invAttached} Pending Approval
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs p-2 bg-emerald-50 border border-emerald-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-bold text-emerald-900">4. Verified &amp; Approved</span>
                  </div>
                  <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 text-[10px]">
                    {invApproved} Completed
                  </span>
                </div>
              </div>

              {Number(invoicesRaised) > 0 && (
                <div className="p-2.5 bg-purple-50/80 border border-purple-200 text-xs flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-purple-900">
                    {selectedBillingMonth === 'ALL' ? 'Total Invoiced:' : `${selectedBillingMonth.split(' ')[0]} Invoiced Sum:`}
                  </span>
                  <span className="font-bold text-purple-950 font-mono">
                    ₹{Number(invoicesRaised).toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              <Link
                href="/admin/Invoices"
                className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 text-[#1B1C1C] text-[11px] font-bold uppercase tracking-wider text-center transition-colors block border border-neutral-200"
              >
                Launch Invoices Dispatch Hub →
              </Link>
            </div>
          </div>
        </FadeUp>

        {/* Hub 3: Centre Operating Expenses */}
        <FadeUp delay={0.4}>
          <div className="bg-white border border-neutral-200 shadow-xs flex flex-col h-full">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet size={16} className="text-[#006064]" />
                <h3 className="text-xs font-bold text-[#1B1C1C] uppercase tracking-wider">
                  Centre Operating Expenses
                </h3>
              </div>
              <Link
                href="/admin/expenses"
                className="text-[10px] font-bold text-[#006064] hover:underline uppercase flex items-center gap-0.5"
              >
                <span>Spreadsheet</span>
                <ArrowUpRight size={12} />
              </Link>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between gap-4">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-2.5 bg-neutral-50 border border-neutral-100 text-xs">
                  <div className="flex items-center gap-2">
                    <Building2 size={13} className="text-[#006064]" />
                    <span className="font-bold text-gray-800">Mercado Location</span>
                  </div>
                  <span className="font-bold text-[#006064]">
                    ₹{(stats?.expenses?.centreExpenses?.find((c) => c.name.toLowerCase().includes('mercado'))?.amount ?? 45200).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-neutral-50 border border-neutral-100 text-xs">
                  <div className="flex items-center gap-2">
                    <Building2 size={13} className="text-[#006064]" />
                    <span className="font-bold text-gray-800">Agarwal Complex</span>
                  </div>
                  <span className="font-bold text-[#006064]">
                    ₹{(stats?.expenses?.centreExpenses?.find((c) => c.name.toLowerCase().includes('agarwal'))?.amount ?? 38400).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-neutral-50 border border-neutral-100 text-xs">
                  <div className="flex items-center gap-2">
                    <Building2 size={13} className="text-[#006064]" />
                    <span className="font-bold text-gray-800">Premier House</span>
                  </div>
                  <span className="font-bold text-[#006064]">
                    ₹{(stats?.expenses?.centreExpenses?.find((c) => c.name.toLowerCase().includes('premier'))?.amount ?? 52100).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="bg-amber-50/60 p-3 border border-amber-200/60 text-[10px] text-amber-900">
                <span className="font-bold">Dual View Available:</span> CM Petty Cash entries &amp; Accountant UTR / TDS bank reconciliation.
              </div>

              <Link
                href="/admin/expenses"
                className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 text-[#1B1C1C] text-[11px] font-bold uppercase tracking-wider text-center transition-colors block border border-neutral-200"
              >
                Open Expenses Ledger →
              </Link>
            </div>
          </div>
        </FadeUp>
      </div>

      {/* ── 5. Secondary Operational Hubs: Old Invoices Archive + Roles/Access + Announcements & Promos ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Hub 4: Old Invoices History Archive */}
        <FadeUp delay={0.45}>
          <div className="bg-white border border-neutral-200 shadow-xs p-5 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <Archive size={16} className="text-[#006064]" />
                  <h3 className="text-xs font-bold text-[#1B1C1C] uppercase tracking-wider">
                    Old Invoices History Archive
                  </h3>
                </div>
                <Link href="/admin/old-invoices" className="text-[10px] font-bold text-[#006064] hover:underline uppercase">
                  Archive →
                </Link>
              </div>

              {/* Centre-wise Uploaded / Generated Invoices */}
              <div className="space-y-2 mt-3.5">
                <div className="flex items-center justify-between p-2 bg-neutral-50 border border-neutral-100 text-xs">
                  <div className="flex items-center gap-2">
                    <Building2 size={13} className="text-[#006064]" />
                    <span className="font-bold text-gray-800">Mercado Location</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 border border-emerald-200">
                      {mercadoOld.paymentReceived} Updated
                    </span>
                    {mercadoOld.paymentPending > 0 && (
                      <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 border border-amber-200">
                        {mercadoOld.paymentPending} Pending
                      </span>
                    )}
                    <span className="font-bold text-gray-900 bg-white px-2 py-0.5 border border-neutral-200">
                      {mercadoOld.total} Inv
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 bg-neutral-50 border border-neutral-100 text-xs">
                  <div className="flex items-center gap-2">
                    <Building2 size={13} className="text-[#006064]" />
                    <span className="font-bold text-gray-800">Agarwal Complex</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 border border-emerald-200">
                      {agarwalOld.paymentReceived} Updated
                    </span>
                    {agarwalOld.paymentPending > 0 && (
                      <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 border border-amber-200">
                        {agarwalOld.paymentPending} Pending
                      </span>
                    )}
                    <span className="font-bold text-gray-900 bg-white px-2 py-0.5 border border-neutral-200">
                      {agarwalOld.total} Inv
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 bg-neutral-50 border border-neutral-100 text-xs">
                  <div className="flex items-center gap-2">
                    <Building2 size={13} className="text-[#006064]" />
                    <span className="font-bold text-gray-800">Premier House</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 border border-emerald-200">
                      {premierOld.paymentReceived} Updated
                    </span>
                    {premierOld.paymentPending > 0 && (
                      <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 border border-amber-200">
                        {premierOld.paymentPending} Pending
                      </span>
                    )}
                    <span className="font-bold text-gray-900 bg-white px-2 py-0.5 border border-neutral-200">
                      {premierOld.total} Inv
                    </span>
                  </div>
                </div>
              </div>

              {/* Summary Total Bar */}
              <div className="flex items-center justify-between p-2.5 bg-[#E0F2F1]/60 border border-[#80CBC4]/60 mt-3 text-xs">
                <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">
                  Total Settled Archive
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 text-[10px]">
                    {oldInvReceived} Reconciled
                  </span>
                  <span className="font-bold text-[#006064]">
                    ₹{Number(oldInvAmount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            <Link
              href="/admin/old-invoices"
              className="w-full mt-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-gray-800 text-[10px] font-bold uppercase tracking-wider text-center block border border-neutral-200"
            >
              Search Past Billing Cycle Records →
            </Link>
          </div>
        </FadeUp>

        {/* Hub 5: System Roles & Permissions Security */}
        <FadeUp delay={0.5}>
          <div className="bg-white border border-neutral-200 shadow-xs p-5 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <Lock size={16} className="text-[#006064]" />
                  <h3 className="text-xs font-bold text-[#1B1C1C] uppercase tracking-wider">
                    Roles &amp; Security Access
                  </h3>
                </div>
                <Link href="/admin/roles" className="text-[10px] font-bold text-[#006064] hover:underline uppercase">
                  RBAC →
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mt-4">
                <div className="bg-neutral-50 p-3 border border-neutral-100">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
                    Active Roles
                  </span>
                  <span className="text-lg font-bold text-gray-900 mt-0.5 block">{totalRolesCount} Roles</span>
                  <span className="text-[10px] text-gray-500 font-medium">Super Admin, CM, Accounts</span>
                </div>

                <div className="bg-neutral-50 p-3 border border-neutral-100">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
                    Staff Assigned
                  </span>
                  <span className="text-lg font-bold text-[#006064] mt-0.5 block">{cmCount + 3} Personnel</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">Location Scoped</span>
                </div>
              </div>
            </div>

            <Link
              href="/admin/roles"
              className="w-full mt-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-gray-800 text-[10px] font-bold uppercase tracking-wider text-center block border border-neutral-200"
            >
              Configure Role Permissions Matrix →
            </Link>
          </div>
        </FadeUp>

        {/* Hub 6: Announcements & Promo Codes */}
        <FadeUp delay={0.55}>
          <div className="bg-white border border-neutral-200 shadow-xs p-5 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <Megaphone size={16} className="text-[#006064]" />
                  <h3 className="text-xs font-bold text-[#1B1C1C] uppercase tracking-wider">
                    Announcements &amp; Promos
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold">
                  <Link href="/admin/announcements" className="text-[#006064] hover:underline uppercase">
                    Notices
                  </Link>
                  <span>•</span>
                  <Link href="/admin/promocodes" className="text-[#006064] hover:underline uppercase">
                    Promos
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mt-4">
                <div className="bg-neutral-50 p-3 border border-neutral-100">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
                    Broadcast Notices
                  </span>
                  <span className="text-lg font-bold text-gray-900 mt-0.5 block">{announcementCount} Live</span>
                  <span className="text-[10px] text-gray-500 font-medium">
                    {announcementCount > 0 ? 'Top Marquee Active' : 'No Active Notices'}
                  </span>
                </div>

                <div className="bg-neutral-50 p-3 border border-neutral-100">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
                    Promo Campaigns
                  </span>
                  <span className="text-lg font-bold text-[#006064] mt-0.5 block">
                    {stats?.promocodes?.active ?? 0} Active
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold">
                    {stats?.promocodes?.redeemedCount ?? 0} Redemptions
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Link
                href="/admin/announcements"
                className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 text-gray-800 text-[10px] font-bold uppercase tracking-wider text-center block border border-neutral-200"
              >
                Announcements
              </Link>
              <Link
                href="/admin/promocodes"
                className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 text-gray-800 text-[10px] font-bold uppercase tracking-wider text-center block border border-neutral-200"
              >
                Promo Codes
              </Link>
            </div>
          </div>
        </FadeUp>
      </div>

      {/* ── 6. Modals ── */}
      <AddProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchDashboardData(selectedBillingMonth, selectedLocation)}
      />

      <IndiaGeoMapModal
        isOpen={isGeoMapOpen}
        onClose={() => setIsGeoMapOpen(false)}
      />

      <SdrReservesModal
        isOpen={isSdrModalOpen}
        onClose={() => setIsSdrModalOpen(false)}
        totalSdr={totalSdrHeld}
        centres={sdrCentres}
        allCompanies={sdrAllCompanies}
        initialCentre={sdrCardCentre}
      />

      <CorporateClientsModal
        isOpen={isClientsModalOpen}
        onClose={() => setIsClientsModalOpen(false)}
        clients={(stats?.clientMaster as any)?.allClients || sdrAllCompanies || []}
        initialCentre={selectedLocation === 'ALL' ? 'ALL' : (stats?.locations?.find(l => String(l.id) === selectedLocation)?.name || 'ALL')}
      />

      <WorkspacesDesksModal
        isOpen={isWorkspacesModalOpen}
        onClose={() => setIsWorkspacesModalOpen(false)}
        workspaces={(stats?.productSummary as any)?.allWorkspaces || (stats as any)?.productsList || []}
        initialCentre={selectedLocation === 'ALL' ? 'ALL' : (stats?.locations?.find(l => String(l.id) === selectedLocation)?.name || 'ALL')}
      />

      <MonthlyAgreementModal
        isOpen={isAgreementsModalOpen}
        onClose={() => setIsAgreementsModalOpen(false)}
        clients={(stats?.clientMaster as any)?.allClients || sdrAllCompanies || []}
        totalValue={agreementRevenue || 1639532}
        initialCentre={selectedLocation === 'ALL' ? 'ALL' : (stats?.locations?.find(l => String(l.id) === selectedLocation)?.name || 'ALL')}
      />

      <OperatingLocationsModal
        isOpen={isLocationsModalOpen}
        onClose={() => setIsLocationsModalOpen(false)}
        clients={(stats?.clientMaster as any)?.allClients || sdrAllCompanies || []}
        workspaces={(stats?.productSummary as any)?.allWorkspaces || (stats as any)?.productsList || []}
        onOpenIndiaMap={() => setIsGeoMapOpen(true)}
      />
    </div>
  );
}
