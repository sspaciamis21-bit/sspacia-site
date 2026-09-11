import prisma from '../src/lib/prisma';

async function main() {
  const records = await (prisma as any).invoiceRecord.findMany({
    where: {
      OR: [
        { companyName: { contains: 'Cross Marketing' } },
        { clientMaster: { companyName: { contains: 'Cross Marketing' } } },
      ]
    },
    include: {
      clientMaster: {
        include: {
          location: true,
          contactPersons: true,
        }
      },
      createdByUser: true,
    }
  });

  console.log('Found InvoiceRecords:', records.length);
  for (const r of records) {
    console.log({
      id: r.id,
      companyName: r.companyName,
      billingMonth: r.billingMonth,
      cabinName: r.cabinName,
      noOfSeats: r.noOfSeats,
      totalAmount: r.totalAmount,
      sessionDate: r.sessionDate,
      startTime: r.startTime,
      endTime: r.endTime,
      paymentDueDay: r.paymentDueDay,
      clientMasterId: r.clientMasterId,
      locationId: r.clientMaster?.locationId,
      locationName: r.clientMaster?.location?.name,
      locationSlug: r.clientMaster?.location?.slug,
      createdById: r.createdById,
      createdByUser: r.createdByUser ? { id: r.createdByUser.id, name: r.createdByUser.name, email: r.createdByUser.email } : null,
    });
  }
}

main().catch(console.error).finally(() => process.exit(0));
