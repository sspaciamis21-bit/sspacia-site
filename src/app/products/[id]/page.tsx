import { Metadata } from 'next';
import ProductDetailClient from './product-detail-client';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const isNum = !isNaN(Number(id));
  const where = isNum ? { id: Number(id) } : { slug: id };

  try {
    const product = await prisma.product.findFirst({
      where: { ...where, isActive: true },
      select: { name: true, description: true, location: { select: { name: true } } },
    });

    if (!product) return { title: 'Workspace | SSPACIA' };

    return {
      title: `${product.name} @ ${product.location?.name || 'Ahmedabad'} | SSPACIA`,
      description: product.description || 'Explore our premium workspaces, amenities, and book your spot at SSPACIA.',
    };
  } catch {
    return { title: 'Workspace Details | SSPACIA' };
  }
}

async function getProduct(idOrSlug: string) {
  try {
    const isNum = !isNaN(Number(idOrSlug));
    const where = isNum ? { id: Number(idOrSlug) } : { slug: idOrSlug };

    const product = await prisma.product.findFirst({
      where: { ...where, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        accessTime: true,
        capacity: true,
        quantity: true,
        sdr: true,
        adv: true,
        complementaryMeetingHours: true,
        isFeatured: true,
        categoryId: true,
        typeId: true,
        location: {
          select: {
            id: true,
            name: true,
            slug: true,
            address: true,
            phone: true,
            email: true,
            mapUrl: true,
            mapEmbed: true,
            city: { select: { id: true, name: true } },
            images: {
              orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
              take: 1,
              select: { url: true, alt: true },
            },
          },
        },
        type: { select: { id: true, name: true, displayName: true } },
        category: { select: { id: true, name: true, displayName: true } },
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          select: { id: true, url: true, alt: true, isPrimary: true, sortOrder: true },
        },
        pricingPlans: {
          where: { isActive: true },
          orderBy: { price: 'asc' },
          select: { id: true, price: true, oldPrice: true, discount: true, durationType: true, durationTypeId: true },
        },
        amenities: {
          select: {
            amenity: {
              select: { id: true, name: true, icon: true },
            },
          },
        },
      },
    });

    if (!product) return null;
    return JSON.parse(JSON.stringify(product));
  } catch (err) {
    console.error('[PRODUCT_DETAIL_FETCH_ERROR]', err);
    return null;
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  return <ProductDetailClient product={product} />;
}
