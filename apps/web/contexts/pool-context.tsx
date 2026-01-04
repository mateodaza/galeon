'use client'

/**
 * Privacy Pool context for the Galeon application.
 *
 * Manages pool master keys derived from wallet signature and tracks deposits.
 * Uses the same deterministic key derivation pattern as stealth addresses.
 *
 * Flow: wallet signature → pool master keys → commitments → deposits
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import { useSignMessage, useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { type Address } from 'viem'
import {
  derivePoolMasterKeys,
  createDepositSecrets,
  recoverPoolDeposits,
  POOL_SIGN_MESSAGE,
  POOL_CONTRACTS,
  entrypointAbi,
  poolAbi,
  type PoolContracts,
} from '@galeon/pool'
import { poolDepositsApi } from '@/lib/api'

/** Storage key prefix */
const STORAGE_KEY = 'galeon-pool-session'

/** Block number when pool contracts were deployed on Mantle mainnet */
const _POOL_DEPLOYMENT_BLOCK = 75_000_000n

/** Session duration: 7 days in milliseconds */
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000

/** Stored pool session */
interface PoolSession {
  masterSignature: `0x${string}`
  walletAddress: string
  expiresAt: number
}

/** Deposit record stored in localStorage */
interface StoredDeposit {
  index: number
  precommitmentHash: string
  value: string
  label: string
  blockNumber: string
  txHash: `0x${string}`
  createdAt: number
}

/** Pool deposit with full details */
export interface PoolDeposit {
  index: bigint
  nullifier: bigint
  secret: bigint
  precommitmentHash: bigint
  value: bigint
  label: bigint
  blockNumber: bigint
  txHash: `0x${string}`
}

/** Pool state for a specific scope (reserved for future use) */
interface _PoolState {
  scope: bigint
  deposits: PoolDeposit[]
  totalDeposited: bigint
  totalWithdrawn: bigint
}

function getStorageKey(address: string): string {
  return `${STORAGE_KEY}-${address.toLowerCase()}`
}

function getDepositsStorageKey(address: string, chainId: number): string {
  return `galeon-pool-deposits-${address.toLowerCase()}-${chainId}`
}

function loadSession(address: string): PoolSession | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(getStorageKey(address))
    if (!stored) return null

    const session: PoolSession = JSON.parse(stored)

    if (session.walletAddress.toLowerCase() !== address.toLowerCase()) {
      return null
    }

    if (Date.now() >= session.expiresAt) {
      localStorage.removeItem(getStorageKey(address))
      return null
    }

    return session
  } catch {
    return null
  }
}

function saveSession(address: string, masterSignature: `0x${string}`): void {
  if (typeof window === 'undefined') return

  const session: PoolSession = {
    masterSignature,
    walletAddress: address.toLowerCase(),
    expiresAt: Date.now() + SESSION_DURATION_MS,
  }

  localStorage.setItem(getStorageKey(address), JSON.stringify(session))
}

function clearSession(address: string): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(getStorageKey(address))
}

function _loadStoredDeposits(address: string, chainId: number): StoredDeposit[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(getDepositsStorageKey(address, chainId))
    if (!stored) return []
    return JSON.parse(stored)
  } catch {
    return []
  }
}

