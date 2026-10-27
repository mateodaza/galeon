import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import { Lockup } from '@/components/brand/lockup'

/** Kept out of search, and no canonical: the root's would point this page at the home page. */
export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
  alternates: { canonical: null },
}

/** The browser's bar takes the paper, as on the public site. */
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F2EEE6' },
    { media: '(prefers-color-scheme: dark)', color: '#0B1214' },
  ],
}

/**
 * Any address with no page. It renders in the root layout, outside the public
 * site's styles, so it carries its own paper and ink (light or dark by the
 * system's scheme) and one way back.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col justify-center bg-[#f2eee6] px-6 py-24 text-[#0e1a26] [@media(prefers-color-scheme:dark)]:bg-[#0b1214] [@media(prefers-color-scheme:dark)]:text-[#e8edec]">
      <div className="mx-auto w-full max-w-xl">
        <Link href="/" aria-label="Galeon home" className="inline-block">
          <Lockup title="" className="h-8 w-auto" />
        </Link>
        <h1 className="mt-16 text-5xl font-light tracking-tight sm:text-6xl">Page not found</h1>
        <p className="mt-6 text-lg text-[#474f56] [@media(prefers-color-scheme:dark)]:text-[#a6b1b3]">
          There is nothing at this address.
        </p>
        <Link
          href="/"
          className="mt-10 inline-flex h-12 items-center rounded-sm bg-[#0e1a26] px-6 text-[15px] font-medium text-[#f2eee6] [@media(prefers-color-scheme:dark)]:bg-[#e8edec] [@media(prefers-color-scheme:dark)]:text-[#0b1214]"
        >
          Go to the home page
        </Link>
      </div>
    </main>
  )
}
