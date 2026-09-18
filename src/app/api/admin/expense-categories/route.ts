import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

const SETTING_KEY = 'expense_category_headers';

export const DEFAULT_EXPENSE_CATEGORIES = [
  'ELECTRICITY & UTILITIES',
  'UTILITIES',
  'MAINTENANCE & REPAIRS',
  'OFFICE SUPPLIES & STATIONERY',
  'TEA, COFFEE & PANTRY',
  'VOUCHER',
  'MARKETING & ADVERTISING',
  'INTERNET & TELECOM',
  'CLEANING & HOUSEKEEPING',
  'RO WATER SUPPLY',
  'RENT & CAM',
  'COMPUTER & IT SERVICES',
  'LEGAL & AUDIT',
  'GENERAL OPERATING EXPENSE',
];

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

function normalizeCategoryName(cat: string): string {
  const up = String(cat || '').trim().toUpperCase();
  if (up === 'UTITILITIES') return 'UTILITIES';
  if (up === 'VOCHER' || up === 'VOUCHERS') return 'VOUCHER';
  if (up === 'MAINTAINACE & REPAIRS') return 'MAINTENANCE & REPAIRS';
  return up;
}

async function getStoredCategories(): Promise<string[]> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: SETTING_KEY },
    });

    if (setting && setting.value) {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned = Array.from(
          new Set(parsed.map((c: string) => normalizeCategoryName(c)).filter(Boolean))
        );
        return cleaned;
      }
    }
  } catch (err) {
    console.error('[GET_STORED_EXPENSE_CATEGORIES_ERROR]', err);
  }

  // Fallback / Initial seed: seed defaults combined with any distinct categories in DB
  const distinctDB = await (prisma as any).expenseRecord.findMany({
    select: { category: true },
    distinct: ['category'],
  }).catch(() => []);

  const merged = Array.from(
    new Set([
      ...DEFAULT_EXPENSE_CATEGORIES,
      ...distinctDB.map((d: any) => normalizeCategoryName(d.category)).filter(Boolean),
    ])
  );

  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    create: {
      key: SETTING_KEY,
      value: JSON.stringify(merged),
      group: 'expenses',
    },
    update: {
      value: JSON.stringify(merged),
    },
  }).catch(() => {});

  return merged;
}

// GET /api/admin/expense-categories
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categories = await getStoredCategories();

    // Find any custom headers proposed by CM/Accountant in expense records not yet in official categories
    const distinctDB = await (prisma as any).expenseRecord.findMany({
      select: { category: true },
      distinct: ['category'],
    }).catch(() => []);

    const proposedCategories = Array.from(
      new Set(
        distinctDB
          .map((d: any) => normalizeCategoryName(d.category))
          .filter((c: string) => c && !categories.includes(c))
      )
    );

    return NextResponse.json({
      success: true,
      categories,
      proposedCategories,
    });
  } catch (error: any) {
    console.error('[EXPENSE_CATEGORIES_GET]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// POST /api/admin/expense-categories (Super Admin only: Add new Category Header)
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roleName = user.role?.name?.toUpperCase() || '';
    const isSuperAdmin = roleName === 'SUPER_ADMIN' || roleName === 'ADMIN';

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admin can add main expense category headers.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const rawName = body?.name ? String(body.name).trim().toUpperCase() : '';

    if (!rawName) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    const categories = await getStoredCategories();

    if (categories.includes(rawName)) {
      return NextResponse.json(
        { error: `Category "${rawName}" already exists.` },
        { status: 400 }
      );
    }

    const updated = [...categories, rawName];

    await prisma.setting.upsert({
      where: { key: SETTING_KEY },
      create: {
        key: SETTING_KEY,
        value: JSON.stringify(updated),
        group: 'expenses',
      },
      update: {
        value: JSON.stringify(updated),
      },
    });

    return NextResponse.json({
      success: true,
      categories: updated,
      added: rawName,
    });
  } catch (error: any) {
    console.error('[EXPENSE_CATEGORIES_POST]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to add category' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/expense-categories (Super Admin only: Edit/Rename Category Header)
export async function PUT(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roleName = user.role?.name?.toUpperCase() || '';
    const isSuperAdmin = roleName === 'SUPER_ADMIN' || roleName === 'ADMIN';

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admin can edit main expense category headers.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const oldName = body?.oldName ? String(body.oldName).trim().toUpperCase() : '';
    const newName = body?.newName ? String(body.newName).trim().toUpperCase() : '';

    if (!oldName || !newName) {
      return NextResponse.json(
        { error: 'Both oldName and newName are required' },
        { status: 400 }
      );
    }

    const categories = await getStoredCategories();

    const index = categories.indexOf(oldName);
    let updated = [...categories];

    if (index !== -1) {
      // Check if newName already exists elsewhere
      if (categories.includes(newName) && oldName !== newName) {
        return NextResponse.json(
          { error: `Category "${newName}" already exists.` },
          { status: 400 }
        );
      }
      updated[index] = newName;
    } else {
      // It was a proposed category from expense records: add newName to official list
      if (!updated.includes(newName)) {
        updated.push(newName);
      }
    }

    await prisma.setting.upsert({
      where: { key: SETTING_KEY },
      create: {
        key: SETTING_KEY,
        value: JSON.stringify(updated),
        group: 'expenses',
      },
      update: {
        value: JSON.stringify(updated),
      },
    });

    // Update records referencing oldName so no orphaned entries occur
    await (prisma as any).expenseRecord.updateMany({
      where: { category: oldName },
      data: { category: newName },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      categories: updated,
      renamed: { from: oldName, to: newName },
    });
  } catch (error: any) {
    console.error('[EXPENSE_CATEGORIES_PUT]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update category' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/expense-categories (Super Admin only: Delete Category Header)
export async function DELETE(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roleName = user.role?.name?.toUpperCase() || '';
    const isSuperAdmin = roleName === 'SUPER_ADMIN' || roleName === 'ADMIN';

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admin can delete main expense category headers.' },
        { status: 403 }
      );
    }

    let bodyObj: any = {};
    try {
      bodyObj = await request.json();
    } catch {}

    const url = new URL(request.url);
    const targetName = url.searchParams.get('name') || bodyObj?.name;
    const nameToDelete = targetName ? String(targetName).trim().toUpperCase() : '';
    const reassignTo = bodyObj?.reassignTo ? String(bodyObj.reassignTo).trim().toUpperCase() : null;

    if (!nameToDelete) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    // If reassignTo is provided, migrate all expense records with this category
    if (reassignTo) {
      await (prisma as any).expenseRecord.updateMany({
        where: { category: nameToDelete },
        data: { category: reassignTo },
      }).catch(() => {});
    }

    const categories = await getStoredCategories();
    const updated = categories.filter((c) => c !== nameToDelete);

    if (categories.includes(nameToDelete)) {
      await prisma.setting.upsert({
        where: { key: SETTING_KEY },
        create: {
          key: SETTING_KEY,
          value: JSON.stringify(updated),
          group: 'expenses',
        },
        update: {
          value: JSON.stringify(updated),
        },
      });
    }

    return NextResponse.json({
      success: true,
      categories: updated,
      deleted: nameToDelete,
    });
  } catch (error: any) {
    console.error('[EXPENSE_CATEGORIES_DELETE]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete category' },
      { status: 500 }
    );
  }
}
