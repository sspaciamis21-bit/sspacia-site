import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { JWTPayload } from 'jose';
import prisma from '@/lib/prisma';

// ─── Require Authenticated User ────────────────────────────
// Returns the JWT payload if a valid auth‑token cookie exists.
// Returns null otherwise.
export async function requireAuth(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

// ─── Require Admin Role ────────────────────────────────────
// Returns the JWT payload if the user is an admin (case‑insensitive).
// Returns null otherwise.
export async function requireAdmin(): Promise<JWTPayload | null> {
  const payload = await requireAuth();
  if (!payload) return null;
  const role = (payload.role as string | undefined)?.toUpperCase();
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') return null;
  return payload;
}

// ─── Require Manager or Admin ──────────────────────────────
// Returns the JWT payload if the user has MANAGER, ADMIN, or SUPER_ADMIN role.
export async function requireManagerOrAdmin(): Promise<JWTPayload | null> {
  const payload = await requireAuth();
  if (!payload) return null;
  const role = (payload.role as string | undefined)?.toUpperCase();
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN' && role !== 'manager') return null;
  return payload;
}

// ─── Check Permission ──────────────────────────────────────
/**
 * Checks if a user has a specific permission based on their assigned role.
 * Role name checks are kept as a safe fallback for system roles, 
 * but the system prioritizes explicit permission matches.
 */
export async function hasPermission(userId: number, permissionName: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!user || !user.role || !user.isActive) return false;

  // System Admins bypass the check and get all permissions
  const roleName = user.role.name.toUpperCase();
  if (roleName === 'ADMIN' || roleName === 'SUPER_ADMIN' || roleName === 'SUPER-ADMIN') {
    return true;
  }

  // Check the permissions array for a match
  return (user.role.permissions as any[]).some(rp => rp.permission.name === permissionName);
}

/**
 * Ensures the user is authenticated and has the required permission.
 * Returns the payload if check passes, otherwise throws/returns error response.
 */
export async function requirePermission(permissionName: string): Promise<JWTPayload | NextResponse> {
  const payload = await requireAuth();
  if (!payload || !payload.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const userId = Number(payload.id);
  const authorized = await hasPermission(userId, permissionName);
  
  if (!authorized) {
    return NextResponse.json({ error: `Permission denied: ${permissionName}` }, { status: 403 });
  }

  return payload;
}
