import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { siteConfig } from "../config/site";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { StructuredData } from "../components/structured-data";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { seoConfig } from "../config/seo";

const siteUrl = seoConfig.baseUrl;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: seoConfig.defaultTitle,
    template: seoConfig.titleTemplate,
  },
  description: seoConfig.description,
  keywords: seoConfig.keywords,
  authors: [{ name: "SSPACIA" }],
  creator: "SSPACIA",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    siteName: seoConfig.siteName,
    title: seoConfig.defaultTitle,
    description: seoConfig.description,
    images: [
      {
        url: seoConfig.ogImage,
        width: 1200,
        height: 630,
        alt: seoConfig.siteName,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: seoConfig.defaultTitle,
    description: seoConfig.description,
    images: [seoConfig.ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": siteConfig.site.name,
    "url": siteUrl,
    "logo": `${siteUrl}/SspaciaLogo.png`,
    "description": siteConfig.site.description,
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": siteConfig.site.contact.phone,
      "contactType": "sales",
      "email": siteConfig.site.contact.email,
    },
    "sameAs": [
      siteConfig.site.social.facebook,
      siteConfig.site.social.instagram,
    ],
  };

  return (
    <html lang="en">
      <head>
        <StructuredData data={organizationData} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-[#F8F9FA] text-[#212121] antialiased`}
      >
        <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#F8F9FA] via-[#F8F9FA] to-[#F8F9FA]">
          <Header />
          <main className="flex-1 mx-auto w-full max-w-6xl px-4 pb-16 pt-20 sm:px-6 lg:px-8">
            {children}
          </main>
          <Footer />
        </div>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
