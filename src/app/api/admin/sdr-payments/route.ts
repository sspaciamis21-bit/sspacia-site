import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';
import { getNodeScopedUserIds } from '@/lib/auth/getNodeScopedUserIds';

export const dynamic = 'force-dynamic';

// GET /api/admin/sdr-payments — Fetch clients and SDR payment statuses
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    let currentUserId: number | null = null;
    let isSuperAdmin = false;
    let isAccountant = false;

    if (token) {
      const payload = await verifyToken(token);
      if (payload?.id) {
        currentUserId = Number(payload.id);
        const role = String(payload.role || '').toUpperCase().replace(/[\s_-]/g, '');

        const dbUser = await (prisma as any).user.findUnique({
          where: { id: currentUserId },
          select: {
            name: true,
            email: true,
            role: { select: { name: true } },
          },
        });

        if (dbUser) {
          const roleName = (dbUser.role?.name || '').toUpperCase().replace(/[\s_-]/g, '');
          isSuperAdmin = roleName === 'ADMIN' || roleName === 'SUPERADMIN';
          isAccountant =
            (dbUser.email || '').toLowerCase() === 'ssinfrazone21@gmail.com' ||
            (dbUser.name || '').toLowerCase() === 'accounts' ||
            roleName === 'ACCOUNTS' ||
            roleName === 'ACCOUNTANT';
        }
      }
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const locationId = searchParams.get('locationId');
    const status = searchParams.get('status'); // 'ALL' | 'PENDING' | 'PARTIAL' | 'COMPLETED'

    const where: any = {
      // Show active, inactive, and on-notice clients (excluding deleted/purged)
      clientStatus: { not: 'DELETED' },
    };

    // Strict Role Access: SDR Receive Management is reserved for Accounts & Super Admin only (not accessible to CM)
    if (!isSuperAdmin && !isAccountant) {
      return NextResponse.json(
        { error: 'Forbidden: SDR Receive Management is reserved for Accounts and Super Admin only' },
        { status: 403 }
      );
    }

    const clients = await (prisma as any).clientMaster.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            assignedLocations: {
              select: {
                location: { select: { id: true, name: true } },
              },
            },
          },
        },
        contactPersons: {
          orderBy: { sortOrder: 'asc' },
        },
        products: true,
      },
      orderBy: [
        { id: 'desc' },
      ],
    });

    const allLocations = await (prisma as any).location.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { id: 'asc' },
    });

    // Transform and compute SDR payment data
    let transformed = clients.map((c: any) => {
      const locName =
        c.createdBy?.assignedLocations?.[0]?.location?.name ||
        'Mercado';

      const locId =
        c.createdBy?.assignedLocations?.[0]?.location?.id ||
        null;

      const agreedSdr = Number(c.sdrAmount ?? c.sorAmount ?? 0);
      const recAmt = Number(c.sdrReceivedAmount ?? (c.sdrRecdDate && agreedSdr > 0 ? agreedSdr : 0));

      let compStatus = c.sdrPaymentStatus || 'PENDING';
      if (agreedSdr > 0) {
        if (recAmt >= agreedSdr) {
          compStatus = 'COMPLETED';
        } else if (recAmt > 0 && recAmt < agreedSdr) {
          compStatus = 'PARTIAL';
        } else if (c.sdrUtrNumber && String(c.sdrUtrNumber).trim() !== '') {
          compStatus = 'COMPLETED';
        } else {
          compStatus = 'PENDING';
        }
      } else if (recAmt > 0) {
        compStatus = 'COMPLETED';
      }

      let parsedPayments: any[] = [];
      if (c.sdrPaymentsJson) {
        try {
          parsedPayments = JSON.parse(c.sdrPaymentsJson);
        } catch {}
      }

      // If no paymentsJson array exists yet, but we have payment fields recorded
      if (parsedPayments.length === 0 && (recAmt > 0 || c.sdrRecdDate || c.sdrUtrNumber)) {
        parsedPayments = [
          {
            id: 'init-1',
            receiveAmount: recAmt > 0 ? String(recAmt) : '',
            payReceiveDate: c.sdrRecdDate ? new Date(c.sdrRecdDate).toISOString().split('T')[0] : '',
            paymentMode: c.sdrPaymentMode || 'Bank Transfer',
            utrNumber: c.sdrUtrNumber || '',
            utrDate: c.sdrUtrDate ? new Date(c.sdrUtrDate).toISOString().split('T')[0] : '',
            utrFileUrl: null,
            utrFileName: null,
            remarks: c.sdrRemarks || '',
          },
        ];
      }

      // Receipt proof is strictly uploaded by the accountant during payment receive entry.
      // Never display the CM's SDR document or agreement proof as payment receipt proof.
      if (Array.isArray(parsedPayments)) {
        parsedPayments = parsedPayments.map((p) => {
          if (p.utrFileUrl && (p.utrFileUrl === c.sdrPdfUrl || p.utrFileUrl === c.agreementPdfUrl)) {
            return {
              ...p,
              utrFileUrl: null,
              utrFileName: null,
            };
          }
          return p;
        });
      }

      // Attached document (SDR receipt or official agreement PDF)
      const attachedDocUrl = c.sdrPdfUrl || c.agreementPdfUrl || null;
      const attachedDocName = c.sdrPdfName || c.agreementPdfName || (c.sdrPdfUrl ? 'SDR Receipt PDF' : 'Agreement PDF');

      return {
        id: c.id,
        srNo: c.srNo,
        companyName: c.companyName || 'Valued Client',
        clientId: c.clientId || null,
        cabinName: c.cabinName || null,
        noOfSeats: c.noOfSeats || null,
        clientStatus: c.clientStatus || 'Active',
        locationId: locId,
        locationName: locName,
        // SDR Financials
        sdrAmount: agreedSdr,
        sdrReceivedAmount: recAmt,
        balanceAmount: Math.max(0, agreedSdr - recAmt),
        sdrPaymentStatus: compStatus,
        // Latest payment details
        sdrRecdDate: c.sdrRecdDate,
        sdrPaymentMode: c.sdrPaymentMode || null,
        sdrUtrNumber: c.sdrUtrNumber || null,
        sdrUtrDate: c.sdrUtrDate || null,
        sdrBankName: c.sdrBankName || null,
        sdrRemarks: c.sdrRemarks || null,
        // Documents
        sdrPdfUrl: c.sdrPdfUrl || null,
        sdrPdfName: c.sdrPdfName || null,
        agreementPdfUrl: c.agreementPdfUrl || null,
        agreementPdfName: c.agreementPdfName || null,
        attachedDocUrl,
        attachedDocName,
        // Multi-part payments
        payments: parsedPayments,
        contactPersons: c.contactPersons || [],
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });

    // Filter by Location
    if (locationId && locationId !== 'ALL') {
      const targetLocId = Number(locationId);
      transformed = transformed.filter((c: any) => Number(c.locationId) === targetLocId);
    }

    // Filter by Status
    if (status && status !== 'ALL') {
      if (status === 'COMPLETED') {
        transformed = transformed.filter((c: any) => c.sdrPaymentStatus === 'COMPLETED');
      } else if (status === 'PARTIAL') {
        transformed = transformed.filter((c: any) => c.sdrPaymentStatus === 'PARTIAL');
      } else if (status === 'PENDING') {
        transformed = transformed.filter((c: any) => c.sdrPaymentStatus === 'PENDING');
      }
    }

    // Filter by Search Query
    if (search) {
      transformed = transformed.filter((c: any) => {
        const comp = (c.companyName || '').toLowerCase();
        const cid = (c.clientId || '').toLowerCase();
        const utr = (c.sdrUtrNumber || '').toLowerCase();
        const cabin = (c.cabinName || '').toLowerCase();
        const loc = (c.locationName || '').toLowerCase();
        return comp.includes(search) || cid.includes(search) || utr.includes(search) || cabin.includes(search) || loc.includes(search);
      });
    }

    // Summary Analytics
    const totalClientsCount = transformed.length;
    const totalSdrTargetSum = transformed.reduce((acc: number, c: any) => acc + c.sdrAmount, 0);
    const totalSdrReceivedSum = transformed.reduce((acc: number, c: any) => acc + c.sdrReceivedAmount, 0);
    const totalSdrPendingSum = Math.max(0, totalSdrTargetSum - totalSdrReceivedSum);
    const completedCount = transformed.filter((c: any) => c.sdrPaymentStatus === 'COMPLETED').length;
    const partialCount = transformed.filter((c: any) => c.sdrPaymentStatus === 'PARTIAL').length;
    const pendingCount = transformed.filter((c: any) => c.sdrPaymentStatus === 'PENDING').length;

    return NextResponse.json({
      success: true,
      data: transformed,
      locations: allLocations,
      summary: {
        totalClientsCount,
        totalSdrTargetSum,
        totalSdrReceivedSum,
        totalSdrPendingSum,
        completedCount,
        partialCount,
        pendingCount,
      },
    });
  } catch (error: any) {
    console.error('[SDR_PAYMENTS_GET_ERROR]', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch SDR payments' }, { status: 500 });
  }
}
