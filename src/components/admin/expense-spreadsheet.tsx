"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Save,
  Plus,
  Trash2,
  Download,
  Search,
  Loader2,
  FileSpreadsheet,
  Edit2,
  X,
  Lock,
  Unlock,
  Check,
  Columns,
  Cloud,
  CheckCircle2,
  EyeOff,
  Eye,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Paperclip,
  FileText,
  ExternalLink,
  GripVertical,
  Scissors,
  Copy,
  Trash,
  PlusCircle,
  Calendar,
  Filter,
  CheckSquare,
  Calculator,
  ClipboardPaste,
  Clipboard,
  Sigma
} from "lucide-react";
import { toast } from "sonner";

export interface ColumnConfig {
  id: string;
  label: string;
  type?: "text" | "number" | "date";
  width?: string;
}

export interface RowData {
  id: string;
  [key: string]: any;
}

interface ExpenseSpreadsheetProps {
  locationId: number;
  locationName: string;
  initialColumns: ColumnConfig[];
  initialRows: RowData[];
  isSuperAdmin?: boolean;
  onSaved?: () => void;
}

// ── DATE UTILITIES ──
const MONTHS_MAP: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
};
const MONTH_NAMES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function parseDateToTimestamp(raw: any): number | null {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str) return null;

  // 1. YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3])).getTime();
  }

  // 2. DD MMM YYYY (e.g. "01 APR 2026" or "19 AUG 2026")
  const textMatch = str.match(/^(\d{1,2})[\s\-\/]+([A-Za-z]{3,4})[\s\-\/]+(\d{4})/);
  if (textMatch) {
    const day = parseInt(textMatch[1]);
    const monthKey = textMatch[2].substring(0, 3).toLowerCase();
    const month = MONTHS_MAP[monthKey] !== undefined ? parseInt(MONTHS_MAP[monthKey]) - 1 : 0;
    const year = parseInt(textMatch[3]);
    return new Date(year, month, day).getTime();
  }

  // 3. DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1]);
    const month = parseInt(dmyMatch[2]) - 1;
    const year = parseInt(dmyMatch[3]);
    return new Date(year, month, day).getTime();
  }

  const parsed = Date.parse(str);
  return isNaN(parsed) ? null : parsed;
}

function formatIsoToDisplayDate(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length === 3) {
    const y = parseInt(parts[0]);
    const m = parseInt(parts[1]) - 1;
    const d = parseInt(parts[2]);
    const dayStr = d < 10 ? `0${d}` : `${d}`;
    const monthStr = MONTH_NAMES[m] || "JAN";
    return `${dayStr} ${monthStr} ${y}`;
  }
  return isoStr;
}

function parseToPickerDate(val: string): string {
  if (!val) return "";
  const ts = parseDateToTimestamp(val);
  if (!ts) return "";
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ── SPREADSHEET FORMULA & COORDINATE ENGINE (GOOGLE SHEETS / EXCEL COMPATIBLE) ──
export function getColLetter(colIdx: number): string {
  let letter = "";
  let temp = colIdx;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

export function parseCoordinate(coordStr: string): { colIdx: number; rowIdx: number } | null {
  const match = coordStr.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  const colLetter = match[1];
  const rowNum = parseInt(match[2]);
  if (isNaN(rowNum) || rowNum <= 0) return null;
  
  let colIdx = 0;
  for (let i = 0; i < colLetter.length; i++) {
    colIdx = colIdx * 26 + (colLetter.charCodeAt(i) - 64);
  }
  colIdx -= 1; // 0-indexed

  return { colIdx, rowIdx: rowNum - 1 };
}

export function getCellCoordinate(colIdx: number, rowIdx: number): string {
  return `${getColLetter(colIdx)}${rowIdx + 1}`;
}

export function getCellValueByCoord(
  colIdx: number,
  rowIdx: number,
  columns: ColumnConfig[],
  rows: RowData[],
  visited = new Set<string>()
): number {
  if (rowIdx < 0 || rowIdx >= rows.length) return 0;
  if (colIdx < 0 || colIdx >= columns.length) return 0;
  const col = columns[colIdx];
  const row = rows[rowIdx];
  if (!col || !row) return 0;

  const cellKey = `${colIdx},${rowIdx}`;
  if (visited.has(cellKey)) return 0;

  const val = row[col.id];
  if (val === undefined || val === null || val === '') return 0;

  if (typeof val === 'string' && val.startsWith('=')) {
    const nextVisited = new Set(visited);
    nextVisited.add(cellKey);
    const evalRes = evaluateFormula(val, columns, rows, nextVisited);
    if (typeof evalRes === 'number') return evalRes;
    const parsed = parseFloat(String(evalRes).replace(/[^0-9.-]+/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }

  const num = parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
  return isNaN(num) ? 0 : num;
}

export function getRangeValues(
  startCoord: string,
  endCoord: string,
  columns: ColumnConfig[],
  rows: RowData[],
  visited = new Set<string>()
): number[] {
  const start = parseCoordinate(startCoord);
  const end = parseCoordinate(endCoord);
  if (!start || !end) return [];

  const minCol = Math.min(start.colIdx, end.colIdx);
  const maxCol = Math.max(start.colIdx, end.colIdx);
  const minRow = Math.min(start.rowIdx, end.rowIdx);
  const maxRow = Math.max(start.rowIdx, end.rowIdx);

  const values: number[] = [];
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      values.push(getCellValueByCoord(c, r, columns, rows, visited));
    }
  }
  return values;
}

export function evaluateFormula(
  formula: string,
  columns: ColumnConfig[],
  rows: RowData[],
  visited = new Set<string>()
): any {
  if (!formula || typeof formula !== 'string' || !formula.startsWith('=')) return formula;

  let expr = formula.substring(1).trim();
  if (!expr) return 0;

  try {
    // 1. Handle SUM(...)
    expr = expr.replace(/SUM\s*\(([^)]+)\)/gi, (_, args) => {
      const parts = args.split(',');
      let sum = 0;
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.includes(':')) {
          const [s, e] = trimmed.split(':');
          const vals = getRangeValues(s, e, columns, rows, visited);
          sum += vals.reduce((a, b) => a + b, 0);
        } else {
          const parsed = parseCoordinate(trimmed);
          if (parsed) {
            sum += getCellValueByCoord(parsed.colIdx, parsed.rowIdx, columns, rows, visited);
          } else {
            const n = parseFloat(trimmed);
            if (!isNaN(n)) sum += n;
          }
        }
      }
      return String(sum);
    });

    // 2. Handle AVERAGE(...)
    expr = expr.replace(/AVERAGE\s*\(([^)]+)\)/gi, (_, args) => {
      const parts = args.split(',');
      const allVals: number[] = [];
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.includes(':')) {
          const [s, e] = trimmed.split(':');
          allVals.push(...getRangeValues(s, e, columns, rows, visited));
        } else {
          const parsed = parseCoordinate(trimmed);
          if (parsed) {
            allVals.push(getCellValueByCoord(parsed.colIdx, parsed.rowIdx, columns, rows, visited));
          } else {
            const n = parseFloat(trimmed);
            if (!isNaN(n)) allVals.push(n);
          }
        }
      }
      if (allVals.length === 0) return '0';
      const avg = allVals.reduce((a, b) => a + b, 0) / allVals.length;
      return String(Math.round(avg * 100) / 100);
    });

    // 3. Handle COUNT(...)
    expr = expr.replace(/COUNT\s*\(([^)]+)\)/gi, (_, args) => {
      const parts = args.split(',');
      let count = 0;
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.includes(':')) {
          const [s, e] = trimmed.split(':');
          count += getRangeValues(s, e, columns, rows, visited).filter(v => v !== 0).length;
        } else {
          count++;
        }
      }
      return String(count);
    });

    // 4. Handle MAX & MIN
    expr = expr.replace(/MAX\s*\(([^)]+)\)/gi, (_, args) => {
      const vals: number[] = [];
      args.split(',').forEach((p: string) => {
        const t = p.trim();
        if (t.includes(':')) {
          const [s, e] = t.split(':');
          vals.push(...getRangeValues(s, e, columns, rows, visited));
        } else {
          const coord = parseCoordinate(t);
          if (coord) vals.push(getCellValueByCoord(coord.colIdx, coord.rowIdx, columns, rows, visited));
        }
      });
      return vals.length > 0 ? String(Math.max(...vals)) : '0';
    });

    expr = expr.replace(/MIN\s*\(([^)]+)\)/gi, (_, args) => {
      const vals: number[] = [];
      args.split(',').forEach((p: string) => {
        const t = p.trim();
        if (t.includes(':')) {
          const [s, e] = t.split(':');
          vals.push(...getRangeValues(s, e, columns, rows, visited));
        } else {
          const coord = parseCoordinate(t);
          if (coord) vals.push(getCellValueByCoord(coord.colIdx, coord.rowIdx, columns, rows, visited));
        }
      });
      return vals.length > 0 ? String(Math.min(...vals)) : '0';
    });

    // 5. Replace standalone cell references (e.g. D1, D2, A5)
    expr = expr.replace(/\b([A-Za-z]+)(\d+)\b/g, (match) => {
      const parsed = parseCoordinate(match);
      if (!parsed) return '0';
      const val = getCellValueByCoord(parsed.colIdx, parsed.rowIdx, columns, rows, visited);
      return String(val);
    });

    // 6. Evaluate safe math expression
    const sanitized = expr.replace(/[^0-9+\-*/().% ]/g, '');
    if (!sanitized) return 0;

    const result = new Function(`return (${sanitized});`)();
    if (typeof result === 'number') {
      if (!isFinite(result) || isNaN(result)) return '#ERROR!';
      return Math.round(result * 100) / 100;
    }
    return result;
  } catch (err) {
    return '#ERROR!';
  }
}

export function getReferencedCoordinates(formula: string): string[] {
  if (!formula || typeof formula !== 'string' || !formula.startsWith('=')) return [];
  const coords = new Set<string>();

  // 1. Expand range references like D1:D7 or A1:C5
  const rangeRegex = /\b([A-Za-z]+)(\d+)\s*:\s*([A-Za-z]+)(\d+)\b/g;
  let rangeMatch;
  while ((rangeMatch = rangeRegex.exec(formula)) !== null) {
    const start = parseCoordinate(`${rangeMatch[1]}${rangeMatch[2]}`);
    const end = parseCoordinate(`${rangeMatch[3]}${rangeMatch[4]}`);
    if (start && end) {
      const minCol = Math.min(start.colIdx, end.colIdx);
      const maxCol = Math.max(start.colIdx, end.colIdx);
      const minRow = Math.min(start.rowIdx, end.rowIdx);
      const maxRow = Math.max(start.rowIdx, end.rowIdx);

      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          coords.add(getCellCoordinate(c, r));
        }
      }
    }
  }

  // 2. Individual cell references like D1, D2
  const singleRegex = /\b[A-Za-z]+\d+\b/g;
  let singleMatch;
  while ((singleMatch = singleRegex.exec(formula)) !== null) {
    coords.add(singleMatch[0].toUpperCase());
  }

  return Array.from(coords);
}

