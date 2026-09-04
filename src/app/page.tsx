import { Metadata } from "next";
import { seoConfig } from "../config/seo";
import { siteConfig } from "../config/site";
import { StructuredData } from "../components/structured-data";
import HomeClient from "./home-client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: {
    absolute: seoConfig.pages.home.title,
  },
  description: seoConfig.pages.home.description,
  alternates: { canonical: seoConfig.baseUrl },
  openGraph: {
    title: seoConfig.pages.home.title,
    description: seoConfig.pages.home.description,
    url: seoConfig.baseUrl,
    siteName: seoConfig.siteName,
    images: [{ url: `${seoConfig.baseUrl}/og-image.jpg`, width: 1200, height: 630, alt: "SSPACIA Coworking Ahmedabad" }],
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: seoConfig.pages.home.title,
    description: seoConfig.pages.home.description,
    images: [`${seoConfig.baseUrl}/og-image.jpg`],
  },
};

export default function Home() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": siteConfig.faq.map((item) => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer,
      },
    })),
  };

  return (
    <>
      <StructuredData data={faqSchema} />
      <HomeClient />
    </>
  );
}
