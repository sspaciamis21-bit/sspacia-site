import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

const SETTING_KEY = 'expense_category_headers';

export const DEFAULT_EXPENSE_CATEGORIES = [
  'ELECTRICITY & UTILITIES',
  'MAINTENANCE & REPAIRS',
  'OFFICE SUPPLIES & STATIONERY',
  'TEA, COFFEE & PANTRY',
  'VOUCHERS',
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

async function getStoredCategories(): Promise<string[]> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: SETTING_KEY },
    });

    if (setting && setting.value) {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((c: string) => String(c).trim().toUpperCase()).filter(Boolean);
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
      ...distinctDB.map((d: any) => d.category?.trim().toUpperCase()).filter(Boolean),
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
    return NextResponse.json({ success: true, categories });
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
    if (index === -1) {
      return NextResponse.json(
        { error: `Category "${oldName}" not found.` },
        { status: 404 }
      );
    }

    // Check if newName already exists elsewhere
    if (categories.includes(newName) && oldName !== newName) {
      return NextResponse.json(
        { error: `Category "${newName}" already exists.` },
        { status: 400 }
      );
    }

    const updated = [...categories];
    updated[index] = newName;

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

    // Optionally update records referencing oldName so no orphaned entries occur
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

    const url = new URL(request.url);
    let targetName = url.searchParams.get('name');

    if (!targetName) {
      try {
        const body = await request.json();
        targetName = body?.name;
      } catch {}
    }

    const nameToDelete = targetName ? String(targetName).trim().toUpperCase() : '';

    if (!nameToDelete) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    const categories = await getStoredCategories();

    if (!categories.includes(nameToDelete)) {
      return NextResponse.json(
        { error: `Category "${nameToDelete}" not found.` },
        { status: 404 }
      );
    }

    const updated = categories.filter((c) => c !== nameToDelete);

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
