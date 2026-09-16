"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Landmark,
  X,
  Search,
  Calendar,
  Download,
  Printer,
  Edit3,
  RefreshCw,
  Check,
  Building2,
  FileSpreadsheet,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  HelpCircle,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Lock,
  Unlock,
  RotateCcw,
  CheckSquare,
  Square,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

export interface BankTransactionItem {
  id: number;
  valueDate: string;
  postDate: string;
  details: string;
  refNo: string;
  debit: number | null;
  credit: number | null;
  balance: number;
  vendorName?: string | null;
  category?: string | null;
  locationName?: string | null;
  paymentMode?: string | null;
  expenseId?: number;
  invoiceUrl?: string | null;
  receiptUrl?: string | null;
  source?: string;
}

export interface BankConfig {
  bankName: string;
  accountNo: string;
  openingBalance: number;
  asOfDate: string;
}

export interface BankStatementSummary {
  broughtForward: number;
  drCount: number;
  crCount: number;
  totalDebits: number;
  totalCredits: number;
  closingBalance: number;
}

interface BankStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  isAccountant: boolean;
}

export interface ColumnDefinition {
  id: string;
  label: string;
  defaultWidth: number;
  minWidth: number;
  align: "left" | "center" | "right";
  mono?: boolean;
}

export const STATEMENT_COLUMNS: ColumnDefinition[] = [
  { id: "valueDate", label: "Value Date", defaultWidth: 110, minWidth: 50, align: "center", mono: true },
  { id: "postDate", label: "Post Date", defaultWidth: 110, minWidth: 50, align: "center", mono: true },
  { id: "details", label: "Details / Transaction Narration", defaultWidth: 380, minWidth: 100, align: "left" },
  { id: "refNo", label: "Ref No/ Cheque No", defaultWidth: 230, minWidth: 70, align: "center", mono: true },
  { id: "debit", label: "₹ Debit", defaultWidth: 115, minWidth: 65, align: "right", mono: true },
  { id: "credit", label: "₹ Credit", defaultWidth: 115, minWidth: 65, align: "right", mono: true },
  { id: "balance", label: "Balance (₹)", defaultWidth: 130, minWidth: 70, align: "right", mono: true },
];

