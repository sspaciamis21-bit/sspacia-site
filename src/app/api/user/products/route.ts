import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
    try {
        const auth = await requireAuth();
        if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const products = await prisma.product.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                location: { select: { name: true } },
                pricingPlans: {
                    where: { isActive: true },
                    select: {
                        id: true,
                        price: true,
                        durationTypeId: true,
                        durationType: { select: { name: true, displayName: true } }
                    }
                },
                units: {
                    select: {
                        id: true,
                        name: true,
                        capacity: true,
                        description: true
                    }
                }
            }
        });

        return NextResponse.json({ data: products });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
