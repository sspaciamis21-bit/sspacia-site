import { Metadata } from "next";
import { seoConfig } from "../config/seo";
import { siteConfig } from "../config/site";
import { StructuredData } from "../components/structured-data";
import HomeClient from "./home-client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: seoConfig.pages.home.title,
  description: seoConfig.pages.home.description,
  alternates: { canonical: seoConfig.baseUrl },
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
