import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    // ─── Get token from cookie ────────────────────────────
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // ─── Verify token ─────────────────────────────────────
    const payload = await verifyToken(token)

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // ─── Get fresh user data from DB ──────────────────────
    const user = await prisma.user.findUnique({
      where: { id: Number(payload.id) },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        role: {
          select: {
            name: true,
            permissions: {
              select: {
                permission: {
                  select: { name: true }
                }
              }
            }
          }
        },
        assignedLocations: {
          select: {
            location: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      }
    })

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'User not found or deactivated' },
        { status: 401 }
      )
    }

    const permissions = user.role.permissions.map(
      (rp) => rp.permission.name
    )

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        permissions,
        assignedLocations: user.assignedLocations.map((ul) => ({
          id: ul.location.id,
          name: ul.location.name,
        })),
      }
    })

  } catch (error) {
    console.error('Me error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}