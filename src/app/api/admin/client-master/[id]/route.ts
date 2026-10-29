import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';
import { mapClientMasterPayload } from '@/lib/client-master-payload';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entryId = Number(id);

    const entry = await (prisma as any).clientMaster.findUnique({
      where: { id: entryId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        contactPersons: { orderBy: { sortOrder: 'asc' } },
        products: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Client entry not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    console.error('Fetch client master error:', error);
    return NextResponse.json({ error: 'Failed to fetch client entry' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (token) {
      const payload = await verifyToken(token);
      const role = String(payload?.role || '').toUpperCase();
      if (role === 'CRM') {
        return NextResponse.json({ error: 'Forbidden: CRM role has read-only access' }, { status: 403 });
      }
    }
    const { id } = await params;
    const entryId = Number(id);

    const body = await request.json();
    const mapped = mapClientMasterPayload(body);
    const { contactPersons, products, ...clientData } = mapped;

    const existing = await (prisma as any).clientMaster.findUnique({
      where: { id: entryId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Client entry not found' }, { status: 404 });
    }

    const updatedEntry = await (prisma as any).$transaction(async (tx: any) => {
      await tx.clientContactPerson.deleteMany({
        where: { clientMasterId: entryId },
      });
      await tx.clientMasterProduct.deleteMany({
        where: { clientMasterId: entryId },
      });

      return tx.clientMaster.update({
        where: { id: entryId },
        data: {
          ...clientData,
          contactPersons: {
            create: contactPersons.map((cp: any, idx: number) => ({
              name: String(cp.name || '').trim(),
              designation: cp.designation ? String(cp.designation).trim() : null,
              mobileNo: cp.mobileNo ? String(cp.mobileNo).trim() : null,
              email: cp.email ? String(cp.email).trim() : null,
              sortOrder: idx,
            })),
          },
          products: {
            create: products,
          },
        },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          contactPersons: true,
          products: { orderBy: { sortOrder: 'asc' } },
        },
      });
    });

    return NextResponse.json({ success: true, data: updatedEntry });
  } catch (error) {
    console.error('Update client master error:', error);
    return NextResponse.json({ error: 'Failed to update client master entry' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (token) {
      const payload = await verifyToken(token);
      const role = String(payload?.role || '').toUpperCase();
      if (role === 'CRM') {
        return NextResponse.json({ error: 'Forbidden: CRM role has read-only access' }, { status: 403 });
      }
    }
    const { id } = await params;
    const entryId = Number(id);

    await (prisma as any).clientMaster.delete({
      where: { id: entryId },
    });

    return NextResponse.json({ success: true, message: 'Client entry deleted successfully' });
  } catch (error) {
    console.error('Delete client master error:', error);
    return NextResponse.json({ error: 'Failed to delete client entry' }, { status: 500 });
  }
}
