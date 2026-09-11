import prisma from '../src/lib/prisma';

async function main() {
  const updated = await prisma.invoiceRecord.update({
    where: { id: 191 },
    data: {
      createdById: 7,
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
    }
  });

  console.log('Successfully updated InvoiceRecord 191:');
  console.log({
    id: updated.id,
    srNo: updated.srNo,
    companyName: updated.companyName,
    cabinName: updated.cabinName,
    createdById: updated.createdById,
    creatorName: updated.createdBy?.name,
    creatorEmail: updated.createdBy?.email,
    creatorLocations: updated.createdBy?.assignedLocations.map(al => al.location?.name),
  });
}

main().catch(console.error).finally(() => process.exit(0));
