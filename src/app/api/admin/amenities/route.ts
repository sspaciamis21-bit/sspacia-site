import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission } from '@/lib/auth/withPermission';
import { requireAuth } from '@/lib/auth';

// Helper to generate slug
const slugify = (text: string) => text.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

// ─── GET /api/admin/amenities ─────────────────────────────────────────────────
export const GET = withPermission('amenities', 'read', async () => {
  try {
    const amenities = await prisma.amenity.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ data: amenities });
  } catch (error) {
    console.error('[AMENITIES_READ]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// ─── POST /api/admin/amenities ────────────────────────────────────────────────
export const POST = withPermission('amenities', 'create', async (req: NextRequest) => {
  try {
    const payload = await requireAuth();
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const body = await req.json() as Record<string, unknown>;
    const name = String(body.name ?? '').trim();

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const amenity = await prisma.$transaction(async (tx) => {
      const a = await tx.amenity.create({
        data: {
          name,
          slug:      body.slug ? String(body.slug) : slugify(name),
          icon:      body.icon ? String(body.icon) : null,
          description: body.description ? String(body.description) : null,
          isActive:  body.isActive !== false,
          sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : 0,
        },
      });

      await tx.activityLog.create({
        data: {
          userId:    Number(payload.id),
          action:    'CREATE',
          module:    'amenities',
          recordId:  a.id,
          newData:   JSON.stringify(a),
          ipAddress: req.headers.get('x-forwarded-for') ?? null,
        },
      });

      return a;
    });

    return NextResponse.json({ data: amenity, message: 'Created successfully' }, { status: 201 });
  } catch (error: any) {
    console.error('[AMENITIES_CREATE]', error);
    if (error.code === 'P2002') {
       return NextResponse.json({ error: 'Amenity with this name/slug already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// ─── PATCH /api/admin/amenities ───────────────────────────────────────────────
export const PATCH = withPermission('amenities', 'update', async (req: NextRequest) => {
    try {
      const payload = await requireAuth();
      if (!payload?.id) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  
      const body = await req.json() as Record<string, unknown>;
      const id = parseInt(String(body.id ?? ''), 10);
  
      if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  
      const amenity = await prisma.$transaction(async (tx) => {
        const existing = await tx.amenity.findUnique({ where: { id } });
        if (!existing) throw new Error('NOT_FOUND');
  
        const updated = await tx.amenity.update({
          where: { id },
          data: {
            name: body.name ? String(body.name).trim() : undefined,
            slug: body.slug ? String(body.slug).trim() : (body.name ? slugify(String(body.name)) : undefined),
            icon: body.icon !== undefined ? String(body.icon) : undefined,
            description: body.description !== undefined ? String(body.description) : undefined,
            isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
            sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
          },
        });
  
        await tx.activityLog.create({
          data: {
            userId: Number(payload.id),
            action: 'UPDATE',
            module: 'amenities',
            recordId: id,
            oldData: JSON.stringify(existing),
            newData: JSON.stringify(updated),
            ipAddress: req.headers.get('x-forwarded-for') ?? null,
          },
        });
  
        return updated;
      });
  
      return NextResponse.json({ data: amenity });
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') return NextResponse.json({ error: 'Not found' }, { status: 404 });
      if (error.code === 'P2002') return NextResponse.json({ error: 'Slug/Name must be unique' }, { status: 400 });
      console.error('[AMENITIES_UPDATE]', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
});
  
// ─── DELETE /api/admin/amenities ──────────────────────────────────────────────
export const DELETE = withPermission('amenities', 'delete', async (req: NextRequest) => {
    try {
      const payload = await requireAuth();
      if (!payload?.id) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  
      const { searchParams } = new URL(req.url);
      const id = parseInt(searchParams.get('id') ?? '', 10);
  
      if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  
      await prisma.$transaction(async (tx) => {
        const existing = await tx.amenity.findUnique({ where: { id } });
        if (!existing) throw new Error('NOT_FOUND');
  
        await tx.amenity.delete({ where: { id } });
  
        await tx.activityLog.create({
          data: {
            userId: Number(payload.id),
            action: 'DELETE',
            module: 'amenities',
            recordId: id,
            oldData: JSON.stringify(existing),
            ipAddress: req.headers.get('x-forwarded-for') ?? null,
          },
        });
      });
  
      return NextResponse.json({ message: 'Deleted successfully' });
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') return NextResponse.json({ error: 'Not found' }, { status: 404 });
      console.error('[AMENITIES_DELETE]', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
});
