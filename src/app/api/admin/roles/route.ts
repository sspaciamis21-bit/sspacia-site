import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission } from '@/lib/auth/withPermission';
import { requireAuth } from '@/lib/auth';

// ─── GET /api/admin/roles ─────────────────────────────────────────────────────
export const GET = withPermission('roles', 'read', async () => {
  try {
    const roles = await prisma.role.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        isActive: true,
        createdAt: true,
        permissions: {
          select: {
            permission: {
              select: { id: true, name: true },
            },
          },
        },
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });

    const flattened = roles.map((r) => ({
      ...r,
      permissions: r.permissions.map((rp) => rp.permission),
    }));

    return NextResponse.json({ data: flattened });
  } catch (error) {
    console.error('[ROLES_READ]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// ─── POST /api/admin/roles ────────────────────────────────────────────────────
export const POST = withPermission('roles', 'create', async (req: NextRequest) => {
  try {
    const payload = await requireAuth();
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const body = await req.json() as Record<string, unknown>;
    const name        = String(body.name        ?? '').trim();
    const displayName = String(body.displayName ?? '').trim();

    if (!name || !displayName) {
      return NextResponse.json({ error: 'name and displayName are required' }, { status: 400 });
    }

    // Duplicate check
    const existing = await prisma.role.findUnique({ where: { name }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ error: 'Role with this name already exists' }, { status: 400 });
    }

    const role = await prisma.$transaction(async (tx) => {
      const r = await tx.role.create({
        data: {
          name,
          displayName,
          description: body.description ? String(body.description) : undefined,
        },
        select: {
          id: true,
          name: true,
          displayName: true,
          description: true,
          createdAt: true,
        },
      });

      await tx.activityLog.create({
        data: {
          userId:    Number(payload.id),
          action:    'CREATE',
          module:    'roles',
          recordId:  r.id,
          newData:   JSON.stringify(r),
          ipAddress: req.headers.get('x-forwarded-for') ?? null,
        },
      });

      return r;
    });

    return NextResponse.json({ data: role, message: 'Created successfully' }, { status: 201 });
  } catch (error) {
    console.error('[ROLES_CREATE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
