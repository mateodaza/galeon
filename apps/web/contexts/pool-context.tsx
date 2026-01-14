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
import {
  derivePoolMasterKeys,
  createDepositSecrets,
  createWithdrawalSecrets,
  recoverPoolDeposits,
  traceMergeChain,
  recoverWithdrawalChange,
  POOL_SIGN_MESSAGE,
  POOL_CONTRACTS,
  entrypointAbi,
  poolAbi,
  computeCommitmentHash,
  PoolMerkleTree,
  generateMergeDepositProof,
  formatMergeDepositProofForContract,
  computeMergeDepositContext,
  poseidonHash,
  type PoolContracts,
  type MergeDepositProofInput,
  type MergeDepositEvent,
  type WithdrawalEvent,
} from '@galeon/pool'
import { encodeAbiParameters, type Address } from 'viem'
import { poolDepositsApi, mergeDepositsApi, nullifierApi, merkleLeavesApi } from '@/lib/api'

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
  derivationDepth: number
  precommitmentHash: string
  value: string
  label: string
  blockNumber: string
  txHash: `0x${string}`
  createdAt: number
}

/** Pool deposit with full details */
export interface PoolDeposit {
  /** Original deposit index (0 for first deposit, 1 for second, etc.) */
  index: bigint
  /** Derivation depth - how many withdrawals/merges this commitment has gone through.
   *  0 = original deposit, 1 = after first withdrawal/merge, 2 = after second, etc.
   *  Used to calculate the next childIndex for withdrawals. */
  derivationDepth: bigint
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
  /** Merge a new deposit into an existing commitment (O(1) withdrawals) */
  mergeDeposit: (
    amount: bigint,
    existingDeposit: PoolDeposit,
    onProgress?: (message: string) => void
  ) => Promise<`0x${string}`>
  /** Recover deposits from chain events */
  recoverDeposits: () => Promise<void>
  /** Force a full sync of deposits from chain (clears cache and re-traces all chains) */
  forceSync: () => Promise<void>
  /** Add a deposit directly to context (bypasses indexer lag) */
  addDeposit: (deposit: PoolDeposit) => void
  /** Clear pool session */
  clearPoolSession: () => void
  /** Whether deposit is in progress */
  isDepositing: boolean
  /** Whether merge deposit is in progress */
  isMergeDepositing: boolean
  /** Whether recovery is in progress */
  isRecovering: boolean
  /** Pool contract addresses for current chain */
  contracts: PoolContracts | null
}

const PoolContext = createContext<PoolContextValue | null>(null)

/**
 * Recursively trace a deposit through all withdrawals and merges to find
 * the current active commitment.
 *
 * This handles chains like: deposit → partial withdrawal → merge → partial withdrawal → ...
 *
 * @param deposit - Current deposit to trace
 * @param masterNullifier - Master nullifier for deriving new secrets
 * @param masterSecret - Master secret for deriving new secrets
 * @param mergeEvents - All merge events for this pool
 * @param chainId - Chain ID for nullifier API calls
 * @param recursionDepth - Current recursion depth (for safety)
 * @returns The final active deposit, or null if fully withdrawn
 */
