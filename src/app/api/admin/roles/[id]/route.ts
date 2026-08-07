import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission } from '@/lib/auth/withPermission';
import { requireAuth } from '@/lib/auth';

// ─── PATCH /api/admin/roles/[id] — update role + its permissions ─────────────
export const PATCH = withPermission('roles', 'update', async (
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const payload = await requireAuth();
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { id } = await params;
    const roleId = parseInt(id, 10);
    if (isNaN(roleId)) {
      return NextResponse.json({ error: 'Invalid role ID' }, { status: 400 });
    }

    const existing = await prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true, name: true, displayName: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await req.json() as Record<string, unknown>;

    const role = await prisma.$transaction(async (tx) => {
      const updated = await tx.role.update({
        where: { id: roleId },
        data: {
          ...(body.displayName  !== undefined && { displayName:  String(body.displayName) }),
          ...(body.description  !== undefined && { description:  String(body.description) }),
          ...(body.isActive     !== undefined && { isActive:     Boolean(body.isActive) }),
        },
        select: {
          id: true,
          name: true,
          displayName: true,
          description: true,
          isActive: true,
          updatedAt: true,
        },
      });

      // If permissionIds provided, replace the entire set
      if (Array.isArray(body.permissionIds)) {
        const permIds = body.permissionIds as number[];
        await tx.rolePermission.deleteMany({ where: { roleId } });
        if (permIds.length > 0) {
          await tx.rolePermission.createMany({
            data: permIds.map((permId) => ({ roleId, permissionId: permId })),
          });
        }
      }

      await tx.activityLog.create({
        data: {
          userId:    Number(payload.id),
          action:    'UPDATE',
          module:    'roles',
          recordId:  roleId,
          oldData:   JSON.stringify(existing),
          newData:   JSON.stringify(updated),
          ipAddress: req.headers.get('x-forwarded-for') ?? null,
        },
      });

      return updated;
    });

    return NextResponse.json({ data: role });
  } catch (error) {
    console.error('[ROLE_UPDATE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// ─── DELETE /api/admin/roles/[id] ────────────────────────────────────────────
export const DELETE = withPermission('roles', 'delete', async (
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const payload = await requireAuth();
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { id } = await params;
    const roleId = parseInt(id, 10);
    if (isNaN(roleId)) {
      return NextResponse.json({ error: 'Invalid role ID' }, { status: 400 });
    }

    const existing = await prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true, name: true, _count: { select: { users: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (existing._count.users > 0) {
      return NextResponse.json(
        { error: 'Cannot delete a role that is still assigned to users' },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.role.update({ where: { id: roleId }, data: { isActive: false } });

      await tx.activityLog.create({
        data: {
          userId:    Number(payload.id),
          action:    'DELETE',
          module:    'roles',
          recordId:  roleId,
          oldData:   JSON.stringify(existing),
          newData:   null,
          ipAddress: req.headers.get('x-forwarded-for') ?? null,
        },
      });
    });

    return NextResponse.json({ data: { message: 'Role deactivated successfully' } });
  } catch (error) {
    console.error('[ROLE_DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
