import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/public/visitor-chat?sessionToken=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionToken = searchParams.get('sessionToken');

    if (!sessionToken) {
      return NextResponse.json({ error: 'Session token required' }, { status: 400 });
    }

    const lead = await (prisma as any).unregisteredCustomer.findUnique({
      where: { sessionToken },
      include: {
        chatMessages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!lead) {
      return NextResponse.json({ error: 'Visitor session expired or not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      lead: {
        id: lead.id,
        username: lead.username,
        email: lead.email,
        mobileNo: lead.mobileNo,
      },
      messages: lead.chatMessages
    });
  } catch (error) {
    console.error('[VISITOR_CHAT_GET_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/public/visitor-chat
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionToken, message } = body;

    if (!sessionToken || !message || !String(message).trim()) {
      return NextResponse.json({ error: 'Session token and message are required' }, { status: 400 });
    }

    const lead = await (prisma as any).unregisteredCustomer.findUnique({
      where: { sessionToken }
    });

    if (!lead) {
      return NextResponse.json({ error: 'Visitor session expired or not found' }, { status: 404 });
    }

    const newMessage = await (prisma as any).visitorChatMessage.create({
      data: {
        unregisteredCustomerId: lead.id,
        senderType: 'VISITOR',
        senderName: lead.username,
        message: String(message).trim(),
      }
    });

    return NextResponse.json({
      success: true,
      message: newMessage
    });
  } catch (error) {
    console.error('[VISITOR_CHAT_POST_ERROR]', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
