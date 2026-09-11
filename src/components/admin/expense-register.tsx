"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Building2,
  Calendar,
  Search,
  Plus,
  RefreshCw,
  FileText,
  ExternalLink,
  CheckCircle2,
  Clock,
  CreditCard,
  Tag,
  Trash2,
  Edit3,
  Check,
  X,
  ChevronDown,
  Download,
  AlertCircle,
  Table as TableIcon,
  DollarSign,
  Receipt,
  FileCheck,
  Layers,
  Sparkles,
  ArrowUpDown,
  Lock,
  Upload,
  UserPlus,
  Send,
  Phone,
  Mail,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  Paperclip,
  Eye,
  User,
  Loader2,
  Landmark,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { BankStatementModal } from "./bank-statement-modal";

export interface ExpenseRecordItem {
  id: number;
  expenseDate: string;
  expenseDateStr?: string | null;
  locationId: number | null;
  locationName: string | null;
  category: string | null;
  description: string;
  amount: number;
  paymentMode: string | null;
  receiptNo: string | null;
  attachmentUrl: string | null;
  remarks: string | null;
  vendorId?: number | null;
  vendorName?: string | null;

  // Vendor bill & QTY/Rate
  accountNo?: string | null;
  quantity?: number | null;
  unit?: string | null; // A/U (Accounting Unit)
  rate?: number | null;
  invoiceUrl?: string | null;
  vendorInvoiceUrl?: string | null;
  paymentProofUrl?: string | null;
  uploadedInBankPortal?: boolean;

  // Super Admin Approval Flow
  approvalStatus?: string | null; // "PENDING" | "APPROVED" | "REJECTED"
  approvedById?: number | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  approvalRemarks?: string | null;
  alertEmailSent?: boolean;
  alertEmailSentTo?: string | null;

  // Accountant fields
  payReceiveDate?: string | null;
  receiveAmount?: number | null;
  accPaymentMode?: string | null;
  utrNumber?: string | null;
  utrDate?: string | null;
  utrFileUrl?: string | null;
  tdsDeducted?: string | null;
  tdsAmount?: number | null;
  paymentStatus: "PAID" | "PENDING";

  createdById?: number | null;
  createdByName?: string | null;
  createdByRole?: string | null;
  createdAt: string;
  updatedAt: string;
  location?: { id: number; name: string } | null;
}

interface VendorOption {
  id: number;
  vendorName: string;
  mobileNo: string | null;
  email: string | null;
  accountNo?: string | null;
  ifscCode?: string | null;
  bankName?: string | null;
  locationName?: string | null;
}

interface ExpenseRegisterProps {
  initialLocationId?: number | null;
  isAccountant?: boolean;
  isAdmin?: boolean;
  currentUserName?: string;
  onSwitchToSpreadsheet?: () => void;
}

export const FIXED_EXPENSE_TYPES = [
  "ELECTRICITY & UTILITIES",
  "RENT & LEASE",
  "HOUSEKEEPING & CLEANING",
  "TEA, COFFEE & PANTRY SUPPLIES",
  "MAINTENANCE & REPAIRS",
  "OFFICE SUPPLIES & STATIONERY",
  "INTERNET, WI-FI & TELECOM",
  "LEGAL, AUDIT & PROFESSIONAL FEES",
  "MARKETING & ADVERTISING",
  "TRAVEL & CONVEYANCE",
  "SECURITY & SURVEILLANCE",
  "GENERAL OPERATING EXPENSE",
];

export const SUGGESTED_CATEGORY_HEADERS = [
  "ELECTRICITY & UTILITIES",
  "MAINTENANCE & REPAIRS",
  "OFFICE SUPPLIES & STATIONERY",
  "TEA, COFFEE & PANTRY",
  "VOUCHERS",
  "MARKETING & ADVERTISING",
  "INTERNET & TELECOM",
  "CLEANING & HOUSEKEEPING",
  "RO WATER SUPPLY",
  "RENT & CAM",
  "COMPUTER & IT SERVICES",
  "LEGAL & AUDIT",
  "SECURITY & SURVEILLANCE",
  "TRAVEL & CONVEYANCE",
  "GENERAL OPERATING EXPENSE",
];

export const PAYMENT_MODES = [
  "Bank Transfer",
  "UPI",
  "Cash",
  "Cheque",
  "NEFT",
  "RTGS",
  "Debit Card",
  "Credit Card",
];

export const COMMON_UNITS = [
  "Nos",
  "Month",
  "Lump",
  "Pcs",
  "Days",
  "Hours",
  "Kg",
  "Ltr",
  "Mtr",
  "Sqft",
  "Sets",
];

// Validation helpers for inline quick-vendor
const validateInlineMobile = (mobile: string): string | null => {
  if (!mobile || !mobile.trim()) return "Mobile number is mandatory";
  const clean = mobile.replace(/[\s\-\(\)]/g, "");
  const mobileRegex = /^(\+91|0)?[6-9]\d{9}$/;
  if (!mobileRegex.test(clean)) {
    return "Enter a valid 10-digit mobile number";
  }
  return null;
};

const validateInlineEmail = (email: string): string | null => {
  if (!email || !email.trim()) return "Email address is mandatory";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(email.trim())) {
    return "Enter a valid email address";
  }
  return null;
};

