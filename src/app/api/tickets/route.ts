import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to generate custom ticket IDs like TKT-1002
async function generateNextTicketNumber() {
  const lastTicket = await prisma.supportTicket.findFirst({
    orderBy: { id: 'desc' },
  });

  if (!lastTicket || !lastTicket.ticketNumber.startsWith('TKT-')) {
    return 'TKT-1000';
  }

  const lastNumber = parseInt(lastTicket.ticketNumber.replace('TKT-', ''), 10);
  if (isNaN(lastNumber)) return 'TKT-1000';

  return `TKT-${lastNumber + 1}`;
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { 
      name, 
      organization, 
      spaceType, 
      location, 
      description, 
      userId, 
      filestackUrls 
    } = data;

    if (!name || !description) {
      return NextResponse.json(
        { message: 'Name and Description are required' },
        { status: 400 }
      );
    }

    const ticketNumber = await generateNextTicketNumber();

    // Prepare attachments data if any
    const attachments = Array.isArray(filestackUrls) && filestackUrls.length > 0
      ? {
          create: filestackUrls.map((url: string) => ({
            url,
          })),
        }
      : undefined;

    const newTicket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        name,
        organization: organization || undefined,
        spaceType: spaceType || undefined,
        location: location || undefined,
        description,
        userId: userId ? parseInt(userId.toString(), 10) : undefined,
        attachments,
      },
      include: {
        attachments: true,
      },
    });

    return NextResponse.json(newTicket, { status: 201 });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    return NextResponse.json(
      { message: 'Failed to create support ticket' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    let tickets: any[] = [];
    
    // Explicit Prisma readiness check
    if (!prisma.supportTicket) {
      console.warn("Prisma Client models are out of date. Please restart dev server.");
      return NextResponse.json(
        { message: 'Server database models are out of sync. Please restart npm run dev.' },
        { status: 500 }
      );
    }

    if (userId) {
      const parsedId = parseInt(userId, 10);
      if (isNaN(parsedId)) {
        return NextResponse.json({ message: 'Invalid userId' }, { status: 400 });
      }

      tickets = await prisma.supportTicket.findMany({
        where: { userId: parsedId },
        include: { attachments: true },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      tickets = await prisma.supportTicket.findMany({
        include: { attachments: true, user: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Ensure it's an array for new users without causing issues
    if (!tickets) {
      tickets = [];
    }

    return NextResponse.json(tickets, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { message: 'Failed to fetch tickets: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const data = await req.json();
    const { id, status } = data;

    if (!id || !status) {
      return NextResponse.json({ message: 'Ticket ID and standard status required' }, { status: 400 });
    }

    const updatedTicket = await prisma.supportTicket.update({
      where: { id: parseInt(id.toString(), 10) },
      data: { status },
    });

    return NextResponse.json(updatedTicket, { status: 200 });
  } catch (error) {
    console.error('Error updating ticket:', error);
    return NextResponse.json(
      { message: 'Failed to update ticket' },
      { status: 500 }
    );
  }
}
