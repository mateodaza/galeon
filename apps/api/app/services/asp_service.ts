/**
 * ASP Service (Association Set Provider)
 *
 * Manages the ASP Merkle tree of approved deposit labels.
 * Auto-approves labels by:
 * 1. Maintaining an in-memory LeanIMT tree (backed by Redis for persistence)
 * 2. Rebuilding tree from existing deposits on startup (if Redis state missing)
 * 3. Adding new labels and updating on-chain root
 *
 * For hackathon: Auto-approves ALL labels (no blocklist check).
 * Production: Would check depositor addresses against sanctions lists.
 *
 * Redis Persistence:
 * - labelSet stored as Redis Set (asp:labels)
 * - lastProcessedBlock stored as string (asp:lastProcessedBlock)
 * - On startup, loads from Redis if available, otherwise rebuilds from indexer
 * - All processes (API, scheduler, worker) share the same Redis state
 */

import { LeanIMT } from '@zk-kit/lean-imt'
import { poseidon2 } from 'poseidon-lite'
import { createWalletClient, createPublicClient, http, defineChain } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import env from '#start/env'
import ChainService from '#services/chain_service'
import PonderService from '#services/ponder_service'
import redis from '@adonisjs/redis/services/main'

const ENTRYPOINT_ADDRESS = env.get('ENTRYPOINT_ADDRESS') as `0x${string}` | undefined
// Use ASP_POSTMAN_PRIVATE_KEY if set, otherwise fallback to RELAYER_PRIVATE_KEY
const ASP_POSTMAN_PRIVATE_KEY = (env.get('ASP_POSTMAN_PRIVATE_KEY') ||
  env.get('RELAYER_PRIVATE_KEY')) as `0x${string}` | undefined

// Minimal Entrypoint ABI for ASP operations
const ENTRYPOINT_ABI = [
  {
    name: 'updateRoot',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_root', type: 'uint256' },
      { name: '_ipfsCID', type: 'string' },
    ],
    outputs: [{ name: '_index', type: 'uint256' }],
  },
  {
    name: 'latestRoot',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '_root', type: 'uint256' }],
  },
] as const

/**
 * Poseidon hash function for LeanIMT.
 * Uses poseidon2 (2-input Poseidon) from poseidon-lite.
 */
function poseidonHash(a: bigint, b: bigint): bigint {
  return poseidon2([a, b])
}

/** Maximum tree depth (matches circuit constraint) */
export const MAX_ASP_TREE_DEPTH = 32

/** Placeholder IPFS CID for hackathon (production would store tree data) */
const PLACEHOLDER_IPFS_CID = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'

/** Redis keys for ASP state persistence */
const REDIS_KEY_LABELS = 'asp:labels'
const REDIS_KEY_LAST_BLOCK = 'asp:lastProcessedBlock'

/** Minimum balance required to submit on-chain update (0.01 MNT) */
const MIN_BALANCE_FOR_UPDATE = BigInt('10000000000000000')

/** Default retry configuration */
const DEFAULT_MAX_RETRIES = 3
const BASE_RETRY_DELAY_MS = 5000

/** Sleep helper for retry delays */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Merkle proof structure for withdrawal proofs */
export interface ASPMerkleProof {
  root: bigint
  leaf: bigint
  index: bigint
  siblings: bigint[]
  depth: number
}

/**
 * ASP Service - manages the ASP Merkle tree and on-chain root updates.
 */
export default class ASPService {
  private tree: LeanIMT<bigint>
  private labelSet: Set<string> = new Set()
  private lastProcessedBlock: bigint = 0n
  private ponderService: PonderService
  private initialized: boolean = false

  constructor() {
    this.tree = new LeanIMT<bigint>(poseidonHash)
    this.ponderService = new PonderService()
  }

  /**
   * Initialize service by rebuilding from indexer.
   * Redis is used only for labelSet membership checks and lastProcessedBlock tracking.
   * Tree MUST be rebuilt from indexer to ensure correct insertion order matching on-chain.
   * Must be called before using the service.
   */
  async initialize(): Promise<{ source: 'redis' | 'indexer'; labelsLoaded: number }> {
    if (this.initialized) {
      return { source: 'redis', labelsLoaded: this.size }
    }

    // Always rebuild from indexer to ensure correct insertion order
    // Redis Sets don't preserve order, so we can't rely on them for tree construction
    const { labelsAdded } = await this.rebuildFromDeposits()
    this.initialized = true

    return { source: 'indexer', labelsLoaded: labelsAdded }
  }

