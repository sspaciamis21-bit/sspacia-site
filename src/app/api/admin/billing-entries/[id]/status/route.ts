import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entryId = Number(id);

    const body = await request.json();
    const { status, remarks } = body;

    const updated = await (prisma as any).clientMaster.update({
      where: { id: entryId },
      data: {
        status,
        ...(remarks !== undefined ? { remarks: remarks ? String(remarks).trim() : null } : {}),
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        contactPersons: true,
        attachedInvoice: true,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update status error:', error);
    return NextResponse.json({ error: 'Failed to update entry status' }, { status: 500 });
  }
}
