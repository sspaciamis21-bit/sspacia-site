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
    const user: any = await (prisma as any).user.findUnique({
      where: { id: Number(payload.id) },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        companyName: true,
        companyStreet: true,
        companyCity: true,
        companyState: true,
        companyZip: true,
        contactNumber: true,
        designation: true,
        isActive: true,
        mustChangePassword: true,
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

    const permissions = (user.role?.permissions || []).map(
      (rp: any) => rp.permission?.name
    ).filter(Boolean)

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        companyName: user.companyName,
        companyStreet: user.companyStreet,
        companyCity: user.companyCity,
        companyState: user.companyState,
        companyZip: user.companyZip,
        contactNumber: user.contactNumber,
        designation: user.designation,
        mustChangePassword: !!user.mustChangePassword,
        role: user.role?.name || 'USER',
        permissions,
        assignedLocations: (user.assignedLocations || []).map((ul: any) => ({
          id: ul.location?.id,
          name: ul.location?.name,
        })),
        profileCompleted: !!(user.phone && user.companyName && user.designation),
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

export async function PATCH(req: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || !payload.id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await req.json()
    const { name, phone, designation, companyName, companyCity, companyState, companyStreet, companyZip } = body
    
    // We update the user
    await prisma.user.update({
      where: { id: Number(payload.id) },
      data: {
        name,
        phone,
        designation,
        companyName,
        companyCity,
        companyState,
        companyStreet,
        companyZip,
      }
    })

    return NextResponse.json({ message: 'Profile updated successfully' })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}