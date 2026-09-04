import { Metadata } from "next";
import { seoConfig } from "../../config/seo";
import { StructuredData } from "../../components/structured-data";
import BlogClient from "./blog-client";

export const metadata: Metadata = {
  title: seoConfig.pages.blog.title,
  description: seoConfig.pages.blog.description,
  alternates: { canonical: `${seoConfig.baseUrl}/blog` },
  openGraph: {
    title: seoConfig.pages.blog.title,
    description: seoConfig.pages.blog.description,
    url: `${seoConfig.baseUrl}/blog`,
    type: "website",
    images: [{ url: `${seoConfig.baseUrl}/og-image.jpg`, width: 1200, height: 630, alt: "SSPACIA Coworking Blog & Insights" }],
  },
};

export default function BlogPage() {
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
        "name": "Blog & Insights",
        "item": `${seoConfig.baseUrl}/blog`,
      },
    ],
  };

  return (
    <>
      <StructuredData data={breadcrumbSchema} />
      <BlogClient />
    </>
  );
}
