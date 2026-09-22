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
  XCircle,
  Filter,
  ArrowUp,
  ArrowDown,
  Unlock,
  RotateCcw,
  EyeOff,
  SlidersHorizontal,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { BankStatementModal } from "./bank-statement-modal";
import { onOffSAApproval } from "@/lib/expense-approval-config";

export interface ExpenseColumnDef {
  id: string;
  label: string;
  defaultWidth: number;
  minWidth: number;
  align: "left" | "center" | "right";
  phase: "1" | "2" | "3";
  mono?: boolean;
}

export const formatExpenseDueDateDisplay = (dateInput?: string | Date | null): string => {
  if (!dateInput) return "-";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

export const formatTimestamp = (dateInput?: string | Date | null): string => {
  if (!dateInput) return "";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
};

export const formatShortTimestamp = (dateInput?: string | Date | null): string => {
  if (!dateInput) return "";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
};

export const CM_EXPENSE_COLUMNS: ExpenseColumnDef[] = [
  // ── PHASE 1: EXPENSE ENTERED (DETAILS & PROOF) ──
  { id: "index", label: "#", defaultWidth: 45, minWidth: 35, align: "center", phase: "1", mono: true },
  { id: "center", label: "Coworking Center", defaultWidth: 140, minWidth: 95, align: "left", phase: "1" },
  { id: "date", label: "Expense Date", defaultWidth: 110, minWidth: 70, align: "left", phase: "1" },
  { id: "dueDate", label: "Payment Due Date", defaultWidth: 145, minWidth: 95, align: "center", phase: "1" },
  { id: "vendor", label: "Vendor / Supplier", defaultWidth: 165, minWidth: 95, align: "left", phase: "1" },
  { id: "category", label: "Expense Category", defaultWidth: 160, minWidth: 95, align: "left", phase: "1" },
  { id: "paymentMode", label: "Payment Mode", defaultWidth: 115, minWidth: 75, align: "center", phase: "1" },
  { id: "description", label: "Expense Description", defaultWidth: 230, minWidth: 130, align: "left", phase: "1" },
  { id: "amount", label: "Amount (₹)", defaultWidth: 110, minWidth: 75, align: "right", phase: "1", mono: true },
  { id: "receiptNo", label: "Receipt / Ref #", defaultWidth: 125, minWidth: 80, align: "left", phase: "1", mono: true },
  { id: "attachment", label: "Receipt / Bill Doc", defaultWidth: 130, minWidth: 85, align: "center", phase: "1" },
  { id: "remarks", label: "Remarks", defaultWidth: 140, minWidth: 75, align: "left", phase: "1" },
  { id: "editAction", label: "Edit Expense", defaultWidth: 100, minWidth: 75, align: "center", phase: "1" },

  // ── PHASE 2: APPROVAL WORKFLOW (ACCOUNTANT → SUPER ADMIN) ──
  { id: "accCheck", label: "Step 1: Acc Check", defaultWidth: 170, minWidth: 120, align: "center", phase: "2" },
  { id: "saApproval", label: "Step 2: SA Approval", defaultWidth: 240, minWidth: 180, align: "center", phase: "2" },

  // ── PHASE 3: PAYMENT DETAILS (SIR PAYS & DISBURSAL) ──
  { id: "utrDate", label: "UTR & Pay Date", defaultWidth: 140, minWidth: 85, align: "center", phase: "3" },
  { id: "paymentStatus", label: "Payment Status", defaultWidth: 110, minWidth: 70, align: "center", phase: "3" },
  { id: "actions", label: "Actions", defaultWidth: 105, minWidth: 80, align: "right", phase: "3" },
];

export const ACCOUNTANT_EXPENSE_COLUMNS: ExpenseColumnDef[] = [
  // ── PHASE 1: EXPENSE ENTERED (DETAILS & BILLING ITEMS) ──
  { id: "index", label: "S.n", defaultWidth: 45, minWidth: 35, align: "center", phase: "1", mono: true },
  { id: "center", label: "Coworking Center", defaultWidth: 135, minWidth: 95, align: "left", phase: "1" },
  { id: "date", label: "Expense Date", defaultWidth: 105, minWidth: 70, align: "left", phase: "1" },
  { id: "dueDate", label: "Payment Due Date", defaultWidth: 145, minWidth: 95, align: "center", phase: "1" },
  { id: "vendor", label: "Vendor & Bank A/C", defaultWidth: 165, minWidth: 95, align: "left", phase: "1" },
  { id: "category", label: "Expense Category", defaultWidth: 155, minWidth: 95, align: "left", phase: "1" },
  { id: "paymentMode", label: "Payment Mode", defaultWidth: 115, minWidth: 75, align: "center", phase: "1" },
  { id: "description", label: "Description", defaultWidth: 220, minWidth: 120, align: "left", phase: "1" },
  { id: "quantity", label: "Qty & A/U", defaultWidth: 90, minWidth: 60, align: "center", phase: "1", mono: true },
  { id: "rate", label: "Rate", defaultWidth: 85, minWidth: 55, align: "right", phase: "1", mono: true },
  { id: "amount", label: "Amt (₹)", defaultWidth: 110, minWidth: 75, align: "right", phase: "1", mono: true },
  { id: "receiptNo", label: "Receipt / Ref #", defaultWidth: 125, minWidth: 80, align: "left", phase: "1", mono: true },
  { id: "attachedDocs", label: "Attached Docs", defaultWidth: 130, minWidth: 85, align: "center", phase: "1" },
  { id: "remarks", label: "Remarks", defaultWidth: 135, minWidth: 75, align: "left", phase: "1" },
  { id: "editAction", label: "Edit Expense", defaultWidth: 105, minWidth: 80, align: "center", phase: "1" },

  // ── PHASE 2: APPROVAL WORKFLOW (ACCOUNTANT → SUPER ADMIN) ──
  { id: "accCheck", label: "Step 1: Acc Check", defaultWidth: 170, minWidth: 120, align: "center", phase: "2" },
  { id: "saApproval", label: "Step 2: SA Approval", defaultWidth: 240, minWidth: 180, align: "center", phase: "2" },

  // ── PHASE 3: PAYMENT DETAILS (SIR PAYS & DISBURSAL) ──
  { id: "bankPortal", label: "Bank Portal", defaultWidth: 90, minWidth: 65, align: "center", phase: "3" },
  { id: "paymentApproval", label: "Payment Approval", defaultWidth: 200, minWidth: 140, align: "center", phase: "3" },
  { id: "utrNumber", label: "UTR No.", defaultWidth: 155, minWidth: 90, align: "center", phase: "3", mono: true },
  { id: "payDate", label: "Payment Date", defaultWidth: 110, minWidth: 75, align: "center", phase: "3", mono: true },
  { id: "emailAlert", label: "Email Alert", defaultWidth: 115, minWidth: 75, align: "center", phase: "3" },
  { id: "actions", label: "Actions & Disbursal", defaultWidth: 310, minWidth: 240, align: "center", phase: "3" },
];

export const isAccountantExpense = (rec?: ExpenseRecordItem | null): boolean => {
  if (!rec) return false;
  return (
    rec.createdByRole === "ACCOUNTANT" ||
    Boolean(rec.createdByName?.toLowerCase()?.includes("account")) ||
    (rec.createdById === null && rec.createdByName === null)
  );
};

export const getExpenseCellValue = (rec: ExpenseRecordItem, colId: string, idx: number): string => {
  const isAcc = isAccountantExpense(rec);
  const isAutoApprovedByConfig = !onOffSAApproval && isAcc;

  switch (colId) {
    case "index":
      return String(idx + 1);
    case "center":
      return rec.locationName || "HQ";
    case "date":
      return rec.expenseDateStr || (rec.expenseDate ? new Date(rec.expenseDate).toLocaleDateString("en-GB") : "-");
    case "dueDate":
      return rec.dueDateStr || formatExpenseDueDateDisplay(rec.dueDate);
    case "vendor":
      return rec.vendorName ? (rec.accountNo ? `${rec.vendorName} (${rec.accountNo})` : rec.vendorName) : "Unassigned";
    case "category":
      return rec.category || "GENERAL EXPENSE";
    case "paymentMode":
      return rec.paymentMode || "-";
    case "description":
      return rec.description || "";
    case "quantity":
      return String(rec.quantity || 1) + (rec.unit ? ` ${rec.unit}` : " Nos");
    case "rate":
      return rec.rate ? `₹${rec.rate}` : "-";
    case "amount":
      return String(rec.amount || 0);
    case "receiptNo":
      return rec.receiptNo || "-";
    case "attachment":
    case "attachedDocs": {
      const parts = [];
      if (rec.vendorInvoiceUrl) parts.push("Tax Inv");
      if (rec.invoiceUrl) parts.push("Bill Doc");
      if (rec.attachmentUrl) parts.push("Slip");
      return parts.length > 0 ? parts.join(", ") : "None";
    }
    case "remarks":
      return rec.remarks || "-";
    case "editAction":
      return "Edit";
    case "accCheck":
      if (rec.accountantApprovalStatus === "APPROVED") return "Verified ✓";
      if (rec.approvalStatus === "REJECTED_BY_ACCOUNTANT") return "Rejected";
      return "Pending Check";
    case "saApproval":
      if (rec.approvalStatus === "APPROVED" || isAutoApprovedByConfig) return "Approved ✓";
      if (rec.approvalStatus === "REJECTED_BY_SUPER_ADMIN") return "SA Rejected";
      if (rec.accountantApprovalStatus === "APPROVED" || rec.approvalStatus === "PENDING_SUPER_ADMIN_APPROVAL" || rec.approvalStatus === "PENDING_APPROVAL") return "Pending SA";
      return "Waiting on Step 1";
    case "vendor":
      return rec.vendorName || "Unassigned";
    case "bankPortal":
      return rec.uploadedInBankPortal ? "Uploaded" : "Pending";
    case "paymentApproval":
      if (isAutoApprovedByConfig || rec.paymentApprovalStatus === "APPROVED" || rec.paymentStatus === "PAID" || rec.utrNumber) return "Approved ✓";
      if (rec.paymentApprovalStatus === "REJECTED") return "SA Rejected";
      if (rec.paymentApprovalStatus === "PENDING") return "Pending Sir Pay";
      if (rec.approvalStatus === "APPROVED") return "Req Sir Pay";
      return "Waiting on Step 2";
    case "utrNumber": {
      const isApprovedForPay = isAutoApprovedByConfig || rec.paymentApprovalStatus === "APPROVED" || rec.paymentStatus === "PAID";
      return rec.utrNumber || (isApprovedForPay ? "Awaiting UTR" : "Locked");
    }
    case "utrDate": {
      const isApprovedForPay = isAutoApprovedByConfig || rec.paymentApprovalStatus === "APPROVED" || rec.paymentStatus === "PAID";
      return rec.utrNumber ? `${rec.utrNumber} (${rec.payReceiveDate || rec.utrDate || "Paid"})` : (isApprovedForPay ? "Awaiting Disbursal" : "Locked");
    }
    case "payDate": {
      const isApprovedForPay = isAutoApprovedByConfig || rec.paymentApprovalStatus === "APPROVED" || rec.paymentStatus === "PAID";
      return rec.payReceiveDate || rec.utrDate || (isApprovedForPay ? "Pending Date" : "Locked");
    }
    case "paymentStatus":
      return rec.paymentStatus === "PAID" || rec.utrNumber ? "Paid" : "Pending";
    case "emailAlert":
      return rec.alertEmailSent ? "Sent" : (rec.utrNumber ? "Send Alert" : "Locked");
    default:
      return "";
  }
};

export const getExpenseDueDateBadge = (rec: ExpenseRecordItem) => {
  if (!rec.dueDate && !rec.dueDateStr) return null;
  const isPaid = rec.paymentStatus === "PAID";
  if (isPaid) {
    return {
      text: "Paid",
      className: "bg-emerald-50 text-emerald-700 border-emerald-300",
      isRisk: false,
    };
  }

  const due = rec.dueDate ? new Date(rec.dueDate) : null;
  if (!due || isNaN(due.getTime())) return null;

  const now = new Date();
  const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const daysDiff = Math.round((dueMidnight - nowMidnight) / (1000 * 60 * 60 * 24));

  if (daysDiff < 0) {
    return {
      text: `${Math.abs(daysDiff)}d Overdue (Late Fee)`,
      className: "bg-rose-100 text-rose-800 border-rose-400 font-bold",
      isRisk: true,
    };
  }
  if (daysDiff === 0) {
    return {
      text: "Due Today (Late Fee Risk)",
      className: "bg-amber-100 text-amber-900 border-amber-400 font-bold",
      isRisk: true,
    };
  }
  if (daysDiff <= 7) {
    return {
      text: `Due in ${daysDiff}d (Late Fee Risk)`,
      className: "bg-rose-50 text-rose-700 border-rose-300 font-bold",
      isRisk: true,
    };
  }
  return {
    text: `Due in ${daysDiff}d`,
    className: "bg-slate-50 text-slate-600 border-slate-200",
    isRisk: false,
  };
};

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

  // Payment Due Date Tracking & Late Fee Avoidance
  dueDate?: string | Date | null;
  dueDateStr?: string | null;
  dueDateAlertSentDates?: string | null;

  // Vendor bill & QTY/Rate
  accountNo?: string | null;
  quantity?: number | null;
  unit?: string | null; // A/U (Accounting Unit)
  rate?: number | null;
  invoiceUrl?: string | null;
  vendorInvoiceUrl?: string | null;
  paymentProofUrl?: string | null;
  uploadedInBankPortal?: boolean;

  // Multi-tier Approval & Rejection Flow
  approvalStatus?: string | null; // "PENDING_ACCOUNTANT_APPROVAL" | "PENDING_SUPER_ADMIN_APPROVAL" | "APPROVED" | "REJECTED_BY_ACCOUNTANT" | "REJECTED_BY_SUPER_ADMIN"
  accountantApprovalStatus?: string | null; // "PENDING" | "APPROVED" | "REJECTED"
  accountantApprovedById?: number | null;
  accountantApprovedByName?: string | null;
  accountantApprovedAt?: string | null;
  accountantRemarks?: string | null;

  superAdminApprovalStatus?: string | null; // "PENDING" | "APPROVED" | "REJECTED"
  superAdminApprovedById?: number | null;
  superAdminApprovedByName?: string | null;
  superAdminApprovedAt?: string | null;
  superAdminRemarks?: string | null;

  // 2nd Super Admin Approval: Payment Disbursal Approval ("Sir Pays & Approves")
  paymentApprovalStatus?: string | null; // "NOT_REQUESTED" | "PENDING" | "APPROVED" | "REJECTED"
  paymentApprovedById?: number | null;
  paymentApprovedByName?: string | null;
  paymentApprovedAt?: string | null;
  paymentApprovalRemarks?: string | null;

  rejectionStage?: string | null; // "ACCOUNTANT" | "SUPER_ADMIN"
  rejectionRemarks?: string | null;

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
  "UTILITIES",
  "RENT & LEASE",
  "HOUSEKEEPING & CLEANING",
  "TEA, COFFEE & PANTRY SUPPLIES",
  "MAINTENANCE & REPAIRS",
  "OFFICE SUPPLIES & STATIONERY",
  "INTERNET, WI-FI & TELECOM",
  "LEGAL, AUDIT & PROFESSIONAL FEES",
  "MARKETING & ADVERTISING",
  "VOUCHER",
  "TRAVEL & CONVEYANCE",
  "SECURITY & SURVEILLANCE",
  "GENERAL OPERATING EXPENSE",
];

