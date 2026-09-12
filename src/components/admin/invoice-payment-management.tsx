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
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { FadeUp } from '@/components/ui/fade-up';
import { OldInvoicesArchive } from '@/components/admin/old-invoices-archive';
import { ManagePaymentModal, type DailyFmsCheckItem } from '@/components/admin/manage-payment-modal';

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

export interface TableInvoiceDraft {
  parts: PaymentPartItem[];
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  saved: boolean;
  errorMessage?: string;
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

  // Manage Payment Modal & Today's Daily FMS Check State
  const [isManagePaymentModalOpen, setIsManagePaymentModalOpen] = useState<boolean>(false);
  const [todayFmsCheck, setTodayFmsCheck] = useState<DailyFmsCheckItem | null>(null);

  // Excel-Style Per-Column Filters
  const [colFilterSrNo, setColFilterSrNo] = useState<string>('');
  const [colFilterClient, setColFilterClient] = useState<string>('');
  const [colFilterCentre, setColFilterCentre] = useState<string>('');
  const [colFilterMonth, setColFilterMonth] = useState<string>('');
  const [colFilterInvSum, setColFilterInvSum] = useState<string>('');
  const [colFilterReceived, setColFilterReceived] = useState<string>('');
  const [colFilterBalance, setColFilterBalance] = useState<string>('');
  const [colFilterStatus, setColFilterStatus] = useState<string>('');
  const [colFilterPayDate, setColFilterPayDate] = useState<string>('');
  const [colFilterMode, setColFilterMode] = useState<string>('');
  const [colFilterUtr, setColFilterUtr] = useState<string>('');
  const [colFilterUtrDate, setColFilterUtrDate] = useState<string>('');
  const [colFilterTds, setColFilterTds] = useState<string>('');
  const [colFilterTdsAmt, setColFilterTdsAmt] = useState<string>('');
  const [colFilterPdf, setColFilterPdf] = useState<string>('');
  const [colFilterUtrSlip, setColFilterUtrSlip] = useState<string>('');
  const [colFilterRemarks, setColFilterRemarks] = useState<string>('');

  const hasActiveColFilters = useMemo(() => {
    return Boolean(
      colFilterSrNo ||
      colFilterClient ||
      colFilterCentre ||
      colFilterMonth ||
      colFilterInvSum ||
      colFilterReceived ||
      colFilterBalance ||
      colFilterStatus ||
      colFilterPayDate ||
      colFilterMode ||
      colFilterUtr ||
      colFilterUtrDate ||
      colFilterTds ||
      colFilterTdsAmt ||
      colFilterPdf ||
      colFilterUtrSlip ||
      colFilterRemarks
    );
  }, [
    colFilterSrNo,
    colFilterClient,
    colFilterCentre,
    colFilterMonth,
    colFilterInvSum,
    colFilterReceived,
    colFilterBalance,
    colFilterStatus,
    colFilterPayDate,
    colFilterMode,
    colFilterUtr,
    colFilterUtrDate,
    colFilterTds,
    colFilterTdsAmt,
    colFilterPdf,
    colFilterUtrSlip,
    colFilterRemarks,
  ]);

  const handleClearAllColFilters = () => {
    setColFilterSrNo('');
    setColFilterClient('');
    setColFilterCentre('');
    setColFilterMonth('');
    setColFilterInvSum('');
    setColFilterReceived('');
    setColFilterBalance('');
    setColFilterStatus('');
    setColFilterPayDate('');
    setColFilterMode('');
    setColFilterUtr('');
    setColFilterUtrDate('');
    setColFilterTds('');
    setColFilterTdsAmt('');
    setColFilterPdf('');
    setColFilterUtrSlip('');
    setColFilterRemarks('');
  };

