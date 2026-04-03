import { Metadata } from 'next';
import ProductDetailClient from './product-detail-client';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Workspace Details | SSPACIA',
  description: 'Explore our premium workspaces, amenities, and book your spot.',
};

async function getProduct(id: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/public/products/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch (err) {
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
