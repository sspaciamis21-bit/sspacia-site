'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Search,
  RefreshCw,
  Building2,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Download,
  Filter,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  Eye,
  Copy,
  Check,
  DollarSign,
  Layers,
  Sparkles,
} from 'lucide-react';
import { formatDateToIndian, getBillingMonthInfo } from '@/lib/invoice-proration-utils';

interface PaymentPart {
  partIndex?: number;
  amount: number;
  payReceiveDate?: string;
  utrDate?: string;
  paymentMode?: string;
  utrNumber?: string;
  utrFileUrl?: string;
  utrFileName?: string;
  tdsAmount?: number;
  remarks?: string;
  bankName?: string;
}

interface ApprovedInvoicePayment {
  id: number;
  srNo: number;
  clientMasterId: number;
  companyName: string;
  cabinName: string | null;
  noOfSeats: number | null;
  ratePerAgreement: number;
  amount: number;
  gstPercent: number;
  totalAmount: number;
  gstNo: string | null;
  billingMonth: string;
  clientType: 'DEFAULT' | 'VIRTUAL_OFFICE' | 'ONE_TIME' | string;
  paymentDuration: string;
  agreementStartDate: string | null;
  agreementEndDate: string | null;
  status: string;
  remarks: string | null;
  dueDate: string | null;
  paymentDueDay: number;
  locationId: number | null;
  locationName: string;
  attachedPdfUrl: string | null;
  attachedPdfName: string | null;
  splitParts: any[];
  hasSplits: boolean;
  payReceiveDate: string | null;
  receiveAmount: number;
  paymentMode: string | null;
  utrNumber: string | null;
  utrDate: string | null;
  utrFileUrl: string | null;
  utrFileName: string | null;
  tdsDeducted: string;
  tdsAmount: number;
  paymentsJson: string | null;
  dailyChecksJson: string | null;
  paymentStatus: 'RECEIVED' | 'PARTIAL' | 'PENDING' | string;
  balanceAmount: number;
  clientContacts: any[];
  createdAt: string;
  updatedAt: string;
}

interface CmPaymentReceivedViewProps {
  isSuperAdmin: boolean;
  userRoleView?: 'CM' | 'ACCOUNTANT';
  currentUserLocationId?: number | null;
  currentUserLocationName?: string | null;
  onBack?: () => void;
}

