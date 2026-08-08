import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission } from '@/lib/auth/withPermission';
import { requireAuth } from '@/lib/auth';

// ─── GET /api/admin/documents ──────────────────────────────────────────────────
// List documents with strict location isolation for Community Managers
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

    // Location Scoping for Staff / Community Managers
    const userId = Number(payload.id);
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: { select: { name: true } }, assignedLocations: { select: { locationId: true } } }
    });

    const roleName = dbUser?.role?.name?.toLowerCase() || '';
    const isSuperAdmin = roleName === 'super admin' || roleName === 'admin';
    const assignedLocationIds = dbUser?.assignedLocations.map(al => al.locationId) || [];

    // Build location clause for non-superadmin users
    let locationWhere = {};
    if (!isSuperAdmin && role !== 'USER') {
      if (assignedLocationIds.length === 0) {
        // CM has no assigned locations -> sees 0 customer documents
        return NextResponse.json({ data: [] });
      }

      locationWhere = {
        customer: {
          OR: [
            { bookings: { some: { product: { locationId: { in: assignedLocationIds } } } } },
            { supportTickets: { some: { locationId: { in: assignedLocationIds } } } },
            { contractRequests: { some: { booking: { product: { locationId: { in: assignedLocationIds } } } } } }
          ]
        }
      };
    }

    const data = await prisma.document.findMany({
      where: {
        customerId: customerId || undefined,
        bookingId: bookingId || undefined,
        statusId: statusId || undefined,
        ...locationWhere,
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

    const email = payload.email as string;
    const customer = await prisma.customer.findUnique({ where: { email }, select: { id: true } });
    if (!customer) return NextResponse.json({ error: 'Customer record not found for user' }, { status: 404 });

    const statusObj = await prisma.documentStatus.findUnique({ where: { name: 'PENDING' } });

    const document = await prisma.document.create({
      data: {
        title,
        fileUrl,
        fileName: fileName || title,
        fileSize: fileSize || 0,
        mimeType: mimeType || 'application/pdf',
        categoryId,
        customerId: customer.id,
        bookingId: bookingId || undefined,
        statusId: statusObj?.id || 1,
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
// Review document (Approve/Reject) with location security check
export const PATCH = withPermission('documents', 'approve', async (req: NextRequest) => {
  try {
    const payload = await requireAuth();
    if (!payload?.id) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

    const body = await req.json();
    const id = parseInt(body.id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid Document ID' }, { status: 400 });

    const { statusId, rejectionReason, expiresAt, notes } = body;
    if (!statusId) return NextResponse.json({ error: 'statusId is required for review' }, { status: 400 });

    const userId = Number(payload.id);
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: { select: { name: true } }, assignedLocations: { select: { locationId: true } } }
    });

    const roleName = dbUser?.role?.name?.toLowerCase() || '';
    const isSuperAdmin = roleName === 'super admin' || roleName === 'admin';
    const assignedLocationIds = dbUser?.assignedLocations.map(al => al.locationId) || [];

    const existing = await prisma.document.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            bookings: { select: { product: { select: { locationId: true } } } },
            supportTickets: { select: { locationId: true } },
            contractRequests: { select: { booking: { select: { product: { select: { locationId: true } } } } } }
          }
        }
      }
    });

    if (!existing) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    // Enforce Location Authorization for Community Managers
    if (!isSuperAdmin && assignedLocationIds.length > 0 && existing.customer) {
      const userBookingLocations = existing.customer.bookings.map(b => b.product?.locationId).filter((locId): locId is number => typeof locId === 'number');
      const userTicketLocations = existing.customer.supportTickets.map(t => t.locationId).filter((locId): locId is number => typeof locId === 'number');
      const userContractLocations = existing.customer.contractRequests.map(cr => cr.booking?.product?.locationId).filter((locId): locId is number => typeof locId === 'number');
      const allUserLocations = [...userBookingLocations, ...userTicketLocations, ...userContractLocations];

      const hasAccess = assignedLocationIds.some(locId => allUserLocations.includes(locId));
      if (!hasAccess) {
        return NextResponse.json({ error: 'Unauthorized location access' }, { status: 403 });
      }
    }

    const updated = await prisma.document.update({
      where: { id },
      data: {
        statusId,
        rejectionReason,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        notes,
        reviewedById: userId,
        reviewedAt: new Date(),
      },
      include: {
        status: { select: { name: true } }
      }
    });

    await prisma.activityLog.create({
      data: {
        userId,
        action: 'UPDATE',
        module: 'documents',
        recordId: id,
        oldData: JSON.stringify(existing),
        newData: JSON.stringify(updated),
        ipAddress: req.headers.get('x-forwarded-for') ?? null,
      },
    });

    return NextResponse.json({ data: updated, message: `Document review updated to ${updated.status.name}` });
  } catch (error) {
    console.error('[DOCUMENTS_REVIEW_UPDATE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
