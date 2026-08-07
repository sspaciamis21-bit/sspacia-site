import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
    try {
        const auth = await requireAuth();
        if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const customer = await prisma.customer.findUnique({
            where: { email: auth.email as string }
        });

        if (!customer) {
            return NextResponse.json({ isVerified: false });
        }

        // Define verification as having at least one APPROVED document
        const approvedDoc = await prisma.document.findFirst({
            where: {
                customerId: customer.id,
                status: { name: 'APPROVED' }
            }
        });

        return NextResponse.json({ 
            isVerified: !!approvedDoc,
            customerId: customer.id
        });

    } catch {
        return NextResponse.json({ isVerified: false });
    }
}
