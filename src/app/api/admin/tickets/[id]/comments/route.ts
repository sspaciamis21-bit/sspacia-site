import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

interface ContextParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/tickets/[id]/comments — Fetch comments for CM/Admin
export async function GET(req: NextRequest, { params }: ContextParams) {
  try {
    const payload = await requireAuth();
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { id } = await params;
    const ticketId = parseInt(id, 10);
    if (isNaN(ticketId)) {
      return NextResponse.json({ error: 'Invalid ticket id' }, { status: 400 });
    }

    const comments = await prisma.ticketComment.findMany({
      where: { supportTicketId: ticketId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ data: comments });
  } catch (error) {
    console.error('[ADMIN_TICKET_COMMENTS_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/tickets/[id]/comments — CM/Admin posts a message & notifies user
export async function POST(req: NextRequest, { params }: ContextParams) {
  try {
    const payload = await requireAuth();
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { id } = await params;
    const ticketId = parseInt(id, 10);
    if (isNaN(ticketId)) {
      return NextResponse.json({ error: 'Invalid ticket id' }, { status: 400 });
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, ticketNumber: true, email: true, name: true, customer: { select: { email: true } } },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const body = await req.json();
    const { message, attachments } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    const senderName = (payload.name as string) || 'Community Manager';
    const userTargetEmail = ticket.email || ticket.customer?.email;

    const comment = await prisma.ticketComment.create({
      data: {
        supportTicketId: ticketId,
        senderName,
        senderEmail: payload.email as string,
        senderRole: 'CM',
        message: message.trim(),
        attachmentsJson: Array.isArray(attachments) && attachments.length > 0 ? JSON.stringify(attachments) : null,
      },
    });

    // Create User Notification for the user!
    if (userTargetEmail) {
      await prisma.userNotification.create({
        data: {
          userEmail: userTargetEmail,
          title: `New reply on Ticket #${ticket.ticketNumber}`,
          message: `${senderName}: "${message.trim().slice(0, 80)}${message.length > 80 ? '...' : ''}"`,
          ticketId: ticket.id,
        },
      });
    }

    return NextResponse.json({ data: comment });
  } catch (error) {
    console.error('[ADMIN_TICKET_COMMENTS_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
