import { Metadata } from "next";
import { seoConfig } from "../../config/seo";
import { StructuredData } from "../../components/structured-data";
import GalleryClient from "./gallery-client";

export const metadata: Metadata = {
  title: seoConfig.pages.gallery.title,
  description: seoConfig.pages.gallery.description,
  alternates: { canonical: `${seoConfig.baseUrl}/gallery` },
  openGraph: {
    title: seoConfig.pages.gallery.title,
    description: seoConfig.pages.gallery.description,
    url: `${seoConfig.baseUrl}/gallery`,
    type: "website",
    images: [{ url: `${seoConfig.baseUrl}/og-image.jpg`, width: 1200, height: 630, alt: "SSPACIA Coworking Gallery & Virtual Tour" }],
  },
};

export default function GalleryPage() {
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
        "name": "Workspace Gallery",
        "item": `${seoConfig.baseUrl}/gallery`,
      },
    ],
  };

  return (
    <>
      <StructuredData data={breadcrumbSchema} />
      <GalleryClient />
    </>
  );
}
