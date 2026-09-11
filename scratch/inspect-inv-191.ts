import prisma from '../src/lib/prisma';

async function main() {
  const inv = await prisma.invoiceRecord.findUnique({
    where: { id: 191 },
    include: {
      clientMaster: {
        include: {
          products: true,
          contactPersons: true,
        }
      }
    }
  });

  console.log('Invoice 191:', {
    id: inv?.id,
    clientMasterId: inv?.clientMasterId,
    clientMaster: inv?.clientMaster ? {
      id: inv.clientMaster.id,
      companyName: inv.clientMaster.companyName,
      createdById: inv.clientMaster.createdById,
      products: inv.clientMaster.products.map(p => ({
        id: p.id,
        cabinName: p.cabinName,
        sessionDate: p.sessionDate,
        startTime: p.startTime,
        endTime: p.endTime,
      }))
    } : null
  });
}

main().catch(console.error).finally(() => process.exit(0));