export default function CmPaymentReceivedView({
  isSuperAdmin,
  userRoleView = 'CM',
  currentUserLocationId,
  currentUserLocationName,
  onBack,
}: CmPaymentReceivedViewProps) {
  const [invoices, setInvoices] = useState<ApprovedInvoicePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedClientType, setSelectedClientType] = useState('ALL');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Server metadata
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [locations, setLocations] = useState<Array<{ id: number; name: string }>>([]);
  const [serverIsCM, setServerIsCM] = useState<boolean>(!isSuperAdmin);

  // Interactive UI states
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<number | null>(null);
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);
  const [activeModalInvoice, setActiveModalInvoice] = useState<ApprovedInvoicePayment | null>(null);

  // Community Manager should never have Centre filter dropdown; only Super Admin
  const showCentreFilter = isSuperAdmin && !serverIsCM;

  // Fetch invoice payments
  const fetchPayments = async () => {
    try {
      setRefreshing(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedMonth && selectedMonth !== 'ALL') params.set('billingMonth', selectedMonth);
      if (selectedClientType && selectedClientType !== 'ALL') params.set('clientType', selectedClientType);
      if (showCentreFilter && selectedLocationId && selectedLocationId !== 'ALL') {
        params.set('locationId', selectedLocationId);
      }
      if (selectedStatus && selectedStatus !== 'ALL') params.set('paymentStatus', selectedStatus);
      if (searchTerm) params.set('search', searchTerm);

      const res = await fetch(`/api/admin/invoice-payments?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load payment records: ${res.statusText}`);
      }

      const json = await res.json();
      if (json.success) {
        setInvoices(json.data || []);
        if (json.availableBillingMonths?.length) {
          setAvailableMonths(json.availableBillingMonths);
        }
        if (json.locations?.length) {
          setLocations(json.locations);
        }
        if (typeof json.isCM === 'boolean') {
          setServerIsCM(json.isCM);
        }
      } else {
        throw new Error(json.error || 'Failed to fetch payments');
      }
    } catch (err: any) {
      console.error('[CM_PAYMENT_RECEIVED_FETCH_ERR]', err);
      setError(err.message || 'Unable to load payment received records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [selectedMonth, selectedClientType, selectedLocationId, selectedStatus]);

  // Handle Copy UTR
  const handleCopyUtr = (utr: string) => {
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  // Client-side text search filter
  const filteredInvoices = useMemo(() => {
    if (!searchTerm.trim()) return invoices;
    const q = searchTerm.toLowerCase();
    return invoices.filter((inv) => {
      const co = (inv.companyName || '').toLowerCase();
      const cabin = (inv.cabinName || '').toLowerCase();
      const utr = (inv.utrNumber || '').toLowerCase();
      const sr = String(inv.srNo || '');
      const loc = (inv.locationName || '').toLowerCase();
      const mode = (inv.paymentMode || '').toLowerCase();
      return co.includes(q) || cabin.includes(q) || utr.includes(q) || sr.includes(q) || loc.includes(q) || mode.includes(q);
    });
  }, [invoices, searchTerm]);

  // Aggregate KPI metrics
  const kpis = useMemo(() => {
    const totalBilled = filteredInvoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
    const totalReceived = filteredInvoices.reduce((acc, inv) => acc + (inv.receiveAmount || 0), 0);
    const totalBalance = Math.max(0, totalBilled - totalReceived);
    const receivedCount = filteredInvoices.filter((inv) => inv.paymentStatus === 'RECEIVED').length;
    const partialCount = filteredInvoices.filter((inv) => inv.paymentStatus === 'PARTIAL').length;
    const pendingCount = filteredInvoices.filter((inv) => inv.paymentStatus === 'PENDING').length;
    const collectionRate = totalBilled > 0 ? ((totalReceived / totalBilled) * 100).toFixed(1) : '0';

    return {
      totalCount: filteredInvoices.length,
      totalBilled,
      totalReceived,
      totalBalance,
      receivedCount,
      partialCount,
      pendingCount,
      collectionRate,
    };
  }, [filteredInvoices]);

  // Helper: Format Billing Month & Dates in ONE column
  const formatMonthAndDates = (inv: ApprovedInvoicePayment) => {
    const monthStr = inv.billingMonth || 'Current Month';
    const monthInfo = getBillingMonthInfo(monthStr);

    let startDateStr = monthInfo.firstDateStr;
    let endDateStr = monthInfo.lastDateStr;

    // Proration or specific agreement dates if applicable
    if (inv.agreementStartDate) {
      const startIso = inv.agreementStartDate.split('T')[0];
      if (startIso > monthInfo.firstDateStr && startIso <= monthInfo.lastDateStr) {
        startDateStr = startIso;
      }
    }
    if (inv.agreementEndDate) {
      const endIso = inv.agreementEndDate.split('T')[0];
      if (endIso < monthInfo.lastDateStr && endIso >= monthInfo.firstDateStr) {
        endDateStr = endIso;
      }
    }

    const formattedStart = formatDateToIndian(startDateStr);
    const formattedEnd = formatDateToIndian(endDateStr);

    return {
      monthStr,
      periodText: `${formattedStart} – ${formattedEnd}`,
    };
  };

  // Helper: Client Type Label & Pill
  const getClientTypeBadge = (clientType?: string) => {
    const ct = (clientType || 'DEFAULT').toUpperCase();
    if (ct === 'VIRTUAL_OFFICE') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          Virtual Office
        </span>
      );
    }
    if (ct === 'ONE_TIME') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
          One-Time / Session
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        Regular / Dedicated
      </span>
    );
  };

  // Helper: Parse multi-installment payments
  const parsePaymentsList = (paymentsJson?: string | null): PaymentPart[] => {
    if (!paymentsJson) return [];
    try {
      const parsed = JSON.parse(paymentsJson);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return [];
  };

  // Export to CSV
  const exportToCsv = () => {
    const headers = [
      'Sr No',
      'Centre',
      'Company Name',
      'Client Type',
      'Billing Month',
      'Period Start',
      'Period End',
      'Invoice Amount (INR)',
      'Payment Due Date',
      'Payment Status',
      'Amount Received (INR)',
      'Balance Due (INR)',
      'Payment Date',
      'Payment Mode',
      'UTR Number',
      'TDS Amount (INR)',
      'Remarks',
    ];

    const rows = filteredInvoices.map((inv) => {
      const { monthStr, periodText } = formatMonthAndDates(inv);
      const dates = periodText.split(' – ');
      return [
        inv.srNo,
        `"${inv.locationName || 'Mercado'}"`,
        `"${inv.companyName || ''}"`,
        inv.clientType || 'DEFAULT',
        `"${monthStr}"`,
        `"${dates[0] || ''}"`,
        `"${dates[1] || ''}"`,
        inv.totalAmount,
        inv.dueDate ? formatDateToIndian(inv.dueDate.split('T')[0]) : `Day ${inv.paymentDueDay}`,
        inv.paymentStatus,
        inv.receiveAmount || 0,
        inv.balanceAmount || 0,
        inv.payReceiveDate ? formatDateToIndian(inv.payReceiveDate.split('T')[0]) : '',
        `"${inv.paymentMode || ''}"`,
        `"${inv.utrNumber || ''}"`,
        inv.tdsAmount || 0,
        `"${(inv.remarks || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Payments_Received_${selectedMonth}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Active Centre Name for CM Badge
  const activeCentreDisplay =
    currentUserLocationName ||
    (locations.length > 0 ? locations[0].name : 'Assigned Centre');

  return (
    <div className="space-y-4 text-slate-800">
      {/* HEADER SECTION */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer border border-slate-200"
                title="Back to Active Workflow"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-md">
                  <CreditCard size={20} />
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                  Payment Received Register
                </h1>
                {/* Centre Badge for CM (Locked, No Filter) or Super Admin Notice */}
                {!showCentreFilter ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                    <Building2 size={13} />
                    <span>Centre: {activeCentreDisplay}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                    <Sparkles size={13} />
                    <span>Super Admin View (All Centres)</span>
                  </span>
                )}
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {filteredInvoices.length} Invoices
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Real-time payments received against approved client invoices recorded by Accounts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={exportToCsv}
              disabled={filteredInvoices.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={fetchPayments}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* KPI SUMMARY CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-lg p-3">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign size={13} className="text-slate-400" />
              <span>Total Invoiced</span>
            </div>
            <div className="text-base sm:text-lg font-black text-slate-900 mt-1">
              ₹{kpis.totalBilled.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {kpis.totalCount} client invoices
            </div>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3">
            <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-600" />
              <span>Total Received</span>
            </div>
            <div className="text-base sm:text-lg font-black text-emerald-800 mt-1">
              ₹{kpis.totalReceived.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-600 mt-0.5 font-semibold">
              {kpis.collectionRate}% collected ({kpis.receivedCount} fully paid)
            </div>
          </div>

          <div className="bg-rose-50/70 border border-rose-200 rounded-lg p-3">
            <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle size={13} className="text-rose-600" />
              <span>Total Balance Due</span>
            </div>
            <div className="text-base sm:text-lg font-black text-rose-800 mt-1">
              ₹{kpis.totalBalance.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-rose-600 mt-0.5 font-semibold">
              {kpis.pendingCount + kpis.partialCount} outstanding invoices
            </div>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3">
            <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={13} className="text-amber-600" />
              <span>Payment Breakdown</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-xs font-bold">
              <span className="text-emerald-700">{kpis.receivedCount} Paid</span>
              <span className="text-slate-300">•</span>
              <span className="text-amber-700">{kpis.partialCount} Partial</span>
              <span className="text-slate-300">•</span>
              <span className="text-rose-700">{kpis.pendingCount} Pending</span>
            </div>
            <div className="text-[11px] text-amber-800/80 mt-0.5">
              Across all filtered records
            </div>
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Company, UTR, Cabin, Invoice Sr No..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50/50"
            />
          </div>

          {/* Filter Dropdowns Strip */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 1. Month Wise Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1">
              <Calendar size={13} className="text-slate-500 shrink-0" />
              <label className="text-[11px] font-bold text-slate-600 uppercase">Month:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Months</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Client Type Wise Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1">
              <Layers size={13} className="text-slate-500 shrink-0" />
              <label className="text-[11px] font-bold text-slate-600 uppercase">Client Type:</label>
              <select
                value={selectedClientType}
                onChange={(e) => setSelectedClientType(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Client Types</option>
                <option value="DEFAULT">Regular / Dedicated</option>
                <option value="VIRTUAL_OFFICE">Virtual Office</option>
                <option value="ONE_TIME">One-Time / Session</option>
              </select>
            </div>

            {/* 3. Centre Filter: ONLY for Super Admin; for CM, NO centre filter! */}
            {showCentreFilter ? (
              <div className="flex items-center gap-1.5 bg-blue-50/70 border border-blue-300 rounded-md px-2.5 py-1">
                <Building2 size={13} className="text-blue-600 shrink-0" />
                <label className="text-[11px] font-bold text-blue-800 uppercase">Centre:</label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-blue-900 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Centres</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={String(loc.id)}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-md px-2.5 py-1 text-emerald-800">
                <Building2 size={13} className="text-emerald-600 shrink-0" />
                <span className="text-[11px] font-extrabold uppercase tracking-wide">
                  {activeCentreDisplay}
                </span>
              </div>
            )}

            {/* 4. Payment Status Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1">
              <Filter size={13} className="text-slate-500 shrink-0" />
              <label className="text-[11px] font-bold text-slate-600 uppercase">Status:</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="RECEIVED">Paid / Received</option>
                <option value="PARTIAL">Partially Paid</option>
                <option value="PENDING">Pending Payment</option>
                <option value="BALANCE_PENDING">Has Balance Due</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-300 rounded-md text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchPayments}
            className="text-xs font-bold underline hover:text-rose-950"
          >
            Retry
          </button>
        </div>
      )}

      {/* MAIN DATA TABLE */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                <th className="py-3 px-3 w-12 text-center">Sr.</th>
                <th className="py-3 px-3">Centre</th>
                <th className="py-3 px-3 min-w-[200px]">Company Name</th>
                {/* User Req: Billing Month + Start & End Date in one col */}
                <th className="py-3 px-3 min-w-[170px] bg-slate-200/50">
                  Billing Month &amp; Dates
                </th>
                {/* User Req: Invoice Amt + Invoice PDF View in one col */}
                <th className="py-3 px-3 min-w-[170px] bg-emerald-50/50">
                  Invoice Amt &amp; PDF
                </th>
                {/* User Req: Payment Due Date */}
                <th className="py-3 px-3 min-w-[130px]">Due Date</th>
                {/* Status */}
                <th className="py-3 px-3 w-28 text-center">Status</th>
                {/* User Req: Payment Received Details entered by accountant */}
                <th className="py-3 px-3 min-w-[260px] bg-emerald-50/40">
                  Payment Received Details (By Accounts)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={24} className="animate-spin text-emerald-600" />
                      <span className="text-xs font-semibold">Loading payment received records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CreditCard size={32} className="text-slate-300" />
                      <span className="text-sm font-semibold text-slate-600">No payment records found</span>
                      <span className="text-xs text-slate-400">
                        Try adjusting your month, client type, or search filters.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv, idx) => {
                  const { monthStr, periodText } = formatMonthAndDates(inv);
                  const isPaid = inv.paymentStatus === 'RECEIVED';
                  const isPartial = inv.paymentStatus === 'PARTIAL';
                  const isPending = !isPaid && !isPartial;
                  const parts = parsePaymentsList(inv.paymentsJson);
                  const isExpanded = expandedInvoiceId === inv.id;

                  // Due date check
                  const dueObj = inv.dueDate ? new Date(inv.dueDate) : null;
                  const isOverdue = dueObj && !isPaid && dueObj.getTime() < new Date().getTime();
                  const overdueDays =
                    isOverdue && dueObj
                      ? Math.floor((new Date().getTime() - dueObj.getTime()) / (1000 * 60 * 60 * 24))
                      : 0;

                  return (
                    <React.Fragment key={inv.id}>
                      <tr
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isExpanded ? 'bg-slate-50/90' : ''
                        }`}
                      >
                        {/* 1. Sr. No */}
                        <td className="py-3 px-3 text-center text-slate-500 font-mono text-[11px]">
                          {inv.srNo || idx + 1}
                        </td>

                        {/* 2. Centre */}
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            <Building2 size={11} className="text-slate-500 shrink-0" />
                            <span>{inv.locationName || 'Mercado'}</span>
                          </span>
                        </td>

                        {/* 3. Company Name */}
                        <td className="py-3 px-3">
                          <div className="space-y-1">
                            <div className="font-extrabold text-slate-900 text-[12.5px] leading-tight">
                              {inv.companyName}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {getClientTypeBadge(inv.clientType)}
                              {inv.cabinName && (
                                <span className="text-[10.5px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                                  {inv.cabinName}
                                </span>
                              )}
                              {inv.noOfSeats ? (
                                <span className="text-[10px] text-slate-500 font-semibold">
                                  ({inv.noOfSeats} seat{inv.noOfSeats > 1 ? 's' : ''})
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        {/* 4. Col: Billing Month + Start & End Date in ONE col */}
                        <td className="py-3 px-3 bg-slate-50/40">
                          <div className="space-y-0.5">
                            <div className="font-black text-slate-900 text-xs flex items-center gap-1">
                              <Calendar size={12} className="text-slate-400" />
                              <span>{monthStr}</span>
                            </div>
                            <div className="text-[10.5px] font-medium text-slate-500 font-mono">
                              {periodText}
                            </div>
                          </div>
                        </td>

                        {/* 5. Col: Invoice Amt + Invoice PDF View in ONE col */}
                        <td className="py-3 px-3 bg-emerald-50/20">
                          <div className="space-y-1">
                            <div className="font-black text-slate-900 text-xs sm:text-[13px]">
                              ₹{inv.totalAmount.toLocaleString('en-IN')}
                            </div>
                            {inv.attachedPdfUrl ? (
                              <a
                                href={inv.attachedPdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shadow-2xs"
                                title="View attached invoice PDF sent to client"
                              >
                                <FileText size={12} className="text-emerald-600" />
                                <span>View PDF</span>
                                <ExternalLink size={10} className="text-emerald-500" />
                              </a>
                            ) : (
                              <span className="text-[10.5px] text-slate-400 italic">
                                No PDF attached
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 6. Payment Due Date */}
                        <td className="py-3 px-3">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-800 text-xs">
                              {inv.dueDate
                                ? formatDateToIndian(inv.dueDate.split('T')[0])
                                : `Day ${inv.paymentDueDay} of month`}
                            </div>
                            {isOverdue && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                                Overdue {overdueDays}d
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 7. Status */}
                        <td className="py-3 px-3 text-center">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 size={12} className="text-emerald-700" />
                              <span>PAID</span>
                            </span>
                          ) : isPartial ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                              <Clock size={12} className="text-amber-700" />
                              <span>PARTIAL</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                              <AlertCircle size={12} className="text-rose-700" />
                              <span>PENDING</span>
                            </span>
                          )}
                        </td>

                        {/* 8. Payment Received Details entered by accountant */}
                        <td className="py-3 px-3 bg-emerald-50/15">
                          <div className="space-y-1.5">
                            {/* Received vs Balance */}
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <div>
                                <span className="text-[10px] text-slate-500 uppercase font-bold">
                                  Received:{' '}
                                </span>
                                <span className="font-extrabold text-emerald-800 text-[12.5px]">
                                  ₹{(inv.receiveAmount || 0).toLocaleString('en-IN')}
                                </span>
                              </div>
                              {inv.balanceAmount > 0 && (
                                <div>
                                  <span className="text-[10px] text-rose-600 uppercase font-bold">
                                    Due:{' '}
                                  </span>
                                  <span className="font-extrabold text-rose-700 text-[12px]">
                                    ₹{inv.balanceAmount.toLocaleString('en-IN')}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Payment Date & Mode */}
                            {(inv.payReceiveDate || inv.paymentMode) && (
                              <div className="flex items-center gap-2 text-[11px] text-slate-600">
                                {inv.payReceiveDate && (
                                  <span className="font-medium">
                                    Paid On:{' '}
                                    <strong className="text-slate-800">
                                      {formatDateToIndian(inv.payReceiveDate.split('T')[0])}
                                    </strong>
                                  </span>
                                )}
                                {inv.paymentMode && (
                                  <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 font-bold rounded text-[10px] uppercase border border-slate-200">
                                    {inv.paymentMode}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* UTR & Proof Link */}
                            {inv.utrNumber ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] text-slate-400 uppercase font-bold">
                                  UTR:
                                </span>
                                <span
                                  className="font-mono text-[10.5px] font-bold text-slate-800 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 truncate max-w-[180px]"
                                  title={inv.utrNumber}
                                >
                                  {inv.utrNumber}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyUtr(inv.utrNumber!)}
                                  className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                                  title="Copy UTR Number"
                                >
                                  {copiedUtr === inv.utrNumber ? (
                                    <Check size={12} className="text-emerald-600" />
                                  ) : (
                                    <Copy size={12} />
                                  )}
                                </button>
                                {inv.utrFileUrl && (
                                  <a
                                    href={inv.utrFileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] font-bold text-blue-600 hover:underline inline-flex items-center gap-0.5"
                                  >
                                    <Eye size={11} />
                                    <span>Slip</span>
                                  </a>
                                )}
                              </div>
                            ) : isPending ? (
                              <span className="text-[10.5px] text-slate-400 italic">
                                Awaiting payment confirmation
                              </span>
                            ) : null}

                            {/* TDS Deducted if any */}
                            {inv.tdsAmount > 0 && (
                              <div className="text-[10.5px] text-amber-800 font-semibold">
                                TDS Deducted: ₹{inv.tdsAmount.toLocaleString('en-IN')}
                              </div>
                            )}

                            {/* Multi-part payment installments breakdown toggle */}
                            {parts.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedInvoiceId(isExpanded ? null : inv.id)
                                }
                                className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer pt-0.5"
                              >
                                <span>{parts.length} Installments Breakdown</span>
                                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              </button>
                            )}

                            {/* Remarks from accountant */}
                            {inv.remarks && (
                              <div className="text-[10px] text-slate-500 italic bg-slate-50 p-1 rounded border border-slate-200/60 max-w-[260px] truncate">
                                Accounts: {inv.remarks}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Multi-installment Rows */}
                      {isExpanded && parts.length > 0 && (
                        <tr className="bg-emerald-50/30 border-b border-emerald-100">
                          <td colSpan={8} className="py-2.5 px-6">
                            <div className="bg-white rounded-md border border-emerald-200 p-3 shadow-2xs space-y-2">
                              <div className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                                <Layers size={13} className="text-emerald-600" />
                                <span>Installment History for {inv.companyName}</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {parts.map((p, pIdx) => (
                                  <div
                                    key={pIdx}
                                    className="p-2 rounded border border-slate-200 bg-slate-50 text-[11px] space-y-1"
                                  >
                                    <div className="flex items-center justify-between font-bold text-slate-800">
                                      <span>Installment #{pIdx + 1}</span>
                                      <span className="text-emerald-700">
                                        ₹{Number(p.amount || 0).toLocaleString('en-IN')}
                                      </span>
                                    </div>
                                    <div className="text-slate-500 text-[10.5px]">
                                      Date:{' '}
                                      {p.payReceiveDate || p.utrDate
                                        ? formatDateToIndian(
                                            (p.payReceiveDate || p.utrDate)!.split('T')[0]
                                          )
                                        : '—'}
                                    </div>
                                    {p.paymentMode && (
                                      <div className="text-slate-600">
                                        Mode:{' '}
                                        <span className="font-semibold">{p.paymentMode}</span>
                                      </div>
                                    )}
                                    {p.utrNumber && (
                                      <div className="font-mono text-[10px] text-slate-700 truncate">
                                        UTR: {p.utrNumber}
                                      </div>
                                    )}
                                    {p.utrFileUrl && (
                                      <a
                                        href={p.utrFileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline font-bold"
                                      >
                                        <Eye size={10} />
                                        <span>View Receipt</span>
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
