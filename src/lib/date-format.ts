/**
 * Universal standardized date formatter across Antigravity SSPACIA platform.
 * Formats all dates consistently as `D MMM YYYY` (e.g. `17 Aug 2026`, `5 Aug 2026`, `3 Aug 2027`).
 */
export const formatDisplayDate = (d?: string | Date | number | null): string => {
  if (!d) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (typeof d === 'number') {
    if (d > 1900 && d < 2100) return String(d);
    const dateObj = new Date(d);
    if (!isNaN(dateObj.getTime())) {
      return `${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
    }
    return String(d);
  }
  if (typeof d === 'string') {
    const trimmed = d.trim();
    if (!trimmed) return '';

    // YYYY-MM-DD or ISO timestamp (e.g. 2026-08-17 or 2026-08-17T00:00:00.000Z)
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const y = isoMatch[1];
      const mIdx = parseInt(isoMatch[2], 10) - 1;
      const dayNum = parseInt(isoMatch[3], 10);
      return `${dayNum} ${months[mIdx] || isoMatch[2]} ${y}`;
    }

    // D/M/YYYY or DD/MM/YYYY (standard Indian day-first slash format)
    const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
      const dayNum = parseInt(slashMatch[1], 10);
      const mIdx = parseInt(slashMatch[2], 10) - 1;
      const y = slashMatch[3];
      return `${dayNum} ${months[mIdx] || slashMatch[2]} ${y}`;
    }

    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return `${parsed.getDate()} ${months[parsed.getMonth()]} ${parsed.getFullYear()}`;
    }
    return trimmed;
  }

  if (d instanceof Date && !isNaN(d.getTime())) {
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  return '';
};
