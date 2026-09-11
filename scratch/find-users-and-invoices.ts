import prisma from '../src/lib/prisma';

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: 'premierhouse' } },
        { email: { contains: 'tushar' } },
      ]
    },
    include: {
      assignedLocations: {
        include: {
          location: true
        }
      }
    }
  });

  console.log('--- Matching Users ---');
  for (const u of users) {
    console.log({
      id: u.id,
      name: u.name,
      email: u.email,
      locations: u.assignedLocations.map(al => ({ id: al.locationId, name: al.location?.name, slug: al.location?.slug }))
    });
  }

  const invoices = await prisma.invoiceRecord.findMany({
    where: {
      companyName: { contains: 'Cross Marketing' }
    },
    include: {
      createdBy: {
        include: {
          assignedLocations: {
            include: {
              location: true
            }
          }
        }
      }
    }
  });

  console.log('--- Matching Invoices for Cross Marketing ---');
  for (const inv of invoices) {
    console.log({
      id: inv.id,
      srNo: inv.srNo,
      companyName: inv.companyName,
      billingMonth: inv.billingMonth,
      cabinName: inv.cabinName,
      createdById: inv.createdById,
      creatorName: inv.createdBy?.name,
      creatorEmail: inv.createdBy?.email,
      creatorLocations: inv.createdBy?.assignedLocations.map(al => al.location?.name),
      ratePerAgreement: inv.ratePerAgreement,
      totalAmount: inv.totalAmount,
      sessionDate: (inv as any).sessionDate,
      startTime: (inv as any).startTime,
      endTime: (inv as any).endTime,
      paymentDueDay: inv.paymentDueDay,
    });
  }
}

main().catch(console.error).finally(() => process.exit(0));
