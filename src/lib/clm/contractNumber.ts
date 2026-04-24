import prisma from '@/lib/prisma';

export async function generateContractNumber(locationId: number): Promise<string> {
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { name: true, slug: true }
  });

  if (!location) throw new Error('Location not found');

  // AHD, SUR, etc.
  const locCode = (location.slug?.split('-')[0] || location.name.substring(0, 3)).toUpperCase();
  const year = new Date().getFullYear();

  // Count existing contracts for this location to get next sequence
  const count = await prisma.contract.count({
    where: {
      booking: {
        product: {
          locationId: locationId
        }
      }
    }
  });

  const sequence = (count + 1).toString();
  
  // Format: SSPACIA/AHD/AGR/YEAR/SEQ
  // matching the style of SSPACIA/AHD/CGA/SD/14
  return `SSPACIA/${locCode}/AGR/${year}/${sequence}`;
}

