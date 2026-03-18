import { siteConfig } from "@/config/site";
import CareersClient from "./careers-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: siteConfig.pages.careers.title,
  description: "Join the SSPACIA team and help us build the future of coworking in Ahmedabad.",
};

export default function CareersPage() {
  return <CareersClient />;
}