  /**
   * Persist current label to Redis
   */
  private async persistLabel(label: bigint): Promise<void> {
    await redis.sadd(REDIS_KEY_LABELS, label.toString())
  }

  /**
   * Persist multiple labels to Redis
   */
  private async persistLabels(labels: bigint[]): Promise<void> {
    if (labels.length === 0) return
    await redis.sadd(REDIS_KEY_LABELS, ...labels.map((l) => l.toString()))
  }

  /**
   * Persist last processed block to Redis
   */
  private async persistLastProcessedBlock(): Promise<void> {
    await redis.set(REDIS_KEY_LAST_BLOCK, this.lastProcessedBlock.toString())
  }

  /**
   * Clear all persisted state from Redis
   */
  private async clearPersistedState(): Promise<void> {
    await redis.del(REDIS_KEY_LABELS)
    await redis.del(REDIS_KEY_LAST_BLOCK)
  }

  /**
   * Check if ASP service is properly configured
   */
  static isConfigured(): boolean {
    return !!ENTRYPOINT_ADDRESS && !!ASP_POSTMAN_PRIVATE_KEY
  }

  /**
   * Get viem chain config
   */
  private getViemChain() {
    const chain = ChainService.getDefaultChain()
    return defineChain({
      id: chain.chainId,
      name: chain.name,
      nativeCurrency: chain.nativeCurrency,
      rpcUrls: {
        default: { http: [chain.rpcUrl] },
      },
      blockExplorers: {
        default: { name: `${chain.name} Explorer`, url: chain.explorer },
      },
      testnet: chain.chainId === 5003,
    })
  }

  /**
   * Get public client for reads
   */
  private getPublicClient() {
    const chain = this.getViemChain()
    return createPublicClient({
      chain,
      transport: http(ChainService.getDefaultChain().rpcUrl),
    })
  }

  /**
   * Get wallet client for writes
   */
  private getWalletClient() {
    if (!ASP_POSTMAN_PRIVATE_KEY) {
      throw new Error('ASP_POSTMAN_PRIVATE_KEY not configured')
    }
    const chain = this.getViemChain()
    return createWalletClient({
      account: privateKeyToAccount(ASP_POSTMAN_PRIVATE_KEY),
      chain,
      transport: http(ChainService.getDefaultChain().rpcUrl),
    })
  }

  /**
   * Get postman account address
   */
  getPostmanAddress(): `0x${string}` | null {
    if (!ASP_POSTMAN_PRIVATE_KEY) return null
    return privateKeyToAccount(ASP_POSTMAN_PRIVATE_KEY).address
  }

  /**
   * Get postman account balance
   */
  async getPostmanBalance(): Promise<bigint> {
    const address = this.getPostmanAddress()
    if (!address) {
      throw new Error('ASP_POSTMAN_PRIVATE_KEY not configured')
    }
    const client = this.getPublicClient()
    return client.getBalance({ address })
  }

  /**
   * Check if postman has sufficient balance for update
   */
  async checkPostmanBalance(): Promise<{ sufficient: boolean; balance: bigint; required: bigint }> {
    try {
      const balance = await this.getPostmanBalance()
      return {
        sufficient: balance >= MIN_BALANCE_FOR_UPDATE,
        balance,
        required: MIN_BALANCE_FOR_UPDATE,
      }
    } catch {
      return {
        sufficient: false,
        balance: 0n,
        required: MIN_BALANCE_FOR_UPDATE,
      }
    }
  }

  /**
   * Get current ASP tree root
   */
  get root(): bigint {
    return this.tree.size > 0 ? this.tree.root : 0n
  }

  /**
   * Get current tree size (number of approved labels)
   */
  get size(): number {
    return this.tree.size
  }

  /**
   * Get current tree depth
   */
  get depth(): number {
    return this.tree.depth
  }

