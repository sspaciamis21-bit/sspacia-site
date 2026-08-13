import { Metadata } from "next";
import { seoConfig } from "../../config/seo";
import ContactClient from "./contact-client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: seoConfig.pages.contact.title,
  description: seoConfig.pages.contact.description,
  alternates: { canonical: `${seoConfig.baseUrl}/contact` },
};

export default function ContactPage() {
  return <ContactClient />;
  }
