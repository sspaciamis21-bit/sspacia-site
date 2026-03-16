import { Metadata } from "next";
import { seoConfig } from "@/config/seo";
import ProductsClient from "./products-client";

export const metadata: Metadata = {
  title: seoConfig.pages.products.title,
  description: seoConfig.pages.products.description,
};

export default function ProductsPage() {
  return <ProductsClient />;
}
