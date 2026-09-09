'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  ArrowUpDown,
  CalendarCheck2,
  History,
  CalendarDays,
} from 'lucide-react';
import { toast } from 'sonner';
import { FadeUp } from '@/components/ui/fade-up';
import { OldInvoicesArchive } from '@/components/admin/old-invoices-archive';

export interface DailyPaymentCheckEntry {
  date: string; // YYYY-MM-DD
  status: 'YES' | 'NO';
  checkedById: number | null;
  checkedByName: string;
  checkedByEmail: string;
  checkedAt: string;
  remarks?: string | null;
}

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
  dailyChecksJson?: string | null;
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

  // Dynamic Locations & Sort State
  const [locations, setLocations] = useState<{ id: number; name: string }[]>([]);
  const [sortBy, setSortBy] = useState<'srNo' | 'companyName' | 'totalAmount' | 'receiveAmount' | 'balanceAmount' | 'billingMonth' | 'dueDate'>('srNo');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // CM Read-Only View Payment Modal State
  const [viewingPaymentInvoice, setViewingPaymentInvoice] = useState<LiveApprovedInvoice | null>(null);

  // Multi-Part Payment Modal State
  const [editingInvoice, setEditingInvoice] = useState<LiveApprovedInvoice | null>(null);
  const [paymentParts, setPaymentParts] = useState<PaymentPartItem[]>([]);
  const [activeUploadPartId, setActiveUploadPartId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);

  // Everyday Daily Payment Check State
  const todayLocalStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const yesterdayLocalStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);
  const [selectedCheckDate, setSelectedCheckDate] = useState<string>(todayLocalStr);
  const [updatingCheckInvoiceId, setUpdatingCheckInvoiceId] = useState<number | null>(null);
  const [historyInvoice, setHistoryInvoice] = useState<LiveApprovedInvoice | null>(null);
  const [newHistoryDate, setNewHistoryDate] = useState<string>(todayLocalStr);
  const [newHistoryStatus, setNewHistoryStatus] = useState<'YES' | 'NO'>('YES');
  const [newHistoryRemarks, setNewHistoryRemarks] = useState<string>('');
  const [savingHistoryCheck, setSavingHistoryCheck] = useState<boolean>(false);

  // Helper to format date like "9 Aug 2026"
  const formatCleanDate = useCallback((dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    const dt = new Date(y, m - 1, d);
    const dayNum = dt.getDate();
    const monthStr = dt.toLocaleDateString('en-US', { month: 'short' });
    const yearNum = dt.getFullYear();
    return `${dayNum} ${monthStr} ${yearNum}`;
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Automatically hide left navigation sidebar when payment settlement modal, details modal, or history modal is open
  useEffect(() => {
    if (editingInvoice || viewingPaymentInvoice || historyInvoice) {
      window.dispatchEvent(new Event('hide-manager-sidebar'));
      document.body.classList.add('hide-manager-sidebar');
    } else {
      window.dispatchEvent(new Event('show-manager-sidebar'));
      document.body.classList.remove('hide-manager-sidebar');
    }
    return () => {
      window.dispatchEvent(new Event('show-manager-sidebar'));
      document.body.classList.remove('hide-manager-sidebar');
    };
  }, [editingInvoice, viewingPaymentInvoice, historyInvoice]);

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
        if (json.locations && Array.isArray(json.locations)) {
          setLocations(json.locations);
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

  // Load locations fallback
  useEffect(() => {
    fetch('/api/admin/locations')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setLocations(data.map((l: any) => ({ id: l.id, name: l.name })));
        } else if (data.data && Array.isArray(data.data)) {
          setLocations(data.data.map((l: any) => ({ id: l.id, name: l.name })));
        }
      })
      .catch(() => {});
  }, []);

  // Sorted Invoices calculation
  const sortedInvoices = useMemo(() => {
    return [...invoices].sort((a, b) => {
      let comp = 0;
      if (sortBy === 'srNo') {
        comp = (Number(a.srNo) || 0) - (Number(b.srNo) || 0);
      } else if (sortBy === 'companyName') {
        comp = (a.companyName || '').localeCompare(b.companyName || '');
      } else if (sortBy === 'totalAmount') {
        comp = (Number(a.totalAmount) || 0) - (Number(b.totalAmount) || 0);
      } else if (sortBy === 'receiveAmount') {
        comp = (Number(a.receiveAmount) || 0) - (Number(b.receiveAmount) || 0);
      } else if (sortBy === 'balanceAmount') {
        const balA = Math.max(0, (Number(a.totalAmount) || 0) - (Number(a.receiveAmount) || 0));
        const balB = Math.max(0, (Number(b.totalAmount) || 0) - (Number(b.receiveAmount) || 0));
        comp = balA - balB;
      } else if (sortBy === 'billingMonth') {
        comp = (a.billingMonth || '').localeCompare(b.billingMonth || '');
      } else if (sortBy === 'dueDate') {
        comp = (a.dueDate || '').localeCompare(b.dueDate || '');
      }
      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [invoices, sortBy, sortOrder]);

  const handleToggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

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
      prev.map((p) => {
        if (p.id === partId) {
          const updated = { ...p, [field]: value };
          // Auto-sync UTR Transaction Date when Payment Receive Date is selected/changed
          if (field === 'payReceiveDate') {
            updated.utrDate = value;
          }
          return updated;
        }
        return p;
      })
    );
  };

  // Helper to parse daily checks
  const getInvoiceChecks = useCallback((dailyChecksJson?: string | null): DailyPaymentCheckEntry[] => {
    if (!dailyChecksJson) return [];
    try {
      const parsed = JSON.parse(dailyChecksJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, []);

  const getCheckForDate = useCallback(
    (dailyChecksJson: string | null | undefined, date: string): DailyPaymentCheckEntry | undefined => {
      const list = getInvoiceChecks(dailyChecksJson);
      return list.find((c) => c.date === date);
    },
    [getInvoiceChecks]
  );

  // Quick Daily Check (YES / NO) for the active selectedCheckDate
  const handleQuickDailyCheck = async (invoice: LiveApprovedInvoice, status: 'YES' | 'NO') => {
    setUpdatingCheckInvoiceId(invoice.id);
    try {
      const res = await fetch(`/api/admin/invoice-payments/${invoice.id}/daily-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedCheckDate,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record daily payment check');
      }

      // Update in local state
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoice.id
            ? { ...inv, dailyChecksJson: data.dailyChecksJson }
            : inv
        )
      );

      // If history modal is currently open for this invoice, update it too
      if (historyInvoice && historyInvoice.id === invoice.id) {
        setHistoryInvoice((prev) =>
          prev ? { ...prev, dailyChecksJson: data.dailyChecksJson } : null
        );
      }

      toast.success(
        `Payment Come? Marked ${status} for ${invoice.companyName} (${selectedCheckDate})`
      );
    } catch (err: any) {
      console.error('Failed to update daily payment check:', err);
      toast.error(err.message || 'Error updating daily payment check');
    } finally {
      setUpdatingCheckInvoiceId(null);
    }
  };

  // Add / Update check for any date in History Modal
  const handleSaveHistoryCheck = async () => {
    if (!historyInvoice) return;
    if (!newHistoryDate) {
      toast.error('Please select a date');
      return;
    }

    setSavingHistoryCheck(true);
    try {
      const res = await fetch(`/api/admin/invoice-payments/${historyInvoice.id}/daily-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: newHistoryDate,
          status: newHistoryStatus,
          remarks: newHistoryRemarks,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record check');
      }

      // Update local invoice state
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === historyInvoice.id
            ? { ...inv, dailyChecksJson: data.dailyChecksJson }
            : inv
        )
      );

      setHistoryInvoice((prev) =>
        prev ? { ...prev, dailyChecksJson: data.dailyChecksJson } : null
      );

      setNewHistoryRemarks('');
      toast.success(`Check recorded: ${newHistoryStatus} for ${newHistoryDate}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to record check');
    } finally {
      setSavingHistoryCheck(false);
    }
  };

  // Delete a history entry
  const handleDeleteHistoryCheck = async (dateToDelete: string) => {
    if (!historyInvoice) return;
    if (!confirm(`Delete payment check record for ${dateToDelete}?`)) return;

    try {
      const res = await fetch(
        `/api/admin/invoice-payments/${historyInvoice.id}/daily-check?date=${dateToDelete}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete check');
      }

      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === historyInvoice.id
            ? { ...inv, dailyChecksJson: data.dailyChecksJson }
            : inv
        )
      );

      setHistoryInvoice((prev) =>
        prev ? { ...prev, dailyChecksJson: data.dailyChecksJson } : null
      );

      toast.success(`Deleted record for ${dateToDelete}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to delete check');
    }
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
                  Past Archives
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
                    {locations.map((loc) => (
                      <option key={loc.id} value={String(loc.id)}>
                        {loc.name}
                      </option>
                    ))}
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

                {/* Sort Controls (ASC / DESC option for Accountant) */}
                <div className="flex items-center gap-1 text-xs bg-neutral-100 px-2 py-1 border border-neutral-300">
                  <span className="text-gray-600 font-bold text-[10px] uppercase">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-white border border-neutral-300 px-1.5 py-0.5 text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#006064] cursor-pointer"
                  >
                    <option value="srNo">Sr. No</option>
                    <option value="companyName">Corporate Client</option>
                    <option value="totalAmount">Invoice Sum</option>
                    <option value="receiveAmount">Received</option>
                    <option value="balanceAmount">Balance Due</option>
                    <option value="billingMonth">Billing Cycle</option>
                    <option value="dueDate">Due Date</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                    className="px-2 py-0.5 bg-white hover:bg-neutral-50 border border-neutral-300 text-xs font-bold text-[#006064] flex items-center gap-1 cursor-pointer transition-colors"
                    title={`Toggle Sort: ${sortOrder === 'asc' ? 'Ascending (A-Z, 1-9)' : 'Descending (Z-A, 9-1)'}`}
                  >
                    <span>{sortOrder === 'asc' ? '▲ ASC' : '▼ DESC'}</span>
                  </button>
                </div>

                {/* Everyday Payment Check Date selector */}
                <div className="flex items-center gap-1.5 text-xs bg-amber-50 border border-amber-300 px-2 py-1 shadow-2xs">
                  <CalendarCheck2 size={13} className="text-amber-800 shrink-0" />
                  <span className="text-amber-900 font-bold text-[10px] uppercase">Daily Check Date:</span>
                  <input
                    type="date"
                    value={selectedCheckDate}
                    onChange={(e) => setSelectedCheckDate(e.target.value)}
                    className="bg-white border border-amber-300 px-1.5 py-0.5 text-xs font-mono font-bold text-gray-800 focus:outline-none focus:border-[#006064]"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedCheckDate(yesterdayLocalStr)}
                      className={`px-1.5 py-0.5 text-[10px] font-bold uppercase transition-colors cursor-pointer rounded-xs border ${
                        selectedCheckDate === yesterdayLocalStr
                          ? 'bg-amber-600 text-white border-amber-700'
                          : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                      }`}
                      title="Switch to Yesterday"
                    >
                      Yesterday
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCheckDate(todayLocalStr)}
                      className={`px-1.5 py-0.5 text-[10px] font-bold uppercase transition-colors cursor-pointer rounded-xs border ${
                        selectedCheckDate === todayLocalStr
                          ? 'bg-amber-600 text-white border-amber-700'
                          : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                      }`}
                      title="Switch to Today"
                    >
                      Today
                    </button>
                  </div>
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
                      <th
                        onClick={() => handleToggleSort('srNo')}
                        className="py-2 px-2 w-10 text-center cursor-pointer select-none hover:bg-neutral-200/70"
                        title="Click to sort by Sr. No"
                      >
                        SR. {sortBy === 'srNo' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th
                        onClick={() => handleToggleSort('companyName')}
                        className="py-2 px-2.5 min-w-[160px] cursor-pointer select-none hover:bg-neutral-200/70"
                        title="Click to sort by Corporate Client"
                      >
                        Corporate Client {sortBy === 'companyName' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th className="py-2 px-2 min-w-[90px]">Centre</th>
                      <th
                        onClick={() => handleToggleSort('billingMonth')}
                        className="py-2 px-2.5 min-w-[100px] cursor-pointer select-none hover:bg-neutral-200/70"
                        title="Click to sort by Billing Cycle"
                      >
                        Billing Cycle {sortBy === 'billingMonth' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th
                        onClick={() => handleToggleSort('totalAmount')}
                        className="py-2 px-2 text-right cursor-pointer select-none hover:bg-neutral-200/70"
                        title="Click to sort by Invoice Sum"
                      >
                        Invoice Sum {sortBy === 'totalAmount' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th
                        onClick={() => handleToggleSort('receiveAmount')}
                        className="py-2 px-2 text-right cursor-pointer select-none hover:bg-neutral-200/70"
                        title="Click to sort by Received Amount"
                      >
                        Received {sortBy === 'receiveAmount' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th
                        onClick={() => handleToggleSort('balanceAmount')}
                        className="py-2 px-2 text-right cursor-pointer select-none hover:bg-neutral-200/70"
                        title="Click to sort by Balance Due"
                      >
                        Balance Due {sortBy === 'balanceAmount' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th className="py-2 px-2 text-center">Status</th>
                      <th className="py-2 px-2.5 min-w-[140px]">Settlement Details</th>
                      <th className="py-2 px-2 text-center">Tally PDF</th>
                      <th className="py-2 px-1.5 text-center">UTR</th>
                      <th className="py-2 px-2 text-right">Actions</th>
                      <th className="py-2 px-2.5 min-w-[130px] text-center bg-amber-50/80 border-l border-amber-200">
                        <div className="text-amber-950 font-bold text-[10px] uppercase tracking-wide">
                          PAYMENT COME?
                        </div>
                        <div className="text-[9px] font-sans font-bold text-amber-800 mt-0.5">
                          {formatCleanDate(selectedCheckDate)}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200/70 font-mono text-[11px]">
                    {loading ? (
                      <tr>
                        <td colSpan={13} className="p-6 text-center text-gray-500 font-sans">
                          <Loader2 size={22} className="animate-spin text-[#006064] mx-auto mb-1.5" />
                          <span>Loading approved invoice payment records...</span>
                        </td>
                      </tr>
                    ) : sortedInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="p-8 text-center text-gray-500 font-sans">
                          <CheckCircle2 size={28} className="text-gray-300 mx-auto mb-1.5" />
                          <p className="font-bold text-gray-700 text-sm">No approved invoices match your filters.</p>
                          <p className="text-xs text-gray-400 mt-1">
                            When Community Managers approve invoices in the monthly pipeline, they will appear here automatically.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      sortedInvoices.map((inv, idx) => {
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
                            <td className="py-2 px-2 text-right whitespace-nowrap font-mono">
                              <div className="font-bold text-gray-950 text-xs">
                                ₹{invAmt.toLocaleString('en-IN')}
                              </div>
                              <div className="text-[8.5px] text-gray-400 font-sans">
                                +{inv.gstPercent}% GST
                              </div>
                            </td>

                            {/* Received Amount */}
                            <td className="py-2 px-2 text-right whitespace-nowrap font-mono">
                              <div className={`font-bold text-xs ${recAmt > 0 ? 'text-emerald-800' : 'text-gray-400'}`}>
                                ₹{recAmt.toLocaleString('en-IN')}
                              </div>
                            </td>

                            {/* Balance Due */}
                            <td className="py-2 px-2 text-right whitespace-nowrap font-mono">
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
                              {userRoleView === 'CM' ? (
                                <button
                                  type="button"
                                  onClick={() => setViewingPaymentInvoice(inv)}
                                  className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-[#006064] border border-teal-300 text-[10px] font-bold uppercase tracking-wider shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1"
                                  title="View Uploaded Payment Details"
                                >
                                  <Eye size={11} />
                                  <span>View Payment Details</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPaymentModal(inv)}
                                  className="px-2 py-1 bg-[#006064] hover:bg-[#004D40] text-white text-[10px] font-bold uppercase tracking-wider shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1"
                                >
                                  <CreditCard size={11} />
                                  <span>{isSettled ? 'Edit' : 'Update'}</span>
                                </button>
                              )}
                            </td>

                            {/* Payment Come? Yes/No Dropdown & View History */}
                            <td className="py-2 px-2 text-center font-sans bg-amber-50/20 border-l border-amber-200/60">
                              {(() => {
                                const dayCheck = getCheckForDate(inv.dailyChecksJson, selectedCheckDate);
                                const allChecks = getInvoiceChecks(inv.dailyChecksJson);
                                const isUpdating = updatingCheckInvoiceId === inv.id;
                                const currentStatus = dayCheck?.status || '';

                                return (
                                  <div className="flex flex-col items-center justify-center gap-1">
                                    {/* Yes / No Dropdown */}
                                    <div className="relative inline-block w-full max-w-[105px]">
                                      <select
                                        value={currentStatus}
                                        disabled={isUpdating}
                                        onChange={(e) => {
                                          const val = e.target.value as 'YES' | 'NO';
                                          if (val === 'YES' || val === 'NO') {
                                            handleQuickDailyCheck(inv, val);
                                          }
                                        }}
                                        className={`w-full py-1 pl-2 pr-5 text-[11px] font-bold border rounded-xs cursor-pointer shadow-2xs transition-all focus:outline-none ${
                                          currentStatus === 'YES'
                                            ? 'bg-emerald-50 text-emerald-900 border-emerald-500 font-bold'
                                            : currentStatus === 'NO'
                                            ? 'bg-red-50 text-red-900 border-red-500 font-bold'
                                            : 'bg-white text-gray-500 border-neutral-300 hover:border-neutral-400'
                                        }`}
                                        title={`Payment status for ${formatCleanDate(selectedCheckDate)}: select to change/re-edit`}
                                      >
                                        <option value="" disabled className="text-gray-400 font-normal">
                                          Select...
                                        </option>
                                        <option value="YES" className="text-emerald-800 font-bold bg-white">
                                          YES
                                        </option>
                                        <option value="NO" className="text-red-800 font-bold bg-white">
                                          NO
                                        </option>
                                      </select>
                                      {isUpdating && (
                                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                          <Loader2 size={11} className="animate-spin text-[#006064]" />
                                        </div>
                                      )}
                                    </div>

                                    {/* View History Button */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setHistoryInvoice(inv);
                                        setNewHistoryDate(selectedCheckDate);
                                        setNewHistoryStatus(dayCheck?.status || 'YES');
                                        setNewHistoryRemarks('');
                                      }}
                                      className="inline-flex items-center gap-0.5 text-[9.5px] text-gray-500 hover:text-[#006064] hover:underline font-medium transition-colors cursor-pointer"
                                      title="View complete everyday check history for this invoice"
                                    >
                                      <History size={10} className="text-[#006064]" />
                                      <span>History ({allChecks.length})</span>
                                    </button>
                                  </div>
                                );
                              })()}
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

      {/* ── Interactive Multi-Part Payment Settlement Modal (Mounted in Portal) ── */}
      {mounted &&
        typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {editingInvoice && (
              <div
                onClick={(e) => {
                  if (e.target === e.currentTarget && !savingPayment) {
                    setEditingInvoice(null);
                  }
                }}
                className="fixed inset-0 z-[999999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/70 backdrop-blur-xs font-sans overflow-y-auto"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 10 }}
                  className="bg-white border border-neutral-300 shadow-2xl w-full max-w-4xl lg:max-w-5xl max-h-[94vh] flex flex-col rounded-sm overflow-hidden my-auto"
                >
                  {/* Modal Header */}
                  <div className="px-5 py-3.5 bg-gradient-to-r from-[#004D40] to-[#006064] text-white flex items-center justify-between shrink-0 shadow-xs">
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-widest text-teal-200 flex items-center gap-1.5">
                        <Landmark size={12} />
                        <span>SSPACIA Financials • Accountant Payment Settlement Portal</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold uppercase font-display tracking-wide truncate max-w-xl text-white mt-0.5">
                        {editingInvoice.companyName}
                      </h3>
                      <div className="text-xs text-teal-100 flex items-center gap-2 flex-wrap mt-0.5">
                        <span>Billing Cycle: <strong className="text-white">{editingInvoice.billingMonth}</strong></span>
                        <span>•</span>
                        <span>Centre: <strong className="text-white">{editingInvoice.locationName}</strong></span>
                        <span>•</span>
                        <span>Invoice Value: <strong className="text-white font-mono">₹{Number(editingInvoice.totalAmount).toLocaleString('en-IN')}</strong></span>
                      </div>
                    </div>
                    <button
                      onClick={() => !savingPayment && setEditingInvoice(null)}
                      className="p-1.5 text-teal-200 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
                      title="Close Portal (Esc)"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Live Balance Summary Bar */}
                  <div className="bg-neutral-100 border-b border-neutral-200 px-5 py-2.5 shrink-0">
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div className="bg-white p-2.5 border border-neutral-200 shadow-2xs">
                        <span className="text-gray-500 text-[9.5px] uppercase block font-bold tracking-wider">Total Invoiced</span>
                        <span className="font-bold text-gray-900 font-mono text-sm sm:text-base">
                          ₹{modalSummary.totalInv.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="bg-white p-2.5 border border-emerald-200 shadow-2xs">
                        <span className="text-emerald-700 text-[9.5px] uppercase block font-bold tracking-wider">Total Received</span>
                        <span className="font-bold text-emerald-800 font-mono text-sm sm:text-base">
                          ₹{modalSummary.totalRec.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="bg-white p-2.5 border border-neutral-200 shadow-2xs flex items-center justify-between">
                        <div>
                          <span className="text-gray-500 text-[9.5px] uppercase block font-bold tracking-wider">Balance Pending</span>
                          <span
                            className={`font-bold font-mono text-sm sm:text-base ${
                              modalSummary.balance === 0 ? 'text-emerald-700' : 'text-amber-800'
                            }`}
                          >
                            ₹{modalSummary.balance.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-xs border ${
                          modalSummary.balance === 0
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}>
                          {modalSummary.balance === 0 ? '✓ Fully Settled' : 'Pending'}
                        </span>
                      </div>
                    </div>

                    {/* Visual settlement progress bar */}
                    <div className="w-full bg-neutral-200 h-1.5 mt-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 transition-all duration-300"
                        style={{
                          width: `${modalSummary.totalInv > 0 ? Math.min(100, Math.round((modalSummary.totalRec / modalSummary.totalInv) * 100)) : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Modal Body: Multi-Part Payment Cards */}
                  <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
                    {paymentParts.map((part, index) => (
                      <div
                        key={part.id}
                        className="bg-neutral-50/70 border border-neutral-300 p-4 space-y-3 shadow-2xs relative"
                      >
                        {/* Part Header */}
                        <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-[#006064] text-white font-mono font-bold text-[11px] rounded-xs">
                              Part #{index + 1}
                            </span>
                            <span className="text-xs text-gray-600 font-medium">
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

                        {/* Row 1: 4-Column Responsive Grid on Laptop/Desktop */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                              Payment Receive Date *
                            </label>
                            <input
                              type="date"
                              value={part.payReceiveDate}
                              onChange={(e) =>
                                handleUpdatePaymentPart(part.id, 'payReceiveDate', e.target.value)
                              }
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 focus:outline-none focus:border-[#006064] font-mono shadow-2xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">
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
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 focus:outline-none focus:border-[#006064] font-mono font-bold text-gray-900 shadow-2xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                              UTR / Payment Mode *
                            </label>
                            <select
                              value={part.paymentMode}
                              onChange={(e) =>
                                handleUpdatePaymentPart(part.id, 'paymentMode', e.target.value)
                              }
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 focus:outline-none focus:border-[#006064] cursor-pointer shadow-2xs font-medium"
                            >
                              {PAYMENT_MODES.map((mode) => (
                                <option key={mode} value={mode}>
                                  {mode}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                              UTR / Reference Number *
                            </label>
                            <input
                              type="text"
                              value={part.utrNumber}
                              onChange={(e) =>
                                handleUpdatePaymentPart(part.id, 'utrNumber', e.target.value)
                              }
                              placeholder="e.g. HDFCN2608123456"
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 focus:outline-none focus:border-[#006064] font-mono shadow-2xs"
                            />
                          </div>
                        </div>

                        {/* Row 2: UTR Date, TDS Deducted, TDS Amount, Bank Advice File */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                              UTR Transaction Date
                            </label>
                            <input
                              type="date"
                              value={part.utrDate}
                              onChange={(e) =>
                                handleUpdatePaymentPart(part.id, 'utrDate', e.target.value)
                              }
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 focus:outline-none focus:border-[#006064] font-mono shadow-2xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                              TDS Deducted?
                            </label>
                            <select
                              value={part.tdsDeducted}
                              onChange={(e) =>
                                handleUpdatePaymentPart(part.id, 'tdsDeducted', e.target.value)
                              }
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 focus:outline-none focus:border-[#006064] cursor-pointer shadow-2xs font-medium"
                            >
                              <option value="No">No TDS Deducted</option>
                              <option value="Yes">Yes, TDS Deducted</option>
                            </select>
                          </div>

                          <div>
                            {part.tdsDeducted === 'Yes' ? (
                              <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-900 mb-1">
                                  TDS Amount Deducted (₹) *
                                </label>
                                <input
                                  type="number"
                                  step="any"
                                  value={part.tdsAmount}
                                  onChange={(e) =>
                                    handleUpdatePaymentPart(part.id, 'tdsAmount', e.target.value)
                                  }
                                  placeholder="e.g. 500"
                                  className="w-full px-2.5 py-1.5 text-xs bg-amber-50/60 border border-amber-300 focus:outline-none focus:border-[#006064] font-mono font-bold shadow-2xs text-amber-950"
                                />
                              </div>
                            ) : (
                              <div className="opacity-40">
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                                  TDS Amount
                                </label>
                                <input
                                  type="text"
                                  disabled
                                  value="₹0 (N/A)"
                                  className="w-full px-2.5 py-1.5 text-xs bg-neutral-100 border border-neutral-200 text-gray-400 cursor-not-allowed"
                                />
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                              Bank Advice / UTR Receipt
                            </label>
                            {part.utrFileUrl ? (
                              <div className="flex items-center gap-1.5 bg-white px-2 py-1.5 border border-neutral-300 w-full justify-between shadow-2xs">
                                <span className="text-[11px] font-mono font-bold text-[#006064] truncate max-w-[140px]" title={part.utrFileName || 'UTR_Slip.pdf'}>
                                  {part.utrFileName || 'UTR_Slip.pdf'}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
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
                                    className="p-1 text-red-500 hover:bg-red-50 cursor-pointer"
                                    title="Remove uploaded receipt"
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
                                className="w-full px-3 py-1.5 bg-white hover:bg-neutral-100 border border-neutral-300 text-gray-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                              >
                                {part.uploading ? (
                                  <Loader2 size={12} className="animate-spin text-[#006064]" />
                                ) : (
                                  <Upload size={12} className="text-[#006064]" />
                                )}
                                <span>+ Upload Receipt</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Row 3: Notes / Remarks */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                            Settlement Notes / Remarks
                          </label>
                          <input
                            type="text"
                            value={part.remarks || ''}
                            onChange={(e) =>
                              handleUpdatePaymentPart(part.id, 'remarks', e.target.value)
                            }
                            placeholder="Optional settlement notes for this entry (e.g. Received via NEFT from HDFC Bank)..."
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 focus:outline-none focus:border-[#006064] shadow-2xs"
                          />
                        </div>
                      </div>
                    ))}

                    {/* + Add Another Payment Entry / Part Button */}
                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={handleAddPaymentPart}
                        className="px-4 py-2 bg-teal-50/80 hover:bg-teal-100 text-[#006064] border border-dashed border-teal-300 hover:border-teal-500 font-bold text-xs rounded-xs inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
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
                  <div className="px-5 py-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between shrink-0 shadow-xs">
                    <div className="text-xs text-gray-600 font-mono flex items-center gap-3">
                      <span>Total Entries: <strong className="text-gray-900">{paymentParts.length}</strong></span>
                      <span>•</span>
                      <span>Settlement Sum: <strong className="text-emerald-800 font-bold">₹{(modalSummary.totalRec + modalSummary.totalTds).toLocaleString('en-IN')}</strong></span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setEditingInvoice(null)}
                        disabled={savingPayment}
                        className="px-4 py-2 border border-neutral-300 bg-white hover:bg-neutral-100 text-gray-700 text-xs font-bold uppercase tracking-wider cursor-pointer shadow-2xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSavePaymentDetails}
                        disabled={savingPayment}
                        className="px-5 py-2 bg-[#006064] hover:bg-[#004D40] text-white text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer transition-all hover:shadow-md"
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
          </AnimatePresence>,
          document.body
        )}

      {/* ── Community Manager Read-Only View Payment Details Modal (Mounted in Portal) ── */}
      {mounted &&
        typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {viewingPaymentInvoice && (
              <div
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setViewingPaymentInvoice(null);
                  }
                }}
                className="fixed inset-0 z-[999999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/70 backdrop-blur-xs font-sans overflow-y-auto"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-white border border-neutral-300 shadow-2xl w-full max-w-4xl lg:max-w-5xl max-h-[94vh] flex flex-col rounded-sm overflow-hidden my-auto"
                >
                  {/* Header */}
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-800 to-[#006064] text-white flex items-center justify-between shrink-0 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-white/10 rounded-xs">
                        <Receipt size={20} className="text-teal-200" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base sm:text-lg text-white">Payment Settlement Details</h3>
                        <p className="text-xs text-teal-100 font-sans">
                          #{viewingPaymentInvoice.srNo} • {viewingPaymentInvoice.companyName} • {viewingPaymentInvoice.billingMonth}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewingPaymentInvoice(null)}
                      className="text-white/70 hover:text-white p-1.5 cursor-pointer transition-colors hover:bg-white/10 rounded"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="p-4 sm:p-6 space-y-5 text-xs text-gray-800 font-sans overflow-y-auto flex-1">
                    {/* Summary Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-50 p-3.5 border border-neutral-200 shadow-2xs">
                      <div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase">Total Invoiced</div>
                        <div className="font-mono font-bold text-sm text-gray-900 mt-0.5">
                          ₹{viewingPaymentInvoice.totalAmount.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase">Total Received</div>
                        <div className="font-mono font-bold text-sm text-emerald-700 mt-0.5">
                          ₹{viewingPaymentInvoice.receiveAmount.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase">Balance Due</div>
                        <div className="font-mono font-bold text-sm text-amber-700 mt-0.5">
                          ₹{viewingPaymentInvoice.balanceAmount.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase">Status</div>
                        <div className="mt-0.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded-xs border ${
                            viewingPaymentInvoice.paymentStatus === 'RECEIVED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : viewingPaymentInvoice.paymentStatus === 'PARTIAL'
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}>
                            {viewingPaymentInvoice.paymentStatus}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Breakdown / Parts */}
                    <div className="space-y-3">
                      <div className="text-xs font-bold uppercase text-gray-700 tracking-wider flex items-center gap-1.5 border-b border-neutral-200 pb-1.5">
                        <CreditCard size={14} className="text-[#006064]" />
                        <span>Recorded Payment Transactions</span>
                      </div>

                      {(() => {
                        let parts: any[] = [];
                        if (viewingPaymentInvoice.paymentsJson) {
                          try {
                            const parsed = JSON.parse(viewingPaymentInvoice.paymentsJson);
                            if (Array.isArray(parsed) && parsed.length > 0) parts = parsed;
                          } catch {}
                        }

                        if (parts.length === 0 && (viewingPaymentInvoice.receiveAmount > 0 || viewingPaymentInvoice.utrNumber)) {
                          parts = [{
                            payReceiveDate: viewingPaymentInvoice.payReceiveDate,
                            receiveAmount: viewingPaymentInvoice.receiveAmount,
                            paymentMode: viewingPaymentInvoice.paymentMode || 'NEFT',
                            utrNumber: viewingPaymentInvoice.utrNumber || 'N/A',
                            utrDate: viewingPaymentInvoice.utrDate,
                            tdsDeducted: viewingPaymentInvoice.tdsDeducted || 'No',
                            tdsAmount: viewingPaymentInvoice.tdsAmount || 0,
                            utrFileUrl: viewingPaymentInvoice.utrFileUrl,
                            utrFileName: viewingPaymentInvoice.utrFileName,
                            remarks: viewingPaymentInvoice.remarks,
                          }];
                        }

                        if (parts.length === 0) {
                          return (
                            <div className="p-4 bg-amber-50/70 border border-amber-200 text-amber-900 text-center rounded-xs">
                              <Clock size={20} className="mx-auto text-amber-600 mb-1" />
                              <p className="font-bold">No payment recorded yet</p>
                              <p className="text-[11px] text-amber-700 mt-0.5">
                                This invoice is currently pending settlement by the accountant.
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-3">
                            {parts.map((p, idx) => (
                              <div key={idx} className="bg-neutral-50/70 border border-neutral-200 p-3.5 space-y-2.5 shadow-2xs">
                                <div className="flex items-center justify-between border-b border-neutral-200 pb-1.5">
                                  <span className="text-xs font-bold text-gray-900">
                                    Part #{idx + 1}
                                  </span>
                                  <span className="font-mono font-bold text-emerald-800 text-sm">
                                    ₹{Number(p.receiveAmount || p.amount || 0).toLocaleString('en-IN')}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 text-[11px]">
                                  <div>
                                    <span className="text-gray-500 font-semibold block text-[10px]">Receive Date</span>
                                    <span className="font-medium text-gray-800">
                                      {p.payReceiveDate ? new Date(p.payReceiveDate).toLocaleDateString('en-IN') : 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 font-semibold block text-[10px]">Payment Mode</span>
                                    <span className="font-medium text-gray-800">{p.paymentMode || 'NEFT'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 font-semibold block text-[10px]">UTR / Ref #</span>
                                    <span className="font-mono font-bold text-gray-900 break-all">{p.utrNumber || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 font-semibold block text-[10px]">TDS Deducted</span>
                                    <span className="font-medium text-gray-800">
                                      {p.tdsDeducted === 'Yes' ? `Yes (₹${Number(p.tdsAmount || 0).toLocaleString('en-IN')})` : 'No'}
                                    </span>
                                  </div>
                                  {p.utrDate && (
                                    <div>
                                      <span className="text-gray-500 font-semibold block text-[10px]">UTR Date</span>
                                      <span className="font-medium text-gray-800">
                                        {new Date(p.utrDate).toLocaleDateString('en-IN')}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {p.remarks && (
                                  <div className="text-[11px] text-gray-600 bg-white p-2 border border-neutral-200">
                                    <span className="font-bold text-gray-500 text-[10px] block">Remarks:</span>
                                    <span>{p.remarks}</span>
                                  </div>
                                )}

                                {p.utrFileUrl && (
                                  <div className="pt-1">
                                    <a
                                      href={p.utrFileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#006064] hover:bg-[#004D40] text-white text-[11px] font-bold rounded-xs transition-colors cursor-pointer shadow-2xs"
                                    >
                                      <Download size={13} />
                                      <span>Download / View Uploaded UTR Proof</span>
                                    </a>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-3 bg-neutral-100 border-t border-neutral-200 flex justify-end shrink-0 shadow-xs">
                    <button
                      type="button"
                      onClick={() => setViewingPaymentInvoice(null)}
                      className="px-4 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-gray-800 text-xs font-bold uppercase tracking-wider rounded-xs cursor-pointer transition-colors shadow-2xs"
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* ── Daily Payment Check History Modal (Mounted in Portal) ── */}
      {mounted &&
        typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {historyInvoice && (
              <div
                onClick={(e) => {
                  if (e.target === e.currentTarget && !savingHistoryCheck) {
                    setHistoryInvoice(null);
                  }
                }}
                className="fixed inset-0 z-[999999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-xs font-sans overflow-y-auto"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 10 }}
                  className="bg-white border border-neutral-300 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col rounded-sm overflow-hidden my-auto"
                >
                  {/* Modal Header */}
                  <div className="px-5 py-3.5 bg-gradient-to-r from-neutral-900 to-[#004D40] text-white flex items-center justify-between shrink-0 shadow-xs">
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-widest text-teal-200 flex items-center gap-1.5">
                        <CalendarCheck2 size={12} />
                        <span>Daily Payment Check Audit History • Super Admin & Accountant Portal</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold uppercase font-display tracking-wide truncate max-w-xl text-white mt-0.5">
                        {historyInvoice.companyName}
                      </h3>
                      <div className="text-xs text-teal-100 flex items-center gap-2 flex-wrap mt-0.5">
                        <span>Billing Cycle: <strong className="text-white">{historyInvoice.billingMonth}</strong></span>
                        <span>•</span>
                        <span>Centre: <strong className="text-white">{historyInvoice.locationName}</strong></span>
                        <span>•</span>
                        <span>
                          Invoice Sum: <strong className="text-white">₹{Number(historyInvoice.totalAmount || 0).toLocaleString('en-IN')}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Balance: <strong className="text-amber-200">₹{Math.max(0, (Number(historyInvoice.totalAmount || 0) - Number(historyInvoice.receiveAmount || 0))).toLocaleString('en-IN')}</strong>
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHistoryInvoice(null)}
                      className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
                      title="Close"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
                    {/* Add / Update Daily Check Form */}
                    <div className="bg-amber-50/60 border border-amber-200 p-3.5 rounded-sm">
                      <div className="flex items-center gap-1.5 text-amber-950 font-bold text-xs mb-2.5">
                        <CalendarDays size={14} className="text-amber-700" />
                        <span>Log or Update Everyday Payment Check</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                        <div className="sm:col-span-4">
                          <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                            Date of Check *
                          </label>
                          <input
                            type="date"
                            value={newHistoryDate}
                            onChange={(e) => setNewHistoryDate(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 focus:outline-none focus:border-[#006064] font-mono font-bold shadow-2xs"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                            Payment Come? *
                          </label>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setNewHistoryStatus('YES')}
                              className={`flex-1 py-1.5 text-xs font-bold transition-all cursor-pointer rounded-xs border text-center ${
                                newHistoryStatus === 'YES'
                                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                                  : 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-300'
                              }`}
                            >
                              ✓ YES
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewHistoryStatus('NO')}
                              className={`flex-1 py-1.5 text-xs font-bold transition-all cursor-pointer rounded-xs border text-center ${
                                newHistoryStatus === 'NO'
                                  ? 'bg-red-600 text-white border-red-700 shadow-xs'
                                  : 'bg-white hover:bg-red-50 text-red-800 border-red-300'
                              }`}
                            >
                              ✗ NO
                            </button>
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                            Remarks / Notes (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Promised by 5 PM"
                            value={newHistoryRemarks}
                            onChange={(e) => setNewHistoryRemarks(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 focus:outline-none focus:border-[#006064] shadow-2xs"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <button
                            type="button"
                            disabled={savingHistoryCheck}
                            onClick={handleSaveHistoryCheck}
                            className="w-full py-1.5 bg-[#006064] hover:bg-[#004D40] text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                          >
                            {savingHistoryCheck ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Check size={12} />
                            )}
                            <span>Save</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* History Entries Table */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-gray-800 font-bold text-xs">
                          <History size={13} className="text-[#006064]" />
                          <span>Audit Trail of All Checked Days</span>
                        </div>
                        <span className="text-[11px] text-gray-500 font-mono">
                          {getInvoiceChecks(historyInvoice.dailyChecksJson).length} logged check(s)
                        </span>
                      </div>

                      <div className="bg-white border border-neutral-200 overflow-hidden shadow-2xs">
                        <div className="overflow-x-auto max-h-[350px]">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead className="sticky top-0 bg-neutral-100 border-b border-neutral-200 text-gray-700 font-bold uppercase tracking-wider text-[9.5px]">
                              <tr>
                                <th className="py-2 px-3">Date</th>
                                <th className="py-2 px-3 text-center">Status</th>
                                <th className="py-2 px-3">Checked By</th>
                                <th className="py-2 px-3">Logged Timestamp</th>
                                <th className="py-2 px-3">Remarks</th>
                                <th className="py-2 px-2 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200 font-sans">
                              {getInvoiceChecks(historyInvoice.dailyChecksJson).length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="p-6 text-center text-gray-400 italic">
                                    No everyday payment checks recorded yet for this invoice.
                                  </td>
                                </tr>
                              ) : (
                                getInvoiceChecks(historyInvoice.dailyChecksJson).map((check, idx) => (
                                  <tr key={`${check.date}-${idx}`} className="hover:bg-neutral-50/80">
                                    <td className="py-2 px-3 font-mono font-bold text-gray-900">
                                      {new Date(check.date).toLocaleDateString('en-IN', {
                                        weekday: 'short',
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                      })}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      {check.status === 'YES' ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px] rounded-xs">
                                          <Check size={10} /> YES (CAME)
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-800 border border-red-300 font-bold text-[10px] rounded-xs">
                                          <X size={10} /> NO (DID NOT COME)
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3">
                                      <div className="font-bold text-gray-900">{check.checkedByName || 'Accountant'}</div>
                                      {check.checkedByEmail && (
                                        <div className="text-[9px] text-gray-500 font-mono">{check.checkedByEmail}</div>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 font-mono text-gray-600 text-[10.5px]">
                                      {check.checkedAt
                                        ? new Date(check.checkedAt).toLocaleString('en-IN', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true,
                                          })
                                        : '—'}
                                    </td>
                                    <td className="py-2 px-3 text-gray-700 italic">
                                      {check.remarks || <span className="text-gray-400 not-italic">—</span>}
                                    </td>
                                    <td className="py-2 px-2 text-right">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteHistoryCheck(check.date)}
                                        className="p-1 text-gray-400 hover:text-red-600 rounded-xs hover:bg-red-50 transition-colors cursor-pointer"
                                        title={`Delete record for ${check.date}`}
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-3 bg-neutral-100 border-t border-neutral-200 flex justify-end shrink-0 shadow-xs">
                    <button
                      type="button"
                      onClick={() => setHistoryInvoice(null)}
                      className="px-4 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-gray-800 text-xs font-bold uppercase tracking-wider rounded-xs cursor-pointer transition-colors shadow-2xs"
                    >
                      Close History
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
