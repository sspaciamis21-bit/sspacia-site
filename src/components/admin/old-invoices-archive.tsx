'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  Paperclip
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
  createdAt: string;
  updatedAt: string;
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
  currentUserLocationId?: number | null;
  currentUserLocationName?: string | null;
}

export function OldInvoicesArchive({
  isSuperAdmin = false,
  currentUserLocationId,
  currentUserLocationName,
}: OldInvoicesArchiveProps) {
  const [invoices, setInvoices] = useState<OldInvoiceRecord[]>([]);
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
  }, [invoices, searchQuery]);

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

        {/* TOP STATS & UPLOAD BUTTON */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
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

          <button
            type="button"
            onClick={() => handleOpenUploadModal()}
            className="px-4 py-2 bg-[#1ab0bc] hover:bg-teal-600 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <Upload size={14} />
            <span>Upload Old Invoice</span>
          </button>
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
          {isSuperAdmin && locations.length > 0 ? (
            <div className="flex items-center gap-1.5">
              <MapPin size={13} className="text-gray-400 shrink-0" />
              <select
                value={selectedLocationFilter}
                onChange={(e) => setSelectedLocationFilter(e.target.value)}
                className="bg-gray-50 border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 font-medium outline-none focus:border-[#1ab0bc] cursor-pointer"
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
                className="bg-gray-50 border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 font-medium outline-none focus:border-[#1ab0bc] cursor-pointer"
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
          <button
            type="button"
            onClick={() => handleOpenUploadModal()}
            className="mt-2 px-4 py-2 bg-[#1ab0bc] hover:bg-teal-600 text-white font-bold text-xs uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Upload size={14} />
            <span>Upload First Old Invoice</span>
          </button>
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
                  </div>
                </div>

                {/* ── EXPANDED MULTI-MONTH INVOICES LIST ── */}
                {isExpanded && (
                  <div className="divide-y divide-gray-200">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-100/60 text-gray-600 font-bold uppercase tracking-wider text-[10px] border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-2.5 w-44">Billing Month</th>
                            <th className="px-4 py-2.5 w-36">Invoice #</th>
                            <th className="px-4 py-2.5 w-32">Amount (₹)</th>
                            <th className="px-4 py-2.5 min-w-[200px]">Remarks / Notes</th>
                            <th className="px-4 py-2.5 w-48">Uploaded By</th>
                            <th className="px-4 py-2.5 w-44 text-right">Actions</th>
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
                                <div className="flex items-center justify-end gap-1.5">
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

                                  {/* EDIT */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(item)}
                                    className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded transition-colors cursor-pointer"
                                    title="Edit Invoice Details"
                                  >
                                    <Edit3 size={13} />
                                  </button>

                                  {/* DELETE */}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteInvoice(item.id, item.companyName, item.month)}
                                    className="p-1.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-red-600 rounded transition-colors cursor-pointer"
                                    title="Delete from Archive"
                                  >
                                    <Trash2 size={13} />
                                  </button>
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
      <AnimatePresence>
        {isModalOpen && (
          <div
            onClick={() => !submitting && setIsModalOpen(false)}
            className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className={`bg-white border border-gray-200 shadow-2xl rounded-lg w-full ${
                modalMode === 'upload' ? 'max-w-3xl max-h-[90vh]' : 'max-w-xl'
              } overflow-hidden font-sans flex flex-col`}
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
              <form onSubmit={handleSubmitForm} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
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

                {/* MODAL FOOTER BUTTONS */}
                <div className="pt-3 border-t border-gray-200 flex items-center justify-between shrink-0">
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
      </AnimatePresence>

      {/* ── PDF DOCUMENT PREVIEW MODAL ── */}
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
      </AnimatePresence>
    </div>
  );
}
