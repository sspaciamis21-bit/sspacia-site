/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// GET /api/users/[id] - Get a single user
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...userWithoutPassword } = user;
    return NextResponse.json({
      ...userWithoutPassword,
      assignedLocations: user.assignedLocations.map((ul) => ({
        id: ul.location.id,
        name: ul.location.name,
      })),
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/users/[id] - Update user details
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email, roleId, isActive, password, assignedLocationIds } = body;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (roleId !== undefined) data.roleId = parseInt(roleId);
    if (isActive !== undefined) data.isActive = isActive;
    
    if (password) {
      data.password = await bcrypt.hash(password, 12);
    }

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data,
      include: {
        role: true,
        assignedLocations: {
          include: { location: true },
        },
      },
    });

    // Handle location assignment
    if (assignedLocationIds !== undefined) {
      await prisma.userLocation.deleteMany({
        where: { userId: parseInt(id) },
      });

      if (assignedLocationIds.length > 0) {
        await prisma.userLocation.createMany({
          data: assignedLocationIds.map((locId: number) => ({
            userId: parseInt(id),
            locationId: locId,
          })),
        });
      }

      // Refetch with updated locations
      const updatedUser = await prisma.user.findUnique({
        where: { id: parseInt(id) },
        include: {
          role: true,
          assignedLocations: {
            include: { location: true },
          },
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _password, ...userWithoutPassword } = updatedUser!;
      return NextResponse.json({
        ...userWithoutPassword,
        assignedLocations: updatedUser!.assignedLocations.map((ul) => ({
          id: ul.location.id,
          name: ul.location.name,
        })),
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...userWithoutPassword } = user;
    return NextResponse.json({
      ...userWithoutPassword,
      assignedLocations: user.assignedLocations.map((ul) => ({
        id: ul.location.id,
        name: ul.location.name,
      })),
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete a user
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.user.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json(
      { message: 'User deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
