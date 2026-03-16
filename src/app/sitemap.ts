import { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteConfig.site.externalWebsite;
  const lastModified = new Date();

  const routes = [
    '',
    '/about',
    '/products',
    '/contact',
    '/gallery',
    '/blog',
    '/book-online',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified,
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  // If there were dynamic blog posts with slugs, we would add them here.
  // Since currently we only have external blog links in siteConfig, 
  // we'll stick to the main routes.

  return routes;
}
