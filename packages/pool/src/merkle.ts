/**
 * Merkle Tree
 *
 * Constructs and manages the Merkle tree for pool commitments.
 * Uses LeanIMT (Lean Incremental Merkle Tree) from @zk-kit for efficiency.
 */

import { LeanIMT, type LeanIMTMerkleProof } from '@zk-kit/lean-imt'
import { poseidonHash } from './crypto.js'

/** Maximum tree depth (matches circuit constraint) */
export const MAX_TREE_DEPTH = 32

/** Merkle proof structure for ZK circuits */
export interface MerkleProof {
  root: bigint
  leaf: bigint
  index: bigint
  siblings: bigint[]
  depth: number
}

/**
 * Poseidon hash function for Merkle tree nodes.
 * LeanIMT requires a sync hash function, so we cache the poseidon instance.
 */
let cachedPoseidon: ((inputs: bigint[]) => bigint) | null = null

async function ensurePoseidon(): Promise<(inputs: bigint[]) => bigint> {
  if (cachedPoseidon) return cachedPoseidon

  // Import dynamically for SSR compatibility
  if (typeof window === 'undefined') {
    throw new Error('Merkle tree operations are only available in browser context')
  }

  const { poseidon } = await import('maci-crypto/build/ts/hashing')
  cachedPoseidon = poseidon as (inputs: bigint[]) => bigint
  return cachedPoseidon
}

/**
 * Hash function for LeanIMT - uses Poseidon
 */
function poseidonHashSync(a: bigint, b: bigint): bigint {
  if (!cachedPoseidon) {
    throw new Error('Poseidon not initialized. Call initMerkleTree() first.')
  }
  return cachedPoseidon([a, b])
}

/**
 * Pool Merkle Tree class.
 * Wraps LeanIMT with pool-specific functionality.
 */
export class PoolMerkleTree {
  private tree: LeanIMT<bigint>

  private constructor() {
    this.tree = new LeanIMT<bigint>(poseidonHashSync)
  }

  /**
   * Create a new Merkle tree from commitments.
   * Must be called with await due to async Poseidon loading.
   *
   * @param commitments - Array of commitment hashes to insert
   * @returns Initialized PoolMerkleTree
   */
  static async create(commitments: bigint[] = []): Promise<PoolMerkleTree> {
    // Ensure Poseidon is loaded before creating tree
    await ensurePoseidon()

    const tree = new PoolMerkleTree()

    if (commitments.length > 0) {
      tree.tree.insertMany(commitments)
    }

    return tree
  }

  /**
   * Get the current root of the tree.
   */
  get root(): bigint {
    return this.tree.root
  }

  /**
   * Get the current size (number of leaves).
   */
  get size(): number {
    return this.tree.size
  }

  /**
   * Get the current depth.
   */
  get depth(): number {
    return this.tree.depth
  }

  /**
   * Insert a new commitment into the tree.
   *
   * @param commitment - Commitment hash to insert
   * @returns New root after insertion
   */
  insert(commitment: bigint): bigint {
    this.tree.insert(commitment)
    return this.tree.root
  }

  /**
   * Insert multiple commitments.
   *
   * @param commitments - Array of commitment hashes
   * @returns New root after insertions
   */
  insertMany(commitments: bigint[]): bigint {
    this.tree.insertMany(commitments)
    return this.tree.root
  }

  /**
   * Check if a commitment exists in the tree.
   *
   * @param commitment - Commitment to check
   * @returns Index if found, -1 otherwise
   */
  indexOf(commitment: bigint): number {
    return this.tree.indexOf(commitment)
  }

  /**
   * Generate a Merkle proof for a commitment.
   *
   * @param commitment - Commitment to generate proof for
   * @returns Merkle proof for ZK circuit
   * @throws Error if commitment not found
   */
  generateProof(commitment: bigint): MerkleProof {
    const index = this.tree.indexOf(commitment)

    if (index === -1) {
      throw new Error('Commitment not found in tree')
    }

    const proof = this.tree.generateProof(index)

    // Pad siblings to MAX_TREE_DEPTH for circuit compatibility
    const paddedSiblings = [...proof.siblings]
    while (paddedSiblings.length < MAX_TREE_DEPTH) {
      paddedSiblings.push(BigInt(0))
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
   * Verify a Merkle proof.
   *
   * @param proof - Proof to verify
   * @returns true if proof is valid
   */
  static verifyProof(proof: MerkleProof): boolean {
    if (!cachedPoseidon) {
      throw new Error('Poseidon not initialized')
    }

    let currentHash = proof.leaf
    let index = proof.index

    for (let i = 0; i < proof.depth; i++) {
      const sibling = proof.siblings[i]

      if (index % 2n === 0n) {
        currentHash = cachedPoseidon([currentHash, sibling])
      } else {
        currentHash = cachedPoseidon([sibling, currentHash])
      }

      index = index / 2n
    }

    return currentHash === proof.root
  }
}

/**
 * Build a Merkle tree from on-chain deposit events.
 *
 * @param commitments - Array of commitment hashes from Deposited events
 * @returns Initialized PoolMerkleTree
 */
export async function buildMerkleTreeFromCommitments(
  commitments: bigint[]
): Promise<PoolMerkleTree> {
  return PoolMerkleTree.create(commitments)
}
