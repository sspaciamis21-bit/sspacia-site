'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Upload,
  Search,
  Building2,
  Calendar,
  DollarSign,
  Plus,
  Filter,
  Trash2,
  Edit3,
  Eye,
  Download,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  ChevronRight,
  MapPin,
  User,
  Clock,
  FileCheck,
  RefreshCw,
  FolderArchive,
  Layers,
  Sparkles,
  Paperclip,
  CreditCard,
  Receipt,
  Lock,
  Calculator
} from 'lucide-react';
import { toast } from 'sonner';

export interface OldInvoiceRecord {
  id: number;
  companyName: string;
  invoiceNo: string | null;
  month: string;
  year: number | null;
  invoiceUrl: string;
  fileName: string | null;
  fileSize: string | null;
  amount: number | string | null;
  remarks: string | null;
  locationId: number | null;
  locationName: string | null;
  uploadedById: number | null;
  uploadedByName: string | null;
  uploadedByRole: string | null;
  payReceiveDate?: string | null;
  receiveAmount?: number | string | null;
  paymentMode?: string | null;
  utrNumber?: string | null;
  utrDate?: string | null;
  utrFileUrl?: string | null;
  utrFileName?: string | null;
  tdsDeducted?: string | null;
  tdsAmount?: number | string | null;
  paymentsJson?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentInstallment {
  id: string;
  payReceiveDate: string;
  receiveAmount: string;
  paymentMode: string;
  utrNumber: string;
  utrDate: string;
  tdsDeducted: string; // "No" | "Yes"
  tdsAmount: string;
  // 3 Unique Attachments:
  paymentDocUrl?: string;
  paymentDocName?: string;
  utrDocUrl?: string;
  utrDocName?: string;
  otherDocUrl?: string;
  otherDocName?: string;
  remarks?: string;
  uploadingSlot?: 'paymentDoc' | 'utrDoc' | 'otherDoc' | null;
}

interface LocationOption {
  id: number;
  name: string;
  slug?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const YEARS = [2027, 2026, 2025, 2024, 2023, 2022];

export interface MultiInvoiceItem {
  id: string;
  monthName: string;
  year: number;
  invoiceNo: string;
  amount: string;
  remarks: string;
  fileUrl: string;
  fileName: string;
  fileSize: string;
  uploading?: boolean;
}

interface OldInvoicesArchiveProps {
  isSuperAdmin?: boolean;
  userRoleView?: 'CM' | 'ACCOUNTANT';
  canAccessCM?: boolean;
  canAccessAccountant?: boolean;
  currentUserLocationId?: number | null;
  currentUserLocationName?: string | null;
}

export function OldInvoicesArchive({
  isSuperAdmin = false,
  userRoleView: initialRoleView = 'CM',
  canAccessCM = true,
  canAccessAccountant = true,
  currentUserLocationId,
  currentUserLocationName,
}: OldInvoicesArchiveProps) {
  const [mounted, setMounted] = useState<boolean>(false);
  const [invoices, setInvoices] = useState<OldInvoiceRecord[]>([]);
  const [roleView, setRoleView] = useState<'CM' | 'ACCOUNTANT'>(
    canAccessCM === false ? 'ACCOUNTANT' : initialRoleView
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync role view when parent props change or permissions resolve
  useEffect(() => {
    if (canAccessCM === false && canAccessAccountant) {
      setRoleView('ACCOUNTANT');
    } else if (canAccessAccountant === false && canAccessCM) {
      setRoleView('CM');
    } else if (initialRoleView) {
      setRoleView(initialRoleView);
    }
  }, [initialRoleView, canAccessCM, canAccessAccountant]);
  const [companySuggestions, setCompanySuggestions] = useState<string[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [resolvedLocationName, setResolvedLocationName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('ALL');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('ALL');
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');

  // Expanded Company Cards State (Set of company names)
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  // Upload / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'upload' | 'edit'>('upload');
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);

  // Form Fields
  const [formCompany, setFormCompany] = useState<string>('');
  const [formLocationId, setFormLocationId] = useState<string>(currentUserLocationId ? String(currentUserLocationId) : '');
  const [formLocationName, setFormLocationName] = useState<string>(currentUserLocationName || '');

  // Multi-Invoice Upload Items (for upload mode)
  const [uploadItems, setUploadItems] = useState<MultiInvoiceItem[]>([
    {
      id: 'item_1',
      monthName: 'April',
      year: new Date().getFullYear(),
      invoiceNo: '',
      amount: '',
      remarks: '',
      fileUrl: '',
      fileName: '',
      fileSize: '',
      uploading: false,
    },
  ]);

  // Single Form Fields (for edit mode)
  const [formMonthName, setFormMonthName] = useState<string>('April');
  const [formYear, setFormYear] = useState<number>(2026);
  const [formInvoiceNo, setFormInvoiceNo] = useState<string>('');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formRemarks, setFormRemarks] = useState<string>('');
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadedFileSize, setUploadedFileSize] = useState<string>('');
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const batchFileInputRef = useRef<HTMLInputElement | null>(null);

  // PDF Preview Modal
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewPdfTitle, setPreviewPdfTitle] = useState<string>('');

  // Payment Received Details Modal State (Multi-Part Payments with 3 Attachments each)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [paymentTargetInvoice, setPaymentTargetInvoice] = useState<OldInvoiceRecord | null>(null);
  const [paymentParts, setPaymentParts] = useState<PaymentInstallment[]>([]);
  const [savingPayment, setSavingPayment] = useState<boolean>(false);
  const [activeUploadPartId, setActiveUploadPartId] = useState<string | null>(null);
  const [activeUploadSlot, setActiveUploadSlot] = useState<'paymentDoc' | 'utrDoc' | 'otherDoc' | null>(null);
  const partFileInputRef = useRef<HTMLInputElement | null>(null);

  // Multi-Item Management Handlers
  const handleAddUploadItem = () => {
    const lastItem = uploadItems[uploadItems.length - 1];
    let nextMonth = 'April';
    let nextYear = new Date().getFullYear();
    if (lastItem) {
      const curIdx = MONTH_NAMES.indexOf(lastItem.monthName);
      if (curIdx >= 0 && curIdx < MONTH_NAMES.length - 1) {
        nextMonth = MONTH_NAMES[curIdx + 1];
        nextYear = lastItem.year;
      } else if (curIdx === MONTH_NAMES.length - 1) {
        nextMonth = MONTH_NAMES[0];
        nextYear = lastItem.year + 1;
      }
    }

    const newItem: MultiInvoiceItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      monthName: nextMonth,
      year: nextYear,
      invoiceNo: '',
      amount: '',
      remarks: '',
      fileUrl: '',
      fileName: '',
      fileSize: '',
      uploading: false,
    };
    setUploadItems([...uploadItems, newItem]);
  };

  const handleRemoveUploadItem = (itemId: string) => {
    if (uploadItems.length <= 1) {
      toast.info('At least one invoice row is required');
      return;
    }
    setUploadItems(uploadItems.filter((it) => it.id !== itemId));
  };

