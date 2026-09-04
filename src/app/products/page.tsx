import { Metadata } from "next";
import { Suspense } from "react";
import { seoConfig } from "@/config/seo";
import { StructuredData } from "@/components/structured-data";
import ProductsClient from "./products-client";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: seoConfig.pages.products.title,
  description: seoConfig.pages.products.description,
  alternates: { canonical: `${seoConfig.baseUrl}/products` },
  openGraph: {
    title: seoConfig.pages.products.title,
    description: seoConfig.pages.products.description,
    url: `${seoConfig.baseUrl}/products`,
    type: "website",
    images: [{ url: `${seoConfig.baseUrl}/og-image.jpg`, width: 1200, height: 630, alt: "SSPACIA Workspaces & Desks Ahmedabad" }],
  },
};

export interface ProductImage {
  id: number;
  url: string;
  alt: string | null;
  isPrimary: boolean;
}

export interface PricingPlan {
  id: number;
  durationTypeId: number;
  type: string;
  price: string;
  oldPrice: string | null;
  isActive: boolean;
}

export interface ProductLocation {
  id: number;
  name: string;
  slug: string;
  cityId: number;
  area: string | null;
  address: string | null;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  typeId: number;
  categoryId: number;
  accessTimeId: number | null;
  capacity: number | null;
  complementaryMeetingHours: number | null;
  description: string | null;
  isActive: boolean;
  isFeatured: boolean;
  location: ProductLocation;
  category?: { id?: number; name?: string; slug?: string; displayName?: string } | null;
  type?: { id?: number; name?: string; displayName?: string } | null;
  images: ProductImage[];
  pricingPlans: PricingPlan[];
  amenities: { amenity: Amenity }[];
}

export interface City {
  id: number;
  name: string;
  slug: string;
}

export interface Amenity {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
}

async function getCities(): Promise<City[]> {
  try {
    return await prisma.city.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true }
    });
  } catch (err) {
    console.error("[ProductsPage] City fetch error:", err);
    return [];
  }
}

async function getCategories() {
  try {
    return await prisma.spaceCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, displayName: true }
    });
  } catch (err) {
    console.error("[ProductsPage] Category fetch error:", err);
    return [];
  }
}

async function getProductTypes() {
  try {
    return await prisma.productType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, displayName: true }
    });
  } catch (err) {
    console.error("[ProductsPage] ProductType fetch error:", err);
    return [];
  }
}

async function getAmenities(): Promise<Amenity[]> {
  try {
    return await prisma.amenity.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true, icon: true }
    });
  } catch (err) {
    console.error("[ProductsPage] Amenity fetch error:", err);
    return [];
  }
}

interface PrismaPricingPlan extends Omit<PricingPlan, 'price' | 'oldPrice' | 'type'> {
  price: { toString(): string };
  oldPrice: { toString(): string } | null;
  durationType: { name: string };
}

async function getProducts(): Promise<Product[]> {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        location: { select: { id: true, name: true, slug: true, cityId: true, area: true, address: true } },
        category: { select: { id: true, name: true, displayName: true } },
        type: { select: { id: true, name: true, displayName: true } },
        images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
        pricingPlans: { where: { isActive: true }, include: { durationType: true } },
        amenities: {
          include: {
            amenity: true
          }
        }
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return (products.map((p) => ({
      ...p,
      pricingPlans: (p.pricingPlans as PrismaPricingPlan[]).map((pp) => ({
        ...pp,
        type: pp.durationType.name,
        price: pp.price.toString(),
        oldPrice: pp.oldPrice ? pp.oldPrice.toString() : null,
      })),
    })) as unknown) as Product[];
  } catch (error) {
    console.error("[ProductsPage] Prisma error:", error);
    return [];
  }
}

export default async function ProductsPage() {
  const [products, cities, amenities, categories, productTypes] = await Promise.all([
    getProducts(),
    getCities(),
    getAmenities(),
    getCategories(),
    getProductTypes()
  ]);

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": seoConfig.baseUrl,
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Workspaces & Desks",
        "item": `${seoConfig.baseUrl}/products`,
      },
    ],
  };

  return (
    <>
      <StructuredData data={breadcrumbSchema} />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading workspaces...</div>}>
        <ProductsClient 
          products={products} 
          cities={cities} 
          amenities={amenities} 
          categories={categories.map(c => ({ id: c.id, name: c.displayName }))}
          productTypes={productTypes.map(t => ({ id: t.id, name: t.displayName }))}
        />
      </Suspense>
    </>
  );
}
