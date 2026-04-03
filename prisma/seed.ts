import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding SSPACIA database...\n");

  // ─────────────────────────────────────────────────────────
  // 1. DYNAMIC CONFIG TABLES (replace old enums)
  // ─────────────────────────────────────────────────────────

  // Product Types
  const productTypes = await Promise.all(
    [
      { name: "FLEX_DESK", displayName: "Flexi Desk", slug: "flex-desk", sortOrder: 1 },
      { name: "FIXED_DESK", displayName: "Fixed Desk", slug: "fixed-desk", sortOrder: 2 },
      { name: "DEDICATED_CABIN", displayName: "Dedicated Cabin", slug: "dedicated-cabin", sortOrder: 3 },
      { name: "PRIVATE_CABIN", displayName: "Private Cabin", slug: "private-cabin", sortOrder: 4 },
      { name: "EXECUTIVE_CABIN", displayName: "Executive Cabin", slug: "executive-cabin", sortOrder: 5 },
      { name: "MEETING_ROOM", displayName: "Meeting Room", slug: "meeting-room", sortOrder: 6 },
      { name: "BOARD_ROOM", displayName: "Board Room", slug: "board-room", sortOrder: 7 },
      { name: "EVENT_ROOM", displayName: "Event Room", slug: "event-room", sortOrder: 8 },
      { name: "LOUNGE_ROOM", displayName: "Lounge Room", slug: "lounge-room", sortOrder: 9 },
    ].map((t) => prisma.productType.create({ data: t }))
  );
  console.log(`✅ ${productTypes.length} Product Types`);

  // Duration Types
  const durationTypes = await Promise.all(
    [
      { name: "PER_HOUR", displayName: "Per Hour", slug: "per-hour", durationHours: 1, sortOrder: 1 },
      { name: "PER_4_HOURS", displayName: "Per 4 Hours", slug: "per-4-hours", durationHours: 4, sortOrder: 2 },
      { name: "PER_DAY", displayName: "Per Day", slug: "per-day", durationDays: 1, sortOrder: 3 },
      { name: "PER_WEEK", displayName: "Per Week", slug: "per-week", durationDays: 7, sortOrder: 4 },
      { name: "PER_MONTH", displayName: "Per Month", slug: "per-month", durationDays: 30, sortOrder: 5 },
      { name: "PER_3_MONTHS", displayName: "Per 3 Months", slug: "per-3-months", durationDays: 90, sortOrder: 6 },
      { name: "PER_6_MONTHS", displayName: "Per 6 Months", slug: "per-6-months", durationDays: 180, sortOrder: 7 },
      { name: "PER_YEAR", displayName: "Per Year", slug: "per-year", durationDays: 365, sortOrder: 8 },
    ].map((d) => prisma.durationType.create({ data: d }))
  );
  console.log(`✅ ${durationTypes.length} Duration Types`);

  // Space Categories
  const [catWorkspace, catGuest] = await Promise.all([
    prisma.spaceCategory.create({ data: { name: "WORKSPACE", displayName: "Workspace", slug: "workspace", sortOrder: 1 } }),
    prisma.spaceCategory.create({ data: { name: "GUEST_SPACE", displayName: "Guest Space", slug: "guest-space", sortOrder: 2 } }),
  ]);
  console.log("✅ 2 Space Categories");

  // Access Time Options
  const [access24x7, accessBusiness] = await Promise.all([
    prisma.accessTimeOption.create({ data: { name: "24X7", displayName: "24×7 Access" } }),
    prisma.accessTimeOption.create({ data: { name: "BUSINESS_HOURS", displayName: "Business Hours (9 AM – 7 PM)", startTime: "09:00", endTime: "19:00" } }),
  ]);
  console.log("✅ 2 Access Time Options");

  // Ticket Statuses
  await Promise.all(
    [
      { name: "OPEN", displayName: "Open", color: "#3B82F6", sortOrder: 1 },
      { name: "IN_PROGRESS", displayName: "In Progress", color: "#F59E0B", sortOrder: 2 },
      { name: "RESOLVED", displayName: "Resolved", color: "#10B981", isFinal: true, sortOrder: 3 },
      { name: "CLOSED", displayName: "Closed", color: "#6B7280", isFinal: true, sortOrder: 4 },
    ].map((s) => prisma.ticketStatus.create({ data: s }))
  );
  console.log("✅ 4 Ticket Statuses");

  // Booking Statuses
  await Promise.all(
    [
      { name: "PENDING", displayName: "Pending", color: "#F59E0B", sortOrder: 1 },
      { name: "CONFIRMED", displayName: "Confirmed", color: "#3B82F6", sortOrder: 2 },
      { name: "ACTIVE", displayName: "Active", color: "#10B981", sortOrder: 3 },
      { name: "COMPLETED", displayName: "Completed", color: "#6B7280", isFinal: true, sortOrder: 4 },
      { name: "CANCELLED", displayName: "Cancelled", color: "#EF4444", isFinal: true, sortOrder: 5 },
    ].map((s) => prisma.bookingStatus.create({ data: s }))
  );
  console.log("✅ 5 Booking Statuses");

  // Payment Statuses
  await Promise.all(
    [
      { name: "PENDING", displayName: "Pending", color: "#F59E0B", sortOrder: 1 },
      { name: "PARTIAL", displayName: "Partial", color: "#8B5CF6", sortOrder: 2 },
      { name: "PAID", displayName: "Paid", color: "#10B981", isFinal: true, sortOrder: 3 },
      { name: "REFUNDED", displayName: "Refunded", color: "#3B82F6", isFinal: true, sortOrder: 4 },
      { name: "FAILED", displayName: "Failed", color: "#EF4444", isFinal: true, sortOrder: 5 },
    ].map((s) => prisma.paymentStatus.create({ data: s }))
  );
  console.log("✅ 5 Payment Statuses");

  // ─────────────────────────────────────────────────────────
  // 2. PERMISSIONS (module.action pattern)
  // ─────────────────────────────────────────────────────────

  const modules = [
    { mod: "dashboard", actions: ["view"] },
    { mod: "admin_panel", actions: ["view"] },
    { mod: "users", actions: ["view", "create", "update", "delete"] },
    { mod: "roles", actions: ["view", "create", "update", "delete"] },
    { mod: "locations", actions: ["view", "create", "update", "delete"] },
    { mod: "products", actions: ["view", "create", "update", "delete"] },
    { mod: "bookings", actions: ["view", "create", "update", "delete", "export"] },
    { mod: "customers", actions: ["view", "create", "update", "delete"] },
    { mod: "reports", actions: ["view", "export"] },
    { mod: "tickets", actions: ["view", "create", "update", "delete", "assign"] },
    { mod: "settings", actions: ["view", "update"] },
  ];

  const permissionRecords: { id: number; name: string }[] = [];
  for (const { mod, actions } of modules) {
    for (const action of actions) {
      const p = await prisma.permission.create({
        data: {
          module: mod,
          action,
          name: `${mod}.${action}`,
          displayName: `${action.charAt(0).toUpperCase() + action.slice(1)} ${mod.replace("_", " ")}`,
        },
      });
      permissionRecords.push(p);
    }
  }
  console.log(`✅ ${permissionRecords.length} Permissions`);

  // ─────────────────────────────────────────────────────────
  // 3. ROLES + ROLE-PERMISSION MAPPING
  // ─────────────────────────────────────────────────────────

  const adminRole = await prisma.role.create({
    data: { name: "ADMIN", displayName: "Admin", description: "Full system access", isSystem: true },
  });
  const managerRole = await prisma.role.create({
    data: { name: "MANAGER", displayName: "Manager", description: "Location management and reports" },
  });
  const cmRole = await prisma.role.create({
    data: { name: "COMMUNITY_MANAGER", displayName: "Community Manager", description: "Day-to-day operations at assigned locations" },
  });
  const userRole = await prisma.role.create({
    data: { name: "USER", displayName: "User", description: "External customer/member" },
  });

  // Admin gets ALL permissions
  await prisma.rolePermission.createMany({
    data: permissionRecords.map((p) => ({ roleId: adminRole.id, permissionId: p.id })),
  });

  // Manager gets everything except settings and user/role deletion
  const managerPerms = permissionRecords.filter(
    (p) => !p.name.startsWith("settings.") && !["users.delete", "roles.delete"].includes(p.name)
  );
  await prisma.rolePermission.createMany({
    data: managerPerms.map((p) => ({ roleId: managerRole.id, permissionId: p.id })),
  });

  // Community Manager gets view + operational permissions
  const cmPerms = permissionRecords.filter((p) =>
    [
      "dashboard.view",
      "locations.view",
      "products.view",
      "bookings.view", "bookings.create", "bookings.update",
      "customers.view", "customers.create", "customers.update",
      "tickets.view", "tickets.create", "tickets.update",
    ].includes(p.name)
  );
  await prisma.rolePermission.createMany({
    data: cmPerms.map((p) => ({ roleId: cmRole.id, permissionId: p.id })),
  });

  // User gets basic view permissions
  const userPerms = permissionRecords.filter((p) =>
    ["dashboard.view", "locations.view", "products.view", "tickets.create"].includes(p.name)
  );
  await prisma.rolePermission.createMany({
    data: userPerms.map((p) => ({ roleId: userRole.id, permissionId: p.id })),
  });
  console.log("✅ 4 Roles with permissions mapped");

  // ─────────────────────────────────────────────────────────
  // 4. SEED ADMIN USER
  // ─────────────────────────────────────────────────────────

  const hashedPw = await bcrypt.hash("admin@123", 12);
  await prisma.user.create({
    data: { name: "Super Admin", email: "admin@sspacia.com", password: hashedPw, roleId: adminRole.id },
  });
  console.log("✅ Admin user (admin@sspacia.com / admin@123)");

  // ─────────────────────────────────────────────────────────
  // 5. AMENITIES
  // ─────────────────────────────────────────────────────────

  const amenities = await Promise.all(
    [
      { name: "Premium Locations", slug: "premium-locations", icon: "MapPin", sortOrder: 1 },
      { name: "24/7 Access", slug: "24-7-access", icon: "Clock", sortOrder: 2 },
      { name: "Homely Staff", slug: "homely-staff", icon: "Users", sortOrder: 3 },
      { name: "Gourmet Brews", slug: "gourmet-brews", icon: "Coffee", sortOrder: 4 },
      { name: "Cozy Space", slug: "cozy-space", icon: "Sofa", sortOrder: 5 },
      { name: "Ultra-Fast WiFi", slug: "ultra-fast-wifi", icon: "Wifi", sortOrder: 6 },
      { name: "Advanced Tech", slug: "advanced-tech", icon: "Monitor", sortOrder: 7 },
    ].map((a) => prisma.amenity.create({ data: a }))
  );
  console.log(`✅ ${amenities.length} Amenities`);

  // ─────────────────────────────────────────────────────────
  // 6. CITY & LOCATIONS
  // ─────────────────────────────────────────────────────────

  const ahmedabad = await prisma.city.create({
    data: { name: "Ahmedabad", slug: "ahmedabad", state: "Gujarat" },
  });

  const agarwal = await prisma.location.create({
    data: { cityId: ahmedabad.id, name: "Agarwal Complex", slug: "agarwal-complex-cg-road", area: "CG Road" },
  });
  const mercado = await prisma.location.create({
    data: { cityId: ahmedabad.id, name: "Mercado", slug: "mercado-cg-road", area: "CG Road" },
  });
  const premier = await prisma.location.create({
    data: { cityId: ahmedabad.id, name: "Premier House", slug: "premier-house-sg-highway", area: "SG Highway" },
  });
  console.log("✅ 1 City, 3 Locations");

  // ─────────────────────────────────────────────────────────
  // 7. PRODUCTS + PRICING (from pricing policy document)
  // ─────────────────────────────────────────────────────────

  // Helper lookups
  const typeMap = Object.fromEntries(productTypes.map((t) => [t.name, t.id]));
  const durMap = Object.fromEntries(durationTypes.map((d) => [d.name, d.id]));

  // --- Workspace products per location ---
  interface WorkspaceSpec {
    typeName: string;
    slug: string;
    capacity: number | null;
    meetingHrs: number | null;
    sdr: number;
    adv: number;
    pricing: Record<string, number>;  // durationType name → price
  }

  interface LocationWorkspaces {
    locationId: number;
    products: WorkspaceSpec[];
  }

  const workspaceData: LocationWorkspaces[] = [
    {
      locationId: agarwal.id,
      products: [
        { typeName: "FLEX_DESK", slug: "flex-desk", capacity: 1, meetingHrs: null, sdr: 1, adv: 1, pricing: { PER_DAY: 500, PER_WEEK: 2500, PER_MONTH: 6000 } },
        { typeName: "FIXED_DESK", slug: "fixed-desk", capacity: 1, meetingHrs: 2, sdr: 2, adv: 1, pricing: { PER_MONTH: 7000 } },
        { typeName: "DEDICATED_CABIN", slug: "dedicated-cabin", capacity: null, meetingHrs: 2, sdr: 3, adv: 1, pricing: { PER_MONTH: 10000, PER_3_MONTHS: 9500, PER_6_MONTHS: 9000, PER_YEAR: 8000 } },
        { typeName: "PRIVATE_CABIN", slug: "private-cabin", capacity: null, meetingHrs: 5, sdr: 3, adv: 1, pricing: { PER_MONTH: 14000, PER_3_MONTHS: 13500, PER_6_MONTHS: 13000, PER_YEAR: 12000 } },
        { typeName: "EXECUTIVE_CABIN", slug: "executive-cabin", capacity: null, meetingHrs: 5, sdr: 3, adv: 1, pricing: { PER_MONTH: 30000, PER_3_MONTHS: 28500, PER_6_MONTHS: 27000, PER_YEAR: 24000 } },
      ],
    },
    {
      locationId: mercado.id,
      products: [
        { typeName: "FLEX_DESK", slug: "flex-desk", capacity: 1, meetingHrs: null, sdr: 1, adv: 1, pricing: { PER_DAY: 500, PER_WEEK: 2500, PER_MONTH: 6000 } },
        { typeName: "FIXED_DESK", slug: "fixed-desk", capacity: 1, meetingHrs: 2, sdr: 2, adv: 1, pricing: { PER_MONTH: 8000 } },
        { typeName: "DEDICATED_CABIN", slug: "dedicated-cabin", capacity: null, meetingHrs: 2, sdr: 2, adv: 1, pricing: { PER_MONTH: 11000, PER_3_MONTHS: 10500, PER_6_MONTHS: 10000, PER_YEAR: 9000 } },
        { typeName: "PRIVATE_CABIN", slug: "private-cabin", capacity: null, meetingHrs: 5, sdr: 3, adv: 1, pricing: { PER_MONTH: 17000, PER_3_MONTHS: 16500, PER_6_MONTHS: 16000, PER_YEAR: 15000 } },
        { typeName: "EXECUTIVE_CABIN", slug: "executive-cabin", capacity: null, meetingHrs: 5, sdr: 3, adv: 1, pricing: { PER_MONTH: 33000, PER_3_MONTHS: 31500, PER_6_MONTHS: 30000, PER_YEAR: 27000 } },
      ],
    },
    {
      locationId: premier.id,
      products: [
        { typeName: "FLEX_DESK", slug: "flex-desk", capacity: 1, meetingHrs: null, sdr: 1, adv: 1, pricing: { PER_DAY: 500, PER_WEEK: 2500, PER_MONTH: 6000 } },
        { typeName: "FIXED_DESK", slug: "fixed-desk", capacity: 1, meetingHrs: 2, sdr: 2, adv: 1, pricing: { PER_MONTH: 8000 } },
        { typeName: "DEDICATED_CABIN", slug: "dedicated-cabin", capacity: null, meetingHrs: 2, sdr: 3, adv: 1, pricing: { PER_MONTH: 11000, PER_3_MONTHS: 10500, PER_6_MONTHS: 10000, PER_YEAR: 9000 } },
        { typeName: "PRIVATE_CABIN", slug: "private-cabin", capacity: null, meetingHrs: 5, sdr: 3, adv: 1, pricing: { PER_MONTH: 17000, PER_3_MONTHS: 16500, PER_6_MONTHS: 16000, PER_YEAR: 15000 } },
        { typeName: "EXECUTIVE_CABIN", slug: "executive-cabin", capacity: null, meetingHrs: 5, sdr: 3, adv: 1, pricing: { PER_MONTH: 33000, PER_3_MONTHS: 31500, PER_6_MONTHS: 30000, PER_YEAR: 27000 } },
      ],
    },
  ];

  for (const loc of workspaceData) {
    for (const spec of loc.products) {
      const product = await prisma.product.create({
        data: {
          locationId: loc.locationId,
          typeId: typeMap[spec.typeName],
          categoryId: catWorkspace.id,
          accessTimeId: access24x7.id,
          name: productTypes.find((t) => t.name === spec.typeName)!.displayName,
          slug: spec.slug,
          capacity: spec.capacity,
          complementaryMeetingHours: spec.meetingHrs,
          sdr: spec.sdr,
          adv: spec.adv,
          securityDepositMonths: 3,
        },
      });

      // Create pricing plans
      await prisma.pricingPlan.createMany({
        data: Object.entries(spec.pricing).map(([durName, price]) => ({
          productId: product.id,
          durationTypeId: durMap[durName],
          price,
        })),
      });

      // Attach all amenities
      await prisma.productAmenity.createMany({
        data: amenities.map((a) => ({ productId: product.id, amenityId: a.id })),
      });
    }
  }
  console.log("✅ 15 Workspace products with pricing & amenities");

  // --- Guest Space products (Meeting Room, Board Room, Event Room, Lounge) ---

  interface GuestSpec {
    typeName: string;
    slug: string;
    capacity: number;
    pricing: Record<string, number>;
  }

  interface LocationGuests {
    locationId: number;
    products: GuestSpec[];
  }

  const guestData: LocationGuests[] = [
    {
      locationId: agarwal.id,
      products: [
        { typeName: "MEETING_ROOM", slug: "meeting-room", capacity: 5, pricing: { PER_HOUR: 400, PER_4_HOURS: 1000, PER_DAY: 2000 } },
        { typeName: "BOARD_ROOM", slug: "board-room", capacity: 11, pricing: { PER_HOUR: 600, PER_4_HOURS: 2200, PER_DAY: 4500 } },
        { typeName: "EVENT_ROOM", slug: "event-room", capacity: 40, pricing: { PER_HOUR: 2000, PER_4_HOURS: 6000, PER_DAY: 10000 } },
      ],
    },
    {
      locationId: mercado.id,
      products: [
        { typeName: "MEETING_ROOM", slug: "meeting-room", capacity: 6, pricing: { PER_HOUR: 500, PER_4_HOURS: 1800, PER_DAY: 3500 } },
        { typeName: "BOARD_ROOM", slug: "board-room", capacity: 14, pricing: { PER_HOUR: 1000, PER_4_HOURS: 3500, PER_DAY: 6000 } },
        { typeName: "LOUNGE_ROOM", slug: "lounge-room", capacity: 8, pricing: { PER_HOUR: 800, PER_4_HOURS: 3500, PER_DAY: 5000 } },
      ],
    },
    {
      locationId: premier.id,
      products: [
        { typeName: "MEETING_ROOM", slug: "meeting-room", capacity: 4, pricing: { PER_HOUR: 500, PER_4_HOURS: 1800, PER_DAY: 3500 } },
        { typeName: "BOARD_ROOM", slug: "board-room", capacity: 12, pricing: { PER_HOUR: 1000, PER_4_HOURS: 3500, PER_DAY: 6000 } },
        { typeName: "EVENT_ROOM", slug: "event-room", capacity: 40, pricing: { PER_HOUR: 2000, PER_4_HOURS: 6000, PER_DAY: 10000 } },
      ],
    },
  ];

  for (const loc of guestData) {
    for (const spec of loc.products) {
      const product = await prisma.product.create({
        data: {
          locationId: loc.locationId,
          typeId: typeMap[spec.typeName],
          categoryId: catGuest.id,
          name: productTypes.find((t) => t.name === spec.typeName)!.displayName,
          slug: spec.slug,
          capacity: spec.capacity,
          securityDepositMonths: 0,
        },
      });

      await prisma.pricingPlan.createMany({
        data: Object.entries(spec.pricing).map(([durName, price]) => ({
          productId: product.id,
          durationTypeId: durMap[durName],
          price,
        })),
      });
    }
  }
  console.log("✅ 9 Guest Space products with pricing");

  // ─────────────────────────────────────────────────────────
  // 8. DEFAULT SETTINGS
  // ─────────────────────────────────────────────────────────

  await prisma.setting.createMany({
    data: [
      { key: "default_gst_rate", value: "18", group: "billing" },
      { key: "booking_number_prefix", value: "BK", group: "billing" },
      { key: "payment_number_prefix", value: "PAY", group: "billing" },
      { key: "ticket_number_prefix", value: "TKT", group: "support" },
      { key: "security_deposit_months", value: "3", group: "billing" },
      { key: "company_name", value: "SSPACIA", group: "general" },
      { key: "currency", value: "INR", group: "general" },
    ],
  });
  console.log("✅ 7 Default Settings\n");

  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());