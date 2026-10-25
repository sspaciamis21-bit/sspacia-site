import type { NextConfig } from "next";

process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || '4';
process.env.TOKIO_WORKER_THREADS = process.env.TOKIO_WORKER_THREADS || '2';

/** The one canonical origin. Every other host 301s here (see redirects()). */
const CANONICAL_HOST = "sspacia.com";
const ALIAS_HOSTS = [
  "www.sspacia.com",
  "sspacia.in",
  "www.sspacia.in",
  "sspacia.ind.in",
  "www.sspacia.ind.in",
];

/** App areas that must never be cached by a browser, proxy or CDN. */
const NO_STORE_PATHS = [
  "/api/:path*",
  "/admin/:path*",
  "/manager/:path*",
  "/dashboard/:path*",
  "/hr/:path*",
  "/checkout/:path*",
  "/checkout",
  "/booking/:path*",
  "/login",
  "/signup",
  "/uploads/:path*",
];

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
  async redirects() {
    return [
      // Domain consolidation: sspacia.in, sspacia.ind.in and www.* → https://sspacia.com (301).
      ...ALIAS_HOSTS.map((host) => ({
        source: "/:path*",
        has: [{ type: "host" as const, value: host }],
        destination: `https://${CANONICAL_HOST}/:path*`,
        permanent: true,
      })),
      // Legacy misspelt centre slug.
      {
        source: "/virtual-office/mercardo",
        destination: "/virtual-office/mercado",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      // Private app areas: never cached anywhere.
      ...NO_STORE_PATHS.map((source) => ({
        source,
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      })),
      // Internal files that should not be indexed even if linked.
      {
        source: "/:all*(pdf|zip|csv|xlsx|docx)",
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      // Static images under /public: let browsers and the CDN keep them for a day.
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico)",
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
      // Everything else (marketing pages): sensible defaults, no forced no-store.
      {
        source: "/:path*",
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