  const fetchTodayFmsCheck = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/invoice-payments/daily-fms-check');
      const data = await res.json();
      if (res.ok && data.success) {
        setTodayFmsCheck(data.todayCheck || null);
      }
    } catch (err) {
      console.warn('Failed to load today FMS check:', err);
    }
  }, []);

  useEffect(() => {
    fetchTodayFmsCheck();
  }, [fetchTodayFmsCheck]);

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

  // Track expanded invoice rows for multi-installment payments
  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState<Record<number, boolean>>({});
  const toggleExpandInvoice = useCallback((id: number) => {
    setExpandedInvoiceIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  // ── INLINE TABLE DIRECT ENTRY & AUTO-SAVE STATE ──
  const [tableDrafts, setTableDrafts] = useState<Record<number, TableInvoiceDraft>>({});
  const autoSaveTimeoutsRef = useRef<Record<number, NodeJS.Timeout>>({});
  const [activeTableUploadInvId, setActiveTableUploadInvId] = useState<number | null>(null);
  const [activeTableUploadPartId, setActiveTableUploadPartId] = useState<string | null>(null);

  // Initialize and sync tableDrafts from invoices
  useEffect(() => {
    if (invoices.length === 0) return;
    setTableDrafts((prev) => {
      const next: Record<number, TableInvoiceDraft> = { ...prev };
      invoices.forEach((inv) => {
        if (!next[inv.id]) {
          let initialParts: PaymentPartItem[] = [];
          if (inv.paymentsJson) {
            try {
              const parsed = JSON.parse(inv.paymentsJson);
              if (Array.isArray(parsed) && parsed.length > 0) {
                initialParts = parsed.map((p: any, idx: number) => ({
                  id: p.id || `part_${idx + 1}`,
                  payReceiveDate: p.payReceiveDate ? String(p.payReceiveDate).split('T')[0] : '',
                  receiveAmount:
                    p.receiveAmount !== undefined && p.receiveAmount !== null
                      ? String(p.receiveAmount)
                      : p.amount !== undefined
                      ? String(p.amount)
                      : '',
                  paymentMode: p.paymentMode || p.mode || 'NEFT',
                  utrNumber: p.utrNumber || '',
                  utrDate: p.utrDate ? String(p.utrDate).split('T')[0] : '',
                  tdsDeducted:
                    p.tdsDeducted === 'Yes' || p.tdsDeducted === '10'
                      ? p.tdsDeducted || '10'
                      : p.tdsDeducted || 'No',
                  tdsAmount:
                    p.tdsAmount !== undefined && p.tdsAmount !== null ? String(p.tdsAmount) : '0',
                  utrFileUrl: p.utrFileUrl || null,
                  utrFileName: p.utrFileName || null,
                  remarks: p.remarks || '',
                }));
              }
            } catch {}
          }

          if (initialParts.length === 0 && Number(inv.receiveAmount || 0) > 0) {
            initialParts.push({
              id: 'part_1',
              payReceiveDate: inv.payReceiveDate ? String(inv.payReceiveDate).split('T')[0] : '',
              receiveAmount: String(inv.receiveAmount),
              paymentMode: inv.paymentMode || 'NEFT',
              utrNumber: inv.utrNumber || '',
              utrDate: inv.utrDate ? String(inv.utrDate).split('T')[0] : '',
              tdsDeducted: inv.tdsDeducted || 'No',
              tdsAmount:
                inv.tdsAmount !== undefined && inv.tdsAmount !== null ? String(inv.tdsAmount) : '0',
              utrFileUrl: inv.utrFileUrl || null,
              utrFileName: inv.utrFileName || null,
              remarks: inv.remarks || '',
            });
          }

          if (initialParts.length === 0) {
            initialParts.push({
              id: 'part_1',
              payReceiveDate: '',
              receiveAmount: '',
              paymentMode: 'NEFT',
              utrNumber: '',
              utrDate: '',
              tdsDeducted: 'No',
              tdsAmount: '0',
              utrFileUrl: null,
              utrFileName: null,
              remarks: '',
            });
          }

          next[inv.id] = {
            parts: initialParts,
            autoSaveStatus: 'idle',
            saved: false,
          };
        }
      });
      return next;
    });
  }, [invoices]);

  const performAutoSave = useCallback(
    async (invId: number, draft: TableInvoiceDraft) => {
      const inv = invoices.find((i) => i.id === invId);
      if (!inv) return;

      const invTotal = Number(inv.totalAmount || 0);
      const validParts = draft.parts.filter(
        (p) => (parseFloat(p.receiveAmount) || 0) > 0 || p.payReceiveDate || p.utrNumber.trim()
      );

      if (validParts.length === 0) return;

      let totalRecordedRec = 0;
      let totalRecordedTds = 0;
      validParts.forEach((p) => {
        totalRecordedRec += parseFloat(p.receiveAmount) || 0;
        totalRecordedTds += parseFloat(p.tdsAmount) || 0;
      });

      if (totalRecordedRec > invTotal && invTotal > 0) {
        setTableDrafts((prev) => ({
          ...prev,
          [invId]: {
            ...prev[invId],
            autoSaveStatus: 'error',
            errorMessage: `Total parts exceed invoice sum`,
          },
        }));
        toast.error(`Total parts exceed invoice sum of ₹${invTotal.toLocaleString('en-IN')}`);
        return;
      }

      setTableDrafts((prev) => ({
        ...prev,
        [invId]: { ...prev[invId], autoSaveStatus: 'saving', errorMessage: undefined },
      }));

      const isFullSettlement = totalRecordedRec >= invTotal && invTotal > 0;
      const calculatedStatus = isFullSettlement
        ? 'RECEIVED'
        : totalRecordedRec > 0
        ? 'PARTIAL'
        : 'PENDING';

      const latestPart = validParts[validParts.length - 1] || validParts[0];
      const combinedUtr = validParts.map((p) => (p.utrNumber || '').trim()).filter(Boolean).join(', ');
      const combinedRemarks = validParts.map((p) => (p.remarks || '').trim()).filter(Boolean).join(' | ');
      const primaryFile = validParts.find((p) => p.utrFileUrl)?.utrFileUrl || null;
      const primaryFileName = validParts.find((p) => p.utrFileName)?.utrFileName || null;

      const payload = {
        payReceiveDate: latestPart?.payReceiveDate ? new Date(latestPart.payReceiveDate).toISOString() : null,
        receiveAmount: totalRecordedRec,
        paymentMode: latestPart?.paymentMode || 'NEFT',
        utrNumber: combinedUtr || null,
        utrDate: latestPart?.utrDate
          ? new Date(latestPart.utrDate).toISOString()
          : latestPart?.payReceiveDate
          ? new Date(latestPart.payReceiveDate).toISOString()
          : null,
        utrFileUrl: primaryFile,
        utrFileName: primaryFileName,
        tdsDeducted: validParts.some((p) => p.tdsDeducted !== 'No') ? 'Yes' : 'No',
        tdsAmount: totalRecordedTds,
        paymentsJson: JSON.stringify(validParts),
        remarks: combinedRemarks || null,
        paymentStatus: calculatedStatus,
      };

      try {
        const res = await fetch(`/api/admin/invoice-payments/${inv.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to auto-save payment');
        }

        const updatedInv: LiveApprovedInvoice = {
          ...inv,
          ...payload,
          receiveAmount: totalRecordedRec,
          tdsAmount: totalRecordedTds,
          paymentStatus: calculatedStatus,
          balanceAmount: Math.max(0, invTotal - totalRecordedRec),
        };

        setInvoices((prev) => prev.map((item) => (item.id === inv.id ? updatedInv : item)));

        setTableDrafts((prev) => ({
          ...prev,
          [invId]: {
            ...prev[invId],
            autoSaveStatus: 'saved',
            saved: true,
          },
        }));
      } catch (err: any) {
        console.error('Auto-save failed:', err);
        setTableDrafts((prev) => ({
          ...prev,
          [invId]: {
            ...prev[invId],
            autoSaveStatus: 'error',
            errorMessage: err.message,
          },
        }));
        toast.error(`Auto-save error: ${err.message}`);
      }
    },
    [invoices]
  );

  const updateDraftField = useCallback(
    (invId: number, partId: string, field: keyof PaymentPartItem, value: any) => {
      setTableDrafts((prev) => {
        const current = prev[invId];
        if (!current) return prev;
        const updatedParts = current.parts.map((p) => {
          if (p.id !== partId) return p;
          return { ...p, [field]: value };
        });

        const updatedDraft: TableInvoiceDraft = {
          ...current,
          parts: updatedParts,
          autoSaveStatus: 'idle',
        };

        if (autoSaveTimeoutsRef.current[invId]) {
          clearTimeout(autoSaveTimeoutsRef.current[invId]);
        }
        autoSaveTimeoutsRef.current[invId] = setTimeout(() => {
          performAutoSave(invId, updatedDraft);
        }, 1200);

        return {
          ...prev,
          [invId]: updatedDraft,
        };
      });
    },
    [performAutoSave]
  );

  const handleBlurSave = useCallback(
    (invId: number) => {
      if (autoSaveTimeoutsRef.current[invId]) {
        clearTimeout(autoSaveTimeoutsRef.current[invId]);
      }
      const draft = tableDrafts[invId];
      if (draft) {
        performAutoSave(invId, draft);
      }
    },
    [tableDrafts, performAutoSave]
  );

  const handleAddTablePart = useCallback((invId: number) => {
    setTableDrafts((prev) => {
      const current = prev[invId];
      if (!current) return prev;
      const newPart: PaymentPartItem = {
        id: `part_${Date.now()}`,
        payReceiveDate: '',
        receiveAmount: '',
        paymentMode: 'NEFT',
        utrNumber: '',
        utrDate: '',
        tdsDeducted: 'No',
        tdsAmount: '0',
        utrFileUrl: null,
        utrFileName: null,
        remarks: '',
      };
      return {
        ...prev,
        [invId]: {
          ...current,
          parts: [...current.parts, newPart],
        },
      };
    });
    setExpandedInvoiceIds((prev) => ({
      ...prev,
      [invId]: true,
    }));
  }, []);

  const handleRemoveTablePart = useCallback(
    (invId: number, partId: string) => {
      setTableDrafts((prev) => {
        const current = prev[invId];
        if (!current) return prev;
        const remaining = current.parts.filter((p) => p.id !== partId);
        if (remaining.length === 0) return prev;
        const updatedDraft: TableInvoiceDraft = {
          ...current,
          parts: remaining,
        };
        performAutoSave(invId, updatedDraft);
        return {
          ...prev,
          [invId]: updatedDraft,
        };
      });
    },
    [performAutoSave]
  );

  const handleTriggerTableUpload = (invId: number, partId: string) => {
    setActiveTableUploadInvId(invId);
    setActiveTableUploadPartId(partId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

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

  // Automatically hide left navigation sidebar when payment settlement modal, details modal, history modal, or manage payment modal is open
  useEffect(() => {
    if (editingInvoice || viewingPaymentInvoice || historyInvoice || isManagePaymentModalOpen) {
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
  }, [editingInvoice, viewingPaymentInvoice, historyInvoice, isManagePaymentModalOpen]);

  // Distinct Centres & Months from current invoice data for Excel-type column filters
  const distinctCentres = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((inv) => {
      if (inv.locationName) set.add(inv.locationName);
    });
    return Array.from(set).sort();
  }, [invoices]);

  const distinctMonths = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((inv) => {
      if (inv.billingMonth) set.add(inv.billingMonth);
    });
    return Array.from(set).sort();
  }, [invoices]);

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
      fetchTodayFmsCheck();
    }
  }, [selectedMonth, selectedLocation, selectedStatus, searchQuery, fetchTodayFmsCheck]);

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

  // Filtered & Sorted Invoices calculation (applying global filters + Excel-style column filters)
  const sortedInvoices = useMemo(() => {
    const filtered = invoices.filter((inv) => {
      // Sr No filter
      if (colFilterSrNo.trim()) {
        const srVal = String(inv.srNo || '').toLowerCase();
        if (!srVal.includes(colFilterSrNo.trim().toLowerCase())) return false;
      }

      // Corporate Client filter
      if (colFilterClient.trim()) {
        const q = colFilterClient.trim().toLowerCase();
        const matchesClient =
          (inv.companyName || '').toLowerCase().includes(q) ||
          (inv.cabinName || '').toLowerCase().includes(q) ||
          (inv.gstNo || '').toLowerCase().includes(q);
        if (!matchesClient) return false;
      }

      // Centre filter
      if (colFilterCentre && colFilterCentre !== 'ALL') {
        if ((inv.locationName || '').toLowerCase() !== colFilterCentre.toLowerCase()) return false;
      }

      // Month filter
      if (colFilterMonth && colFilterMonth !== 'ALL') {
        if ((inv.billingMonth || '').toLowerCase() !== colFilterMonth.toLowerCase()) return false;
      }

      // Invoice Sum filter
      if (colFilterInvSum.trim()) {
        const amtStr = String(inv.totalAmount || '');
        if (!amtStr.includes(colFilterInvSum.trim())) return false;
      }

      // Received filter
      if (colFilterReceived.trim()) {
        const recStr = String(inv.receiveAmount || 0);
        if (!recStr.includes(colFilterReceived.trim())) return false;
      }

      // Balance Due filter
      if (colFilterBalance.trim()) {
        const bal = Math.max(0, (inv.totalAmount || 0) - (inv.receiveAmount || 0));
        const balStr = String(bal);
        if (!balStr.includes(colFilterBalance.trim())) return false;
      }

      // Status filter
      if (colFilterStatus && colFilterStatus !== 'ALL') {
        const recAmt = Number(inv.receiveAmount || 0);
        const invAmt = Number(inv.totalAmount || 0);
        const isSettled = inv.paymentStatus === 'RECEIVED' || (recAmt >= invAmt && invAmt > 0);
        const isPartial = !isSettled && recAmt > 0;
        const currentStatus = isSettled ? 'RECEIVED' : isPartial ? 'PARTIAL' : 'PENDING';

        if (currentStatus !== colFilterStatus) return false;
      }

      // Payment Receive Date filter
      if (colFilterPayDate.trim()) {
        const q = colFilterPayDate.trim().toLowerCase();
        const dateStr = inv.payReceiveDate ? new Date(inv.payReceiveDate).toLocaleDateString('en-IN') : '';
        if (!dateStr.toLowerCase().includes(q) && !(inv.payReceiveDate || '').toLowerCase().includes(q)) return false;
      }

      // Payment Mode filter
      if (colFilterMode && colFilterMode !== 'ALL') {
        if ((inv.paymentMode || '').toLowerCase() !== colFilterMode.toLowerCase()) return false;
      }

      // UTR / Reference Number filter
      if (colFilterUtr.trim()) {
        const q = colFilterUtr.trim().toLowerCase();
        if (!(inv.utrNumber || '').toLowerCase().includes(q)) return false;
      }

      // UTR Date filter
      if (colFilterUtrDate.trim()) {
        const q = colFilterUtrDate.trim().toLowerCase();
        const dateStr = inv.utrDate ? new Date(inv.utrDate).toLocaleDateString('en-IN') : '';
        if (!dateStr.toLowerCase().includes(q) && !(inv.utrDate || '').toLowerCase().includes(q)) return false;
      }

      // TDS Deducted filter
      if (colFilterTds && colFilterTds !== 'ALL') {
        const isTds = inv.tdsDeducted === 'Yes';
        if (colFilterTds === 'YES' && !isTds) return false;
        if (colFilterTds === 'NO' && isTds) return false;
      }

      // TDS Amount filter
      if (colFilterTdsAmt.trim()) {
        const tdsStr = String(inv.tdsAmount || 0);
        if (!tdsStr.includes(colFilterTdsAmt.trim())) return false;
      }

      // Tally PDF filter
      if (colFilterPdf && colFilterPdf !== 'ALL') {
        if (colFilterPdf === 'WITH_PDF' && !inv.attachedPdfUrl) return false;
        if (colFilterPdf === 'NO_PDF' && inv.attachedPdfUrl) return false;
      }

      // Bank Advice / UTR Slip filter
      if (colFilterUtrSlip && colFilterUtrSlip !== 'ALL') {
        if (colFilterUtrSlip === 'WITH_SLIP' && !inv.utrFileUrl) return false;
        if (colFilterUtrSlip === 'NO_SLIP' && inv.utrFileUrl) return false;
      }

      // Settlement Notes / Remarks filter
      if (colFilterRemarks.trim()) {
        const q = colFilterRemarks.trim().toLowerCase();
        if (!(inv.remarks || '').toLowerCase().includes(q)) return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
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
  }, [
    invoices,
    sortBy,
    sortOrder,
    colFilterSrNo,
    colFilterClient,
    colFilterCentre,
    colFilterMonth,
    colFilterInvSum,
    colFilterReceived,
    colFilterBalance,
    colFilterStatus,
    colFilterUtr,
    colFilterPdf,
    colFilterUtrSlip,
  ]);

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
                : '',
              receiveAmount:
                p.receiveAmount !== undefined && p.receiveAmount !== null
                  ? String(p.receiveAmount)
                  : p.amount !== undefined
                  ? String(p.amount)
                  : '',
              paymentMode: p.paymentMode || p.mode || 'NEFT',
              utrNumber: p.utrNumber || '',
              utrDate: p.utrDate ? String(p.utrDate).split('T')[0] : '',
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

    // If an existing single payment was already recorded in the past
    const hasRecordedPayment =
      (invoice.receiveAmount !== null && invoice.receiveAmount !== undefined && invoice.receiveAmount > 0) ||
      Boolean(invoice.payReceiveDate) ||
      Boolean(invoice.utrNumber);

    if (hasRecordedPayment) {
      setPaymentParts([
        {
          id: `part_${Date.now()}`,
          payReceiveDate: invoice.payReceiveDate
            ? String(invoice.payReceiveDate).split('T')[0]
            : '',
          receiveAmount:
            invoice.receiveAmount && invoice.receiveAmount > 0
              ? String(invoice.receiveAmount)
              : '',
          paymentMode: invoice.paymentMode || 'NEFT',
          utrNumber: invoice.utrNumber || '',
          utrDate: invoice.utrDate ? String(invoice.utrDate).split('T')[0] : '',
          tdsDeducted: invoice.tdsDeducted || 'No',
          tdsAmount: invoice.tdsAmount ? String(invoice.tdsAmount) : '0',
          utrFileUrl: invoice.utrFileUrl || null,
          utrFileName: invoice.utrFileName || null,
          remarks: invoice.remarks || '',
        },
      ]);
      return;
    }

    // Clean blank 1st entry for pending settlement (NEVER pre-fill dates or invoice amount)
    setPaymentParts([
      {
        id: `part_${Date.now()}`,
        payReceiveDate: '',
        receiveAmount: '',
        paymentMode: 'NEFT',
        utrNumber: '',
        utrDate: '',
        tdsDeducted: 'No',
        tdsAmount: '0',
        utrFileUrl: null,
        utrFileName: null,
        remarks: '',
      },
    ]);
  };

  // Add Another Payment Receive Entry / Part
  const handleAddPaymentPart = () => {
    if (!editingInvoice) return;

    const newPart: PaymentPartItem = {
      id: `part_${Date.now()}`,
      payReceiveDate: '',
      receiveAmount: '',
      paymentMode: 'NEFT',
      utrNumber: '',
      utrDate: '',
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

  // Handle uploaded file for a specific Payment Part (both modal and inline table)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || (!activeUploadPartId && !activeTableUploadPartId)) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error('File size exceeds maximum limit of 25MB');
      return;
    }

    if (activeUploadPartId) {
      setPaymentParts((prev) =>
        prev.map((p) => (p.id === activeUploadPartId ? { ...p, uploading: true } : p))
      );
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/upload-pdf', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        if (activeTableUploadInvId && activeTableUploadPartId) {
          updateDraftField(activeTableUploadInvId, activeTableUploadPartId, 'utrFileUrl', data.url);
          updateDraftField(activeTableUploadInvId, activeTableUploadPartId, 'utrFileName', file.name);
          const savedInvId = activeTableUploadInvId;
          setTimeout(() => {
            handleBlurSave(savedInvId);
          }, 150);
        } else if (activeUploadPartId) {
          setPaymentParts((prev) =>
            prev.map((p) =>
              p.id === activeUploadPartId
                ? { ...p, utrFileUrl: data.url, utrFileName: file.name, uploading: false }
                : p
            )
          );
        }
        toast.success('Bank advice / UTR receipt uploaded');
      } else {
        toast.error(data.error || 'Failed to upload receipt');
        if (activeUploadPartId) {
          setPaymentParts((prev) =>
            prev.map((p) => (p.id === activeUploadPartId ? { ...p, uploading: false } : p))
          );
        }
      }
    } catch (err: any) {
      toast.error('Network error uploading file');
      if (activeUploadPartId) {
        setPaymentParts((prev) =>
          prev.map((p) => (p.id === activeUploadPartId ? { ...p, uploading: false } : p))
        );
      }
    } finally {
      setActiveUploadPartId(null);
      setActiveTableUploadInvId(null);
      setActiveTableUploadPartId(null);
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

    const hasAnyInput =
      totalRecordedRec > 0 ||
      paymentParts.some(
        (p) => Boolean(p.payReceiveDate) || Boolean(p.utrNumber.trim()) || (parseFloat(p.receiveAmount) || 0) > 0
      );

    if (!hasAnyInput) {
      toast.error('Please enter payment receive date, received amount, or UTR details before saving');
      return;
    }

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
            {/* Manage Payment Button (Accountant / Super Admin) */}
            {userRoleView !== 'CM' && (
              <button
                type="button"
                onClick={() => setIsManagePaymentModalOpen(true)}
                className="px-3.5 py-1.5 bg-[#006064] hover:bg-[#004D40] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-xs border border-[#004D40] cursor-pointer transition-all hover:shadow-sm"
              >
                <CreditCard size={14} className="text-cyan-200" />
                <span>Manage Payment</span>
                {todayFmsCheck && (
                  <span
                    className={`text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded-xs flex items-center gap-1 ${
                      todayFmsCheck.status === 'YES'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-neutral-600 text-white'
                    }`}
                  >
                    <Check size={10} />
                    {todayFmsCheck.status}
                  </span>
                )}
              </button>
            )}
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
            <div className="bg-white border border-neutral-300 shadow-xs">
              {/* Active Excel Column Filters Indicator */}
              {hasActiveColFilters && (
                <div className="px-3 py-1.5 bg-cyan-50/90 border-b border-cyan-200 flex items-center justify-between text-xs text-cyan-900 font-sans">
                  <div className="flex items-center gap-1.5">
                    <Filter size={12} className="text-cyan-700" />
                    <span className="font-semibold">Excel Column Filters Active:</span>
                    <span className="font-mono text-[11px] font-bold">
                      Showing {sortedInvoices.length} of {invoices.length} records
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearAllColFilters}
                    className="text-[11px] font-bold text-cyan-800 hover:text-cyan-950 underline cursor-pointer"
                  >
                    Clear all column filters
                  </button>
                </div>
              )}

              {/* Scrollable container with frozen headers */}
              <div className="overflow-auto max-h-[72vh] relative">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-20 bg-neutral-100 shadow-[0_2px_4px_rgba(0,0,0,0.06)] border-b border-neutral-300">
                    {/* Row 1: Sortable Column Headers */}
                    <tr className="bg-neutral-100 border-b border-neutral-300 text-neutral-800 font-bold uppercase tracking-wider text-[10px]">
                      <th
                        onClick={() => handleToggleSort('srNo')}
                        className="py-2.5 px-2 w-10 text-center cursor-pointer select-none hover:bg-neutral-200/70 border-r border-neutral-200"
                        title="Click to sort by Sr. No"
                      >
                        SR. {sortBy === 'srNo' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th
                        onClick={() => handleToggleSort('companyName')}
                        className="py-2.5 px-2.5 min-w-[170px] cursor-pointer select-none hover:bg-neutral-200/70 border-r border-neutral-200"
                        title="Click to sort by Corporate Client"
                      >
                        Corporate Client {sortBy === 'companyName' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th className="py-2.5 px-2 min-w-[95px] border-r border-neutral-200">Centre</th>
                      <th
                        onClick={() => handleToggleSort('billingMonth')}
                        className="py-2.5 px-2.5 min-w-[105px] cursor-pointer select-none hover:bg-neutral-200/70 border-r border-neutral-200"
                        title="Click to sort by Billing Cycle"
                      >
                        Billing Cycle {sortBy === 'billingMonth' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th
                        onClick={() => handleToggleSort('totalAmount')}
                        className="py-2.5 px-2 text-right min-w-[100px] cursor-pointer select-none hover:bg-neutral-200/70 border-r border-neutral-200"
                        title="Click to sort by Invoice Sum"
                      >
                        Invoice Sum {sortBy === 'totalAmount' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th
                        onClick={() => handleToggleSort('balanceAmount')}
                        className="py-2.5 px-2 text-right min-w-[100px] cursor-pointer select-none hover:bg-neutral-200/70 border-r border-neutral-200"
                        title="Click to sort by Balance Due"
                      >
                        Balance Due {sortBy === 'balanceAmount' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th className="py-2.5 px-2 text-center min-w-[85px] border-r border-neutral-200">Status</th>
                      <th className="py-2.5 px-2 text-center min-w-[65px] border-r border-neutral-200">Tally PDF</th>

                      {/* ── Accountant Payment Settlement Details (Right Side with Dedicated Headers) ── */}
                      <th className="py-2.5 px-2 min-w-[130px] bg-emerald-50/70 border-r border-neutral-200 text-emerald-950 font-bold">
                        Payment Receive Date
                      </th>
                      <th
                        onClick={() => handleToggleSort('receiveAmount')}
                        className="py-2.5 px-2 text-right min-w-[125px] cursor-pointer select-none hover:bg-emerald-100/70 bg-emerald-50/70 border-r border-neutral-200 text-emerald-950 font-bold"
                        title="Click to sort by Received Amount"
                      >
                        Received Amt (₹) {sortBy === 'receiveAmount' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th className="py-2.5 px-2 min-w-[105px] bg-emerald-50/70 border-r border-neutral-200 text-emerald-950 font-bold">
                        UTR / Mode
                      </th>
                      <th className="py-2.5 px-2 min-w-[165px] bg-emerald-50/70 border-r border-neutral-200 text-emerald-950 font-bold">
                        UTR / Reference Number
                      </th>
                      <th className="py-2.5 px-2 min-w-[130px] bg-emerald-50/70 border-r border-neutral-200 text-emerald-950 font-bold">
                        UTR Date
                      </th>
                      <th className="py-2.5 px-2 min-w-[105px] bg-emerald-50/70 border-r border-neutral-200 text-emerald-950 font-bold">
                        TDS Deducted?
                      </th>
                      <th className="py-2.5 px-2 text-right min-w-[95px] bg-emerald-50/70 border-r border-neutral-200 text-emerald-950 font-bold">
                        TDS Amount
                      </th>
                      <th className="py-2.5 px-2 min-w-[140px] text-center bg-emerald-50/70 border-r border-neutral-200 text-emerald-950 font-bold">
                        Bank Advice / UTR Receipt
                      </th>
                      <th className="py-2.5 px-2.5 min-w-[160px] bg-emerald-50/70 text-emerald-950 font-bold">
                        Settlement Notes / Remarks
                      </th>
                    </tr>

                    {/* Row 2: Excel-Style Column Filters */}
                    <tr className="bg-neutral-50/95 border-b border-neutral-300 text-[10px] font-sans">
                      {/* SR. Filter */}
                      <th className="p-1 text-center bg-neutral-100/90 border-r border-neutral-200">
                        <input
                          type="text"
                          value={colFilterSrNo}
                          onChange={(e) => setColFilterSrNo(e.target.value)}
                          placeholder="No."
                          className="w-full text-center px-1 py-0.5 text-[10px] font-mono bg-white border border-neutral-300 rounded-2xs focus:outline-none focus:border-[#006064]"
                        />
                      </th>
                      {/* Client Filter */}
                      <th className="p-1 bg-neutral-100/90 border-r border-neutral-200">
                        <input
                          type="text"
                          value={colFilterClient}
                          onChange={(e) => setColFilterClient(e.target.value)}
                          placeholder="Filter Client..."
                          className="w-full px-1.5 py-0.5 text-[10px] bg-white border border-neutral-300 rounded-2xs focus:outline-none focus:border-[#006064]"
                        />
                      </th>
                      {/* Centre Filter */}
                      <th className="p-1 bg-neutral-100/90 border-r border-neutral-200">
                        <select
                          value={colFilterCentre}
                          onChange={(e) => setColFilterCentre(e.target.value)}
                          className="w-full px-1 py-0.5 text-[10px] bg-white border border-neutral-300 rounded-2xs focus:outline-none focus:border-[#006064] cursor-pointer"
                        >
                          <option value="">All</option>
                          {distinctCentres.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </th>
                      {/* Month Filter */}
                      <th className="p-1 bg-neutral-100/90 border-r border-neutral-200">
                        <select
                          value={colFilterMonth}
                          onChange={(e) => setColFilterMonth(e.target.value)}
                          className="w-full px-1 py-0.5 text-[10px] bg-white border border-neutral-300 rounded-2xs focus:outline-none focus:border-[#006064] cursor-pointer"
                        >
                          <option value="">All</option>
                          {distinctMonths.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </th>
                      {/* Invoice Sum Filter */}
                      <th className="p-1 bg-neutral-100/90 border-r border-neutral-200">
                        <input
                          type="text"
                          value={colFilterInvSum}
                          onChange={(e) => setColFilterInvSum(e.target.value)}
                          placeholder="₹..."
                          className="w-full text-right px-1 py-0.5 text-[10px] font-mono bg-white border border-neutral-300 rounded-2xs focus:outline-none focus:border-[#006064]"
                        />
                      </th>
                      {/* Balance Filter */}
                      <th className="p-1 bg-neutral-100/90 border-r border-neutral-200">
                        <input
                          type="text"
                          value={colFilterBalance}
                          onChange={(e) => setColFilterBalance(e.target.value)}
                          placeholder="₹..."
                          className="w-full text-right px-1 py-0.5 text-[10px] font-mono bg-white border border-neutral-300 rounded-2xs focus:outline-none focus:border-[#006064]"
                        />
                      </th>
                      {/* Status Filter */}
                      <th className="p-1 bg-neutral-100/90 border-r border-neutral-200">
                        <select
                          value={colFilterStatus}
                          onChange={(e) => setColFilterStatus(e.target.value)}
                          className="w-full px-1 py-0.5 text-[10px] bg-white border border-neutral-300 rounded-2xs focus:outline-none focus:border-[#006064] cursor-pointer"
                        >
                          <option value="">All</option>
                          <option value="RECEIVED">Received</option>
                          <option value="PARTIAL">Partial</option>
                          <option value="PENDING">Pending</option>
                        </select>
                      </th>
                      {/* Tally PDF Filter */}
                      <th className="p-1 text-center bg-neutral-100/90 border-r border-neutral-200">
                        <select
                          value={colFilterPdf}
                          onChange={(e) => setColFilterPdf(e.target.value)}
                          className="w-full px-1 py-0.5 text-[10px] bg-white border border-neutral-300 rounded-2xs focus:outline-none focus:border-[#006064] cursor-pointer"
                        >
                          <option value="">All</option>
                          <option value="WITH_PDF">PDF</option>
                          <option value="NO_PDF">None</option>
                        </select>
                      </th>

                      {/* ── Accountant Payment Settlement Filters ── */}
                      {/* Payment Receive Date Filter */}
                      <th className="p-1 bg-emerald-50/60 border-r border-neutral-200">
                        <input
                          type="text"
                          value={colFilterPayDate}
                          onChange={(e) => setColFilterPayDate(e.target.value)}
                          placeholder="Date..."
                          className="w-full px-1 py-0.5 text-[10px] font-mono bg-white border border-neutral-300 rounded-2xs focus:outline-none focus:border-emerald-600"
                        />
                      </th>
                      {/* Received Amount Filter */}
                      <th className="p-1 bg-emerald-50/60 border-r border-neutral-200">
                        <input
                          type="text"
                          value={colFilterReceived}
                          onChange={(e) => setColFilterReceived(e.target.value)}
                          placeholder="₹..."
                          className="w-full text-right px-1 py-0.5 text-[10px] font-mono bg-white border border-neutral-300 rounded-2xs focus:outline-none focus:border-emerald-600"
                        />
                      </th>
                      {/* Mode Filter */}
                      <th className="p-1 bg-emerald-50/60 border-r border-neutral-200">
                        <select
                          value={colFilterMode}
                          onChange={(e) => setColFilterMode(e.target.value)}
                          className="w-full px-1 py-0.5 text-[10px] bg-white border border-neutral-300 rounded-2xs focus:outline-none focus:border-emerald-600 cursor-pointer"
                        >
                          <option value="">All</option>
                          <option value="NEFT">NEFT</option>
                          <option value="RTGS">RTGS</option>
                          <option value="IMPS">IMPS</option>
                          <option value="UPI">UPI</option>
                          <option value="Cheque">Cheque</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="Cash">Cash</option>
                        </select>
                      </th>
                      {/* UTR / Reference Number Filter */}
                      <th className="p-1 bg-emerald-50/60 border-r border-neutral-200">
                        <input
                          type="text"
                          value={colFilterUtr}
                          onChange={(e) => setColFilterUtr(e.target.value)}
                          placeholder="Filter UTR..."
                          className="w-full px-1.5 py-0.5 text-[10px] font-mono bg-white border border-neutral-300 rounded-2xs focus:outline-none focus:border-emerald-600"
                        />
                      </th>
                      {/* UTR Date Filter */}
                      <th className="p-1 bg-emerald-50/60 border-r border-neutral-200">
                        <input
                          type="text"
                          value={colFilterUtrDate}
                          onChange={(e) => setColFilterUtrDate(e.target.value)}
                          placeholder="Date..."
                          className="w-full px-1 py-0.5 text-[10px] font-mono bg-white border border-neutral-300 rounded-2xs focus:outline-none focus:border-emerald-600"
                        />
                      </th>
                      {/* TDS Deducted Filter */}
                      <th className="p-1 bg-emerald-50/60 border-r border-neutral-200">
                        <select
                          value={colFilterTds}
                          onChange={(e) => setColFilterTds(e.target.value)}
                          className="w-full px-1 py-0.5 text-[10px] bg-white border border-neutral-300 rounded-2xs focus:outline-none focus:border-emerald-600 cursor-pointer"
                        >
                          <option value="">All</option>
                          <option value="YES">Yes TDS</option>
                          <option value="NO">No TDS</option>
                        </select>
                      </th>
                      {/* TDS Amount Filter */}
                      <th className="p-1 bg-emerald-50/60 border-r border-neutral-200">
                        <input
                          type="text"
                          value={colFilterTdsAmt}
                          onChange={(e) => setColFilterTdsAmt(e.target.value)}
                          placeholder="₹..."
                          className="w-full text-right px-1 py-0.5 text-[10px] font-mono bg-white border border-neutral-300 rounded-2xs focus:outline-none focus:border-emerald-600"
                        />
                      </th>
                      {/* Bank Advice Filter */}
                      <th className="p-1 text-center bg-emerald-50/60 border-r border-neutral-200">
                        <select
                          value={colFilterUtrSlip}
                          onChange={(e) => setColFilterUtrSlip(e.target.value)}
                          className="w-full px-1 py-0.5 text-[10px] bg-white border border-neutral-300 rounded-2xs focus:outline-none focus:border-emerald-600 cursor-pointer"
                        >
                          <option value="">All</option>
                          <option value="WITH_SLIP">Advice</option>
                          <option value="NO_SLIP">None</option>
                        </select>
                      </th>
                      {/* Remarks Filter & Reset Button */}
                      <th className="p-1 bg-emerald-50/60 flex items-center gap-1">
                        <input
                          type="text"
                          value={colFilterRemarks}
                          onChange={(e) => setColFilterRemarks(e.target.value)}
                          placeholder="Notes..."
                          className="flex-1 px-1 py-0.5 text-[10px] bg-white border border-neutral-300 rounded-2xs focus:outline-none focus:border-emerald-600"
                        />
                        {hasActiveColFilters && (
                          <button
                            type="button"
                            onClick={handleClearAllColFilters}
                            className="px-1.5 py-0.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-2xs text-[9px] font-bold uppercase transition-colors cursor-pointer"
                            title="Reset all filters"
                          >
                            Reset
                          </button>
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200/70 font-mono text-[11px]">
                    {loading ? (
                      <tr>
                        <td colSpan={17} className="p-6 text-center text-gray-500 font-sans">
                          <Loader2 size={22} className="animate-spin text-[#006064] mx-auto mb-1.5" />
                          <span>Loading approved invoice payment records...</span>
                        </td>
                      </tr>
                    ) : sortedInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={17} className="p-8 text-center text-gray-400 font-sans">
                          <Building2 size={28} className="text-gray-300 mx-auto mb-2" />
                          <p className="font-semibold text-gray-700">No approved invoices found</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Try adjusting your filters or search terms.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      sortedInvoices.map((inv, idx) => {
                        const invAmt = Number(inv.totalAmount || 0);
                        const draft = tableDrafts[inv.id] || {
                          parts: [
                            {
                              id: 'part_1',
                              payReceiveDate: inv.payReceiveDate ? String(inv.payReceiveDate).split('T')[0] : '',
                              receiveAmount:
                                inv.receiveAmount !== null && inv.receiveAmount !== undefined
                                  ? String(inv.receiveAmount)
                                  : '',
                              paymentMode: inv.paymentMode || 'NEFT',
                              utrNumber: inv.utrNumber || '',
                              utrDate: inv.utrDate ? String(inv.utrDate).split('T')[0] : '',
                              tdsDeducted: inv.tdsDeducted || 'No',
                              tdsAmount:
                                inv.tdsAmount !== null && inv.tdsAmount !== undefined
                                  ? String(inv.tdsAmount)
                                  : '0',
                              utrFileUrl: inv.utrFileUrl || null,
                              remarks: inv.remarks || '',
                            },
                          ],
                          autoSaveStatus: 'idle',
                          saved: false,
                        };

                        let currentTotalRec = 0;
                        let currentTotalTds = 0;
                        draft.parts.forEach((p) => {
                          currentTotalRec += parseFloat(p.receiveAmount) || 0;
                          currentTotalTds += parseFloat(p.tdsAmount) || 0;
                        });

                        const liveBalance = Math.max(0, invAmt - currentTotalRec);
                        const isSettled =
                          inv.paymentStatus === 'RECEIVED' ||
                          (currentTotalRec >= invAmt && invAmt > 0) ||
                          liveBalance <= 0;
                        const isPartial = !isSettled && currentTotalRec > 0;
                        const isExpanded = !!expandedInvoiceIds[inv.id];
                        const hasMultipleParts = draft.parts.length > 1;
                        const part1 = draft.parts[0];
                        const isEditable = userRoleView !== 'CM';

                        return (
                          <React.Fragment key={inv.id}>
                            <tr
                              className={`hover:bg-teal-50/30 transition-colors ${
                                isSettled ? 'bg-emerald-50/15' : isPartial ? 'bg-blue-50/15' : ''
                              } ${isExpanded ? 'border-b-0 bg-teal-50/10' : ''}`}
                            >
                              {/* 1. SR. NO */}
                              <td className="py-2 px-2 text-center text-gray-500 font-bold border-r border-neutral-200">
                                #{inv.srNo || idx + 1}
                              </td>

                              {/* 2. Corporate Client */}
                              <td className="py-2 px-2.5 border-r border-neutral-200">
                                <div className="font-bold text-gray-900 font-sans text-xs truncate max-w-[170px]" title={inv.companyName}>
                                  {inv.companyName}
                                </div>
                                <div className="text-[10px] text-gray-500 font-sans mt-0.5 flex items-center gap-1.5">
                                  {inv.cabinName && <span>{inv.cabinName}</span>}
                                  {inv.noOfSeats && <span>• {inv.noOfSeats} Seats</span>}
                                </div>
                                {inv.gstNo && (
                                  <div className="text-[9px] text-gray-400 uppercase font-mono">
                                    GSTIN: {inv.gstNo}
                                  </div>
                                )}
                                {/* Multi-part expand toggle & Add Part button & Live status */}
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  {hasMultipleParts ? (
                                    <button
                                      type="button"
                                      onClick={() => toggleExpandInvoice(inv.id)}
                                      className="text-[9.5px] text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-300 px-1.5 py-0.5 rounded-2xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                    >
                                      {isExpanded ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
                                      <span>{isExpanded ? 'Hide Parts' : `${draft.parts.length} Parts`}</span>
                                    </button>
                                  ) : null}
                                  {isEditable && (
                                    <button
                                      type="button"
                                      onClick={() => handleAddTablePart(inv.id)}
                                      className="text-[9.5px] text-[#006064] hover:text-[#004D40] bg-white hover:bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded-2xs font-bold inline-flex items-center gap-0.5 cursor-pointer shadow-2xs"
                                      title="Add another installment part for this invoice"
                                    >
                                      <Plus size={9} /> <span>Add Part</span>
                                    </button>
                                  )}
                                  {draft.autoSaveStatus === 'saving' && (
                                    <span className="text-[9px] text-amber-600 font-bold flex items-center gap-0.5">
                                      <Loader2 size={9} className="animate-spin" /> Saving
                                    </span>
                                  )}
                                  {draft.autoSaveStatus === 'saved' && (
                                    <span className="text-[9px] text-emerald-700 font-bold flex items-center gap-0.5">
                                      <Check size={9} /> Saved ✓
                                    </span>
                                  )}
                                  {draft.autoSaveStatus === 'error' && (
                                    <span className="text-[9px] text-red-600 font-bold flex items-center gap-0.5" title={draft.errorMessage}>
                                      <AlertCircle size={9} /> Error
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* 3. Centre Node */}
                              <td className="py-2 px-2 border-r border-neutral-200">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-neutral-100 text-gray-700 font-sans font-bold text-[9.5px] border border-neutral-200">
                                  <Building2 size={10} className="text-[#006064]" />
                                  <span>{inv.locationName}</span>
                                </span>
                              </td>

                              {/* 4. Billing Cycle */}
                              <td className="py-2 px-2.5 border-r border-neutral-200">
                                <div className="font-bold text-gray-900 font-sans text-[11px]">
                                  {inv.billingMonth}
                                </div>
                                {inv.dueDate && (
                                  <div className="text-[9.5px] text-gray-500 font-sans">
                                    Due: {new Date(inv.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                  </div>
                                )}
                              </td>

                              {/* 5. Invoice Sum */}
                              <td className="py-2 px-2 text-right whitespace-nowrap font-mono border-r border-neutral-200">
                                <div className="font-bold text-gray-950 text-xs">
                                  ₹{invAmt.toLocaleString('en-IN')}
                                </div>
                                <div className="text-[8.5px] text-gray-400 font-sans">
                                  +{inv.gstPercent}% GST
                                </div>
                              </td>

                              {/* 6. Balance Due */}
                              <td className="py-2 px-2 text-right whitespace-nowrap font-mono border-r border-neutral-200">
                                <div
                                  className={`font-bold text-xs ${
                                    liveBalance === 0 ? 'text-emerald-700' : 'text-amber-800'
                                  }`}
                                >
                                  ₹{liveBalance.toLocaleString('en-IN')}
                                </div>
                                {liveBalance === 0 && currentTotalRec > 0 ? (
                                  <span className="inline-block text-[8.5px] font-sans font-bold text-emerald-800 bg-emerald-100 px-1 py-0.2 rounded-xs mt-0.5">
                                    Paid
                                  </span>
                                ) : liveBalance > 0 ? (
                                  <span className="inline-block text-[8.5px] font-sans font-bold text-amber-800 bg-amber-100 px-1 py-0.2 rounded-xs mt-0.5">
                                    Pending
                                  </span>
                                ) : null}
                              </td>

                              {/* 7. Payment Status */}
                              <td className="py-2 px-2 text-center font-sans border-r border-neutral-200">
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

                              {/* 8. Attached Tally PDF */}
                              <td className="py-2 px-2 text-center font-sans border-r border-neutral-200">
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

                              {/* ── Right Side: Dedicated Accountant Payment Details Columns ── */}
                              {!hasMultipleParts ? (
                                <>
                                  {/* 9. Payment Receive Date */}
                                  <td className="py-1.5 px-2 border-r border-neutral-200 bg-emerald-50/15">
                                    {isEditable ? (
                                      <input
                                        type="date"
                                        value={part1.payReceiveDate}
                                        onChange={(e) => updateDraftField(inv.id, part1.id, 'payReceiveDate', e.target.value)}
                                        onBlur={() => handleBlurSave(inv.id)}
                                        className="w-full border border-neutral-300 bg-white p-1 text-xs font-mono font-bold text-gray-800 focus:outline-none focus:border-emerald-600"
                                      />
                                    ) : (
                                      <span className="text-gray-800 text-[10.5px] font-semibold">{part1.payReceiveDate || '—'}</span>
                                    )}
                                  </td>

                                  {/* 10. Received Amount (₹) */}
                                  <td className="py-1.5 px-2 border-r border-neutral-200 bg-emerald-50/15">
                                    {isEditable ? (
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={part1.receiveAmount}
                                        onChange={(e) => updateDraftField(inv.id, part1.id, 'receiveAmount', e.target.value)}
                                        onBlur={() => handleBlurSave(inv.id)}
                                        placeholder="₹0.00"
                                        className="w-full border border-emerald-600 bg-white p-1 text-xs font-mono font-black text-emerald-950 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                      />
                                    ) : (
                                      <span className="text-emerald-800 font-bold text-xs">{part1.receiveAmount ? `₹${Number(part1.receiveAmount).toLocaleString('en-IN')}` : '—'}</span>
                                    )}
                                  </td>

                                  {/* 11. UTR / Mode */}
                                  <td className="py-1.5 px-2 border-r border-neutral-200 bg-emerald-50/15">
                                    {isEditable ? (
                                      <select
                                        value={part1.paymentMode}
                                        onChange={(e) => updateDraftField(inv.id, part1.id, 'paymentMode', e.target.value)}
                                        onBlur={() => handleBlurSave(inv.id)}
                                        className="w-full border border-neutral-300 bg-white p-1 text-xs font-semibold text-gray-800 focus:outline-none focus:border-emerald-600 cursor-pointer"
                                      >
                                        <option value="NEFT">NEFT</option>
                                        <option value="RTGS">RTGS</option>
                                        <option value="IMPS">IMPS</option>
                                        <option value="UPI">UPI</option>
                                        <option value="Cheque">Cheque</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="Cash">Cash</option>
                                      </select>
                                    ) : (
                                      <span className="inline-block px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 text-neutral-800 font-bold font-mono text-[9.5px]">{part1.paymentMode || 'NEFT'}</span>
                                    )}
                                  </td>

                                  {/* 12. UTR / Reference Number */}
                                  <td className="py-1.5 px-2 border-r border-neutral-200 bg-emerald-50/15 font-mono">
                                    {isEditable ? (
                                      <input
                                        type="text"
                                        value={part1.utrNumber}
                                        onChange={(e) => updateDraftField(inv.id, part1.id, 'utrNumber', e.target.value)}
                                        onBlur={() => handleBlurSave(inv.id)}
                                        placeholder="UTR / Ref Number"
                                        className="w-full border border-neutral-300 bg-white p-1 text-xs font-mono text-gray-900 focus:outline-none focus:border-emerald-600"
                                      />
                                    ) : (
                                      <div className="text-[10.5px] text-gray-900 font-semibold truncate max-w-[160px]" title={part1.utrNumber}>{part1.utrNumber || '—'}</div>
                                    )}
                                  </td>

                                  {/* 13. UTR Transaction Date */}
                                  <td className="py-1.5 px-2 border-r border-neutral-200 bg-emerald-50/15 font-mono">
                                    {isEditable ? (
                                      <input
                                        type="date"
                                        value={part1.utrDate}
                                        onChange={(e) => updateDraftField(inv.id, part1.id, 'utrDate', e.target.value)}
                                        onBlur={() => handleBlurSave(inv.id)}
                                        className="w-full border border-neutral-300 bg-white p-1 text-xs font-mono text-gray-800 focus:outline-none focus:border-emerald-600"
                                      />
                                    ) : (
                                      <span className="text-gray-700 text-[10px]">{part1.utrDate || '—'}</span>
                                    )}
                                  </td>

                                  {/* 14. TDS Deducted? */}
                                  <td className="py-1.5 px-2 border-r border-neutral-200 bg-emerald-50/15">
                                    {isEditable ? (
                                      <select
                                        value={part1.tdsDeducted}
                                        onChange={(e) => updateDraftField(inv.id, part1.id, 'tdsDeducted', e.target.value)}
                                        onBlur={() => handleBlurSave(inv.id)}
                                        className="w-full border border-neutral-300 bg-white p-1 text-xs text-gray-800 focus:outline-none focus:border-emerald-600 cursor-pointer"
                                      >
                                        <option value="No">No TDS</option>
                                        <option value="10">10% (194-I)</option>
                                        <option value="2">2% (194-C)</option>
                                        <option value="1">1% TDS</option>
                                        <option value="Custom">Custom TDS</option>
                                      </select>
                                    ) : (
                                      <span className="text-gray-700 text-[10px]">{part1.tdsDeducted !== 'No' ? 'Yes' : 'No'}</span>
                                    )}
                                  </td>

                                  {/* 15. TDS Amount */}
                                  <td className="py-1.5 px-2 border-r border-neutral-200 bg-emerald-50/15 font-mono">
                                    {isEditable ? (
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={part1.tdsAmount}
                                        onChange={(e) => updateDraftField(inv.id, part1.id, 'tdsAmount', e.target.value)}
                                        onBlur={() => handleBlurSave(inv.id)}
                                        placeholder="₹0"
                                        className="w-full border border-neutral-300 bg-white p-1 text-xs font-mono text-gray-800 focus:outline-none focus:border-emerald-600"
                                      />
                                    ) : (
                                      <span className="text-purple-900 font-bold text-[10.5px]">₹{Number(part1.tdsAmount || 0).toLocaleString('en-IN')}</span>
                                    )}
                                  </td>

                                  {/* 16. Bank Advice / UTR Receipt */}
                                  <td className="py-1.5 px-2 text-center border-r border-neutral-200 font-sans bg-emerald-50/15">
                                    {part1.utrFileUrl ? (
                                      <div className="flex items-center justify-center gap-1">
                                        <a
                                          href={part1.utrFileUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-[10px] text-[#006064] hover:underline font-bold inline-flex items-center gap-1"
                                        >
                                          <FileText size={11} />
                                          <span>Receipt</span>
                                        </a>
                                        {isEditable && (
                                          <button
                                            type="button"
                                            onClick={() => handleTriggerTableUpload(inv.id, part1.id)}
                                            className="text-[9px] text-gray-400 hover:text-black underline cursor-pointer ml-1"
                                            title="Replace file"
                                          >
                                            replace
                                          </button>
                                        )}
                                      </div>
                                    ) : isEditable ? (
                                      <button
                                        type="button"
                                        onClick={() => handleTriggerTableUpload(inv.id, part1.id)}
                                        className="text-[10px] text-gray-600 hover:text-[#006064] bg-white hover:bg-neutral-100 border border-neutral-300 px-1.5 py-0.5 rounded-2xs inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                                      >
                                        <Upload size={10} />
                                        <span>Upload</span>
                                      </button>
                                    ) : (
                                      <span className="text-gray-300 text-[10px]">—</span>
                                    )}
                                  </td>

                                  {/* 17. Settlement Notes / Remarks */}
                                  <td className="py-1.5 px-2.5 font-sans bg-emerald-50/15">
                                    {isEditable ? (
                                      <input
                                        type="text"
                                        value={part1.remarks}
                                        onChange={(e) => updateDraftField(inv.id, part1.id, 'remarks', e.target.value)}
                                        onBlur={() => handleBlurSave(inv.id)}
                                        placeholder="Remarks..."
                                        className="w-full border border-neutral-300 bg-white p-1 text-xs text-gray-800 focus:outline-none focus:border-emerald-600"
                                      />
                                    ) : (
                                      <div className="text-[10px] text-gray-700 truncate max-w-[155px]" title={part1.remarks}>{part1.remarks || '—'}</div>
                                    )}
                                  </td>
                                </>
                              ) : (
                                <>
                                  {/* Summary row when multiple parts exist */}
                                  {/* 9. Payment Receive Date */}
                                  <td className="py-2 px-2 font-mono border-r border-neutral-200">
                                    <span className="text-gray-800 text-[10.5px] font-semibold">
                                      {draft.parts[draft.parts.length - 1]?.payReceiveDate || '—'}
                                    </span>
                                    <span className="text-[9px] text-teal-700 font-mono block font-normal">
                                      ({draft.parts.length} parts)
                                    </span>
                                  </td>

                                  {/* 10. Received Amount (₹) */}
                                  <td className="py-2 px-2 text-right font-mono border-r border-neutral-200 whitespace-nowrap">
                                    <div className="font-black text-emerald-800 text-xs">
                                      ₹{currentTotalRec.toLocaleString('en-IN')}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => toggleExpandInvoice(inv.id)}
                                      className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-300 px-1.5 py-0.5 rounded-2xs cursor-pointer transition-colors shadow-2xs"
                                    >
                                      {isExpanded ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
                                      <span>{isExpanded ? 'Hide' : `${draft.parts.length} Parts (Edit)`}</span>
                                    </button>
                                  </td>

                                  {/* 11. UTR / Mode */}
                                  <td className="py-2 px-2 border-r border-neutral-200">
                                    <span className="inline-block px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 text-neutral-800 font-bold font-mono text-[9px]">
                                      {Array.from(new Set(draft.parts.map((p) => p.paymentMode || 'NEFT'))).join(', ')}
                                    </span>
                                  </td>

                                  {/* 12. UTR / Reference Number */}
                                  <td className="py-2 px-2 border-r border-neutral-200 font-mono">
                                    <div
                                      className="text-[10.5px] text-gray-900 font-semibold truncate max-w-[155px]"
                                      title={draft.parts.map((p, pI) => `Part ${pI + 1}: ${p.utrNumber}`).join('\n')}
                                    >
                                      {draft.parts[draft.parts.length - 1]?.utrNumber || `${draft.parts.length} UTRs`}
                                    </div>
                                    <div className="text-[8.5px] text-gray-400 font-sans">
                                      {draft.parts.length} UTRs recorded
                                    </div>
                                  </td>

                                  {/* 13. UTR Transaction Date */}
                                  <td className="py-2 px-2 font-mono border-r border-neutral-200">
                                    <span className="text-gray-700 text-[10px]">
                                      {draft.parts[draft.parts.length - 1]?.utrDate || draft.parts[draft.parts.length - 1]?.payReceiveDate || '—'}
                                    </span>
                                  </td>

                                  {/* 14. TDS Deducted? */}
                                  <td className="py-2 px-2 border-r border-neutral-200 text-center">
                                    {draft.parts.some((p) => p.tdsDeducted !== 'No') ? (
                                      <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 font-bold text-[9.5px] rounded-xs">
                                        Yes
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 text-[10px]">No</span>
                                    )}
                                  </td>

                                  {/* 15. TDS Amount */}
                                  <td className="py-2 px-2 text-right font-mono border-r border-neutral-200 whitespace-nowrap">
                                    {currentTotalTds > 0 ? (
                                      <span className="text-purple-900 font-bold text-[10.5px]">
                                        ₹{currentTotalTds.toLocaleString('en-IN')}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 text-[10px]">₹0</span>
                                    )}
                                  </td>

                                  {/* 16. Bank Advice / UTR Receipt */}
                                  <td className="py-2 px-2 text-center border-r border-neutral-200 font-sans">
                                    {draft.parts.some((p) => p.utrFileUrl) ? (
                                      <div className="flex items-center justify-center gap-1">
                                        <a
                                          href={draft.parts.find((p) => p.utrFileUrl)?.utrFileUrl || '#'}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-neutral-100 hover:bg-neutral-200 text-gray-800 border border-neutral-300 text-[9.5px] font-bold transition-colors shadow-2xs"
                                        >
                                          <FileText size={10} className="text-teal-700" />
                                          <span>{draft.parts.filter((p) => p.utrFileUrl).length > 1 ? `${draft.parts.filter((p) => p.utrFileUrl).length} Advice` : 'Receipt'}</span>
                                          <ArrowUpRight size={8} />
                                        </a>
                                      </div>
                                    ) : (
                                      <span className="text-gray-300 text-[10px]">—</span>
                                    )}
                                  </td>

                                  {/* 17. Settlement Notes / Remarks */}
                                  <td className="py-2 px-2.5 font-sans">
                                    <div className="text-[10px] text-gray-700 truncate max-w-[155px]" title={draft.parts.map((p) => p.remarks).filter(Boolean).join(' | ')}>
                                      {draft.parts.map((p) => p.remarks).filter(Boolean).join(' | ') || '—'}
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>

                            {/* ── EXPANDED SUB-ROWS: Full interactive details for each payment installment ── */}
                            {isExpanded &&
                              hasMultipleParts &&
                              draft.parts.map((p, pIdx) => (
                                <tr
                                  key={`${inv.id}_expanded_part_${p.id || pIdx}`}
                                  className="bg-teal-50/25 hover:bg-teal-50/40 border-t border-dashed border-teal-200/80 transition-colors"
                                >
                                  {/* 1. SR */}
                                  <td className="py-2 px-2 text-center font-mono font-bold text-teal-800 border-r border-teal-100 text-[9.5px]">
                                    ↳ P{pIdx + 1}
                                  </td>

                                  {/* 2. Corporate Client - Part Indicator */}
                                  <td className="py-2 px-2.5 border-r border-teal-100">
                                    <div className="flex items-center justify-between gap-1 pl-2">
                                      <span className="px-1.5 py-0.5 bg-teal-100 border border-teal-300 text-teal-950 font-mono font-bold text-[9px] rounded-2xs shadow-2xs">
                                        Part #{pIdx + 1}
                                      </span>
                                      {isEditable && (
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveTablePart(inv.id, p.id)}
                                          className="text-[9px] text-red-600 hover:text-red-800 font-bold underline cursor-pointer flex items-center gap-0.5"
                                          title="Remove this installment part"
                                        >
                                          <Trash2 size={9} /> <span>Remove</span>
                                        </button>
                                      )}
                                    </div>
                                  </td>

                                  {/* 3. Centre */}
                                  <td className="py-2 px-2 border-r border-teal-100 text-center text-gray-300 text-[10px]">″</td>

                                  {/* 4. Billing Cycle */}
                                  <td className="py-2 px-2.5 border-r border-teal-100 text-center text-gray-300 text-[10px]">″</td>

                                  {/* 5. Invoice Sum */}
                                  <td className="py-2 px-2 border-r border-teal-100 text-right text-gray-300 text-[10px]">″</td>

                                  {/* 6. Balance Due */}
                                  <td className="py-2 px-2 border-r border-teal-100 text-right text-gray-300 text-[10px]">″</td>

                                  {/* 7. Status */}
                                  <td className="py-2 px-2 border-r border-teal-100 text-center font-sans">
                                    <span className="text-[8.5px] font-bold text-teal-800 bg-white border border-teal-300 px-1.5 py-0.2 rounded-2xs shadow-2xs">
                                      PART #{pIdx + 1}
                                    </span>
                                  </td>

                                  {/* 8. Tally PDF */}
                                  <td className="py-2 px-2 border-r border-teal-100 text-center text-gray-300 text-[10px]">—</td>

                                  {/* ── Right-Side 9 Payment Columns for this specific Part (Editable inputs) ── */}
                                  {/* 9. Payment Receive Date */}
                                  <td className="py-1.5 px-2 border-r border-teal-100 bg-emerald-50/15">
                                    {isEditable ? (
                                      <input
                                        type="date"
                                        value={p.payReceiveDate}
                                        onChange={(e) => updateDraftField(inv.id, p.id, 'payReceiveDate', e.target.value)}
                                        onBlur={() => handleBlurSave(inv.id)}
                                        className="w-full border border-neutral-300 bg-white p-1 text-xs font-mono font-bold text-gray-800 focus:outline-none focus:border-emerald-600"
                                      />
                                    ) : (
                                      <span className="text-gray-900 text-[10.5px] font-semibold">{p.payReceiveDate || '—'}</span>
                                    )}
                                  </td>

                                  {/* 10. Received Amt (₹) */}
                                  <td className="py-1.5 px-2 text-right font-mono border-r border-teal-100 whitespace-nowrap bg-emerald-50/15">
                                    {isEditable ? (
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={p.receiveAmount}
                                        onChange={(e) => updateDraftField(inv.id, p.id, 'receiveAmount', e.target.value)}
                                        onBlur={() => handleBlurSave(inv.id)}
                                        placeholder="Part ₹"
                                        className="w-full border border-emerald-600 bg-white p-1 text-xs font-mono font-black text-emerald-950 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                      />
                                    ) : (
                                      <span className="text-emerald-900 font-black text-xs">₹{Number(p.receiveAmount || 0).toLocaleString('en-IN')}</span>
                                    )}
                                  </td>

                                  {/* 11. UTR / Mode */}
                                  <td className="py-1.5 px-2 border-r border-teal-100 bg-emerald-50/15">
                                    {isEditable ? (
                                      <select
                                        value={p.paymentMode}
                                        onChange={(e) => updateDraftField(inv.id, p.id, 'paymentMode', e.target.value)}
                                        onBlur={() => handleBlurSave(inv.id)}
                                        className="w-full border border-neutral-300 bg-white p-1 text-xs font-semibold text-gray-800 focus:outline-none focus:border-emerald-600 cursor-pointer"
                                      >
                                        <option value="NEFT">NEFT</option>
                                        <option value="RTGS">RTGS</option>
                                        <option value="IMPS">IMPS</option>
                                        <option value="UPI">UPI</option>
                                        <option value="Cheque">Cheque</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="Cash">Cash</option>
                                      </select>
                                    ) : (
                                      <span className="inline-block px-1.5 py-0.5 bg-white border border-teal-300 text-teal-900 font-bold font-mono text-[9px] shadow-2xs">{p.paymentMode || 'NEFT'}</span>
                                    )}
                                  </td>

                                  {/* 12. UTR / Reference Number */}
                                  <td className="py-1.5 px-2 border-r border-teal-100 font-mono bg-emerald-50/15">
                                    {isEditable ? (
                                      <input
                                        type="text"
                                        value={p.utrNumber}
                                        onChange={(e) => updateDraftField(inv.id, p.id, 'utrNumber', e.target.value)}
                                        onBlur={() => handleBlurSave(inv.id)}
                                        placeholder="UTR / Ref Number"
                                        className="w-full border border-neutral-300 bg-white p-1 text-xs font-mono text-gray-900 focus:outline-none focus:border-emerald-600"
                                      />
                                    ) : (
                                      <div className="text-[10px] text-gray-900 font-semibold break-all max-w-[220px]" title={p.utrNumber}>{p.utrNumber || '—'}</div>
                                    )}
                                  </td>

                                  {/* 13. UTR Transaction Date */}
                                  <td className="py-1.5 px-2 font-mono border-r border-teal-100 bg-emerald-50/15">
                                    {isEditable ? (
                                      <input
                                        type="date"
                                        value={p.utrDate}
                                        onChange={(e) => updateDraftField(inv.id, p.id, 'utrDate', e.target.value)}
                                        onBlur={() => handleBlurSave(inv.id)}
                                        className="w-full border border-neutral-300 bg-white p-1 text-xs font-mono text-gray-800 focus:outline-none focus:border-emerald-600"
                                      />
                                    ) : (
                                      <span className="text-gray-700 text-[10px]">{p.utrDate || '—'}</span>
                                    )}
                                  </td>

                                  {/* 14. TDS Deducted? */}
                                  <td className="py-1.5 px-2 border-r border-teal-100 text-center bg-emerald-50/15">
                                    {isEditable ? (
                                      <select
                                        value={p.tdsDeducted}
                                        onChange={(e) => updateDraftField(inv.id, p.id, 'tdsDeducted', e.target.value)}
                                        onBlur={() => handleBlurSave(inv.id)}
                                        className="w-full border border-neutral-300 bg-white p-1 text-xs text-gray-800 focus:outline-none focus:border-emerald-600 cursor-pointer"
                                      >
                                        <option value="No">No TDS</option>
                                        <option value="10">10% (194-I)</option>
                                        <option value="2">2% (194-C)</option>
                                        <option value="1">1% TDS</option>
                                        <option value="Custom">Custom TDS</option>
                                      </select>
                                    ) : (
                                      <span className="text-gray-700 text-[10px]">{p.tdsDeducted !== 'No' ? 'Yes' : 'No'}</span>
                                    )}
                                  </td>

                                  {/* 15. TDS Amount */}
                                  <td className="py-1.5 px-2 text-right font-mono border-r border-teal-100 whitespace-nowrap bg-emerald-50/15">
                                    {isEditable ? (
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={p.tdsAmount}
                                        onChange={(e) => updateDraftField(inv.id, p.id, 'tdsAmount', e.target.value)}
                                        onBlur={() => handleBlurSave(inv.id)}
                                        placeholder="₹0"
                                        className="w-full border border-neutral-300 bg-white p-1 text-xs font-mono text-gray-800 focus:outline-none focus:border-emerald-600"
                                      />
                                    ) : (
                                      <span className="text-purple-900 font-bold text-[10px]">₹{Number(p.tdsAmount || 0).toLocaleString('en-IN')}</span>
                                    )}
                                  </td>

                                  {/* 16. Bank Advice / UTR Receipt */}
                                  <td className="py-1.5 px-2 text-center border-r border-teal-100 font-sans bg-emerald-50/15">
                                    {p.utrFileUrl ? (
                                      <div className="flex items-center justify-center gap-1">
                                        <a
                                          href={p.utrFileUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white hover:bg-teal-50 text-teal-800 border border-teal-300 text-[9px] font-bold shadow-2xs transition-colors"
                                          title={`View Bank Advice for Part #${pIdx + 1}`}
                                        >
                                          <FileText size={10} className="text-teal-700" />
                                          <span>Receipt</span>
                                          <ArrowUpRight size={8} />
                                        </a>
                                        {isEditable && (
                                          <button
                                            type="button"
                                            onClick={() => handleTriggerTableUpload(inv.id, p.id)}
                                            className="text-[9px] text-gray-400 hover:text-black underline cursor-pointer ml-1"
                                            title="Replace file"
                                          >
                                            replace
                                          </button>
                                        )}
                                      </div>
                                    ) : isEditable ? (
                                      <button
                                        type="button"
                                        onClick={() => handleTriggerTableUpload(inv.id, p.id)}
                                        className="text-[10px] text-gray-600 hover:text-[#006064] bg-white hover:bg-teal-50 border border-neutral-300 px-1.5 py-0.5 rounded-2xs inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                                      >
                                        <Upload size={10} />
                                        <span>Upload</span>
                                      </button>
                                    ) : (
                                      <span className="text-gray-300 text-[10px]">—</span>
                                    )}
                                  </td>

                                  {/* 17. Settlement Notes / Remarks */}
                                  <td className="py-1.5 px-2.5 font-sans bg-emerald-50/15">
                                    {isEditable ? (
                                      <input
                                        type="text"
                                        value={p.remarks}
                                        onChange={(e) => updateDraftField(inv.id, p.id, 'remarks', e.target.value)}
                                        onBlur={() => handleBlurSave(inv.id)}
                                        placeholder="Notes..."
                                        className="w-full border border-neutral-300 bg-white p-1 text-xs text-gray-800 focus:outline-none focus:border-emerald-600"
                                      />
                                    ) : (
                                      <div className="text-[10px] text-gray-700 truncate max-w-[160px]" title={p.remarks}>{p.remarks || '—'}</div>
                                    )}
                                  </td>
                                </tr>
                              ))}

                            {/* + Add Another Part row if expanded */}
                            {isExpanded && hasMultipleParts && isEditable && (
                              <tr className="bg-teal-50/15 border-b border-neutral-200">
                                <td colSpan={17} className="py-1 px-4 text-left">
                                  <button
                                    type="button"
                                    onClick={() => handleAddTablePart(inv.id)}
                                    className="text-[10px] text-[#006064] hover:text-[#004D40] font-bold inline-flex items-center gap-1 bg-white hover:bg-teal-50 border border-teal-300 px-2 py-0.5 rounded-2xs cursor-pointer shadow-2xs"
                                  >
                                    <Plus size={11} />
                                    <span>+ Add Another Payment Receive Entry / Part for this invoice</span>
                                  </button>
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
                          modalSummary.totalRec >= modalSummary.totalInv && modalSummary.totalInv > 0
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : modalSummary.totalRec > 0
                            ? 'bg-blue-50 text-blue-700 border-blue-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}>
                          {modalSummary.totalRec >= modalSummary.totalInv && modalSummary.totalInv > 0
                            ? '✓ Fully Settled'
                            : modalSummary.totalRec > 0
                            ? 'Partial Payment'
                            : 'Pending Settlement'}
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
                              placeholder={
                                editingInvoice.totalAmount
                                  ? `e.g. ${Number(editingInvoice.totalAmount).toLocaleString('en-IN')}`
                                  : 'e.g. 25000'
                              }
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

      {/* ── Manage Payment & Daily FMS Modal ── */}
      <ManagePaymentModal
        isOpen={isManagePaymentModalOpen}
        onClose={() => setIsManagePaymentModalOpen(false)}
        invoices={invoices}
        onInvoiceUpdated={(updated) => {
          setInvoices((prev) => prev.map((inv) => (inv.id === updated.id ? updated : inv)));
        }}
        todayCheck={todayFmsCheck}
        onDailyCheckSaved={(check) => {
          setTodayFmsCheck(check);
        }}
        locations={locations}
        availableMonths={availableMonths}
      />
    </div>
  );
}
