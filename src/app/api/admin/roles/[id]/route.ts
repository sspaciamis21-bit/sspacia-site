import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || (payload.role as string) !== 'ADMIN') return null;
  return payload;
}

// PATCH /api/admin/roles/[id] - Update a role
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const roleId = parseInt(id);
    if (isNaN(roleId)) {
      return NextResponse.json({ error: 'Invalid role ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, permissionIds } = body;

    // Update role
    const role = await prisma.role.update({
      where: { id: roleId },
      data: {
        name: name || undefined,
        description: description !== undefined ? description : undefined,
      },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    // Update permissions if provided
    if (permissionIds !== undefined) {
      await prisma.rolePermission.deleteMany({
        where: { roleId },
      });

      if (permissionIds.length > 0) {
        await prisma.rolePermission.createMany({
          data: permissionIds.map((permId: number) => ({
            roleId,
            permissionId: permId,
          })),
        });
      }

      // Refetch with updated permissions
      const updatedRole = await prisma.role.findUnique({
        where: { id: roleId },
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      });

      const formatted = {
        id: updatedRole!.id,
        name: updatedRole!.name,
        description: updatedRole!.description,
        permissions: updatedRole!.permissions.map((rp) => ({
          id: rp.permission.id,
          name: rp.permission.name,
        })),
      };

      return NextResponse.json({ data: formatted });
    }

    const formatted = {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
      })),
    };

    return NextResponse.json({ data: formatted });
  } catch (error) {
    console.error('PATCH /api/admin/roles/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/roles/[id] - Delete a role
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const roleId = parseInt(id);
    if (isNaN(roleId)) {
      return NextResponse.json({ error: 'Invalid role ID' }, { status: 400 });
    }

    await prisma.role.delete({
      where: { id: roleId },
    });

    return NextResponse.json({ data: { message: 'Role deleted successfully' } });
  } catch (error) {
    console.error('DELETE /api/admin/roles/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
