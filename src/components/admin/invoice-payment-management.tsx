'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Search,
  Building2,
  Calendar,
  CheckCircle2,
  Loader2,
  X,
  Filter,
  RefreshCw,
  Upload,
  Eye,
  Check,
  Download,
  DollarSign,
  AlertCircle,
  FolderArchive,
  CreditCard,
  Plus,
  Trash2,
  Receipt,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  Landmark,
} from 'lucide-react';
import { toast } from 'sonner';
import { FadeUp } from '@/components/ui/fade-up';
import { OldInvoicesArchive } from '@/components/admin/old-invoices-archive';

export interface PaymentPartItem {
  id: string;
  payReceiveDate: string;
  receiveAmount: string;
  paymentMode: string;
  utrNumber: string;
  utrDate: string;
  tdsDeducted: string;
  tdsAmount: string;
  utrFileUrl?: string | null;
  utrFileName?: string | null;
  remarks?: string;
  uploading?: boolean;
}

export interface LiveApprovedInvoice {
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
  // Payment settlement details
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
  paymentStatus: 'PENDING' | 'RECEIVED' | 'PARTIAL';
  balanceAmount: number;
  clientContacts: any[];
  createdAt: string;
  updatedAt: string;
}

interface InvoicePaymentManagementProps {
  isSuperAdmin?: boolean;
  userRoleView?: 'CM' | 'ACCOUNTANT';
  canAccessCM?: boolean;
  canAccessAccountant?: boolean;
  currentUserLocationId?: number | null;
  currentUserLocationName?: string | null;
}

const PAYMENT_MODES = [
  'NEFT',
  'RTGS',
  'IMPS',
  'UPI',
  'Cheque',
  'Cash',
  'Bank Transfer',
  'Demand Draft',
];

