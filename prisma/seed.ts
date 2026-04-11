import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────

/** A group of physical units sharing the same seater count within one product.
 *
 *  A single product can have multiple groups — e.g. a Dedicated Cabin product
 *  can mix 4-seater and 6-seater cabins on the same floor plan.
 *
 *  Examples
 *  --------
 *  { prefix: "Desk",  style: "numeric", seaters: 1, count: 20 }
 *    → "Desk #1 (1 Seater)" … "Desk #20 (1 Seater)"
 *
 *  { prefix: "Cabin", style: "alpha",   seaters: 4, count: 3  }
 *    → "Cabin A (4 Seater)" … "Cabin C (4 Seater)"
 */
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
  pricing:    Record<string, number>;  // DurationType.name → price
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

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

/**
 * Generate ProductUnit rows for one UnitGroup.
 *
 * The counter offset lets multiple groups inside one product continue
 * the same alpha / numeric sequence rather than restarting from A / 1.
 *
 * @param group   UnitGroup definition
 * @param offset  How many units have already been generated in this product
 * @returns       Array of unit name strings
 */
function generateUnitNames(group: UnitGroup, offset = 0): string[] {
  const seaterLabel = `${group.seaters} Seater`;
  return Array.from({ length: group.count }, (_, i) => {
    const idx    = offset + i;
    const suffix =
      group.style === "alpha"
        ? String.fromCharCode(65 + idx)   // A, B, C …
        : `#${idx + 1}`;                   // #1, #2, #3 …
    return `${group.prefix} ${suffix} (${seaterLabel})`;
  });
}

/**
 * Derive max capacity for the Product record from its unit groups.
 * Uses the largest seater count across all groups in that product.
 */
function maxSeaters(groups: UnitGroup[]): number {
  return Math.max(...groups.map((g) => g.seaters));
}

/** Sum of all unit counts across all groups in a product. */
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
      data: names.map((name) => ({ productId, name })),
    });
    offset += group.count;
  }
  return offset; // total units created
}

