import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission, type PermissionContext } from '@/lib/auth/withPermission';

/**
 * PATCH /api/admin/contract-requests/[id]
 * Accept or Reject a contract request.
 */
export const PATCH = withPermission('clm', 'update', async (
  req: NextRequest,
  { params, payload }: PermissionContext
) => {
  try {
    const { action, rejectedNote } = await req.json();

    if (!['ACCEPT', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const awaitedParams = await params;
    const requestId = Number(awaitedParams.id);

    const request = await prisma.contractRequest.findUnique({
      where: { id: requestId },
      include: { 
        booking: { 
          include: { 
            product: {
              include: {
                location: true,
                type: true,
                category: true
              }
            }
          } 
        },
        customer: true 
      }
    }) as any;

    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (request.status !== 'PENDING') {
      return NextResponse.json({ error: 'Request is already processed' }, { status: 400 });
    }

    let result;
    if (action === 'ACCEPT') {
      if (!request.booking || !request.booking.product?.locationId) {
        return NextResponse.json({ error: 'Booking or location link missing. Cannot generate contract.' }, { status: 400 });
      }

      const { generateContractNumber } = await import('@/lib/clm/contractNumber');
      const contractNumber = await generateContractNumber(request.booking.product.locationId);

      // Status object for DRAFT
      const draftStatus = await prisma.contractStatus.findUnique({ where: { name: 'DRAFT' } });
      if (!draftStatus) throw new Error('DRAFT status not seeded');

      const { generateInitialAgreement, numberToWordsIndian } = await import('@/lib/clm/templates');
      const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      
      // Fetch PAN from documents
      const panDoc = await prisma.document.findFirst({
        where: {
          customerId: request.customerId,
          title: { contains: 'PAN' }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Safely handle Decimals for math
      const totalAmount = Number(request.booking.totalAmount);
      const unitPrice = Number(request.booking.unitPrice || request.booking.product?.price || 0);
      const seats = request.booking.seats || 1;
      const depositAmount = totalAmount * 3;

      const initialContent = JSON.stringify(generateInitialAgreement({
        date: today,
        companyAddress: "Sspacia India Private Limited, Ahmedabad", 
        customerName: panDoc?.nameOnDocument || request.customer.name,
        customerOrg: request.customer.organization || request.customer.name,
        customerDesignation: "Authorized Signatory", 
        customerPan: panDoc?.documentNumber || "PAN_REQUIRED",
        customerPhone: request.customer.phone || "Not Provided",
        customerEmail: request.customer.email || "Not Provided",
        userId: String(request.customerId),
        productType: request.booking.product?.type?.displayName || "Office Space",
        productName: request.booking.product?.name || "Workspace",
        centerAddress: request.booking.product?.location?.address || request.booking.product?.location?.name || "Sspacia Center",
        period: "12 Months",
        startDate: new Date(request.booking.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
        expiryDate: new Date(request.booking.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
        cost: String(unitPrice),
        costInWords: numberToWordsIndian(unitPrice), 
        calculatedCost: String(totalAmount),
        calculatedCostInWords: numberToWordsIndian(totalAmount),
        capacity: String(seats),
        depositAmount: String(depositAmount), 
        depositAmountInWords: numberToWordsIndian(depositAmount),
        lockInPeriod: "12 Months",
        noticePeriod: "2 Months",
        escalationPercentage: "5%",
        renewalDate: new Date(request.booking.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
        contractNumber: contractNumber
      }));


      result = await prisma.$transaction(async (tx) => {
        // Create the contract
        const contract = await tx.contract.create({
          data: {
            contractNumber,
            requestId: requestId,
            bookingId: request.bookingId!,
            statusId: draftStatus.id,
            title: `Agreement - ${request.customer.name}`,
            createdById: Number(payload.id)
          }
        });

        // Create initial version
        await tx.contractVersion.create({
          data: {
            contractId: contract.id,
            versionNumber: 1,
            content: initialContent,
            createdById: Number(payload.id)
          }
        });

        // Update request as accepted
        await tx.contractRequest.update({
          where: { id: requestId },
          data: { status: 'ACCEPTED' }
        });

        // Create initial negotiation thread
        await tx.contractNegotiation.create({
          data: { 
            contractId: contract.id,
            title: "Initial Draft Review",
            status: "OPEN"
          }
        });

        return contract;
      });
    } else {
      result = await prisma.contractRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          rejectedNote: rejectedNote || null,
        }
      });
    }

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: Number(payload.id),
        action: 'UPDATE',
        module: 'clm_request',
        recordId: requestId,
        newData: JSON.stringify({ action, requestId })
      }
    });

    return NextResponse.json({
      message: `Request ${action.toLowerCase()}ed and ${action === 'ACCEPT' ? 'contract draft generated' : 'processed'}.`,
      data: result
    });

  } catch (error) {
    console.error('[AdminContractRequestUpdate] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});


