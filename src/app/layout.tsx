import "reflect-metadata";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { StructuredData } from "../components/structured-data";
import { seoConfig } from "../config/seo";
import { BUSINESS } from "../config/centres";
import { ORG_ID, allCentreSchemas } from "../lib/seo-schema";
import { AuthProvider } from "../context/AuthContext";
import { SidebarProvider } from "../context/SidebarContext";
import { MainWrapper } from "../components/main-wrapper";
import { VisitorChatWidget } from "../components/ui/visitor-chat-widget";
import { TopAnnouncementBar } from "../components/ui/top-announcement-bar";
import { RequestVisitTrigger } from "../components/ui/request-visit-trigger";
import { ForcePasswordChangeModal } from "../components/auth/force-password-change-modal";
import { AgreementAlertPopup } from "../components/notifications/AgreementAlertPopup";

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
      "@id": ORG_ID,
    },
    "inLanguage": "en-IN",
  };

  // 2. Organization Schema for Knowledge Graph
  const organizationData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    "name": "SSPACIA Coworking",
    "alternateName": ["SSPACIA", "SSPACIA Coworking Ahmedabad", "Sspacia Coworking"],
    "url": siteUrl,
    "logo": `${siteUrl}/SspaciaLogo.png`,
    "image": `${siteUrl}/og-image.jpg`,
    "description": seoConfig.description,
    "email": BUSINESS.email,
    "telephone": BUSINESS.phoneE164,
    "foundingLocation": { "@type": "City", "name": "Ahmedabad" },
    "areaServed": { "@type": "City", "name": "Ahmedabad" },
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "6th Floor, Premier House, 1, Sarkhej–Gandhinagar Highway, Bodakdev",
      "addressLocality": "Ahmedabad",
      "addressRegion": "Gujarat",
      "postalCode": "380054",
      "addressCountry": "IN",
    },
    "contactPoint": [
      {
        "@type": "ContactPoint",
        "telephone": BUSINESS.phoneE164,
        "contactType": "sales",
        "email": BUSINESS.email,
        "availableLanguage": ["English", "Hindi", "Gujarati"],
        "areaServed": "IN",
      },
    ],
    "sameAs": [
      BUSINESS.social.facebook,
      BUSINESS.social.instagram,
      BUSINESS.social.linkedin,
      BUSINESS.social.youtube,
    ],
    "location": allCentreSchemas().map((c) => ({ "@id": c["@id"] })),
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
        "name": "Meeting Rooms on Rent",
        "description": "4–6 seat meeting rooms by the hour at CG Road and SG Highway.",
        "url": `${siteUrl}/meeting-rooms-ahmedabad`,
      },
      {
        "@type": "SiteNavigationElement",
        "position": 8,
        "name": "Board Rooms on Rent",
        "description": "11–14 seat board rooms with video conferencing, by the hour.",
        "url": `${siteUrl}/board-rooms-ahmedabad`,
      },
      {
        "@type": "SiteNavigationElement",
        "position": 9,
        "name": "Event Space",
        "description": "40-seat event and training room at Premier House, SG Highway.",
        "url": `${siteUrl}/event-space-ahmedabad`,
      },
      {
        "@type": "SiteNavigationElement",
        "position": 10,
        "name": "Managed Office Space",
        "description": "Private cabins for 4–12 people with everything managed.",
        "url": `${siteUrl}/managed-office-space-ahmedabad`,
      },
      {
        "@type": "SiteNavigationElement",
        "position": 11,
        "name": "Our Centres",
        "description": "Agarwal Complex, Mercado and Premier House.",
        "url": `${siteUrl}/locations`,
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

  // 4. CoworkingSpace schema per centre, from the verified data in src/config/centres.ts
  const localBusinessData = allCentreSchemas();

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
            <AgreementAlertPopup />
            <Toaster position="top-right" />
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
