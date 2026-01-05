/**
 * ASP Service (Association Set Provider)
 *
 * Manages the ASP Merkle tree of approved deposit labels.
 * Auto-approves labels by:
 * 1. Maintaining an in-memory LeanIMT tree
 * 2. Rebuilding tree from existing deposits on startup
 * 3. Adding new labels and updating on-chain root
 *
 * For hackathon: Auto-approves ALL labels (no blocklist check).
 * Production: Would check depositor addresses against sanctions lists.
 */

import { LeanIMT } from '@zk-kit/lean-imt'
import { poseidon2 } from 'poseidon-lite'
import { createWalletClient, createPublicClient, http, defineChain } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import env from '#start/env'
import ChainService from '#services/chain_service'
import PonderService from '#services/ponder_service'

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

  constructor() {
    this.tree = new LeanIMT<bigint>(poseidonHash)
    this.ponderService = new PonderService()
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
   * Should be called on service startup.
   */
  async rebuildFromDeposits(): Promise<{ labelsAdded: number; root: bigint }> {
    // Clear existing state for full rebuild
    this.labelSet.clear()
    this.tree = new LeanIMT<bigint>(poseidonHash)
    this.lastProcessedBlock = 0n

    const labels: bigint[] = []
    let offset = 0
    const limit = 500
    let hasMore = true

    console.log('[ASP] Rebuilding tree from deposits...')

    // Fetch all deposits in order (by block_number, log_index)
    while (hasMore) {
      const result = await this.ponderService.listPoolDeposits({
        chainId: ChainService.getDefaultChainId(),
        limit,
        offset,
      })

      console.log(`[ASP] Fetched ${result.data.length} deposits (offset: ${offset})`)

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
      console.log(`[ASP] Inserted ${labels.length} labels, root: ${this.root}`)
    } else {
      console.log('[ASP] No labels found to insert')
    }

    return { labelsAdded: labels.length, root: this.root }
  }

  /**
   * Process new deposits and add their labels to ASP tree.
   * Returns labels that were newly added.
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

        // Update last processed block
        const blockNum = BigInt(deposit.blockNumber)
        if (blockNum > this.lastProcessedBlock) {
          this.lastProcessedBlock = blockNum
        }
      }

      hasMore = result.hasMore
      offset += limit
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
  async updateOnChainRoot(): Promise<{ updated: boolean; txHash?: string; newRoot: bigint }> {
    if (!ENTRYPOINT_ADDRESS) {
      throw new Error('ENTRYPOINT_ADDRESS not configured')
    }

    const currentOnChainRoot = await this.getOnChainRoot()
    const localRoot = this.root

    // Skip if roots match or tree is empty
    if (localRoot === 0n || currentOnChainRoot === localRoot) {
      return { updated: false, newRoot: localRoot }
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
    await publicClient.waitForTransactionReceipt({ hash })

    return { updated: true, txHash: hash, newRoot: localRoot }
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