  /**
   * Check if a label is in the ASP tree
   */
  hasLabel(label: bigint): boolean {
    return this.labelSet.has(label.toString())
  }

  /**
   * Initialize/rebuild tree from existing deposits in indexer.
   * Clears Redis state and rebuilds from scratch.
   */
  async rebuildFromDeposits(): Promise<{ labelsAdded: number; root: bigint }> {
    // Clear existing state for full rebuild (memory + Redis)
    this.labelSet.clear()
    this.tree = new LeanIMT<bigint>(poseidonHash)
    this.lastProcessedBlock = 0n
    await this.clearPersistedState()

    const labels: bigint[] = []
    let offset = 0
    const limit = 500
    let hasMore = true

    // Fetch all deposits in order (by block_number, log_index)
    while (hasMore) {
      const result = await this.ponderService.listPoolDeposits({
        chainId: ChainService.getDefaultChainId(),
        limit,
        offset,
      })

      for (const deposit of result.data) {
        const labelBigInt = BigInt(deposit.label)
        if (!this.labelSet.has(labelBigInt.toString())) {
          labels.push(labelBigInt)
          this.labelSet.add(labelBigInt.toString())
        }
        // Track latest block
        const blockNum = BigInt(deposit.blockNumber)
        if (blockNum > this.lastProcessedBlock) {
          this.lastProcessedBlock = blockNum
        }
      }

      hasMore = result.hasMore
      offset += limit
    }

    // Rebuild tree with all labels
    if (labels.length > 0) {
      this.tree.insertMany(labels)
      // Persist all labels to Redis
      await this.persistLabels(labels)
    }

    // Persist last processed block
    await this.persistLastProcessedBlock()

    return { labelsAdded: labels.length, root: this.root }
  }

  /**
   * Process new deposits and add their labels to ASP tree.
   * Returns labels that were newly added. Persists new labels to Redis.
   */
  async processNewDeposits(): Promise<{ newLabels: bigint[]; newRoot: bigint }> {
    const newLabels: bigint[] = []
    let offset = 0
    const limit = 100
    let hasMore = true

    // Fetch deposits, looking for ones we haven't processed yet
    while (hasMore) {
      const result = await this.ponderService.listPoolDeposits({
        chainId: ChainService.getDefaultChainId(),
        limit,
        offset,
      })

      for (const deposit of result.data) {
        const labelBigInt = BigInt(deposit.label)
        const labelStr = labelBigInt.toString()

        // Skip if already in tree
        if (this.labelSet.has(labelStr)) {
          continue
        }

        // For hackathon: auto-approve ALL labels
        // Production: would check deposit.depositor against blocklist here
        newLabels.push(labelBigInt)
        this.labelSet.add(labelStr)
        this.tree.insert(labelBigInt)

        // Persist label to Redis immediately
        await this.persistLabel(labelBigInt)

        // Update last processed block
        const blockNum = BigInt(deposit.blockNumber)
        if (blockNum > this.lastProcessedBlock) {
          this.lastProcessedBlock = blockNum
        }
      }

      hasMore = result.hasMore
      offset += limit
    }

    // Persist last processed block if we added any labels
    if (newLabels.length > 0) {
      await this.persistLastProcessedBlock()
    }

    return { newLabels, newRoot: this.root }
  }

  /**
   * Get the on-chain ASP root from the Entrypoint contract
   */
  async getOnChainRoot(): Promise<bigint> {
    if (!ENTRYPOINT_ADDRESS) {
      throw new Error('ENTRYPOINT_ADDRESS not configured')
    }

    const client = this.getPublicClient()
    const root = await client.readContract({
      address: ENTRYPOINT_ADDRESS,
      abi: ENTRYPOINT_ABI,
      functionName: 'latestRoot',
    })

    return BigInt(root)
  }

