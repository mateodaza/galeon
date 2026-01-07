/**
 * ZK Prover
 *
 * Generates Groth16 proofs for privacy pool withdrawals.
 * Uses snarkjs with web worker for non-blocking proof generation.
 *
 * Circuit: 0xbow withdraw.circom (Groth16 on BN254/BN128)
 */

import type {
  WithdrawalProofInput,
  WithdrawalProof,
  MergeDepositProofInput,
  MergeDepositProof,
  CircuitArtifacts,
  ProverStatus,
} from './types.js'
import { poseidonHash } from './crypto.js'

/** Default withdraw circuit artifacts paths (relative to public folder) */
export const DEFAULT_WITHDRAW_ARTIFACTS: CircuitArtifacts = {
  wasmPath: '/circuits/withdraw.wasm',
  zkeyPath: '/circuits/withdraw_final.zkey',
}

/** Default commitment circuit artifacts paths (for ragequit) */
export const DEFAULT_COMMITMENT_ARTIFACTS: CircuitArtifacts = {
  wasmPath: '/circuits/commitment.wasm',
  zkeyPath: '/circuits/commitment_final.zkey',
}

/** Default merge deposit circuit artifacts paths (for O(1) withdrawals) */
export const DEFAULT_MERGE_DEPOSIT_ARTIFACTS: CircuitArtifacts = {
  wasmPath: '/circuits/mergeDeposit.wasm',
  zkeyPath: '/circuits/mergeDeposit_final.zkey',
}

/** @deprecated Use DEFAULT_WITHDRAW_ARTIFACTS instead */
export const DEFAULT_CIRCUIT_ARTIFACTS = DEFAULT_WITHDRAW_ARTIFACTS

/** Maximum tree depth for padding */
const MAX_TREE_DEPTH = 32

/**
 * Prepare withdrawal proof inputs for snarkjs.
 * Converts bigints to strings and pads arrays to max depth.
 *
 * @param input - Withdrawal proof input
 * @returns Circuit inputs as string map
 */
export function prepareCircuitInputs(
  input: WithdrawalProofInput
): Record<string, string | string[]> {
  // Pad siblings arrays to MAX_TREE_DEPTH
  const paddedStateSiblings = [...input.stateSiblings]
  while (paddedStateSiblings.length < MAX_TREE_DEPTH) {
    paddedStateSiblings.push(BigInt(0))
  }

  const paddedASPSiblings = [...input.ASPSiblings]
  while (paddedASPSiblings.length < MAX_TREE_DEPTH) {
    paddedASPSiblings.push(BigInt(0))
  }

  return {
    // Public inputs
    withdrawnValue: input.withdrawnValue.toString(),
    stateRoot: input.stateRoot.toString(),
    stateTreeDepth: input.stateTreeDepth.toString(),
    ASPRoot: input.ASPRoot.toString(),
    ASPTreeDepth: input.ASPTreeDepth.toString(),
    context: input.context.toString(),

    // Private inputs
    label: input.label.toString(),
    existingValue: input.existingValue.toString(),
    existingNullifier: input.existingNullifier.toString(),
    existingSecret: input.existingSecret.toString(),
    newNullifier: input.newNullifier.toString(),
    newSecret: input.newSecret.toString(),
    stateSiblings: paddedStateSiblings.map((s) => s.toString()),
    stateIndex: input.stateIndex.toString(),
    ASPSiblings: paddedASPSiblings.map((s) => s.toString()),
    ASPIndex: input.ASPIndex.toString(),
  }
}

/**
 * Generate a withdrawal proof using snarkjs.
 * This is CPU-intensive and should be run in a web worker for production.
 *
 * @param input - Withdrawal proof input
 * @param artifacts - Circuit artifacts paths
 * @param onProgress - Optional progress callback
 * @returns Generated proof
 */
