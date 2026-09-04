import { Metadata } from "next";
import { seoConfig } from "../../config/seo";
import { StructuredData } from "../../components/structured-data";
import AboutClient from "./about-client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: seoConfig.pages.about.title,
  description: seoConfig.pages.about.description,
  alternates: { canonical: `${seoConfig.baseUrl}/about` },
  openGraph: {
    title: seoConfig.pages.about.title,
    description: seoConfig.pages.about.description,
    url: `${seoConfig.baseUrl}/about`,
    type: "website",
    images: [{ url: `${seoConfig.baseUrl}/og-image.jpg`, width: 1200, height: 630, alt: "About SSPACIA Coworking Ahmedabad" }],
  },
};

export default function AboutPage() {
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
        "name": "About Us",
        "item": `${seoConfig.baseUrl}/about`,
      },
    ],
  };

  return (
    <>
      <StructuredData data={breadcrumbSchema} />
      <AboutClient />
    </>
  );
}
