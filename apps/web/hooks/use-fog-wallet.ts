'use client'

/**
 * React hooks for fog wallet operations.
 *
 * Provides simplified access to fog wallet functionality from the context.
 */

import { useState, useCallback } from 'react'
import { useFogContext } from '@/contexts/fog-context'
import type { FogWallet, FundingSource } from '@/types/fog'

// ============================================================
// useFogWallets - List fog wallets with balances
// ============================================================

export interface UseFogWalletsReturn {
  /** List of fog wallets with runtime data */
  fogWallets: FogWallet[]
  /** Total balance across all fog wallets */
  totalBalance: bigint
  /** Formatted total balance */
  totalBalanceFormatted: string
  /** Number of funded wallets */
  fundedCount: number
  /** Whether session is unlocked */
  hasSession: boolean
  /** Loading balances */
  isLoading: boolean
  /** Restoring from storage */
  isRestoring: boolean
  /** Refresh balances */
  refresh: () => Promise<void>
}

/**
 * Hook for listing fog wallets with balances.
 */
export function useFogWallets(): UseFogWalletsReturn {
  const {
    fogWallets,
    totalBalance,
    totalBalanceFormatted,
    hasSession,
    isLoading,
    isRestoring,
    refreshBalances,
  } = useFogContext()

  const fundedCount = fogWallets.filter((w) => w.status === 'funded').length

  return {
    fogWallets,
    totalBalance,
    totalBalanceFormatted,
    fundedCount,
    hasSession,
    isLoading,
    isRestoring,
    refresh: refreshBalances,
  }
}

// ============================================================
// useCreateFogWallet - Create new fog wallet
// ============================================================

export interface UseCreateFogWalletReturn {
  /** Create a new fog wallet */
  createFogWallet: (name?: string) => Promise<FogWallet>
  /** Whether creation is in progress */
  isPending: boolean
  /** Error message if creation failed */
  error: string | null
  /** Reset error state */
  reset: () => void
}

/**
 * Hook for creating new fog wallets.
 */
export function useCreateFogWallet(): UseCreateFogWalletReturn {
  const { createFogWallet: contextCreate } = useFogContext()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createFogWallet = useCallback(
    async (name?: string): Promise<FogWallet> => {
      setIsPending(true)
      setError(null)

      try {
        const wallet = await contextCreate(name)
        return wallet
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create fog wallet'
        setError(message)
        throw err
      } finally {
        setIsPending(false)
      }
    },
    [contextCreate]
  )

  const reset = useCallback(() => {
    setError(null)
  }, [])

  return {
    createFogWallet,
    isPending,
    error,
    reset,
  }
}

// ============================================================
// useMarkFogFunded - Mark fog wallet as funded
// ============================================================

export interface UseMarkFogFundedReturn {
  /** Mark fog wallet as funded */
  markFunded: (
    fogIndex: number,
    source: FundingSource,
    amount: bigint,
    txHash: `0x${string}`,
    fundingAddress?: `0x${string}`
  ) => void
}

/**
 * Hook for marking fog wallets as funded.
 */
export function useMarkFogFunded(): UseMarkFogFundedReturn {
  const { markAsFunded } = useFogContext()

  return {
    markFunded: markAsFunded,
  }
}

// ============================================================
// useRemoveFogWallet - Remove fog wallet
// ============================================================

export interface UseRemoveFogWalletReturn {
  /** Remove fog wallet from storage */
  removeFogWallet: (fogIndex: number) => void
  /** Whether removal is in progress */
  isPending: boolean
}

/**
 * Hook for removing fog wallets.
 */
export function useRemoveFogWallet(): UseRemoveFogWalletReturn {
  const { removeFogWallet: contextRemove } = useFogContext()
  const [isPending, setIsPending] = useState(false)

  const removeFogWallet = useCallback(
    async (fogIndex: number) => {
      setIsPending(true)
      try {
        await contextRemove(fogIndex)
      } finally {
        setIsPending(false)
      }
    },
    [contextRemove]
  )

  return {
    removeFogWallet,
    isPending,
  }
}

// ============================================================
// useFogWallet - Get single fog wallet by index
// ============================================================

export interface UseFogWalletReturn {
  /** Fog wallet data (null if not found) */
  fogWallet: FogWallet | null
  /** Whether wallet exists */
  exists: boolean
}

/**
 * Hook for getting a single fog wallet by index.
 */
export function useFogWallet(fogIndex: number): UseFogWalletReturn {
  const { fogWallets } = useFogContext()

  const fogWallet = fogWallets.find((w) => w.fogIndex === fogIndex) ?? null

  return {
    fogWallet,
    exists: fogWallet !== null,
  }
}