  const handleUpdateUploadItem = (itemId: string, updates: Partial<MultiInvoiceItem>) => {
    setUploadItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, ...updates } : it))
    );
  };

  // Upload PDF for specific multi-invoice item (up to 50MB)
  const handleItemFileUpload = async (itemId: string, file: File) => {
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please select a valid PDF document');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size cannot exceed 50MB limit');
      return;
    }

    handleUpdateUploadItem(itemId, { uploading: true });
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload-pdf', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();

      if (json.success && json.data) {
        handleUpdateUploadItem(itemId, {
          fileUrl: json.data.fileUrl,
          fileName: json.data.fileName,
          fileSize: `${(json.data.fileSize / 1024).toFixed(1)} KB`,
          uploading: false,
        });
        toast.success(`Attached ${file.name}`);
      } else {
        toast.error(json.error || 'Failed to upload PDF');
        handleUpdateUploadItem(itemId, { uploading: false });
      }
    } catch (err: any) {
      toast.error('Error uploading PDF');
      handleUpdateUploadItem(itemId, { uploading: false });
    }
  };

  // Batch upload multiple files at once
  const handleBatchFilesUpload = async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    if (validFiles.length === 0) {
      toast.error('Please select PDF files');
      return;
    }

    toast.info(`Uploading ${validFiles.length} invoice document(s)...`);

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 50MB limit, skipping.`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/admin/upload-pdf', {
          method: 'POST',
          body: formData,
        });
        const json = await res.json();

        if (json.success && json.data) {
          // Auto-detect month/year from filename if present (e.g. "Acme_April_2026.pdf")
          let detectedMonth = 'April';
          let detectedYear = new Date().getFullYear();
          const lowerName = file.name.toLowerCase();

          for (const m of MONTH_NAMES) {
            if (lowerName.includes(m.toLowerCase())) {
              detectedMonth = m;
              break;
            }
          }

          const yearMatch = file.name.match(/\b(202\d)\b/);
          if (yearMatch) {
            detectedYear = parseInt(yearMatch[1], 10);
          }

          setUploadItems((prev) => {
            // If the first item is empty, replace it
            if (prev.length === 1 && !prev[0].fileUrl) {
              return [
                {
                  ...prev[0],
                  monthName: detectedMonth,
                  year: detectedYear,
                  fileName: json.data.fileName,
                  fileUrl: json.data.fileUrl,
                  fileSize: `${(json.data.fileSize / 1024).toFixed(1)} KB`,
                },
              ];
            }
            // Otherwise append a new row
            return [
              ...prev,
              {
                id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                monthName: detectedMonth,
                year: detectedYear,
                invoiceNo: '',
                amount: '',
                remarks: '',
                fileName: json.data.fileName,
                fileUrl: json.data.fileUrl,
                fileSize: `${(json.data.fileSize / 1024).toFixed(1)} KB`,
                uploading: false,
              },
            ];
          });
        }
      } catch (err) {
        console.error('Batch upload error:', err);
      }
    }
    toast.success('Batch documents attached!');
  };

  // Fetch Old Invoices from API
  const fetchOldInvoices = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (selectedLocationFilter !== 'ALL') queryParams.append('locationId', selectedLocationFilter);
      if (selectedCompanyFilter !== 'ALL') queryParams.append('companyName', selectedCompanyFilter);
      if (selectedMonthFilter !== 'ALL') queryParams.append('month', selectedMonthFilter);
      if (searchQuery.trim()) queryParams.append('search', searchQuery.trim());

      const res = await fetch(`/api/admin/old-invoices?${queryParams.toString()}`);
      const json = await res.json();

      if (json.success) {
        setInvoices(json.data || []);
        if (json.companySuggestions) setCompanySuggestions(json.companySuggestions);
        if (json.locations) setLocations(json.locations);
        if (json.userLocationName) setResolvedLocationName(json.userLocationName);

        // Auto-expand all companies on initial load
        const uniqueComps = new Set<string>((json.data || []).map((i: OldInvoiceRecord) => i.companyName));
        setExpandedCompanies(uniqueComps);
      } else {
        toast.error(json.error || 'Failed to load old invoices');
      }
    } catch (err: any) {
      console.error('Error fetching old invoices:', err);
      toast.error('Network error loading old invoices');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOldInvoices();
  }, [selectedLocationFilter, selectedCompanyFilter, selectedMonthFilter]);

  // Handle PDF file selection & upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please select a valid PDF document');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast.error('File size cannot exceed 25MB');
      return;
    }

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload-pdf', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();

      if (json.success && json.data) {
        setUploadedFileUrl(json.data.fileUrl);
        setUploadedFileName(json.data.fileName);
        setUploadedFileSize(`${(json.data.fileSize / 1024).toFixed(1)} KB`);
        toast.success('Invoice PDF uploaded successfully!');
      } else {
        toast.error(json.error || 'Failed to upload PDF');
      }
    } catch (err: any) {
      toast.error('Error uploading PDF document');
    } finally {
      setUploadingFile(false);
    }
  };

  // Open Upload Modal with Smart Next Month detection
  const handleOpenUploadModal = (prefillCompany?: string) => {
    setModalMode('upload');
    setEditingRecordId(null);
    setFormCompany(prefillCompany || '');
    setFormLocationId(currentUserLocationId ? String(currentUserLocationId) : (locations[0]?.id ? String(locations[0].id) : ''));
    setFormLocationName(currentUserLocationName || locations[0]?.name || '');

    // Smart default: If company already has April, suggest May; otherwise use current month
    let defaultMonth = MONTH_NAMES[new Date().getMonth()] || 'April';
    let defaultYear = new Date().getFullYear();

    if (prefillCompany) {
      const existingInvoices = invoices.filter(
        (inv) => inv.companyName.toLowerCase().trim() === prefillCompany.toLowerCase().trim()
      );
      if (existingInvoices.length > 0) {
        const lastInv = existingInvoices[0];
        const parts = (lastInv.month || '').split(' ');
        if (parts.length === 2 && MONTH_NAMES.includes(parts[0])) {
          const idx = MONTH_NAMES.indexOf(parts[0]);
          const yr = parseInt(parts[1], 10) || defaultYear;
          if (idx < 11) {
            defaultMonth = MONTH_NAMES[idx + 1];
            defaultYear = yr;
          } else {
            defaultMonth = MONTH_NAMES[0];
            defaultYear = yr + 1;
          }
        }
      }
    }

    setUploadItems([
      {
        id: `item_${Date.now()}`,
        monthName: defaultMonth,
        year: defaultYear,
        invoiceNo: '',
        amount: '',
        remarks: '',
        fileUrl: '',
        fileName: '',
        fileSize: '',
        uploading: false,
      },
    ]);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (rec: OldInvoiceRecord) => {
    setModalMode('edit');
    setEditingRecordId(rec.id);
    setFormCompany(rec.companyName);

    // Split month into monthName and year if formatted like "April 2026"
    const parts = rec.month.split(' ');
    if (parts.length === 2 && MONTH_NAMES.includes(parts[0])) {
      setFormMonthName(parts[0]);
      setFormYear(parseInt(parts[1], 10) || rec.year || 2026);
    } else {
      setFormMonthName(rec.month);
      setFormYear(rec.year || 2026);
    }

    setFormInvoiceNo(rec.invoiceNo || '');
    setFormAmount(rec.amount !== null && rec.amount !== undefined ? String(rec.amount) : '');
    setFormRemarks(rec.remarks || '');
    setFormLocationId(rec.locationId ? String(rec.locationId) : '');
    setFormLocationName(rec.locationName || '');
    setUploadedFileUrl(rec.invoiceUrl);
    setUploadedFileName(rec.fileName || 'Invoice.pdf');
    setUploadedFileSize(rec.fileSize || '');
    setIsModalOpen(true);
  };

  // Submit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formCompany.trim()) {
      toast.error('Please enter a Company Name');
      return;
    }

    const selectedLoc = locations.find((l) => String(l.id) === formLocationId);
    const locName = selectedLoc ? selectedLoc.name : formLocationName;

    setSubmitting(true);
    try {
      if (modalMode === 'upload') {
        const validItems = uploadItems.filter((it) => it.fileUrl && it.fileUrl.trim());
        if (validItems.length === 0) {
          toast.error('Please attach at least one invoice PDF document');
          setSubmitting(false);
          return;
        }

        const res = await fetch('/api/admin/old-invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: formCompany.trim(),
            locationId: formLocationId ? parseInt(formLocationId, 10) : null,
            locationName: locName || null,
            invoices: validItems.map((it) => ({
              invoiceNo: it.invoiceNo.trim() || null,
              month: `${it.monthName} ${it.year}`,
              year: it.year,
              amount: it.amount ? parseFloat(it.amount) : null,
              remarks: it.remarks.trim() || null,
              invoiceUrl: it.fileUrl,
              fileName: it.fileName || 'Invoice.pdf',
              fileSize: it.fileSize || null,
            })),
          }),
        });

        const json = await res.json();
        if (json.success) {
          toast.success(json.message || `Archived ${validItems.length} invoice(s) successfully!`);
          setIsModalOpen(false);
          fetchOldInvoices();
        } else {
          toast.error(json.error || 'Failed to save old invoices');
        }
      } else if (modalMode === 'edit' && editingRecordId) {
        if (!uploadedFileUrl.trim()) {
          toast.error('Please upload an invoice PDF document');
          setSubmitting(false);
          return;
        }

        const fullMonthString = `${formMonthName} ${formYear}`;
        const res = await fetch(`/api/admin/old-invoices/${editingRecordId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: formCompany.trim(),
            invoiceNo: formInvoiceNo.trim() || null,
            month: fullMonthString,
            year: formYear,
            amount: formAmount ? parseFloat(formAmount) : null,
            remarks: formRemarks.trim() || null,
            invoiceUrl: uploadedFileUrl,
            fileName: uploadedFileName,
            fileSize: uploadedFileSize,
            locationId: formLocationId ? parseInt(formLocationId, 10) : null,
            locationName: locName,
          }),
        });

        const json = await res.json();
        if (json.success) {
          toast.success('Invoice details updated successfully!');
          setIsModalOpen(false);
          fetchOldInvoices();
        } else {
          toast.error(json.error || 'Failed to update record');
        }
      }
    } catch (err: any) {
      toast.error('Error saving invoice');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Invoice Record
  const handleDeleteInvoice = async (id: number, compName: string, month: string) => {
    if (!confirm(`Are you sure you want to delete the archived invoice for "${compName}" (${month})?`)) return;

    try {
      const res = await fetch(`/api/admin/old-invoices/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();

      if (json.success) {
        toast.success('Invoice deleted from archive');
        fetchOldInvoices();
      } else {
        toast.error(json.error || 'Failed to delete invoice');
      }
    } catch (err) {
      toast.error('Error deleting invoice');
    }
  };

  // Payment Details Handlers (Accountant View - Multi-Part Payments)
  const handleOpenPaymentModal = (item: OldInvoiceRecord) => {
    setPaymentTargetInvoice(item);

    if (item.paymentsJson) {
      try {
        const parsed = JSON.parse(item.paymentsJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPaymentParts(
            parsed.map((p, idx) => ({
              id: p.id || `part_${idx + 1}`,
              payReceiveDate: p.payReceiveDate
                ? String(p.payReceiveDate).split('T')[0]
                : item.payReceiveDate
                ? String(item.payReceiveDate).split('T')[0]
                : new Date().toISOString().split('T')[0],
              receiveAmount:
                p.receiveAmount !== undefined && p.receiveAmount !== null ? String(p.receiveAmount) : '',
              paymentMode: p.paymentMode || 'NEFT',
              utrNumber: p.utrNumber || '',
              utrDate: p.utrDate
                ? String(p.utrDate).split('T')[0]
                : item.utrDate
                ? String(item.utrDate).split('T')[0]
                : new Date().toISOString().split('T')[0],
              tdsDeducted: p.tdsDeducted === 'Yes' ? 'Yes' : 'No',
              tdsAmount: p.tdsAmount !== undefined && p.tdsAmount !== null ? String(p.tdsAmount) : '',
              paymentDocUrl: p.paymentDocUrl || '',
              paymentDocName: p.paymentDocName || '',
              utrDocUrl: p.utrDocUrl || '',
              utrDocName: p.utrDocName || '',
              otherDocUrl: p.otherDocUrl || '',
              otherDocName: p.otherDocName || '',
              remarks: p.remarks || '',
            }))
          );
          setIsPaymentModalOpen(true);
          return;
        }
      } catch (e) {
        console.warn('Failed to parse paymentsJson', e);
      }
    }

    // Default 1 payment entry (from legacy or new)
    const initialAmount =
      item.receiveAmount !== null && item.receiveAmount !== undefined
        ? String(item.receiveAmount)
        : item.amount !== null && item.amount !== undefined
        ? String(item.amount)
        : '';

    setPaymentParts([
      {
        id: `part_${Date.now()}`,
        payReceiveDate: item.payReceiveDate
          ? String(item.payReceiveDate).split('T')[0]
          : new Date().toISOString().split('T')[0],
        receiveAmount: initialAmount,
        paymentMode: item.paymentMode || 'NEFT',
        utrNumber: item.utrNumber || '',
        utrDate: item.utrDate
          ? String(item.utrDate).split('T')[0]
          : new Date().toISOString().split('T')[0],
        tdsDeducted: item.tdsDeducted === 'Yes' ? 'Yes' : 'No',
        tdsAmount: item.tdsAmount !== null && item.tdsAmount !== undefined ? String(item.tdsAmount) : '',
        paymentDocUrl: '',
        paymentDocName: '',
        utrDocUrl: item.utrFileUrl || '',
        utrDocName: item.utrFileName || '',
        otherDocUrl: '',
        otherDocName: '',
        remarks: '',
      },
    ]);
    setIsPaymentModalOpen(true);
  };

  const handleAddPaymentPart = () => {
    const nextIdx = paymentParts.length + 1;
    setPaymentParts((prev) => [
      ...prev,
      {
        id: `part_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        payReceiveDate: new Date().toISOString().split('T')[0],
        receiveAmount: '',
        paymentMode: 'NEFT',
        utrNumber: '',
        utrDate: new Date().toISOString().split('T')[0],
        tdsDeducted: 'No',
        tdsAmount: '',
        paymentDocUrl: '',
        paymentDocName: '',
        utrDocUrl: '',
        utrDocName: '',
        otherDocUrl: '',
        otherDocName: '',
        remarks: '',
      },
    ]);
    toast.success(`Added Payment Entry #${nextIdx}`);
  };

  const handleUpdatePaymentPart = (partId: string, field: keyof PaymentInstallment, value: any) => {
    setPaymentParts((prev) =>
      prev.map((p) => (p.id === partId ? { ...p, [field]: value } : p))
    );
  };

  const handleRemovePaymentPart = (partId: string) => {
    if (paymentParts.length <= 1) {
      toast.error('At least one payment entry is required');
      return;
    }
    setPaymentParts((prev) => prev.filter((p) => p.id !== partId));
    toast.info('Removed payment entry');
  };

  const handleTriggerPartUpload = (partId: string, slot: 'paymentDoc' | 'utrDoc' | 'otherDoc') => {
    setActiveUploadPartId(partId);
    setActiveUploadSlot(slot);
    partFileInputRef.current?.click();
  };

  const handlePartFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadPartId || !activeUploadSlot) return;

    const partId = activeUploadPartId;
    const slot = activeUploadSlot;

    setPaymentParts((prev) =>
      prev.map((p) => (p.id === partId ? { ...p, uploadingSlot: slot } : p))
    );

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to upload document');
      }

      const data = await res.json();
      const fileUrl = data.data?.fileUrl || data.fileUrl;
      if (!fileUrl) throw new Error('No file URL returned from upload');

      setPaymentParts((prev) =>
        prev.map((p) => {
          if (p.id !== partId) return p;
          if (slot === 'paymentDoc') {
            return { ...p, paymentDocUrl: fileUrl, paymentDocName: file.name, uploadingSlot: null };
          } else if (slot === 'utrDoc') {
            return { ...p, utrDocUrl: fileUrl, utrDocName: file.name, uploadingSlot: null };
          } else {
            return { ...p, otherDocUrl: fileUrl, otherDocName: file.name, uploadingSlot: null };
          }
        })
      );
      toast.success(`Attached: ${file.name}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload document');
      setPaymentParts((prev) =>
        prev.map((p) => (p.id === partId ? { ...p, uploadingSlot: null } : p))
      );
    } finally {
      if (partFileInputRef.current) partFileInputRef.current.value = '';
      setActiveUploadPartId(null);
      setActiveUploadSlot(null);
    }
  };

  const handleRemovePartAttachment = (partId: string, slot: 'paymentDoc' | 'utrDoc' | 'otherDoc') => {
    setPaymentParts((prev) =>
      prev.map((p) => {
        if (p.id !== partId) return p;
        if (slot === 'paymentDoc') return { ...p, paymentDocUrl: '', paymentDocName: '' };
        if (slot === 'utrDoc') return { ...p, utrDocUrl: '', utrDocName: '' };
        return { ...p, otherDocUrl: '', otherDocName: '' };
      })
    );
  };

  const handleSavePaymentDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTargetInvoice) return;

    setSavingPayment(true);
    try {
      const totalRec = paymentParts.reduce((sum, p) => sum + (parseFloat(p.receiveAmount) || 0), 0);
      const totalTds = paymentParts.reduce(
        (sum, p) => (p.tdsDeducted === 'Yes' ? sum + (parseFloat(p.tdsAmount) || 0) : sum),
        0
      );
      const primaryPart = paymentParts[0] || {};
      const allUtrs = paymentParts
        .map((p) => p.utrNumber?.trim())
        .filter(Boolean)
        .join(', ');

      const res = await fetch(`/api/admin/old-invoices/${paymentTargetInvoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentsJson: JSON.stringify(paymentParts),
          receiveAmount: totalRec > 0 ? totalRec : null,
          payReceiveDate: primaryPart.payReceiveDate || null,
          paymentMode: primaryPart.paymentMode || null,
          utrNumber: allUtrs || primaryPart.utrNumber || null,
          utrDate: primaryPart.utrDate || null,
          utrFileUrl: primaryPart.utrDocUrl || primaryPart.paymentDocUrl || null,
          utrFileName: primaryPart.utrDocName || primaryPart.paymentDocName || null,
          tdsDeducted: totalTds > 0 ? 'Yes' : 'No',
          tdsAmount: totalTds > 0 ? totalTds : null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(
          `Recorded payment entries for ${paymentTargetInvoice.companyName} (${paymentTargetInvoice.month})!`
        );
        setIsPaymentModalOpen(false);
        fetchOldInvoices();
      } else {
        toast.error(json.error || 'Failed to save payment details');
      }
    } catch (err) {
      toast.error('Error saving payment details');
    } finally {
      setSavingPayment(false);
    }
  };

  // Clear / remove recorded payment details for an invoice
  const handleClearPaymentDetails = async (targetId?: number) => {
    const target = targetId ? invoices.find((i) => i.id === targetId) : paymentTargetInvoice;
    if (!target) return;

    const confirmed = window.confirm(
      `Are you sure you want to clear/delete the recorded payment data for ${target.companyName} (${target.month})? This will revert it back to pending.`
    );
    if (!confirmed) return;

    try {
      setSavingPayment(true);
      const res = await fetch(`/api/admin/old-invoices/${target.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentsJson: null,
          receiveAmount: null,
          payReceiveDate: null,
          paymentMode: null,
          utrNumber: null,
          utrDate: null,
          utrFileUrl: null,
          utrFileName: null,
          tdsDeducted: null,
          tdsAmount: null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(`Payment details removed for ${target.companyName} (${target.month})!`);
        setIsPaymentModalOpen(false);
        fetchOldInvoices();
      } else {
        toast.error(json.error || 'Failed to clear payment details');
      }
    } catch (err) {
      toast.error('Error clearing payment details');
    } finally {
      setSavingPayment(false);
    }
  };

  // Toggle company card expansion
  const toggleCompanyExpand = (compName: string) => {
    setExpandedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(compName)) {
        next.delete(compName);
      } else {
        next.add(compName);
      }
      return next;
    });
  };

  // Filtered & Grouped Invoices by Company
  const groupedCompanies = useMemo(() => {
    let filtered = invoices;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (i) =>
          i.companyName.toLowerCase().includes(q) ||
          (i.invoiceNo && i.invoiceNo.toLowerCase().includes(q)) ||
          i.month.toLowerCase().includes(q) ||
          (i.remarks && i.remarks.toLowerCase().includes(q)) ||
          (i.locationName && i.locationName.toLowerCase().includes(q)) ||
          (i.uploadedByName && i.uploadedByName.toLowerCase().includes(q))
      );
    }

    if (paymentStatusFilter === 'PENDING') {
      filtered = filtered.filter((i) => !i.payReceiveDate && !i.utrNumber && !i.receiveAmount);
    } else if (paymentStatusFilter === 'PAID') {
      filtered = filtered.filter((i) => Boolean(i.payReceiveDate || i.utrNumber || i.receiveAmount));
    }

    const map = new Map<string, OldInvoiceRecord[]>();
    for (const inv of filtered) {
      const compKey = inv.companyName.trim() || 'Unknown Company';
      if (!map.has(compKey)) {
        map.set(compKey, []);
      }
      map.get(compKey)!.push(inv);
    }

    return Array.from(map.entries()).map(([companyName, items]) => {
      // Sort items by createdAt or month descending
      const sortedItems = [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const totalCompanyAmount = sortedItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      const primaryLocation = sortedItems[0]?.locationName || 'Main Center';

      return {
        companyName,
        items: sortedItems,
        totalCompanyAmount,
        primaryLocation,
        invoiceCount: sortedItems.length,
      };
    });
  }, [invoices, searchQuery, paymentStatusFilter]);

  // Distinct Months for dropdown filter
  const uniqueMonths = useMemo(() => {
    const months = new Set<string>();
    invoices.forEach((i) => {
      if (i.month?.trim()) months.add(i.month.trim());
    });
    return Array.from(months).sort();
  }, [invoices]);

  // Overall KPIs
  const totalArchivedInvoices = invoices.length;
  const totalArchivedCompanies = new Set(invoices.map((i) => i.companyName)).size;
  const grandTotalAmount = invoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  return (
    <div className="space-y-6">
      {/* ── TOP ACTION & STATS RIBBON ── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-5 bg-white border border-[var(--outline-variant)]/40 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-teal-50 text-[#1ab0bc] border border-teal-200 flex items-center justify-center rounded shadow-2xs shrink-0">
            <FolderArchive size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                Old Invoices & Past Records Archive
              </h2>
              <span className="px-2 py-0.5 bg-teal-50 text-teal-800 text-[10px] font-mono font-bold rounded border border-teal-200">
                Company-Wise History
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Upload, manage, and review historical monthly invoices for each client company.
            </p>
          </div>
        </div>

        {/* TOP STATS & ACTIONS */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
          {/* ROLE VIEW TOGGLE (Only for Admin who can access both) */}
          {(isSuperAdmin || (canAccessCM && canAccessAccountant)) && (
            <div className="flex items-center bg-gray-100 p-0.5 rounded border border-gray-300">
              <button
                type="button"
                onClick={() => setRoleView('CM')}
                className={`px-3 py-1 text-xs font-bold rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                  roleView === 'CM'
                    ? 'bg-white text-teal-900 shadow-xs border border-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <User size={13} />
                <span>CM View</span>
              </button>
              <button
                type="button"
                onClick={() => setRoleView('ACCOUNTANT')}
                className={`px-3 py-1 text-xs font-bold rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                  roleView === 'ACCOUNTANT'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-indigo-900'
                }`}
              >
                <Calculator size={13} />
                <span>Accountant Payment View</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 text-xs font-mono text-gray-700">
            <span className="text-gray-400 font-bold uppercase text-[10px]">Total Archived:</span>
            <strong className="text-gray-900 font-bold">{totalArchivedInvoices} Invoices</strong>
            <span className="text-gray-300">|</span>
            <strong className="text-gray-900 font-bold">{totalArchivedCompanies} Companies</strong>
            {grandTotalAmount > 0 && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-emerald-700 font-bold">₹{grandTotalAmount.toLocaleString('en-IN')}</span>
              </>
            )}
          </div>

          {roleView === 'CM' && (
            <button
              type="button"
              onClick={() => handleOpenUploadModal()}
              className="px-4 py-2 bg-[#1ab0bc] hover:bg-teal-600 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <Upload size={14} />
              <span>Upload Old Invoice</span>
            </button>
          )}
        </div>
      </div>

      {/* ── SEARCH & FILTER BAR ── */}
      <div className="p-4 bg-white border border-gray-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[300px]">
          {/* SEARCH INPUT */}
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by company, invoice #, remarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-300 text-xs text-gray-900 outline-none focus:border-[#1ab0bc] focus:bg-white transition-all font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* CENTER / LOCATION FILTER */}
          {locations.length > 0 && (isSuperAdmin || roleView === 'ACCOUNTANT' || canAccessAccountant || locations.length > 1) ? (
            <div className="flex items-center gap-1.5">
              <MapPin size={13} className="text-gray-400 shrink-0" />
              <select
                value={selectedLocationFilter}
                onChange={(e) => setSelectedLocationFilter(e.target.value)}
                className="bg-gray-50 border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 font-bold outline-none focus:border-[#1ab0bc] cursor-pointer"
              >
                <option value="ALL">All Centers (Consolidated)</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            (resolvedLocationName || currentUserLocationName || locations[0]?.name) && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-teal-50 border border-teal-200 text-teal-900 text-xs font-bold">
                <MapPin size={13} className="text-[#1ab0bc] shrink-0" />
                <span>Center: {resolvedLocationName || currentUserLocationName || locations[0]?.name}</span>
              </div>
            )
          )}

          {/* MONTH FILTER */}
          {uniqueMonths.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-gray-400 shrink-0" />
              <select
                value={selectedMonthFilter}
                onChange={(e) => setSelectedMonthFilter(e.target.value)}
                className="bg-gray-50 border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 font-bold outline-none focus:border-[#1ab0bc] cursor-pointer"
              >
                <option value="ALL">All Months ({uniqueMonths.length})</option>
                {uniqueMonths.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* PAYMENT STATUS FILTER (FOR ACCOUNTANT VIEW & ADMIN) */}
          {(roleView === 'ACCOUNTANT' || isSuperAdmin) && (
            <div className="flex items-center gap-1.5">
              <CreditCard size={13} className="text-gray-400 shrink-0" />
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value as any)}
                className="bg-gray-50 border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 font-bold outline-none focus:border-[#1ab0bc] cursor-pointer"
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="PENDING">⏳ Pending Payment Entry</option>
                <option value="PAID">✅ Payment Recorded / UTR</option>
              </select>
            </div>
          )}
        </div>

        {/* REFRESH BUTTON */}
        <button
          type="button"
          onClick={() => {
            setRefreshing(true);
            fetchOldInvoices();
          }}
          disabled={loading || refreshing}
          className="p-2 border border-gray-300 hover:bg-gray-50 text-gray-600 text-xs flex items-center gap-1 cursor-pointer transition-colors"
          title="Refresh archive data"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin text-[#1ab0bc]' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* ── COMPANY-WISE MULTI-MONTH ACCORDION LIST ── */}
      {loading ? (
        <div className="p-16 text-center bg-white border border-gray-200">
          <Loader2 size={28} className="animate-spin text-[#1ab0bc] mx-auto mb-3" />
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Loading Archived Invoices...</p>
        </div>
      ) : groupedCompanies.length === 0 ? (
        <div className="p-16 text-center bg-white border border-dashed border-gray-300 space-y-3">
          <FolderArchive size={40} className="text-gray-300 mx-auto" />
          <h3 className="text-base font-bold text-gray-800">No Old Invoices Found</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            {searchQuery
              ? 'No archived invoices match your active search and filter criteria.'
              : 'Start archiving past client invoices by clicking "Upload Old Invoice" above.'}
          </p>
          {roleView === 'CM' && (
            <button
              type="button"
              onClick={() => handleOpenUploadModal()}
              className="mt-2 px-4 py-2 bg-[#1ab0bc] hover:bg-teal-600 text-white font-bold text-xs uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Upload size={14} />
              <span>Upload First Old Invoice</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedCompanies.map((group) => {
            const isExpanded = expandedCompanies.has(group.companyName);

            return (
              <div
                key={group.companyName}
                className="bg-white border border-gray-200 shadow-2xs overflow-hidden transition-all duration-150"
              >
                {/* ── COMPANY CARD HEADER ── */}
                <div
                  onClick={() => toggleCompanyExpand(group.companyName)}
                  className="px-4 py-3.5 bg-gray-50/80 hover:bg-gray-100/80 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      className="p-1 hover:bg-gray-200 text-gray-500 rounded transition-transform"
                    >
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>

                    <div className="w-8 h-8 bg-white border border-gray-300 text-[#1ab0bc] flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                      <Building2 size={16} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight truncate">
                          {group.companyName}
                        </h3>
                        <span className="px-2 py-0.5 bg-teal-100 text-teal-800 text-[10px] font-bold rounded">
                          {group.invoiceCount} {group.invoiceCount === 1 ? 'Month' : 'Months'}
                        </span>
                        {group.primaryLocation && (
                          <span className="text-[11px] text-gray-500 flex items-center gap-1">
                            <MapPin size={11} className="text-gray-400" />
                            {group.primaryLocation}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT SIDE ACTIONS */}
                  <div className="flex items-center gap-3">
                    {group.totalCompanyAmount > 0 && (
                      <div className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 border border-emerald-200">
                        Total: ₹{group.totalCompanyAmount.toLocaleString('en-IN')}
                      </div>
                    )}

                    {roleView === 'CM' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenUploadModal(group.companyName);
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-teal-50 border border-teal-300 text-[#1ab0bc] hover:text-teal-800 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                        title="Upload another monthly invoice for this company"
                      >
                        <Plus size={13} />
                        <span>Add Month Invoice</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* ── EXPANDED MULTI-MONTH INVOICES LIST ── */}
                {isExpanded && (
                  <div className="divide-y divide-gray-200">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-100/60 text-gray-600 font-bold uppercase tracking-wider text-[10px] border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-2.5 w-40">Billing Month</th>
                            <th className="px-4 py-2.5 w-32">Invoice #</th>
                            <th className="px-4 py-2.5 w-28">Invoice ₹</th>
                            {/* PAYMENT RECEIVED & UTR (VISIBLE TO BOTH ACCOUNTANT & CM; EDITABLE ONLY BY ACCOUNTANT) */}
                            <th className="px-4 py-2.5 min-w-[220px] bg-indigo-50/60 text-indigo-950">
                              <div className="flex items-center gap-1">
                                <Calculator size={11} className="text-indigo-600" />
                                <span>Payment Received & UTR {roleView === 'CM' && <span className="text-[9px] text-gray-500 font-normal lowercase">(read-only)</span>}</span>
                              </div>
                            </th>
                            <th className="px-4 py-2.5 w-24 bg-indigo-50/60 text-indigo-950">TDS</th>
                            <th className="px-4 py-2.5 min-w-[180px]">Remarks / Notes</th>
                            <th className="px-4 py-2.5 w-40">Uploaded By</th>
                            <th className="px-4 py-2.5 w-52 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white font-sans">
                          {group.items.map((item) => (
                            <tr key={item.id} className="hover:bg-teal-50/30 transition-colors">
                              {/* BILLING MONTH */}
                              <td className="px-4 py-3 font-bold text-gray-900">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-900 border border-indigo-200 font-mono text-xs font-bold rounded">
                                  <Calendar size={12} className="text-indigo-600" />
                                  <span>{item.month}</span>
                                </span>
                              </td>

                              {/* INVOICE NUMBER */}
                              <td className="px-4 py-3 font-mono font-bold text-gray-800">
                                {item.invoiceNo ? (
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded border border-gray-200">
                                    {item.invoiceNo}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 italic">None</span>
                                )}
                              </td>

                              {/* AMOUNT */}
                              <td className="px-4 py-3 font-mono font-bold text-emerald-800">
                                {item.amount !== null && item.amount !== undefined ? (
                                  `₹${Number(item.amount).toLocaleString('en-IN')}`
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>

                              {/* ACCOUNTANT PAYMENT RECEIVED & UTR DETAILS (VISIBLE TO BOTH; EDITABLE BY ACCOUNTANT) */}
                              <td className="px-4 py-3 bg-indigo-50/20">
                                {(() => {
                                  let parts: PaymentInstallment[] = [];
                                  if (item.paymentsJson) {
                                    try {
                                      const p = JSON.parse(item.paymentsJson);
                                      if (Array.isArray(p)) parts = p;
                                    } catch {}
                                  }

                                  if (parts.length > 0) {
                                    const totalRec = parts.reduce((sum, p) => sum + (parseFloat(p.receiveAmount) || 0), 0);
                                    const hasMultipleParts = parts.length > 1;

                                    return (
                                      <div className="space-y-1.5">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 font-mono">
                                          <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                                          <span>₹{totalRec.toLocaleString('en-IN')}</span>
                                          {hasMultipleParts && (
                                            <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 text-[9px] font-bold rounded">
                                              {parts.length} Parts
                                            </span>
                                          )}
                                        </div>

                                        {/* LIST OF PAYMENT PARTS */}
                                        <div className="space-y-1">
                                          {parts.map((p, pIdx) => (
                                            <div key={p.id || pIdx} className="text-[10px] bg-white p-1.5 border border-indigo-100 rounded space-y-1 font-mono">
                                              <div className="flex items-center justify-between gap-1 text-gray-700">
                                                <span className="font-bold text-indigo-950">
                                                  {hasMultipleParts ? `Part ${pIdx + 1}: ` : ''}₹{parseFloat(p.receiveAmount || '0').toLocaleString('en-IN')}
                                                </span>
                                                <span className="text-gray-400 font-sans">{p.payReceiveDate}</span>
                                              </div>
                                              <div className="flex items-center gap-1 text-gray-600 flex-wrap">
                                                <span className="px-1 bg-gray-100 rounded text-[9px]">{p.paymentMode || 'UTR'}</span>
                                                {p.utrNumber && <span className="font-bold truncate max-w-[120px]">{p.utrNumber}</span>}
                                              </div>

                                              {/* ATTACHED DOCUMENTS */}
                                              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                                {p.paymentDocUrl && (
                                                  <a
                                                    href={p.paymentDocUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-0.5 px-1 py-0.2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded text-[8px] font-bold"
                                                    title="View Payment Received Document"
                                                  >
                                                    <Paperclip size={8} />
                                                    <span>Bank Advice</span>
                                                  </a>
                                                )}
                                                {p.utrDocUrl && (
                                                  <a
                                                    href={p.utrDocUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-0.5 px-1 py-0.2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded text-[8px] font-bold"
                                                    title="View UTR Proof Document"
                                                  >
                                                    <Paperclip size={8} />
                                                    <span>UTR Proof</span>
                                                  </a>
                                                )}
                                                {p.otherDocUrl && (
                                                  <a
                                                    href={p.otherDocUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-0.5 px-1 py-0.2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[8px] font-bold"
                                                    title="View Other Supporting Document"
                                                  >
                                                    <Paperclip size={8} />
                                                    <span>Supporting Doc</span>
                                                  </a>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>

                                        {/* QUICK ACTION BUTTONS (ONLY FOR ACCOUNTANT VIEW OR SUPER ADMIN) */}
                                        {(roleView === 'ACCOUNTANT' || isSuperAdmin) && (
                                          <div className="flex items-center gap-2 pt-1">
                                            <button
                                              type="button"
                                              onClick={() => handleOpenPaymentModal(item)}
                                              className="text-[9px] font-bold text-indigo-600 hover:text-indigo-900 hover:underline flex items-center gap-0.5 cursor-pointer"
                                            >
                                              <Edit3 size={9} />
                                              <span>Edit Payment</span>
                                            </button>
                                            <span className="text-gray-300">|</span>
                                            <button
                                              type="button"
                                              onClick={() => handleClearPaymentDetails(item.id)}
                                              className="text-[9px] font-bold text-red-500 hover:text-red-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                                              title="Clear payment data and reset to pending"
                                            >
                                              <Trash2 size={9} />
                                              <span>Clear</span>
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  }

                                  // Legacy single payment display
                                  if (item.payReceiveDate || item.receiveAmount || item.utrNumber || item.utrFileUrl) {
                                    return (
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 font-mono">
                                          <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                                          <span>₹{Number(item.receiveAmount || item.amount || 0).toLocaleString('en-IN')}</span>
                                          {item.payReceiveDate && (
                                            <span className="text-[10px] text-gray-500 font-normal font-sans">
                                              on {item.payReceiveDate}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-indigo-950 font-mono flex-wrap">
                                          <span className="px-1.5 py-0.2 bg-indigo-100/70 border border-indigo-200 rounded font-bold">
                                            {item.paymentMode || 'UTR'}
                                          </span>
                                          <span className="font-bold">{item.utrNumber || 'No Ref #'}</span>
                                          {item.utrDate && (
                                            <span className="text-gray-400">({item.utrDate})</span>
                                          )}
                                        </div>
                                        {item.utrFileUrl && (
                                          <a
                                            href={item.utrFileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-100/80 hover:bg-indigo-200 text-indigo-900 border border-indigo-300 rounded text-[9px] font-bold mt-0.5"
                                          >
                                            <Paperclip size={9} />
                                            <span>UTR Proof Document</span>
                                            <ExternalLink size={8} />
                                          </a>
                                        )}

                                        {/* QUICK ACTION BUTTONS (ONLY FOR ACCOUNTANT VIEW OR SUPER ADMIN) */}
                                        {(roleView === 'ACCOUNTANT' || isSuperAdmin) && (
                                          <div className="flex items-center gap-2 pt-1">
                                            <button
                                              type="button"
                                              onClick={() => handleOpenPaymentModal(item)}
                                              className="text-[9px] font-bold text-indigo-600 hover:text-indigo-900 hover:underline flex items-center gap-0.5 cursor-pointer"
                                            >
                                              <Edit3 size={9} />
                                              <span>Edit Payment</span>
                                            </button>
                                            <span className="text-gray-300">|</span>
                                            <button
                                              type="button"
                                              onClick={() => handleClearPaymentDetails(item.id)}
                                              className="text-[9px] font-bold text-red-500 hover:text-red-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                                              title="Clear payment data and reset to pending"
                                            >
                                              <Trash2 size={9} />
                                              <span>Clear</span>
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className="flex items-center gap-2">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[10px] font-bold">
                                        <Clock size={10} /> Pending Entry
                                      </span>
                                      {(roleView === 'ACCOUNTANT' || isSuperAdmin) && (
                                        <button
                                          type="button"
                                          onClick={() => handleOpenPaymentModal(item)}
                                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                                        >
                                          + Add
                                        </button>
                                      )}
                                    </div>
                                  );
                                })()}
                              </td>

                              {/* TDS */}
                              <td className="px-4 py-3 bg-indigo-50/20">
                                {item.tdsDeducted === 'Yes' ? (
                                  <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded text-[10px] font-mono font-bold">
                                    Yes {item.tdsAmount ? `(₹${Number(item.tdsAmount).toLocaleString('en-IN')})` : ''}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-[10px]">No</span>
                                )}
                              </td>

                              {/* REMARKS */}
                              <td className="px-4 py-3 text-gray-700">
                                {item.remarks ? (
                                  <div className="flex items-start gap-1.5 max-w-md">
                                    <span className="text-gray-800 text-xs">{item.remarks}</span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic text-[11px]">No remarks</span>
                                )}
                              </td>

                              {/* UPLOADED BY */}
                              <td className="px-4 py-3 text-[11px] text-gray-600">
                                <div className="flex items-center gap-1.5 font-medium text-gray-800">
                                  <User size={12} className="text-gray-400 shrink-0" />
                                  <span>{item.uploadedByName || 'Manager'}</span>
                                </div>
                                <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                                  {new Date(item.createdAt).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </div>
                              </td>

                              {/* ACTIONS */}
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                  {/* RECORD PAYMENT DETAILS BUTTON (ONLY FOR ACCOUNTANT VIEW) */}
                                  {roleView === 'ACCOUNTANT' && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenPaymentModal(item)}
                                      className="px-2 py-1 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-300 rounded text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                      title="Record / Edit Multi-Part Payment & UTR Proofs"
                                    >
                                      <CreditCard size={11} />
                                      <span>Payment</span>
                                    </button>
                                  )}

                                  {/* VIEW PDF */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPreviewPdfUrl(item.invoiceUrl);
                                      setPreviewPdfTitle(`${item.companyName} - ${item.month} Invoice`);
                                    }}
                                    className="p-1.5 bg-teal-50 hover:bg-[#1ab0bc] text-[#1ab0bc] hover:text-white border border-teal-200 hover:border-[#1ab0bc] rounded transition-colors cursor-pointer"
                                    title="View Attached PDF Invoice"
                                  >
                                    <Eye size={13} />
                                  </button>

                                  {/* DOWNLOAD PDF */}
                                  <a
                                    href={item.invoiceUrl}
                                    download={item.fileName || `${item.companyName}_${item.month}_Invoice.pdf`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded transition-colors"
                                    title="Download PDF"
                                  >
                                    <Download size={13} />
                                  </a>

                                  {/* EDIT (CM OR SUPER ADMIN) */}
                                  {(roleView === 'CM' || isSuperAdmin) && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditModal(item)}
                                      className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded transition-colors cursor-pointer"
                                      title="Edit Invoice Details"
                                    >
                                      <Edit3 size={13} />
                                    </button>
                                  )}

                                  {/* DELETE INVOICE (CM OR SUPER ADMIN) */}
                                  {(roleView === 'CM' || isSuperAdmin) && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteInvoice(item.id, item.companyName, item.month)}
                                      className="p-1.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-red-600 rounded transition-colors cursor-pointer"
                                      title="Delete from Archive"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── UPLOAD / EDIT MODAL ── */}
      {mounted &&
        typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isModalOpen && (
              <div
                onClick={() => !submitting && setIsModalOpen(false)}
                className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-xs overflow-y-auto p-3 sm:p-6 flex justify-center items-start sm:items-center"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 0 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className={`bg-white border border-gray-200 shadow-2xl rounded-xl w-full ${
                    modalMode === 'upload' ? 'max-w-3xl' : 'max-w-xl'
                  } my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] overflow-hidden font-sans flex flex-col`}
                >
                  {/* MODAL HEADER */}
                  <div className="px-6 py-4 bg-[#f8fafc] border-b border-gray-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-teal-50 text-[#1ab0bc] border border-teal-200 flex items-center justify-center rounded">
                        <FolderArchive size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">
                          {modalMode === 'upload' ? 'Archive Historical Old Invoices' : 'Edit Old Invoice Record'}
                        </h3>
                        <p className="text-[11px] text-gray-500">
                          {modalMode === 'upload'
                            ? 'Attach single or multiple monthly invoices for this company in one submission.'
                            : 'Update past monthly client invoice details.'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      disabled={submitting}
                      className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* FORM BODY */}
                  <form onSubmit={handleSubmitForm} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                    <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1 overscroll-contain">
                      {/* 1. COMPANY & CENTER HEADER */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 p-3.5 border border-gray-200 rounded">
                        {/* COMPANY NAME */}
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                            Company / Client Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            list="company-suggestions-list"
                            value={formCompany}
                            onChange={(e) => setFormCompany(e.target.value)}
                            placeholder="e.g. Acme Technologies Private Limited"
                            className="w-full bg-white border border-gray-300 px-3 py-2 text-xs text-gray-900 outline-none focus:border-[#1ab0bc] font-medium"
                          />
                          <datalist id="company-suggestions-list">
                            {companySuggestions.map((comp) => (
                              <option key={comp} value={comp} />
                            ))}
                          </datalist>
                        </div>

                        {/* CENTER / LOCATION */}
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                            Center / Location {isSuperAdmin ? '' : <span className="text-gray-400 font-normal">(Assigned)</span>}
                          </label>
                          {isSuperAdmin ? (
                            <select
                              value={formLocationId}
                              onChange={(e) => setFormLocationId(e.target.value)}
                              className="w-full bg-white border border-gray-300 px-3 py-2 text-xs text-gray-900 outline-none focus:border-[#1ab0bc] cursor-pointer"
                            >
                              <option value="">All / Specific Center...</option>
                              {locations.map((loc) => (
                                <option key={loc.id} value={loc.id}>
                                  {loc.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="w-full bg-gray-100 border border-gray-300 px-3 py-2 text-xs text-gray-800 font-bold flex items-center gap-1.5 cursor-not-allowed">
                              <MapPin size={13} className="text-[#1ab0bc] shrink-0" />
                              <span>{resolvedLocationName || formLocationName || currentUserLocationName || locations[0]?.name || 'Center'}</span>
                            </div>
                          )}
                        </div>
                      </div>

                {/* ── MODE: UPLOAD MULTIPLE INVOICES ── */}
                {modalMode === 'upload' ? (
                  <div className="space-y-4">
                    {/* BATCH DROPZONE SHORTCUT */}
                    <div
                      onClick={() => batchFileInputRef.current?.click()}
                      className="p-3 bg-teal-50/50 hover:bg-teal-50 border border-dashed border-[#1ab0bc] rounded text-center cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-center gap-2 text-teal-800 font-bold text-xs">
                        <Upload size={14} className="text-[#1ab0bc]" />
                        <span>⚡ Drag & drop or select multiple invoice PDFs (Auto-creates rows)</span>
                      </div>
                      <p className="text-[10px] text-teal-600 mt-0.5">Supports PDF documents up to 50MB each</p>
                      <input
                        ref={batchFileInputRef}
                        type="file"
                        multiple
                        accept="application/pdf"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleBatchFilesUpload(e.target.files);
                            e.target.value = '';
                          }
                        }}
                        className="hidden"
                      />
                    </div>

                    {/* INVOICES LIST */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                        <span>Invoices to Archive ({uploadItems.length})</span>
                        <button
                          type="button"
                          onClick={handleAddUploadItem}
                          className="text-[#1ab0bc] hover:underline flex items-center gap-1 font-bold lowercase cursor-pointer"
                        >
                          <Plus size={13} />
                          <span>+ add another invoice</span>
                        </button>
                      </div>

                      {uploadItems.map((item, idx) => (
                        <div
                          key={item.id}
                          className="p-3.5 bg-white border border-gray-200 rounded shadow-2xs space-y-3 relative group"
                        >
                          {/* ITEM HEADER */}
                          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 bg-[#006064] text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                                {idx + 1}
                              </span>
                              <span className="font-bold text-gray-900 text-xs">
                                Invoice #{idx + 1} ({item.monthName} {item.year})
                              </span>
                            </div>

                            {uploadItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveUploadItem(item.id)}
                                className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded cursor-pointer"
                                title="Remove this invoice row"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>

                          {/* ROW 1: MONTH, YEAR, INVOICE NO, AMOUNT */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-gray-600 mb-1">
                                Month <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={item.monthName}
                                onChange={(e) => handleUpdateUploadItem(item.id, { monthName: e.target.value })}
                                className="w-full bg-white border border-gray-300 px-2 py-1.5 text-xs text-gray-900 outline-none focus:border-[#1ab0bc]"
                              >
                                {MONTH_NAMES.map((m) => (
                                  <option key={m} value={m}>
                                    {m}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase text-gray-600 mb-1">
                                Year <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={item.year}
                                onChange={(e) =>
                                  handleUpdateUploadItem(item.id, { year: parseInt(e.target.value, 10) })
                                }
                                className="w-full bg-white border border-gray-300 px-2 py-1.5 text-xs text-gray-900 outline-none focus:border-[#1ab0bc]"
                              >
                                {YEARS.map((y) => (
                                  <option key={y} value={y}>
                                    {y}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase text-gray-600 mb-1">
                                Invoice #
                              </label>
                              <input
                                type="text"
                                value={item.invoiceNo}
                                onChange={(e) => handleUpdateUploadItem(item.id, { invoiceNo: e.target.value })}
                                placeholder="INV/2026/042"
                                className="w-full bg-white border border-gray-300 px-2 py-1.5 text-xs font-mono text-gray-900 outline-none focus:border-[#1ab0bc]"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase text-gray-600 mb-1">
                                Amount (₹)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={item.amount}
                                onChange={(e) => handleUpdateUploadItem(item.id, { amount: e.target.value })}
                                placeholder="45000"
                                className="w-full bg-white border border-gray-300 px-2 py-1.5 text-xs font-mono text-gray-900 outline-none focus:border-[#1ab0bc]"
                              />
                            </div>
                          </div>

                          {/* ROW 2: PDF DOCUMENT UPLOAD & REMARKS */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-gray-600 mb-1">
                                PDF Document <span className="text-red-500">*</span>
                              </label>

                              {item.fileUrl ? (
                                <div className="p-2 bg-emerald-50 border border-emerald-300 rounded flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <FileText size={14} className="text-emerald-600 shrink-0" />
                                    <span className="font-bold text-xs text-emerald-900 truncate">
                                      {item.fileName || 'Invoice.pdf'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPreviewPdfUrl(item.fileUrl);
                                        setPreviewPdfTitle(item.fileName || 'Invoice Preview');
                                      }}
                                      className="px-1.5 py-0.5 bg-white text-emerald-800 border border-emerald-300 rounded text-[10px] font-bold cursor-pointer"
                                    >
                                      Preview
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateUploadItem(item.id, {
                                          fileUrl: '',
                                          fileName: '',
                                          fileSize: '',
                                        })
                                      }
                                      className="p-1 text-red-500 hover:bg-red-100 rounded cursor-pointer"
                                      title="Remove PDF"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <label className="flex items-center justify-center gap-1.5 p-2 bg-gray-50 hover:bg-teal-50 border border-dashed border-gray-300 hover:border-[#1ab0bc] rounded cursor-pointer transition-colors">
                                  {item.uploading ? (
                                    <>
                                      <Loader2 size={13} className="animate-spin text-[#1ab0bc]" />
                                      <span className="text-xs text-teal-700 font-medium">Uploading...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Paperclip size={13} className="text-gray-400" />
                                      <span className="text-xs text-gray-700 font-medium">
                                        Attach PDF (up to 50MB)
                                      </span>
                                      <input
                                        type="file"
                                        accept="application/pdf"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleItemFileUpload(item.id, file);
                                        }}
                                        className="hidden"
                                      />
                                    </>
                                  )}
                                </label>
                              )}
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase text-gray-600 mb-1">
                                Remarks / Notes
                              </label>
                              <input
                                type="text"
                                value={item.remarks}
                                onChange={(e) => handleUpdateUploadItem(item.id, { remarks: e.target.value })}
                                placeholder="e.g. Paid via NEFT / Tally sync"
                                className="w-full bg-white border border-gray-300 px-2 py-1.5 text-xs text-gray-900 outline-none focus:border-[#1ab0bc]"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* ADD ANOTHER INVOICE BUTTON */}
                    <button
                      type="button"
                      onClick={handleAddUploadItem}
                      className="w-full py-2 bg-slate-50 hover:bg-teal-50 border border-dashed border-gray-300 hover:border-[#1ab0bc] text-gray-700 hover:text-teal-900 text-xs font-bold flex items-center justify-center gap-1.5 rounded cursor-pointer transition-colors"
                    >
                      <Plus size={14} className="text-[#1ab0bc]" />
                      <span>Add Another Invoice for this Company</span>
                    </button>
                  </div>
                ) : (
                  /* ── MODE: EDIT SINGLE INVOICE ── */
                  <div className="space-y-4">
                    {/* MONTH & YEAR PICKER */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                          Billing Month <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formMonthName}
                          onChange={(e) => setFormMonthName(e.target.value)}
                          className="w-full bg-white border border-gray-300 px-3 py-2 text-xs text-gray-900 outline-none focus:border-[#1ab0bc] font-medium cursor-pointer"
                        >
                          {MONTH_NAMES.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                          Billing Year <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formYear}
                          onChange={(e) => setFormYear(parseInt(e.target.value, 10))}
                          className="w-full bg-white border border-gray-300 px-3 py-2 text-xs text-gray-900 outline-none focus:border-[#1ab0bc] font-medium cursor-pointer"
                        >
                          {YEARS.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* INVOICE NO & AMOUNT */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                          Invoice Number
                        </label>
                        <input
                          type="text"
                          value={formInvoiceNo}
                          onChange={(e) => setFormInvoiceNo(e.target.value)}
                          placeholder="e.g. INV/2026/042"
                          className="w-full bg-white border border-gray-300 px-3 py-2 text-xs font-mono text-gray-900 outline-none focus:border-[#1ab0bc]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                          Invoice Amount (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formAmount}
                          onChange={(e) => setFormAmount(e.target.value)}
                          placeholder="e.g. 45000"
                          className="w-full bg-white border border-gray-300 px-3 py-2 text-xs font-mono text-gray-900 outline-none focus:border-[#1ab0bc]"
                        />
                      </div>
                    </div>

                    {/* PDF DOCUMENT */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                        Invoice Document (PDF) <span className="text-red-500">*</span>
                      </label>

                      {uploadedFileUrl ? (
                        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText size={18} className="text-emerald-600 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-emerald-900 truncate">
                                {uploadedFileName || 'Uploaded Invoice.pdf'}
                              </p>
                              {uploadedFileSize && (
                                <p className="text-[10px] text-emerald-700 font-mono">{uploadedFileSize}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewPdfUrl(uploadedFileUrl);
                                setPreviewPdfTitle(uploadedFileName || 'Invoice Preview');
                              }}
                              className="px-2 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[11px] font-bold cursor-pointer"
                            >
                              Preview
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setUploadedFileUrl('');
                                setUploadedFileName('');
                                setUploadedFileSize('');
                              }}
                              className="p-1 text-red-500 hover:bg-red-100 rounded cursor-pointer"
                              title="Change file"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="p-5 border-2 border-dashed border-gray-300 hover:border-[#1ab0bc] bg-gray-50 hover:bg-teal-50/40 rounded cursor-pointer text-center transition-colors"
                        >
                          {uploadingFile ? (
                            <div className="flex flex-col items-center gap-2">
                              <Loader2 size={24} className="animate-spin text-[#1ab0bc]" />
                              <span className="text-xs font-bold text-gray-700">Uploading PDF document...</span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <Upload size={22} className="text-gray-400 mx-auto mb-1" />
                              <div className="font-bold text-xs text-gray-700">
                                Click to browse or drag & drop invoice PDF
                              </div>
                              <div className="text-[10px] text-gray-400">PDF up to 50MB supported</div>
                            </div>
                          )}
                        </div>
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>

                    {/* REMARKS */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                        Remarks / Additional Notes
                      </label>
                      <textarea
                        rows={2}
                        value={formRemarks}
                        onChange={(e) => setFormRemarks(e.target.value)}
                        placeholder="e.g. Paid via NEFT on 12th April. GST input claimed."
                        className="w-full bg-white border border-gray-300 px-3 py-2 text-xs text-gray-900 outline-none focus:border-[#1ab0bc] resize-none"
                      />
                    </div>
                  </div>
                )}
                    </div>

                {/* MODAL FOOTER BUTTONS */}
                <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
                  <div className="text-[11px] text-gray-500">
                    {modalMode === 'upload' && formCompany.trim() && (
                      <span>
                        Archiving for: <strong className="text-gray-900">{formCompany}</strong>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      disabled={submitting}
                      className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || uploadingFile}
                      className="px-5 py-2 bg-[#1ab0bc] hover:bg-teal-600 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={13} />
                          <span>
                            {modalMode === 'upload'
                              ? `Archive ${
                                  uploadItems.filter((it) => it.fileUrl).length > 0
                                    ? `${uploadItems.filter((it) => it.fileUrl).length} Invoices`
                                    : 'Invoices'
                                }`
                              : 'Update Record'}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )}

      {/* ── PDF DOCUMENT PREVIEW MODAL ── */}
      {mounted &&
        typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {previewPdfUrl && (
              <div
                onClick={() => setPreviewPdfUrl(null)}
                className="fixed inset-0 z-[999999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white border border-gray-200 shadow-2xl rounded-lg w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden"
                >
                  {/* PREVIEW HEADER */}
                  <div className="px-5 py-3 bg-gray-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={16} className="text-[#1ab0bc]" />
                      <h3 className="font-bold text-xs uppercase tracking-tight truncate">
                        {previewPdfTitle || 'Archived Invoice PDF'}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={previewPdfUrl}
                        download
                        className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded flex items-center gap-1.5 transition-colors"
                      >
                        <Download size={12} />
                        <span>Download</span>
                      </a>
                      <a
                        href={previewPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-gray-800 text-gray-300 hover:text-white rounded"
                        title="Open in new tab"
                      >
                        <ExternalLink size={14} />
                      </a>
                      <button
                        type="button"
                        onClick={() => setPreviewPdfUrl(null)}
                        className="p-1.5 hover:bg-gray-800 text-gray-300 hover:text-white rounded cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  {/* EMBEDDED VIEWER */}
                  <div className="flex-1 bg-gray-100 relative">
                    <iframe
                      src={`${previewPdfUrl}#toolbar=1`}
                      className="w-full h-full border-none"
                      title="PDF Viewer"
                    />
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* ── PAYMENT RECEIVED & UTR DETAILS MODAL (FOR ACCOUNTANT VIEW - MULTI-PART PAYMENTS) ── */}
      {mounted &&
        typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isPaymentModalOpen &&
              paymentTargetInvoice &&
              (() => {
                const totalInvAmount = Number(paymentTargetInvoice.amount || 0);
                const totalRecAmount = paymentParts.reduce(
                  (sum, p) => sum + (parseFloat(p.receiveAmount) || 0),
                  0
                );
                const totalTdsDeducted = paymentParts.reduce(
                  (sum, p) => (p.tdsDeducted === 'Yes' ? sum + (parseFloat(p.tdsAmount) || 0) : sum),
                  0
                );
                const pendingBalance = Math.max(0, totalInvAmount - totalRecAmount - totalTdsDeducted);

                return (
                  <div
                    onClick={() => !savingPayment && setIsPaymentModalOpen(false)}
                    className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-xs overflow-y-auto p-3 sm:p-6 flex justify-center items-start sm:items-center"
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 0 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 0 }}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-white border border-gray-200 shadow-2xl rounded-xl w-full max-w-3xl my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] overflow-hidden font-sans flex flex-col"
                    >
                      {/* MODAL HEADER */}
                      <div className="px-6 py-3.5 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-indigo-600 text-white flex items-center justify-center rounded">
                            <CreditCard size={18} />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-indigo-950 uppercase tracking-tight">
                              Record Payment Received & UTR
                            </h3>
                            <p className="text-[11px] text-indigo-700/80">
                              {paymentTargetInvoice.companyName} • {paymentTargetInvoice.month}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsPaymentModalOpen(false)}
                          className="p-1 hover:bg-indigo-100 text-gray-500 hover:text-gray-800 rounded cursor-pointer"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      {/* INVOICE SUMMARY BANNER & CALCULATIONS */}
                      <div className="px-6 py-2.5 bg-gray-50 border-b border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono shrink-0">
                        <div>
                          <span className="text-gray-500 text-[10px] block uppercase">Invoice #</span>
                          <strong className="text-gray-900">{paymentTargetInvoice.invoiceNo || 'N/A'}</strong>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[10px] block uppercase">Invoice Amount</span>
                          <strong className="text-gray-900 font-bold">
                            ₹{totalInvAmount.toLocaleString('en-IN')}
                          </strong>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[10px] block uppercase">Total Received</span>
                          <strong className="text-emerald-700 font-bold">
                            ₹{totalRecAmount.toLocaleString('en-IN')}
                          </strong>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[10px] block uppercase">Balance Pending</span>
                          <strong
                            className={
                              pendingBalance === 0 ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'
                            }
                          >
                            ₹{pendingBalance.toLocaleString('en-IN')}
                          </strong>
                        </div>
                      </div>

                      {/* FORM CONTAINER */}
                      <form onSubmit={handleSavePaymentDetails} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 overscroll-contain">
                          {/* MULTI-PART INSTALLMENTS */}
                          <div className="space-y-4">
                            {paymentParts.map((part, index) => (
                              <div
                                key={part.id}
                                className="bg-white border-2 border-indigo-100 rounded-lg p-4 space-y-4 shadow-2xs relative"
                              >
                                {/* PART HEADER */}
                                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-indigo-600 text-white font-mono font-bold text-xs rounded">
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
                                      className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                      title="Delete this payment part"
                                    >
                                      <Trash2 size={12} />
                                      <span>Remove Part</span>
                                    </button>
                                  )}
                                </div>

                                {/* PART ROW 1: DATE & AMOUNT */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                                      Payment Receive Date
                                    </label>
                                    <input
                                      type="date"
                                      value={part.payReceiveDate}
                                      onChange={(e) =>
                                        handleUpdatePaymentPart(part.id, 'payReceiveDate', e.target.value)
                                      }
                                      className="w-full bg-white border border-gray-300 px-3 py-2 text-xs text-gray-900 outline-none focus:border-indigo-600 font-mono"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                                      Received Amount (₹)
                                    </label>
                                    <input
                                      type="number"
                                      step="any"
                                      value={part.receiveAmount}
                                      onChange={(e) =>
                                        handleUpdatePaymentPart(part.id, 'receiveAmount', e.target.value)
                                      }
                                      placeholder="e.g. 25000"
                                      className="w-full bg-white border border-gray-300 px-3 py-2 text-xs text-gray-900 outline-none focus:border-indigo-600 font-mono font-bold"
                                    />
                                  </div>
                                </div>

                                {/* PART ROW 2: MODE & UTR NUMBER */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                                      UTR / Payment Mode
                                    </label>
                                    <select
                                      value={part.paymentMode}
                                      onChange={(e) =>
                                        handleUpdatePaymentPart(part.id, 'paymentMode', e.target.value)
                                      }
                                      className="w-full bg-white border border-gray-300 px-3 py-2 text-xs text-gray-900 outline-none focus:border-indigo-600 font-medium cursor-pointer"
                                    >
                                      <option value="NEFT">NEFT</option>
                                      <option value="RTGS">RTGS</option>
                                      <option value="IMPS">IMPS</option>
                                      <option value="UPI">UPI</option>
                                      <option value="Cheque">Cheque</option>
                                      <option value="Cash">Cash</option>
                                      <option value="Bank Transfer">Bank Transfer</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                                      UTR / Reference Number
                                    </label>
                                    <input
                                      type="text"
                                      value={part.utrNumber}
                                      onChange={(e) =>
                                        handleUpdatePaymentPart(part.id, 'utrNumber', e.target.value)
                                      }
                                      placeholder="e.g. HDFC0001234567"
                                      className="w-full bg-white border border-gray-300 px-3 py-2 text-xs text-gray-900 outline-none focus:border-indigo-600 font-mono"
                                    />
                                  </div>
                                </div>

                                {/* PART ROW 3: UTR DATE & TDS TOGGLE */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                                      UTR Date
                                    </label>
                                    <input
                                      type="date"
                                      value={part.utrDate}
                                      onChange={(e) =>
                                        handleUpdatePaymentPart(part.id, 'utrDate', e.target.value)
                                      }
                                      className="w-full bg-white border border-gray-300 px-3 py-2 text-xs text-gray-900 outline-none focus:border-indigo-600 font-mono"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                                      TDS Deducted?
                                    </label>
                                    <select
                                      value={part.tdsDeducted}
                                      onChange={(e) =>
                                        handleUpdatePaymentPart(part.id, 'tdsDeducted', e.target.value)
                                      }
                                      className="w-full bg-white border border-gray-300 px-3 py-2 text-xs text-gray-900 outline-none focus:border-indigo-600 font-medium cursor-pointer"
                                    >
                                      <option value="No">No</option>
                                      <option value="Yes">Yes</option>
                                    </select>
                                  </div>
                                </div>

                                {/* TDS AMOUNT (IF YES) */}
                                {part.tdsDeducted === 'Yes' && (
                                  <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-900 mb-1">
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
                                      className="w-full bg-white border border-amber-300 px-3 py-2 text-xs text-gray-900 outline-none focus:border-indigo-600 font-mono font-bold"
                                    />
                                  </div>
                                )}

                                {/* 3 UNIQUE ATTACHMENT SLOTS */}
                                <div className="space-y-2 pt-2 border-t border-gray-100">
                                  <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-950">
                                    📎 Attached Documents for Part #{index + 1} (3 Attachment Options)
                                  </label>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {/* SLOT 1: Payment Received Document / Bank Advice */}
                                    <div className="p-2.5 bg-gray-50 border border-gray-200 rounded text-xs space-y-1.5">
                                      <div className="text-[10px] font-bold text-gray-700 uppercase">
                                        1. Payment Received Doc / Advice
                                      </div>
                                      {part.paymentDocUrl ? (
                                        <div className="space-y-1">
                                          <div
                                            className="text-[10px] font-mono text-indigo-900 font-bold truncate"
                                            title={part.paymentDocName || 'Payment_Doc.pdf'}
                                          >
                                            {part.paymentDocName || 'Payment_Doc.pdf'}
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <a
                                              href={part.paymentDocUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="px-2 py-0.5 bg-white hover:bg-teal-50 text-teal-800 border border-teal-300 rounded text-[9px] font-bold cursor-pointer"
                                            >
                                              View
                                            </a>
                                            <button
                                              type="button"
                                              onClick={() => handleRemovePartAttachment(part.id, 'paymentDoc')}
                                              className="p-0.5 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                                              title="Remove"
                                            >
                                              <X size={12} />
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleTriggerPartUpload(part.id, 'paymentDoc')}
                                          disabled={part.uploadingSlot === 'paymentDoc'}
                                          className="w-full py-2 px-2 border border-dashed border-gray-300 hover:border-teal-600 bg-white hover:bg-teal-50/50 rounded text-[10px] font-bold text-gray-600 hover:text-teal-900 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                                        >
                                          {part.uploadingSlot === 'paymentDoc' ? (
                                            <Loader2 size={12} className="animate-spin text-teal-600" />
                                          ) : (
                                            <Upload size={11} className="text-gray-400" />
                                          )}
                                          <span>+ Upload Advice</span>
                                        </button>
                                      )}
                                    </div>

                                    {/* SLOT 2: UTR Proof / Bank Statement Entry */}
                                    <div className="p-2.5 bg-gray-50 border border-gray-200 rounded text-xs space-y-1.5">
                                      <div className="text-[10px] font-bold text-gray-700 uppercase">
                                        2. UTR Proof / Statement
                                      </div>
                                      {part.utrDocUrl ? (
                                        <div className="space-y-1">
                                          <div
                                            className="text-[10px] font-mono text-indigo-900 font-bold truncate"
                                            title={part.utrDocName || 'UTR_Proof.pdf'}
                                          >
                                            {part.utrDocName || 'UTR_Proof.pdf'}
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <a
                                              href={part.utrDocUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="px-2 py-0.5 bg-white hover:bg-indigo-50 text-indigo-800 border border-indigo-300 rounded text-[9px] font-bold cursor-pointer"
                                            >
                                              View
                                            </a>
                                            <button
                                              type="button"
                                              onClick={() => handleRemovePartAttachment(part.id, 'utrDoc')}
                                              className="p-0.5 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                                              title="Remove"
                                            >
                                              <X size={12} />
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleTriggerPartUpload(part.id, 'utrDoc')}
                                          disabled={part.uploadingSlot === 'utrDoc'}
                                          className="w-full py-2 px-2 border border-dashed border-gray-300 hover:border-indigo-600 bg-white hover:bg-indigo-50/50 rounded text-[10px] font-bold text-gray-600 hover:text-indigo-900 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                                        >
                                          {part.uploadingSlot === 'utrDoc' ? (
                                            <Loader2 size={12} className="animate-spin text-indigo-600" />
                                          ) : (
                                            <Upload size={11} className="text-gray-400" />
                                          )}
                                          <span>+ Upload UTR</span>
                                        </button>
                                      )}
                                    </div>

                                    {/* SLOT 3: Other Supporting Document / TDS Certificate */}
                                    <div className="p-2.5 bg-gray-50 border border-gray-200 rounded text-xs space-y-1.5">
                                      <div className="text-[10px] font-bold text-gray-700 uppercase">
                                        3. Other Doc / TDS Cert
                                      </div>
                                      {part.otherDocUrl ? (
                                        <div className="space-y-1">
                                          <div
                                            className="text-[10px] font-mono text-indigo-900 font-bold truncate"
                                            title={part.otherDocName || 'Supporting_Doc.pdf'}
                                          >
                                            {part.otherDocName || 'Supporting_Doc.pdf'}
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <a
                                              href={part.otherDocUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="px-2 py-0.5 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 rounded text-[9px] font-bold cursor-pointer"
                                            >
                                              View
                                            </a>
                                            <button
                                              type="button"
                                              onClick={() => handleRemovePartAttachment(part.id, 'otherDoc')}
                                              className="p-0.5 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                                              title="Remove"
                                            >
                                              <X size={12} />
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleTriggerPartUpload(part.id, 'otherDoc')}
                                          disabled={part.uploadingSlot === 'otherDoc'}
                                          className="w-full py-2 px-2 border border-dashed border-gray-300 hover:border-amber-600 bg-white hover:bg-amber-50/50 rounded text-[10px] font-bold text-gray-600 hover:text-amber-900 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                                        >
                                          {part.uploadingSlot === 'otherDoc' ? (
                                            <Loader2 size={12} className="animate-spin text-amber-600" />
                                          ) : (
                                            <Upload size={11} className="text-gray-400" />
                                          )}
                                          <span>+ Upload Doc</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* ADD ANOTHER PAYMENT PART BUTTON */}
                          <div className="text-center pt-2">
                            <button
                              type="button"
                              onClick={handleAddPaymentPart}
                              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-300 font-bold text-xs rounded inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                            >
                              <Plus size={14} />
                              <span>+ Add Another Payment Entry / Part</span>
                            </button>
                          </div>

                          {/* HIDDEN GLOBAL FILE INPUT FOR PART UPLOADS */}
                          <input
                            ref={partFileInputRef}
                            type="file"
                            accept="application/pdf,image/*"
                            onChange={handlePartFileChange}
                            className="hidden"
                          />
                        </div>

                        {/* MODAL ACTIONS FOOTER */}
                        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3 shrink-0 flex-wrap">
                          <div className="flex items-center gap-3">
                            <div className="text-xs font-mono text-gray-500">
                              Total Entries: <strong className="text-gray-900">{paymentParts.length}</strong>
                            </div>

                            {paymentTargetInvoice &&
                              (paymentTargetInvoice.receiveAmount !== null ||
                                paymentTargetInvoice.paymentsJson ||
                                paymentTargetInvoice.payReceiveDate ||
                                paymentTargetInvoice.utrNumber) && (
                                <button
                                  type="button"
                                  onClick={() => handleClearPaymentDetails()}
                                  disabled={savingPayment}
                                  className="px-2.5 py-1 text-red-600 hover:bg-red-50 border border-red-200 rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Clear / delete all recorded payment data and reset to pending"
                                >
                                  <Trash2 size={12} />
                                  <span>Clear / Delete Payment</span>
                                </button>
                              )}
                          </div>

                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => setIsPaymentModalOpen(false)}
                              disabled={savingPayment}
                              className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold text-xs cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={savingPayment}
                              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                            >
                              {savingPayment ? (
                                <>
                                  <Loader2 size={13} className="animate-spin" />
                                  <span>Saving Payments...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={13} />
                                  <span>Save Payment Details</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                );
              })()}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
