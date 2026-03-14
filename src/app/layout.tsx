import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { siteConfig } from "../config/site";
import { Header } from "../components/header";
import { Footer } from "../components/footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: siteConfig.pages.home.title,
  description: siteConfig.site.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-[#F8F9FA] text-[#212121] antialiased`}
      >
        <div className="min-h-screen bg-gradient-to-b from-[#F8F9FA] via-[#F8F9FA] to-[#F8F9FA]">
          <Header />
          <main className="mx-auto max-w-6xl px-4 pb-16 pt-25 sm:px-6 lg:px-8">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
