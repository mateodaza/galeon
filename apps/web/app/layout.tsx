import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import { cookieToInitialState } from 'wagmi'
import { config } from '@/lib/wagmi'
import { Providers } from '@/components/providers'
import { DeepSeaGradient } from '@/components/landing/deep-sea-gradient'
import './globals.css'

export const metadata: Metadata = {
  title: 'Galeon',
  description: 'Your payments. Your treasure. Hidden in plain sight.',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'Galeon',
    description: 'Your payments. Your treasure. Hidden in plain sight.',
    url: 'https://galeon.xyz',
    siteName: 'Galeon',
    images: [
      {
        url: '/galeon-cool-graphic.png',
        width: 1200,
        height: 630,
        alt: 'Galeon - Private Payments',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Galeon',
    description: 'Your payments. Your treasure. Hidden in plain sight.',
    images: ['/galeon-cool-graphic.png'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#10b981',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const cookies = headersList.get('cookie')
  const initialState = cookieToInitialState(config, cookies)

  return (
    <html lang="en" style={{ backgroundColor: '#020617' }}>
      <body className="min-h-screen antialiased">
        {/* Global gradient - persists across page navigations */}
        {/* bg-slate-950 provides fallback color while WebGL canvas initializes */}
        <div className="fixed inset-0 -z-10 bg-slate-950">
          <DeepSeaGradient variant="ocean" intensity="calm" />
        </div>
        <Providers initialState={initialState}>{children}</Providers>
      </body>
    </html>
  )
}