export function BankStatementModal({
  isOpen,
  onClose,
  isAdmin,
  isAccountant,
}: BankStatementModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<BankTransactionItem[]>([]);
  const [config, setConfig] = useState<BankConfig>({
    bankName: "ICICI BANK",
    accountNo: "136705002010",
    openingBalance: 50000,
    asOfDate: "2026-08-01",
  });
  const [summary, setSummary] = useState<BankStatementSummary>({
    broughtForward: 50000,
    drCount: 0,
    crCount: 0,
    totalDebits: 0,
    totalCredits: 0,
    closingBalance: 50000,
  });

  // Comprehensive Filters: Month-wise, Year-wise, Date-wise, Custom Date Range
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "MONTH" | "YEAR" | "DATE" | "CUSTOM">("ALL");
  const [selectedMonth, setSelectedMonth] = useState("ALL");
  const [selectedYear, setSelectedYear] = useState("ALL");
  const [selectedDate, setSelectedDate] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // ── SPREADSHEET FEATURES: COLUMN RESIZE, FREEZE & GOOGLE SHEETS FILTERS ──
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    STATEMENT_COLUMNS.forEach((c) => {
      initial[c.id] = c.defaultWidth;
    });
    return initial;
  });

  const [frozenColCount, setFrozenColCount] = useState<number>(1); // Default: Freeze Value Date
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [activeColMenu, setActiveColMenu] = useState<string | null>(null);
  const [tempFilterValues, setTempFilterValues] = useState<string[]>([]);
  const [filterSearchQuery, setFilterSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ colId: string; direction: "asc" | "desc" } | null>(null);

  const colMenuRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);
  const resizeDataRef = useRef<{ colId: string; startX: number; startWidth: number } | null>(null);

  // Edit Opening Balance Modal
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [newOpeningBalance, setNewOpeningBalance] = useState("50000");
  const [newAsOfDate, setNewAsOfDate] = useState("2026-08-01");
  const [savingBalance, setSavingBalance] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch Statement on Open
  useEffect(() => {
    if (isOpen) {
      fetchStatement(true);
    }
  }, [isOpen]);

  // Click outside listener for column menu popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) {
        setActiveColMenu(null);
      }
    };
    if (activeColMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeColMenu]);

  // Global mousemove/mouseup listener for Excel-style column resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current || !resizeDataRef.current) return;
      const { colId, startX, startWidth } = resizeDataRef.current;
      const colDef = STATEMENT_COLUMNS.find((c) => c.id === colId);
      const minWidth = colDef?.minWidth || 50;
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
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleStartResize = (colId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const currentWidth = columnWidths[colId] || STATEMENT_COLUMNS.find((c) => c.id === colId)?.defaultWidth || 120;
    isResizingRef.current = true;
    resizeDataRef.current = { colId, startX: e.clientX, startWidth: currentWidth };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const handleResetColumnWidths = () => {
    const reset: Record<string, number> = {};
    STATEMENT_COLUMNS.forEach((c) => {
      reset[c.id] = c.defaultWidth;
    });
    setColumnWidths(reset);
    toast.info("Column widths reset to default");
  };

  const fetchStatement = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      else setRefreshing(true);

      const res = await fetch("/api/admin/bank-statement");
      const data = await res.json();

      if (data.success) {
        setConfig(data.config);
        setNewOpeningBalance(String(data.config.openingBalance || 50000));
        setNewAsOfDate(data.config.asOfDate || "2026-08-01");
        setTransactions(data.transactions || []);
        setSummary(data.summary);
      } else {
        toast.error(data.error || "Failed to load bank statement");
      }
    } catch (err) {
      console.error("Error fetching bank statement:", err);
      toast.error("Network error loading bank statement");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSaveOpeningBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingBalance(true);
      const parsedVal = parseFloat(newOpeningBalance);
      if (isNaN(parsedVal)) {
        toast.error("Please enter a valid opening balance amount");
        return;
      }

      const res = await fetch("/api/admin/bank-statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          openingBalance: parsedVal,
          asOfDate: newAsOfDate,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Opening balance updated and recalculated!");
        setIsEditingBalance(false);
        fetchStatement(false);
      } else {
        toast.error(data.error || "Failed to update opening balance");
      }
    } catch (err) {
      console.error("Error updating balance:", err);
      toast.error("Error saving opening balance");
    } finally {
      setSavingBalance(false);
    }
  };

  // Month options derived from transactions
  const availableMonths = useMemo(() => {
    const monthMap = new Map<string, string>();
    transactions.forEach((t) => {
      const parts = t.valueDate.split("/");
      if (parts.length === 3) {
        const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleString("en-US", { month: "short", year: "numeric" });
        monthMap.set(key, label);
      }
    });
    return Array.from(monthMap.entries()).map(([value, label]) => ({ value, label }));
  }, [transactions]);

  // Year options derived from transactions
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    transactions.forEach((t) => {
      const parts = t.valueDate.split("/");
      if (parts.length === 3 && parts[2]) {
        yearsSet.add(parts[2]);
      }
    });
    if (yearsSet.size === 0) {
      yearsSet.add(new Date().getFullYear().toString());
    }
    return Array.from(yearsSet).sort().reverse();
  }, [transactions]);

  // Helper to extract raw cell value as string
  const getCellValue = (tx: BankTransactionItem, colId: string): string => {
    switch (colId) {
      case "valueDate":
        return tx.valueDate || "";
      case "postDate":
        return tx.postDate || "";
      case "details":
        return tx.details || "";
      case "refNo":
        return tx.refNo || "-";
      case "debit":
        return tx.debit ? Number(tx.debit).toFixed(2) : "-";
      case "credit":
        return tx.credit ? Number(tx.credit).toFixed(2) : "-";
      case "balance":
        return tx.balance !== undefined && tx.balance !== null ? Number(tx.balance).toFixed(2) : "-";
      default:
        return "";
    }
  };

  // Base filtered transactions (from top-level Date / Search bar)
  const baseTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // 1. Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const detailsMatch = t.details?.toLowerCase().includes(q);
        const refMatch = t.refNo?.toLowerCase().includes(q);
        const vendorMatch = t.vendorName?.toLowerCase().includes(q);
        const amountMatch = String(t.debit || "").includes(q) || String(t.credit || "").includes(q);
        if (!detailsMatch && !refMatch && !vendorMatch && !amountMatch) return false;
      }

      // 2. Date Filtering
      const parts = t.valueDate.split("/"); // DD/MM/YYYY
      if (parts.length === 3) {
        const yyyy = parts[2];
        const mm = parts[1];
        const dd = parts[0];
        const isoDate = `${yyyy}-${mm}-${dd}`;
        const monthKey = `${yyyy}-${mm}`;

        if (filterType === "MONTH" && selectedMonth !== "ALL") {
          if (monthKey !== selectedMonth) return false;
        } else if (filterType === "YEAR" && selectedYear !== "ALL") {
          if (yyyy !== selectedYear) return false;
        } else if (filterType === "DATE" && selectedDate) {
          if (isoDate !== selectedDate) return false;
        } else if (filterType === "CUSTOM") {
          if (fromDate && isoDate < fromDate) return false;
          if (toDate && isoDate > toDate) return false;
        }
      }

      return true;
    });
  }, [transactions, searchQuery, filterType, selectedMonth, selectedYear, selectedDate, fromDate, toDate]);

  // Unique values and counts for each column
  const getColumnUniqueValues = (colId: string) => {
    const counts: Record<string, number> = {};
    baseTransactions.forEach((tx) => {
      const val = getCellValue(tx, colId);
      counts[val] = (counts[val] || 0) + 1;
    });

    const uniqueList = Object.keys(counts).sort((a, b) => {
      if (colId === "valueDate" || colId === "postDate") {
        const pA = a.split("/").map(Number);
        const pB = b.split("/").map(Number);
        if (pA.length === 3 && pB.length === 3) {
          const timeA = new Date(pA[2], pA[1] - 1, pA[0]).getTime();
          const timeB = new Date(pB[2], pB[1] - 1, pB[0]).getTime();
          return timeA - timeB;
        }
      }
      if (colId === "debit" || colId === "credit" || colId === "balance") {
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
      // All selected = filter is cleared for this column
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
      setSortConfig(null); // Toggle off
    } else {
      setSortConfig({ colId, direction });
    }
    setActiveColMenu(null);
  };

  // Sticky horizontal offset calculator for frozen columns
  const getStickyLeftOffset = (colIdx: number): number => {
    if (colIdx >= frozenColCount) return 0;
    let offset = 0;
    for (let i = 0; i < colIdx; i++) {
      const col = STATEMENT_COLUMNS[i];
      offset += columnWidths[col.id] || col.defaultWidth;
    }
    return offset;
  };

  const isColFrozen = (colIdx: number) => colIdx < frozenColCount;
  const isLastFrozenCol = (colIdx: number) => colIdx === frozenColCount - 1 && frozenColCount > 0;

  // Filtered transactions (combining top date filters + column filters)
  const columnFilteredTransactions = useMemo(() => {
    const activeColFilterKeys = Object.keys(columnFilters);
    if (activeColFilterKeys.length === 0) return baseTransactions;

    return baseTransactions.filter((tx) => {
      for (const colId of activeColFilterKeys) {
        const allowed = columnFilters[colId];
        if (allowed && allowed.length >= 0) {
          const cellVal = getCellValue(tx, colId);
          if (!allowed.includes(cellVal)) {
            return false;
          }
        }
      }
      return true;
    });
  }, [baseTransactions, columnFilters]);

  // Final sorted transactions
  const filteredTransactions = useMemo(() => {
    if (!sortConfig) return columnFilteredTransactions;
    const { colId, direction } = sortConfig;
    const factor = direction === "asc" ? 1 : -1;

    return [...columnFilteredTransactions].sort((a, b) => {
      const valA = getCellValue(a, colId);
      const valB = getCellValue(b, colId);

      if (colId === "valueDate" || colId === "postDate") {
        const pA = valA.split("/").map(Number);
        const pB = valB.split("/").map(Number);
        if (pA.length === 3 && pB.length === 3) {
          const timeA = new Date(pA[2], pA[1] - 1, pA[0]).getTime();
          const timeB = new Date(pB[2], pB[1] - 1, pB[0]).getTime();
          return (timeA - timeB) * factor;
        }
      }
      if (colId === "debit" || colId === "credit" || colId === "balance") {
        const numA = parseFloat(valA) || 0;
        const numB = parseFloat(valB) || 0;
        return (numA - numB) * factor;
      }
      return valA.localeCompare(valB) * factor;
    });
  }, [columnFilteredTransactions, sortConfig]);

  // Filtered summary
  const filteredSummary = useMemo(() => {
    const isFiltered =
      filterType !== "ALL" ||
      searchQuery.trim() !== "" ||
      selectedMonth !== "ALL" ||
      selectedYear !== "ALL" ||
      selectedDate !== "" ||
      fromDate !== "" ||
      toDate !== "" ||
      Object.keys(columnFilters).length > 0;

    if (!isFiltered) {
      return summary;
    }
    const drSum = filteredTransactions.reduce((acc, t) => acc + (t.debit || 0), 0);
    const crSum = filteredTransactions.reduce((acc, t) => acc + (t.credit || 0), 0);
    return {
      broughtForward: summary.broughtForward,
      drCount: filteredTransactions.filter((t) => t.debit && t.debit > 0).length,
      crCount: filteredTransactions.filter((t) => t.credit && t.credit > 0).length,
      totalDebits: Math.round(drSum * 100) / 100,
      totalCredits: Math.round(crSum * 100) / 100,
      closingBalance: Math.round((summary.broughtForward - drSum + crSum) * 100) / 100,
    };
  }, [filteredTransactions, summary, filterType, searchQuery, selectedMonth, selectedYear, selectedDate, fromDate, toDate, columnFilters]);

  // Total table width calculated dynamically from all column widths
  const totalTableWidth = useMemo(() => {
    return STATEMENT_COLUMNS.reduce((sum, col) => sum + (columnWidths[col.id] || col.defaultWidth), 0);
  }, [columnWidths]);

  // Dynamic Statement Period Label for the Summary Box Header
  const statementPeriodLabel = useMemo(() => {
    if (filterType === "MONTH" && selectedMonth !== "ALL") {
      const match = availableMonths.find((m) => m.value === selectedMonth);
      return match ? match.label.toUpperCase() : selectedMonth;
    }
    if (filterType === "YEAR" && selectedYear !== "ALL") {
      return `YEAR ${selectedYear}`;
    }
    if (filterType === "DATE" && selectedDate) {
      const parts = selectedDate.split("-");
      return `FOR DATE : ${parts.reverse().join("/")}`;
    }
    if (filterType === "CUSTOM") {
      const f = fromDate ? fromDate.split("-").reverse().join("/") : "START";
      const t = toDate ? toDate.split("-").reverse().join("/") : "END";
      return `${f} TO ${t}`;
    }
    return `${config.asOfDate.split("-").reverse().join("/")} TO ${new Date().toISOString().split("T")[0].split("-").reverse().join("/")}`;
  }, [filterType, selectedMonth, selectedYear, selectedDate, fromDate, toDate, availableMonths, config.asOfDate]);

  const activeFiltersCount = Object.keys(columnFilters).length;

  if (!isOpen || !mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 p-1 sm:p-2.5 backdrop-blur-sm overflow-hidden">
      <div className="bg-white border border-gray-300 w-full max-w-[1380px] h-[97vh] max-h-[97vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 font-sans my-auto overflow-hidden">
        {/* ── TOP ICICI BRANDED BANNER & HEADER ── */}
        <div className="bg-[#283593] text-white py-1.5 px-3 sm:px-4 flex items-center justify-between gap-3 shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="bg-white p-1 rounded-sm text-[#283593] shadow-xs">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-display font-bold tracking-wide uppercase leading-tight">
                {config.bankName}
              </h2>
              <p className="text-[11px] text-indigo-200 font-mono">
                A/C NO: <span className="font-bold text-white tracking-wider">{config.accountNo}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Edit Opening Balance Button (Accountant / Super Admin) */}
            {(isAccountant || isAdmin) && (
              <button
                type="button"
                onClick={() => setIsEditingBalance(true)}
                className="bg-white/10 hover:bg-white/20 text-white px-2 py-1 text-[11px] font-bold uppercase tracking-wider border border-white/30 transition-all flex items-center gap-1 cursor-pointer"
                title="Define initial Brought Forward balance"
              >
                <Edit3 className="w-3 h-3 text-amber-300" />
                <span>Opening Balance</span>
              </button>
            )}

            {/* Refresh */}
            <button
              type="button"
              onClick={() => fetchStatement(false)}
              disabled={refreshing}
              className="bg-white/10 hover:bg-white/20 text-white p-1.5 border border-white/30 transition-all cursor-pointer"
              title="Refresh Statement"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
            </button>

            {/* Print Statement */}
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-white/10 hover:bg-white/20 text-white p-1.5 border border-white/30 transition-all cursor-pointer"
              title="Print Bank Statement"
            >
              <Printer className="w-3 h-3" />
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="bg-white/20 hover:bg-red-600 text-white p-1.5 rounded-xs transition-colors cursor-pointer ml-0.5"
              title="Close Bank Statement"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── ACCOUNT SUMMARY STRIP ── */}
        <div className="bg-indigo-50/70 border-b border-indigo-100 py-1 px-3 sm:px-4 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <div>
              <span className="text-gray-500 font-medium text-[11px]">Brought Forward: </span>
              <span className="font-bold text-gray-900 font-mono text-xs">
                {formatCurrency(summary.broughtForward)}
              </span>
            </div>
            <div className="h-3.5 w-px bg-gray-300 hidden sm:block" />
            <div>
              <span className="text-gray-500 font-medium text-[11px]">Total Debits: </span>
              <span className="font-bold text-red-700 font-mono text-xs">
                -{formatCurrency(filteredSummary.totalDebits)}
              </span>
            </div>
            <div className="h-3.5 w-px bg-gray-300 hidden sm:block" />
            <div>
              <span className="text-gray-500 font-medium text-[11px]">Current Balance: </span>
              <span className="font-bold text-emerald-700 font-mono text-xs bg-emerald-50 px-1.5 py-0.5 border border-emerald-200">
                {formatCurrency(filteredSummary.closingBalance)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10.5px] text-gray-500">
            <span>Source:</span>
            <span className="font-semibold text-gray-700">
              Super Admin Disbursements & Client Payment Receipts
            </span>
          </div>
        </div>

        {/* ── COMPREHENSIVE FILTER STRIP ── */}
        <div className="bg-white border-b border-gray-200 py-1.5 px-3 sm:px-4 flex flex-wrap items-center justify-between gap-2 shrink-0">
          {/* Quick Search */}
          <div className="relative w-64 sm:w-72">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search narration, UTR, vendor, or amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 text-xs bg-gray-50 border border-gray-300 focus:bg-white focus:outline-none focus:border-[#283593] transition-colors h-7"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filter Modes */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <div className="flex border border-gray-300 overflow-hidden">
              {(["ALL", "MONTH", "YEAR", "DATE", "CUSTOM"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setFilterType(type);
                    if (type === "ALL") {
                      setSelectedMonth("ALL");
                      setSelectedYear("ALL");
                      setSelectedDate("");
                      setFromDate("");
                      setToDate("");
                    }
                  }}
                  className={`px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    filterType === type ? "bg-[#283593] text-white" : "bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {type === "CUSTOM" ? "Custom Range" : type}
                </button>
              ))}
            </div>

            {/* Dynamic Controls based on selected mode */}
            {filterType === "MONTH" && (
              <div className="flex items-center gap-1.5 animate-in fade-in">
                <Calendar className="w-3.5 h-3.5 text-gray-500" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-800 bg-white focus:outline-none focus:border-[#283593] cursor-pointer"
                >
                  <option value="ALL">All Months ({availableMonths.length})</option>
                  {availableMonths.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {filterType === "YEAR" && (
              <div className="flex items-center gap-1.5 animate-in fade-in">
                <Calendar className="w-3.5 h-3.5 text-gray-500" />
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-800 bg-white focus:outline-none focus:border-[#283593] cursor-pointer"
                >
                  <option value="ALL">All Years</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      Year {yr}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {filterType === "DATE" && (
              <div className="flex items-center gap-1.5 animate-in fade-in">
                <Calendar className="w-3.5 h-3.5 text-gray-500" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border border-gray-300 px-2.5 py-1 text-xs bg-white focus:outline-none focus:border-[#283593]"
                />
              </div>
            )}

            {filterType === "CUSTOM" && (
              <div className="flex items-center gap-1.5 animate-in fade-in">
                <span className="text-[11px] text-gray-500 font-bold">From:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="border border-gray-300 px-2 py-1 text-xs bg-white focus:outline-none focus:border-[#283593]"
                />
                <span className="text-[11px] text-gray-500 font-bold">To:</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="border border-gray-300 px-2 py-1 text-xs bg-white focus:outline-none focus:border-[#283593]"
                />
              </div>
            )}

            {/* Clear Filters button if filtered */}
            {(filterType !== "ALL" ||
              searchQuery ||
              selectedMonth !== "ALL" ||
              selectedYear !== "ALL" ||
              selectedDate ||
              fromDate ||
              toDate ||
              activeFiltersCount > 0) && (
              <button
                type="button"
                onClick={() => {
                  setFilterType("ALL");
                  setSearchQuery("");
                  setSelectedMonth("ALL");
                  setSelectedYear("ALL");
                  setSelectedDate("");
                  setFromDate("");
                  setToDate("");
                  setColumnFilters({});
                  setSortConfig(null);
                }}
                className="text-[11px] text-red-600 hover:text-red-800 underline font-bold px-1 cursor-pointer ml-1"
                title="Reset all filters"
              >
                Reset All
              </button>
            )}
          </div>
        </div>

        {/* ── SPREADSHEET TOOLBAR: FREEZE CONTROLS, ACTIVE FILTERS & COLUMN RESIZING ── */}
        <div className="bg-gray-100 border-b border-gray-200 px-3 sm:px-4 py-1 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 select-none">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Freeze Controls */}
            <div className="flex items-center gap-1 bg-white border border-gray-300 px-1.5 py-0.5 shadow-2xs">
              <Lock className="w-3 h-3 text-indigo-800" />
              <span className="text-[10.5px] font-bold text-gray-700">Freeze:</span>
              <select
                value={frozenColCount}
                onChange={(e) => setFrozenColCount(Number(e.target.value))}
                className="text-[10.5px] font-semibold text-indigo-950 bg-transparent outline-none cursor-pointer"
              >
                <option value={0}>No Frozen Columns</option>
                <option value={1}>1 Col (Value Date)</option>
                <option value={2}>2 Cols (Value + Post Date)</option>
                <option value={3}>3 Cols (+ Narration)</option>
                <option value={4}>4 Cols (+ Ref No)</option>
              </select>
            </div>

            {/* Quick Unfreeze / Freeze Toggle */}
            <button
              type="button"
              onClick={() => setFrozenColCount((prev) => (prev > 0 ? 0 : 1))}
              className="text-[10.5px] font-medium text-gray-700 hover:text-indigo-900 bg-white border border-gray-300 px-1.5 py-0.5 shadow-2xs flex items-center gap-1 cursor-pointer"
              title="Toggle column freezing"
            >
              {frozenColCount > 0 ? (
                <>
                  <Unlock className="w-3 h-3 text-amber-600" />
                  <span>Unfreeze Columns</span>
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3 text-indigo-700" />
                  <span>Freeze Value Date</span>
                </>
              )}
            </button>

            {/* Reset Column Widths */}
            <button
              type="button"
              onClick={handleResetColumnWidths}
              className="text-[10.5px] font-medium text-gray-700 hover:text-indigo-900 bg-white border border-gray-300 px-1.5 py-0.5 shadow-2xs flex items-center gap-1 cursor-pointer"
              title="Reset column widths to default"
            >
              <RotateCcw className="w-3 h-3 text-gray-500" />
              <span>Reset Widths</span>
            </button>
          </div>

          {/* Active Column Filters Indicator */}
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 px-1.5 py-0.5 text-[10.5px] text-amber-900 font-medium">
                <Filter className="w-3 h-3 text-amber-700" />
                <span>
                  <strong>{activeFiltersCount}</strong> column filter{activeFiltersCount > 1 ? "s" : ""} active
                </span>
                <button
                  type="button"
                  onClick={handleClearAllColumnFilters}
                  className="text-red-700 hover:underline font-bold ml-1 cursor-pointer"
                >
                  Clear
                </button>
              </div>
            )}

            {sortConfig && (
              <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 text-[10.5px] text-indigo-950 font-medium">
                <span>Sorted by <strong>{STATEMENT_COLUMNS.find((c) => c.id === sortConfig.colId)?.label}</strong></span>
                {sortConfig.direction === "asc" ? (
                  <ArrowUp className="w-3 h-3 text-indigo-700" />
                ) : (
                  <ArrowDown className="w-3 h-3 text-indigo-700" />
                )}
                <button
                  type="button"
                  onClick={() => setSortConfig(null)}
                  className="text-gray-500 hover:text-red-700 cursor-pointer ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <div className="text-[10.5px] text-gray-500 font-mono">
              Showing <strong>{filteredTransactions.length}</strong> of {transactions.length} rows
            </div>
          </div>
        </div>

        {/* ── SCROLLABLE STATEMENT TABLE WITH PERMANENTLY FROZEN HEADERS & COLUMNS ── */}
        <div className="flex-1 overflow-auto bg-white relative border-b border-gray-300 min-h-0">
          {loading ? (
            <div className="py-20 text-center text-gray-500 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#283593] mb-2" />
              <span>Generating ICICI Bank Statement...</span>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-20 text-center text-gray-500 text-xs bg-white p-8">
              <Landmark className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <h4 className="font-bold text-gray-800 text-sm">No Transactions Match Current Filters</h4>
              <p className="text-gray-500 mt-1 max-w-md mx-auto">
                Try clearing column filters, expanding date ranges, or removing search queries.
              </p>
              {(activeFiltersCount > 0 || searchQuery || filterType !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterType("ALL");
                    setSearchQuery("");
                    setColumnFilters({});
                    setSortConfig(null);
                  }}
                  className="mt-3 px-3 py-1.5 bg-[#283593] text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-xs"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          ) : (
            <table
              className="w-full text-left border-collapse text-xs table-fixed"
              style={{ minWidth: `${totalTableWidth}px` }}
            >
              {/* Column Width Definitions */}
              <colgroup>
                {STATEMENT_COLUMNS.map((col) => {
                  const w = columnWidths[col.id] || col.defaultWidth;
                  return (
                    <col
                      key={col.id}
                      style={{ width: `${w}px`, minWidth: `${w}px`, maxWidth: `${w}px` }}
                    />
                  );
                })}
              </colgroup>

              {/* ── PURPLE / INDIGO BANK HEADER (PERMANENTLY FROZEN AT TOP) ── */}
              <thead className="sticky top-0 z-30 bg-[#283593] text-white font-mono text-[11px] uppercase tracking-wider shadow-xs">
                <tr>
                  {STATEMENT_COLUMNS.map((col, colIdx) => {
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
                        className={`py-3 px-2 select-none relative group border-r border-indigo-700 ${
                          col.align === "right"
                            ? "text-right"
                            : col.align === "center"
                            ? "text-center"
                            : "text-left"
                        } ${
                          frozen ? "sticky top-0 z-40 bg-[#283593]" : "sticky top-0 z-30 bg-[#283593]"
                        } ${lastFrozen ? "border-r-2 border-indigo-400 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.35)]" : ""}`}
                      >
                        <div className={`flex items-center gap-1.5 w-full min-w-0 ${
                          col.align === "right"
                            ? "justify-end"
                            : col.align === "center"
                            ? "justify-center"
                            : "justify-between"
                        }`}>
                          {/* Column Title */}
                          <span
                            onClick={() => handleSortColumn(col.id, isSorted && sortConfig.direction === "asc" ? "desc" : "asc")}
                            className="font-bold tracking-wider cursor-pointer hover:text-indigo-200 transition-colors whitespace-normal leading-tight min-w-0 flex-1 break-words"
                            title={`Click to sort by ${col.label}`}
                          >
                            {col.label}
                          </span>

                          {/* Sort Indicator */}
                          {isSorted && (
                            <span className="text-amber-300 font-bold shrink-0">
                              {sortConfig.direction === "asc" ? "▲" : "▼"}
                            </span>
                          )}

                          {/* Google Sheets Filter Icon Button */}
                          <button
                            type="button"
                            onClick={(e) => handleOpenColumnFilter(col.id, e)}
                            className={`p-1 rounded-xs transition-colors cursor-pointer shrink-0 ${
                              isFiltered
                                ? "bg-amber-400 text-indigo-950 font-bold shadow-xs"
                                : "text-indigo-300 hover:text-white hover:bg-white/10"
                            }`}
                            title={`Filter by ${col.label}`}
                          >
                            <Filter className="w-3 h-3" />
                          </button>
                        </div>

                        {/* ── GOOGLE SHEETS STYLE COLUMN FILTER DROPDOWN POPOVER ── */}
                        {activeColMenu === col.id && (
                          <div
                            ref={colMenuRef}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              left: colIdx > 4 ? "auto" : "0px",
                              right: colIdx > 4 ? "0px" : "auto",
                            }}
                            className="absolute top-full mt-1 w-72 bg-white text-gray-800 shadow-2xl border border-gray-300 rounded-sm z-50 font-sans normal-case tracking-normal overflow-hidden animate-in fade-in duration-100"
                          >
                            {/* Popover Header */}
                            <div className="bg-[#283593] text-white p-2 px-3 flex items-center justify-between text-xs font-bold">
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
                                className="w-full px-2.5 py-1 text-left flex items-center gap-2 hover:bg-indigo-50 text-gray-700 hover:text-indigo-900 rounded-xs font-medium cursor-pointer"
                              >
                                <ArrowUp className="w-3.5 h-3.5 text-indigo-700" />
                                <span>
                                  Sort Ascending ({col.mono ? "Oldest → Newest" : "A → Z"})
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSortColumn(col.id, "desc")}
                                className="w-full px-2.5 py-1 text-left flex items-center gap-2 hover:bg-indigo-50 text-gray-700 hover:text-indigo-900 rounded-xs font-medium cursor-pointer"
                              >
                                <ArrowDown className="w-3.5 h-3.5 text-indigo-700" />
                                <span>
                                  Sort Descending ({col.mono ? "Newest → Oldest" : "Z → A"})
                                </span>
                              </button>

                              {/* Column Freeze Toggle */}
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
                                className="w-full px-2.5 py-1 text-left flex items-center gap-2 hover:bg-indigo-50 text-gray-700 hover:text-indigo-900 rounded-xs font-medium cursor-pointer"
                              >
                                {frozen ? (
                                  <>
                                    <Unlock className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Unfreeze this column</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3.5 h-3.5 text-indigo-700" />
                                    <span>Freeze up to {col.label}</span>
                                  </>
                                )}
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
                                  className="w-full pl-8 pr-2.5 py-1 text-xs bg-gray-50 border border-gray-300 focus:bg-white focus:border-[#283593] focus:outline-none"
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
                                    <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900 px-1 pt-0.5">
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

                                    {/* Scrollable List of Checkboxes with Frequency Counts */}
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
                                              className="flex items-center gap-2 px-2 py-1 hover:bg-indigo-50 rounded-xs cursor-pointer select-none text-xs text-gray-800"
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => handleToggleFilterValue(val)}
                                                className="rounded-xs text-[#283593] focus:ring-0 cursor-pointer h-3.5 w-3.5"
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

                                    {/* Footer OK / Cancel */}
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
                                        className="px-4 py-1 bg-[#283593] hover:bg-indigo-900 text-white font-bold text-xs cursor-pointer shadow-2xs"
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

                        {/* ── EXCEL STYLE COLUMN RESIZER HANDLE (DRAG DIVIDER) ── */}
                        <div
                          onMouseDown={(e) => handleStartResize(col.id, e)}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize select-none flex items-center justify-center hover:bg-white/20 active:bg-amber-400 transition-colors z-50 group"
                          title="Click & drag to resize column width"
                        >
                          <div className="w-[1.5px] h-3/4 bg-indigo-400/50 group-hover:bg-amber-300 group-active:bg-amber-400" />
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* ── STATEMENT TABLE BODY ── */}
              <tbody className="divide-y divide-gray-200">
                {/* Opening Balance Row */}
                <tr className="bg-amber-50/60 font-mono text-gray-800 border-b border-amber-200 hover:bg-amber-50">
                  {STATEMENT_COLUMNS.map((col, colIdx) => {
                    const frozen = isColFrozen(colIdx);
                    const lastFrozen = isLastFrozenCol(colIdx);
                    const leftOffset = getStickyLeftOffset(colIdx);
                    const colWidth = columnWidths[col.id] || col.defaultWidth;

                    let content: React.ReactNode = "-";
                    let alignClass = "text-center";
                    let textClass = "text-gray-400";
                    let rawTooltip = "-";

                    if (col.id === "valueDate" || col.id === "postDate") {
                      const d = config.asOfDate.split("-").reverse().join("/");
                      content = d;
                      rawTooltip = d;
                      textClass = "text-gray-600 text-[11px]";
                    } else if (col.id === "details") {
                      content = "OPENING BALANCE BROUGHT FORWARD";
                      rawTooltip = "OPENING BALANCE BROUGHT FORWARD";
                      alignClass = "text-left";
                      textClass = "font-bold text-amber-900 tracking-wide text-[11px]";
                    } else if (col.id === "credit") {
                      const formatted = formatCurrency(summary.broughtForward);
                      content = formatted;
                      rawTooltip = formatted;
                      alignClass = "text-right";
                      textClass = "text-emerald-700 font-bold";
                    } else if (col.id === "balance") {
                      const formatted = formatCurrency(summary.broughtForward);
                      content = formatted;
                      rawTooltip = formatted;
                      alignClass = "text-right";
                      textClass = "font-bold text-gray-900 bg-amber-100/50";
                    }

                    return (
                      <td
                        key={col.id}
                        style={{
                          width: `${colWidth}px`,
                          minWidth: `${colWidth}px`,
                          maxWidth: `${colWidth}px`,
                          left: frozen ? `${leftOffset}px` : undefined,
                        }}
                        className={`py-2 px-2.5 overflow-hidden border-r border-gray-100 align-top ${alignClass} ${textClass} ${
                          frozen ? "sticky z-20 bg-amber-50" : ""
                        } ${lastFrozen ? "border-r-2 border-indigo-300 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.15)]" : ""}`}
                      >
                        <div className="w-full block whitespace-normal break-words [overflow-wrap:anywhere] leading-snug" title={rawTooltip}>
                          {content}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Transaction Rows */}
                {filteredTransactions.map((tx, idx) => (
                  <tr
                    key={tx.id || idx}
                    className={`hover:bg-indigo-50/40 transition-colors ${
                      idx % 2 === 0 ? "bg-white" : "bg-[#fafafa]"
                    }`}
                  >
                    {STATEMENT_COLUMNS.map((col, colIdx) => {
                      const frozen = isColFrozen(colIdx);
                      const lastFrozen = isLastFrozenCol(colIdx);
                      const leftOffset = getStickyLeftOffset(colIdx);
                      const rowBg = idx % 2 === 0 ? "bg-white" : "bg-[#fafafa]";
                      const colWidth = columnWidths[col.id] || col.defaultWidth;

                      let cellContent: React.ReactNode = null;
                      let alignClass = "text-left";

                      switch (col.id) {
                        case "valueDate":
                          alignClass = "text-center";
                          cellContent = (
                            <div
                              className="font-mono text-gray-600 text-[11px] whitespace-normal break-words leading-tight"
                              title={tx.valueDate}
                            >
                              {tx.valueDate}
                            </div>
                          );
                          break;
                        case "postDate":
                          alignClass = "text-center";
                          cellContent = (
                            <div
                              className="font-mono text-gray-600 text-[11px] whitespace-normal break-words leading-tight"
                              title={tx.postDate}
                            >
                              {tx.postDate}
                            </div>
                          );
                          break;
                        case "details":
                          alignClass = "text-left";
                          cellContent = (
                            <div className="w-full min-w-0" title={tx.details}>
                              <div className="font-mono text-[11.5px] font-semibold text-gray-900 break-words [overflow-wrap:anywhere] whitespace-normal leading-snug">
                                {tx.details}
                              </div>
                              {(tx.category || tx.locationName) && (
                                <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-gray-500">
                                  {tx.category && (
                                    <span className="font-medium text-[#283593]">{tx.category}</span>
                                  )}
                                  {tx.category && tx.locationName && <span>•</span>}
                                  {tx.locationName && (
                                    <span>{tx.locationName}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                          break;
                        case "refNo":
                          alignClass = "text-center";
                          cellContent = (
                            <div
                              className="font-mono text-gray-700 text-[11px] break-all [overflow-wrap:anywhere] whitespace-normal w-full block select-all leading-tight"
                              title={tx.refNo || "-"}
                            >
                              {tx.refNo || "-"}
                            </div>
                          );
                          break;
                        case "debit":
                          alignClass = "text-right";
                          const debitStr = tx.debit ? Number(tx.debit).toFixed(2) : "-";
                          cellContent = (
                            <div
                              className="font-mono font-bold text-red-700 whitespace-normal break-all leading-tight"
                              title={tx.debit ? `₹${Number(tx.debit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}
                            >
                              {debitStr}
                            </div>
                          );
                          break;
                        case "credit":
                          alignClass = "text-right";
                          const creditStr = tx.credit ? Number(tx.credit).toFixed(2) : "-";
                          cellContent = (
                            <div
                              className="font-mono font-bold text-emerald-700 whitespace-normal break-all leading-tight"
                              title={tx.credit ? `₹${Number(tx.credit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}
                            >
                              {creditStr}
                            </div>
                          );
                          break;
                        case "balance":
                          alignClass = "text-right bg-gray-50/60";
                          const balanceStr = Number(tx.balance).toFixed(2);
                          cellContent = (
                            <div
                              className="font-mono font-bold text-gray-900 whitespace-normal break-all leading-tight"
                              title={`₹${Number(tx.balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                            >
                              {balanceStr}
                            </div>
                          );
                          break;
                      }

                      return (
                        <td
                          key={col.id}
                          style={{
                            width: `${colWidth}px`,
                            minWidth: `${colWidth}px`,
                            maxWidth: `${colWidth}px`,
                            left: frozen ? `${leftOffset}px` : undefined,
                          }}
                          className={`py-2 px-2.5 border-r border-gray-100 overflow-hidden align-top ${alignClass} ${
                            frozen ? `sticky z-20 ${rowBg}` : ""
                          } ${lastFrozen ? "border-r-2 border-indigo-300 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]" : ""}`}
                        >
                          {cellContent}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── STATEMENT SUMMARY TABLE & FOOTER ── */}
        <div className="p-2 px-3 sm:px-4 bg-gray-50/70 border-t border-gray-200 shrink-0 space-y-1.5">
          <div className="border border-indigo-900 bg-white overflow-hidden shadow-xs">
            <div className="bg-[#283593] text-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider flex items-center justify-between">
              <span>Statement Summary : {statementPeriodLabel}</span>
              <span className="text-indigo-200 text-[10.5px]">Account No: {config.accountNo}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200 text-[10.5px]">
                    <th className="py-1 px-2 border-r border-gray-200">Brought Forward (₹)</th>
                    <th className="py-1 px-2 border-r border-gray-200">Dr Count</th>
                    <th className="py-1 px-2 border-r border-gray-200">Cr Count</th>
                    <th className="py-1 px-2 border-r border-gray-200">Total Debits (₹)</th>
                    <th className="py-1 px-2 border-r border-gray-200">Total Credits (₹)</th>
                    <th className="py-1 px-2 font-black text-[#283593]">Closing Balance (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="font-mono text-[11px] font-bold text-gray-900">
                    <td className="py-1 px-2 border-r border-gray-200">
                      {formatCurrency(filteredSummary.broughtForward)} CR
                    </td>
                    <td className="py-1 px-2 border-r border-gray-200 text-red-700">
                      {filteredSummary.drCount}
                    </td>
                    <td className="py-1 px-2 border-r border-gray-200 text-emerald-700">
                      {filteredSummary.crCount}
                    </td>
                    <td className="py-1 px-2 border-r border-gray-200 text-red-700 font-black">
                      {Number(filteredSummary.totalDebits).toFixed(2)}
                    </td>
                    <td className="py-1 px-2 border-r border-gray-200 text-emerald-700 font-black">
                      {Number(filteredSummary.totalCredits).toFixed(2)}
                    </td>
                    <td className="py-1 px-2 bg-indigo-50 font-black text-indigo-950 text-xs">
                      {formatCurrency(filteredSummary.closingBalance)} CR
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-100 border border-gray-300 cursor-pointer bg-white shadow-2xs rounded-xs"
            >
              Close Statement
            </button>
          </div>
        </div>
      </div>

      {/* ── NESTED MODAL: EDIT OPENING / BROUGHT FORWARD BALANCE ── */}
      {isEditingBalance && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="bg-white border border-gray-300 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-[#283593] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-300" />
                <h3 className="text-sm font-bold uppercase tracking-wide">
                  Set Initial Brought Forward Balance
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingBalance(false)}
                className="p-1 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOpeningBalance} className="p-5 space-y-4 text-xs">
              <p className="text-[11.5px] text-gray-600 leading-relaxed">
                Enter the initial available balance of <strong>{config.bankName}</strong> A/C{" "}
                <strong>{config.accountNo}</strong>. All approved expenses will automatically deduct from this base balance.
              </p>

              <div>
                <label className="block font-bold text-gray-800 uppercase tracking-wider mb-1">
                  Available Opening Balance (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newOpeningBalance}
                  onChange={(e) => setNewOpeningBalance(e.target.value)}
                  placeholder="e.g. 100000"
                  className="w-full border border-gray-300 p-2 text-sm font-mono font-bold text-gray-900 focus:outline-none focus:border-[#283593]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-800 uppercase tracking-wider mb-1">
                  As of Date *
                </label>
                <input
                  type="date"
                  required
                  value={newAsOfDate}
                  onChange={(e) => setNewAsOfDate(e.target.value)}
                  className="w-full border border-gray-300 p-2 text-xs font-mono focus:outline-none focus:border-[#283593]"
                />
              </div>

              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingBalance(false)}
                  className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-600 hover:bg-gray-100 border border-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBalance}
                  className="bg-[#283593] hover:bg-indigo-900 text-white px-5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{savingBalance ? "Saving..." : "Save & Recalculate"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
