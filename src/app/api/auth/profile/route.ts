import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { verifyToken, signToken } from '@/lib/jwt'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import { validatePassword } from '@/lib/password-validator'

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

    const userId = Number(payload.id)
    const body = await req.json()
    const {
      name,
      email,
      password,
      phone,
      designation,
      companyName,
      companyCity,
      companyState,
      companyStreet,
      companyZip,
      contactNumber
    } = body

    // ─── Validate Email Uniqueness if changing ─────────────
    if (email !== undefined && email !== null) {
      const trimmedEmail = email.trim()
      if (trimmedEmail) {
        const existingEmailUser = await prisma.user.findFirst({
          where: {
            email: trimmedEmail,
            NOT: { id: userId }
          }
        })
        if (existingEmailUser) {
          return NextResponse.json({ error: 'Email address is already in use' }, { status: 400 })
        }
      }
    }

    // ─── Hash Password if provided (Requires Email OTP) ──────
    let hashedPassword: string | undefined = undefined
    if (password && typeof password === 'string' && password.trim().length > 0) {
      const { otp } = body
      if (!otp || typeof otp !== 'string' || !otp.trim()) {
        return NextResponse.json(
          { error: 'Email OTP is mandatory to update your password. Please request and enter the verification OTP.' },
          { status: 400 }
        )
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      })
      const targetEmail = currentUser?.email || email

      const { verifyOtpCode, consumeOtpCode } = await import('@/lib/otpDb')
      const otpVerification = await verifyOtpCode({
        email: targetEmail,
        otp: String(otp).trim(),
        purpose: 'RESET_PASSWORD',
      })

      if (!otpVerification.valid) {
        return NextResponse.json(
          { error: otpVerification.error || 'Invalid or expired OTP for password update.' },
          { status: 400 }
        )
      }

      const validation = validatePassword(password.trim())
      if (!validation.isValid) {
        return NextResponse.json({ error: validation.error }, { status: 400 })
      }
      hashedPassword = await bcrypt.hash(password.trim(), 10)

      // Consume OTP after successful hash
      await consumeOtpCode({
        email: targetEmail,
        otp: String(otp).trim(),
        purpose: 'RESET_PASSWORD',
      })
    }


    // ─── Update User in DB ──────────────────────────────────
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(email !== undefined && { email: email.trim() }),
        ...(hashedPassword && { password: hashedPassword }),
        ...(phone !== undefined && { phone }),
        ...(contactNumber !== undefined && { contactNumber }),
        ...(designation !== undefined && { designation }),
        ...(companyName !== undefined && { companyName }),
        ...(companyCity !== undefined && { companyCity }),
        ...(companyState !== undefined && { companyState }),
        ...(companyStreet !== undefined && { companyStreet }),
        ...(companyZip !== undefined && { companyZip }),
      },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true }
            }
          }
        }
      }
    })

    // ─── Re-issue JWT Token with fresh details ──────────────
    const permissions = updatedUser.role.permissions.map((rp) => rp.permission.name)
    const newToken = await signToken({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role.name,
      permissions,
    })

    const response = NextResponse.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role.name,
      }
    })

    response.cookies.set('auth-token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
