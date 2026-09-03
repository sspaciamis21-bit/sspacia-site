import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { validatePassword } from '@/lib/password-validator'
import { verifyOtpCode, isEmailOtpVerified, consumeOtpCode } from '@/lib/otpDb'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, password, otp } = body

    // ─── Validate Fields ──────────────────────────────────
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    const trimmedEmail = email.trim().toLowerCase()

    // ─── Mandatory Email OTP Verification ──────────────────
    let isVerified = false
    if (otp && String(otp).trim()) {
      const verifyRes = await verifyOtpCode({
        email: trimmedEmail,
        otp: String(otp).trim(),
        purpose: 'REGISTRATION',
      })
      if (verifyRes.valid) {
        isVerified = true
      } else {
        return NextResponse.json(
          { error: verifyRes.error || 'Invalid or expired registration OTP' },
          { status: 400 }
        )
      }
    } else {
      isVerified = await isEmailOtpVerified({
        email: trimmedEmail,
        purpose: 'REGISTRATION',
      })
    }

    if (!isVerified) {
      return NextResponse.json(
        { error: 'Email verification required. Please enter and validate the 6-digit OTP code sent to your email.' },
        { status: 400 }
      )
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      )
    }

    // ─── Check if User Exists ─────────────────────────────
    const existingUser = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 400 }
      )
    }


    // ─── Get Default USER Role ────────────────────────────
    const userRole = await prisma.role.findUnique({
      where: { name: 'USER' },
    })

    if (!userRole) {
      return NextResponse.json(
        { error: 'Roles not setup. Please call POST /api/setup first' },
        { status: 500 }
      )
    }

    // ─── Hash Password ────────────────────────────────────
    const hashedPassword = await bcrypt.hash(password, 12)

    // ─── Create User ──────────────────────────────────────
    const user: any = await (prisma as any).user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        roleId: userRole.id,
        mustChangePassword: false, // Self-registered user already set their own password
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        role: {
          select: { name: true },
        },
      },
    });

    // ─── Consume / Invalidate Registration OTP ───
    await consumeOtpCode({ email: trimmedEmail, purpose: 'REGISTRATION' }).catch(() => {});

    // ─── Auto-remove from UnregisteredCustomer Lead Table & Mark VisitorLog Converted ───


    try {
      await (prisma as any).unregisteredCustomer.deleteMany({
        where: {
          OR: [
            { email: user.email },
            ...(body.phone || body.mobileNo ? [{ mobileNo: String(body.phone || body.mobileNo) }] : []),
          ],
        },
      });

      // Update matching visitor logs to converted = true
      await (prisma as any).visitorLog.updateMany({
        where: {
          OR: [
            { userEmail: user.email },
            { isUnregistered: true }
          ]
        },
        data: {
          isConverted: true,
          userEmail: user.email
        }
      });
    } catch (cleanupErr) {
      console.warn('[Signup] Unregistered lead cleanup notice:', cleanupErr);
    }

    return NextResponse.json(
      {
        message: 'User registered successfully',
        user,
      },
      { status: 201 }
    )

  } catch (error: any) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Registration failed', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
} 