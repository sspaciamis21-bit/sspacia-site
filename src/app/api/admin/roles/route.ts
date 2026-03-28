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

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    const formatted = roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
      })),
    }));
    
    return NextResponse.json({ data: formatted });
  } catch (error) {
    console.error('GET /api/admin/roles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/roles - Create a new role
export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, permissionIds } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    const role = await prisma.role.create({
      data: {
        name,
        description: description || undefined,
        permissions: {
          create: (permissionIds || []).map((permId: number) => ({
            permissionId: permId,
          })),
        },
      },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    const formatted = {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
      })),
    };

    return NextResponse.json({ data: formatted }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/roles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
