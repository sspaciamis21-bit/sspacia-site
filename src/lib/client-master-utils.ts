export const DEFAULT_CLIENT_ID_PREFIX = 'SSPACIA/AHD/CGM';

export function isParkingProduct(name: string): boolean {
  return name.trim().toLowerCase().includes('parking');
}

export function isDocumentationChargesProduct(name: string): boolean {
  return name.trim().toLowerCase().includes('documentation');
}

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeProductAmount(seats: number, rate: number): number {
  return roundCurrency(seats * rate);
}

export function computeProductTotal(amount: number, gstPercent: number): number {
  const gstVal = (amount * gstPercent) / 100;
  return Math.round(amount + gstVal);
}

export function validateMobile(mobile: string): boolean {
  const digits = mobile.replace(/\D/g, '');
  return digits.length === 10;
}

export function sanitizeMobileInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10);
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function buildHoAddress(parts: {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  country?: string;
  pinCode?: string;
}): string | null {
  const segments = [
    parts.line1?.trim(),
    parts.line2?.trim(),
    parts.city?.trim(),
    parts.state?.trim(),
    parts.country?.trim(),
    parts.pinCode?.trim(),
  ].filter(Boolean);
  return segments.length > 0 ? segments.join(', ') : null;
}

/**
 * Calculates Pro-Rata / Prorated Billing for mid-month seat additions
 * Formula: (Rate / Days in Month) * Remaining Days * Seats
 */
export function calculateProratedAmount(
  seats: number,
  monthlyRatePerSeat: number,
  startDateStr: string
): {
  daysInMonth: number;
  activeDays: number;
  proratedSubtotal: number;
  proratedGst: number;
  proratedTotal: number;
} {
  const date = new Date(startDateStr);
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  const startDay = date.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const activeDays = Math.max(1, daysInMonth - startDay + 1);

  const proratedPerSeat = (monthlyRatePerSeat / daysInMonth) * activeDays;
  const proratedSubtotal = roundCurrency(proratedPerSeat * seats);
  const proratedGst = roundCurrency((proratedSubtotal * 18) / 100);
  const proratedTotal = Math.round(proratedSubtotal + proratedGst);

  return {
    daysInMonth,
    activeDays,
    proratedSubtotal,
    proratedGst,
    proratedTotal,
  };
}

/**
 * Calculates Mid-Month Rate Escalation split
 * Period 1: 1st to (Escalation Day - 1) at Old Rate
 * Period 2: Escalation Day to End of Month at New Rate
 */
export function calculateEscalatedSplit(
  seats: number,
  oldRatePerSeat: number,
  newRatePerSeat: number,
  escalationDateStr: string
): {
  daysInMonth: number;
  preDays: number;
  postDays: number;
  preAmount: number;
  postAmount: number;
  totalSubtotal: number;
  gstAmount: number;
  grandTotal: number;
} {
  const date = new Date(escalationDateStr);
  const year = date.getFullYear();
  const month = date.getMonth();
  const escDay = date.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const preDays = Math.max(0, escDay - 1);
  const postDays = Math.max(1, daysInMonth - escDay + 1);

  const preAmount = roundCurrency(((oldRatePerSeat / daysInMonth) * preDays) * seats);
  const postAmount = roundCurrency(((newRatePerSeat / daysInMonth) * postDays) * seats);
  const totalSubtotal = roundCurrency(preAmount + postAmount);
  const gstAmount = roundCurrency((totalSubtotal * 18) / 100);
  const grandTotal = Math.round(totalSubtotal + gstAmount);

  return {
    daysInMonth,
    preDays,
    postDays,
    preAmount,
    postAmount,
    totalSubtotal,
    gstAmount,
    grandTotal,
  };
}

export interface ProductRow {
  id?: number;
  cabinName: string;
  noOfSeats: number | '';
  ratePerAgreement: number | '';
  amount: number | '';
  gstPercent: number | '';
  totalAmount: number | '';
  paymentDuration: string; // 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY'
  paymentDueDay: number | '';
  firstPaymentDate: string;
  isAmountManuallyEdited: boolean;
  isTotalAmountManuallyEdited: boolean;

  // Secondary/Expansion Agreement Options
  hasSeparateAgreement?: boolean;
  agreementPdfUrl?: string;
  agreementPdfName?: string;
  agreementStartDate?: string;
  agreementEndDate?: string;
  lockinEndDate?: string;

  // Prorated & Escalation Options
  billingType?: string; // 'REGULAR' | 'PRORATED' | 'ESCALATED'
  proratedStartDate?: string;
  proratedEndDate?: string;
  escalationPercent?: number | '';
  escalationApplicable?: string;
  preEscalationRate?: number | '';
  postEscalationRate?: number | '';
}

export function createEmptyProductRow(): ProductRow {
  return {
    cabinName: '',
    noOfSeats: '',
    ratePerAgreement: '',
    amount: '',
    gstPercent: 18,
    totalAmount: '',
    paymentDuration: 'MONTHLY',
    paymentDueDay: 5, // Standard 5th of the month default
    firstPaymentDate: '',
    isAmountManuallyEdited: false,
    isTotalAmountManuallyEdited: false,
    hasSeparateAgreement: false,
    agreementPdfUrl: '',
    agreementPdfName: '',
    agreementStartDate: '',
    agreementEndDate: '',
    lockinEndDate: '',
    billingType: 'REGULAR',
    proratedStartDate: '',
    proratedEndDate: '',
    escalationPercent: '',
    escalationApplicable: '',
    preEscalationRate: '',
    postEscalationRate: '',
  };
}
