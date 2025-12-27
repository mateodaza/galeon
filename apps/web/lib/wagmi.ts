/**
 * Wagmi configuration for Galeon.
 *
 * Exports a factory function that creates the wagmi config for Next.js SSR.
 * Uses cookie storage for proper hydration with the App Router.
 * Uses Alchemy RPC for better block range support (WalletConnect limits to 50k blocks).
 */

import { cookieStorage, createStorage, http } from 'wagmi'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mantle, mantleSepolia, supportedChains } from './chains'

/**
 * WalletConnect project ID.
 * Get one at https://cloud.walletconnect.com
 */
export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

/**
 * Flag indicating if wallet connection is properly configured.
 * If false, wallet features should be disabled with a user-friendly message.
 */
export const isWalletConfigured = !!projectId

if (!projectId && typeof window !== 'undefined') {
  console.warn(
    '[Galeon] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. ' +
      'Wallet connection will not work. ' +
      'Get a project ID at https://cloud.walletconnect.com'
  )
}

/**
 * Alchemy API key for Mantle RPC.
 * Get one at https://dashboard.alchemy.com
 */
const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY

/**
 * Custom transports using Alchemy for better RPC limits.
 * Falls back to public RPC if no Alchemy key provided.
 */
const transports = {
  // Mantle Mainnet - Alchemy or public RPC
  [mantle.id]: alchemyApiKey
    ? http(`https://mantle-mainnet.g.alchemy.com/v2/${alchemyApiKey}`)
    : http('https://rpc.mantle.xyz'),
  // Mantle Sepolia - public RPC (Alchemy doesn't support testnet)
  [mantleSepolia.id]: http('https://rpc.sepolia.mantle.xyz'),
}

/**
 * Wagmi adapter for Reown AppKit.
 *
 * Configures:
 * - Cookie storage for SSR
 * - Mantle chains
 * - WalletConnect projectId
 * - Custom Alchemy transports for better RPC limits
 */
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  // Use empty string as fallback - WalletConnect modal won't work but app won't crash
  projectId: projectId || '',
  networks: [...supportedChains],
  transports,
})

/**
 * Export the wagmi config for use in components.
 */
export const config = wagmiAdapter.wagmiConfig

/**
 * Export chains for convenience.
 */
export { mantle, mantleSepolia, supportedChains }
