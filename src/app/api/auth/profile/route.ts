import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'

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
    const { name, phone, designation, companyName, companyCity, companyState, companyStreet, companyZip, contactNumber } = body
    
    // We update the user
    await prisma.user.update({
      where: { id: Number(payload.id) },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(contactNumber !== undefined && { contactNumber }),
        ...(designation !== undefined && { designation }),
        ...(companyName !== undefined && { companyName }),
        ...(companyCity !== undefined && { companyCity }),
        ...(companyState !== undefined && { companyState }),
        ...(companyStreet !== undefined && { companyStreet }),
        ...(companyZip !== undefined && { companyZip }),
      }
    })

    return NextResponse.json({ message: 'Profile updated successfully' })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
