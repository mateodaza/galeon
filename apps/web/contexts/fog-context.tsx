'use client'

/**
 * Fog wallet context for Galeon.
 *
 * Manages fog wallets with encrypted localStorage persistence.
 * Fog keys are derived on-demand from masterSignature - never stored.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { formatEther } from 'viem'
import {
  deriveFogKeys,
  generateStealthAddressDeterministic,
  generateRandomPrivateKey,
} from '@galeon/stealth'
import { useStealthContext } from './stealth-context'
import {
  loadFogWallets,
  saveFogWallets,
  clearFogWallets,
  deriveSessionKeyBytes,
  getNextFogIndex,
  generateDefaultName,
  bytesToHex,
} from '@/lib/fog-storage'
import { calculatePrivacyLevel, getPrivacyWarnings, getPrivacyRisks } from '@/lib/fog-privacy'
import type { FogWallet, FogWalletMetadata, FundingSource, FogContextValue } from '@/types/fog'

// ============================================================
// Context
// ============================================================

const FogContext = createContext<FogContextValue | null>(null)

interface FogProviderProps {
  children: ReactNode
}

/**
 * Provider component for fog wallets.
 * Must be wrapped inside StealthProvider to access masterSignature.
 */
export function FogProvider({ children }: FogProviderProps) {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { masterSignature, hasKeys } = useStealthContext()

  // State
  const [fogWalletsMetadata, setFogWalletsMetadata] = useState<FogWalletMetadata[]>([])
  const [balances, setBalances] = useState<Map<number, bigint>>(new Map())
  const [sessionKeyBytes, setSessionKeyBytes] = useState<Uint8Array | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRestoring, setIsRestoring] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Derive session key when masterSignature becomes available
  useEffect(() => {
    if (masterSignature) {
      const keyBytes = deriveSessionKeyBytes(masterSignature)
      setSessionKeyBytes(keyBytes)
    } else {
      setSessionKeyBytes(null)
    }
  }, [masterSignature])

  // Load fog wallets from storage when session key and address are available
  useEffect(() => {
    async function restore() {
      if (!address || !sessionKeyBytes) {
        setIsRestoring(false)
        return
      }

      console.log('[Fog] Restoring fog wallets...')
      setIsRestoring(true)

      try {
        const wallets = await loadFogWallets(address, sessionKeyBytes)
        setFogWalletsMetadata(wallets)
        console.log(`[Fog] Restored ${wallets.length} fog wallets`)
      } catch (err) {
        console.error('[Fog] Failed to restore fog wallets:', err)
        setError('Failed to restore fog wallets')
      } finally {
        setIsRestoring(false)
      }
    }

    restore()
  }, [address, sessionKeyBytes])

  // Clear fog wallets on disconnect
  useEffect(() => {
    if (!isConnected) {
      setFogWalletsMetadata([])
      setBalances(new Map())
      setSessionKeyBytes(null)
    }
  }, [isConnected])

  // ============================================================
  // Balance Fetching
  // ============================================================

  const refreshBalances = useCallback(async () => {
    if (!publicClient || fogWalletsMetadata.length === 0) return

    setIsLoading(true)

    try {
      const newBalances = new Map<number, bigint>()
      const walletsToMarkFunded: { fogIndex: number; balance: bigint }[] = []

      await Promise.all(
        fogWalletsMetadata.map(async (wallet) => {
          try {
            const balance = await publicClient.getBalance({
              address: wallet.stealthAddress,
            })
            newBalances.set(wallet.fogIndex, balance)

            // Auto-detect external funding: wallet has balance but fundedAt is null
            if (balance > 0n && wallet.fundedAt === null) {
              console.log(`[Fog] Auto-detected funding for fog ${wallet.fogIndex}: ${balance} wei`)
              walletsToMarkFunded.push({ fogIndex: wallet.fogIndex, balance })
            }
          } catch (err) {
            console.error(`[Fog] Failed to fetch balance for fog ${wallet.fogIndex}:`, err)
            newBalances.set(wallet.fogIndex, 0n)
          }
        })
      )

      setBalances(newBalances)

      // Auto-mark wallets as funded if they received external funds
      if (walletsToMarkFunded.length > 0 && address && sessionKeyBytes) {
        const updatedWallets = fogWalletsMetadata.map((wallet) => {
          const funding = walletsToMarkFunded.find((f) => f.fogIndex === wallet.fogIndex)
          if (funding) {
            return {
              ...wallet,
              fundedAt: Date.now(),
              fundingSource: 'external' as const,
              fundingAmount: funding.balance.toString(),
              // fundingAddress and fundingTxHash remain null for external funding
            }
          }
          return wallet
        })

        await saveFogWallets(address, updatedWallets, sessionKeyBytes)
        setFogWalletsMetadata(updatedWallets)
        console.log(`[Fog] Auto-marked ${walletsToMarkFunded.length} wallet(s) as funded`)
      }
    } catch (err) {
      console.error('[Fog] Failed to refresh balances:', err)
    } finally {
      setIsLoading(false)
    }
  }, [publicClient, fogWalletsMetadata, address, sessionKeyBytes])

  // Auto-refresh balances when wallets change
  useEffect(() => {
    if (fogWalletsMetadata.length > 0 && !isRestoring) {
      refreshBalances()
    }
  }, [fogWalletsMetadata, isRestoring, refreshBalances])

  // ============================================================
  // Fog Wallets with Runtime Data
  // ============================================================

  const fogWallets: FogWallet[] = useMemo(() => {
    return fogWalletsMetadata.map((metadata) => {
      const balance = balances.get(metadata.fogIndex) ?? 0n
      // Use multi-hop + time based privacy calculation (ESSENTIAL)
      const privacyLevel = calculatePrivacyLevel(
        metadata.hopDepth,
        metadata.fundingSource,
        metadata.fundedAt
      )
      const privacyWarnings = getPrivacyWarnings(metadata)
      const privacyRisks = getPrivacyRisks(metadata)

      // Determine status
      // Note: balance > 0 means funded even if fundedAt is null (external funding detected)
      let status: 'unfunded' | 'funded' | 'spent'
      if (balance > 0n) {
        status = 'funded'
      } else if (metadata.fundedAt !== null) {
        status = 'spent' // Was funded before but now empty
      } else {
        status = 'unfunded'
      }

      return {
        ...metadata,
        balance,
        balanceFormatted: formatEther(balance),
        privacyLevel,
        privacyWarnings,
        privacyRisks,
        status,
      }
    })
  }, [fogWalletsMetadata, balances])

  // Total balance
  const totalBalance = useMemo(() => {
    return fogWallets.reduce((sum, wallet) => sum + wallet.balance, 0n)
  }, [fogWallets])

  const totalBalanceFormatted = formatEther(totalBalance)

  // ============================================================
  // Wallet Operations
  // ============================================================

  const createFogWallet = useCallback(
    async (name?: string): Promise<FogWallet> => {
      if (!masterSignature) {
        throw new Error('Master signature not available - please unlock stealth keys first')
      }
      if (!address || !sessionKeyBytes) {
        throw new Error('Wallet not connected')
      }

      setError(null)

      try {
        // Get next fog index
        const fogIndex = getNextFogIndex(fogWalletsMetadata)
        const walletName = name?.trim() || generateDefaultName(fogWalletsMetadata)

        // Derive fog keys
        const fogKeys = deriveFogKeys(masterSignature, fogIndex, 'mnt')

        // Generate ephemeral keypair for the stealth address
        const ephemeralPrivateKey = generateRandomPrivateKey()

        // Generate stealth address using the deterministic function
        const stealthResult = generateStealthAddressDeterministic(
          fogKeys.stealthMetaAddress,
          ephemeralPrivateKey
        )

        // Create metadata with multi-hop tracking
        const metadata: FogWalletMetadata = {
          fogIndex,
          name: walletName,
          stealthAddress: stealthResult.stealthAddress,
          stealthMetaAddress: fogKeys.stealthMetaAddress,
          ephemeralPublicKey: bytesToHex(stealthResult.ephemeralPublicKey),
          viewTag: stealthResult.viewTag,
          fundedAt: null,
          fundingSource: null,
          fundingAmount: null,
          fundingAddress: null,
          fundingTxHash: null,
          createdAt: Date.now(),
          // Multi-hop tracking (ESSENTIAL for privacy)
          parentFogIndex: null, // Entry point - no parent
          hopDepth: 0, // Entry point
          isPaymentWallet: false, // Not designated for payment yet
        }

        // Save to storage
        const updatedWallets = [...fogWalletsMetadata, metadata]
        await saveFogWallets(address, updatedWallets, sessionKeyBytes)
        setFogWalletsMetadata(updatedWallets)

        // Return with runtime data
        // Note: hopDepth 0 = low privacy (entry point, needs hop)
        const newWallet: FogWallet = {
          ...metadata,
          balance: 0n,
          balanceFormatted: '0',
          privacyLevel: 'low', // Entry point has low privacy until hopped
          privacyWarnings: ['Single-hop transaction - add an intermediate wallet for privacy'],
          privacyRisks: ['single-hop'],
          status: 'unfunded',
        }

        console.log(`[Fog] Created fog wallet ${fogIndex}: ${stealthResult.stealthAddress}`)
        return newWallet
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create fog wallet'
        setError(message)
        throw err
      }
    },
    [masterSignature, address, sessionKeyBytes, fogWalletsMetadata]
  )

  /**
   * Create an intermediate wallet from a source wallet.
   * The new wallet will have hopDepth = source.hopDepth + 1.
   * Returns the new wallet - caller is responsible for doing the transfer.
   */
  const createIntermediateWallet = useCallback(
    async (sourceFogIndex: number, name?: string): Promise<FogWallet> => {
      if (!masterSignature) {
        throw new Error('Master signature not available - please unlock stealth keys first')
      }
      if (!address || !sessionKeyBytes) {
        throw new Error('Wallet not connected')
      }

      // Find source wallet
      const sourceWallet = fogWalletsMetadata.find((w) => w.fogIndex === sourceFogIndex)
      if (!sourceWallet) {
        throw new Error(`Source wallet ${sourceFogIndex} not found`)
      }

      setError(null)

      try {
        // Get next fog index
        const fogIndex = getNextFogIndex(fogWalletsMetadata)
        const walletName = name?.trim() || `Hop from ${sourceWallet.name}`

        // Derive fog keys for new wallet
        const fogKeys = deriveFogKeys(masterSignature, fogIndex, 'mnt')

        // Generate ephemeral keypair for the stealth address
        const ephemeralPrivateKey = generateRandomPrivateKey()

        // Generate stealth address using the deterministic function
        const stealthResult = generateStealthAddressDeterministic(
          fogKeys.stealthMetaAddress,
          ephemeralPrivateKey
        )

        // Create metadata with multi-hop tracking
        const newHopDepth = sourceWallet.hopDepth + 1
        const metadata: FogWalletMetadata = {
          fogIndex,
          name: walletName,
          stealthAddress: stealthResult.stealthAddress,
          stealthMetaAddress: fogKeys.stealthMetaAddress,
          ephemeralPublicKey: bytesToHex(stealthResult.ephemeralPublicKey),
          viewTag: stealthResult.viewTag,
          fundedAt: null, // Will be set when transfer completes
          fundingSource: 'self', // Internal transfer is self-funded
          fundingAmount: null,
          fundingAddress: sourceWallet.stealthAddress, // Funded from source wallet
          fundingTxHash: null,
          createdAt: Date.now(),
          // Multi-hop tracking (ESSENTIAL for privacy)
          parentFogIndex: sourceFogIndex,
          hopDepth: newHopDepth,
          isPaymentWallet: true, // Intermediate wallets are for payments
        }

        // Save to storage
        const updatedWallets = [...fogWalletsMetadata, metadata]
        await saveFogWallets(address, updatedWallets, sessionKeyBytes)
        setFogWalletsMetadata(updatedWallets)

        // Determine privacy level based on new hop depth
        const privacyLevel = newHopDepth >= 1 ? 'medium' : 'low'

        // Return with runtime data
        const newWallet: FogWallet = {
          ...metadata,
          balance: 0n,
          balanceFormatted: '0',
          privacyLevel,
          privacyWarnings: [],
          privacyRisks: [],
          status: 'unfunded',
        }

        console.log(
          `[Fog] Created intermediate wallet ${fogIndex} (hop ${newHopDepth}) from ${sourceFogIndex}`
        )
        return newWallet
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create intermediate wallet'
        setError(message)
        throw err
      }
    },
    [masterSignature, address, sessionKeyBytes, fogWalletsMetadata]
  )

  /**
   * Get a fog wallet by index.
   */
  const getFogWallet = useCallback(
    (fogIndex: number): FogWallet | undefined => {
      return fogWallets.find((w) => w.fogIndex === fogIndex)
    },
    [fogWallets]
  )

  const markAsFunded = useCallback(
    async (
      fogIndex: number,
      source: FundingSource,
      amount: bigint,
      txHash: `0x${string}`,
      fundingAddress?: `0x${string}`
    ) => {
      if (!address || !sessionKeyBytes) return

      const updatedWallets = fogWalletsMetadata.map((wallet) => {
        if (wallet.fogIndex === fogIndex) {
          return {
            ...wallet,
            fundedAt: Date.now(),
            fundingSource: source,
            fundingAmount: amount.toString(),
            fundingAddress: fundingAddress ?? null,
            fundingTxHash: txHash,
          }
        }
        return wallet
      })

      await saveFogWallets(address, updatedWallets, sessionKeyBytes)
      setFogWalletsMetadata(updatedWallets)

      // Refresh balances to update the funded wallet
      setTimeout(refreshBalances, 2000)
    },
    [address, sessionKeyBytes, fogWalletsMetadata, refreshBalances]
  )

  const removeFogWallet = useCallback(
    async (fogIndex: number) => {
      if (!address || !sessionKeyBytes) return

      const updatedWallets = fogWalletsMetadata.filter((wallet) => wallet.fogIndex !== fogIndex)

      await saveFogWallets(address, updatedWallets, sessionKeyBytes)
      setFogWalletsMetadata(updatedWallets)

      // Remove from balances map
      setBalances((prev) => {
        const next = new Map(prev)
        next.delete(fogIndex)
        return next
      })

      console.log(`[Fog] Removed fog wallet ${fogIndex}`)
    },
    [address, sessionKeyBytes, fogWalletsMetadata]
  )

  const clearSession = useCallback(() => {
    if (address) {
      clearFogWallets(address)
    }
    setFogWalletsMetadata([])
    setBalances(new Map())
    setSessionKeyBytes(null)
    setError(null)
    console.log('[Fog] Session cleared')
  }, [address])

  // ============================================================
  // Context Value
  // ============================================================

  const value: FogContextValue = {
    fogWallets,
    totalBalance,
    totalBalanceFormatted,
    hasSession: sessionKeyBytes !== null && hasKeys,
    isLoading,
    isRestoring,
    error,
    createFogWallet,
    createIntermediateWallet,
    markAsFunded,
    getFogWallet,
    removeFogWallet,
    refreshBalances,
    clearSession,
  }

  return <FogContext.Provider value={value}>{children}</FogContext.Provider>
}

/**
 * Hook to access fog wallet context.
 * Must be used within a FogProvider.
 */
export function useFogContext(): FogContextValue {
  const context = useContext(FogContext)
  if (!context) {
    throw new Error('useFogContext must be used within a FogProvider')
  }
  return context
}
