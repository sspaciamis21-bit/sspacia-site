/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import prisma from '@/lib/prisma';

interface TokenPayload {
  id: number;
  email: string;
  roleId: number;
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your_secret_key'
);

export async function GET(request: NextRequest) {
  try {
    // Get token from cookies (HTTP-only)
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'No authentication token provided' },
        { status: 401 }
      );
    }

    // Verify token
    let payload: any;
    try {
      const verified = await jwtVerify(token, JWT_SECRET);
      payload = verified.payload as TokenPayload;
    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Get user with assigned locations
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      include: {
        role: true,
        assignedLocations: {
          include: { location: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get manager's assigned location IDs
    const managerLocationIds = user.assignedLocations.map((ul) => ul.locationId);
    const locations = user.assignedLocations.map((ul) => ({
      id: ul.location.id,
      name: ul.location.name,
    }));

    // If user has no assigned locations, they can't view manager dashboard
    if (managerLocationIds.length === 0) {
      return NextResponse.json(
        { error: 'No assigned locations for this user' },
        { status: 403 }
      );
    }

    // Fetch tickets for assigned locations
    const tickets = await prisma.supportTicket.findMany({
      where: {
        location: {
          in: locations.map((l) => l.name), // Filter by location name
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    // Fetch products for assigned locations
    const products = await prisma.product.findMany({
      where: {
        locationId: {
          in: managerLocationIds,
        },
      },
      include: {
        location: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    // Fetch users assigned to the same locations
    const usersAssignedToLocations = await prisma.user.findMany({
      where: {
        assignedLocations: {
          some: {
            locationId: {
              in: managerLocationIds,
            },
          },
        },
      },
      include: {
        role: true,
        assignedLocations: {
          include: { location: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    // Count statistics
    const totalTickets = await prisma.supportTicket.count({
      where: {
        location: {
          in: locations.map((l) => l.name),
        },
      },
    });

    const openTickets = await prisma.supportTicket.count({
      where: {
        location: {
          in: locations.map((l) => l.name),
        },
        status: 'OPEN',
      },
    });

    const totalProducts = await prisma.product.count({
      where: {
        locationId: {
          in: managerLocationIds,
        },
      },
    });

    return NextResponse.json(
      {
        stats: {
          totalLocations: managerLocationIds.length,
          totalTickets,
          openTickets,
          totalProducts,
        },
        locations,
        tickets: tickets.map((t) => ({
          id: t.id,
          ticketNumber: t.ticketNumber,
          name: t.name,
          description: t.description,
          status: t.status,
          location: t.location,
          createdAt: t.createdAt,
        })),
        products: products.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          type: p.type,
          location: {
            id: p.location.id,
            name: p.location.name,
          },
          quantity: p.quantity,
          isActive: p.isActive,
        })),
        users: usersAssignedToLocations.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          isActive: u.isActive,
          role: u.role ? { name: u.role.name } : undefined,
          assignedLocations: u.assignedLocations.map((ul) => ({
            id: ul.location.id,
            name: ul.location.name,
          })),
        })),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Manager dashboard error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
