'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Search,
  CheckCircle2,
  Upload,
  FileText,
  Loader2,
  Check,
  CreditCard,
  RotateCcw,
  ArrowRight,
  AlertCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { LiveApprovedInvoice } from './invoice-payment-management';

// Format INR currency
function formatCurrency(amt: number | string | null | undefined): string {
  const num = Number(amt || 0);
  return '₹' + num.toLocaleString('en-IN');
}

export interface DailyFmsCheckItem {
  id?: number;
  checkDate: string;
  status: 'YES' | 'NO';
  timestamp: string;
  checkedById: number | null;
  checkedByName: string;
  checkedByEmail: string;
  checkedAt: string;
  remarks?: string | null;
}

export interface PaymentPartItem {
  id: string; // e.g. 'part_1', 'part_2'
  payReceiveDate: string;
  receiveAmount: string;
  paymentMode: string;
  utrNumber: string;
  utrDate: string;
  tdsDeducted: string; // 'No' | '10' | '2' | '1' | 'Custom'
  tdsAmount: string;
  utrFileUrl?: string | null;
  utrFileName?: string | null;
  remarks: string;
  uploadingFile?: boolean;
}

export interface InvoiceRowDraft {
  parts: PaymentPartItem[];
  autoSaveStatus?: 'idle' | 'editing' | 'saving' | 'saved' | 'error';
  saved?: boolean;
  lastSavedAt?: string;
  errorMessage?: string;
}

interface ManagePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: LiveApprovedInvoice[];
  onInvoiceUpdated: (updated: LiveApprovedInvoice) => void;
  todayCheck: DailyFmsCheckItem | null;
  onDailyCheckSaved: (check: DailyFmsCheckItem) => void;
  locations?: { id: number; name: string }[];
  availableMonths?: string[];
}

