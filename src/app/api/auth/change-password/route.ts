import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { verifyToken, signToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { validatePassword } from '@/lib/password-validator';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.id) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const userId = Number(payload.id);
    const body = await req.json();
    const { newPassword, confirmPassword } = body;

    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'New password and confirmation password do not match' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

    const updatedUser: any = await (prisma as any).user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
      },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    const permissions = (updatedUser.role?.permissions || []).map((rp: any) => rp.permission.name);
    const newToken = await signToken({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role?.name || 'USER',
      permissions,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Password updated successfully! Welcome to SSPACIA.',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role.name,
        mustChangePassword: false,
      },
    });

    response.cookies.set('auth-token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('[ChangePassword] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update password' },
      { status: 500 }
    );
  }
}
