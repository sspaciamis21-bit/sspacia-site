import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createAndStoreOtp, OTP_VALIDITY_MINUTES } from '@/lib/otpDb';
import { sendPasswordOtpEmail } from '@/lib/otpEmail';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/otp/send
 * Generates and emails a 6-digit OTP (4-minute validity) for password forgot/reset
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, username, purpose = 'FORGOT_PASSWORD' } = body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const validPurpose: 'FORGOT_PASSWORD' | 'RESET_PASSWORD' | 'REGISTRATION' =
      purpose === 'REGISTRATION'
        ? 'REGISTRATION'
        : purpose === 'RESET_PASSWORD'
        ? 'RESET_PASSWORD'
        : 'FORGOT_PASSWORD';

    let recipientName = body.name || 'Valued Member';

    if (validPurpose === 'REGISTRATION') {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: trimmedEmail },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'An account with this email address already exists. Please log in instead.' },
          { status: 400 }
        );
      }
    } else {
      // Verify user exists in database for password reset
      let user: any = null;
      if (username && typeof username === 'string' && username.trim()) {
        const trimmedUsername = username.trim();
        user = await prisma.user.findFirst({
          where: {
            name: trimmedUsername,
            email: trimmedEmail,
          },
          select: { id: true, name: true, email: true },
        });

        if (!user) {
          return NextResponse.json(
            { error: 'No account found matching this Username and Email combination' },
            { status: 404 }
          );
        }
      } else {
        user = await prisma.user.findFirst({
          where: { email: trimmedEmail },
          select: { id: true, name: true, email: true },
        });

        if (!user) {
          return NextResponse.json(
            { error: 'No account found with this email address' },
            { status: 404 }
          );
        }
      }

      recipientName = user.name || 'User';
    }

    // Generate & store OTP (valid 4 minutes)
    const { otp, expiresInSeconds } = await createAndStoreOtp({
      email: trimmedEmail,
      purpose: validPurpose,
    });

    // Send Email
    const emailResult = await sendPasswordOtpEmail({
      toEmail: trimmedEmail,
      recipientName,
      otp,
      purpose: validPurpose,
    });


    if (!emailResult.success) {
      return NextResponse.json(
        { error: 'Failed to dispatch verification email. Please check your email and try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${trimmedEmail}. Valid for ${OTP_VALIDITY_MINUTES} minutes.`,
      expiresInSeconds,
      email: trimmedEmail,
    });
  } catch (error: any) {
    console.error('[OTP Send] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to send OTP code. Please try again.' },
      { status: 500 }
    );
  }
}
