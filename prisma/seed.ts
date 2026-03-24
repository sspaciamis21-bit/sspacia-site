import { PrismaClient, RoleName, PermissionName } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {

  // ─── Create Permissions ───────────────────────────────
  const permissionData = [
    { name: PermissionName.view_dashboard,   description: 'View the dashboard' },
    { name: PermissionName.view_admin_panel, description: 'Access admin panel' },
    { name: PermissionName.manage_users,     description: 'Manage all users' },
    { name: PermissionName.create_user,      description: 'Create new users' },
    { name: PermissionName.update_user,      description: 'Update user details' },
    { name: PermissionName.delete_user,      description: 'Delete users' },
    { name: PermissionName.manage_roles,     description: 'Manage roles' },
    { name: PermissionName.change_roles,     description: 'Change user roles' },
    { name: PermissionName.view_reports,     description: 'View reports' },
    { name: PermissionName.export_reports,   description: 'Export reports' },
  ]

  const permissions: Record<string, { id: number }> = {}

  for (const p of permissionData) {
    const permission = await prisma.permission.upsert({
      where: { name: p.name },
      update: {},
      create: p,
    })
    permissions[p.name] = permission
  }

  console.log('✅ Permissions created')

  // ─── Create Roles with Permissions ───────────────────

  // ADMIN — all permissions
  const adminRole = await prisma.role.upsert({
    where: { name: RoleName.ADMIN },
    update: {},
    create: {
      name: RoleName.ADMIN,
      description: 'Full access to everything',
      permissions: {
        create: Object.values(permissions).map((p) => ({
          permissionId: p.id,
        })),
      },
    },
  })

  // MANAGER — limited permissions
  const managerRole = await prisma.role.upsert({
    where: { name: RoleName.MANAGER },
    update: {},
    create: {
      name: RoleName.MANAGER,
      description: 'Can manage content and view reports',
      permissions: {
        create: [
          { permissionId: permissions[PermissionName.view_dashboard].id },
          { permissionId: permissions[PermissionName.update_user].id },
          { permissionId: permissions[PermissionName.view_reports].id },
        ],
      },
    },
  })

  // USER — basic access
  const userRole = await prisma.role.upsert({
    where: { name: RoleName.USER },
    update: {},
    create: {
      name: RoleName.USER,
      description: 'Basic access to dashboard only',
      permissions: {
        create: [
          { permissionId: permissions[PermissionName.view_dashboard].id },
        ],
      },
    },
  })

  console.log('✅ Roles created')

  // ─── Create Default Admin User ────────────────────────
  const hashedPassword = await bcrypt.hash('admin123', 12)

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@example.com',
      password: hashedPassword,
      roleId: adminRole.id,
    },
  })

  // ─── Create Default Manager User ─────────────────────
  const managerPassword = await bcrypt.hash('manager123', 12)

  await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: {},
    create: {
      name: 'Manager User',
      email: 'manager@example.com',
      password: managerPassword,
      roleId: managerRole.id,
    },
  })

  // ─── Create Default Regular User ─────────────────────
  const userPassword = await bcrypt.hash('user123', 12)

  await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      name: 'Regular User',
      email: 'user@example.com',
      password: userPassword,
      roleId: userRole.id,
    },
  })

  console.log('✅ Default users created')
  console.log('')
  console.log('─── Login Credentials ───────────────────')
  console.log('👑 Admin   : admin@example.com   / admin123')
  console.log('🧑‍💼 Manager : manager@example.com / manager123')
  console.log('👤 User    : user@example.com    / user123')
  console.log('─────────────────────────────────────────')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })