'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
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
  CreditCard,
  Plus,
  Trash2,
  Receipt,
  Clock,
  Landmark,
  ArrowUpDown,
  ChevronDown,
  ExternalLink,
  SlidersHorizontal,
  FileText,
  FolderArchive,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  FilterX,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { FadeUp } from '@/components/ui/fade-up';

export interface SdrPaymentPart {
  id: string;
  receiveAmount: string;
  payReceiveDate: string;
  paymentMode: string;
  utrNumber: string;
  utrDate: string;
  bankName?: string;
  utrFileUrl?: string | null;
  utrFileName?: string | null;
  remarks?: string;
  uploading?: boolean;
}

export interface ClientSdrItem {
  id: number;
  srNo: number;
  companyName: string;
  clientId: string | null;
  cabinName: string | null;
  noOfSeats: number | null;
  clientStatus: string;
  locationId: number | null;
  locationName: string;
  sdrAmount: number;
  sdrReceivedAmount: number;
  balanceAmount: number;
  sdrPaymentStatus: 'PENDING' | 'PARTIAL' | 'COMPLETED';
  sdrRecdDate: string | null;
  sdrPaymentMode: string | null;
  sdrUtrNumber: string | null;
  sdrUtrDate: string | null;
  sdrBankName: string | null;
  sdrRemarks: string | null;
  sdrPdfUrl: string | null;
  sdrPdfName: string | null;
  agreementPdfUrl: string | null;
  agreementPdfName: string | null;
  attachedDocUrl: string | null;
  attachedDocName: string | null;
  payments: SdrPaymentPart[];
  contactPersons: any[];
  createdAt: string;
  updatedAt: string;
}

export interface SdrDraftState {
  parts: SdrPaymentPart[];
  status: 'idle' | 'saving' | 'saved' | 'error';
  saved: boolean;
  errorMessage?: string;
}

interface SdrReceiveManagementProps {
  isSuperAdmin?: boolean;
  isAccountant?: boolean;
  userRoleView?: 'ACCOUNTANT' | 'CM';
  canAccessCM?: boolean;
  canAccessAccountant?: boolean;
  onNavigateToInvoicePayments?: () => void;
  onNavigateToActiveInvoices?: () => void;
  onBack?: () => void;
  currentUserLocationId?: number | null;
  currentUserLocationName?: string | null;
}

const PAYMENT_MODES = ['Bank Transfer', 'NEFT', 'RTGS', 'IMPS', 'UPI', 'Cheque', 'Cash'];

export const DEFAULT_SDR_COLUMN_WIDTHS: Record<string, number> = {
  srNo: 50,
  companyName: 220,
  locationName: 120,
  sdrAmount: 120,
  sdrReceivedAmount: 120,
  balanceAmount: 120,
  sdrPaymentStatus: 130,
  docProof: 95,
  payReceiveDate: 165,
  receiveAmount: 125,
  paymentMode: 130,
  utrNumber: 155,
  receiptProof: 110,
  remarks: 180,
};

