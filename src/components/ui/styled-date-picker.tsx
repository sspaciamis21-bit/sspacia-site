"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Home, ChevronDown, Calendar as CalendarIcon } from "lucide-react";

interface StyledDatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  min?: string; // YYYY-MM-DD
  max?: string; // YYYY-MM-DD
  className?: string;
  triggerClassName?: string;
  id?: string;
  align?: "left" | "right" | "auto" | "center";
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Formats a "YYYY-MM-DD" string into "Sun, 13 Sep, 2026"
 */
function formatDisplayDate(dateStr?: string): string {
  if (!dateStr || !dateStr.includes("-")) return "Select Date";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d || isNaN(y) || isNaN(m) || isNaN(d)) return "Select Date";

  const date = new Date(y, m - 1, d);
  const weekday = WEEKDAY_NAMES[date.getDay()];
  const dayStr = String(d).padStart(2, "0");
  const monthStr = MONTH_NAMES[m - 1]?.slice(0, 3) || "";
  return `${weekday}, ${dayStr} ${monthStr}, ${y}`;
}

export function StyledDatePicker({
  value,
  onChange,
  min,
  max,
  className = "",
  triggerClassName = "",
  id,
  align = "auto"
}: StyledDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial view year and month from value or today
  const initialDate = useMemo(() => {
    if (value && value.includes("-")) {
      const [y, m, d] = value.split("-").map(Number);
      if (y && m && d) return new Date(y, m - 1, d);
    }
    return new Date();
  }, [value]);

  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth()); // 0-indexed

  // Sync view when value changes externally
  useEffect(() => {
    if (value && value.includes("-")) {
      const [y, m, d] = value.split("-").map(Number);
      if (y && m && d) {
        setViewYear(y);
        setViewMonth(m - 1);
      }
    }
  }, [value]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => {
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }, [today]);

  const minDateStr = min || todayStr;

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleGoToday = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  // Generate calendar days grid (including trailing/leading from neighbor months)
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: Array<{
      day: number;
      month: number; // 0-indexed
      year: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isSunday: boolean;
      isPast: boolean;
      isSelected: boolean;
      isToday: boolean;
    }> = [];

    // Prev month trailing days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const cellDate = new Date(y, m, d);
      cells.push({
        day: d,
        month: m,
        year: y,
        dateStr,
        isCurrentMonth: false,
        isSunday: cellDate.getDay() === 0,
        isPast: dateStr < minDateStr,
        isSelected: dateStr === value,
        isToday: dateStr === todayStr
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const cellDate = new Date(viewYear, viewMonth, d);
      cells.push({
        day: d,
        month: viewMonth,
        year: viewYear,
        dateStr,
        isCurrentMonth: true,
        isSunday: cellDate.getDay() === 0,
        isPast: dateStr < minDateStr,
        isSelected: dateStr === value,
        isToday: dateStr === todayStr
      });
    }

    // Next month leading days to fill 35 or 42 cells (6 rows)
    const totalCells = cells.length > 35 ? 42 : 35;
    const remaining = totalCells - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const cellDate = new Date(y, m, d);
      cells.push({
        day: d,
        month: m,
        year: y,
        dateStr,
        isCurrentMonth: false,
        isSunday: cellDate.getDay() === 0,
        isPast: dateStr < minDateStr,
        isSelected: dateStr === value,
        isToday: dateStr === todayStr
      });
    }

    return cells;
  }, [viewYear, viewMonth, value, minDateStr, todayStr]);

  const handleSelectDate = (dateStr: string, isPast: boolean) => {
    if (isPast) return;
    onChange(dateStr);
    setIsOpen(false);
  };

  // Year options: past 1 year to next 5 years
  const yearOptions = useMemo(() => {
    const curr = today.getFullYear();
    const list: number[] = [];
    for (let y = curr; y <= curr + 5; y++) {
      list.push(y);
    }
    return list;
  }, [today]);

  const alignClass =
    align === "right"
      ? "right-0 max-sm:left-0"
      : align === "center"
      ? "left-1/2 -translate-x-1/2"
      : align === "left"
      ? "left-0"
      : "left-0 sm:left-auto sm:right-0";

  const transformOrigin =
    align === "right"
      ? "top right"
      : align === "center"
      ? "top center"
      : "top left";

  return (
    <div ref={containerRef} className={`relative inline-block ${isOpen ? "z-50" : ""} ${className}`}>
      {/* ── Input Trigger Button (Matches User Screenshot) ── */}
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`bg-white border-2 transition-all rounded-md px-3.5 py-2 flex items-center justify-between gap-3 text-left shadow-xs cursor-pointer group select-none min-w-[190px] sm:min-w-[210px] ${
          isOpen
            ? "border-[#1ab0bc] ring-2 ring-[#1ab0bc]/20"
            : "border-gray-300 hover:border-[#1ab0bc]"
        } ${triggerClassName}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0">
          <CalendarIcon className="w-4 h-4 text-[#1ab0bc] shrink-0" />
          <span className="text-xs sm:text-[13px] font-bold text-gray-800 tracking-tight truncate">
            {formatDisplayDate(value)}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-black shrink-0 transition-transform duration-200 fill-current ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* ── Floating Calendar Popover Dropdown (Matches Screenshot) ── */}
      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 z-[9999] bg-white border border-gray-300 rounded-md shadow-2xl p-2.5 sm:p-3 w-[290px] sm:w-[310px] max-w-[calc(100vw-32px)] select-none animate-in fade-in zoom-in-95 duration-150 ${alignClass}`}
          style={{ transformOrigin }}
        >
          {/* Header Controls: < Home Month▾ Year▾ > */}
          <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-gray-200 gap-1">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded text-gray-700 transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleGoToday}
                className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded text-gray-700 transition-colors cursor-pointer"
                title="Go to Today"
              >
                <Home className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Month & Year Selectors */}
            <div className="flex items-center gap-1 font-bold text-xs sm:text-[13px] text-gray-800">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="bg-transparent hover:bg-gray-100 font-bold text-xs sm:text-[13px] text-gray-800 rounded px-1.5 py-1 outline-none cursor-pointer border-0"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="bg-transparent hover:bg-gray-100 font-bold text-xs sm:text-[13px] text-gray-800 rounded px-1.5 py-1 outline-none cursor-pointer border-0"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded text-gray-700 transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Row (Sun Mon Tue Wed Thu Fri Sat) */}
          <div className="grid grid-cols-7 border border-gray-300 bg-gray-100 text-center">
            {WEEKDAY_NAMES.map((day, idx) => (
              <div
                key={day}
                className={`py-1 text-[11px] font-bold border-r last:border-r-0 border-gray-300 ${
                  idx === 0 ? "text-rose-600 font-black" : "text-gray-700"
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 border-l border-b border-gray-300">
            {calendarCells.map((cell, idx) => {
              const isSelected = cell.isSelected;
              const isPast = cell.isPast;
              const isCurrent = cell.isCurrentMonth;
              const isSun = cell.isSunday;

              return (
                <button
                  key={`${cell.dateStr}-${idx}`}
                  type="button"
                  disabled={isPast}
                  onClick={() => handleSelectDate(cell.dateStr, isPast)}
                  className={`h-8 sm:h-8.5 text-xs font-semibold flex items-center justify-center border-t border-r border-gray-200 transition-colors relative cursor-pointer ${
                    isSelected
                      ? "bg-[#0ea5e9] text-white font-black z-10 shadow-xs hover:bg-[#0284c7]"
                      : isPast
                      ? "text-gray-300 bg-gray-50/40 cursor-not-allowed"
                      : !isCurrent
                      ? "text-gray-300 bg-gray-50/20 hover:bg-sky-50 hover:text-sky-700"
                      : isSun
                      ? "text-rose-600 font-bold hover:bg-rose-50"
                      : "text-gray-800 hover:bg-sky-50 hover:text-sky-700"
                  }`}
                  title={
                    isPast
                      ? "Date has passed"
                      : isSun
                      ? `${cell.dateStr} (Sunday - Workspaces Closed)`
                      : cell.dateStr
                  }
                >
                  <span>{cell.day}</span>
                  {cell.isToday && !isSelected && (
                    <span className="w-1 h-1 bg-[#1ab0bc] rounded-full absolute bottom-1 left-1/2 -translate-x-1/2" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Notice */}
          <div className="pt-2 mt-2 border-t border-gray-200 flex items-center justify-between text-[10px] text-gray-500">
            <span className="font-mono">
              {value ? `Selected: ${value}` : "Click date to select"}
            </span>
            <button
              type="button"
              onClick={() => {
                onChange(todayStr);
                setIsOpen(false);
              }}
              className="text-[#1ab0bc] hover:underline font-bold cursor-pointer"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
