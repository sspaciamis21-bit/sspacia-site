import prisma from '@/lib/prisma';

export async function generateContractNumber(locationId: number): Promise<string> {
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { name: true, slug: true }
  });

  if (!location) throw new Error('Location not found');

  const locCode = (location.slug?.split('-')[0] || location.name.substring(0, 3)).toUpperCase();
  const year = new Date().getFullYear();

  // Count existing contracts for this location and year by joining through booking -> product
  const count = await prisma.contract.count({
    where: {
      booking: {
        product: {
          locationId: locationId
        }
      },
      contractNumber: {
        contains: `SSP/${locCode}/${year}/`
      }
    }
  });



  const sequence = (count + 1).toString().padStart(4, '0');
  return `SSP/${locCode}/${year}/${sequence}`;
}

