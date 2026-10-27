import type { Metadata, Viewport } from 'next'
import { META } from '@/content/landing'
import { ORG, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: META.title, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'privacy protocol',
    'open-source privacy',
    'stealth addresses',
    'EIP-5564',
    'privacy pools',
    'zero-knowledge proofs',
    'selective disclosure',
    'compliant privacy',
    'on-chain privacy',
    'humanitarian cash transfers',
  ],
  authors: [{ name: ORG.name, url: ORG.url }],
  creator: SITE_NAME,
  publisher: ORG.name,
  category: 'technology',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: META.ogTitle,
    description: META.ogDescription,
    url: '/',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: META.ogTitle,
    description: META.ogDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // the wallet app's bar; the public site sets its own in app/(marketing)/layout.tsx
  themeColor: '#10b981',
}

/**
 * Root layout. Fonts, styles and structured data for the public site live in
 * `app/(marketing)/layout.tsx`; the wallet app's providers in `app/(app)/layout.tsx`.
 * Both stylesheets scroll smoothly, so `data-scroll-behavior` lets Next turn that
 * off during route changes.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
