import { Metadata } from "next";
import { seoConfig } from "../../config/seo";
import AboutClient from "./about-client";

export const metadata: Metadata = {
  title: seoConfig.pages.about.title,
  description: seoConfig.pages.about.description,
};

export default function AboutPage() {
  return <AboutClient />;
}
