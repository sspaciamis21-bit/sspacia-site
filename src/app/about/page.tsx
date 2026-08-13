import { Metadata } from "next";
import { seoConfig } from "../../config/seo";
import AboutClient from "./about-client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: seoConfig.pages.about.title,
  description: seoConfig.pages.about.description,
  alternates: { canonical: `${seoConfig.baseUrl}/about` },
};

export default function AboutPage() {
  return <AboutClient />;
}
