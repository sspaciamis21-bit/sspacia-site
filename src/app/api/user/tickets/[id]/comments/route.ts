import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

interface ContextParams {
  params: Promise<{ id: string }>;
}

// GET /api/user/tickets/[id]/comments — Fetch comments for user's ticket
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

    const email = payload.email as string;

    // Ensure ticket exists & belongs to user
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        OR: [{ email }, { customer: { email } }],
      },
      select: { id: true, ticketNumber: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const comments = await prisma.ticketComment.findMany({
      where: { supportTicketId: ticketId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ data: comments });
  } catch (error) {
    console.error('[USER_TICKET_COMMENTS_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/user/tickets/[id]/comments — User posts a reply message
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

    const email = payload.email as string;

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        OR: [{ email }, { customer: { email } }],
      },
      select: { id: true, ticketNumber: true, locationId: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const body = await req.json();
    const { message, attachments } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    const userName = (payload.name as string) || (payload.email as string).split('@')[0];

    const comment = await prisma.ticketComment.create({
      data: {
        supportTicketId: ticketId,
        senderName: userName,
        senderEmail: email,
        senderRole: 'USER',
        message: message.trim(),
        attachmentsJson: Array.isArray(attachments) && attachments.length > 0 ? JSON.stringify(attachments) : null,
      },
    });

    return NextResponse.json({ data: comment });
  } catch (error) {
    console.error('[USER_TICKET_COMMENTS_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
