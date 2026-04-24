import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const units = await prisma.productUnit.findMany();
        let updatedCount = 0;

        for (const unit of units) {
            const match = unit.name.match(/(\d+)\s*Seater/i);
            if (match) {
                const extractedCapacity = parseInt(match[1], 10);
                if (unit.capacity !== extractedCapacity) {
                    await prisma.productUnit.update({
                        where: { id: unit.id },
                        data: { capacity: extractedCapacity }
                    });
                    updatedCount++;
                }
            }
        }

        return NextResponse.json({ message: `Successfully updated ${updatedCount} units.`, updatedCount });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
