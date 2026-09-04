import { MetadataRoute } from 'next';
import { seoConfig } from '@/config/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/about',
          '/contact',
          '/products',
          '/coworking-spaces',
          '/guest-spaces',
          '/gallery',
          '/blog',
          '/blog/*',
          '/book-online',
          '/privacy',
          '/terms',
        ],
        disallow: [
          '/api/',
          '/admin/',
          '/manager/',
          '/dashboard/',
          '/checkout/',
          '/booking/',
          '/login',
          '/signup',
        ],
      },
    ],
    sitemap: `${seoConfig.baseUrl}/sitemap.xml`,
    host: seoConfig.baseUrl,
  };
}
