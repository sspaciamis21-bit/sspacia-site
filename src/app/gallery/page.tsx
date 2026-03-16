import { Metadata } from "next";
import { seoConfig } from "../../config/seo";
import GalleryClient from "./gallery-client";

export const metadata: Metadata = {
  title: seoConfig.pages.gallery.title,
  description: seoConfig.pages.gallery.description,
};

export default function GalleryPage() {
  return <GalleryClient />;
}
