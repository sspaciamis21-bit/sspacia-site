import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export const BANK_RULES_SETTING_KEY = 'bank_rules_3_accounts';

export interface BankAccountRuleConfig {
  firmName: string;
  bankName: string;
  accountNo: string;
  role: 'PRIMARY' | 'VARIABLE_FIXED' | 'CR';
  method?: 'NONE' | 'PERCENT' | 'FIXED';
  value?: number;
}

export interface BankRulesState {
  primaryAccount: BankAccountRuleConfig;
  variableFixedAccount: BankAccountRuleConfig;
  crAccount: BankAccountRuleConfig;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_BANK_RULES: BankRulesState = {
  primaryAccount: {
    firmName: 'SSPACIA INDIA PRIVATE LIMITED',
    bankName: 'ICICI BANK',
    accountNo: '136705002010',
    role: 'PRIMARY',
  },
  variableFixedAccount: {
    firmName: 'SSPACIA INDIA PRIVATE LIMITED',
    bankName: 'AU Bank',
    accountNo: '2121219825030862',
    role: 'VARIABLE_FIXED',
    method: 'NONE',
    value: 0,
  },
  crAccount: {
    firmName: 'SSPACIA INDIA PRIVATE LIMITED',
    bankName: 'AU Bank',
    accountNo: '1212129825030862',
    role: 'CR',
    method: 'NONE',
    value: 0,
  },
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

// GET /api/admin/bank-rules — Retrieve current 3-Accounts Bank Rules
export async function GET() {
  try {
    let rules: BankRulesState = { ...DEFAULT_BANK_RULES };

    try {
      const savedSetting = await (prisma as any).setting.findUnique({
        where: { key: BANK_RULES_SETTING_KEY },
      });

      if (savedSetting?.value) {
        const parsed = JSON.parse(savedSetting.value);
        rules = {
          primaryAccount: {
            ...DEFAULT_BANK_RULES.primaryAccount,
            ...(parsed.primaryAccount || {}),
          },
          variableFixedAccount: {
            ...DEFAULT_BANK_RULES.variableFixedAccount,
            ...(parsed.variableFixedAccount || {}),
          },
          crAccount: {
            ...DEFAULT_BANK_RULES.crAccount,
            ...(parsed.crAccount || {}),
          },
          updatedAt: parsed.updatedAt,
          updatedBy: parsed.updatedBy,
        };
      }
    } catch (e) {
      console.warn('[BANK_RULES_LOAD_WARN]', e);
    }

    return NextResponse.json({
      success: true,
      rules,
    });
  } catch (error) {
    console.error('[BANK_RULES_GET_ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch bank rules' }, { status: 500 });
  }
}

// POST /api/admin/bank-rules — Update 3-Accounts Bank Rules (Accountant & Super Admin)
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roleName = (user.role?.name || '').toUpperCase();
    const isSuperAdmin = roleName === 'SUPER_ADMIN' || roleName === 'ADMIN';
    const isAccountant =
      roleName === 'ACCOUNTANT' ||
      roleName === 'ACCOUNTS' ||
      user.email?.toLowerCase() === 'ssinfrazone21@gmail.com' ||
      user.name?.toLowerCase() === 'accounts';

    if (!isSuperAdmin && !isAccountant) {
      return NextResponse.json(
        { error: 'Forbidden. Bank Rules can only be configured by Accountant or Super Admin.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const vfMethod = body.variableFixedAccount?.method || 'NONE';
    const vfValue = Math.max(0, parseFloat(body.variableFixedAccount?.value) || 0);

    const crMethod = body.crAccount?.method || 'NONE';
    const crValue = Math.max(0, parseFloat(body.crAccount?.value) || 0);

    const updatedRules: BankRulesState = {
      primaryAccount: {
        firmName: 'SSPACIA INDIA PRIVATE LIMITED',
        bankName: 'ICICI BANK',
        accountNo: '136705002010',
        role: 'PRIMARY',
      },
      variableFixedAccount: {
        firmName: 'SSPACIA INDIA PRIVATE LIMITED',
        bankName: 'AU Bank',
        accountNo: '2121219825030862',
        role: 'VARIABLE_FIXED',
        method: vfMethod,
        value: vfValue,
      },
      crAccount: {
        firmName: 'SSPACIA INDIA PRIVATE LIMITED',
        bankName: 'AU Bank',
        accountNo: '1212129825030862',
        role: 'CR',
        method: crMethod,
        value: crValue,
      },
      updatedAt: new Date().toISOString(),
      updatedBy: user.name || user.email || 'Admin',
    };

    await (prisma as any).setting.upsert({
      where: { key: BANK_RULES_SETTING_KEY },
      update: {
        value: JSON.stringify(updatedRules),
        group: 'banking',
      },
      create: {
        key: BANK_RULES_SETTING_KEY,
        value: JSON.stringify(updatedRules),
        group: 'banking',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Bank rules updated successfully',
      rules: updatedRules,
    });
  } catch (error) {
    console.error('[BANK_RULES_POST_ERROR]', error);
    return NextResponse.json({ error: 'Failed to save bank rules' }, { status: 500 });
  }
}
