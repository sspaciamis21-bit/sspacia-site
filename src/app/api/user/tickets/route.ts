import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/user/tickets — FETCH the authenticated user's own tickets
export async function GET() {
  try {
    const payload = await requireAuth();
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const email = payload.email as string;

    // Find tickets where the email on the ticket matches the user's email
    // This handles both tickets linked to a Customer record and guest tickets
    const tickets = await prisma.supportTicket.findMany({
      where: {
        OR: [
          { email: email },
          { customer: { email: email } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      select: {
          id: true,
          ticketNumber: true,
          name: true,
          description: true,
          createdAt: true,
          category: true,
          subCategory: true,
          status: { select: { id: true, name: true, displayName: true, color: true } },
          locationRel: { select: { id: true, name: true } },
          productType: { select: { id: true, name: true, displayName: true } },
          attachments: { select: { id: true, url: true } }
      }
    });

    return NextResponse.json({
        data: tickets.map(t => ({
           ...t,
           status: t.status, 
           location: t.locationRel?.name || 'Unknown'
        }))
    });
  } catch (error) {
    console.error('[USER_TICKETS_READ]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/user/tickets — CREATE a new support ticket tied to the user via Customer table
export async function POST(req: Request) {
    try {
        const payload = await requireAuth();
        if (!payload?.id) {
          return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
        }
    
        const email = payload.email as string;
        const { name, organization, productTypeId, locationId, category, subCategory, description, filestackUrls } = await req.json();

        // VALIDATION
        if (!name || !locationId || !productTypeId || !category || !subCategory || !description) {
           return NextResponse.json({ error: 'Missing mandatory ticket fields' }, { status: 400 });
        }

        // 1. Ensure Customer exists for this email
        let customer = await prisma.customer.findUnique({ where: { email } });
        if (!customer) {
            customer = await prisma.customer.create({
                data: {
                    name,
                    email,
                    organization: organization || 'Personal',
                    isActive: true
                }
            });
        }

        // 2. Generate Ticket Number (SSP-T-YYYYMMDD-XXXX)
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count = await prisma.supportTicket.count();
        const ticketNumber = `SSP-T-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;

        // 3. Get default OPEN status
        const openStatus = await prisma.ticketStatus.findFirst({
            where: { name: 'OPEN' }
        }) || await prisma.ticketStatus.findFirst({
            where: { name: 'PENDING' }
        });

        // 4. Create Ticket
        const ticket = await prisma.supportTicket.create({
           data: {
              ticketNumber,
              customerId: customer.id,
              email: email, // Store email directly on ticket as well
              name,
              organization,
              productTypeId: Number(productTypeId),
              locationId: Number(locationId),
              category,
              subCategory,
              description,
              statusId: openStatus?.id ?? 1,
              attachments: {
                 create: (filestackUrls || []).map((url: string) => ({ url }))
              }
           }
        });

        return NextResponse.json({ data: ticket });
    } catch (error) {
        console.error('[USER_TICKETS_CREATE]', error);
        return NextResponse.json({ error: 'Failed to initiate support process' }, { status: 500 });
    }
}
