'use client'

/**
 * Global providers for the Galeon application.
 *
 * Wraps the app with:
 * - Reown AppKit (wallet connection)
 * - Wagmi (React hooks for Ethereum)
 * - TanStack Query (async state management)
 * - Stealth keys context
 */

import { type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAppKit } from '@reown/appkit/react'
import { WagmiProvider, type State } from 'wagmi'
import { wagmiAdapter, projectId, isWalletConfigured } from '@/lib/wagmi'
import { mantle, mantleSepolia } from '@/lib/chains'
import { StealthProvider } from '@/contexts/stealth-context'
import { NetworkGuard } from '@/components/network-guard'

/**
 * TanStack Query client instance.
 * Shared across the app for caching and deduplication.
 */
const queryClient = new QueryClient()

/**
 * Application metadata for WalletConnect.
 */
const metadata = {
  name: 'Galeon',
  description: 'Private B2B payments using stealth addresses',
  url: 'https://galeon.xyz',
  icons: ['/icon.png'],
}

/**
 * Initialize Reown AppKit only if WalletConnect is configured.
 * Without a valid projectId, the modal won't work but the app won't crash.
 */
if (isWalletConfigured) {
  createAppKit({
    adapters: [wagmiAdapter],
    projectId: projectId!,
    networks: [mantle, mantleSepolia],
    defaultNetwork: mantle,
    metadata,
    features: {
      analytics: true,
      email: false,
      socials: false,
      emailShowWallets: false,
    },
    themeMode: 'dark',
    themeVariables: {
      '--w3m-accent': '#10b981', // Emerald-500 for Galeon branding
      '--w3m-border-radius-master': '8px',
    },
  })
}

interface ProvidersProps {
  children: ReactNode
  initialState?: State
}

/**
 * Providers component that wraps the application.
 *
 * @param children - Child components to wrap
 * @param initialState - Optional wagmi initial state from cookies (SSR)
 */
export function Providers({ children, initialState }: ProvidersProps) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <StealthProvider>
          <NetworkGuard />
          {children}
        </StealthProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
