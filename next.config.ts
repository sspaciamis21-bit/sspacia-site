import type { NextConfig } from "next";

process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || '4';
process.env.TOKIO_WORKER_THREADS = process.env.TOKIO_WORKER_THREADS || '2';

const nextConfig: NextConfig = {
  experimental: {
    cpus: 4,
    workerThreads: false,
  },
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
  serverExternalPackages: ["@prisma/client", "node-cron"],
  env: {
    APPS_SCRIPT_URL: process.env.APPS_SCRIPT_URL,
    APPS_SCRIPT_TOKEN: process.env.APPS_SCRIPT_TOKEN,
    APPS_SCRIPT_DRIVE_URL: process.env.APPS_SCRIPT_DRIVE_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
