import prisma from '../src/lib/prisma';

async function main() {
  console.log('--- Checking Invoice Table ---');
  try {
    const invoices = await (prisma as any).invoice?.findMany({
      where: {
        OR: [
          { companyName: { contains: 'Cross Marketing' } },
          { clientName: { contains: 'Cross Marketing' } },
          { customerName: { contains: 'Cross Marketing' } },
          { notes: { contains: 'Cross Marketing' } },
        ]
      }
    });
    console.log('Invoices found:', invoices?.length);
    if (invoices?.length) console.log(invoices);
  } catch (e: any) {
    console.log('Invoice query error:', e.message);
  }

  console.log('--- Checking Booking Table ---');
  try {
    const bookings = await (prisma as any).booking?.findMany({
      where: {
        OR: [
          { companyName: { contains: 'Cross Marketing' } },
          { user: { email: { contains: 'savdiyatushar' } } },
          { user: { name: { contains: 'tushar' } } },
        ]
      },
      include: {
        location: true,
        user: true,
      }
    });
    console.log('Bookings found:', bookings?.length);
    if (bookings?.length) console.log(bookings);
  } catch (e: any) {
    console.log('Booking query error:', e.message);
  }

  console.log('--- Checking ClientMaster Table ---');
  try {
    const clients = await (prisma as any).clientMaster?.findMany({
      where: {
        OR: [
          { companyName: { contains: 'Cross Marketing' } },
          { email: { contains: 'savdiyatushar' } },
        ]
      }
    });
    console.log('Clients found:', clients?.length);
    if (clients?.length) console.log(clients);
  } catch (e: any) {
    console.log('ClientMaster query error:', e.message);
  }
}

main().catch(console.error).finally(() => process.exit(0));
