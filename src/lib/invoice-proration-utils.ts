/**
 * Utility functions for calculating pro-rata / prorated invoice billing amounts
 * based on actual active days used in a billing month.
 */

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

export interface BillingMonthInfo {
  year: number;
  monthIndex: number; // 0-indexed (0 = Jan, 8 = Sep)
  monthName: string;
  totalDays: number;
  firstDateStr: string; // YYYY-MM-01
  lastDateStr: string;  // YYYY-MM-DD
}

/**
 * Parses a billing month string (e.g., "September 2026", "Aug 2026", "2026-09")
 * and returns the month metadata including the total days in that month.
 */
export function getBillingMonthInfo(billingMonthStr?: string | null, fallbackDate?: Date): BillingMonthInfo {
  const now = fallbackDate || new Date();
  let year = now.getFullYear();
  let monthIndex = now.getMonth();

  if (billingMonthStr) {
    const clean = String(billingMonthStr).trim().toLowerCase();
    
    // Check for "Month YYYY" pattern e.g. "september 2026"
    const parts = clean.split(/[\s,_\-]+/).filter(Boolean);
    for (const part of parts) {
      // Check for 4-digit year
      if (/^\d{4}$/.test(part)) {
        year = parseInt(part, 10);
      } else {
        // Check for month match
        const foundIdx = MONTH_NAMES.findIndex((m) => m.startsWith(part) || part.startsWith(m.slice(0, 3)));
        if (foundIdx !== -1) {
          monthIndex = foundIdx;
        }
      }
    }

    // Check for YYYY-MM format
    const isoMatch = clean.match(/^(\d{4})-(\d{1,2})/);
    if (isoMatch) {
      year = parseInt(isoMatch[1], 10);
      monthIndex = Math.max(0, Math.min(11, parseInt(isoMatch[2], 10) - 1));
    }
  }

  // Days in month: day 0 of the next month
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  const monthNumStr = String(monthIndex + 1).padStart(2, '0');
  const firstDateStr = `${year}-${monthNumStr}-01`;
  const lastDateStr = `${year}-${monthNumStr}-${String(totalDays).padStart(2, '0')}`;

  const monthNameCapitalized =
    MONTH_NAMES[monthIndex].charAt(0).toUpperCase() + MONTH_NAMES[monthIndex].slice(1);

  return {
    year,
    monthIndex,
    monthName: monthNameCapitalized,
    totalDays,
    firstDateStr,
    lastDateStr,
  };
}

/**
 * Calculates the inclusive number of days between two date strings (YYYY-MM-DD).
 * E.g., 2026-09-01 to 2026-09-11 is 11 days.
 */
export function calculateInclusiveDays(startDateStr?: string | null, endDateStr?: string | null): number {
  if (!startDateStr || !endDateStr) return 0;
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

  // Normalize to UTC midnight to avoid DST discrepancies
  const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());

  if (utcEnd < utcStart) return 0;
  const diffDays = Math.round((utcEnd - utcStart) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}

/**
 * Formats a date string (YYYY-MM-DD) into Indian standard DD-MM-YYYY
 */
export function formatDateToIndian(dateStr?: string | null): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${d.getFullYear()}`;
}

export interface ProrateCalculationResult {
  monthlyAmount: number;
  totalMonthDays: number;
  activeDays: number;
  dailyRate: number;
  proratedSubtotal: number;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
  periodLabel: string;
  formulaText: string;
}

/**
 * Calculates prorated billing amounts for a given monthly amount and active days.
 * E.g. Monthly 27,000, 30 days, 11 active days -> Subtotal 9,900, GST 1,782, Total 11,682
 */
export function calculateProratedBilling(params: {
  monthlyAmount: number;
  totalMonthDays: number;
  activeDays: number;
  gstPercent?: number;
  startDateStr?: string;
  endDateStr?: string;
  customSubtotal?: number | null;
}): ProrateCalculationResult {
  const {
    monthlyAmount,
    totalMonthDays,
    activeDays,
    gstPercent = 18,
    startDateStr,
    endDateStr,
    customSubtotal,
  } = params;

  const validMonthDays = Math.max(1, totalMonthDays || 30);
  const validActiveDays = Math.max(1, Math.min(validMonthDays, activeDays || validMonthDays));
  const dailyRate = Math.round((monthlyAmount / validMonthDays) * 100) / 100;

  const proratedSubtotal =
    customSubtotal !== undefined && customSubtotal !== null && !isNaN(customSubtotal)
      ? customSubtotal
      : Math.round(dailyRate * validActiveDays * 100) / 100;

  const gstAmount = Math.round(((proratedSubtotal * gstPercent) / 100) * 100) / 100;
  const totalAmount = Math.round(proratedSubtotal + gstAmount);

  let periodLabel = `${validActiveDays} of ${validMonthDays} Days`;
  if (startDateStr && endDateStr) {
    periodLabel = `From ${formatDateToIndian(startDateStr)} to ${formatDateToIndian(endDateStr)} (${validActiveDays} Days)`;
  }

  const formulaText = `₹${monthlyAmount.toLocaleString('en-IN')} ÷ ${validMonthDays} days × ${validActiveDays} days = ₹${proratedSubtotal.toLocaleString('en-IN')}`;

  return {
    monthlyAmount,
    totalMonthDays: validMonthDays,
    activeDays: validActiveDays,
    dailyRate,
    proratedSubtotal,
    gstPercent,
    gstAmount,
    totalAmount,
    periodLabel,
    formulaText,
  };
}
