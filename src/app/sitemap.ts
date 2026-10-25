import { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';
import { seoConfig } from '@/config/seo';
import { CENTRES } from '@/config/centres';

export const revalidate = 3600;

/**
 * sitemap.xml — every indexable URL on the canonical origin, nothing else.
 * Rooms and workspaces are listed at their real pages (/products/<id>);
 * the filterable catalog views with query strings are deliberately left out.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = seoConfig.baseUrl;
  const now = new Date();

  const page = (
    path: string,
    priority: number,
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'],
    lastModified: Date = now,
  ): MetadataRoute.Sitemap[number] => ({
    url: `${baseUrl}${path}`,
    lastModified,
    changeFrequency,
    priority,
  });

  const core: MetadataRoute.Sitemap = [
    page('', 1.0, 'weekly'),
    page('/meeting-rooms-ahmedabad', 0.9, 'weekly'),
    page('/board-rooms-ahmedabad', 0.9, 'weekly'),
    page('/event-space-ahmedabad', 0.9, 'weekly'),
    page('/managed-office-space-ahmedabad', 0.9, 'weekly'),
    page('/coworking-spaces', 0.9, 'weekly'),
    page('/guest-spaces', 0.8, 'weekly'),
    page('/virtual-office', 0.8, 'monthly'),
    page('/locations', 0.8, 'monthly'),
    page('/passes', 0.7, 'monthly'),
    page('/products', 0.6, 'weekly'),
    page('/book-online', 0.7, 'monthly'),
    page('/about', 0.6, 'monthly'),
    page('/contact', 0.6, 'monthly'),
    page('/gallery', 0.5, 'monthly'),
    page('/careers', 0.4, 'monthly'),
    page('/blog', 0.6, 'weekly'),
    page('/privacy', 0.2, 'yearly'),
    page('/terms', 0.2, 'yearly'),
  ];

  const centres: MetadataRoute.Sitemap = CENTRES.flatMap((c) => [
    page(`/locations/${c.slug}`, 0.9, 'weekly'),
    page(`/virtual-office/${c.slug}`, 0.7, 'monthly'),
  ]);

  const rooms: MetadataRoute.Sitemap = CENTRES.flatMap((c) =>
    c.rooms.map((r) => page(`/products/${r.id}`, 0.7, 'weekly')),
  );

  const workspaces: MetadataRoute.Sitemap = CENTRES.flatMap((c) =>
    c.workspaces.map((w) => page(`/products/${w.id}`, 0.6, 'weekly')),
  );

  const blog: MetadataRoute.Sitemap = siteConfig.blog.posts.map((post) =>
    page(`/blog/${post.id}`, 0.5, 'monthly', new Date(post.date)),
  );

  return [...core, ...centres, ...rooms, ...workspaces, ...blog];
}
