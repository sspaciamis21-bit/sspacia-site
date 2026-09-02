import { NextResponse } from 'next/server';
import { verifyOtpCode } from '@/lib/otpDb';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/otp/verify
 * Validates a 6-digit OTP code against email and purpose within the 4-minute window
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, otp, purpose = 'FORGOT_PASSWORD' } = body;

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and verification OTP code are required' },
        { status: 400 }
      );
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    const trimmedOtp = String(otp).trim();
    const validPurpose = purpose === 'RESET_PASSWORD' ? 'RESET_PASSWORD' : 'FORGOT_PASSWORD';

    const verification = await verifyOtpCode({
      email: trimmedEmail,
      otp: trimmedOtp,
      purpose: validPurpose,
    });

    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error || 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully.',
    });
  } catch (error: any) {
    console.error('[OTP Verify] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to verify OTP. Please try again.' },
      { status: 500 }
    );
  }
}
