/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// GET /api/users - List all users
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      include: {
        role: true,
        assignedLocations: {
          include: { location: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Remove passwords from response and format locations
    const usersWithoutPasswords = users.map((user) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...u } = user;
      return {
        ...u,
        assignedLocations: user.assignedLocations.map((ul) => ({
          id: ul.location.id,
          name: ul.location.name,
        })),
      };
    });

    return NextResponse.json(usersWithoutPasswords);
  } catch (error: any) {
    console.error('List users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create a new user manually
export async function POST(request: Request) {
  try {
    const { name, email, password, roleId, assignedLocationIds } = await request.json();

    if (!name || !email || !password || !roleId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        roleId: parseInt(roleId),
        assignedLocations: {
          create: (assignedLocationIds || []).map((locId: number) => ({
            locationId: locId,
          })),
        },
      },
      include: {
        role: true,
        assignedLocations: {
          include: { location: true },
        },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...userWithoutPassword } = user;

    return NextResponse.json(
      {
        ...userWithoutPassword,
        assignedLocations: user.assignedLocations.map((ul) => ({
          id: ul.location.id,
          name: ul.location.name,
        })),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
