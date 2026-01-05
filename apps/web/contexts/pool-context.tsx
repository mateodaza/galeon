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
  POOL_SIGN_MESSAGE,
  POOL_CONTRACTS,
  entrypointAbi,
  poolAbi,
  computeCommitmentHash,
  PoolMerkleTree,
  generateMergeDepositProof,
  formatMergeDepositProofForContract,
  poseidonHash,
  type PoolContracts,
  type MergeDepositProofInput,
} from '@galeon/pool'
import { encodeAbiParameters, type Address } from 'viem'
import { poolDepositsApi, nullifierApi, merkleLeavesApi } from '@/lib/api'

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
  /** Merge a new deposit into an existing commitment (O(1) withdrawals) */
  mergeDeposit: (
    amount: bigint,
    existingDeposit: PoolDeposit,
    onProgress?: (message: string) => void
  ) => Promise<`0x${string}`>
  /** Recover deposits from chain events */
  recoverDeposits: () => Promise<void>
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
 * Filter out deposits that have been spent (nullifier already used).
 * Checks each deposit's nullifier hash against the indexer's spent nullifiers.
 *
 * IMPORTANT: The contract stores nullifierHash = Poseidon(nullifier), NOT the raw nullifier.
 * So we must compute the hash before checking.
 */
async function filterUnspentDeposits(deposits: PoolDeposit[]): Promise<PoolDeposit[]> {
  if (deposits.length === 0) return []

  // Compute nullifier hashes for each deposit and check if spent
  const unspent: PoolDeposit[] = []

  for (const deposit of deposits) {
    try {
      // CRITICAL: Compute nullifierHash = Poseidon(nullifier)
      // The contract stores the HASH, not the raw nullifier
      const nullifierHash = await poseidonHash([deposit.nullifier])
      const nullifierHashHex = `0x${nullifierHash.toString(16).padStart(64, '0')}`

      const isSpent = await nullifierApi.isSpent(nullifierHashHex)
      if (!isSpent) {
        unspent.push(deposit)
      } else {
        console.log(
          `[Pool] Deposit at index ${deposit.index} has been spent (nullifierHash: ${nullifierHashHex.slice(0, 18)}...)`
        )
      }
    } catch (err) {
      // On error, assume not spent (safer to show than hide)
      console.warn(`[Pool] Failed to check nullifier for deposit ${deposit.index}:`, err)
      unspent.push(deposit)
    }
  }

  return unspent
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

        // Filter out spent deposits (nullifiers that have been used in withdrawals)
        const unspentDeposits = await filterUnspentDeposits(recovered)

        if (cancelled) {
          console.log('[Pool] Recovery cancelled during nullifier check')
          return
        }

        console.log(
          '[Pool] Recovered',
          recovered.length,
          'deposits,',
          unspentDeposits.length,
          'unspent'
        )
        setDeposits(unspentDeposits)
        // Only clear needsRecovery AFTER successful recovery
        setNeedsRecovery(false)

        // Save to localStorage (only unspent deposits)
        if (address && chainId) {
          const stored: StoredDeposit[] = unspentDeposits.map((d) => ({
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
        const [stateRoot, stateTreeDepth] = await Promise.all([
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

        // 5. Generate state proof
        const stateProof = stateTree.generateProof(existingCommitmentHash)

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
        // Use a unique child index based on current deposits + 1
        const childIndex = BigInt(deposits.length)
        const newSecrets = await createWithdrawalSecrets(
          masterNullifier,
          masterSecret,
          existingDeposit.label,
          childIndex
        )

        // 8. Compute context for mergeData encoding
        // Context = Poseidon(depositor) - similar to withdrawal context
        const depositorBigInt = BigInt(address as string)
        const context = await poseidonHash([depositorBigInt])

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

        // 12. Encode mergeData (for context validation)
        // mergeData should be the same data used to compute context
        const mergeData = encodeAbiParameters(
          [{ name: 'depositor', type: 'address' }],
          [address as Address]
        )

        // 13. Build contract proof struct
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

      // Filter out spent deposits by checking nullifiers
      // A deposit is spent if its nullifier hash appears in pool withdrawals
      const unspentDeposits = await filterUnspentDeposits(recovered)
      console.log(
        `[Pool] Filtered deposits: ${recovered.length} recovered, ${unspentDeposits.length} unspent`
      )

      setDeposits(unspentDeposits)

      // Save to localStorage (only unspent deposits)
      if (address && chainId) {
        const stored: StoredDeposit[] = unspentDeposits.map((d) => ({
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
        mergeDeposit,
        recoverDeposits,
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
