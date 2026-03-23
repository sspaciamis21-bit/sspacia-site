import { Metadata } from "next";
import { seoConfig } from "../../config/seo";
import BookOnlineClient from "./book-online-client";

export const metadata: Metadata = {
  title: seoConfig.pages.bookOnline.title,
  description: seoConfig.pages.bookOnline.description,
  alternates: { canonical: `${seoConfig.baseUrl}/book-online` },
};

export default function BookOnlinePage() {
  return <BookOnlineClient />;
}
