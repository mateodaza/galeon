import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { cookieToInitialState } from 'wagmi'
import { config } from '@/lib/wagmi'
import { Providers } from '@/components/providers'
import { DeepSeaGradient } from '@/components/landing/deep-sea-gradient'

/**
 * Layout for the wallet application and internal pages.
 *
 * Carries the wagmi/AppKit providers and the deep-sea gradient, so the
 * marketing pages stay free of wallet code. Nothing under this layout is
 * meant for search engines.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const initialState = cookieToInitialState(config, headersList.get('cookie'))

  return (
    <div className="app-surface min-h-screen">
      {/* bg-slate-950 provides a fallback while the WebGL canvas initialises */}
      <div className="fixed inset-0 -z-10 bg-slate-950">
        <DeepSeaGradient variant="ocean" intensity="calm" />
      </div>
      <Providers initialState={initialState}>{children}</Providers>
    </div>
  )
}
