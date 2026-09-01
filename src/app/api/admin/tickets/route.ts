import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission } from '@/lib/auth/withPermission';
import { requireAuth } from '@/lib/auth';
import { Prisma } from '@prisma/client';

// ─── Helper ──────────────────────────────────────────────────────────────────
async function generateTicketNumber(): Promise<string> {
  const last = await prisma.supportTicket.findFirst({
    orderBy: { id: 'desc' },
    select: { ticketNumber: true },
  });
  if (!last?.ticketNumber?.startsWith('TKT-')) return 'TKT-1000';
  const num = parseInt(last.ticketNumber.replace('TKT-', ''), 10);
  return isNaN(num) ? 'TKT-1000' : `TKT-${num + 1}`;
}

// ─── GET /api/admin/tickets ───────────────────────────────────────────────────
// Returns tickets scoped to caller role/location with rich filtering.
export const GET = withPermission('tickets', 'view', async (req: NextRequest) => {
  try {
    const payload = await requireAuth();
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const userId = Number(payload.id);
    const { searchParams } = req.nextUrl;

    const page        = Math.max(1, parseInt(searchParams.get('page')        ?? '1',  10));
    const limit       = Math.max(1, Math.min(200, parseInt(searchParams.get('limit')       ?? '100', 10)));
    const skip        = (page - 1) * limit;
    const statusId    = searchParams.get('statusId') ? parseInt(searchParams.get('statusId')!, 10) : undefined;
    const statusName  = searchParams.get('status');
    const priority    = searchParams.get('priority');
    const locationId  = searchParams.get('locationId');
    const category    = searchParams.get('category');
    const assigneeId  = searchParams.get('assigneeId');
    const search      = searchParams.get('search')?.trim();
    const dateFrom    = searchParams.get('dateFrom');
    const dateTo      = searchParams.get('dateTo');

    // Fetch user's assigned locations and role for scoping
    const user = await prisma.user.findUnique({
      where: { id: userId, isActive: true },
      select: { 
        email: true,
        role: { select: { name: true } },
        assignedLocations: { select: { locationId: true } } 
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const roleName = user.role?.name?.toLowerCase() || '';
    const isSuperAdmin = roleName === 'admin' || roleName === 'super_admin' || roleName === 'super admin';
    const isMember = roleName === 'user' || roleName === 'member' || roleName === 'customer';
    
    const userLocationIds = user.assignedLocations.map((al) => al.locationId);

    const whereClause: Prisma.SupportTicketWhereInput = {};

    // Scoping for members / CMs / Super Admin
    if (isMember) {
      whereClause.email = user.email;
    } else if (!isSuperAdmin && userLocationIds.length > 0) {
      whereClause.locationId = { in: userLocationIds };
    }

    // Filter: Location (for Super Admin or allowed locations)
    if (locationId && locationId !== 'ALL') {
      whereClause.locationId = parseInt(locationId, 10);
    }

    // Filter: Status ID or Name
    if (statusId && !isNaN(statusId)) {
      whereClause.statusId = statusId;
    } else if (statusName && statusName !== 'ALL') {
      whereClause.status = { is: { name: statusName } };
    }

    // Filter: Category
    if (category && category !== 'ALL') {
      whereClause.category = category;
    }

    // Filter: Assignee (Solved By / Assigned CM)
    if (assigneeId && assigneeId !== 'ALL') {
      if (assigneeId === 'UNASSIGNED') {
        whereClause.assigneeId = null;
      } else {
        whereClause.assigneeId = parseInt(assigneeId, 10);
      }
    }

    // Filter: Date Range
    if (dateFrom || dateTo) {
      whereClause.createdAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(new Date(dateTo).setHours(23, 59, 59, 999)) } : {}),
      };
    }

    // Filter: Search keyword
    if (search) {
      whereClause.OR = [
        { ticketNumber: { contains: search } },
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { organization: { contains: search } },
        { description: { contains: search } },
        { category: { contains: search } },
        { subCategory: { contains: search } },
      ];
    }

    const [total, tickets, locations, staffMembers] = await prisma.$transaction([
      prisma.supportTicket.count({ where: whereClause }),
      prisma.supportTicket.findMany({
        where: whereClause,
        skip,
        take: limit,
        select: {
          id: true,
          ticketNumber: true,
          name: true,
          email: true,
          phone: true,
          organization: true,
          description: true,
          category: true,
          subCategory: true,
          spaceType: true,
          location: true,
          locationId: true,
          assigneeId: true,
          createdAt: true,
          updatedAt: true,
          status: {
            select: { id: true, name: true, displayName: true, color: true },
          },
          locationRel: {
            select: {
              id: true,
              name: true,
              assignedUsers: {
                where: {
                  user: {
                    role: {
                      name: { in: ['COMMUNITY_MANAGER', 'Community Manager', 'MANAGER', 'Manager'] },
                    },
                  },
                },
                select: {
                  user: { select: { id: true, name: true, email: true } },
                },
              },
            },
          },
          productTypeId: true,
          productType: { select: { id: true, name: true, displayName: true } },
          customer: { select: { id: true, name: true, email: true, phone: true, organization: true } },
          assignee: { select: { id: true, name: true, email: true } },
          attachments: { select: { id: true, url: true } },
          comments: {
            select: {
              id: true,
              senderName: true,
              senderEmail: true,
              senderRole: true,
              message: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.location.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.user.findMany({
        where: {
          isActive: true,
          role: { name: { in: ['ADMIN', 'SUPER_ADMIN', 'COMMUNITY_MANAGER', 'Admin', 'Super Admin', 'Community Manager', 'MANAGER', 'Manager'] } },
        },
        select: { id: true, name: true, email: true, role: { select: { name: true } } },
        orderBy: { name: 'asc' },
      }),
    ]);

    const now = new Date().getTime();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseData = (tickets as any[]).map((t) => {
      const createdAtMs = new Date(t.createdAt).getTime();
      const updatedAtMs = new Date(t.updatedAt).getTime();
      const hoursOpen = Math.floor((now - createdAtMs) / (1000 * 60 * 60));
      const resolutionHours = Math.floor((updatedAtMs - createdAtMs) / (1000 * 60 * 60));
      const statusName = (t.status?.name || '').toUpperCase();
      const isFinalStatus = ['RESOLVED', 'CLOSED'].includes(statusName) || Boolean(t.status?.isFinal);
      const isEscalated = !isFinalStatus && hoursOpen >= 48;

      // Extract assigned Community Manager of this centre
      const assignedCm = t.locationRel?.assignedUsers?.[0]?.user || null;

      // Extract last resolution or system note
      const latestComment = t.comments?.[0] || null;

      return {
        ...t,
        raisedBy: {
          name: t.customer?.name || t.name || 'Client',
          email: t.customer?.email || t.email || 'N/A',
          phone: t.customer?.phone || t.phone || 'N/A',
          organization: t.customer?.organization || t.organization || 'Individual Member',
        },
        assignedCm: assignedCm ? { id: assignedCm.id, name: assignedCm.name, email: assignedCm.email } : null,
        solvedBy: isFinalStatus
          ? (t.assignee ? { id: t.assignee.id, name: t.assignee.name, email: t.assignee.email } : (assignedCm ? { id: assignedCm.id, name: assignedCm.name, email: assignedCm.email } : null))
          : null,
        user: t.customer ? { name: t.customer.name, email: t.customer.email } : (t.name ? { name: t.name, email: t.email } : null),
        hoursOpen,
        resolutionHours: isFinalStatus ? resolutionHours : null,
        isEscalated,
        escalatedHours: isEscalated ? hoursOpen - 48 : 0,
        latestComment,
      };
    });

    const escalatedCount = responseData.filter((t) => t.isEscalated).length;
    const resolvedCount  = responseData.filter((t) => ['RESOLVED', 'CLOSED'].includes((t.status?.name || '').toUpperCase())).length;
    const openCount      = responseData.filter((t) => !['RESOLVED', 'CLOSED'].includes((t.status?.name || '').toUpperCase())).length;

    return NextResponse.json({
      data: responseData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        escalatedCount,
        resolvedCount,
        openCount,
        locations,
        staffMembers,
      },
    });
  } catch (error) {
    console.error('[TICKETS_READ]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// ─── POST /api/admin/tickets ──────────────────────────────────────────────────
// Create a support ticket (any authenticated user with tickets:create permission).
export const POST = withPermission('tickets', 'create', async (req: NextRequest) => {
  try {
    const payload = await requireAuth();
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const body = await req.json() as Record<string, unknown>;
    const { name, description, organization, productTypeId, locationId, filestackUrls, category, subCategory } = body;

    // 1. Validate
    if (!name || !description) {
      return NextResponse.json(
        { error: 'name and description are required' },
        { status: 400 }
      );
    }

    // 2. Resolve user → customer
    const userId = Number(payload.id);
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, phone: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    let customer = await prisma.customer.findUnique({
      where: { email: dbUser.email },
      select: { id: true },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name:         dbUser.name,
          email:        dbUser.email,
          phone:        dbUser.phone ?? undefined,
          organization: organization ? String(organization) : undefined,
        },
        select: { id: true },
      });
    }

    const ticketNumber = await generateTicketNumber();

    const openStatus = await prisma.ticketStatus.findFirst({
      where: { name: { in: ['OPEN', 'Open', 'PENDING', 'Pending'] } },
      orderBy: { sortOrder: 'asc' },
      select: { id: true },
    });

    const attachments =
      Array.isArray(filestackUrls) && filestackUrls.length > 0
        ? { create: (filestackUrls as string[]).map((url) => ({ url })) }
        : undefined;

    // 3. Create + activity log
    const ticket = await prisma.$transaction(async (tx) => {
      const t = await tx.supportTicket.create({
        data: {
          ticketNumber,
          name:          String(name),
          email:         dbUser.email,
          phone:         dbUser.phone ?? undefined,
          organization:  organization ? String(organization) : undefined,
          locationId:    locationId  ? parseInt(String(locationId),  10) : undefined,
          productTypeId: productTypeId ? parseInt(String(productTypeId), 10) : undefined,
          category:      category ? String(category) : undefined,
          subCategory:   subCategory ? String(subCategory) : undefined,
          description:   String(description),
          customerId:    customer!.id,
          statusId:      openStatus?.id ?? 1,
          attachments,
        },
        select: {
          id: true,
          ticketNumber: true,
          name: true,
          email: true,
          status: { select: { id: true, name: true, displayName: true } },
          attachments: { select: { id: true, url: true } },
          createdAt: true,
        },
      });

      // 4. Activity log
      await tx.activityLog.create({
        data: {
          userId:    userId,
          action:    'CREATE',
          module:    'tickets',
          recordId:  t.id,
          newData:   JSON.stringify(t),
          ipAddress: req.headers.get('x-forwarded-for') ?? null,
        },
      });

      return t;
    });

    return NextResponse.json({ data: ticket, message: 'Created successfully' }, { status: 201 });
  } catch (error) {
    console.error('[TICKETS_CREATE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// ─── PATCH /api/admin/tickets ─────────────────────────────────────────────────
// Update ticket status, assignee, or resolution notes. Body: { id, statusId, status, assigneeId, resolutionNotes }
export const PATCH = withPermission('tickets', 'update', async (req: NextRequest) => {
  try {
    const payload = await requireAuth();
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const currentUserId = Number(payload.id);
    const currentUserName = (payload.name as string) || 'Admin';

    const body = await req.json() as Record<string, unknown>;
    const id = parseInt(String(body.id ?? ''), 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Valid ticket id is required' }, { status: 400 });
    }

    let statusId = body.statusId ? parseInt(String(body.statusId), 10) : undefined;
    const statusName = body.status ? String(body.status) : undefined;
    const assigneeId = body.assigneeId !== undefined ? (body.assigneeId === null ? null : parseInt(String(body.assigneeId), 10)) : undefined;
    const resolutionNotes = body.resolutionNotes ? String(body.resolutionNotes).trim() : undefined;

    // Resolve name to ID if needed
    if (!statusId && statusName) {
      const match = await prisma.ticketStatus.findFirst({
        where: { name: { equals: statusName } },
        select: { id: true },
      });
      if (match) statusId = match.id;
    }

    // 2. Check existence
    const existing = await prisma.supportTicket.findUnique({
      where: { id },
      select: {
        id: true,
        statusId: true,
        ticketNumber: true,
        email: true,
        assigneeId: true,
        customer: { select: { email: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updateData: Prisma.SupportTicketUpdateInput = {};

    if (statusId && !isNaN(statusId)) {
      updateData.status = { connect: { id: statusId } };
    }

    if (assigneeId !== undefined) {
      if (assigneeId === null) {
        updateData.assignee = { disconnect: true };
      } else if (!isNaN(assigneeId)) {
        updateData.assignee = { connect: { id: assigneeId } };
      }
    }

    // If marked as Resolved or Closed, and no assignee was set, automatically set solver to current user
    const isMarkingResolved = statusName && ['RESOLVED', 'CLOSED'].includes(statusName.toUpperCase());
    if (isMarkingResolved && !existing.assigneeId && assigneeId === undefined) {
      updateData.assignee = { connect: { id: currentUserId } };
    }

    // 3. Update + activity log + notify user
    const ticket = await prisma.$transaction(async (tx) => {
      const updated = await tx.supportTicket.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          ticketNumber: true,
          status: { select: { id: true, name: true, displayName: true } },
          assignee: { select: { id: true, name: true, email: true } },
          updatedAt: true,
        },
      });

      const newStatusName = updated.status?.displayName || updated.status?.name || 'Updated';

      // Post System Comment on status change or assignment
      let logMessage = '';
      if (statusId) {
        logMessage += `Ticket status updated to "${newStatusName}" by ${currentUserName}. `;
      }
      if (assigneeId !== undefined) {
        logMessage += updated.assignee ? `Assigned to ${updated.assignee.name}. ` : 'Assignment cleared. ';
      }
      if (resolutionNotes) {
        logMessage += `Resolution Remark: "${resolutionNotes}".`;
      }

      if (logMessage) {
        await tx.ticketComment.create({
          data: {
            supportTicketId: id,
            senderName: currentUserName,
            senderRole: 'SYSTEM',
            message: logMessage.trim(),
          },
        });
      }

      // Create User Notification
      const targetEmail = existing.email || existing.customer?.email;
      if (targetEmail) {
        await tx.userNotification.create({
          data: {
            userEmail: targetEmail,
            title: `Ticket #${updated.ticketNumber} Update`,
            message: logMessage || `Status updated to "${newStatusName}".`,
            ticketId: updated.id,
          },
        });
      }

      // 4. Activity log
      await tx.activityLog.create({
        data: {
          userId:    currentUserId,
          action:    'UPDATE',
          module:    'tickets',
          recordId:  id,
          oldData:   JSON.stringify(existing),
          newData:   JSON.stringify(updated),
          ipAddress: req.headers.get('x-forwarded-for') ?? null,
        },
      });

      return updated;
    });

    return NextResponse.json({ data: ticket, message: 'Ticket updated successfully' });
  } catch (error) {
    console.error('[TICKETS_UPDATE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

