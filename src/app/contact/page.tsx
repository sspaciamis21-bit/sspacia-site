import { Metadata } from "next";
import { seoConfig } from "../../config/seo";
import { StructuredData } from "../../components/structured-data";
import ContactClient from "./contact-client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: seoConfig.pages.contact.title,
  description: seoConfig.pages.contact.description,
  alternates: { canonical: `${seoConfig.baseUrl}/contact` },
  openGraph: {
    title: seoConfig.pages.contact.title,
    description: seoConfig.pages.contact.description,
    url: `${seoConfig.baseUrl}/contact`,
    type: "website",
    images: [{ url: `${seoConfig.baseUrl}/og-image.jpg`, width: 1200, height: 630, alt: "Contact SSPACIA Coworking Ahmedabad" }],
  },
};

export default function ContactPage() {
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
        "name": "Contact Us",
        "item": `${seoConfig.baseUrl}/contact`,
      },
    ],
  };

  return (
    <>
      <StructuredData data={breadcrumbSchema} />
      <ContactClient />
    </>
  );
}