export function ExpenseRegister({
  initialLocationId = null,
  isAccountant = false,
  isAdmin = false,
  currentUserName = "User",
  onSwitchToSpreadsheet,
}: ExpenseRegisterProps) {
  // Data state
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [records, setRecords] = useState<ExpenseRecordItem[]>([]);
  const [locations, setLocations] = useState<{ id: number; name: string }[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [availableMonths, setAvailableMonths] = useState<
    { value: string; label: string; count: number; total: number }[]
  >([]);
  const [summary, setSummary] = useState({
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    totalRecords: 0,
  });

  // Filter state
  const [selectedLocation, setSelectedLocation] = useState<string>(
    initialLocationId ? String(initialLocationId) : "ALL"
  );
  // Comprehensive Date Filters: Month-wise, Year-wise, Date-wise, Custom Date Range
  const [filterType, setFilterType] = useState<"ALL" | "MONTH" | "YEAR" | "DATE" | "CUSTOM">("ALL");
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [selectedYear, setSelectedYear] = useState<string>("ALL");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [availableYears, setAvailableYears] = useState<
    { value: string; label: string; count: number; total: number }[]
  >([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedApprovalStatus, setSelectedApprovalStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Role View State: CM View vs Accountant Billing View
  const isCMOnly = !isAccountant && !isAdmin;
  const [activeViewMode, setActiveViewMode] = useState<"CM" | "ACCOUNTANT">(
    isCMOnly ? "CM" : "ACCOUNTANT"
  );

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ExpenseRecordItem | null>(null);
  const [settlingRecord, setSettlingRecord] = useState<ExpenseRecordItem | null>(null);
  const [approvingRecord, setApprovingRecord] = useState<ExpenseRecordItem | null>(null);
  const [isApprovalsModalOpen, setIsApprovalsModalOpen] = useState(false);
  const [isViewPaymentModalOpen, setIsViewPaymentModalOpen] = useState(false);
  const [viewingPaymentRecord, setViewingPaymentRecord] = useState<ExpenseRecordItem | null>(null);
  const [isNewVendorModalOpen, setIsNewVendorModalOpen] = useState(false);
  const [isBankStatementOpen, setIsBankStatementOpen] = useState(false);

  // Super Admin Main Expense Category Headers
  const [categoryHeaders, setCategoryHeaders] = useState<string[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryOldName, setEditingCategoryOldName] = useState<string | null>(null);
  const [editingCategoryNewName, setEditingCategoryNewName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [deletingCategoryName, setDeletingCategoryName] = useState<string | null>(null);

  const [savingForm, setSavingForm] = useState(false);
  const [approving, setApproving] = useState(false);
  const [sendingAlertId, setSendingAlertId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);

  // Portal mount state
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when any popup modal is open for clear, focused view
  useEffect(() => {
    const isAnyModalOpen = Boolean(
      isAddModalOpen ||
      approvingRecord ||
      isNewVendorModalOpen ||
      settlingRecord ||
      isApprovalsModalOpen ||
      isViewPaymentModalOpen ||
      isBankStatementOpen ||
      isCategoryModalOpen
    );
    if (isAnyModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [
    isAddModalOpen,
    approvingRecord,
    isNewVendorModalOpen,
    settlingRecord,
    isApprovalsModalOpen,
    isViewPaymentModalOpen,
    isBankStatementOpen,
    isCategoryModalOpen,
  ]);

  // Global pending approvals across ALL centres (irrespective of center/month filter)
  const [allPendingApprovals, setAllPendingApprovals] = useState<ExpenseRecordItem[]>([]);

  // Inline Add Row state
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [savingInlineRow, setSavingInlineRow] = useState(false);
  const [uploadingInlineDoc, setUploadingInlineDoc] = useState(false);
  const [newRowData, setNewRowData] = useState({
    locationId: initialLocationId ? String(initialLocationId) : "",
    expenseDate: new Date().toISOString().split("T")[0],
    receiptNo: "",
    vendorId: "" as string | number,
    vendorName: "",
    accountNo: "",
    ifscCode: "",
    bankName: "",
    category: FIXED_EXPENSE_TYPES[0],
    description: "",
    quantity: "1",
    unit: "Nos",
    rate: "",
    amount: "",
    paymentMode: "",
    remarks: "",
    attachmentUrl: "",
    invoiceUrl: "",
    uploadedInBankPortal: false,
  });
  const inlineReceiptFileRef = useRef<HTMLInputElement | null>(null);
  const inlineInvoiceFileRef = useRef<HTMLInputElement | null>(null);

  // Add / Edit form state (Fixed format values)
  const [formData, setFormData] = useState({
    locationId: initialLocationId || "",
    expenseDate: new Date().toISOString().split("T")[0],
    category: FIXED_EXPENSE_TYPES[0],
    customCategory: "",
    description: "",
    quantity: "1",
    rate: "",
    amount: "",
    paymentMode: "", // Optional (not mandated)
    receiptNo: "",
    attachmentUrl: "",
    invoiceUrl: "",
    paymentProofUrl: "",
    remarks: "",
    vendorId: "" as string | number,
    vendorName: "",
    accountNo: "",
    approvalStatus: "PENDING",
    // Accountant fields
    payReceiveDate: "",
    receiveAmount: "",
    accPaymentMode: "Bank Transfer",
    utrNumber: "",
    utrDate: "",
    tdsDeducted: "No",
    tdsAmount: "",
    paymentStatus: "PENDING" as "PAID" | "PENDING",
  });

  // Accountant Vendor & Billing Breakdown form state (Submitted before approval, and updated after approval)
  const [settleData, setSettleData] = useState({
    receiptNo: "",
    vendorId: "" as string | number,
    vendorName: "",
    accountNo: "",
    ifscCode: "",
    bankName: "",
    description: "",
    quantity: "1",
    unit: "Nos",
    rate: "",
    amount: "",
    invoiceUrl: "",
    vendorInvoiceUrl: "",
    payReceiveDate: "",
    uploadedInBankPortal: false,
    remarks: "",
    utrNumber: "",
    utrDate: "",
    accPaymentMode: "Bank Transfer",
    utrFileUrl: "",
    sendAlertEmail: true,
  });

  // Super Admin Approval form state
  const [approvalData, setApprovalData] = useState({
    paymentDate: new Date().toISOString().split("T")[0],
    utrNumber: "",
    paymentMode: "Bank Transfer",
    paymentProofUrl: "",
    approvalRemarks: "",
    sendAlertEmail: true,
    alertEmailRecipient: "t6565154@gmail.com",
  });

  // Inline Quick New Vendor form state
  const [newVendorForm, setNewVendorForm] = useState({
    vendorName: "",
    mobileNo: "",
    email: "",
    accountNo: "",
    ifscCode: "",
    address: "",
    locationName: "",
    gstin: "",
    pan: "",
  });
  const [newVendorErrors, setNewVendorErrors] = useState<{
    mobileNo?: string | null;
    email?: string | null;
  }>({});
  const [savingNewVendor, setSavingNewVendor] = useState(false);

  // Hidden file inputs
  const receiptFileInputRef = useRef<HTMLInputElement | null>(null);
  const invoiceFileInputRef = useRef<HTMLInputElement | null>(null);
  const proofFileInputRef = useRef<HTMLInputElement | null>(null);
  const settleProofFileInputRef = useRef<HTMLInputElement | null>(null);
  const settleInvoiceFileInputRef = useRef<HTMLInputElement | null>(null);

  // Consolidated Categories (Super Admin headers + any existing record categories to prevent data loss)
  const allAvailableCategories = useMemo(() => {
    const set = new Set<string>();
    // 1. Super Admin defined Category Headers
    if (categoryHeaders.length > 0) {
      categoryHeaders.forEach((c) => c && set.add(c.trim().toUpperCase()));
    } else {
      FIXED_EXPENSE_TYPES.forEach((c) => set.add(c));
    }
    // 2. Also preserve historic categories from existing records so no historic data is lost
    categories.forEach((c) => c && set.add(c.trim().toUpperCase()));
    customCategories.forEach((c) => c && set.add(c.trim().toUpperCase()));
    records.forEach((r) => r.category && set.add(r.category.trim().toUpperCase()));
    return Array.from(set);
  }, [categoryHeaders, categories, customCategories, records]);

  // Fetch all pending approvals across ALL locations and months (irrespective of selected filter)
  const fetchAllPendingApprovals = async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch("/api/admin/expense-records?locationId=ALL&month=ALL");
      if (res.ok) {
        const data = await res.json();
        const all: ExpenseRecordItem[] = data.records || [];
        const pending = all.filter(
          (r) =>
            r.approvalStatus === "PENDING_APPROVAL" ||
            (r.approvalStatus === "PENDING" && Boolean(r.vendorName))
        );
        setAllPendingApprovals(pending);
      }
    } catch (err) {
      console.error("Error fetching all pending approvals:", err);
    }
  };

  // Keep pendingApprovals synced with allPendingApprovals for backward compatibility
  const pendingApprovals = allPendingApprovals;

  // Helper to render attribution badge for who created/entered the expense
  const renderEnteredByBadge = (rec: ExpenseRecordItem) => {
    const isAcc =
      rec.createdByRole === "ACCOUNTANT" ||
      rec.createdByName?.toLowerCase()?.includes("account");
    const isCM = rec.createdByRole === "COMMUNITY_MANAGER";

    if (isAcc) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          Entered by Accountant ({rec.createdByName || "Accountant"})
        </span>
      );
    }
    if (isCM) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          Entered by CM ({rec.createdByName || "CM"})
        </span>
      );
    }
    if (rec.createdByName) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-gray-50 text-gray-600 border border-gray-200">
          Entered by: {rec.createdByName}
        </span>
      );
    }
    return null;
  };

  // Permission check:
  // - Super Admin can edit & delete everyone's entries
  // - Accountant can ONLY edit & delete their own entries
  // - Community Manager can ONLY edit & delete CM entries
  const canEditOrDeleteEntry = (rec: ExpenseRecordItem) => {
    if (isAdmin) return true; // Super Admin can edit/delete everyone's entries

    const isRecordByAccountant =
      rec.createdByRole === "ACCOUNTANT" ||
      rec.createdByName?.toLowerCase()?.includes("account");
    const isRecordByAdmin = rec.createdByRole === "ADMIN";

    if (isAccountant) {
      // Accountant can ONLY edit their own entries
      return isRecordByAccountant;
    }

    // Community Manager can ONLY edit CM entries (not accountant's, not admin's)
    return !isRecordByAccountant && !isRecordByAdmin;
  };

  // Active Date Filter Meta (Total Count & Price for Filter selection)
  const activeMonthMeta = useMemo(() => {
    if (filterType === "ALL") {
      return {
        label: "All Expenses",
        count: records.length,
        total: summary.totalAmount,
      };
    }
    if (filterType === "MONTH") {
      if (selectedMonth === "ALL") {
        return { label: "All Months", count: records.length, total: summary.totalAmount };
      }
      const found = availableMonths.find((m) => m.value === selectedMonth);
      return {
        label: found ? found.label : selectedMonth,
        count: found ? found.count : records.length,
        total: found ? found.total : records.reduce((s, r) => s + (r.amount || 0), 0),
      };
    }
    if (filterType === "YEAR") {
      if (selectedYear === "ALL") {
        return { label: "All Years", count: records.length, total: summary.totalAmount };
      }
      const found = availableYears.find((y) => y.value === selectedYear);
      return {
        label: found ? found.label : `Year ${selectedYear}`,
        count: found ? found.count : records.length,
        total: found ? found.total : records.reduce((s, r) => s + (r.amount || 0), 0),
      };
    }
    if (filterType === "DATE") {
      const formatted = selectedDate ? selectedDate.split("-").reverse().join("/") : "Selected Date";
      return {
        label: `Date: ${formatted}`,
        count: records.length,
        total: records.reduce((s, r) => s + (r.amount || 0), 0),
      };
    }
    if (filterType === "CUSTOM") {
      const f = fromDate ? fromDate.split("-").reverse().join("/") : "Start";
      const t = toDate ? toDate.split("-").reverse().join("/") : "End";
      return {
        label: `Range: ${f} to ${t}`,
        count: records.length,
        total: records.reduce((s, r) => s + (r.amount || 0), 0),
      };
    }
    return {
      label: "All Records",
      count: records.length,
      total: summary.totalAmount,
    };
  }, [filterType, selectedMonth, selectedYear, selectedDate, fromDate, toDate, availableMonths, availableYears, records, summary]);

  // Fetch vendors from VendorMaster
  const fetchVendors = async () => {
    try {
      const res = await fetch("/api/admin/vendor-master");
      const data = await res.json();
      if (data.success && Array.isArray(data.vendors)) {
        setVendors(data.vendors);
      }
    } catch (err) {
      console.error("Error fetching vendors:", err);
    }
  };

  // Fetch records
  const fetchRecords = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const params = new URLSearchParams();
      if (selectedLocation !== "ALL") params.set("locationId", selectedLocation);
      if (filterType === "MONTH" && selectedMonth !== "ALL") params.set("month", selectedMonth);
      if (filterType === "YEAR" && selectedYear !== "ALL") params.set("year", selectedYear);
      if (filterType === "DATE" && selectedDate.trim()) params.set("date", selectedDate.trim());
      if (filterType === "CUSTOM") {
        if (fromDate.trim()) params.set("fromDate", fromDate.trim());
        if (toDate.trim()) params.set("toDate", toDate.trim());
      }
      if (selectedCategory !== "ALL") params.set("category", selectedCategory);
      if (selectedStatus !== "ALL") params.set("paymentStatus", selectedStatus);
      if (selectedApprovalStatus !== "ALL") params.set("approvalStatus", selectedApprovalStatus);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/admin/expense-records?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load expense records");
      const data = await res.json();

      setRecords(data.records || []);
      setLocations(data.locations || []);
      setCategories(data.categories || []);
      setAvailableMonths(data.availableMonths || []);
      setAvailableYears(data.availableYears || []);
      setSummary(
        data.summary || {
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          totalRecords: 0,
        }
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load expenses");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
    fetchCategoryHeaders();
    if (isAdmin) {
      fetchAllPendingApprovals();
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchRecords(true);
    if (isAdmin) {
      fetchAllPendingApprovals();
    }
  }, [
    selectedLocation,
    filterType,
    selectedMonth,
    selectedYear,
    selectedDate,
    fromDate,
    toDate,
    selectedCategory,
    selectedStatus,
    selectedApprovalStatus,
    isAdmin,
  ]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecords(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync from legacy sheets (Month-wise population from existing spreadsheet)
  const handleSyncFromSheets = async () => {
    try {
      setSyncing(true);
      const res = await fetch("/api/admin/expense-records/sync-sheets", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to sync");
      toast.success(data.message || "Spreadsheets synchronized successfully!");
      fetchRecords(false);
    } catch (err: any) {
      toast.error(err.message || "Error syncing spreadsheets");
    } finally {
      setSyncing(false);
    }
  };

  // Handle QTY & Rate calculation
  const handleQuantityChange = (val: string) => {
    const qty = parseFloat(val) || 0;
    const rate = parseFloat(formData.rate) || 0;
    const calcAmount = qty && rate ? Math.round(qty * rate * 100) / 100 : formData.amount;
    setFormData((prev) => ({
      ...prev,
      quantity: val,
      amount: calcAmount ? String(calcAmount) : prev.amount,
    }));
  };

  const handleRateChange = (val: string) => {
    const rate = parseFloat(val) || 0;
    const qty = parseFloat(formData.quantity) || 1;
    const calcAmount = rate ? Math.round(qty * rate * 100) / 100 : formData.amount;
    setFormData((prev) => ({
      ...prev,
      rate: val,
      amount: calcAmount ? String(calcAmount) : prev.amount,
    }));
  };

  // Vendor Select: Auto-populate vendor name & bank A/C No.
  const handleVendorSelect = (vendorIdStr: string) => {
    if (!vendorIdStr) {
      setFormData((prev) => ({
        ...prev,
        vendorId: "",
        vendorName: "",
        accountNo: "",
      }));
      return;
    }
    const selected = vendors.find((v) => String(v.id) === vendorIdStr);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        vendorId: selected.id,
        vendorName: selected.vendorName,
        accountNo: selected.accountNo || prev.accountNo || "",
      }));
    }
  };

  // File Upload Helper (Receipt, Invoice PDF, Payment Proof, or Settle Invoice)
  const handleFileUpload = async (
    file: File,
    type: "receipt" | "invoice" | "proof" | "settleInvoice"
  ) => {
    try {
      if (type === "receipt") setUploadingReceipt(true);
      else if (type === "invoice" || type === "settleInvoice") setUploadingInvoice(true);
      else setUploadingProof(true);

      const uploadData = new FormData();
      uploadData.append("file", file);

      const res = await fetch("/api/admin/upload-pdf", {
        method: "POST",
        body: uploadData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "File upload failed");

      const fileUrl = data.fileUrl || data.url || data.data?.fileUrl || (data.id ? `/api/admin/stored-documents/${data.id}` : "");
      if (!fileUrl) {
        throw new Error("Failed to obtain document URL from upload response");
      }
      if (type === "receipt") {
        setFormData((prev) => ({
          ...prev,
          attachmentUrl: fileUrl,
        }));
        toast.success("Receipt attached successfully!");
      } else if (type === "invoice") {
        setFormData((prev) => ({
          ...prev,
          invoiceUrl: fileUrl,
        }));
        toast.success("Invoice PDF attached successfully!");
      } else if (type === "settleInvoice") {
        setSettleData((prev) => ({
          ...prev,
          vendorInvoiceUrl: fileUrl,
        }));
        toast.success("Official Vendor Tax Invoice attached successfully!");
      } else {
        setApprovalData((prev) => ({
          ...prev,
          paymentProofUrl: fileUrl,
        }));
        setSettleData((prev) => ({
          ...prev,
          paymentProofUrl: fileUrl,
        }));
        toast.success("Payment proof uploaded successfully!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload document");
    } finally {
      if (type === "receipt") setUploadingReceipt(false);
      else if (type === "invoice" || type === "settleInvoice") setUploadingInvoice(false);
      else setUploadingProof(false);
    }
  };

  // Fetch Super Admin Category Headers
  const fetchCategoryHeaders = async () => {
    try {
      const res = await fetch("/api/admin/expense-categories");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.categories)) {
          setCategoryHeaders(data.categories);
        }
      }
    } catch (err) {
      console.error("Failed to fetch category headers:", err);
    }
  };

  // Add new Category Header (Super Admin Only)
  const handleAddCategoryHeader = async (nameToAdd?: string) => {
    const target = (nameToAdd || newCategoryName).trim().toUpperCase();
    if (!target) {
      toast.error("Please enter a category name");
      return;
    }
    if (categoryHeaders.includes(target)) {
      toast.error(`Category "${target}" already exists`);
      return;
    }

    setSavingCategory(true);
    try {
      const res = await fetch("/api/admin/expense-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: target }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add category");

      setCategoryHeaders(data.categories || [...categoryHeaders, target]);
      setNewCategoryName("");
      toast.success(`Category header "${target}" added successfully!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to add category header");
    } finally {
      setSavingCategory(false);
    }
  };

  // Rename Category Header (Super Admin Only)
  const handleUpdateCategoryHeader = async (oldName: string, newName: string) => {
    const trimmed = newName.trim().toUpperCase();
    if (!trimmed) {
      toast.error("New category name cannot be empty");
      return;
    }
    if (trimmed === oldName) {
      setEditingCategoryOldName(null);
      return;
    }

    setSavingCategory(true);
    try {
      const res = await fetch("/api/admin/expense-categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldName, newName: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update category");

      setCategoryHeaders(data.categories);
      setEditingCategoryOldName(null);
      setEditingCategoryNewName("");
      toast.success(`Category renamed from "${oldName}" to "${trimmed}"`);
      fetchRecords(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update category header");
    } finally {
      setSavingCategory(false);
    }
  };

  // Delete Category Header (Super Admin Only)
  const handleDeleteCategoryHeader = async (nameToDelete: string) => {
    if (!confirm(`Are you sure you want to delete category header "${nameToDelete}"? Existing expenses will retain their category.`)) {
      return;
    }

    setDeletingCategoryName(nameToDelete);
    try {
      const res = await fetch(`/api/admin/expense-categories?name=${encodeURIComponent(nameToDelete)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete category");

      setCategoryHeaders(data.categories);
      toast.success(`Category header "${nameToDelete}" deleted`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category header");
    } finally {
      setDeletingCategoryName(null);
    }
  };

  // Handle inline file upload for Add Row
  const handleInlineUpload = async (file: File, type: "receipt" | "invoice") => {
    try {
      setUploadingInlineDoc(true);
      const uploadData = new FormData();
      uploadData.append("file", file);

      const res = await fetch("/api/admin/upload-pdf", {
        method: "POST",
        body: uploadData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "File upload failed");

      const fileUrl =
        data.fileUrl ||
        data.url ||
        data.data?.fileUrl ||
        (data.id ? `/api/admin/stored-documents/${data.id}` : "");

      if (!fileUrl) {
        throw new Error("Failed to obtain document URL");
      }

      if (type === "receipt") {
        setNewRowData((prev) => ({ ...prev, attachmentUrl: fileUrl }));
        toast.success("Receipt slip attached!");
      } else {
        setNewRowData((prev) => ({ ...prev, invoiceUrl: fileUrl }));
        toast.success("Invoice PDF attached!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload file");
    } finally {
      setUploadingInlineDoc(false);
    }
  };

  // Handle Save Inline Row
  const handleSaveInlineRow = async () => {
    let locId = newRowData.locationId;
    if (!locId || locId === "ALL") {
      if (selectedLocation !== "ALL") {
        locId = selectedLocation;
      } else if (locations.length > 0) {
        locId = String(locations[0].id);
      }
    }

    if (!locId) {
      toast.error("Please select a Center for the expense");
      return;
    }
    if (!newRowData.description.trim()) {
      toast.error("Please enter an expense description");
      return;
    }
    const amtNum = parseFloat(newRowData.amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      toast.error("Please enter a valid amount greater than ₹0");
      return;
    }

    try {
      setSavingInlineRow(true);
      const payload: any = {
        locationId: Number(locId),
        expenseDate: newRowData.expenseDate || new Date().toISOString().split("T")[0],
        category: newRowData.category || "GENERAL EXPENSE",
        description: newRowData.description.trim(),
        amount: amtNum,
        paymentMode: newRowData.paymentMode ? newRowData.paymentMode.trim() : null,
        receiptNo: newRowData.receiptNo ? newRowData.receiptNo.trim() : null,
        attachmentUrl: newRowData.attachmentUrl || null,
        invoiceUrl: newRowData.invoiceUrl || null,
        remarks: newRowData.remarks ? newRowData.remarks.trim() : null,
      };

      if (newRowData.vendorId) {
        payload.vendorId = Number(newRowData.vendorId);
        payload.vendorName = newRowData.vendorName ? newRowData.vendorName.trim() : null;
        payload.accountNo = newRowData.accountNo ? newRowData.accountNo.trim() : null;
      }

      if (activeViewMode === "ACCOUNTANT") {
        payload.vendorId = newRowData.vendorId ? Number(newRowData.vendorId) : null;
        payload.vendorName = newRowData.vendorName ? newRowData.vendorName.trim() : null;
        payload.accountNo = newRowData.accountNo ? newRowData.accountNo.trim() : null;
        payload.quantity = newRowData.quantity ? parseFloat(newRowData.quantity) : 1;
        payload.unit = newRowData.unit || "Nos";
        payload.rate = newRowData.rate ? parseFloat(newRowData.rate) : null;
        payload.uploadedInBankPortal = Boolean(newRowData.uploadedInBankPortal);
        if (newRowData.vendorName) {
          payload.approvalStatus = "PENDING_APPROVAL";
        }
      }

      const res = await fetch("/api/admin/expense-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save expense row");

      toast.success("Expense row added successfully!");
      setIsAddingRow(false);
      fetchRecords(false);
      fetchAllPendingApprovals();
    } catch (err: any) {
      toast.error(err.message || "Failed to save expense row");
    } finally {
      setSavingInlineRow(false);
    }
  };

  // Open Add Modal
  const openAddModal = () => {
    setEditingRecord(null);
    const defaultLocId =
      selectedLocation !== "ALL"
        ? Number(selectedLocation)
        : locations.length > 0
        ? locations[0].id
        : "";

    const defaultCategory =
      categoryHeaders.length > 0 ? categoryHeaders[0] : FIXED_EXPENSE_TYPES[0];

    setFormData({
      locationId: defaultLocId,
      expenseDate: new Date().toISOString().split("T")[0],
      category: defaultCategory,
      customCategory: "",
      description: "",
      quantity: "1",
      rate: "",
      amount: "",
      paymentMode: "", // Optional, not mandated
      receiptNo: "",
      attachmentUrl: "",
      invoiceUrl: "",
      paymentProofUrl: "",
      remarks: "",
      vendorId: "",
      vendorName: "",
      accountNo: "",
      approvalStatus: "PENDING",
      payReceiveDate: "",
      receiveAmount: "",
      accPaymentMode: "Bank Transfer",
      utrNumber: "",
      utrDate: "",
      tdsDeducted: "No",
      tdsAmount: "",
      paymentStatus: "PENDING",
    });
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (rec: ExpenseRecordItem) => {
    if (!canEditOrDeleteEntry(rec)) {
      toast.error(
        isAccountant
          ? "Accountants can only edit their own expense entries."
          : "Community Managers can only edit their own expense entries."
      );
      return;
    }

    setEditingRecord(rec);
    const dateFormatted = rec.expenseDate
      ? new Date(rec.expenseDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    const fallbackCat =
      categoryHeaders.length > 0 ? categoryHeaders[0] : FIXED_EXPENSE_TYPES[0];

    setFormData({
      locationId: rec.locationId || "",
      expenseDate: dateFormatted,
      category: rec.category || fallbackCat,
      customCategory: "",
      description: rec.description || "",
      quantity: rec.quantity ? String(rec.quantity) : "1",
      rate: rec.rate ? String(rec.rate) : "",
      amount: String(rec.amount || ""),
      paymentMode: rec.paymentMode || "", // Not mandated
      receiptNo: rec.receiptNo || "",
      attachmentUrl: rec.attachmentUrl || "",
      invoiceUrl: rec.invoiceUrl || "",
      paymentProofUrl: rec.paymentProofUrl || "",
      remarks: rec.remarks || "",
      vendorId: rec.vendorId || "",
      vendorName: rec.vendorName || "",
      accountNo: rec.accountNo || "",
      approvalStatus: rec.approvalStatus || "PENDING",
      payReceiveDate: rec.payReceiveDate || "",
      receiveAmount: rec.receiveAmount ? String(rec.receiveAmount) : "",
      accPaymentMode: rec.accPaymentMode || "Bank Transfer",
      utrNumber: rec.utrNumber || "",
      utrDate: rec.utrDate || "",
      tdsDeducted: rec.tdsDeducted || "No",
      tdsAmount: rec.tdsAmount ? String(rec.tdsAmount) : "",
      paymentStatus: rec.paymentStatus || "PENDING",
    });
    setIsAddModalOpen(true);
  };

  // Open Super Admin / Accountant Disbursal & UTR Modal
  const openApproveModal = (rec: ExpenseRecordItem) => {
    setApprovingRecord(rec);
    const today = new Date().toISOString().split("T")[0];
    const matchedVendor = vendors.find((v) => String(v.id) === String(rec.vendorId));
    const recipient = rec.alertEmailSentTo || matchedVendor?.email || "t6565154@gmail.com";
    setApprovalData({
      paymentDate: rec.utrDate || rec.payReceiveDate || today,
      utrNumber: rec.utrNumber || "",
      paymentMode: rec.accPaymentMode || rec.paymentMode || "Bank Transfer",
      paymentProofUrl: rec.paymentProofUrl || rec.utrFileUrl || "",
      approvalRemarks: rec.approvalRemarks || "",
      sendAlertEmail: true,
      alertEmailRecipient: recipient,
    });
  };

  // Accountant / Admin: Directly dispatch / resend payment advice alert email to vendor
  const handleSendAlertEmail = async (rec: ExpenseRecordItem) => {
    if (!rec.utrNumber) {
      toast.error("Please enter UTR number before sending payment alert to vendor.");
      openApproveModal(rec);
      return;
    }
    const matchedVendor = vendors.find((v) => String(v.id) === String(rec.vendorId));
    const recipient = rec.alertEmailSentTo || matchedVendor?.email || "t6565154@gmail.com";
    try {
      setSendingAlertId(rec.id);
      const res = await fetch(`/api/admin/expense-records/${rec.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          utrNumber: rec.utrNumber,
          paymentDate: rec.utrDate || rec.payReceiveDate || new Date().toISOString().split("T")[0],
          paymentMode: rec.accPaymentMode || rec.paymentMode || "Bank Transfer",
          sendAlertEmail: true,
          alertEmailRecipient: recipient,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send alert email");
      }
      toast.success(`Payment alert email successfully dispatched to ${recipient}!`);
      fetchRecords(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to dispatch email alert");
    } finally {
      setSendingAlertId(null);
    }
  };

  // Open Settle Modal (Accountant Enter/Edit Vendor & Billing Breakdown Against Expense)
  const openSettleModal = (rec: ExpenseRecordItem) => {
    setSettlingRecord(rec);
    const initialVendorId = rec.vendorId ? String(rec.vendorId) : "";
    const matchedVendor = vendors.find((v) => String(v.id) === initialVendorId);

    setSettleData({
      receiptNo: rec.receiptNo || "",
      vendorId: initialVendorId,
      vendorName: rec.vendorName || (matchedVendor?.vendorName || ""),
      accountNo: rec.accountNo || (matchedVendor?.accountNo || ""),
      ifscCode: matchedVendor?.ifscCode || "",
      bankName: matchedVendor?.bankName || "",
      description: rec.description || "",
      quantity: rec.quantity ? String(rec.quantity) : "1",
      unit: rec.unit || "Nos",
      rate: rec.rate ? String(rec.rate) : "",
      amount: rec.amount ? String(rec.amount) : "",
      invoiceUrl: rec.invoiceUrl || "",
      vendorInvoiceUrl:
        rec.vendorInvoiceUrl ||
        (rec.createdByRole === "ACCOUNTANT" ? rec.invoiceUrl || "" : "") ||
        "",
      payReceiveDate: rec.payReceiveDate || "",
      uploadedInBankPortal: Boolean(rec.uploadedInBankPortal),
      remarks: rec.remarks || "",
      utrNumber: rec.utrNumber || "",
      utrDate: rec.utrDate || rec.payReceiveDate || "",
      accPaymentMode: rec.accPaymentMode || "Bank Transfer",
      utrFileUrl: rec.utrFileUrl || "",
      sendAlertEmail: true,
    });
  };

  // Vendor selection in Accountant Payment Details modal
  const handleSettleVendorSelect = (vendorIdStr: string) => {
    if (!vendorIdStr) {
      setSettleData((prev) => ({
        ...prev,
        vendorId: "",
        vendorName: "",
        accountNo: "",
        ifscCode: "",
        bankName: "",
      }));
      return;
    }
    const selected = vendors.find((v) => String(v.id) === vendorIdStr);
    if (selected) {
      setSettleData((prev) => ({
        ...prev,
        vendorId: selected.id,
        vendorName: selected.vendorName,
        accountNo: selected.accountNo || prev.accountNo || "",
        ifscCode: selected.ifscCode || "",
      }));
    }
  };

  // Quantity / Rate change in Accountant Payment Details modal
  const handleSettleQtyChange = (qty: string) => {
    setSettleData((prev) => {
      const q = parseFloat(qty) || 0;
      const r = parseFloat(prev.rate) || 0;
      return {
        ...prev,
        quantity: qty,
        amount: q > 0 && r > 0 ? String(Math.round(q * r * 100) / 100) : prev.amount,
      };
    });
  };

  const handleSettleRateChange = (rate: string) => {
    setSettleData((prev) => {
      const q = parseFloat(prev.quantity) || 1;
      const r = parseFloat(rate) || 0;
      return {
        ...prev,
        rate: rate,
        amount: q > 0 && r > 0 ? String(Math.round(q * r * 100) / 100) : prev.amount,
      };
    });
  };

  // Save Add/Edit Expense
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.locationId) {
      toast.error("Please select a Coworking Center");
      return;
    }
    if (!formData.description.trim()) {
      toast.error("Please enter expense description");
      return;
    }
    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      toast.error("Please enter a valid expense amount");
      return;
    }

    const finalCategory = formData.category.trim().toUpperCase() || "GENERAL EXPENSE";

    const payload = {
      locationId: Number(formData.locationId),
      expenseDate: formData.expenseDate,
      category: finalCategory,
      description: formData.description.trim(),
      amount: Number(formData.amount),
      quantity: parseFloat(formData.quantity) || 1,
      rate: formData.rate ? parseFloat(formData.rate) : null,
      paymentMode: formData.paymentMode && formData.paymentMode.trim() ? formData.paymentMode.trim() : null,
      receiptNo: formData.receiptNo ? formData.receiptNo.trim() : null,
      attachmentUrl: formData.attachmentUrl ? formData.attachmentUrl.trim() : null,
      invoiceUrl: formData.invoiceUrl ? formData.invoiceUrl.trim() : null,
      paymentProofUrl: formData.paymentProofUrl || null,
      remarks: formData.remarks ? formData.remarks.trim() : null,
      vendorId: formData.vendorId ? Number(formData.vendorId) : null,
      vendorName: formData.vendorName ? formData.vendorName.trim() : null,
      accountNo: formData.accountNo ? formData.accountNo.trim() : null,
      approvalStatus: formData.approvalStatus || "PENDING",
      // Accountant fields
      payReceiveDate: formData.payReceiveDate || null,
      receiveAmount: formData.receiveAmount ? Number(formData.receiveAmount) : null,
      accPaymentMode: formData.accPaymentMode || null,
      utrNumber: formData.utrNumber ? formData.utrNumber.trim() : null,
      utrDate: formData.utrDate || (formData.payReceiveDate ? formData.payReceiveDate : null),
      tdsDeducted: formData.tdsDeducted,
      tdsAmount: formData.tdsAmount ? Number(formData.tdsAmount) : null,
      paymentStatus:
        formData.utrNumber || formData.payReceiveDate ? "PAID" : formData.paymentStatus,
    };

    try {
      setSavingForm(true);
      const isEdit = Boolean(editingRecord);
      const url = isEdit
        ? `/api/admin/expense-records/${editingRecord!.id}`
        : "/api/admin/expense-records";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save expense");

      toast.success(
        isEdit
          ? "Expense record updated successfully!"
          : "Expense entry created! Submitted for Super Admin approval & settlement."
      );
      setIsAddModalOpen(false);
      fetchRecords(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save expense");
    } finally {
      setSavingForm(false);
    }
  };

  // Submit Super Admin Approval & Disburse Payment
  const handleApproveAndPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingRecord) return;
    if (!approvalData.utrNumber.trim()) {
      toast.error("UTR / Transaction Reference Number is required for approval.");
      return;
    }

    try {
      setApproving(true);
      const res = await fetch(`/api/admin/expense-records/${approvingRecord.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(approvalData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to approve expense payment");
      }

      toast.success(
        data.message ||
          "Expense approved, payment recorded, and alert email dispatched to t6565154@gmail.com!"
      );
      setApprovingRecord(null);
      fetchRecords(false);
    } catch (err: any) {
      toast.error(err.message || "Error approving expense");
    } finally {
      setApproving(false);
    }
  };

  // Submit Vendor & Billing Breakdown Against Expense (Accountant -> Awaiting Approval OR Updating Approved Record)
  const handleSaveQuickSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingRecord) return;

    const isAlreadyApproved =
      settlingRecord.approvalStatus === "APPROVED" ||
      settlingRecord.paymentStatus === "PAID";

    try {
      setSavingForm(true);
      const isCMRecord = settlingRecord.createdByRole === "COMMUNITY_MANAGER";
      const payload: any = {
        receiptNo: settleData.receiptNo ? settleData.receiptNo.trim() : null,
        vendorId: settleData.vendorId ? Number(settleData.vendorId) : null,
        vendorName: settleData.vendorName ? settleData.vendorName.trim() : null,
        accountNo: settleData.accountNo ? settleData.accountNo.trim() : null,
        quantity: settleData.quantity ? parseFloat(settleData.quantity) : 1,
        unit: settleData.unit || "Nos",
        rate: settleData.rate ? parseFloat(settleData.rate) : null,
        vendorInvoiceUrl: settleData.vendorInvoiceUrl ? settleData.vendorInvoiceUrl.trim() : null,
        payReceiveDate: settleData.payReceiveDate ? settleData.payReceiveDate.trim() : null,
        uploadedInBankPortal: Boolean(settleData.uploadedInBankPortal),
        remarks: settleData.remarks ? settleData.remarks.trim() : null,
        approvalStatus: isAlreadyApproved ? "APPROVED" : "PENDING_APPROVAL",
        ...(isAlreadyApproved && settleData.utrNumber
          ? {
              utrNumber: settleData.utrNumber.trim(),
              utrDate: settleData.utrDate || settleData.payReceiveDate || new Date().toISOString().split("T")[0],
              payReceiveDate: settleData.payReceiveDate || settleData.utrDate || new Date().toISOString().split("T")[0],
              accPaymentMode: settleData.accPaymentMode || "Bank Transfer",
              utrFileUrl: settleData.utrFileUrl || null,
              paymentStatus: "PAID",
            }
          : {}),
      };

      // For non-CM records (e.g. entered by accountant directly), also preserve/update invoiceUrl
      if (!isCMRecord && settleData.invoiceUrl) {
        payload.invoiceUrl = settleData.invoiceUrl.trim();
      }

      // Strict enforcement: Accountants cannot edit base description or amount entered by CMs
      if (!isCMRecord || isAdmin) {
        if (settleData.description) payload.description = settleData.description.trim();
        if (settleData.amount) payload.amount = parseFloat(settleData.amount);
      }

      const res = await fetch(`/api/admin/expense-records/${settlingRecord.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save billing details");

      // If approved and UTR entered with sendAlertEmail checked, dispatch alert to vendor
      if (isAlreadyApproved && settleData.utrNumber && settleData.sendAlertEmail) {
        try {
          await fetch(`/api/admin/expense-records/${settlingRecord.id}/approve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paymentDate: settleData.utrDate || new Date().toISOString().split("T")[0],
              utrNumber: settleData.utrNumber,
              sendAlertEmail: true,
              alertEmailRecipient: "t6565154@gmail.com",
            }),
          });
        } catch (alertErr) {
          console.error("Failed to send alert email:", alertErr);
        }
      }

      toast.success(
        isAlreadyApproved
          ? "Payment details updated successfully!"
          : "Vendor and billing details submitted for Super Admin approval!",
        { duration: 4000 }
      );
      setSettlingRecord(null);
      fetchRecords(false);
      fetchAllPendingApprovals();
    } catch (err: any) {
      toast.error(err.message || "Failed to save billing details");
    } finally {
      setSavingForm(false);
    }
  };

  // One-click Super Admin Approval (Triggers 4-second notification for accountant)
  const handleSuperAdminApprove = async (
    recordId: number,
    optionalUtr?: string,
    optionalDate?: string
  ) => {
    try {
      setApproving(true);
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(`/api/admin/expense-records/${recordId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalStatus: "APPROVED",
          approvedAt: new Date().toISOString(),
          approvedByName: currentUserName,
          ...(optionalUtr ? { utrNumber: optionalUtr, paymentStatus: "PAID" } : {}),
          ...(optionalDate ? { utrDate: optionalDate, payReceiveDate: optionalDate } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approval failed");

      // 4-second notification as explicitly instructed by user:
      // "once SA approve an 4 sec noticiation will go to accountant and in that entry send for approval btn will show approved and tickbox ticked ok"
      toast.success(
        "Expense Approved! UTR No., Payment Date, and Send Alert to Vendor are now unlocked.",
        { duration: 4000 }
      );

      // If optional UTR is provided, also trigger email to vendor
      if (optionalUtr) {
        try {
          await fetch(`/api/admin/expense-records/${recordId}/approve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paymentDate: optionalDate || today,
              utrNumber: optionalUtr,
              sendAlertEmail: true,
              alertEmailRecipient: "t6565154@gmail.com",
            }),
          });
        } catch (e) {
          console.error("Alert email trigger error:", e);
        }
      }

      setApprovingRecord(null);
      await fetchAllPendingApprovals();
      fetchRecords(false);
    } catch (err: any) {
      toast.error(err.message || "Approval failed");
    } finally {
      setApproving(false);
    }
  };

  // Toggle Upload in Bank Portal Checkbox
  const handleToggleBankPortal = async (rec: ExpenseRecordItem) => {
    const nextVal = !rec.uploadedInBankPortal;
    setRecords((prev) =>
      prev.map((r) => (r.id === rec.id ? { ...r, uploadedInBankPortal: nextVal } : r))
    );
    try {
      const res = await fetch(`/api/admin/expense-records/${rec.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadedInBankPortal: nextVal }),
      });
      if (!res.ok) throw new Error("Failed to update bank portal status");
      toast.success(
        nextVal
          ? `Marked #${rec.id} as uploaded in Bank Portal!`
          : `Unmarked #${rec.id} from Bank Portal`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
      fetchRecords(false);
    }
  };

  // Accountant Click: Send for Approval
  const handleSendForApproval = async (rec: ExpenseRecordItem) => {
    try {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === rec.id ? { ...r, approvalStatus: "PENDING_APPROVAL" } : r
        )
      );
      const res = await fetch(`/api/admin/expense-records/${rec.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus: "PENDING_APPROVAL" }),
      });
      if (!res.ok) throw new Error("Failed to submit for approval");
      toast.success(
        `Expense #${rec.id} sent for Super Admin approval! Super Admin notification dispatched.`,
        { duration: 4000 }
      );
      fetchRecords(false);
      fetchAllPendingApprovals();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit for approval");
      fetchRecords(false);
    }
  };

  // Submit Inline New Vendor (Mandatory Mobile & Email!)
  const handleSaveNewVendorInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorForm.vendorName.trim()) {
      toast.error("Vendor name is required");
      return;
    }

    const mobErr = validateInlineMobile(newVendorForm.mobileNo);
    const emErr = validateInlineEmail(newVendorForm.email);

    if (mobErr || emErr) {
      setNewVendorErrors({ mobileNo: mobErr, email: emErr });
      if (mobErr) toast.error(mobErr);
      else if (emErr) toast.error(emErr);
      return;
    }

    try {
      setSavingNewVendor(true);
      const res = await fetch("/api/admin/vendor-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newVendorForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create vendor record");
      }

      toast.success(`Vendor "${data.vendor.vendorName}" added successfully!`);
      // Update local vendor options
      setVendors((prev) => [data.vendor, ...prev]);
      // Auto select in active expense form
      setFormData((prev) => ({
        ...prev,
        vendorId: data.vendor.id,
        vendorName: data.vendor.vendorName,
        accountNo: data.vendor.accountNo || prev.accountNo || "",
      }));
      // Auto select in active accountant payment form
      setSettleData((prev) => ({
        ...prev,
        vendorId: data.vendor.id,
        vendorName: data.vendor.vendorName,
        accountNo: data.vendor.accountNo || prev.accountNo || "",
        ifscCode: data.vendor.ifscCode || prev.ifscCode || "",
      }));
      // Auto select in active inline row
      setNewRowData((prev) => ({
        ...prev,
        vendorId: data.vendor.id,
        vendorName: data.vendor.vendorName,
        accountNo: data.vendor.accountNo || prev.accountNo || "",
        ifscCode: data.vendor.ifscCode || prev.ifscCode || "",
        bankName: data.vendor.bankName || prev.bankName || "",
      }));

      setIsNewVendorModalOpen(false);
      setNewVendorForm({
        vendorName: "",
        mobileNo: "",
        email: "",
        accountNo: "",
        ifscCode: "",
        address: "",
        locationName: "",
        gstin: "",
        pan: "",
      });
      setNewVendorErrors({});
    } catch (err: any) {
      toast.error(err.message || "Failed to add vendor");
    } finally {
      setSavingNewVendor(false);
    }
  };

  // Delete Record
  const handleDelete = async (id: number) => {
    const target = records.find((r) => r.id === id);
    if (target && !canEditOrDeleteEntry(target)) {
      toast.error(
        isAccountant
          ? "Accountants can only delete their own expense entries."
          : "Community Managers can only delete their own expense entries."
      );
      return;
    }

    if (!confirm("Are you sure you want to delete this expense record?")) return;
    try {
      setDeletingId(id);
      const res = await fetch(`/api/admin/expense-records/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      toast.success("Expense record deleted successfully");
      fetchRecords(false);
      fetchAllPendingApprovals();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete expense record");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* ── TOP ACTION & SUMMARY BAR (CLIENT MASTER STYLE) ── */}
      <div className="bg-white border border-gray-200 p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-display font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#006064]" />
                <span>Centralized Expense & Vendor Payment Register</span>
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Super Admin Dedicated Approvals Button (Badge across ALL centres) */}
            {isAdmin && (
              <button
                onClick={() => setIsApprovalsModalOpen(true)}
                className="relative bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Approvals</span>
                {allPendingApprovals.length > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse ml-1">
                    {allPendingApprovals.length}
                  </span>
                )}
              </button>
            )}

            {/* View Mode Switcher (CM vs Accountant Billing) */}
            {!isCMOnly && (
              <div className="flex items-center bg-gray-100 p-0.5 border border-gray-300">
                <button
                  type="button"
                  onClick={() => setActiveViewMode("CM")}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                    activeViewMode === "CM"
                      ? "bg-[#006064] text-white shadow-2xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>CM View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveViewMode("ACCOUNTANT")}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                    activeViewMode === "ACCOUNTANT"
                      ? "bg-[#006064] text-white shadow-2xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Accountant Billing View</span>
                </button>
              </div>
            )}

            {/* Bank Statement Modal Button (Admin & Accountant Only) */}
            {(isAdmin || isAccountant) && (
              <button
                type="button"
                onClick={() => setIsBankStatementOpen(true)}
                className="bg-[#283593] hover:bg-[#1a237e] text-white px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs cursor-pointer border border-[#1a237e]"
                title="View ICICI Bank Account Statement (A/C: 136705002010)"
              >
                <Landmark className="w-3.5 h-3.5 text-orange-300" />
                <span>Bank Statement</span>
              </button>
            )}

            {/* Super Admin Dedicated Category Headers Button (Only visible to Super Admin) */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
                className="bg-[#37474f] hover:bg-[#263238] text-white px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs cursor-pointer border border-[#263238]"
                title="Manage Main Expense Category Headers (Super Admin Only)"
              >
                <Layers className="w-3.5 h-3.5 text-cyan-300" />
                <span>Category Headers</span>
              </button>
            )}

            {/* Add Expense Button (Modal) */}
            {activeViewMode === "ACCOUNTANT" && isAccountant ? (
              <button
                type="button"
                onClick={openAddModal}
                className="bg-[#006064] hover:bg-[#00838f] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Expense (Accountant)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={openAddModal}
                className="bg-[#006064] hover:bg-[#00838f] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Expense</span>
              </button>
            )}
          </div>
        </div>

        {/* ── KPI METRICS CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-gray-100">
          <div className="bg-[#f8fafc] p-3 border border-gray-200">
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500 font-bold block">
              Total Expenses
            </span>
            <span className="text-lg sm:text-xl font-display font-black text-gray-900 mt-0.5 block">
              {formatCurrency(summary.totalAmount)}
            </span>
            <span className="text-[10px] text-gray-400 font-mono">
              {summary.totalRecords} entries registered
            </span>
          </div>

          <div className="bg-emerald-50/60 p-3 border border-emerald-200">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-800 font-bold block flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Settled & Paid
            </span>
            <span className="text-lg sm:text-xl font-display font-black text-emerald-900 mt-0.5 block">
              {formatCurrency(summary.paidAmount)}
            </span>
            <span className="text-[10px] text-emerald-700 font-mono">Disbursed with UTR</span>
          </div>

          <div className="bg-amber-50/60 p-3 border border-amber-200">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-800 font-bold block flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-600" /> Pending Approval / Pay
            </span>
            <span className="text-lg sm:text-xl font-display font-black text-amber-900 mt-0.5 block">
              {formatCurrency(summary.pendingAmount)}
            </span>
            <span className="text-[10px] text-amber-700 font-mono">Awaiting SA Approval</span>
          </div>

          <div className="bg-cyan-50/60 p-3 border border-cyan-200">
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-800 font-bold block">
              Active Vendors
            </span>
            <span className="text-lg sm:text-xl font-display font-black text-[#006064] mt-0.5 block">
              {vendors.length} Vendors
            </span>
            <span className="text-[10px] text-cyan-700 font-mono">Centralized Master</span>
          </div>
        </div>
      </div>

      {/* ── CENTER TABS (LOCKED FOR CM, MULTI-SELECTABLE FOR ACCOUNTANT / ADMIN) ── */}
      <div className="bg-white border border-gray-200 p-3 shadow-2xs">
        {isCMOnly ? (
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-[#006064]" /> Center:
              </span>
              <span className="px-3 py-1 text-xs font-black uppercase tracking-wider bg-[#006064] text-white flex items-center gap-1.5 shadow-2xs">
                <Building2 className="w-3.5 h-3.5" />
                <span>
                  {locations.find((l) => String(l.id) === selectedLocation)?.name ||
                    "Agarwal Complex"}
                </span>
              </span>
            </div>
            <span className="text-[10.5px] text-gray-500 font-mono italic hidden sm:inline">
              (CM entry is strictly restricted to assigned center)
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 shrink-0 mr-2 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-[#006064]" /> Select Center:
            </span>

            <button
              onClick={() => setSelectedLocation("ALL")}
              className={`px-3 py-1 text-xs font-bold uppercase transition-all whitespace-nowrap cursor-pointer border ${
                selectedLocation === "ALL"
                  ? "bg-[#006064] text-white border-[#006064] shadow-2xs"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
              }`}
            >
              All Centers ({locations.length})
            </button>

            {locations.map((loc) => {
              const isSelected = selectedLocation === String(loc.id);
              return (
                <button
                  key={loc.id}
                  onClick={() => setSelectedLocation(String(loc.id))}
                  className={`px-3 py-1 text-xs font-bold uppercase transition-all whitespace-nowrap cursor-pointer border flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-[#006064] text-white border-[#006064] shadow-2xs"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <Building2
                    className={`w-3 h-3 ${isSelected ? "text-white" : "text-[#006064]"}`}
                  />
                  <span>{loc.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── COMPREHENSIVE MULTI-MODE FILTERS & SEARCH ── */}
      <div className="bg-white border border-gray-200 p-4 space-y-3 shadow-2xs">
        {/* Date Filter Mode Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mr-1">
              Date Filter:
            </span>
            <div className="flex items-center gap-1 bg-gray-100 p-0.5 border border-gray-300 text-xs">
              <button
                type="button"
                onClick={() => setFilterType("ALL")}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase cursor-pointer transition-all ${
                  filterType === "ALL" ? "bg-[#006064] text-white shadow-2xs" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterType("MONTH")}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase cursor-pointer transition-all ${
                  filterType === "MONTH" ? "bg-[#006064] text-white shadow-2xs" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => setFilterType("YEAR")}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase cursor-pointer transition-all ${
                  filterType === "YEAR" ? "bg-[#006064] text-white shadow-2xs" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Year
              </button>
              <button
                type="button"
                onClick={() => setFilterType("DATE")}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase cursor-pointer transition-all ${
                  filterType === "DATE" ? "bg-[#006064] text-white shadow-2xs" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Date
              </button>
              <button
                type="button"
                onClick={() => setFilterType("CUSTOM")}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase cursor-pointer transition-all ${
                  filterType === "CUSTOM" ? "bg-[#006064] text-white shadow-2xs" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Custom Range
              </button>
            </div>
          </div>

          {/* Active Date Filter Inputs */}
          <div className="flex items-center gap-2 flex-wrap">
            {filterType === "MONTH" && (
              <div className="relative min-w-[200px]">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full bg-[#fafafa] border border-[#006064] px-3 py-1.5 text-xs font-bold text-gray-900 focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="ALL">All Months ({summary.totalRecords} Entries)</option>
                  {availableMonths.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label} ({m.count} expenses)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
              </div>
            )}

            {filterType === "YEAR" && (
              <div className="relative min-w-[160px]">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full bg-[#fafafa] border border-[#006064] px-3 py-1.5 text-xs font-bold text-gray-900 focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="ALL">All Years ({summary.totalRecords} Entries)</option>
                  {availableYears.map((y) => (
                    <option key={y.value} value={y.value}>
                      {y.label} ({y.count} expenses)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
              </div>
            )}

            {filterType === "DATE" && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#006064]" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-[#fafafa] border border-[#006064] px-3 py-1.5 text-xs font-bold text-gray-900 focus:outline-none"
                />
                {selectedDate && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate("")}
                    className="p-1 text-gray-400 hover:text-red-600 text-xs font-bold"
                    title="Clear Date"
                  >
                    ×
                  </button>
                )}
              </div>
            )}

            {filterType === "CUSTOM" && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">From:</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="bg-[#fafafa] border border-[#006064] px-2 py-1 text-xs font-bold text-gray-900 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">To:</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="bg-[#fafafa] border border-[#006064] px-2 py-1 text-xs font-bold text-gray-900 focus:outline-none"
                  />
                </div>
                {(fromDate || toDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFromDate("");
                      setToDate("");
                    }}
                    className="px-2 py-1 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-[10.5px] font-bold border border-gray-300"
                    title="Clear Custom Range"
                  >
                    Clear Range
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search description, vendor, A/C No, UTR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#fafafa] border border-gray-300 focus:outline-none focus:border-[#006064] text-gray-900"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-[#fafafa] border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 focus:outline-none focus:border-[#006064] appearance-none cursor-pointer"
            >
              <option value="ALL">All Expense Types / Sections</option>
              {allAvailableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
          </div>

          {/* Payment & Approval Status Filter */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-[#fafafa] border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 focus:outline-none focus:border-[#006064] appearance-none cursor-pointer"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="PENDING">PENDING PAYMENT (Action Needed)</option>
              <option value="PAID">PAYMENT DONE (Paid with UTR)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
          </div>
        </div>

        {/* ── ACTIVE FILTER FINANCIAL SUMMARY BANNER (REPLACES SPREADSHEET FORMULA ROW) ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-cyan-50/60 p-2.5 border border-cyan-200">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#006064]" />
              <span className="text-xs font-bold text-gray-900">
                Selected View:{" "}
                <span className="text-[#006064] uppercase font-black tracking-wide">
                  {activeMonthMeta.label}
                </span>
              </span>
            </div>

            {/* Compact Add Row Button - Accessible to both CM and Accountant */}
            <button
              type="button"
              onClick={() => {
                setIsAddingRow(true);
                setNewRowData({
                  locationId:
                    selectedLocation !== "ALL"
                      ? selectedLocation
                      : locations[0]?.id
                      ? String(locations[0].id)
                      : "",
                  expenseDate: new Date().toISOString().split("T")[0],
                  receiptNo: "",
                  vendorId: "",
                  vendorName: "",
                  accountNo: "",
                  ifscCode: "",
                  bankName: "",
                  category: FIXED_EXPENSE_TYPES[0],
                  description: "",
                  quantity: "1",
                  unit: "Nos",
                  rate: "",
                  amount: "",
                  paymentMode: "",
                  remarks: "",
                  attachmentUrl: "",
                  invoiceUrl: "",
                  uploadedInBankPortal: false,
                });
              }}
              className="bg-[#006064] hover:bg-[#00838f] text-white px-2.5 py-1 text-xs font-bold tracking-wide transition-all flex items-center gap-1 shadow-2xs cursor-pointer ml-1"
              title="Add a new expense entry inline"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Row</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-[#006064] text-white">
              {activeMonthMeta.count} Expenses
            </span>
            <span className="text-sm font-display font-black text-gray-900 bg-white px-3 py-0.5 border border-cyan-300 shadow-2xs">
              Month Total: {formatCurrency(activeMonthMeta.total)}
            </span>
          </div>
        </div>
      </div>

      {/* ── STRUCTURED EXPENSE DATA TABLE (CLIENT MASTER STYLE) ── */}
      <div className="bg-white border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              {activeViewMode === "CM" ? (
                /* ── CM VIEW HEADERS (EXACT LOOK OF OLD SPREADSHEET WITH DUAL DOCUMENTS) ── */
                <tr className="bg-[#f8f9fa] border-b border-gray-200 text-gray-700 font-mono text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-3 whitespace-nowrap">Date</th>
                  <th className="py-3 px-3 whitespace-nowrap">
                    <div>Vendor / Supplier</div>
                    <button
                      type="button"
                      onClick={() => setIsNewVendorModalOpen(true)}
                      className="text-[8.5px] text-[#006064] lowercase hover:underline flex items-center gap-0.5 cursor-pointer font-sans font-bold"
                    >
                      <Plus className="w-2.5 h-2.5" /> + New Vendor
                    </button>
                  </th>
                  <th className="py-3 px-4 min-w-[200px]">Expense Description</th>
                  <th className="py-3 px-3 whitespace-nowrap">Expense Section</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Amount (₹)</th>
                  <th className="py-3 px-3 whitespace-nowrap">Payment Mod</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">Receipt / Ref #</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">Receipt Slip</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">Attached Doc / Bill</th>
                  <th className="py-3 px-3 min-w-[140px]">Remarks</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">Payment Details</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">Actions</th>
                </tr>
              ) : (
                /* ── ACCOUNTANT & BILLING MASTER HEADERS (HANDWRITTEN SCHEMA STEPS) ── */
                <tr className="bg-[#f8f9fa] border-b border-gray-200 text-gray-700 font-mono text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-2 w-9 text-center">S.n</th>
                  <th className="py-3 px-2.5 whitespace-nowrap">Date</th>
                  <th className="py-3 px-2.5 whitespace-nowrap">Inv No</th>
                  <th className="py-3 px-3 whitespace-nowrap">
                    <div>Vendor Name</div>
                    <button
                      type="button"
                      onClick={() => setIsNewVendorModalOpen(true)}
                      className="text-[8.5px] text-[#006064] lowercase hover:underline flex items-center gap-0.5 cursor-pointer font-sans"
                    >
                      <Plus className="w-2.5 h-2.5" /> create vendor registration
                    </button>
                  </th>
                  <th className="py-3 px-3 min-w-[180px]">Description</th>
                  <th className="py-3 px-2 text-center whitespace-nowrap">Qty</th>
                  <th className="py-3 px-2 text-center whitespace-nowrap">A/U</th>
                  <th className="py-3 px-2.5 text-right whitespace-nowrap">Rate</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap font-black">Amt (₹)</th>
                  <th className="py-3 px-2.5 text-center whitespace-nowrap">
                    <div>Receipt Attached Ref</div>
                  </th>
                  <th className="py-3 px-2.5 text-center whitespace-nowrap">
                    <div>Attached Document</div>
                  </th>
                  <th className="py-3 px-2.5 text-center whitespace-nowrap">
                    <div>Bank portal</div>
                    <span className="text-[8px] text-gray-400 font-normal lowercase">(upload)</span>
                  </th>
                  <th className="py-3 px-2.5 text-center whitespace-nowrap">
                    <div>Approved</div>
                    <span className="text-[8px] text-gray-400 font-normal lowercase">(by SA)</span>
                  </th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">UTR No</th>
                  <th className="py-3 px-2.5 text-center whitespace-nowrap">Payment Date</th>
                  <th className="py-3 px-2.5 text-center whitespace-nowrap">
                    <div>Email Alert</div>
                    <span className="text-[8px] text-gray-400 font-normal lowercase">(to vendor)</span>
                  </th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Actions</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-gray-200">
              {/* ── INLINE ADD ROW (CM & ACCOUNTANT VIEWS) ── */}
              {isAddingRow && (
                activeViewMode === "CM" ? (
                  <tr className="bg-cyan-50/50 border-2 border-[#006064] animate-in fade-in">
                    <td className="py-2.5 px-2 text-center font-mono text-[11px] text-[#006064] font-bold">
                      NEW
                    </td>
                    <td className="py-2.5 px-2 whitespace-nowrap">
                      <input
                        type="date"
                        value={newRowData.expenseDate}
                        onChange={(e) => setNewRowData((prev) => ({ ...prev, expenseDate: e.target.value }))}
                        className="border border-gray-300 p-1 text-[11px] font-mono bg-white focus:outline-none focus:border-[#006064] w-28"
                      />
                      {selectedLocation === "ALL" && (
                        <select
                          value={newRowData.locationId}
                          onChange={(e) => setNewRowData((prev) => ({ ...prev, locationId: e.target.value }))}
                          className="border border-gray-300 p-0.5 text-[10px] bg-white mt-1 block w-28 focus:outline-none focus:border-[#006064]"
                        >
                          <option value="">Select Center *</option>
                          {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="py-2.5 px-2 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <select
                          value={newRowData.vendorId}
                          onChange={(e) => {
                            const vId = e.target.value;
                            const found = vendors.find((v) => String(v.id) === vId);
                            setNewRowData((prev) => ({
                              ...prev,
                              vendorId: vId,
                              vendorName: found ? found.vendorName : "",
                              accountNo: found?.accountNo || "",
                              ifscCode: found?.ifscCode || "",
                              bankName: found?.bankName || "",
                            }));
                          }}
                          className="border border-gray-300 p-1 text-[11px] bg-white focus:outline-none focus:border-[#006064] w-28"
                        >
                          <option value="">Vendor (Opt)</option>
                          {vendors.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.vendorName}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setIsNewVendorModalOpen(true)}
                          className="text-[9px] text-[#006064] font-bold hover:underline flex items-center gap-0.5 cursor-pointer text-left"
                        >
                          <Plus className="w-2.5 h-2.5" /> + New Vendor
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        placeholder="Expense description *"
                        value={newRowData.description}
                        onChange={(e) => setNewRowData((prev) => ({ ...prev, description: e.target.value }))}
                        className="border border-gray-300 p-1.5 text-xs w-full bg-white font-medium focus:outline-none focus:border-[#006064]"
                      />
                    </td>
                    <td className="py-2.5 px-2 whitespace-nowrap">
                      <select
                        value={newRowData.category}
                        onChange={(e) => setNewRowData((prev) => ({ ...prev, category: e.target.value }))}
                        className="border border-gray-300 p-1 text-[11px] bg-white focus:outline-none focus:border-[#006064] w-32 font-bold uppercase text-[#006064]"
                      >
                        {Array.from(new Set([...categoryHeaders, ...(newRowData.category ? [newRowData.category] : [])])).map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-2 text-right whitespace-nowrap">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="₹ Amount *"
                        value={newRowData.amount}
                        onChange={(e) => setNewRowData((prev) => ({ ...prev, amount: e.target.value }))}
                        className="border border-gray-300 p-1 text-xs font-bold font-mono text-right w-24 bg-white focus:outline-none focus:border-[#006064]"
                      />
                    </td>
                    <td className="py-2.5 px-2 whitespace-nowrap">
                      <select
                        value={newRowData.paymentMode}
                        onChange={(e) => setNewRowData((prev) => ({ ...prev, paymentMode: e.target.value }))}
                        className="border border-gray-300 p-1 text-[11px] bg-white focus:outline-none focus:border-[#006064] w-24"
                      >
                        <option value="">Mode (Opt)</option>
                        {PAYMENT_MODES.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <input
                        type="text"
                        placeholder="Receipt #"
                        value={newRowData.receiptNo}
                        onChange={(e) => setNewRowData((prev) => ({ ...prev, receiptNo: e.target.value }))}
                        className="border border-gray-300 p-1 text-[10.5px] font-mono w-24 bg-white focus:outline-none focus:border-[#006064]"
                      />
                    </td>
                    {/* Attach Option 1: Receipt Slip */}
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <input
                        type="file"
                        ref={inlineReceiptFileRef}
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleInlineUpload(file, "receipt");
                        }}
                      />
                      {newRowData.attachmentUrl ? (
                        <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 border border-amber-200">
                          Slip Attached ✓
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => inlineReceiptFileRef.current?.click()}
                          disabled={uploadingInlineDoc}
                          className="text-[10px] text-amber-800 font-bold underline cursor-pointer"
                        >
                          {uploadingInlineDoc ? "..." : "+ Slip"}
                        </button>
                      )}
                    </td>
                    {/* Attach Option 2: Operational Bill / Doc Proof */}
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <input
                        type="file"
                        ref={inlineInvoiceFileRef}
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleInlineUpload(file, "invoice");
                        }}
                      />
                      {newRowData.invoiceUrl ? (
                        <span className="text-[10px] text-[#006064] font-bold bg-cyan-50 px-1.5 py-0.5 border border-cyan-200">
                          Doc Attached ✓
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => inlineInvoiceFileRef.current?.click()}
                          disabled={uploadingInlineDoc}
                          className="text-[10px] text-[#006064] font-bold underline cursor-pointer"
                        >
                          {uploadingInlineDoc ? "..." : "+ Doc"}
                        </button>
                      )}
                    </td>
                    <td className="py-2.5 px-2">
                      <input
                        type="text"
                        placeholder="Remarks (opt)"
                        value={newRowData.remarks}
                        onChange={(e) => setNewRowData((prev) => ({ ...prev, remarks: e.target.value }))}
                        className="border border-gray-300 p-1 text-[11px] w-28 bg-white focus:outline-none focus:border-[#006064]"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className="text-[10px] text-gray-400 font-mono italic">Accountant Step</span>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleSaveInlineRow}
                          disabled={savingInlineRow}
                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase transition-all cursor-pointer shadow-xs flex items-center gap-1 disabled:opacity-50"
                          title="Save Row"
                        >
                          <Check className="w-3.5 h-3.5" /> Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsAddingRow(false)}
                          className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold uppercase transition-all cursor-pointer"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr className="bg-emerald-50/50 border-2 border-emerald-600 animate-in fade-in text-[11px]">
                    <td className="py-2 px-1 text-center font-mono font-bold text-emerald-800">
                      NEW
                    </td>
                    <td className="py-2 px-1.5 whitespace-nowrap">
                      <input
                        type="date"
                        value={newRowData.expenseDate}
                        onChange={(e) => setNewRowData((prev) => ({ ...prev, expenseDate: e.target.value }))}
                        className="border border-gray-300 p-1 text-[10.5px] font-mono bg-white w-24 focus:outline-none focus:border-emerald-600"
                      />
                      {selectedLocation === "ALL" && (
                        <select
                          value={newRowData.locationId}
                          onChange={(e) => setNewRowData((prev) => ({ ...prev, locationId: e.target.value }))}
                          className="border border-gray-300 p-0.5 text-[9.5px] bg-white mt-1 block w-24 focus:outline-none focus:border-emerald-600"
                        >
                          <option value="">Center *</option>
                          {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="py-2 px-1.5 whitespace-nowrap">
                      <input
                        type="text"
                        placeholder="Inv #"
                        value={newRowData.receiptNo}
                        onChange={(e) => setNewRowData((prev) => ({ ...prev, receiptNo: e.target.value }))}
                        className="border border-gray-300 p-1 text-[10.5px] font-mono w-20 bg-white focus:outline-none focus:border-emerald-600"
                      />
                    </td>
                    <td className="py-2 px-1.5 whitespace-nowrap">
                      <select
                        value={newRowData.vendorId}
                        onChange={(e) => {
                          const vid = e.target.value;
                          const vObj = vendors.find((v) => String(v.id) === String(vid));
                          setNewRowData((prev) => ({
                            ...prev,
                            vendorId: vid,
                            vendorName: vObj?.vendorName || "",
                            accountNo: vObj?.accountNo || prev.accountNo || "",
                            ifscCode: vObj?.ifscCode || prev.ifscCode || "",
                            bankName: vObj?.bankName || prev.bankName || "",
                          }));
                        }}
                        className="border border-gray-300 p-1 text-[10.5px] bg-white w-28 focus:outline-none focus:border-emerald-600"
                      >
                        <option value="">-- Vendor --</option>
                        {vendors.map((v) => (
                          <option key={v.id} value={v.id}>{v.vendorName}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setNewVendorForm({
                            vendorName: "",
                            mobileNo: "",
                            email: "",
                            accountNo: "",
                            ifscCode: "",
                            address: "",
                            locationName: locations.find((l) => String(l.id) === String(selectedLocation))?.name || "",
                            gstin: "",
                            pan: "",
                          });
                          setNewVendorErrors({});
                          setIsNewVendorModalOpen(true);
                        }}
                        className="text-[9px] text-[#006064] hover:underline font-bold block mt-0.5 cursor-pointer"
                      >
                        + Add Vendor
                      </button>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        placeholder="Description *"
                        value={newRowData.description}
                        onChange={(e) => setNewRowData((prev) => ({ ...prev, description: e.target.value }))}
                        className="border border-gray-300 p-1 text-[11px] w-32 bg-white focus:outline-none focus:border-emerald-600 font-medium"
                      />
                      <select
                        value={newRowData.category}
                        onChange={(e) => setNewRowData((prev) => ({ ...prev, category: e.target.value }))}
                        className="border border-gray-300 p-0.5 text-[9.5px] bg-white mt-1 block w-32 uppercase text-[#006064] font-bold"
                      >
                        {allAvailableCategories.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-1 text-center whitespace-nowrap">
                      <input
                        type="number"
                        value={newRowData.quantity}
                        onChange={(e) => {
                          const q = e.target.value;
                          const r = newRowData.rate;
                          const autoAmt = q && r ? (parseFloat(q) * parseFloat(r)).toFixed(2) : newRowData.amount;
                          setNewRowData((prev) => ({ ...prev, quantity: q, amount: autoAmt }));
                        }}
                        className="border border-gray-300 p-1 text-[10.5px] font-mono text-center w-12 bg-white"
                      />
                    </td>
                    <td className="py-2 px-1 text-center whitespace-nowrap">
                      <input
                        type="text"
                        value={newRowData.unit}
                        onChange={(e) => setNewRowData((prev) => ({ ...prev, unit: e.target.value }))}
                        className="border border-gray-300 p-1 text-[10.5px] font-mono text-center w-12 bg-white"
                      />
                    </td>
                    <td className="py-2 px-1 text-right whitespace-nowrap">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Rate"
                        value={newRowData.rate}
                        onChange={(e) => {
                          const r = e.target.value;
                          const q = newRowData.quantity;
                          const autoAmt = q && r ? (parseFloat(q) * parseFloat(r)).toFixed(2) : newRowData.amount;
                          setNewRowData((prev) => ({ ...prev, rate: r, amount: autoAmt }));
                        }}
                        className="border border-gray-300 p-1 text-[10.5px] font-mono text-right w-16 bg-white"
                      />
                    </td>
                    <td className="py-2 px-1.5 text-right whitespace-nowrap">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Amt *"
                        value={newRowData.amount}
                        onChange={(e) => setNewRowData((prev) => ({ ...prev, amount: e.target.value }))}
                        className="border border-gray-300 p-1 text-[11px] font-mono font-bold text-right w-20 bg-white text-gray-900"
                      />
                    </td>
                    {/* 10. Receipt Slip / Ref */}
                    <td className="py-2 px-1 text-center whitespace-nowrap">
                      <input
                        type="file"
                        ref={inlineReceiptFileRef}
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleInlineUpload(file, "receipt");
                        }}
                      />
                      {newRowData.attachmentUrl ? (
                        <span className="text-[9.5px] text-amber-700 font-bold bg-amber-50 px-1 py-0.5 border border-amber-200">
                          Slip Attached ✓
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => inlineReceiptFileRef.current?.click()}
                          disabled={uploadingInlineDoc}
                          className="text-[9.5px] text-amber-800 underline font-bold cursor-pointer"
                        >
                          {uploadingInlineDoc ? "..." : "+ Slip"}
                        </button>
                      )}
                    </td>

                    {/* 11. Attached Document */}
                    <td className="py-2 px-1 text-center whitespace-nowrap">
                      <input
                        type="file"
                        ref={inlineInvoiceFileRef}
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleInlineUpload(file, "invoice");
                        }}
                      />
                      {newRowData.invoiceUrl ? (
                        <span className="text-[9.5px] text-[#006064] font-bold bg-cyan-50 px-1 py-0.5 border border-cyan-200">
                          Doc Attached ✓
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => inlineInvoiceFileRef.current?.click()}
                          disabled={uploadingInlineDoc}
                          className="text-[9.5px] text-[#006064] underline font-bold cursor-pointer"
                        >
                          {uploadingInlineDoc ? "..." : "+ Doc"}
                        </button>
                      )}
                    </td>
                    <td className="py-2 px-1 text-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={newRowData.uploadedInBankPortal}
                        onChange={(e) => setNewRowData((prev) => ({ ...prev, uploadedInBankPortal: e.target.checked }))}
                        className="w-4 h-4 accent-[#006064] cursor-pointer"
                      />
                    </td>
                    <td className="py-2 px-1 text-center text-[10px] text-gray-400 font-mono whitespace-nowrap">
                      Pending
                    </td>
                    <td className="py-2 px-1 text-center text-[10px] text-gray-400 font-mono whitespace-nowrap">
                      Locked
                    </td>
                    <td className="py-2 px-1 text-center text-[10px] text-gray-400 font-mono whitespace-nowrap">
                      Locked
                    </td>
                    <td className="py-2 px-1 text-center text-[10px] text-gray-400 font-mono whitespace-nowrap">
                      Locked
                    </td>
                    <td className="py-2 px-2 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={handleSaveInlineRow}
                          disabled={savingInlineRow}
                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[10.5px] font-bold uppercase transition-all cursor-pointer shadow-xs flex items-center gap-1 disabled:opacity-50"
                          title="Save Row"
                        >
                          <Check className="w-3 h-3" /> Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsAddingRow(false)}
                          className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-[10.5px] font-bold uppercase transition-all cursor-pointer"
                          title="Cancel"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}

              {loading ? (
                <tr>
                  <td
                    colSpan={activeViewMode === "CM" ? 13 : 17}
                    className="py-16 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-[#006064]" />
                      <span className="text-xs font-mono font-bold tracking-widest uppercase">
                        Loading Expense Records...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 && !isAddingRow ? (
                <tr>
                  <td
                    colSpan={activeViewMode === "CM" ? 13 : 17}
                    className="py-16 text-center text-gray-400"
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Receipt className="w-10 h-10 text-gray-300" />
                      <p className="text-sm font-semibold text-gray-600">
                        No expense records match your current filters.
                      </p>
                      <button
                        onClick={openAddModal}
                        className="bg-[#006064] text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-[#00838f] transition-all cursor-pointer"
                      >
                        + Add First Expense
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((rec, index) => {
                  const isApproved =
                    rec.approvalStatus === "APPROVED" || rec.paymentStatus === "PAID";
                  const dateDisplay =
                    rec.expenseDateStr ||
                    (rec.expenseDate
                      ? new Date(rec.expenseDate).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "-");

                  if (activeViewMode === "CM") {
                    /* ── RENDER CM ROW (100% IDENTICAL TO OLD SPREADSHEET HEADERS) ── */
                    return (
                      <tr
                        key={rec.id}
                        className="hover:bg-[#fcfdfd] transition-colors group"
                      >
                        {/* 1. # Index */}
                        <td className="py-3 px-3 text-center font-mono text-[11px] text-gray-400">
                          {index + 1}
                        </td>

                        {/* 2. Date */}
                        <td className="py-3 px-3 whitespace-nowrap font-medium text-gray-900">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span>{dateDisplay}</span>
                          </div>
                        </td>

                        {/* 2.5. Vendor / Supplier */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {rec.vendorName ? (
                            <div className="font-semibold text-gray-900 text-xs flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-[#006064]" />
                              <span>{rec.vendorName}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic text-[11px]">Unassigned</span>
                          )}
                        </td>

                        {/* 3. Expense Description */}
                        <td className="py-3 px-4 max-w-sm">
                          <div className="font-semibold text-gray-900 leading-snug">
                            {rec.description}
                          </div>
                          <div className="mt-1">
                            {renderEnteredByBadge(rec)}
                          </div>
                        </td>

                        {/* 4. Expense Section */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider bg-cyan-50 text-[#006064] border border-cyan-100">
                            {rec.category || "GENERAL"}
                          </span>
                        </td>

                        {/* 5. Amount (₹) */}
                        <td className="py-3 px-3 text-right whitespace-nowrap font-display font-black text-gray-900 text-sm">
                          {formatCurrency(rec.amount)}
                        </td>

                        {/* 6. Payment Mod */}
                        <td className="py-3 px-3 whitespace-nowrap text-gray-600 text-[11px]">
                          {rec.paymentMode ? (
                            <span className="inline-flex items-center gap-1">
                              <CreditCard className="w-3 h-3 text-gray-400" />
                              <span>{rec.paymentMode}</span>
                            </span>
                          ) : (
                            <span className="text-gray-300 text-[11px]">-</span>
                          )}
                        </td>

                        {/* 7. Receipt / Ref # */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {rec.receiptNo ? (
                            rec.receiptNo.startsWith("http") || rec.receiptNo.startsWith("/api/") ? (
                              <a
                                href={rec.receiptNo}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all cursor-pointer"
                                title="View Receipt Document"
                              >
                                <Receipt className="w-3 h-3 text-blue-700" /> View Receipt
                              </a>
                            ) : (
                              <span className="font-mono text-gray-700 font-bold">{rec.receiptNo}</span>
                            )
                          ) : (
                            <span className="text-gray-300 text-[11px]">-</span>
                          )}
                        </td>

                        {/* 8. Receipt Slip (Voucher / Slip attached by CM) */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {rec.attachmentUrl && !rec.attachmentUrl.includes("undefined") ? (
                            <a
                              href={rec.attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all cursor-pointer"
                              title="View Attached Receipt Slip / Voucher"
                            >
                              <Receipt className="w-3 h-3 text-amber-700" /> View Slip
                            </a>
                          ) : (
                            <span className="text-gray-300 text-[11px]">-</span>
                          )}
                        </td>

                        {/* 9. Attached Doc / Bill (Operational Document / Bill copy attached by CM) */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {rec.invoiceUrl && !rec.invoiceUrl.includes("undefined") ? (
                            <a
                              href={rec.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-[#006064] bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 transition-all cursor-pointer"
                              title="View Attached Operational Bill / Document Proof"
                            >
                              <FileText className="w-3 h-3 text-[#006064]" /> View Doc / Bill
                            </a>
                          ) : (
                            <span className="text-gray-300 text-[11px]">-</span>
                          )}
                        </td>

                        {/* 10. Remarks */}
                        <td className="py-3 px-3 text-gray-600 max-w-xs text-[11px]">
                          {rec.remarks ? (
                            <span className="italic">{rec.remarks}</span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>

                        {/* 10. Payment Status & Breakdown (Read-only in CM View - Breakdown is entered by Accountant) */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="inline-flex items-center justify-center gap-1.5">
                            {rec.paymentStatus === "PAID" || rec.utrNumber ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <Check className="w-3 h-3 text-emerald-700" />
                                <span>Paid {rec.utrNumber ? `(${rec.utrNumber})` : ""}</span>
                              </span>
                            ) : rec.approvalStatus === "APPROVED" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                <Check className="w-3 h-3 text-blue-700" />
                                <span>Approved</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-700" />
                                <span>Pending Settlement</span>
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setViewingPaymentRecord(rec);
                                setIsViewPaymentModalOpen(true);
                              }}
                              className="p-1 text-gray-500 hover:text-[#006064] hover:bg-cyan-50 border border-gray-200 transition-all cursor-pointer"
                              title="View Payment Breakdown"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* 11. Actions: Edit & Delete Expense (Accountant only own, CM only own, Super Admin everyone) */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {canEditOrDeleteEntry(rec) ? (
                            <div className="inline-flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditModal(rec)}
                                title="Edit Expense Details (Date, Description, Amount, Category, Receipt)"
                                className="p-1.5 text-gray-600 hover:text-[#006064] hover:bg-cyan-50 border border-transparent hover:border-cyan-200 transition-all cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(rec.id)}
                                disabled={deletingId === rec.id}
                                title="Delete Expense Record"
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all cursor-pointer disabled:opacity-40"
                              >
                                {deletingId === rec.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span
                              title={`Editable only by ${
                                rec.createdByRole === "ACCOUNTANT"
                                  ? "Accountant"
                                  : rec.createdByRole === "ADMIN"
                                  ? "Super Admin"
                                  : "Community Manager"
                              }`}
                              className="text-gray-300 text-xs select-none"
                            >
                              -
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  }

                  /* ── RENDER ACCOUNTANT BILLING MASTER ROW (16 COLUMNS STRICTLY MATCHING DIAGRAM) ── */
                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-[#fcfdfd] transition-colors group"
                    >
                      {/* 1. S.n */}
                      <td className="py-3 px-2 text-center font-mono text-[11px] text-gray-400">
                        {index + 1}
                      </td>

                      {/* 2. Date */}
                      <td className="py-3 px-2.5 whitespace-nowrap font-medium text-gray-900 text-[11px]">
                        {dateDisplay}
                      </td>

                      {/* 3. Inv No */}
                      <td className="py-3 px-2.5 whitespace-nowrap font-mono text-[11px] text-gray-700">
                        {rec.receiptNo || <span className="text-gray-300">-</span>}
                      </td>

                      {/* 4. Vendor Name (with create vendor registration link) */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {rec.vendorName ? (
                          <div className="font-semibold text-gray-900 text-[11.5px]">
                            {rec.vendorName}
                            {rec.accountNo && (
                              <div className="text-[10px] font-mono text-gray-400">
                                A/C: {rec.accountNo}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[9.5px] font-mono font-bold block mb-0.5">
                              Accounts to Assign
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSettlingRecord(rec);
                                setIsNewVendorModalOpen(true);
                              }}
                              className="text-[9px] text-[#006064] hover:underline flex items-center gap-0.5 cursor-pointer font-bold"
                            >
                              <Plus className="w-2.5 h-2.5" /> Add Vendor
                            </button>
                          </div>
                        )}
                      </td>

                      {/* 5. Description */}
                      <td className="py-3 px-3 max-w-xs">
                        <div className="font-semibold text-gray-900 leading-snug text-[11.5px]">
                          {rec.description}
                        </div>
                        <div className="text-[9.5px] text-gray-400 font-mono mt-0.5">
                          {rec.locationName} • {rec.category || "GENERAL"}
                        </div>
                        <div className="mt-1">
                          {renderEnteredByBadge(rec)}
                        </div>
                      </td>

                      {/* 6. Qty */}
                      <td className="py-3 px-2 text-center whitespace-nowrap text-[11px] font-mono text-gray-700">
                        {rec.quantity || 1}
                      </td>

                      {/* 7. A/U (Accounting Unit) */}
                      <td className="py-3 px-2 text-center whitespace-nowrap text-[10.5px] font-mono text-gray-600">
                        <span className="bg-gray-100 px-1.5 py-0.5 border border-gray-200">
                          {rec.unit || "Nos"}
                        </span>
                      </td>

                      {/* 8. Rate */}
                      <td className="py-3 px-2.5 text-right whitespace-nowrap text-[11px] font-mono text-gray-700">
                        {rec.rate ? `₹${rec.rate}` : "-"}
                      </td>

                      {/* 9. Amt (₹) */}
                      <td className="py-3 px-3 text-right whitespace-nowrap font-display font-black text-gray-900 text-xs">
                        {formatCurrency(rec.amount)}
                      </td>

                      {/* 10. Receipt Attached Ref (CM Receipt Slip / Ref) */}
                      <td className="py-3 px-2.5 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          {rec.receiptNo && (
                            <span className="font-mono text-[10px] font-bold text-gray-800">
                              {rec.receiptNo}
                            </span>
                          )}
                          {rec.attachmentUrl && !rec.attachmentUrl.includes("undefined") ? (
                            <a
                              href={rec.attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all cursor-pointer"
                              title="View CM Receipt Slip"
                            >
                              <Receipt className="w-2.5 h-2.5 text-amber-700" /> View Slip
                            </a>
                          ) : !rec.receiptNo ? (
                            <span className="text-gray-400 text-[10px]">-</span>
                          ) : null}
                        </div>
                      </td>

                      {/* 11. Attached Document (Operational Bill Proof / Accountant Tax Invoice) */}
                      <td className="py-3 px-2.5 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center justify-center gap-1">
                          {rec.vendorInvoiceUrl && !rec.vendorInvoiceUrl.includes("undefined") ? (
                            <a
                              href={rec.vendorInvoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[9.5px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-all cursor-pointer shadow-2xs"
                              title="View Official Vendor Tax Invoice Uploaded by Accountant"
                            >
                              <FileText className="w-3 h-3 text-emerald-700" /> Tax Inv PDF
                            </a>
                          ) : null}

                          {rec.invoiceUrl && !rec.invoiceUrl.includes("undefined") ? (
                            <a
                              href={rec.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[9.5px] font-bold text-[#006064] bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 transition-all cursor-pointer shadow-2xs"
                              title="View Attached Bill / Operational Proof Document uploaded by CM"
                            >
                              <FileText className="w-3 h-3 text-[#006064]" /> Attached Doc
                            </a>
                          ) : null}

                          {!rec.vendorInvoiceUrl && !rec.invoiceUrl && (
                            <button
                              type="button"
                              onClick={() => openSettleModal(rec)}
                              className="text-[9.5px] text-gray-400 hover:text-[#006064] underline cursor-pointer"
                              title="Accountant uploads official invoice in billing breakdown modal"
                            >
                              Upload Inv
                            </button>
                          )}
                        </div>
                      </td>

                      {/* 12. Upload in Bank portal (with interactive checkbox below) */}
                      <td className="py-3 px-2.5 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center justify-center">
                          <input
                            type="checkbox"
                            checked={Boolean(rec.uploadedInBankPortal)}
                            onChange={() => handleToggleBankPortal(rec)}
                            title="Toggle bank portal upload status"
                            className="w-4 h-4 accent-[#006064] cursor-pointer"
                          />
                          <span className="text-[8px] text-gray-400 font-mono mt-0.5">
                            {rec.uploadedInBankPortal ? "Uploaded" : "Pending"}
                          </span>
                        </div>
                      </td>

                      {/* 13. Approved (with checkbox/badge below) */}
                      <td className="py-3 px-2.5 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isApproved}
                            readOnly
                            disabled
                            className="w-4 h-4 accent-emerald-600 cursor-not-allowed"
                          />
                          <span
                            className={`text-[8.5px] font-bold mt-0.5 ${
                              isApproved ? "text-emerald-700" : "text-amber-700"
                            }`}
                          >
                            {isApproved ? "Approved ✓" : "Pending"}
                          </span>
                        </div>
                      </td>

                      {/* 14. UTR No. (UNLOCKED FOR ACCOUNTANT ONCE APPROVED) */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {isApproved ? (
                          rec.utrNumber ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="font-mono text-[11px] font-bold text-emerald-800">
                                {rec.utrNumber}
                              </span>
                              {(rec.paymentProofUrl || rec.utrFileUrl) && (
                                <a
                                  href={rec.paymentProofUrl || rec.utrFileUrl || "#"}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[8.5px] text-[#006064] hover:underline font-bold"
                                >
                                  UTR Proof
                                </a>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openApproveModal(rec)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-all cursor-pointer shadow-2xs"
                              title="Click to record bank payment UTR number"
                            >
                              <CreditCard className="w-2.5 h-2.5 text-amber-700" /> Enter UTR
                            </button>
                          )
                        ) : (
                          <span
                            title="UTR No. will take place after approval"
                            className="inline-flex items-center gap-1 text-[9.5px] text-gray-400 font-mono bg-gray-50 px-1.5 py-0.5 border border-gray-200"
                          >
                            <Lock className="w-2.5 h-2.5 text-gray-400" /> Locked
                          </span>
                        )}
                      </td>

                      {/* 15. Payment Date (Accountant sets in Step 2; finalized upon disbursal) */}
                      <td className="py-3 px-2.5 text-center whitespace-nowrap">
                        {rec.payReceiveDate || rec.utrDate ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="font-mono text-[10.5px] font-semibold text-emerald-950">
                              {rec.payReceiveDate || rec.utrDate}
                            </span>
                            {isApproved ? (
                              <button
                                type="button"
                                onClick={() => openApproveModal(rec)}
                                className="text-[8.5px] text-amber-700 hover:text-amber-900 underline cursor-pointer"
                                title="Edit payment disbursal details"
                              >
                                edit
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openSettleModal(rec)}
                                className="text-[8.5px] text-gray-400 hover:text-emerald-700 underline cursor-pointer"
                                title="Edit scheduled payment date"
                              >
                                edit
                              </button>
                            )}
                          </div>
                        ) : isApproved ? (
                          <button
                            type="button"
                            onClick={() => openApproveModal(rec)}
                            className="text-[10px] text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer"
                            title="Click to set payment date"
                          >
                            Set Date
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openSettleModal(rec)}
                            className="text-[9.5px] text-gray-400 hover:text-emerald-700 underline cursor-pointer"
                            title="Set scheduled payment date in Enter Bill"
                          >
                            Set Date
                          </button>
                        )}
                      </td>

                      {/* 16. Send Alert / email to vendor (UNLOCKED FOR ACCOUNTANT ONCE APPROVED) */}
                      <td className="py-3 px-2.5 text-center whitespace-nowrap">
                        {isApproved ? (
                          rec.alertEmailSent ? (
                            <div className="flex flex-col items-center justify-center">
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <Check className="w-2.5 h-2.5 text-emerald-600" /> Sent
                              </span>
                              <button
                                type="button"
                                onClick={() => handleSendAlertEmail(rec)}
                                disabled={sendingAlertId === rec.id}
                                className="text-[8px] text-blue-600 hover:underline mt-0.5 cursor-pointer"
                                title="Resend payment confirmation email to vendor"
                              >
                                {sendingAlertId === rec.id ? "Sending..." : "Resend"}
                              </button>
                            </div>
                          ) : rec.utrNumber ? (
                            <button
                              type="button"
                              onClick={() => handleSendAlertEmail(rec)}
                              disabled={sendingAlertId === rec.id}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 transition-all cursor-pointer shadow-2xs"
                              title="Send official payment confirmation alert to vendor"
                            >
                              <Send className="w-2.5 h-2.5 text-blue-600" />
                              <span>{sendingAlertId === rec.id ? "Sending..." : "Send Alert"}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openApproveModal(rec)}
                              className="text-[8.5px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 border border-amber-200 cursor-pointer"
                              title="Enter UTR first to dispatch vendor email"
                            >
                              Will Send on UTR
                            </button>
                          )
                        ) : (
                          <span
                            title="Send Alert to Vendor will take place after approval"
                            className="inline-flex items-center gap-1 text-[9.5px] text-gray-400 font-mono bg-gray-50 px-1.5 py-0.5 border border-gray-200"
                          >
                            <Lock className="w-2.5 h-2.5 text-gray-400" /> Locked
                          </span>
                        )}
                      </td>

                      {/* 17. Actions */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {!isApproved ? (
                            <>
                              {rec.approvalStatus === "PENDING_APPROVAL" ? (
                                <span className="px-2 py-1 text-[9.5px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                                  Pending SA Approval
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSendForApproval(rec)}
                                  className="px-2.5 py-1 text-[9.5px] font-bold uppercase bg-blue-600 hover:bg-blue-700 text-white transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                                >
                                  <Send className="w-2.5 h-2.5" /> Send for Approval
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => openSettleModal(rec)}
                                className="px-2 py-1 text-[9.5px] font-bold uppercase bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300 transition-all cursor-pointer"
                              >
                                Enter Bill
                              </button>
                            </>
                          ) : (
                            rec.utrNumber ? (
                              <div className="inline-flex items-center gap-1">
                                <span className="px-2 py-0.5 text-[9.5px] font-bold uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
                                  Paid ✓
                                </span>
                                <button
                                  type="button"
                                  onClick={() => openApproveModal(rec)}
                                  className="px-2 py-0.5 text-[9.5px] font-bold uppercase bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 transition-all cursor-pointer"
                                  title="Edit UTR or Disbursal Details"
                                >
                                  Edit UTR
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openApproveModal(rec)}
                                className="px-2.5 py-1 text-[9.5px] font-bold uppercase bg-emerald-700 hover:bg-emerald-800 text-white transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                              >
                                <CreditCard className="w-2.5 h-2.5" /> Disburse / UTR
                              </button>
                            )
                          )}

                          {/* Edit Expense Entry (Accountant only own, CM only own, Super Admin everyone) */}
                          {canEditOrDeleteEntry(rec) && (
                            <button
                              type="button"
                              onClick={() => openEditModal(rec)}
                              title="Edit Expense Entry"
                              className="p-1 text-gray-500 hover:text-[#006064] hover:bg-cyan-50 border border-transparent hover:border-cyan-200 transition-all cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Super Admin Review / Approve */}
                          {isAdmin && !isApproved && (
                            <button
                              type="button"
                              onClick={() => openApproveModal(rec)}
                              title="Super Admin Review & Approve"
                              className="p-1 text-[#006064] hover:bg-cyan-50 border border-transparent hover:border-cyan-200 transition-all cursor-pointer"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Entry (Accountant only own, CM only own, Super Admin everyone) */}
                          {canEditOrDeleteEntry(rec) && (
                            <button
                              type="button"
                              onClick={() => handleDelete(rec.id)}
                              disabled={deletingId === rec.id}
                              title="Delete Expense Entry"
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all cursor-pointer disabled:opacity-40"
                            >
                              {deletingId === rec.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="p-3 bg-[#f8f9fa] border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-2">
          <div>
            Showing <span className="font-bold text-gray-800">{records.length}</span> entries{" "}
            {selectedLocation !== "ALL" && (
              <span>
                for{" "}
                <span className="font-bold text-gray-800">
                  {locations.find((l) => String(l.id) === selectedLocation)?.name}
                </span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs font-mono font-bold">
            <span>
              Total:{" "}
              <span className="text-gray-900 font-display">
                {formatCurrency(summary.totalAmount)}
              </span>
            </span>
            <span className="text-emerald-700">
              Paid: {formatCurrency(summary.paidAmount)}
            </span>
            <span className="text-amber-700">
              Pending: {formatCurrency(summary.pendingAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* ── MODAL 1: RECORD / EDIT EXPENSE (NEW FORMAT) ── */}
      {mounted && typeof document !== "undefined" && isAddModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-gray-300 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-[#f8f9fa] sticky top-0 z-10">
              <div>
                <h2 className="text-base font-display font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#006064]" />
                  <span>{editingRecord ? "Edit Expense Entry" : "Step 1: Record Center Operating Expense"}</span>
                </h2>
                <p className="text-[11px] text-gray-500">
                  CM or Accounts: Enter operational expense and attach bill PDF. Accountant will enter payment details against it.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveForm} className="p-6 space-y-4 text-xs">
              {/* Section 1: Center & Expense Date */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Center Selector */}
                  <div>
                    <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Coworking Center <span className="text-red-500">*</span>
                    </label>
                    {isCMOnly ? (
                      <div className="w-full border border-[#006064] bg-cyan-50/40 p-2 text-xs font-bold text-[#006064] flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-[#006064]" />
                        <span>
                          {locations.find((l) => String(l.id) === String(formData.locationId))?.name ||
                            locations.find((l) => String(l.id) === selectedLocation)?.name ||
                            "Agarwal Complex"}
                        </span>
                      </div>
                    ) : (
                      <select
                        value={formData.locationId}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, locationId: e.target.value }))
                        }
                        required
                        className="w-full border border-gray-300 p-2 text-xs focus:outline-none focus:border-[#006064] cursor-pointer"
                      >
                        <option value="">-- Select Center --</option>
                        {locations.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <span className="text-[10px] text-gray-400 mt-0.5 block">
                      {isCMOnly
                        ? "Assigned center locked for Community Manager"
                        : "Select coworking location for this expense."}
                    </span>
                  </div>

                  {/* Expense Date */}
                  <div>
                    <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Expense Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.expenseDate}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, expenseDate: e.target.value }))
                      }
                      required
                      className="w-full border border-gray-300 p-2 text-xs focus:outline-none focus:border-[#006064]"
                    />
                  </div>

                  {/* Vendor / Supplier (Optional) */}
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-gray-700 uppercase tracking-wider text-[11px]">
                        Vendor / Supplier <span className="text-gray-400 font-normal text-[10px] lowercase">(optional)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsNewVendorModalOpen(true)}
                        className="text-[#006064] hover:underline font-bold text-[10.5px] cursor-pointer flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" /> + Register Vendor
                      </button>
                    </div>
                    <select
                      value={formData.vendorId || ""}
                      onChange={(e) => handleVendorSelect(e.target.value)}
                      className="w-full border border-gray-300 p-2 text-xs focus:outline-none focus:border-[#006064] cursor-pointer bg-white"
                    >
                      <option value="">-- Select Vendor (Optional) --</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.vendorName} {v.accountNo ? `(A/C: ${v.accountNo})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Expense Classification & Amount */}
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Expense Type / Category (Super Admin defined headers only - NO custom option) */}
                  <div>
                    <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Expense Type / Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, category: e.target.value }))
                      }
                      required
                      className="w-full border border-gray-300 p-2 text-xs focus:outline-none focus:border-[#006064] cursor-pointer bg-white font-medium"
                    >
                      {/* Strictly Super Admin Category Headers (plus existing record's category if editing an older record) */}
                      {Array.from(
                        new Set([
                          ...categoryHeaders,
                          ...(formData.category ? [formData.category] : []),
                        ])
                      ).map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-gray-400 mt-0.5 block">
                      Main expense categories are centrally managed by Super Admin.
                    </span>
                  </div>

                  {/* Payment Mode (Optional) */}
                  <div>
                    <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Payment Mode <span className="text-gray-400 font-normal text-[10px] lowercase">(optional)</span>
                    </label>
                    <select
                      value={formData.paymentMode}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, paymentMode: e.target.value }))
                      }
                      className="w-full border border-gray-300 p-2 text-xs focus:outline-none focus:border-[#006064] cursor-pointer bg-white"
                    >
                      <option value="">-- Select Payment Mode (Optional) --</option>
                      {PAYMENT_MODES.map((mode) => (
                        <option key={mode} value={mode}>
                          {mode}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Expense Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter full description of expense or bill"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    required
                    className="w-full border border-gray-300 p-2 text-xs focus:outline-none focus:border-[#006064]"
                  />
                </div>

                {/* Amount (₹) */}
                <div>
                  <label className="block font-bold text-gray-900 uppercase tracking-wider mb-1">
                    Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="e.g. 5400"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, amount: e.target.value }))
                    }
                    required
                    className="w-full border border-[#006064] p-2 text-sm font-bold text-gray-900 bg-cyan-50/40 focus:outline-none"
                  />
                </div>
              </div>

              {/* Section 3: Receipt Ref, 2 Attachment Options (Receipt Attach & Document Attach) & Remarks */}
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Receipt / Ref # */}
                  <div>
                    <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Receipt / Ref #
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. REC-089 / CASH-MEMO-12"
                      value={formData.receiptNo}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, receiptNo: e.target.value }))
                      }
                      className="w-full border border-gray-300 p-2 text-xs focus:outline-none focus:border-[#006064]"
                    />
                  </div>

                  {/* Attachment Option 1: Receipt Attach (slip/voucher) */}
                  <div>
                    <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>Receipt Attach</span>
                      <span className="text-[10px] text-gray-400 font-normal lowercase">(slip/voucher)</span>
                    </label>
                    <input
                      type="file"
                      ref={receiptFileInputRef}
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, "receipt");
                      }}
                    />
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => receiptFileInputRef.current?.click()}
                        disabled={uploadingReceipt}
                        className="w-full bg-white hover:bg-amber-50 border border-amber-300 text-amber-900 px-3 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      >
                        <Paperclip
                          className={`w-3.5 h-3.5 text-amber-700 ${
                            uploadingReceipt ? "animate-spin" : ""
                          }`}
                        />
                        <span>{uploadingReceipt ? "Uploading..." : "Attach Receipt"}</span>
                      </button>

                      {formData.attachmentUrl && (
                        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 px-2 py-1 text-[11px]">
                          <a
                            href={formData.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-900 hover:underline font-bold flex items-center gap-1 truncate"
                            title="View Attached Receipt"
                          >
                            <Receipt className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            <span className="truncate">Receipt Attached</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, attachmentUrl: "" }))}
                            className="text-gray-400 hover:text-red-600 text-xs ml-1 cursor-pointer font-bold px-1"
                            title="Remove Receipt"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Attachment Option 2: Document / Bill Proof Attach (Operational Bill / Proof PDF) */}
                  <div>
                    <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>Document / Bill Proof</span>
                      <span className="text-[10px] text-gray-400 font-normal lowercase">(bill PDF/proof)</span>
                    </label>
                    <input
                      type="file"
                      ref={invoiceFileInputRef}
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, "invoice");
                      }}
                    />
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => invoiceFileInputRef.current?.click()}
                        disabled={uploadingInvoice}
                        className="w-full bg-white hover:bg-cyan-50 border border-[#006064]/40 text-[#006064] px-3 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      >
                        <FileText
                          className={`w-3.5 h-3.5 text-[#006064] ${
                            uploadingInvoice ? "animate-spin" : ""
                          }`}
                        />
                        <span>{uploadingInvoice ? "Uploading..." : "Attach Bill / Doc"}</span>
                      </button>

                      {formData.invoiceUrl && (
                        <div className="flex items-center justify-between bg-cyan-50 border border-cyan-200 px-2 py-1 text-[11px]">
                          <a
                            href={formData.invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#006064] hover:underline font-bold flex items-center gap-1 truncate"
                            title="View Attached Operational Bill / Proof Document"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#006064] shrink-0" />
                            <span className="truncate">Doc / Bill Attached</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, invoiceUrl: "" }))}
                            className="text-gray-400 hover:text-red-600 text-xs ml-1 cursor-pointer font-bold px-1"
                            title="Remove Document"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-gray-400 italic">
                  * Operational expense documents attached by CM or Staff. Official Vendor Tax Invoices are uploaded by Accountant in Step 2: Payment Details.
                </p>

                {/* Remarks */}
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Remarks
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter any additional remarks or notes"
                    value={formData.remarks}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, remarks: e.target.value }))
                    }
                    className="w-full border border-gray-300 p-2 text-xs focus:outline-none focus:border-[#006064]"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-2 sticky bottom-0 bg-white py-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-600 hover:bg-gray-100 border border-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingForm}
                  className="bg-[#006064] hover:bg-[#00838f] text-white px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {savingForm
                      ? "Submitting..."
                      : editingRecord
                      ? "Update Expense Entry"
                      : "Submit Expense (Sent to Accounts)"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL 2: SUPER ADMIN REVIEW & APPROVAL DISBURSEMENT ── */}
      {mounted && typeof document !== "undefined" && approvingRecord && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-gray-300 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-[#006064] text-white sticky top-0 z-10">
              <div className="flex items-center gap-2">
                {approvingRecord.approvalStatus === "APPROVED" ? (
                  <CreditCard className="w-5 h-5 text-cyan-200" />
                ) : (
                  <ShieldCheck className="w-5 h-5" />
                )}
                <div>
                  <h3 className="text-sm font-display font-black uppercase tracking-wide">
                    {approvingRecord.approvalStatus === "APPROVED"
                      ? "Record Disbursal & UTR Details (Super Admin Approved)"
                      : "Super Admin: Approve & Disburse Vendor Payment"}
                  </h3>
                  <p className="text-[11px] text-cyan-100 font-sans">
                    {approvingRecord.approvalStatus === "APPROVED"
                      ? "Accountant Payment Disbursal, UTR Number & Vendor Confirmation Advice"
                      : "Super Admin Review & Payment Authorization Desk"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setApprovingRecord(null)}
                className="p-1 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApproveAndPay} className="p-5 space-y-4 text-xs">
              {/* Summary Card */}
              <div className="bg-cyan-50/50 p-3.5 border border-cyan-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                    Vendor Payment Requisition
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 border ${
                      approvingRecord.approvalStatus === "APPROVED"
                        ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                        : "bg-amber-100 text-amber-900 border-amber-300"
                    }`}
                  >
                    {approvingRecord.approvalStatus === "APPROVED"
                      ? "APPROVED ✓ (AWAITING DISBURSAL)"
                      : "PENDING APPROVAL"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                  <div>
                    <span className="text-gray-500 block">Vendor Name:</span>
                    <strong className="text-gray-900">{approvingRecord.vendorName || "Direct Bill"}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Center Location:</span>
                    <strong className="text-gray-900">{approvingRecord.locationName || "HQ"}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Bank A/C No:</span>
                    <strong className="font-mono text-gray-900">
                      {approvingRecord.accountNo || "Check Bank Records"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Total Amount:</span>
                    <strong className="text-sm font-display font-black text-[#006064]">
                      {formatCurrency(approvingRecord.amount)}
                    </strong>
                  </div>
                </div>

                <div className="text-[11px] text-gray-600 pt-1 border-t border-cyan-100">
                  <span className="font-bold text-gray-700">Description:</span> {approvingRecord.description}
                </div>

                {approvingRecord.invoiceUrl && (
                  <div className="pt-1">
                    <a
                      href={approvingRecord.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#006064] hover:underline font-bold text-[11px] flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Click to Preview Vendor Invoice PDF</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Settlement Inputs */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Payment Settlement Date */}
                  <div>
                    <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Payment Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={approvalData.paymentDate}
                      onChange={(e) =>
                        setApprovalData((prev) => ({ ...prev, paymentDate: e.target.value }))
                      }
                      required
                      className="w-full border border-gray-300 p-2 text-xs focus:outline-none focus:border-[#006064]"
                    />
                  </div>

                  {/* Payment Mode */}
                  <div>
                    <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Payment Mode <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={approvalData.paymentMode}
                      onChange={(e) =>
                        setApprovalData((prev) => ({ ...prev, paymentMode: e.target.value }))
                      }
                      className="w-full border border-gray-300 p-2 text-xs focus:outline-none focus:border-[#006064]"
                    >
                      {PAYMENT_MODES.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* UTR / Transaction No. */}
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                    UTR / Transaction Reference Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter bank transaction UTR (e.g. UTR192837465)"
                    value={approvalData.utrNumber}
                    onChange={(e) =>
                      setApprovalData((prev) => ({ ...prev, utrNumber: e.target.value }))
                    }
                    required
                    className="w-full border border-[#006064] p-2 text-xs font-mono font-bold focus:outline-none bg-cyan-50/30 text-gray-900"
                  />
                </div>

                {/* Upload Payment Proof */}
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Upload Payment Proof / UTR Screenshot
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={proofFileInputRef}
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, "proof");
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => proofFileInputRef.current?.click()}
                      disabled={uploadingProof}
                      className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 px-3 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Upload
                        className={`w-3.5 h-3.5 text-[#006064] ${
                          uploadingProof ? "animate-spin" : ""
                        }`}
                      />
                      <span>{uploadingProof ? "Uploading..." : "Upload Proof Doc"}</span>
                    </button>

                    {approvalData.paymentProofUrl && (
                      <a
                        href={approvalData.paymentProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 hover:underline font-bold text-[11px] flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Uploaded Proof Attached</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Approval Remarks */}
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Approval Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Approved and settled through HDFC Corporate Account"
                    value={approvalData.approvalRemarks}
                    onChange={(e) =>
                      setApprovalData((prev) => ({ ...prev, approvalRemarks: e.target.value }))
                    }
                    className="w-full border border-gray-300 p-2 text-xs focus:outline-none focus:border-[#006064]"
                  />
                </div>

                {/* Send Alert Email to t6565154@gmail.com */}
                <div className="bg-emerald-50 p-3 border border-emerald-200 flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="sendAlertEmailCheck"
                    checked={approvalData.sendAlertEmail}
                    onChange={(e) =>
                      setApprovalData((prev) => ({ ...prev, sendAlertEmail: e.target.checked }))
                    }
                    className="mt-0.5 w-4 h-4 text-[#006064] accent-[#006064] cursor-pointer"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="sendAlertEmailCheck"
                      className="text-[11.5px] text-gray-800 font-medium cursor-pointer block"
                    >
                      <strong>Send Vendor Payment Advice Email Notification</strong>
                      <span className="block text-[10.5px] text-gray-500 mt-0.5">
                        An automated transactional payment confirmation with full invoice breakdown & UTR details will be dispatched immediately.
                      </span>
                    </label>
                    {approvalData.sendAlertEmail && (
                      <div className="mt-2">
                        <label className="block text-[10.5px] font-bold text-gray-700 uppercase mb-0.5 font-mono">
                          Recipient Vendor / Accounts Email:
                        </label>
                        <input
                          type="email"
                          value={approvalData.alertEmailRecipient}
                          onChange={(e) =>
                            setApprovalData((prev) => ({
                              ...prev,
                              alertEmailRecipient: e.target.value,
                            }))
                          }
                          placeholder="vendor@company.com"
                          className="w-full border border-gray-300 p-1.5 text-xs bg-white focus:outline-none focus:border-[#006064]"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setApprovingRecord(null)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-600 hover:bg-gray-100 border border-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={approving}
                  className="bg-[#006064] hover:bg-[#00838f] text-white px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {approving
                      ? "Recording & Dispatching..."
                      : approvingRecord.approvalStatus === "APPROVED"
                      ? "Record Payment Disbursal & Send Alert"
                      : "Confirm Approval & Disburse"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL 3: INLINE QUICK-ADD VENDOR (MANDATORY MOBILE & EMAIL) ── */}
      {mounted && typeof document !== "undefined" && isNewVendorModalOpen && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-gray-300 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-[#006064] text-white sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                <h3 className="text-sm font-display font-black uppercase tracking-wide">
                  Quick Add Vendor (Instant Registration)
                </h3>
              </div>
              <button
                onClick={() => setIsNewVendorModalOpen(false)}
                className="p-1 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewVendorInline} className="p-5 space-y-4 text-xs">
              {/* Vendor Name */}
              <div>
                <label className="block font-bold text-gray-800 uppercase tracking-wider mb-1">
                  Vendor / Supplier Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Services Pvt Ltd"
                  value={newVendorForm.vendorName}
                  onChange={(e) =>
                    setNewVendorForm((prev) => ({ ...prev, vendorName: e.target.value }))
                  }
                  className="w-full border border-gray-300 p-2 text-xs font-semibold focus:outline-none focus:border-[#006064]"
                />
              </div>

              {/* Mobile & Email in 2 columns (STRICTLY MANDATORY) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Mobile */}
                <div>
                  <label className="block font-bold text-gray-800 uppercase tracking-wider mb-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9876543210"
                      maxLength={13}
                      value={newVendorForm.mobileNo}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9+\s-]/g, "");
                        setNewVendorForm((prev) => ({ ...prev, mobileNo: val }));
                        if (newVendorErrors.mobileNo) {
                          setNewVendorErrors((prev) => ({
                            ...prev,
                            mobileNo: validateInlineMobile(val),
                          }));
                        }
                      }}
                      onBlur={() => {
                        setNewVendorErrors((prev) => ({
                          ...prev,
                          mobileNo: validateInlineMobile(newVendorForm.mobileNo),
                        }));
                      }}
                      className={`w-full pl-8 pr-3 py-2 text-xs border ${
                        newVendorErrors.mobileNo
                          ? "border-red-500 bg-red-50/20"
                          : "border-gray-300 focus:border-[#006064]"
                      } font-mono`}
                    />
                  </div>
                  {newVendorErrors.mobileNo && (
                    <span className="text-[10px] text-red-600 mt-0.5 block font-medium">
                      {newVendorErrors.mobileNo}
                    </span>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block font-bold text-gray-800 uppercase tracking-wider mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. accounts@vendor.com"
                      value={newVendorForm.email}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewVendorForm((prev) => ({ ...prev, email: val }));
                        if (newVendorErrors.email) {
                          setNewVendorErrors((prev) => ({
                            ...prev,
                            email: validateInlineEmail(val),
                          }));
                        }
                      }}
                      onBlur={() => {
                        setNewVendorErrors((prev) => ({
                          ...prev,
                          email: validateInlineEmail(newVendorForm.email),
                        }));
                      }}
                      className={`w-full pl-8 pr-3 py-2 text-xs border ${
                        newVendorErrors.email
                          ? "border-red-500 bg-red-50/20"
                          : "border-gray-300 focus:border-[#006064]"
                      }`}
                    />
                  </div>
                  {newVendorErrors.email && (
                    <span className="text-[10px] text-red-600 mt-0.5 block font-medium">
                      {newVendorErrors.email}
                    </span>
                  )}
                </div>
              </div>

              {/* Bank A/C No & IFSC */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Bank A/C No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 50100234567890"
                    value={newVendorForm.accountNo}
                    onChange={(e) =>
                      setNewVendorForm((prev) => ({ ...prev, accountNo: e.target.value }))
                    }
                    className="w-full border border-gray-300 p-2 text-xs font-mono focus:outline-none focus:border-[#006064]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC0001234"
                    value={newVendorForm.ifscCode}
                    onChange={(e) =>
                      setNewVendorForm((prev) => ({
                        ...prev,
                        ifscCode: e.target.value.toUpperCase(),
                      }))
                    }
                    className="w-full border border-gray-300 p-2 text-xs font-mono uppercase focus:outline-none focus:border-[#006064]"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Full Address
                </label>
                <textarea
                  rows={2}
                  placeholder="Vendor office address"
                  value={newVendorForm.address}
                  onChange={(e) =>
                    setNewVendorForm((prev) => ({ ...prev, address: e.target.value }))
                  }
                  className="w-full border border-gray-300 p-2 text-xs focus:outline-none focus:border-[#006064]"
                />
              </div>

              {/* GSTIN & PAN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    value={newVendorForm.gstin}
                    onChange={(e) =>
                      setNewVendorForm((prev) => ({
                        ...prev,
                        gstin: e.target.value.toUpperCase(),
                      }))
                    }
                    className="w-full border border-gray-300 p-2 text-xs font-mono uppercase focus:outline-none focus:border-[#006064]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                    PAN
                  </label>
                  <input
                    type="text"
                    value={newVendorForm.pan}
                    onChange={(e) =>
                      setNewVendorForm((prev) => ({
                        ...prev,
                        pan: e.target.value.toUpperCase(),
                      }))
                    }
                    className="w-full border border-gray-300 p-2 text-xs font-mono uppercase focus:outline-none focus:border-[#006064]"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewVendorModalOpen(false)}
                  className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-600 hover:bg-gray-100 border border-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNewVendor}
                  className="bg-[#006064] hover:bg-[#00838f] text-white px-5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{savingNewVendor ? "Registering..." : "Save & Select Vendor"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL 4: ACCOUNTANT ENTER VENDOR & BILLING BREAKDOWN (STEP 2) ── */}
      {mounted && typeof document !== "undefined" && settlingRecord && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-gray-300 w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-[#004d40] text-white sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="text-sm font-display font-black uppercase tracking-wide">
                    Step 2: Enter Vendor & Billing Breakdown Against Expense #{settlingRecord.id}
                  </h3>
                  <p className="text-[11px] text-emerald-200">
                    Accountant: Record vendor details, invoice breakdown & bank portal status. Super Admin will approve and authorize disbursal.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSettlingRecord(null)}
                className="p-1 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickSettle} className="p-5 space-y-4 text-xs">
              {/* Context Summary Card */}
              <div className="bg-emerald-50/50 p-3.5 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-800 font-bold">
                    Center Expense Bill Details
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-white text-emerald-800 border border-emerald-300">
                    {settlingRecord.locationName || "Center"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11.5px]">
                  <div>
                    <span className="text-gray-500 block text-[10.5px]">Expense Category:</span>
                    <strong className="text-gray-900">{settlingRecord.category || "GENERAL"}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10.5px]">Expense Date:</span>
                    <strong className="text-gray-900">
                      {settlingRecord.expenseDateStr ||
                        (settlingRecord.expenseDate
                          ? new Date(settlingRecord.expenseDate).toLocaleDateString("en-GB")
                          : "-")}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10.5px]">Total Bill Amount:</span>
                    <strong className="text-sm font-display font-black text-emerald-700">
                      {formatCurrency(settlingRecord.amount)}
                    </strong>
                  </div>
                </div>

                <div className="text-[11.5px] text-gray-700 pt-1 border-t border-cyan-100">
                  <span className="font-bold text-gray-900">Description:</span> {settlingRecord.description}
                </div>
                <div className="pt-1">
                  {renderEnteredByBadge(settlingRecord)}
                </div>

                {/* CM Uploaded Attachments (Receipt & Invoice PDF) */}
                {((settlingRecord.invoiceUrl && !settlingRecord.invoiceUrl.includes("undefined")) ||
                  (settlingRecord.attachmentUrl && !settlingRecord.attachmentUrl.includes("undefined"))) && (
                  <div className="pt-1.5 flex flex-wrap items-center gap-2">
                    {settlingRecord.attachmentUrl && !settlingRecord.attachmentUrl.includes("undefined") && (
                      <a
                        href={settlingRecord.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-amber-900 hover:underline font-bold text-[11px] bg-white px-2.5 py-1 border border-amber-300 shadow-2xs"
                      >
                        <Receipt className="w-3.5 h-3.5 text-amber-700" />
                        <span>View CM's Receipt Slip</span>
                      </a>
                    )}
                    {settlingRecord.invoiceUrl && !settlingRecord.invoiceUrl.includes("undefined") && (
                      <a
                        href={settlingRecord.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[#006064] hover:underline font-bold text-[11px] bg-white px-2.5 py-1 border border-cyan-300 shadow-2xs"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#006064]" />
                        <span>View CM's Attached Document / Bill Proof</span>
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Form Section 1: Invoice Number & Dates */}
              <div className="space-y-3 pt-1">
                <h4 className="font-mono font-bold text-[11px] uppercase tracking-wider text-emerald-900 border-b border-gray-100 pb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" /> 1. Invoice Number (Inv No) & Dates
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Inv No (Invoice / Bill Number)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. INV-2026-089 / BILL-998"
                      value={settleData.receiptNo}
                      onChange={(e) =>
                        setSettleData((prev) => ({ ...prev, receiptNo: e.target.value }))
                      }
                      className="w-full border border-gray-300 p-2 text-xs font-mono font-bold focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Expense Date (Entry Date)
                    </label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={
                        settlingRecord.expenseDateStr ||
                        (settlingRecord.expenseDate
                          ? new Date(settlingRecord.expenseDate).toLocaleDateString("en-GB")
                          : "-")
                      }
                      className="w-full border border-gray-200 bg-gray-50 p-2 text-xs font-mono text-gray-600 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-emerald-800 uppercase tracking-wider mb-1">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      value={settleData.payReceiveDate || ""}
                      onChange={(e) =>
                        setSettleData((prev) => ({ ...prev, payReceiveDate: e.target.value }))
                      }
                      className="w-full border border-emerald-400 bg-emerald-50/40 p-2 text-xs font-mono font-bold text-emerald-950 focus:outline-none focus:border-emerald-600 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Form Section 2: Vendor Selection & Bank A/C */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-gray-100 pb-1">
                  <h4 className="font-mono font-bold text-[11px] uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" /> 2. Vendor Name (with Vendor Registration)
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setNewVendorForm({
                        vendorName: "",
                        mobileNo: "",
                        email: "",
                        accountNo: "",
                        ifscCode: "",
                        address: "",
                        locationName: settlingRecord.locationName || "",
                        gstin: "",
                        pan: "",
                      });
                      setNewVendorErrors({});
                      setIsNewVendorModalOpen(true);
                    }}
                    className="text-emerald-700 hover:text-emerald-900 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Create Vendor Registration</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Vendor Dropdown */}
                  <div>
                    <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Select Vendor (from Vendor Master)
                    </label>
                    <select
                      value={settleData.vendorId}
                      onChange={(e) => handleSettleVendorSelect(e.target.value)}
                      className="w-full border border-gray-300 p-2 text-xs focus:outline-none focus:border-emerald-600 cursor-pointer"
                    >
                      <option value="">-- Select Vendor --</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.vendorName} {v.accountNo ? `(A/C: ${v.accountNo})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Bank A/C No */}
                  <div>
                    <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Vendor Bank A/C No.
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 50100492819283"
                      value={settleData.accountNo}
                      onChange={(e) =>
                        setSettleData((prev) => ({ ...prev, accountNo: e.target.value }))
                      }
                      className="w-full border border-gray-300 p-2 text-xs font-mono focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                {/* IFSC Code & Bank Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC0001234"
                      value={settleData.ifscCode}
                      onChange={(e) =>
                        setSettleData((prev) => ({ ...prev, ifscCode: e.target.value.toUpperCase() }))
                      }
                      className="w-full border border-gray-300 p-2 text-xs font-mono uppercase focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC Bank, Connaught Place"
                      value={settleData.bankName}
                      onChange={(e) =>
                        setSettleData((prev) => ({ ...prev, bankName: e.target.value }))
                      }
                      className="w-full border border-gray-300 p-2 text-xs focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Form Section 3: Description, Qty, A/U, Rate, Amt */}
              <div className="space-y-3 pt-2">
                <h4 className="font-mono font-bold text-[11px] uppercase tracking-wider text-emerald-900 border-b border-gray-100 pb-1 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-600" /> 3. Description, Qty, A/U, Rate & Amount
                </h4>

                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1 text-[10px]">
                    Description / Bill Specifics
                  </label>
                  <input
                    type="text"
                    value={settleData.description}
                    onChange={(e) =>
                      setSettleData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Enter detailed description"
                    className="w-full border border-gray-300 p-2 text-xs focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-gray-50 p-2.5 border border-gray-200">
                  {/* Qty */}
                  <div>
                    <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1 text-[10px]">
                      Qty (Quantity)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      placeholder="1"
                      value={settleData.quantity}
                      onChange={(e) => handleSettleQtyChange(e.target.value)}
                      className="w-full border border-gray-300 p-1.5 text-xs bg-white font-mono focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  {/* A/U (Unit of Measurement) */}
                  <div>
                    <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1 text-[10px]">
                      A/U (Unit)
                    </label>
                    <select
                      value={settleData.unit}
                      onChange={(e) =>
                        setSettleData((prev) => ({ ...prev, unit: e.target.value }))
                      }
                      className="w-full border border-gray-300 p-1.5 text-xs bg-white focus:outline-none focus:border-emerald-600"
                    >
                      {COMMON_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Rate */}
                  <div>
                    <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1 text-[10px]">
                      Rate (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 1500"
                      value={settleData.rate}
                      onChange={(e) => handleSettleRateChange(e.target.value)}
                      className="w-full border border-gray-300 p-1.5 text-xs bg-white font-mono focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  {/* Amount (Amt) */}
                  <div>
                    <label className="block font-bold text-gray-900 uppercase tracking-wider mb-1 text-[10px]">
                      Amt (Amount ₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={settleData.amount}
                      onChange={(e) =>
                        setSettleData((prev) => ({ ...prev, amount: e.target.value }))
                      }
                      className="w-full border border-emerald-600 p-1.5 text-xs font-bold text-gray-900 bg-emerald-50/40 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Form Section 4: Upload Inv, Bank Portal Checkbox, Remarks */}
              <div className="space-y-3 pt-2">
                <h4 className="font-mono font-bold text-[11px] uppercase tracking-wider text-emerald-900 border-b border-gray-100 pb-1 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-emerald-600" /> 4. UPLOAD VENDOR TAX INVOICE & BANK PORTAL STATUS (ACCOUNTANT STEP)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  {/* Upload Inv */}
                  <div>
                    <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Official Vendor Tax Invoice PDF <span className="text-gray-400 font-normal text-[10px] lowercase">(Accountant Step)</span>
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="file"
                        ref={settleInvoiceFileInputRef}
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, "settleInvoice");
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => settleInvoiceFileInputRef.current?.click()}
                        disabled={uploadingInvoice}
                        className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 px-3 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Upload
                          className={`w-3.5 h-3.5 text-emerald-600 ${
                            uploadingInvoice ? "animate-spin" : ""
                          }`}
                        />
                        <span>{uploadingInvoice ? "Uploading..." : "Upload Inv PDF"}</span>
                      </button>

                      {settleData.vendorInvoiceUrl ? (
                        <div className="flex items-center gap-1.5 bg-emerald-50 px-2 py-1 border border-emerald-300">
                          <a
                            href={settleData.vendorInvoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-800 hover:underline font-bold text-[11px] flex items-center gap-1 truncate"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-700" />
                            <span>View Uploaded Tax Inv</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => setSettleData((prev) => ({ ...prev, vendorInvoiceUrl: "" }))}
                            className="text-gray-400 hover:text-rose-600 text-xs font-bold ml-1 cursor-pointer"
                            title="Remove uploaded invoice"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10.5px] text-gray-400 italic">No official tax invoice uploaded yet</span>
                      )}
                    </div>
                  </div>

                  {/* Upload in Bank portal (with a checkbox below) */}
                  <div className="bg-cyan-50/50 p-2.5 border border-cyan-200">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id="modalBankPortalCheck"
                        checked={settleData.uploadedInBankPortal}
                        onChange={(e) =>
                          setSettleData((prev) => ({ ...prev, uploadedInBankPortal: e.target.checked }))
                        }
                        className="mt-0.5 w-4 h-4 accent-[#006064] cursor-pointer"
                      />
                      <label
                        htmlFor="modalBankPortalCheck"
                        className="text-[11px] text-gray-800 font-semibold cursor-pointer"
                      >
                        Upload in Bank portal
                        <span className="block text-[10px] text-gray-500 font-normal mt-0.5">
                          Check this once bill beneficiary is uploaded to corporate bank portal
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Accountant Notes / Remarks
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter any internal accounts notes or billing notes"
                    value={settleData.remarks}
                    onChange={(e) =>
                      setSettleData((prev) => ({ ...prev, remarks: e.target.value }))
                    }
                    className="w-full border border-gray-300 p-2 text-xs focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Form Section 5: Disbursal / UTR Entry (UNLOCKED AFTER APPROVAL) */}
              {(settlingRecord.approvalStatus === "APPROVED" || settlingRecord.paymentStatus === "PAID") ? (
                <div className="space-y-3 pt-2 bg-emerald-50/60 p-3.5 border border-emerald-200">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-1.5">
                    <h4 className="font-mono font-bold text-[11px] uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 5. Super Admin Approved — Disbursal & UTR Details
                    </h4>
                    <span className="bg-emerald-600 text-white text-[9.5px] font-mono px-2 py-0.5 font-bold uppercase">
                      Approved ✓
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* UTR No */}
                    <div>
                      <label className="block font-bold text-gray-800 uppercase tracking-wider mb-1 text-[10.5px]">
                        UTR No / Bank Ref # *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. UTR123456789"
                        value={settleData.utrNumber}
                        onChange={(e) => setSettleData((prev) => ({ ...prev, utrNumber: e.target.value }))}
                        className="w-full border border-gray-300 p-1.5 text-xs bg-white font-mono font-bold focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    {/* Payment Date */}
                    <div>
                      <label className="block font-bold text-gray-800 uppercase tracking-wider mb-1 text-[10.5px]">
                        Payment Date
                      </label>
                      <input
                        type="date"
                        value={settleData.utrDate}
                        onChange={(e) => setSettleData((prev) => ({ ...prev, utrDate: e.target.value }))}
                        className="w-full border border-gray-300 p-1.5 text-xs bg-white font-mono focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    {/* Payment Mode */}
                    <div>
                      <label className="block font-bold text-gray-800 uppercase tracking-wider mb-1 text-[10.5px]">
                        Disbursal Mode
                      </label>
                      <select
                        value={settleData.accPaymentMode}
                        onChange={(e) => setSettleData((prev) => ({ ...prev, accPaymentMode: e.target.value }))}
                        className="w-full border border-gray-300 p-1.5 text-xs bg-white focus:outline-none focus:border-emerald-600"
                      >
                        <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                        <option value="IMPS">IMPS</option>
                        <option value="UPI">UPI</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Cash">Cash</option>
                      </select>
                    </div>
                  </div>

                  {/* Send Alert Email to Vendor */}
                  <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-emerald-900">
                      <input
                        type="checkbox"
                        checked={settleData.sendAlertEmail}
                        onChange={(e) => setSettleData((prev) => ({ ...prev, sendAlertEmail: e.target.checked }))}
                        className="w-4 h-4 accent-emerald-700 cursor-pointer"
                      />
                      <span>Send Alert / confirmation email to vendor upon saving UTR</span>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 p-3 border border-amber-200 flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-amber-900 leading-snug">
                    <strong>Approval Workflow Notice:</strong>
                    <p className="mt-0.5 text-amber-800">
                      UTR No., Payment Date, and Send email to vendor will take place after Super Admin Approval. Before approval, they remain strictly locked.
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2 sticky bottom-0 bg-white py-2">
                <button
                  type="button"
                  onClick={() => setSettlingRecord(null)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-600 hover:bg-gray-100 border border-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingForm}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {savingForm
                      ? "Saving..."
                      : (settlingRecord.approvalStatus === "APPROVED" || settlingRecord.paymentStatus === "PAID")
                      ? "Save & Update Payment Details"
                      : "Submit Bill & Send for Super Admin Approval"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL 5: SUPER ADMIN DEDICATED APPROVALS MODAL ── */}
      {mounted && typeof document !== "undefined" && isApprovalsModalOpen && isAdmin && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-gray-300 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-[#006064] text-white sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5" />
                <div>
                  <h3 className="text-sm font-display font-black uppercase tracking-wide flex items-center gap-2">
                    <span>Super Admin: Expense Approvals & Payment Authorization</span>
                    <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {allPendingApprovals.length} Pending
                    </span>
                  </h3>
                  <p className="text-[11px] text-cyan-100">
                    Review vendor billing details across all centers submitted by Accountant. Approving unlocks UTR entry, Payment Date, and Vendor alert email.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsApprovalsModalOpen(false)}
                className="p-1 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Approvals List */}
            <div className="p-5 space-y-4">
              {allPendingApprovals.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
                  <p className="text-sm font-semibold text-gray-700">
                    All expense requisitions have been approved!
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    No pending approval requests at this time.
                  </p>
                </div>
              ) : (
                allPendingApprovals.map((rec) => (
                  <div
                    key={rec.id}
                    className="border border-gray-200 bg-[#fbfcfd] p-4 space-y-3 shadow-2xs hover:border-[#006064]/50 transition-colors"
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-gray-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-gray-500">
                          #{rec.id}
                        </span>
                        <span className="text-xs font-bold text-gray-900 bg-white px-2 py-0.5 border border-gray-300">
                          {rec.locationName || "Center"}
                        </span>
                        <span className="text-[10px] font-mono text-gray-500">
                          {rec.expenseDateStr ||
                            (rec.expenseDate
                              ? new Date(rec.expenseDate).toLocaleDateString("en-GB")
                              : "-")}
                        </span>
                        <span className="px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider bg-cyan-50 text-[#006064] border border-cyan-200">
                          {rec.category || "GENERAL"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm font-display font-black text-[#006064]">
                          {formatCurrency(rec.amount)}
                        </span>
                        <span className="px-2 py-0.5 text-[9.5px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                          Pending SA Approval
                        </span>
                      </div>
                    </div>

                    {/* Attribution */}
                    <div className="pt-0.5">
                      {renderEnteredByBadge(rec)}
                    </div>

                    {/* Description */}
                    <div className="text-xs text-gray-800">
                      <strong className="text-gray-900">Description:</strong> {rec.description}
                    </div>

                    {/* Accountant Prepared Billing Details */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-2.5 border border-gray-200 text-[11px]">
                      <div>
                        <span className="text-gray-400 block text-[10px] uppercase font-mono">
                          Vendor Name
                        </span>
                        <strong className="text-gray-900 truncate block">
                          {rec.vendorName || "Not Assigned"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px] uppercase font-mono">
                          Bank A/C No.
                        </span>
                        <span className="font-mono text-gray-800">
                          {rec.accountNo || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px] uppercase font-mono">
                          Qty & A/U
                        </span>
                        <span className="text-gray-800 font-mono">
                          {rec.quantity || 1} {rec.unit || "Nos"}
                          {rec.rate ? ` @ ₹${rec.rate}` : ""}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px] uppercase font-mono">
                          Bank Portal
                        </span>
                        <span
                          className={`font-bold ${
                            rec.uploadedInBankPortal
                              ? "text-emerald-700"
                              : "text-gray-500"
                          }`}
                        >
                          {rec.uploadedInBankPortal ? "Uploaded ✓" : "Pending"}
                        </span>
                      </div>
                    </div>

                    {/* Attached Documents */}
                    {((rec.attachmentUrl && !rec.attachmentUrl.includes("undefined")) ||
                      (rec.invoiceUrl && !rec.invoiceUrl.includes("undefined"))) && (
                      <div className="flex items-center gap-3 pt-1">
                        {rec.attachmentUrl && !rec.attachmentUrl.includes("undefined") && (
                          <a
                            href={rec.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 border border-amber-200"
                          >
                            <Receipt className="w-3 h-3 text-amber-700" />
                            <span>CM Receipt Slip</span>
                          </a>
                        )}
                        {rec.invoiceUrl && !rec.invoiceUrl.includes("undefined") && (
                          <a
                            href={rec.invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#006064] bg-cyan-50 hover:bg-cyan-100 px-2 py-0.5 border border-cyan-200"
                          >
                            <FileText className="w-3 h-3 text-[#006064]" />
                            <span>Vendor Invoice PDF</span>
                          </a>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openApproveModal(rec)}
                        className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-white text-gray-700 hover:bg-gray-100 border border-gray-300 transition-all cursor-pointer flex items-center gap-1"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-[#006064]" />
                        <span>Approve & Record UTR Now</span>
                      </button>

                      <button
                        type="button"
                        disabled={approving}
                        onClick={() => handleSuperAdminApprove(rec.id)}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        <span>Approve Expense (Authorize Disbursal)</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <span className="text-[11px] text-gray-500">
                Approvals notify the accountant and unlock UTR recording & vendor notification.
              </span>
              <button
                type="button"
                onClick={() => setIsApprovalsModalOpen(false)}
                className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-600 hover:bg-gray-200 border border-gray-300 cursor-pointer bg-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL 6: CM VIEW PAYMENT DETAILS MODAL ── */}
      {mounted && typeof document !== "undefined" && isViewPaymentModalOpen && viewingPaymentRecord && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-gray-300 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-[#006064] text-white sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-cyan-200" />
                <div>
                  <h3 className="text-sm font-display font-black uppercase tracking-wide">
                    Expense & Payment Settlement Details #{viewingPaymentRecord.id}
                  </h3>
                  <p className="text-[11px] text-cyan-100">
                    Full billing, approval & disbursal status for Community Manager
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsViewPaymentModalOpen(false)}
                className="p-1 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Center & Expense Summary */}
              <div className="bg-cyan-50/50 p-3.5 border border-cyan-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                    Center Expense Bill
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 bg-white text-[#006064] border border-cyan-300">
                    {viewingPaymentRecord.locationName || "Center"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11.5px]">
                  <div>
                    <span className="text-gray-500 block text-[10.5px]">Category:</span>
                    <strong className="text-gray-900">{viewingPaymentRecord.category || "GENERAL"}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10.5px]">Date:</span>
                    <strong className="text-gray-900">
                      {viewingPaymentRecord.expenseDateStr ||
                        (viewingPaymentRecord.expenseDate
                          ? new Date(viewingPaymentRecord.expenseDate).toLocaleDateString("en-GB")
                          : "-")}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10.5px]">Total Amount:</span>
                    <strong className="text-sm font-display font-black text-[#006064]">
                      {formatCurrency(viewingPaymentRecord.amount)}
                    </strong>
                  </div>
                </div>

                <div className="text-[11.5px] text-gray-700 pt-1 border-t border-cyan-100">
                  <span className="font-bold text-gray-900">Description:</span> {viewingPaymentRecord.description}
                </div>
                <div className="pt-1">
                  {renderEnteredByBadge(viewingPaymentRecord)}
                </div>

                {/* CM Documents */}
                {((viewingPaymentRecord.attachmentUrl && !viewingPaymentRecord.attachmentUrl.includes("undefined")) ||
                  (viewingPaymentRecord.invoiceUrl && !viewingPaymentRecord.invoiceUrl.includes("undefined"))) && (
                  <div className="pt-1.5 flex flex-wrap items-center gap-2">
                    {viewingPaymentRecord.attachmentUrl && !viewingPaymentRecord.attachmentUrl.includes("undefined") && (
                      <a
                        href={viewingPaymentRecord.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-amber-900 hover:underline font-bold text-[11px] bg-white px-2.5 py-1 border border-amber-300"
                      >
                        <Receipt className="w-3.5 h-3.5 text-amber-700" />
                        <span>Receipt Slip</span>
                      </a>
                    )}
                    {viewingPaymentRecord.invoiceUrl && !viewingPaymentRecord.invoiceUrl.includes("undefined") && (
                      <a
                        href={viewingPaymentRecord.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[#006064] hover:underline font-bold text-[11px] bg-white px-2.5 py-1 border border-cyan-300"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#006064]" />
                        <span>Vendor Bill PDF</span>
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Vendor & Bill Breakdown */}
              <div className="border border-gray-200 p-3.5 space-y-2 bg-white">
                <h4 className="font-mono font-bold text-[11px] uppercase tracking-wider text-gray-700 border-b border-gray-100 pb-1">
                  Vendor & Billing Breakdown (Entered by Accountant)
                </h4>

                <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                  <div>
                    <span className="text-gray-500 block text-[10.5px]">Vendor / Supplier:</span>
                    <strong className="text-gray-900">
                      {viewingPaymentRecord.vendorName || "Accounts to Assign"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10.5px]">Vendor Bank A/C:</span>
                    <span className="font-mono text-gray-900">
                      {viewingPaymentRecord.accountNo || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10.5px]">Invoice / Bill No:</span>
                    <span className="font-mono text-gray-900">
                      {viewingPaymentRecord.receiptNo || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10.5px]">Quantity & Unit:</span>
                    <span className="text-gray-900">
                      {viewingPaymentRecord.quantity || 1} {viewingPaymentRecord.unit || "Nos"}
                      {viewingPaymentRecord.rate ? ` (Rate: ₹${viewingPaymentRecord.rate})` : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10.5px]">Bank Portal Upload:</span>
                    <span
                      className={`font-bold ${
                        viewingPaymentRecord.uploadedInBankPortal
                          ? "text-emerald-700"
                          : "text-gray-500"
                      }`}
                    >
                      {viewingPaymentRecord.uploadedInBankPortal ? "Uploaded in Bank Portal ✓" : "Pending Upload"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Approval & Disbursal Status */}
              <div className="border border-gray-200 p-3.5 space-y-2 bg-white">
                <h4 className="font-mono font-bold text-[11px] uppercase tracking-wider text-gray-700 border-b border-gray-100 pb-1">
                  Super Admin Approval & Disbursal Status
                </h4>

                <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                  <div>
                    <span className="text-gray-500 block text-[10.5px]">Approval Status:</span>
                    {viewingPaymentRecord.approvalStatus === "APPROVED" || viewingPaymentRecord.paymentStatus === "PAID" ? (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approved by Super Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-bold text-amber-700">
                        <Clock className="w-3.5 h-3.5" /> Awaiting Super Admin Approval
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-gray-500 block text-[10.5px]">Payment Status:</span>
                    <span
                      className={`font-bold ${
                        viewingPaymentRecord.paymentStatus === "PAID"
                          ? "text-emerald-700"
                          : "text-amber-700"
                      }`}
                    >
                      {viewingPaymentRecord.paymentStatus === "PAID"
                        ? "Paid & Disbursed ✓"
                        : "Pending Payment"}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-500 block text-[10.5px]">UTR / Reference No:</span>
                    <span className="font-mono font-bold text-[#006064]">
                      {viewingPaymentRecord.utrNumber || "Locked until approval & disbursement"}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-500 block text-[10.5px]">Payment Date:</span>
                    <span className="text-gray-900">
                      {viewingPaymentRecord.utrDate || viewingPaymentRecord.payReceiveDate || "-"}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-500 block text-[10.5px]">Payment Mode:</span>
                    <span className="text-gray-900">
                      {viewingPaymentRecord.accPaymentMode || viewingPaymentRecord.paymentMode || "-"}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-500 block text-[10.5px]">Vendor Alert Email:</span>
                    <span
                      className={`font-bold ${
                        viewingPaymentRecord.alertEmailSent
                          ? "text-emerald-700"
                          : "text-gray-400"
                      }`}
                    >
                      {viewingPaymentRecord.alertEmailSent
                        ? "Dispatched to Vendor ✓"
                        : "Pending Disbursal"}
                    </span>
                  </div>
                </div>

                {viewingPaymentRecord.paymentProofUrl && (
                  <div className="pt-2 border-t border-gray-100">
                    <a
                      href={viewingPaymentRecord.paymentProofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-emerald-800 hover:underline font-bold text-[11px] bg-emerald-50 px-2.5 py-1 border border-emerald-300"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>View Payment Proof Doc / UTR Screenshot</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2">
                {(isAccountant || isAdmin) && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsViewPaymentModalOpen(false);
                      openSettleModal(viewingPaymentRecord);
                    }}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Payment Details</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsViewPaymentModalOpen(false)}
                  className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-100 border border-gray-300 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL: SUPER ADMIN MAIN EXPENSE CATEGORY HEADERS ── */}
      {mounted && typeof document !== "undefined" && isCategoryModalOpen && isAdmin && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-gray-300 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-[#37474f] text-white sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-cyan-300" />
                <div>
                  <h3 className="text-sm font-display font-black uppercase tracking-wide flex items-center gap-2">
                    <span>Main Expense Category Headers</span>
                    <span className="bg-cyan-900 text-cyan-200 text-[10px] px-2 py-0.5 font-mono border border-cyan-700">
                      Super Admin Only
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-300">
                    Define and control official expense categories for CMs & Accountants. CM and Accountant dropdowns will strictly use these headers.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setEditingCategoryOldName(null);
                  setEditingCategoryNewName("");
                  setNewCategoryName("");
                }}
                className="p-1 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 text-xs">
              {/* Section 1: Add New Category Header */}
              <div className="bg-slate-50 border border-slate-200 p-4 space-y-3">
                <h4 className="font-bold uppercase tracking-wider text-gray-800 text-[11px] flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-[#006064]" />
                  <span>Add New Category Header</span>
                </h4>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Enter category name (e.g. ELECTRICITY & UTILITIES, CAPEX, etc.)"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCategoryHeader();
                      }
                    }}
                    className="flex-1 bg-white border border-gray-300 p-2 text-xs font-bold uppercase text-gray-900 focus:outline-none focus:border-[#006064]"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCategoryHeader()}
                    disabled={savingCategory || !newCategoryName.trim()}
                    className="bg-[#006064] hover:bg-[#00838f] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50 whitespace-nowrap"
                  >
                    {savingCategory ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>Add Header</span>
                  </button>
                </div>

                {/* Suggestions Chips from Available / Common Categories */}
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500 font-bold block mb-1.5">
                    Quick Suggestion Chips (Click to Add):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_CATEGORY_HEADERS.map((sug) => {
                      const isAlreadyAdded = categoryHeaders.includes(sug);
                      return (
                        <button
                          key={sug}
                          type="button"
                          disabled={isAlreadyAdded || savingCategory}
                          onClick={() => handleAddCategoryHeader(sug)}
                          className={`text-[10.5px] px-2.5 py-1 font-bold transition-all border ${
                            isAlreadyAdded
                              ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                              : "bg-white text-[#006064] hover:bg-cyan-50 hover:border-[#006064] border-cyan-200 cursor-pointer shadow-2xs"
                          }`}
                          title={isAlreadyAdded ? "Already exists" : `Add "${sug}"`}
                        >
                          {isAlreadyAdded ? `✓ ${sug}` : `+ ${sug}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Section 2: Active Category Headers List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold uppercase tracking-wider text-gray-800 text-[11px] flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[#006064]" />
                    <span>Active Category Headers ({categoryHeaders.length})</span>
                  </h4>
                  <span className="text-[10.5px] text-gray-500 font-mono">
                    Visible to CM & Accountant in dropdown
                  </span>
                </div>

                <div className="border border-gray-200 divide-y divide-gray-100 bg-white max-h-[340px] overflow-y-auto">
                  {categoryHeaders.length === 0 ? (
                    <div className="p-6 text-center text-gray-400">
                      No category headers created yet. Click suggestions above to seed categories.
                    </div>
                  ) : (
                    categoryHeaders.map((cat, idx) => {
                      const isEditingThis = editingCategoryOldName === cat;
                      return (
                        <div
                          key={cat}
                          className="flex items-center justify-between p-2.5 hover:bg-slate-50 transition-colors"
                        >
                          {isEditingThis ? (
                            <div className="flex items-center gap-2 flex-1 mr-2">
                              <input
                                type="text"
                                value={editingCategoryNewName}
                                onChange={(e) => setEditingCategoryNewName(e.target.value.toUpperCase())}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleUpdateCategoryHeader(cat, editingCategoryNewName);
                                  } else if (e.key === "Escape") {
                                    setEditingCategoryOldName(null);
                                  }
                                }}
                                className="border border-[#006064] p-1.5 text-xs font-bold uppercase w-full bg-white text-gray-900 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateCategoryHeader(cat, editingCategoryNewName)}
                                disabled={savingCategory}
                                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[10.5px] font-bold uppercase cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCategoryOldName(null)}
                                className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-[10.5px] font-bold uppercase cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-[11px] text-gray-400 w-6">
                                {idx + 1}.
                              </span>
                              <span className="font-bold text-gray-900 text-xs tracking-wide truncate">
                                {cat}
                              </span>
                            </div>
                          )}

                          {!isEditingThis && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCategoryOldName(cat);
                                  setEditingCategoryNewName(cat);
                                }}
                                className="p-1 text-gray-500 hover:text-[#006064] hover:bg-cyan-50 border border-transparent hover:border-cyan-200 transition-all cursor-pointer"
                                title="Edit / Rename Category Header"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategoryHeader(cat)}
                                disabled={deletingCategoryName === cat}
                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all cursor-pointer disabled:opacity-40"
                                title="Delete Category Header"
                              >
                                {deletingCategoryName === cat ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-end bg-gray-50">
              <button
                type="button"
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setEditingCategoryOldName(null);
                  setEditingCategoryNewName("");
                  setNewCategoryName("");
                }}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-200 border border-gray-300 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── ICICI BANK STATEMENT MODAL (ACCOUNTANT & SUPER ADMIN ONLY) ── */}
      {(isAdmin || isAccountant) && (
        <BankStatementModal
          isOpen={isBankStatementOpen}
          onClose={() => setIsBankStatementOpen(false)}
          isAdmin={isAdmin}
          isAccountant={isAccountant}
        />
      )}
    </div>
  );
}
