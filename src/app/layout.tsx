import "reflect-metadata";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { siteConfig } from "../config/site";
import { StructuredData } from "../components/structured-data";
import { seoConfig } from "../config/seo";
import { AuthProvider } from "../context/AuthContext";
import { SidebarProvider } from "../context/SidebarContext";
import { MainWrapper } from "../components/main-wrapper";
import { VisitorChatWidget } from "../components/ui/visitor-chat-widget";
import { TopAnnouncementBar } from "../components/ui/top-announcement-bar";
import { RequestVisitTrigger } from "../components/ui/request-visit-trigger";
import { ForcePasswordChangeModal } from "../components/auth/force-password-change-modal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const siteUrl = seoConfig.baseUrl;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#1ab0bc",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: siteUrl,
  },
  title: {
    default: seoConfig.defaultTitle,
    template: seoConfig.titleTemplate,
  },
  description: seoConfig.description,
  verification: {
    google: "lFuDpBl6XZCriYrk73hlTwVGVkaNjsnZgGSuXZd6yeE",
  },
  keywords: seoConfig.keywords,
  authors: [{ name: "SSPACIA Coworking", url: siteUrl }],
  creator: "SSPACIA Coworking",
  publisher: "SSPACIA Coworking",
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/SspaciaLogo.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    siteName: seoConfig.siteName,
    title: seoConfig.defaultTitle,
    description: seoConfig.description,
    images: [
      {
        url: `${siteUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: "SSPACIA Coworking Ahmedabad - Top Coworking Spaces",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: seoConfig.defaultTitle,
    description: seoConfig.description,
    site: seoConfig.twitterHandle,
    creator: seoConfig.twitterHandle,
    images: [`${siteUrl}/og-image.jpg`],
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
  other: {
    "geo.region": "IN-GJ",
    "geo.placename": "Ahmedabad",
    "geo.position": "23.0349279;72.5413010",
    "ICBM": "23.0349279, 72.5413010",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 1. WebSite Schema with Sitelinks SearchBox
  const websiteData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    "name": "SSPACIA Coworking",
    "url": siteUrl,
    "description": seoConfig.description,
    "publisher": {
      "@id": `${siteUrl}/#organization`,
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${siteUrl}/products?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  // 2. Organization Schema for Knowledge Graph
  const organizationData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    "name": siteConfig.site.name,
    "legalName": "SSPACIA Coworking Solutions Ltd.",
    "url": siteUrl,
    "logo": `${siteUrl}/SspaciaLogo.png`,
    "image": `${siteUrl}/og-image.jpg`,
    "description": siteConfig.site.description,
    "email": siteConfig.site.contact.email,
    "telephone": `+91${siteConfig.site.contact.phone}`,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Premier House, Bodakdev, SG Highway",
      "addressLocality": "Ahmedabad",
      "addressRegion": "Gujarat",
      "postalCode": "380054",
      "addressCountry": "IN",
    },
    "contactPoint": [
      {
        "@type": "ContactPoint",
        "telephone": `+91${siteConfig.site.contact.phone}`,
        "contactType": "sales",
        "email": siteConfig.site.contact.email,
        "availableLanguage": ["English", "Hindi", "Gujarati"],
        "areaServed": "IN",
      },
    ],
    "alternateName": ["SSPACIA", "SSPACIA India", "SSPACIA Coworking Ahmedabad"],
    "sameAs": [
      "https://www.sspacia.com",
      "https://sspacia.in",
      siteConfig.site.social.facebook,
      siteConfig.site.social.instagram,
      siteConfig.site.social.youtube,
    ],
  };

  // 3. SiteNavigationElement Schema for Sitelinks
  const navigationData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": [
      {
        "@type": "SiteNavigationElement",
        "position": 1,
        "name": "Co-working Spaces",
        "description": "Shared desks, hot desks, and private cabins across Ahmedabad.",
        "url": `${siteUrl}/coworking-spaces`,
      },
      {
        "@type": "SiteNavigationElement",
        "position": 2,
        "name": "Guest Spaces & Meeting Rooms",
        "description": "Hourly conference rooms, meeting spaces, and day passes.",
        "url": `${siteUrl}/guest-spaces`,
      },
      {
        "@type": "SiteNavigationElement",
        "position": 3,
        "name": "Workspaces & Pricing Plans",
        "description": "Flexible pricing and plans for individuals and enterprise teams.",
        "url": `${siteUrl}/products`,
      },
      {
        "@type": "SiteNavigationElement",
        "position": 4,
        "name": "Schedule a Tour",
        "description": "Book a free guided tour of SSPACIA coworking centers in Ahmedabad.",
        "url": `${siteUrl}/book-online`,
      },
      {
        "@type": "SiteNavigationElement",
        "position": 5,
        "name": "Workspace Gallery",
        "description": "Explore photos and interior tours of our premier centers.",
        "url": `${siteUrl}/gallery`,
      },
      {
        "@type": "SiteNavigationElement",
        "position": 6,
        "name": "About SSPACIA",
        "description": "Our mission to provide collaborative, productive workspace environments.",
        "url": `${siteUrl}/about`,
      },
      {
        "@type": "SiteNavigationElement",
        "position": 7,
        "name": "Contact Us",
        "description": "Get in touch with the SSPACIA community management team.",
        "url": `${siteUrl}/contact`,
      },
    ],
  };

  // 4. LocalBusiness / CoworkingSpace Schema for Ahmedabad Centers
  const localBusinessData = [
    {
      "@context": "https://schema.org",
      "@type": "CoworkingSpace",
      "@id": `${siteUrl}/#location-agarwal`,
      "name": "SSPACIA Coworking – CG Road Agarwal Complex",
      "url": `${siteUrl}/products`,
      "telephone": `+91${siteConfig.site.contact.phone}`,
      "email": siteConfig.site.contact.email,
      "image": `${siteUrl}/Agarwal_images/Reception%20Area.jpg`,
      "priceRange": "₹₹",
      "openingHours": "Mo-Su 00:00-23:59",
      "currenciesAccepted": "INR",
      "paymentAccepted": "Cash, Credit Card, Debit Card, UPI, Net Banking",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Agarwal Complex, CG Road, Navrangpura",
        "addressLocality": "Ahmedabad",
        "addressRegion": "Gujarat",
        "postalCode": "380009",
        "addressCountry": "IN",
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 23.0349279,
        "longitude": 72.5413010,
      },
      "hasMap": "https://maps.app.goo.gl/nv4fsViv3n5JnZKP6",
      "sameAs": [siteConfig.site.social.facebook, siteConfig.site.social.instagram],
    },
    {
      "@context": "https://schema.org",
      "@type": "CoworkingSpace",
      "@id": `${siteUrl}/#location-mercardo`,
      "name": "SSPACIA Coworking – CG Road Mercardo",
      "url": `${siteUrl}/products`,
      "telephone": `+91${siteConfig.site.contact.phone}`,
      "email": siteConfig.site.contact.email,
      "image": `${siteUrl}/IMAGES_SSPACIA/MERCADO%20IMAGES/Mercado%20reception.jpg`,
      "priceRange": "₹₹",
      "openingHours": "Mo-Su 00:00-23:59",
      "currenciesAccepted": "INR",
      "paymentAccepted": "Cash, Credit Card, Debit Card, UPI, Net Banking",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Mercardo, CG Road, Navrangpura",
        "addressLocality": "Ahmedabad",
        "addressRegion": "Gujarat",
        "postalCode": "380009",
        "addressCountry": "IN",
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 23.0349279,
        "longitude": 72.5413010,
      },
      "hasMap": "https://maps.app.goo.gl/hvfuXehGcpgP1FfBA",
      "sameAs": [siteConfig.site.social.facebook, siteConfig.site.social.instagram],
    },
    {
      "@context": "https://schema.org",
      "@type": "CoworkingSpace",
      "@id": `${siteUrl}/#location-premier`,
      "name": "SSPACIA Coworking – SG Highway Premier House",
      "url": `${siteUrl}/products`,
      "telephone": `+91${siteConfig.site.contact.phone}`,
      "email": siteConfig.site.contact.email,
      "image": `${siteUrl}/IMAGES_SSPACIA/PREMIER%20HOUSE/Reception.JPG`,
      "priceRange": "₹₹",
      "openingHours": "Mo-Su 00:00-23:59",
      "currenciesAccepted": "INR",
      "paymentAccepted": "Cash, Credit Card, Debit Card, UPI, Net Banking",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Premier House, Bodakdev, SG Highway",
        "addressLocality": "Ahmedabad",
        "addressRegion": "Gujarat",
        "postalCode": "380054",
        "addressCountry": "IN",
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 23.0447083,
        "longitude": 72.4965942,
      },
      "hasMap": "https://maps.app.goo.gl/ZJ948unE5tiks47RA",
      "sameAs": [siteConfig.site.social.facebook, siteConfig.site.social.instagram],
    },
  ];

  return (
    <html lang="en">
      <head>
        <StructuredData data={websiteData} />
        <StructuredData data={organizationData} />
        <StructuredData data={navigationData} />
        {localBusinessData.map((location, i) => (
          <StructuredData key={i} data={location} />
        ))}
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${geistSans.variable} ${geistMono.variable} font-sans bg-[#FBF9F8] text-[#1B1C1C] antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <SidebarProvider>
            <TopAnnouncementBar />
            <MainWrapper>{children}</MainWrapper>
            <VisitorChatWidget />
            <RequestVisitTrigger />
            <ForcePasswordChangeModal />
            <Toaster position="top-right" />
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
