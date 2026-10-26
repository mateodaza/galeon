import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

/**
 * Only the marketing pages are meant for search engines. The wallet app and
 * internal pitch pages are reachable but should not be indexed.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/about', '/roadmap'],
        disallow: [
          '/dashboard',
          '/setup',
          '/pay',
          '/receive',
          '/collect',
          '/pool',
          '/reports',
          '/history',
          '/receipt',
          '/verify',
          '/covenant',
          '/pitch',
          '/demo-pitch',
          '/stellar-pitch',
          '/thumbnail',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
