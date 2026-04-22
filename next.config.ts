import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.wixstatic.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
   output: 'standalone', // ✅ Critical for VPS deployment
  poweredByHeader: false,
  serverExternalPackages: ["@prisma/client"],
  env: {
    APPS_SCRIPT_URL: `https://script.google.com/macros/s/AKfycbwybDS3UOAwsqfHwhbCJLTl0dsTD_sq-u5OwYdIcb_unw5lrWHxtf97P9zc03RKWB5V5Q/exec`,
    APPS_SCRIPT_TOKEN: `6869ff576b8b0e210637b6a57afd39449c0abbc730fc07d09c626598d77b597c`,
    APPS_SCRIPT_DRIVE_URL: `https://script.google.com/macros/s/AKfycbwkLpPm6Y-vapzT2l4fmRi2FJSLWK4N1kxrxgI7iqnA3xh41xNoOD1l4EfIFIggdd35/exec`,
    DATABASE_URL: `mysql://u434618106_vrajesh_test:ShriShyam%231234@148.222.53.51:3306/u434618106_sspacia_test`,
    JWT_SECRET: `201ab5f0e414254ad0ef94413cd3ed1e5ed6da188f9e198cd5025b5540dfa8d1`,
    CLOUDINARY_CLOUD_NAME: `dmgwi8dqd`,
    CLOUDINARY_API_KEY: `251964983343393`,
    CLOUDINARY_API_SECRET: `iP92jGqqYqDO40ct5S20Z6wal6Y`,
    RAZORPAY_KEY_ID: `rzp_test_SXhF34L0bR5884`,
    RAZORPAY_KEY_SECRET: `4nzpHTB0EoAeSbXko65Ttez8`,
  }
};

export default nextConfig;
