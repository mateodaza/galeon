'use client'

/**
 * Privacy Pool context for the Galeon application.
 *
 * Manages pool master keys derived from wallet signature and tracks deposits.
 * Uses the same deterministic key derivation pattern as stealth addresses.
 *
 * Flow: wallet signature → pool master keys → commitments → deposits
 */

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
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

/** Storage key prefix */
const STORAGE_KEY = 'galeon-pool-session'

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
   * Restore session on mount
   */
  useEffect(() => {
    if (!address) {
      setIsRestoring(false)
      return
    }

    const session = loadSession(address)

    if (session) {
      try {
        deriveKeysFromSignature(session.masterSignature)
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
   * Recover deposits from chain events
   */
  const recoverDeposits = useCallback(async () => {
    if (!masterNullifier || !masterSecret) {
      throw new Error('Pool keys not derived')
    }
    if (!poolScope) {
      throw new Error('Pool scope not loaded')
    }
    if (!publicClient) {
      throw new Error('Public client not available')
    }
    if (!contracts || contracts.pool === '0x0000000000000000000000000000000000000000') {
      throw new Error('Pool contracts not deployed')
    }

    setIsRecovering(true)
    setError(null)

    try {
      // Fetch deposit events from the pool
      // Note: Event param names must match Solidity contract (with underscore prefix)
      const logs = await publicClient.getLogs({
        address: contracts.pool as Address,
        event: {
          type: 'event',
          name: 'Deposited',
          inputs: [
            { name: '_depositor', type: 'address', indexed: true },
            { name: '_commitment', type: 'uint256', indexed: false },
            { name: '_label', type: 'uint256', indexed: false },
            { name: '_value', type: 'uint256', indexed: false },
            { name: '_precommitmentHash', type: 'uint256', indexed: false },
          ],
        },
        fromBlock: 'earliest',
        toBlock: 'latest',
      })

      // Transform to the format expected by recoverPoolDeposits
      const depositEvents = logs.map((log) => ({
        precommitment: log.args._precommitmentHash as bigint,
        value: log.args._value as bigint,
        label: log.args._label as bigint,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash as `0x${string}`,
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
  }, [masterNullifier, masterSecret, poolScope, publicClient, contracts, address, chainId])

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
