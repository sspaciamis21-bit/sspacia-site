import prisma from '../src/lib/prisma';

async function main() {
  const invoices = await prisma.invoiceRecord.findMany({
    where: {
      companyName: 'Cross Marketing'
    },
    include: {
      createdBy: {
        include: {
          assignedLocations: {
            include: {
              location: true,
            }
          }
        }
      }
    },
    orderBy: { id: 'asc' }
  });

  console.log('Cross Marketing Invoices:');
  for (const inv of invoices) {
    console.log({
      id: inv.id,
      cabin: inv.cabinName,
      dueDay: inv.paymentDueDay,
      creatorName: inv.createdBy?.name,
      creatorEmail: inv.createdBy?.email,
      node: inv.createdBy?.assignedLocations.map(al => al.location?.name).join(', ') || 'No Node'
    });
  }
}

main().catch(console.error).finally(() => process.exit(0));
