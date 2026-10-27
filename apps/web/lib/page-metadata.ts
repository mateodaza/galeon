import type { Metadata } from 'next'
import { SITE_NAME } from '@/lib/site'

interface PageMeta {
  /** Short title; the root template adds " · Galeon". */
  title: string
  /** Title for social cards, without the template. */
  shareTitle: string
  description: string
  path: `/${string}`
}

/**
 * Metadata for a public page. Next replaces nested objects such as
 * `openGraph` and `twitter` wholesale, so every field the root sets is
 * repeated here; the social image comes from the route's own
 * `opengraph-image.tsx` and `twitter-image.tsx`.
 */
export function pageMetadata({ title, shareTitle, description, path }: PageMeta): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: 'en_US',
      title: shareTitle,
      description,
      url: path,
    },
    twitter: { card: 'summary_large_image', title: shareTitle, description },
  }
}
