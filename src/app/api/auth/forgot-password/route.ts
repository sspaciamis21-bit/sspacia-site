import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { validatePassword } from '@/lib/password-validator';
import { verifyOtpCode, consumeOtpCode } from '@/lib/otpDb';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, email, otp, newPassword } = body;

    if (!username || !email || !otp || !newPassword) {
      return NextResponse.json(
        { error: 'Username, Email, 6-digit OTP, and New Password are all required.' },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedOtp = String(otp).trim();

    // 1. Validate Password Complexity
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // 2. Find User
    const user = await prisma.user.findFirst({
      where: {
        name: trimmedUsername,
        email: trimmedEmail,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'No account found matching this Username and Email combination.' },
        { status: 404 }
      );
    }

    // 3. Verify 4-Minute Email OTP
    const otpVerification = await verifyOtpCode({
      email: trimmedEmail,
      otp: trimmedOtp,
      purpose: 'FORGOT_PASSWORD',
    });

    if (!otpVerification.valid) {
      return NextResponse.json(
        { error: otpVerification.error || 'Invalid or expired OTP. Please click "Resend OTP".' },
        { status: 400 }
      );
    }

    // 4. Hash New Password and Update in Database
    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, mustChangePassword: false },
    });

    // 5. Invalidate / Consume the OTP
    await consumeOtpCode({
      email: trimmedEmail,
      otp: trimmedOtp,
      purpose: 'FORGOT_PASSWORD',
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.',
    });
  } catch (error: any) {
    console.error('[Forgot Password] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to reset password. Please try again.' },
      { status: 500 }
    );
  }
}