export async function generateWithdrawalProof(
  input: WithdrawalProofInput,
  artifacts: CircuitArtifacts = DEFAULT_CIRCUIT_ARTIFACTS,
  onProgress?: (status: ProverStatus) => void
): Promise<WithdrawalProof> {
  onProgress?.({ stage: 'loading', message: 'Loading circuit artifacts...' })

  // Dynamic import snarkjs for browser compatibility
  const snarkjs = await import('snarkjs')

  // Prepare inputs
  const circuitInputs = prepareCircuitInputs(input)

  onProgress?.({ stage: 'computing', message: 'Generating witness...', progress: 10 })

  try {
    // Generate proof
    onProgress?.({ stage: 'computing', message: 'Computing proof...', progress: 30 })

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      circuitInputs,
      artifacts.wasmPath,
      artifacts.zkeyPath
    )

    onProgress?.({ stage: 'computing', message: 'Computing commitments...', progress: 90 })

    // Compute the expected output hashes for verification
    const existingNullifierHash = await poseidonHash([input.existingNullifier])

    // New commitment: Poseidon(newValue, newLabel, Poseidon(newNullifier, newSecret))
    const newPrecommitment = await poseidonHash([input.newNullifier, input.newSecret])
    const newValue = input.existingValue - input.withdrawnValue
    const newCommitmentHash = await poseidonHash([newValue, input.label, newPrecommitment])

    const result: WithdrawalProof = {
      proof: proof as WithdrawalProof['proof'],
      publicSignals,
      newCommitmentHash,
      existingNullifierHash,
    }

    onProgress?.({ stage: 'done', proof: result })

    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Proof generation failed'
    onProgress?.({ stage: 'error', error: message })
    throw new Error(`Proof generation failed: ${message}`)
  }
}

/**
 * Verify a withdrawal proof locally (for debugging).
 * On-chain verification is done by the Verifier contract.
 *
 * @param proof - Proof to verify
 * @param vkeyPath - Path to verification key JSON
 * @returns true if proof is valid
 */
export async function verifyProofLocally(
  proof: WithdrawalProof,
  vkeyPath: string = '/circuits/verification_key.json'
): Promise<boolean> {
  const snarkjs = await import('snarkjs')

  // Fetch verification key
  const response = await fetch(vkeyPath)
  const vkey = await response.json()

  return snarkjs.groth16.verify(vkey, proof.publicSignals, proof.proof)
}

/**
 * Format proof for on-chain submission.
 * Converts snarkjs proof format to Solidity calldata.
 *
 * @param proof - Generated proof
 * @returns Formatted calldata for contract
 */
export function formatProofForContract(proof: WithdrawalProof): {
  pA: [bigint, bigint]
  pB: [[bigint, bigint], [bigint, bigint]]
  pC: [bigint, bigint]
  publicSignals: bigint[]
} {
  const p = proof.proof

  return {
    // Note: snarkjs outputs pi_a as [x, y, 1], we only need [x, y]
    pA: [BigInt(p.pi_a[0]), BigInt(p.pi_a[1])],
    // Note: snarkjs outputs pi_b in different order, need to swap
    pB: [
      [BigInt(p.pi_b[0][1]), BigInt(p.pi_b[0][0])],
      [BigInt(p.pi_b[1][1]), BigInt(p.pi_b[1][0])],
    ],
    pC: [BigInt(p.pi_c[0]), BigInt(p.pi_c[1])],
    publicSignals: proof.publicSignals.map((s) => BigInt(s)),
  }
}

/**
 * Encode proof as bytes for contract call.
 *
 * @param proof - Generated proof
 * @returns Encoded proof bytes
 */
export function encodeProofAsBytes(proof: WithdrawalProof): `0x${string}` {
  const formatted = formatProofForContract(proof)

  // Encode as ABI-packed bytes
  // Format: pA[0], pA[1], pB[0][0], pB[0][1], pB[1][0], pB[1][1], pC[0], pC[1]
  const parts = [
    formatted.pA[0],
    formatted.pA[1],
    formatted.pB[0][0],
    formatted.pB[0][1],
    formatted.pB[1][0],
    formatted.pB[1][1],
    formatted.pC[0],
    formatted.pC[1],
  ]

  // Each element is 32 bytes (256 bits)
  const hex = parts.map((n) => n.toString(16).padStart(64, '0')).join('')

  return `0x${hex}` as `0x${string}`
}

/**
 * Prepare merge deposit proof inputs for snarkjs.
 * Converts bigints to strings and pads arrays to max depth.
 *
 * @param input - Merge deposit proof input
 * @returns Circuit inputs as string map
 */
