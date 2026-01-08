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
        <div className="fixed inset-0 -z-10">
          <DeepSeaGradient variant="ocean" intensity="calm" />
        </div>
        <Providers initialState={initialState}>{children}</Providers>
      </body>
    </html>
  )
}
