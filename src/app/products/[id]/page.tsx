import { Metadata } from 'next';
import { Suspense } from 'react';
import ProductDetailClient from './product-detail-client';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { seoConfig } from '@/config/seo';
import { StructuredData } from '@/components/structured-data';
import { breadcrumbSchema } from '@/lib/seo-schema';

export const dynamic = 'force-dynamic';

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
      select: {
        id: true,
        name: true,
        capacity: true,
        description: true,
        location: { select: { name: true, area: true } },
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1, select: { url: true } },
      },
    });

    if (!product) return { title: 'Workspace not found', robots: { index: false } };

    const where_ = [product.location?.name, product.location?.area].filter(Boolean).join(', ');
    const title = `${product.name}${product.capacity ? ` for ${product.capacity}` : ''} at ${where_ || 'SSPACIA'}, Ahmedabad`;
    const canonical = `${seoConfig.baseUrl}/products/${product.id}`;
    const description =
      product.description?.slice(0, 155) ||
      `${product.name} at SSPACIA ${product.location?.name || 'Ahmedabad'}: amenities, live availability and online booking.`;

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title: `${title} | SSPACIA`,
        description,
        url: canonical,
        type: 'website',
        images: product.images?.[0]?.url ? [{ url: product.images[0].url }] : [{ url: `${seoConfig.baseUrl}/og-image.jpg` }],
      },
    };
  } catch {
    return { title: 'Workspace Details' };
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

  const isGuestRoom = product.category?.name === 'GUEST_SPACE' || product.category?.displayName === 'Guest Space';
  const hourlyPlan = (product.pricingPlans || []).find(
    (p: { durationType?: { name?: string } }) => /hour/i.test(p.durationType?.name || ''),
  );
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${seoConfig.baseUrl}/products/${product.id}#product`,
    name: `${product.name}${product.capacity ? ` for ${product.capacity}` : ''} at SSPACIA ${product.location?.name || ''}, Ahmedabad`,
    description: product.description || undefined,
    image: (product.images || []).map((i: { url: string }) => i.url),
    brand: { '@type': 'Brand', name: 'SSPACIA' },
    category: isGuestRoom ? 'Meeting room rental' : 'Coworking space',
    ...(hourlyPlan
      ? {
          offers: {
            '@type': 'Offer',
            url: `${seoConfig.baseUrl}/products/${product.id}`,
            price: Number(hourlyPlan.price),
            priceCurrency: 'INR',
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price: Number(hourlyPlan.price),
              priceCurrency: 'INR',
              unitText: 'per hour',
              valueAddedTaxIncluded: false,
            },
            availability: 'https://schema.org/InStock',
          },
        }
      : {}),
  };
  const crumbs = breadcrumbSchema([
    isGuestRoom
      ? { name: 'Meeting rooms', path: '/meeting-rooms-ahmedabad' }
      : { name: 'Coworking spaces', path: '/coworking-spaces' },
    { name: `${product.name} – ${product.location?.name || 'Ahmedabad'}`, path: `/products/${product.id}` },
  ]);

  return (
    <>
      <StructuredData data={productSchema} />
      <StructuredData data={crumbs} />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading workspace details...</div>}>
        <ProductDetailClient product={product} />
      </Suspense>
    </>
  );
}
