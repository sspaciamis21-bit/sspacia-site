import { Metadata } from "next";
import { seoConfig } from "../../config/seo";
import BlogClient from "./blog-client";

export const metadata: Metadata = {
  title: seoConfig.pages.blog.title,
  description: seoConfig.pages.blog.description,
  alternates: { canonical: `${seoConfig.baseUrl}/blog` },
};

export default function BlogPage() {
  return <BlogClient />;
}
