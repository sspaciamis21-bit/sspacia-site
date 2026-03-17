import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.wixstatic.com",
      },
    ],
  },
   output: 'standalone', // ✅ Critical for VPS deployment
  poweredByHeader: false,
  compress: true,
  env: {
    APPS_SCRIPT_URL:`https://script.google.com/macros/s/AKfycbwybDS3UOAwsqfHwhbCJLTl0dsTD_sq-u5OwYdIcb_unw5lrWHxtf97P9zc03RKWB5V5Q/exec`,
    APPS_SCRIPT_TOKEN:`6869ff576b8b0e210637b6a57afd39449c0abbc730fc07d09c626598d77b597c`,
  }
};

export default nextConfig;
