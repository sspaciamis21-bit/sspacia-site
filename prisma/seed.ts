import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

interface UnitGroup {
  prefix:  string;
  style:   "numeric" | "alpha";
  seaters: number;
  count:   number;
}

interface WorkspaceSpec {
  typeName:   string;
  slug:       string;
  meetingHrs: number | null;
  sdr:        number;
  adv:        number;
  pricing:    Record<string, number>;
  unitGroups: UnitGroup[];
}

interface LocationWorkspaces {
  locationId: number;
  products:   WorkspaceSpec[];
}

interface GuestSpec {
  typeName: string;
  slug:     string;
  capacity: number;
  pricing:  Record<string, number>;
}

interface LocationGuests {
  locationId: number;
  products:   GuestSpec[];
}

function generateUnitNames(group: UnitGroup, offset = 0): string[] {
  const seaterLabel = `${group.seaters} Seater`;
  return Array.from({ length: group.count }, (_, i) => {
    const idx    = offset + i;
    const suffix =
      group.style === "alpha"
        ? String.fromCharCode(65 + idx)
        : `#${idx + 1}`;
    return `${group.prefix} ${suffix} (${seaterLabel})`;
  });
}

function maxSeaters(groups: UnitGroup[]): number {
  return Math.max(...groups.map((g) => g.seaters));
}

function totalUnits(groups: UnitGroup[]): number {
  return groups.reduce((acc, g) => acc + g.count, 0);
}

async function seedUnitsForProduct(
  productId: number,
  groups: UnitGroup[]
): Promise<number> {
  let offset = 0;
  for (const group of groups) {
    const names = generateUnitNames(group, offset);
    await prisma.productUnit.createMany({
      data: names.map((name) => ({ 
        productId, 
        name,
        capacity: group.seaters 
      })),
    });
    offset += group.count;
  }
  return offset;
}

