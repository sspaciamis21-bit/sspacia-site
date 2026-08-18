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
  MoreVertical,
  ArrowDown,
  ArrowRight,
  ChevronDown,
  Paperclip,
  FileText,
  ExternalLink
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

  // Cell Attachment State (Attach PDF to cell)
  const [targetAttachCell, setTargetAttachCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [uploadingCell, setUploadingCell] = useState<{ rowId: string; colId: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Hidden Columns & Hidden Rows state (Google Sheets style)
  const [hiddenColIds, setHiddenColIds] = useState<string[]>([]);
  const [hiddenRowIds, setHiddenRowIds] = useState<string[]>([]);

  // Column Menu dropdown state
  const [activeColMenu, setActiveColMenu] = useState<string | null>(null);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestDataRef = useRef({ columns, rows });
  const hasPingedFms = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

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

  // Close column menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveColMenu(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const notifyFmsTyping = () => {
    if (hasPingedFms.current) return;
    hasPingedFms.current = true;
    fetch('/api/admin/expenses/fms-track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationId, centerName: locationName })
    }).catch(() => {});
  };

  // Initialize and ensure 100 rows exist out of the box
  useEffect(() => {
    const defaultCols = initialColumns.length > 0 ? initialColumns : [
      { id: 'col_1', label: 'Date', width: '140px' },
      { id: 'col_2', label: 'Expense Category / Item', width: '220px' },
      { id: 'col_3', label: 'Vendor / Paid To', width: '180px' },
      { id: 'col_4', label: 'Amount (₹)', width: '140px' },
      { id: 'col_5', label: 'Payment Mode', width: '140px' },
      { id: 'col_6', label: 'Receipt / Ref #', width: '140px' },
      { id: 'col_7', label: 'Remarks / Notes', width: '240px' },
    ];
    setColumns(defaultCols);

    let paddedRows = [...initialRows];
    if (paddedRows.length < 100) {
      const needed = 100 - paddedRows.length;
      const startIndex = paddedRows.length + 1;
      for (let i = 0; i < needed; i++) {
        const rowNum = startIndex + i;
        paddedRows.push({
          id: `row_${rowNum}`,
        });
      }
    }
    setRows(paddedRows);
    latestDataRef.current = { columns: defaultCols, rows: paddedRows };
    setHasChanges(false);
    setAutoSaveStatus("saved");
  }, [locationId, initialColumns, initialRows]);

  // Unified save routine (Silent background auto-save or manual save)
  const saveToServer = async (isSilent = false) => {
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
      if (onSaved) onSaved();
    } catch (err: any) {
      console.error(err);
      setAutoSaveStatus("error");
      if (!isSilent) {
        toast.error(err.message || "Failed to save sheet");
      }
    } finally {
      if (!isSilent) setSaving(false);
    }
  };

  // Schedule auto-save on any edit (debounced 600ms)
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
    }, 600);
  };

  // Visible filtered columns and rows
  const visibleColumns = useMemo(() => {
    return columns.filter((col) => !hiddenColIds.includes(col.id));
  }, [columns, hiddenColIds]);

  const visibleRows = useMemo(() => {
    let result = rows.filter((row) => !hiddenRowIds.includes(row.id));
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((val) =>
          String(val || "").toLowerCase().includes(query)
        )
      );
    }
    return result;
  }, [rows, hiddenRowIds, searchQuery]);

  // Calculate live sum total for numeric amount cells
  const totalAmount = useMemo(() => {
    return rows.reduce((sum, row) => {
      const amountKey = Object.keys(row).find(k => k.toLowerCase().includes('amount') || k === 'col_4') || 'col_4';
      const val = parseFloat(row[amountKey]);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }, [rows]);

  // Start editing a cell
  const handleCellClick = (rowId: string, colId: string, currentValue: any) => {
    notifyFmsTyping();
    setEditingCell({ rowId, colId });
    setCellValue(currentValue !== undefined && currentValue !== null ? String(currentValue) : "");
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

  // ── CELL ATTACHMENT HANDLERS (Attach PDF / Document to Cell) ──
  const handleTriggerAttachPdf = (rowId: string, colId: string) => {
    notifyFmsTyping();
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

      // Update row with fileUrl
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

  // ── GOOGLE SHEETS KEYBOARD NAVIGATION (Enter, Tab, Shift+Enter, Shift+Tab, Arrows) ──
  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!editingCell) return;

    const currentRowIndex = visibleRows.findIndex((r) => r.id === editingCell.rowId);
    const currentColIndex = visibleColumns.findIndex((c) => c.id === editingCell.colId);

    if (currentRowIndex === -1 || currentColIndex === -1) return;

    // 1. ENTER / DOWN (Move to cell below)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const updatedRows = commitCurrentCell();

      if (currentRowIndex + 1 < visibleRows.length) {
        const nextRow = visibleRows[currentRowIndex + 1];
        const nextVal = nextRow[editingCell.colId];
        setEditingCell({ rowId: nextRow.id, colId: editingCell.colId });
        setCellValue(nextVal !== undefined && nextVal !== null ? String(nextVal) : "");
      } else {
        // At the bottom row: automatically append a new row (like Excel/Google Sheets)
        const newRowId = `row_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        const newRow: RowData = { id: newRowId };
        const newRows = [...updatedRows, newRow];
        setRows(newRows);
        scheduleAutoSave(undefined, newRows);
        setEditingCell({ rowId: newRowId, colId: editingCell.colId });
        setCellValue("");
      }
      return;
    }

    // 2. SHIFT + ENTER / UP (Move to cell above)
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      commitCurrentCell();

      if (currentRowIndex > 0) {
        const prevRow = visibleRows[currentRowIndex - 1];
        const prevVal = prevRow[editingCell.colId];
        setEditingCell({ rowId: prevRow.id, colId: editingCell.colId });
        setCellValue(prevVal !== undefined && prevVal !== null ? String(prevVal) : "");
      }
      return;
    }

    // 3. TAB / RIGHT (Move to next column on the right)
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      commitCurrentCell();

      if (currentColIndex + 1 < visibleColumns.length) {
        const nextCol = visibleColumns[currentColIndex + 1];
        const nextVal = visibleRows[currentRowIndex][nextCol.id];
        setEditingCell({ rowId: editingCell.rowId, colId: nextCol.id });
        setCellValue(nextVal !== undefined && nextVal !== null ? String(nextVal) : "");
      } else if (currentRowIndex + 1 < visibleRows.length) {
        // Wrap to start of next row
        const nextRow = visibleRows[currentRowIndex + 1];
        const firstCol = visibleColumns[0];
        const nextVal = nextRow[firstCol.id];
        setEditingCell({ rowId: nextRow.id, colId: firstCol.id });
        setCellValue(nextVal !== undefined && nextVal !== null ? String(nextVal) : "");
      }
      return;
    }

    // 4. SHIFT + TAB / LEFT (Move to previous column on the left)
    if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      commitCurrentCell();

      if (currentColIndex > 0) {
        const prevCol = visibleColumns[currentColIndex - 1];
        const prevVal = visibleRows[currentRowIndex][prevCol.id];
        setEditingCell({ rowId: editingCell.rowId, colId: prevCol.id });
        setCellValue(prevVal !== undefined && prevVal !== null ? String(prevVal) : "");
      } else if (currentRowIndex > 0) {
        // Wrap to end of prev row
        const prevRow = visibleRows[currentRowIndex - 1];
        const lastCol = visibleColumns[visibleColumns.length - 1];
        const prevVal = prevRow[lastCol.id];
        setEditingCell({ rowId: prevRow.id, colId: lastCol.id });
        setCellValue(prevVal !== undefined && prevVal !== null ? String(prevVal) : "");
      }
      return;
    }

    // 5. ESCAPE (Cancel edit)
    if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  // Column Management: Add Column
  const handleAddColumn = () => {
    const newColNum = columns.length + 1;
    const newColId = `col_${Date.now()}`;
    const newColLabel = `Column ${newColNum}`;
    const newCol: ColumnConfig = {
      id: newColId,
      label: newColLabel,
      width: "160px"
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

  // Column Management: Hide / Unhide Column (Google Sheets style)
  const handleHideColumn = (colId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveColMenu(null);
    if (visibleColumns.length <= 1) {
      toast.error("Cannot hide the last visible column!");
      return;
    }
    setHiddenColIds([...hiddenColIds, colId]);
    toast.info("Column hidden");
  };

  const handleUnhideAllColumns = () => {
    setHiddenColIds([]);
    toast.success("All columns are now visible!");
  };

  // Row Management
  const handleAddRow = () => {
    const newRowId = `row_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newRow: RowData = { id: newRowId };
    const newRows = [newRow, ...rows];
    setRows(newRows);
    scheduleAutoSave(undefined, newRows);
    toast.success("New row added!");
  };

  const handleDeleteRow = (rowId: string) => {
    const newRows = rows.filter((r) => r.id !== rowId);
    setRows(newRows);
    setHiddenRowIds(hiddenRowIds.filter(id => id !== rowId));
    scheduleAutoSave(undefined, newRows);
    toast.info("Row deleted.");
  };

  // Row Management: Hide / Unhide Row
  const handleHideRow = (rowId: string) => {
    setHiddenRowIds([...hiddenRowIds, rowId]);
    toast.info("Row hidden");
  };

  const handleUnhideAllRows = () => {
    setHiddenRowIds([]);
    toast.success("All rows are now visible!");
  };

  const handleManualSave = () => {
    commitCurrentCell();
    saveToServer(false);
  };

  const handleExportCSV = () => {
    if (rows.length === 0) {
      toast.error("No data to export!");
      return;
    }

    const headers = visibleColumns.map((c) => `"${c.label}"`);
    const csvRows = visibleRows.map((row) =>
      visibleColumns.map((c) => `"${String(row[c.id] || "").replace(/"/g, '""')}"`).join(",")
    );

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `SSPACIA_${locationName.replace(/\s+/g, "_")}_Expenses_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Expense spreadsheet exported to CSV!");
  };

  return (
    <div className="bg-white border border-gray-200 shadow-sm flex flex-col overflow-hidden font-sans select-none">
      
      {/* ── TOP TOOLBAR BAR (GOOGLE SHEETS / EXCEL STYLE) ── */}
      <div className="bg-[#f8fafc] border-b border-gray-200 px-4 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* TITLE & SILENT CLOUD AUTO-SAVE STATUS */}
        <div className="flex items-center gap-3 min-w-[280px]">
          <div className="w-8 h-8 bg-teal-50 border border-teal-200 text-[#1ab0bc] flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-display font-black text-sm md:text-base text-gray-900 uppercase tracking-tight flex items-center gap-2">
              <span>{locationName} Expense Sheet</span>
            </h2>
            {/* SILENT AUTO-SAVE CLOUD STATUS */}
            <div className="flex items-center gap-1.5 text-[11px] font-mono mt-0.5 text-gray-500">
              {autoSaveStatus === "saving" && (
                <span className="flex items-center gap-1 text-[#1ab0bc] font-bold animate-pulse">
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Saving to cloud...</span>
                </span>
              )}
              {autoSaveStatus === "saved" && (
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Saved to cloud {lastSavedTime ? `(${lastSavedTime})` : ''}</span>
                </span>
              )}
              {autoSaveStatus === "unsaved" && (
                <span className="flex items-center gap-1 text-amber-600 font-medium">
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Saving...</span>
                </span>
              )}
              {autoSaveStatus === "error" && (
                <span className="flex items-center gap-1 text-rose-600 font-bold">
                  <span>Save failed</span>
                  <button onClick={handleManualSave} className="underline cursor-pointer">Retry</button>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* TOOLBAR CONTROLS */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* SEARCH INPUT */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search sheet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-2.5 py-1 bg-white border border-gray-300 text-xs text-gray-800 outline-none focus:border-[#1ab0bc] w-36 md:w-44 font-mono"
            />
          </div>

          {/* UNHIDE COLUMNS / ROWS INDICATORS */}
          {hiddenColIds.length > 0 && (
            <button
              onClick={handleUnhideAllColumns}
              className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
              title="Click to reveal all hidden columns"
            >
              <Eye className="w-3.5 h-3.5 text-amber-600" />
              <span>Unhide Cols ({hiddenColIds.length})</span>
            </button>
          )}

          {hiddenRowIds.length > 0 && (
            <button
              onClick={handleUnhideAllRows}
              className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
              title="Click to reveal all hidden rows"
            >
              <Eye className="w-3.5 h-3.5 text-amber-600" />
              <span>Unhide Rows ({hiddenRowIds.length})</span>
            </button>
          )}

          {/* FREEZE CONTROLS */}
          <button
            onClick={() => setFreezeHeader(!freezeHeader)}
            className={`px-2 py-1 text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
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
            className={`px-2 py-1 text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
              freezeFirstCol
                ? "bg-teal-50 text-[#1ab0bc] border-teal-300"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
            }`}
            title="Toggle Freeze Column #"
          >
            {freezeFirstCol ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            <span className="text-[11px]">Col #</span>
          </button>

          {/* ADD COLUMN BUTTON */}
          <button
            onClick={handleAddColumn}
            className="bg-white hover:bg-gray-100 text-gray-800 px-2.5 py-1 text-xs font-bold uppercase tracking-wider border border-gray-300 flex items-center gap-1 transition-all cursor-pointer"
          >
            <Columns className="w-3.5 h-3.5 text-[#1ab0bc]" />
            <span>+ Column</span>
          </button>

          {/* ADD ROW BUTTON */}
          <button
            onClick={handleAddRow}
            className="bg-white hover:bg-gray-100 text-gray-800 px-2.5 py-1 text-xs font-bold uppercase tracking-wider border border-gray-300 flex items-center gap-1 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#1ab0bc]" />
            <span>+ Row</span>
          </button>

          {/* ATTACH PDF TO ACTIVE CELL BUTTON */}
          <button
            type="button"
            onClick={() => {
              if (editingCell) {
                handleTriggerAttachPdf(editingCell.rowId, editingCell.colId);
              } else {
                toast.info("Please click any cell first to attach a PDF to it");
              }
            }}
            className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider border flex items-center gap-1 transition-all cursor-pointer ${
              editingCell
                ? "bg-teal-50 text-[#1ab0bc] border-teal-300 hover:bg-teal-100 shadow-2xs"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
            }`}
            title={editingCell ? "Attach PDF to the selected cell" : "Click on any cell first, then click Attach PDF"}
          >
            <Paperclip className="w-3.5 h-3.5 text-[#1ab0bc]" />
            <span>Attach PDF</span>
          </button>

          {/* EXPORT CSV */}
          <button
            onClick={handleExportCSV}
            className="bg-white hover:bg-gray-100 text-gray-800 px-2.5 py-1 text-xs font-bold uppercase tracking-wider border border-gray-300 flex items-center gap-1 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>CSV</span>
          </button>

          {/* MANUAL SAVE BADGE / BUTTON */}
          <button
            onClick={handleManualSave}
            disabled={saving}
            className={`px-3 py-1 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
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

      {/* ── GOOGLE SHEETS / EXCEL DATA CANVAS ── */}
      <div className="overflow-x-auto overflow-y-auto max-h-[700px] relative border-b border-gray-200 scrollbar-thin">
        <table className="w-full text-left border-collapse text-xs font-mono">
          
          {/* HEADER ROW */}
          <thead className={`bg-[#f1f5f9] text-gray-700 font-bold uppercase tracking-wider ${freezeHeader ? "sticky top-0 z-20 shadow-xs" : ""}`}>
            <tr className="border-b border-gray-300">
              
              {/* INDEX COLUMN # */}
              <th className={`border-r border-gray-300 px-2.5 py-2 text-center w-12 text-[10px] text-gray-500 font-bold ${freezeFirstCol ? "sticky left-0 z-30 bg-[#e2e8f0]" : "bg-[#e2e8f0]"}`}>
                #
              </th>

              {/* COLUMNS */}
              {visibleColumns.map((col) => {
                const isRenaming = editingColId === col.id;
                const isMenuOpen = activeColMenu === col.id;

                return (
                  <th
                    key={col.id}
                    style={{ width: col.width || "160px", minWidth: "140px" }}
                    className="px-2.5 py-1.5 border-r border-gray-300 bg-[#f1f5f9] text-gray-800 text-[11px] group relative select-none"
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
                        <span
                          onDoubleClick={(e) => handleStartRenameCol(col.id, col.label, e)}
                          className="cursor-pointer hover:underline truncate font-bold text-gray-900"
                          title="Double-click to rename header"
                        >
                          {col.label}
                        </span>

                        {/* COLUMN MENU DROPDOWN (Google Sheets Style) */}
                        <div className="relative">
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
                              className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 shadow-lg z-50 py-1 font-sans text-xs font-normal"
                            >
                              <button
                                onClick={() => handleStartRenameCol(col.id, col.label)}
                                className="w-full px-3 py-1.5 text-left hover:bg-gray-100 flex items-center gap-2 text-gray-700 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                                <span>Rename Header</span>
                              </button>
                              <button
                                onClick={() => handleHideColumn(col.id)}
                                className="w-full px-3 py-1.5 text-left hover:bg-gray-100 flex items-center gap-2 text-gray-700 cursor-pointer"
                              >
                                <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                                <span>Hide Column</span>
                              </button>
                              <button
                                onClick={() => handleDeleteColumn(col.id)}
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

              <th className="px-2 py-1.5 text-center w-16 border-r border-gray-300 text-[10px] text-gray-500">
                Action
              </th>
            </tr>
          </thead>

          {/* SPREADSHEET BODY ROWS */}
          <tbody className="divide-y divide-gray-200 bg-white">
            {visibleRows.map((row, idx) => (
              <tr
                key={row.id}
                className="hover:bg-slate-50 transition-colors group border-b border-gray-200"
              >
                {/* ROW INDEX COLUMN (sticky left-0 if enabled) */}
                <td className={`border-r border-gray-300 px-2 py-1.5 text-center text-gray-400 font-bold text-[10px] ${freezeFirstCol ? "sticky left-0 z-10 bg-[#f8fafc]" : "bg-[#f8fafc]"}`}>
                  {idx + 1}
                </td>

                {/* CELLS */}
                {visibleColumns.map((col) => {
                  const isEditing = editingCell?.rowId === row.id && editingCell?.colId === col.id;
                  const isUploading = uploadingCell?.rowId === row.id && uploadingCell?.colId === col.id;
                  const val = row[col.id];
                  const isPdf = typeof val === "string" && (
                    val.includes("/api/admin/stored-documents/") ||
                    val.includes("/uploads/") ||
                    val.toLowerCase().endsWith(".pdf")
                  );

                  return (
                    <td
                      key={col.id}
                      onClick={() => handleCellClick(row.id, col.id, val)}
                      className={`px-2 py-1.5 border-r border-gray-200 cursor-cell relative min-h-[32px] ${
                        isEditing
                          ? "bg-white ring-2 ring-[#1ab0bc] ring-inset z-10"
                          : "hover:bg-sky-50/50"
                      }`}
                    >
                      {isUploading ? (
                        <div className="flex items-center gap-1.5 text-xs text-teal-700 font-bold px-1 animate-pulse">
                          <Loader2 size={12} className="animate-spin" />
                          <span>Attaching PDF...</span>
                        </div>
                      ) : isEditing ? (
                        <div className="relative w-full h-full">
                          {/* FULL-WIDTH CLEAN CELL INPUT */}
                          <input
                            ref={inputRef}
                            type="text"
                            value={cellValue}
                            onChange={(e) => setCellValue(e.target.value)}
                            onBlur={handleCellBlur}
                            onKeyDown={handleCellKeyDown}
                            placeholder={isPdf ? "PDF attached..." : ""}
                            className="w-full h-full bg-transparent px-1 py-0.5 text-xs text-gray-900 outline-none font-mono font-medium"
                          />

                          {/* FLOATING ACTION PILL ABOVE THE ACTIVE CELL */}
                          <div className="absolute -top-7 right-0 z-30 flex items-center gap-1.5 bg-white border border-[#1ab0bc] shadow-md px-2 py-0.5 rounded text-[10px] font-bold text-[#1ab0bc] whitespace-nowrap">
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleTriggerAttachPdf(row.id, col.id);
                              }}
                              className="flex items-center gap-1 hover:text-teal-900 cursor-pointer"
                              title="Click to attach PDF file to this cell"
                            >
                              <Paperclip size={10} />
                              <span>Attach PDF</span>
                            </button>

                            {isPdf && (
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleRemoveAttachment(row.id, col.id);
                                }}
                                className="text-gray-400 hover:text-red-600 pl-1 border-l border-gray-200 cursor-pointer"
                                title="Remove PDF attachment"
                              >
                                <X size={11} />
                              </button>
                            )}
                          </div>
                        </div>
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
                      ) : (
                        <div className="flex items-center justify-between min-h-[18px] px-1">
                          <span className="text-gray-900 truncate max-w-[260px] block">
                            {val !== "" && val !== undefined && val !== null ? String(val) : ""}
                          </span>
                        </div>
                      )}
                    </td>
                  );
                })}

                {/* ROW ACTIONS (Hide / Delete) */}
                <td className="px-1 py-1 text-center border-r border-gray-200 whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleHideRow(row.id)}
                      className="p-1 hover:bg-amber-100 text-amber-600 rounded cursor-pointer"
                      title="Hide Row"
                    >
                      <EyeOff className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteRow(row.id)}
                      className="p-1 hover:bg-red-100 text-red-500 rounded cursor-pointer"
                      title="Delete Row"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>

          {/* SUMMARY FOOTER ROW (Google Sheets Style) */}
          <tfoot className="bg-[#f8fafc] border-t-2 border-gray-300 font-bold">
            <tr>
              <td className="px-2 py-2 text-center text-gray-500 text-[10px] border-r border-gray-300">
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
              <td className="border-r border-gray-300"></td>
            </tr>
          </tfoot>
        </table>
      </div>

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
