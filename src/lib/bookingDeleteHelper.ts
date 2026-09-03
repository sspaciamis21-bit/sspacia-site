import prisma from '@/lib/prisma';

/**
 * Permanently deletes a booking and all its dependent records (contracts, payments, units, etc.)
 * in a clean atomic transaction without foreign key violations.
 */
export async function deleteBookingCascade(tx: any, bookingId: number) {
  // 1. Find all Contracts linked to this booking or linked contract requests
  const contracts = await tx.contract.findMany({
    where: {
      OR: [
        { bookingId },
        { request: { bookingId } },
      ],
    },
    select: { id: true },
  });
  const contractIds = contracts.map((c: any) => c.id);

  if (contractIds.length > 0) {
    // 1a. Delete negotiation messages
    const negs = await tx.contractNegotiation.findMany({
      where: { contractId: { in: contractIds } },
      select: { id: true },
    });
    const negIds = negs.map((n: any) => n.id);
    if (negIds.length > 0) {
      await tx.negotiationMessage.deleteMany({
        where: { negotiationId: { in: negIds } },
      });
    }

    // 1b. Delete negotiations, signatures, versions
    await tx.contractNegotiation.deleteMany({
      where: { contractId: { in: contractIds } },
    });
    await tx.contractSignature.deleteMany({
      where: { contractId: { in: contractIds } },
    });
    await tx.contractVersion.deleteMany({
      where: { contractId: { in: contractIds } },
    });

    // 1c. Delete contracts
    await tx.contract.deleteMany({
      where: { id: { in: contractIds } },
    });
  }

  // 2. Delete ContractRequests
  await tx.contractRequest.deleteMany({
    where: { bookingId },
  });

  // 3. Delete BookingUnits (frees up assigned desks/cabins)
  await tx.bookingUnit.deleteMany({
    where: { bookingId },
  });

  // 4. Delete Payments & Documents
  await tx.payment.deleteMany({
    where: { bookingId },
  });
  await tx.document.deleteMany({
    where: { bookingId },
  });

  // 5. Delete linked QrBooking
  await tx.qrBooking.deleteMany({
    where: { bookingId },
  });

  // 6. Delete the Booking itself
  await tx.booking.delete({
    where: { id: bookingId },
  });
}
