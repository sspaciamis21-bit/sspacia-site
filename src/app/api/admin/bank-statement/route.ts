import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

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

    const user = await prisma.user.findUnique({
      where: { id: Number(payload.id) },
      include: { role: true },
    });

    return user;
  } catch {
    return null;
  }
}

// GET /api/admin/bank-statement
// Retrieves bank configuration, approved expenses as debit transactions, and running balance summary
export async function GET(request: Request) {
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
      const savedSetting = await prisma.setting.findUnique({
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

    // 2. Fetch all Approved/Paid expenses
    const approvedExpenses = await (prisma as any).expenseRecord.findMany({
      where: {
        OR: [
          { approvalStatus: 'APPROVED' },
          { paymentStatus: 'PAID' },
        ],
      },
      include: {
        location: { select: { id: true, name: true } },
      },
      orderBy: [
        { expenseDate: 'asc' },
        { id: 'asc' },
      ],
    });

    // 3. Compute running balance and ICICI statement structure
    const openingBalance = Number(config.openingBalance) || 0;
    let currentBalance = openingBalance;

    const transactions = approvedExpenses.map((exp: any) => {
      const debitAmount = Number(exp.receiveAmount || exp.amount || 0);
      currentBalance = Math.round((currentBalance - debitAmount) * 100) / 100;

      // Format Date: DD/MM/YYYY
      const rawDate = exp.utrDate || exp.payReceiveDate || exp.expenseDate;
      const d = new Date(rawDate);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const formattedDate = `${day}/${month}/${year}`;

      // Format Narration / Details matching ICICI transaction format
      const mode = exp.accPaymentMode || exp.paymentMode || 'NEFT';
      const ref = exp.utrNumber || `CMS${exp.id}`;
      const vendor = exp.vendorName ? exp.vendorName.toUpperCase() : 'VENDOR';
      const center = exp.locationName || exp.location?.name || 'GENERAL';
      const desc = exp.description ? exp.description.toUpperCase() : 'OPERATING EXPENSE';

      const narration = `WDL TFR ${mode}/${ref}/${vendor}/${center} - ${desc}`;

      return {
        id: exp.id,
        valueDate: formattedDate,
        postDate: formattedDate,
        details: narration,
        refNo: ref,
        debit: debitAmount,
        credit: null,
        balance: currentBalance,
        vendorName: exp.vendorName,
        category: exp.category,
        locationName: exp.locationName || exp.location?.name,
        paymentMode: mode,
        expenseId: exp.id,
        invoiceUrl: exp.invoiceUrl,
        receiptUrl: exp.attachmentUrl,
      };
    });

    const totalDebits = transactions.reduce((sum: number, t: any) => sum + (t.debit || 0), 0);
    const totalCredits = 0;
    const closingBalance = Math.round((openingBalance - totalDebits + totalCredits) * 100) / 100;

    const summary = {
      broughtForward: openingBalance,
      drCount: transactions.length,
      crCount: 0,
      totalDebits: Math.round(totalDebits * 100) / 100,
      totalCredits: 0,
      closingBalance,
    };

    return NextResponse.json({
      success: true,
      config,
      transactions,
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

    const saved = await prisma.setting.upsert({
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
