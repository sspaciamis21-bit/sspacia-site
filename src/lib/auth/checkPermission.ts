import prisma from '@/lib/prisma';

/**
 * Checks if a user has a specific permission based on their assigned role.
 * Module:action convention: e.g. "bookings:read"
 */
export async function checkPermission(
  userId: number,
  module: string,
  action: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId, isActive: true },
    select: {
      roleId: true,
      role: {
        select: {
          name: true,
          isActive: true,
        },
      },
    },
  });

  if (!user || !user.role || !user.role.isActive) return false;

  // Bypass for ADMIN & COMMUNITY_MANAGER role (case-insensitive)
  const roleName = user.role.name.toLowerCase();
  if (
    roleName === 'admin' || 
    roleName === 'super_admin' || 
    roleName === 'super-admin' || 
    roleName === 'super admin' ||
    roleName === 'community_manager' ||
    roleName === 'community manager'
  ) {
    return true;
  }

  // Implicit permissions for standard users (members/customers) to access their own dashboards
  if (roleName === 'user' || roleName === 'member' || roleName === 'customer') {
    const memberPermissions = [
      'tickets:read', 'tickets:create',
      'bookings:read', 'bookings:create', 'bookings:view',
      'documents:view', 'documents:update',
      'payments:create', 'payments:view', 'payments:read'
    ];
    if (memberPermissions.includes(`${module}:${action}`)) {
      return true;
    }
  }

  // Granular check for other roles
  const actions = (action === 'read' || action === 'view') ? ['read', 'view'] : [action];

  const count = await prisma.rolePermission.count({
    where: {
      roleId: user.roleId,
      permission: {
        module,
        action: { in: actions },
      },
    },
  });

  return count > 0;
}