// ─────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding SSPACIA database...\n");

  // ─────────────────────────────────────────────────────────
  // 1. DYNAMIC CONFIG TABLES
  // ─────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────
  // 2. PERMISSIONS
  // ─────────────────────────────────────────────────────────

  const modules = [
    { mod: "dashboard",   actions: ["view"] },
    { mod: "admin_panel", actions: ["view"] },
    { mod: "users",       actions: ["view", "create", "update", "delete"] },
    { mod: "roles",       actions: ["view", "create", "update", "delete"] },
    { mod: "locations",   actions: ["view", "create", "update", "delete"] },
    { mod: "products",    actions: ["view", "create", "update", "delete"] },
    { mod: "bookings",    actions: ["view", "create", "update", "delete", "export"] },
    { mod: "customers",   actions: ["view", "create", "update", "delete"] },
    { mod: "reports",     actions: ["view", "export"] },
    { mod: "tickets",     actions: ["view", "create", "update", "delete", "assign"] },
    { mod: "documents",   actions: ["view", "create", "update", "delete", "approve", "reject"] },
    { mod: "clm",         actions: ["view", "create", "update", "delete", "approve", "reject", "sign"] },
    { mod: "settings",    actions: ["view", "update"] },
  ];  

  const permissionRecords: { id: number; name: string }[] = [];
  for (const { mod, actions } of modules) {
    for (const action of actions) {
      const name = `${mod}.${action}`;
      const p = await prisma.permission.upsert({
        where: { name },
        update: {
          module:      mod,
          action,
          displayName: `${action.charAt(0).toUpperCase() + action.slice(1)} ${mod.replace("_", " ")}`,
        },
        create: {
          module:      mod,
          action,
          name,
          displayName: `${action.charAt(0).toUpperCase() + action.slice(1)} ${mod.replace("_", " ")}`,
        },
      });
      permissionRecords.push(p);
    }
  }
  console.log(`✅ ${permissionRecords.length} Permissions`);

  // ─────────────────────────────────────────────────────────
  // 3. ROLES
  // ─────────────────────────────────────────────────────────

  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: { displayName: "Admin", description: "Full system access", isSystem: true },
    create: { name: "ADMIN", displayName: "Admin", description: "Full system access", isSystem: true },
  });
  const managerRole = await prisma.role.upsert({
    where: { name: "MANAGER" },
    update: { displayName: "Manager", description: "Location management and reports" },
    create: { name: "MANAGER", displayName: "Manager", description: "Location management and reports" },
  });
  const cmRole = await prisma.role.upsert({
    where: { name: "COMMUNITY_MANAGER" },
    update: { displayName: "Community Manager", description: "Day-to-day operations at assigned locations" },
    create: { name: "COMMUNITY_MANAGER", displayName: "Community Manager", description: "Day-to-day operations at assigned locations" },
  });
  const userRole = await prisma.role.upsert({
    where: { name: "USER" },
    update: { displayName: "User", description: "External customer/member" },
    create: { name: "USER", displayName: "User", description: "External customer/member" },
  });

  for (const p of permissionRecords) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: p.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: p.id },
    });
  }

  const managerPerms = permissionRecords.filter(
    (p) => !p.name.startsWith("settings.") && !["users.delete", "roles.delete"].includes(p.name)
  );
  for (const p of managerPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: managerRole.id, permissionId: p.id } },
      update: {},
      create: { roleId: managerRole.id, permissionId: p.id },
    });
  }

  const cmPerms = permissionRecords.filter((p) =>
    [
      "dashboard.view",
      "locations.view",
      "products.view",
      "bookings.view", "bookings.create", "bookings.update",
      "customers.view", "customers.create", "customers.update",
      "tickets.view",   "tickets.create",  "tickets.update",
      "documents.view", "documents.create", "documents.update", "documents.approve", "documents.reject",
    ].includes(p.name)
  );
  for (const p of cmPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: cmRole.id, permissionId: p.id } },
      update: {},
      create: { roleId: cmRole.id, permissionId: p.id },
    });
  }

  const userPerms = permissionRecords.filter((p) =>
    ["dashboard.view", "locations.view", "products.view", "tickets.create"].includes(p.name)
  );
  for (const p of userPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: userRole.id, permissionId: p.id } },
      update: {},
      create: { roleId: userRole.id, permissionId: p.id },
    });
  }
  console.log("✅ 4 Roles with permissions mapped");

  const adminExists = await prisma.user.findUnique({ where: { email: "admin@sspacia.com" } });
  if (!adminExists) {
    const hashedPw = await bcrypt.hash("admin@123", 12);
    await prisma.user.create({
      data: { name: "Super Admin", email: "admin@sspacia.com", password: hashedPw, roleId: adminRole.id },
    });
    console.log("✅ Admin user (admin@sspacia.com / admin@123)");
  } else {
    console.log("⏭️ Admin user already exists, skipping");
  }

  let amenities = await prisma.amenity.findMany();
  if (amenities.length === 0) {
    amenities = await Promise.all(
      [
        { name: "Premium Locations", slug: "premium-locations", icon: "MapPin",  sortOrder: 1 },
        { name: "24/7 Access",       slug: "24-7-access",       icon: "Clock",   sortOrder: 2 },
        { name: "Homely Staff",      slug: "homely-staff",      icon: "Users",   sortOrder: 3 },
        { name: "Gourmet Brews",     slug: "gourmet-brews",     icon: "Coffee",  sortOrder: 4 },
        { name: "Cozy Space",        slug: "cozy-space",        icon: "Sofa",    sortOrder: 5 },
        { name: "Ultra-Fast WiFi",   slug: "ultra-fast-wifi",   icon: "Wifi",    sortOrder: 6 },
        { name: "Advanced Tech",     slug: "advanced-tech",     icon: "Monitor", sortOrder: 7 },
      ].map((a) => prisma.amenity.create({ data: a }))
    );
    console.log(`✅ ${amenities.length} Amenities`);
  } else {
    console.log("⏭️ Amenities already exist, skipping");
  }

  let ahmedabad = await prisma.city.findUnique({ where: { slug: "ahmedabad" } });
  if (!ahmedabad) {
    ahmedabad = await prisma.city.create({
      data: { name: "Ahmedabad", slug: "ahmedabad", state: "Gujarat" },
    });
  }

  let agarwal = await prisma.location.findUnique({ where: { slug: "agarwal-complex-cg-road" } });
  if (!agarwal) {
    agarwal = await prisma.location.create({
      data: { cityId: ahmedabad.id, name: "Agarwal Complex", slug: "agarwal-complex-cg-road", area: "CG Road" },
    });
  }

  let mercado = await prisma.location.findUnique({ where: { slug: "mercado-cg-road" } });
  if (!mercado) {
    mercado = await prisma.location.create({
      data: { cityId: ahmedabad.id, name: "Mercado",         slug: "mercado-cg-road",          area: "CG Road" },
    });
  }

  let premier = await prisma.location.findUnique({ where: { slug: "premier-house-sg-highway" } });
  if (!premier) {
    premier = await prisma.location.create({
      data: { cityId: ahmedabad.id, name: "Premier House",   slug: "premier-house-sg-highway", area: "SG Highway" },
    });
  }
  console.log("✅ City and Locations checked/created");

  // ─────────────────────────────────────────────────────────
  // 7. WORKSPACE PRODUCTS + PRICING + UNITS (with seater labels)
  // ─────────────────────────────────────────────────────────
  //
  // Unit naming rules
  // ─────────────────
  //  Desks  → numeric  → "Desk #1 (1 Seater)", "Desk #2 (1 Seater)" …
  //  Cabins → alpha    → "Cabin A (4 Seater)", "Cabin B (6 Seater)" …
  //
  // A product can declare multiple unitGroups so the same product can mix
  // seater sizes (e.g. Dedicated Cabin with 4-seater and 6-seater units).
  //
  // Product.capacity is set to the largest seater count in the product.
  // Product.quantity  is set to the total unit count across all groups.
  // ─────────────────────────────────────────────────────────

  const typeMap = Object.fromEntries(productTypes.map((t) => [t.name, t.id]));
  const durMap  = Object.fromEntries(durationTypes.map((d) => [d.name, d.id]));

  const workspaceData: LocationWorkspaces[] = [
    // ── AGARWAL COMPLEX ──────────────────────────────────────
    {
      locationId: agarwal.id,
      products: [
        {
          typeName: "FLEX_DESK", slug: "flex-desk",
          meetingHrs: null, sdr: 1, adv: 1,
          pricing: { PER_DAY: 500, PER_WEEK: 2500, PER_MONTH: 6000 },
          unitGroups: [
            // All flex desks are single-seater hot desks
            { prefix: "Desk", style: "numeric", seaters: 1, count: 20 },
          ],
        },
        {
          typeName: "FIXED_DESK", slug: "fixed-desk",
          meetingHrs: 2, sdr: 2, adv: 1,
          pricing: { PER_MONTH: 7000 },
          unitGroups: [
            { prefix: "Desk", style: "numeric", seaters: 1, count: 10 },
          ],
        },
        {
          typeName: "DEDICATED_CABIN", slug: "dedicated-cabin",
          meetingHrs: 2, sdr: 3, adv: 1,
          pricing: { PER_MONTH: 10000, PER_3_MONTHS: 9500, PER_6_MONTHS: 9000, PER_YEAR: 8000 },
          unitGroups: [
            // Mix of 3-seater and 4-seater dedicated cabins (alpha sequence continues)
            { prefix: "Cabin", style: "alpha", seaters: 3, count: 3 },  // Cabin A–C (3 Seater)
            { prefix: "Cabin", style: "alpha", seaters: 4, count: 2 },  // Cabin D–E (4 Seater)
          ],
        },
        {
          typeName: "PRIVATE_CABIN", slug: "private-cabin",
          meetingHrs: 5, sdr: 3, adv: 1,
          pricing: { PER_MONTH: 14000, PER_3_MONTHS: 13500, PER_6_MONTHS: 13000, PER_YEAR: 12000 },
          unitGroups: [
            { prefix: "Cabin", style: "alpha", seaters: 6, count: 2 },  // Cabin A–B (6 Seater)
            { prefix: "Cabin", style: "alpha", seaters: 8, count: 1 },  // Cabin C   (8 Seater)
          ],
        },
        {
          typeName: "EXECUTIVE_CABIN", slug: "executive-cabin",
          meetingHrs: 5, sdr: 3, adv: 1,
          pricing: { PER_MONTH: 30000, PER_3_MONTHS: 28500, PER_6_MONTHS: 27000, PER_YEAR: 24000 },
          unitGroups: [
            { prefix: "Cabin", style: "alpha", seaters: 10, count: 2 },  // Cabin A–B (10 Seater)
          ],
        },
      ],
    },

    // ── MERCADO ───────────────────────────────────────────────
    {
      locationId: mercado.id,
      products: [
        {
          typeName: "FLEX_DESK", slug: "flex-desk",
          meetingHrs: null, sdr: 1, adv: 1,
          pricing: { PER_DAY: 500, PER_WEEK: 2500, PER_MONTH: 6000 },
          unitGroups: [
            { prefix: "Desk", style: "numeric", seaters: 1, count: 25 },
          ],
        },
        {
          typeName: "FIXED_DESK", slug: "fixed-desk",
          meetingHrs: 2, sdr: 2, adv: 1,
          pricing: { PER_MONTH: 8000 },
          unitGroups: [
            { prefix: "Desk", style: "numeric", seaters: 1, count: 12 },
          ],
        },
        {
          typeName: "DEDICATED_CABIN", slug: "dedicated-cabin",
          meetingHrs: 2, sdr: 2, adv: 1,
          pricing: { PER_MONTH: 11000, PER_3_MONTHS: 10500, PER_6_MONTHS: 10000, PER_YEAR: 9000 },
          unitGroups: [
            { prefix: "Cabin", style: "alpha", seaters: 3, count: 2 },  // Cabin A–B (3 Seater)
            { prefix: "Cabin", style: "alpha", seaters: 4, count: 2 },  // Cabin C–D (4 Seater)
            { prefix: "Cabin", style: "alpha", seaters: 6, count: 2 },  // Cabin E–F (6 Seater)
          ],
        },
        {
          typeName: "PRIVATE_CABIN", slug: "private-cabin",
          meetingHrs: 5, sdr: 3, adv: 1,
          pricing: { PER_MONTH: 17000, PER_3_MONTHS: 16500, PER_6_MONTHS: 16000, PER_YEAR: 15000 },
          unitGroups: [
            { prefix: "Cabin", style: "alpha", seaters: 6, count: 2 },  // Cabin A–B (6 Seater)
            { prefix: "Cabin", style: "alpha", seaters: 8, count: 2 },  // Cabin C–D (8 Seater)
          ],
        },
        {
          typeName: "EXECUTIVE_CABIN", slug: "executive-cabin",
          meetingHrs: 5, sdr: 3, adv: 1,
          pricing: { PER_MONTH: 33000, PER_3_MONTHS: 31500, PER_6_MONTHS: 30000, PER_YEAR: 27000 },
          unitGroups: [
            { prefix: "Cabin", style: "alpha", seaters: 10, count: 1 },  // Cabin A (10 Seater)
            { prefix: "Cabin", style: "alpha", seaters: 12, count: 1 },  // Cabin B (12 Seater)
          ],
        },
      ],
    },

    // ── PREMIER HOUSE ────────────────────────────────────────
    {
      locationId: premier.id,
      products: [
        {
          typeName: "FLEX_DESK", slug: "flex-desk",
          meetingHrs: null, sdr: 1, adv: 1,
          pricing: { PER_DAY: 500, PER_WEEK: 2500, PER_MONTH: 6000 },
          unitGroups: [
            { prefix: "Desk", style: "numeric", seaters: 1, count: 20 },
          ],
        },
        {
          typeName: "FIXED_DESK", slug: "fixed-desk",
          meetingHrs: 2, sdr: 2, adv: 1,
          pricing: { PER_MONTH: 8000 },
          unitGroups: [
            { prefix: "Desk", style: "numeric", seaters: 1, count: 10 },
          ],
        },
        {
          typeName: "DEDICATED_CABIN", slug: "dedicated-cabin",
          meetingHrs: 2, sdr: 3, adv: 1,
          pricing: { PER_MONTH: 11000, PER_3_MONTHS: 10500, PER_6_MONTHS: 10000, PER_YEAR: 9000 },
          unitGroups: [
            { prefix: "Cabin", style: "alpha", seaters: 3, count: 3 },  // Cabin A–C (3 Seater)
            { prefix: "Cabin", style: "alpha", seaters: 4, count: 2 },  // Cabin D–E (4 Seater)
          ],
        },
        {
          typeName: "PRIVATE_CABIN", slug: "private-cabin",
          meetingHrs: 5, sdr: 3, adv: 1,
          pricing: { PER_MONTH: 17000, PER_3_MONTHS: 16500, PER_6_MONTHS: 16000, PER_YEAR: 15000 },
          unitGroups: [
            { prefix: "Cabin", style: "alpha", seaters: 6, count: 2 },  // Cabin A–B (6 Seater)
            { prefix: "Cabin", style: "alpha", seaters: 8, count: 1 },  // Cabin C   (8 Seater)
          ],
        },
        {
          typeName: "EXECUTIVE_CABIN", slug: "executive-cabin",
          meetingHrs: 5, sdr: 3, adv: 1,
          pricing: { PER_MONTH: 33000, PER_3_MONTHS: 31500, PER_6_MONTHS: 30000, PER_YEAR: 27000 },
          unitGroups: [
            { prefix: "Cabin", style: "alpha", seaters: 10, count: 2 },  // Cabin A–B (10 Seater)
          ],
        },
      ],
    },
  ];

  let totalUnitCount = 0;
  const existingProductCount = await prisma.product.count({ where: { categoryId: catWorkspace.id } });

  if (existingProductCount === 0) {
    for (const loc of workspaceData) {
      for (const spec of loc.products) {
        const qty      = totalUnits(spec.unitGroups);
        const capacity = maxSeaters(spec.unitGroups);

        const product = await prisma.product.create({
          data: {
            locationId:                loc.locationId,
            typeId:                    typeMap[spec.typeName],
            categoryId:                catWorkspace.id,
            accessTimeId:              access24x7.id,
            name:                      productTypes.find((t) => t.name === spec.typeName)!.displayName,
            slug:                      spec.slug,
            capacity,               // largest seater count in this product
            quantity:                  qty,             // total named units
            complementaryMeetingHours: spec.meetingHrs,
            sdr:                       spec.sdr,
            adv:                       spec.adv,
            securityDepositMonths:     3,
          },
        });

        await prisma.pricingPlan.createMany({
          data: Object.entries(spec.pricing).map(([durName, price]) => ({
            productId:      product.id,
            durationTypeId: durMap[durName],
            price,
          })),
        });

        await prisma.productAmenity.createMany({
          data: amenities.map((a) => ({ productId: product.id, amenityId: a.id })),
        });

        const created = await seedUnitsForProduct(product.id, spec.unitGroups);
        totalUnitCount += created;
      }
    }
    console.log(`✅ 15 Workspace products with pricing, amenities & ${totalUnitCount} named units`);
  } else {
    console.log("⏭️ Workspace products already exist, skipping");
  }
  console.log("   Unit examples:");
  console.log("   • Desk  #1 (1 Seater), Desk #2 (1 Seater) …");
  console.log("   • Cabin  A (3 Seater), Cabin B (3 Seater), Cabin D (4 Seater) …");
  console.log("   • Cabin  A (6 Seater), Cabin C (8 Seater), Cabin A (10 Seater) …");

  // ─────────────────────────────────────────────────────────
  // 8. GUEST SPACE PRODUCTS + PRICING (no units — slot-based)
  // ─────────────────────────────────────────────────────────

  const guestData: LocationGuests[] = [
    {
      locationId: agarwal.id,
      products: [
        { typeName: "MEETING_ROOM", slug: "meeting-room", capacity: 5,  pricing: { PER_HOUR: 400,  PER_4_HOURS: 1000, PER_DAY: 2000  } },
        { typeName: "BOARD_ROOM",   slug: "board-room",   capacity: 11, pricing: { PER_HOUR: 600,  PER_4_HOURS: 2200, PER_DAY: 4500  } },
        { typeName: "EVENT_ROOM",   slug: "event-room",   capacity: 40, pricing: { PER_HOUR: 2000, PER_4_HOURS: 6000, PER_DAY: 10000 } },
      ],
    },
    {
      locationId: mercado.id,
      products: [
        { typeName: "MEETING_ROOM", slug: "meeting-room", capacity: 6,  pricing: { PER_HOUR: 500,  PER_4_HOURS: 1800, PER_DAY: 3500  } },
        { typeName: "BOARD_ROOM",   slug: "board-room",   capacity: 14, pricing: { PER_HOUR: 1000, PER_4_HOURS: 3500, PER_DAY: 6000  } },
        { typeName: "LOUNGE_ROOM",  slug: "lounge-room",  capacity: 8,  pricing: { PER_HOUR: 800,  PER_4_HOURS: 3500, PER_DAY: 5000  } },
      ],
    },
    {
      locationId: premier.id,
      products: [
        { typeName: "MEETING_ROOM", slug: "meeting-room", capacity: 4,  pricing: { PER_HOUR: 500,  PER_4_HOURS: 1800, PER_DAY: 3500  } },
        { typeName: "BOARD_ROOM",   slug: "board-room",   capacity: 12, pricing: { PER_HOUR: 1000, PER_4_HOURS: 3500, PER_DAY: 6000  } },
        { typeName: "EVENT_ROOM",   slug: "event-room",   capacity: 40, pricing: { PER_HOUR: 2000, PER_4_HOURS: 6000, PER_DAY: 10000 } },
      ],
    },
  ];

  const existingGuestProductCount = await prisma.product.count({ where: { categoryId: catGuest.id } });
  if (existingGuestProductCount === 0) {
    for (const loc of guestData) {
      for (const spec of loc.products) {
        const product = await prisma.product.create({
          data: {
            locationId:            loc.locationId,
            typeId:                typeMap[spec.typeName],
            categoryId:            catGuest.id,
            name:                  productTypes.find((t) => t.name === spec.typeName)!.displayName,
            slug:                  spec.slug,
            capacity:              spec.capacity,
            quantity:              1,
            securityDepositMonths: 0,
          },
        });

        await prisma.pricingPlan.createMany({
          data: Object.entries(spec.pricing).map(([durName, price]) => ({
            productId:      product.id,
            durationTypeId: durMap[durName],
            price,
          })),
        });
      }
    }
    console.log("✅ 9 Guest Space products with pricing (slot-based, no units)\n");
  } else {
    console.log("⏭️ Guest Space products already exist, skipping\n");
  }

  // ─────────────────────────────────────────────────────────
  // 9. DEFAULT SETTINGS
  // ─────────────────────────────────────────────────────────

  const settingCount = await prisma.setting.count();
  if (settingCount === 0) {
    await prisma.setting.createMany({
      data: [
        { key: "default_gst_rate",        value: "18",      group: "billing" },
        { key: "booking_number_prefix",   value: "BK",      group: "billing" },
        { key: "payment_number_prefix",   value: "PAY",     group: "billing" },
        { key: "ticket_number_prefix",    value: "TKT",     group: "support" },
        { key: "security_deposit_months", value: "3",       group: "billing" },
        { key: "company_name",            value: "SSPACIA", group: "general" },
        { key: "currency",                value: "INR",     group: "general" },
      ],
    });
    console.log("✅ 7 Default Settings\n");
  } else {
    console.log("⏭️ Settings already exist, skipping\n");
  }
  // ─────────────────────────────────────────────────────────
  // 10. CONTRACT STATUSES (CLM)
  // ─────────────────────────────────────────────────────────

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
    // @ts-ignore - Temporary until prisma generate clears lock issues
    await prisma.contractStatus.upsert({
      where: { name: s.name },
      update: s,
      create: s,
    });
  }
  console.log(`✅ ${contractStatuses.length} Contract Statuses\n`);

  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());