export function ManagePaymentModal({
  isOpen,
  onClose,
  invoices,
  onInvoiceUpdated,
  todayCheck,
  onDailyCheckSaved,
  locations = [],
  availableMonths = [],
}: ManagePaymentModalProps) {
  const [mounted, setMounted] = useState(false);

  // Step state: 'CHECK' (Yes/No Question) | 'PENDING_TABLE' (Excel Table of Pending Invoices)
  const [step, setStep] = useState<'CHECK' | 'PENDING_TABLE'>('CHECK');
  const [selectedChoice, setSelectedChoice] = useState<'YES' | 'NO' | null>(null);
  const [submittingCheck, setSubmittingCheck] = useState(false);

  // Table filters inside modal
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');

  // Multi-part row drafts map: invoiceId -> InvoiceRowDraft
  const [rowDrafts, setRowDrafts] = useState<Record<number, InvoiceRowDraft>>({});
  const activeUploadRef = useRef<{ invId: number; partId: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Ref to hold debounce timers for live auto-save per row
  const autoSaveTimersRef = useRef<Record<number, NodeJS.Timeout>>({});

  useEffect(() => {
    setMounted(true);
    return () => {
      // Clean up timers on unmount
      Object.values(autoSaveTimersRef.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  // Initialize modal state when opened
  useEffect(() => {
    if (isOpen) {
      if (todayCheck) {
        setSelectedChoice(todayCheck.status);
        if (todayCheck.status === 'YES') {
          setStep('PENDING_TABLE');
        } else {
          setStep('CHECK');
        }
      } else {
        setSelectedChoice(null);
        setStep('CHECK');
      }
    }
  }, [isOpen, todayCheck]);

  // Pre-fill row drafts for invoices with multi-part installment support
  // For pending entries, DO NOT pre-fill date or amount (keep blank for accountant input)
  useEffect(() => {
    if (!isOpen) return;

    setRowDrafts((prev) => {
      const next: Record<number, InvoiceRowDraft> = { ...prev };
      invoices.forEach((inv) => {
        if (!next[inv.id]) {
          let initialParts: PaymentPartItem[] = [];

          // 1. Try to load existing multi-part payments from paymentsJson
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
            } catch (e) {
              console.warn('Failed to parse paymentsJson', e);
            }
          }

          // 2. If no paymentsJson but single payment exists in record
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
                inv.tdsAmount !== undefined && inv.tdsAmount !== null
                  ? String(inv.tdsAmount)
                  : '0',
              utrFileUrl: inv.utrFileUrl || null,
              utrFileName: inv.utrFileName || null,
              remarks: inv.remarks || 'Previous payment',
            });
          }

          const invTotal = Number(inv.totalAmount || 0);
          const totalAlreadyRecorded = initialParts.reduce(
            (sum, p) => sum + (parseFloat(p.receiveAmount) || 0),
            0
          );

          // 3. Ensure there is a blank part ready for entering pending balance
          if (initialParts.length === 0) {
            // 100% unpaid: start with 1 blank part
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
          } else if (totalAlreadyRecorded < invTotal) {
            // Half payment pending: if all existing parts are filled, add an empty part for remaining balance
            const hasEmptyPart = initialParts.some((p) => !p.receiveAmount && !p.payReceiveDate);
            if (!hasEmptyPart) {
              initialParts.push({
                id: `part_${initialParts.length + 1}`,
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
  }, [isOpen, invoices]);

  // Filter invoices for table view: STRICTLY pending invoices only!
  // Pending means: balance > 0 and invoice total > receiveAmount and status != 'RECEIVED'
  // (Both unpaid and half/partial payments).
  // If an invoice was just saved in this session, keep it visible so accountant sees "Auto-Saved ✓".
  const displayInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const recAmt = Number(inv.receiveAmount || 0);
      const totalAmt = Number(inv.totalAmount || 0);
      const balAmt = Math.max(0, totalAmt - recAmt);
      const isSettled = inv.paymentStatus === 'RECEIVED' || (recAmt >= totalAmt && totalAmt > 0) || balAmt <= 0;

      const draft = rowDrafts[inv.id];
      // If invoice is fully settled and was not saved in this session, hide it
      if (isSettled && !draft?.saved) return false;

      if (selectedLocation !== 'ALL' && String(inv.locationId) !== selectedLocation) {
        return false;
      }
      if (selectedMonth !== 'ALL' && inv.billingMonth !== selectedMonth) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchComp = inv.companyName.toLowerCase().includes(q);
        const matchLoc = (inv.locationName || '').toLowerCase().includes(q);
        const matchGst = (inv.gstNo || '').toLowerCase().includes(q);
        const matchMonth = (inv.billingMonth || '').toLowerCase().includes(q);
        const matchUtr = (inv.utrNumber || '').toLowerCase().includes(q);
        if (!matchComp && !matchLoc && !matchGst && !matchMonth && !matchUtr) {
          return false;
        }
      }
      return true;
    });
  }, [invoices, rowDrafts, selectedLocation, selectedMonth, searchQuery]);

  // Summary counts of all pending invoices
  const pendingSummary = useMemo(() => {
    let pendingCount = 0;
    let pendingSum = 0;
    invoices.forEach((inv) => {
      const recAmt = Number(inv.receiveAmount || 0);
      const totalAmt = Number(inv.totalAmount || 0);
      const bal = Math.max(0, totalAmt - recAmt);
      const isSettled = inv.paymentStatus === 'RECEIVED' || (recAmt >= totalAmt && totalAmt > 0) || bal <= 0;
      if (!isSettled && bal > 0) {
        pendingCount++;
        pendingSum += bal;
      }
    });
    return { pendingCount, pendingSum };
  }, [invoices]);

  // Handle Confirm "NO" Payment Check (Approve no payment received today and close portal)
  const handleConfirmNoPayment = async () => {
    setSubmittingCheck(true);
    try {
      const res = await fetch('/api/admin/invoice-payments/daily-fms-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'NO',
          remarks: 'Confirmed no client payments received today.',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record daily check');
      }

      onDailyCheckSaved(data.check);
      toast.success(
        `Approved: No payments received today (${data.check.timestamp}). FMS timestamp logged.`,
        { duration: 5000 }
      );
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error recording daily check');
    } finally {
      setSubmittingCheck(false);
    }
  };

  // Handle Select "YES" Payment Check (Proceed to enter pending invoice payments)
  const handleSelectYesPayment = async () => {
    setSelectedChoice('YES');
    setSubmittingCheck(true);
    try {
      const res = await fetch('/api/admin/invoice-payments/daily-fms-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'YES',
          remarks: 'Payment received today. Proceeding to entry table.',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onDailyCheckSaved(data.check);
      }
      // Proceed to the pending payments table
      setStep('PENDING_TABLE');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error recording daily check');
    } finally {
      setSubmittingCheck(false);
    }
  };

  // ── LIVE AUTO-SAVE WITH MULTI-PART SUPPORT ──
  const performSave = useCallback(
    async (invId: number, draft: InvoiceRowDraft, isSilent: boolean = false) => {
      const inv = invoices.find((i) => i.id === invId);
      if (!inv) return;

      const invTotal = Number(inv.totalAmount || 0);

      // Filter valid parts: any part that has a positive receive amount OR payReceiveDate OR utrNumber
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

      // Guard: if sum of parts exceeds invoice total
      if (totalRecordedRec > invTotal && invTotal > 0) {
        setRowDrafts((prev) => ({
          ...prev,
          [invId]: {
            ...prev[invId],
            autoSaveStatus: 'error',
            errorMessage: `Total parts (${formatCurrency(totalRecordedRec)}) exceed invoice sum (${formatCurrency(invTotal)})`,
          },
        }));
        return;
      }

      setRowDrafts((prev) => ({
        ...prev,
        [invId]: { ...prev[invId], autoSaveStatus: 'saving', errorMessage: undefined },
      }));

      const isFullSettlement = totalRecordedRec >= invTotal && invTotal > 0;
      const calculatedStatus = isFullSettlement
        ? 'RECEIVED'
        : totalRecordedRec > 0
        ? 'PARTIAL'
        : 'PENDING';

      // Primary entry details for top-level columns
      const latestPart = validParts[validParts.length - 1] || validParts[0];
      const combinedUtr = validParts.map((p) => p.utrNumber.trim()).filter(Boolean).join(', ');
      const combinedRemarks = validParts.map((p) => p.remarks.trim()).filter(Boolean).join(' | ');
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
        onInvoiceUpdated(updatedInv);

        setRowDrafts((prev) => ({
          ...prev,
          [invId]: {
            ...prev[invId],
            autoSaveStatus: 'saved',
            saved: true,
            lastSavedAt: new Date().toLocaleTimeString(),
          },
        }));

        if (!isSilent) {
          const newBal = Math.max(0, invTotal - totalRecordedRec);
          if (newBal === 0) {
            toast.success(`Auto-saved: ${inv.companyName} settled in full! FMS actual logged.`, {
              duration: 3000,
            });
          } else {
            toast.success(
              `Auto-saved: ${formatCurrency(totalRecordedRec)} recorded for ${inv.companyName}. Balance: ${formatCurrency(newBal)}`,
              { duration: 2500 }
            );
          }
        }
      } catch (err: any) {
        console.error('Auto-save error:', err);
        setRowDrafts((prev) => ({
          ...prev,
          [invId]: {
            ...prev[invId],
            autoSaveStatus: 'error',
            errorMessage: err.message || 'Auto-save failed',
          },
        }));
        toast.error(`Auto-save error for ${inv.companyName}: ${err.message}`);
      }
    },
    [invoices, onInvoiceUpdated]
  );

  // Schedule auto-save with debounce (700ms)
  const scheduleAutoSave = useCallback(
    (invId: number, draft: InvoiceRowDraft) => {
      if (autoSaveTimersRef.current[invId]) {
        clearTimeout(autoSaveTimersRef.current[invId]);
      }

      // Check if at least one part has valid payment entered
      const hasAnyInput = draft.parts.some(
        (p) => (parseFloat(p.receiveAmount) || 0) > 0 || p.payReceiveDate || p.utrNumber.trim()
      );

      if (!hasAnyInput) {
        draft.autoSaveStatus = 'idle';
        return;
      }

      const inv = invoices.find((i) => i.id === invId);
      const invTotal = Number(inv?.totalAmount || 0);

      let sumAmt = 0;
      draft.parts.forEach((p) => {
        sumAmt += parseFloat(p.receiveAmount) || 0;
      });

      if (sumAmt > invTotal && invTotal > 0) {
        draft.autoSaveStatus = 'error';
        draft.errorMessage = `Total parts (${formatCurrency(sumAmt)}) exceed invoice sum (${formatCurrency(invTotal)})`;
        return;
      }

      draft.autoSaveStatus = 'editing';

      autoSaveTimersRef.current[invId] = setTimeout(() => {
        performSave(invId, draft);
      }, 700);
    },
    [invoices, performSave]
  );

  // Immediately save on blur
  const handleBlurSave = (invId: number) => {
    const draft = rowDrafts[invId];
    if (!draft) return;
    const hasAnyReady = draft.parts.some(
      (p) => p.payReceiveDate && (parseFloat(p.receiveAmount) || 0) > 0
    );
    if (hasAnyReady) {
      if (autoSaveTimersRef.current[invId]) {
        clearTimeout(autoSaveTimersRef.current[invId]);
      }
      performSave(invId, draft);
    }
  };

  // Manual retry handler
  const handleManualRetry = (invId: number) => {
    const draft = rowDrafts[invId];
    if (draft) {
      performSave(invId, draft);
    }
  };

  // Add Another Payment Receive Entry / Part for an invoice
  const handleAddPart = (invId: number) => {
    setRowDrafts((prev) => {
      const current = prev[invId];
      if (!current) return prev;
      const nextIndex = current.parts.length + 1;
      const newPart: PaymentPartItem = {
        id: `part_${Date.now()}_${nextIndex}`,
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
          autoSaveStatus: 'editing',
        },
      };
    });
  };

  // Remove a payment part from an invoice
  const handleRemovePart = (invId: number, partId: string) => {
    setRowDrafts((prev) => {
      const current = prev[invId];
      if (!current || current.parts.length <= 1) return prev;
      const updatedParts = current.parts.filter((p) => p.id !== partId);
      const updatedDraft = { ...current, parts: updatedParts };
      scheduleAutoSave(invId, updatedDraft);
      return {
        ...prev,
        [invId]: updatedDraft,
      };
    });
  };

  // Update a field inside a specific payment part
  const updatePartField = (
    invId: number,
    partId: string,
    field: keyof PaymentPartItem,
    value: any
  ) => {
    setRowDrafts((prev) => {
      const current = prev[invId];
      if (!current) return prev;

      const updatedParts = current.parts.map((p) => {
        if (p.id !== partId) return p;
        const updated = { ...p, [field]: value };

        // Auto-calculate TDS if percentage selected
        if (field === 'receiveAmount' || field === 'tdsDeducted') {
          const amt = parseFloat(field === 'receiveAmount' ? value : updated.receiveAmount) || 0;
          const tdsType = field === 'tdsDeducted' ? value : updated.tdsDeducted;
          if (tdsType === '10') {
            updated.tdsAmount = String(Math.round(amt * 0.1));
          } else if (tdsType === '2') {
            updated.tdsAmount = String(Math.round(amt * 0.02));
          } else if (tdsType === '1') {
            updated.tdsAmount = String(Math.round(amt * 0.01));
          } else if (tdsType === 'No') {
            updated.tdsAmount = '0';
          }
        }

        if (field === 'payReceiveDate' && !updated.utrDate) {
          updated.utrDate = value;
        }

        return updated;
      });

      const updatedDraft = { ...current, parts: updatedParts };
      scheduleAutoSave(invId, updatedDraft);
      return {
        ...prev,
        [invId]: updatedDraft,
      };
    });
  };

  // Trigger file upload for bank advice / UTR receipt for a specific part
  const handleTriggerUpload = (invId: number, partId: string) => {
    activeUploadRef.current = { invId, partId };
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileUploaded = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const uploadRef = activeUploadRef.current;
    if (!file || !uploadRef) return;

    const { invId, partId } = uploadRef;
    updatePartField(invId, partId, 'uploadingFile', true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentCategory', 'ACCOUNTANT_PAYMENT_UTR_ADVICE');
    formData.append('companyName', 'Payment Receipt');

    try {
      const res = await fetch('/api/admin/documents/upload-receipt', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        updatePartField(invId, partId, 'utrFileUrl', data.url);
        updatePartField(invId, partId, 'utrFileName', file.name);
        updatePartField(invId, partId, 'uploadingFile', false);
        toast.success(`Bank advice uploaded for row #${invId}`);
      } else {
        toast.error(data.error || 'Failed to upload receipt');
        updatePartField(invId, partId, 'uploadingFile', false);
      }
    } catch {
      toast.error('Network error uploading file');
      updatePartField(invId, partId, 'uploadingFile', false);
    } finally {
      activeUploadRef.current = null;
    }
  };

  // Flush any pending auto-saves before closing modal
  const handleCloseModal = async () => {
    for (const [idStr, timer] of Object.entries(autoSaveTimersRef.current)) {
      clearTimeout(timer);
      const id = Number(idStr);
      const draft = rowDrafts[id];
      if (draft && draft.autoSaveStatus === 'editing') {
        await performSave(id, draft, true);
      }
    }
    onClose();
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !submittingCheck) {
          handleCloseModal();
        }
      }}
      className="fixed inset-0 z-[999999] flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs font-sans overflow-y-auto"
    >
      {/* Hidden file input for bank advice uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUploaded}
        accept=".pdf,.png,.jpg,.jpeg"
        className="hidden"
      />

      <div
        className={`bg-white border border-neutral-300 shadow-2xl w-full flex flex-col rounded-sm overflow-hidden my-auto transition-all ${
          step === 'CHECK' ? 'max-w-xl' : 'max-w-[96vw] xl:max-w-[95vw] max-h-[95vh]'
        }`}
      >
        {/* Modal Header: Clean Title without Before 10:30 AM */}
        <div className="px-5 py-3.5 bg-[#004D40] text-white flex items-center justify-between shrink-0 shadow-xs border-b border-emerald-950">
          <div className="flex items-center gap-2.5">
            <CreditCard size={18} className="text-emerald-300" />
            <div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-emerald-200 flex items-center gap-1.5">
                <span>SSPACIA Financials • Invoice Payment Receive Management</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold uppercase font-display tracking-wide text-white">
                {step === 'CHECK'
                  ? 'Daily Payment Settlement Check'
                  : 'Enter Client Payment Receive Details Against Invoices'}
              </h3>
            </div>
          </div>
          <button
            onClick={handleCloseModal}
            className="p-1.5 text-white/80 hover:text-white hover:bg-emerald-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── STEP 1: YES / NO DAILY CHECK (Clean, no extra clutter) ── */}
        {step === 'CHECK' && (
          <div className="p-6 space-y-5 text-neutral-800">
            {/* Status if already checked today */}
            {todayCheck && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 flex items-center gap-2.5 text-xs text-emerald-950 font-medium">
                <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
                <div>
                  <span className="font-bold">Today's check has already been recorded:</span>{' '}
                  <span className="font-mono font-bold text-emerald-800 uppercase px-1.5 py-0.5 bg-white border border-emerald-300">
                    {todayCheck.status}
                  </span>{' '}
                  at {todayCheck.timestamp} by {todayCheck.checkedByName}. You may update it below.
                </div>
              </div>
            )}

            {/* Clean Heading - No extra lines */}
            <div className="text-center py-4 border-y border-neutral-200">
              <h2 className="text-lg font-black text-neutral-900 font-display">
                Has any client payment been received today?
              </h2>
            </div>

            {/* Options Selection */}
            <div className="grid grid-cols-2 gap-4">
              {/* Option 1: NO */}
              <button
                type="button"
                onClick={() => setSelectedChoice('NO')}
                className={`p-4 border-2 text-left cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                  selectedChoice === 'NO'
                    ? 'border-neutral-900 bg-neutral-100 shadow-sm'
                    : 'border-neutral-200 hover:border-neutral-400 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display font-black text-base text-neutral-900">
                    NO
                  </span>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      selectedChoice === 'NO'
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-300'
                    }`}
                  >
                    {selectedChoice === 'NO' && <Check size={12} />}
                  </div>
                </div>
                <p className="text-xs text-gray-600 font-normal leading-snug">
                  No client payments received today. Confirming will approve and close this dialog, logging the FMS check timestamp.
                </p>
              </button>

              {/* Option 2: YES */}
              <button
                type="button"
                onClick={() => setSelectedChoice('YES')}
                className={`p-4 border-2 text-left cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                  selectedChoice === 'YES'
                    ? 'border-emerald-700 bg-emerald-50/70 shadow-sm'
                    : 'border-neutral-200 hover:border-emerald-400 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display font-black text-base text-emerald-900">
                    YES
                  </span>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      selectedChoice === 'YES'
                        ? 'border-emerald-700 bg-emerald-700 text-white'
                        : 'border-neutral-300'
                    }`}
                  >
                    {selectedChoice === 'YES' && <Check size={12} />}
                  </div>
                </div>
                <p className="text-xs text-emerald-900 font-normal leading-snug">
                  Payments received. This will open the pending invoices table to enter received amounts and UTR details.
                </p>
              </button>
            </div>

            {/* Bottom Actions based on selection */}
            <div className="pt-2 flex items-center justify-between border-t border-neutral-200">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 border border-neutral-300 text-xs font-bold text-gray-700 hover:bg-neutral-100 cursor-pointer"
              >
                Cancel
              </button>

              {selectedChoice === 'NO' ? (
                <button
                  type="button"
                  onClick={handleConfirmNoPayment}
                  disabled={submittingCheck}
                  className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                >
                  {submittingCheck ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  <span>Approve & Close</span>
                </button>
              ) : selectedChoice === 'YES' ? (
                <button
                  type="button"
                  onClick={handleSelectYesPayment}
                  disabled={submittingCheck}
                  className="px-5 py-2 bg-[#004D40] hover:bg-[#00382e] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                >
                  {submittingCheck ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <ArrowRight size={14} />
                  )}
                  <span>Continue to Enter Payments →</span>
                </button>
              ) : (
                <span className="text-xs text-gray-400 italic">Please select Yes or No above</span>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 2: STRICT PENDING INVOICES EXCEL TABLE WITH MULTI-PART & LIVE AUTO-SAVE ── */}
        {step === 'PENDING_TABLE' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Table Controls & Sub-bar */}
            <div className="p-3 bg-neutral-50 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Back to Yes/No Question */}
                <button
                  type="button"
                  onClick={() => setStep('CHECK')}
                  className="px-2.5 py-1 bg-white hover:bg-neutral-100 border border-neutral-300 font-bold text-[11px] text-gray-700 flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Return to daily check question"
                >
                  <RotateCcw size={11} />
                  <span>Daily Check ({todayCheck?.status || 'YES'})</span>
                </button>

                {/* Search */}
                <div className="relative w-48 sm:w-56">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search client, UTR..."
                    className="w-full pl-7 pr-2.5 py-1 text-xs bg-white border border-neutral-300 focus:outline-none focus:border-[#006064]"
                  />
                </div>

                {/* Centre Filter */}
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="bg-white border border-neutral-300 px-2 py-1 text-xs font-semibold text-gray-800 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Centres</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={String(loc.id)}>
                      {loc.name}
                    </option>
                  ))}
                </select>

                {/* Month Filter */}
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-white border border-neutral-300 px-2 py-1 text-xs font-semibold text-gray-800 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Billing Months</option>
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>

                {/* Pending Only Status Badge */}
                <span className="px-2.5 py-1 text-[11px] font-bold bg-amber-100 text-amber-950 border border-amber-300">
                  ✓ Pending Invoices Only
                </span>

                {/* Live Auto-Save Indicator */}
                <span className="px-2 py-0.5 text-[11px] font-mono font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Live Auto-Save Active</span>
                </span>
              </div>

              {/* Status summary */}
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-300 font-bold text-[11px]">
                  {pendingSummary.pendingCount} Invoices Due
                </span>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold text-[11px]">
                  Total Balance: {formatCurrency(pendingSummary.pendingSum)}
                </span>
              </div>
            </div>

            {/* The Excel-style Grid */}
            <div className="overflow-x-auto flex-1 overflow-y-auto border-b border-neutral-200">
              <table className="w-full text-left border-collapse text-xs min-w-[1850px]">
                <thead className="sticky top-0 z-10 bg-neutral-100 text-gray-700 font-mono text-[9.5px] uppercase tracking-wider border-b border-neutral-300 shadow-2xs">
                  <tr>
                    <th className="py-2.5 px-2 w-12 text-center border-r border-neutral-200">Sr.</th>
                    <th className="py-2.5 px-3 min-w-[190px] border-r border-neutral-200">Corporate Client</th>
                    <th className="py-2.5 px-2.5 min-w-[100px] border-r border-neutral-200">Centre</th>
                    <th className="py-2.5 px-2.5 min-w-[110px] border-r border-neutral-200">Billing Month</th>
                    <th className="py-2.5 px-2.5 min-w-[110px] text-right whitespace-nowrap border-r border-neutral-200">Invoiced (₹)</th>
                    <th className="py-2.5 px-2.5 min-w-[120px] text-right whitespace-nowrap border-r border-neutral-200">Balance (₹)</th>
                    <th className="py-2.5 px-2 min-w-[145px] border-r border-neutral-200 bg-emerald-50/70 text-emerald-950 font-bold">
                      Payment Receive Date *
                    </th>
                    <th className="py-2.5 px-2 min-w-[130px] border-r border-neutral-200 bg-emerald-50/70 text-emerald-950 font-bold">
                      Received Amt (₹) *
                    </th>
                    <th className="py-2.5 px-2 min-w-[110px] border-r border-neutral-200 bg-emerald-50/70 text-emerald-950 font-bold">
                      UTR / Mode *
                    </th>
                    <th className="py-2.5 px-2 min-w-[160px] border-r border-neutral-200 bg-emerald-50/70 text-emerald-950 font-bold">
                      UTR / Reference Number *
                    </th>
                    <th className="py-2.5 px-2 min-w-[135px] border-r border-neutral-200 bg-emerald-50/70 text-emerald-950 font-bold">
                      UTR Date
                    </th>
                    <th className="py-2.5 px-2 min-w-[125px] border-r border-neutral-200">TDS Deducted?</th>
                    <th className="py-2.5 px-2 min-w-[110px] border-r border-neutral-200">TDS Amount</th>
                    <th className="py-2.5 px-2 min-w-[150px] border-r border-neutral-200 text-center">Bank Advice / UTR Receipt</th>
                    <th className="py-2.5 px-2 min-w-[175px] border-r border-neutral-200">Settlement Notes / Remarks</th>
                    <th className="py-2.5 px-3 min-w-[135px] text-center whitespace-nowrap bg-neutral-100 border-l border-neutral-200 font-mono text-[9.5px] uppercase tracking-wider text-gray-700">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Live Auto-Save</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 font-sans text-xs">
                  {displayInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={16} className="p-8 text-center text-gray-500 font-sans">
                        <CheckCircle2 size={24} className="text-emerald-600 mx-auto mb-2" />
                        <p className="font-bold text-sm text-gray-700">No pending invoices found.</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          All client invoices for this filter have zero balance and are fully settled!
                        </p>
                      </td>
                    </tr>
                  ) : (
                    displayInvoices.map((inv, idx) => {
                      const draft = rowDrafts[inv.id] || {
                        parts: [
                          {
                            id: 'part_1',
                            payReceiveDate: '',
                            receiveAmount: '',
                            paymentMode: 'NEFT',
                            utrNumber: '',
                            utrDate: '',
                            tdsDeducted: 'No',
                            tdsAmount: '0',
                            remarks: '',
                          },
                        ],
                        autoSaveStatus: 'idle',
                        saved: false,
                      };

                      const invAmt = Number(inv.totalAmount || 0);
                      let currentTotalRec = 0;
                      draft.parts.forEach((p) => {
                        currentTotalRec += parseFloat(p.receiveAmount) || 0;
                      });
                      const liveBalance = Math.max(0, invAmt - currentTotalRec);
                      const isSettled = inv.paymentStatus === 'RECEIVED' || (currentTotalRec >= invAmt && invAmt > 0) || liveBalance <= 0;

                      return draft.parts.map((part, partIdx) => {
                        const isFirstPart = partIdx === 0;

                        return (
                          <tr
                            key={`${inv.id}_${part.id}`}
                            className={`hover:bg-teal-50/30 transition-colors ${
                              draft.saved ? 'bg-emerald-50/30' : isSettled ? 'bg-neutral-50/70' : 'bg-white'
                            } ${partIdx > 0 ? 'border-t border-dashed border-teal-200 bg-teal-50/15' : ''}`}
                          >
                            {/* 1. Sr. */}
                            <td className="py-2 px-2 text-center font-mono font-bold text-gray-500 border-r border-neutral-200 text-[11px]">
                              {isFirstPart ? `#${inv.srNo || idx + 1}` : <span className="text-gray-300 text-[9px]">↳</span>}
                            </td>

                            {/* 2. Corporate Client + Add Part Button */}
                            <td className="py-2 px-3 border-r border-neutral-200">
                              {isFirstPart ? (
                                <div>
                                  <div className="font-bold text-gray-900 text-xs truncate max-w-[190px]" title={inv.companyName}>
                                    {inv.companyName}
                                  </div>
                                  <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                                    {inv.cabinName && <span>{inv.cabinName}</span>}
                                    {inv.gstNo && (
                                      <span className="font-mono text-[9.5px] text-gray-400">
                                        • GST: {inv.gstNo}
                                      </span>
                                    )}
                                  </div>
                                  {/* + Add Another Part Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleAddPart(inv.id)}
                                    className="mt-1 text-[9.5px] text-[#006064] hover:text-[#004D40] font-bold inline-flex items-center gap-1 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-1.5 py-0.5 rounded-2xs cursor-pointer shadow-2xs transition-colors"
                                    title="Add another payment receive entry/part for this invoice"
                                  >
                                    <Plus size={10} />
                                    <span>Add Part</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between text-[10px] font-bold text-teal-900">
                                  <span className="bg-teal-100 text-teal-900 px-1.5 py-0.5 rounded-2xs font-mono text-[9.5px]">
                                    Part #{partIdx + 1}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePart(inv.id, part.id)}
                                    className="text-[9px] text-red-600 hover:text-red-800 font-bold underline cursor-pointer flex items-center gap-0.5"
                                    title="Remove this part"
                                  >
                                    <Trash2 size={9} />
                                    <span>Remove</span>
                                  </button>
                                </div>
                              )}
                            </td>

                            {/* 3. Centre */}
                            <td className="py-2 px-2.5 border-r border-neutral-200 text-xs font-medium text-gray-700">
                              {isFirstPart ? inv.locationName : <span className="text-gray-300 text-[10px]">″</span>}
                            </td>

                            {/* 4. Billing Month */}
                            <td className="py-2 px-2.5 border-r border-neutral-200 text-xs font-semibold text-gray-800 whitespace-nowrap">
                              {isFirstPart ? inv.billingMonth : <span className="text-gray-300 text-[10px]">″</span>}
                            </td>

                            {/* 5. Invoiced (₹) */}
                            <td className="py-2 px-2.5 text-right font-mono font-bold text-gray-800 border-r border-neutral-200 whitespace-nowrap">
                              {isFirstPart ? formatCurrency(inv.totalAmount) : <span className="text-gray-300 text-[10px]">″</span>}
                            </td>

                            {/* 6. Balance (₹) */}
                            <td className="py-2 px-2.5 text-right font-mono font-black border-r border-neutral-200 whitespace-nowrap">
                              {isFirstPart ? (
                                <div>
                                  <span className={liveBalance > 0 ? 'text-amber-800 bg-amber-50 px-1.5 py-0.5 border border-amber-200' : 'text-emerald-700 font-bold'}>
                                    {liveBalance > 0 ? formatCurrency(liveBalance) : '₹0 (Paid)'}
                                  </span>
                                  {currentTotalRec > 0 && (
                                    <div className="text-[9.5px] font-normal text-gray-500 mt-0.5">
                                      ({formatCurrency(currentTotalRec)} received)
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 font-mono text-[10px] italic">
                                  Part #{partIdx + 1}
                                </span>
                              )}
                            </td>

                            {/* 7. Payment Receive Date * */}
                            <td className="py-1.5 px-2 border-r border-neutral-200 bg-emerald-50/20">
                              <input
                                type="date"
                                value={part.payReceiveDate}
                                onChange={(e) => updatePartField(inv.id, part.id, 'payReceiveDate', e.target.value)}
                                onBlur={() => handleBlurSave(inv.id)}
                                className="w-full border border-neutral-300 bg-white p-1 text-xs font-mono font-bold text-gray-800 focus:outline-none focus:border-emerald-600"
                              />
                            </td>

                            {/* 8. Received Amount (₹) * */}
                            <td className="py-1.5 px-2 border-r border-neutral-200 bg-emerald-50/20">
                              <input
                                type="number"
                                step="0.01"
                                value={part.receiveAmount}
                                onChange={(e) => updatePartField(inv.id, part.id, 'receiveAmount', e.target.value)}
                                onBlur={() => handleBlurSave(inv.id)}
                                placeholder={`Part #${partIdx + 1} ₹`}
                                className="w-full border border-emerald-600 bg-white p-1 text-xs font-mono font-black text-emerald-950 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>

                            {/* 9. UTR / Payment Mode * */}
                            <td className="py-1.5 px-2 border-r border-neutral-200 bg-emerald-50/20">
                              <select
                                value={part.paymentMode}
                                onChange={(e) => updatePartField(inv.id, part.id, 'paymentMode', e.target.value)}
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
                            </td>

                            {/* 10. UTR / Reference Number * */}
                            <td className="py-1.5 px-2 border-r border-neutral-200 bg-emerald-50/20">
                              <input
                                type="text"
                                value={part.utrNumber}
                                onChange={(e) => updatePartField(inv.id, part.id, 'utrNumber', e.target.value)}
                                onBlur={() => handleBlurSave(inv.id)}
                                placeholder="UTR / Ref Number"
                                className="w-full border border-neutral-300 bg-white p-1 text-xs font-mono text-gray-900 focus:outline-none focus:border-emerald-600"
                              />
                            </td>

                            {/* 11. UTR Transaction Date */}
                            <td className="py-1.5 px-2 border-r border-neutral-200 bg-emerald-50/20">
                              <input
                                type="date"
                                value={part.utrDate}
                                onChange={(e) => updatePartField(inv.id, part.id, 'utrDate', e.target.value)}
                                onBlur={() => handleBlurSave(inv.id)}
                                className="w-full border border-neutral-300 bg-white p-1 text-xs font-mono text-gray-800 focus:outline-none focus:border-emerald-600"
                              />
                            </td>

                            {/* 12. TDS Deducted? */}
                            <td className="py-1.5 px-2 border-r border-neutral-200">
                              <select
                                value={part.tdsDeducted}
                                onChange={(e) => updatePartField(inv.id, part.id, 'tdsDeducted', e.target.value)}
                                onBlur={() => handleBlurSave(inv.id)}
                                className="w-full border border-neutral-300 bg-white p-1 text-xs text-gray-800 focus:outline-none focus:border-emerald-600 cursor-pointer"
                              >
                                <option value="No">No TDS</option>
                                <option value="10">10% (194-I)</option>
                                <option value="2">2% (194-C)</option>
                                <option value="1">1% TDS</option>
                                <option value="Custom">Custom TDS</option>
                              </select>
                            </td>

                            {/* 13. TDS Amount */}
                            <td className="py-1.5 px-2 border-r border-neutral-200">
                              <input
                                type="number"
                                step="0.01"
                                value={part.tdsAmount}
                                onChange={(e) => updatePartField(inv.id, part.id, 'tdsAmount', e.target.value)}
                                onBlur={() => handleBlurSave(inv.id)}
                                placeholder="₹0"
                                className="w-full border border-neutral-300 bg-white p-1 text-xs font-mono text-gray-800 focus:outline-none focus:border-emerald-600"
                              />
                            </td>

                            {/* 14. Bank Advice / UTR Receipt */}
                            <td className="py-1.5 px-2 border-r border-neutral-200 text-center">
                              {part.utrFileUrl ? (
                                <div className="flex items-center justify-center gap-1">
                                  <a
                                    href={part.utrFileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] text-[#006064] hover:underline font-bold inline-flex items-center gap-1"
                                  >
                                    <FileText size={11} />
                                    <span>Receipt</span>
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleTriggerUpload(inv.id, part.id)}
                                    className="text-[9px] text-gray-400 hover:text-black underline cursor-pointer ml-1"
                                    title="Change file"
                                  >
                                    replace
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleTriggerUpload(inv.id, part.id)}
                                  disabled={part.uploadingFile}
                                  className="px-2 py-1 bg-white hover:bg-neutral-50 border border-neutral-300 text-gray-700 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                >
                                  <Upload size={10} className={part.uploadingFile ? 'animate-spin' : ''} />
                                  <span>{part.uploadingFile ? 'Uploading...' : '+ Upload'}</span>
                                </button>
                              )}
                            </td>

                            {/* 15. Settlement Notes / Remarks */}
                            <td className="py-1.5 px-2 border-r border-neutral-200">
                              <input
                                type="text"
                                value={part.remarks}
                                onChange={(e) => updatePartField(inv.id, part.id, 'remarks', e.target.value)}
                                onBlur={() => handleBlurSave(inv.id)}
                                placeholder="Settlement notes"
                                className="w-full border border-neutral-300 bg-white p-1 text-xs text-gray-800 focus:outline-none focus:border-emerald-600"
                              />
                            </td>

                            {/* 16. Action: Live Auto-Save Status */}
                            <td className="py-1.5 px-3 min-w-[135px] text-center whitespace-nowrap bg-white border-l border-neutral-200">
                              {isFirstPart ? (
                                draft.autoSaveStatus === 'saving' ? (
                                  <div className="flex items-center justify-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-bold text-teal-800 bg-teal-50 border border-teal-200 rounded-xs animate-pulse mx-auto">
                                    <Loader2 size={12} className="animate-spin text-teal-600" />
                                    <span>Saving...</span>
                                  </div>
                                ) : draft.autoSaveStatus === 'saved' || draft.saved ? (
                                  <div className="flex items-center justify-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-xs shadow-2xs mx-auto">
                                    <Check size={13} className="text-emerald-700" />
                                    <span>Auto-Saved ✓</span>
                                  </div>
                                ) : draft.autoSaveStatus === 'editing' ? (
                                  <div className="flex items-center justify-center gap-1.5 px-2 py-1 text-[10.5px] font-mono font-semibold text-amber-800 bg-amber-50/80 border border-amber-200 rounded-xs mx-auto">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                                    <span>Auto-saving...</span>
                                  </div>
                                ) : draft.autoSaveStatus === 'error' ? (
                                  <button
                                    type="button"
                                    onClick={() => handleManualRetry(inv.id)}
                                    className="flex items-center justify-center gap-1 px-2 py-1 text-[10.5px] font-mono font-bold text-rose-700 bg-rose-50 border border-rose-300 hover:bg-rose-100 cursor-pointer rounded-xs mx-auto"
                                    title={draft.errorMessage || 'Click to retry save'}
                                  >
                                    <AlertCircle size={12} className="text-rose-600" />
                                    <span>Retry Save</span>
                                  </button>
                                ) : (
                                  <div className="flex items-center justify-center gap-1.5 px-2 py-1 text-[10.5px] font-mono text-gray-400 mx-auto">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                    <span>Live Auto-Save</span>
                                  </div>
                                )
                              ) : (
                                <div className="text-[10px] text-teal-700 font-mono italic">
                                  Part #{partIdx + 1}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      });
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-white border-t border-neutral-200 flex items-center justify-between shrink-0 text-xs">
              <div className="text-gray-500 font-medium text-[11px] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>
                  All changes are automatically saved live in the background. Use <strong>+ Add Part</strong> to record multiple installments against an invoice.
                </span>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-5 py-1.5 bg-[#004D40] hover:bg-[#00382e] text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-2xs transition-colors"
              >
                Done / Close Portal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
