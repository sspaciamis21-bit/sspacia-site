import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withPermission, type PermissionContext } from '@/lib/auth/withPermission';
import prisma from '@/lib/prisma';

// GET /api/admin/visitor-chats
// List all active unregistered visitor chat threads
export const GET = withPermission('tickets', 'read', async (
  _req: NextRequest,
  { payload }: PermissionContext
) => {
  try {
    const leads = await (prisma as any).unregisteredCustomer.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        chatMessages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: leads
    });
  } catch (error) {
    console.error('[ADMIN_VISITOR_CHATS_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// POST /api/admin/visitor-chats
// Admin or Community Manager sends a reply to an unregistered visitor
export const POST = withPermission('tickets', 'update', async (
  req: NextRequest,
  { payload }: PermissionContext
) => {
  try {
    const body = await req.json();
    const { unregisteredCustomerId, message } = body;

    if (!unregisteredCustomerId || !message || !String(message).trim()) {
      return NextResponse.json({ error: 'Customer ID and message required' }, { status: 400 });
    }

    const leadId = Number(unregisteredCustomerId);
    const lead = await (prisma as any).unregisteredCustomer.findUnique({
      where: { id: leadId }
    });

    if (!lead) {
      return NextResponse.json({ error: 'Visitor record not found' }, { status: 404 });
    }

    const userRoleStr = typeof payload.role === 'string' ? payload.role.toUpperCase() : 'MANAGER';
    const senderType = userRoleStr.includes('ADMIN') ? 'ADMIN' : 'MANAGER';
    const userNameStr = typeof payload.name === 'string' ? payload.name : (senderType === 'ADMIN' ? 'Super Admin' : 'Community Manager');

    const newMessage = await (prisma as any).visitorChatMessage.create({
      data: {
        unregisteredCustomerId: leadId,
        senderType,
        senderId: Number(payload.id),
        senderName: userNameStr,
        message: String(message).trim(),
      }
    });

    // Mark previous visitor messages as read
    await (prisma as any).visitorChatMessage.updateMany({
      where: {
        unregisteredCustomerId: leadId,
        senderType: 'VISITOR',
        isRead: false
      },
      data: { isRead: true }
    });

    // Update lead timestamp
    await (prisma as any).unregisteredCustomer.update({
      where: { id: leadId },
      data: { updatedAt: new Date() }
    });

    return NextResponse.json({
      success: true,
      data: newMessage
    });
  } catch (error) {
    console.error('[ADMIN_VISITOR_CHATS_POST]', error);
    return NextResponse.json({ error: 'Failed to send reply' }, { status: 500 });
  }
});