async function traceDepositChain(
  deposit: PoolDeposit,
  masterNullifier: bigint,
  masterSecret: bigint,
  mergeEvents: MergeDepositEvent[],
  chainId: number,
  recursionDepth: number = 0
): Promise<PoolDeposit | null> {
  // Safety: prevent infinite loops
  const MAX_RECURSION = 50
  if (recursionDepth >= MAX_RECURSION) {
    console.error(`[Pool] Max recursion depth reached (${MAX_RECURSION}), stopping`)
    return deposit // Return current as best guess
  }

  // Compute nullifierHash = Poseidon(nullifier)
  const nullifierHash = await poseidonHash([deposit.nullifier])
  const nullifierHashHex = `0x${nullifierHash.toString(16).padStart(64, '0')}`

  // Check how the nullifier was spent (if at all)
  const spendInfo = await nullifierApi.check(nullifierHashHex, chainId)

  if (!spendInfo.spent) {
    // Not spent - this is the active deposit
    console.log(`[Pool] Found active deposit at derivationDepth ${deposit.derivationDepth}`)
    return deposit
  }

  if (spendInfo.spentBy === 'withdrawal') {
    console.log(`[Pool] Deposit spent via withdrawal (derivationDepth: ${deposit.derivationDepth})`)

    // Check if it was a partial withdrawal with change commitment
    const zeroCommitment = '0x0000000000000000000000000000000000000000000000000000000000000000'
    if (!spendInfo.withdrawal || spendInfo.withdrawal.newCommitment === zeroCommitment) {
      console.log('[Pool] Full withdrawal - no remaining balance')
      return null // Fully withdrawn
    }

    // Convert to WithdrawalEvent format
    const withdrawalEvent: WithdrawalEvent = {
      spentNullifier: BigInt(spendInfo.withdrawal.spentNullifier),
      newCommitment: BigInt(spendInfo.withdrawal.newCommitment),
      withdrawnValue: BigInt(spendInfo.withdrawal.value),
      blockNumber: BigInt(spendInfo.withdrawal.blockNumber),
      txHash: spendInfo.withdrawal.transactionHash as `0x${string}`,
    }

    // Recover the change deposit
    const changeDeposit = await recoverWithdrawalChange(
      masterNullifier,
      masterSecret,
      {
        index: deposit.index,
        nullifier: deposit.nullifier,
        secret: deposit.secret,
        precommitmentHash: deposit.precommitmentHash,
        value: deposit.value,
        label: deposit.label,
        blockNumber: deposit.blockNumber,
        txHash: deposit.txHash,
      },
      withdrawalEvent
    )

    if (!changeDeposit) {
      console.log('[Pool] Could not recover change deposit')
      return null
    }

    // The change deposit has derivationDepth = parent's derivationDepth + 1
    const nextDerivationDepth = deposit.derivationDepth + 1n

    // Recursively trace the change deposit
    return traceDepositChain(
      {
        index: deposit.index, // Keep original index for reference
        derivationDepth: nextDerivationDepth,
        nullifier: changeDeposit.nullifier,
        secret: changeDeposit.secret,
        precommitmentHash: changeDeposit.precommitmentHash,
        value: changeDeposit.value,
        label: changeDeposit.label,
        blockNumber: changeDeposit.blockNumber,
        txHash: changeDeposit.txHash,
      },
      masterNullifier,
      masterSecret,
      mergeEvents,
      chainId,
      recursionDepth + 1
    )
  }

  if (spendInfo.spentBy === 'merge') {
    console.log(`[Pool] Deposit spent via merge (derivationDepth: ${deposit.derivationDepth})`)

    // Use merge data from API response directly (most reliable source)
    let mergeEvent: MergeDepositEvent | undefined

    if (spendInfo.mergeDeposit) {
      mergeEvent = {
        existingNullifierHash: BigInt(spendInfo.mergeDeposit.existingNullifierHash),
        newCommitment: BigInt(spendInfo.mergeDeposit.newCommitment),
        depositValue: BigInt(spendInfo.mergeDeposit.depositValue),
        blockNumber: BigInt(spendInfo.mergeDeposit.blockNumber),
        txHash: spendInfo.mergeDeposit.transactionHash as `0x${string}`,
      }
    } else {
      // Fallback to searching mergeEvents array
      mergeEvent = mergeEvents.find(
        (m) => m.existingNullifierHash.toString() === nullifierHash.toString()
      )
    }

    if (!mergeEvent) {
      console.error('[Pool] Could not find merge event for nullifier')
      return deposit // Return current as fallback
    }

    console.log('[Pool] Using merge event:', {
      existingNullifierHash: mergeEvent.existingNullifierHash.toString(),
      newCommitment: mergeEvent.newCommitment.toString(),
      depositValue: mergeEvent.depositValue.toString(),
    })

    // Use traceMergeChain for merge events (it handles the recovery and follows the entire chain)
    const mergeResult = await traceMergeChain(
      masterNullifier,
      masterSecret,
      {
        index: deposit.index,
        nullifier: deposit.nullifier,
        secret: deposit.secret,
        precommitmentHash: deposit.precommitmentHash,
        value: deposit.value,
        label: deposit.label,
        blockNumber: deposit.blockNumber,
        txHash: deposit.txHash,
      },
      mergeEvents
    )

    if (!mergeResult) {
      console.error('[Pool] Could not trace merge chain')
      return null
    }

    const { deposit: mergedDeposit, mergeCount } = mergeResult

    // The merged deposit's derivationDepth should be the actual childIndex from the last merge
    // This is stored in mergedDeposit.index by recoverMergeDeposit
    // Don't use deposit.derivationDepth + mergeCount as childIndexes might not be sequential
    const nextDerivationDepth = mergedDeposit.index
    console.log(
      `[Pool] Traced ${mergeCount} merge(s), derivationDepth: ${deposit.derivationDepth} -> ${nextDerivationDepth} (actual childIndex)`
    )

    // Recursively trace the merged deposit (it might have been withdrawn after the merges)
    return traceDepositChain(
      {
        index: deposit.index, // Keep original index for reference
        derivationDepth: nextDerivationDepth,
        nullifier: mergedDeposit.nullifier,
        secret: mergedDeposit.secret,
        precommitmentHash: mergedDeposit.precommitmentHash,
        value: mergedDeposit.value,
        label: mergedDeposit.label,
        blockNumber: mergedDeposit.blockNumber,
        txHash: mergedDeposit.txHash,
      },
      masterNullifier,
      masterSecret,
      mergeEvents,
      chainId,
      recursionDepth + 1
    )
  }

  // Unknown spend type
  console.warn(`[Pool] Unknown spentBy type: ${spendInfo.spentBy}`)
  return deposit
}