function saveStoredDeposits(address: string, chainId: number, deposits: StoredDeposit[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(getDepositsStorageKey(address, chainId), JSON.stringify(deposits))
}

interface PoolContextValue {
  /** Pool master keys derived from signature */
  masterNullifier: bigint | null
  masterSecret: bigint | null
  /** Whether pool keys have been derived */
  hasPoolKeys: boolean
  /** Whether key derivation is in progress */
  isDerivingKeys: boolean
  /** Whether we're restoring from storage */
  isRestoring: boolean
  /** Current pool deposits */
  deposits: PoolDeposit[]
  /** Total balance in pool (sum of deposits - withdrawals) */
  totalBalance: bigint
  /** Pool scope for current chain */
  poolScope: bigint | null
  /** Error message */
  error: string | null
  /** Derive pool keys from wallet signature */
  derivePoolKeys: () => Promise<void>
  /** Create a new deposit to the pool */
  deposit: (amount: bigint) => Promise<`0x${string}`>
  /** Recover deposits from chain events */
  recoverDeposits: () => Promise<void>
  /** Clear pool session */
  clearPoolSession: () => void
  /** Whether deposit is in progress */
  isDepositing: boolean
  /** Whether recovery is in progress */
  isRecovering: boolean
  /** Pool contract addresses for current chain */
  contracts: PoolContracts | null
}

const PoolContext = createContext<PoolContextValue | null>(null)

interface PoolProviderProps {
  children: ReactNode
}

export function PoolProvider({ children }: PoolProviderProps) {
  const { address, isConnected, chainId } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const [masterNullifier, setMasterNullifier] = useState<bigint | null>(null)
  const [masterSecret, setMasterSecret] = useState<bigint | null>(null)
  const [isDerivingKeys, setIsDerivingKeys] = useState(false)
  const [isRestoring, setIsRestoring] = useState(true)
  const [deposits, setDeposits] = useState<PoolDeposit[]>([])
  const [poolScope, setPoolScope] = useState<bigint | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDepositing, setIsDepositing] = useState(false)
  const [isRecovering, setIsRecovering] = useState(false)
  // Track previous address for account switch detection
  const previousAddressRef = useRef<string | undefined>(undefined)
  // Flag to signal that recovery is needed - starts true to trigger on mount after session restore
  const [needsRecovery, setNeedsRecovery] = useState(true)
  // Ref to prevent concurrent recovery (doesn't trigger re-renders)
  const isRecoveringRef = useRef(false)

  // Get contract addresses for current chain
  const contracts =
    chainId && chainId in POOL_CONTRACTS
      ? POOL_CONTRACTS[chainId as keyof typeof POOL_CONTRACTS]
      : null

  // Calculate total balance
  const totalBalance = deposits.reduce((sum, d) => sum + d.value, BigInt(0))

  /**
   * Derive pool keys from signature
   */
  const deriveKeysFromSignature = useCallback(
    (signature: `0x${string}`) => {
      const { masterNullifier: mn, masterSecret: ms } = derivePoolMasterKeys(signature)
      setMasterNullifier(mn)
      setMasterSecret(ms)
      // Clear deposits and signal that recovery is needed
      setDeposits([])
      setNeedsRecovery(true)

      if (address) {
        saveSession(address, signature)
      }
    },
    [address]
  )

  /**
   * Load pool scope from contract
   */
  useEffect(() => {
    async function loadScope() {
      if (
        !publicClient ||
        !contracts ||
        contracts.pool === '0x0000000000000000000000000000000000000000'
      ) {
        setPoolScope(null)
        return
      }

      try {
        const scope = await publicClient.readContract({
          address: contracts.pool as Address,
          abi: poolAbi,
          functionName: 'SCOPE',
        })
        setPoolScope(scope as bigint)
      } catch (err) {
        console.error('[Pool] Failed to load scope:', err)
        setPoolScope(null)
      }
    }

    loadScope()
  }, [publicClient, contracts])

  /**
   * Restore session on mount and handle address changes
   * Clears old state first, then restores for new address
   */
  useEffect(() => {
    // Detect account switch and clear old state first
    const addressChanged =
      previousAddressRef.current &&
      address &&
      previousAddressRef.current.toLowerCase() !== address.toLowerCase()

    if (addressChanged) {
      console.log('[Pool] Account switched, clearing pool state')
      // Clear old state before restoring for new address
      setMasterNullifier(null)
      setMasterSecret(null)
      setDeposits([])
      setError(null)
      setIsRecovering(false)
      setNeedsRecovery(false) // Will be set to true when new keys are derived
    }

    // Update tracking ref
    previousAddressRef.current = address

    if (!address) {
      setIsRestoring(false)
      return
    }

    // Try to restore session for current address
    const session = loadSession(address)

    if (session) {
      try {
        deriveKeysFromSignature(session.masterSignature)
        console.log('[Pool] Session restored successfully')
      } catch (err) {
        console.error('[Pool] Failed to restore session:', err)
        clearSession(address)
      }
    }

    setIsRestoring(false)
  }, [address, deriveKeysFromSignature])

  /**
   * Clear state on disconnect
   */
  useEffect(() => {
    if (!isConnected) {
      setMasterNullifier(null)
      setMasterSecret(null)
      setDeposits([])
      setPoolScope(null)
    }
  }, [isConnected])

  /**
   * Auto-recover deposits when pool keys become available
   */
  useEffect(() => {
    // Only run when recovery is explicitly needed
    if (!needsRecovery) return
    // Don't run if already recovering (use ref to avoid re-render loops)
    if (isRecoveringRef.current) return
    // Wait for all required dependencies
    if (isRestoring) return
    if (!address) return
    if (!masterNullifier || !masterSecret) return
    if (!poolScope) return
    if (!publicClient) return
    if (!contracts || contracts.pool === '0x0000000000000000000000000000000000000000') return
    // Skip if already have deposits (recovery already completed)
    if (deposits.length > 0) {
      setNeedsRecovery(false)
      return
    }

    console.log('[Pool] Starting auto-recovery for', address.slice(0, 10) + '...')
    // Mark as recovering (ref for immediate check, state for UI)
    isRecoveringRef.current = true
    setIsRecovering(true)

    // Track cancellation for wallet switch during async recovery
    let cancelled = false

    const doRecover = async () => {
      try {
        // Use backend API (much faster than direct RPC getLogs)
        const apiDeposits = await poolDepositsApi.list({
          pool: contracts.pool,
          chainId: chainId ?? 5000,
        })

        // Check if wallet switched during fetch - discard stale results
        if (cancelled) {
          console.log('[Pool] Recovery cancelled (wallet switch), discarding results')
          return
        }

        // Convert API response to format expected by recoverPoolDeposits
        // API returns hex strings, we need bigints
        const depositEvents = apiDeposits.map((d) => ({
          precommitment: BigInt(d.precommitmentHash),
          value: BigInt(d.value),
          label: BigInt(d.label),
          blockNumber: BigInt(d.blockNumber),
          txHash: d.transactionHash as `0x${string}`,
        }))

        const recovered = await recoverPoolDeposits(
          masterNullifier,
          masterSecret,
          poolScope,
          depositEvents
        )

        // Check again after recovery computation
        if (cancelled) {
          console.log('[Pool] Recovery cancelled (wallet switch), discarding results')
          return
        }

        console.log('[Pool] Recovered', recovered.length, 'deposits')
        setDeposits(recovered)
        // Only clear needsRecovery AFTER successful recovery
        setNeedsRecovery(false)

        // Save to localStorage
        if (address && chainId) {
          const stored: StoredDeposit[] = recovered.map((d) => ({
            index: Number(d.index),
            precommitmentHash: d.precommitmentHash.toString(),
            value: d.value.toString(),
            label: d.label.toString(),
            blockNumber: d.blockNumber.toString(),
            txHash: d.txHash,
            createdAt: Date.now(),
          }))
          saveStoredDeposits(address, chainId, stored)
        }
      } catch (err) {
        // Only log errors if not cancelled
        if (!cancelled) {
          console.error('[Pool] Auto-recovery failed:', err)
          // Keep needsRecovery true so it can retry
        }
      } finally {
        // Always reset recovering state (both ref and state)
        isRecoveringRef.current = false
        setIsRecovering(false)
      }
    }

    doRecover()

    // Cleanup: cancel recovery if component unmounts or wallet changes
    return () => {
      cancelled = true
      isRecoveringRef.current = false
    }
  }, [
    needsRecovery,
    isRestoring,
    masterNullifier,
    masterSecret,
    poolScope,
    publicClient,
    contracts,
    deposits.length,
    address,
    chainId,
  ])

  /**
   * Derive pool keys with wallet signature
   */
  const derivePoolKeys = useCallback(async () => {
    setIsDerivingKeys(true)
    setError(null)

    try {
      const signature = await signMessageAsync({
        message: POOL_SIGN_MESSAGE,
      })

      deriveKeysFromSignature(signature as `0x${string}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to derive pool keys'
      setError(message)
      throw err
    } finally {
      setIsDerivingKeys(false)
    }
  }, [signMessageAsync, deriveKeysFromSignature])

  /**
   * Create a new deposit
   */
  const deposit = useCallback(
    async (amount: bigint): Promise<`0x${string}`> => {
      if (!masterNullifier || !masterSecret) {
        throw new Error('Pool keys not derived')
      }
      if (!poolScope) {
        throw new Error('Pool scope not loaded')
      }
      if (!walletClient || !publicClient) {
        throw new Error('Wallet not connected')
      }
      if (!contracts || contracts.entrypoint === '0x0000000000000000000000000000000000000000') {
        throw new Error('Pool contracts not deployed')
      }

      setIsDepositing(true)
      setError(null)

      try {
        // Calculate next deposit index
        const nextIndex = BigInt(deposits.length)

        // Generate deposit secrets
        const precommitment = await createDepositSecrets(
          masterNullifier,
          masterSecret,
          poolScope,
          nextIndex
        )

        // Send deposit transaction
        const hash = await walletClient.writeContract({
          address: contracts.entrypoint as Address,
          abi: entrypointAbi,
          functionName: 'deposit',
          args: [precommitment.hash],
          value: amount,
        })

        // Wait for confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ hash })

        if (receipt.status === 'reverted') {
          throw new Error('Deposit transaction reverted')
        }

        // Add to local deposits (label will be set from event, using 0 as placeholder)
        const newDeposit: PoolDeposit = {
          index: nextIndex,
          nullifier: precommitment.nullifier,
          secret: precommitment.secret,
          precommitmentHash: precommitment.hash,
          value: amount,
          label: BigInt(0), // Will be updated on recovery
          blockNumber: receipt.blockNumber,
          txHash: hash,
        }

        const updatedDeposits = [...deposits, newDeposit]
        setDeposits(updatedDeposits)

        // Save to localStorage
        if (address && chainId) {
          const stored: StoredDeposit[] = updatedDeposits.map((d) => ({
            index: Number(d.index),
            precommitmentHash: d.precommitmentHash.toString(),
            value: d.value.toString(),
            label: d.label.toString(),
            blockNumber: d.blockNumber.toString(),
            txHash: d.txHash,
            createdAt: Date.now(),
          }))
          saveStoredDeposits(address, chainId, stored)
        }

        return hash
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Deposit failed'
        setError(message)
        throw err
      } finally {
        setIsDepositing(false)
      }
    },
    [
      masterNullifier,
      masterSecret,
      poolScope,
      walletClient,
      publicClient,
      contracts,
      deposits,
      address,
      chainId,
    ]
  )

  /**
   * Recover deposits from indexer API
   */
  const recoverDeposits = useCallback(async () => {
    if (!masterNullifier || !masterSecret) {
      throw new Error('Pool keys not derived')
    }
    if (!poolScope) {
      throw new Error('Pool scope not loaded')
    }
    if (!contracts || contracts.pool === '0x0000000000000000000000000000000000000000') {
      throw new Error('Pool contracts not deployed')
    }

    setIsRecovering(true)
    setError(null)

    try {
      // Fetch deposit events from the indexer API (much faster than RPC)
      const apiDeposits = await poolDepositsApi.list({
        pool: contracts.pool,
        chainId: chainId ?? 5000,
      })

      // Convert API response to format expected by recoverPoolDeposits
      const depositEvents = apiDeposits.map((d) => ({
        precommitment: BigInt(d.precommitmentHash),
        value: BigInt(d.value),
        label: BigInt(d.label),
        blockNumber: BigInt(d.blockNumber),
        txHash: d.transactionHash as `0x${string}`,
      }))

      // Recover deposits that match our keys
      const recovered = await recoverPoolDeposits(
        masterNullifier,
        masterSecret,
        poolScope,
        depositEvents
      )

      setDeposits(recovered)

      // Save to localStorage
      if (address && chainId) {
        const stored: StoredDeposit[] = recovered.map((d) => ({
          index: Number(d.index),
          precommitmentHash: d.precommitmentHash.toString(),
          value: d.value.toString(),
          label: d.label.toString(),
          blockNumber: d.blockNumber.toString(),
          txHash: d.txHash,
          createdAt: Date.now(),
        }))
        saveStoredDeposits(address, chainId, stored)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Recovery failed'
      setError(message)
      throw err
    } finally {
      setIsRecovering(false)
    }
  }, [masterNullifier, masterSecret, poolScope, contracts, address, chainId])

  /**
   * Clear pool session
   */
  const clearPoolSession = useCallback(() => {
    setMasterNullifier(null)
    setMasterSecret(null)
    setDeposits([])
    setError(null)

    if (address) {
      clearSession(address)
    }
  }, [address])

  return (
    <PoolContext.Provider
      value={{
        masterNullifier,
        masterSecret,
        hasPoolKeys: masterNullifier !== null && masterSecret !== null,
        isDerivingKeys,
        isRestoring,
        deposits,
        totalBalance,
        poolScope,
        error,
        derivePoolKeys,
        deposit,
        recoverDeposits,
        clearPoolSession,
        isDepositing,
        isRecovering,
        contracts,
      }}
    >
      {children}
    </PoolContext.Provider>
  )
}

/**
 * Hook to access pool context.
 * Must be used within a PoolProvider.
 */
export function usePoolContext() {
  const context = useContext(PoolContext)
  if (!context) {
    throw new Error('usePoolContext must be used within a PoolProvider')
  }
  return context
}