  /**
   * Update the on-chain ASP root if different from current tree root
   */
  async updateOnChainRoot(): Promise<{
    updated: boolean
    txHash?: string
    newRoot: bigint
    error?: string
  }> {
    if (!ENTRYPOINT_ADDRESS) {
      throw new Error('ENTRYPOINT_ADDRESS not configured')
    }

    const currentOnChainRoot = await this.getOnChainRoot()
    const localRoot = this.root

    // Skip if roots match or tree is empty
    if (localRoot === 0n || currentOnChainRoot === localRoot) {
      return { updated: false, newRoot: localRoot }
    }

    // Check postman balance before attempting update
    const balanceCheck = await this.checkPostmanBalance()
    if (!balanceCheck.sufficient) {
      const address = this.getPostmanAddress()
      console.error(
        `[ASP] Postman balance insufficient: ${balanceCheck.balance} < ${balanceCheck.required}`
      )
      throw new Error(
        `ASP postman account needs funding. Address: ${address}, Balance: ${balanceCheck.balance}, Required: ${balanceCheck.required}`
      )
    }

    const walletClient = this.getWalletClient()
    const publicClient = this.getPublicClient()

    // Call updateRoot on Entrypoint
    const hash = await walletClient.writeContract({
      address: ENTRYPOINT_ADDRESS,
      abi: ENTRYPOINT_ABI,
      functionName: 'updateRoot',
      args: [localRoot, PLACEHOLDER_IPFS_CID],
    })

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    if (receipt.status === 'reverted') {
      throw new Error('ASP root update transaction reverted')
    }

    return { updated: true, txHash: hash, newRoot: localRoot }
  }

  /**
   * Update on-chain root with automatic retry on failure
   */
  async updateOnChainRootWithRetry(maxRetries: number = DEFAULT_MAX_RETRIES): Promise<{
    updated: boolean
    txHash?: string
    newRoot: bigint
    attempts: number
    error?: string
  }> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.updateOnChainRoot()
        return { ...result, attempts: attempt }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // Don't retry on configuration errors
        if (
          lastError.message.includes('not configured') ||
          lastError.message.includes('needs funding')
        ) {
          return {
            updated: false,
            newRoot: this.root,
            attempts: attempt,
            error: lastError.message,
          }
        }

        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const delay = BASE_RETRY_DELAY_MS * attempt
          await sleep(delay)
        }
      }
    }

    return {
      updated: false,
      newRoot: this.root,
      attempts: maxRetries,
      error: lastError?.message || 'Unknown error after max retries',
    }
  }

  /**
   * Generate a Merkle proof for a label in the ASP tree.
   * Required for withdrawal proofs.
   */
  generateProof(label: bigint): ASPMerkleProof {
    const index = this.tree.indexOf(label)

    if (index === -1) {
      throw new Error('Label not found in ASP tree')
    }

    const proof = this.tree.generateProof(index)

    // Pad siblings to MAX_ASP_TREE_DEPTH for circuit compatibility
    const paddedSiblings = [...proof.siblings]
    while (paddedSiblings.length < MAX_ASP_TREE_DEPTH) {
      paddedSiblings.push(0n)
    }

    return {
      root: proof.root,
      leaf: proof.leaf,
      index: BigInt(proof.index),
      siblings: paddedSiblings,
      depth: this.tree.depth,
    }
  }

  /**
   * Get ASP service status
   */
  async getStatus(): Promise<{
    configured: boolean
    treeSize: number
    treeDepth: number
    localRoot: string
    onChainRoot: string | null
    synced: boolean
    lastProcessedBlock: string
    entrypointAddress: string | null
  }> {
    const configured = ASPService.isConfigured()
    let onChainRoot: string | null = null
    let synced = false

    if (configured) {
      try {
        const root = await this.getOnChainRoot()
        onChainRoot = root.toString()
        synced = this.root === root
      } catch {
        // Ignore errors getting on-chain root
      }
    }

    return {
      configured,
      treeSize: this.size,
      treeDepth: this.depth,
      localRoot: this.root.toString(),
      onChainRoot,
      synced,
      lastProcessedBlock: this.lastProcessedBlock.toString(),
      entrypointAddress: ENTRYPOINT_ADDRESS ?? null,
    }
  }
}

/**
 * Shared singleton instance of ASP service.
 * IMPORTANT: All consumers (controllers, jobs, preflight) MUST use this
 * to ensure they're all working with the same in-memory tree state.
 */
let sharedInstance: ASPService | null = null

export function getSharedASPService(): ASPService {
  if (!sharedInstance) {
    sharedInstance = new ASPService()
  }
  return sharedInstance
}
