import { Metadata } from "next";
import { seoConfig } from "@/config/seo";
import ProductsClient from "./products-client";
import prisma from "@/lib/prisma";

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
  locationId?: number;
  images: ProductImage[];
  pricingPlans: PricingPlan[];
  amenities: { amenity: Amenity }[];
  category?: { id: number; name: string; slug?: string };
  type?: { id: number; name: string };
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

// ─── Data Fetching ──────────────────────────────────────────

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

  return (
    <ProductsClient 
      products={products} 
      cities={cities} 
      amenities={amenities} 
      categories={categories.map(c => ({ id: c.id, name: c.displayName }))}
      productTypes={productTypes.map(t => ({ id: t.id, name: t.displayName }))}
    />
  );
}
