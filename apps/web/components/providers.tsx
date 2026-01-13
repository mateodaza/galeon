'use client'

/**
 * Global providers for the Galeon application.
 *
 * Wraps the app with:
 * - Reown AppKit (wallet connection)
 * - Wagmi (React hooks for Ethereum)
 * - TanStack Query (async state management)
 * - Auth context (SIWE + JWT)
 * - Stealth keys context
 * - Motion (animations)
 *
 * Uses address-keyed remounting to automatically reset all auth/stealth/pool
 * state when the wallet changes. This is the cleanest way to handle wallet
 * switching without complex ref-based state tracking.
 */

import { type ReactNode } from 'react'
import { useAccount } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAppKit } from '@reown/appkit/react'
import { WagmiProvider, type State } from 'wagmi'
import { LazyMotion, domAnimation } from 'motion/react'
import { wagmiAdapter, projectId, isWalletConfigured } from '@/lib/wagmi'
import { mantle, mantleSepolia } from '@/lib/chains'
import { AuthProvider } from '@/contexts/auth-context'
import { StealthProvider } from '@/contexts/stealth-context'
import { PoolProvider } from '@/contexts/pool-context'
import { NetworkGuard } from '@/components/network-guard'

/**
 * TanStack Query client instance.
 * Shared across the app for caching and deduplication.
 *
 * Configured to:
 * - Not retry on 401 (authentication) errors
 * - Retry other errors up to 3 times
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 401 (auth) or 403 (forbidden) errors
        if (error && 'status' in error && (error.status === 401 || error.status === 403)) {
          return false
        }
        // Default: retry up to 3 times
        return failureCount < 3
      },
      refetchOnWindowFocus: false, // Prevent refetch loops when tabbing back
    },
  },
})

/**
 * Application metadata for WalletConnect.
 */
const metadata = {
  name: 'Galeon',
  description: 'Private payments using stealth addresses',
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
      '--w3m-accent': '#0891b2', // Cyan-600 for Galeon deep sea branding
      '--w3m-border-radius-master': '8px',
    },
  })
}

interface ProvidersProps {
  children: ReactNode
  initialState?: State
}

/**
 * Inner providers that are keyed by wallet address.
 * When address changes, React remounts these with fresh state.
 * This eliminates all the complex ref-based state tracking.
 */
function AddressKeyedProviders({ children }: { children: ReactNode }) {
  const { address } = useAccount()

  // Use address as key - when it changes, all children remount with fresh state
  // Use 'disconnected' as key when no wallet is connected
  const key = address ?? 'disconnected'

  return (
    <AuthProvider key={key}>
      <StealthProvider>
        <PoolProvider>
          <NetworkGuard />
          {children}
        </PoolProvider>
      </StealthProvider>
    </AuthProvider>
  )
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
        <LazyMotion features={domAnimation} strict>
          <AddressKeyedProviders>{children}</AddressKeyedProviders>
        </LazyMotion>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
