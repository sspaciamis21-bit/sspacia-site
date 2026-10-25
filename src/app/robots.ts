import { MetadataRoute } from 'next';
import { seoConfig } from '@/config/seo';

/**
 * robots.txt
 *
 * Marketing pages are open to every crawler, including the AI assistants'
 * crawlers (named explicitly so a future change to the wildcard rule cannot
 * lock them out by accident). Private app areas, APIs and internal files stay
 * out of the index.
 */
const PRIVATE_PATHS = [
  '/api/',
  '/admin/',
  '/manager/',
  '/dashboard/',
  '/hr/',
  '/checkout',
  '/booking/',
  '/login',
  '/signup',
  '/uploads/',
  '/downloads/',
  '/cad-previews/',
  '/*.pdf$',
];

const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'anthropic-ai',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Bingbot',
  'DuckAssistBot',
  'Applebot',
  'Applebot-Extended',
  'meta-externalagent',
  'CCBot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: AI_CRAWLERS,
        allow: ['/', '/llms.txt'],
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: `${seoConfig.baseUrl}/sitemap.xml`,
    host: seoConfig.baseUrl,
  };
}