export function prepareMergeDepositInputs(
  input: MergeDepositProofInput
): Record<string, string | string[]> {
  // Pad siblings arrays to MAX_TREE_DEPTH
  const paddedStateSiblings = [...input.stateSiblings]
  while (paddedStateSiblings.length < MAX_TREE_DEPTH) {
    paddedStateSiblings.push(BigInt(0))
  }

  const paddedASPSiblings = [...input.ASPSiblings]
  while (paddedASPSiblings.length < MAX_TREE_DEPTH) {
    paddedASPSiblings.push(BigInt(0))
  }

  return {
    // Public inputs
    depositValue: input.depositValue.toString(),
    stateRoot: input.stateRoot.toString(),
    stateTreeDepth: input.stateTreeDepth.toString(),
    ASPRoot: input.ASPRoot.toString(),
    ASPTreeDepth: input.ASPTreeDepth.toString(),
    context: input.context.toString(),

    // Private inputs
    label: input.label.toString(),
    existingValue: input.existingValue.toString(),
    existingNullifier: input.existingNullifier.toString(),
    existingSecret: input.existingSecret.toString(),
    newNullifier: input.newNullifier.toString(),
    newSecret: input.newSecret.toString(),
    stateSiblings: paddedStateSiblings.map((s) => s.toString()),
    stateIndex: input.stateIndex.toString(),
    ASPSiblings: paddedASPSiblings.map((s) => s.toString()),
    ASPIndex: input.ASPIndex.toString(),
  }
}

/**
 * Generate a merge deposit proof using snarkjs.
 * Merges a new deposit into an existing commitment for O(1) withdrawals.
 *
 * @param input - Merge deposit proof input
 * @param artifacts - Circuit artifacts paths
 * @param onProgress - Optional progress callback
 * @returns Generated proof
 */
export async function generateMergeDepositProof(
  input: MergeDepositProofInput,
  artifacts: CircuitArtifacts = DEFAULT_MERGE_DEPOSIT_ARTIFACTS,
  onProgress?: (status: ProverStatus) => void
): Promise<MergeDepositProof> {
  onProgress?.({ stage: 'loading', message: 'Loading merge deposit circuit...' })

  // Dynamic import snarkjs for browser compatibility
  const snarkjs = await import('snarkjs')

  // Prepare inputs
  const circuitInputs = prepareMergeDepositInputs(input)

  onProgress?.({ stage: 'computing', message: 'Generating witness...', progress: 10 })

  try {
    // Generate proof
    onProgress?.({ stage: 'computing', message: 'Computing merge deposit proof...', progress: 30 })

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      circuitInputs,
      artifacts.wasmPath,
      artifacts.zkeyPath
    )

    onProgress?.({ stage: 'computing', message: 'Computing commitments...', progress: 90 })

    // Compute the expected output hashes for verification
    const existingNullifierHash = await poseidonHash([input.existingNullifier])

    // New commitment: Poseidon(mergedValue, label, Poseidon(newNullifier, newSecret))
    const newPrecommitment = await poseidonHash([input.newNullifier, input.newSecret])
    const mergedValue = input.existingValue + input.depositValue
    const newCommitmentHash = await poseidonHash([mergedValue, input.label, newPrecommitment])

    const result: MergeDepositProof = {
      proof: proof as MergeDepositProof['proof'],
      publicSignals,
      newCommitmentHash,
      existingNullifierHash,
    }

    onProgress?.({ stage: 'done', proof: result as unknown as WithdrawalProof })

    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Merge deposit proof generation failed'
    onProgress?.({ stage: 'error', error: message })
    throw new Error(`Merge deposit proof generation failed: ${message}`)
  }
}

/**
 * Format merge deposit proof for on-chain submission.
 * Converts snarkjs proof format to Solidity calldata.
 *
 * @param proof - Generated proof
 * @returns Formatted calldata for contract
 */
export function formatMergeDepositProofForContract(proof: MergeDepositProof): {
  pA: [bigint, bigint]
  pB: [[bigint, bigint], [bigint, bigint]]
  pC: [bigint, bigint]
  publicSignals: bigint[]
} {
  const p = proof.proof

  return {
    pA: [BigInt(p.pi_a[0]), BigInt(p.pi_a[1])],
    pB: [
      [BigInt(p.pi_b[0][1]), BigInt(p.pi_b[0][0])],
      [BigInt(p.pi_b[1][1]), BigInt(p.pi_b[1][0])],
    ],
    pC: [BigInt(p.pi_c[0]), BigInt(p.pi_c[1])],
    publicSignals: proof.publicSignals.map((s) => BigInt(s)),
  }
}