export function ExpenseSpreadsheet({
  locationId,
  locationName,
  initialColumns,
  initialRows,
  isSuperAdmin = false,
  onSaved
}: ExpenseSpreadsheetProps) {
  const [columns, setColumns] = useState<ColumnConfig[]>(initialColumns);
  const [rows, setRows] = useState<RowData[]>([]);
  const [editingCell, setEditingCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [cellValue, setCellValue] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const [lastSavedTime, setLastSavedTime] = useState<string>("");

  // Interactive Formula Range Dragging State (Google Sheets / Excel drag selection)
  const [isDraggingFormulaRange, setIsDraggingFormulaRange] = useState<boolean>(false);
  const formulaDragStartRef = useRef<{ colIdx: number; rowIdx: number; coord: string } | null>(null);
  const formulaDragPrefixRef = useRef<string>("");

  // Cell Attachment State (Attach PDF to cell)
  const [targetAttachCell, setTargetAttachCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [uploadingCell, setUploadingCell] = useState<{ rowId: string; colId: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Hidden Columns & Hidden Rows state (Google Sheets style)
  const [hiddenColIds, setHiddenColIds] = useState<string[]>([]);
  const [hiddenRowIds, setHiddenRowIds] = useState<string[]>([]);

  // Column Menu dropdown state
  const [activeColMenu, setActiveColMenu] = useState<string | null>(null);

  // Drag and Drop column movement
  const [draggedColId, setDraggedColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  // Right-click Context Menus
  const [cellContextMenu, setCellContextMenu] = useState<{
    x: number;
    y: number;
    rowId: string;
    colId: string;
    val: any;
  } | null>(null);

  const [rowContextMenu, setRowContextMenu] = useState<{
    x: number;
    y: number;
    rowId: string;
    rowIndex: number;
  } | null>(null);

  const [colContextMenu, setColContextMenu] = useState<{
    x: number;
    y: number;
    colId: string;
    colIndex: number;
    label: string;
  } | null>(null);

  // ── MULTI-CELL RANGE SELECTION (GOOGLE SHEETS / EXCEL STYLE) ──
  const [selectedCell, setSelectedCell] = useState<{
    rowId: string;
    colId: string;
    rowIdx: number;
    colIdx: number;
  } | null>(null);

  const [selectedRange, setSelectedRange] = useState<{
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  } | null>(null);
  const [isDraggingSelection, setIsDraggingSelection] = useState<boolean>(false);

  const selectionBounds = useMemo(() => {
    if (!selectedRange) return null;
    return {
      minRow: Math.min(selectedRange.startRow, selectedRange.endRow),
      maxRow: Math.max(selectedRange.startRow, selectedRange.endRow),
      minCol: Math.min(selectedRange.startCol, selectedRange.endCol),
      maxCol: Math.max(selectedRange.startCol, selectedRange.endCol),
    };
  }, [selectedRange]);

  const isMultiCellSelected = useMemo(() => {
    if (!selectionBounds) return false;
    return (
      selectionBounds.minRow !== selectionBounds.maxRow ||
      selectionBounds.minCol !== selectionBounds.maxCol
    );
  }, [selectionBounds]);

  // ── CSV EXPORT MODAL STATE ──
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false);
  const [csvScope, setCsvScope] = useState<"current" | "all">("current");
  const [csvDateFilter, setCsvDateFilter] = useState<"all" | "this_month" | "last_month" | "this_fy" | "custom">("all");
  const [csvCustomFrom, setCsvCustomFrom] = useState<string>("");
  const [csvCustomTo, setCsvCustomTo] = useState<string>("");
  const [allSheetsData, setAllSheetsData] = useState<any[]>([]);
  const [loadingAllSheets, setLoadingAllSheets] = useState<boolean>(false);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestDataRef = useRef({ columns, rows });
  const hasPingedFms = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dateNativePickerRef = useRef<HTMLInputElement | null>(null);
  const prevLocationIdRef = useRef<number | null>(null);

  // Global mouseup listener for multi-cell and formula range drag-selection
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (formulaDragStartRef.current) {
        setIsDraggingFormulaRange(false);
        formulaDragStartRef.current = null;
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }
      setIsDraggingSelection(false);
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, []);

  // Keep latestDataRef synchronized
  useEffect(() => {
    latestDataRef.current = { columns, rows };
  }, [columns, rows]);

  // Column renaming state
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [colLabelInput, setColLabelInput] = useState<string>("");

  // Freeze Settings
  const [freezeHeader, setFreezeHeader] = useState<boolean>(true);
  const [freezeFirstCol, setFreezeFirstCol] = useState<boolean>(true);

  // Focus and select input text whenever editingCell changes
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  // Close menus on outside click / escape
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveColMenu(null);
      setCellContextMenu(null);
      setRowContextMenu(null);
      setColContextMenu(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveColMenu(null);
        setCellContextMenu(null);
        setRowContextMenu(null);
        setColContextMenu(null);
        setIsCsvModalOpen(false);
      }
    };
    window.addEventListener("click", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Auto-focus and select active cell input for instant editing on Arrow/Tab/Enter navigation
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      if (!cellValue.startsWith("=")) {
        inputRef.current.select();
      }
    }
  }, [editingCell?.rowId, editingCell?.colId]);

  const notifyFmsTyping = () => {
    if (hasPingedFms.current) return;
    hasPingedFms.current = true;
    fetch('/api/admin/expenses/fms-track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationId, centerName: locationName })
    }).catch(() => {});
  };

  // Helper to check if a column is a Date column
  const isDateCol = (colId: string) => {
    const col = columns.find(c => c.id === colId);
    if (!col) return false;
    return col.id === "col_1" || col.type === "date" || col.label.toLowerCase().includes("date");
  };

  // Initialize and ensure 100 rows exist out of the box (ONLY on location change, never while typing!)
  useEffect(() => {
    if (prevLocationIdRef.current === locationId && rows.length > 0) {
      return; // Already initialized for this center, keep active working state!
    }
    prevLocationIdRef.current = locationId;

    const defaultCols: ColumnConfig[] = initialColumns.length > 0 ? initialColumns : [
      { id: 'col_1', label: 'Date', width: '140px', type: 'date' },
      { id: 'col_2', label: 'Expense Category / Item', width: '220px', type: 'text' },
      { id: 'col_3', label: 'Vendor / Paid To', width: '180px', type: 'text' },
      { id: 'col_4', label: 'Amount (₹)', width: '140px', type: 'number' },
      { id: 'col_5', label: 'Payment Mode', width: '140px', type: 'text' },
      { id: 'col_6', label: 'Receipt / Ref #', width: '140px', type: 'text' },
      { id: 'col_7', label: 'Remarks / Notes', width: '240px', type: 'text' },
    ];
    setColumns(defaultCols);

    // Ensure all rows have strictly unique IDs
    const existingIds = new Set<string>();
    const sanitizedRows: RowData[] = [];

    (initialRows || []).forEach((r, idx) => {
      let rId = r?.id ? String(r.id) : `row_${idx + 1}`;
      if (existingIds.has(rId)) {
        rId = `row_${idx + 1}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      }
      existingIds.add(rId);
      sanitizedRows.push({ ...r, id: rId });
    });

    while (sanitizedRows.length < 100) {
      const rowIdx = sanitizedRows.length + 1;
      let newId = `row_${rowIdx}`;
      if (existingIds.has(newId)) {
        newId = `row_${rowIdx}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      }
      existingIds.add(newId);
      sanitizedRows.push({ id: newId });
    }

    setRows(sanitizedRows);
    latestDataRef.current = { columns: defaultCols, rows: sanitizedRows };
    setHasChanges(false);
    setAutoSaveStatus("saved");
  }, [locationId, initialColumns, initialRows]);

  // Unified silent background save routine (zero disruption to user)
  const saveToServer = async (isSilent = true) => {
    try {
      if (!isSilent) setSaving(true);
      setAutoSaveStatus("saving");
      notifyFmsTyping();

      const res = await fetch(`/api/admin/expenses/${locationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${locationName} Expense Sheet`,
          columns: latestDataRef.current.columns,
          rows: latestDataRef.current.rows
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to save expense sheet");
      }

      setHasChanges(false);
      setAutoSaveStatus("saved");
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      if (!isSilent) {
        toast.success(`${locationName} Expense Sheet saved successfully!`);
      }
    } catch (err: any) {
      console.error("Expense auto-save error:", err);
      setAutoSaveStatus("error");
      if (!isSilent) {
        toast.error(err.message || "Failed to save sheet");
      }
    } finally {
      if (!isSilent) setSaving(false);
    }
  };

  // Schedule auto-save on any edit (debounced 1200ms for silent, smooth background saving)
  const scheduleAutoSave = (newCols?: ColumnConfig[], newRows?: RowData[]) => {
    setHasChanges(true);
    setAutoSaveStatus("unsaved");
    if (newCols || newRows) {
      latestDataRef.current = {
        columns: newCols || latestDataRef.current.columns,
        rows: newRows || latestDataRef.current.rows
      };
    }
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      saveToServer(true);
    }, 1200);
  };

  // Manual save trigger
  const handleManualSave = () => {
    commitCurrentCell();
    saveToServer(false);
  };

  // Visible columns and rows
  const visibleColumns = useMemo(() => {
    return columns.filter((col) => !hiddenColIds.includes(col.id));
  }, [columns, hiddenColIds]);

  const visibleRows = useMemo(() => {
    let filtered = rows.filter((r) => !hiddenRowIds.includes(r.id));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((r) => {
        return Object.entries(r).some(([key, val]) => {
          if (key === "id") return false;
          return String(val || "").toLowerCase().includes(q);
        });
      });
    }
    return filtered;
  }, [rows, hiddenRowIds, searchQuery]);

  // Statistics for selected range (Sum, Average, Count) like Excel status bar
  const selectionStats = useMemo(() => {
    if (!selectionBounds || !isMultiCellSelected) return null;
    const { minRow, maxRow, minCol, maxCol } = selectionBounds;
    let sum = 0;
    let numCount = 0;
    let totalCells = 0;
    let min = Infinity;
    let max = -Infinity;

    for (let r = minRow; r <= maxRow; r++) {
      const row = visibleRows[r];
      if (!row) continue;
      for (let c = minCol; c <= maxCol; c++) {
        totalCells++;
        const col = visibleColumns[c];
        if (!col) continue;
        const val = row[col.id];
        if (val !== undefined && val !== null && val !== "") {
          const num = parseFloat(String(val).replace(/[^0-9.-]+/g, ""));
          if (!isNaN(num)) {
            sum += num;
            numCount++;
            if (num < min) min = num;
            if (num > max) max = num;
          }
        }
      }
    }

    const startCoord = getCellCoordinate(minCol, minRow);
    const endCoord = getCellCoordinate(maxCol, maxRow);

    return {
      rangeCoord: `${startCoord}:${endCoord}`,
      totalCells,
      numCount,
      sum: numCount > 0 ? sum : null,
      avg: numCount > 0 ? sum / numCount : null,
      min: numCount > 0 ? min : null,
      max: numCount > 0 ? max : null,
    };
  }, [selectionBounds, isMultiCellSelected, visibleRows, visibleColumns]);

  // Active formula referencing coordinates
  const referencedCoords = useMemo(() => {
    if (editingCell && cellValue.startsWith("=")) {
      return getReferencedCoordinates(cellValue);
    }
    return [];
  }, [editingCell, cellValue]);

  // Live Formula Result for Formula Assistant
  const liveFormulaResult = useMemo(() => {
    if (editingCell && cellValue.startsWith("=")) {
      return evaluateFormula(cellValue, visibleColumns, rows);
    }
    return null;
  }, [editingCell, cellValue, visibleColumns, rows]);

  // Total amount computed across all visible rows
  const totalAmount = useMemo(() => {
    const amountCol = columns.find(
      (c) =>
        c.label.toLowerCase().includes("amount") ||
        c.id.toLowerCase().includes("amount")
    );
    if (!amountCol) return 0;
    return rows.reduce((acc, row) => {
      let raw = row[amountCol.id];
      if (!raw) return acc;
      if (typeof raw === "string" && raw.startsWith("=")) {
        raw = evaluateFormula(raw, visibleColumns, rows);
      }
      const num = parseFloat(String(raw).replace(/[^0-9.-]+/g, ""));
      return !isNaN(num) ? acc + num : acc;
    }, 0);
  }, [rows, columns, visibleColumns]);

  // ── MULTI-CELL DRAG SELECTION & FORMULA DRAG SELECTION (GOOGLE SHEETS / EXCEL STYLE) ──
  const handleCellMouseDown = (rowId: string, colId: string, e: React.MouseEvent) => {
    // Only proceed on Left mouse button
    if (e.button !== 0) return;

    const colIndex = visibleColumns.findIndex((c) => c.id === colId);
    const rowIndex = visibleRows.findIndex((r) => r.id === rowId);
    if (colIndex === -1 || rowIndex === -1) return;

    // ── FORMULA MODE DRAG (= MODE) ──
    if (editingCell && cellValue.startsWith("=")) {
      if (editingCell.rowId === rowId && editingCell.colId === colId) {
        return;
      }
      e.preventDefault();
      const coord = getCellCoordinate(colIndex, rowIndex);
      setIsDraggingFormulaRange(true);
      formulaDragStartRef.current = { colIdx: colIndex, rowIdx: rowIndex, coord };

      let prefix = cellValue.trim();
      if (prefix === "=" || prefix === "=SUM" || prefix === "=SUM()") {
        formulaDragPrefixRef.current = "=SUM(";
        setCellValue(`=SUM(${coord})`);
      } else if (prefix.endsWith("(") || prefix.endsWith(",")) {
        formulaDragPrefixRef.current = prefix;
        setCellValue(`${prefix}${coord})`);
      } else if (/[+\-*/]$/.test(prefix)) {
        formulaDragPrefixRef.current = `${prefix}SUM(`;
        setCellValue(`${prefix}${coord})`);
      } else if (prefix.endsWith(")")) {
        formulaDragPrefixRef.current = `${prefix}+SUM(`;
        setCellValue(`${prefix}+SUM(${coord})`);
      } else {
        formulaDragPrefixRef.current = "=SUM(";
        setCellValue(`=SUM(${coord})`);
      }
      return;
    }

    // ── NORMAL MULTI-CELL DRAG SELECTION ──
    if (e.shiftKey && selectedCell) {
      e.preventDefault();
      setSelectedRange({
        startRow: selectedCell.rowIdx,
        startCol: selectedCell.colIdx,
        endRow: rowIndex,
        endCol: colIndex,
      });
      return;
    }

    // If editing another cell, commit and close its input editor
    if (editingCell && (editingCell.rowId !== rowId || editingCell.colId !== colId)) {
      commitCurrentCell();
      setEditingCell(null);
    }

    // Start drag selection across cells
    setIsDraggingSelection(true);
    setSelectedCell({
      rowId,
      colId,
      rowIdx: rowIndex,
      colIdx: colIndex,
    });
    setSelectedRange({
      startRow: rowIndex,
      startCol: colIndex,
      endRow: rowIndex,
      endCol: colIndex,
    });
  };

  const handleCellMouseEnter = (rowId: string, colId: string) => {
    const colIndex = visibleColumns.findIndex((c) => c.id === colId);
    const rowIndex = visibleRows.findIndex((r) => r.id === rowId);
    if (colIndex === -1 || rowIndex === -1) return;

    // Formula drag
    if (isDraggingFormulaRange && formulaDragStartRef.current && editingCell && cellValue.startsWith("=")) {
      const currentCoord = getCellCoordinate(colIndex, rowIndex);
      const startCoord = formulaDragStartRef.current.coord;

      let rangeStr = startCoord;
      if (startCoord !== currentCoord) {
        rangeStr = `${startCoord}:${currentCoord}`;
      }

      const prefix = formulaDragPrefixRef.current;
      if (prefix.endsWith("(")) {
        setCellValue(`${prefix}${rangeStr})`);
      } else {
        setCellValue(`${prefix}${rangeStr}`);
      }
      return;
    }

    // Normal multi-cell drag selection
    if (isDraggingSelection && selectedCell) {
      setSelectedRange({
        startRow: selectedCell.rowIdx,
        startCol: selectedCell.colIdx,
        endRow: rowIndex,
        endCol: colIndex,
      });
    }
  };

  // Start editing a cell on click or click to add cell coordinate in formula mode
  const handleCellClick = (rowId: string, colId: string, currentValue: any) => {
    notifyFmsTyping();

    // ── INTERACTIVE FORMULA CELL SELECTION (= MODE) ──
    if (editingCell && cellValue.startsWith("=")) {
      if (editingCell.rowId === rowId && editingCell.colId === colId) {
        return;
      }

      const targetColIdx = visibleColumns.findIndex((c) => c.id === colId);
      const targetRowIdx = visibleRows.findIndex((r) => r.id === rowId);

      if (targetColIdx !== -1 && targetRowIdx !== -1) {
        const coord = getCellCoordinate(targetColIdx, targetRowIdx);
        let newFormula = cellValue;
        const trimmed = cellValue.trim();

        if (trimmed === "=") {
          newFormula = `=${coord}`;
        } else if (/[+\-*/,(]$/.test(trimmed)) {
          newFormula = `${trimmed}${coord}`;
        } else if (/:\s*$/.test(trimmed)) {
          newFormula = `${trimmed}${coord}`;
        } else if (/\b[A-Za-z]+\d+\b$/.test(trimmed) && trimmed.toUpperCase().includes("SUM(") && !trimmed.includes(":") && !trimmed.endsWith(")")) {
          newFormula = trimmed.replace(/(\b[A-Za-z]+\d+\b)$/, `$1:${coord}`);
        } else if (/\b[A-Za-z]+\d+\b$/.test(trimmed)) {
          newFormula = `${trimmed}+${coord}`;
        } else {
          newFormula = `${trimmed}${coord}`;
        }

        setCellValue(newFormula);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 10);
        return;
      }
    }

    // Normal single-cell click: select cell without opening input (like Excel / Google Sheets)
    const colIndex = visibleColumns.findIndex((c) => c.id === colId);
    const rowIndex = visibleRows.findIndex((r) => r.id === rowId);
    if (colIndex !== -1 && rowIndex !== -1) {
      setSelectedCell({
        rowId,
        colId,
        rowIdx: rowIndex,
        colIdx: colIndex,
      });
      setSelectedRange({
        startRow: rowIndex,
        startCol: colIndex,
        endRow: rowIndex,
        endCol: colIndex,
      });
    }

    if (editingCell && (editingCell.rowId !== rowId || editingCell.colId !== colId)) {
      commitCurrentCell();
      setEditingCell(null);
    }
  };

  // Double click to enter text edit mode
  const handleCellDoubleClick = (rowId: string, colId: string, currentValue: any) => {
    notifyFmsTyping();
    const colIndex = visibleColumns.findIndex((c) => c.id === colId);
    const rowIndex = visibleRows.findIndex((r) => r.id === rowId);
    if (colIndex !== -1 && rowIndex !== -1) {
      setSelectedCell({
        rowId,
        colId,
        rowIdx: rowIndex,
        colIdx: colIndex,
      });
      setSelectedRange({
        startRow: rowIndex,
        startCol: colIndex,
        endRow: rowIndex,
        endCol: colIndex,
      });
    }
    setEditingCell({ rowId, colId });
    const strVal = currentValue !== undefined && currentValue !== null ? String(currentValue) : "";
    setCellValue(strVal);

    if (isDateCol(colId)) {
      setTimeout(() => {
        try {
          dateNativePickerRef.current?.showPicker();
        } catch (err) {}
      }, 50);
    }
  };

  // Save current cell content into state and auto-save
  const commitCurrentCell = (): RowData[] => {
    if (!editingCell) return rows;
    notifyFmsTyping();
    const { rowId, colId } = editingCell;

    const updatedRows = rows.map((r) => {
      if (r.id === rowId) {
        return { ...r, [colId]: cellValue };
      }
      return r;
    });

    setRows(updatedRows);
    scheduleAutoSave(undefined, updatedRows);
    return updatedRows;
  };

  // Cell Blur Save
  const handleCellBlur = () => {
    commitCurrentCell();
    setEditingCell(null);
  };

  // ── CELL ATTACHMENT HANDLERS ──
  const handleTriggerAttachPdf = (rowId: string, colId: string) => {
    notifyFmsTyping();
    setCellContextMenu(null);
    setTargetAttachCell({ rowId, colId });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetAttachCell) return;

    const { rowId, colId } = targetAttachCell;
    setUploadingCell({ rowId, colId });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload-pdf", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to upload document");
      }

      const data = await res.json();
      const fileUrl = data.data?.fileUrl || data.fileUrl;

      if (!fileUrl) {
        throw new Error("No file URL returned from upload");
      }

      const updatedRows = rows.map((r) => {
        if (r.id === rowId) {
          return { ...r, [colId]: fileUrl };
        }
        return r;
      });

      setRows(updatedRows);
      if (editingCell?.rowId === rowId && editingCell?.colId === colId) {
        setCellValue(fileUrl);
      }
      scheduleAutoSave(undefined, updatedRows);
      toast.success(`PDF attached to cell: ${file.name}`);
    } catch (err: any) {
      console.error("PDF upload error:", err);
      toast.error(err.message || "Failed to attach PDF");
    } finally {
      setUploadingCell(null);
      setTargetAttachCell(null);
    }
  };

  const handleRemoveAttachment = (rowId: string, colId: string) => {
    notifyFmsTyping();
    setCellContextMenu(null);
    const updatedRows = rows.map((r) => {
      if (r.id === rowId) {
        return { ...r, [colId]: "" };
      }
      return r;
    });
    setRows(updatedRows);
    if (editingCell?.rowId === rowId && editingCell?.colId === colId) {
      setCellValue("");
    }
    scheduleAutoSave(undefined, updatedRows);
    toast.info("Attachment removed from cell");
  };

  // ── CELL RIGHT-CLICK CONTEXT MENU ──
  const handleCellContextMenu = (e: React.MouseEvent, rowId: string, colId: string, val: any) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingCell({ rowId, colId });
    setCellValue(val !== undefined && val !== null ? String(val) : "");
    setCellContextMenu({
      x: e.clientX,
      y: e.clientY,
      rowId,
      colId,
      val
    });
  };

  const handleCopyCell = (val?: any) => {
    if (selectionBounds && isMultiCellSelected) {
      const { minRow, maxRow, minCol, maxCol } = selectionBounds;
      const lines: string[] = [];
      for (let r = minRow; r <= maxRow; r++) {
        const targetRow = visibleRows[r];
        if (!targetRow) continue;
        const rowVals: string[] = [];
        for (let c = minCol; c <= maxCol; c++) {
          const targetCol = visibleColumns[c];
          if (!targetCol) continue;
          const v = targetRow[targetCol.id];
          rowVals.push(v !== undefined && v !== null ? String(v) : "");
        }
        lines.push(rowVals.join("\t"));
      }
      navigator.clipboard.writeText(lines.join("\n"));
      const rowsCount = maxRow - minRow + 1;
      const colsCount = maxCol - minCol + 1;
      toast.success(`Copied ${rowsCount} row(s) × ${colsCount} col(s) (${rowsCount * colsCount} cells) to clipboard`);
    } else if (val !== undefined && val !== null) {
      navigator.clipboard.writeText(String(val));
      toast.success("Copied cell value to clipboard");
    } else {
      const rId = selectedCell?.rowId || editingCell?.rowId;
      const cId = selectedCell?.colId || editingCell?.colId;
      if (rId && cId) {
        const row = rows.find((r) => r.id === rId);
        if (row && row[cId] !== undefined) {
          navigator.clipboard.writeText(String(row[cId] || ""));
          toast.success("Copied cell value to clipboard");
        }
      }
    }
    setCellContextMenu(null);
  };

  const handleCutCell = (rowId?: string, colId?: string, val?: any) => {
    handleCopyCell(val);
    handleClearCell(rowId, colId);
    setCellContextMenu(null);
  };

  const handleClearCell = (rowId?: string, colId?: string) => {
    if (selectionBounds && isMultiCellSelected) {
      const { minRow, maxRow, minCol, maxCol } = selectionBounds;
      const targetRowIds = new Set<string>();
      for (let r = minRow; r <= maxRow; r++) {
        if (visibleRows[r]) targetRowIds.add(visibleRows[r].id);
      }
      const targetColIds = new Set<string>();
      for (let c = minCol; c <= maxCol; c++) {
        if (visibleColumns[c]) targetColIds.add(visibleColumns[c].id);
      }

      let clearedCount = 0;
      const updatedRows = rows.map((row) => {
        if (targetRowIds.has(row.id)) {
          const newRow = { ...row };
          targetColIds.forEach((cId) => {
            if (newRow[cId] !== "") {
              newRow[cId] = "";
              clearedCount++;
            }
          });
          return newRow;
        }
        return row;
      });

      setRows(updatedRows);
      scheduleAutoSave(undefined, updatedRows);
      setCellValue("");
      toast.info(`Cleared ${clearedCount} cell(s)`);
    } else {
      const rId = rowId || selectedCell?.rowId || editingCell?.rowId;
      const cId = colId || selectedCell?.colId || editingCell?.colId;
      if (rId && cId) {
        const updatedRows = rows.map((r) => (r.id === rId ? { ...r, [cId]: "" } : r));
        setRows(updatedRows);
        if (editingCell?.rowId === rId && editingCell?.colId === cId) {
          setCellValue("");
        }
        scheduleAutoSave(undefined, updatedRows);
        toast.info("Cleared cell");
      }
    }
    setCellContextMenu(null);
  };

  // ── CELL NAVIGATION HELPER ──
  const navigateCell = (targetRowIdx: number, targetColIdx: number, baseRows?: RowData[], keepEditing = false) => {
    let currentWorkingRows = baseRows || rows;

    if (targetRowIdx < 0) return;
    if (targetColIdx < 0 || targetColIdx >= visibleColumns.length) return;

    // Auto-create rows if moving past existing rows (smooth endless scrolling/typing)
    if (targetRowIdx >= currentWorkingRows.length) {
      const newRows = [...currentWorkingRows];
      while (newRows.length <= targetRowIdx) {
        const newRowId = `row_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        newRows.push({ id: newRowId });
      }
      currentWorkingRows = newRows;
      setRows(newRows);
      scheduleAutoSave(undefined, newRows);
    }

    const targetRow = currentWorkingRows[targetRowIdx];
    const targetCol = visibleColumns[targetColIdx];
    if (!targetRow || !targetCol) return;

    setSelectedCell({
      rowId: targetRow.id,
      colId: targetCol.id,
      rowIdx: targetRowIdx,
      colIdx: targetColIdx,
    });

    setSelectedRange({
      startRow: targetRowIdx,
      startCol: targetColIdx,
      endRow: targetRowIdx,
      endCol: targetColIdx,
    });

    if (keepEditing) {
      const nextVal = targetRow[targetCol.id];
      setEditingCell({ rowId: targetRow.id, colId: targetCol.id });
      setCellValue(nextVal !== undefined && nextVal !== null ? String(nextVal) : "");
    } else {
      setEditingCell(null);
    }
  };

  // ── KEYBOARD NAVIGATION (EXCEL / GOOGLE SHEETS LIKE) ──
  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!editingCell) return;

    const currentRowIndex = visibleRows.findIndex((r) => r.id === editingCell.rowId);
    const currentColIndex = visibleColumns.findIndex((c) => c.id === editingCell.colId);

    if (currentRowIndex === -1 || currentColIndex === -1) return;

    const input = e.currentTarget;
    const isAtStart = input.selectionStart === 0 && input.selectionEnd === 0;
    const isAtEnd = input.selectionStart === input.value.length;
    const isAllSelected = input.selectionStart === 0 && input.selectionEnd === input.value.length;

    // 1. ENTER (Move down)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const updatedRows = commitCurrentCell();
      navigateCell(currentRowIndex + 1, currentColIndex, updatedRows);
      return;
    }

    // 2. SHIFT + ENTER (Move up)
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      const updatedRows = commitCurrentCell();
      if (currentRowIndex > 0) {
        navigateCell(currentRowIndex - 1, currentColIndex, updatedRows);
      }
      return;
    }

    // 3. TAB (Move right / wrap to next row)
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      const updatedRows = commitCurrentCell();
      if (currentColIndex + 1 < visibleColumns.length) {
        navigateCell(currentRowIndex, currentColIndex + 1, updatedRows);
      } else {
        navigateCell(currentRowIndex + 1, 0, updatedRows);
      }
      return;
    }

    // 4. SHIFT + TAB (Move left / wrap to prev row)
    if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      const updatedRows = commitCurrentCell();
      if (currentColIndex > 0) {
        navigateCell(currentRowIndex, currentColIndex - 1, updatedRows);
      } else if (currentRowIndex > 0) {
        navigateCell(currentRowIndex - 1, visibleColumns.length - 1, updatedRows);
      }
      return;
    }

    // 5. ARROW UP (Move to cell above)
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const updatedRows = commitCurrentCell();
      if (currentRowIndex > 0) {
        navigateCell(currentRowIndex - 1, currentColIndex, updatedRows);
      }
      return;
    }

    // 6. ARROW DOWN (Move to cell below)
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const updatedRows = commitCurrentCell();
      navigateCell(currentRowIndex + 1, currentColIndex, updatedRows);
      return;
    }

    // 7. ARROW LEFT (Move to left cell when cursor at beginning)
    if (e.key === "ArrowLeft" && (isAtStart || isAllSelected || input.value === "")) {
      if (currentColIndex > 0) {
        e.preventDefault();
        const updatedRows = commitCurrentCell();
        navigateCell(currentRowIndex, currentColIndex - 1, updatedRows);
      }
      return;
    }

    // 8. ARROW RIGHT (Move to right cell when cursor at end)
    if (e.key === "ArrowRight" && (isAtEnd || isAllSelected || input.value === "")) {
      if (currentColIndex + 1 < visibleColumns.length) {
        e.preventDefault();
        const updatedRows = commitCurrentCell();
        navigateCell(currentRowIndex, currentColIndex + 1, updatedRows);
      }
      return;
    }

    // 9. ESCAPE (Exit editing)
    if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  // ── MULTI-CELL COPY / PASTE LOGIC (GOOGLE SHEETS & EXCEL COMPATIBLE) ──
  const pasteGridData = (text: string, explicitRowId?: string, explicitColId?: string) => {
    if (!text) return;

    // Normalize newlines (handles both Windows \r\n and Unix \n)
    const rawRows = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    // Trim trailing empty line from Excel/Google Sheets copy
    if (rawRows.length > 1 && rawRows[rawRows.length - 1].trim() === "") {
      rawRows.pop();
    }

    const grid = rawRows.map((line) => {
      return line.split("\t").map((cell) => {
        let cleaned = cell.trim();
        // Remove enclosing quotes if Excel quoted it
        if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
          cleaned = cleaned.slice(1, -1).replace(/""/g, '"');
        }
        return cleaned;
      });
    });

    if (grid.length === 0) return;

    const targetRowId =
      explicitRowId ||
      selectedCell?.rowId ||
      editingCell?.rowId ||
      (selectionBounds ? visibleRows[selectionBounds.minRow]?.id : visibleRows[0]?.id);

    const targetColId =
      explicitColId ||
      selectedCell?.colId ||
      editingCell?.colId ||
      (selectionBounds ? visibleColumns[selectionBounds.minCol]?.id : visibleColumns[0]?.id);

    if (!targetRowId || !targetColId) return;

    const startRowIdx = visibleRows.findIndex((r) => r.id === targetRowId);
    const startColIdx = visibleColumns.findIndex((c) => c.id === targetColId);

    if (startRowIdx === -1 || startColIdx === -1) return;

    let updatedRows = [...rows];
    const neededRowsCount = startRowIdx + grid.length;
    while (updatedRows.length < neededRowsCount) {
      const newRowId = `row_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      updatedRows.push({ id: newRowId });
    }

    let cellsCount = 0;
    const maxColsPasted = Math.max(...grid.map((r) => r.length));

    for (let r = 0; r < grid.length; r++) {
      const rowData = grid[r];
      const vRow = visibleRows[startRowIdx + r] || updatedRows[startRowIdx + r];
      if (!vRow) continue;

      const rIndex = updatedRows.findIndex((row) => row.id === vRow.id);
      if (rIndex === -1) continue;

      const newRowObj = { ...updatedRows[rIndex] };
      for (let c = 0; c < rowData.length; c++) {
        const targetColIndex = startColIdx + c;
        if (targetColIndex < visibleColumns.length) {
          const targetCol = visibleColumns[targetColIndex];
          newRowObj[targetCol.id] = rowData[c];
          cellsCount++;
        }
      }
      updatedRows[rIndex] = newRowObj;
    }

    setRows(updatedRows);
    latestDataRef.current = { columns, rows: updatedRows };
    scheduleAutoSave(undefined, updatedRows);

    // Sync cellValue with the first pasted value
    const firstPastedVal = grid[0][0] !== undefined ? grid[0][0] : "";
    setCellValue(firstPastedVal);

    // Exit in-cell input editing mode so blur cannot overwrite pasted values
    if (inputRef.current) {
      inputRef.current.blur();
    }
    setEditingCell(null);

    // Set selection box and selectedCell around the newly pasted block
    const endRow = startRowIdx + grid.length - 1;
    const endCol = Math.min(visibleColumns.length - 1, startColIdx + maxColsPasted - 1);
    setSelectedRange({
      startRow: startRowIdx,
      startCol: startColIdx,
      endRow,
      endCol,
    });
    setSelectedCell({
      rowId: targetRowId,
      colId: targetColId,
      rowIdx: startRowIdx,
      colIdx: startColIdx,
    });

    toast.success(`Pasted ${grid.length} row(s) × ${maxColsPasted} col(s) (${cellsCount} cells)`);
  };

  const handleCellPaste = (
    e: React.ClipboardEvent<HTMLInputElement | HTMLTableCellElement>,
    startRowId?: string,
    startColId?: string
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const targetRowId =
      startRowId ||
      selectedCell?.rowId ||
      editingCell?.rowId ||
      (selectionBounds ? visibleRows[selectionBounds.minRow]?.id : visibleRows[0]?.id);
    const targetColId =
      startColId ||
      selectedCell?.colId ||
      editingCell?.colId ||
      (selectionBounds ? visibleColumns[selectionBounds.minCol]?.id : visibleColumns[0]?.id);

    if (!targetRowId || !targetColId) return;

    const clipboardText = e.clipboardData.getData("text/plain");
    if (!clipboardText) return;

    pasteGridData(clipboardText, targetRowId, targetColId);
  };

  const handlePasteFromClipboardMenu = async (rowId: string, colId: string) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        pasteGridData(text, rowId, colId);
      } else {
        toast.info("Clipboard is empty");
      }
    } catch (err) {
      toast.error("Clipboard access blocked by browser. Please click the cell and press Ctrl+V to paste.");
    }
    setCellContextMenu(null);
  };

  // ── GLOBAL KEYBOARD LISTENERS FOR SPREADSHEET (CTRL+C, CTRL+X, CTRL+A, DELETE, SHIFT+ARROWS, ARROW KEYS, TYPING) ──
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInsideSpreadsheet =
        activeEl === inputRef.current ||
        (activeEl && activeEl.closest("table") !== null) ||
        activeEl === document.body;

      if (!isInsideSpreadsheet && activeEl?.tagName === "INPUT" && activeEl !== inputRef.current) {
        return;
      }
      if (activeEl?.tagName === "TEXTAREA") {
        return;
      }

      // 1. CTRL + C (Copy Range / Active Cell)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        if (activeEl === inputRef.current) {
          const input = inputRef.current as HTMLInputElement;
          if (input.selectionStart !== input.selectionEnd) {
            return; // Allow native copy of text selection inside input
          }
        }
        e.preventDefault();
        handleCopyCell();
        return;
      }

      // 2. CTRL + X (Cut Range / Active Cell)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "x") {
        if (activeEl === inputRef.current) {
          const input = inputRef.current as HTMLInputElement;
          if (input.selectionStart !== input.selectionEnd) {
            return;
          }
        }
        e.preventDefault();
        handleCutCell();
        return;
      }

      // 3. CTRL + A (Select All)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a" && activeEl !== inputRef.current) {
        e.preventDefault();
        setSelectedRange({
          startRow: 0,
          startCol: 0,
          endRow: visibleRows.length - 1,
          endCol: visibleColumns.length - 1,
        });
        toast.info("Selected entire spreadsheet");
        return;
      }

      // 4. If currently editing text inside an input
      if (editingCell) {
        // Enter / Tab / Escape / Arrows handled by handleCellKeyDown
        return;
      }

      // 5. If a cell or range is selected (not in text edit mode)
      if (selectedCell) {
        const curRowIdx = selectedCell.rowIdx;
        const curColIdx = selectedCell.colIdx;

        // Shift + Arrows (Expand / Shrink range)
        if (e.shiftKey && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "ArrowRight" || e.key === "ArrowLeft")) {
          e.preventDefault();
          if (selectedRange) {
            let { startRow, startCol, endRow, endCol } = selectedRange;
            if (e.key === "ArrowDown") endRow = Math.min(visibleRows.length - 1, endRow + 1);
            if (e.key === "ArrowUp") endRow = Math.max(0, endRow - 1);
            if (e.key === "ArrowRight") endCol = Math.min(visibleColumns.length - 1, endCol + 1);
            if (e.key === "ArrowLeft") endCol = Math.max(0, endCol - 1);
            setSelectedRange({ startRow, startCol, endRow, endCol });
          }
          return;
        }

        // Navigation without Shift
        if (e.key === "ArrowDown" || (e.key === "Enter" && !e.shiftKey)) {
          e.preventDefault();
          navigateCell(curRowIdx + 1, curColIdx);
          return;
        }
        if (e.key === "ArrowUp" || (e.key === "Enter" && e.shiftKey)) {
          e.preventDefault();
          if (curRowIdx > 0) navigateCell(curRowIdx - 1, curColIdx);
          return;
        }
        if (e.key === "ArrowRight" || (e.key === "Tab" && !e.shiftKey)) {
          e.preventDefault();
          if (curColIdx + 1 < visibleColumns.length) {
            navigateCell(curRowIdx, curColIdx + 1);
          } else {
            navigateCell(curRowIdx + 1, 0);
          }
          return;
        }
        if (e.key === "ArrowLeft" || (e.key === "Tab" && e.shiftKey)) {
          e.preventDefault();
          if (curColIdx > 0) {
            navigateCell(curRowIdx, curColIdx - 1);
          } else if (curRowIdx > 0) {
            navigateCell(curRowIdx - 1, visibleColumns.length - 1);
          }
          return;
        }

        // Delete / Backspace (Clear selected cell(s))
        if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          handleClearCell();
          return;
        }

        // F2 key (Enter edit mode with current value)
        if (e.key === "F2") {
          e.preventDefault();
          const targetRow = visibleRows[curRowIdx];
          const val = targetRow ? targetRow[selectedCell.colId] : "";
          setEditingCell({ rowId: selectedCell.rowId, colId: selectedCell.colId });
          setCellValue(val !== undefined && val !== null ? String(val) : "");
          return;
        }

        // Printable key (Direct typing: enters edit mode with that character!)
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          setEditingCell({ rowId: selectedCell.rowId, colId: selectedCell.colId });
          setCellValue(e.key);
          return;
        }
      }
    };

    const handleGlobalPaste = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl?.tagName === "INPUT" && activeEl !== inputRef.current) return;
      if (activeEl?.tagName === "TEXTAREA") return;

      const clipboardText = e.clipboardData?.getData("text/plain");
      if (!clipboardText) return;

      e.preventDefault();
      e.stopPropagation();
      pasteGridData(clipboardText);
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    window.addEventListener("paste", handleGlobalPaste);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
      window.removeEventListener("paste", handleGlobalPaste);
    };
  }, [selectionBounds, isMultiCellSelected, selectedCell, editingCell, cellValue, rows, visibleRows, visibleColumns]);

  // ── COLUMN DRAG AND DROP HANDLERS ──
  const handleDragStartCol = (e: React.DragEvent, colId: string) => {
    setDraggedColId(colId);
    e.dataTransfer.setData("text/plain", colId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOverCol = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColId !== targetColId) {
      setDragOverColId(targetColId);
    }
  };

  const handleDropCol = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    const sourceColId = draggedColId || e.dataTransfer.getData("text/plain");
    if (!sourceColId || sourceColId === targetColId) {
      setDraggedColId(null);
      setDragOverColId(null);
      return;
    }

    const fromIndex = columns.findIndex((c) => c.id === sourceColId);
    const toIndex = columns.findIndex((c) => c.id === targetColId);

    if (fromIndex === -1 || toIndex === -1) return;

    const newCols = [...columns];
    const [movedCol] = newCols.splice(fromIndex, 1);
    newCols.splice(toIndex, 0, movedCol);

    setColumns(newCols);
    scheduleAutoSave(newCols);
    setDraggedColId(null);
    setDragOverColId(null);
    toast.success(`Moved column "${movedCol.label}"`);
  };

  const handleDragEndCol = () => {
    setDraggedColId(null);
    setDragOverColId(null);
  };

  // Column Move Step (Left / Right)
  const handleMoveColumnByStep = (colId: string, direction: 'left' | 'right', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveColMenu(null);
    setColContextMenu(null);

    const currentIndex = columns.findIndex((c) => c.id === colId);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= columns.length) return;

    const newCols = [...columns];
    const [movedCol] = newCols.splice(currentIndex, 1);
    newCols.splice(targetIndex, 0, movedCol);

    setColumns(newCols);
    scheduleAutoSave(newCols);
    toast.success(`Moved column "${movedCol.label}" ${direction}`);
  };

  // Column Insert Left / Right
  const handleInsertColumn = (targetColId: string, position: 'left' | 'right', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveColMenu(null);
    setColContextMenu(null);

    const targetIndex = columns.findIndex((c) => c.id === targetColId);
    if (targetIndex === -1) return;

    const newColId = `col_${Date.now()}`;
    const newColLabel = `New Column ${columns.length + 1}`;
    const newCol: ColumnConfig = {
      id: newColId,
      label: newColLabel,
      width: "160px",
      type: "text"
    };

    const newCols = [...columns];
    const insertIndex = position === 'left' ? targetIndex : targetIndex + 1;
    newCols.splice(insertIndex, 0, newCol);

    setColumns(newCols);
    scheduleAutoSave(newCols);
    toast.success(`Inserted "${newColLabel}"`);
  };

  // Column Management: Add Column
  const handleAddColumn = () => {
    const newColNum = columns.length + 1;
    const newColId = `col_${Date.now()}`;
    const newColLabel = `Column ${newColNum}`;
    const newCol: ColumnConfig = {
      id: newColId,
      label: newColLabel,
      width: "160px",
      type: "text"
    };

    const newCols = [...columns, newCol];
    setColumns(newCols);
    scheduleAutoSave(newCols);
    toast.success(`Added column: ${newColLabel}`);
  };

  // Column Management: Rename Column
  const handleStartRenameCol = (colId: string, currentLabel: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveColMenu(null);
    setColContextMenu(null);
    setEditingColId(colId);
    setColLabelInput(currentLabel);
  };

  const handleSaveRenameCol = (colId: string) => {
    if (!colLabelInput.trim()) {
      setEditingColId(null);
      return;
    }
    const newCols = columns.map((c) => (c.id === colId ? { ...c, label: colLabelInput.trim() } : c));
    setColumns(newCols);
    setEditingColId(null);
    scheduleAutoSave(newCols);
    toast.success("Column header updated!");
  };

  // Column Management: Delete Column
  const handleDeleteColumn = (colId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveColMenu(null);
    setColContextMenu(null);
    if (columns.length <= 1) {
      toast.error("Spreadsheet must have at least 1 column!");
      return;
    }
    const newCols = columns.filter((c) => c.id !== colId);
    setColumns(newCols);
    setHiddenColIds(hiddenColIds.filter(id => id !== colId));
    scheduleAutoSave(newCols);
    toast.info("Column removed.");
  };

  // Column Management: Hide / Unhide Column
  const handleHideColumn = (colId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveColMenu(null);
    setColContextMenu(null);
    if (visibleColumns.length <= 1) {
      toast.error("Cannot hide the last visible column!");
      return;
    }
    if (!hiddenColIds.includes(colId)) {
      const nextHidden = [...hiddenColIds, colId];
      setHiddenColIds(nextHidden);
      const found = columns.find(c => c.id === colId);
      toast.info(`Column "${found?.label || 'Column'}" hidden (click indicator dot to unhide)`);
    }
  };

  const handleUnhideSpecificColumn = (colId: string) => {
    const nextHidden = hiddenColIds.filter(id => id !== colId);
    setHiddenColIds(nextHidden);
    const found = columns.find(c => c.id === colId);
    toast.success(`Unhid column: ${found?.label || 'Column'}`);
  };

  const handleUnhideAllColumns = () => {
    setHiddenColIds([]);
    toast.success("All columns unhidden!");
  };

  // Column Context Menu on Right Click
  const handleColContextMenu = (e: React.MouseEvent, colId: string, colIndex: number, label: string) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveColMenu(null);
    setCellContextMenu(null);
    setRowContextMenu(null);
    setColContextMenu({
      x: e.clientX,
      y: e.clientY,
      colId,
      colIndex,
      label
    });
  };

  // ── ROW MANAGEMENT ──
  const handleAddRow = () => {
    const newRowNum = rows.length + 1;
    const newRowId = `row_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newRow: RowData = { id: newRowId };
    const newRows = [...rows, newRow];
    setRows(newRows);
    scheduleAutoSave(undefined, newRows);
    toast.success(`Added Row #${newRowNum}`);
  };

  const handleInsertRow = (targetRowId: string, position: 'above' | 'below', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRowContextMenu(null);
    const targetIndex = rows.findIndex((r) => r.id === targetRowId);
    if (targetIndex === -1) return;

    const newRowId = `row_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newRow: RowData = { id: newRowId };

    const newRows = [...rows];
    const insertIndex = position === 'above' ? targetIndex : targetIndex + 1;
    newRows.splice(insertIndex, 0, newRow);

    setRows(newRows);
    scheduleAutoSave(undefined, newRows);
    toast.success(`Inserted row ${position} row #${targetIndex + 1}`);
  };

  const handleDeleteRow = (rowId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRowContextMenu(null);
    if (rows.length <= 1) {
      toast.error("Spreadsheet must have at least 1 row!");
      return;
    }
    const newRows = rows.filter((r) => r.id !== rowId);
    setRows(newRows);
    setHiddenRowIds(hiddenRowIds.filter(id => id !== rowId));
    scheduleAutoSave(undefined, newRows);
    toast.info("Row removed.");
  };

  const handleHideRow = (rowId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRowContextMenu(null);
    if (visibleRows.length <= 1) {
      toast.error("Cannot hide the last visible row!");
      return;
    }
    if (!hiddenRowIds.includes(rowId)) {
      const nextHidden = [...hiddenRowIds, rowId];
      setHiddenRowIds(nextHidden);
      toast.info("Row hidden (click indicator dot to unhide)");
    }
  };

  const handleClearRow = (rowId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRowContextMenu(null);
    const newRows = rows.map(r => r.id === rowId ? { id: r.id } : r);
    setRows(newRows);
    scheduleAutoSave(undefined, newRows);
    toast.info("Cleared row data");
  };

  const handleUnhideSpecificRow = (rowId: string) => {
    const nextHidden = hiddenRowIds.filter(id => id !== rowId);
    setHiddenRowIds(nextHidden);
    toast.success("Unhid row");
  };

  const handleUnhideAllRows = () => {
    setHiddenRowIds([]);
    toast.success("All rows unhidden!");
  };

  const handleRowContextMenu = (e: React.MouseEvent, rowId: string, rowIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setCellContextMenu(null);
    setColContextMenu(null);
    setRowContextMenu({
      x: e.clientX,
      y: e.clientY,
      rowId,
      rowIndex
    });
  };

  // ── CSV EXPORT DIALOG / MODAL TRIGGER ──
  const handleOpenCsvModal = async () => {
    setIsCsvModalOpen(true);
    if (isSuperAdmin && allSheetsData.length === 0) {
      try {
        setLoadingAllSheets(true);
        const res = await fetch("/api/admin/expenses");
        if (res.ok) {
          const data = await res.json();
          setAllSheetsData(data.sheets || []);
        }
      } catch (err) {
        console.error("Failed to prefetch all sheets:", err);
      } finally {
        setLoadingAllSheets(false);
      }
    }
  };

  // ── ADVANCED FILTERED CSV EXPORT EXECUTION ──
  const handleExecuteCsvExport = () => {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      // Determine date boundary timestamps
      let minTimestamp: number | null = null;
      let maxTimestamp: number | null = null;

      if (csvDateFilter === "this_month") {
        minTimestamp = new Date(currentYear, currentMonth, 1).getTime();
        maxTimestamp = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).getTime();
      } else if (csvDateFilter === "last_month") {
        minTimestamp = new Date(currentYear, currentMonth - 1, 1).getTime();
        maxTimestamp = new Date(currentYear, currentMonth, 0, 23, 59, 59).getTime();
      } else if (csvDateFilter === "this_fy") {
        // Indian Financial Year: April 1 to March 31
        const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
        minTimestamp = new Date(fyStartYear, 3, 1).getTime();
        maxTimestamp = new Date(fyStartYear + 1, 2, 31, 23, 59, 59).getTime();
      } else if (csvDateFilter === "custom") {
        if (csvCustomFrom) {
          const fromD = new Date(csvCustomFrom);
          minTimestamp = new Date(fromD.getFullYear(), fromD.getMonth(), fromD.getDate()).getTime();
        }
        if (csvCustomTo) {
          const toD = new Date(csvCustomTo);
          maxTimestamp = new Date(toD.getFullYear(), toD.getMonth(), toD.getDate(), 23, 59, 59).getTime();
        }
      }

      // Check if row passes date filter
      const matchesDateFilter = (row: RowData, cols: ColumnConfig[]) => {
        if (csvDateFilter === "all" || (!minTimestamp && !maxTimestamp)) {
          return true;
        }
        const dateCol = cols.find(c => isDateCol(c.id));
        if (!dateCol) return true;
        const rowDateVal = row[dateCol.id];
        if (!rowDateVal) return true;
        const rowTs = parseDateToTimestamp(rowDateVal);
        if (!rowTs) return true;
        if (minTimestamp && rowTs < minTimestamp) return false;
        if (maxTimestamp && rowTs > maxTimestamp) return false;
        return true;
      };

      const isRowEmpty = (row: RowData) => {
        return Object.entries(row).every(([k, v]) => k === "id" || !String(v || "").trim());
      };

      let csvLines: string[] = [];
      let filename = "";

      if (csvScope === "all" && isSuperAdmin && allSheetsData.length > 0) {
        const standardHeaders = ["Center Name", "Date", "Expense Category / Item", "Vendor / Paid To", "Amount (₹)", "Payment Mode", "Receipt / Ref #", "Remarks / Notes"];
        csvLines.push(standardHeaders.map(h => `"${h.replace(/"/g, '""')}"`).join(","));

        let totalExportedRows = 0;
        let grandSum = 0;

        allSheetsData.forEach((sheet) => {
          const centerName = sheet.location?.name || `Center #${sheet.locationId}`;
          const sheetCols: ColumnConfig[] = sheet.columns || columns;
          const sheetRows: RowData[] = sheet.rows || [];

          const validRows = sheetRows.filter(r => !isRowEmpty(r) && matchesDateFilter(r, sheetCols));

          validRows.forEach((r) => {
            totalExportedRows++;
            const dateVal = r.col_1 || r['Date'] || "";
            const catVal = r.col_2 || r['Expense Category / Item'] || "";
            const vendorVal = r.col_3 || r['Vendor / Paid To'] || "";
            const amtVal = r.col_4 || r['Amount (₹)'] || "";
            const modeVal = r.col_5 || r['Payment Mode'] || "";
            const refVal = r.col_6 || r['Receipt / Ref #'] || "";
            const notesVal = r.col_7 || r['Remarks / Notes'] || "";

            const num = parseFloat(String(amtVal).replace(/[^0-9.-]+/g, ""));
            if (!isNaN(num)) grandSum += num;

            const rowCells = [
              centerName,
              String(dateVal || ""),
              String(catVal || ""),
              String(vendorVal || ""),
              String(amtVal || ""),
              String(modeVal || ""),
              String(refVal || ""),
              String(notesVal || "")
            ];

            csvLines.push(rowCells.map(c => `"${c.replace(/"/g, '""')}"`).join(","));
          });
        });

        csvLines.push(`"","","","TOTAL CONSOLIDATED (₹)","${grandSum}","","","Total Records: ${totalExportedRows}"`);
        filename = `SSPACIA_All_Centers_Expenses_${csvDateFilter}.csv`;

      } else {
        const exportCols = visibleColumns;
        const validRows = rows.filter(r => !isRowEmpty(r) && matchesDateFilter(r, exportCols));

        const headerLine = exportCols.map(c => `"${c.label.replace(/"/g, '""')}"`).join(",");
        csvLines.push(headerLine);

        let centerSum = 0;
        validRows.forEach((r) => {
          const rowCells = exportCols.map(c => {
            let val = r[c.id] || "";
            if (typeof val === "string" && val.startsWith("=")) {
              val = evaluateFormula(val, exportCols, validRows);
            }
            if (c.label.toLowerCase().includes("amount") || c.id.toLowerCase().includes("amount")) {
              const num = parseFloat(String(val).replace(/[^0-9.-]+/g, ""));
              if (!isNaN(num)) centerSum += num;
            }
            return `"${String(val !== undefined && val !== null ? val : "").replace(/"/g, '""')}"`;
          });
          csvLines.push(rowCells.join(","));
        });

        csvLines.push(`"TOTAL (₹)","${centerSum}","","","","","Total Records: ${validRows.length}"`);
        filename = `SSPACIA_${locationName.replace(/\s+/g, '_')}_Expenses_${csvDateFilter}.csv`;
      }

      if (csvLines.length <= 1) {
        toast.info("No records matched the selected date filter.");
      }

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvLines.join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsCsvModalOpen(false);
      toast.success(`Exported ${filename}!`);
    } catch (err: any) {
      console.error("CSV Export failed:", err);
      toast.error(err.message || "Failed to generate CSV export");
    }
  };

  // Helper to find hidden columns before a specific column
  const getHiddenColsBefore = (colId: string) => {
    const allIdx = columns.findIndex(c => c.id === colId);
    if (allIdx <= 0) return [];
    const hiddenBefore: ColumnConfig[] = [];
    for (let i = allIdx - 1; i >= 0; i--) {
      if (hiddenColIds.includes(columns[i].id)) {
        hiddenBefore.unshift(columns[i]);
      } else {
        break;
      }
    }
    return hiddenBefore;
  };

  // Helper to find hidden rows before a specific row
  const getHiddenRowsBefore = (rowId: string) => {
    const allIdx = rows.findIndex(r => r.id === rowId);
    if (allIdx <= 0) return [];
    const hiddenBefore: RowData[] = [];
    for (let i = allIdx - 1; i >= 0; i--) {
      if (hiddenRowIds.includes(rows[i].id)) {
        hiddenBefore.unshift(rows[i]);
      } else {
        break;
      }
    }
    return hiddenBefore;
  };

  return (
    <div className="bg-white border border-gray-200 shadow-sm overflow-hidden flex flex-col font-sans select-none relative">
      
      {/* ── TOP HEADER BAR (FIXED HEIGHT, NEVER WRAPS OR BOUNCES) ── */}
      <div className="px-3.5 py-2.5 bg-white border-b border-gray-200 flex items-center justify-between gap-3 h-14">
        
        {/* CENTER NAME & FIXED-WIDTH CLOUD STATUS */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-teal-50 text-[#1ab0bc] flex items-center justify-center border border-teal-200 shadow-2xs shrink-0">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight truncate flex items-center gap-2">
              <span>{locationName} Expense Sheet</span>
            </h2>
            {/* FIXED-WIDTH STATUS CONTAINER */}
            <div className="h-4 flex items-center text-[11px] font-mono text-gray-500 overflow-hidden">
              {autoSaveStatus === "saving" && (
                <span className="flex items-center gap-1 text-[#1ab0bc] font-bold animate-pulse truncate">
                  <Cloud className="w-3.5 h-3.5 shrink-0" />
                  <span>Saving to cloud...</span>
                </span>
              )}
              {autoSaveStatus === "saved" && (
                <span className="flex items-center gap-1 text-emerald-600 font-medium truncate">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Saved to cloud {lastSavedTime ? `(${lastSavedTime})` : ''}</span>
                </span>
              )}
              {autoSaveStatus === "unsaved" && (
                <span className="flex items-center gap-1 text-amber-600 font-medium truncate">
                  <Cloud className="w-3.5 h-3.5 shrink-0" />
                  <span>Saving...</span>
                </span>
              )}
              {autoSaveStatus === "error" && (
                <span className="flex items-center gap-1 text-rose-600 font-bold truncate">
                  <span>Save failed</span>
                  <button onClick={handleManualSave} className="underline cursor-pointer">Retry</button>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* TOP RIGHT QUICK ACTIONS */}
        <div className="flex items-center gap-2 shrink-0">
          {/* ADVANCED CSV EXPORT BUTTON */}
          <button
            onClick={handleOpenCsvModal}
            className="bg-white hover:bg-gray-100 text-gray-800 px-3 py-1.5 text-xs font-bold uppercase tracking-wider border border-gray-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title="Download Filtered CSV (Choose Center & Date Range)"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>CSV Export</span>
          </button>

          {/* FIXED-WIDTH SAVE BUTTON */}
          <button
            onClick={handleManualSave}
            disabled={saving}
            className={`w-24 px-3 py-1.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              hasChanges
                ? "bg-[#1ab0bc] hover:bg-teal-600 text-white"
                : "bg-gray-800 hover:bg-black text-white"
            }`}
            title="Force save now"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saving ? "Saving..." : autoSaveStatus === "saved" ? "Saved" : "Save"}</span>
          </button>
        </div>

      </div>

      {/* ── GOOGLE SHEETS TOOLBAR RIBBON (FIXED HEIGHT, NEVER WRAPS) ── */}
      <div className="px-3 py-1.5 bg-[#f8fafc] border-b border-gray-200 flex items-center gap-2 overflow-x-auto scrollbar-none h-11">
        
        {/* SEARCH INPUT */}
        <div className="relative shrink-0">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search sheet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 pr-2.5 py-1 bg-white border border-gray-300 text-xs text-gray-800 outline-none focus:border-[#1ab0bc] w-40 font-mono"
          />
        </div>

        <div className="h-4 w-[1px] bg-gray-300 mx-1 shrink-0" />

        {/* FREEZE CONTROLS */}
        <button
          onClick={() => setFreezeHeader(!freezeHeader)}
          className={`px-2.5 py-1 text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
            freezeHeader
              ? "bg-teal-50 text-[#1ab0bc] border-teal-300"
              : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
          }`}
          title="Toggle Freeze Header Row"
        >
          {freezeHeader ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          <span className="text-[11px]">Header</span>
        </button>

        <button
          onClick={() => setFreezeFirstCol(!freezeFirstCol)}
          className={`px-2.5 py-1 text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
            freezeFirstCol
              ? "bg-teal-50 text-[#1ab0bc] border-teal-300"
              : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
          }`}
          title="Toggle Freeze Column #"
        >
          {freezeFirstCol ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          <span className="text-[11px]">Col #</span>
        </button>

        <div className="h-4 w-[1px] bg-gray-300 mx-1 shrink-0" />

        {/* ADD COLUMN BUTTON */}
        <button
          onClick={handleAddColumn}
          className="bg-white hover:bg-gray-100 text-gray-800 px-2.5 py-1 text-xs font-bold uppercase tracking-wider border border-gray-300 flex items-center gap-1 transition-all cursor-pointer shrink-0"
        >
          <Columns className="w-3.5 h-3.5 text-[#1ab0bc]" />
          <span>+ Column</span>
        </button>

        {/* ADD ROW BUTTON */}
        <button
          onClick={handleAddRow}
          className="bg-white hover:bg-gray-100 text-gray-800 px-2.5 py-1 text-xs font-bold uppercase tracking-wider border border-gray-300 flex items-center gap-1 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5 text-[#1ab0bc]" />
          <span>+ Row</span>
        </button>

        {/* ATTACH PDF BUTTON */}
        <button
          type="button"
          onClick={() => {
            if (editingCell) {
              handleTriggerAttachPdf(editingCell.rowId, editingCell.colId);
            } else {
              toast.info("Right-click on any cell or click a cell first to attach PDF");
            }
          }}
          className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider border flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
            editingCell
              ? "bg-teal-50 text-[#1ab0bc] border-teal-300 hover:bg-teal-100 shadow-2xs"
              : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
          }`}
          title={editingCell ? "Attach PDF to the active cell" : "Click a cell or right-click to attach PDF"}
        >
          <Paperclip className="w-3.5 h-3.5 text-[#1ab0bc]" />
          <span>Attach PDF</span>
        </button>

        {/* UNHIDE BUTTONS */}
        {hiddenColIds.length > 0 && (
          <button
            onClick={handleUnhideAllColumns}
            className="bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 px-2.5 py-1 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shrink-0"
            title="Click to reveal all hidden columns"
          >
            <Eye className="w-3.5 h-3.5 text-[#1ab0bc]" />
            <span>Unhide Cols ({hiddenColIds.length})</span>
          </button>
        )}

        {hiddenRowIds.length > 0 && (
          <button
            onClick={handleUnhideAllRows}
            className="bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 px-2.5 py-1 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shrink-0"
            title="Click to reveal all hidden rows"
          >
            <Eye className="w-3.5 h-3.5 text-[#1ab0bc]" />
            <span>Unhide Rows ({hiddenRowIds.length})</span>
          </button>
        )}

      </div>

      {/* ── GOOGLE SHEETS / EXCEL FORMULA ASSISTANT BAR (= MODE) ── */}
      {editingCell && cellValue.startsWith("=") && (
        <div className="px-3 py-2 bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 border-b border-indigo-200 flex flex-wrap items-center justify-between gap-3 text-xs shadow-inner animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <div className="flex items-center gap-1 px-2 py-0.5 bg-indigo-600 text-white rounded font-mono font-black text-[11px] shrink-0 shadow-xs">
              <Calculator className="w-3.5 h-3.5" />
              <span>fx</span>
            </div>
            
            <div className="flex-1 relative flex items-center">
              <input
                type="text"
                value={cellValue}
                onChange={(e) => setCellValue(e.target.value)}
                onKeyDown={handleCellKeyDown}
                placeholder="=SUM(D1:D9) or =D1+D2"
                className="w-full bg-white border-2 border-indigo-400 focus:border-indigo-600 px-2.5 py-1 text-xs font-mono font-bold text-indigo-950 rounded shadow-xs focus:outline-none"
              />
            </div>

            {/* LIVE COMPUTED RESULT PREVIEW */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-emerald-300 rounded font-mono font-black text-emerald-800 text-xs shrink-0 shadow-2xs">
              <span className="text-[10px] text-gray-500 uppercase font-sans font-bold">Result:</span>
              <span>
                {liveFormulaResult !== null && liveFormulaResult !== undefined
                  ? typeof liveFormulaResult === "number"
                    ? liveFormulaResult.toLocaleString("en-IN", { maximumFractionDigits: 2 })
                    : String(liveFormulaResult)
                  : "..."}
              </span>
            </div>
          </div>

          {/* QUICK OPERATORS & ACTIONS */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                const trimmed = cellValue.trim();
                if (trimmed === "=") {
                  setCellValue("=SUM(");
                } else if (/[+\-*/,(]$/.test(trimmed)) {
                  setCellValue(`${trimmed}SUM(`);
                } else {
                  setCellValue(`=SUM(${trimmed.replace(/^=/, "")}`);
                }
              }}
              className="px-2 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-900 border border-indigo-300 rounded font-mono font-bold text-[11px] cursor-pointer"
              title="Insert SUM function"
            >
              SUM( )
            </button>

            <button
              type="button"
              onClick={() => setCellValue((prev) => `${prev.trim()}+`)}
              className="px-2 py-1 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded font-mono font-bold text-[11px] cursor-pointer"
              title="Add plus operator"
            >
              +
            </button>

            <button
              type="button"
              onClick={() => setCellValue((prev) => `${prev.trim()}-`)}
              className="px-2 py-1 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded font-mono font-bold text-[11px] cursor-pointer"
              title="Add minus operator"
            >
              -
            </button>

            <button
              type="button"
              onClick={() => setCellValue((prev) => `${prev.trim()}*`)}
              className="px-2 py-1 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded font-mono font-bold text-[11px] cursor-pointer"
              title="Add multiply operator"
            >
              ×
            </button>

            <button
              type="button"
              onClick={() => setCellValue((prev) => `${prev.trim()}/`)}
              className="px-2 py-1 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded font-mono font-bold text-[11px] cursor-pointer"
              title="Add divide operator"
            >
              ÷
            </button>

            <button
              type="button"
              onClick={() => {
                commitCurrentCell();
                setEditingCell(null);
              }}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] cursor-pointer flex items-center gap-1 shadow-xs"
              title="Commit formula (Enter)"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply</span>
            </button>

            <button
              type="button"
              onClick={() => setEditingCell(null)}
              className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded font-bold text-[11px] cursor-pointer"
              title="Cancel (Esc)"
            >
              ✕
            </button>
          </div>

          <div className="w-full text-[10px] text-indigo-900/80 font-medium flex items-center gap-1.5 -mt-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
            <span>Click on any cell in the sheet (e.g. D1, D2) to total or add it directly to your formula.</span>
          </div>
        </div>
      )}

      {/* ── GOOGLE SHEETS / EXCEL MULTI-CELL SELECTION STATUS RIBBON ── */}
      {selectionStats && isMultiCellSelected && (
        <div className="px-3 py-1.5 bg-gradient-to-r from-teal-50 via-cyan-50 to-emerald-50 border-b border-teal-200 flex flex-wrap items-center justify-between gap-3 text-xs shadow-inner animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#006064] text-white rounded font-mono font-black text-[11px] shadow-xs">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{selectionStats.rangeCoord}</span>
            </div>
            <span className="text-teal-900 font-bold text-xs">
              {selectionStats.totalCells} cells selected
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            {selectionStats.sum !== null && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-white border border-teal-300 rounded font-bold text-teal-950 shadow-2xs">
                <span className="text-gray-500 font-sans text-[10px] uppercase">Sum:</span>
                <span className="text-emerald-700">₹{selectionStats.sum.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
              </div>
            )}
            {selectionStats.avg !== null && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-white border border-teal-300 rounded font-bold text-teal-950 shadow-2xs">
                <span className="text-gray-500 font-sans text-[10px] uppercase">Avg:</span>
                <span className="text-cyan-700">₹{selectionStats.avg.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
              </div>
            )}
            {selectionStats.numCount > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-white border border-teal-300 rounded font-bold text-teal-950 shadow-2xs">
                <span className="text-gray-500 font-sans text-[10px] uppercase">Count:</span>
                <span className="text-indigo-700">{selectionStats.numCount}</span>
              </div>
            )}
            {selectionStats.min !== null && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-white border border-teal-300 rounded font-bold text-teal-950 shadow-2xs">
                <span className="text-gray-500 font-sans text-[10px] uppercase">Min:</span>
                <span>₹{selectionStats.min.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
              </div>
            )}
            {selectionStats.max !== null && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-white border border-teal-300 rounded font-bold text-teal-950 shadow-2xs">
                <span className="text-gray-500 font-sans text-[10px] uppercase">Max:</span>
                <span>₹{selectionStats.max.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleCopyCell()}
                className="px-2.5 py-0.5 bg-teal-600 hover:bg-teal-700 text-white rounded font-bold text-[11px] cursor-pointer shadow-xs"
                title="Copy selection (Ctrl+C)"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={() => handleClearCell()}
                className="px-2.5 py-0.5 bg-gray-200 hover:bg-red-50 text-gray-700 hover:text-red-700 rounded font-bold text-[11px] cursor-pointer"
                title="Clear selection (Delete)"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── GOOGLE SHEETS / EXCEL DATA CANVAS ── */}
      <div className="overflow-x-auto overflow-y-auto max-h-[700px] relative border-b border-gray-200 scrollbar-thin">
        <table className="w-full text-left border-collapse text-xs font-mono">
          
          {/* HEADER ROW */}
          <thead className={`bg-[#f1f5f9] text-gray-700 font-bold uppercase tracking-wider ${freezeHeader ? "sticky top-0 z-20 shadow-xs" : ""}`}>
            <tr className="border-b border-gray-300">
              
              {/* INDEX COLUMN # */}
              <th className={`border-r border-gray-300 px-2.5 py-2 text-center w-12 min-w-[48px] max-w-[48px] text-[10px] text-gray-500 font-bold ${freezeFirstCol ? "sticky left-0 z-30 bg-[#e2e8f0]" : "bg-[#e2e8f0]"}`}>
                #
              </th>

              {/* COLUMNS */}
              {visibleColumns.map((col, colIdx) => {
                const isRenaming = editingColId === col.id;
                const isMenuOpen = activeColMenu === col.id;
                const isDraggingThis = draggedColId === col.id;
                const isDragOverThis = dragOverColId === col.id;
                const hiddenBefore = getHiddenColsBefore(col.id);
                const isDate = isDateCol(col.id);
                const isColSelected = selectionBounds && colIdx >= selectionBounds.minCol && colIdx <= selectionBounds.maxCol;

                return (
                  <th
                    key={col.id}
                    draggable={!isRenaming}
                    onDragStart={(e) => handleDragStartCol(e, col.id)}
                    onDragOver={(e) => handleDragOverCol(e, col.id)}
                    onDrop={(e) => handleDropCol(e, col.id)}
                    onDragEnd={handleDragEndCol}
                    onContextMenu={(e) => handleColContextMenu(e, col.id, colIdx, col.label)}
                    style={{ width: col.width || "160px", minWidth: "140px" }}
                    className={`px-2.5 py-1.5 border-r border-gray-300 text-gray-800 text-[11px] group relative select-none transition-all cursor-grab active:cursor-grabbing ${
                      isColSelected ? "bg-teal-100 text-teal-950 font-black border-b-2 border-b-[#006064]" : "bg-[#f1f5f9]"
                    } ${isDraggingThis ? "opacity-30 bg-teal-50" : ""} ${
                      isDragOverThis ? "border-l-4 border-l-[#1ab0bc] bg-teal-50/50" : ""
                    }`}
                  >
                    {isRenaming ? (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          type="text"
                          value={colLabelInput}
                          onChange={(e) => setColLabelInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSaveRenameCol(col.id)}
                          onBlur={() => handleSaveRenameCol(col.id)}
                          className="w-full bg-white border border-[#1ab0bc] px-1 py-0.5 text-xs text-gray-900 outline-none font-bold"
                        />
                        <button
                          onClick={() => handleSaveRenameCol(col.id)}
                          className="p-0.5 text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 truncate">
                          {/* UNHIDE INDICATOR DOT EMBEDDED INSIDE HEADER */}
                          {hiddenBefore.length > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                hiddenBefore.forEach(c => handleUnhideSpecificColumn(c.id));
                              }}
                              className="px-1 py-0.2 bg-teal-100 hover:bg-[#1ab0bc] text-teal-800 hover:text-white rounded text-[10px] font-black cursor-pointer shadow-2xs shrink-0 inline-flex items-center"
                              title={`Hidden: ${hiddenBefore.map(c => c.label).join(', ')}. Click to unhide.`}
                            >
                              ◀•▶
                            </button>
                          )}
                          
                          {/* COLUMN LETTER BADGE (A, B, C, D...) */}
                          <span className={`px-1 py-0.2 rounded text-[9px] font-mono font-black shrink-0 border ${
                            isColSelected ? "bg-[#006064] text-white border-[#006064]" : "bg-gray-200/80 text-gray-700 border-gray-300/70"
                          }`}>
                            {getColLetter(colIdx)}
                          </span>

                          <GripVertical className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          <span
                            onDoubleClick={(e) => handleStartRenameCol(col.id, col.label, e)}
                            className="cursor-pointer hover:underline truncate font-bold text-gray-900 flex items-center gap-1"
                            title="Hold & drag left/right to move column. Double click to rename."
                          >
                            {isDate && <Calendar size={11} className="text-[#1ab0bc] shrink-0" />}
                            <span>{col.label}</span>
                          </span>
                        </div>

                        {/* COLUMN MENU DROPDOWN */}
                        <div className="relative shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveColMenu(isMenuOpen ? null : col.id);
                            }}
                            className="p-1 hover:bg-gray-200 text-gray-500 rounded cursor-pointer opacity-40 group-hover:opacity-100 transition-opacity"
                            title="Column Options"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>

                          {isMenuOpen && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 shadow-xl z-50 py-1 font-sans text-xs font-normal"
                            >
                              <button
                                onClick={(e) => handleStartRenameCol(col.id, col.label, e)}
                                className="w-full px-3 py-1.5 text-left hover:bg-gray-100 flex items-center gap-2 text-gray-700 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                                <span>Rename Column</span>
                              </button>
                              
                              {colIdx > 0 && (
                                <button
                                  onClick={(e) => handleMoveColumnByStep(col.id, 'left', e)}
                                  className="w-full px-3 py-1.5 text-left hover:bg-gray-100 flex items-center gap-2 text-gray-700 cursor-pointer"
                                >
                                  <ArrowLeft className="w-3.5 h-3.5 text-gray-500" />
                                  <span>Move Column Left</span>
                                </button>
                              )}

                              {colIdx < visibleColumns.length - 1 && (
                                <button
                                  onClick={(e) => handleMoveColumnByStep(col.id, 'right', e)}
                                  className="w-full px-3 py-1.5 text-left hover:bg-gray-100 flex items-center gap-2 text-gray-700 cursor-pointer"
                                >
                                  <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
                                  <span>Move Column Right</span>
                                </button>
                              )}

                              <div className="border-t border-gray-100 my-1"></div>

                              <button
                                onClick={(e) => handleInsertColumn(col.id, 'left', e)}
                                className="w-full px-3 py-1.5 text-left hover:bg-gray-100 flex items-center gap-2 text-gray-700 cursor-pointer"
                              >
                                <PlusCircle className="w-3.5 h-3.5 text-[#1ab0bc]" />
                                <span>Insert Column Left</span>
                              </button>

                              <button
                                onClick={(e) => handleInsertColumn(col.id, 'right', e)}
                                className="w-full px-3 py-1.5 text-left hover:bg-gray-100 flex items-center gap-2 text-gray-700 cursor-pointer"
                              >
                                <PlusCircle className="w-3.5 h-3.5 text-[#1ab0bc]" />
                                <span>Insert Column Right</span>
                              </button>

                              <div className="border-t border-gray-100 my-1"></div>

                              <button
                                onClick={(e) => handleHideColumn(col.id, e)}
                                className="w-full px-3 py-1.5 text-left hover:bg-gray-100 flex items-center gap-2 text-gray-700 cursor-pointer"
                              >
                                <EyeOff className="w-3.5 h-3.5 text-teal-600" />
                                <span>Hide Column</span>
                              </button>

                              <button
                                onClick={(e) => handleDeleteColumn(col.id, e)}
                                className="w-full px-3 py-1.5 text-left hover:bg-red-50 flex items-center gap-2 text-red-600 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                <span>Delete Column</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* SPREADSHEET BODY ROWS */}
          <tbody className="divide-y divide-gray-200 bg-white">
            {visibleRows.map((row, idx) => {
              const hiddenRowsBefore = getHiddenRowsBefore(row.id);
              const isRowSelected = selectionBounds && idx >= selectionBounds.minRow && idx <= selectionBounds.maxRow;

              return (
                <tr key={`${row.id}_${idx}`} className="hover:bg-slate-50 transition-colors group border-b border-gray-200">
                  
                  {/* ROW INDEX COLUMN */}
                  <td
                    onContextMenu={(e) => handleRowContextMenu(e, row.id, idx)}
                    className={`border-r border-gray-300 px-2 py-1.5 text-center font-bold text-[10px] select-none cursor-pointer w-12 min-w-[48px] max-w-[48px] transition-colors ${
                      isRowSelected
                        ? "bg-teal-200 text-teal-950 font-black border-r-2 border-r-[#006064]"
                        : "text-gray-500 hover:bg-teal-100"
                    } ${freezeFirstCol ? "sticky left-0 z-10 bg-[#f8fafc]" : "bg-[#f8fafc]"}`}
                    title="Right-click for row options (insert, hide, delete)"
                  >
                    {hiddenRowsBefore.length > 0 && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          hiddenRowsBefore.forEach(r => handleUnhideSpecificRow(r.id));
                        }}
                        className="text-[9px] text-teal-700 bg-teal-100 hover:bg-[#1ab0bc] hover:text-white rounded px-0.5 font-bold cursor-pointer inline-block mb-0.5"
                        title={`Click to unhide ${hiddenRowsBefore.length} hidden row(s)`}
                      >
                        ▲•▼
                      </div>
                    )}
                    <div>{idx + 1}</div>
                  </td>

                  {/* CELLS */}
                  {visibleColumns.map((col, colIdx) => {
                    const isEditing = editingCell?.rowId === row.id && editingCell?.colId === col.id;
                    const isUploading = uploadingCell?.rowId === row.id && uploadingCell?.colId === col.id;
                    const val = row[col.id];
                    const isDate = isDateCol(col.id);
                    const isPdf = typeof val === "string" && (
                      val.includes("/api/admin/stored-documents/") ||
                      val.includes("/uploads/") ||
                      val.toLowerCase().endsWith(".pdf")
                    );
                    const isFormula = typeof val === "string" && val.startsWith("=");
                    const evaluatedFormulaVal = isFormula ? evaluateFormula(val, visibleColumns, rows) : null;
                    const cellCoord = getCellCoordinate(colIdx, idx);
                    const isReferencedInActiveFormula = editingCell && cellValue.startsWith("=") && referencedCoords.includes(cellCoord);

                    const isInSelection = selectionBounds
                      ? idx >= selectionBounds.minRow &&
                        idx <= selectionBounds.maxRow &&
                        colIdx >= selectionBounds.minCol &&
                        colIdx <= selectionBounds.maxCol
                      : false;
                    const isSelectedMulti = isInSelection && isMultiCellSelected;
                    const isSelected = !isMultiCellSelected && (selectedCell?.rowId === row.id && selectedCell?.colId === col.id);
                    const isTopEdge = selectionBounds && idx === selectionBounds.minRow;
                    const isBottomEdge = selectionBounds && idx === selectionBounds.maxRow;
                    const isLeftEdge = selectionBounds && colIdx === selectionBounds.minCol;
                    const isRightEdge = selectionBounds && colIdx === selectionBounds.maxCol;

                    return (
                      <td
                        key={col.id}
                        onMouseDown={(e) => handleCellMouseDown(row.id, col.id, e)}
                        onMouseEnter={() => handleCellMouseEnter(row.id, col.id)}
                        onClick={() => handleCellClick(row.id, col.id, val)}
                        onDoubleClick={() => handleCellDoubleClick(row.id, col.id, val)}
                        onContextMenu={(e) => handleCellContextMenu(e, row.id, col.id, val)}
                        onPaste={(e) => handleCellPaste(e, row.id, col.id)}
                        style={{ width: col.width || "160px", minWidth: "140px" }}
                        className={`px-2.5 py-1.5 border-r border-gray-200 cursor-cell relative min-h-[30px] select-none transition-colors ${
                          isEditing
                            ? "bg-white ring-2 ring-[#1ab0bc] ring-inset z-20"
                            : isSelectedMulti
                            ? `bg-teal-500/15 z-10 ${isTopEdge ? "!border-t-2 !border-t-[#006064]" : ""} ${
                                isBottomEdge ? "!border-b-2 !border-b-[#006064]" : ""
                              } ${isLeftEdge ? "!border-l-2 !border-l-[#006064]" : ""} ${
                                isRightEdge ? "!border-r-2 !border-r-[#006064]" : ""
                              }`
                            : isSelected
                            ? "bg-teal-500/10 ring-2 ring-[#006064] ring-inset z-20 font-medium"
                            : isReferencedInActiveFormula
                            ? "bg-indigo-50 ring-2 ring-indigo-500 ring-dashed z-10 animate-pulse"
                            : isFormula
                            ? "bg-indigo-50/30 hover:bg-indigo-50/60"
                            : "hover:bg-sky-50/50"
                        }`}
                      >
                        {isUploading ? (
                          <div className="flex items-center gap-1.5 text-xs text-teal-700 font-bold px-1 animate-pulse">
                            <Loader2 size={12} className="animate-spin" />
                            <span>Attaching PDF...</span>
                          </div>
                        ) : isEditing ? (
                          isDate ? (
                            /* ── NATIVE DEFAULT DATE PICKER CELL INPUT ── */
                            <div className="flex items-center justify-between gap-1 w-full h-full relative">
                              <input
                                ref={inputRef}
                                type="text"
                                value={cellValue}
                                onChange={(e) => setCellValue(e.target.value)}
                                onBlur={handleCellBlur}
                                onKeyDown={handleCellKeyDown}
                                onPaste={(e) => handleCellPaste(e, row.id, col.id)}
                                placeholder="DD MMM YYYY"
                                className="w-full h-full bg-transparent px-1 py-0.5 text-xs text-gray-900 outline-none font-mono font-medium"
                              />

                              {/* NATIVE SYSTEM DATE INPUT */}
                              <input
                                ref={dateNativePickerRef}
                                type="date"
                                value={parseToPickerDate(cellValue)}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    const formatted = formatIsoToDisplayDate(e.target.value);
                                    setCellValue(formatted);
                                    const updatedRows = rows.map((r) => r.id === row.id ? { ...r, [col.id]: formatted } : r);
                                    setRows(updatedRows);
                                    scheduleAutoSave(undefined, updatedRows);
                                    setEditingCell(null);
                                  }
                                }}
                                className="opacity-0 absolute inset-0 w-full h-full pointer-events-none"
                              />

                              {/* CALENDAR ICON TRIGGER */}
                              <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  try {
                                    dateNativePickerRef.current?.showPicker();
                                  } catch (err) {}
                                }}
                                className="p-0.5 text-[#1ab0bc] hover:bg-teal-50 rounded cursor-pointer shrink-0"
                                title="Open calendar"
                              >
                                <Calendar size={14} className="hover:scale-110 transition-transform" />
                              </button>
                            </div>
                          ) : (
                            /* FULL WIDTH CLEAN CELL INPUT FOR NORMAL TYPING */
                            <input
                              ref={inputRef}
                              type="text"
                              value={cellValue}
                              onChange={(e) => setCellValue(e.target.value)}
                              onBlur={handleCellBlur}
                              onKeyDown={handleCellKeyDown}
                              onPaste={(e) => handleCellPaste(e, row.id, col.id)}
                              className="w-full h-full bg-transparent px-1 py-0.5 text-xs text-gray-900 outline-none font-mono font-medium"
                            />
                          )
                        ) : isPdf ? (
                          <div className="flex items-center justify-between gap-1 w-full px-1">
                            <a
                              href={val}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[10px] font-bold truncate max-w-[220px] transition-colors"
                              title="Click to view attached PDF document"
                            >
                              <FileText size={10} className="text-emerald-600 shrink-0" />
                              <span className="truncate">📄 View PDF</span>
                              <ExternalLink size={9} className="shrink-0 text-emerald-500" />
                            </a>
                          </div>
                        ) : isFormula ? (
                          <div className="flex items-center justify-between min-h-[18px] px-1 group/cell">
                            <span className="text-indigo-950 font-bold truncate max-w-[260px] flex items-center gap-1 font-mono">
                              <span className="px-1 py-0.2 bg-indigo-100 text-indigo-800 text-[9px] font-mono font-black rounded border border-indigo-200">
                                fx
                              </span>
                              <span>
                                {evaluatedFormulaVal !== null && evaluatedFormulaVal !== undefined
                                  ? typeof evaluatedFormulaVal === "number"
                                    ? evaluatedFormulaVal.toLocaleString("en-IN", { maximumFractionDigits: 2 })
                                    : String(evaluatedFormulaVal)
                                  : "#ERROR!"}
                              </span>
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between min-h-[18px] px-1 group/cell">
                            <span className="text-gray-900 truncate max-w-[260px] block">
                              {val !== "" && val !== undefined && val !== null ? String(val) : ""}
                            </span>
                            {/* DATE CALENDAR ICON ON HOVER */}
                            {isDate && (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCellClick(row.id, col.id, val);
                                }}
                                className="opacity-0 group-hover/cell:opacity-100 transition-opacity shrink-0 text-gray-400 hover:text-[#1ab0bc] cursor-pointer"
                                title="Click to pick a date"
                              >
                                <Calendar size={12} />
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>

          {/* SUMMARY FOOTER ROW (Google Sheets Style) */}
          <tfoot className="bg-[#f8fafc] border-t-2 border-gray-300 font-bold">
            <tr>
              <td className="px-2 py-2 text-center text-gray-500 text-[10px] border-r border-gray-300 w-12 min-w-[48px]">
                ∑
              </td>
              <td colSpan={visibleColumns.length} className="px-3 py-2 text-gray-700 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-[11px]">
                    Total Rows: <strong className="text-gray-800">{visibleRows.length}</strong>
                    {hiddenRowIds.length > 0 ? ` (${hiddenRowIds.length} hidden)` : ""}
                    {" | "}
                    Total Columns: <strong className="text-gray-800">{visibleColumns.length}</strong>
                    {hiddenColIds.length > 0 ? ` (${hiddenColIds.length} hidden)` : ""}
                  </span>
                  {totalAmount > 0 && (
                    <span className="text-gray-900 font-bold bg-teal-50 px-2 py-0.5 border border-teal-200 font-mono">
                      Calculated Total: ₹{totalAmount.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── ADVANCED CSV EXPORT MODAL / DIALOG ── */}
      {isCsvModalOpen && (
        <div
          onClick={() => setIsCsvModalOpen(false)}
          className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {/* MODAL HEADER */}
            <div className="px-5 py-4 bg-[#1B1C1C] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Download className="w-5 h-5 text-[#1ab0bc]" />
                <h3 className="font-bold text-sm uppercase tracking-wider">
                  Export Expenses to CSV
                </h3>
              </div>
              <button
                onClick={() => setIsCsvModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="p-6 space-y-5 text-xs text-gray-700">
              
              {/* 1. SCOPE SELECTION (CURRENT CENTER vs ALL CENTERS) */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  1. Select Center Scope
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCsvScope("current")}
                    className={`p-3 border rounded text-left transition-all cursor-pointer ${
                      csvScope === "current"
                        ? "border-[#1ab0bc] bg-teal-50/60 ring-2 ring-[#1ab0bc]"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="font-bold text-gray-900">{locationName}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Export this center only</div>
                  </button>

                  <button
                    type="button"
                    disabled={!isSuperAdmin}
                    onClick={() => setCsvScope("all")}
                    className={`p-3 border rounded text-left transition-all ${
                      !isSuperAdmin
                        ? "opacity-40 cursor-not-allowed bg-gray-100 border-gray-200"
                        : csvScope === "all"
                        ? "border-[#1ab0bc] bg-teal-50/60 ring-2 ring-[#1ab0bc] cursor-pointer"
                        : "border-gray-200 hover:bg-gray-50 cursor-pointer"
                    }`}
                  >
                    <div className="font-bold text-gray-900 flex items-center justify-between">
                      <span>All Centers</span>
                      {isSuperAdmin && (
                        <span className="text-[9px] bg-[#1ab0bc] text-white px-1.5 py-0.2 rounded font-mono font-bold">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      {isSuperAdmin ? "Consolidated report" : "Super Admin only"}
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. DATE RANGE SELECTION */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  2. Select Date Range / Filter
                </label>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "all", label: "All Dates" },
                    { id: "this_month", label: "This Month" },
                    { id: "last_month", label: "Last Month" },
                    { id: "this_fy", label: "This FY (2026-27)" },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setCsvDateFilter(filter.id as any)}
                      className={`py-2 px-2 border text-center rounded font-bold text-xs transition-all cursor-pointer ${
                        csvDateFilter === filter.id
                          ? "bg-[#1ab0bc] text-white border-[#1ab0bc] shadow-xs"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                {/* CUSTOM DATE RANGE OPTION */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setCsvDateFilter("custom")}
                    className={`w-full py-1.5 px-3 border rounded text-left font-bold text-xs flex items-center justify-between cursor-pointer transition-all ${
                      csvDateFilter === "custom"
                        ? "bg-teal-50 border-[#1ab0bc] text-[#1ab0bc]"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <span>Custom Date Range</span>
                    <Filter size={12} />
                  </button>

                  {csvDateFilter === "custom" && (
                    <div className="grid grid-cols-2 gap-3 mt-2.5 p-3 bg-gray-50 border border-gray-200 rounded">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                          From Date
                        </label>
                        <input
                          type="date"
                          value={csvCustomFrom}
                          onChange={(e) => setCsvCustomFrom(e.target.value)}
                          className="w-full bg-white border border-gray-300 px-2 py-1 text-xs rounded text-gray-900 outline-none focus:border-[#1ab0bc]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                          To Date
                        </label>
                        <input
                          type="date"
                          value={csvCustomTo}
                          onChange={(e) => setCsvCustomTo(e.target.value)}
                          className="w-full bg-white border border-gray-300 px-2 py-1 text-xs rounded text-gray-900 outline-none focus:border-[#1ab0bc]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* LIVE INFO BADGE */}
              <div className="p-3 bg-teal-50/70 border border-teal-200 rounded text-[11px] text-teal-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckSquare size={13} className="text-[#1ab0bc]" />
                  <span>Ready to Export</span>
                </div>
                <p className="text-gray-600">
                  {csvScope === "all"
                    ? "Will export all center spreadsheets into a consolidated CSV with a Center Name column."
                    : `Will export rows for ${locationName} with date filtering applied.`}
                </p>
              </div>

            </div>

            {/* MODAL FOOTER */}
            <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold rounded text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteCsvExport}
                disabled={loadingAllSheets}
                className="px-5 py-2 bg-[#1ab0bc] hover:bg-teal-600 text-white font-bold rounded text-xs uppercase tracking-wider flex items-center gap-2 shadow-xs cursor-pointer transition-all"
              >
                {loadingAllSheets ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                <span>Download CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CELL RIGHT-CLICK CONTEXT MENU ── */}
      {cellContextMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ top: cellContextMenu.y, left: cellContextMenu.x }}
          className="fixed z-50 bg-white border border-gray-200 shadow-2xl rounded py-1.5 w-52 font-sans text-xs text-gray-700 divide-y divide-gray-100"
        >
          <div className="py-1">
            <button
              onClick={() => handleTriggerAttachPdf(cellContextMenu.rowId, cellContextMenu.colId)}
              className="w-full px-3 py-1.5 text-left hover:bg-teal-50 hover:text-[#1ab0bc] flex items-center gap-2 font-bold text-gray-800 cursor-pointer"
            >
              <Paperclip size={14} className="text-[#1ab0bc]" />
              <span>Attach PDF / Receipt</span>
            </button>

            {typeof cellContextMenu.val === "string" && (cellContextMenu.val.includes("/api/admin/stored-documents/") || cellContextMenu.val.includes("/uploads/") || cellContextMenu.val.endsWith(".pdf")) && (
              <>
                <a
                  href={cellContextMenu.val}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-3 py-1.5 text-left hover:bg-emerald-50 text-emerald-800 flex items-center gap-2 font-medium cursor-pointer"
                >
                  <FileText size={14} className="text-emerald-600" />
                  <span>Open Attached PDF</span>
                </a>
                <button
                  onClick={() => handleRemoveAttachment(cellContextMenu.rowId, cellContextMenu.colId)}
                  className="w-full px-3 py-1.5 text-left hover:bg-red-50 text-red-600 flex items-center gap-2 cursor-pointer"
                >
                  <X size={14} className="text-red-500" />
                  <span>Remove Attachment</span>
                </button>
              </>
            )}
          </div>

          <div className="py-1">
            <button
              onClick={() => handleCopyCell(cellContextMenu.val)}
              className="w-full px-3 py-1.5 text-left hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
            >
              <Copy size={13} className="text-gray-500" />
              <span>Copy</span>
            </button>
            <button
              onClick={() => handlePasteFromClipboardMenu(cellContextMenu.rowId, cellContextMenu.colId)}
              className="w-full px-3 py-1.5 text-left hover:bg-teal-50 flex items-center gap-2 cursor-pointer font-medium text-teal-800"
            >
              <ClipboardPaste size={13} className="text-[#1ab0bc]" />
              <span>Paste Cells (Ctrl+V)</span>
            </button>
            <button
              onClick={() => handleCutCell(cellContextMenu.rowId, cellContextMenu.colId, cellContextMenu.val)}
              className="w-full px-3 py-1.5 text-left hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
            >
              <Scissors size={13} className="text-gray-500" />
              <span>Cut</span>
            </button>
            <button
              onClick={() => handleClearCell(cellContextMenu.rowId, cellContextMenu.colId)}
              className="w-full px-3 py-1.5 text-left hover:bg-gray-100 flex items-center gap-2 text-amber-700 cursor-pointer"
            >
              <Trash size={13} className="text-amber-600" />
              <span>Clear Cell</span>
            </button>
          </div>
        </div>
      )}

      {/* ── ROW NUMBER RIGHT-CLICK CONTEXT MENU ── */}
      {rowContextMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ top: rowContextMenu.y, left: rowContextMenu.x }}
          className="fixed z-50 bg-white border border-gray-200 shadow-2xl rounded py-1.5 w-48 font-sans text-xs text-gray-700 divide-y divide-gray-100"
        >
          <div className="px-3 py-1 text-[10px] font-bold uppercase text-gray-400 tracking-wider">
            Row #{rowContextMenu.rowIndex + 1} Options
          </div>
          <div className="py-1">
            <button
              onClick={(e) => handleInsertRow(rowContextMenu.rowId, 'above', e)}
              className="w-full px-3 py-1.5 text-left hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle size={13} className="text-[#1ab0bc]" />
              <span>Insert Row Above</span>
            </button>
            <button
              onClick={(e) => handleInsertRow(rowContextMenu.rowId, 'below', e)}
              className="w-full px-3 py-1.5 text-left hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle size={13} className="text-[#1ab0bc]" />
              <span>Insert Row Below</span>
            </button>
          </div>
          <div className="py-1">
            <button
              onClick={(e) => handleClearRow(rowContextMenu.rowId, e)}
              className="w-full px-3 py-1.5 text-left hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
            >
              <Trash size={13} className="text-amber-600" />
              <span>Clear Row</span>
            </button>
            <button
              onClick={(e) => handleHideRow(rowContextMenu.rowId, e)}
              className="w-full px-3 py-1.5 text-left hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
            >
              <EyeOff size={13} className="text-teal-600" />
              <span>Hide Row</span>
            </button>
            <button
              onClick={(e) => handleDeleteRow(rowContextMenu.rowId, e)}
              className="w-full px-3 py-1.5 text-left hover:bg-red-50 text-red-600 flex items-center gap-2 cursor-pointer"
            >
              <Trash2 size={13} className="text-red-500" />
              <span>Delete Row</span>
            </button>
          </div>
        </div>
      )}

      {/* ── COLUMN HEADER RIGHT-CLICK CONTEXT MENU ── */}
      {colContextMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ top: colContextMenu.y, left: colContextMenu.x }}
          className="fixed z-50 bg-white border border-gray-200 shadow-2xl rounded py-1.5 w-52 font-sans text-xs text-gray-700 divide-y divide-gray-100"
        >
          <div className="px-3 py-1 text-[10px] font-bold uppercase text-gray-400 tracking-wider truncate">
            Column: {colContextMenu.label}
          </div>
          <div className="py-1">
            <button
              onClick={(e) => handleStartRenameCol(colContextMenu.colId, colContextMenu.label, e)}
              className="w-full px-3 py-1.5 text-left hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
            >
              <Edit2 size={13} className="text-gray-500" />
              <span>Rename Column</span>
            </button>
            {colContextMenu.colIndex > 0 && (
              <button
                onClick={(e) => handleMoveColumnByStep(colContextMenu.colId, 'left', e)}
                className="w-full px-3 py-1.5 text-left hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft size={13} className="text-gray-500" />
                <span>Move Column Left</span>
              </button>
            )}
            {colContextMenu.colIndex < visibleColumns.length - 1 && (
              <button
                onClick={(e) => handleMoveColumnByStep(colContextMenu.colId, 'right', e)}
                className="w-full px-3 py-1.5 text-left hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
              >
                <ArrowRight size={13} className="text-gray-500" />
                <span>Move Column Right</span>
              </button>
            )}
          </div>
          <div className="py-1">
            <button
              onClick={(e) => handleInsertColumn(colContextMenu.colId, 'left', e)}
              className="w-full px-3 py-1.5 text-left hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle size={13} className="text-[#1ab0bc]" />
              <span>Insert Column Left</span>
            </button>
            <button
              onClick={(e) => handleInsertColumn(colContextMenu.colId, 'right', e)}
              className="w-full px-3 py-1.5 text-left hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle size={13} className="text-[#1ab0bc]" />
              <span>Insert Column Right</span>
            </button>
          </div>
          <div className="py-1">
            <button
              onClick={(e) => handleHideColumn(colContextMenu.colId, e)}
              className="w-full px-3 py-1.5 text-left hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
            >
              <EyeOff size={13} className="text-teal-600" />
              <span>Hide Column</span>
            </button>
            <button
              onClick={(e) => handleDeleteColumn(colContextMenu.colId, e)}
              className="w-full px-3 py-1.5 text-left hover:bg-red-50 text-red-600 flex items-center gap-2 cursor-pointer"
            >
              <Trash2 size={13} className="text-red-500" />
              <span>Delete Column</span>
            </button>
          </div>
        </div>
      )}

      {/* HIDDEN FILE INPUT FOR CELL PDF ATTACHMENTS */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
}
