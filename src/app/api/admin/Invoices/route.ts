import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';
import { getNodeScopedUserIds, getUserIdsByLocation } from '@/lib/auth/getNodeScopedUserIds';
import { autoDispatchIfLastDay } from '@/lib/auto-dispatch';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // ── Auto-dispatch on last day of month (runs only once, duplicate-safe) ──
    await autoDispatchIfLastDay();

    // Authenticate the current user
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    let currentUserId: number | null = null;

    if (token) {
      const payload = await verifyToken(token);
      if (payload?.id) {
        currentUserId = Number(payload.id);
      }
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const sendType = searchParams.get('sendType');
    const billingMonth = searchParams.get('billingMonth');
    const dueDay = searchParams.get('dueDay');
    const locationId = searchParams.get('locationId'); // Filter by node

    const where: any = {};

    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { gstNo: { contains: search } },
        { cabinName: { contains: search } },
      ];
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (sendType && sendType !== 'ALL') {
      where.sendType = sendType;
    }

    if (billingMonth && billingMonth !== 'ALL') {
      where.billingMonth = billingMonth;
    }

    if (dueDay && dueDay !== 'ALL') {
      where.paymentDueDay = parseInt(dueDay, 10);
    }

    // ── Node-based data isolation ────────────────────────────────
    if (currentUserId) {
      if (locationId && locationId !== 'ALL') {
        const locationUserIds = await getUserIdsByLocation(parseInt(locationId, 10));
        if (locationUserIds) {
          where.createdById = { in: locationUserIds };
        }
      } else {
        // Node scoping for CMs (returns null for admins & accountant = no filter)
        const scopedUserIds = await getNodeScopedUserIds(currentUserId);
        if (scopedUserIds !== null) {
          where.createdById = { in: scopedUserIds };
        }
      }
    }

    const invoices = await (prisma as any).invoiceRecord.findMany({
      where,
      include: {
        clientMaster: {
          include: {
            contactPersons: { orderBy: { sortOrder: 'asc' } },
            products: { orderBy: { sortOrder: 'asc' } },
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            assignedLocations: {
              select: {
                location: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
        attachedInvoice: true,
      },
      orderBy: [
        { paymentDueDay: 'asc' },
        { sentAt: 'desc' },
      ],
    });

    // Auto-calculate overdue days & late fee for display
    const today = new Date();
    const enrichedInvoices = invoices.map((inv: any) => {
      let lateDays = inv.lateDays || 0;
      let lateFeeAmount = Number(inv.lateFeeAmount || 0);

      if (inv.dueDate && inv.status !== 'APPROVED') {
        const due = new Date(inv.dueDate);
        if (today > due) {
          const diffMs = today.getTime() - due.getTime();
          lateDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const ratePerDay = Number(inv.lateFeePerDay || 100);
          lateFeeAmount = Math.max(0, lateDays * ratePerDay);
        }
      }

      return {
        ...inv,
        calculatedLateDays: lateDays,
        calculatedLateFee: lateFeeAmount,
      };
    });

    return NextResponse.json({ success: true, data: enrichedInvoices });
  } catch (error) {
    console.error('Fetch invoices error:', error);
    return NextResponse.json({ error: 'Failed to fetch invoice records' }, { status: 500 });
  }
}
