/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      name,
      slug,
      locationId,
      type,
      category,
      description,
      accessTime,
      capacity,
      quantity,
      isActive,
      isFeatured,
      pricingPlans,
      images,
    } = req.body

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        locationId,
        type,
        category,
        description,
        accessTime,
        capacity,
        quantity,
        isActive,
        isFeatured,
        pricingPlans: pricingPlans
          ? {
              create: pricingPlans.map((p: any) => ({
                durationType: p.durationType,
                price: Number(p.price),
              })),
            }
          : undefined,
        images: images?.length
          ? { create: images.map((url: string) => ({ url })) }
          : undefined,
      },
      include: { images: true, pricingPlans: true },
    })

    return res.status(200).json({ data: product })
  } catch (e) {
    return res.status(500).json({ error: 'Failed to create product' })
  }
}