/**
 * Filter deposits and trace all chains to find active commitments.
 *
 * For each original deposit:
 * 1. Recursively trace through withdrawals and merges
 * 2. Find the final active commitment (or null if fully withdrawn)
 * 3. Deduplicate results (same commitment might be reached from different paths)
 *
 * @param deposits - Original deposits recovered from chain
 * @param masterNullifier - Master nullifier for tracing chains
 * @param masterSecret - Master secret for tracing chains
 * @param poolAddress - Pool address for fetching merge events
 * @param chainId - Chain ID for fetching merge events
 */
async function resolveActiveDeposits(
  deposits: PoolDeposit[],
  masterNullifier: bigint,
  masterSecret: bigint,
  poolAddress: string,
  chainId: number
): Promise<PoolDeposit[]> {
  if (deposits.length === 0) return []

  // Fetch all merge events for this pool
  let mergeEvents: MergeDepositEvent[] = []
  try {
    const apiMerges = await mergeDepositsApi.list({ pool: poolAddress, chainId })
    mergeEvents = apiMerges.map((m) => ({
      existingNullifierHash: BigInt(m.existingNullifierHash),
      newCommitment: BigInt(m.newCommitment),
      depositValue: BigInt(m.depositValue),
      blockNumber: BigInt(m.blockNumber),
      txHash: m.transactionHash as `0x${string}`,
    }))
    console.log(`[Pool] Fetched ${mergeEvents.length} merge events`)
  } catch (err) {
    console.warn('[Pool] Failed to fetch merge events:', err)
  }

  const activeDeposits: PoolDeposit[] = []
  const seenCommitments = new Set<string>() // Track to avoid duplicates

  for (const deposit of deposits) {
    try {
      console.log(`[Pool] Tracing deposit index ${deposit.index}...`)

      // Ensure deposit has derivationDepth (original deposits start at 0)
      const depositWithDepth: PoolDeposit = {
        ...deposit,
        derivationDepth: deposit.derivationDepth ?? 0n,
      }

      const activeDeposit = await traceDepositChain(
        depositWithDepth,
        masterNullifier,
        masterSecret,
        mergeEvents,
        chainId
      )

      if (activeDeposit) {
        // Deduplicate by precommitmentHash
        const key = activeDeposit.precommitmentHash.toString()
        if (!seenCommitments.has(key)) {
          seenCommitments.add(key)
          activeDeposits.push(activeDeposit)
          console.log(
            `[Pool] Found active deposit with value ${activeDeposit.value.toString()}, derivationDepth ${activeDeposit.derivationDepth}`
          )
        } else {
          console.log(`[Pool] Skipping duplicate commitment`)
        }
      } else {
        console.log(`[Pool] Deposit ${deposit.index} was fully withdrawn`)
      }
    } catch (err) {
      // On error, assume active (safer to show than hide)
      console.warn(`[Pool] Failed to trace deposit ${deposit.index}:`, err)
      activeDeposits.push(deposit)
    }
  }

  console.log(
    `[Pool] Resolved ${activeDeposits.length} active deposits from ${deposits.length} original`
  )
  return activeDeposits
}

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
  const [isMergeDepositing, setIsMergeDepositing] = useState(false)
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
   * Listen for storage changes from other tabs or manual clearing
   * This ensures we detect when user clears browser data
   */
  useEffect(() => {
    if (!address) return

    const handleStorageChange = (event: StorageEvent) => {
      // Check if our session was removed
      if (event.key === getStorageKey(address) && event.newValue === null) {
        console.log('[Pool] Session cleared externally, resetting keys')
        setMasterNullifier(null)
        setMasterSecret(null)
        setDeposits([])
        setPoolScope(null)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [address])

  /**
   * Periodic session validation - checks every 30 seconds if localStorage still has valid session
   * This catches cases where user clears data in the same tab (storage event doesn't fire)
   */
  useEffect(() => {
    if (!address || !masterNullifier) return

    const validateSession = () => {
      const session = loadSession(address)
      if (!session) {
        console.log('[Pool] Session no longer valid, clearing keys')
        setMasterNullifier(null)
        setMasterSecret(null)
        setDeposits([])
        setPoolScope(null)
      }
    }

    // Check every 30 seconds
    const interval = setInterval(validateSession, 30_000)
    return () => clearInterval(interval)
  }, [address, masterNullifier])

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

        // Debug: Log all precommitments from indexer
        console.log('[Pool Recovery] Found', apiDeposits.length, 'deposits in indexer')
        console.log('[Pool Recovery] Indexer precommitments (first 5):')
        apiDeposits.slice(0, 5).forEach((d, i) => {
          console.log(
            `  ${i}: ${d.precommitmentHash} (decimal: ${BigInt(d.precommitmentHash).toString()})`
          )
        })
        console.log('[Pool Recovery] Recovery keys:', {
          masterNullifierPrefix: masterNullifier.toString().slice(0, 20) + '...',
          masterSecretPrefix: masterSecret.toString().slice(0, 20) + '...',
          poolScope: poolScope.toString(),
        })

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

        // Convert RecoveredDeposit to PoolDeposit with derivationDepth = 0 (original deposits)
        const depositsWithDepth: PoolDeposit[] = recovered.map((d) => ({
          ...d,
          derivationDepth: 0n, // Original deposits start at depth 0
        }))

        // Resolve active deposits (trace merge chains, filter withdrawals)
        const activeDeposits = await resolveActiveDeposits(
          depositsWithDepth,
          masterNullifier,
          masterSecret,
          contracts.pool,
          chainId ?? 5000
        )

        if (cancelled) {
          console.log('[Pool] Recovery cancelled during nullifier check')
          return
        }

        console.log(
          '[Pool] Recovered',
          recovered.length,
          'deposits,',
          activeDeposits.length,
          'active'
        )
        setDeposits(activeDeposits)
        // Only clear needsRecovery AFTER successful recovery
        setNeedsRecovery(false)

        // Save to localStorage (only active deposits)
        if (address && chainId) {
          const stored: StoredDeposit[] = activeDeposits.map((d) => ({
            index: Number(d.index),
            derivationDepth: Number(d.derivationDepth),
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
          derivationDepth: 0n, // Original deposit, not derived from withdrawal/merge
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
            derivationDepth: Number(d.derivationDepth),
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
   * Merge a new deposit into an existing commitment
   * Enables O(1) withdrawals by consolidating multiple deposits
   */
  const mergeDeposit = useCallback(
    async (
      amount: bigint,
      existingDeposit: PoolDeposit,
      onProgress?: (message: string) => void
    ): Promise<`0x${string}`> => {
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

      setIsMergeDepositing(true)
      setError(null)

      try {
        onProgress?.('Fetching pool state...')

        // 1. Fetch all merkle leaves from indexer (deposits + withdrawal change commitments)
        // IMPORTANT: Must use merkle leaves, NOT deposits, to build correct state tree
        const allCommitments = await merkleLeavesApi.getCommitments(contracts.pool)

        if (allCommitments.length === 0) {
          throw new Error('No commitments found in pool')
        }

        console.log('[MergeDeposit] Fetched', allCommitments.length, 'merkle leaves from indexer')

        // 2. Build state merkle tree with all commitments
        const stateTree = await PoolMerkleTree.create(allCommitments)

        // 3. Compute existing commitment hash
        const existingCommitmentHash = await computeCommitmentHash(
          existingDeposit.value,
          existingDeposit.label,
          existingDeposit.precommitmentHash
        )

        // Verify it exists in tree
        const commitmentIndex = allCommitments.findIndex((c) => c === existingCommitmentHash)
        if (commitmentIndex === -1) {
          throw new Error('Existing deposit commitment not found in pool state')
        }

        onProgress?.('Building merkle proofs...')

        // 4. Get state tree root and depth from contract
        const [contractStateRoot, stateTreeDepth] = await Promise.all([
          publicClient.readContract({
            address: contracts.pool as Address,
            abi: poolAbi,
            functionName: 'currentRoot',
          }) as Promise<bigint>,
          publicClient.readContract({
            address: contracts.pool as Address,
            abi: poolAbi,
            functionName: 'currentTreeDepth',
          }) as Promise<bigint>,
        ])

        // 5. Verify state tree matches on-chain root (handle indexer lag)
        let finalStateTree = stateTree
        let _finalCommitments = allCommitments
        const computedRoot = stateTree.root

        if (computedRoot !== contractStateRoot) {
          console.warn(
            '[MergeDeposit] State root mismatch - indexer may be behind',
            '\n  Computed:',
            computedRoot.toString(),
            '\n  Contract:',
            contractStateRoot.toString()
          )
          onProgress?.('State out of sync, refetching...')

          // Refetch merkle leaves and rebuild tree
          const freshCommitments = await merkleLeavesApi.getCommitments(contracts.pool)
          const freshTree = await PoolMerkleTree.create(freshCommitments)

          if (freshTree.root !== contractStateRoot) {
            throw new Error(
              'Pool state is out of sync. Please wait a few seconds for indexer to catch up and try again.'
            )
          }

          console.log(
            '[MergeDeposit] Refetch successful, using fresh state with',
            freshCommitments.length,
            'leaves'
          )

          // Verify commitment still exists in fresh tree
          const freshCommitmentIndex = freshCommitments.findIndex(
            (c) => c === existingCommitmentHash
          )
          if (freshCommitmentIndex === -1) {
            throw new Error(
              'Existing deposit commitment not found after refresh. Please try again.'
            )
          }

          finalStateTree = freshTree
          _finalCommitments = freshCommitments
        }

        const stateRoot = contractStateRoot

        // 6. Generate state proof
        const stateProof = finalStateTree.generateProof(existingCommitmentHash)

        // 6. Build ASP tree with our label and get proof
        const aspTree = await PoolMerkleTree.create([existingDeposit.label])
        const aspProof = aspTree.generateProof(existingDeposit.label)

        // Get on-chain ASP root for verification
        let aspRoot: bigint
        try {
          const onChainAspRoot = (await publicClient.readContract({
            address: contracts.entrypoint as Address,
            abi: entrypointAbi,
            functionName: 'latestRoot',
          })) as bigint
          aspRoot = onChainAspRoot || aspTree.root
        } catch {
          aspRoot = aspTree.root
        }

        onProgress?.('Generating new secrets...')

        // 7. Generate new secrets for merged commitment
        // Use derivationDepth + 1 to ensure unique childIndex
        // This guarantees newNullifier != existingNullifier (circuit requirement)
        let childIndex = existingDeposit.derivationDepth + 1n
        console.log(
          `[MergeDeposit] Using childIndex ${childIndex} for deposit with derivationDepth ${existingDeposit.derivationDepth}`
        )
        let newSecrets = await createWithdrawalSecrets(
          masterNullifier,
          masterSecret,
          existingDeposit.label,
          childIndex
        )

        // SAFETY: If nullifiers match, derivationDepth is stale - find the correct childIndex
        // TODO [DERIVATION_DEPTH_SYNC]: Fix root cause in traceDepositChain
        if (existingDeposit.nullifier === newSecrets.nullifier) {
          console.warn(
            '[MergeDeposit] Nullifiers match! derivationDepth is stale, searching for correct childIndex...'
          )
          let foundCorrectIndex = false
          for (let tryIndex = 0n; tryIndex < 100n; tryIndex++) {
            const trySecrets = await createWithdrawalSecrets(
              masterNullifier,
              masterSecret,
              existingDeposit.label,
              tryIndex
            )
            if (trySecrets.nullifier === existingDeposit.nullifier) {
              childIndex = tryIndex + 1n
              console.log(
                `[MergeDeposit] Found existing nullifier was created with childIndex ${tryIndex}, using ${childIndex} for new secrets`
              )
              newSecrets = await createWithdrawalSecrets(
                masterNullifier,
                masterSecret,
                existingDeposit.label,
                childIndex
              )
              foundCorrectIndex = true
              break
            }
          }
          if (!foundCorrectIndex) {
            throw new Error(
              'Could not find correct childIndex for merge. Please refresh pool state.'
            )
          }
        }

        // 8. Encode mergeData and compute context
        // mergeData = abi.encode(depositor)
        // Context = keccak256(abi.encode(mergeData, SCOPE)) % SNARK_SCALAR_FIELD
        const mergeData = encodeAbiParameters(
          [{ name: 'depositor', type: 'address' }],
          [address as Address]
        )

        console.error('🔴🔴🔴 MERGE DEPOSIT: About to compute context with:', {
          mergeData,
          poolScope: poolScope.toString(),
        })

        const context = await computeMergeDepositContext(mergeData, poolScope)

        console.error('🔴🔴🔴 MERGE DEPOSIT: Context computed:', context.toString())
        console.error(
          '🔴🔴🔴 Expected: 11307924830650364530159500708242273320723539315232360156436850524595874837064'
        )

        // 9. Build merge deposit proof input
        const proofInput: MergeDepositProofInput = {
          depositValue: amount,
          stateRoot,
          stateTreeDepth: Number(stateTreeDepth),
          ASPRoot: aspRoot,
          ASPTreeDepth: aspTree.depth,
          context,
          label: existingDeposit.label,
          existingValue: existingDeposit.value,
          existingNullifier: existingDeposit.nullifier,
          existingSecret: existingDeposit.secret,
          newNullifier: newSecrets.nullifier,
          newSecret: newSecrets.secret,
          stateSiblings: stateProof.siblings,
          stateIndex: stateProof.index,
          ASPSiblings: aspProof.siblings,
          ASPIndex: aspProof.index,
        }

        onProgress?.('Generating ZK proof (this may take 30-60 seconds)...')

        // 10. Generate merge deposit proof
        const proof = await generateMergeDepositProof(proofInput, undefined, (status) => {
          if (status.stage === 'computing' && status.message) {
            onProgress?.(status.message)
          }
        })

        onProgress?.('Submitting transaction...')

        // 11. Format proof for contract
        const formattedProof = formatMergeDepositProofForContract(proof)

        // 12. Build contract proof struct
        const contractProof = {
          pA: formattedProof.pA as [bigint, bigint],
          pB: formattedProof.pB as [[bigint, bigint], [bigint, bigint]],
          pC: formattedProof.pC as [bigint, bigint],
          pubSignals: formattedProof.publicSignals.slice(0, 8) as [
            bigint,
            bigint,
            bigint,
            bigint,
            bigint,
            bigint,
            bigint,
            bigint,
          ],
        }

        // 14. Submit merge deposit transaction
        const hash = await walletClient.writeContract({
          address: contracts.entrypoint as Address,
          abi: entrypointAbi,
          functionName: 'mergeDeposit',
          args: [mergeData, contractProof, poolScope],
          value: amount,
        })

        // 15. Wait for confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ hash })

        if (receipt.status === 'reverted') {
          throw new Error('Merge deposit transaction reverted')
        }

        onProgress?.('Merge deposit successful!')

        // 16. Trigger recovery to update deposits with merged commitment
        setNeedsRecovery(true)

        return hash
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Merge deposit failed'
        setError(message)
        throw err
      } finally {
        setIsMergeDepositing(false)
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

      // Convert RecoveredDeposit to PoolDeposit with derivationDepth = 0 (original deposits)
      const depositsWithDepth: PoolDeposit[] = recovered.map((d) => ({
        ...d,
        derivationDepth: 0n, // Original deposits start at depth 0
      }))

      // Resolve active deposits (trace merge chains, filter withdrawals)
      const activeDeposits = await resolveActiveDeposits(
        depositsWithDepth,
        masterNullifier,
        masterSecret,
        contracts.pool,
        chainId ?? 5000
      )
      console.log(
        `[Pool] Resolved deposits: ${recovered.length} recovered, ${activeDeposits.length} active`
      )

      setDeposits(activeDeposits)

      // Save to localStorage (only active deposits)
      if (address && chainId) {
        const stored: StoredDeposit[] = activeDeposits.map((d) => ({
          index: Number(d.index),
          derivationDepth: Number(d.derivationDepth),
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
   * Force a complete sync from chain.
   * Clears local deposits and re-traces all chains from scratch.
   * Use this when you suspect local state is out of sync.
   */
  const forceSync = useCallback(async () => {
    console.log('[Pool] Force sync requested - clearing local state and re-syncing...')

    // Clear local deposits first
    setDeposits([])

    // Clear localStorage cache
    if (address && chainId) {
      saveStoredDeposits(address, chainId, [])
    }

    // Wait a moment for indexer to be fresh
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Re-run full recovery
    await recoverDeposits()

    console.log('[Pool] Force sync complete')
  }, [address, chainId, recoverDeposits])

  /**
   * Add a deposit directly to context (bypasses indexer lag).
   * Used after a deposit transaction confirms to immediately update the UI
   * without waiting for the indexer to catch up.
   */
  const addDeposit = useCallback(
    (newDeposit: PoolDeposit) => {
      setDeposits((prev) => {
        // Avoid duplicates by checking precommitmentHash
        if (prev.some((d) => d.precommitmentHash === newDeposit.precommitmentHash)) {
          console.log('[Pool] Deposit already exists, skipping add:', newDeposit.index.toString())
          return prev
        }

        // For merged deposits (derivationDepth > 0), replace the existing deposit with same label
        if (newDeposit.derivationDepth > 0n) {
          const existingIndex = prev.findIndex((d) => d.label === newDeposit.label)
          if (existingIndex !== -1) {
            console.log('[Pool] Replacing existing deposit with merged deposit:', {
              oldValue: prev[existingIndex].value.toString(),
              newValue: newDeposit.value.toString(),
              label: newDeposit.label.toString(),
              derivationDepth: newDeposit.derivationDepth.toString(),
            })
            const updated = [...prev]
            updated[existingIndex] = newDeposit
            return updated
          }
        }

        console.log('[Pool] Adding deposit directly to context:', {
          index: newDeposit.index.toString(),
          value: newDeposit.value.toString(),
          label: newDeposit.label.toString(),
        })
        return [...prev, newDeposit]
      })

      // Also save to localStorage
      if (address && chainId) {
        setDeposits((current) => {
          const stored: StoredDeposit[] = current.map((d) => ({
            index: Number(d.index),
            derivationDepth: Number(d.derivationDepth),
            precommitmentHash: d.precommitmentHash.toString(),
            value: d.value.toString(),
            label: d.label.toString(),
            blockNumber: d.blockNumber.toString(),
            txHash: d.txHash,
            createdAt: Date.now(),
          }))
          saveStoredDeposits(address, chainId, stored)
          return current
        })
      }
    },
    [address, chainId]
  )

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
        mergeDeposit,
        recoverDeposits,
        forceSync,
        addDeposit,
        clearPoolSession,
        isDepositing,
        isMergeDepositing,
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
