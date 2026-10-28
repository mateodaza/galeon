import type { Metadata } from 'next'
import { LegacyBanner } from '@/components/legacy/legacy-banner'
import { LEGACY_PATHS } from '@/components/legacy/legacy-links'
import { SITE_NAME } from '@/lib/site'

const TITLE = 'Previous site'

/**
 * The previous public site, kept as it was under /legacy. It lives inside the
 * app group for the wallet providers and the deep-sea gradient the old pages
 * were built on. Not for search engines, and no canonical: the root layout's
 * canonical would otherwise point these pages at the current home page. Its
 * share cards say what it is, so a shared link does not preview as the home page.
 */
export const metadata: Metadata = {
  // The root template adds the site name to the default; the pages below get this template.
  title: { default: TITLE, template: `%s · ${TITLE} · ${SITE_NAME}` },
  description: 'Your payments. Your treasure. Hidden in plain sight.',
  alternates: { canonical: null },
  robots: { index: false, follow: false },
  openGraph: { type: 'website', siteName: SITE_NAME, title: TITLE, url: LEGACY_PATHS.home },
  twitter: { card: 'summary', title: TITLE },
}

export default function LegacyLayout({ children }: { children: React.ReactNode }) {
  return (
    // Moves the old floating nav (a fixed header) below the banner.
    <div className="overflow-x-clip [&_header.fixed]:top-[4.25rem] sm:[&_header.fixed]:top-12 lg:[&_header.fixed]:top-11">
      <LegacyBanner />
      {children}
    </div>
  )
}
