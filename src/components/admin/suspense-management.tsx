'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  Calendar,
  Building2,
  Landmark,
  Receipt,
  CreditCard,
  FileText,
  RefreshCcw,
  Sparkles,
  ShieldAlert,
  ExternalLink,
  Eye,
  Trash2,
  UserCheck,
  Calculator,
  ArrowRight,
  Shield,
  HelpCircle,
  Paperclip,
  Check,
  X,
  Upload,
  Pencil
} from 'lucide-react';
import { toast } from 'sonner';
import { FadeUp } from '@/components/ui/fade-up';
import {
  SuspensePaymentRecord,
  SuspenseCenterAllocationData,
  ACTIVE_FMS_CENTERS,
  formatIstDate
} from '@/lib/suspense-db';

interface SuspenseManagementProps {
  isSuperAdmin?: boolean;
  userRoleView?: 'CM' | 'ACCOUNTANT';
  canAccessCM?: boolean;
  canAccessAccountant?: boolean;
  currentUserLocationId?: number | null;
  currentUserLocationName?: string | null;
  currentUserId?: number | null;
  currentUserName?: string | null;
  onBack?: () => void;
}

export function SuspenseManagement({
  isSuperAdmin = false,
  userRoleView = 'ACCOUNTANT',
  canAccessCM = true,
  canAccessAccountant = true,
  currentUserLocationId,
  currentUserLocationName,
  currentUserId,
  currentUserName = 'User',
  onBack,
}: SuspenseManagementProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState<SuspensePaymentRecord[]>([]);
  const [summary, setSummary] = useState({
    totalCount: 0,
    totalAmount: 0,
    pendingCount: 0,
    identifiedCount: 0,
    overdueCount: 0,
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedCenterFilter, setSelectedCenterFilter] = useState('ALL');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submittingEntry, setSubmittingEntry] = useState(false);

  // New Suspense Entry Form
  const [formPayReceiveDate, setFormPayReceiveDate] = useState(() => {
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    return `${d}/${m}/${y}`;
  });
  const [formPaymentType, setFormPaymentType] = useState('Advance Rent');
  const [formAmount, setFormAmount] = useState('');
  const [formPaymentMode, setFormPaymentMode] = useState('NEFT');
  const [formUtrNumber, setFormUtrNumber] = useState('');
  const [formUtrDate, setFormUtrDate] = useState('');
  const [formPayerName, setFormPayerName] = useState('');
  const [formRemarks, setFormRemarks] = useState('');
  const [formProofUrl, setFormProofUrl] = useState('');
  const [formProofName, setFormProofName] = useState('');
  const [uploadingPdf, setUploadingPdf] = useState(false);

  // CM Recognition Modal
  const [selectedPaymentForReview, setSelectedPaymentForReview] = useState<SuspensePaymentRecord | null>(null);
  const [reviewCenterName, setReviewCenterName] = useState('');
  const [reviewDecision, setReviewDecision] = useState<'ACCEPTED' | 'REJECTED'>('ACCEPTED');
  const [reviewCompanyName, setReviewCompanyName] = useState('');
  const [reviewIdentifiedType, setReviewIdentifiedType] = useState('Invoice Settlement');
  const [reviewCmRemarks, setReviewCmRemarks] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // View Details Modal
  const [selectedPaymentForDetails, setSelectedPaymentForDetails] = useState<SuspensePaymentRecord | null>(null);

  // Edit Suspense Entry Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPaymentForEdit, setSelectedPaymentForEdit] = useState<SuspensePaymentRecord | null>(null);
  const [editPayReceiveDate, setEditPayReceiveDate] = useState('');
  const [editPaymentType, setEditPaymentType] = useState('Advance Rent');
  const [editAmount, setEditAmount] = useState('');
  const [editPaymentMode, setEditPaymentMode] = useState('NEFT');
  const [editUtrNumber, setEditUtrNumber] = useState('');
  const [editUtrDate, setEditUtrDate] = useState('');
  const [editPayerName, setEditPayerName] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [editProofUrl, setEditProofUrl] = useState('');
  const [editProofName, setEditProofName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingEditPdf, setUploadingEditPdf] = useState(false);

  // Manual FMS Re-sync state
  const [syncingId, setSyncingId] = useState<number | null>(null);

  // Quick suggestions for suspense payment type
  const typeSuggestions = [
    'Advance Rent',
    'Security Deposit (SDR)',
    'Meeting Room Booking',
    'Day Pass / Event Pass',
    'Maintenance / Utility Surcharge',
    'Unidentified Bank Transfer',
    'x payment received'
  ];

  // Fetch Suspense Payments
  const fetchPayments = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      else setRefreshing(true);

      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (searchTerm) params.set('search', searchTerm);

      const res = await fetch(`/api/admin/suspense?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load suspense payments');

      const data = await res.json();
      setPayments(data.payments || []);
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err: any) {
      console.error('[Suspense Management] fetch error:', err);
      toast.error(err?.message || 'Could not load suspense records');
    } finally {
      if (isInitial) setLoading(false);
      else setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayments(true);
  }, [statusFilter]);

  // Determine CM assigned center (normalized to lowercase)
  const normalizedUserCenter = useMemo(() => {
    if (!currentUserLocationName) return null;
    const lower = currentUserLocationName.toLowerCase();
    if (lower.includes('mercado')) return 'mercado';
    if (lower.includes('premier')) return 'premier house';
    if (lower.includes('agarwal')) return 'agarwal complex';
    return lower;
  }, [currentUserLocationName]);

  // Handle PDF File Upload (PDF Only)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate PDF only
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      toast.error('Only PDF files are allowed for payment advice attachment');
      e.target.value = '';
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('PDF file size cannot exceed 50MB limit');
      e.target.value = '';
      return;
    }

    setUploadingPdf(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.fileUrl) {
        throw new Error(data.error || 'Failed to upload PDF');
      }

      setFormProofUrl(data.fileUrl);
      setFormProofName(file.name);
      toast.success(`PDF "${file.name}" uploaded successfully!`);
    } catch (err: any) {
      console.error('[Suspense PDF Upload]', err);
      toast.error(err?.message || 'Error uploading PDF file');
    } finally {
      setUploadingPdf(false);
      e.target.value = '';
    }
  };

  // Handle Add Suspense Entry Submission
  const handleCreateSuspense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formPaymentType.trim()) {
      toast.error('Please enter a suspense payment type or description');
      return;
    }

    const numAmount = Number(formAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid received payment amount');
      return;
    }

    if (!formProofUrl) {
      toast.error('Payment advice attachment (PDF only) is mandatory. Please upload a PDF before submitting.');
      return;
    }

    setSubmittingEntry(true);
    try {
      const res = await fetch('/api/admin/suspense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payReceiveDate: formPayReceiveDate.trim(),
          suspensePaymentType: formPaymentType.trim(),
          amount: numAmount,
          bankName: null, // Bank account removed per requirement
          paymentMode: formPaymentMode.trim(),
          utrNumber: formUtrNumber.trim(),
          utrDate: formUtrDate.trim(),
          payerName: formPayerName.trim(),
          remarks: formRemarks.trim(),
          proofUrl: formProofUrl.trim(),
          proofName: formProofName.trim() || 'Payment_Advice.pdf',
          enteredById: currentUserId,
          enteredByName: currentUserName,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save suspense entry');
      }

      toast.success('Suspense entry logged & 4-Hour recognition tasks dispatched to all 3 centers!');
      setIsAddModalOpen(false);
      // Reset form
      setFormAmount('');
      setFormUtrNumber('');
      setFormPayerName('');
      setFormRemarks('');
      setFormProofUrl('');
      setFormProofName('');

      fetchPayments(false);
    } catch (err: any) {
      toast.error(err?.message || 'Error creating suspense entry');
    } finally {
      setSubmittingEntry(false);
    }
  };

  // Handle Edit PDF File Upload
  const handleEditFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF documents are accepted for payment advice proof.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size exceeds 50MB limit.');
      return;
    }

    setUploadingEditPdf(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('description', 'Suspense Payment Advice (Edited)');

      const res = await fetch('/api/admin/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to upload PDF');
      }

      const data = await res.json();
      if (!data.fileUrl) {
        throw new Error('Upload response missing document URL');
      }

      setEditProofUrl(data.fileUrl);
      setEditProofName(file.name);
      toast.success(`PDF "${file.name}" uploaded successfully!`);
    } catch (err: any) {
      console.error('[Suspense Edit PDF Upload]', err);
      toast.error(err?.message || 'Error uploading PDF file');
    } finally {
      setUploadingEditPdf(false);
      e.target.value = '';
    }
  };

  // Open Edit Modal pre-populated with payment details
  const openEditModal = (payment: SuspensePaymentRecord) => {
    setSelectedPaymentForEdit(payment);
    setEditPayReceiveDate(payment.payReceiveDate || '');
    setEditPaymentType(payment.suspensePaymentType || 'Advance Rent');
    setEditAmount(String(payment.amount || ''));
    setEditPaymentMode(payment.paymentMode || 'NEFT');
    setEditUtrNumber(payment.utrNumber || '');
    setEditUtrDate(payment.utrDate || '');
    setEditPayerName(payment.payerName || '');
    setEditRemarks(payment.remarks || '');
    setEditProofUrl(payment.proofUrl || '');
    setEditProofName(payment.proofName || '');
    setIsEditModalOpen(true);
  };

  // Handle Save Edit Submission
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentForEdit) return;

    if (!editPaymentType.trim()) {
      toast.error('Suspense payment type/description is required');
      return;
    }

    const numAmount = Number(editAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid received payment amount');
      return;
    }

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/suspense/${selectedPaymentForEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payReceiveDate: editPayReceiveDate.trim(),
          suspensePaymentType: editPaymentType.trim(),
          amount: numAmount,
          paymentMode: editPaymentMode.trim(),
          utrNumber: editUtrNumber.trim(),
          utrDate: editUtrDate.trim(),
          payerName: editPayerName.trim(),
          remarks: editRemarks.trim(),
          proofUrl: editProofUrl.trim(),
          proofName: editProofName.trim(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update suspense entry');
      }

      toast.success(`Suspense Entry #${selectedPaymentForEdit.id} updated & synced with Google Sheets!`);
      setIsEditModalOpen(false);
      setSelectedPaymentForEdit(null);
      fetchPayments(false);
    } catch (err: any) {
      toast.error(err?.message || 'Error updating suspense entry');
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle Manual 1-Click Re-sync to Google Sheets
  const handleManualSync = async (paymentId: number) => {
    setSyncingId(paymentId);
    try {
      const res = await fetch(`/api/admin/suspense/${paymentId}/resync`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sync with Google Sheets');
      }
      toast.success(data.message || 'Synced to Google Sheets tab `expense fms`!');
      fetchPayments(false);
    } catch (err: any) {
      toast.error(err?.message || 'Error syncing with Google Sheets');
    } finally {
      setSyncingId(null);
    }
  };

  // Open CM Review Modal
  const openReviewModal = (payment: SuspensePaymentRecord, centerName: string, decision: 'ACCEPTED' | 'REJECTED') => {
    setSelectedPaymentForReview(payment);
    setReviewCenterName(centerName);
    setReviewDecision(decision);
    setReviewCompanyName('');
    setReviewIdentifiedType('Invoice Settlement');
    setReviewCmRemarks('');
  };

  // Submit CM Review Decision
  const handleSubmitReview = async () => {
    if (!selectedPaymentForReview || !reviewCenterName) return;

    if (reviewDecision === 'ACCEPTED' && !reviewCompanyName.trim()) {
      toast.error('Please specify the company/client name for this payment');
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/admin/suspense/${selectedPaymentForReview.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centerName: reviewCenterName,
          decision: reviewDecision,
          companyName: reviewCompanyName.trim(),
          identifiedType: reviewIdentifiedType.trim(),
          cmRemarks: reviewCmRemarks.trim(),
          reviewedById: currentUserId,
          reviewedByName: currentUserName,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to record recognition');
      }

      const result = await res.json();
      toast.success(
        reviewDecision === 'ACCEPTED'
          ? `Allocated to ${reviewCenterName.toUpperCase()}! FMS timestamp recorded.`
          : `Marked as NOT belonging to ${reviewCenterName.toUpperCase()}. FMS recorded.`
      );

      setSelectedPaymentForReview(null);
      fetchPayments(false);
    } catch (err: any) {
      toast.error(err?.message || 'Error recording recognition');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Delete Suspense Payment (Accountant & Super Admin)
  const handleDeletePayment = async (id: number) => {
    if (
      !confirm(
        `Are you sure you want to delete Suspense Entry #${id}? This will permanently remove it from both the website and Google Sheets tab 'expense fms'.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/suspense/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete payment');
      }
      toast.success(`Suspense Entry #${id} completely removed from website and Google Sheets!`);
      fetchPayments(false);
    } catch (err: any) {
      toast.error(err?.message || 'Delete error');
    }
  };


  // Helper to format remaining time
  const renderTimeCountdown = (deadlineAt: string | Date, overallStatus: string) => {
    const now = new Date().getTime();
    const deadline = new Date(deadlineAt).getTime();
    const diffMs = deadline - now;

    if (overallStatus === 'IDENTIFIED') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200">
          <CheckCircle2 size={13} className="text-emerald-600" />
          <span>Recognized</span>
        </span>
      );
    }

    if (diffMs <= 0 || overallStatus === 'OVERDUE') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 border border-rose-200">
          <AlertTriangle size={13} className="text-rose-600 animate-pulse" />
          <span>SLA Overdue (&gt; 4 hrs)</span>
        </span>
      );
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    const isUrgent = hours === 0;

    return (
      <span
        className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 border ${
          isUrgent
            ? 'text-amber-800 bg-amber-50 border-amber-300 animate-pulse'
            : 'text-cyan-800 bg-cyan-50 border-cyan-200'
        }`}
      >
        <Clock size={12} className={isUrgent ? 'text-amber-600' : 'text-cyan-600'} />
        <span>
          {hours}h {mins}m left
        </span>
      </span>
    );
  };

  // Filter payments based on search and center
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // Center filter
      if (selectedCenterFilter !== 'ALL') {
        const alloc = p.allocations?.find(
          (a) => a.centerName.toLowerCase() === selectedCenterFilter.toLowerCase()
        );
        if (!alloc) return false;
      }
      return true;
    });
  }, [payments, selectedCenterFilter]);

  return (
    <div className="space-y-6 pb-20 font-sans">
      {/* ── HEADER & ACTIONS ── */}
      <FadeUp>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[#006064] mb-1">
              <Landmark size={15} /> SSPACIA Financials &amp; Advance Allocation
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-black text-[#1B1C1C] uppercase tracking-tight flex items-center gap-3">
              <span>Suspense Advance Payment Management</span>
              <span className="bg-[#006064] text-white text-[9px] font-mono px-2.5 py-0.5 uppercase tracking-widest font-bold">
                {userRoleView === 'CM' ? 'COMMUNITY MANAGER PORTAL' : 'ACCOUNTANT MASTER'}
              </span>
            </h1>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
              {userRoleView === 'CM'
                ? 'Review unallocated advance payments within 4 hours. Confirm whether payment belongs to your center.'
                : 'Log unidentified advance bank transfers and dispatch 4-hour recognition SLA to all 3 centers.'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>Back to Invoices</span>
              </button>
            )}

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => fetchPayments(false)}
              disabled={refreshing}
              className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-800 bg-white hover:bg-gray-100 border border-gray-300 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <RefreshCcw size={14} className={`text-[#1ab0bc] ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            {/* Accountant Log Suspense Payment Button */}
            {userRoleView !== 'CM' && (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-[#006064] hover:bg-[#004D40] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-xs border border-[#004D40] transition-all hover:shadow-md cursor-pointer"
              >
                <Plus size={15} className="text-cyan-200" />
                <span>Log Suspense Payment</span>
              </button>
            )}
          </div>
        </div>
      </FadeUp>

      {/* ── SUMMARY KPI CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Total Suspense Received
            </span>
            <Receipt size={16} className="text-[#006064]" />
          </div>
          <p className="text-2xl font-display font-black text-[#1B1C1C] mt-2">
            ₹{summary.totalAmount.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] font-medium text-gray-500 mt-0.5">
            {summary.totalCount} total entries recorded
          </p>
        </div>

        <div className="bg-white p-4 border border-cyan-200 shadow-xs border-l-4 border-l-[#1ab0bc]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-800">
              Pending CM Allocation
            </span>
            <Clock size={16} className="text-[#1ab0bc]" />
          </div>
          <p className="text-2xl font-display font-black text-[#006064] mt-2">
            {summary.pendingCount}
          </p>
          <p className="text-[11px] font-medium text-cyan-700 mt-0.5">
            Active within 4-Hour SLA window
          </p>
        </div>

        <div className="bg-white p-4 border border-emerald-200 shadow-xs border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-800">
              Allocated &amp; Identified
            </span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-display font-black text-emerald-900 mt-2">
            {summary.identifiedCount}
          </p>
          <p className="text-[11px] font-medium text-emerald-700 mt-0.5">
            Claimed by CM &amp; identified
          </p>
        </div>

        <div className="bg-white p-4 border border-rose-200 shadow-xs border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-rose-800">
              Overdue / Unresolved
            </span>
            <AlertTriangle size={16} className="text-rose-600" />
          </div>
          <p className="text-2xl font-display font-black text-rose-900 mt-2">
            {summary.overdueCount}
          </p>
          <p className="text-[11px] font-medium text-rose-700 mt-0.5">
            Exceeded 4 hours or all rejected
          </p>
        </div>
      </div>

      {/* ── FILTER TOOLBAR ── */}
      <div className="bg-white p-3 border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by payment type, payer name, UTR, bank, notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-300 focus:bg-white focus:border-[#006064] focus:outline-hidden"
            />
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs text-gray-500 hover:text-black font-bold uppercase"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase text-gray-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-bold border border-gray-300 px-2.5 py-1.5 bg-white focus:border-[#006064] cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Recognition</option>
              <option value="IDENTIFIED">Identified / Allocated</option>
              <option value="REJECTED_ALL">Rejected by All Centers</option>
              <option value="OVERDUE">SLA Overdue (&gt; 4 hrs)</option>
            </select>
          </div>

          {/* Center Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase text-gray-500">Center:</span>
            <select
              value={selectedCenterFilter}
              onChange={(e) => setSelectedCenterFilter(e.target.value)}
              className="text-xs font-bold border border-gray-300 px-2.5 py-1.5 bg-white focus:border-[#006064] cursor-pointer"
            >
              <option value="ALL">All 3 Centers</option>
              <option value="mercado">Mercado</option>
              <option value="premier house">Premier House</option>
              <option value="agarwal complex">Agarwal Complex</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── SUSPENSE RECORDS LIST ── */}
      {loading ? (
        <div className="bg-white p-16 text-center border border-gray-200">
          <RefreshCcw className="w-8 h-8 text-[#1ab0bc] animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
            Loading Suspense Advance Payments...
          </p>
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="bg-white p-16 text-center border border-gray-200">
          <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-700 uppercase">No Suspense Entries Found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            {searchTerm || statusFilter !== 'ALL'
              ? 'No suspense advance payments match the active filter criteria.'
              : 'All advance payments have been allocated to client invoices or SDR.'}
          </p>
          {userRoleView !== 'CM' && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 px-4 py-2 bg-[#006064] text-white text-xs font-bold uppercase tracking-wider shadow-xs hover:bg-[#004D40] cursor-pointer"
            >
              + Log New Suspense Payment
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPayments.map((payment) => {
            const isAllocated = payment.overallStatus === 'IDENTIFIED';
            const isOverdue = payment.overallStatus === 'OVERDUE';
            const acceptedAlloc = payment.allocations?.find((a) => a.decision === 'ACCEPTED');

            return (
              <div
                key={payment.id}
                className={`bg-white border transition-all shadow-xs ${
                  isAllocated
                    ? 'border-emerald-300 bg-emerald-50/10'
                    : isOverdue
                    ? 'border-rose-300 bg-rose-50/10'
                    : 'border-gray-300 hover:border-[#006064]'
                }`}
              >
                {/* Entry Top Header */}
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gray-50/60">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="px-2.5 py-1 bg-[#1B1C1C] text-white text-[11px] font-mono font-bold tracking-widest">
                      SUSPENSE #{payment.id}
                    </span>

                    <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <Calendar size={13} className="text-gray-500" />
                      <span>Received: {payment.payReceiveDate}</span>
                    </span>

                    <span className="text-xs font-bold text-[#006064] bg-[#006064]/10 px-2 py-0.5">
                      {payment.suspensePaymentType}
                    </span>

                    {/* 4-Hour SLA Timer */}
                    {renderTimeCountdown(payment.deadlineAt, payment.overallStatus)}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-gray-500 font-bold hidden sm:inline">
                      Planned 4h Window: {payment.plannedTimestamp}
                    </span>

                    {/* 1-Click Google Sheets Sync Status & Trigger */}
                    <button
                      type="button"
                      onClick={() => handleManualSync(payment.id)}
                      disabled={syncingId === payment.id}
                      className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border transition-all cursor-pointer shadow-2xs ${
                        payment.fmsRowStart
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                          : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 animate-pulse'
                      }`}
                      title={
                        payment.fmsRowStart
                          ? `Synced to 'expense fms' Rows ${payment.fmsRowStart}–${payment.fmsRowStart + 2}. Click to re-sync.`
                          : 'Not yet recorded in Google Sheets. Click to sync now.'
                      }
                    >
                      <RefreshCcw size={11} className={syncingId === payment.id ? 'animate-spin text-amber-700' : ''} />
                      <span>
                        {payment.fmsRowStart
                          ? `Sheet Rows ${payment.fmsRowStart}–${payment.fmsRowStart + 2}`
                          : 'Sync to Sheet'}
                      </span>
                    </button>

                    {/* Edit Entry (Accountant / Super Admin) */}
                    {(canAccessAccountant || isSuperAdmin) && (
                      <button
                        type="button"
                        onClick={() => openEditModal(payment)}
                        className="p-1.5 text-gray-600 hover:text-[#006064] hover:bg-white border border-gray-200 hover:border-gray-300 transition-all cursor-pointer shadow-2xs"
                        title="Edit Suspense Entry"
                      >
                        <Pencil size={14} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedPaymentForDetails(payment)}
                      className="p-1.5 text-gray-500 hover:text-[#006064] hover:bg-white border border-transparent hover:border-gray-300 transition-all cursor-pointer"
                      title="View Details"
                    >
                      <Eye size={15} />
                    </button>

                    {(canAccessAccountant || isSuperAdmin) && (
                      <button
                        type="button"
                        onClick={() => handleDeletePayment(payment.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-white border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                        title="Delete Entry (Completely remove from website and Google Sheets)"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Entry Details & 3-Center Allocation Matrix */}
                <div className="p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left: Financial Payment Details — ALL 8 CORE DETAILS FOR CMs (Cols 1-4) */}
                    <div className="lg:col-span-4 space-y-3 pr-0 lg:pr-4 border-b lg:border-b-0 lg:border-r border-gray-200 pb-4 lg:pb-0">
                      {/* 1. Payment Receive Date (Col V) & Type (Col W) Header Badge */}
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-100 flex-wrap">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                            Payment Receive Date (Col V)
                          </span>
                          <span className="text-xs font-black text-gray-900 flex items-center gap-1.5 mt-0.5">
                            <Calendar size={13} className="text-[#006064]" />
                            {payment.payReceiveDate}
                          </span>
                        </div>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-[#006064]/10 text-[#006064] border border-[#006064]/20">
                          {payment.suspensePaymentType}
                        </span>
                      </div>

                      {/* 2. Amount Received */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          Amount Received (₹)
                        </span>
                        <div className="text-2xl font-display font-black text-[#1B1C1C]">
                          ₹{payment.amount.toLocaleString('en-IN')}
                        </div>
                      </div>

                      {/* 3 & 4. Payment Mode & UTR / Ref Number */}
                      <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50/80 p-2.5 border border-gray-200">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-gray-400 block">Payment Mode:</span>
                          <p className="font-bold text-gray-900 mt-0.5">
                            {payment.paymentMode || 'NEFT'}
                            {payment.bankName ? ` (${payment.bankName})` : ''}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-gray-400 block">UTR / Ref Number:</span>
                          <p className="font-mono font-bold text-gray-900 truncate mt-0.5" title={payment.utrNumber || 'N/A'}>
                            {payment.utrNumber || 'N/A'}
                          </p>
                        </div>
                      </div>

                      {/* 5. Payer / Remitter Name (From Bank Narration) — PROMINENT */}
                      <div className="text-xs p-2.5 bg-slate-50 border border-slate-200">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          Payer / Remitter Name (From Bank Narration):
                        </span>
                        <p className="font-bold text-gray-900 mt-0.5 text-[13px]">
                          {payment.payerName ? (
                            payment.payerName
                          ) : (
                            <span className="text-gray-400 italic font-normal text-xs">Not provided in narration</span>
                          )}
                        </p>
                      </div>

                      {/* 6. Payment Advice / Proof Attachment (PDF Only) */}
                      {payment.proofUrl ? (
                        <div>
                          <a
                            href={payment.proofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full inline-flex items-center justify-center gap-2 text-xs font-bold text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-2 rounded-xs transition-all shadow-2xs"
                          >
                            <FileText size={14} className="text-red-600" />
                            <span>View Attached PDF Payment Advice</span>
                            <ExternalLink size={12} className="opacity-70" />
                          </a>
                        </div>
                      ) : (
                        <div className="text-[11px] text-gray-400 italic p-1.5 border border-dashed border-gray-200 text-center">
                          No PDF advice attached
                        </div>
                      )}

                      {/* 7. Accountant Remarks / Clues */}
                      {payment.remarks && (
                        <div className="text-xs bg-amber-50/90 p-2.5 border border-amber-200 text-amber-900">
                          <span className="font-bold uppercase text-[9px] block text-amber-700 flex items-center gap-1">
                            <HelpCircle size={11} />
                            Accountant Remarks / Clues:
                          </span>
                          <p className="mt-0.5 font-medium">{payment.remarks}</p>
                        </div>
                      )}
                    </div>

                    {/* Right: 3-Center Recognition & Allocation Grid (Cols 5-12) */}
                    <div className="lg:col-span-8 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 size={16} className="text-[#006064]" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                            Community Manager 4-Hour Recognition Review (3 Centers)
                          </h4>
                        </div>
                        <span className="text-[10px] font-bold uppercase text-gray-500">
                          Google Sheets: Tab `expense fms` (Cols V–AA)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {ACTIVE_FMS_CENTERS.map((center) => {
                          const alloc = payment.allocations?.find(
                            (a) => a.centerName.toLowerCase() === center.name.toLowerCase()
                          );
                          const isAssignedToCurrentCM =
                            userRoleView === 'CM' &&
                            normalizedUserCenter &&
                            (normalizedUserCenter === center.name ||
                              normalizedUserCenter.includes(center.name) ||
                              center.name.includes(normalizedUserCenter));

                          const isDecisionPending = !alloc || alloc.decision === 'PENDING';
                          const isAccepted = alloc?.decision === 'ACCEPTED';
                          const isRejected = alloc?.decision === 'REJECTED';

                          return (
                            <div
                              key={center.name}
                              className={`p-3 border transition-all flex flex-col justify-between ${
                                isAccepted
                                  ? 'bg-emerald-50 border-emerald-300'
                                  : isRejected
                                  ? 'bg-gray-50 border-gray-200 opacity-85'
                                  : isAssignedToCurrentCM
                                  ? 'bg-cyan-50/50 border-[#1ab0bc] shadow-xs'
                                  : 'bg-white border-gray-300'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between pb-1.5 border-b border-gray-200/60 mb-2">
                                  <span className="text-xs font-black uppercase text-gray-900 tracking-tight flex items-center gap-1.5">
                                    <Building2 size={12} className="text-[#006064]" />
                                    <span>{center.displayName}</span>
                                  </span>

                                  {isAccepted ? (
                                    <span className="bg-emerald-600 text-white text-[9px] font-bold uppercase px-1.5 py-0.2">
                                      Accepted
                                    </span>
                                  ) : isRejected ? (
                                    <span className="bg-gray-400 text-white text-[9px] font-bold uppercase px-1.5 py-0.2">
                                      Not Ours
                                    </span>
                                  ) : (
                                    <span className="bg-amber-100 text-amber-800 text-[9px] font-bold uppercase px-1.5 py-0.2">
                                      Pending
                                    </span>
                                  )}
                                </div>

                                {isAccepted && (
                                  <div className="space-y-1 text-xs">
                                    <p className="font-bold text-emerald-950">
                                      Client: {alloc?.companyName || 'Identified'}
                                    </p>
                                    <p className="text-[11px] text-emerald-800">
                                      Purpose: {alloc?.identifiedType || 'Settlement'}
                                    </p>
                                    {alloc?.cmRemarks && (
                                      <p className="text-[10px] text-gray-600 italic">
                                        &ldquo;{alloc.cmRemarks}&rdquo;
                                      </p>
                                    )}
                                  </div>
                                )}

                                {isRejected && (
                                  <div className="text-xs text-gray-500">
                                    <p className="text-[11px]">CM confirmed payment does not belong to this center.</p>
                                    {alloc?.cmRemarks && (
                                      <p className="text-[10px] text-gray-400 italic mt-0.5">
                                        Note: {alloc.cmRemarks}
                                      </p>
                                    )}
                                  </div>
                                )}

                                {isDecisionPending && (
                                  <p className="text-[11px] text-gray-500">
                                    Awaiting CM review &amp; verification...
                                  </p>
                                )}
                              </div>

                              {/* Footer Timestamp & CM Actions */}
                              <div className="pt-3 mt-3 border-t border-gray-200/60">
                                {alloc?.actualTimestamp ? (
                                  <div className="text-[10px] font-mono text-gray-500 flex items-center justify-between">
                                    <span>Reviewed:</span>
                                    <span className="font-bold text-gray-700">{alloc.actualTimestamp}</span>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {/* Action buttons visible if CM for this center OR Super Admin / Accountant acting */}
                                    {(isAssignedToCurrentCM || userRoleView !== 'CM' || isSuperAdmin) && (
                                      <div className="grid grid-cols-2 gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => openReviewModal(payment, center.name, 'ACCEPTED')}
                                          className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                                          title={`Confirm payment belongs to ${center.displayName}`}
                                        >
                                          <Check size={12} />
                                          <span>Yes, Ours</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => openReviewModal(payment, center.name, 'REJECTED')}
                                          className="px-2 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                                          title={`Mark as NOT belonging to ${center.displayName}`}
                                        >
                                          <X size={12} />
                                          <span>No, Not Ours</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Overall Resolution Bar if Accepted */}
                      {isAllocated && acceptedAlloc && (
                        <div className="p-2.5 bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <CheckCircle2 size={15} className="text-emerald-700" />
                            <span>
                              Successfully recognized &amp; allocated to{' '}
                              <strong className="uppercase">{acceptedAlloc.centerDisplayName}</strong> for company{' '}
                              <strong>{acceptedAlloc.companyName}</strong>.
                            </span>
                          </span>
                          <span className="text-[10px] font-mono bg-emerald-200 px-2 py-0.5 rounded-xs">
                            Col Z Actual: {acceptedAlloc.actualTimestamp}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 1: ACCOUNTANT LOG ADVANCE SUSPENSE PAYMENT ── */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex min-h-screen items-start sm:items-center justify-center p-3 sm:p-4 py-8 sm:py-12 animate-in fade-in duration-150">
          <div className="relative bg-white border border-gray-300 max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[calc(100vh-4rem)] rounded-xs">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-[#006064] text-white px-5 py-4 flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xs bg-white/10 flex items-center justify-center border border-white/20">
                  <Receipt className="w-5 h-5 text-cyan-200" />
                </div>
                <div>
                  <h3 className="font-display font-black text-base sm:text-lg uppercase tracking-tight text-white leading-tight">
                    Log Advance Suspense Payment
                  </h3>
                  <p className="text-[11px] text-cyan-100/90 font-medium">
                    4-Hour Community Manager SLA allocation across 3 centers
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-white/80 hover:text-white p-1.5 hover:bg-white/10 rounded-xs transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleCreateSuspense} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="p-3 bg-cyan-50 border border-cyan-200 text-cyan-900 text-xs flex items-start gap-2">
                <Clock size={16} className="text-[#006064] shrink-0 mt-0.5" />
                <div>
                  <strong className="block uppercase tracking-wider text-[11px] text-[#006064]">
                    4-Hour Community Manager SLA:
                  </strong>
                  Submitting this entry will automatically dispatch allocation review alerts to the Community Managers
                  of <strong>Mercado</strong>, <strong>Premier House</strong>, and <strong>Agarwal Complex</strong>.
                  Data will be synchronized to Google Sheets tab <code>expense fms</code> across Columns V to AA.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Payment Receive Date */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Payment Receive Date * (Col V)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 14/09/2026"
                    value={formPayReceiveDate}
                    onChange={(e) => setFormPayReceiveDate(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 border border-gray-300 bg-gray-50 focus:bg-white focus:border-[#006064] focus:outline-hidden"
                  />
                </div>

                {/* Amount (₹) */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Amount Received (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    step="any"
                    placeholder="e.g. 50000"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full text-sm font-black p-2.5 border border-gray-300 bg-gray-50 focus:bg-white focus:border-[#006064] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Suspense Payment Type */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Suspense Payment Type / Description * (Col W)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Advance Rent, x payment received, Meeting Room Booking..."
                  value={formPaymentType}
                  onChange={(e) => setFormPaymentType(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 border border-gray-300 bg-gray-50 focus:bg-white focus:border-[#006064] focus:outline-hidden"
                />

                {/* Quick suggestions chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {typeSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setFormPaymentType(suggestion)}
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 border transition-all cursor-pointer ${
                        formPaymentType === suggestion
                          ? 'bg-[#006064] text-white border-[#006064]'
                          : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Payment Mode */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={formPaymentMode}
                    onChange={(e) => setFormPaymentMode(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 border border-gray-300 bg-gray-50 focus:bg-white focus:border-[#006064] focus:outline-hidden cursor-pointer"
                  >
                    <option value="NEFT">NEFT</option>
                    <option value="RTGS">RTGS</option>
                    <option value="IMPS">IMPS</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                {/* UTR / Reference */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                    UTR / Ref Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CMS12345678"
                    value={formUtrNumber}
                    onChange={(e) => setFormUtrNumber(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 border border-gray-300 bg-gray-50 focus:bg-white focus:border-[#006064] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Payer / Remitter Name */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Payer / Remitter Name (From Bank Narration)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Narration / Account Holder / Client Name"
                  value={formPayerName}
                  onChange={(e) => setFormPayerName(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 border border-gray-300 bg-gray-50 focus:bg-white focus:border-[#006064] focus:outline-hidden"
                />
              </div>

              {/* Mandatory PDF Attachment (PDF Only) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-800">
                    Payment Advice / Proof Attachment (PDF Only) *
                  </label>
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded-xs">
                    Mandatory • PDF Only
                  </span>
                </div>

                {!formProofUrl ? (
                  <div
                    className={`border-2 border-dashed transition-all p-4 text-center rounded-xs ${
                      uploadingPdf
                        ? 'border-[#006064] bg-cyan-50/50'
                        : 'border-gray-300 bg-gray-50/80 hover:bg-gray-100 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="file"
                      id="suspense-pdf-upload"
                      accept="application/pdf,.pdf"
                      disabled={uploadingPdf}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="suspense-pdf-upload"
                      className="cursor-pointer flex flex-col items-center justify-center gap-2"
                    >
                      {uploadingPdf ? (
                        <div className="flex flex-col items-center gap-1.5 py-2">
                          <RefreshCcw size={24} className="animate-spin text-[#006064]" />
                          <span className="text-xs font-bold text-[#006064]">Uploading & Storing PDF...</span>
                          <span className="text-[10px] text-gray-500">Please wait while the document is uploaded</span>
                        </div>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                            <FileText size={20} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-900">
                              Click to browse or upload Payment Advice PDF
                            </p>
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              PDF only (Max 50MB) • Shared with 3 Community Managers for allocation
                            </p>
                          </div>
                          <span className="mt-1 px-3 py-1 bg-white border border-gray-300 text-[11px] font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-50 shadow-2xs">
                            Select PDF File
                          </span>
                        </>
                      )}
                    </label>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 bg-red-600 text-white rounded-xs flex items-center justify-center shrink-0 font-bold text-[10px] shadow-xs">
                        PDF
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">
                          {formProofName || 'Payment_Advice.pdf'}
                        </p>
                        <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                          <Check size={12} />
                          <span>PDF Uploaded &amp; Attached</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={formProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 text-[11px] font-bold text-[#006064] bg-white border border-[#006064]/30 hover:bg-cyan-50 flex items-center gap-1 shadow-2xs"
                      >
                        <Eye size={12} />
                        <span>Preview</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setFormProofUrl('');
                          setFormProofName('');
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold text-red-600 bg-white border border-red-200 hover:bg-red-50 flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <X size={12} />
                        <span>Change</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Accountant Remarks */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Accountant Remarks / Clues
                </label>
                <textarea
                  rows={2}
                  placeholder="Any details noted from bank statement or client message..."
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 border border-gray-300 bg-gray-50 focus:bg-white focus:border-[#006064] focus:outline-hidden"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold uppercase text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEntry || uploadingPdf}
                  className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-[#006064] hover:bg-[#004D40] shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submittingEntry ? (
                    <>
                      <RefreshCcw size={14} className="animate-spin" />
                      <span>Saving &amp; Dispatching...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} className="text-cyan-200" />
                      <span>Submit &amp; Send to 3 Centers</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 2: COMMUNITY MANAGER RECOGNITION REVIEW ── */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {selectedPaymentForReview && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex min-h-screen items-start sm:items-center justify-center p-3 sm:p-4 py-8 sm:py-12 animate-in fade-in duration-150">
          <div className="relative bg-white border border-gray-300 max-w-lg w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[calc(100vh-4rem)] rounded-xs">
            {/* Modal Header */}
            <div
              className={`px-5 py-3.5 text-white flex items-center justify-between shrink-0 ${
                reviewDecision === 'ACCEPTED' ? 'bg-emerald-700' : 'bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {reviewDecision === 'ACCEPTED' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-300" />
                )}
                <h3 className="font-display font-black text-base sm:text-lg uppercase tracking-tight">
                  {reviewDecision === 'ACCEPTED'
                    ? `Confirm Payment Belongs to ${reviewCenterName.toUpperCase()}`
                    : `Mark as NOT Belongs to ${reviewCenterName.toUpperCase()}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPaymentForReview(null)}
                className="text-white/80 hover:text-white p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {/* Full Payment Context Card for CM Review */}
              <div className="p-3.5 bg-gray-50 border border-gray-300 text-xs space-y-2 rounded-xs shadow-2xs">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[#1B1C1C] text-white text-[10px] font-mono font-bold">
                      SUSPENSE #{selectedPaymentForReview.id}
                    </span>
                    <span className="font-bold text-gray-700 flex items-center gap-1">
                      <Calendar size={12} className="text-[#006064]" />
                      Receive Date: {selectedPaymentForReview.payReceiveDate}
                    </span>
                  </div>
                  <span className="text-base font-black text-[#006064]">
                    ₹{selectedPaymentForReview.amount.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-gray-400 block">Payment Type (Col W):</span>
                    <span className="font-bold text-gray-900">{selectedPaymentForReview.suspensePaymentType}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-gray-400 block">Payment Mode:</span>
                    <span className="font-bold text-gray-900">{selectedPaymentForReview.paymentMode || 'NEFT'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-gray-400 block">UTR / Ref Number:</span>
                    <span className="font-mono font-bold text-gray-900">{selectedPaymentForReview.utrNumber || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-gray-400 block">Payer / Remitter:</span>
                    <span className="font-bold text-gray-900">{selectedPaymentForReview.payerName || 'Not specified'}</span>
                  </div>
                </div>

                {selectedPaymentForReview.remarks && (
                  <div className="bg-amber-50 p-2 border border-amber-200 text-amber-900 text-[11px]">
                    <span className="font-bold text-[9px] uppercase block text-amber-700">Accountant Clues:</span>
                    {selectedPaymentForReview.remarks}
                  </div>
                )}

                {selectedPaymentForReview.proofUrl && (
                  <div className="pt-1">
                    <a
                      href={selectedPaymentForReview.proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xs shadow-2xs"
                    >
                      <FileText size={13} className="text-red-600" />
                      <span>Open Attached PDF Payment Advice</span>
                      <ExternalLink size={11} className="opacity-70" />
                    </a>
                  </div>
                )}
              </div>

              {reviewDecision === 'ACCEPTED' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Client / Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Technologies Pvt Ltd"
                      value={reviewCompanyName}
                      onChange={(e) => setReviewCompanyName(e.target.value)}
                      className="w-full text-xs font-bold p-2.5 border border-gray-300 bg-gray-50 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Payment Purpose / Nature
                    </label>
                    <select
                      value={reviewIdentifiedType}
                      onChange={(e) => setReviewIdentifiedType(e.target.value)}
                      className="w-full text-xs font-bold p-2.5 border border-gray-300 bg-gray-50 focus:bg-white focus:border-emerald-600 focus:outline-hidden cursor-pointer"
                    >
                      <option value="Invoice Settlement">Monthly Invoice Settlement</option>
                      <option value="Security Deposit (SDR)">Security Deposit (SDR)</option>
                      <option value="Advance Rent">Advance Rent for Upcoming Month</option>
                      <option value="Meeting Room / Event">Meeting Room / Day Pass</option>
                      <option value="Electricity / Additional Services">Electricity / Utility Surcharge</option>
                      <option value="Other Purpose">Other Identified Purpose</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                      CM Comments / Verification Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Client confirmed payment via WhatsApp screenshot..."
                      value={reviewCmRemarks}
                      onChange={(e) => setReviewCmRemarks(e.target.value)}
                      className="w-full text-xs font-medium p-2.5 border border-gray-300 bg-gray-50 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-gray-700">
                    You are marking this advance payment as <strong>NOT belonging to {reviewCenterName.toUpperCase()}</strong>.
                    The review timestamp will be stored in Google Sheets Column Z and marked as Done.
                  </p>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Reason / Note (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Checked all active clients and bookings, no matching payer found."
                      value={reviewCmRemarks}
                      onChange={(e) => setReviewCmRemarks(e.target.value)}
                      className="w-full text-xs font-medium p-2.5 border border-gray-300 bg-gray-50 focus:bg-white focus:border-gray-600 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedPaymentForReview(null)}
                  className="px-4 py-2 text-xs font-bold uppercase text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                  className={`px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                    reviewDecision === 'ACCEPTED'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-gray-800 hover:bg-black'
                  }`}
                >
                  {submittingReview ? (
                    <>
                      <RefreshCcw size={14} className="animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>{reviewDecision === 'ACCEPTED' ? 'Confirm Allocation' : 'Confirm Not Ours'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 3: VIEW FULL RECORD DETAILS ── */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {selectedPaymentForDetails && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex min-h-screen items-start sm:items-center justify-center p-3 sm:p-4 py-8 sm:py-12 animate-in fade-in duration-150">
          <div className="relative bg-white border border-gray-300 max-w-xl w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[calc(100vh-4rem)] rounded-xs">
            <div className="bg-[#1B1C1C] text-white px-5 py-3.5 flex items-center justify-between shrink-0">
              <h3 className="font-display font-black text-base sm:text-lg uppercase tracking-tight">
                Suspense Entry #{selectedPaymentForDetails.id} Details
              </h3>
              <button
                type="button"
                onClick={() => setSelectedPaymentForDetails(null)}
                className="text-white/80 hover:text-white p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto text-xs flex-1">
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-gray-200">
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400">Payment Receive Date:</span>
                  <p className="font-bold text-gray-900">{selectedPaymentForDetails.payReceiveDate}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400">Amount Received:</span>
                  <p className="font-black text-base text-[#006064]">
                    ₹{selectedPaymentForDetails.amount.toLocaleString('en-IN')}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400">Payment Type:</span>
                  <p className="font-bold text-gray-900">{selectedPaymentForDetails.suspensePaymentType}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400">Overall Status:</span>
                  <p className="font-bold text-gray-900">{selectedPaymentForDetails.overallStatus}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-gray-200">
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400">Payment Mode:</span>
                  <p className="font-bold text-gray-900">
                    {selectedPaymentForDetails.paymentMode || 'NEFT'}
                    {selectedPaymentForDetails.bankName ? ` (${selectedPaymentForDetails.bankName})` : ''}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400">UTR / Ref:</span>
                  <p className="font-mono font-bold text-gray-900">{selectedPaymentForDetails.utrNumber || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400">Payer Name:</span>
                  <p className="font-bold text-gray-900">{selectedPaymentForDetails.payerName || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400">Entered By:</span>
                  <p className="font-bold text-gray-900">{selectedPaymentForDetails.enteredByName || 'Accountant'}</p>
                </div>
              </div>

              {selectedPaymentForDetails.proofUrl && (
                <div className="p-3 bg-red-50/70 border border-red-200 rounded-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-red-700">
                    <FileText size={15} className="text-red-600" />
                    <span className="font-bold text-xs">Attached Payment Advice (PDF)</span>
                  </div>
                  <a
                    href={selectedPaymentForDetails.proofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 text-[11px] font-bold text-red-700 bg-white border border-red-300 hover:bg-red-100 flex items-center gap-1 shadow-2xs"
                  >
                    <span>Open PDF</span>
                    <ExternalLink size={11} />
                  </a>
                </div>
              )}

              <div>
                <span className="text-[10px] font-bold uppercase text-gray-400">Planned 4-Hour SLA:</span>
                <p className="font-mono font-bold text-gray-900">{selectedPaymentForDetails.plannedTimestamp}</p>
              </div>

              {selectedPaymentForDetails.remarks && (
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400">Remarks:</span>
                  <p className="text-gray-800 bg-gray-50 p-2 border border-gray-200">{selectedPaymentForDetails.remarks}</p>
                </div>
              )}

              {/* 3 Center Breakdown */}
              <div className="pt-2">
                <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1.5">
                  Center Allocations &amp; FMS Status:
                </span>
                <div className="space-y-2">
                  {selectedPaymentForDetails.allocations?.map((a) => (
                    <div key={a.id} className="p-2 border border-gray-200 bg-gray-50 flex items-center justify-between text-xs">
                      <div>
                        <strong className="uppercase">{a.centerDisplayName}</strong>: {a.decision}
                        {a.companyName && <span className="text-emerald-700 ml-1">({a.companyName})</span>}
                      </div>
                      <div className="text-right text-[10px] text-gray-500 font-mono">
                        {a.actualTimestamp ? `Actual: ${a.actualTimestamp}` : 'Pending'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                {(canAccessAccountant || isSuperAdmin) && (
                  <button
                    type="button"
                    onClick={async () => {
                      const id = selectedPaymentForDetails.id;
                      setSelectedPaymentForDetails(null);
                      await handleDeletePayment(id);
                    }}
                    className="px-3 py-1.5 text-xs font-bold uppercase text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 transition-all cursor-pointer flex items-center gap-1.5"
                    title="Delete entry from website & Google Sheets"
                  >
                    <Trash2 size={13} />
                    <span>Delete Entry</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedPaymentForDetails(null)}
                  className="px-4 py-1.5 text-xs font-bold uppercase text-gray-700 bg-gray-100 hover:bg-gray-200 cursor-pointer ml-auto"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 4: ACCOUNTANT EDIT SUSPENSE PAYMENT ENTRY ── */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {isEditModalOpen && selectedPaymentForEdit && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex min-h-screen items-start sm:items-center justify-center p-3 sm:p-4 py-8 sm:py-12 animate-in fade-in duration-150">
          <div className="relative bg-white border border-gray-300 max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[calc(100vh-4rem)] rounded-xs">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-[#1B1C1C] text-white px-5 py-4 flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xs bg-white/10 flex items-center justify-center border border-white/20">
                  <Pencil className="w-5 h-5 text-cyan-300" />
                </div>
                <div>
                  <h3 className="font-display font-black text-base sm:text-lg uppercase tracking-tight text-white leading-tight">
                    Edit Suspense Entry #{selectedPaymentForEdit.id}
                  </h3>
                  <p className="text-[11px] text-gray-300 font-medium">
                    Modify payment details &amp; synchronize with Google Sheets tab <code>expense fms</code>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-white/80 hover:text-white p-1.5 hover:bg-white/10 rounded-xs transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Payment Receive Date (Col V) */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Payment Receive Date * (Col V)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="DD/MM/YYYY e.g. 19/09/2026"
                    value={editPayReceiveDate}
                    onChange={(e) => setEditPayReceiveDate(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 border border-gray-300 bg-gray-50 focus:bg-white focus:border-[#006064] focus:outline-hidden"
                  />
                </div>

                {/* Amount Received */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Amount Received (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-400">₹</span>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      placeholder="e.g. 50000"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="w-full text-xs font-bold pl-7 pr-3 py-2.5 border border-gray-300 bg-gray-50 focus:bg-white focus:border-[#006064] focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Suspense Payment Type (Col W) */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Suspense Payment Type / Description * (Col W)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Advance Rent, x payment received, Meeting Room Booking..."
                  value={editPaymentType}
                  onChange={(e) => setEditPaymentType(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 border border-gray-300 bg-gray-50 focus:bg-white focus:border-[#006064] focus:outline-hidden"
                />

                {/* Quick suggestions chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {typeSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setEditPaymentType(suggestion)}
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 border transition-all cursor-pointer ${
                        editPaymentType === suggestion
                          ? 'bg-[#006064] text-white border-[#006064]'
                          : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Payment Mode */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={editPaymentMode}
                    onChange={(e) => setEditPaymentMode(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 border border-gray-300 bg-gray-50 focus:bg-white focus:border-[#006064] focus:outline-hidden cursor-pointer"
                  >
                    <option value="NEFT">NEFT</option>
                    <option value="RTGS">RTGS</option>
                    <option value="IMPS">IMPS</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                {/* UTR / Reference */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                    UTR / Ref Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CMS12345678"
                    value={editUtrNumber}
                    onChange={(e) => setEditUtrNumber(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 border border-gray-300 bg-gray-50 focus:bg-white focus:border-[#006064] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Payer / Remitter Name */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Payer / Remitter Name (From Bank Narration)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Narration / Account Holder / Client Name"
                  value={editPayerName}
                  onChange={(e) => setEditPayerName(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 border border-gray-300 bg-gray-50 focus:bg-white focus:border-[#006064] focus:outline-hidden"
                />
              </div>

              {/* PDF Attachment (Preview & Replace) */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-800 mb-1">
                  Payment Advice / Proof Attachment (PDF Only)
                </label>

                {editProofUrl ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 bg-red-600 text-white rounded-xs flex items-center justify-center shrink-0 font-bold text-[10px] shadow-xs">
                        PDF
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">
                          {editProofName || 'Payment_Advice.pdf'}
                        </p>
                        <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                          <Check size={12} />
                          <span>PDF Document Attached</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={editProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 text-[11px] font-bold text-[#006064] bg-white border border-[#006064]/30 hover:bg-cyan-50 flex items-center gap-1 shadow-2xs"
                      >
                        <Eye size={12} />
                        <span>Preview</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setEditProofUrl('');
                          setEditProofName('');
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold text-red-600 bg-white border border-red-200 hover:bg-red-50 flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <X size={12} />
                        <span>Replace</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 p-4 text-center rounded-xs bg-gray-50">
                    <input
                      type="file"
                      id="edit-suspense-pdf-upload"
                      accept="application/pdf,.pdf"
                      disabled={uploadingEditPdf}
                      onChange={handleEditFileUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="edit-suspense-pdf-upload"
                      className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
                    >
                      {uploadingEditPdf ? (
                        <div className="flex flex-col items-center gap-1 py-1">
                          <RefreshCcw size={20} className="animate-spin text-[#006064]" />
                          <span className="text-xs font-bold text-[#006064]">Uploading PDF...</span>
                        </div>
                      ) : (
                        <>
                          <FileText size={20} className="text-red-500" />
                          <span className="text-xs font-bold text-gray-800">
                            Click to upload new Payment Advice PDF
                          </span>
                          <span className="text-[10px] text-gray-500">PDF only (Max 50MB)</span>
                        </>
                      )}
                    </label>
                  </div>
                )}
              </div>

              {/* Accountant Remarks */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Accountant Remarks / Clues
                </label>
                <textarea
                  rows={2}
                  placeholder="Any clues noted from bank narration or client WhatsApp..."
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 border border-gray-300 bg-gray-50 focus:bg-white focus:border-[#006064] focus:outline-hidden"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-200 flex items-center justify-between gap-3">
                {(canAccessAccountant || isSuperAdmin) && (
                  <button
                    type="button"
                    disabled={savingEdit}
                    onClick={async () => {
                      const id = selectedPaymentForEdit.id;
                      setIsEditModalOpen(false);
                      await handleDeletePayment(id);
                    }}
                    className="px-3 py-2 text-xs font-bold uppercase text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 transition-all cursor-pointer flex items-center gap-1.5"
                    title="Delete entry from website & Google Sheets"
                  >
                    <Trash2 size={14} />
                    <span>Delete Entry</span>
                  </button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold uppercase text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit || uploadingEditPdf}
                    className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-[#006064] hover:bg-[#004D40] shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {savingEdit ? (
                      <>
                        <RefreshCcw size={14} className="animate-spin" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>Save &amp; Update Google Sheet</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