export function SdrReceiveManagement({
  isSuperAdmin = true,
  isAccountant = true,
  userRoleView = 'ACCOUNTANT',
  canAccessCM = true,
  canAccessAccountant = true,
  onNavigateToInvoicePayments,
  onNavigateToActiveInvoices,
  onBack,
  currentUserLocationId,
  currentUserLocationName,
}: SdrReceiveManagementProps) {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientSdrItem[]>([]);
  const [locations, setLocations] = useState<{ id: number; name: string }[]>([]);
  const [summary, setSummary] = useState({
    totalClientsCount: 0,
    totalSdrTargetSum: 0,
    totalSdrReceivedSum: 0,
    totalSdrPendingSum: 0,
    completedCount: 0,
    partialCount: 0,
    pendingCount: 0,
  });

  // Resizable Column Widths state with localStorage persistence
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sspacia_sdr_col_widths');
        if (saved) {
          const parsed = JSON.parse(saved);
          return { ...DEFAULT_SDR_COLUMN_WIDTHS, ...parsed };
        }
      } catch {}
    }
    return DEFAULT_SDR_COLUMN_WIDTHS;
  });

  const resizingRef = useRef<{ colKey: string; startX: number; startWidth: number } | null>(null);

  const handleResizeStart = (colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const activeColKey = colKey;
    const startX = e.clientX;
    const startWidth = columnWidths[colKey] || DEFAULT_SDR_COLUMN_WIDTHS[colKey] || 100;
    resizingRef.current = { colKey: activeColKey, startX, startWidth };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    let currentWidth = startWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      currentWidth = Math.max(45, startWidth + delta);
      setColumnWidths((prev) => ({
        ...prev,
        [activeColKey]: currentWidth,
      }));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      resizingRef.current = null;

      setColumnWidths((latest) => {
        try {
          localStorage.setItem('sspacia_sdr_col_widths', JSON.stringify(latest));
        } catch {}
        return latest;
      });
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleResetColWidth = (colKey: string) => {
    const defaultWidth = DEFAULT_SDR_COLUMN_WIDTHS[colKey] || 120;
    setColumnWidths((prev) => {
      const updated = { ...prev, [colKey]: defaultWidth };
      try {
        localStorage.setItem('sspacia_sdr_col_widths', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleResetAllWidths = () => {
    setColumnWidths(DEFAULT_SDR_COLUMN_WIDTHS);
    try {
      localStorage.removeItem('sspacia_sdr_col_widths');
    } catch {}
    toast.success('Column widths reset to default');
  };

  const totalTableWidth = useMemo(() => {
    return Object.keys(DEFAULT_SDR_COLUMN_WIDTHS).reduce((sum, key) => {
      return sum + (columnWidths[key] || DEFAULT_SDR_COLUMN_WIDTHS[key] || 100);
    }, 0);
  }, [columnWidths]);

  const leftSubrowWidth = useMemo(() => {
    return (
      (columnWidths.companyName || DEFAULT_SDR_COLUMN_WIDTHS.companyName) +
      (columnWidths.locationName || DEFAULT_SDR_COLUMN_WIDTHS.locationName) +
      (columnWidths.sdrAmount || DEFAULT_SDR_COLUMN_WIDTHS.sdrAmount) +
      (columnWidths.sdrReceivedAmount || DEFAULT_SDR_COLUMN_WIDTHS.sdrReceivedAmount) +
      (columnWidths.balanceAmount || DEFAULT_SDR_COLUMN_WIDTHS.balanceAmount) +
      (columnWidths.sdrPaymentStatus || DEFAULT_SDR_COLUMN_WIDTHS.sdrPaymentStatus) +
      (columnWidths.docProof || DEFAULT_SDR_COLUMN_WIDTHS.docProof)
    );
  }, [columnWidths]);

  const rightSubrowWidth = useMemo(() => {
    return (
      (columnWidths.payReceiveDate || DEFAULT_SDR_COLUMN_WIDTHS.payReceiveDate) +
      (columnWidths.receiveAmount || DEFAULT_SDR_COLUMN_WIDTHS.receiveAmount) +
      (columnWidths.paymentMode || DEFAULT_SDR_COLUMN_WIDTHS.paymentMode) +
      (columnWidths.utrNumber || DEFAULT_SDR_COLUMN_WIDTHS.utrNumber) +
      (columnWidths.receiptProof || DEFAULT_SDR_COLUMN_WIDTHS.receiptProof) +
      (columnWidths.remarks || DEFAULT_SDR_COLUMN_WIDTHS.remarks)
    );
  }, [columnWidths]);

  const renderResizeHandle = (colKey: string) => (
    <div
      onMouseDown={(e) => handleResizeStart(colKey, e)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        handleResetColWidth(colKey);
      }}
      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-[#006064]/20 active:bg-[#006064]/40 z-20 transition-colors flex items-center justify-end group select-none"
      title="Drag to resize column (Double-click to reset width)"
    >
      <div className="w-[1.5px] h-3.5 bg-gray-400/40 group-hover:bg-[#006064] group-hover:h-full transition-all mr-0.5 rounded-full" />
    </div>
  );

  // Top Bar Filters
  const [selectedLocation, setSelectedLocation] = useState<string>(
    currentUserLocationId ? String(currentUserLocationId) : 'ALL'
  );
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL'); // 'ALL' | 'PENDING' | 'PARTIAL' | 'COMPLETED'
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Column Sort
  const [sortCol, setSortCol] = useState<
    | 'srNo'
    | 'companyName'
    | 'locationName'
    | 'sdrAmount'
    | 'sdrReceivedAmount'
    | 'balanceAmount'
    | 'sdrPaymentStatus'
    | 'docProof'
    | 'payReceiveDate'
    | 'receiveAmount'
    | 'paymentMode'
    | 'utrNumber'
    | 'receiptProof'
    | 'remarks'
  >('sdrAmount');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Google Sheets / Excel Style Column Filters State
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [activeColMenu, setActiveColMenu] = useState<string | null>(null);
  const [tempFilterValues, setTempFilterValues] = useState<string[]>([]);
  const [filterSearchQuery, setFilterSearchQuery] = useState('');
  const colMenuRef = useRef<HTMLDivElement>(null);

  // Draft table state for inline editing & debounced auto-save
  const [drafts, setDrafts] = useState<Record<number, SdrDraftState>>({});
  const autoSaveTimeoutsRef = useRef<Record<number, NodeJS.Timeout>>({});

  // File upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadClientId, setActiveUploadClientId] = useState<number | null>(null);
  const [activeUploadPartId, setActiveUploadPartId] = useState<string | null>(null);

  // Initialize draft when clients load
  const initDraftsForClients = useCallback((clientList: ClientSdrItem[]) => {
    setDrafts((prev) => {
      const next = { ...prev };
      clientList.forEach((c) => {
        if (!next[c.id]) {
          const parts: SdrPaymentPart[] =
            c.payments && c.payments.length > 0
              ? c.payments.map((p) => {
                  const isCmDoc = Boolean(
                    p.utrFileUrl &&
                      (p.utrFileUrl === c.sdrPdfUrl ||
                        p.utrFileUrl === c.attachedDocUrl ||
                        p.utrFileUrl === c.agreementPdfUrl)
                  );
                  return {
                    id: p.id || `part-${Math.random().toString(36).substring(2, 7)}`,
                    receiveAmount: p.receiveAmount ? String(p.receiveAmount) : '',
                    payReceiveDate: p.payReceiveDate ? String(p.payReceiveDate).split('T')[0] : '',
                    paymentMode: p.paymentMode || 'Bank Transfer',
                    utrNumber: p.utrNumber || '',
                    utrDate: p.utrDate ? String(p.utrDate).split('T')[0] : '',
                    bankName: p.bankName || '',
                    utrFileUrl: isCmDoc ? null : p.utrFileUrl || null,
                    utrFileName: isCmDoc ? null : p.utrFileName || null,
                    remarks: p.remarks || '',
                  };
                })
              : [
                  {
                    id: 'part-1',
                    receiveAmount: c.sdrReceivedAmount > 0 ? String(c.sdrReceivedAmount) : '',
                    payReceiveDate: c.sdrRecdDate ? String(c.sdrRecdDate).split('T')[0] : '',
                    paymentMode: c.sdrPaymentMode || 'Bank Transfer',
                    utrNumber: c.sdrUtrNumber || '',
                    utrDate: c.sdrUtrDate ? String(c.sdrUtrDate).split('T')[0] : '',
                    bankName: c.sdrBankName || '',
                    utrFileUrl: null,
                    utrFileName: null,
                    remarks: c.sdrRemarks || '',
                  },
                ];

          next[c.id] = {
            parts,
            status: 'idle',
            saved: true,
          };
        }
      });
      return next;
    });
  }, []);

  // Fetch SDR payments
  const fetchSdrPayments = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        const params = new URLSearchParams();
        if (selectedLocation !== 'ALL') params.set('locationId', selectedLocation);
        if (selectedStatus !== 'ALL') params.set('status', selectedStatus);
        if (searchQuery.trim()) params.set('search', searchQuery.trim());

        const res = await fetch(`/api/admin/sdr-payments?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to load SDR payments');
        const data = await res.json();

        if (data.success) {
          setClients(data.data || []);
          setLocations(data.locations || []);
          if (data.summary) setSummary(data.summary);
          initDraftsForClients(data.data || []);
        }
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Error loading SDR data');
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [selectedLocation, selectedStatus, searchQuery, initDraftsForClients]
  );

  useEffect(() => {
    fetchSdrPayments(true);
  }, [fetchSdrPayments]);

  // Click outside listener for column filter popover menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) {
        setActiveColMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cell Value Resolver for Google Sheets Filters & Sort
  const getClientCellValue = useCallback(
    (client: ClientSdrItem, colId: string, idx: number): string => {
      switch (colId) {
        case 'srNo':
          return String(idx + 1);
        case 'companyName':
          return client.companyName;
        case 'locationName':
          return client.locationName || 'Unassigned';
        case 'sdrAmount':
          return `₹${(client.sdrAmount || 0).toLocaleString('en-IN')}`;
        case 'sdrReceivedAmount':
          return `₹${(client.sdrReceivedAmount || 0).toLocaleString('en-IN')}`;
        case 'balanceAmount':
          return `₹${(client.balanceAmount || 0).toLocaleString('en-IN')}`;
        case 'sdrPaymentStatus':
          return client.sdrPaymentStatus || 'PENDING';
        case 'docProof':
          return client.attachedDocUrl ? 'Attached' : 'Missing';
        case 'payReceiveDate': {
          const draft = drafts[client.id];
          const d =
            draft?.parts?.[0]?.payReceiveDate ||
            (client.sdrRecdDate ? String(client.sdrRecdDate).split('T')[0] : '');
          return d || '(Empty)';
        }
        case 'receiveAmount': {
          const draft = drafts[client.id];
          const amt =
            draft?.parts?.[0]?.receiveAmount ||
            (client.sdrReceivedAmount > 0 ? String(client.sdrReceivedAmount) : '');
          return amt ? `₹${Number(amt).toLocaleString('en-IN')}` : '₹0';
        }
        case 'paymentMode': {
          const draft = drafts[client.id];
          return draft?.parts?.[0]?.paymentMode || client.sdrPaymentMode || 'Bank Transfer';
        }
        case 'utrNumber': {
          const draft = drafts[client.id];
          const utrs =
            draft?.parts?.map((p) => p.utrNumber).filter(Boolean).join(', ') ||
            client.sdrUtrNumber;
          return utrs || '(Empty)';
        }
        case 'receiptProof': {
          const draft = drafts[client.id];
          const hasFile = Boolean(
            draft?.parts?.some(
              (p) =>
                p.utrFileUrl &&
                p.utrFileUrl !== client.sdrPdfUrl &&
                p.utrFileUrl !== client.attachedDocUrl &&
                p.utrFileUrl !== client.agreementPdfUrl
            )
          );
          return hasFile ? 'Uploaded' : 'Pending';
        }
        case 'remarks': {
          const draft = drafts[client.id];
          const r =
            draft?.parts?.map((p) => p.remarks).filter(Boolean).join(' | ') || client.sdrRemarks;
          return r || '(Empty)';
        }
        default:
          return '';
      }
    },
    [drafts]
  );

  // Unique values and counts for each column
  const getColumnUniqueValues = useCallback(
    (colId: string) => {
      const counts: Record<string, number> = {};
      clients.forEach((c, idx) => {
        const val = getClientCellValue(c, colId, idx);
        counts[val] = (counts[val] || 0) + 1;
      });

      const uniqueList = Object.keys(counts).sort((a, b) => {
        if (colId === 'srNo') {
          return (parseInt(a) || 0) - (parseInt(b) || 0);
        }
        if (a.startsWith('₹') && b.startsWith('₹')) {
          const numA = parseFloat(a.replace(/[^0-9.-]+/g, '')) || 0;
          const numB = parseFloat(b.replace(/[^0-9.-]+/g, '')) || 0;
          return numA - numB;
        }
        return a.localeCompare(b);
      });

      return { uniqueList, counts };
    },
    [clients, getClientCellValue]
  );

  // Google Sheets / Excel Column Filter Handlers
  const handleOpenColumnFilter = (colId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { uniqueList } = getColumnUniqueValues(colId);
    if (columnFilters[colId]) {
      setTempFilterValues(columnFilters[colId]);
    } else {
      setTempFilterValues(uniqueList);
    }
    setFilterSearchQuery('');
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
    setTempFilterValues((prev) => Array.from(new Set([...prev, ...values])));
  };

  const handleClearAllFilterValues = (valuesToClear?: string[]) => {
    if (valuesToClear && valuesToClear.length > 0) {
      setTempFilterValues((prev) => prev.filter((v) => !valuesToClear.includes(v)));
    } else {
      setTempFilterValues([]);
    }
  };

  const handleApplyColumnFilter = (colId: string) => {
    const { uniqueList } = getColumnUniqueValues(colId);
    if (tempFilterValues.length >= uniqueList.length) {
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

  const handleClearAllColFilters = () => {
    setColumnFilters({});
    toast.info('Cleared all column filters');
  };

  const hasActiveColFilters = Object.keys(columnFilters).length > 0;

  // Sort handler
  const handleToggleSort = (
    column:
      | 'srNo'
      | 'companyName'
      | 'locationName'
      | 'sdrAmount'
      | 'sdrReceivedAmount'
      | 'balanceAmount'
      | 'sdrPaymentStatus'
      | 'docProof'
      | 'payReceiveDate'
      | 'receiveAmount'
      | 'paymentMode'
      | 'utrNumber'
      | 'receiptProof'
      | 'remarks'
  ) => {
    if (sortCol === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(column);
      setSortOrder('desc');
    }
  };

  const handleSortFromMenu = (colId: string, direction: 'asc' | 'desc') => {
    setSortCol(colId as any);
    setSortOrder(direction);
    setActiveColMenu(null);
  };

  // Reusable Google Sheets / Excel Filter Popover Renderer
  const renderColumnFilterDropdown = (
    colId: string,
    colLabel: string,
    align: 'left' | 'right' = 'left',
    isNumeric = false
  ) => {
    if (activeColMenu !== colId) return null;
    const isFiltered = Boolean(columnFilters[colId]);
    const { uniqueList, counts } = getColumnUniqueValues(colId);
    const filteredValues = filterSearchQuery.trim()
      ? uniqueList.filter((v) => v.toLowerCase().includes(filterSearchQuery.toLowerCase()))
      : uniqueList;

    return (
      <div
        ref={colMenuRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          left: align === 'right' ? 'auto' : '0px',
          right: align === 'right' ? '0px' : 'auto',
        }}
        className="absolute top-full mt-1 w-72 bg-white text-gray-800 shadow-2xl border border-gray-300 rounded-xs z-50 font-sans normal-case tracking-normal overflow-hidden animate-in fade-in duration-100 text-left cursor-default"
      >
        {/* Popover Header */}
        <div className="bg-[#006064] text-white p-2 px-3 flex items-center justify-between text-xs font-bold">
          <span className="truncate">{colLabel} Filter</span>
          <div className="flex items-center gap-1.5">
            {isFiltered && (
              <button
                type="button"
                onClick={(e) => handleResetColumnFilter(colId, e)}
                className="text-[10px] text-amber-300 hover:underline cursor-pointer"
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
            onClick={() => handleSortFromMenu(colId, 'asc')}
            className="w-full px-2.5 py-1 text-left flex items-center gap-2 hover:bg-cyan-50 text-gray-700 hover:text-[#006064] rounded-xs font-medium cursor-pointer"
          >
            <ArrowUp className="w-3.5 h-3.5 text-[#006064]" />
            <span>Sort Ascending ({isNumeric ? 'Lowest → Highest' : 'A → Z'})</span>
          </button>
          <button
            type="button"
            onClick={() => handleSortFromMenu(colId, 'desc')}
            className="w-full px-2.5 py-1 text-left flex items-center gap-2 hover:bg-cyan-50 text-gray-700 hover:text-[#006064] rounded-xs font-medium cursor-pointer"
          >
            <ArrowDown className="w-3.5 h-3.5 text-[#006064]" />
            <span>Sort Descending ({isNumeric ? 'Highest → Lowest' : 'Z → A'})</span>
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
                onClick={() => setFilterSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Quick Actions: Select All / Clear */}
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
              onClick={() => handleClearAllFilterValues(filteredValues)}
              className="hover:underline text-gray-600 hover:text-rose-700 cursor-pointer"
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
              onClick={() => handleApplyColumnFilter(colId)}
              className="px-4 py-1 bg-[#006064] hover:bg-[#00838f] text-white font-bold text-xs cursor-pointer shadow-2xs"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Auto-Save Execution Function
  const performAutoSave = useCallback(
    async (clientId: number, draftToSave: SdrDraftState) => {
      setDrafts((prev) => ({
        ...prev,
        [clientId]: { ...prev[clientId], status: 'saving' },
      }));

      try {
        const validParts = draftToSave.parts.filter(
          (p) =>
            (parseFloat(p.receiveAmount) || 0) > 0 ||
            Boolean(p.payReceiveDate) ||
            Boolean(p.utrNumber.trim()) ||
            Boolean(p.bankName?.trim()) ||
            Boolean(p.utrFileUrl)
        );

        const totalReceived = validParts.reduce(
          (sum, p) => sum + (parseFloat(p.receiveAmount) || 0),
          0
        );

        const targetClient = clients.find((c) => c.id === clientId);
        const agreedSdr = targetClient?.sdrAmount || 0;

        let computedStatus: 'PENDING' | 'PARTIAL' | 'COMPLETED' = 'PENDING';
        if (agreedSdr > 0) {
          if (totalReceived >= agreedSdr) {
            computedStatus = 'COMPLETED';
          } else if (totalReceived > 0) {
            computedStatus = 'PARTIAL';
          }
        } else if (totalReceived > 0) {
          computedStatus = 'COMPLETED';
        }

        const latestPart = validParts[validParts.length - 1] || draftToSave.parts[0];
        const combinedUtr = validParts.map((p) => (p.utrNumber || '').trim()).filter(Boolean).join(', ');
        const combinedBanks = validParts.map((p) => (p.bankName || '').trim()).filter(Boolean).join(', ');
        const combinedRemarks = validParts.map((p) => (p.remarks || '').trim()).filter(Boolean).join(' | ');
        const primaryProof = validParts.find((p) => p.utrFileUrl)?.utrFileUrl || null;
        const primaryProofName = validParts.find((p) => p.utrFileName)?.utrFileName || null;

        const payload = {
          sdrReceivedAmount: totalReceived,
          sdrPaymentStatus: computedStatus,
          sdrRecdDate: latestPart?.payReceiveDate ? new Date(latestPart.payReceiveDate).toISOString() : null,
          sdrPaymentMode: latestPart?.paymentMode || 'Bank Transfer',
          sdrUtrNumber: combinedUtr || null,
          sdrUtrDate: latestPart?.utrDate ? new Date(latestPart.utrDate).toISOString() : null,
          sdrBankName: combinedBanks || null,
          sdrPaymentsJson: JSON.stringify(validParts.length > 0 ? validParts : draftToSave.parts),
          sdrRemarks: combinedRemarks || null,
        };

        const res = await fetch(`/api/admin/sdr-payments/${clientId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errJson = await res.json();
          throw new Error(errJson.error || 'Failed to auto-save SDR payment');
        }

        setDrafts((prev) => ({
          ...prev,
          [clientId]: {
            ...prev[clientId],
            status: 'saved',
            saved: true,
            errorMessage: undefined,
          },
        }));

        // Update local client item
        setClients((prev) =>
          prev.map((c) => {
            if (c.id !== clientId) return c;
            return {
              ...c,
              sdrReceivedAmount: totalReceived,
              balanceAmount: Math.max(0, agreedSdr - totalReceived),
              sdrPaymentStatus: computedStatus,
              sdrRecdDate: payload.sdrRecdDate,
              sdrPaymentMode: payload.sdrPaymentMode,
              sdrUtrNumber: payload.sdrUtrNumber,
              sdrUtrDate: payload.sdrUtrDate,
              sdrBankName: payload.sdrBankName,
              sdrRemarks: payload.sdrRemarks,
              payments: validParts,
            };
          })
        );
      } catch (err: any) {
        console.error('SDR auto-save error:', err);
        setDrafts((prev) => ({
          ...prev,
          [clientId]: {
            ...prev[clientId],
            status: 'error',
            errorMessage: err.message,
          },
        }));
      }
    },
    [clients]
  );

  // Update part field with debounced auto-save
  const updateDraftPartField = useCallback(
    (clientId: number, partId: string, field: keyof SdrPaymentPart, value: any) => {
      let updatedDraft: SdrDraftState | null = null;

      setDrafts((prev) => {
        const clientDraft = prev[clientId];
        if (!clientDraft) return prev;

        const updatedParts = clientDraft.parts.map((p) => {
          if (p.id !== partId) return p;
          const updated = { ...p, [field]: value };
          if (field === 'payReceiveDate' && !updated.utrDate) {
            updated.utrDate = value;
          }
          return updated;
        });

        updatedDraft = {
          ...clientDraft,
          parts: updatedParts,
          saved: false,
          status: 'idle',
        };

        return {
          ...prev,
          [clientId]: updatedDraft,
        };
      });

      if (autoSaveTimeoutsRef.current[clientId]) {
        clearTimeout(autoSaveTimeoutsRef.current[clientId]);
      }

      autoSaveTimeoutsRef.current[clientId] = setTimeout(() => {
        if (updatedDraft) {
          performAutoSave(clientId, updatedDraft);
        }
      }, 600);
    },
    [performAutoSave]
  );

  // Add split installment part
  const addSplitPart = (clientId: number) => {
    let updatedDraft: SdrDraftState | null = null;

    setDrafts((prev) => {
      const clientDraft = prev[clientId];
      if (!clientDraft) return prev;

      const newPart: SdrPaymentPart = {
        id: `part-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        receiveAmount: '',
        payReceiveDate: new Date().toISOString().split('T')[0],
        paymentMode: 'Bank Transfer',
        utrNumber: '',
        utrDate: new Date().toISOString().split('T')[0],
        bankName: '',
        remarks: '',
      };

      updatedDraft = {
        ...clientDraft,
        parts: [...clientDraft.parts, newPart],
        saved: false,
        status: 'idle',
      };

      return {
        ...prev,
        [clientId]: updatedDraft,
      };
    });
  };

  // Remove split part
  const removeSplitPart = (clientId: number, partId: string) => {
    let updatedDraft: SdrDraftState | null = null;

    setDrafts((prev) => {
      const clientDraft = prev[clientId];
      if (!clientDraft) return prev;

      const filtered = clientDraft.parts.filter((p) => p.id !== partId);
      updatedDraft = {
        ...clientDraft,
        parts:
          filtered.length > 0
            ? filtered
            : [
                {
                  id: 'part-1',
                  receiveAmount: '',
                  payReceiveDate: '',
                  paymentMode: 'Bank Transfer',
                  utrNumber: '',
                  utrDate: '',
                },
              ],
        saved: false,
      };

      return {
        ...prev,
        [clientId]: updatedDraft,
      };
    });

    if (updatedDraft) {
      performAutoSave(clientId, updatedDraft);
    }
  };

  // Trigger file upload for a part
  const triggerFileUpload = (clientId: number, partId: string) => {
    setActiveUploadClientId(clientId);
    setActiveUploadPartId(partId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadClientId || !activeUploadPartId) return;

    const clientId = activeUploadClientId;
    const partId = activeUploadPartId;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', 'SDR_RECEIPT');

    toast.info('Uploading receipt proof...');

    try {
      const res = await fetch('/api/admin/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('File upload failed');
      const data = await res.json();
      const uploadedUrl = data.url || data.fileUrl;

      if (!uploadedUrl) throw new Error('No file URL returned');

      let updatedDraft: SdrDraftState | null = null;

      setDrafts((prev) => {
        const clientDraft = prev[clientId];
        if (!clientDraft) return prev;

        const updatedParts = clientDraft.parts.map((p) => {
          if (p.id !== partId) return p;
          return {
            ...p,
            utrFileUrl: uploadedUrl,
            utrFileName: file.name,
          };
        });

        updatedDraft = {
          ...clientDraft,
          parts: updatedParts,
          saved: false,
        };

        return {
          ...prev,
          [clientId]: updatedDraft,
        };
      });

      toast.success('Receipt attached successfully');

      if (updatedDraft) {
        performAutoSave(clientId, updatedDraft);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error uploading receipt');
    } finally {
      setActiveUploadClientId(null);
      setActiveUploadPartId(null);
    }
  };

  // Filtered & Sorted Clients
  const displayedClients = useMemo(() => {
    let result = [...clients];

    // Global Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.companyName.toLowerCase().includes(q) ||
          (c.clientId || '').toLowerCase().includes(q) ||
          (c.cabinName || '').toLowerCase().includes(q) ||
          (c.locationName || '').toLowerCase().includes(q) ||
          (c.sdrUtrNumber || '').toLowerCase().includes(q) ||
          (c.sdrBankName || '').toLowerCase().includes(q) ||
          (c.sdrRemarks || '').toLowerCase().includes(q)
      );
    }

    // Google Sheets / Excel Column Filters
    const activeColFilterKeys = Object.keys(columnFilters);
    if (activeColFilterKeys.length > 0) {
      result = result.filter((c, idx) => {
        for (const colId of activeColFilterKeys) {
          const allowed = columnFilters[colId];
          if (allowed && allowed.length >= 0) {
            const cellVal = getClientCellValue(c, colId, idx);
            if (!allowed.includes(cellVal)) {
              return false;
            }
          }
        }
        return true;
      });
    }

    // Sorting
    result.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      switch (sortCol) {
        case 'srNo':
          valA = a.srNo;
          valB = b.srNo;
          break;
        case 'companyName':
          valA = a.companyName.toLowerCase();
          valB = b.companyName.toLowerCase();
          break;
        case 'locationName':
          valA = (a.locationName || '').toLowerCase();
          valB = (b.locationName || '').toLowerCase();
          break;
        case 'sdrAmount':
          valA = a.sdrAmount || 0;
          valB = b.sdrAmount || 0;
          break;
        case 'sdrReceivedAmount':
          valA = a.sdrReceivedAmount || 0;
          valB = b.sdrReceivedAmount || 0;
          break;
        case 'balanceAmount':
          valA = a.balanceAmount || 0;
          valB = b.balanceAmount || 0;
          break;
        case 'sdrPaymentStatus':
          valA = a.sdrPaymentStatus || '';
          valB = b.sdrPaymentStatus || '';
          break;
        case 'docProof':
          valA = a.attachedDocUrl ? 1 : 0;
          valB = b.attachedDocUrl ? 1 : 0;
          break;
        case 'payReceiveDate': {
          const dateA = drafts[a.id]?.parts?.[0]?.payReceiveDate || a.sdrRecdDate || '';
          const dateB = drafts[b.id]?.parts?.[0]?.payReceiveDate || b.sdrRecdDate || '';
          valA = dateA ? new Date(dateA).getTime() : 0;
          valB = dateB ? new Date(dateB).getTime() : 0;
          break;
        }
        case 'receiveAmount': {
          valA = parseFloat(drafts[a.id]?.parts?.[0]?.receiveAmount || '0') || a.sdrReceivedAmount || 0;
          valB = parseFloat(drafts[b.id]?.parts?.[0]?.receiveAmount || '0') || b.sdrReceivedAmount || 0;
          break;
        }
        case 'paymentMode': {
          valA = drafts[a.id]?.parts?.[0]?.paymentMode || a.sdrPaymentMode || '';
          valB = drafts[b.id]?.parts?.[0]?.paymentMode || b.sdrPaymentMode || '';
          break;
        }
        case 'utrNumber': {
          valA = drafts[a.id]?.parts?.map((p) => p.utrNumber).filter(Boolean).join(', ') || a.sdrUtrNumber || '';
          valB = drafts[b.id]?.parts?.map((p) => p.utrNumber).filter(Boolean).join(', ') || b.sdrUtrNumber || '';
          break;
        }
        case 'receiptProof': {
          valA = Boolean(
            drafts[a.id]?.parts?.some(
              (p) =>
                p.utrFileUrl &&
                p.utrFileUrl !== a.sdrPdfUrl &&
                p.utrFileUrl !== a.attachedDocUrl &&
                p.utrFileUrl !== a.agreementPdfUrl
            )
          )
            ? 1
            : 0;
          valB = Boolean(
            drafts[b.id]?.parts?.some(
              (p) =>
                p.utrFileUrl &&
                p.utrFileUrl !== b.sdrPdfUrl &&
                p.utrFileUrl !== b.attachedDocUrl &&
                p.utrFileUrl !== b.agreementPdfUrl
            )
          )
            ? 1
            : 0;
          break;
        }
        case 'remarks': {
          valA = drafts[a.id]?.parts?.map((p) => p.remarks).filter(Boolean).join(' ') || a.sdrRemarks || '';
          valB = drafts[b.id]?.parts?.map((p) => p.remarks).filter(Boolean).join(' ') || b.sdrRemarks || '';
          break;
        }
        default:
          valA = a.sdrAmount || 0;
          valB = b.sdrAmount || 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [clients, searchQuery, columnFilters, drafts, sortCol, sortOrder, getClientCellValue]);

  // Export to CSV
  const handleExportCsv = () => {
    const headers = [
      'S.No',
      'Company Name',
      'Client ID',
      'Centre',
      'Cabin',
      'Agreed SDR Amount',
      'SDR Received Amount',
      'Balance Pending',
      'Status',
      'Payment Receive Date',
      'Payment Mode',
      'UTR Number',
      'Receipt URL',
      'Remarks',
    ];

    const rows = displayedClients.map((c, idx) => {
      const draft = drafts[c.id];
      const primaryPart = draft?.parts?.[0];
      return [
        idx + 1,
        `"${c.companyName.replace(/"/g, '""')}"`,
        `"${c.clientId || ''}"`,
        `"${c.locationName}"`,
        `"${c.cabinName || ''}"`,
        c.sdrAmount,
        c.sdrReceivedAmount,
        c.balanceAmount,
        c.sdrPaymentStatus,
        primaryPart?.payReceiveDate || (c.sdrRecdDate ? new Date(c.sdrRecdDate).toLocaleDateString('en-GB') : ''),
        `"${primaryPart?.paymentMode || c.sdrPaymentMode || ''}"`,
        `"${primaryPart?.utrNumber || c.sdrUtrNumber || ''}"`,
        `"${
          primaryPart?.utrFileUrl &&
          primaryPart.utrFileUrl !== c.sdrPdfUrl &&
          primaryPart.utrFileUrl !== c.attachedDocUrl &&
          primaryPart.utrFileUrl !== c.agreementPdfUrl
            ? primaryPart.utrFileUrl
            : ''
        }"`,
        `"${(primaryPart?.remarks || c.sdrRemarks || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SSPACIA_SDR_Receive_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('SDR report downloaded as CSV');
  };

  return (
    <div className="space-y-4">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png"
      />

      {/* ── HEADER BANNER & ACTION TOOLBAR ── */}
      <FadeUp>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-white border border-gray-200 shadow-2xs">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#006064] mb-0.5">
              <ShieldCheck size={15} />
              <span>Accounts Security Deposit Ledger</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-950 flex items-center gap-2.5">
              <span>SDR Receive Management</span>
              <span className="text-[10px] px-2 py-0.5 bg-teal-50 text-[#006064] border border-teal-200 font-mono font-bold rounded-sm">
                Auto-Saving Live Register
              </span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Record client Security Deposit receipts, view agreed SDR vs balances, upload UTR bank proofs, and manage installments.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-800 text-xs font-bold uppercase tracking-wider border border-gray-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Back to Invoices"
              >
                <FolderArchive size={14} className="text-[#006064]" />
                <span>Back to Invoices</span>
              </button>
            )}

            {onNavigateToInvoicePayments && (
              <button
                type="button"
                onClick={onNavigateToInvoicePayments}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold uppercase tracking-wider border border-gray-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Switch back to Invoice Payment Receive Management"
              >
                <FolderArchive size={14} className="text-[#006064]" />
                <span>Invoice Payments</span>
              </button>
            )}

            {onNavigateToActiveInvoices && (
              <button
                type="button"
                onClick={onNavigateToActiveInvoices}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold uppercase tracking-wider border border-gray-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Switch to Active Monthly Invoices"
              >
                <FileText size={14} className="text-gray-700" />
                <span>Active Invoices</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => fetchSdrPayments(true)}
              className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold border border-gray-300 flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Refresh SDR data"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-1.5 bg-[#006064] hover:bg-[#004d40] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
              title="Download full SDR register as CSV"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </FadeUp>

      {/* ── SUMMARY METRICS CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Total Target SDR */}
        <div className="p-3 bg-white border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between text-gray-500 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Agreed SDR</span>
            <DollarSign className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-xl font-black text-gray-900 font-mono">
            ₹{summary.totalSdrTargetSum.toLocaleString('en-IN')}
          </div>
          <div className="text-[10.5px] text-gray-500 mt-0.5">
            Across {summary.totalClientsCount} clients
          </div>
        </div>

        {/* Total Received SDR */}
        <div className="p-3 bg-emerald-50/70 border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total SDR Collected</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-800 font-mono">
            ₹{summary.totalSdrReceivedSum.toLocaleString('en-IN')}
          </div>
          <div className="text-[10.5px] text-emerald-700 mt-0.5 font-bold">
            {summary.completedCount} Fully Paid &amp; Settled
          </div>
        </div>

        {/* Total Balance Pending */}
        <div className="p-3 bg-rose-50/70 border border-rose-200 shadow-2xs">
          <div className="flex items-center justify-between text-rose-800 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">SDR Balance Pending</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-black text-rose-800 font-mono">
            ₹{summary.totalSdrPendingSum.toLocaleString('en-IN')}
          </div>
          <div className="text-[10.5px] text-rose-700 mt-0.5 font-bold">
            {summary.pendingCount} Pending • {summary.partialCount} Partial
          </div>
        </div>

        {/* Breakdown Status Pills */}
        <div className="p-3 bg-white border border-gray-200 shadow-2xs flex flex-col justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">
            Settlement Breakdown
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              {summary.completedCount} Full
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
              {summary.partialCount} Partial
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
              {summary.pendingCount} Unpaid
            </span>
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5 font-mono">
            Collection Rate:{' '}
            {summary.totalSdrTargetSum > 0
              ? `${Math.round((summary.totalSdrReceivedSum / summary.totalSdrTargetSum) * 100)}%`
              : '0%'}
          </div>
        </div>
      </div>

      {/* ── TOP FILTER TOOLBAR ── */}
      <div className="bg-white border border-gray-200 p-2.5 space-y-2.5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 p-0.5 border border-gray-300 text-xs">
            <button
              type="button"
              onClick={() => setSelectedStatus('ALL')}
              className={`px-3 py-1 text-[11px] font-bold uppercase cursor-pointer transition-all ${
                selectedStatus === 'ALL'
                  ? 'bg-[#006064] text-white shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All ({summary.totalClientsCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus('PENDING')}
              className={`px-3 py-1 text-[11px] font-bold uppercase cursor-pointer transition-all ${
                selectedStatus === 'PENDING'
                  ? 'bg-rose-700 text-white shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pending ({summary.pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus('PARTIAL')}
              className={`px-3 py-1 text-[11px] font-bold uppercase cursor-pointer transition-all ${
                selectedStatus === 'PARTIAL'
                  ? 'bg-amber-700 text-white shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Partial ({summary.partialCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus('COMPLETED')}
              className={`px-3 py-1 text-[11px] font-bold uppercase cursor-pointer transition-all ${
                selectedStatus === 'COMPLETED'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Completed ({summary.completedCount})
            </button>
          </div>

          {/* Center selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
              <Building2 size={13} className="text-[#006064]" /> Centre:
            </span>
            <div className="relative min-w-[170px]">
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full bg-[#fafafa] border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#006064] appearance-none cursor-pointer"
              >
                <option value="ALL">All Centres ({locations.length})</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={String(loc.id)}>
                    {loc.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search company name, client ID, cabin, UTR number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#fafafa] border border-gray-300 focus:outline-none focus:border-[#006064] text-gray-900"
          />
        </div>
      </div>

      {/* ── TABLE SUB-HEADER & COLUMN RESIZE BAR ── */}
      <div className="flex items-center justify-between text-xs px-1 py-1 text-gray-500">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-bold text-gray-700">
            {displayedClients.length} of {clients.length} clients
          </span>
          <span className="text-gray-300">•</span>
          <span className="text-[10px] text-gray-400">
            Drag column borders to resize
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetAllWidths}
            className="text-[11px] font-bold text-gray-600 hover:text-[#006064] flex items-center gap-1 cursor-pointer transition-colors"
            title="Reset column widths to default (Drag column right edges to resize)"
          >
            <RotateCcw size={11} className="text-gray-500" />
            <span>Reset Column Widths</span>
          </button>
        </div>
      </div>

      {/* ── ACTIVE EXCEL COLUMN FILTERS BANNER ── */}
      {hasActiveColFilters && (
        <div className="px-3 py-1.5 bg-cyan-50/90 border border-cyan-200 flex items-center justify-between text-xs text-cyan-900 font-sans shadow-2xs">
          <div className="flex items-center gap-1.5">
            <Filter size={12} className="text-cyan-700" />
            <span className="font-semibold">Excel Column Filters Active:</span>
            <span className="font-mono text-[11px] font-bold">
              Showing {displayedClients.length} of {clients.length} clients
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

      {/* ── SPREADSHEET TABLE WITH UNIQUE INDIVIDUAL COLUMNS & RESIZABLE HEADERS ── */}
      <div className="bg-white border border-gray-300 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto max-h-[720px] scrollbar-thin">
          <table
            style={{ width: `${totalTableWidth}px`, minWidth: `${totalTableWidth}px`, tableLayout: 'fixed' }}
            className="border-collapse text-left text-xs"
          >
            {/* Table Header: Google Sheets / Excel Column Filter Popovers */}
            <thead className="bg-[#f1f5f9] text-gray-800 sticky top-0 z-20 shadow-xs border-b border-gray-300 select-none">
              <tr className="divide-x divide-gray-300 text-[10px] font-bold uppercase tracking-wider">
                {/* 1. Sr. */}
                <th
                  style={{
                    width: `${columnWidths.srNo}px`,
                    minWidth: `${columnWidths.srNo}px`,
                    maxWidth: `${columnWidths.srNo}px`,
                  }}
                  className="p-2 text-center relative overflow-hidden"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span
                      onClick={() => handleToggleSort('srNo')}
                      className="cursor-pointer hover:text-[#006064]"
                      title="Sort by Sr."
                    >
                      # {sortCol === 'srNo' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleOpenColumnFilter('srNo', e)}
                      className={`p-0.5 rounded-xs transition-colors cursor-pointer shrink-0 ${
                        columnFilters['srNo']
                          ? 'bg-amber-400 text-amber-950 font-bold shadow-xs ring-1 ring-amber-500'
                          : 'text-gray-400 hover:text-gray-700 hover:bg-gray-200/60'
                      }`}
                      title="Filter column: Sr."
                    >
                      <Filter className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  {renderColumnFilterDropdown('srNo', 'Sr.', 'left', true)}
                  {renderResizeHandle('srNo')}
                </th>

                {/* 2. Corporate Client */}
                <th
                  style={{
                    width: `${columnWidths.companyName}px`,
                    minWidth: `${columnWidths.companyName}px`,
                    maxWidth: `${columnWidths.companyName}px`,
                  }}
                  className="p-2 text-left relative overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      onClick={() => handleToggleSort('companyName')}
                      className="cursor-pointer hover:text-[#006064] truncate"
                      title="Sort by Corporate Client"
                    >
                      Corporate Client {sortCol === 'companyName' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleOpenColumnFilter('companyName', e)}
                      className={`p-0.5 rounded-xs transition-colors cursor-pointer shrink-0 ${
                        columnFilters['companyName']
                          ? 'bg-amber-400 text-amber-950 font-bold shadow-xs ring-1 ring-amber-500'
                          : 'text-gray-400 hover:text-gray-700 hover:bg-gray-200/60'
                      }`}
                      title="Filter column: Corporate Client"
                    >
                      <Filter className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  {renderColumnFilterDropdown('companyName', 'Corporate Client', 'left', false)}
                  {renderResizeHandle('companyName')}
                </th>

                {/* 3. Centre */}
                <th
                  style={{
                    width: `${columnWidths.locationName}px`,
                    minWidth: `${columnWidths.locationName}px`,
                    maxWidth: `${columnWidths.locationName}px`,
                  }}
                  className="p-2 text-center relative overflow-hidden"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span
                      onClick={() => handleToggleSort('locationName')}
                      className="cursor-pointer hover:text-[#006064]"
                      title="Sort by Centre"
                    >
                      Centre {sortCol === 'locationName' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleOpenColumnFilter('locationName', e)}
                      className={`p-0.5 rounded-xs transition-colors cursor-pointer shrink-0 ${
                        columnFilters['locationName']
                          ? 'bg-amber-400 text-amber-950 font-bold shadow-xs ring-1 ring-amber-500'
                          : 'text-gray-400 hover:text-gray-700 hover:bg-gray-200/60'
                      }`}
                      title="Filter column: Centre"
                    >
                      <Filter className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  {renderColumnFilterDropdown('locationName', 'Centre', 'left', false)}
                  {renderResizeHandle('locationName')}
                </th>

                {/* 4. Agreed SDR */}
                <th
                  style={{
                    width: `${columnWidths.sdrAmount}px`,
                    minWidth: `${columnWidths.sdrAmount}px`,
                    maxWidth: `${columnWidths.sdrAmount}px`,
                  }}
                  className="p-2 text-right relative overflow-hidden"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span
                      onClick={() => handleToggleSort('sdrAmount')}
                      className="cursor-pointer hover:text-[#006064] truncate"
                      title="Sort by Agreed SDR"
                    >
                      Agreed SDR (₹) {sortCol === 'sdrAmount' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleOpenColumnFilter('sdrAmount', e)}
                      className={`p-0.5 rounded-xs transition-colors cursor-pointer shrink-0 ${
                        columnFilters['sdrAmount']
                          ? 'bg-amber-400 text-amber-950 font-bold shadow-xs ring-1 ring-amber-500'
                          : 'text-gray-400 hover:text-gray-700 hover:bg-gray-200/60'
                      }`}
                      title="Filter column: Agreed SDR"
                    >
                      <Filter className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  {renderColumnFilterDropdown('sdrAmount', 'Agreed SDR', 'left', true)}
                  {renderResizeHandle('sdrAmount')}
                </th>

                {/* 5. Received SDR */}
                <th
                  style={{
                    width: `${columnWidths.sdrReceivedAmount}px`,
                    minWidth: `${columnWidths.sdrReceivedAmount}px`,
                    maxWidth: `${columnWidths.sdrReceivedAmount}px`,
                  }}
                  className="p-2 text-right relative overflow-hidden"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span
                      onClick={() => handleToggleSort('sdrReceivedAmount')}
                      className="cursor-pointer hover:text-[#006064] truncate"
                      title="Sort by Received SDR"
                    >
                      Received (₹) {sortCol === 'sdrReceivedAmount' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleOpenColumnFilter('sdrReceivedAmount', e)}
                      className={`p-0.5 rounded-xs transition-colors cursor-pointer shrink-0 ${
                        columnFilters['sdrReceivedAmount']
                          ? 'bg-amber-400 text-amber-950 font-bold shadow-xs ring-1 ring-amber-500'
                          : 'text-gray-400 hover:text-gray-700 hover:bg-gray-200/60'
                      }`}
                      title="Filter column: Received SDR"
                    >
                      <Filter className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  {renderColumnFilterDropdown('sdrReceivedAmount', 'Received SDR', 'left', true)}
                  {renderResizeHandle('sdrReceivedAmount')}
                </th>

                {/* 6. Balance Due */}
                <th
                  style={{
                    width: `${columnWidths.balanceAmount}px`,
                    minWidth: `${columnWidths.balanceAmount}px`,
                    maxWidth: `${columnWidths.balanceAmount}px`,
                  }}
                  className="p-2 text-right relative overflow-hidden"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span
                      onClick={() => handleToggleSort('balanceAmount')}
                      className="cursor-pointer hover:text-[#006064] truncate"
                      title="Sort by Balance Due"
                    >
                      Balance (₹) {sortCol === 'balanceAmount' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleOpenColumnFilter('balanceAmount', e)}
                      className={`p-0.5 rounded-xs transition-colors cursor-pointer shrink-0 ${
                        columnFilters['balanceAmount']
                          ? 'bg-amber-400 text-amber-950 font-bold shadow-xs ring-1 ring-amber-500'
                          : 'text-gray-400 hover:text-gray-700 hover:bg-gray-200/60'
                      }`}
                      title="Filter column: Balance Due"
                    >
                      <Filter className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  {renderColumnFilterDropdown('balanceAmount', 'Balance Due', 'left', true)}
                  {renderResizeHandle('balanceAmount')}
                </th>

                {/* 7. Status & Save */}
                <th
                  style={{
                    width: `${columnWidths.sdrPaymentStatus}px`,
                    minWidth: `${columnWidths.sdrPaymentStatus}px`,
                    maxWidth: `${columnWidths.sdrPaymentStatus}px`,
                  }}
                  className="p-2 text-center relative overflow-hidden"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span
                      onClick={() => handleToggleSort('sdrPaymentStatus')}
                      className="cursor-pointer hover:text-[#006064] truncate"
                      title="Sort by Status"
                    >
                      Status &amp; Save {sortCol === 'sdrPaymentStatus' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleOpenColumnFilter('sdrPaymentStatus', e)}
                      className={`p-0.5 rounded-xs transition-colors cursor-pointer shrink-0 ${
                        columnFilters['sdrPaymentStatus']
                          ? 'bg-amber-400 text-amber-950 font-bold shadow-xs ring-1 ring-amber-500'
                          : 'text-gray-400 hover:text-gray-700 hover:bg-gray-200/60'
                      }`}
                      title="Filter column: Status"
                    >
                      <Filter className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  {renderColumnFilterDropdown('sdrPaymentStatus', 'Status', 'left', false)}
                  {renderResizeHandle('sdrPaymentStatus')}
                </th>

                {/* 8. Doc Proof */}
                <th
                  style={{
                    width: `${columnWidths.docProof}px`,
                    minWidth: `${columnWidths.docProof}px`,
                    maxWidth: `${columnWidths.docProof}px`,
                  }}
                  className="p-2 text-center relative overflow-hidden"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span
                      onClick={() => handleToggleSort('docProof')}
                      className="cursor-pointer hover:text-[#006064]"
                      title="Sort by Doc Proof"
                    >
                      Doc Proof {sortCol === 'docProof' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleOpenColumnFilter('docProof', e)}
                      className={`p-0.5 rounded-xs transition-colors cursor-pointer shrink-0 ${
                        columnFilters['docProof']
                          ? 'bg-amber-400 text-amber-950 font-bold shadow-xs ring-1 ring-amber-500'
                          : 'text-gray-400 hover:text-gray-700 hover:bg-gray-200/60'
                      }`}
                      title="Filter column: Doc Proof"
                    >
                      <Filter className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  {renderColumnFilterDropdown('docProof', 'Doc Proof', 'left', false)}
                  {renderResizeHandle('docProof')}
                </th>

                {/* ── UNIQUE SEPARATE COLUMNS FOR ACCOUNTANT PAYMENT SETTLEMENT ── */}
                {/* 9. Payment Receive Date (Renamed per user request) */}
                <th
                  style={{
                    width: `${columnWidths.payReceiveDate}px`,
                    minWidth: `${columnWidths.payReceiveDate}px`,
                    maxWidth: `${columnWidths.payReceiveDate}px`,
                  }}
                  className="p-2 bg-teal-50/90 text-[#004d40] text-left relative overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      onClick={() => handleToggleSort('payReceiveDate')}
                      className="cursor-pointer hover:text-teal-900 truncate"
                      title="Sort by Payment Receive Date"
                    >
                      Payment Receive Date {sortCol === 'payReceiveDate' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleOpenColumnFilter('payReceiveDate', e)}
                      className={`p-0.5 rounded-xs transition-colors cursor-pointer shrink-0 ${
                        columnFilters['payReceiveDate']
                          ? 'bg-amber-400 text-amber-950 font-bold shadow-xs ring-1 ring-amber-500'
                          : 'text-teal-600 hover:text-teal-900 hover:bg-teal-100/60'
                      }`}
                      title="Filter column: Payment Receive Date"
                    >
                      <Filter className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  {renderColumnFilterDropdown('payReceiveDate', 'Payment Receive Date', 'right', false)}
                  {renderResizeHandle('payReceiveDate')}
                </th>

                {/* 10. Received Amt */}
                <th
                  style={{
                    width: `${columnWidths.receiveAmount}px`,
                    minWidth: `${columnWidths.receiveAmount}px`,
                    maxWidth: `${columnWidths.receiveAmount}px`,
                  }}
                  className="p-2 text-right bg-teal-50/90 text-[#004d40] relative overflow-hidden"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span
                      onClick={() => handleToggleSort('receiveAmount')}
                      className="cursor-pointer hover:text-teal-900 truncate"
                      title="Sort by Received Amount"
                    >
                      Received Amt (₹) {sortCol === 'receiveAmount' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleOpenColumnFilter('receiveAmount', e)}
                      className={`p-0.5 rounded-xs transition-colors cursor-pointer shrink-0 ${
                        columnFilters['receiveAmount']
                          ? 'bg-amber-400 text-amber-950 font-bold shadow-xs ring-1 ring-amber-500'
                          : 'text-teal-600 hover:text-teal-900 hover:bg-teal-100/60'
                      }`}
                      title="Filter column: Received Amt"
                    >
                      <Filter className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  {renderColumnFilterDropdown('receiveAmount', 'Received Amt', 'right', true)}
                  {renderResizeHandle('receiveAmount')}
                </th>

                {/* 11. Payment Mode */}
                <th
                  style={{
                    width: `${columnWidths.paymentMode}px`,
                    minWidth: `${columnWidths.paymentMode}px`,
                    maxWidth: `${columnWidths.paymentMode}px`,
                  }}
                  className="p-2 bg-teal-50/90 text-[#004d40] text-left relative overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      onClick={() => handleToggleSort('paymentMode')}
                      className="cursor-pointer hover:text-teal-900 truncate"
                      title="Sort by Payment Mode"
                    >
                      Payment Mode {sortCol === 'paymentMode' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleOpenColumnFilter('paymentMode', e)}
                      className={`p-0.5 rounded-xs transition-colors cursor-pointer shrink-0 ${
                        columnFilters['paymentMode']
                          ? 'bg-amber-400 text-amber-950 font-bold shadow-xs ring-1 ring-amber-500'
                          : 'text-teal-600 hover:text-teal-900 hover:bg-teal-100/60'
                      }`}
                      title="Filter column: Payment Mode"
                    >
                      <Filter className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  {renderColumnFilterDropdown('paymentMode', 'Payment Mode', 'right', false)}
                  {renderResizeHandle('paymentMode')}
                </th>

                {/* 12. UTR / Ref No. */}
                <th
                  style={{
                    width: `${columnWidths.utrNumber}px`,
                    minWidth: `${columnWidths.utrNumber}px`,
                    maxWidth: `${columnWidths.utrNumber}px`,
                  }}
                  className="p-2 bg-teal-50/90 text-[#004d40] text-left relative overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      onClick={() => handleToggleSort('utrNumber')}
                      className="cursor-pointer hover:text-teal-900 truncate"
                      title="Sort by UTR Number"
                    >
                      UTR / Ref No. {sortCol === 'utrNumber' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleOpenColumnFilter('utrNumber', e)}
                      className={`p-0.5 rounded-xs transition-colors cursor-pointer shrink-0 ${
                        columnFilters['utrNumber']
                          ? 'bg-amber-400 text-amber-950 font-bold shadow-xs ring-1 ring-amber-500'
                          : 'text-teal-600 hover:text-teal-900 hover:bg-teal-100/60'
                      }`}
                      title="Filter column: UTR Number"
                    >
                      <Filter className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  {renderColumnFilterDropdown('utrNumber', 'UTR / Ref No.', 'right', false)}
                  {renderResizeHandle('utrNumber')}
                </th>

                {/* 13. Receipt Proof (Bank Name removed per user instruction) */}
                <th
                  style={{
                    width: `${columnWidths.receiptProof}px`,
                    minWidth: `${columnWidths.receiptProof}px`,
                    maxWidth: `${columnWidths.receiptProof}px`,
                  }}
                  className="p-2 text-center bg-teal-50/90 text-[#004d40] relative overflow-hidden"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span
                      onClick={() => handleToggleSort('receiptProof')}
                      className="cursor-pointer hover:text-teal-900"
                      title="Sort by Receipt Proof"
                    >
                      Receipt Proof {sortCol === 'receiptProof' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleOpenColumnFilter('receiptProof', e)}
                      className={`p-0.5 rounded-xs transition-colors cursor-pointer shrink-0 ${
                        columnFilters['receiptProof']
                          ? 'bg-amber-400 text-amber-950 font-bold shadow-xs ring-1 ring-amber-500'
                          : 'text-teal-600 hover:text-teal-900 hover:bg-teal-100/60'
                      }`}
                      title="Filter column: Receipt Proof"
                    >
                      <Filter className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  {renderColumnFilterDropdown('receiptProof', 'Receipt Proof', 'right', false)}
                  {renderResizeHandle('receiptProof')}
                </th>

                {/* 14. Remarks */}
                <th
                  style={{
                    width: `${columnWidths.remarks}px`,
                    minWidth: `${columnWidths.remarks}px`,
                    maxWidth: `${columnWidths.remarks}px`,
                  }}
                  className="p-2 bg-teal-50/90 text-[#004d40] text-left relative overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      onClick={() => handleToggleSort('remarks')}
                      className="cursor-pointer hover:text-teal-900 truncate"
                      title="Sort by Remarks"
                    >
                      Remarks {sortCol === 'remarks' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleOpenColumnFilter('remarks', e)}
                      className={`p-0.5 rounded-xs transition-colors cursor-pointer shrink-0 ${
                        columnFilters['remarks']
                          ? 'bg-amber-400 text-amber-950 font-bold shadow-xs ring-1 ring-amber-500'
                          : 'text-teal-600 hover:text-teal-900 hover:bg-teal-100/60'
                      }`}
                      title="Filter column: Remarks"
                    >
                      <Filter className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  {renderColumnFilterDropdown('remarks', 'Remarks', 'right', false)}
                  {renderResizeHandle('remarks')}
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={14} className="p-12 text-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#006064]" />
                    <span className="font-bold text-xs uppercase tracking-wider">Loading SDR Records...</span>
                  </td>
                </tr>
              ) : displayedClients.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-12 text-center text-gray-500">
                    <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="font-bold text-sm text-gray-700">No client SDR records found matching current filters</p>
                    <p className="text-xs text-gray-400 mt-1">Try clearing your filters or changing search terms</p>
                  </td>
                </tr>
              ) : (
                displayedClients.map((client, idx) => {
                  const draft = drafts[client.id] || {
                    parts: [
                      {
                        id: 'part-1',
                        receiveAmount: '',
                        payReceiveDate: '',
                        paymentMode: 'Bank Transfer',
                        utrNumber: '',
                        utrDate: '',
                      },
                    ],
                    status: 'idle',
                    saved: true,
                  };

                  const isCompleted = client.sdrPaymentStatus === 'COMPLETED';
                  const isPartial = client.sdrPaymentStatus === 'PARTIAL';
                  const primaryPart = draft.parts[0] || {
                    id: 'part-1',
                    receiveAmount: '',
                    payReceiveDate: '',
                    paymentMode: 'Bank Transfer',
                    utrNumber: '',
                    utrDate: '',
                  };

                  const hasMultipleParts = draft.parts.length > 1;

                  return (
                    <React.Fragment key={client.id}>
                      {/* Primary Client Row */}
                      <tr
                        className={`divide-x divide-gray-200 hover:bg-gray-50/70 transition-colors ${
                          hasMultipleParts ? 'bg-amber-50/20' : ''
                        }`}
                      >
                         {/* 1. S.No */}
                        <td
                          style={{
                            width: `${columnWidths.srNo}px`,
                            maxWidth: `${columnWidths.srNo}px`,
                          }}
                          className="p-2 text-center font-mono text-[11px] text-gray-500 overflow-hidden"
                        >
                          {idx + 1}
                        </td>

                        {/* 2. Company Name, Client ID & Installment Control */}
                        <td
                          style={{
                            width: `${columnWidths.companyName}px`,
                            maxWidth: `${columnWidths.companyName}px`,
                          }}
                          className="p-2 overflow-hidden"
                        >
                          <div className="font-bold text-gray-950 flex items-center gap-1.5 truncate">
                            <span className="truncate" title={client.companyName}>{client.companyName}</span>
                            {client.clientId && (
                              <span className="px-1 py-0.2 bg-gray-100 text-gray-600 text-[9.5px] font-mono border border-gray-200 shrink-0">
                                {client.clientId}
                              </span>
                            )}
                          </div>
                          {(client.cabinName || client.noOfSeats) && (
                            <div className="text-[10.5px] text-gray-500 flex items-center gap-1 mt-0.5 font-mono truncate">
                              {client.cabinName && <span className="truncate">Cabin: {client.cabinName}</span>}
                              {client.cabinName && client.noOfSeats && <span>•</span>}
                              {client.noOfSeats && <span>{client.noOfSeats} Seats</span>}
                            </div>
                          )}
                        </td>

                        {/* 3. Centre */}
                        <td
                          style={{
                            width: `${columnWidths.locationName}px`,
                            maxWidth: `${columnWidths.locationName}px`,
                          }}
                          className="p-2 text-center overflow-hidden"
                        >
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700 border border-gray-300 truncate">
                            <Building2 size={10} className="text-[#006064] shrink-0" />
                            <span className="truncate">{client.locationName}</span>
                          </span>
                        </td>

                        {/* 4. Agreed SDR Amount */}
                        <td
                          style={{
                            width: `${columnWidths.sdrAmount}px`,
                            maxWidth: `${columnWidths.sdrAmount}px`,
                          }}
                          className="p-2 text-right font-mono font-black text-gray-900 overflow-hidden truncate"
                        >
                          ₹{client.sdrAmount.toLocaleString('en-IN')}
                        </td>

                        {/* 5. Received Amount */}
                        <td
                          style={{
                            width: `${columnWidths.sdrReceivedAmount}px`,
                            maxWidth: `${columnWidths.sdrReceivedAmount}px`,
                          }}
                          className="p-2 text-right font-mono font-bold text-emerald-700 overflow-hidden truncate"
                        >
                          {client.sdrReceivedAmount > 0 ? (
                            `₹${client.sdrReceivedAmount.toLocaleString('en-IN')}`
                          ) : (
                            <span className="text-gray-400 font-normal">₹0</span>
                          )}
                        </td>

                        {/* 6. Balance Pending */}
                        <td
                          style={{
                            width: `${columnWidths.balanceAmount}px`,
                            maxWidth: `${columnWidths.balanceAmount}px`,
                          }}
                          className="p-2 text-right font-mono font-bold overflow-hidden truncate"
                        >
                          {client.balanceAmount > 0 ? (
                            <span className="text-rose-600">₹{client.balanceAmount.toLocaleString('en-IN')}</span>
                          ) : (
                            <span className="text-emerald-700 font-bold">₹0</span>
                          )}
                        </td>

                        {/* 7. Status Badge + Real-time Auto-Save Indicator */}
                        <td
                          style={{
                            width: `${columnWidths.sdrPaymentStatus}px`,
                            maxWidth: `${columnWidths.sdrPaymentStatus}px`,
                          }}
                          className="p-2 text-center overflow-hidden"
                        >
                          <div className="flex flex-col items-center gap-1">
                            {isCompleted ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap">
                                <CheckCircle2 size={11} /> Completed
                              </span>
                            ) : isPartial ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap">
                                <Clock size={11} /> Partial
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase bg-rose-100 text-rose-900 border border-rose-300 whitespace-nowrap">
                                <AlertCircle size={11} /> Pending
                              </span>
                            )}

                            {/* Auto-Save Live Status */}
                            {draft.status === 'saving' ? (
                              <span className="inline-flex items-center gap-0.5 text-[9.5px] font-mono font-bold text-amber-600 animate-pulse whitespace-nowrap">
                                <Loader2 size={10} className="animate-spin" /> Saving...
                              </span>
                            ) : draft.status === 'error' ? (
                              <span
                                className="inline-flex items-center gap-0.5 text-[9.5px] font-mono font-bold text-rose-600 cursor-help whitespace-nowrap"
                                title={draft.errorMessage || 'Save error'}
                              >
                                <AlertCircle size={10} /> Error
                              </span>
                            ) : draft.saved ? (
                              <span className="inline-flex items-center gap-0.5 text-[9.5px] font-mono font-semibold text-emerald-600 whitespace-nowrap">
                                <Check size={10} /> Auto-Saved
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* 8. Attached Document / Agreement */}
                        <td
                          style={{
                            width: `${columnWidths.docProof}px`,
                            maxWidth: `${columnWidths.docProof}px`,
                          }}
                          className="p-2 text-center overflow-hidden"
                        >
                          {client.attachedDocUrl ? (
                            <a
                              href={client.attachedDocUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#006064] hover:underline cursor-pointer whitespace-nowrap"
                              title={`View Document: ${client.attachedDocName || 'Attached PDF'}`}
                            >
                              <Eye size={12} />
                              <span>View Doc</span>
                            </a>
                          ) : (
                            <span className="text-gray-400 text-[10px] italic whitespace-nowrap">No Doc</span>
                          )}
                        </td>

                        {/* 9. Payment Receive Date (Dedicated Column) */}
                        <td
                          style={{
                            width: `${columnWidths.payReceiveDate}px`,
                            maxWidth: `${columnWidths.payReceiveDate}px`,
                          }}
                          className="p-1.5 bg-teal-50/20 overflow-hidden"
                        >
                          <input
                            type="date"
                            value={primaryPart.payReceiveDate}
                            onChange={(e) =>
                              updateDraftPartField(client.id, primaryPart.id, 'payReceiveDate', e.target.value)
                            }
                            className="w-full border border-gray-300 px-1.5 py-1 text-xs font-mono text-gray-900 bg-white focus:outline-none focus:border-[#006064]"
                          />
                          <div className="mt-1 flex items-center justify-between gap-1">
                            <button
                              type="button"
                              onClick={() => addSplitPart(client.id)}
                              className="inline-flex items-center gap-1 text-[9.5px] font-bold text-[#006064] hover:text-[#004d40] hover:underline cursor-pointer whitespace-nowrap"
                              title="Add another installment split"
                            >
                              <Plus size={10} /> Add Installment
                            </button>
                            {hasMultipleParts && (
                              <span className="px-1.5 py-0.2 bg-teal-100 border border-teal-200 text-[#006064] text-[8.5px] font-bold rounded-2xs font-mono shrink-0">
                                Part 1/{draft.parts.length}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 10. Received Amount (Dedicated Column) */}
                        <td
                          style={{
                            width: `${columnWidths.receiveAmount}px`,
                            maxWidth: `${columnWidths.receiveAmount}px`,
                          }}
                          className="p-1.5 bg-teal-50/20 overflow-hidden"
                        >
                          <div className="relative">
                            <input
                              type="number"
                              placeholder="0"
                              value={primaryPart.receiveAmount}
                              onChange={(e) =>
                                updateDraftPartField(client.id, primaryPart.id, 'receiveAmount', e.target.value)
                              }
                              className="w-full border border-gray-300 px-1.5 py-1 text-xs font-mono font-bold text-right text-gray-900 bg-white focus:outline-none focus:border-[#006064]"
                            />
                          </div>
                        </td>

                        {/* 11. Payment Mode (Dedicated Column) */}
                        <td
                          style={{
                            width: `${columnWidths.paymentMode}px`,
                            maxWidth: `${columnWidths.paymentMode}px`,
                          }}
                          className="p-1.5 bg-teal-50/20 overflow-hidden"
                        >
                          <select
                            value={primaryPart.paymentMode}
                            onChange={(e) =>
                              updateDraftPartField(client.id, primaryPart.id, 'paymentMode', e.target.value)
                            }
                            className="w-full border border-gray-300 px-1 py-1 text-[11px] font-semibold text-gray-800 bg-white focus:outline-none focus:border-[#006064] cursor-pointer"
                          >
                            {PAYMENT_MODES.map((mode) => (
                              <option key={mode} value={mode}>
                                {mode}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* 12. UTR / Ref No. (Dedicated Column) */}
                        <td
                          style={{
                            width: `${columnWidths.utrNumber}px`,
                            maxWidth: `${columnWidths.utrNumber}px`,
                          }}
                          className="p-1.5 bg-teal-50/20 overflow-hidden"
                        >
                          <input
                            type="text"
                            placeholder="UTR number"
                            value={primaryPart.utrNumber}
                            onChange={(e) =>
                              updateDraftPartField(client.id, primaryPart.id, 'utrNumber', e.target.value)
                            }
                            className="w-full border border-gray-300 px-1.5 py-1 text-xs font-mono text-gray-900 bg-white focus:outline-none focus:border-[#006064]"
                          />
                        </td>

                        {/* 13. Receipt Proof (Dedicated Column - Bank Name removed) */}
                        <td
                          style={{
                            width: `${columnWidths.receiptProof}px`,
                            maxWidth: `${columnWidths.receiptProof}px`,
                          }}
                          className="p-1.5 text-center bg-teal-50/20 overflow-hidden"
                        >
                          {primaryPart.utrFileUrl &&
                          primaryPart.utrFileUrl !== client.sdrPdfUrl &&
                          primaryPart.utrFileUrl !== client.attachedDocUrl &&
                          primaryPart.utrFileUrl !== client.agreementPdfUrl ? (
                            <div className="flex items-center justify-center gap-1">
                              <a
                                href={primaryPart.utrFileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-2xs hover:bg-emerald-100 cursor-pointer whitespace-nowrap"
                                title={primaryPart.utrFileName || 'View Uploaded Proof'}
                              >
                                <Eye size={11} /> Proof
                              </a>
                              <button
                                type="button"
                                onClick={() => triggerFileUpload(client.id, primaryPart.id)}
                                className="text-gray-400 hover:text-gray-700 p-0.5 shrink-0"
                                title="Change Proof File"
                              >
                                <Upload size={11} />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => triggerFileUpload(client.id, primaryPart.id)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-600 bg-white hover:bg-gray-100 border border-gray-300 px-2 py-0.5 rounded-2xs cursor-pointer shadow-2xs whitespace-nowrap"
                              title="Upload Receipt Proof"
                            >
                              <Upload size={10} /> Attach
                            </button>
                          )}
                        </td>

                        {/* 14. Remarks (Dedicated Column) */}
                        <td
                          style={{
                            width: `${columnWidths.remarks}px`,
                            maxWidth: `${columnWidths.remarks}px`,
                          }}
                          className="p-1.5 bg-teal-50/20 overflow-hidden"
                        >
                          <input
                            type="text"
                            placeholder="Remarks..."
                            value={primaryPart.remarks || ''}
                            onChange={(e) =>
                              updateDraftPartField(client.id, primaryPart.id, 'remarks', e.target.value)
                            }
                            className="w-full border border-gray-300 px-1.5 py-1 text-xs text-gray-700 bg-white focus:outline-none focus:border-[#006064]"
                          />
                        </td>
                      </tr>

                      {/* Additional Installment Sub-Rows (if multi-part) */}
                      {hasMultipleParts &&
                        draft.parts.slice(1).map((part, pIdx) => (
                          <tr
                            key={part.id}
                            className="divide-x divide-gray-200 bg-teal-50/10 border-t border-gray-100 hover:bg-teal-50/20 transition-colors"
                          >
                            {/* Empty or Installment Indicator for Left Columns */}
                            <td
                              style={{
                                width: `${columnWidths.srNo}px`,
                                maxWidth: `${columnWidths.srNo}px`,
                              }}
                              className="p-1.5 text-center text-[10px] font-mono text-gray-400 overflow-hidden"
                            >
                              ↳
                            </td>
                            <td
                              colSpan={7}
                              style={{
                                width: `${leftSubrowWidth}px`,
                                maxWidth: `${leftSubrowWidth}px`,
                              }}
                              className="p-1.5 text-right pr-4 overflow-hidden"
                            >
                              <div className="flex items-center justify-end gap-2 text-[10px] text-teal-800 font-bold truncate">
                                <span className="px-1.5 py-0.2 bg-teal-100 border border-teal-300 rounded-2xs font-mono">
                                  Installment #{pIdx + 2}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeSplitPart(client.id, part.id)}
                                  className="text-rose-600 hover:text-rose-800 p-0.5 cursor-pointer"
                                  title="Remove this installment"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </td>

                            {/* 9. Installment Date */}
                            <td
                              style={{
                                width: `${columnWidths.payReceiveDate}px`,
                                maxWidth: `${columnWidths.payReceiveDate}px`,
                              }}
                              className="p-1.5 bg-teal-50/20 overflow-hidden"
                            >
                              <input
                                type="date"
                                value={part.payReceiveDate}
                                onChange={(e) =>
                                  updateDraftPartField(client.id, part.id, 'payReceiveDate', e.target.value)
                                }
                                className="w-full border border-gray-300 px-1.5 py-1 text-xs font-mono text-gray-900 bg-white focus:outline-none focus:border-[#006064]"
                              />
                            </td>

                            {/* 10. Installment Amount */}
                            <td
                              style={{
                                width: `${columnWidths.receiveAmount}px`,
                                maxWidth: `${columnWidths.receiveAmount}px`,
                              }}
                              className="p-1.5 bg-teal-50/20 overflow-hidden"
                            >
                              <input
                                type="number"
                                placeholder="0"
                                value={part.receiveAmount}
                                onChange={(e) =>
                                  updateDraftPartField(client.id, part.id, 'receiveAmount', e.target.value)
                                }
                                className="w-full border border-gray-300 px-1.5 py-1 text-xs font-mono font-bold text-right text-gray-900 bg-white focus:outline-none focus:border-[#006064]"
                              />
                            </td>

                            {/* 11. Installment Mode */}
                            <td
                              style={{
                                width: `${columnWidths.paymentMode}px`,
                                maxWidth: `${columnWidths.paymentMode}px`,
                              }}
                              className="p-1.5 bg-teal-50/20 overflow-hidden"
                            >
                              <select
                                value={part.paymentMode}
                                onChange={(e) =>
                                  updateDraftPartField(client.id, part.id, 'paymentMode', e.target.value)
                                }
                                className="w-full border border-gray-300 px-1 py-1 text-[11px] font-semibold text-gray-800 bg-white focus:outline-none focus:border-[#006064] cursor-pointer"
                              >
                                {PAYMENT_MODES.map((mode) => (
                                  <option key={mode} value={mode}>
                                    {mode}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* 12. Installment UTR */}
                            <td
                              style={{
                                width: `${columnWidths.utrNumber}px`,
                                maxWidth: `${columnWidths.utrNumber}px`,
                              }}
                              className="p-1.5 bg-teal-50/20 overflow-hidden"
                            >
                              <input
                                type="text"
                                placeholder="UTR number"
                                value={part.utrNumber}
                                onChange={(e) =>
                                  updateDraftPartField(client.id, part.id, 'utrNumber', e.target.value)
                                }
                                className="w-full border border-gray-300 px-1.5 py-1 text-xs font-mono text-gray-900 bg-white focus:outline-none focus:border-[#006064]"
                              />
                            </td>

                            {/* 13. Installment Proof (Bank Name removed) */}
                            <td
                              style={{
                                width: `${columnWidths.receiptProof}px`,
                                maxWidth: `${columnWidths.receiptProof}px`,
                              }}
                              className="p-1.5 text-center bg-teal-50/20 overflow-hidden"
                            >
                              {part.utrFileUrl &&
                              part.utrFileUrl !== client.sdrPdfUrl &&
                              part.utrFileUrl !== client.attachedDocUrl &&
                              part.utrFileUrl !== client.agreementPdfUrl ? (
                                <div className="flex items-center justify-center gap-1">
                                  <a
                                    href={part.utrFileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-2xs hover:bg-emerald-100 cursor-pointer whitespace-nowrap"
                                    title={part.utrFileName || 'View Proof'}
                                  >
                                    <Eye size={11} /> Proof
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => triggerFileUpload(client.id, part.id)}
                                    className="text-gray-400 hover:text-gray-700 p-0.5 shrink-0"
                                    title="Change Proof File"
                                  >
                                    <Upload size={10} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => triggerFileUpload(client.id, part.id)}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-600 bg-white hover:bg-gray-100 border border-gray-300 px-2 py-0.5 rounded-2xs cursor-pointer shadow-2xs whitespace-nowrap"
                                  title="Upload Receipt Proof"
                                >
                                  <Upload size={10} /> Attach
                                </button>
                              )}
                            </td>

                            {/* 14. Installment Remarks */}
                            <td
                              style={{
                                width: `${columnWidths.remarks}px`,
                                maxWidth: `${columnWidths.remarks}px`,
                              }}
                              className="p-1.5 bg-teal-50/20 overflow-hidden"
                            >
                              <input
                                type="text"
                                placeholder="Remarks..."
                                value={part.remarks || ''}
                                onChange={(e) =>
                                  updateDraftPartField(client.id, part.id, 'remarks', e.target.value)
                                }
                                className="w-full border border-gray-300 px-1.5 py-1 text-xs text-gray-700 bg-white focus:outline-none focus:border-[#006064]"
                              />
                            </td>
                          </tr>
                        ))}

                      {/* Sub-row footer: Add another installment part spanning the payment receive section (columns 9 to 14) */}
                      {hasMultipleParts && (
                        <tr className="divide-x divide-gray-200 bg-teal-50/15 border-t border-dashed border-teal-200">
                          <td
                            colSpan={8}
                            style={{
                              width: `${columnWidths.srNo + leftSubrowWidth}px`,
                            }}
                            className="bg-transparent"
                          ></td>
                          <td
                            colSpan={6}
                            style={{
                              width: `${rightSubrowWidth}px`,
                              maxWidth: `${rightSubrowWidth}px`,
                            }}
                            className="p-1.5 bg-teal-50/30"
                          >
                            <button
                              type="button"
                              onClick={() => addSplitPart(client.id)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-[#006064] hover:text-[#004d40] hover:underline cursor-pointer"
                              title="Add another installment"
                            >
                              <Plus size={11} /> + Add Another Installment Part
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
    </div>
  );
}
