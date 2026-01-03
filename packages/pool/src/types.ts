/**
 * Pool Types
 *
 * TypeScript interfaces for the Privacy Pool SDK.
 * These types are used across all pool-related modules.
 */

/**
 * Precommitment structure for a deposit
 */
export interface Precommitment {
  nullifier: bigint
  secret: bigint
  hash: bigint
}

/**
 * Full deposit information including location in pool
 */
export interface PoolDeposit {
  precommitment: Precommitment
  scope: bigint
  index: bigint
}

/**
 * Deposit event from chain
 */
export interface DepositEvent {
  precommitment: bigint
  value: bigint
  label: bigint
  blockNumber: bigint
  txHash: `0x${string}`
}

/**
 * Recovered deposit with full secrets
 */
export interface RecoveredDeposit {
  index: bigint
  nullifier: bigint
  secret: bigint
  precommitmentHash: bigint
  value: bigint
  label: bigint
  blockNumber: bigint
  txHash: `0x${string}`
}

/**
 * Pool account state tracking deposits
 */
export interface PoolAccountState {
  masterNullifier: bigint
  masterSecret: bigint
  deposits: Map<
    bigint,
    {
      // scope -> deposit info
      value: bigint
      label: bigint
      nullifier: bigint
      secret: bigint
      precommitmentHash: bigint
      commitmentHash: bigint
      blockNumber: bigint
      childWithdrawals: number
    }[]
  >
}

/**
 * Withdrawal secrets for spending a commitment
 */
export interface WithdrawalSecrets {
  nullifier: bigint
  secret: bigint
}

/**
 * Input for withdrawal proof generation
 * Based on 0xbow withdraw.circom circuit
 */
export interface WithdrawalProofInput {
  // Public inputs
  withdrawnValue: bigint
  stateRoot: bigint
  stateTreeDepth: number
  ASPRoot: bigint
  ASPTreeDepth: number
  context: bigint

  // Private inputs
  label: bigint
  existingValue: bigint
  existingNullifier: bigint
  existingSecret: bigint
  newNullifier: bigint
  newSecret: bigint
  stateSiblings: bigint[]
  stateIndex: bigint
  ASPSiblings: bigint[]
  ASPIndex: bigint
}

/**
 * Generated withdrawal proof
 */
export interface WithdrawalProof {
  // Groth16 proof components
  proof: {
    pi_a: [string, string, string]
    pi_b: [[string, string], [string, string], [string, string]]
    pi_c: [string, string, string]
    protocol: 'groth16'
    curve: 'bn128'
  }

  // Public signals (for on-chain verification)
  publicSignals: string[]

  // Computed outputs
  newCommitmentHash: bigint
  existingNullifierHash: bigint
}

/**
 * Circuit artifacts configuration
 */
export interface CircuitArtifacts {
  wasmPath: string
  zkeyPath: string
}

/**
 * Prover status for UI feedback
 */
export type ProverStatus =
  | { stage: 'idle' }
  | { stage: 'loading'; message: string }
  | { stage: 'computing'; message: string; progress?: number }
  | { stage: 'done'; proof: WithdrawalProof }
  | { stage: 'error'; error: string }