export function InvoicePaymentManagement({
  isSuperAdmin = false,
  userRoleView = 'ACCOUNTANT',
  canAccessCM = true,
  canAccessAccountant = true,
  currentUserLocationId = null,
  currentUserLocationName = null,
}: InvoicePaymentManagementProps) {
  // Main view toggle: 'LIVE_APPROVED' vs 'OLD_ARCHIVE'
  const [activeTab, setActiveTab] = useState<'LIVE_APPROVED' | 'OLD_ARCHIVE'>('LIVE_APPROVED');

  // Data & loading states
  const [invoices, setInvoices] = useState<LiveApprovedInvoice[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingPayment, setSavingPayment] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Multi-Part Payment Modal State
  const [editingInvoice, setEditingInvoice] = useState<LiveApprovedInvoice | null>(null);
  const [paymentParts, setPaymentParts] = useState<PaymentPartItem[]>([]);
  const [activeUploadPartId, setActiveUploadPartId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch approved live invoices
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedMonth && selectedMonth !== 'ALL') params.set('billingMonth', selectedMonth);
      if (selectedLocation && selectedLocation !== 'ALL') params.set('locationId', selectedLocation);
      if (selectedStatus && selectedStatus !== 'ALL') params.set('paymentStatus', selectedStatus);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/admin/invoice-payments?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setInvoices(json.data || []);
        if (json.availableBillingMonths) {
          setAvailableMonths(json.availableBillingMonths);
        }
      } else {
        toast.error(json.error || 'Failed to load approved invoices');
      }
    } catch (err: any) {
      console.error('Failed to fetch approved invoices:', err);
      toast.error('Network error loading invoices');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedLocation, selectedStatus, searchQuery]);

  useEffect(() => {
    if (activeTab === 'LIVE_APPROVED') {
      fetchInvoices();
    }
  }, [fetchInvoices, activeTab]);

  // Open Payment Update Modal with Multi-Part Support
  const handleOpenPaymentModal = (invoice: LiveApprovedInvoice) => {
    setEditingInvoice(invoice);

    const todayStr = new Date().toISOString().split('T')[0];

    // Check if invoice already has multi-part payments stored in paymentsJson
    if (invoice.paymentsJson) {
      try {
        const parsed = JSON.parse(invoice.paymentsJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPaymentParts(
            parsed.map((p, idx) => ({
              id: p.id || `part_${idx + 1}`,
              payReceiveDate: p.payReceiveDate
                ? String(p.payReceiveDate).split('T')[0]
                : p.date
                ? String(p.date).split('T')[0]
                : todayStr,
              receiveAmount:
                p.receiveAmount !== undefined && p.receiveAmount !== null
                  ? String(p.receiveAmount)
                  : p.amount !== undefined
                  ? String(p.amount)
                  : '',
              paymentMode: p.paymentMode || p.mode || 'NEFT',
              utrNumber: p.utrNumber || '',
              utrDate: p.utrDate ? String(p.utrDate).split('T')[0] : todayStr,
              tdsDeducted: p.tdsDeducted === 'Yes' ? 'Yes' : 'No',
              tdsAmount: p.tdsAmount !== undefined && p.tdsAmount !== null ? String(p.tdsAmount) : '0',
              utrFileUrl: p.utrFileUrl || null,
              utrFileName: p.utrFileName || null,
              remarks: p.remarks || '',
            }))
          );
          return;
        }
      } catch (e) {
        console.warn('Failed to parse paymentsJson', e);
      }
    }

    // Default 1 payment entry
    const initialAmount =
      invoice.receiveAmount > 0
        ? String(invoice.receiveAmount)
        : String(invoice.totalAmount);

    setPaymentParts([
      {
        id: `part_${Date.now()}`,
        payReceiveDate: invoice.payReceiveDate
          ? String(invoice.payReceiveDate).split('T')[0]
          : todayStr,
        receiveAmount: initialAmount,
        paymentMode: invoice.paymentMode || 'NEFT',
        utrNumber: invoice.utrNumber || '',
        utrDate: invoice.utrDate ? String(invoice.utrDate).split('T')[0] : todayStr,
        tdsDeducted: invoice.tdsDeducted || 'No',
        tdsAmount: invoice.tdsAmount ? String(invoice.tdsAmount) : '0',
        utrFileUrl: invoice.utrFileUrl || null,
        utrFileName: invoice.utrFileName || null,
        remarks: invoice.remarks || '',
      },
    ]);
  };

  // Add Another Payment Receive Entry / Part
  const handleAddPaymentPart = () => {
    if (!editingInvoice) return;

    // Calculate remaining unallocated balance
    const currentTotalRec = paymentParts.reduce(
      (acc, p) => acc + (parseFloat(p.receiveAmount) || 0),
      0
    );
    const remaining = Math.max(0, editingInvoice.totalAmount - currentTotalRec);
    const todayStr = new Date().toISOString().split('T')[0];

    const newPart: PaymentPartItem = {
      id: `part_${Date.now()}`,
      payReceiveDate: todayStr,
      receiveAmount: remaining > 0 ? String(remaining) : '',
      paymentMode: 'NEFT',
      utrNumber: '',
      utrDate: todayStr,
      tdsDeducted: 'No',
      tdsAmount: '0',
      utrFileUrl: null,
      utrFileName: null,
      remarks: '',
    };

    setPaymentParts((prev) => [...prev, newPart]);
    toast.success(`Payment Part #${paymentParts.length + 1} added`);
  };

  // Remove a Payment Part
  const handleRemovePaymentPart = (partId: string) => {
    setPaymentParts((prev) => prev.filter((p) => p.id !== partId));
  };

  // Update field of a specific Payment Part
  const handleUpdatePaymentPart = (
    partId: string,
    field: keyof PaymentPartItem,
    value: string
  ) => {
    setPaymentParts((prev) =>
      prev.map((p) => (p.id === partId ? { ...p, [field]: value } : p))
    );
  };

  // Trigger file upload for a specific Payment Part
  const handleTriggerUpload = (partId: string) => {
    setActiveUploadPartId(partId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Handle uploaded file for a specific Payment Part
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadPartId) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error('File size exceeds maximum limit of 25MB');
      return;
    }

    setPaymentParts((prev) =>
      prev.map((p) => (p.id === activeUploadPartId ? { ...p, uploading: true } : p))
    );

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/upload-pdf', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setPaymentParts((prev) =>
          prev.map((p) =>
            p.id === activeUploadPartId
              ? { ...p, utrFileUrl: data.url, utrFileName: file.name, uploading: false }
              : p
          )
        );
        toast.success('Bank advice / UTR receipt uploaded');
      } else {
        toast.error(data.error || 'Failed to upload receipt');
        setPaymentParts((prev) =>
          prev.map((p) => (p.id === activeUploadPartId ? { ...p, uploading: false } : p))
        );
      }
    } catch (err: any) {
      toast.error('Network error uploading file');
      setPaymentParts((prev) =>
        prev.map((p) => (p.id === activeUploadPartId ? { ...p, uploading: false } : p))
      );
    } finally {
      setActiveUploadPartId(null);
    }
  };

  // Remove file from a specific Payment Part
  const handleRemoveFile = (partId: string) => {
    setPaymentParts((prev) =>
      prev.map((p) =>
        p.id === partId ? { ...p, utrFileUrl: null, utrFileName: null } : p
      )
    );
  };

  // Live Modal Totals
  const modalSummary = useMemo(() => {
    if (!editingInvoice) return { totalInv: 0, totalRec: 0, totalTds: 0, balance: 0 };
    const totalInv = editingInvoice.totalAmount || 0;
    const totalRec = paymentParts.reduce(
      (acc, p) => acc + (parseFloat(p.receiveAmount) || 0),
      0
    );
    const totalTds = paymentParts.reduce(
      (acc, p) => acc + (p.tdsDeducted === 'Yes' ? parseFloat(p.tdsAmount) || 0 : 0),
      0
    );
    const balance = Math.max(0, totalInv - totalRec);

    return { totalInv, totalRec, totalTds, balance };
  }, [editingInvoice, paymentParts]);

  // Save All Payment Parts
  const handleSavePaymentDetails = async () => {
    if (!editingInvoice) return;

    if (paymentParts.length === 0) {
      toast.error('Please add at least one payment receive entry');
      return;
    }

    const totalRecordedRec = modalSummary.totalRec;
    const totalRecordedTds = modalSummary.totalTds;

    let status: 'PENDING' | 'RECEIVED' | 'PARTIAL' = 'PENDING';
    if (totalRecordedRec >= editingInvoice.totalAmount && editingInvoice.totalAmount > 0) {
      status = 'RECEIVED';
    } else if (totalRecordedRec > 0 && totalRecordedRec < editingInvoice.totalAmount) {
      status = 'PARTIAL';
    } else if (paymentParts.some((p) => p.utrNumber.trim())) {
      status = 'RECEIVED';
    }

    // Primary entry values for top-level columns
    const primaryPart = paymentParts[paymentParts.length - 1]; // Latest part
    const firstPart = paymentParts[0];

    const payload = {
      payReceiveDate: primaryPart?.payReceiveDate ? new Date(primaryPart.payReceiveDate).toISOString() : null,
      receiveAmount: totalRecordedRec,
      paymentMode: primaryPart?.paymentMode || 'NEFT',
      utrNumber: paymentParts.map((p) => p.utrNumber.trim()).filter(Boolean).join(', ') || null,
      utrDate: primaryPart?.utrDate ? new Date(primaryPart.utrDate).toISOString() : null,
      utrFileUrl: primaryPart?.utrFileUrl || firstPart?.utrFileUrl || null,
      utrFileName: primaryPart?.utrFileName || firstPart?.utrFileName || null,
      tdsDeducted: paymentParts.some((p) => p.tdsDeducted === 'Yes') ? 'Yes' : 'No',
      tdsAmount: totalRecordedTds,
      paymentsJson: JSON.stringify(paymentParts),
      paymentStatus: status,
      remarks: paymentParts.map((p) => p.remarks?.trim()).filter(Boolean).join(' | ') || null,
    };

    setSavingPayment(true);
    try {
      const res = await fetch(`/api/admin/invoice-payments/${editingInvoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Payment details recorded for ${editingInvoice.companyName}`);
        setEditingInvoice(null);
        fetchInvoices();
      } else {
        toast.error(data.error || 'Failed to save payment details');
      }
    } catch (err: any) {
      toast.error('Network error saving payment details');
    } finally {
      setSavingPayment(false);
    }
  };

  // Telemetry KPIs
  const summary = useMemo(() => {
    const totalCount = invoices.length;
    const totalInvoiced = invoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
    const totalReceived = invoices.reduce((acc, inv) => acc + (inv.receiveAmount || 0), 0);
    const totalPending = Math.max(0, totalInvoiced - totalReceived);
    const receivedCount = invoices.filter((inv) => inv.paymentStatus === 'RECEIVED').length;
    const pendingCount = invoices.filter((inv) => inv.paymentStatus === 'PENDING' || inv.paymentStatus === 'PARTIAL').length;

    return {
      totalCount,
      totalInvoiced,
      totalReceived,
      totalPending,
      receivedCount,
      pendingCount,
    };
  }, [invoices]);

  return (
    <div className="space-y-3.5 pb-12">
      {/* ── Top Header & Sub-Navigation ── */}
      <FadeUp delay={0.05}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[var(--outline-variant)]/40">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--primary)] mb-0.5">
              <Landmark size={13} /> SSPACIA Financials &amp; Settlements
            </div>
            <h1 className="text-xl sm:text-2xl font-display font-black tracking-tight text-[#1B1C1C] uppercase">
              Invoice Payment Receive Management
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle: Live Approved vs Old Archive */}
            <div className="flex items-center bg-white border border-[var(--outline-variant)] shadow-xs p-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('LIVE_APPROVED')}
                className={`px-3 py-1 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'LIVE_APPROVED'
                    ? 'bg-[var(--primary)] text-white shadow-xs'
                    : 'text-gray-600 hover:text-black hover:bg-neutral-100'
                }`}
              >
                <CreditCard size={13} />
                <span>Live Approved</span>
                <span className="px-1.5 py-0.2 bg-white/20 text-white rounded text-[10px] font-mono">
                  {summary.totalCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('OLD_ARCHIVE')}
                className={`px-3 py-1 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'OLD_ARCHIVE'
                    ? 'bg-[var(--primary)] text-white shadow-xs'
                    : 'text-gray-600 hover:text-black hover:bg-neutral-100'
                }`}
              >
                <FolderArchive size={13} className="text-amber-600" />
                <span>Old Invoices Archive</span>
                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded text-[9px] font-bold">
                  Apr–Aug 2026
                </span>
              </button>
            </div>
          </div>
        </div>
      </FadeUp>

      {/* ── RENDER LIVE INVOICES OR OLD INVOICES ARCHIVE ── */}
      {activeTab === 'OLD_ARCHIVE' ? (
        <OldInvoicesArchive
          isSuperAdmin={isSuperAdmin}
          userRoleView={userRoleView}
          canAccessCM={canAccessCM}
          canAccessAccountant={canAccessAccountant}
          currentUserLocationId={currentUserLocationId}
          currentUserLocationName={currentUserLocationName}
        />
      ) : (
        <>
          {/* ── 4 Key Telemetry Metrics (Compact) ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <FadeUp delay={0.08}>
              <div className="bg-white p-3 border border-neutral-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-gray-400">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-gray-500">
                    Approved Invoices
                  </span>
                  <div className="w-6 h-6 bg-neutral-100 text-[#006064] flex items-center justify-center rounded-xs">
                    <FileText size={13} />
                  </div>
                </div>
                <div className="mt-1 text-xl font-black text-[#1B1C1C] font-display">
                  {loading ? '—' : `${summary.totalCount}`}
                </div>
                <div className="mt-1 text-[10px] text-gray-500 pt-1 border-t border-neutral-100">
                  Auto-populated on CM approval
                </div>
              </div>
            </FadeUp>

            <FadeUp delay={0.12}>
              <div className="bg-white p-3 border border-neutral-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-gray-400">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-gray-500">
                    Total Invoiced
                  </span>
                  <div className="w-6 h-6 bg-purple-100 text-purple-700 flex items-center justify-center rounded-xs">
                    <Receipt size={13} />
                  </div>
                </div>
                <div className="mt-1 text-xl font-black text-purple-950 font-display">
                  {loading ? '—' : `₹${Number(summary.totalInvoiced).toLocaleString('en-IN')}`}
                </div>
                <div className="mt-1 text-[10px] text-gray-500 pt-1 border-t border-neutral-100">
                  Gross client billing
                </div>
              </div>
            </FadeUp>

            <FadeUp delay={0.16}>
              <div className="bg-white p-3 border border-neutral-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-gray-400">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-gray-500">
                    Payment Received
                  </span>
                  <div className="w-6 h-6 bg-emerald-100 text-emerald-800 flex items-center justify-center rounded-xs">
                    <CheckCircle2 size={13} />
                  </div>
                </div>
                <div className="mt-1 text-xl font-black text-emerald-800 font-display">
                  {loading ? '—' : `₹${Number(summary.totalReceived).toLocaleString('en-IN')}`}
                </div>
                <div className="mt-1 text-[10px] text-emerald-700 font-bold pt-1 border-t border-neutral-100">
                  {summary.receivedCount} Invoices Settled
                </div>
              </div>
            </FadeUp>

            <FadeUp delay={0.2}>
              <div className="bg-white p-3 border border-neutral-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-gray-400">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-gray-500">
                    Pending Balance
                  </span>
                  <div className="w-6 h-6 bg-amber-100 text-amber-800 flex items-center justify-center rounded-xs">
                    <Clock size={13} />
                  </div>
                </div>
                <div className="mt-1 text-xl font-black text-amber-900 font-display">
                  {loading ? '—' : `₹${Number(summary.totalPending).toLocaleString('en-IN')}`}
                </div>
                <div className="mt-1 text-[10px] text-amber-800 font-bold pt-1 border-t border-neutral-100">
                  {summary.pendingCount} Awaiting Payment
                </div>
              </div>
            </FadeUp>
          </div>

          {/* ── Global Filter Bar (Compact) ── */}
          <FadeUp delay={0.24}>
            <div className="bg-white p-2.5 border border-neutral-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                {/* Search */}
                <div className="relative w-full sm:w-56">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search client, GST, UTR..."
                    className="w-full pl-7 pr-3 py-1 text-xs bg-neutral-50 border border-neutral-300 focus:outline-none focus:border-[#006064]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>

                {/* Billing Month */}
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-gray-500 font-bold text-[10px] uppercase">Month:</span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-neutral-50 border border-neutral-300 px-2 py-1 text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#006064] cursor-pointer"
                  >
                    <option value="ALL">All Months ({availableMonths.length})</option>
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Centre Filter */}
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-gray-500 font-bold text-[10px] uppercase">Centre:</span>
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="bg-neutral-50 border border-neutral-300 px-2 py-1 text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#006064] cursor-pointer"
                  >
                    <option value="ALL">All Centres (Global)</option>
                    <option value="1">Mercado</option>
                    <option value="2">Agarwal Complex</option>
                    <option value="3">Premier House</option>
                  </select>
                </div>


                {/* Payment Status Filter */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-gray-500 font-bold text-[10px] uppercase">Status:</span>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="bg-neutral-50 border border-neutral-300 px-2 py-1 text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#006064] cursor-pointer"
                  >
                    <option value="ALL">All Payment Statuses</option>
                    <option value="PENDING">Pending Payment (Unpaid)</option>
                    <option value="PARTIAL">Partial Payment</option>
                    <option value="BALANCE_PENDING">With Balance Pending</option>
                    <option value="RECEIVED">Payment Received (Settled)</option>
                  </select>
                </div>
              </div>

              {/* Refresh Button */}
              <button
                onClick={fetchInvoices}
                disabled={loading}
                className="px-3 py-1.5 border border-neutral-200 hover:bg-neutral-100 text-gray-700 cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin text-[#006064]' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          </FadeUp>

          {/* ── Invoices Payment Table ── */}
          <FadeUp delay={0.35}>
            <div className="bg-white border border-neutral-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-neutral-100/80 border-b border-neutral-200 text-gray-700 font-bold uppercase tracking-wider text-[9.5px]">
                      <th className="py-2 px-2 w-10 text-center">SR.</th>
                      <th className="py-2 px-2.5 min-w-[160px]">Corporate Client</th>
                      <th className="py-2 px-2 min-w-[90px]">Centre</th>
                      <th className="py-2 px-2.5 min-w-[100px]">Billing Cycle</th>
                      <th className="py-2 px-2 text-right">Invoice Sum</th>
                      <th className="py-2 px-2 text-right">Received</th>
                      <th className="py-2 px-2 text-right">Balance Due</th>
                      <th className="py-2 px-2 text-center">Status</th>
                      <th className="py-2 px-2.5 min-w-[140px]">Settlement Details</th>
                      <th className="py-2 px-2 text-center">Tally PDF</th>
                      <th className="py-2 px-1.5 text-center">UTR</th>
                      <th className="py-2 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200/70 font-mono text-[11px]">
                    {loading ? (
                      <tr>
                        <td colSpan={12} className="p-6 text-center text-gray-500 font-sans">
                          <Loader2 size={22} className="animate-spin text-[#006064] mx-auto mb-1.5" />
                          <span>Loading approved invoice payment records...</span>
                        </td>
                      </tr>
                    ) : invoices.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="p-8 text-center text-gray-500 font-sans">
                          <CheckCircle2 size={28} className="text-gray-300 mx-auto mb-1.5" />
                          <p className="font-bold text-gray-700 text-sm">No approved invoices match your filters.</p>
                          <p className="text-xs text-gray-400 mt-1">
                            When Community Managers approve invoices in the monthly pipeline, they will appear here automatically.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      invoices.map((inv, idx) => {
                        const recAmt = Number(inv.receiveAmount || 0);
                        const invAmt = Number(inv.totalAmount || 0);
                        const balAmt = Math.max(0, invAmt - recAmt);
                        const isSettled = inv.paymentStatus === 'RECEIVED' || (recAmt >= invAmt && invAmt > 0);
                        const isPartial = !isSettled && recAmt > 0;

                        return (
                          <tr
                            key={inv.id}
                            className={`hover:bg-teal-50/30 transition-colors ${
                              isSettled ? 'bg-emerald-50/15' : isPartial ? 'bg-blue-50/15' : ''
                            }`}
                          >
                            {/* SR. NO */}
                            <td className="py-2 px-2 text-center text-gray-500 font-bold">
                              #{inv.srNo || idx + 1}
                            </td>

                            {/* Corporate Client */}
                            <td className="py-2 px-2.5">
                              <div className="font-bold text-gray-900 font-sans text-xs flex items-center gap-1.5">
                                <span>{inv.companyName}</span>
                              </div>
                              <div className="text-[10px] text-gray-500 font-sans mt-0.5 flex items-center gap-1.5">
                                {inv.cabinName && <span>{inv.cabinName}</span>}
                                {inv.noOfSeats && <span>• {inv.noOfSeats} Seats</span>}
                              </div>
                              {inv.gstNo && (
                                <div className="text-[9px] text-gray-400 uppercase">
                                  GSTIN: {inv.gstNo}
                                </div>
                              )}
                            </td>

                            {/* Centre Node */}
                            <td className="py-2 px-2">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-neutral-100 text-gray-700 font-sans font-bold text-[9.5px] border border-neutral-200">
                                <Building2 size={10} className="text-[#006064]" />
                                <span>{inv.locationName}</span>
                              </span>
                            </td>

                            {/* Billing Cycle */}
                            <td className="py-2 px-2.5">
                              <div className="font-bold text-gray-900 font-sans text-[11px]">
                                {inv.billingMonth}
                              </div>
                              {inv.dueDate && (
                                <div className="text-[9.5px] text-gray-500 font-sans">
                                  Due: {new Date(inv.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </div>
                              )}
                            </td>

                            {/* Invoice Sum */}
                            <td className="py-2 px-2 text-right">
                              <div className="font-bold text-gray-950 text-xs">
                                ₹{invAmt.toLocaleString('en-IN')}
                              </div>
                              <div className="text-[8.5px] text-gray-400 font-sans">
                                +{inv.gstPercent}% GST
                              </div>
                            </td>

                            {/* Received Amount */}
                            <td className="py-2 px-2 text-right">
                              <div className={`font-bold text-xs ${recAmt > 0 ? 'text-emerald-800' : 'text-gray-400'}`}>
                                ₹{recAmt.toLocaleString('en-IN')}
                              </div>
                            </td>

                            {/* Balance Due */}
                            <td className="py-2 px-2 text-right">
                              <div
                                className={`font-bold text-xs ${
                                  balAmt === 0 ? 'text-emerald-700' : 'text-amber-800'
                                }`}
                              >
                                ₹{balAmt.toLocaleString('en-IN')}
                              </div>
                              {balAmt > 0 && (
                                <span className="inline-block text-[8.5px] font-sans font-bold text-amber-800 bg-amber-100 px-1 py-0.2 rounded-xs mt-0.5">
                                  Pending
                                </span>
                              )}
                            </td>

                            {/* Payment Status */}
                            <td className="py-2 px-2 text-center font-sans">
                              {isSettled ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[9.5px]">
                                  <Check size={10} /> RECEIVED
                                </span>
                              ) : isPartial ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 border border-blue-300 font-bold text-[9.5px]">
                                  <Clock size={10} /> PARTIAL
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[9.5px]">
                                  <Clock size={10} /> PENDING
                                </span>
                              )}
                            </td>

                            {/* Settlement Details */}
                            <td className="py-2 px-2.5 font-sans">
                              {recAmt > 0 || inv.utrNumber ? (
                                <div className="space-y-0.5">
                                  {inv.utrNumber && (
                                    <div className="text-[10px] text-gray-700 font-mono truncate max-w-[130px]" title={`UTR: ${inv.utrNumber}`}>
                                      UTR: {inv.utrNumber}
                                    </div>
                                  )}
                                  {inv.payReceiveDate && (
                                    <div className="text-[9px] text-gray-500">
                                      {new Date(inv.payReceiveDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </div>
                                  )}
                                  {inv.tdsDeducted === 'Yes' && inv.tdsAmount > 0 && (
                                    <div className="text-[9px] text-emerald-700 font-bold">
                                      TDS: ₹{inv.tdsAmount}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic text-[10px]">No receive entry</span>
                              )}
                            </td>

                            {/* Attached Tally PDF */}
                            <td className="py-2 px-2 text-center font-sans">
                              {inv.attachedPdfUrl ? (
                                <a
                                  href={inv.attachedPdfUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[9.5px] font-bold shadow-2xs transition-colors"
                                  title="Inspect Approved Tally Tax Invoice PDF"
                                >
                                  <FileText size={11} className="text-red-600" />
                                  <span>PDF</span>
                                  <ArrowUpRight size={9} />
                                </a>
                              ) : inv.hasSplits ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 text-[9.5px] font-bold">
                                  <span>{inv.splitParts.length} Splits</span>
                                </span>
                              ) : (
                                <span className="text-[9.5px] text-gray-400 italic">—</span>
                              )}
                            </td>

                            {/* UTR Slip */}
                            <td className="py-2 px-1.5 text-center font-sans">
                              {inv.utrFileUrl ? (
                                <a
                                  href={inv.utrFileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-neutral-100 hover:bg-neutral-200 text-gray-800 border border-neutral-300 text-[9.5px] font-bold transition-colors"
                                  title="View Uploaded Bank Advice / UTR Slip"
                                >
                                  <Download size={10} />
                                  <span>UTR</span>
                                </a>
                              ) : (
                                <span className="text-gray-300 text-[9.5px]">—</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-2 px-2 text-right font-sans">
                              <button
                                onClick={() => handleOpenPaymentModal(inv)}
                                className="px-2 py-1 bg-[#006064] hover:bg-[#004D40] text-white text-[10px] font-bold uppercase tracking-wider shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1"
                              >
                                <CreditCard size={11} />
                                <span>{isSettled ? 'Edit' : 'Update'}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>

                </table>
              </div>
            </div>
          </FadeUp>

        </>
      )}

      {/* ── Interactive Multi-Part Payment Settlement Modal (Same as Old Invoices) ── */}
      <AnimatePresence>
        {editingInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white border border-neutral-300 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col rounded-sm overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-5 py-4 bg-[#006064] text-white flex items-center justify-between shrink-0">
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-widest text-teal-200">
                    Accountant Payment Settlement Portal
                  </div>
                  <h3 className="text-base sm:text-lg font-bold uppercase font-display tracking-wide truncate max-w-md">
                    {editingInvoice.companyName}
                  </h3>
                  <div className="text-xs text-teal-100 mt-0.5">
                    Billing Cycle: {editingInvoice.billingMonth} • Total Invoice Value: ₹{Number(editingInvoice.totalAmount).toLocaleString('en-IN')}
                  </div>
                </div>
                <button
                  onClick={() => setEditingInvoice(null)}
                  className="p-1 text-teal-200 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Live Balance Summary Bar */}
              <div className="bg-neutral-100 border-b border-neutral-200 px-5 py-2.5 flex items-center justify-between text-xs shrink-0">
                <div>
                  <span className="text-gray-500 text-[10px] uppercase block font-bold">Total Invoiced</span>
                  <span className="font-bold text-gray-900 font-mono">
                    ₹{modalSummary.totalInv.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] uppercase block font-bold">Total Received</span>
                  <span className="font-bold text-emerald-800 font-mono">
                    ₹{modalSummary.totalRec.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] uppercase block font-bold">Balance Pending</span>
                  <span
                    className={`font-bold font-mono ${
                      modalSummary.balance === 0 ? 'text-emerald-800' : 'text-amber-800'
                    }`}
                  >
                    ₹{modalSummary.balance.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Modal Body: Multi-Part Payment Cards */}
              <div className="p-5 space-y-4 overflow-y-auto flex-1 max-h-[60vh]">
                {paymentParts.map((part, index) => (
                  <div
                    key={part.id}
                    className="bg-neutral-50/60 border border-neutral-300 p-4 space-y-3.5 shadow-2xs relative"
                  >
                    {/* Part Header */}
                    <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-[#006064] text-white font-mono font-bold text-[11px] rounded-xs">
                          Part #{index + 1}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">
                          Payment Entry {index + 1} of {paymentParts.length}
                        </span>
                      </div>

                      {paymentParts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePaymentPart(part.id)}
                          className="px-2 py-1 text-red-600 hover:bg-red-50 border border-red-200 rounded-xs text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Remove this payment part"
                        >
                          <Trash2 size={12} />
                          <span>Remove Part</span>
                        </button>
                      )}
                    </div>

                    {/* Row 1: Date & Received Amount */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10.5px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                          Payment Receive Date *
                        </label>
                        <input
                          type="date"
                          value={part.payReceiveDate}
                          onChange={(e) =>
                            handleUpdatePaymentPart(part.id, 'payReceiveDate', e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 focus:outline-none focus:border-[#006064] font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10.5px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                          Received Amount (₹) *
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={part.receiveAmount}
                          onChange={(e) =>
                            handleUpdatePaymentPart(part.id, 'receiveAmount', e.target.value)
                          }
                          placeholder="e.g. 25000"
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 focus:outline-none focus:border-[#006064] font-mono font-bold"
                        />
                      </div>
                    </div>

                    {/* Row 2: Mode & UTR Number */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10.5px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                          UTR / Payment Mode *
                        </label>
                        <select
                          value={part.paymentMode}
                          onChange={(e) =>
                            handleUpdatePaymentPart(part.id, 'paymentMode', e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 focus:outline-none focus:border-[#006064] cursor-pointer"
                        >
                          {PAYMENT_MODES.map((mode) => (
                            <option key={mode} value={mode}>
                              {mode}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10.5px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                          UTR / Reference Number *
                        </label>
                        <input
                          type="text"
                          value={part.utrNumber}
                          onChange={(e) =>
                            handleUpdatePaymentPart(part.id, 'utrNumber', e.target.value)
                          }
                          placeholder="e.g. HDFCN2608123456"
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 focus:outline-none focus:border-[#006064] font-mono"
                        />
                      </div>
                    </div>

                    {/* Row 3: UTR Date & TDS Deducted */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10.5px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                          UTR Transaction Date
                        </label>
                        <input
                          type="date"
                          value={part.utrDate}
                          onChange={(e) =>
                            handleUpdatePaymentPart(part.id, 'utrDate', e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 focus:outline-none focus:border-[#006064] font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10.5px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                          TDS Deducted?
                        </label>
                        <select
                          value={part.tdsDeducted}
                          onChange={(e) =>
                            handleUpdatePaymentPart(part.id, 'tdsDeducted', e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 focus:outline-none focus:border-[#006064] cursor-pointer"
                        >
                          <option value="No">No TDS Deducted</option>
                          <option value="Yes">Yes, TDS Deducted</option>
                        </select>
                      </div>
                    </div>

                    {/* TDS Amount (if Yes) */}
                    {part.tdsDeducted === 'Yes' && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200">
                        <label className="block text-[10.5px] font-bold uppercase tracking-wider text-amber-900 mb-1">
                          TDS Amount Deducted (₹)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={part.tdsAmount}
                          onChange={(e) =>
                            handleUpdatePaymentPart(part.id, 'tdsAmount', e.target.value)
                          }
                          placeholder="e.g. 500"
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-amber-300 focus:outline-none focus:border-[#006064] font-mono font-bold"
                        />
                      </div>
                    )}

                    {/* Upload Bank Advice / UTR Receipt */}
                    <div className="pt-2 border-t border-neutral-200">
                      <label className="block text-[10.5px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Bank Advice / UTR Receipt File
                      </label>
                      <div className="flex items-center gap-2">
                        {part.utrFileUrl ? (
                          <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 border border-neutral-300 w-full justify-between">
                            <span className="text-[11px] font-mono font-bold text-[#006064] truncate max-w-[280px]">
                              {part.utrFileName || 'UTR_Slip.pdf'}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <a
                                href={part.utrFileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-0.5 bg-neutral-100 hover:bg-neutral-200 text-gray-800 text-[10px] font-bold border border-neutral-300"
                              >
                                View
                              </a>
                              <button
                                type="button"
                                onClick={() => handleRemoveFile(part.id)}
                                className="p-0.5 text-red-500 hover:bg-red-50"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleTriggerUpload(part.id)}
                            disabled={part.uploading}
                            className="px-3 py-1.5 bg-white hover:bg-neutral-100 border border-neutral-300 text-gray-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            {part.uploading ? (
                              <Loader2 size={12} className="animate-spin text-[#006064]" />
                            ) : (
                              <Upload size={12} />
                            )}
                            <span>+ Upload UTR Receipt</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Part Remarks */}
                    <div>
                      <input
                        type="text"
                        value={part.remarks || ''}
                        onChange={(e) =>
                          handleUpdatePaymentPart(part.id, 'remarks', e.target.value)
                        }
                        placeholder="Settlement notes for this entry (optional)..."
                        className="w-full px-2.5 py-1 text-xs bg-white border border-neutral-300 focus:outline-none focus:border-[#006064]"
                      />
                    </div>
                  </div>
                ))}

                {/* + Add Another Payment Entry / Part Button */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={handleAddPaymentPart}
                    className="px-4 py-2 bg-teal-50 hover:bg-teal-100 text-[#006064] border border-teal-300 font-bold text-xs rounded-xs inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                  >
                    <Plus size={14} />
                    <span>+ Add Another Payment Receive Entry / Part</span>
                  </button>
                </div>

                {/* Hidden Global File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Modal Footer Actions */}
              <div className="px-5 py-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between shrink-0">
                <div className="text-xs text-gray-500 font-mono">
                  Total Entries: <strong className="text-gray-900">{paymentParts.length}</strong>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingInvoice(null)}
                    disabled={savingPayment}
                    className="px-4 py-2 border border-neutral-300 bg-white hover:bg-neutral-100 text-gray-700 text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePaymentDetails}
                    disabled={savingPayment}
                    className="px-5 py-2 bg-[#006064] hover:bg-[#004D40] text-white text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    {savingPayment ? (
                      <Loader2 size={14} className="animate-spin text-white" />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    <span>Save Settlement Record</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
