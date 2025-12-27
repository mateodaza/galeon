'use client'

/**
 * Network guard component that warns when user is on wrong network.
 *
 * Displays a banner when connected to an unsupported chain.
 * Provides quick switch button to Mantle mainnet.
 */

import { useAccount, useSwitchChain } from 'wagmi'
import { CONTRACTS } from '@/lib/contracts'

/** Supported chain ID (Mantle mainnet) */
const SUPPORTED_CHAIN_ID = 5000

/** Zero address for comparison */
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

/**
 * Check if a chain is supported (has non-zero contract addresses).
 */
function isChainSupported(chainId: number): boolean {
  const contracts = CONTRACTS[chainId as keyof typeof CONTRACTS]
  if (!contracts) return false

  // Check if contracts are deployed (not zero addresses)
  // Cast to string to avoid TypeScript literal type comparison issues
  return (
    (contracts.galeonRegistry as string) !== ZERO_ADDRESS &&
    (contracts.announcer as string) !== ZERO_ADDRESS
  )
}

/**
 * Network guard banner that shows when on wrong network.
 */
export function NetworkGuard() {
  const { chainId, isConnected } = useAccount()
  const { switchChain, isPending } = useSwitchChain()

  // Don't show if not connected
  if (!isConnected) return null

  // Don't show if on supported network
  if (chainId && isChainSupported(chainId)) return null

  const handleSwitch = () => {
    switchChain?.({ chainId: SUPPORTED_CHAIN_ID })
  }

  return (
    <div className="bg-amber-900/80 px-4 py-3 text-center">
      <div className="flex items-center justify-center gap-3">
        <span className="text-amber-100">Please switch to Mantle network to use Galeon.</span>
        <button
          onClick={handleSwitch}
          disabled={isPending}
          className="rounded-lg bg-amber-700 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
        >
          {isPending ? 'Switching...' : 'Switch to Mantle'}
        </button>
      </div>
    </div>
  )
}

/**
 * Hook to check if current network is supported.
 */
export function useNetworkSupported(): {
  isSupported: boolean
  chainId: number | undefined
} {
  const { chainId, isConnected } = useAccount()

  return {
    isSupported: !isConnected || (chainId !== undefined && isChainSupported(chainId)),
    chainId,
  }
}
