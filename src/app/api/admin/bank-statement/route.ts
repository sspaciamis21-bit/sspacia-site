import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { BANK_RULES_SETTING_KEY, DEFAULT_BANK_RULES, BankRulesState } from '@/app/api/admin/bank-rules/route';

export const dynamic = 'force-dynamic';

const SETTING_KEY = 'bank_statement_icici_136705002010';

const DEFAULT_CONFIG = {
  bankName: 'ICICI BANK',
  accountNo: '136705002010',
  openingBalance: 50000,
  asOfDate: '2026-08-01',
};

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;

  try {
    const payload = await verifyToken(token);
    if (!payload?.id) return null;

    const user = await (prisma as any).user.findUnique({
      where: { id: Number(payload.id) },
      include: { role: true },
    });

    return user;
  } catch {
    return null;
  }
}

function parseDateRobust(input: any): Date | null {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  if (typeof input === 'number') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  const s = String(input).trim();
  if (!s) return null;

  // YYYY-MM-DD or YYYY/MM/DD (e.g. 2026-04-13 or 2026/04/13)
  const yyyymmdd = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (yyyymmdd) {
    const y = parseInt(yyyymmdd[1], 10);
    const m = parseInt(yyyymmdd[2], 10) - 1;
    const d = parseInt(yyyymmdd[3], 10);
    const dateObj = new Date(y, m, d, 12, 0, 0);
    if (!isNaN(dateObj.getTime())) return dateObj;
  }

  // DD-MM-YYYY or DD/MM/YYYY (e.g. 17-09-2026 or 17/09/2026)
  const ddmmyyyy = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1;
    const year = parseInt(ddmmyyyy[3], 10);
    const dateObj = new Date(year, month, day, 12, 0, 0);
    if (!isNaN(dateObj.getTime())) return dateObj;
  }

  // Match DD-Mon-YYYY or DD Mon YYYY (e.g. 17-Sep-2026, 17 Sep 2026, 17 September 2026)
  const ddMmmYyyy = s.match(/^(\d{1,2})[-\s]([A-Za-z]+)[-\s](\d{4})/);
  if (ddMmmYyyy) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }

  // ISO or standard format
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateDDMMYYYY(dateInput: any): string {
  if (!dateInput) return '';
  if (typeof dateInput === 'string') {
    const s = dateInput.trim();
    const m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    if (m) {
      return `${String(m[3]).padStart(2, '0')}/${String(m[2]).padStart(2, '0')}/${m[1]}`;
    }
    const ddmmyyyy = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
    if (ddmmyyyy) {
      return `${String(ddmmyyyy[1]).padStart(2, '0')}/${String(ddmmyyyy[2]).padStart(2, '0')}/${ddmmyyyy[3]}`;
    }
  }
  const d = parseDateRobust(dateInput);
  if (!d) return '';
  try {
    const parts = d.toLocaleDateString('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).split('/');
    if (parts.length === 3) {
      return `${parts[0]}/${parts[1]}/${parts[2]}`;
    }
  } catch {}
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function resolveOldInvoiceDate(partOrInvDate: any, monthStr: string | null, createdAt: any): { rawTimestamp: number; formattedDate: string } {
  if (partOrInvDate) {
    const d = parseDateRobust(partOrInvDate);
    if (d) {
      return { rawTimestamp: d.getTime(), formattedDate: formatDateDDMMYYYY(partOrInvDate) };
    }
  }
  if (monthStr) {
    const parts = String(monthStr).trim().split(/\s+/);
    if (parts.length >= 2) {
      const d = parseDateRobust(`05 ${parts[0]} ${parts[1]}`);
      if (d) {
        return { rawTimestamp: d.getTime(), formattedDate: formatDateDDMMYYYY(d) };
      }
    }
  }
  const fallbackDate = parseDateRobust(createdAt) || new Date();
  return { rawTimestamp: fallbackDate.getTime(), formattedDate: formatDateDDMMYYYY(fallbackDate) };
}

// GET /api/admin/bank-statement
// Retrieves bank configuration, running credits (client payments & web purchases) & debits (vendor payments & 3-account fund circulations)
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roleName = user.role?.name?.toUpperCase() || '';
    const isSuperAdmin = roleName === 'SUPER_ADMIN' || roleName === 'ADMIN';
    const isAccountant =
      roleName === 'ACCOUNTANT' ||
      roleName === 'ACCOUNTS' ||
      user.email?.toLowerCase() === 'ssinfrazone21@gmail.com' ||
      user.name?.toLowerCase() === 'accounts';

    if (!isSuperAdmin && !isAccountant) {
      return NextResponse.json(
        { error: 'Forbidden. Bank Statement is restricted to Accountant and Super Admin only.' },
        { status: 403 }
      );
    }

    // 1. Fetch persistent Bank Setting
    let config = { ...DEFAULT_CONFIG };
    try {
      const savedSetting = await (prisma as any).setting.findUnique({
        where: { key: SETTING_KEY },
      });
      if (savedSetting?.value) {
        const parsed = JSON.parse(savedSetting.value);
        config = {
          bankName: 'ICICI BANK',
          accountNo: '136705002010',
          openingBalance: Number(parsed.openingBalance) || 50000,
          asOfDate: parsed.asOfDate || '2026-08-01',
        };
      }
    } catch (e) {
      console.error('[BANK_STATEMENT_SETTING_LOAD_ERROR]', e);
    }

    // 2. Fetch active Bank Rules for 3 Accounts circulation
    let bankRules: BankRulesState = { ...DEFAULT_BANK_RULES };
    try {
      const savedRulesSetting = await (prisma as any).setting.findUnique({
        where: { key: BANK_RULES_SETTING_KEY },
      });
      if (savedRulesSetting?.value) {
        const parsedRules = JSON.parse(savedRulesSetting.value);
        bankRules = {
          primaryAccount: { ...DEFAULT_BANK_RULES.primaryAccount, ...(parsedRules.primaryAccount || {}) },
          variableFixedAccount: { ...DEFAULT_BANK_RULES.variableFixedAccount, ...(parsedRules.variableFixedAccount || {}) },
          crAccount: { ...DEFAULT_BANK_RULES.crAccount, ...(parsedRules.crAccount || {}) },
        };
      }
    } catch (e) {
      console.warn('[BANK_STATEMENT_RULES_LOAD_WARN]', e);
    }

    const rawTransactions: any[] = [];

    // 3. FETCH DEBITS: Disbursed / Settled Vendor Operating Expenses
    // An expense reflects as a bank debit ONLY once the payable process has occurred (Accountant entered Payment Date / UTR during Disbursal or marked PAID)
    const approvedExpenses = await (prisma as any).expenseRecord.findMany({
      where: {
        OR: [
          { paymentStatus: 'PAID' },
          { payReceiveDate: { not: null } },
          { utrDate: { not: null } },
          { utrNumber: { not: null } },
        ],
        NOT: [
          { approvalStatus: 'REJECTED' },
          { superAdminApprovalStatus: 'REJECTED' },
          { paymentStatus: 'REJECTED' },
        ],
      },
      include: {
        location: { select: { id: true, name: true } },
      },
      orderBy: [
        { id: 'asc' },
      ],
    });

    approvedExpenses.forEach((exp: any) => {
      // Must not be rejected
      const isRejected =
        exp.approvalStatus === 'REJECTED' ||
        exp.superAdminApprovalStatus === 'REJECTED' ||
        exp.paymentStatus === 'REJECTED';
      if (isRejected) return;

      // Disbursal validation: An expense reflects as a debit ONLY after the accountant
      // completes the final payable step ("Record Disbursal & UTR Details") and enters
      // the Payment Date (payReceiveDate / utrDate) or UTR / marked PAID
      const payDate =
        (exp.payReceiveDate && String(exp.payReceiveDate).trim()) ||
        (exp.utrDate && String(exp.utrDate).trim());
      const hasUtr = Boolean(exp.utrNumber && String(exp.utrNumber).trim());
      const isPaid = exp.paymentStatus === 'PAID';

      // If disbursal has not taken place yet, money has NOT left the bank account
      if (!payDate && !hasUtr && !isPaid) return;

      const debitAmount = Number(exp.receiveAmount || exp.amount || 0);
      if (debitAmount <= 0) return;

      // Debited date in bank statement strictly comes from payment date entered by Accountant
      // during "Record Disbursal & UTR Details" (payReceiveDate or utrDate)
      const paymentDateInput = payDate || (isPaid || hasUtr ? (exp.expenseDate || exp.createdAt) : null);
      if (!paymentDateInput) return;

      const parsedPaymentDate = parseDateRobust(paymentDateInput) || new Date();
      const formattedDate = formatDateDDMMYYYY(paymentDateInput || parsedPaymentDate);
      const rawTimestamp = parsedPaymentDate.getTime();
      const mode = (exp.accPaymentMode || exp.paymentMode || 'NEFT').toUpperCase();
      const ref = exp.utrNumber ? String(exp.utrNumber).trim() : `CMS${exp.id}`;
      const vendor = (exp.vendorName || exp.category || 'VENDOR').trim().toUpperCase();
      const center = (exp.locationName || exp.location?.name || '').trim();
      const desc = (exp.description || 'OPERATING EXPENSE').trim().toUpperCase();

      rawTransactions.push({
        type: 'DEBIT',
        rawDate: rawTimestamp,
        valueDate: formattedDate,
        postDate: formattedDate,
        details: `WDL TFR ${mode}/${ref}/${vendor} - ${formattedDate} - ${ref}${center ? ` - ${center}` : ''} - ${desc}`,
        refNo: ref,
        debit: debitAmount,
        credit: null,
        vendorName: exp.vendorName,
        category: exp.category,
        locationName: exp.locationName || exp.location?.name,
        paymentMode: mode,
        expenseId: exp.id,
        invoiceUrl: exp.invoiceUrl,
        receiptUrl: exp.attachmentUrl,
      });
    });

    // 4. FETCH CREDITS: Client Invoice Payments Received (Live Invoices)
    const approvedInvoices = await (prisma as any).invoiceRecord.findMany({
      where: {
        OR: [
          { status: 'APPROVED' },
          { receiveAmount: { not: null } },
          { utrNumber: { not: null } },
          { payReceiveDate: { not: null } },
        ],
      },
      select: {
        id: true,
        companyName: true,
        cabinName: true,
        billingMonth: true,
        totalAmount: true,
        receiveAmount: true,
        payReceiveDate: true,
        paymentMode: true,
        utrNumber: true,
        utrDate: true,
        paymentsJson: true,
        createdAt: true,
      },
      orderBy: [
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
    });

    approvedInvoices.forEach((inv: any) => {
      const clientName = (inv.companyName || 'CLIENT').toUpperCase();
      const billingMonth = inv.billingMonth ? `[${inv.billingMonth}]` : '';

      // Check for multi-part payments in paymentsJson
      let parsedParts: any[] = [];
      if (inv.paymentsJson) {
        try {
          const parsed = JSON.parse(inv.paymentsJson);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsedParts = parsed;
          } else if (parsed && Array.isArray(parsed.installments) && parsed.installments.length > 0) {
            parsedParts = parsed.installments;
          }
        } catch {
          // ignore
        }
      }

      if (parsedParts.length > 0) {
        parsedParts.forEach((part: any, pIdx: number) => {
          const partAmt = parseFloat(part.receiveAmount || part.amount || '0') || 0;
          if (partAmt <= 0) return;

          const rawDate = part.payReceiveDate || part.utrDate || inv.payReceiveDate || inv.utrDate || inv.createdAt;
          const parsedCreditDate = parseDateRobust(rawDate) || new Date();
          const formattedDate = formatDateDDMMYYYY(parsedCreditDate);
          const rawTimestamp = parsedCreditDate.getTime();
          const mode = (part.paymentMode || inv.paymentMode || 'NEFT').toUpperCase();
          const ref = part.utrNumber || inv.utrNumber || `INV${inv.id}P${pIdx + 1}`;

          // Primary Account Credit (100% Inward)
          rawTransactions.push({
            type: 'CREDIT',
            rawDate: rawTimestamp,
            valueDate: formattedDate,
            postDate: formattedDate,
            details: `DEP TFR ${mode}/${ref}/${clientName} - ${formattedDate} - ${ref}${billingMonth ? ` - INVOICE ${billingMonth}` : ''} PAYMENT RECEIVED`,
            refNo: ref,
            debit: null,
            credit: partAmt,
            source: 'INVOICE_PAYMENT',
            clientName: inv.companyName,
          });

          // 3-Account Fund Circulation Splits (Internal Transfers out of Primary ICICI)
          applyCirculationSplits(partAmt, rawTimestamp, formattedDate, clientName, ref, inv.id, pIdx + 1);
        });
      } else if (Number(inv.receiveAmount || 0) > 0) {
        const recAmt = Number(inv.receiveAmount);
        const rawDate = inv.payReceiveDate || inv.utrDate || inv.createdAt;
        const parsedCreditDate = parseDateRobust(rawDate) || new Date();
        const formattedDate = formatDateDDMMYYYY(parsedCreditDate);
        const rawTimestamp = parsedCreditDate.getTime();
        const mode = (inv.paymentMode || 'NEFT').toUpperCase();
        const ref = inv.utrNumber || `INV${inv.id}`;

        rawTransactions.push({
          type: 'CREDIT',
          rawDate: rawTimestamp,
          valueDate: formattedDate,
          postDate: formattedDate,
          details: `DEP TFR ${mode}/${ref}/${clientName} - ${formattedDate} - ${ref}${billingMonth ? ` - INVOICE ${billingMonth}` : ''} PAYMENT RECEIVED`,
          refNo: ref,
          debit: null,
          credit: recAmt,
          source: 'INVOICE_PAYMENT',
          clientName: inv.companyName,
        });

        applyCirculationSplits(recAmt, rawTimestamp, formattedDate, clientName, ref, inv.id, 0);
      }
    });

    // Helper to calculate and push fund circulation transfer debits based on Bank Rules
    function applyCirculationSplits(
      totalReceived: number,
      rawDate: any,
      formattedDate: string,
      clientName: string,
      ref: string,
      invId: number,
      partNum: number,
      prefix: string = ''
    ) {
      if (totalReceived <= 0) return;

      // 1. CR Account Rule
      let crAlloc = 0;
      const crVal = Number(bankRules.crAccount?.value) || 0;
      if (bankRules.crAccount?.method === 'PERCENT' && crVal > 0) {
        crAlloc = Math.round((totalReceived * (crVal / 100)) * 100) / 100;
      } else if (bankRules.crAccount?.method === 'FIXED' && crVal > 0) {
        crAlloc = Math.min(crVal, totalReceived);
      }

      if (crAlloc > 0) {
        const crRef = `IFT/CR/${prefix ? `${prefix}/` : ''}${invId}${partNum > 0 ? `P${partNum}` : ''}`;
        const crTimestamp = (typeof rawDate === 'number' ? rawDate : new Date(rawDate).getTime()) + 1; // slight offset to order after credit
        rawTransactions.push({
          type: 'DEBIT',
          rawDate: crTimestamp,
          valueDate: formattedDate,
          postDate: formattedDate,
          details: `WDL TFR IFT/AU-${bankRules.crAccount.accountNo}/${clientName} - FUND CIRCULATION TO CR A/C (AU BANK)`,
          refNo: crRef,
          debit: crAlloc,
          credit: null,
          source: 'FUND_CIRCULATION_CR',
          accountNo: bankRules.crAccount.accountNo,
        });
      }

      // 2. Variable + Fixed Account Rule
      let vfAlloc = 0;
      const vfVal = Number(bankRules.variableFixedAccount?.value) || 0;
      if (bankRules.variableFixedAccount?.method === 'PERCENT' && vfVal > 0) {
        vfAlloc = Math.round((totalReceived * (vfVal / 100)) * 100) / 100;
      } else if (bankRules.variableFixedAccount?.method === 'FIXED' && vfVal > 0) {
        vfAlloc = Math.min(vfVal, Math.max(0, totalReceived - crAlloc));
      }

      if (vfAlloc > 0) {
        const vfRef = `IFT/VF/${prefix ? `${prefix}/` : ''}${invId}${partNum > 0 ? `P${partNum}` : ''}`;
        const vfTimestamp = (typeof rawDate === 'number' ? rawDate : new Date(rawDate).getTime()) + 2; // slight offset to order after credit
        rawTransactions.push({
          type: 'DEBIT',
          rawDate: vfTimestamp,
          valueDate: formattedDate,
          postDate: formattedDate,
          details: `WDL TFR IFT/AU-${bankRules.variableFixedAccount.accountNo}/${clientName} - FUND CIRCULATION TO VAR+FIXED A/C (AU BANK)`,
          refNo: vfRef,
          debit: vfAlloc,
          credit: null,
          source: 'FUND_CIRCULATION_VF',
          accountNo: bankRules.variableFixedAccount.accountNo,
        });
      }
    }

    // 4b. FETCH CREDITS: Old Invoices & Past Records Archive Payments Received (April, May, June, July, August, September)
    try {
      const paidOldInvoices = await (prisma as any).oldInvoiceHistory.findMany({
        where: {
          OR: [
            { receiveAmount: { not: null } },
            { utrNumber: { not: null } },
            { payReceiveDate: { not: null } },
            { paymentsJson: { not: null } },
          ],
        },
        orderBy: [
          { createdAt: 'asc' },
          { id: 'asc' },
        ],
      });

      // Track already credited live invoice signatures (company + month) to avoid double-counting
      const liveCreditedKeys = new Set<string>();
      approvedInvoices.forEach((inv: any) => {
        const hasPayment = Number(inv.receiveAmount || 0) > 0 || Boolean(inv.utrNumber);
        if (!hasPayment) return;

        const cName = (inv.companyName || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const bMonth = (inv.billingMonth || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cName && bMonth) {
          liveCreditedKeys.add(`${cName}|${bMonth}`);
        }
      });

      const processedMergedGroups = new Set<string>();

      paidOldInvoices.forEach((inv: any) => {
        const clientName = (inv.companyName || 'CLIENT').trim().toUpperCase();
        const billingMonth = inv.month ? `[${inv.month}]` : '';
        const cKey = (inv.companyName || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const mKey = (inv.month || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

        // If this invoice payment is already credited via live invoiceRecord with same company+month, skip to avoid duplicates
        if (cKey && mKey && liveCreditedKeys.has(`${cKey}|${mKey}`)) {
          return;
        }

        // Check for multi-part or merged payments in paymentsJson
        let parsedParts: any[] = [];
        let isMerged = false;
        let mergedIds: number[] = [];

        if (inv.paymentsJson) {
          try {
            const parsed = JSON.parse(inv.paymentsJson);
            if (Array.isArray(parsed) && parsed.length > 0) {
              parsedParts = parsed;
            } else if (parsed && parsed.isMerged && Array.isArray(parsed.mergedInvoiceIds)) {
              isMerged = true;
              mergedIds = parsed.mergedInvoiceIds;
              if (Array.isArray(parsed.installments) && parsed.installments.length > 0) {
                parsedParts = parsed.installments;
              }
            }
          } catch {
            // ignore
          }
        }

        if (isMerged && mergedIds.length > 0) {
          const groupKey = mergedIds.slice().sort().join(',');
          if (processedMergedGroups.has(groupKey)) {
            return; // Consolidated payment for this merged group already processed
          }
          processedMergedGroups.add(groupKey);

          if (parsedParts.length > 0) {
            parsedParts.forEach((part: any, pIdx: number) => {
              const partAmt = parseFloat(String(part.receiveAmount || part.amount || '0')) || 0;
              if (partAmt <= 0) return;

              const rawDateInput = part.payReceiveDate || part.utrDate || inv.payReceiveDate || inv.utrDate;
              const { rawTimestamp, formattedDate } = resolveOldInvoiceDate(rawDateInput, inv.month, inv.createdAt);
              const mode = (part.paymentMode || inv.paymentMode || 'NEFT').toUpperCase();
              const ref = part.utrNumber || inv.utrNumber || `OLDINV${inv.id}P${pIdx + 1}`;

              rawTransactions.push({
                type: 'CREDIT',
                rawDate: rawTimestamp,
                valueDate: formattedDate,
                postDate: formattedDate,
                details: `DEP TFR ${mode}/${ref}/${clientName} - ${formattedDate} - ${ref}${billingMonth ? ` - INVOICE ${billingMonth}` : ''} PAYMENT RECEIVED (MERGED ${mergedIds.length} INVOICES)`,
                refNo: ref,
                debit: null,
                credit: partAmt,
                source: 'OLD_INVOICE_PAYMENT',
                clientName: inv.companyName,
                oldInvoiceId: inv.id,
                invoiceUrl: inv.invoiceUrl,
              });

              applyCirculationSplits(partAmt, rawTimestamp, formattedDate, clientName, ref, inv.id, pIdx + 1, 'OLD');
            });
            return;
          } else {
            // Fallback for merged payment if installments array is empty but mergedTotalReceiveAmount exists
            let mergedTotalAmt = 0;
            try {
              const parsedMerged = inv.paymentsJson ? JSON.parse(inv.paymentsJson) : {};
              mergedTotalAmt = parseFloat(String(parsedMerged.mergedTotalReceiveAmount || inv.receiveAmount || '0')) || 0;
            } catch {
              mergedTotalAmt = parseFloat(String(inv.receiveAmount || '0')) || 0;
            }

            if (mergedTotalAmt > 0) {
              const rawDateInput = inv.payReceiveDate || inv.utrDate;
              const { rawTimestamp, formattedDate } = resolveOldInvoiceDate(rawDateInput, inv.month, inv.createdAt);
              const mode = (inv.paymentMode || 'NEFT').toUpperCase();
              const ref = inv.utrNumber || `OLDINV${inv.id}`;

              rawTransactions.push({
                type: 'CREDIT',
                rawDate: rawTimestamp,
                valueDate: formattedDate,
                postDate: formattedDate,
                details: `DEP TFR ${mode}/${ref}/${clientName} - ${formattedDate} - ${ref}${billingMonth ? ` - INVOICE ${billingMonth}` : ''} PAYMENT RECEIVED (MERGED ${mergedIds.length} INVOICES)`,
                refNo: ref,
                debit: null,
                credit: mergedTotalAmt,
                source: 'OLD_INVOICE_PAYMENT',
                clientName: inv.companyName,
                oldInvoiceId: inv.id,
                invoiceUrl: inv.invoiceUrl,
              });

              applyCirculationSplits(mergedTotalAmt, rawTimestamp, formattedDate, clientName, ref, inv.id, 0, 'OLD');
              return;
            }
          }
        }

        if (parsedParts.length > 0 && !isMerged) {
          parsedParts.forEach((part: any, pIdx: number) => {
            const partAmt = parseFloat(String(part.receiveAmount || part.amount || '0')) || 0;
            if (partAmt <= 0) return;

            const rawDateInput = part.payReceiveDate || part.utrDate || inv.payReceiveDate || inv.utrDate;
            const { rawTimestamp, formattedDate } = resolveOldInvoiceDate(rawDateInput, inv.month, inv.createdAt);
            const mode = (part.paymentMode || inv.paymentMode || 'NEFT').toUpperCase();
            const ref = part.utrNumber || inv.utrNumber || `OLDINV${inv.id}P${pIdx + 1}`;

            rawTransactions.push({
              type: 'CREDIT',
              rawDate: rawTimestamp,
              valueDate: formattedDate,
              postDate: formattedDate,
              details: `DEP TFR ${mode}/${ref}/${clientName} - ${formattedDate} - ${ref}${billingMonth ? ` - INVOICE ${billingMonth}` : ''} PAYMENT RECEIVED`,
              refNo: ref,
              debit: null,
              credit: partAmt,
              source: 'OLD_INVOICE_PAYMENT',
              clientName: inv.companyName,
              oldInvoiceId: inv.id,
              invoiceUrl: inv.invoiceUrl,
            });

            applyCirculationSplits(partAmt, rawTimestamp, formattedDate, clientName, ref, inv.id, pIdx + 1, 'OLD');
          });
        } else {
          const recAmt = parseFloat(String(inv.receiveAmount || 0)) || 0;
          if (recAmt > 0) {
            const rawDateInput = inv.payReceiveDate || inv.utrDate;
            const { rawTimestamp, formattedDate } = resolveOldInvoiceDate(rawDateInput, inv.month, inv.createdAt);
            const mode = (inv.paymentMode || 'NEFT').toUpperCase();
            const ref = inv.utrNumber || `OLDINV${inv.id}`;

            rawTransactions.push({
              type: 'CREDIT',
              rawDate: rawTimestamp,
              valueDate: formattedDate,
              postDate: formattedDate,
              details: `DEP TFR ${mode}/${ref}/${clientName} - ${formattedDate} - ${ref}${billingMonth ? ` - INVOICE ${billingMonth}` : ''} PAYMENT RECEIVED`,
              refNo: ref,
              debit: null,
              credit: recAmt,
              source: 'OLD_INVOICE_PAYMENT',
              clientName: inv.companyName,
              oldInvoiceId: inv.id,
              invoiceUrl: inv.invoiceUrl,
            });

            applyCirculationSplits(recAmt, rawTimestamp, formattedDate, clientName, ref, inv.id, 0, 'OLD');
          }
        }
      });
    } catch (oldInvErr) {
      console.warn('[BANK_STATEMENT_OLD_INVOICES_LOAD_WARN]', oldInvErr);
    }

    // 5. FETCH CREDITS: Website Online Bookings / Visits / Room Purchases
    try {
      const onlinePayments = await (prisma as any).payment.findMany({
        where: {
          OR: [
            { paidAt: { not: null } },
            { transactionRef: { not: null } },
            { gatewayPaymentId: { not: null } },
          ],
        },
        include: {
          booking: {
            include: {
              customer: { select: { name: true, email: true } },
              product: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      onlinePayments.forEach((p: any) => {
        const payAmt = Number(p.amount || 0);
        if (payAmt <= 0) return;

        const rawDate = p.paidAt || p.createdAt;
        const parsedOnlineDate = parseDateRobust(rawDate) || new Date();
        const formattedDate = formatDateDDMMYYYY(rawDate || parsedOnlineDate);
        const rawTimestamp = parsedOnlineDate.getTime();
        const mode = (p.method || 'ONLINE').toUpperCase();
        const ref = p.transactionRef || p.gatewayPaymentId || p.paymentNumber || `WEB${p.id}`;
        const custName = p.booking?.customer?.name ? p.booking.customer.name.toUpperCase() : 'WEBSITE CLIENT';
        const prodName = p.booking?.product?.name ? p.booking.product.name.toUpperCase() : 'COWORKING BOOKING';

        rawTransactions.push({
          type: 'CREDIT',
          rawDate: rawTimestamp,
          valueDate: formattedDate,
          postDate: formattedDate,
          details: `DEP TFR ${mode}/${ref}/${custName} - ${formattedDate} - ${ref} - ${prodName}`,
          refNo: ref,
          debit: null,
          credit: payAmt,
          source: 'WEBSITE_BOOKING',
          customerName: custName,
          clientName: custName,
        });
      });
    } catch (e) {
      console.warn('[BANK_STATEMENT_WEBSITE_PAYMENTS_WARN]', e);
    }

    // 6. Chronological Sorting & Running Balance Calculation
    rawTransactions.sort((a, b) => {
      if (a.rawDate !== b.rawDate) {
        return a.rawDate - b.rawDate;
      }
      // If same date/timestamp, Credits (inward money) come before Debits (outward payment)
      if (a.credit !== null && b.debit !== null) return -1;
      if (a.debit !== null && b.credit !== null) return 1;
      return (a.refNo || '').localeCompare(b.refNo || '');
    });

    const openingBalance = Number(config.openingBalance) || 0;
    let runningBalance = openingBalance;

    const finalTransactions = rawTransactions.map((tx, idx) => {
      if (tx.credit !== null && tx.credit > 0) {
        runningBalance = Math.round((runningBalance + tx.credit) * 100) / 100;
      } else if (tx.debit !== null && tx.debit > 0) {
        runningBalance = Math.round((runningBalance - tx.debit) * 100) / 100;
      }

      return {
        id: idx + 1,
        valueDate: tx.valueDate,
        postDate: tx.postDate,
        details: tx.details,
        refNo: tx.refNo,
        debit: tx.debit,
        credit: tx.credit,
        balance: runningBalance,
        vendorName: tx.vendorName,
        clientName: tx.clientName,
        category: tx.category,
        locationName: tx.locationName,
        paymentMode: tx.paymentMode,
        expenseId: tx.expenseId,
        invoiceUrl: tx.invoiceUrl,
        receiptUrl: tx.receiptUrl,
        source: tx.source,
      };
    });

    const totalDebits = finalTransactions.reduce((sum, t) => sum + (t.debit || 0), 0);
    const totalCredits = finalTransactions.reduce((sum, t) => sum + (t.credit || 0), 0);
    const drCount = finalTransactions.filter((t) => t.debit !== null && t.debit > 0).length;
    const crCount = finalTransactions.filter((t) => t.credit !== null && t.credit > 0).length;
    const closingBalance = Math.round((openingBalance + totalCredits - totalDebits) * 100) / 100;

    const summary = {
      broughtForward: openingBalance,
      drCount,
      crCount,
      totalDebits: Math.round(totalDebits * 100) / 100,
      totalCredits: Math.round(totalCredits * 100) / 100,
      closingBalance,
    };

    return NextResponse.json({
      success: true,
      config,
      transactions: finalTransactions,
      summary,
    });
  } catch (error: any) {
    console.error('[BANK_STATEMENT_GET_ERROR]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate bank statement' },
      { status: 500 }
    );
  }
}

// POST /api/admin/bank-statement
// Updates bank statement opening balance and configuration
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roleName = user.role?.name?.toUpperCase() || '';
    const isSuperAdmin = roleName === 'SUPER_ADMIN' || roleName === 'ADMIN';
    const isAccountant =
      roleName === 'ACCOUNTANT' ||
      roleName === 'ACCOUNTS' ||
      user.email?.toLowerCase() === 'ssinfrazone21@gmail.com' ||
      user.name?.toLowerCase() === 'accounts';

    if (!isSuperAdmin && !isAccountant) {
      return NextResponse.json(
        { error: 'Forbidden. Only Accountant or Super Admin can configure bank parameters.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      openingBalance = 50000,
      asOfDate = new Date().toISOString().split('T')[0],
    } = body;

    const configData = {
      bankName: 'ICICI BANK',
      accountNo: '136705002010',
      openingBalance: parseFloat(String(openingBalance)) || 0,
      asOfDate: String(asOfDate).trim(),
      updatedBy: user.name,
      updatedAt: new Date().toISOString(),
    };

    await (prisma as any).setting.upsert({
      where: { key: SETTING_KEY },
      update: {
        value: JSON.stringify(configData),
        group: 'banking',
      },
      create: {
        key: SETTING_KEY,
        value: JSON.stringify(configData),
        group: 'banking',
      },
    });

    return NextResponse.json({
      success: true,
      config: configData,
      message: 'Bank configuration and opening balance updated successfully.',
    });
  } catch (error: any) {
    console.error('[BANK_STATEMENT_POST_ERROR]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update bank statement configuration' },
      { status: 500 }
    );
  }
}
