import { Metadata } from "next";
import { seoConfig } from "../../config/seo";
import BlogClient from "./blog-client";

export const metadata: Metadata = {
  title: seoConfig.pages.blog.title,
  description: seoConfig.pages.blog.description,
};

export default function BlogPage() {
  return <BlogClient />;
}
