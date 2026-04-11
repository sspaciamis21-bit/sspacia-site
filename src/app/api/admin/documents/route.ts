import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission } from '@/lib/auth/withPermission';
import { requireAuth } from '@/lib/auth';

// ─── GET /api/admin/documents ──────────────────────────────────────────────────
// List documents across customers/bookings
export const GET = withPermission('documents', 'view', async (req: NextRequest, { payload }) => {
  try {
    const { searchParams } = new URL(req.url);
    const role = payload.role as string;
    const email = payload.email as string;

    let customerId = searchParams.get('customerId') ? parseInt(searchParams.get('customerId')!, 10) : undefined;
    const bookingId = searchParams.get('bookingId') ? parseInt(searchParams.get('bookingId')!, 10) : undefined;
    const statusId = searchParams.get('statusId') ? parseInt(searchParams.get('statusId')!, 10) : undefined;

    // If regular user, strictly filter by their own customer record
    if (role === 'USER') {
        const customer = await prisma.customer.findUnique({
            where: { email },
            select: { id: true }
        });
        if (!customer) return NextResponse.json({ data: [] });
        customerId = customer.id;
    }

    const data = await prisma.document.findMany({
      where: {
        customerId: customerId || undefined,
        bookingId: bookingId || undefined,
        statusId: statusId || undefined,
      },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        booking: { select: { id: true, bookingNumber: true } },
        category: { select: { id: true, name: true, displayName: true, slug: true } },
        status: { select: { id: true, name: true, displayName: true, color: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[DOCUMENTS_READ]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// ─── POST /api/admin/documents ─────────────────────────────────────────────────
// Create/Upload a new document
export const POST = withPermission('documents', 'update', async (req: NextRequest, { payload }) => {
  try {
    const body = await req.json();
    const { title, fileUrl, fileName, fileSize, mimeType, categoryId, bookingId, notes } = body;

    if (!title || !fileUrl || !categoryId) {
        return NextResponse.json({ error: 'Title, fileUrl and categoryId are required' }, { status: 400 });
    }

    const role = payload.role as string;
    const email = payload.email as string;
    let targetCustomerId = body.customerId ? parseInt(body.customerId, 10) : undefined;

    // Security check for regular users
    if (role === 'USER') {
        let customer = await prisma.customer.findUnique({ where: { email } });
        if (!customer) {
            // Auto-create customer if missing for the user
            const user = await prisma.user.findUnique({ where: { email } });
            customer = await prisma.customer.create({
                data: {
                    email,
                    name: user?.name || 'User',
                    phone: user?.phone || undefined,
                }
            });
        }
        targetCustomerId = customer.id;
    }

    // Get default PENDING status
    const pendingStatus = await prisma.documentStatus.findFirst({
        where: { name: 'PENDING' }
    });

    const document = await prisma.document.create({
        data: {
            title,
            fileUrl,
            fileName,
            fileSize,
            mimeType,
            categoryId,
            bookingId: bookingId ? parseInt(bookingId, 10) : null,
            customerId: targetCustomerId,
            statusId: pendingStatus?.id ?? 1,
            notes,
        },
        include: {
            category: { select: { name: true } },
            status: { select: { name: true } },
        }
    });

    return NextResponse.json({ data: document, message: 'Document uploaded successfully' });
  } catch (error) {
    console.error('[DOCUMENTS_CREATE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// ─── PATCH /api/admin/documents ────────────────────────────────────────────────
// Review document (Approve/Reject)
export const PATCH = withPermission('documents', 'approve', async (req: NextRequest) => {
  try {
    const payload = await requireAuth();
    if (!payload?.id) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

    const body = await req.json();
    const id = parseInt(body.id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid Document ID' }, { status: 400 });

    const { statusId, rejectionReason, expiresAt, notes } = body;

    if (!statusId) return NextResponse.json({ error: 'statusId is required for review' }, { status: 400 });

    const document = await prisma.$transaction(async (tx) => {
      const existing = await tx.document.findUnique({ where: { id } });
      if (!existing) throw new Error('NOT_FOUND');

      const updated = await tx.document.update({
        where: { id },
        data: {
          statusId,
          rejectionReason,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
          notes,
          reviewedById: Number(payload.id),
          reviewedAt: new Date(),
        },
        include: {
            status: { select: { name: true } }
        }
      });

      await tx.activityLog.create({
        data: {
          userId: Number(payload.id),
          action: 'UPDATE',
          module: 'documents',
          recordId: id,
          oldData: JSON.stringify(existing),
          newData: JSON.stringify(updated),
          ipAddress: req.headers.get('x-forwarded-for') ?? null,
        },
      });

      return updated;
    });

    return NextResponse.json({ data: document, message: `Document review updated to ${document.status.name}` });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'NOT_FOUND') return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    console.error('[DOCUMENTS_REVIEW_UPDATE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
