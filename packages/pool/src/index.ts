/**
 * @galeon/pool
 *
 * Privacy Pool SDK for Galeon.
 * Provides ZK commitment generation, recovery, proofs, and contract interactions.
 *
 * Architecture:
 * - types.ts: TypeScript interfaces
 * - crypto.ts: Poseidon hashing (browser-only)
 * - keys.ts: Master key derivation via @galeon/stealth
 * - commitments.ts: Deposit/withdrawal commitment generation
 * - recovery.ts: On-chain deposit recovery
 * - merkle.ts: Merkle tree for pool commitments
 * - prover.ts: ZK proof generation (snarkjs)
 * - prover-client.ts: Web worker wrapper for non-blocking proofs
 * - contracts.ts: ABIs and addresses
 *
 * NOTE: Poseidon/ZK functions only work in browser (maci-crypto limitation).
 * For Node.js/SSR key derivation, use @galeon/stealth directly.
 *
 * @example
 * ```ts
 * import {
 *   derivePoolMasterKeys,
 *   createDepositSecrets,
 *   recoverPoolDeposits,
 *   PoolMerkleTree,
 *   generateProofAsync,
 *   POOL_SIGN_MESSAGE,
 *   POOL_CONTRACTS,
 * } from '@galeon/pool'
 *
 * // 1. Get signature for pool keys
 * const sig = await wallet.signMessage(POOL_SIGN_MESSAGE)
 *
 * // 2. Derive master keys
 * const { masterNullifier, masterSecret } = derivePoolMasterKeys(sig)
 *
 * // 3. Create deposit
 * const precommitment = await createDepositSecrets(masterNullifier, masterSecret, scope, 0n)
 *
 * // 4. Recover deposits from chain
 * const deposits = await recoverPoolDeposits(masterNullifier, masterSecret, scope, events)
 *
 * // 5. Build Merkle tree and generate proof
 * const tree = await PoolMerkleTree.create(commitments)
 * const merkleProof = tree.generateProof(myCommitment)
 * const zkProof = await generateProofAsync(proofInput)
 * ```
 */

// Types
export type {
  Precommitment,
  PoolDeposit,
  DepositEvent,
  RecoveredDeposit,
  PoolAccountState,
  WithdrawalSecrets,
  WithdrawalProofInput,
  WithdrawalProof,
  MergeDepositProofInput,
  MergeDepositProof,
  CircuitArtifacts,
  ProverStatus,
} from './types.js'

// Crypto (browser-only)
export {
  SNARK_SCALAR_FIELD,
  getPoseidon,
  poseidonHash,
  bytesToFieldElement,
  computeWithdrawalContext,
} from './crypto.js'

// Key derivation
export { POOL_SIGN_MESSAGE, derivePoolMasterKeys } from './keys.js'

// Commitments
export {
  createDepositSecrets,
  computeCommitmentHash,
  computeNullifierHash,
  createWithdrawalSecrets,
} from './commitments.js'

// Recovery
export { recoverPoolDeposits, createPoolAccount } from './recovery.js'

// Merkle Tree
export {
  MAX_TREE_DEPTH,
  PoolMerkleTree,
  buildMerkleTreeFromCommitments,
  type MerkleProof,
} from './merkle.js'

// ZK Prover
export {
  DEFAULT_WITHDRAW_ARTIFACTS,
  DEFAULT_COMMITMENT_ARTIFACTS,
  DEFAULT_MERGE_DEPOSIT_ARTIFACTS,
  DEFAULT_CIRCUIT_ARTIFACTS, // deprecated alias
  prepareCircuitInputs,
  generateWithdrawalProof,
  prepareMergeDepositInputs,
  generateMergeDepositProof,
  formatMergeDepositProofForContract,
  verifyProofLocally,
  formatProofForContract,
  encodeProofAsBytes,
} from './prover.js'

// Prover Client (web worker wrapper)
export {
  ProverClient,
  getDefaultProver,
  generateProofAsync,
  type ProverClientOptions,
  type GenerateProofOptions,
} from './prover-client.js'

// Contracts
export {
  POOL_CONTRACTS,
  entrypointAbi,
  poolAbi,
  type PoolChainId,
  type PoolContracts,
} from './contracts.js'
