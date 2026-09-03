import prisma from '@/lib/prisma';

/**
 * Resolves and auto-synchronizes the Customer record corresponding to a logged-in User.
 * Ensures bookings, contracts, and documents remain connected even if username or email is changed.
 */
export async function getOrCreateSyncedCustomer(userId: number, tokenEmail?: string) {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, phone: true, companyName: true, contactNumber: true },
  });

  const currentEmail = dbUser?.email || tokenEmail;
  if (!currentEmail) return null;

  // 1. Try matching by current email or token email
  let customer = await prisma.customer.findFirst({
    where: {
      OR: [
        { email: currentEmail },
        ...(tokenEmail && tokenEmail !== currentEmail ? [{ email: tokenEmail }] : []),
      ],
    },
  });

  // 2. If not found by email, match by user's exact name
  if (!customer && dbUser?.name) {
    customer = await prisma.customer.findFirst({
      where: { name: dbUser.name },
    });
    // Auto-reconcile email in Customer table
    if (customer) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          email: currentEmail,
          phone: dbUser.phone || dbUser.contactNumber || customer.phone,
          organization: dbUser.companyName || customer.organization,
        },
      });
    }
  }

  // 3. If still no customer record, auto-create one for this user
  if (!customer && dbUser) {
    try {
      customer = await prisma.customer.create({
        data: {
          name: dbUser.name,
          email: currentEmail,
          phone: dbUser.phone || dbUser.contactNumber || null,
          organization: dbUser.companyName || null,
        },
      });
    } catch {
      // If concurrent insert occurred, re-query
      customer = await prisma.customer.findFirst({
        where: { email: currentEmail },
      });
    }
  }

  return customer;
}