export const SUGGESTED_CATEGORY_HEADERS = [
  "ELECTRICITY & UTILITIES",
  "UTILITIES",
  "MAINTENANCE & REPAIRS",
  "OFFICE SUPPLIES & STATIONERY",
  "TEA, COFFEE & PANTRY",
  "VOUCHER",
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

// Validation helpers for inline quick-vendor (Mobile & Email optional, validated if entered)
const validateInlineMobile = (mobile: string): string | null => {
  if (!mobile || !mobile.trim()) return null;
  const clean = mobile.replace(/[\s\-\(\)]/g, "");
  const mobileRegex = /^(\+91|0)?[6-9]\d{9}$/;
  if (!mobileRegex.test(clean)) {
    return "Enter a valid 10-digit mobile number";
  }
  return null;
};

const validateInlineEmail = (email: string): string | null => {
  if (!email || !email.trim()) return null;
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
  // Comprehensive Date Filters: Month-wise, Year-wise, Date-wise, Custom Range, and Expense & Payment Match
  const [dateTarget, setDateTarget] = useState<"EXPENSE_DATE" | "PAYMENT_DATE">("EXPENSE_DATE");
  const [filterType, setFilterType] = useState<"ALL" | "MONTH" | "YEAR" | "DATE" | "CUSTOM" | "MATCH">("ALL");
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [selectedYear, setSelectedYear] = useState<string>("ALL");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [matchExpenseDate, setMatchExpenseDate] = useState<string>("");
  const [matchPaymentDate, setMatchPaymentDate] = useState<string>("");
  const [matchSameDay, setMatchSameDay] = useState<boolean>(false);
  const [availableYears, setAvailableYears] = useState<
    { value: string; label: string; count: number; total: number }[]
  >([]);
  const [availableExpenseMonths, setAvailableExpenseMonths] = useState<
    { value: string; label: string; count: number; total: number }[]
  >([]);
  const [availablePaymentMonths, setAvailablePaymentMonths] = useState<
    { value: string; label: string; count: number; total: number }[]
  >([]);
  const [availableExpenseYears, setAvailableExpenseYears] = useState<
    { value: string; label: string; count: number; total: number }[]
  >([]);
  const [availablePaymentYears, setAvailablePaymentYears] = useState<
    { value: string; label: string; count: number; total: number }[]
  >([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedApprovalStatus, setSelectedApprovalStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Role View State: CM View vs Accountant Billing View
  // CM can ONLY view CM View; Accountant can ONLY view Accountant View; Super Admin can view/switch both.
  const isCMUser = !isAccountant && !isAdmin;
  const isCMOnly = isCMUser;
  const isAccountantUser = Boolean(isAccountant) && !isAdmin;
  const isSuperAdminUser = Boolean(isAdmin);

  const [activeViewMode, setActiveViewMode] = useState<"CM" | "ACCOUNTANT">(() => {
    if (isAccountantUser) return "ACCOUNTANT";
    if (isCMUser) return "CM";
    return "ACCOUNTANT";
  });

  // Strict role view locking
  useEffect(() => {
    if (isAccountantUser && activeViewMode !== "ACCOUNTANT") {
      setActiveViewMode("ACCOUNTANT");
    } else if (isCMUser && activeViewMode !== "CM") {
      setActiveViewMode("CM");
    }
  }, [isAccountantUser, isCMUser, activeViewMode]);

  // ── SPREADSHEET CONTROLS: COLUMN WIDTHS, FREEZING, HIDING & FILTERS ──
  const activeColumns = useMemo(() => {
    return activeViewMode === "CM" ? CM_EXPENSE_COLUMNS : ACCOUNTANT_EXPENSE_COLUMNS;
  }, [activeViewMode]);

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    [...CM_EXPENSE_COLUMNS, ...ACCOUNTANT_EXPENSE_COLUMNS].forEach((c) => {
      initial[c.id] = c.defaultWidth;
    });
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("sspacia_expense_col_widths_v3");
        if (saved) {
          const parsed = JSON.parse(saved);
          return { ...initial, ...parsed };
        }
      } catch (e) {
        console.error("Error reading saved column widths", e);
      }
    }
    return initial;
  });

  // Persistent storage effect for column widths
  useEffect(() => {
    if (typeof window !== "undefined" && Object.keys(columnWidths).length > 0) {
      try {
        localStorage.setItem("sspacia_expense_col_widths_v3", JSON.stringify(columnWidths));
      } catch (e) {
        console.error("Error persisting column widths", e);
      }
    }
  }, [columnWidths]);

  const [frozenColCount, setFrozenColCount] = useState<number>(0);
  const [hiddenColIds, setHiddenColIds] = useState<string[]>([]);
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [activeColMenu, setActiveColMenu] = useState<string | null>(null);
  const [tempFilterValues, setTempFilterValues] = useState<string[]>([]);
  const [filterSearchQuery, setFilterSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ colId: string; direction: "asc" | "desc" } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    colId: string;
    colIdx: number;
    colLabel: string;
  } | null>(null);

  const colMenuRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);
  const resizeDataRef = useRef<{ colId: string; startX: number; startWidth: number } | null>(null);

  const visibleColumns = useMemo(() => {
    return activeColumns.filter((c) => !hiddenColIds.includes(c.id));
  }, [activeColumns, hiddenColIds]);

  // Click outside listener for column menu popover and context menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) {
        setActiveColMenu(null);
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    if (activeColMenu || contextMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeColMenu, contextMenu]);

  // Global mousemove/mouseup listener for column resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current || !resizeDataRef.current) return;
      const { colId, startX, startWidth } = resizeDataRef.current;
      const colDef = activeColumns.find((c) => c.id === colId);
      const minWidth = colDef?.minWidth || 40;
      const delta = e.clientX - startX;
      const newWidth = Math.max(minWidth, startWidth + delta);

      setColumnWidths((prev) => ({
        ...prev,
        [colId]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        resizeDataRef.current = null;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        setColumnWidths((latest) => {
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("sspacia_expense_col_widths_v3", JSON.stringify(latest));
            } catch (e) {
              console.error("Error saving column widths", e);
            }
          }
          return latest;
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [activeColumns]);

  const handleStartResize = (colId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const currentWidth = columnWidths[colId] || activeColumns.find((c) => c.id === colId)?.defaultWidth || 120;
    isResizingRef.current = true;
    resizeDataRef.current = { colId, startX: e.clientX, startWidth: currentWidth };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const handleResetColumnWidths = () => {
    const reset: Record<string, number> = {};
    activeColumns.forEach((c) => {
      reset[c.id] = c.defaultWidth;
    });
    setColumnWidths(reset);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("sspacia_expense_col_widths_v3");
      } catch (e) {
        console.error("Error resetting column widths in storage", e);
      }
    }
    toast.info("Column widths reset to default");
  };

  // Sticky horizontal offset calculator for frozen columns
  const getStickyLeftOffset = (colIdx: number): number => {
    if (colIdx >= frozenColCount) return 0;
    let offset = 0;
    for (let i = 0; i < colIdx; i++) {
      const col = visibleColumns[i];
      offset += columnWidths[col.id] || col.defaultWidth;
    }
    return offset;
  };

  const isColFrozen = (colIdx: number) => colIdx < frozenColCount;
  const isLastFrozenCol = (colIdx: number) => colIdx === frozenColCount - 1 && frozenColCount > 0;

  // Unique values and counts for each column
  const getColumnUniqueValues = (colId: string) => {
    const counts: Record<string, number> = {};
    records.forEach((rec, idx) => {
      const val = getExpenseCellValue(rec, colId, idx);
      counts[val] = (counts[val] || 0) + 1;
    });

    const uniqueList = Object.keys(counts).sort((a, b) => {
      if (colId === "amount" || colId === "rate" || colId === "quantity") {
        const numA = parseFloat(a) || 0;
        const numB = parseFloat(b) || 0;
        return numA - numB;
      }
      return a.localeCompare(b);
    });

    return { uniqueList, counts };
  };

  // Google Sheets Filter Handlers
  const handleOpenColumnFilter = (colId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { uniqueList } = getColumnUniqueValues(colId);
    if (columnFilters[colId]) {
      setTempFilterValues(columnFilters[colId]);
    } else {
      setTempFilterValues(uniqueList);
    }
    setFilterSearchQuery("");
    setActiveColMenu(activeColMenu === colId ? null : colId);
  };

  const handleToggleFilterValue = (val: string) => {
    setTempFilterValues((prev) => {
      if (prev.includes(val)) {
        return prev.filter((v) => v !== val);
      } else {
        return [...prev, val];
      }
    });
  };

  const handleSelectAllFilterValues = (values: string[]) => {
    setTempFilterValues(values);
  };

  const handleClearAllFilterValues = () => {
    setTempFilterValues([]);
  };

  const handleApplyColumnFilter = (colId: string) => {
    const { uniqueList } = getColumnUniqueValues(colId);
    if (tempFilterValues.length === uniqueList.length) {
      setColumnFilters((prev) => {
        const next = { ...prev };
        delete next[colId];
        return next;
      });
    } else {
      setColumnFilters((prev) => ({
        ...prev,
        [colId]: tempFilterValues,
      }));
    }
    setActiveColMenu(null);
  };

  const handleResetColumnFilter = (colId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setColumnFilters((prev) => {
      const next = { ...prev };
      delete next[colId];
      return next;
    });
    setActiveColMenu(null);
  };

  const handleClearAllColumnFilters = () => {
    setColumnFilters({});
    setSortConfig(null);
    toast.info("Cleared all column filters & sorts");
  };

  const handleSortColumn = (colId: string, direction: "asc" | "desc") => {
    if (sortConfig?.colId === colId && sortConfig.direction === direction) {
      setSortConfig(null);
    } else {
      setSortConfig({ colId, direction });
    }
    setActiveColMenu(null);
  };

  // Filtered by column filters
  const columnFilteredRecords = useMemo(() => {
    const activeColFilterKeys = Object.keys(columnFilters);
    if (activeColFilterKeys.length === 0) return records;

    return records.filter((rec, idx) => {
      for (const colId of activeColFilterKeys) {
        const allowed = columnFilters[colId];
        if (allowed && allowed.length >= 0) {
          const cellVal = getExpenseCellValue(rec, colId, idx);
          if (!allowed.includes(cellVal)) {
            return false;
          }
        }
      }
      return true;
    });
  }, [records, columnFilters]);

  // Final sorted records
  const finalDisplayRecords = useMemo(() => {
    if (!sortConfig) return columnFilteredRecords;
    const { colId, direction } = sortConfig;
    const factor = direction === "asc" ? 1 : -1;

    return [...columnFilteredRecords].sort((a, b) => {
      if (colId === "amount") {
        return (Number(a.amount || 0) - Number(b.amount || 0)) * factor;
      }
      if (colId === "rate") {
        return (Number(a.rate || 0) - Number(b.rate || 0)) * factor;
      }
      if (colId === "quantity") {
        return (Number(a.quantity || 0) - Number(b.quantity || 0)) * factor;
      }
      if (colId === "date") {
        const tA = a.expenseDate ? new Date(a.expenseDate).getTime() : 0;
        const tB = b.expenseDate ? new Date(b.expenseDate).getTime() : 0;
        return (tA - tB) * factor;
      }
      if (colId === "dueDate") {
        const tA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        const tB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        return (tA - tB) * factor;
      }
      if (colId === "center") {
        return (a.locationName || "").localeCompare(b.locationName || "") * factor;
      }
      if (colId === "vendor") {
        return (a.vendorName || "").localeCompare(b.vendorName || "") * factor;
      }
      if (colId === "receiptNo") {
        return (a.receiptNo || "").localeCompare(b.receiptNo || "") * factor;
      }
      if (colId === "paymentMode") {
        return (a.paymentMode || "").localeCompare(b.paymentMode || "") * factor;
      }
      const valA = getExpenseCellValue(a, colId, 0);
      const valB = getExpenseCellValue(b, colId, 0);
      return valA.localeCompare(valB) * factor;
    });
  }, [columnFilteredRecords, sortConfig]);

  const totalTableWidth = useMemo(() => {
    return visibleColumns.reduce((sum, col) => {
      return sum + (columnWidths[col.id] || col.defaultWidth);
    }, 0);
  }, [visibleColumns, columnWidths]);

  // Helper to get styling for any table cell (td)
  const getColStyle = (colId: string) => {
    const colIdx = visibleColumns.findIndex((c) => c.id === colId);
    if (colIdx === -1) return null;
    const col = visibleColumns[colIdx];
    const frozen = isColFrozen(colIdx);
    const lastFrozen = isLastFrozenCol(colIdx);
    const leftOffset = getStickyLeftOffset(colIdx);
    const width = columnWidths[col.id] || col.defaultWidth;

    return {
      colIdx,
      frozen,
      lastFrozen,
      leftOffset,
      width,
      style: {
        width: `${width}px`,
        minWidth: `${width}px`,
        maxWidth: `${width}px`,
        left: frozen ? `${leftOffset}px` : undefined,
      } as React.CSSProperties,
      className: `${frozen ? "sticky z-10 bg-white group-hover:bg-[#fcfdfd]" : ""} ${lastFrozen ? "border-r-2 border-slate-300 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.15)]" : ""
        }`,
    };
  };

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ExpenseRecordItem | null>(null);
  const [settlingRecord, setSettlingRecord] = useState<ExpenseRecordItem | null>(null);
  const [approvingRecord, setApprovingRecord] = useState<ExpenseRecordItem | null>(null);
  const [rejectingRecord, setRejectingRecord] = useState<ExpenseRecordItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [isRejectingSubmitting, setIsRejectingSubmitting] = useState<boolean>(false);

  // Super Admin Payment Rejection Modal State
  const [rejectingPaymentRecord, setRejectingPaymentRecord] = useState<ExpenseRecordItem | null>(null);
  const [paymentRejectionReason, setPaymentRejectionReason] = useState<string>("");
  const [isRejectingPaymentSubmitting, setIsRejectingPaymentSubmitting] = useState<boolean>(false);

  const [isApprovalsModalOpen, setIsApprovalsModalOpen] = useState(false);
  const [isViewPaymentModalOpen, setIsViewPaymentModalOpen] = useState(false);
  const [viewingPaymentRecord, setViewingPaymentRecord] = useState<ExpenseRecordItem | null>(null);
  const [isNewVendorModalOpen, setIsNewVendorModalOpen] = useState(false);
  const [isBankStatementOpen, setIsBankStatementOpen] = useState(false);

  // Super Admin Main Expense Category Headers
  const [categoryHeaders, setCategoryHeaders] = useState<string[]>([]);
  const [proposedCategories, setProposedCategories] = useState<string[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryOldName, setEditingCategoryOldName] = useState<string | null>(null);
  const [editingCategoryNewName, setEditingCategoryNewName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [deletingCategoryName, setDeletingCategoryName] = useState<string | null>(null);

  // Custom Category Header mode in Add/Edit Expense Modal (CM & Accountant can propose headers)
  const [isCustomCategoryMode, setIsCustomCategoryMode] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState("");

  // Super Admin Edit/Reassign Header for an Expense Modal state
  const [editingHeaderRecord, setEditingHeaderRecord] = useState<ExpenseRecordItem | null>(null);
  const [editingHeaderNewName, setEditingHeaderNewName] = useState("");
  const [editingHeaderSelectedOfficial, setEditingHeaderSelectedOfficial] = useState("");
  const [savingHeaderEdit, setSavingHeaderEdit] = useState(false);

  // Super Admin Custom Header Review Modal state (Keep & add to predefined or Change/reassign)
  const [customHeaderReviewRecord, setCustomHeaderReviewRecord] = useState<ExpenseRecordItem | null>(null);
  const [customHeaderAction, setCustomHeaderAction] = useState<"keep" | "change">("keep");
  const [reassignCategoryChoice, setReassignCategoryChoice] = useState<string>("");
  const [isReviewingCustomHeaderSubmitting, setIsReviewingCustomHeaderSubmitting] = useState<boolean>(false);

  const isPredefinedCategory = (cat?: string | null) => {
    if (!cat || !cat.trim()) return true;
    const norm = cat.trim().toUpperCase();
    const set = new Set(
      [...FIXED_EXPENSE_TYPES, ...categoryHeaders].map((c) => c.trim().toUpperCase())
    );
    return set.has(norm);
  };

  const [savingForm, setSavingForm] = useState(false);
  const [approving, setApproving] = useState(false);
  const [sendingAlertId, setSendingAlertId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);

  // Quick Due Date Modal state
  const [dueDatePickerRecord, setDueDatePickerRecord] = useState<ExpenseRecordItem | null>(null);
  const [dueDatePickerValue, setDueDatePickerValue] = useState<string>("");
  const [savingDueDate, setSavingDueDate] = useState(false);

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
      rejectingRecord ||
      rejectingPaymentRecord ||
      customHeaderReviewRecord ||
      isNewVendorModalOpen ||
      settlingRecord ||
      isApprovalsModalOpen ||
      isViewPaymentModalOpen ||
      isBankStatementOpen ||
      isCategoryModalOpen ||
      dueDatePickerRecord ||
      editingHeaderRecord
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
    rejectingRecord,
    rejectingPaymentRecord,
    customHeaderReviewRecord,
    isNewVendorModalOpen,
    settlingRecord,
    isApprovalsModalOpen,
    isViewPaymentModalOpen,
    isBankStatementOpen,
    isCategoryModalOpen,
    dueDatePickerRecord,
    editingHeaderRecord,
  ]);

  // Global pending approvals across ALL centres (irrespective of center/month filter)
  const [allPendingApprovals, setAllPendingApprovals] = useState<ExpenseRecordItem[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<ExpenseRecordItem[]>([]);
  const [approvalsSearchQuery, setApprovalsSearchQuery] = useState("");
  const [approvalsCenterFilter, setApprovalsCenterFilter] = useState("ALL");
  const [approvalsRightTab, setApprovalsRightTab] = useState<"PAYMENT" | "HISTORY" | "BOTH">("PAYMENT");
  const [approvalsHistorySubFilter, setApprovalsHistorySubFilter] = useState<"ALL" | "APPROVED" | "PAYMENT" | "REJECTED" | "DISBURSED">("ALL");




  // Add / Edit form state (Fixed format values)
  const [formData, setFormData] = useState({
    locationId: initialLocationId || "",
    expenseDate: new Date().toISOString().split("T")[0],
    dueDate: "",
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
    alertEmailRecipient: "",
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

  // Official Super Admin Category Headers (Strictly defined by Super Admin, fallback to defaults if none defined yet)
  const officialCategoryOptions = useMemo(() => {
    const raw = (categoryHeaders && categoryHeaders.length > 0)
      ? categoryHeaders
      : FIXED_EXPENSE_TYPES;

    return Array.from(
      new Set(
        raw
          .map((c) => {
            const up = String(c || "").trim().toUpperCase();
            if (up === "UTITILITIES") return "UTILITIES";
            if (up === "VOCHER" || up === "VOUCHERS") return "VOUCHER";
            if (up === "MAINTAINACE & REPAIRS") return "MAINTENANCE & REPAIRS";
            return up;
          })
          .filter(Boolean)
      )
    );
  }, [categoryHeaders]);

  // Consolidated Categories (Super Admin headers + any existing record categories to prevent data loss in filters)
  const allAvailableCategories = useMemo(() => {
    const normalize = (c: string) => {
      const up = String(c || "").trim().toUpperCase();
      if (up === "UTITILITIES") return "UTILITIES";
      if (up === "VOCHER" || up === "VOUCHERS") return "VOUCHER";
      if (up === "MAINTAINACE & REPAIRS") return "MAINTENANCE & REPAIRS";
      return up;
    };

    const set = new Set<string>();
    // 1. Super Admin defined Category Headers
    if (categoryHeaders.length > 0) {
      categoryHeaders.forEach((c) => c && set.add(normalize(c)));
    } else {
      FIXED_EXPENSE_TYPES.forEach((c) => set.add(normalize(c)));
    }
    // 2. Also preserve historic categories from existing records so no historic data is lost
    categories.forEach((c) => c && set.add(normalize(c)));
    customCategories.forEach((c) => c && set.add(normalize(c)));
    records.forEach((r) => r.category && set.add(normalize(r.category)));
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
          (r) => {
            // If onOffSAApproval is false, expenses uploaded by accountant do not require Super Admin approval
            const isAcc = isAccountantExpense(r);
            if (!onOffSAApproval && isAcc) return false;

            return (
              // Step 2: Base Expense Requisition Approvals
              r.approvalStatus === "PENDING_SUPER_ADMIN_APPROVAL" ||
              r.approvalStatus === "PENDING_APPROVAL" ||
              (r.approvalStatus === "PENDING" &&
                (r.accountantApprovalStatus === "APPROVED" || r.createdByRole === "ACCOUNTANT")) ||
              // Step 3: Payment Disbursal Approvals ("Sir Pays")
              (r.approvalStatus === "APPROVED" &&
                r.paymentApprovalStatus === "PENDING" &&
                !r.utrNumber &&
                r.paymentStatus !== "PAID")
            );
          }
        );
        setAllPendingApprovals(pending);

        // Populate recent approval, rejection & disbursal history across all centers (latest 150)
        const history = all
          .filter(
            (r) =>
              r.approvalStatus === "APPROVED" ||
              r.superAdminApprovalStatus === "APPROVED" ||
              r.approvalStatus === "REJECTED_BY_ACCOUNTANT" ||
              r.approvalStatus === "REJECTED_BY_SUPER_ADMIN" ||
              r.accountantApprovalStatus === "REJECTED" ||
              r.superAdminApprovalStatus === "REJECTED" ||
              r.paymentApprovalStatus === "APPROVED" ||
              r.paymentApprovalStatus === "REJECTED" ||
              r.paymentStatus === "PAID" ||
              Boolean(r.utrNumber)
          )
          .sort((a, b) => {
            const dateA = a.updatedAt || a.paymentApprovedAt || a.superAdminApprovedAt || a.accountantApprovedAt || a.approvedAt || a.expenseDate || "";
            const dateB = b.updatedAt || b.paymentApprovedAt || b.superAdminApprovedAt || b.accountantApprovedAt || b.approvedAt || b.expenseDate || "";
            return dateB.localeCompare(dateA);
          })
          .slice(0, 150);
        setApprovalHistory(history);
      }
    } catch (err) {
      console.error("Error fetching all pending approvals:", err);
    }
  };

  // Approvals Desk Filtered Collections & Totals
  const {
    pendingStep2Filtered,
    pendingStep3Filtered,
    historyFiltered,
    historyBaseCount,
    historyExpenseApprovedCount,
    historyPaymentApprovedCount,
    historyRejectedCount,
    historyDisbursedCount,
    step2Total,
    step3Total,
    historyTotal,
  } = useMemo(() => {
    const q = approvalsSearchQuery.trim().toLowerCase();
    const loc = approvalsCenterFilter;

    const matchesFilter = (r: ExpenseRecordItem) => {
      if (loc !== "ALL") {
        if (String(r.locationId) !== String(loc) && r.locationName?.toLowerCase() !== loc.toLowerCase()) {
          return false;
        }
      }
      if (q) {
        const idMatch = String(r.id).includes(q);
        const descMatch = (r.description || "").toLowerCase().includes(q);
        const vendorMatch = (r.vendorName || "").toLowerCase().includes(q);
        const catMatch = (r.category || "").toLowerCase().includes(q);
        const centerMatch = (r.locationName || "").toLowerCase().includes(q);
        const amountMatch = String(r.amount).includes(q);
        const utrMatch = (r.utrNumber || "").toLowerCase().includes(q);
        if (!idMatch && !descMatch && !vendorMatch && !catMatch && !centerMatch && !amountMatch && !utrMatch) {
          return false;
        }
      }
      return true;
    };

    // Step 2: Base Expense Requisition Approvals (after Accountant check)
    const step2 = allPendingApprovals.filter(
      (r) => r.approvalStatus !== "APPROVED" && matchesFilter(r)
    );

    // Step 3: Payment Disbursal Approvals ("Sir Pays")
    const step3 = allPendingApprovals.filter(
      (r) =>
        r.approvalStatus === "APPROVED" &&
        r.paymentApprovalStatus === "PENDING" &&
        matchesFilter(r)
    );

    // Approval History (recently approved, rejected or paid)
    const historyBase = approvalHistory.filter(matchesFilter);

    const historyExpenseApprovedCount = historyBase.filter(
      (r) => r.approvalStatus === "APPROVED" || r.superAdminApprovalStatus === "APPROVED"
    ).length;
    const historyPaymentApprovedCount = historyBase.filter(
      (r) => r.paymentApprovalStatus === "APPROVED"
    ).length;
    const historyRejectedCount = historyBase.filter(
      (r) =>
        r.approvalStatus === "REJECTED_BY_SUPER_ADMIN" ||
        r.approvalStatus === "REJECTED_BY_ACCOUNTANT" ||
        r.paymentApprovalStatus === "REJECTED" ||
        r.accountantApprovalStatus === "REJECTED" ||
        r.superAdminApprovalStatus === "REJECTED"
    ).length;
    const historyDisbursedCount = historyBase.filter(
      (r) => r.paymentStatus === "PAID" || Boolean(r.utrNumber)
    ).length;

    let history = historyBase;
    if (approvalsHistorySubFilter === "APPROVED") {
      history = historyBase.filter(
        (r) => r.approvalStatus === "APPROVED" || r.superAdminApprovalStatus === "APPROVED"
      );
    } else if (approvalsHistorySubFilter === "PAYMENT") {
      history = historyBase.filter((r) => r.paymentApprovalStatus === "APPROVED");
    } else if (approvalsHistorySubFilter === "REJECTED") {
      history = historyBase.filter(
        (r) =>
          r.approvalStatus === "REJECTED_BY_SUPER_ADMIN" ||
          r.approvalStatus === "REJECTED_BY_ACCOUNTANT" ||
          r.paymentApprovalStatus === "REJECTED" ||
          r.accountantApprovalStatus === "REJECTED" ||
          r.superAdminApprovalStatus === "REJECTED"
      );
    } else if (approvalsHistorySubFilter === "DISBURSED") {
      history = historyBase.filter((r) => r.paymentStatus === "PAID" || Boolean(r.utrNumber));
    }

    const s2Total = step2.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
    const s3Total = step3.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
    const hTotal = history.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

    return {
      pendingStep2Filtered: step2,
      pendingStep3Filtered: step3,
      historyFiltered: history,
      historyBaseCount: historyBase.length,
      historyExpenseApprovedCount,
      historyPaymentApprovedCount,
      historyRejectedCount,
      historyDisbursedCount,
      step2Total: s2Total,
      step3Total: s3Total,
      historyTotal: hTotal,
    };
  }, [allPendingApprovals, approvalHistory, approvalsSearchQuery, approvalsCenterFilter, approvalsHistorySubFilter]);

  // Pending Accountant checks count across loaded records
  const pendingAccountantCount = useMemo(() => {
    return records.filter(
      (r) =>
        r.approvalStatus === "PENDING_ACCOUNTANT_APPROVAL" ||
        (r.approvalStatus === "PENDING" &&
          r.createdByRole !== "ACCOUNTANT" &&
          r.accountantApprovalStatus !== "APPROVED")
    ).length;
  }, [records]);

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

  // Helper to render multi-tier approval status badge
  const renderApprovalStatusBadge = (rec: ExpenseRecordItem) => {
    if (rec.paymentStatus === "PAID" || rec.utrNumber) {
      return (
        <div className="flex flex-col items-center">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Check className="w-3 h-3 text-emerald-700" />
            <span>Paid {rec.utrNumber ? `(${rec.utrNumber})` : ""}</span>
          </span>
          {(rec.utrDate || rec.paymentApprovedAt || rec.updatedAt) && (
            <span className="text-[7.5px] text-gray-500 font-mono mt-0.5">
              {formatShortTimestamp(rec.utrDate || rec.paymentApprovedAt || rec.updatedAt)}
            </span>
          )}
        </div>
      );
    }

    const isAccRecord = isAccountantExpense(rec);
    const isAutoApproved = !onOffSAApproval && isAccRecord;

    if (rec.paymentApprovalStatus === "REJECTED") {
      return (
        <div className="flex flex-col items-center gap-1 w-full max-w-[240px] text-center">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 rounded shadow-2xs whitespace-nowrap">
            <X className="w-3 h-3 text-rose-700 shrink-0" />
            <span>Payment Rejected by Sir</span>
          </span>
          <span className="text-[8px] text-rose-700 font-medium">
            {rec.paymentApprovedByName ? `by ${rec.paymentApprovedByName}` : "Super Admin"}
          </span>
          {(rec.paymentApprovedAt || rec.updatedAt) && (
            <span className="text-[7.5px] text-rose-700 font-mono">
              {formatShortTimestamp(rec.paymentApprovedAt || rec.updatedAt)}
            </span>
          )}
          {rec.paymentApprovalRemarks && (
            <div className="w-full bg-rose-50 border border-rose-200 rounded px-2 py-1 text-[10px] text-rose-900 leading-snug whitespace-normal break-words text-left shadow-2xs">
              <span className="font-bold text-rose-800 block text-[8px] uppercase tracking-wide">Reason:</span>
              <span className="font-medium">{rec.paymentApprovalRemarks}</span>
            </div>
          )}
        </div>
      );
    }

    if (rec.approvalStatus === "APPROVED" || isAutoApproved) {
      return (
        <div className="flex flex-col items-center">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <Check className="w-3 h-3 text-emerald-700" />
            <span>{isAutoApproved ? "Auto Approved" : "Approved for Payment"}</span>
          </span>
          <span className="text-[8.5px] text-gray-500 mt-0.5 font-medium">Sir to pay • Enter UTR</span>
          {(rec.superAdminApprovedAt || rec.approvedAt || rec.updatedAt) && (
            <span className="text-[7.5px] text-emerald-700 font-mono mt-0.5">
              {formatShortTimestamp(rec.superAdminApprovedAt || rec.approvedAt || rec.updatedAt)}
            </span>
          )}
        </div>
      );
    }

    if (rec.approvalStatus === "PENDING_SUPER_ADMIN_APPROVAL" || rec.approvalStatus === "PENDING_APPROVAL") {
      return (
        <div className="flex flex-col items-center">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
            <Clock className="w-3 h-3 text-purple-700" />
            <span>Pending Super Admin</span>
          </span>
          {rec.accountantApprovalStatus === "APPROVED" && (
            <span className="text-[8px] text-emerald-600 font-semibold mt-0.5">
              ✓ Validated {rec.accountantApprovedAt ? formatShortTimestamp(rec.accountantApprovedAt) : "by Accountant"}
            </span>
          )}
        </div>
      );
    }

    if (rec.approvalStatus === "REJECTED_BY_ACCOUNTANT") {
      return (
        <div className="flex flex-col items-center gap-1 w-full max-w-[240px] text-center">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 rounded shadow-2xs whitespace-nowrap">
            <X className="w-3 h-3 text-rose-700 shrink-0" />
            <span>Rejected by Accountant</span>
          </span>
          {(rec.accountantApprovedAt || rec.updatedAt) && (
            <span className="text-[7.5px] text-rose-700 font-mono">
              {formatShortTimestamp(rec.accountantApprovedAt || rec.updatedAt)}
            </span>
          )}
          {(rec.rejectionRemarks || rec.accountantRemarks) && (
            <div className="w-full bg-rose-50 border border-rose-200 rounded px-2 py-1 text-[10px] text-rose-900 leading-snug whitespace-normal break-words text-left shadow-2xs">
              <span className="font-bold text-rose-800 block text-[8px] uppercase tracking-wide">Reason:</span>
              <span className="font-medium">{rec.rejectionRemarks || rec.accountantRemarks}</span>
            </div>
          )}
        </div>
      );
    }

    if (rec.approvalStatus === "REJECTED_BY_SUPER_ADMIN") {
      return (
        <div className="flex flex-col items-center gap-1 w-full max-w-[240px] text-center">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 rounded shadow-2xs whitespace-nowrap">
            <X className="w-3 h-3 text-rose-700 shrink-0" />
            <span>Rejected by Super Admin</span>
          </span>
          {(rec.superAdminApprovedAt || rec.updatedAt) && (
            <span className="text-[7.5px] text-rose-700 font-mono">
              {formatShortTimestamp(rec.superAdminApprovedAt || rec.updatedAt)}
            </span>
          )}
          {(rec.rejectionRemarks || rec.superAdminRemarks) && (
            <div className="w-full bg-rose-50 border border-rose-200 rounded px-2 py-1 text-[10px] text-rose-900 leading-snug whitespace-normal break-words text-left shadow-2xs">
              <span className="font-bold text-rose-800 block text-[8px] uppercase tracking-wide">Reason:</span>
              <span className="font-medium">{rec.rejectionRemarks || rec.superAdminRemarks}</span>
            </div>
          )}
        </div>
      );
    }

    // Default: PENDING_ACCOUNTANT_APPROVAL or PENDING
    return (
      <div className="flex flex-col items-center">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-700" />
          <span>Pending Accountant Check</span>
        </span>
        <span className="text-[8.5px] text-gray-400 mt-0.5">Awaiting validation</span>
      </div>
    );
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

  const displayedAvailableMonths = useMemo(() => {
    if (dateTarget === "PAYMENT_DATE") {
      return availablePaymentMonths.length > 0 ? availablePaymentMonths : availableMonths;
    }
    return availableExpenseMonths.length > 0 ? availableExpenseMonths : availableMonths;
  }, [dateTarget, availablePaymentMonths, availableExpenseMonths, availableMonths]);

  const displayedAvailableYears = useMemo(() => {
    if (dateTarget === "PAYMENT_DATE") {
      return availablePaymentYears.length > 0 ? availablePaymentYears : availableYears;
    }
    return availableExpenseYears.length > 0 ? availableExpenseYears : availableYears;
  }, [dateTarget, availablePaymentYears, availableExpenseYears, availableYears]);

  // Active Date Filter Meta (Total Count & Price for Filter selection)
  const activeMonthMeta = useMemo(() => {
    const targetLabel = dateTarget === "PAYMENT_DATE" ? "Payment Date" : "Expense Date";

    if (filterType === "ALL") {
      return {
        label: `All Expenses (${targetLabel})`,
        count: records.length,
        total: summary.totalAmount,
      };
    }
    if (filterType === "MONTH") {
      if (selectedMonth === "ALL") {
        return { label: `All Months (${targetLabel})`, count: records.length, total: summary.totalAmount };
      }
      const found = displayedAvailableMonths.find((m) => m.value === selectedMonth);
      return {
        label: found ? `${found.label} (${targetLabel})` : `${selectedMonth} (${targetLabel})`,
        count: found ? found.count : records.length,
        total: found ? found.total : records.reduce((s, r) => s + (r.amount || 0), 0),
      };
    }
    if (filterType === "YEAR") {
      if (selectedYear === "ALL") {
        return { label: `All Years (${targetLabel})`, count: records.length, total: summary.totalAmount };
      }
      const found = displayedAvailableYears.find((y) => y.value === selectedYear);
      return {
        label: found ? `${found.label} (${targetLabel})` : `Year ${selectedYear} (${targetLabel})`,
        count: found ? found.count : records.length,
        total: found ? found.total : records.reduce((s, r) => s + (r.amount || 0), 0),
      };
    }
    if (filterType === "DATE") {
      const formatted = selectedDate ? selectedDate.split("-").reverse().join("/") : "Selected Date";
      return {
        label: `${targetLabel}: ${formatted}`,
        count: records.length,
        total: records.reduce((s, r) => s + (r.amount || 0), 0),
      };
    }
    if (filterType === "CUSTOM") {
      const f = fromDate ? fromDate.split("-").reverse().join("/") : "Start";
      const t = toDate ? toDate.split("-").reverse().join("/") : "End";
      return {
        label: `${targetLabel} Range: ${f} to ${t}`,
        count: records.length,
        total: records.reduce((s, r) => s + (r.amount || 0), 0),
      };
    }
    if (filterType === "MATCH") {
      let label = "Matched Breakdown";
      if (matchSameDay) {
        label = "Same Day Disbursed (Expense Date = Payment Date)";
      } else if (matchExpenseDate && matchPaymentDate) {
        label = `Exp: ${matchExpenseDate.split("-").reverse().join("/")} & Pay: ${matchPaymentDate.split("-").reverse().join("/")}`;
      } else if (matchExpenseDate) {
        label = `Expense Date: ${matchExpenseDate.split("-").reverse().join("/")}`;
      } else if (matchPaymentDate) {
        label = `Payment Date: ${matchPaymentDate.split("-").reverse().join("/")}`;
      }
      return {
        label,
        count: records.length,
        total: records.reduce((s, r) => s + (r.amount || 0), 0),
      };
    }
    return {
      label: "All Records",
      count: records.length,
      total: summary.totalAmount,
    };
  }, [
    filterType,
    dateTarget,
    selectedMonth,
    selectedYear,
    selectedDate,
    fromDate,
    toDate,
    matchExpenseDate,
    matchPaymentDate,
    matchSameDay,
    displayedAvailableMonths,
    displayedAvailableYears,
    records,
    summary,
  ]);

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
      params.set("dateTarget", dateTarget);
      if (filterType === "MONTH" && selectedMonth !== "ALL") params.set("month", selectedMonth);
      if (filterType === "YEAR" && selectedYear !== "ALL") params.set("year", selectedYear);
      if (filterType === "DATE" && selectedDate.trim()) params.set("date", selectedDate.trim());
      if (filterType === "CUSTOM") {
        if (fromDate.trim()) params.set("fromDate", fromDate.trim());
        if (toDate.trim()) params.set("toDate", toDate.trim());
      }
      if (filterType === "MATCH") {
        if (matchExpenseDate.trim()) params.set("expenseDate", matchExpenseDate.trim());
        if (matchPaymentDate.trim()) params.set("paymentDate", matchPaymentDate.trim());
        if (matchSameDay) params.set("matchSameDay", "true");
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
      if (data.availableExpenseMonths) setAvailableExpenseMonths(data.availableExpenseMonths);
      if (data.availablePaymentMonths) setAvailablePaymentMonths(data.availablePaymentMonths);
      if (data.availableExpenseYears) setAvailableExpenseYears(data.availableExpenseYears);
      if (data.availablePaymentYears) setAvailablePaymentYears(data.availablePaymentYears);
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
    dateTarget,
    selectedMonth,
    selectedYear,
    selectedDate,
    fromDate,
    toDate,
    matchExpenseDate,
    matchPaymentDate,
    matchSameDay,
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

  // Fetch Super Admin Category Headers (and CM proposed headers from expenses)
  const fetchCategoryHeaders = async () => {
    try {
      const res = await fetch("/api/admin/expense-categories");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.categories)) {
          setCategoryHeaders(data.categories);
        }
        if (Array.isArray(data.proposedCategories)) {
          setProposedCategories(data.proposedCategories);
        }
      }
    } catch (err) {
      console.error("Failed to fetch category headers:", err);
    }
  };

  useEffect(() => {
    if (isCategoryModalOpen) {
      fetchCategoryHeaders();
    }
  }, [isCategoryModalOpen]);

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
      await fetchCategoryHeaders();
      fetchRecords(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to add category header");
    } finally {
      setSavingCategory(false);
    }
  };

  // Rename / Edit Category Header (Super Admin Only)
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
      await fetchCategoryHeaders();
      fetchRecords(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update category header");
    } finally {
      setSavingCategory(false);
    }
  };

  // Delete / Reassign Category Header (Super Admin Only)
  const handleDeleteCategoryHeader = async (nameToDelete: string, reassignTo?: string) => {
    if (!confirm(`Are you sure you want to delete category header "${nameToDelete}"?` + (reassignTo ? ` Matching expenses will be reassigned to "${reassignTo}".` : " Existing expenses will retain their category."))) {
      return;
    }

    setDeletingCategoryName(nameToDelete);
    try {
      const res = await fetch(`/api/admin/expense-categories?name=${encodeURIComponent(nameToDelete)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameToDelete, reassignTo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete category");

      if (data.categories) setCategoryHeaders(data.categories);
      toast.success(`Category header "${nameToDelete}" deleted`);
      await fetchCategoryHeaders();
      fetchRecords(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category header");
    } finally {
      setDeletingCategoryName(null);
    }
  };

  // Accept CM / Accountant Proposed Header into Official Dropdown
  const handleAcceptCategoryIntoDropdown = async (recordId: number, categoryName: string) => {
    const trimmed = categoryName.trim().toUpperCase();
    if (!trimmed) return;
    try {
      setUpdatingCategoryId(recordId);
      const res = await fetch(`/api/admin/expense-records/${recordId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUPER_ADMIN_UPDATE_CATEGORY",
          category: trimmed,
          acceptCategoryIntoDropdown: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to accept header into dropdown");

      toast.success(
        `Header "${trimmed}" accepted & added to official company dropdown!`
      );
      await fetchCategoryHeaders();
      fetchRecords(false);
      fetchAllPendingApprovals();
    } catch (err: any) {
      toast.error(err.message || "Failed to accept header");
    } finally {
      setUpdatingCategoryId(null);
    }
  };

  // Super Admin Save Edited / Reassigned Header for an Expense
  const handleSaveHeaderEdit = async (recordId: number, newName: string, alsoAddToDropdown: boolean) => {
    const trimmed = newName.trim().toUpperCase();
    if (!trimmed) {
      toast.error("Category header name is required");
      return;
    }

    try {
      setSavingHeaderEdit(true);
      const res = await fetch(`/api/admin/expense-records/${recordId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUPER_ADMIN_UPDATE_CATEGORY",
          category: trimmed,
          acceptCategoryIntoDropdown: alsoAddToDropdown,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update category");

      toast.success(
        alsoAddToDropdown
          ? `Header updated to "${trimmed}" & added to official dropdown!`
          : `Expense #${recordId} category updated to "${trimmed}"`
      );

      setEditingHeaderRecord(null);
      await fetchCategoryHeaders();
      fetchRecords(false);
      fetchAllPendingApprovals();
    } catch (err: any) {
      toast.error(err.message || "Failed to save category edit");
    } finally {
      setSavingHeaderEdit(false);
    }
  };



  // State & Handler to update existing expense category from table dropdown
  const [updatingCategoryId, setUpdatingCategoryId] = useState<number | null>(null);

  const handleUpdateExpenseCategory = async (recordId: number, newCategory: string) => {
    const trimmed = newCategory.trim().toUpperCase();
    if (!trimmed) return;

    // Optimistically update local state so table updates instantly
    setRecords((prev) =>
      prev.map((r) => (r.id === recordId ? { ...r, category: trimmed } : r))
    );

    try {
      setUpdatingCategoryId(recordId);
      const res = await fetch(`/api/admin/expense-records/${recordId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update expense category");

      toast.success(`Expense category updated to "${trimmed}"`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update category");
      fetchRecords(false);
    } finally {
      setUpdatingCategoryId(null);
    }
  };

  // State & Handler to update existing expense due date from table inline datepicker
  const [updatingDueDateId, setUpdatingDueDateId] = useState<number | null>(null);

  const handleUpdateExpenseDueDate = async (recordId: number, newDateVal: string) => {
    let optimisticDueDate: string | null = newDateVal ? newDateVal : null;
    let optimisticDueDateStr: string | null = null;
    if (newDateVal) {
      const d = new Date(newDateVal);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, "0");
        const month = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
        const year = d.getFullYear();
        optimisticDueDateStr = `${day} ${month} ${year}`;
      }
    }

    // Optimistically update
    setRecords((prev) =>
      prev.map((r) =>
        r.id === recordId
          ? {
            ...r,
            dueDate: optimisticDueDate,
            dueDateStr: optimisticDueDateStr,
          }
          : r
      )
    );

    try {
      setUpdatingDueDateId(recordId);
      const res = await fetch(`/api/admin/expense-records/${recordId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: newDateVal || null }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update payment due date");

      if (data.data) {
        setRecords((prev) =>
          prev.map((r) =>
            r.id === recordId
              ? {
                ...r,
                dueDate: data.data.dueDate,
                dueDateStr: data.data.dueDateStr,
              }
              : r
          )
        );
      }

      if (newDateVal) {
        toast.success(`Payment due date set to ${optimisticDueDateStr || newDateVal}`);
      } else {
        toast.info("Payment due date removed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update payment due date");
      fetchRecords(false);
    } finally {
      setUpdatingDueDateId(null);
    }
  };

  // Quick Due Date Modal handlers

  const openDueDatePicker = (rec: ExpenseRecordItem) => {
    setDueDatePickerRecord(rec);
    const rawYMD = rec.dueDate ? new Date(rec.dueDate).toISOString().split("T")[0] : "";
    setDueDatePickerValue(rawYMD);
  };

  const applyDueDatePreset = (daysFromNow: number | "endOfMonth") => {
    const d = new Date();
    if (daysFromNow === "endOfMonth") {
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      setDueDatePickerValue(end.toISOString().split("T")[0]);
    } else {
      d.setDate(d.getDate() + daysFromNow);
      setDueDatePickerValue(d.toISOString().split("T")[0]);
    }
  };

  const handleSaveQuickDueDate = async () => {
    if (!dueDatePickerRecord) return;
    setSavingDueDate(true);
    try {
      await handleUpdateExpenseDueDate(dueDatePickerRecord.id, dueDatePickerValue);
      setDueDatePickerRecord(null);
    } finally {
      setSavingDueDate(false);
    }
  };



  // Open Add Modal
  const openAddModal = () => {
    setEditingRecord(null);
    const today = new Date().toISOString().split("T")[0];
    const initialLocation =
      selectedLocation !== "ALL"
        ? selectedLocation
        : locations.length > 0
          ? String(locations[0].id)
          : "";

    const fallbackCat =
      categoryHeaders.length > 0 ? categoryHeaders[0] : FIXED_EXPENSE_TYPES[0];

    setIsCustomCategoryMode(false);
    setCustomCategoryInput("");

    setFormData({
      locationId: initialLocation,
      expenseDate: today,
      dueDate: "",
      category: fallbackCat,
      customCategory: "",
      description: "",
      quantity: "1",
      rate: "",
      amount: "",
      paymentMode: "", // Not mandated
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
          ? "Accountants cannot edit expenses entered by Community Managers. Use 'Enter Vendor & Billing Breakdown' to add vendor and billing details."
          : "Community Managers cannot edit expenses entered by Accountants."
      );
      return;
    }

    setEditingRecord(rec);
    const dateFormatted = rec.expenseDate
      ? new Date(rec.expenseDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    let dueDateFormatted = "";
    if (rec.dueDate) {
      const d = new Date(rec.dueDate);
      if (!isNaN(d.getTime())) {
        dueDateFormatted = d.toISOString().split("T")[0];
      }
    } else if (rec.dueDateStr) {
      const d = new Date(rec.dueDateStr);
      if (!isNaN(d.getTime())) {
        dueDateFormatted = d.toISOString().split("T")[0];
      }
    }

    const fallbackCat =
      categoryHeaders.length > 0 ? categoryHeaders[0] : FIXED_EXPENSE_TYPES[0];

    const isCustom = Boolean(rec.category && !officialCategoryOptions.includes(rec.category));
    setIsCustomCategoryMode(isCustom);
    setCustomCategoryInput(isCustom && rec.category ? rec.category : "");

    setFormData({
      locationId: rec.locationId || "",
      expenseDate: dateFormatted,
      dueDate: dueDateFormatted,
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
    const isAccountantRecord =
      rec.createdByRole === "ACCOUNTANT" ||
      rec.createdByName?.toLowerCase()?.includes("account");
    const isPaymentApproved =
      rec.paymentApprovalStatus === "APPROVED" ||
      rec.paymentStatus === "PAID" ||
      Boolean(rec.utrNumber) ||
      (!onOffSAApproval && (isAccountant || isAccountantRecord));

    if (!isPaymentApproved && !isAdmin) {
      toast.error("Super Admin must approve payment (Sir Pays) before recording UTR and disbursal details.");
      return;
    }

    setApprovingRecord(rec);
    const today = new Date().toISOString().split("T")[0];
    const matchedVendor = vendors.find(
      (v) =>
        (rec.vendorId && String(v.id) === String(rec.vendorId)) ||
        (rec.vendorName && v.vendorName?.toLowerCase().trim() === rec.vendorName.toLowerCase().trim())
    );
    const recipient = matchedVendor?.email || rec.alertEmailSentTo || "";
    setApprovalData({
      paymentDate: rec.utrDate || rec.payReceiveDate || today,
      utrNumber: rec.utrNumber || "",
      paymentMode: rec.accPaymentMode || rec.paymentMode || "Bank Transfer",
      paymentProofUrl: rec.paymentProofUrl || rec.utrFileUrl || "",
      approvalRemarks: rec.approvalRemarks || "",
      sendAlertEmail: Boolean(recipient),
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
    const matchedVendor = vendors.find(
      (v) =>
        (rec.vendorId && String(v.id) === String(rec.vendorId)) ||
        (rec.vendorName && v.vendorName?.toLowerCase().trim() === rec.vendorName.toLowerCase().trim())
    );
    const recipient = matchedVendor?.email || rec.alertEmailSentTo || "";

    if (!recipient) {
      toast.error(
        `No email address found for vendor "${rec.vendorName || "Vendor"}". Please open Disbursal details and enter vendor email.`
      );
      openApproveModal(rec);
      return;
    }

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
      toast.success(data.message || `Payment alert email successfully dispatched to ${recipient}!`);
      fetchRecords(false);
    } catch (err: any) {
      toast.error(err.message || "Error dispatching vendor email");
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
    // Vendor and remarks are optional as requested (do not mandate)

    if (isCustomCategoryMode && !customCategoryInput.trim()) {
      toast.error("Please enter your custom / proposed category header");
      return;
    }

    const rawCategory = isCustomCategoryMode ? customCategoryInput : formData.category;
    const finalCategory = rawCategory.trim().toUpperCase() || "GENERAL EXPENSE";

    const isEdit = Boolean(editingRecord);
    const isCurrentlyRejected =
      editingRecord?.approvalStatus === "REJECTED_BY_ACCOUNTANT" ||
      editingRecord?.approvalStatus === "REJECTED_BY_SUPER_ADMIN";

    const payload: any = {
      locationId: Number(formData.locationId),
      expenseDate: formData.expenseDate,
      dueDate: formData.dueDate ? formData.dueDate : null,
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
      ...(isCurrentlyRejected ? { resubmit: true } : {}),
      ...(isEdit && isAdmin && formData.approvalStatus ? { approvalStatus: formData.approvalStatus } : {}),
      // Only keep accountant fields if already populated and authorized
      ...(formData.payReceiveDate ? { payReceiveDate: formData.payReceiveDate } : {}),
      ...(formData.receiveAmount ? { receiveAmount: Number(formData.receiveAmount) } : {}),
      ...(formData.accPaymentMode ? { accPaymentMode: formData.accPaymentMode } : {}),
      ...(formData.utrNumber ? { utrNumber: formData.utrNumber.trim() } : {}),
      ...(formData.utrDate ? { utrDate: formData.utrDate } : {}),
      ...(formData.tdsDeducted ? { tdsDeducted: formData.tdsDeducted } : {}),
      ...(formData.tdsAmount ? { tdsAmount: Number(formData.tdsAmount) } : {}),
    };

    try {
      setSavingForm(true);
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
          ? isCurrentlyRejected
            ? "Expense corrected & resubmitted successfully for review!"
            : "Expense record updated successfully!"
          : isAccountant
            ? !onOffSAApproval
              ? "Expense created and auto-approved! No Super Admin approval needed."
              : "Expense created! Submitted for Super Admin approval."
            : "Expense created! Submitted for Accountant validation."
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
    // UTR and disbursal details are optional (do not mandate)

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
        data.message || "Expense approved and payment recorded successfully!"
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

    const isAccountantRecord =
      settlingRecord.createdByRole === "ACCOUNTANT" ||
      settlingRecord.createdByName?.toLowerCase()?.includes("account");
    const isAlreadyPaymentApproved =
      settlingRecord.paymentApprovalStatus === "APPROVED" ||
      settlingRecord.paymentStatus === "PAID" ||
      (!onOffSAApproval && (isAccountant || isAccountantRecord));

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
        uploadedInBankPortal: Boolean(settleData.uploadedInBankPortal),
        remarks: settleData.remarks ? settleData.remarks.trim() : null,
        approvalStatus: "APPROVED",
        accountantApprovalStatus: "APPROVED",
        // If payment was already approved, keep APPROVED; otherwise set PENDING to request Sir's payment approval
        paymentApprovalStatus: isAlreadyPaymentApproved ? "APPROVED" : "PENDING",
        ...(isAlreadyPaymentApproved
          ? {
            utrNumber: settleData.utrNumber ? settleData.utrNumber.trim() : (settlingRecord.utrNumber || null),
            utrDate: settleData.utrDate || settleData.payReceiveDate || settlingRecord.utrDate || null,
            payReceiveDate: settleData.payReceiveDate || settleData.utrDate || settlingRecord.payReceiveDate || null,
            accPaymentMode: settleData.accPaymentMode || settlingRecord.accPaymentMode || "Bank Transfer",
            utrFileUrl: settleData.utrFileUrl || settlingRecord.utrFileUrl || null,
            paymentStatus: (settleData.utrNumber || settleData.payReceiveDate || settleData.utrDate)
              ? "PAID"
              : (settlingRecord.paymentStatus || "PENDING"),
          }
          : {
            paymentStatus: "PENDING",
          }),
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

      // If payment already approved and UTR entered with sendAlertEmail checked, dispatch alert to vendor
      if (isAlreadyPaymentApproved && settleData.utrNumber && settleData.sendAlertEmail) {
        try {
          const matchedVendor = vendors.find(
            (v) =>
              (settleData.vendorId && String(v.id) === String(settleData.vendorId)) ||
              (settleData.vendorName && v.vendorName?.toLowerCase().trim() === settleData.vendorName.toLowerCase().trim())
          );
          const recipient = matchedVendor?.email || settlingRecord.alertEmailSentTo || "";
          if (recipient) {
            await fetch(`/api/admin/expense-records/${settlingRecord.id}/approve`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "DISBURSE_PAYMENT",
                paymentDate: settleData.utrDate || new Date().toISOString().split("T")[0],
                utrNumber: settleData.utrNumber,
                sendAlertEmail: true,
                alertEmailRecipient: recipient,
              }),
            });
          }
        } catch (alertErr) {
          console.error("Failed to send alert email:", alertErr);
        }
      }

      toast.success(
        isAlreadyPaymentApproved
          ? "Payment details updated successfully!"
          : "Billing details saved & sent for Super Admin 3rd Payment Approval (Sir to Pay)!",
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

  // Accountant Validates CM Expense -> Forwards to Super Admin
  const handleAccountantValidateAndApprove = async (rec: ExpenseRecordItem) => {
    try {
      setApproving(true);
      const res = await fetch(`/api/admin/expense-records/${rec.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ACCOUNTANT_APPROVE" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Validation failed");

      toast.success(
        `Expense #${rec.id} validated by Accountant! Forwarded to Super Admin for approval.`,
        { duration: 4000 }
      );
      fetchRecords(false);
      fetchAllPendingApprovals();
    } catch (err: any) {
      toast.error(err.message || "Failed to validate expense");
    } finally {
      setApproving(false);
    }
  };

  // Super Admin Approval for Base Expense Requisition (Step 2)
  const handleSuperAdminApprove = async (
    recordId: number,
    optionalUtr?: string,
    optionalDate?: string
  ) => {
    try {
      setApproving(true);
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(`/api/admin/expense-records/${recordId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUPER_ADMIN_APPROVE",
          ...(optionalUtr ? { utrNumber: optionalUtr, paymentDate: optionalDate || today } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approval failed");

      toast.success(
        "Expense Requisition Approved by Super Admin! Accountant can now enter Vendor Breakdown & request payment approval.",
        { duration: 4000 }
      );

      setApprovingRecord(null);
      await fetchAllPendingApprovals();
      fetchRecords(false);
    } catch (err: any) {
      toast.error(err.message || "Approval failed");
    } finally {
      setApproving(false);
    }
  };

  // Entry point for Super Admin approving Step 2:
  // Detects if CM/Accountant entered a custom category header.
  // If custom: prompts Super Admin to decide whether to Keep (add to predefined list) or Change (reassign from dropdown).
  // If standard/predefined: proceeds directly with regular approval.
  const handleInitiateSuperAdminApprove = (rec: ExpenseRecordItem) => {
    if (!isPredefinedCategory(rec.category)) {
      setCustomHeaderReviewRecord(rec);
      setCustomHeaderAction("keep");
      setReassignCategoryChoice(officialCategoryOptions[0] || FIXED_EXPENSE_TYPES[0]);
    } else {
      handleSuperAdminApprove(rec.id);
    }
  };

  // Super Admin confirms custom header decision (Keep & Add to Predefined, or Reassign to existing)
  const handleConfirmCustomHeaderApproval = async () => {
    if (!customHeaderReviewRecord) return;
    setIsReviewingCustomHeaderSubmitting(true);
    try {
      if (customHeaderAction === "keep") {
        const rawCat = customHeaderReviewRecord.category || "GENERAL EXPENSE";
        const catName = rawCat.trim().toUpperCase();

        const res = await fetch(`/api/admin/expense-records/${customHeaderReviewRecord.id}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "SUPER_ADMIN_APPROVE",
            category: catName,
            acceptCategoryIntoDropdown: true,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Approval failed");

        setCategoryHeaders((prev) => Array.from(new Set([...prev, catName])));
        toast.success(
          `Custom Header "${catName}" kept, added to Predefined Categories list, and Expense Requisition Approved!`,
          { duration: 5000 }
        );
      } else {
        // "change"
        const newCat = (reassignCategoryChoice || officialCategoryOptions[0] || FIXED_EXPENSE_TYPES[0]).trim().toUpperCase();

        const res = await fetch(`/api/admin/expense-records/${customHeaderReviewRecord.id}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "SUPER_ADMIN_APPROVE",
            category: newCat,
            acceptCategoryIntoDropdown: false,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Approval failed");

        toast.success(
          `Expense category reclassified to "${newCat}" and Approved!`,
          { duration: 5000 }
        );
      }

      setCustomHeaderReviewRecord(null);
      await fetchCategoryHeaders();
      await fetchAllPendingApprovals();
      fetchRecords(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to process custom header review");
    } finally {
      setIsReviewingCustomHeaderSubmitting(false);
    }
  };

  // Accountant Requests Super Admin Payment Approval (Sir Pays & Disbursal)
  const handleRequestPaymentApproval = async (rec: ExpenseRecordItem) => {
    try {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === rec.id
            ? { ...r, paymentApprovalStatus: "PENDING" }
            : r
        )
      );

      const res = await fetch(`/api/admin/expense-records/${rec.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REQUEST_PAYMENT_APPROVAL" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to request payment approval");

      toast.success(
        `Payment approval request submitted to Super Admin (Sir) for Expense #${rec.id}!`,
        { duration: 4000 }
      );
      fetchRecords(false);
      fetchAllPendingApprovals();
    } catch (err: any) {
      toast.error(err.message || "Failed to request payment approval");
      fetchRecords(false);
    }
  };

  // Super Admin Approves Payment Disbursal ("Sir Pays")
  const handleApprovePayment = async (recordId: number) => {
    try {
      setApproving(true);
      const res = await fetch(`/api/admin/expense-records/${recordId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "PAYMENT_SUPER_ADMIN_APPROVE" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment approval failed");

      toast.success(
        "Payment Approved by Super Admin (Sir)! Accountant can now enter UTR, payment date & disbursal remarks.",
        { duration: 4000 }
      );
      await fetchAllPendingApprovals();
      fetchRecords(false);
    } catch (err: any) {
      toast.error(err.message || "Payment approval failed");
    } finally {
      setApproving(false);
    }
  };

  // Super Admin Submits Payment Rejection with mandatory remarks
  const handleSubmitPaymentRejection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingPaymentRecord) return;
    const reason = paymentRejectionReason.trim();
    if (!reason) {
      toast.error("Please provide remarks/reason for payment rejection.");
      return;
    }

    try {
      setIsRejectingPaymentSubmitting(true);
      const res = await fetch(`/api/admin/expense-records/${rejectingPaymentRecord.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "PAYMENT_SUPER_ADMIN_REJECT",
          remarks: reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject payment");

      toast.success(
        data.message || `Payment for Expense #${rejectingPaymentRecord.id} rejected with remarks.`,
        { duration: 4000 }
      );

      setRejectingPaymentRecord(null);
      setPaymentRejectionReason("");
      fetchRecords(false);
      fetchAllPendingApprovals();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject payment");
    } finally {
      setIsRejectingPaymentSubmitting(false);
    }
  };

  // Submit Rejection (Accountant or Super Admin) with mandatory remarks
  const handleSubmitRejection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRecord) return;
    const reason = rejectionReason.trim();
    if (!reason) {
      toast.error("Please provide remarks/reason for rejection.");
      return;
    }

    try {
      setIsRejectingSubmitting(true);
      const isSuperAdminAction =
        isAdmin &&
        (rejectingRecord.approvalStatus === "PENDING_SUPER_ADMIN_APPROVAL" ||
          rejectingRecord.accountantApprovalStatus === "APPROVED");

      const action = isSuperAdminAction ? "SUPER_ADMIN_REJECT" : "ACCOUNTANT_REJECT";

      const res = await fetch(`/api/admin/expense-records/${rejectingRecord.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          remarks: reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject expense");

      toast.success(
        data.message ||
        `Expense #${rejectingRecord.id} rejected with remarks and returned for correction.`,
        { duration: 4000 }
      );

      setRejectingRecord(null);
      setRejectionReason("");
      fetchRecords(false);
      fetchAllPendingApprovals();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject expense");
    } finally {
      setIsRejectingSubmitting(false);
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
          r.id === rec.id
            ? {
              ...r,
              approvalStatus: "PENDING_SUPER_ADMIN_APPROVAL",
              accountantApprovalStatus: "APPROVED",
            }
            : r
        )
      );
      const res = await fetch(`/api/admin/expense-records/${rec.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalStatus: "PENDING_SUPER_ADMIN_APPROVAL",
          accountantApprovalStatus: "APPROVED",
        }),
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
          ? "Accountants cannot delete expenses entered by Community Managers."
          : "Community Managers cannot delete expenses entered by Accountants."
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
            {/* Super Admin Dedicated Approvals Button (Badge across ALL centres) - strictly Super Admin only */}
            {isSuperAdminUser && (
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

            {/* View Mode Switcher (Strictly Super Admin Only) */}
            {isSuperAdminUser && (
              <div className="flex items-center bg-gray-100 p-0.5 border border-gray-300">
                <button
                  type="button"
                  onClick={() => setActiveViewMode("CM")}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${activeViewMode === "CM"
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
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${activeViewMode === "ACCOUNTANT"
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

            {/* Record Center Operating Expense Button (Opens Modal for CM & Accountant) */}
            <button
              type="button"
              onClick={openAddModal}
              className="bg-[#006064] hover:bg-[#00838f] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Record Center Operating Expense: Enter operational expense and attach bill PDF"
            >
              <Plus className="w-4 h-4" />
              <span>Record Center Operating Expense</span>
            </button>
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
            <span className="text-[10px] text-amber-700 font-mono">
              {!onOffSAApproval && isAccountant ? "Pending Disbursal" : "Awaiting SA Approval"}
            </span>
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
              className={`px-3 py-1 text-xs font-bold uppercase transition-all whitespace-nowrap cursor-pointer border ${selectedLocation === "ALL"
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
                  className={`px-3 py-1 text-xs font-bold uppercase transition-all whitespace-nowrap cursor-pointer border flex items-center gap-1.5 ${isSelected
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
          <div className="flex items-center gap-2 flex-wrap">
            {/* Target Basis Switcher */}
            <div className="flex items-center gap-1 bg-amber-50/80 p-0.5 border border-amber-300/80 text-xs shadow-2xs">
              <span className="text-[10.5px] font-bold text-amber-900 uppercase px-1.5 flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3 text-amber-700" />
                Target:
              </span>
              <button
                type="button"
                onClick={() => setDateTarget("EXPENSE_DATE")}
                className={`px-2 py-0.5 text-[11px] font-bold uppercase cursor-pointer transition-all ${dateTarget === "EXPENSE_DATE"
                  ? "bg-[#006064] text-white shadow-2xs"
                  : "text-gray-700 hover:text-gray-900 hover:bg-amber-100/50"
                  }`}
                title="Filter records using the date expense was incurred / entered"
              >
                Expense Date
              </button>
              <button
                type="button"
                onClick={() => setDateTarget("PAYMENT_DATE")}
                className={`px-2 py-0.5 text-[11px] font-bold uppercase cursor-pointer transition-all ${dateTarget === "PAYMENT_DATE"
                  ? "bg-[#006064] text-white shadow-2xs"
                  : "text-gray-700 hover:text-gray-900 hover:bg-amber-100/50"
                  }`}
                title="Filter records using the payment date (when Sir/Accountant paid & settled UTR)"
              >
                Payment Date
              </button>
            </div>

            {/* Date Filter Modes */}
            <div className="flex items-center gap-1 bg-gray-100 p-0.5 border border-gray-300 text-xs">
              <button
                type="button"
                onClick={() => setFilterType("ALL")}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase cursor-pointer transition-all ${filterType === "ALL" ? "bg-[#006064] text-white shadow-2xs" : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterType("MONTH")}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase cursor-pointer transition-all ${filterType === "MONTH" ? "bg-[#006064] text-white shadow-2xs" : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => setFilterType("YEAR")}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase cursor-pointer transition-all ${filterType === "YEAR" ? "bg-[#006064] text-white shadow-2xs" : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                Year
              </button>
              <button
                type="button"
                onClick={() => setFilterType("DATE")}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase cursor-pointer transition-all ${filterType === "DATE" ? "bg-[#006064] text-white shadow-2xs" : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                Date
              </button>
              <button
                type="button"
                onClick={() => setFilterType("CUSTOM")}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase cursor-pointer transition-all ${filterType === "CUSTOM" ? "bg-[#006064] text-white shadow-2xs" : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                Custom Range
              </button>
              <button
                type="button"
                onClick={() => setFilterType("MATCH")}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase cursor-pointer transition-all flex items-center gap-1 ${filterType === "MATCH" ? "bg-[#006064] text-white shadow-2xs" : "text-gray-600 hover:text-gray-900"
                  }`}
                title="Select both Expense Date and Payment Date to find exact matched entries or same day disbursals"
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                Match Dates
              </button>
            </div>
          </div>

          {/* Active Date Filter Inputs */}
          <div className="flex items-center gap-2 flex-wrap">
            {filterType === "MONTH" && (
              <div className="relative min-w-[210px]">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full bg-[#fafafa] border border-[#006064] px-3 py-1.5 text-xs font-bold text-gray-900 focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="ALL">
                    All Months ({dateTarget === "PAYMENT_DATE" ? "Pay Date" : "Expense Date"})
                  </option>
                  {displayedAvailableMonths.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label} ({m.count} expenses)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
              </div>
            )}

            {filterType === "YEAR" && (
              <div className="relative min-w-[170px]">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full bg-[#fafafa] border border-[#006064] px-3 py-1.5 text-xs font-bold text-gray-900 focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="ALL">
                    All Years ({dateTarget === "PAYMENT_DATE" ? "Pay Date" : "Expense Date"})
                  </option>
                  {displayedAvailableYears.map((y) => (
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
                <span className="text-[10px] text-gray-500 font-bold uppercase">
                  {dateTarget === "PAYMENT_DATE" ? "Pay Date:" : "Expense Date:"}
                </span>
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
                    className="p-1 text-gray-400 hover:text-red-600 text-xs font-bold cursor-pointer"
                    title="Clear Date"
                  >
                    ×
                  </button>
                )}
              </div>
            )}

            {filterType === "CUSTOM" && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-gray-500 font-bold uppercase">
                  {dateTarget === "PAYMENT_DATE" ? "Pay Range:" : "Range:"}
                </span>
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
                    className="px-2 py-1 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-[10.5px] font-bold border border-gray-300 cursor-pointer"
                    title="Clear Custom Range"
                  >
                    Clear Range
                  </button>
                )}
              </div>
            )}

            {filterType === "MATCH" && (
              <div className="flex items-center gap-2 flex-wrap bg-teal-50/80 px-2.5 py-1 border border-teal-300 shadow-2xs">
                <div className="flex items-center gap-1">
                  <span className="text-[10.5px] text-[#006064] font-bold uppercase whitespace-nowrap">
                    1. Expense Date:
                  </span>
                  <input
                    type="date"
                    value={matchExpenseDate}
                    onChange={(e) => setMatchExpenseDate(e.target.value)}
                    className="bg-white border border-[#006064] px-2 py-1 text-xs font-bold text-gray-900 focus:outline-none"
                  />
                  {matchExpenseDate && (
                    <button
                      type="button"
                      onClick={() => setMatchExpenseDate("")}
                      className="text-gray-400 hover:text-red-600 text-xs font-bold px-0.5 cursor-pointer"
                      title="Clear Expense Date"
                    >
                      ×
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10.5px] text-[#006064] font-bold uppercase whitespace-nowrap">
                    2. Payment Date:
                  </span>
                  <input
                    type="date"
                    value={matchPaymentDate}
                    onChange={(e) => setMatchPaymentDate(e.target.value)}
                    className="bg-white border border-[#006064] px-2 py-1 text-xs font-bold text-gray-900 focus:outline-none"
                  />
                  {matchPaymentDate && (
                    <button
                      type="button"
                      onClick={() => setMatchPaymentDate("")}
                      className="text-gray-400 hover:text-red-600 text-xs font-bold px-0.5 cursor-pointer"
                      title="Clear Payment Date"
                    >
                      ×
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setMatchSameDay(!matchSameDay)}
                  className={`px-2.5 py-1 text-[10.5px] font-bold border transition-all cursor-pointer whitespace-nowrap ${matchSameDay
                    ? "bg-[#006064] text-white border-[#006064] shadow-2xs"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  title="Show only records where Expense Date and Payment Date match exactly"
                >
                  {matchSameDay ? "✓ Same Day Matched" : "Match Same Day (Exp = Pay)"}
                </button>
                {(matchExpenseDate || matchPaymentDate || matchSameDay) && (
                  <button
                    type="button"
                    onClick={() => {
                      setMatchExpenseDate("");
                      setMatchPaymentDate("");
                      setMatchSameDay(false);
                    }}
                    className="px-2 py-1 bg-white hover:bg-red-50 text-red-600 text-[10.5px] font-bold border border-red-200 cursor-pointer"
                    title="Reset Match Dates"
                  >
                    Reset
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

          {/* Payment Status Filter */}
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

          {/* Approval Status Filter */}
          <div className="relative">
            <select
              value={selectedApprovalStatus}
              onChange={(e) => setSelectedApprovalStatus(e.target.value)}
              className="w-full bg-[#fafafa] border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 focus:outline-none focus:border-[#006064] appearance-none cursor-pointer"
            >
              <option value="ALL">All Approval Stages</option>
              <option value="PENDING_ACCOUNTANT_APPROVAL">⏳ Pending Accountant Check</option>
              <option value="PENDING_SUPER_ADMIN_APPROVAL">⏳ Pending Super Admin Approval</option>
              <option value="APPROVED">✓ Approved (Ready for Payment)</option>
              <option value="REJECTED_BY_ACCOUNTANT">✕ Rejected by Accountant</option>
              <option value="REJECTED_BY_SUPER_ADMIN">✕ Rejected by Super Admin</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
          </div>
        </div>
      </div>

      {/* ── STRUCTURED EXPENSE DATA TABLE WITH FROZEN HEADERS & COLUMN CONTROLS ── */}
      <div className="bg-white border border-gray-200 shadow-2xs overflow-hidden relative">
        {/* ── GOOGLE SHEETS SPREADSHEET TOOLBAR ── */}
        <div className="bg-[#f1f5f9] border-b border-gray-200 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Freeze Indicator & Quick Toggle */}
            {frozenColCount > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setFrozenColCount(0);
                  toast.info("Unfrozen all columns");
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[10.5px] font-bold cursor-pointer transition-colors shadow-2xs"
                title="Click to unfreeze columns"
              >
                <Unlock className="w-3 h-3 text-amber-700" />
                <span>Frozen: {frozenColCount} col{frozenColCount > 1 ? "s" : ""} (Click to Unfreeze)</span>
              </button>
            ) : (
              <span className="text-[10.5px] text-gray-500 font-mono flex items-center gap-1">
                <Lock className="w-3 h-3 text-gray-400" />
                <span>Right-click any column header to freeze or hide</span>
              </span>
            )}

            {/* Hidden Columns Pill & Unhide All */}
            {hiddenColIds.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setHiddenColIds([]);
                  toast.info("All columns restored");
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-[10.5px] font-bold cursor-pointer transition-colors shadow-2xs"
                title="Click to unhide all columns"
              >
                <Eye className="w-3 h-3 text-rose-600" />
                <span>{hiddenColIds.length} column{hiddenColIds.length > 1 ? "s" : ""} hidden (Unhide All)</span>
              </button>
            )}

            {/* Reset Widths */}
            <button
              type="button"
              onClick={handleResetColumnWidths}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-[10.5px] font-medium cursor-pointer shadow-2xs"
              title="Reset all column widths to default"
            >
              <RotateCcw className="w-3 h-3 text-gray-500" />
              <span>Reset Widths</span>
            </button>
          </div>

          {/* Active Filters / Sort Indicator & Count */}
          <div className="flex items-center gap-2 flex-wrap">
            {Object.keys(columnFilters).length > 0 && (
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 border border-amber-300 text-[10.5px] text-amber-900 font-bold">
                <Filter className="w-3 h-3 text-amber-700" />
                <span>{Object.keys(columnFilters).length} column filter{Object.keys(columnFilters).length > 1 ? "s" : ""} active</span>
                <button
                  type="button"
                  onClick={handleClearAllColumnFilters}
                  className="text-red-700 hover:underline font-bold ml-1 cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            )}

            {sortConfig && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-50 border border-cyan-300 text-[10.5px] text-cyan-950 font-bold">
                <span>Sorted by {activeColumns.find((c) => c.id === sortConfig.colId)?.label}</span>
                <span>{sortConfig.direction === "asc" ? "▲" : "▼"}</span>
                <button
                  type="button"
                  onClick={() => setSortConfig(null)}
                  className="text-gray-400 hover:text-red-600 cursor-pointer ml-0.5 font-bold"
                >
                  ×
                </button>
              </div>
            )}

            {/* Small & Sleek View Summary (Leaves table completely visible) */}
            <div className="inline-flex items-center gap-2 text-[10.5px] text-gray-600 bg-white px-2.5 py-0.5 border border-gray-300 shadow-2xs">
              <span className="text-gray-500">View: <strong className="text-[#006064] uppercase font-bold">{activeMonthMeta.label}</strong></span>
              <span className="text-gray-300">|</span>
              <span className="font-bold text-gray-800">{activeMonthMeta.count} Expenses</span>
              <span className="text-gray-300">|</span>
              <span>Month Total: <strong className="text-emerald-900 font-mono font-black">{formatCurrency(activeMonthMeta.total)}</strong></span>
            </div>

            <span className="text-[10px] font-mono text-gray-400">
              ({finalDisplayRecords.length} of {records.length} shown)
            </span>
          </div>
        </div>

        {/* ── SCROLLABLE TABLE VIEWPORT WITH PERMANENTLY STICKY FROZEN HEADERS ── */}
        <div className="overflow-x-auto overflow-y-auto max-h-[72vh] relative border-b border-gray-200">
          <table
            className="w-full text-left border-collapse text-xs table-fixed"
            style={{ minWidth: `${Math.max(totalTableWidth, 1200)}px` }}
          >
            {/* Column Width Definitions */}
            <colgroup>
              {visibleColumns.map((col) => {
                const w = columnWidths[col.id] || col.defaultWidth;
                return (
                  <col
                    key={col.id}
                    style={{ width: `${w}px`, minWidth: `${w}px`, maxWidth: `${w}px` }}
                  />
                );
              })}
            </colgroup>

            {/* ── PERMANENTLY STICKY HEADERS (PHASE GROUPING + COLUMN SUB-HEADERS) ── */}
            <thead className="sticky top-0 z-30 bg-white shadow-xs">
              {/* Row 1: Flow Grouping Super-Header Band */}
              <tr className="border-b border-gray-200 text-[10px] font-mono font-bold uppercase tracking-wider select-none">
                {(() => {
                  const p1 = visibleColumns.filter((c) => c.phase === "1").length;
                  const p2 = visibleColumns.filter((c) => c.phase === "2").length;
                  const p3 = visibleColumns.filter((c) => c.phase === "3").length;
                  return (
                    <>
                      {p1 > 0 && (
                        <th
                          colSpan={p1}
                          className="py-2 px-3 bg-slate-100 text-slate-800 border-r border-slate-300 text-left sticky top-0 z-30"
                        >
                          <div className="flex items-center gap-1.5">
                            <Receipt className="w-3.5 h-3.5 text-[#006064]" />
                            <span>1. Expense Entered ({activeViewMode === "CM" ? "Details & Proof" : "Details & Billing Items"})</span>
                          </div>
                        </th>
                      )}
                      {p2 > 0 && (
                        <th
                          colSpan={p2}
                          className="py-2 px-3 bg-purple-100/90 text-purple-950 border-r border-purple-200 text-center sticky top-0 z-30"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                            <span>2. Approval Workflow (Accountant → Super Admin)</span>
                          </div>
                        </th>
                      )}
                      {p3 > 0 && (
                        <th
                          colSpan={p3}
                          className="py-2 px-3 bg-emerald-100/90 text-emerald-950 text-center sticky top-0 z-30"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                            <span>3. Payment Details (Sir Pays & Disbursal)</span>
                          </div>
                        </th>
                      )}
                    </>
                  );
                })()}
              </tr>

              {/* Row 2: Individual Column Sub-Headers with Filters & Resize Handles */}
              <tr className="bg-[#f8f9fa] border-b border-gray-200 text-gray-700 font-mono text-[9.5px] uppercase tracking-wider sticky top-[31px] z-30 shadow-2xs">
                {visibleColumns.map((col, colIdx) => {
                  const frozen = isColFrozen(colIdx);
                  const lastFrozen = isLastFrozenCol(colIdx);
                  const leftOffset = getStickyLeftOffset(colIdx);
                  const isFiltered = Boolean(columnFilters[col.id]);
                  const isSorted = sortConfig?.colId === col.id;
                  const colWidth = columnWidths[col.id] || col.defaultWidth;

                  return (
                    <th
                      key={col.id}
                      style={{
                        width: `${colWidth}px`,
                        minWidth: `${colWidth}px`,
                        maxWidth: `${colWidth}px`,
                        left: frozen ? `${leftOffset}px` : undefined,
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          colId: col.id,
                          colIdx,
                          colLabel: col.label,
                        });
                      }}
                      className={`py-2.5 px-2 select-none relative group border-r border-gray-200 ${col.align === "right"
                        ? "text-right"
                        : col.align === "center"
                          ? "text-center"
                          : "text-left"
                        } ${col.phase === "2"
                          ? "bg-purple-50/70"
                          : col.phase === "3"
                            ? "bg-emerald-50/60"
                            : "bg-[#f8f9fa]"
                        } ${frozen
                          ? `sticky z-40 ${col.phase === "2" ? "bg-purple-50" : col.phase === "3" ? "bg-emerald-50" : "bg-[#f8f9fa]"}`
                          : ""
                        } ${lastFrozen ? "border-r-2 border-slate-400 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.2)]" : ""}`}
                    >
                      <div
                        className={`flex items-center gap-1 w-full min-w-0 ${col.align === "right"
                          ? "justify-end"
                          : col.align === "center"
                            ? "justify-center"
                            : "justify-between"
                          }`}
                      >
                        {/* Title */}
                        <span
                          onClick={() =>
                            handleSortColumn(
                              col.id,
                              isSorted && sortConfig.direction === "asc" ? "desc" : "asc"
                            )
                          }
                          className="font-bold tracking-wider cursor-pointer hover:text-[#006064] transition-colors truncate min-w-0"
                          title={`Click to sort by ${col.label}. Right-click for freeze/hide.`}
                        >
                          {col.label}
                        </span>

                        {/* Sort Indicator */}
                        {isSorted && (
                          <span className="text-[#006064] font-black shrink-0 text-[10px]">
                            {sortConfig.direction === "asc" ? "▲" : "▼"}
                          </span>
                        )}

                        {/* Google Sheets Filter Button */}
                        {col.id !== "actions" && col.id !== "editAction" && (
                          <button
                            type="button"
                            onClick={(e) => handleOpenColumnFilter(col.id, e)}
                            className={`p-0.5 rounded-xs transition-colors cursor-pointer shrink-0 ${isFiltered
                              ? "bg-amber-400 text-amber-950 font-bold shadow-xs ring-1 ring-amber-500"
                              : "text-gray-400 hover:text-gray-700 hover:bg-gray-200/60"
                              }`}
                            title={`Filter column: ${col.label}`}
                          >
                            <Filter className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>

                      {/* ── GOOGLE SHEETS COLUMN FILTER DROPDOWN POPOVER ── */}
                      {activeColMenu === col.id && (
                        <div
                          ref={colMenuRef}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            left: colIdx > 6 ? "auto" : "0px",
                            right: colIdx > 6 ? "0px" : "auto",
                          }}
                          className="absolute top-full mt-1 w-72 bg-white text-gray-800 shadow-2xl border border-gray-300 rounded-xs z-50 font-sans normal-case tracking-normal overflow-hidden animate-in fade-in duration-100 text-left"
                        >
                          {/* Popover Header */}
                          <div className="bg-[#006064] text-white p-2 px-3 flex items-center justify-between text-xs font-bold">
                            <span className="truncate">{col.label} Filter</span>
                            <div className="flex items-center gap-1.5">
                              {isFiltered && (
                                <button
                                  type="button"
                                  onClick={(e) => handleResetColumnFilter(col.id, e)}
                                  className="text-[10px] text-amber-300 hover:underline"
                                >
                                  Reset
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setActiveColMenu(null)}
                                className="text-white/80 hover:text-white cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Sort Actions */}
                          <div className="p-1.5 border-b border-gray-200 bg-gray-50/70 text-xs space-y-0.5">
                            <button
                              type="button"
                              onClick={() => handleSortColumn(col.id, "asc")}
                              className="w-full px-2.5 py-1 text-left flex items-center gap-2 hover:bg-cyan-50 text-gray-700 hover:text-[#006064] rounded-xs font-medium cursor-pointer"
                            >
                              <ArrowUp className="w-3.5 h-3.5 text-[#006064]" />
                              <span>Sort Ascending ({col.mono ? "Oldest → Newest" : "A → Z"})</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSortColumn(col.id, "desc")}
                              className="w-full px-2.5 py-1 text-left flex items-center gap-2 hover:bg-cyan-50 text-gray-700 hover:text-[#006064] rounded-xs font-medium cursor-pointer"
                            >
                              <ArrowDown className="w-3.5 h-3.5 text-[#006064]" />
                              <span>Sort Descending ({col.mono ? "Newest → Oldest" : "Z → A"})</span>
                            </button>

                            {/* Freeze toggle */}
                            <button
                              type="button"
                              onClick={() => {
                                if (frozen) {
                                  setFrozenColCount(0);
                                } else {
                                  setFrozenColCount(colIdx + 1);
                                }
                                setActiveColMenu(null);
                              }}
                              className="w-full px-2.5 py-1 text-left flex items-center gap-2 hover:bg-cyan-50 text-gray-700 hover:text-[#006064] rounded-xs font-medium cursor-pointer"
                            >
                              {frozen ? (
                                <>
                                  <Unlock className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Unfreeze this column</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3.5 h-3.5 text-[#006064]" />
                                  <span>Freeze up to {col.label}</span>
                                </>
                              )}
                            </button>

                            {/* Hide column */}
                            <button
                              type="button"
                              onClick={() => {
                                setHiddenColIds((prev) => [...prev, col.id]);
                                setActiveColMenu(null);
                                toast.info(`Hidden column "${col.label}"`);
                              }}
                              className="w-full px-2.5 py-1 text-left flex items-center gap-2 hover:bg-rose-50 text-gray-700 hover:text-rose-700 rounded-xs font-medium cursor-pointer"
                            >
                              <EyeOff className="w-3.5 h-3.5 text-rose-600" />
                              <span>Hide this column</span>
                            </button>
                          </div>

                          {/* Filter by Values (Google Sheets style) */}
                          <div className="p-2 space-y-2">
                            <div className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider">
                              Filter by Values
                            </div>

                            {/* Search Values inside Filter */}
                            <div className="relative">
                              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                placeholder="Search values..."
                                value={filterSearchQuery}
                                onChange={(e) => setFilterSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-2.5 py-1 text-xs bg-gray-50 border border-gray-300 focus:bg-white focus:border-[#006064] focus:outline-none"
                              />
                              {filterSearchQuery && (
                                <button
                                  type="button"
                                  onClick={() => setFilterSearchQuery("")}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            {/* Quick Actions: Select All / Clear */}
                            {(() => {
                              const { uniqueList, counts } = getColumnUniqueValues(col.id);
                              const filteredValues = filterSearchQuery.trim()
                                ? uniqueList.filter((v) =>
                                  v.toLowerCase().includes(filterSearchQuery.toLowerCase())
                                )
                                : uniqueList;

                              return (
                                <>
                                  <div className="flex items-center justify-between text-[11px] font-bold text-[#006064] px-1 pt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => handleSelectAllFilterValues(filteredValues)}
                                      className="hover:underline cursor-pointer"
                                    >
                                      Select All
                                    </button>
                                    <span className="text-gray-300">|</span>
                                    <button
                                      type="button"
                                      onClick={handleClearAllFilterValues}
                                      className="hover:underline text-gray-600 hover:text-red-700 cursor-pointer"
                                    >
                                      Clear (Untick All)
                                    </button>
                                  </div>

                                  {/* Scrollable Checkbox List with Counts */}
                                  <div className="max-h-40 overflow-y-auto border border-gray-200 bg-gray-50/50 p-1 space-y-0.5 text-xs">
                                    {filteredValues.length === 0 ? (
                                      <div className="p-3 text-center text-gray-400 text-xs italic">
                                        No matching values
                                      </div>
                                    ) : (
                                      filteredValues.map((val) => {
                                        const isChecked = tempFilterValues.includes(val);
                                        const count = counts[val] || 0;

                                        return (
                                          <label
                                            key={val}
                                            className="flex items-center gap-2 px-2 py-1 hover:bg-cyan-50 rounded-xs cursor-pointer select-none text-xs text-gray-800"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={() => handleToggleFilterValue(val)}
                                              className="rounded-xs text-[#006064] focus:ring-0 cursor-pointer h-3.5 w-3.5 accent-[#006064]"
                                            />
                                            <span className="truncate flex-1 font-mono text-[11px]">
                                              {val}
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-mono">
                                              ({count})
                                            </span>
                                          </label>
                                        );
                                      })
                                    )}
                                  </div>

                                  {/* OK / Cancel */}
                                  <div className="pt-1 flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setActiveColMenu(null)}
                                      className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 border border-gray-300 cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleApplyColumnFilter(col.id)}
                                      className="px-4 py-1 bg-[#006064] hover:bg-[#00838f] text-white font-bold text-xs cursor-pointer shadow-2xs"
                                    >
                                      OK
                                    </button>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      )}

                      {/* ── EXCEL STYLE COLUMN RESIZER HANDLE (DRAGGABLE DIVIDER) ── */}
                      <div
                        onMouseDown={(e) => handleStartResize(col.id, e)}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize select-none flex items-center justify-center hover:bg-gray-300 active:bg-amber-400 z-30 group"
                        title="Click & drag to resize column width"
                      >
                        <div className="w-[1.5px] h-3/4 bg-gray-300 group-hover:bg-amber-500 group-active:bg-amber-600" />
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* ── TABLE BODY ROWS WITH RESPONSIVE COLUMN VISIBILITY & STICKY OFFSETS ── */}
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length}
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
              ) : finalDisplayRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length}
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
                        + Record Center Operating Expense
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                finalDisplayRecords.map((rec, index) => {
                  const isRecordByAccountant = isAccountantExpense(rec);
                  const isAutoApprovedByConfig = !onOffSAApproval && isRecordByAccountant;
                  const isApproved =
                    rec.approvalStatus === "APPROVED" || rec.paymentStatus === "PAID" || isAutoApprovedByConfig;
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
                    /* ── RENDER CM ROW ── */
                    return (
                      <tr
                        key={rec.id}
                        className="hover:bg-[#fcfdfd] transition-colors group"
                      >
                        {/* 1. Index */}
                        {(() => {
                          const s = getColStyle("index");
                          if (!s) return null;
                          return (
                            <td style={s.style} className={`py-3 px-2 text-center font-mono text-[11px] text-gray-400 ${s.className}`}>
                              {index + 1}
                            </td>
                          );
                        })()}

                        {/* 2. Coworking Center */}
                        {(() => {
                          const s = getColStyle("center");
                          if (!s) return null;
                          return (
                            <td style={s.style} className={`py-3 px-2.5 whitespace-nowrap ${s.className}`}>
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-800" title={rec.locationName || "HQ"}>
                                <Building2 className="w-3.5 h-3.5 text-[#006064] shrink-0" />
                                <span className="truncate max-w-[125px]">{rec.locationName || "HQ"}</span>
                              </span>
                            </td>
                          );
                        })()}

                        {/* 3. Expense Date */}
                        {(() => {
                          const s = getColStyle("date");
                          if (!s) return null;
                          return (
                            <td style={s.style} className={`py-3 px-2.5 whitespace-nowrap font-medium text-gray-900 text-xs ${s.className}`}>
                              {dateDisplay}
                            </td>
                          );
                        })()}

                        {/* 4. Payment Due Date (Interactive Picker for existing entries) */}
                        {(() => {
                          const s = getColStyle("dueDate");
                          if (!s) return null;
                          const badge = getExpenseDueDateBadge(rec);
                          const formattedDueDate = rec.dueDateStr || (rec.dueDate ? formatExpenseDueDateDisplay(rec.dueDate) : null);

                          return (
                            <td style={s.style} className={`py-3 px-2.5 text-center whitespace-nowrap ${s.className}`}>
                              {formattedDueDate ? (
                                <div className="flex flex-col items-center justify-center gap-0.5">
                                  <div className="inline-flex items-center gap-1 group">
                                    <button
                                      type="button"
                                      onClick={() => openDueDatePicker(rec)}
                                      className="inline-flex items-center gap-1 cursor-pointer hover:text-[#006064] transition-colors group/btn"
                                      title="Click to edit payment due date"
                                    >
                                      <span className="font-mono font-bold text-gray-900 group-hover/btn:text-[#006064] text-[11px] underline decoration-dotted decoration-gray-400 group-hover/btn:decoration-[#006064]">
                                        {formattedDueDate}
                                      </span>
                                      <Calendar className="w-2.5 h-2.5 text-gray-400 group-hover/btn:text-[#006064] shrink-0" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateExpenseDueDate(rec.id, "");
                                      }}
                                      className="text-gray-300 hover:text-red-600 text-xs px-1 font-bold cursor-pointer transition-colors"
                                      title="Clear payment due date"
                                    >
                                      ×
                                    </button>
                                  </div>
                                  {badge && (
                                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[8.5px] border uppercase tracking-tight rounded-2xs ${badge.className}`}>
                                      {badge.isRisk && <AlertTriangle className="w-2 h-2 shrink-0" />}
                                      <span>{badge.text}</span>
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openDueDatePicker(rec)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 text-[#006064] border border-dashed border-cyan-400 hover:border-[#006064] text-[10.5px] font-bold rounded-xs transition-all shadow-2xs cursor-pointer active:scale-95"
                                  title="Click to set payment due date"
                                >
                                  <Calendar className="w-3 h-3 text-[#006064]" />
                                  <span>+ Due Date</span>
                                </button>
                              )}
                            </td>
                          );
                        })()}

                        {/* 5. Vendor / Supplier */}
                        {(() => {
                          const s = getColStyle("vendor");
                          if (!s) return null;
                          return (
                            <td style={s.style} className={`py-3 px-3 whitespace-nowrap ${s.className}`}>
                              {rec.vendorName ? (
                                <div className="text-xs">
                                  <span className="font-bold text-gray-900 block truncate max-w-[155px]" title={rec.vendorName}>{rec.vendorName}</span>
                                  {rec.accountNo && (
                                    <span className="font-mono text-[10px] text-gray-500 block truncate max-w-[155px]">A/C: {rec.accountNo}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic text-[11px]">Unassigned</span>
                              )}
                            </td>
                          );
                        })()}

                        {/* 6. Expense Category */}
                        {(() => {
                          const s = getColStyle("category");
                          if (!s) return null;
                          const isCustom = !isPredefinedCategory(rec.category);
                          return (
                            <td style={s.style} className={`py-3 px-2.5 whitespace-nowrap ${s.className}`}>
                              <div className="flex flex-col gap-0.5">
                                <select
                                  value={rec.category || "GENERAL EXPENSE"}
                                  onChange={(e) => handleUpdateExpenseCategory(rec.id, e.target.value)}
                                  disabled={updatingCategoryId === rec.id}
                                  className={`text-[10px] font-bold uppercase py-1 px-1.5 focus:outline-none cursor-pointer max-w-[155px] truncate shadow-2xs border ${isCustom
                                    ? "bg-amber-50/90 text-amber-900 border-amber-300 focus:border-amber-600"
                                    : "bg-cyan-50/80 hover:bg-cyan-100 text-[#006064] border-cyan-300 focus:border-[#006064]"
                                    }`}
                                  title={isCustom ? "Custom category header entered - awaiting/subject to Super Admin approval" : "Select / change category header"}
                                >
                                  {Array.from(new Set([...officialCategoryOptions, ...(rec.category ? [rec.category] : [])])).map((cat) => (
                                    <option key={cat} value={cat} className="bg-white text-gray-900 font-bold uppercase">{cat}</option>
                                  ))}
                                </select>
                                {isCustom && (
                                  <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded-xs text-[8px] font-black bg-amber-100 text-amber-900 border border-amber-300 w-fit tracking-tight" title="Custom category header entered by user">
                                    ⚡ CUSTOM HEADER
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })()}

                        {/* 7. Payment Mode */}
                        {(() => {
                          const s = getColStyle("paymentMode");
                          if (!s) return null;
                          return (
                            <td style={s.style} className={`py-3 px-2.5 text-center whitespace-nowrap ${s.className}`}>
                              {rec.paymentMode ? (
                                <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-medium border border-gray-200 rounded-xs">
                                  {rec.paymentMode}
                                </span>
                              ) : (
                                <span className="text-gray-300 text-xs font-mono">-</span>
                              )}
                            </td>
                          );
                        })()}

                        {/* 8. Expense Description */}
                        {(() => {
                          const s = getColStyle("description");
                          if (!s) return null;
                          return (
                            <td style={s.style} className={`py-3 px-4 max-w-sm ${s.className}`}>
                              <div className="font-semibold text-gray-900 leading-snug text-xs">{rec.description}</div>
                              <div className="mt-1">{renderEnteredByBadge(rec)}</div>
                            </td>
                          );
                        })()}

                        {/* 9. Amount */}
                        {(() => {
                          const s = getColStyle("amount");
                          if (!s) return null;
                          return (
                            <td style={s.style} className={`py-3 px-3 text-right whitespace-nowrap font-display font-black text-gray-900 text-sm ${s.className}`}>
                              {formatCurrency(rec.amount)}
                            </td>
                          );
                        })()}

                        {/* 10. Receipt / Ref # */}
                        {(() => {
                          const s = getColStyle("receiptNo");
                          if (!s) return null;
                          return (
                            <td style={s.style} className={`py-3 px-2.5 whitespace-nowrap font-mono text-[11px] text-gray-700 ${s.className}`}>
                              {rec.receiptNo ? (
                                <span className="font-semibold text-gray-900 bg-gray-50 px-1.5 py-0.5 border border-gray-200 rounded-2xs">
                                  {rec.receiptNo}
                                </span>
                              ) : (
                                <span className="text-gray-300 text-xs">-</span>
                              )}
                            </td>
                          );
                        })()}

                        {/* 11. Receipt / Bill Doc */}
                        {(() => {
                          const s = getColStyle("attachment");
                          if (!s) return null;
                          return (
                            <td style={s.style} className={`py-3 px-3 text-center whitespace-nowrap ${s.className}`}>
                              <div className="flex flex-col items-center justify-center gap-1">
                                {rec.attachmentUrl && !rec.attachmentUrl.includes("undefined") ? (
                                  <a href={rec.attachmentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-0.5 text-[9.5px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all cursor-pointer shadow-2xs" title="View Attached Receipt Slip / Voucher">
                                    <Receipt className="w-3 h-3 text-amber-700" /> Slip
                                  </a>
                                ) : null}
                                {rec.invoiceUrl && !rec.invoiceUrl.includes("undefined") ? (
                                  <a href={rec.invoiceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-0.5 text-[9.5px] font-bold text-[#006064] bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 transition-all cursor-pointer shadow-2xs" title="View Attached Operational Bill Document">
                                    <FileText className="w-3 h-3 text-[#006064]" /> Bill Doc
                                  </a>
                                ) : null}
                                {!rec.attachmentUrl && !rec.invoiceUrl && <span className="text-gray-300 text-[11px]">-</span>}
                              </div>
                            </td>
                          );
                        })()}

                        {/* 12. Remarks */}
                        {(() => {
                          const s = getColStyle("remarks");
                          if (!s) return null;
                          return (
                            <td style={s.style} className={`py-3 px-3 text-gray-600 max-w-xs text-[11px] border-r border-slate-200 ${s.className}`}>
                              {rec.remarks ? <span className="italic">{rec.remarks}</span> : <span className="text-gray-300">-</span>}
                            </td>
                          );
                        })()}

                        {/* 12b. Edit Expense (Phase 1 Action for CM) */}
                        {(() => {
                          const s = getColStyle("editAction");
                          if (!s) return null;
                          const canEdit = canEditOrDeleteEntry(rec);
                          return (
                            <td style={s.style} className={`py-2.5 px-2 text-center whitespace-nowrap bg-slate-50/50 border-r border-slate-300 ${s.className}`}>
                              {canEdit ? (
                                <button
                                  type="button"
                                  onClick={() => openEditModal(rec)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase bg-[#006064] hover:bg-[#00838f] text-white rounded-xs shadow-2xs transition-all cursor-pointer"
                                  title="Edit Expense Details (No need to scroll right)"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-gray-300 font-mono">-</span>
                              )}
                            </td>
                          );
                        })()}

                        {/* 13. Step 1: Acc Check */}
                        {(() => {
                          const s = getColStyle("accCheck");
                          if (!s) return null;
                          return (
                            <td style={s.style} className={`py-3 px-3 text-center whitespace-nowrap bg-purple-50/20 ${s.className}`}>
                              <div className="flex flex-col items-center justify-center gap-0.5">
                                {rec.accountantApprovalStatus === "APPROVED" ? (
                                  <>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9.5px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                      <Check className="w-2.5 h-2.5 text-emerald-700" /> Verified ✓
                                    </span>
                                    <span className="text-[8px] text-gray-500">{rec.accountantApprovedByName ? `by ${rec.accountantApprovedByName}` : "Accountant"}</span>
                                  </>
                                ) : rec.approvalStatus === "REJECTED_BY_ACCOUNTANT" ? (
                                  <div className="flex flex-col items-center gap-1 w-full max-w-[200px] text-center">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9.5px] font-bold bg-rose-100 text-rose-800 border border-rose-300 rounded shadow-2xs whitespace-nowrap cursor-help" title={rec.rejectionRemarks || rec.accountantRemarks || "Rejected by Accountant"}>
                                      <X className="w-2.5 h-2.5 text-rose-700 shrink-0" /> Rejected
                                    </span>
                                    {(rec.rejectionRemarks || rec.accountantRemarks) && (
                                      <div className="w-full bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5 text-[9px] text-rose-900 leading-snug whitespace-normal break-words text-left shadow-2xs">
                                        <span className="font-bold text-rose-800 block text-[7.5px] uppercase tracking-wide">Reason:</span>
                                        <span className="font-medium">{rec.rejectionRemarks || rec.accountantRemarks}</span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9.5px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                    <Clock className="w-2.5 h-2.5 text-amber-600" /> Pending Check
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })()}

                        {/* 14. Step 2: SA Approval */}
                        {(() => {
                          const s = getColStyle("saApproval");
                          if (!s) return null;
                          return (
                            <td style={s.style} className={`py-3 px-3 text-center whitespace-nowrap bg-purple-50/20 border-r border-purple-200 ${s.className}`}>
                              <div className="flex flex-col items-center justify-center gap-0.5">
                                {rec.approvalStatus === "APPROVED" || isAutoApprovedByConfig ? (
                                  <>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9.5px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                      <Check className="w-2.5 h-2.5 text-emerald-700" /> Approved ✓
                                    </span>
                                    <span className="text-[8px] text-emerald-700 font-semibold">{isAutoApprovedByConfig ? "Auto Approved" : "Ready for Payment"}</span>
                                  </>
                                ) : rec.approvalStatus === "REJECTED_BY_SUPER_ADMIN" ? (
                                  <div className="flex flex-col items-center gap-1 w-full max-w-[220px] text-center">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9.5px] font-bold bg-rose-100 text-rose-800 border border-rose-300 rounded shadow-2xs whitespace-nowrap cursor-help" title={rec.rejectionRemarks || rec.superAdminRemarks || "Rejected by Super Admin"}>
                                      <X className="w-2.5 h-2.5 text-rose-700 shrink-0" /> SA Rejected
                                    </span>
                                    {(rec.rejectionRemarks || rec.superAdminRemarks) && (
                                      <div className="w-full bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5 text-[9px] text-rose-900 leading-snug whitespace-normal break-words text-left shadow-2xs">
                                        <span className="font-bold text-rose-800 block text-[7.5px] uppercase tracking-wide">Reason:</span>
                                        <span className="font-medium">{rec.rejectionRemarks || rec.superAdminRemarks}</span>
                                      </div>
                                    )}
                                  </div>
                                ) : (rec.accountantApprovalStatus === "APPROVED" || rec.approvalStatus === "PENDING_SUPER_ADMIN_APPROVAL" || rec.approvalStatus === "PENDING_APPROVAL") ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9.5px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                                    <Clock className="w-2.5 h-2.5 text-purple-700" /> Pending SA
                                  </span>
                                ) : (
                                  <span className="text-[8.5px] text-gray-400 font-mono bg-gray-50 px-1.5 py-0.5 border border-gray-200">
                                    Waiting on Step 1
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })()}

                        {/* 11. UTR & Pay Date */}
                        {(() => {
                          const s = getColStyle("utrDate");
                          if (!s) return null;
                          return (
                            <td style={s.style} className={`py-3 px-2 text-center bg-emerald-50/10 ${s.className}`}>
                              {rec.utrNumber ? (
                                <div className="flex flex-col items-center justify-center max-w-full px-0.5">
                                  <span
                                    className="font-mono text-[10px] font-bold text-emerald-950 bg-emerald-50/90 px-1.5 py-0.5 border border-emerald-200/80 rounded-xs break-all max-w-full text-center leading-tight line-clamp-2 select-all"
                                    title={rec.utrNumber}
                                  >
                                    {rec.utrNumber}
                                  </span>
                                  {rec.payReceiveDate && <span className="text-[9px] text-gray-500 font-mono mt-0.5 whitespace-nowrap">{rec.payReceiveDate}</span>}
                                </div>
                              ) : rec.approvalStatus === "APPROVED" ? (
                                <span className="text-amber-800 text-[10px] font-semibold whitespace-nowrap">Awaiting Disbursal</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] text-gray-400 font-mono bg-gray-50 px-1.5 py-0.5 border border-gray-200 whitespace-nowrap">
                                  <Lock className="w-2.5 h-2.5 text-gray-400" /> Locked
                                </span>
                              )}
                            </td>
                          );
                        })()}

                        {/* 12. Payment Status */}
                        {(() => {
                          const s = getColStyle("paymentStatus");
                          if (!s) return null;
                          return (
                            <td style={s.style} className={`py-3 px-3 text-center whitespace-nowrap bg-emerald-50/10 ${s.className}`}>
                              {rec.paymentStatus === "PAID" || rec.utrNumber ? (
                                <span className="px-2 py-0.5 text-[9.5px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">Paid ✓</span>
                              ) : (
                                <span className="px-2 py-0.5 text-[9.5px] font-bold bg-amber-50 text-amber-800 border border-amber-300">Pending</span>
                              )}
                            </td>
                          );
                        })()}

                        {/* 13. Actions */}
                        {(() => {
                          const s = getColStyle("actions");
                          if (!s) return null;
                          return (
                            <td style={s.style} className={`py-3 px-3 text-right whitespace-nowrap bg-emerald-50/10 ${s.className}`}>
                              <div className="inline-flex items-center justify-end gap-1">
                                {(rec.approvalStatus === "REJECTED_BY_ACCOUNTANT" || rec.approvalStatus === "REJECTED_BY_SUPER_ADMIN") && canEditOrDeleteEntry(rec) && (
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(rec)}
                                    className="px-2 py-1 text-[9.5px] font-bold uppercase bg-amber-500 hover:bg-amber-600 text-white shadow-2xs cursor-pointer transition-all flex items-center gap-1"
                                    title="Click to correct details and resubmit this rejected expense"
                                  >
                                    <RefreshCw className="w-2.5 h-2.5" /> Resubmit
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setViewingPaymentRecord(rec);
                                    setIsViewPaymentModalOpen(true);
                                  }}
                                  className="p-1 text-gray-500 hover:text-[#006064] hover:bg-cyan-50 border border-gray-200 transition-all cursor-pointer"
                                  title="View Full Payment Breakdown"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>

                                {canEditOrDeleteEntry(rec) && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => openEditModal(rec)}
                                      title="Edit Expense Details"
                                      className="p-1 text-gray-600 hover:text-[#006064] hover:bg-cyan-50 border border-transparent hover:border-cyan-200 transition-all cursor-pointer"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(rec.id)}
                                      disabled={deletingId === rec.id}
                                      title="Delete Expense Record"
                                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all cursor-pointer disabled:opacity-40"
                                    >
                                      {deletingId === rec.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                                      ) : (
                                        <Trash2 className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          );
                        })()}
                      </tr>
                    );
                  }

                  /* ── RENDER ACCOUNTANT BILLING MASTER ROW ── */
                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-[#fcfdfd] transition-colors group"
                    >
                      {/* 1. S.n */}
                      {(() => {
                        const s = getColStyle("index");
                        if (!s) return null;
                        return (
                          <td style={s.style} className={`py-3 px-2 text-center font-mono text-[11px] text-gray-400 ${s.className}`}>
                            {index + 1}
                          </td>
                        );
                      })()}

                      {/* 2. Coworking Center */}
                      {(() => {
                        const s = getColStyle("center");
                        if (!s) return null;
                        return (
                          <td style={s.style} className={`py-3 px-2.5 whitespace-nowrap ${s.className}`}>
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-800" title={rec.locationName || "HQ"}>
                              <Building2 className="w-3.5 h-3.5 text-[#006064] shrink-0" />
                              <span className="truncate max-w-[125px]">{rec.locationName || "HQ"}</span>
                            </span>
                          </td>
                        );
                      })()}

                      {/* 3. Expense Date */}
                      {(() => {
                        const s = getColStyle("date");
                        if (!s) return null;
                        return (
                          <td style={s.style} className={`py-3 px-2.5 whitespace-nowrap font-medium text-gray-900 text-[11px] ${s.className}`}>
                            {dateDisplay}
                          </td>
                        );
                      })()}

                      {/* 4. Payment Due Date (Interactive inline picker for existing entries) */}
                      {(() => {
                        const s = getColStyle("dueDate");
                        if (!s) return null;
                        const badge = getExpenseDueDateBadge(rec);
                        const formattedDueDate = rec.dueDateStr || (rec.dueDate ? formatExpenseDueDateDisplay(rec.dueDate) : null);

                        return (
                          <td style={s.style} className={`py-3 px-2.5 text-center whitespace-nowrap ${s.className}`}>
                            {formattedDueDate ? (
                              <div className="flex flex-col items-center justify-center gap-0.5">
                                <div className="inline-flex items-center gap-1 group">
                                  <button
                                    type="button"
                                    onClick={() => openDueDatePicker(rec)}
                                    className="inline-flex items-center gap-1 cursor-pointer hover:text-[#006064] transition-colors group/btn"
                                    title="Click to edit payment due date"
                                  >
                                    <span className="font-mono font-bold text-gray-900 group-hover/btn:text-[#006064] text-[11px] underline decoration-dotted decoration-gray-400 group-hover/btn:decoration-[#006064]">
                                      {formattedDueDate}
                                    </span>
                                    <Calendar className="w-2.5 h-2.5 text-gray-400 group-hover/btn:text-[#006064] shrink-0" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateExpenseDueDate(rec.id, "");
                                    }}
                                    className="text-gray-300 hover:text-red-600 text-xs px-1 font-bold cursor-pointer transition-colors"
                                    title="Clear payment due date"
                                  >
                                    ×
                                  </button>
                                </div>
                                {badge && (
                                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[8.5px] border uppercase tracking-tight rounded-2xs ${badge.className}`}>
                                    {badge.isRisk && <AlertTriangle className="w-2 h-2 shrink-0" />}
                                    <span>{badge.text}</span>
                                  </span>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openDueDatePicker(rec)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 text-[#006064] border border-dashed border-cyan-400 hover:border-[#006064] text-[10.5px] font-bold rounded-xs transition-all shadow-2xs cursor-pointer active:scale-95"
                                title="Click to set payment due date"
                              >
                                <Calendar className="w-3 h-3 text-[#006064]" />
                                <span>+ Due Date</span>
                              </button>
                            )}
                          </td>
                        );
                      })()}

                      {/* 5. Vendor & Bank A/C */}
                      {(() => {
                        const s = getColStyle("vendor");
                        if (!s) return null;
                        return (
                          <td style={s.style} className={`py-3 px-3 whitespace-nowrap bg-emerald-50/10 ${s.className}`}>
                            {rec.vendorName ? (
                              <div className="font-semibold text-gray-900 text-[11.5px]">
                                <span className="block truncate max-w-[155px]" title={rec.vendorName}>{rec.vendorName}</span>
                                {rec.accountNo && (
                                  <div className="text-[10px] font-mono text-gray-500 font-normal truncate max-w-[155px]">A/C: {rec.accountNo}</div>
                                )}
                              </div>
                            ) : (
                              <div>
                                <span className="text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[9.5px] font-mono font-bold block mb-0.5">Accounts to Assign</span>
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
                        );
                      })()}

                      {/* 6. Expense Category */}
                      {(() => {
                        const s = getColStyle("category");
                        if (!s) return null;
                        const isCustom = !isPredefinedCategory(rec.category);
                        return (
                          <td style={s.style} className={`py-3 px-2.5 whitespace-nowrap ${s.className}`}>
                            <div className="flex flex-col gap-0.5">
                              <select
                                value={rec.category || "GENERAL EXPENSE"}
                                onChange={(e) => handleUpdateExpenseCategory(rec.id, e.target.value)}
                                disabled={updatingCategoryId === rec.id}
                                className={`text-[9.5px] font-bold uppercase py-0.5 px-1 focus:outline-none cursor-pointer max-w-[145px] truncate shadow-2xs border ${isCustom
                                  ? "bg-amber-50/90 text-amber-900 border-amber-300 focus:border-amber-600"
                                  : "bg-emerald-50/80 hover:bg-emerald-100 text-emerald-900 border-emerald-300 focus:border-emerald-600"
                                  }`}
                                title={isCustom ? "Custom category header entered - awaiting/subject to Super Admin approval" : "Select / change category header"}
                              >
                                {Array.from(new Set([...officialCategoryOptions, ...(rec.category ? [rec.category] : [])])).map((cat) => (
                                  <option key={cat} value={cat} className="bg-white text-gray-900 font-bold uppercase">{cat}</option>
                                ))}
                              </select>
                              {isCustom && (
                                <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded-xs text-[8px] font-black bg-amber-100 text-amber-900 border border-amber-300 w-fit tracking-tight" title="Custom category header entered by user">
                                  ⚡ CUSTOM HEADER
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })()}

                      {/* 7. Payment Mode */}
                      {(() => {
                        const s = getColStyle("paymentMode");
                        if (!s) return null;
                        return (
                          <td style={s.style} className={`py-3 px-2.5 text-center whitespace-nowrap ${s.className}`}>
                            {rec.paymentMode ? (
                              <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-medium border border-gray-200 rounded-xs">
                                {rec.paymentMode}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs font-mono">-</span>
                            )}
                          </td>
                        );
                      })()}

                      {/* 8. Description */}
                      {(() => {
                        const s = getColStyle("description");
                        if (!s) return null;
                        return (
                          <td style={s.style} className={`py-3 px-3 max-w-xs ${s.className}`}>
                            <div className="font-semibold text-gray-900 leading-snug text-[11.5px]">{rec.description}</div>
                            <div className="mt-1">{renderEnteredByBadge(rec)}</div>
                          </td>
                        );
                      })()}

                      {/* 9. Qty & A/U */}
                      {(() => {
                        const s = getColStyle("quantity");
                        if (!s) return null;
                        return (
                          <td style={s.style} className={`py-3 px-2 text-center whitespace-nowrap text-[11px] font-mono text-gray-700 ${s.className}`}>
                            <span>{rec.quantity || 1}</span>{" "}
                            <span className="bg-gray-100 px-1 py-0.5 border border-gray-200 text-[9.5px] text-gray-600">{rec.unit || "Nos"}</span>
                          </td>
                        );
                      })()}

                      {/* 10. Rate */}
                      {(() => {
                        const s = getColStyle("rate");
                        if (!s) return null;
                        return (
                          <td style={s.style} className={`py-3 px-2.5 text-right whitespace-nowrap text-[11px] font-mono text-gray-700 ${s.className}`}>
                            {rec.rate ? `₹${rec.rate}` : "-"}
                          </td>
                        );
                      })()}

                      {/* 11. Amt (₹) */}
                      {(() => {
                        const s = getColStyle("amount");
                        if (!s) return null;
                        return (
                          <td style={s.style} className={`py-3 px-3 text-right whitespace-nowrap font-display font-black text-gray-900 text-xs ${s.className}`}>
                            {formatCurrency(rec.amount)}
                          </td>
                        );
                      })()}

                      {/* 12. Receipt / Ref # */}
                      {(() => {
                        const s = getColStyle("receiptNo");
                        if (!s) return null;
                        return (
                          <td style={s.style} className={`py-3 px-2.5 whitespace-nowrap font-mono text-[11px] text-gray-700 ${s.className}`}>
                            {rec.receiptNo ? (
                              <span className="font-semibold text-gray-900 bg-gray-50 px-1.5 py-0.5 border border-gray-200 rounded-2xs">
                                {rec.receiptNo}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">-</span>
                            )}
                          </td>
                        );
                      })()}

                      {/* 13. Attached Docs (CM Invoices & Slips in Phase 1) */}
                      {(() => {
                        const s = getColStyle("attachedDocs");
                        if (!s) return null;
                        return (
                          <td style={s.style} className={`py-3 px-2.5 text-center bg-slate-50/50 ${s.className}`}>
                            <div className="flex flex-col items-center justify-center gap-1 max-w-full">
                              {rec.vendorInvoiceUrl && !rec.vendorInvoiceUrl.includes("undefined") ? (
                                <a href={rec.vendorInvoiceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-all cursor-pointer shadow-2xs whitespace-nowrap" title="View Official Vendor Tax Invoice Uploaded by Accountant">
                                  <FileText className="w-2.5 h-2.5 text-emerald-700" /> Tax Inv PDF
                                </a>
                              ) : null}
                              {rec.invoiceUrl && !rec.invoiceUrl.includes("undefined") ? (
                                <a href={rec.invoiceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold text-[#006064] bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 transition-all cursor-pointer shadow-2xs whitespace-nowrap" title="View Attached Bill / Operational Proof Document uploaded by CM">
                                  <FileText className="w-2.5 h-2.5 text-[#006064]" /> Attached Doc
                                </a>
                              ) : null}
                              {rec.attachmentUrl && !rec.attachmentUrl.includes("undefined") ? (
                                <a href={rec.attachmentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8.5px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all cursor-pointer whitespace-nowrap" title="View CM Receipt Slip">
                                  <Receipt className="w-2.5 h-2.5 text-amber-700" /> CM Slip
                                </a>
                              ) : null}
                              {!rec.vendorInvoiceUrl && !rec.invoiceUrl && !rec.attachmentUrl && <span className="text-gray-400 text-[10px]">-</span>}
                            </div>
                          </td>
                        );
                      })()}

                      {/* 14. Remarks */}
                      {(() => {
                        const s = getColStyle("remarks");
                        if (!s) return null;
                        return (
                          <td style={s.style} className={`py-3 px-3 text-gray-600 max-w-xs text-[11px] border-r border-slate-200 ${s.className}`}>
                            {rec.remarks ? <span className="italic">{rec.remarks}</span> : <span className="text-gray-300">-</span>}
                          </td>
                        );
                      })()}

                      {/* 14b. Edit Expense / Breakdown (Phase 1 Action for Accountant) */}
                      {(() => {
                        const s = getColStyle("editAction");
                        if (!s) return null;
                        const canEdit = canEditOrDeleteEntry(rec);
                        const isCMEntry = rec.createdByRole === "COMMUNITY_MANAGER" && !rec.createdByName?.toLowerCase()?.includes("account");
                        return (
                          <td style={s.style} className={`py-2.5 px-2 text-center whitespace-nowrap bg-slate-50/50 border-r border-slate-300 ${s.className}`}>
                            <div className="inline-flex items-center justify-center gap-1">
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => openEditModal(rec)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase bg-[#006064] hover:bg-[#00838f] text-white rounded-xs shadow-2xs transition-all cursor-pointer"
                                  title="Edit Expense Details (No need to scroll right)"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>
                              )}
                              {isCMEntry && (
                                <button
                                  type="button"
                                  onClick={() => openSettleModal(rec)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-[9.5px] font-bold uppercase bg-teal-50 hover:bg-[#006064] text-[#006064] hover:text-white border border-teal-300 rounded-xs transition-all cursor-pointer shadow-2xs"
                                  title="Edit Vendor & Billing Breakdown Against Expense"
                                >
                                  <FileSpreadsheet className="w-3 h-3" />
                                  <span>Breakdown</span>
                                </button>
                              )}
                              {!canEdit && !isCMEntry && (
                                <span className="text-[10px] text-gray-300 font-mono">-</span>
                              )}
                            </div>
                          </td>
                        );
                      })()}

                      {/* 15. Step 1: Acc Check */}
                      {(() => {
                        const s = getColStyle("accCheck");
                        if (!s) return null;
                        return (
                          <td style={s.style} className={`py-3 px-3 text-center whitespace-nowrap bg-purple-50/20 ${s.className}`}>
                            {rec.accountantApprovalStatus === "APPROVED" ? (
                              <div className="flex flex-col items-center">
                                <span className="px-2 py-0.5 text-[9.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">✓ Checked</span>
                                <span className="text-[8px] text-gray-500">{rec.accountantApprovedByName ? `by ${rec.accountantApprovedByName}` : "Accountant"}</span>
                                {(rec.accountantApprovedAt || rec.updatedAt) && (
                                  <span className="text-[7.5px] text-gray-400 font-mono mt-0.5" title={`Checked on ${formatTimestamp(rec.accountantApprovedAt || rec.updatedAt)}`}>
                                    {formatShortTimestamp(rec.accountantApprovedAt || rec.updatedAt)}
                                  </span>
                                )}
                              </div>
                            ) : rec.approvalStatus === "REJECTED_BY_ACCOUNTANT" || rec.accountantApprovalStatus === "REJECTED" ? (
                              <div className="flex flex-col items-center gap-0.5 w-full max-w-[200px] text-center">
                                <span className="px-2 py-0.5 text-[9.5px] font-bold bg-rose-100 text-rose-800 border border-rose-300 rounded shadow-2xs whitespace-nowrap cursor-help" title={rec.rejectionRemarks || rec.accountantRemarks || "Rejected by Accountant"}>✕ Rejected</span>
                                <span className="text-[8px] text-rose-700 font-medium">
                                  {rec.accountantApprovedByName ? `by ${rec.accountantApprovedByName}` : "Accountant"}
                                </span>
                                {(rec.accountantApprovedAt || rec.updatedAt) && (
                                  <span className="text-[7.5px] text-rose-700 font-mono" title={`Rejected on ${formatTimestamp(rec.accountantApprovedAt || rec.updatedAt)}`}>
                                    {formatShortTimestamp(rec.accountantApprovedAt || rec.updatedAt)}
                                  </span>
                                )}
                                {(rec.rejectionRemarks || rec.accountantRemarks) && (
                                  <div className="w-full bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5 text-[9px] text-rose-900 leading-snug whitespace-normal break-words text-left shadow-2xs mt-0.5">
                                    <span className="font-bold text-rose-800 block text-[7.5px] uppercase tracking-wide">Reason:</span>
                                    <span className="font-medium">{rec.rejectionRemarks || rec.accountantRemarks}</span>
                                  </div>
                                )}
                              </div>
                            ) : (isAccountant || isAdmin) ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleAccountantValidateAndApprove(rec)}
                                  className="px-2 py-1 text-[9.5px] font-bold uppercase bg-teal-600 hover:bg-teal-700 text-white transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                                  title="Verify this expense is valid and forward to Super Admin"
                                >
                                  <Check className="w-2.5 h-2.5" /> Validate
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectingRecord(rec);
                                    setRejectionReason("");
                                  }}
                                  className="px-1.5 py-1 text-[9.5px] font-bold uppercase bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-300 transition-all cursor-pointer flex items-center gap-0.5"
                                  title="Reject this expense and return with remarks"
                                >
                                  <X className="w-2.5 h-2.5" /> Reject
                                </button>
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 text-[9.5px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-300">⏳ Pending Check</span>
                            )}
                          </td>
                        );
                      })()}

                      {/* 16. Step 2: SA Approval */}
                      {(() => {
                        const s = getColStyle("saApproval");
                        if (!s) return null;
                        return (
                          <td style={s.style} className={`py-3 px-3 text-center whitespace-nowrap bg-purple-50/20 border-r border-purple-200 ${s.className}`}>
                            {rec.approvalStatus === "APPROVED" || isAutoApprovedByConfig ? (
                              <div className="flex flex-col items-center">
                                <span className="px-2 py-0.5 text-[9.5px] font-bold uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">✓ Approved</span>
                                <span className="text-[8px] text-emerald-700 font-semibold">
                                  {isAutoApprovedByConfig
                                    ? "Auto Approved"
                                    : (rec.superAdminApprovedByName ? `by ${rec.superAdminApprovedByName}` : (rec.approvedByName ? `by ${rec.approvedByName}` : "Sir to Pay"))}
                                </span>
                                {(rec.superAdminApprovedAt || rec.approvedAt || rec.updatedAt) && (
                                  <span className="text-[7.5px] text-gray-500 font-mono mt-0.5" title={`Approved on ${formatTimestamp(rec.superAdminApprovedAt || rec.approvedAt || rec.updatedAt)}`}>
                                    {formatShortTimestamp(rec.superAdminApprovedAt || rec.approvedAt || rec.updatedAt)}
                                  </span>
                                )}
                              </div>
                            ) : rec.approvalStatus === "REJECTED_BY_SUPER_ADMIN" ? (
                              <div className="flex flex-col items-center gap-0.5 w-full max-w-[220px] text-center">
                                <span className="px-2 py-0.5 text-[9.5px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300 rounded shadow-2xs whitespace-nowrap cursor-help" title={rec.rejectionRemarks || rec.superAdminRemarks || "Rejected by Super Admin"}>✕ SA Rejected</span>
                                <span className="text-[8px] text-rose-700 font-medium">
                                  {rec.superAdminApprovedByName ? `by ${rec.superAdminApprovedByName}` : "Super Admin"}
                                </span>
                                {(rec.superAdminApprovedAt || rec.updatedAt) && (
                                  <span className="text-[7.5px] text-rose-700 font-mono" title={`Rejected on ${formatTimestamp(rec.superAdminApprovedAt || rec.updatedAt)}`}>
                                    {formatShortTimestamp(rec.superAdminApprovedAt || rec.updatedAt)}
                                  </span>
                                )}
                                {(rec.rejectionRemarks || rec.superAdminRemarks) && (
                                  <div className="w-full bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5 text-[9px] text-rose-900 leading-snug whitespace-normal break-words text-left shadow-2xs mt-0.5">
                                    <span className="font-bold text-rose-800 block text-[7.5px] uppercase tracking-wide">Reason:</span>
                                    <span className="font-medium">{rec.rejectionRemarks || rec.superAdminRemarks}</span>
                                  </div>
                                )}
                              </div>
                            ) : (rec.accountantApprovalStatus === "APPROVED" || rec.approvalStatus === "PENDING_SUPER_ADMIN_APPROVAL" || rec.approvalStatus === "PENDING_APPROVAL") ? (
                              isAdmin ? (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleInitiateSuperAdminApprove(rec)}
                                    className={`px-2.5 py-1 text-[9.5px] font-bold uppercase text-white transition-all cursor-pointer shadow-2xs flex items-center gap-1 ${!isPredefinedCategory(rec.category)
                                      ? "bg-amber-600 hover:bg-amber-700 ring-1 ring-amber-400"
                                      : "bg-emerald-600 hover:bg-emerald-700"
                                      }`}
                                    title={
                                      !isPredefinedCategory(rec.category)
                                        ? `Custom Header "${rec.category}" detected! Click to review (Keep or Change) & Approve`
                                        : "Authorize expense requisition"
                                    }
                                  >
                                    {!isPredefinedCategory(rec.category) ? (
                                      <>
                                        <Sparkles className="w-2.5 h-2.5 text-amber-200 animate-pulse" />
                                        <span>Review Header</span>
                                      </>
                                    ) : (
                                      <>
                                        <Check className="w-2.5 h-2.5" />
                                        <span>Approve</span>
                                      </>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRejectingRecord(rec);
                                      setRejectionReason("");
                                    }}
                                    className="px-1.5 py-1 text-[9.5px] font-bold uppercase bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-300 transition-all cursor-pointer flex items-center gap-0.5"
                                    title="Reject this expense and return with remarks"
                                  >
                                    <X className="w-2.5 h-2.5" /> Reject
                                  </button>
                                </div>
                              ) : (
                                <span className="px-2 py-0.5 text-[9.5px] font-bold uppercase bg-purple-50 text-purple-800 border border-purple-200">⏳ Pending SA</span>
                              )
                            ) : (
                              <span className="text-[8.5px] text-gray-400 font-mono bg-gray-50 px-1.5 py-0.5 border border-gray-200">Waiting on Step 1</span>
                            )}
                          </td>
                        );
                      })()}

                      {/* 11. Bank Portal */}
                      {(() => {
                        const s = getColStyle("bankPortal");
                        if (!s) return null;
                        return (
                          <td style={s.style} className={`py-3 px-2 text-center whitespace-nowrap bg-emerald-50/10 ${s.className}`}>
                            <div className="flex flex-col items-center justify-center">
                              <input
                                type="checkbox"
                                checked={Boolean(rec.uploadedInBankPortal)}
                                onChange={() => handleToggleBankPortal(rec)}
                                title="Toggle bank portal upload status"
                                className="w-4 h-4 accent-[#006064] cursor-pointer"
                              />
                              <span className="text-[8px] text-gray-400 font-mono mt-0.5">{rec.uploadedInBankPortal ? "Uploaded" : "Pending"}</span>
                            </div>
                          </td>
                        );
                      })()}

                      {/* 11b. Payment Approval Status (2nd Super Admin Approval - "Sir Pays") */}
                      {(() => {
                        const s = getColStyle("paymentApproval");
                        if (!s) return null;

                        const isBaseExpenseApproved =
                          rec.approvalStatus === "APPROVED" ||
                          rec.superAdminApprovalStatus === "APPROVED" ||
                          isAutoApprovedByConfig;
                        const isPaymentApproved =
                          rec.paymentApprovalStatus === "APPROVED" ||
                          rec.paymentStatus === "PAID" ||
                          Boolean(rec.utrNumber) ||
                          isAutoApprovedByConfig;
                        const isPaymentPending =
                          rec.paymentApprovalStatus === "PENDING" && !isPaymentApproved;
                        const isPaymentRejected =
                          rec.paymentApprovalStatus === "REJECTED";

                        return (
                          <td style={s.style} className={`py-3 px-2.5 text-center whitespace-nowrap bg-emerald-50/15 border-r border-emerald-200/70 ${s.className}`}>
                            {!isBaseExpenseApproved ? (
                              <span className="text-[8.5px] text-gray-400 font-mono bg-gray-50 px-1.5 py-0.5 border border-gray-200" title="Awaiting Step 2 Expense Approval by Super Admin first">
                                Waiting on Step 2
                              </span>
                            ) : isPaymentApproved ? (
                              <div className="flex flex-col items-center">
                                <span className="px-2 py-0.5 text-[9.5px] font-bold uppercase bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-0.5">
                                  <Check className="w-2.5 h-2.5 text-emerald-700" /> Approved
                                </span>
                                <span className="text-[8px] text-emerald-700 font-semibold mt-0.5">
                                  {isAutoApprovedByConfig
                                    ? "Auto Approved"
                                    : (rec.paymentApprovedByName ? `by ${rec.paymentApprovedByName}` : "Paid by Sir")}
                                </span>
                                {(rec.paymentApprovedAt || rec.updatedAt) && (
                                  <span className="text-[7.5px] text-gray-500 font-mono mt-0.5" title={`Payment authorized on ${formatTimestamp(rec.paymentApprovedAt || rec.updatedAt)}`}>
                                    {formatShortTimestamp(rec.paymentApprovedAt || rec.updatedAt)}
                                  </span>
                                )}
                              </div>
                            ) : isPaymentPending ? (
                              isAdmin ? (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleApprovePayment(rec.id)}
                                    disabled={approving}
                                    className="px-2 py-1 text-[9.5px] font-bold uppercase bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer shadow-2xs flex items-center gap-1 disabled:opacity-50"
                                    title="Approve payment disbursal (Sir Pays) so Accountant can record UTR"
                                  >
                                    <Check className="w-2.5 h-2.5" /> Approve Pay
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRejectingPaymentRecord(rec);
                                      setPaymentRejectionReason("");
                                    }}
                                    className="px-1.5 py-1 text-[9.5px] font-bold uppercase bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-300 transition-all cursor-pointer flex items-center gap-0.5"
                                    title="Reject payment request with remarks"
                                  >
                                    <X className="w-2.5 h-2.5" /> Reject
                                  </button>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center">
                                  <span className="px-2 py-0.5 text-[9px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                                    ⏳ Waiting for Sir
                                  </span>
                                  <span className="text-[8px] text-amber-700 font-semibold mt-0.5">Pending Sir Approval</span>
                                </div>
                              )
                            ) : isPaymentRejected ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="px-2 py-0.5 text-[9px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300 cursor-help" title={rec.paymentApprovalRemarks || "Payment Rejected by Super Admin"}>
                                  ✕ Pay Rejected
                                </span>
                                <span className="text-[8px] text-rose-700 font-medium">
                                  {rec.paymentApprovedByName ? `by ${rec.paymentApprovedByName}` : "Super Admin"}
                                </span>
                                {(rec.paymentApprovedAt || rec.updatedAt) && (
                                  <span className="text-[7.5px] text-rose-700 font-mono" title={`Payment rejected on ${formatTimestamp(rec.paymentApprovedAt || rec.updatedAt)}`}>
                                    {formatShortTimestamp(rec.paymentApprovedAt || rec.updatedAt)}
                                  </span>
                                )}
                                {rec.paymentApprovalRemarks && (
                                  <span className="text-[8px] text-rose-700 truncate max-w-[110px] cursor-help" title={rec.paymentApprovalRemarks}>
                                    {rec.paymentApprovalRemarks}
                                  </span>
                                )}
                                {(isAccountant || isAdmin) && (
                                  <button
                                    type="button"
                                    onClick={() => handleRequestPaymentApproval(rec)}
                                    className="text-[8px] font-bold text-[#006064] underline hover:text-teal-800 cursor-pointer"
                                    title="Re-request Super Admin payment approval"
                                  >
                                    Re-request Sir
                                  </button>
                                )}
                              </div>
                            ) : (
                              /* NOT_REQUESTED yet */
                              (isAccountant || isAdmin) ? (
                                <div className="flex flex-col items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleRequestPaymentApproval(rec)}
                                    className="px-2 py-0.5 text-[9px] font-bold uppercase bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
                                    title="Send request to Super Admin (Sir) for payment approval"
                                  >
                                    Request Sir Pay
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[8.5px] text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 border border-slate-200">
                                  Not Requested
                                </span>
                              )
                            )}
                          </td>
                        );
                      })()}

                      {/* 12. UTR No */}
                      {(() => {
                        const s = getColStyle("utrNumber");
                        if (!s) return null;
                        const isPaymentApproved =
                          rec.paymentApprovalStatus === "APPROVED" ||
                          rec.paymentStatus === "PAID" ||
                          Boolean(rec.utrNumber) ||
                          isAutoApprovedByConfig;

                        return (
                          <td style={s.style} className={`py-3 px-2 text-center bg-emerald-50/10 ${s.className}`}>
                            {rec.utrNumber ? (
                              <div className="flex flex-col items-center justify-center max-w-full px-0.5">
                                <span
                                  className="font-mono text-[10px] font-bold text-emerald-950 bg-emerald-50/90 px-1.5 py-0.5 border border-emerald-200/80 rounded-xs break-all max-w-full text-center leading-tight line-clamp-2 select-all"
                                  title={rec.utrNumber}
                                >
                                  {rec.utrNumber}
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => openApproveModal(rec)}
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8.5px] font-bold uppercase bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xs transition-all cursor-pointer shadow-2xs"
                                    title="Edit UTR & Payment Disbursal Details"
                                  >
                                    <Edit3 className="w-2.5 h-2.5 text-amber-700" />
                                    <span>Edit UTR</span>
                                  </button>
                                  {(rec.paymentProofUrl || rec.utrFileUrl) && (
                                    <a
                                      href={rec.paymentProofUrl || rec.utrFileUrl || "#"}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[8.5px] text-emerald-700 hover:underline flex items-center gap-0.5 font-bold"
                                      title="View UTR payment screenshot"
                                    >
                                      <Check className="w-2.5 h-2.5" /> Proof
                                    </a>
                                  )}
                                </div>
                              </div>
                            ) : isPaymentApproved ? (
                              <button
                                type="button"
                                onClick={() => openApproveModal(rec)}
                                className="px-2 py-0.5 text-[9.5px] font-bold uppercase bg-amber-500 hover:bg-amber-600 text-white transition-all cursor-pointer shadow-2xs whitespace-nowrap flex items-center gap-1 mx-auto"
                                title="Sir has approved payment; click to record UTR, date & proof"
                              >
                                <Plus className="w-2.5 h-2.5" /> Enter UTR
                              </button>
                            ) : (
                              <div className="flex flex-col items-center justify-center text-center">
                                <span
                                  title="Awaiting Super Admin (Sir) payment approval before UTR entry"
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8.5px] font-medium text-slate-400 bg-slate-100 border border-slate-200 rounded cursor-not-allowed"
                                >
                                  <Lock className="w-2.5 h-2.5 text-slate-400" /> Locked
                                </span>
                                <span className="text-[7.5px] text-slate-400 mt-0.5">Wait on Sir Pay</span>
                              </div>
                            )}
                          </td>
                        );
                      })()}

                      {/* 13. Payment Date */}
                      {(() => {
                        const s = getColStyle("payDate");
                        if (!s) return null;
                        const isPaymentApproved =
                          rec.paymentApprovalStatus === "APPROVED" ||
                          rec.paymentStatus === "PAID" ||
                          Boolean(rec.utrNumber) ||
                          isAutoApprovedByConfig;

                        return (
                          <td style={s.style} className={`py-3 px-2 text-center whitespace-nowrap text-[11px] font-mono text-gray-800 bg-emerald-50/10 ${s.className}`}>
                            {rec.payReceiveDate || rec.utrDate ? (
                              <div className="flex flex-col items-center justify-center gap-0.5">
                                <span className="font-bold text-gray-800">{rec.payReceiveDate || rec.utrDate}</span>
                                {(isAccountant || isAdmin || isPaymentApproved) && (
                                  <button
                                    type="button"
                                    onClick={() => openApproveModal(rec)}
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8.5px] font-bold uppercase bg-cyan-50 hover:bg-cyan-100 text-[#006064] border border-cyan-300 rounded-xs transition-all cursor-pointer shadow-2xs mt-0.5"
                                    title="Edit Payment Disbursal Date"
                                  >
                                    <Edit3 className="w-2.5 h-2.5" />
                                    <span>Edit Date</span>
                                  </button>
                                )}
                              </div>
                            ) : isApproved && (isPaymentApproved || isAccountant || isAdmin) ? (
                              <button
                                type="button"
                                onClick={() => openApproveModal(rec)}
                                className="px-1.5 py-0.5 text-[8.5px] font-bold uppercase bg-teal-50 hover:bg-teal-100 text-teal-800 border border-dashed border-teal-300 rounded-xs transition-all cursor-pointer shadow-2xs"
                                title="Click to record payment disbursal date"
                              >
                                + Set Date
                              </button>
                            ) : (
                              <span className="text-gray-300 text-[10px]">Locked</span>
                            )}
                          </td>
                        );
                      })()}

                      {/* 15. Email Alert */}
                      {(() => {
                        const s = getColStyle("emailAlert");
                        if (!s) return null;
                        return (
                          <td style={s.style} className={`py-3 px-2 text-center whitespace-nowrap bg-emerald-50/10 ${s.className}`}>
                            {isApproved ? (
                              rec.alertEmailSent ? (
                                <div className="flex flex-col items-center">
                                  <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 border border-emerald-200" title={`Email sent to ${rec.alertEmailSentTo || "vendor"}`}>
                                    <Check className="w-2.5 h-2.5" /> Sent
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleSendAlertEmail(rec)}
                                    disabled={sendingAlertId === rec.id}
                                    className="text-[8px] text-gray-500 hover:text-[#006064] underline mt-0.5 cursor-pointer disabled:opacity-50"
                                    title="Resend payment alert email"
                                  >
                                    {sendingAlertId === rec.id ? "Sending..." : "Resend"}
                                  </button>
                                </div>
                              ) : rec.utrNumber ? (
                                <button
                                  type="button"
                                  onClick={() => handleSendAlertEmail(rec)}
                                  disabled={sendingAlertId === rec.id}
                                  className="px-2 py-1 text-[9px] font-bold uppercase bg-emerald-700 hover:bg-emerald-800 text-white transition-all cursor-pointer shadow-2xs flex items-center gap-1 disabled:opacity-50"
                                  title="Send payment advice alert email to vendor"
                                >
                                  <Send className="w-2.5 h-2.5" />
                                  <span>{sendingAlertId === rec.id ? "Sending..." : "Send Alert"}</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openApproveModal(rec)}
                                  className="text-[9px] text-amber-700 hover:underline cursor-pointer font-bold"
                                  title="Enter UTR first to dispatch vendor email"
                                >
                                  Will Send on UTR
                                </button>
                              )
                            ) : (
                              <span title="Send alert unlocks after Super Admin approval" className="inline-flex items-center gap-1 text-[9.5px] text-gray-400 font-mono bg-gray-50 px-1.5 py-0.5 border border-gray-200">
                                <Lock className="w-2.5 h-2.5 text-gray-400" /> Locked
                              </span>
                            )}
                          </td>
                        );
                      })()}

                      {/* 16. Actions */}
                      {(() => {
                        const s = getColStyle("actions");
                        if (!s) return null;
                        const isApproved = rec.approvalStatus === "APPROVED";
                        const hasBillBreakdown = Boolean(rec.vendorInvoiceUrl || rec.vendorName || (rec.quantity && rec.quantity > 1));
                        const isPaid = rec.paymentStatus === "PAID" || Boolean(rec.utrNumber);

                        return (
                          <td style={s.style} className={`py-2 px-3 text-center whitespace-nowrap bg-emerald-50/10 ${s.className}`}>
                            <div className="inline-flex items-center justify-center gap-1.5 flex-wrap">
                              {/* Dedicated Button 1: Enter Vendor & Billing Breakdown Against Expense */}
                              <button
                                type="button"
                                onClick={() => openSettleModal(rec)}
                                className={`px-2.5 py-1 text-[9.5px] font-bold uppercase transition-all cursor-pointer shadow-2xs flex items-center gap-1 border ${hasBillBreakdown
                                  ? "bg-sky-50 text-sky-900 border-sky-300 hover:bg-sky-100"
                                  : "bg-[#006064] text-white border-[#004d40] hover:bg-[#004d40]"
                                  }`}
                                title="Enter Vendor & Billing Breakdown Against Expense (Tax Inv, Qty, Rate, Vendor)"
                              >
                                <FileSpreadsheet className="w-3 h-3" />
                                <span>{hasBillBreakdown ? "Edit Breakdown" : "Enter Breakdown"}</span>
                              </button>

                              {/* Dedicated Button 2: Record Disbursal & UTR Details */}
                              {(() => {
                                const isPaymentApproved =
                                  rec.paymentApprovalStatus === "APPROVED" ||
                                  rec.paymentStatus === "PAID" ||
                                  Boolean(rec.utrNumber) ||
                                  isAutoApprovedByConfig;

                                if (isPaid) {
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => openApproveModal(rec)}
                                      className="px-2.5 py-1 text-[9.5px] font-bold uppercase bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                                      title="View or update payment disbursal and UTR details"
                                    >
                                      <Edit3 className="w-2.5 h-2.5 text-gray-600" />
                                      <span>Edit UTR</span>
                                    </button>
                                  );
                                }

                                if (isApproved && isPaymentApproved) {
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => openApproveModal(rec)}
                                      className="px-2.5 py-1 text-[9.5px] font-bold uppercase bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer shadow-2xs flex items-center gap-1 border border-emerald-700 animate-pulse"
                                      title="Sir has approved payment! Click to record payment disbursal and UTR details"
                                    >
                                      <CreditCard className="w-3 h-3" />
                                      <span>Record Disbursal & UTR</span>
                                    </button>
                                  );
                                }

                                if (isApproved && !isPaymentApproved) {
                                  return (
                                    <span
                                      className="inline-flex items-center gap-1 text-[9px] text-amber-800 font-medium bg-amber-50 px-2 py-1 border border-amber-300 cursor-not-allowed select-none"
                                      title="Waiting for Super Admin (Sir) to approve payment before recording UTR"
                                    >
                                      <Lock className="w-2.5 h-2.5 text-amber-600" />
                                      <span>Wait on Sir Pay</span>
                                    </span>
                                  );
                                }

                                return (
                                  <span
                                    className="inline-flex items-center gap-1 text-[9px] text-gray-400 font-mono bg-gray-50 px-2 py-1 border border-gray-200 cursor-not-allowed select-none"
                                    title="Payment Disbursal and UTR details unlock after Super Admin approval"
                                  >
                                    <Lock className="w-2.5 h-2.5 text-gray-400" />
                                    <span>UTR (Locked)</span>
                                  </span>
                                );
                              })()}

                              {/* Resubmit button if rejected and user is creator */}
                              {(rec.approvalStatus === "REJECTED_BY_ACCOUNTANT" || rec.approvalStatus === "REJECTED_BY_SUPER_ADMIN") && canEditOrDeleteEntry(rec) && (
                                <button
                                  type="button"
                                  onClick={() => openEditModal(rec)}
                                  className="px-2 py-1 text-[9.5px] font-bold uppercase bg-amber-500 hover:bg-amber-600 text-white shadow-2xs cursor-pointer transition-all flex items-center gap-1"
                                  title="Edit details according to remarks and resubmit"
                                >
                                  <RefreshCw className="w-2.5 h-2.5" /> Resubmit
                                </button>
                              )}

                              {/* Base Expense Edit & Delete: ONLY for the creator or Super Admin */}
                              {canEditOrDeleteEntry(rec) && (
                                <div className="inline-flex items-center gap-0.5 ml-0.5 border-l border-gray-300 pl-1">
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(rec)}
                                    title="Edit Base Expense Entry"
                                    className="p-1 text-gray-500 hover:text-[#006064] hover:bg-cyan-50 border border-transparent hover:border-cyan-200 transition-all cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
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
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })()}
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

      {/* ── QUICK DUE DATE PICKER MODAL ── */}
      {mounted && typeof document !== "undefined" && dueDatePickerRecord && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white border border-gray-300 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-cyan-900 to-[#006064] text-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-cyan-200" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-bold uppercase tracking-wide">
                    Set Payment Due Date
                  </h3>
                  <p className="text-[11px] text-cyan-100/80">
                    Avoid late fee • Daily 10 AM alert sent 7 days prior
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDueDatePickerRecord(null)}
                className="p-1 text-white/70 hover:text-white cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 text-xs">
              {/* Target Expense Summary Card */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-gray-500 uppercase font-semibold">
                    Expense #{dueDatePickerRecord.id}
                  </span>
                  <span className="font-display font-black text-gray-900 text-sm">
                    {formatCurrency(dueDatePickerRecord.amount)}
                  </span>
                </div>
                <div className="font-semibold text-gray-900 text-xs">
                  {dueDatePickerRecord.description}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-gray-600 pt-1 border-t border-slate-200/80">
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-[#006064]" />
                    {dueDatePickerRecord.locationName || "HQ"}
                  </span>
                  {dueDatePickerRecord.vendorName && (
                    <span className="inline-flex items-center gap-1 truncate max-w-[160px]">
                      <Tag className="w-3 h-3 text-emerald-600" />
                      {dueDatePickerRecord.vendorName}
                    </span>
                  )}
                </div>
              </div>

              {/* Date Input */}
              <div className="space-y-1.5">
                <label className="block font-bold text-gray-800 uppercase tracking-wider text-[11px]">
                  Select Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  autoFocus
                  value={dueDatePickerValue}
                  onChange={(e) => setDueDatePickerValue(e.target.value)}
                  className="w-full border-2 border-[#006064] p-2.5 text-sm font-mono font-bold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#006064]/30 cursor-pointer"
                />
              </div>

              {/* Quick Preset Shortcuts */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Quick Date Shortcuts:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyDueDatePreset(0)}
                    className="px-2 py-1.5 bg-gray-100 hover:bg-cyan-50 hover:border-cyan-300 border border-gray-200 text-gray-700 text-[10.5px] font-semibold rounded-xs transition-all cursor-pointer text-center"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDueDatePreset(3)}
                    className="px-2 py-1.5 bg-gray-100 hover:bg-cyan-50 hover:border-cyan-300 border border-gray-200 text-gray-700 text-[10.5px] font-semibold rounded-xs transition-all cursor-pointer text-center"
                  >
                    +3 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDueDatePreset(7)}
                    className="px-2 py-1.5 bg-cyan-50 hover:bg-cyan-100 border border-cyan-300 text-[#006064] text-[10.5px] font-bold rounded-xs transition-all cursor-pointer text-center"
                  >
                    +7 Days ⭐
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDueDatePreset(15)}
                    className="px-2 py-1.5 bg-gray-100 hover:bg-cyan-50 hover:border-cyan-300 border border-gray-200 text-gray-700 text-[10.5px] font-semibold rounded-xs transition-all cursor-pointer text-center"
                  >
                    +15 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDueDatePreset(30)}
                    className="px-2 py-1.5 bg-gray-100 hover:bg-cyan-50 hover:border-cyan-300 border border-gray-200 text-gray-700 text-[10.5px] font-semibold rounded-xs transition-all cursor-pointer text-center"
                  >
                    +30 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDueDatePreset("endOfMonth")}
                    className="px-2 py-1.5 bg-gray-100 hover:bg-cyan-50 hover:border-cyan-300 border border-gray-200 text-gray-700 text-[10.5px] font-semibold rounded-xs transition-all cursor-pointer text-center"
                  >
                    End of Month
                  </button>
                </div>
              </div>

              {/* Status / Alert preview */}
              {dueDatePickerValue && (
                <div className="bg-amber-50/80 border border-amber-200 p-2 text-[10.5px] text-amber-900 flex items-center gap-1.5 rounded-xs">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>
                    Alert will be triggered 7 days prior to avoid late fees.
                  </span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-2">
              <div>
                {dueDatePickerRecord.dueDate && (
                  <button
                    type="button"
                    disabled={savingDueDate}
                    onClick={async () => {
                      setSavingDueDate(true);
                      try {
                        await handleUpdateExpenseDueDate(dueDatePickerRecord.id, "");
                        setDueDatePickerRecord(null);
                      } finally {
                        setSavingDueDate(false);
                      }
                    }}
                    className="px-2.5 py-1.5 text-[11px] font-bold text-rose-700 hover:text-rose-900 hover:bg-rose-50 border border-rose-200 rounded-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    Clear Due Date
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={savingDueDate}
                  onClick={() => setDueDatePickerRecord(null)}
                  className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-800 bg-white border border-gray-300 hover:bg-gray-100 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingDueDate || !dueDatePickerValue}
                  onClick={handleSaveQuickDueDate}
                  className="px-4 py-1.5 text-xs font-bold uppercase bg-[#006064] hover:bg-[#004d40] text-white transition-all cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingDueDate ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Save Due Date</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL 1: RECORD / EDIT EXPENSE (NEW FORMAT) ── */}
      {mounted && typeof document !== "undefined" && isAddModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-gray-300 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-[#f8f9fa] sticky top-0 z-10">
              <div>
                <h2 className="text-base font-display font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#006064]" />
                  <span>{editingRecord ? "Edit Expense Entry" : isAccountant ? "Record Center Operating Expense" : "Step 1: Record Center Operating Expense"}</span>
                </h2>
                <p className="text-[11px] text-gray-500">
                  {isAccountant
                    ? "Accounts: Enter operational expense details. Auto-approved for payment disbursal."
                    : "CM or Accounts: Enter operational expense and attach bill PDF. Accountant will enter payment details against it."}
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
              {/* Rejection Alert Banner (Prominent display of reviewer's remarks for correction) */}
              {editingRecord && (editingRecord.approvalStatus === "REJECTED_BY_ACCOUNTANT" || editingRecord.approvalStatus === "REJECTED_BY_SUPER_ADMIN" || editingRecord.rejectionRemarks) && (
                <div className="bg-rose-50 border-2 border-rose-300 p-4 space-y-2 animate-in fade-in rounded-xs">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>
                      {editingRecord.approvalStatus === "REJECTED_BY_SUPER_ADMIN"
                        ? "Rejected by Super Admin — Revision Required"
                        : "Rejected by Accountant — Revision Required"}
                    </span>
                  </div>
                  <div className="bg-white p-3 border border-rose-200 text-xs text-rose-950 font-medium leading-relaxed">
                    <strong className="text-rose-900 block font-mono text-[11px] uppercase mb-1">
                      Reviewer&apos;s Remarks:
                    </strong>
                    {editingRecord.rejectionRemarks || editingRecord.superAdminRemarks || editingRecord.accountantRemarks || "Please correct the details and resubmit."}
                  </div>
                  <p className="text-[11px] text-rose-700">
                    💡 Please correct the details or re-upload documents as requested above. Clicking <strong>&quot;Update &amp; Resubmit Expense&quot;</strong> will clear this rejection and re-queue the requisition for validation.
                  </p>
                </div>
              )}

              {/* Section 1: Center, Expense Date & Payment Due Date */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

                  {/* Payment Due Date */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-gray-700 uppercase tracking-wider text-[11px]">
                        Payment Due Date
                      </label>
                      <span className="text-amber-700 font-bold text-[10px] lowercase">
                        (avoid late fee)
                      </span>
                    </div>
                    <input
                      type="date"
                      value={formData.dueDate || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, dueDate: e.target.value }))
                      }
                      className="w-full border border-gray-300 p-2 text-xs focus:outline-none focus:border-[#006064] bg-white"
                    />
                    <span className="text-[10px] text-gray-400 mt-0.5 block">
                      Optional. Daily alert sent 7 days prior at 10 AM.
                    </span>
                  </div>

                  {/* Vendor / Supplier (Mandatory) */}
                  <div className="sm:col-span-3">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-gray-700 uppercase tracking-wider text-[11px]">
                        Vendor / Supplier <span className="text-gray-400 font-normal lowercase">(optional)</span>
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
                      className="w-full border border-gray-300 p-2 text-xs focus:outline-none focus:border-[#006064] cursor-pointer bg-white font-medium"
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
                  {/* Expense Type / Category (Predefined or Custom) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-gray-700 uppercase tracking-wider text-xs">
                        Expense Type / Category <span className="text-red-500">*</span>
                      </label>
                      {!isCustomCategoryMode ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomCategoryMode(true);
                            setCustomCategoryInput("");
                          }}
                          className="text-[11px] text-[#006064] font-semibold hover:underline flex items-center gap-1"
                        >
                          + Custom Header
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomCategoryMode(false);
                            setCustomCategoryInput("");
                            setFormData((prev) => ({
                              ...prev,
                              category: officialCategoryOptions[0] || FIXED_EXPENSE_TYPES[0],
                            }));
                          }}
                          className="text-[11px] text-[#006064] font-semibold hover:underline flex items-center gap-1"
                        >
                          ← Predefined List
                        </button>
                      )}
                    </div>

                    {!isCustomCategoryMode ? (
                      <>
                        <select
                          value={formData.category}
                          onChange={(e) => {
                            if (e.target.value === "__CUSTOM__") {
                              setIsCustomCategoryMode(true);
                              setCustomCategoryInput("");
                            } else {
                              setFormData((prev) => ({ ...prev, category: e.target.value }));
                            }
                          }}
                          required
                          className="w-full border border-gray-300 p-2 text-xs focus:outline-none focus:border-[#006064] cursor-pointer bg-white font-medium"
                        >
                          {Array.from(
                            new Set([
                              ...officialCategoryOptions,
                              ...(formData.category && formData.category !== "__CUSTOM__" ? [formData.category] : []),
                            ])
                          ).map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                          <option value="__CUSTOM__" className="text-[#006064] font-bold">
                            + Enter Custom / New Expense Header...
                          </option>
                        </select>
                        <span className="text-[10px] text-gray-400 mt-0.5 block">
                          Select from predefined headers or click &quot;+ Custom Header&quot; to propose a new one.
                        </span>
                      </>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={customCategoryInput}
                          onChange={(e) => setCustomCategoryInput(e.target.value.toUpperCase())}
                          placeholder="ENTER CUSTOM EXPENSE HEADER (E.G. DEEP CLEANING, BRANDING)..."
                          required
                          className="w-full border-2 border-amber-400 bg-amber-50/50 p-2 text-xs font-semibold uppercase tracking-wider focus:outline-none focus:border-[#006064]"
                        />
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-800 bg-amber-100/70 px-2 py-1 border border-amber-300">
                          <span>⚠️</span>
                          <span>
                            <strong>Custom Header:</strong> Super Admin will review this in Approval 1 and choose to either keep &amp; add it to the master list or reassign it.
                          </span>
                        </div>
                      </>
                    )}
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
                          className={`w-3.5 h-3.5 text-amber-700 ${uploadingReceipt ? "animate-spin" : ""
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
                          className={`w-3.5 h-3.5 text-[#006064] ${uploadingInvoice ? "animate-spin" : ""
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

                {/* Remarks (Mandatory) */}
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Remarks <span className="text-gray-400 font-normal lowercase">(optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter remarks or notes (optional)"
                    value={formData.remarks || ""}
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
                      : editingRecord && (editingRecord.approvalStatus === "REJECTED_BY_ACCOUNTANT" || editingRecord.approvalStatus === "REJECTED_BY_SUPER_ADMIN" || editingRecord.rejectionRemarks)
                        ? "Update & Resubmit Expense"
                        : editingRecord
                          ? "Update Expense Entry"
                          : (!onOffSAApproval && isAccountant)
                            ? "Submit Expense (Auto Approved)"
                            : isAccountant
                              ? "Submit Expense"
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
                    {approvingRecord.approvalStatus === "APPROVED" || (!onOffSAApproval && (isAccountant || isAccountantExpense(approvingRecord)))
                      ? "Record Disbursal & UTR Details (Auto Approved)"
                      : "Super Admin: Approve & Disburse Vendor Payment"}
                  </h3>
                  <p className="text-[11px] text-cyan-100 font-sans">
                    {approvingRecord.approvalStatus === "APPROVED" || (!onOffSAApproval && (isAccountant || isAccountantExpense(approvingRecord)))
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
                    className={`text-xs font-bold px-2 py-0.5 border ${approvingRecord.approvalStatus === "APPROVED" || (!onOffSAApproval && (isAccountant || isAccountantExpense(approvingRecord)))
                      ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                      : "bg-amber-100 text-amber-900 border-amber-300"
                      }`}
                  >
                    {approvingRecord.approvalStatus === "APPROVED" || (!onOffSAApproval && (isAccountant || isAccountantExpense(approvingRecord)))
                      ? "APPROVED ✓ (DISBURSAL ENTRY)"
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
                      Payment Date <span className="text-gray-400 font-normal lowercase">(optional)</span>
                    </label>
                    <input
                      type="date"
                      value={approvalData.paymentDate}
                      onChange={(e) =>
                        setApprovalData((prev) => ({ ...prev, paymentDate: e.target.value }))
                      }
                      className="w-full border border-gray-300 p-2 text-xs focus:outline-none focus:border-[#006064]"
                    />
                  </div>

                  {/* Payment Mode */}
                  <div>
                    <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Payment Mode
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
                    UTR / Transaction Reference Number <span className="text-gray-400 font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter bank transaction UTR (optional)"
                    value={approvalData.utrNumber}
                    onChange={(e) =>
                      setApprovalData((prev) => ({ ...prev, utrNumber: e.target.value }))
                    }
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
                        className={`w-3.5 h-3.5 text-[#006064] ${uploadingProof ? "animate-spin" : ""
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

                {/* Send Alert Email to Vendor */}
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
                      : (approvingRecord.approvalStatus === "APPROVED" || (!onOffSAApproval && (isAccountant || isAccountantExpense(approvingRecord))))
                        ? "Record Payment Disbursal & Settle"
                        : "Confirm Approval & Disburse"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL: REJECT EXPENSE WITH MANDATORY REMARKS ── */}
      {mounted && typeof document !== "undefined" && rejectingRecord && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-rose-300 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 border-b border-rose-200 flex items-center justify-between bg-rose-700 text-white sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-200" />
                <div>
                  <h3 className="text-sm font-display font-black uppercase tracking-wide">
                    {isAdmin &&
                      (rejectingRecord.approvalStatus === "PENDING_SUPER_ADMIN_APPROVAL" ||
                        rejectingRecord.accountantApprovalStatus === "APPROVED")
                      ? "Super Admin: Reject Expense Requisition"
                      : "Accountant: Reject Expense Requisition"}
                  </h3>
                  <p className="text-[11px] text-rose-100 font-sans">
                    Mandatory remarks will be returned to the creator for revision and resubmission
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRejectingRecord(null);
                  setRejectionReason("");
                }}
                className="p-1 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRejection} className="p-5 space-y-4 text-xs">
              {/* Summary Card */}
              <div className="bg-rose-50/70 p-3.5 border border-rose-200 space-y-2 text-[11.5px]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-rose-800 font-bold">
                    Requisition #{rejectingRecord.id}
                  </span>
                  <span className="font-mono font-bold text-rose-900 bg-white px-2 py-0.5 border border-rose-200">
                    {formatCurrency(rejectingRecord.amount)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-500 block text-[10.5px]">Category:</span>
                    <strong className="text-gray-900">{rejectingRecord.category || "GENERAL"}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10.5px]">Center / Location:</span>
                    <strong className="text-gray-900">{rejectingRecord.locationName || "HQ"}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10.5px]">Created By:</span>
                    <strong className="text-gray-900">
                      {rejectingRecord.createdByName || rejectingRecord.createdByRole || "User"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10.5px]">Expense Date:</span>
                    <strong className="text-gray-900">
                      {rejectingRecord.expenseDateStr ||
                        (rejectingRecord.expenseDate
                          ? new Date(rejectingRecord.expenseDate).toLocaleDateString("en-GB")
                          : "-")}
                    </strong>
                  </div>
                </div>
                <div className="text-[11px] text-gray-700 pt-1 border-t border-rose-100">
                  <span className="font-bold text-gray-800">Description:</span> {rejectingRecord.description}
                </div>
              </div>

              {/* Remarks Textarea */}
              <div>
                <label className="block font-bold text-gray-800 uppercase tracking-wider mb-1">
                  Reason for Rejection / Correction Remarks <span className="text-red-600">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Clearly state what is wrong or needs revision (e.g. 'Invoice is missing GST number', 'Amount does not match uploaded bill receipt', 'Please attach clear photo of receipt', etc.)..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full border border-rose-300 p-2.5 text-xs focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-500 text-gray-900 font-sans"
                />
                <p className="text-[10.5px] text-gray-500 mt-1">
                  These remarks will be prominently shown to the creator so they can fix and resubmit.
                </p>
              </div>

              {/* Quick Preset Reasons */}
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 font-mono">
                  Quick Select Common Reasons:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Bill / Invoice copy is missing or unreadable",
                    "Amount entered does not match attached invoice",
                    "GST calculation incorrect or GSTIN missing",
                    "Expense category is incorrect; please reclassify",
                    "Duplicate entry detected",
                    "Vendor bank account details missing or mismatch",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRejectionReason(preset)}
                      className="px-2 py-1 text-[10px] bg-gray-100 hover:bg-rose-50 hover:text-rose-700 text-gray-700 border border-gray-200 transition-colors cursor-pointer text-left"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingRecord(null);
                    setRejectionReason("");
                  }}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-600 hover:bg-gray-100 border border-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRejectingSubmitting || !rejectionReason.trim()}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isRejectingSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  <span>{isRejectingSubmitting ? "Submitting..." : "Confirm & Send Rejection"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL: REJECT PAYMENT DISBURSAL WITH MANDATORY REMARKS ── */}
      {mounted && typeof document !== "undefined" && rejectingPaymentRecord && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-rose-300 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 border-b border-rose-200 flex items-center justify-between bg-rose-800 text-white sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-200" />
                <div>
                  <h3 className="text-sm font-display font-black uppercase tracking-wide">
                    Super Admin: Reject Payment Authorization
                  </h3>
                  <p className="text-[11px] text-rose-100 font-sans">
                    Mandatory remarks will be returned to the Accountant for clarification & re-submission
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRejectingPaymentRecord(null);
                  setPaymentRejectionReason("");
                }}
                className="p-1 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPaymentRejection} className="p-5 space-y-4 text-xs">
              {/* Summary Card */}
              <div className="bg-rose-50/70 p-3.5 border border-rose-200 space-y-2 text-[11.5px]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-rose-800 font-bold">
                    Payment Disbursal for Expense #{rejectingPaymentRecord.id}
                  </span>
                  <span className="font-mono font-bold text-rose-900 bg-white px-2 py-0.5 border border-rose-200">
                    {formatCurrency(rejectingPaymentRecord.amount)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-500 block text-[10.5px]">Vendor / Payee:</span>
                    <strong className="text-gray-900">{rejectingPaymentRecord.vendorName || "Not assigned"}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10.5px]">Center:</span>
                    <strong className="text-gray-900">{rejectingPaymentRecord.locationName || "Center"}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10.5px]">Bank A/C No:</span>
                    <strong className="text-gray-900 font-mono">{rejectingPaymentRecord.accountNo || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10.5px]">Bank Portal:</span>
                    <strong className={rejectingPaymentRecord.uploadedInBankPortal ? "text-emerald-700" : "text-amber-700"}>
                      {rejectingPaymentRecord.uploadedInBankPortal ? "Uploaded ✓" : "Pending"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Remarks Textarea */}
              <div>
                <label className="block font-bold text-gray-800 uppercase tracking-wider mb-1">
                  Reason for Rejecting Payment / Clarification Remarks <span className="text-red-600">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter specific reasons why payment cannot be authorized (e.g. 'Bank account details do not match vendor invoice', 'Invoice date mismatch', 'Holding until verification')..."
                  value={paymentRejectionReason}
                  onChange={(e) => setPaymentRejectionReason(e.target.value)}
                  className="w-full border border-rose-300 p-2.5 text-xs focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-500 text-gray-900 font-sans"
                />
              </div>

              {/* Quick Preset Reasons */}
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 font-mono">
                  Quick Select Common Reasons:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Vendor bank account details missing or incorrect",
                    "Uploaded tax invoice not matching bill amount",
                    "Please verify GST number with vendor before payment",
                    "Hold payment pending management confirmation",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() =>
                        setPaymentRejectionReason((prev) =>
                          prev ? `${prev}; ${preset}` : preset
                        )
                      }
                      className="text-[10px] bg-gray-100 hover:bg-rose-50 text-gray-700 hover:text-rose-800 px-2 py-1 border border-gray-200 hover:border-rose-300 transition-colors text-left"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingPaymentRecord(null);
                    setPaymentRejectionReason("");
                  }}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-600 hover:bg-gray-100 border border-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRejectingPaymentSubmitting || !paymentRejectionReason.trim()}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isRejectingPaymentSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  <span>{isRejectingPaymentSubmitting ? "Submitting..." : "Reject Payment Authorization"}</span>
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

              {/* Mobile & Email in 2 columns (Optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Mobile */}
                <div>
                  <label className="block font-bold text-gray-800 uppercase tracking-wider mb-1">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="e.g. 9876543210 (optional)"
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
                      className={`w-full pl-8 pr-3 py-2 text-xs border ${newVendorErrors.mobileNo
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
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      placeholder="e.g. accounts@vendor.com (optional)"
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
                      className={`w-full pl-8 pr-3 py-2 text-xs border ${newVendorErrors.email
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                          className={`w-3.5 h-3.5 text-emerald-600 ${uploadingInvoice ? "animate-spin" : ""
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

              {/* Form Section 5: Disbursal / UTR Entry (ONLY UNLOCKED AFTER SUPER ADMIN PAYMENT APPROVAL OR AUTO-APPROVED BY CONFIG) */}
              {(() => {
                const isAutoApprovedSettling = !onOffSAApproval && (isAccountant || isAccountantExpense(settlingRecord));
                const isSettlingPaymentApproved =
                  settlingRecord.paymentApprovalStatus === "APPROVED" ||
                  settlingRecord.paymentStatus === "PAID" ||
                  Boolean(settlingRecord.utrNumber) ||
                  isAutoApprovedSettling;

                if (isSettlingPaymentApproved) {
                  return (
                    <div className="space-y-3 pt-2 bg-emerald-50/60 p-3.5 border border-emerald-200">
                      <div className="flex items-center justify-between border-b border-emerald-200 pb-1.5">
                        <h4 className="font-mono font-bold text-[11px] uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {isAutoApprovedSettling ? "5. Auto-Approved — Disbursal & UTR Details" : "5. Super Admin Approved — Disbursal & UTR Details"}
                        </h4>
                        <span className="bg-emerald-600 text-white text-[9.5px] font-mono px-2 py-0.5 font-bold uppercase">
                          Approved ✓
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* UTR No */}
                        <div>
                          <label className="block font-bold text-gray-800 uppercase tracking-wider mb-1 text-[10.5px]">
                            UTR No / Bank Ref # (optional)
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
                            value={settleData.utrDate || settleData.payReceiveDate || ""}
                            onChange={(e) =>
                              setSettleData((prev) => ({
                                ...prev,
                                utrDate: e.target.value,
                                payReceiveDate: e.target.value,
                              }))
                            }
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
                  );
                }

                // If Super Admin has NOT approved payment yet:
                return (
                  <div className="space-y-3 pt-2 bg-amber-50/80 p-3.5 border border-amber-300">
                    <div className="flex items-center justify-between border-b border-amber-200 pb-1.5">
                      <h4 className="font-mono font-bold text-[11px] uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-600" /> 5. Super Admin 3rd Payment Approval (Sir to Pay)
                      </h4>
                      <span
                        className={`text-[9.5px] font-mono px-2 py-0.5 font-bold uppercase ${settlingRecord.paymentApprovalStatus === "PENDING"
                          ? "bg-amber-600 text-white animate-pulse"
                          : "bg-slate-700 text-white"
                          }`}
                      >
                        {settlingRecord.paymentApprovalStatus === "PENDING"
                          ? "⏳ Awaiting Sir Pay"
                          : "3rd Approval Required"}
                      </span>
                    </div>

                    <div className="text-[11px] text-amber-900 space-y-1 bg-white/70 p-2.5 border border-amber-200">
                      <p>
                        <strong>Super Admin Expense Requisition (Step 2) is Approved.</strong> Complete the vendor breakdown, invoice & bank portal verification above.
                      </p>
                      <p className="text-amber-800 text-[10.5px]">
                        🔒 <strong>Payment Disbursal Locked:</strong> UTR Number, Payment Date, Disbursal Mode, and Vendor Confirmation Advice remain strictly locked until Super Admin grants <strong>3rd Payment Approval (Sir to Pay)</strong>.
                      </p>
                    </div>

                    {/* Locked Fields Preview */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 opacity-60">
                      <div>
                        <label className="block font-bold text-gray-500 uppercase tracking-wider mb-1 text-[10px]">
                          UTR No / Bank Ref #
                        </label>
                        <div className="w-full border border-dashed border-gray-300 p-1.5 text-xs bg-gray-100 text-gray-400 font-mono flex items-center gap-1 cursor-not-allowed">
                          <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>e.g. UTR123456789 (Locked)</span>
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-gray-500 uppercase tracking-wider mb-1 text-[10.5px]">
                          Payment Date
                        </label>
                        <div className="w-full border border-dashed border-gray-300 p-1.5 text-xs bg-gray-100 text-gray-400 font-mono flex items-center gap-1 cursor-not-allowed">
                          <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>dd-mm-yyyy (Locked)</span>
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-gray-500 uppercase tracking-wider mb-1 text-[10.5px]">
                          Disbursal Mode
                        </label>
                        <div className="w-full border border-dashed border-gray-300 p-1.5 text-xs bg-gray-100 text-gray-400 font-mono flex items-center gap-1 cursor-not-allowed">
                          <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>Bank Transfer (Locked)</span>
                        </div>
                      </div>
                    </div>

                    {/* Super Admin Direct Action (If Admin is viewing this modal) */}
                    {isAdmin && (
                      <div className="pt-2 border-t border-amber-200 flex items-center justify-between bg-emerald-50/80 p-2.5 border border-emerald-300 mt-1">
                        <div className="text-[11px] text-emerald-900">
                          <strong className="block">Super Admin Payment Authorization:</strong>
                          <span className="text-[10px] text-emerald-700">You can authorize payment now to instantly unlock UTR entry.</span>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await handleApprovePayment(settlingRecord.id);
                            setSettlingRecord((prev) =>
                              prev ? { ...prev, paymentApprovalStatus: "APPROVED" } : null
                            );
                          }}
                          className="px-3 py-1.5 text-[10.5px] font-bold uppercase bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer shadow-xs flex items-center gap-1 shrink-0"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve Payment (Sir Pay)
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Actions */}
              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2 sticky bottom-0 bg-white py-2">
                <button
                  type="button"
                  onClick={() => setSettlingRecord(null)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-600 hover:bg-gray-100 border border-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                {(() => {
                  const isAutoApprovedSettling = !onOffSAApproval && (isAccountant || isAccountantExpense(settlingRecord));
                  const isSettlingPaymentApproved =
                    settlingRecord.paymentApprovalStatus === "APPROVED" ||
                    settlingRecord.paymentStatus === "PAID" ||
                    Boolean(settlingRecord.utrNumber) ||
                    isAutoApprovedSettling;

                  return (
                    <button
                      type="submit"
                      disabled={savingForm}
                      className={`text-white px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5 ${isSettlingPaymentApproved
                        ? "bg-emerald-700 hover:bg-emerald-800"
                        : "bg-[#004d40] hover:bg-[#00382e]"
                        }`}
                    >
                      <Send className="w-4 h-4" />
                      <span>
                        {savingForm
                          ? "Saving..."
                          : isSettlingPaymentApproved
                            ? "Save & Record Payment Disbursal (UTR)"
                            : settlingRecord.paymentApprovalStatus === "PENDING"
                              ? "Update Breakdown & Send for Super Admin 3rd Payment Approval"
                              : "Send for Super Admin 3rd Payment Approval"}
                      </span>
                    </button>
                  );
                })()}
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL 5: SUPER ADMIN DEDICATED APPROVALS DESK ── */}
      {mounted && typeof document !== "undefined" && isApprovalsModalOpen && isSuperAdminUser && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-2 sm:p-4 backdrop-blur-md overflow-hidden">
          <div className="bg-white border border-gray-300 w-full max-w-[1560px] h-[94vh] flex flex-col shadow-2xl rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 border-b border-cyan-800 flex items-center justify-between bg-[#006064] text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <ShieldCheck className="w-6 h-6 text-cyan-200" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-display font-black uppercase tracking-wide flex items-center gap-2.5 flex-wrap">
                    <span>Super Admin: Expense Approvals & Payment Authorization Desk</span>
                    <span className="bg-amber-500 text-white text-[11px] px-2.5 py-0.5 rounded-full font-bold shadow-xs">
                      {allPendingApprovals.length} Pending Actions
                    </span>
                  </h3>
                  <p className="text-[11px] text-cyan-100 hidden sm:block">
                    Dual Approval Workflow: Left Side: 2nd Approval (Expense Recognition after Accountant Check) • Right Side: Payment Time Approval (Sir to Pay) & Approval History
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsApprovalsModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
                title="Close Approvals Desk"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick KPI Counters & Search/Filter Toolbar */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Metric 1: Step 2 Expense Recognition */}
                <div className="bg-purple-50 text-purple-900 border border-purple-200 px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                  <Clock className="w-3.5 h-3.5 text-purple-700" />
                  <span>2nd Approval (Expense):</span>
                  <span className="font-mono font-black text-purple-950">
                    {pendingStep2Filtered.length} Pending
                  </span>
                  <span className="text-[10.5px] text-purple-700 font-normal">
                    ({formatCurrency(step2Total)})
                  </span>
                </div>

                {/* Metric 2: Step 3 Payment Authorization */}
                <div className="bg-amber-50 text-amber-900 border border-amber-300 px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                  <CreditCard className="w-3.5 h-3.5 text-amber-700" />
                  <span>Payment Authorization:</span>
                  <span className="font-mono font-black text-amber-950">
                    {pendingStep3Filtered.length} Pending
                  </span>
                  <span className="text-[10.5px] text-amber-700 font-normal">
                    ({formatCurrency(step3Total)})
                  </span>
                </div>

                {/* Metric 3: History */}
                <div className="bg-emerald-50 text-emerald-900 border border-emerald-200 px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Approval History:</span>
                  <span className="font-mono font-black text-emerald-950">
                    {historyBaseCount} Recorded
                  </span>
                </div>
              </div>

              {/* Filters: Center Select & Search */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Center Filter */}
                <div className="flex items-center gap-1 bg-white border border-gray-300 px-2 py-1 rounded text-xs">
                  <Building2 className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <select
                    value={approvalsCenterFilter}
                    onChange={(e) => setApprovalsCenterFilter(e.target.value)}
                    className="bg-transparent text-gray-800 font-bold focus:outline-none cursor-pointer text-xs"
                  >
                    <option value="ALL">All Centers ({locations.length})</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Search Box */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search ID, desc, vendor, ₹..."
                    value={approvalsSearchQuery}
                    onChange={(e) => setApprovalsSearchQuery(e.target.value)}
                    className="text-xs border border-gray-300 bg-white pl-8 pr-7 py-1 rounded w-44 sm:w-60 focus:outline-none focus:border-[#006064] text-gray-900"
                  />
                  {approvalsSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setApprovalsSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 2-Column Split Workspace */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-3.5 sm:p-4 overflow-hidden bg-slate-100/70 min-h-0">
              {/* ═════════════════════════════════════════════════════════ */}
              {/* LEFT COLUMN: 2nd Approval - Expense Recognition          */}
              {/* ═════════════════════════════════════════════════════════ */}
              <div className="flex flex-col h-full bg-white border border-purple-200 rounded-lg shadow-2xs overflow-hidden">
                {/* Column Header */}
                <div className="p-3 bg-gradient-to-r from-purple-900 to-indigo-900 text-white flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-200" />
                    <div>
                      <h4 className="text-xs font-display font-black uppercase tracking-wider flex items-center gap-1.5">
                        <span>2nd Approval: Expense Recognition</span>
                      </h4>
                      <p className="text-[10px] text-purple-200 font-sans">
                        Validated by Accountant • Review category & authorize requisition
                      </p>
                    </div>
                  </div>
                  <span className="bg-purple-800 text-purple-100 text-[10.5px] px-2.5 py-0.5 rounded-full font-bold border border-purple-700 shadow-2xs">
                    {pendingStep2Filtered.length} Pending • {formatCurrency(step2Total)}
                  </span>
                </div>

                {/* Left Column Scrollable Cards */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50">
                  {pendingStep2Filtered.length === 0 ? (
                    <div className="py-16 text-center text-gray-400">
                      <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
                      <p className="text-sm font-semibold text-gray-700">
                        All Expense Requisitions Approved!
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        No pending 2nd approvals awaiting expense recognition.
                      </p>
                    </div>
                  ) : (
                    pendingStep2Filtered.map((rec) => (
                      <div
                        key={rec.id}
                        className="border border-purple-200/80 bg-white p-3.5 rounded-md shadow-2xs hover:border-purple-400 transition-colors space-y-2.5 text-xs"
                      >
                        {/* Header Row */}
                        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-gray-100">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-gray-500">
                              #{rec.id}
                            </span>
                            <span className="text-xs font-bold text-gray-900 bg-slate-100 px-2 py-0.5 border border-slate-300 rounded">
                              {rec.locationName || "Center"}
                            </span>
                            <span className="text-[10.5px] font-mono text-gray-500">
                              {rec.expenseDateStr ||
                                (rec.expenseDate
                                  ? new Date(rec.expenseDate).toLocaleDateString("en-GB")
                                  : "-")}
                            </span>
                            {!isPredefinedCategory(rec.category) ? (
                              <span className="px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 rounded flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                                <span>{rec.category} (Custom Header)</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider bg-purple-50 text-purple-800 border border-purple-200 rounded">
                                {rec.category || "GENERAL"}
                              </span>
                            )}
                          </div>

                          <span className="text-base font-display font-black text-[#006064]">
                            {formatCurrency(rec.amount)}
                          </span>
                        </div>

                        {/* Attribution & Step 1 Validation Trail */}
                        <div className="flex items-center gap-2 flex-wrap text-[10.5px]">
                          {renderEnteredByBadge(rec)}
                          {rec.accountantApprovalStatus === "APPROVED" && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>
                                Step 1 Validated by {rec.accountantApprovedByName || "Accountant"}
                              </span>
                              {(rec.accountantApprovedAt || rec.updatedAt) && (
                                <span className="font-mono text-[9px] font-normal text-emerald-700">
                                  • {formatTimestamp(rec.accountantApprovedAt || rec.updatedAt)}
                                </span>
                              )}
                            </span>
                          )}
                        </div>

                        {/* Accountant Remarks if any */}
                        {(rec.accountantRemarks || rec.rejectionRemarks) && (
                          <div className="bg-purple-50 border border-purple-200 rounded px-2.5 py-1.5 text-[10.5px] text-purple-900">
                            <strong className="font-bold">Accountant Note:</strong>{" "}
                            {rec.accountantRemarks || rec.rejectionRemarks}
                          </div>
                        )}

                        {/* Description */}
                        <div className="text-xs text-gray-800">
                          <strong className="text-gray-900">Description:</strong> {rec.description}
                        </div>

                        {/* Particulars Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50 p-2.5 border border-gray-200 rounded text-[10.5px]">
                          <div>
                            <span className="text-gray-400 block text-[9.5px] uppercase font-mono">
                              Vendor / Payee
                            </span>
                            <strong className="text-gray-900 truncate block">
                              {rec.vendorName || "Not specified"}
                            </strong>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[9.5px] uppercase font-mono">
                              Qty & A/U
                            </span>
                            <span className="text-gray-800 font-mono">
                              {rec.quantity || 1} {rec.unit || "Nos"}
                              {rec.rate ? ` @ ₹${rec.rate}` : ""}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[9.5px] uppercase font-mono">
                              Payment Mode
                            </span>
                            <span className="text-gray-800">
                              {rec.paymentMode || "-"}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[9.5px] uppercase font-mono">
                              Receipt / Voucher
                            </span>
                            <span className="text-gray-800 font-mono">
                              {rec.receiptNo || "-"}
                            </span>
                          </div>
                        </div>

                        {/* Attached Documents */}
                        {((rec.attachmentUrl && !rec.attachmentUrl.includes("undefined")) ||
                          (rec.invoiceUrl && !rec.invoiceUrl.includes("undefined"))) && (
                            <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                              {rec.attachmentUrl && !rec.attachmentUrl.includes("undefined") && (
                                <a
                                  href={rec.attachmentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 border border-amber-200 rounded"
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
                                  className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#006064] bg-cyan-50 hover:bg-cyan-100 px-2 py-0.5 border border-cyan-200 rounded"
                                >
                                  <FileText className="w-3 h-3 text-[#006064]" />
                                  <span>Vendor Invoice PDF</span>
                                </a>
                              )}
                            </div>
                          )}

                        {/* Action Buttons */}
                        <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingRecord(rec);
                              setRejectionReason("");
                            }}
                            className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-white text-rose-700 hover:bg-rose-50 border border-rose-300 transition-all cursor-pointer flex items-center gap-1 rounded"
                            title="Reject requisition with mandatory remarks for correction"
                          >
                            <X className="w-3.5 h-3.5 text-rose-600" />
                            <span>Reject Requisition</span>
                          </button>

                          <button
                            type="button"
                            disabled={approving}
                            onClick={() => handleInitiateSuperAdminApprove(rec)}
                            className={`text-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5 rounded ${!isPredefinedCategory(rec.category)
                              ? "bg-amber-600 hover:bg-amber-700"
                              : "bg-emerald-700 hover:bg-emerald-800"
                              }`}
                          >
                            {!isPredefinedCategory(rec.category) ? (
                              <>
                                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                                <span>Review Header & Approve</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve Expense (Step 2)</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ═════════════════════════════════════════════════════════ */}
              {/* RIGHT COLUMN: Payment Time Approval ("Sir Pays") + History*/}
              {/* ═════════════════════════════════════════════════════════ */}
              <div className="flex flex-col h-full bg-white border border-amber-200 rounded-lg shadow-2xs overflow-hidden">
                {/* Column Header & Segmented Tabs */}
                <div className="p-2.5 bg-gradient-to-r from-amber-900 via-amber-850 to-amber-950 text-white flex items-center justify-between shrink-0 gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-amber-200" />
                    <h4 className="text-xs font-display font-black uppercase tracking-wider">
                      Payment Desk & History
                    </h4>
                  </div>

                  {/* View Segment Switcher */}
                  <div className="flex items-center bg-amber-950/70 p-0.5 rounded border border-amber-700/60 text-[10px] font-bold uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={() => setApprovalsRightTab("PAYMENT")}
                      className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${approvalsRightTab === "PAYMENT"
                        ? "bg-amber-500 text-white shadow-2xs"
                        : "text-amber-200 hover:text-white"
                        }`}
                    >
                      Payment Approvals ({pendingStep3Filtered.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setApprovalsRightTab("HISTORY")}
                      className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${approvalsRightTab === "HISTORY"
                        ? "bg-amber-500 text-white shadow-2xs"
                        : "text-amber-200 hover:text-white"
                        }`}
                    >
                      Approval History ({historyBaseCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setApprovalsRightTab("BOTH")}
                      className={`px-2.5 py-1 rounded transition-colors cursor-pointer hidden sm:block ${approvalsRightTab === "BOTH"
                        ? "bg-amber-500 text-white shadow-2xs"
                        : "text-amber-200 hover:text-white"
                        }`}
                    >
                      Split (Both)
                    </button>
                  </div>
                </div>

                {/* Right Column Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-3 space-y-4 bg-slate-50/50">
                  {/* ────────────────────────────────────────────────────────── */}
                  {/* VIEW 1: PAYMENT TIME APPROVALS ("SIR PAYS")                */}
                  {/* ────────────────────────────────────────────────────────── */}
                  {(approvalsRightTab === "PAYMENT" || approvalsRightTab === "BOTH") && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-1 border-b border-amber-200">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-amber-900 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-amber-700" />
                          <span>Payment Time Approvals (Sir to Pay)</span>
                        </span>
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                          {pendingStep3Filtered.length} Pending • {formatCurrency(step3Total)}
                        </span>
                      </div>

                      {pendingStep3Filtered.length === 0 ? (
                        <div className="py-8 text-center text-gray-400 bg-white border border-gray-200 rounded p-4">
                          <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-1" />
                          <p className="text-xs font-semibold text-gray-700">
                            No Pending Payment Approvals
                          </p>
                          <p className="text-[10px] text-gray-400">
                            All vendor payment disbursements have been authorized.
                          </p>
                        </div>
                      ) : (
                        pendingStep3Filtered.map((rec) => (
                          <div
                            key={rec.id}
                            className="border border-amber-300 bg-white p-3.5 rounded-md shadow-2xs hover:border-amber-500 transition-colors space-y-2.5 text-xs"
                          >
                            {/* Header Row */}
                            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-gray-100">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-bold text-gray-500">
                                  #{rec.id}
                                </span>
                                <span className="text-xs font-bold text-gray-900 bg-slate-100 px-2 py-0.5 border border-slate-300 rounded">
                                  {rec.locationName || "Center"}
                                </span>
                                <span className="text-[10.5px] font-mono text-gray-500">
                                  {rec.expenseDateStr ||
                                    (rec.expenseDate
                                      ? new Date(rec.expenseDate).toLocaleDateString("en-GB")
                                      : "-")}
                                </span>
                                <span className="px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider bg-cyan-50 text-[#006064] border border-cyan-200 rounded">
                                  {rec.category || "GENERAL"}
                                </span>
                                <span className="px-2 py-0.5 text-[9.5px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300 rounded">
                                  Pending Payment Approval (Sir Pays)
                                </span>
                              </div>

                              <span className="text-base font-display font-black text-amber-900">
                                {formatCurrency(rec.amount)}
                              </span>
                            </div>

                            {/* Attribution & Due Date Alert */}
                            <div className="flex items-center justify-between gap-2 flex-wrap text-[10.5px]">
                              <div className="flex items-center gap-2 flex-wrap">
                                {renderEnteredByBadge(rec)}
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Step 1 Validated</span>
                                  {(rec.accountantApprovedAt || rec.updatedAt) && (
                                    <span className="font-mono text-[9px] font-normal text-emerald-700">
                                      • {formatShortTimestamp(rec.accountantApprovedAt || rec.updatedAt)}
                                    </span>
                                  )}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold bg-purple-50 text-purple-800 border border-purple-300">
                                  <Check className="w-3 h-3 text-purple-600" />
                                  <span>Step 2 Approved ({rec.superAdminApprovedByName || rec.approvedByName || "Super Admin"})</span>
                                  {(rec.superAdminApprovedAt || rec.approvedAt || rec.updatedAt) && (
                                    <span className="font-mono text-[9px] font-normal text-purple-700">
                                      • {formatShortTimestamp(rec.superAdminApprovedAt || rec.approvedAt || rec.updatedAt)}
                                    </span>
                                  )}
                                </span>
                              </div>
                              {rec.dueDate && (
                                <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 border border-amber-200 rounded">
                                  Due: {formatExpenseDueDateDisplay(rec.dueDate)}
                                </span>
                              )}
                            </div>

                            {/* Description */}
                            <div className="text-xs text-gray-800">
                              <strong className="text-gray-900">Description:</strong> {rec.description}
                            </div>

                            {/* Vendor Billing & Bank Authorization Box */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-amber-50/60 p-2.5 border border-amber-200 rounded text-[10.5px]">
                              <div>
                                <span className="text-gray-400 block text-[9.5px] uppercase font-mono">
                                  Vendor / Payee
                                </span>
                                <strong className="text-gray-900 truncate block">
                                  {rec.vendorName || "Not specified"}
                                </strong>
                              </div>
                              <div>
                                <span className="text-gray-400 block text-[9.5px] uppercase font-mono">
                                  Bank A/C No.
                                </span>
                                <span className="font-mono text-gray-800">
                                  {rec.accountNo || "-"}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400 block text-[9.5px] uppercase font-mono">
                                  Qty & Rate
                                </span>
                                <span className="text-gray-800 font-mono">
                                  {rec.quantity || 1} {rec.unit || "Nos"}
                                  {rec.rate ? ` @ ₹${rec.rate}` : ""}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400 block text-[9.5px] uppercase font-mono">
                                  Bank Portal
                                </span>
                                <span
                                  className={`font-bold ${rec.uploadedInBankPortal
                                    ? "text-emerald-700"
                                    : "text-amber-700"
                                    }`}
                                >
                                  {rec.uploadedInBankPortal ? "Uploaded ✓" : "Pending Upload"}
                                </span>
                              </div>
                            </div>

                            {/* Attached Documents */}
                            {((rec.attachmentUrl && !rec.attachmentUrl.includes("undefined")) ||
                              (rec.invoiceUrl && !rec.invoiceUrl.includes("undefined"))) && (
                                <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                                  {rec.attachmentUrl && !rec.attachmentUrl.includes("undefined") && (
                                    <a
                                      href={rec.attachmentUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 border border-amber-200 rounded"
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
                                      className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#006064] bg-cyan-50 hover:bg-cyan-100 px-2 py-0.5 border border-cyan-200 rounded"
                                    >
                                      <FileText className="w-3 h-3 text-[#006064]" />
                                      <span>Vendor Invoice PDF</span>
                                    </a>
                                  )}
                                </div>
                              )}

                            {/* Action Buttons */}
                            <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectingPaymentRecord(rec);
                                  setPaymentRejectionReason("");
                                }}
                                className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-white text-rose-700 hover:bg-rose-50 border border-rose-300 transition-all cursor-pointer flex items-center gap-1 rounded"
                                title="Reject payment request with remarks"
                              >
                                <X className="w-3.5 h-3.5 text-rose-600" />
                                <span>Reject Payment</span>
                              </button>

                              <button
                                type="button"
                                disabled={approving}
                                onClick={() => handleApprovePayment(rec.id)}
                                className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-700 transition-all cursor-pointer flex items-center gap-1 rounded disabled:opacity-50"
                                title="Approve payment disbursal (Sir Pays)"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve Payment</span>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* ────────────────────────────────────────────────────────── */}
                  {/* VIEW 2: HISTORY & AUDIT TRAIL                             */}
                  {/* ────────────────────────────────────────────────────────── */}
                  {(approvalsRightTab === "HISTORY" || approvalsRightTab === "BOTH") && (
                                  <div className="space-y-3">
                                    {/* History Header with granular sub-filters */}
                                    <div className="flex items-center justify-between pb-2 border-b border-emerald-200 pt-1 flex-wrap gap-2">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-900 flex items-center gap-1.5">
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                                          <span>Approval History & Audit Trail</span>
                                        </span>

                                        {/* Sub-filter tabs */}
                                        <div className="inline-flex items-center bg-slate-100 border border-slate-300 p-0.5 rounded text-[9.5px] font-bold flex-wrap">
                                          <button
                                            type="button"
                                            onClick={() => setApprovalsHistorySubFilter("ALL")}
                                            className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${approvalsHistorySubFilter === "ALL"
                                              ? "bg-emerald-700 text-white shadow-2xs"
                                              : "text-slate-700 hover:bg-slate-200"
                                              }`}
                                          >
                                            All ({historyBaseCount})
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setApprovalsHistorySubFilter("APPROVED")}
                                            className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${approvalsHistorySubFilter === "APPROVED"
                                              ? "bg-purple-700 text-white shadow-2xs"
                                              : "text-purple-800 hover:bg-purple-100"
                                              }`}
                                          >
                                            Expense Approved ({historyExpenseApprovedCount})
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setApprovalsHistorySubFilter("PAYMENT")}
                                            className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${approvalsHistorySubFilter === "PAYMENT"
                                              ? "bg-amber-700 text-white shadow-2xs"
                                              : "text-amber-900 hover:bg-amber-100"
                                              }`}
                                          >
                                            Payment Authorized ({historyPaymentApprovedCount})
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setApprovalsHistorySubFilter("REJECTED")}
                                            className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${approvalsHistorySubFilter === "REJECTED"
                                              ? "bg-rose-700 text-white shadow-2xs"
                                              : "text-rose-800 hover:bg-rose-100"
                                              }`}
                                          >
                                            Rejected ({historyRejectedCount})
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setApprovalsHistorySubFilter("DISBURSED")}
                                            className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${approvalsHistorySubFilter === "DISBURSED"
                                              ? "bg-emerald-600 text-white shadow-2xs"
                                              : "text-emerald-800 hover:bg-emerald-100"
                                              }`}
                                          >
                                            Disbursed ({historyDisbursedCount})
                                          </button>
                                        </div>
                                      </div>

                                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                                        {historyFiltered.length} Showing • {formatCurrency(historyTotal)}
                                      </span>
                                    </div>

                                    {historyFiltered.length === 0 ? (
                                      <div className="py-8 text-center text-gray-400 bg-white border border-gray-200 rounded p-4">
                                        <Clock className="w-8 h-8 mx-auto text-gray-400 mb-1" />
                                        <p className="text-xs font-semibold text-gray-700">
                                          No Records Found
                                        </p>
                                        <p className="text-[10px] text-gray-400">
                                          No approval history matching current center, search or sub-filter.
                                        </p>
                                      </div>
                                    ) : (
                                      historyFiltered.map((rec) => {
                                        const isExpenseApproved =
                                          rec.approvalStatus === "APPROVED" ||
                                          rec.superAdminApprovalStatus === "APPROVED";
                                        const isExpenseRejected =
                                          rec.approvalStatus === "REJECTED_BY_SUPER_ADMIN" ||
                                          rec.superAdminApprovalStatus === "REJECTED";
                                        const isAccRejected =
                                          rec.approvalStatus === "REJECTED_BY_ACCOUNTANT" ||
                                          rec.accountantApprovalStatus === "REJECTED";
                                        const isPaymentApproved =
                                          rec.paymentApprovalStatus === "APPROVED" ||
                                          rec.paymentStatus === "PAID" ||
                                          Boolean(rec.utrNumber);
                                        const isPaymentRejected =
                                          rec.paymentApprovalStatus === "REJECTED";
                                        const isDisbursed =
                                          rec.paymentStatus === "PAID" || Boolean(rec.utrNumber);

                                        return (
                                          <div
                                            key={rec.id}
                                            className="border border-gray-200 bg-white p-3 rounded-md shadow-2xs hover:border-gray-300 transition-colors space-y-2.5 text-xs"
                                          >
                                            {/* Top Row: Meta Tags & Amount */}
                                            <div className="flex items-center justify-between flex-wrap gap-2 pb-1.5 border-b border-gray-100">
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-mono text-xs font-bold text-gray-500">
                                                  #{rec.id}
                                                </span>
                                                <span className="text-xs font-bold text-gray-900 bg-slate-100 px-2 py-0.5 border border-slate-300 rounded">
                                                  {rec.locationName || "Center"}
                                                </span>
                                                <span className="text-[10px] font-mono text-gray-500">
                                                  {rec.expenseDateStr ||
                                                    (rec.expenseDate
                                                      ? new Date(rec.expenseDate).toLocaleDateString("en-GB")
                                                      : "-")}
                                                </span>
                                                <span className="px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider bg-gray-100 text-gray-800 border border-gray-200 rounded">
                                                  {rec.category || "GENERAL"}
                                                </span>

                                                {/* Overall Status Badge */}
                                                {isDisbursed ? (
                                                  <span className="px-2 py-0.5 text-[9.5px] font-bold uppercase bg-emerald-100 text-emerald-900 border border-emerald-300 rounded flex items-center gap-1">
                                                    <Check className="w-2.5 h-2.5 text-emerald-700" />
                                                    <span>Paid / Disbursed</span>
                                                  </span>
                                                ) : isPaymentRejected ? (
                                                  <span className="px-2 py-0.5 text-[9.5px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300 rounded flex items-center gap-1">
                                                    <X className="w-2.5 h-2.5 text-rose-700" />
                                                    <span>Payment Rejected</span>
                                                  </span>
                                                ) : isExpenseRejected ? (
                                                  <span className="px-2 py-0.5 text-[9.5px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300 rounded flex items-center gap-1">
                                                    <X className="w-2.5 h-2.5 text-rose-700" />
                                                    <span>Expense Rejected (SA)</span>
                                                  </span>
                                                ) : isAccRejected ? (
                                                  <span className="px-2 py-0.5 text-[9.5px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300 rounded flex items-center gap-1">
                                                    <X className="w-2.5 h-2.5 text-rose-700" />
                                                    <span>Rejected by Accountant</span>
                                                  </span>
                                                ) : isPaymentApproved ? (
                                                  <span className="px-2 py-0.5 text-[9.5px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300 rounded flex items-center gap-1">
                                                    <Check className="w-2.5 h-2.5 text-amber-700" />
                                                    <span>Payment Authorized</span>
                                                  </span>
                                                ) : isExpenseApproved ? (
                                                  <span className="px-2 py-0.5 text-[9.5px] font-bold uppercase bg-purple-100 text-purple-900 border border-purple-300 rounded flex items-center gap-1">
                                                    <Check className="w-2.5 h-2.5 text-purple-700" />
                                                    <span>Expense Approved</span>
                                                  </span>
                                                ) : null}
                                              </div>

                                              <span className="text-sm font-display font-black text-gray-900">
                                                {formatCurrency(rec.amount)}
                                              </span>
                                            </div>

                                            {/* Description & Payee */}
                                            <div className="text-[11.5px] text-gray-800 flex items-center justify-between flex-wrap gap-2">
                                              <div>
                                                <strong className="text-gray-900">Description:</strong> {rec.description}
                                                {rec.vendorName && (
                                                  <span className="text-gray-600 ml-2">
                                                    • Payee: <strong className="text-gray-800">{rec.vendorName}</strong>
                                                  </span>
                                                )}
                                                {rec.accountNo && (
                                                  <span className="text-gray-500 font-mono ml-2 text-[10.5px]">
                                                    (A/C: {rec.accountNo})
                                                  </span>
                                                )}
                                              </div>
                                              {renderEnteredByBadge(rec)}
                                            </div>

                                            {/* ── STRUCTURED AUDIT TRAIL: BOTH APPROVALS ── */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                                              {/* 1. EXPENSE RECOGNITION APPROVAL (Step 1 Accountant + Step 2 Super Admin) */}
                                              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] space-y-1.5">
                                                <div className="font-bold text-gray-800 uppercase tracking-wide text-[9.5px] flex items-center justify-between border-b border-slate-200 pb-1">
                                                  <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3 text-purple-700" />
                                                    <span>1. Expense Recognition</span>
                                                  </span>
                                                  {isExpenseApproved ? (
                                                    <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                                                      <Check className="w-3 h-3" /> Approved
                                                    </span>
                                                  ) : isExpenseRejected ? (
                                                    <span className="text-rose-700 font-bold flex items-center gap-0.5">
                                                      <X className="w-3 h-3" /> SA Rejected
                                                    </span>
                                                  ) : isAccRejected ? (
                                                    <span className="text-rose-700 font-bold flex items-center gap-0.5">
                                                      <X className="w-3 h-3" /> Acc Rejected
                                                    </span>
                                                  ) : (
                                                    <span className="text-amber-700 font-semibold">Pending Check</span>
                                                  )}
                                                </div>

                                                {/* Step 1 Accountant Check Detail */}
                                                <div className="text-[10px] text-gray-700 flex flex-col gap-0.5">
                                                  <div className="flex items-start gap-1">
                                                    <span className="font-bold text-gray-500 shrink-0 w-16">Acc Check:</span>
                                                    {rec.accountantApprovalStatus === "APPROVED" ? (
                                                      <span className="text-emerald-800">
                                                        ✓ Validated by <strong>{rec.accountantApprovedByName || "Accountant"}</strong>
                                                        {(rec.accountantApprovedAt || rec.updatedAt) && (
                                                          <span className="font-mono text-gray-500 ml-1">
                                                            on {formatTimestamp(rec.accountantApprovedAt || rec.updatedAt)}
                                                          </span>
                                                        )}
                                                      </span>
                                                    ) : isAccRejected ? (
                                                      <span className="text-rose-700">
                                                        ✕ Rejected by <strong>{rec.accountantApprovedByName || "Accountant"}</strong>
                                                        {(rec.accountantApprovedAt || rec.updatedAt) && (
                                                          <span className="font-mono text-rose-600 ml-1">
                                                            on {formatTimestamp(rec.accountantApprovedAt || rec.updatedAt)}
                                                          </span>
                                                        )}
                                                      </span>
                                                    ) : (
                                                      <span className="text-gray-400 font-mono">Bypassed / Pending</span>
                                                    )}
                                                  </div>
                                                </div>

                                                {/* Step 2 SA Expense Recognition Detail */}
                                                <div className="text-[10px] text-gray-700 flex flex-col gap-0.5">
                                                  <div className="flex items-start gap-1">
                                                    <span className="font-bold text-gray-500 shrink-0 w-16">SA Recon:</span>
                                                    {isExpenseApproved ? (
                                                      <span className="text-purple-900">
                                                        ✓ Approved by <strong>{rec.superAdminApprovedByName || rec.approvedByName || "Super Admin"}</strong>
                                                        {(rec.superAdminApprovedAt || rec.approvedAt || rec.updatedAt) && (
                                                          <span className="font-mono text-gray-500 ml-1">
                                                            on {formatTimestamp(rec.superAdminApprovedAt || rec.approvedAt || rec.updatedAt)}
                                                          </span>
                                                        )}
                                                      </span>
                                                    ) : isExpenseRejected ? (
                                                      <span className="text-rose-700">
                                                        ✕ Rejected by <strong>{rec.superAdminApprovedByName || "Super Admin"}</strong>
                                                        {(rec.superAdminApprovedAt || rec.updatedAt) && (
                                                          <span className="font-mono text-rose-600 ml-1">
                                                            on {formatTimestamp(rec.superAdminApprovedAt || rec.updatedAt)}
                                                          </span>
                                                        )}
                                                      </span>
                                                    ) : (
                                                      <span className="text-amber-700 font-mono">Awaiting Super Admin Review</span>
                                                    )}
                                                  </div>
                                                </div>

                                                {/* Remarks or Rejection Reason */}
                                                {(rec.rejectionRemarks || rec.superAdminRemarks || rec.accountantRemarks) && (
                                                  <div className={`mt-1 p-1.5 rounded text-[9.5px] border ${isExpenseRejected || isAccRejected
                                                    ? "bg-rose-50 border-rose-200 text-rose-900"
                                                    : "bg-white border-slate-200 text-gray-700"
                                                    }`}>
                                                    <strong className="block text-[8px] uppercase tracking-wide font-mono">
                                                      {isExpenseRejected || isAccRejected ? "Rejection Reason:" : "Notes / Remarks:"}
                                                    </strong>
                                                    <span>{rec.rejectionRemarks || rec.superAdminRemarks || rec.accountantRemarks}</span>
                                                  </div>
                                                )}
                                              </div>

                                              {/* 2. PAYMENT TIME APPROVAL (Sir to Pay & Settlement) */}
                                              <div className="p-2.5 bg-amber-50/50 border border-amber-200 rounded text-[11px] space-y-1.5">
                                                <div className="font-bold text-amber-900 uppercase tracking-wide text-[9.5px] flex items-center justify-between border-b border-amber-200 pb-1">
                                                  <span className="flex items-center gap-1">
                                                    <CreditCard className="w-3 h-3 text-amber-700" />
                                                    <span>2. Payment Time Approval (Sir Pays)</span>
                                                  </span>
                                                  {isPaymentApproved ? (
                                                    <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                                                      <Check className="w-3 h-3" /> Authorized
                                                    </span>
                                                  ) : isPaymentRejected ? (
                                                    <span className="text-rose-700 font-bold flex items-center gap-0.5">
                                                      <X className="w-3 h-3" /> Rejected
                                                    </span>
                                                  ) : rec.paymentApprovalStatus === "PENDING" ? (
                                                    <span className="text-amber-700 font-semibold">Pending Sir</span>
                                                  ) : (
                                                    <span className="text-gray-400 font-medium">Direct / Self</span>
                                                  )}
                                                </div>

                                                {/* Payment Authorization Status */}
                                                <div className="text-[10px] text-gray-700 flex flex-col gap-0.5">
                                                  <div className="flex items-start gap-1">
                                                    <span className="font-bold text-gray-500 shrink-0 w-16">Sir Pay:</span>
                                                    {isPaymentApproved ? (
                                                      <span className="text-amber-950">
                                                        ✓ Authorized by <strong>{rec.paymentApprovedByName || "Super Admin"}</strong>
                                                        {(rec.paymentApprovedAt || rec.updatedAt) && (
                                                          <span className="font-mono text-amber-800 ml-1">
                                                            on {formatTimestamp(rec.paymentApprovedAt || rec.updatedAt)}
                                                          </span>
                                                        )}
                                                      </span>
                                                    ) : isPaymentRejected ? (
                                                      <span className="text-rose-700">
                                                        ✕ Rejected by <strong>{rec.paymentApprovedByName || "Super Admin"}</strong>
                                                        {(rec.paymentApprovedAt || rec.updatedAt) && (
                                                          <span className="font-mono text-rose-600 ml-1">
                                                            on {formatTimestamp(rec.paymentApprovedAt || rec.updatedAt)}
                                                          </span>
                                                        )}
                                                      </span>
                                                    ) : rec.paymentApprovalStatus === "PENDING" ? (
                                                      <span className="text-amber-700 font-mono">Pending Payment Authorization</span>
                                                    ) : (
                                                      <span className="text-gray-400 font-mono">Self / Center Settled</span>
                                                    )}
                                                  </div>
                                                </div>

                                                {/* Disbursal / Settlement Status */}
                                                <div className="text-[10px] text-gray-700 flex flex-col gap-0.5">
                                                  <div className="flex items-start gap-1">
                                                    <span className="font-bold text-gray-500 shrink-0 w-16">Settlement:</span>
                                                    {isDisbursed ? (
                                                      <span className="text-emerald-800 font-mono">
                                                        ✓ Disbursed <strong>{rec.utrNumber ? `(UTR: ${rec.utrNumber})` : "✓"}</strong>
                                                        {(rec.payReceiveDate || rec.utrDate) && (
                                                          <span className="ml-1 text-gray-500 font-sans">
                                                            on {rec.payReceiveDate || rec.utrDate}
                                                          </span>
                                                        )}
                                                      </span>
                                                    ) : isPaymentApproved ? (
                                                      <span className="text-amber-700 font-semibold flex items-center gap-1">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        <span>Awaiting Accountant UTR recording</span>
                                                      </span>
                                                    ) : (
                                                      <span className="text-gray-400 font-mono">Awaiting Payment Approval</span>
                                                    )}
                                                  </div>
                                                </div>

                                                {/* Payment Remarks or Rejection Reason */}
                                                {rec.paymentApprovalRemarks && (
                                                  <div className={`mt-1 p-1.5 rounded text-[9.5px] border ${isPaymentRejected
                                                    ? "bg-rose-50 border-rose-200 text-rose-900"
                                                    : "bg-white border-amber-200 text-amber-900"
                                                    }`}>
                                                    <strong className="block text-[8px] uppercase tracking-wide font-mono">
                                                      {isPaymentRejected ? "Payment Rejection Reason:" : "Payment Note:"}
                                                    </strong>
                                                    <span>{rec.paymentApprovalRemarks}</span>
                                                  </div>
                                                )}
                                              </div>
                                            </div>

                                            {/* Attached docs if present */}
                                            {((rec.attachmentUrl && !rec.attachmentUrl.includes("undefined")) ||
                                              (rec.invoiceUrl && !rec.invoiceUrl.includes("undefined")) ||
                                              (rec.utrFileUrl && !rec.utrFileUrl.includes("undefined"))) && (
                                                <div className="flex items-center gap-2 pt-1 border-t border-gray-100 flex-wrap text-[10px]">
                                                  {rec.invoiceUrl && !rec.invoiceUrl.includes("undefined") && (
                                                    <a
                                                      href={rec.invoiceUrl}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="text-[#006064] underline hover:text-[#004d40] flex items-center gap-0.5 font-bold"
                                                    >
                                                      <FileText className="w-2.5 h-2.5" />
                                                      <span>Invoice PDF</span>
                                                    </a>
                                                  )}
                                                  {rec.attachmentUrl && !rec.attachmentUrl.includes("undefined") && (
                                                    <a
                                                      href={rec.attachmentUrl}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="text-amber-800 underline hover:text-amber-900 flex items-center gap-0.5 font-bold"
                                                    >
                                                      <Receipt className="w-2.5 h-2.5" />
                                                      <span>CM Slip</span>
                                                    </a>
                                                  )}
                                                  {rec.utrFileUrl && !rec.utrFileUrl.includes("undefined") && (
                                                    <a
                                                      href={rec.utrFileUrl}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="text-emerald-800 underline hover:text-emerald-900 flex items-center gap-0.5 font-bold"
                                                    >
                                                      <CheckCircle2 className="w-2.5 h-2.5" />
                                                      <span>UTR Payment Proof</span>
                                                    </a>
                                                  )}
                                                </div>
                                              )}
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                )}
                </div>
              </div>
            </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-gray-500">
              Approvals notify the accountant and unlock UTR recording & vendor notification.
            </span>
            <button
              type="button"
              onClick={() => setIsApprovalsModalOpen(false)}
              className="px-5 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-200 border border-gray-300 cursor-pointer bg-white rounded shadow-2xs transition-colors"
            >
              Close Desk
            </button>
          </div>
        </div>
        </div>,
    document.body
  )
}

{/* ── MODAL 6: CM VIEW PAYMENT DETAILS MODAL ── */ }
{
  mounted && typeof document !== "undefined" && isViewPaymentModalOpen && viewingPaymentRecord && createPortal(
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
                  className={`font-bold ${viewingPaymentRecord.uploadedInBankPortal
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
                  className={`font-bold ${viewingPaymentRecord.paymentStatus === "PAID"
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
                  className={`font-bold ${viewingPaymentRecord.alertEmailSent
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
  )
}

{/* ── MODAL: SUPER ADMIN MAIN EXPENSE CATEGORY HEADERS ── */ }
{
  mounted && typeof document !== "undefined" && isCategoryModalOpen && isAdmin && createPortal(
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

            {/* Interactive Category Suggestions */}
            <div className="pt-2 border-t border-slate-200 text-[11px] text-gray-500 leading-normal">
              <span className="font-bold text-gray-700 block mb-1">Quick Add Suggestions (Click to add):</span>
              <div className="flex flex-wrap gap-1">
                {SUGGESTED_CATEGORY_HEADERS.map((sugg) => {
                  const alreadyAdded = categoryHeaders.includes(sugg);
                  return (
                    <button
                      key={sugg}
                      type="button"
                      onClick={() => !alreadyAdded && handleAddCategoryHeader(sugg)}
                      disabled={alreadyAdded}
                      className={`text-[9.5px] px-2 py-0.5 border font-semibold transition-all ${alreadyAdded
                        ? "bg-gray-100 text-gray-400 border-gray-200 cursor-default"
                        : "bg-white text-[#006064] border-cyan-200 hover:bg-cyan-50 hover:border-cyan-400 cursor-pointer shadow-2xs"
                        }`}
                    >
                      {alreadyAdded ? `✓ ${sugg}` : `+ ${sugg}`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 2: Active Category Headers List */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
              <h4 className="font-bold uppercase tracking-wider text-gray-800 text-[11px] flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#006064]" />
                <span>Official Category Headers ({categoryHeaders.length})</span>
              </h4>
              <span className="text-[10px] text-gray-500">
                Headers created by Super Admin for CM & Accountant dropdowns
              </span>
            </div>

            {categoryHeaders.length === 0 ? (
              <div className="py-8 text-center text-gray-400 bg-gray-50 border border-dashed border-gray-300">
                <p className="text-xs font-semibold text-gray-600">No category headers created yet.</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Add a new header above or pick from suggestions.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[380px] overflow-y-auto pr-1">
                {categoryHeaders.map((cat) => {
                  const isEditing = editingCategoryOldName === cat;
                  const expenseCount = records.filter(
                    (r) => r.category && r.category.trim().toUpperCase() === cat
                  ).length;

                  return (
                    <div
                      key={cat}
                      className="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-cyan-50/40 border border-gray-200 transition-colors"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 flex-1">
                          <input
                            type="text"
                            value={editingCategoryNewName}
                            onChange={(e) => setEditingCategoryNewName(e.target.value.toUpperCase())}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleUpdateCategoryHeader(cat, editingCategoryNewName);
                              }
                            }}
                            autoFocus
                            className="flex-1 bg-white border border-[#006064] p-1 text-[11px] font-bold uppercase text-gray-900 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateCategoryHeader(cat, editingCategoryNewName)}
                            disabled={savingCategory || !editingCategoryNewName.trim()}
                            className="bg-[#006064] text-white px-2 py-1 text-[10px] font-bold uppercase cursor-pointer hover:bg-[#00838f]"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategoryOldName(null);
                              setEditingCategoryNewName("");
                            }}
                            className="bg-gray-200 text-gray-700 px-2 py-1 text-[10px] font-bold uppercase cursor-pointer hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-gray-800 text-[11px] truncate uppercase">
                              {cat}
                            </span>
                            {expenseCount > 0 && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 bg-cyan-100 text-[#006064] font-bold shrink-0">
                                {expenseCount} exp
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategoryOldName(cat);
                                setEditingCategoryNewName(cat);
                              }}
                              className="p-1 text-gray-500 hover:text-[#006064] hover:bg-white border border-transparent hover:border-gray-200 transition-all cursor-pointer"
                              title={`Rename ${cat}`}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategoryHeader(cat)}
                              disabled={deletingCategoryName === cat}
                              className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                              title={`Delete ${cat}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>


        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-end bg-gray-50">
          <button
            type="button"
            onClick={() => {
              setIsCategoryModalOpen(false);
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
  )
}

{/* ── ICICI BANK STATEMENT MODAL (ACCOUNTANT & SUPER ADMIN ONLY) ── */ }
{
  (isAdmin || isAccountant) && (
    <BankStatementModal
      isOpen={isBankStatementOpen}
      onClose={() => setIsBankStatementOpen(false)}
      isAdmin={isAdmin}
      isAccountant={isAccountant}
    />
  )
}
    </div >
  );
}