async function main() {
  console.log("🌱 Seeding SSPACIA database...\n");

  const productTypesData = [
    { name: "FLEX_DESK",        displayName: "Flexi Desk",        slug: "flex-desk",        sortOrder: 1 },
    { name: "FIXED_DESK",       displayName: "Fixed Desk",        slug: "fixed-desk",       sortOrder: 2 },
    { name: "DEDICATED_CABIN",  displayName: "Dedicated Cabin",   slug: "dedicated-cabin",  sortOrder: 3 },
    { name: "PRIVATE_CABIN",    displayName: "Private Cabin",     slug: "private-cabin",    sortOrder: 4 },
    { name: "EXECUTIVE_CABIN",  displayName: "Executive Cabin",   slug: "executive-cabin",  sortOrder: 5 },
    { name: "MEETING_ROOM",     displayName: "Meeting Room",      slug: "meeting-room",     sortOrder: 6 },
    { name: "BOARD_ROOM",       displayName: "Board Room",        slug: "board-room",       sortOrder: 7 },
    { name: "EVENT_ROOM",       displayName: "Event Room",        slug: "event-room",       sortOrder: 8 },
    { name: "LOUNGE_ROOM",      displayName: "Lounge Room",       slug: "lounge-room",      sortOrder: 9 },
  ];

  const productTypes = [];
  for (const t of productTypesData) {
    const pt = await prisma.productType.upsert({
      where: { name: t.name },
      update: t,
      create: t,
    });
    productTypes.push(pt);
  }
  console.log(`✅ ${productTypes.length} Product Types`);

  const durationTypesData = [
    { name: "PER_HOUR",      displayName: "Per Hour",      slug: "per-hour",      durationHours: 1,   sortOrder: 1 },
    { name: "PER_4_HOURS",   displayName: "Per 4 Hours",   slug: "per-4-hours",   durationHours: 4,   sortOrder: 2 },
    { name: "PER_DAY",       displayName: "Per Day",       slug: "per-day",       durationDays:  1,   sortOrder: 3 },
    { name: "PER_WEEK",      displayName: "Per Week",      slug: "per-week",      durationDays:  7,   sortOrder: 4 },
    { name: "PER_MONTH",     displayName: "Per Month",     slug: "per-month",     durationDays:  30,  sortOrder: 5 },
    { name: "PER_3_MONTHS",  displayName: "Per 3 Months",  slug: "per-3-months",  durationDays:  90,  sortOrder: 6 },
    { name: "PER_6_MONTHS",  displayName: "Per 6 Months",  slug: "per-6-months",  durationDays:  180, sortOrder: 7 },
    { name: "PER_YEAR",      displayName: "Per Year",      slug: "per-year",      durationDays:  365, sortOrder: 8 },
  ];

  const durationTypes = [];
  for (const d of durationTypesData) {
    const dt = await prisma.durationType.upsert({
      where: { name: d.name },
      update: d,
      create: d,
    });
    durationTypes.push(dt);
  }
  console.log(`✅ ${durationTypes.length} Duration Types`);

  const catWorkspace = await prisma.spaceCategory.upsert({
    where: { name: "WORKSPACE" },
    update: { displayName: "Workspace", slug: "workspace", sortOrder: 1 },
    create: { name: "WORKSPACE", displayName: "Workspace", slug: "workspace", sortOrder: 1 },
  });
  const catGuest = await prisma.spaceCategory.upsert({
    where: { name: "GUEST_SPACE" },
    update: { displayName: "Guest Space", slug: "guest-space", sortOrder: 2 },
    create: { name: "GUEST_SPACE", displayName: "Guest Space", slug: "guest-space", sortOrder: 2 },
  });
  console.log("✅ 2 Space Categories");

  const access24x7 = await prisma.accessTimeOption.upsert({
    where: { name: "24X7" },
    update: { displayName: "24×7 Access" },
    create: { name: "24X7", displayName: "24×7 Access" },
  });
  const accessBusiness = await prisma.accessTimeOption.upsert({
    where: { name: "BUSINESS_HOURS" },
    update: { displayName: "Business Hours (9 AM – 7 PM)", startTime: "09:00", endTime: "19:00" },
    create: { name: "BUSINESS_HOURS", displayName: "Business Hours (9 AM – 7 PM)", startTime: "09:00", endTime: "19:00" },
  });
  void accessBusiness;
  console.log("✅ 2 Access Time Options");

  const ticketStatuses = [
    { name: "OPEN",        displayName: "Open",        color: "#3B82F6", sortOrder: 1 },
    { name: "IN_PROGRESS", displayName: "In Progress", color: "#F59E0B", sortOrder: 2 },
    { name: "RESOLVED",    displayName: "Resolved",    color: "#10B981", isFinal: true, sortOrder: 3 },
    { name: "CLOSED",      displayName: "Closed",      color: "#6B7280", isFinal: true, sortOrder: 4 },
  ];
  for (const s of ticketStatuses) {
    await prisma.ticketStatus.upsert({
      where: { name: s.name },
      update: s,
      create: s,
    });
  }
  console.log("✅ 4 Ticket Statuses");

  const bookingStatuses = [
    { name: "PENDING",   displayName: "Pending",   color: "#F59E0B", sortOrder: 1 },
    { name: "CONFIRMED", displayName: "Confirmed", color: "#3B82F6", sortOrder: 2 },
    { name: "ACTIVE",    displayName: "Active",    color: "#10B981", sortOrder: 3 },
    { name: "COMPLETED", displayName: "Completed", color: "#6B7280", isFinal: true, sortOrder: 4 },
    { name: "CANCELLED", displayName: "Cancelled", color: "#EF4444", isFinal: true, sortOrder: 5 },
  ];
  for (const s of bookingStatuses) {
    await prisma.bookingStatus.upsert({
      where: { name: s.name },
      update: s,
      create: s,
    });
  }
  console.log("✅ 5 Booking Statuses");

  const paymentStatuses = [
    { name: "PENDING",  displayName: "Pending",  color: "#F59E0B", sortOrder: 1 },
    { name: "PARTIAL",  displayName: "Partial",  color: "#8B5CF6", sortOrder: 2 },
    { name: "PAID",     displayName: "Paid",     color: "#10B981", isFinal: true, sortOrder: 3 },
    { name: "REFUNDED", displayName: "Refunded", color: "#3B82F6", isFinal: true, sortOrder: 4 },
    { name: "FAILED",   displayName: "Failed",   color: "#EF4444", isFinal: true, sortOrder: 5 },
  ];
  for (const s of paymentStatuses) {
    await prisma.paymentStatus.upsert({
      where: { name: s.name },
      update: s,
      create: s,
    });
  }
  console.log("✅ 5 Payment Statuses");

  const documentCategories = [
    { name: "KYC",       displayName: "KYC / Identity Proof", slug: "kyc",       description: "Aadhaar, PAN, Passport, Driving Licence", sortOrder: 1 },
    { name: "AGREEMENT", displayName: "Agreement / Contract", slug: "agreement",  description: "Signed workspace agreements and contracts",  sortOrder: 2 },
    { name: "INVOICE",   displayName: "Invoice / Receipt",    slug: "invoice",    description: "Payment invoices and receipts",              sortOrder: 3 },
    { name: "GENERAL",   displayName: "General",              slug: "general",    description: "Miscellaneous documents",                    sortOrder: 4 },
  ];
  for (const c of documentCategories) {
    await prisma.documentCategory.upsert({
      where: { name: c.name },
      update: c,
      create: c,
    });
  }
  console.log("✅ 4 Document Categories");

  const documentStatuses = [
    { name: "PENDING",  displayName: "Pending",  color: "#F59E0B", isFinal: false, sortOrder: 1 },
    { name: "APPROVED", displayName: "Approved", color: "#10B981", isFinal: true,  sortOrder: 2 },
    { name: "REJECTED", displayName: "Rejected", color: "#EF4444", isFinal: false, sortOrder: 3 },
    { name: "EXPIRED",  displayName: "Expired",  color: "#6B7280", isFinal: true,  sortOrder: 4 },
  ];
  for (const s of documentStatuses) {
    await prisma.documentStatus.upsert({
      where: { name: s.name },
      update: s,
      create: s,
    });
  }
  console.log("✅ 4 Document Statuses");

  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: { displayName: "Admin", description: "Full system access", isSystem: true },
    create: { name: "ADMIN", displayName: "Admin", description: "Full system access", isSystem: true },
  });
  await prisma.role.upsert({
    where: { name: "MANAGER" },
    update: { displayName: "Manager", description: "Location management and reports" },
    create: { name: "MANAGER", displayName: "Manager", description: "Location management and reports" },
  });
  await prisma.role.upsert({
    where: { name: "COMMUNITY_MANAGER" },
    update: { displayName: "Community Manager", description: "Day-to-day operations at assigned locations" },
    create: { name: "COMMUNITY_MANAGER", displayName: "Community Manager", description: "Day-to-day operations at assigned locations" },
  });
  await prisma.role.upsert({
    where: { name: "USER" },
    update: { displayName: "User", description: "External customer/member" },
    create: { name: "USER", displayName: "User", description: "External customer/member" },
  });

  const adminExists = await prisma.user.findUnique({ where: { email: "admin@sspacia.com" } });
  if (!adminExists) {
    const initialPassword = process.env.INITIAL_ADMIN_PASSWORD || "admin@123";
    const hashedPw = await bcrypt.hash(initialPassword, 12);
    await prisma.user.create({
      data: { name: "Super Admin", email: "admin@sspacia.com", password: hashedPw, roleId: adminRole.id },
    });
    console.log(`✅ Admin user created.`);
  }

  const contractStatuses = [
    { name: "REQUESTED",    displayName: "Requested",         color: "#6B7280", isFinal: false, sortOrder: 1 },
    { name: "DRAFT",        displayName: "Draft",             color: "#F59E0B", isFinal: false, sortOrder: 2 },
    { name: "SENT",         displayName: "Sent for Review",   color: "#3B82F6", isFinal: false, sortOrder: 3 },
    { name: "NEGOTIATION",  displayName: "In Negotiation",    color: "#F97316", isFinal: false, sortOrder: 4 },
    { name: "PENDING_SIGN", displayName: "Pending Signature", color: "#8B5CF6", isFinal: false, sortOrder: 5 },
    { name: "SIGNED",       displayName: "Signed",            color: "#10B981", isFinal: true,  sortOrder: 6 },
    { name: "EXPIRED",      displayName: "Expired",           color: "#EF4444", isFinal: true,  sortOrder: 7 },
    { name: "TERMINATED",   displayName: "Terminated",        color: "#DC2626", isFinal: true,  sortOrder: 8 },
  ];

  for (const s of contractStatuses) {
    await prisma.contractStatus.upsert({
      where: { name: s.name },
      update: s,
      create: s,
    });
  }
  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
