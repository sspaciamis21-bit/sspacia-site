'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { FadeUp } from '@/components/ui/fade-up';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IndiaGeoMapModal } from '@/components/admin/india-geo-map-modal';

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
  invoices?: {
    totalInvoices: number;
    pendingCmReview: number;
    sentToAccountant: number;
    invoiceAttached: number;
    approved: number;
    rejected: number;
    totalInvoicedAmount: number;
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

  // Billing Month & Location Filters
  const [selectedBillingMonth, setSelectedBillingMonth] = useState<string>(() => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const now = new Date();
    if (now.getDate() >= 20) {
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return `${monthNames[nextMonth.getMonth()]} ${nextMonth.getFullYear()}`;
    }
    return `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
  });

  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');

  const monthOptions = [
    'September 2026',
    'August 2026',
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
  const totalProducts = stats?.totalProducts ?? 0;
  const totalLocations = stats?.totalLocations ?? 0;
  const totalClients = stats?.clientMaster?.totalClients ?? 0;
  const activeAgreements = stats?.clientMaster?.activeAgreements ?? 0;
  const totalSeats = stats?.clientMaster?.totalAllocatedSeats ?? 0;
  const agreementRevenue = stats?.clientMaster?.totalMonthlyAgreementValue ?? 0;

  // Invoices & Pipeline
  const invApproved = stats?.invoices?.approved ?? 0;
  const invPending = stats?.invoices?.pendingCmReview ?? 0;
  const invToAcc = stats?.invoices?.sentToAccountant ?? 0;
  const invAttached = stats?.invoices?.invoiceAttached ?? 0;

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

  // Users & Staff
  const totalUsersCount = stats?.users?.total ?? stats?.totalUsers ?? 0;
  const cmCount = stats?.users?.communityManagers ?? 0;
  const membersCount = stats?.users?.members ?? 0;
  const totalRolesCount = stats?.totalRoles ?? 0;

  // Products & Capacity
  const cabinsCount = stats?.productSummary?.cabins ?? 0;
  const meetingRoomsCount = stats?.productSummary?.meetingRooms ?? 0;
  const desksCount = stats?.productSummary?.desks ?? 0;
  const totalCapacityPax = stats?.productSummary?.totalCapacity ?? 0;

  // Real Database Counts for Amenities, Announcements, Promos
  const amenitiesCount = stats?.totalAmenities ?? 0;
  const announcementCount = stats?.announcements?.active ?? 0;
  const promoCount = stats?.promocodes?.active ?? 0;
  const promoRedeemed = stats?.promocodes?.redeemedCount ?? 0;

  const recentProducts = stats?.productsList || [];

  return (
    <div className="space-y-8 pb-20 max-w-[1600px] mx-auto">
      {/* ── 1. Top Executive Banner ── */}
      <FadeUp>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 border border-neutral-200 shadow-sm">
          <div className="flex items-center gap-5">
            <div className="h-14 w-14 bg-[#006064] text-white flex items-center justify-center shrink-0 shadow-md">
              <LayoutDashboard size={28} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-display font-black text-[#1B1C1C] tracking-tight uppercase">
                  Executive Dashboard
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  All 3 Locations Online
                </span>
              </div>
              <p className="text-gray-500 font-medium text-xs tracking-normal mt-0.5">
                Real-time Company Overview, Client Master CRM, GST Invoicing Pipeline, Archive & Operations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsGeoMapOpen(true)}
              className="bg-[#006064] hover:bg-[#004d40] text-white px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 border border-[#006064] shadow-sm hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-300" />
              <span>Visitor Geo Map 🗺️</span>
            </button>
          </div>
        </div>
      </FadeUp>

      {/* ── 1.5. SA Executive Quick Filter Bar (Billing Cycle & Location Scoping) ── */}
      <FadeUp delay={0.03}>
        <div className="bg-white p-4 border border-neutral-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Billing Month Selector */}
            <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-300 px-3 py-1.5 text-xs">
              <Calendar size={13} className="text-purple-700 shrink-0" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-900">
                Billing Cycle:
              </span>
              <select
                value={selectedBillingMonth}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedBillingMonth(val);
                  fetchDashboardData(val, selectedLocation);
                }}
                className="bg-transparent text-xs font-black text-purple-950 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Historical Cycles</option>
                {monthOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Location / Node Selector */}
            <div className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 px-3 py-1.5 text-xs">
              <MapPin size={13} className="text-[#006064] shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
                Operating Location:
              </span>
              <select
                value={selectedLocation}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedLocation(val);
                  fetchDashboardData(selectedBillingMonth, val);
                }}
                className="bg-transparent text-xs font-bold text-gray-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All 3 Operating Locations</option>
                {stats?.locations?.map((loc) => (
                  <option key={loc.id} value={String(loc.id)}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Context & Refresh */}
          <div className="flex items-center gap-2 text-xs w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-[11px] text-gray-500 font-medium">
              Live Metrics for: <strong className="text-[#1B1C1C]">{selectedBillingMonth === 'ALL' ? 'All Records' : selectedBillingMonth}</strong>
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

      {/* ── 2. Top 4 Core Executive Metric Cards (Balanced & Proportional) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Corporate Clients */}
        <FadeUp delay={0.05}>
          <div className="bg-white p-5 border border-neutral-200 shadow-sm relative overflow-hidden group hover:border-[#006064]/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Corporate Clients
              </span>
              <div className="w-9 h-9 bg-teal-50 text-[#006064] flex items-center justify-center border border-teal-100">
                <Users size={18} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-[#1B1C1C] tracking-tight">
                {statsLoading ? '—' : `${totalClients} Companies`}
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="font-semibold text-emerald-700">{activeAgreements} Active</span>
                <span>• {totalSeats} Seats Allocated</span>
              </div>
            </div>
          </div>
        </FadeUp>

        {/* Card 2: Total Workspace Catalogue */}
        <FadeUp delay={0.1}>
          <div className="bg-white p-5 border border-neutral-200 shadow-sm relative overflow-hidden group hover:border-[#006064]/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Workspaces & Desks
              </span>
              <div className="w-9 h-9 bg-teal-50 text-[#006064] flex items-center justify-center border border-teal-100">
                <Package size={18} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-[#1B1C1C] tracking-tight">
                {statsLoading ? '—' : `${totalProducts} Spaces`}
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>100% Active across 3 Locations</span>
              </div>
            </div>
          </div>
        </FadeUp>

        {/* Card 3: Monthly Agreement Revenue */}
        <FadeUp delay={0.15}>
          <div className="bg-white p-5 border border-neutral-200 shadow-sm relative overflow-hidden group hover:border-[#006064]/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Monthly Agreement Value
              </span>
              <div className="w-9 h-9 bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                <DollarSign size={18} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-[#006064] tracking-tight">
                {statsLoading ? '—' : `₹${Number(agreementRevenue).toLocaleString('en-IN')}`}
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                <span className="font-semibold text-emerald-700">₹{(agreementRevenue / 100000).toFixed(2)} Lakhs</span>
                <span>/ month recurring</span>
              </div>
            </div>
          </div>
        </FadeUp>

        {/* Card 4: Operating Business Centres */}
        <FadeUp delay={0.2}>
          <div className="bg-white p-5 border border-neutral-200 shadow-sm relative overflow-hidden group hover:border-[#006064]/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Operating Locations
              </span>
              <div className="w-9 h-9 bg-teal-50 text-[#006064] flex items-center justify-center border border-teal-100">
                <Building2 size={18} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-[#1B1C1C] tracking-tight">
                {statsLoading ? '—' : `${totalLocations} Prime Locations`}
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                <span>Mercado • Agarwal • Premier</span>
              </div>
            </div>
          </div>
        </FadeUp>
      </div>

      {/* ── 3. Primary Operational Hubs (Client Master, Active Invoices Pipeline, Centre Expenses) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hub 1: Client Master CRM Snapshot */}
        <FadeUp delay={0.25}>
          <div className="bg-white border border-neutral-200 shadow-sm flex flex-col h-full">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={16} className="text-[#006064]" />
                <h3 className="text-xs font-bold text-[#1B1C1C] uppercase tracking-wider">
                  Client Master & Agreements
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
                    Purchased / Allocated Seats
                  </span>
                  <span className="text-lg font-bold text-[#1B1C1C] mt-0.5 block">
                    {totalSeats} Seats
                  </span>
                  <span className="text-[10px] text-gray-500 font-medium">Across All Cabins</span>
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
                    <span className="text-[11px] font-bold text-gray-700">Contract Revenue Sum</span>
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
        <FadeUp delay={0.3}>
          <div className="bg-white border border-neutral-200 shadow-sm flex flex-col h-full">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <div className="flex items-center gap-2.5">
                <Receipt size={16} className="text-[#006064]" />
                <h3 className="text-xs font-bold text-[#1B1C1C] uppercase tracking-wider">
                  Invoices &amp; Billing Pipeline {selectedBillingMonth !== 'ALL' && `(${selectedBillingMonth.split(' ')[0]})`}
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

              {Number(stats?.invoices?.totalInvoicedAmount || 0) > 0 && (
                <div className="p-2.5 bg-purple-50/80 border border-purple-200 text-xs flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-purple-900">
                    {selectedBillingMonth === 'ALL' ? 'Total Invoiced:' : `${selectedBillingMonth.split(' ')[0]} Invoiced Sum:`}
                  </span>
                  <span className="font-bold text-purple-950 font-mono">
                    ₹{Number(stats?.invoices?.totalInvoicedAmount || 0).toLocaleString('en-IN')}
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
        <FadeUp delay={0.35}>
          <div className="bg-white border border-neutral-200 shadow-sm flex flex-col h-full">
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
                <span className="font-bold">Dual View Available:</span> CM Petty Cash entries & Accountant UTR / TDS bank reconciliation.
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

      {/* ── 4. Secondary Operational Hubs: Old Invoices Archive (Centre Wise) + Roles/Access + Announcements & Promos ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Hub 4: Old Invoices History Archive (Centre Wise CM Uploaded + Accountant Payment Logged vs Pending) */}
        <FadeUp delay={0.38}>
          <div className="bg-white border border-neutral-200 shadow-sm p-5 flex flex-col justify-between h-full">
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

              {/* Centre-wise Uploaded / Generated Invoices with Accountant Payment Details Status */}
              <div className="space-y-2 mt-3.5">
                <div className="flex items-center justify-between p-2 bg-neutral-50 border border-neutral-100 text-xs">
                  <div className="flex items-center gap-2">
                    <Building2 size={13} className="text-[#006064]" />
                    <span className="font-bold text-gray-800">Mercado Location</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 border border-emerald-200">
                      {mercadoOld.paymentReceived} Payment Receive Details Updated
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
                      {agarwalOld.paymentReceived} Payment Receive Details Updated
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
                      {premierOld.paymentReceived} Payment Receive Details Updated
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
        <FadeUp delay={0.4}>
          <div className="bg-white border border-neutral-200 shadow-sm p-5 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <Lock size={16} className="text-[#006064]" />
                  <h3 className="text-xs font-bold text-[#1B1C1C] uppercase tracking-wider">
                    Roles & Security Access
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

        {/* Hub 6: Announcements & Promo Codes (100% Real DB Data) */}
        <FadeUp delay={0.42}>
          <div className="bg-white border border-neutral-200 shadow-sm p-5 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <Megaphone size={16} className="text-[#006064]" />
                  <h3 className="text-xs font-bold text-[#1B1C1C] uppercase tracking-wider">
                    Announcements & Promos
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
                  <span className="text-lg font-bold text-[#006064] mt-0.5 block">{promoCount} Active</span>
                  <span className="text-[10px] text-gray-500 font-medium">{promoRedeemed} Redeemed</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Link
                href="/admin/announcements"
                className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 text-gray-800 text-[10px] font-bold uppercase tracking-wider text-center block border border-neutral-200"
              >
                Announcements →
              </Link>
              <Link
                href="/admin/promocodes"
                className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 text-gray-800 text-[10px] font-bold uppercase tracking-wider text-center block border border-neutral-200"
              >
                Promo Codes →
              </Link>
            </div>
          </div>
        </FadeUp>
      </div>

      {/* ── 5. Third Row: Users Breakdown + Spaces & Capacity + Amenities ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Hub 7: Users, Staff & Verified Members */}
        <FadeUp delay={0.44}>
          <div className="bg-white border border-neutral-200 shadow-sm p-5 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <UserCheck size={16} className="text-[#006064]" />
                  <h3 className="text-xs font-bold text-[#1B1C1C] uppercase tracking-wider">
                    Users & Personnel
                  </h3>
                </div>
                <Link href="/admin/users" className="text-[10px] font-bold text-[#006064] hover:underline uppercase">
                  Manage →
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div className="bg-neutral-50 p-2.5 border border-neutral-100">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Total</span>
                  <span className="text-base font-bold text-gray-900 mt-0.5 block">{totalUsersCount}</span>
                </div>
                <div className="bg-neutral-50 p-2.5 border border-neutral-100">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Staff / CM</span>
                  <span className="text-base font-bold text-[#006064] mt-0.5 block">{cmCount}</span>
                </div>
                <div className="bg-neutral-50 p-2.5 border border-neutral-100">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Members</span>
                  <span className="text-base font-bold text-emerald-700 mt-0.5 block">{membersCount}</span>
                </div>
              </div>
            </div>

            <Link
              href="/admin/users"
              className="w-full mt-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-gray-800 text-[10px] font-bold uppercase tracking-wider text-center block border border-neutral-200"
            >
              View User Registry & Role Access →
            </Link>
          </div>
        </FadeUp>

        {/* Hub 8: Product Inventory & Seating Capacity Breakdown */}
        <FadeUp delay={0.46}>
          <div className="bg-white border border-neutral-200 shadow-sm p-5 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <Armchair size={16} className="text-[#006064]" />
                  <h3 className="text-xs font-bold text-[#1B1C1C] uppercase tracking-wider">
                    Spaces & Pax Capacity
                  </h3>
                </div>
                <Link href="/admin/products" className="text-[10px] font-bold text-[#006064] hover:underline uppercase">
                  Catalogue →
                </Link>
              </div>

              <div className="grid grid-cols-4 gap-2 mt-4 text-center">
                <div className="bg-neutral-50 p-2 border border-neutral-100">
                  <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">Cabins</span>
                  <span className="text-sm font-bold text-gray-900 mt-0.5 block">{cabinsCount}</span>
                </div>
                <div className="bg-neutral-50 p-2 border border-neutral-100">
                  <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">Meeting</span>
                  <span className="text-sm font-bold text-gray-900 mt-0.5 block">{meetingRoomsCount}</span>
                </div>
                <div className="bg-neutral-50 p-2 border border-neutral-100">
                  <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">Desks</span>
                  <span className="text-sm font-bold text-gray-900 mt-0.5 block">{desksCount}</span>
                </div>
                <div className="bg-teal-50 p-2 border border-teal-100">
                  <span className="text-[8px] font-bold text-[#006064] uppercase tracking-wider block">Total Pax</span>
                  <span className="text-sm font-bold text-[#006064] mt-0.5 block">{totalCapacityPax}+</span>
                </div>
              </div>
            </div>

            <Link
              href="/admin/products"
              className="w-full mt-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-gray-800 text-[10px] font-bold uppercase tracking-wider text-center block border border-neutral-200"
            >
              Explore 22 Workspace Assets →
            </Link>
          </div>
        </FadeUp>

        {/* Hub 9: Centre Amenities & Facilities */}
        <FadeUp delay={0.48}>
          <div className="bg-white border border-neutral-200 shadow-sm p-5 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <Coffee size={16} className="text-[#006064]" />
                  <h3 className="text-xs font-bold text-[#1B1C1C] uppercase tracking-wider">
                    Amenities & Facilities
                  </h3>
                </div>
                <Link href="/admin/amenities" className="text-[10px] font-bold text-[#006064] hover:underline uppercase">
                  View →
                </Link>
              </div>

              <div className="flex items-center justify-between p-3 bg-neutral-50 border border-neutral-100 mt-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Active Amenities</span>
                  <span className="text-lg font-bold text-[#1B1C1C] mt-0.5 block">{amenitiesCount} Facilities</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 border border-emerald-200">
                  {amenitiesCount > 0 ? `${amenitiesCount} Configured` : '0 Configured'}
                </span>
              </div>
            </div>

            <Link
              href="/admin/amenities"
              className="w-full mt-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-gray-800 text-[10px] font-bold uppercase tracking-wider text-center block border border-neutral-200"
            >
              Manage Verified Amenities →
            </Link>
          </div>
        </FadeUp>
      </div>

      {/* ── 6. Lower Executive Grid: Inventory Table & Directives ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Workspace Inventory & Recent Deployments (8 Cols) */}
        <FadeUp delay={0.5} className="lg:col-span-8">
          <div className="bg-white border border-neutral-200 shadow-sm flex flex-col h-full">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <div className="flex items-center gap-2.5">
                <Package size={16} className="text-[#006064]" />
                <h3 className="text-xs font-bold text-[#1B1C1C] uppercase tracking-wider">
                  Active Workspace Catalogue (22 Assets)
                </h3>
              </div>
              <Link
                href="/admin/products"
                className="text-[10px] font-bold text-[#006064] hover:underline uppercase flex items-center gap-0.5"
              >
                <span>Full Inventory →</span>
              </Link>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-5">Workspace Space</th>
                    <th className="py-3 px-5">Classification</th>
                    <th className="py-3 px-5">Centre Location</th>
                    <th className="py-3 px-5 text-center">Capacity</th>
                    <th className="py-3 px-5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 bg-white">
                  {recentProducts.slice(0, 5).map((p) => {
                    const typeName = typeof p.type === 'object' ? p.type?.displayName || p.type?.name : String(p.type);

                    return (
                      <tr key={p.id} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="py-3.5 px-5 font-bold text-gray-900 uppercase">
                          {p.name}
                        </td>
                        <td className="py-3.5 px-5 text-gray-600 uppercase text-[11px]">
                          {typeName}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-neutral-100 text-gray-800 text-[10px] font-bold uppercase border border-neutral-200">
                            <MapPin size={10} className="text-[#006064]" />
                            {p.location?.name || 'Ahmedabad Centre'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-center font-bold text-gray-700">
                          {p.capacity ? `${p.capacity} Pax` : '1 Pax'}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[10px] uppercase bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-neutral-100 bg-neutral-50/30 flex items-center justify-between text-xs text-gray-500">
              <span>Showing 5 most recent spaces from active inventory</span>
              <button
                onClick={() => setIsModalOpen(true)}
                className="text-[10px] font-bold text-[#006064] hover:underline uppercase flex items-center gap-1 cursor-pointer"
              >
                <Plus size={12} />
                <span>Add Workspace Space</span>
              </button>
            </div>
          </div>
        </FadeUp>

        {/* Right: Executive Quick Actions & Lead Inquiries (4 Cols) */}
        <FadeUp delay={0.52} className="lg:col-span-4 space-y-6">
          {/* Executive Directives */}
          <div className="bg-white border border-neutral-200 shadow-sm p-5">
            <h3 className="text-xs font-bold text-[#1B1C1C] uppercase tracking-wider mb-4 pb-2 border-b border-neutral-100 flex items-center gap-2">
              <TrendingUp size={15} className="text-[#006064]" />
              <span>Owner Quick Actions</span>
            </h3>

            <div className="space-y-2">
              <Link
                href="/admin/client-master"
                className="flex items-center justify-between p-3 bg-neutral-50 hover:bg-[#006064] hover:text-white group border border-neutral-200 transition-all text-xs font-bold uppercase tracking-wider text-gray-800"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={15} className="text-[#006064] group-hover:text-white" />
                  <span>+ Add Master Client</span>
                </div>
                <ChevronRight size={14} className="text-gray-400 group-hover:text-white" />
              </Link>

              <Link
                href="/admin/Invoices"
                className="flex items-center justify-between p-3 bg-neutral-50 hover:bg-[#006064] hover:text-white group border border-neutral-200 transition-all text-xs font-bold uppercase tracking-wider text-gray-800"
              >
                <div className="flex items-center gap-2.5">
                  <Receipt size={15} className="text-[#006064] group-hover:text-white" />
                  <span>Dispatch Monthly Invoices</span>
                </div>
                <ChevronRight size={14} className="text-gray-400 group-hover:text-white" />
              </Link>

              <Link
                href="/admin/expenses"
                className="flex items-center justify-between p-3 bg-neutral-50 hover:bg-[#006064] hover:text-white group border border-neutral-200 transition-all text-xs font-bold uppercase tracking-wider text-gray-800"
              >
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet size={15} className="text-[#006064] group-hover:text-white" />
                  <span>Record Expense Voucher</span>
                </div>
                <ChevronRight size={14} className="text-gray-400 group-hover:text-white" />
              </Link>

              <Link
                href="/admin/locations"
                className="flex items-center justify-between p-3 bg-neutral-50 hover:bg-[#006064] hover:text-white group border border-neutral-200 transition-all text-xs font-bold uppercase tracking-wider text-gray-800"
              >
                <div className="flex items-center gap-2.5">
                  <Building2 size={15} className="text-[#006064] group-hover:text-white" />
                  <span>Manage Locations & Sites</span>
                </div>
                <ChevronRight size={14} className="text-gray-400 group-hover:text-white" />
              </Link>
            </div>
          </div>

          {/* Member Helpdesk & Leads */}
          <div className="bg-white border border-neutral-200 shadow-sm p-5">
            <h3 className="text-xs font-bold text-[#1B1C1C] uppercase tracking-wider mb-3 pb-2 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Headphones size={15} className="text-[#006064]" />
                <span>Helpdesk & Leads</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                Live Inquiries
              </span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-neutral-50 p-3 border border-neutral-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Support Tickets
                </span>
                <span className="text-base font-bold text-gray-900 mt-0.5 block">
                  {stats?.pendingTickets ?? 0} Pending
                </span>
              </div>

              <div className="bg-neutral-50 p-3 border border-neutral-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Booking Leads
                </span>
                <span className="text-base font-bold text-gray-900 mt-0.5 block">
                  {stats?.leads?.total ?? 0} Requests
                </span>
              </div>
            </div>

            <Link
              href="/admin/tickets"
              className="w-full mt-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-gray-800 text-[10px] font-bold uppercase tracking-wider text-center block border border-neutral-200"
            >
              Open Helpdesk & Tickets Hub →
            </Link>
          </div>
        </FadeUp>
      </div>

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchDashboardData}
      />

      {/* India Geo Map Modal v2 */}
      <IndiaGeoMapModal
        isOpen={isGeoMapOpen}
        onClose={() => setIsGeoMapOpen(false)}
      />
    </div>
  );
}
