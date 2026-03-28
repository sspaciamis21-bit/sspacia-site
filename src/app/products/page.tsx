import { Metadata } from "next";
import { seoConfig } from "@/config/seo";
import ProductsClient from "./products-client";
import { ProductType, SpaceCategory, AccessTime } from "@prisma/client";

export const metadata: Metadata = {
  title: seoConfig.pages.products.title,
  description: seoConfig.pages.products.description,
  alternates: { canonical: `${seoConfig.baseUrl}/products` },
};

// ─── Types ─────────────────────────────────────────────────
export interface ProductImage {
  id: number;
  url: string;
  alt: string | null;
  isPrimary: boolean;
}

export interface PricingPlan {
  id: number;
  durationType: string;
  price: string;
  oldPrice: string | null;
  isActive: boolean;
}

export interface ProductLocation {
  id: number;
  name: string;
  slug: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  type: ProductType;
  category: SpaceCategory;
  accessTime: AccessTime | null;
  capacity: number | null;
  complementaryMeetingRoom: string | null;
  description: string | null;
  isActive: boolean;
  isFeatured: boolean;
  location: ProductLocation;
  images: ProductImage[];
  pricingPlans: PricingPlan[];
}

async function fetchProducts(): Promise<Product[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/products`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export default async function ProductsPage() {
  const products = await fetchProducts();
  return <ProductsClient products={products} />;
}
