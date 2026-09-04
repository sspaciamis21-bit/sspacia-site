import { Metadata } from "next";
import { seoConfig } from "../../config/seo";
import { StructuredData } from "../../components/structured-data";
import BookOnlineClient from "./book-online-client";

export const metadata: Metadata = {
  title: seoConfig.pages.bookOnline.title,
  description: seoConfig.pages.bookOnline.description,
  alternates: { canonical: `${seoConfig.baseUrl}/book-online` },
  openGraph: {
    title: seoConfig.pages.bookOnline.title,
    description: seoConfig.pages.bookOnline.description,
    url: `${seoConfig.baseUrl}/book-online`,
    type: "website",
    images: [{ url: `${seoConfig.baseUrl}/og-image.jpg`, width: 1200, height: 630, alt: "Book a Tour at SSPACIA Coworking Ahmedabad" }],
  },
};

export default function BookOnlinePage() {
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
        "name": "Schedule a Tour",
        "item": `${seoConfig.baseUrl}/book-online`,
      },
    ],
  };

  return (
    <>
      <StructuredData data={breadcrumbSchema} />
      <BookOnlineClient />
    </>
  );
}
