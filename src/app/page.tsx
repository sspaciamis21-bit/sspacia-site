import { Metadata } from "next";
import { seoConfig } from "../config/seo";
import HomeClient from "./home-client";

export const metadata: Metadata = {
  title: seoConfig.pages.home.title,
  description: seoConfig.pages.home.description,
};

export default function Home() {
  return <HomeClient />;
}
