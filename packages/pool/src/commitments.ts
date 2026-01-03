/**
 * Pool Commitments
 *
 * Functions for creating deposit and withdrawal commitments.
 * All hashing uses Poseidon for ZK-circuit compatibility.
 */

import { poseidonHash } from './crypto.js'
import type { Precommitment, WithdrawalSecrets } from './types.js'

/**
 * Generates deposit secrets for a specific pool and index.
 *
 * The nullifier and secret are derived deterministically from:
 * - Master keys (from wallet signature)
 * - Pool scope (identifies the pool)
 * - Deposit index (0 for first deposit, 1 for second, etc.)
 *
 * @param masterNullifier - Master nullifier key from wallet signature
 * @param masterSecret - Master secret key from wallet signature
 * @param scope - Pool scope (identifies the specific pool)
 * @param index - Deposit index (0 for first deposit, 1 for second, etc.)
 * @returns Deposit nullifier, secret, and precommitment hash
 */
export async function createDepositSecrets(
  masterNullifier: bigint,
  masterSecret: bigint,
  scope: bigint,
  index: bigint
): Promise<Precommitment> {
  // Generate deposit nullifier: Poseidon(masterNullifier, scope, index)
  const nullifier = await poseidonHash([masterNullifier, scope, index])

  // Generate deposit secret: Poseidon(masterSecret, scope, index)
  const secret = await poseidonHash([masterSecret, scope, index])

  // Generate precommitment hash: Poseidon(nullifier, secret)
  const hash = await poseidonHash([nullifier, secret])

  return { nullifier, secret, hash }
}

/**
 * Computes the commitment hash from value, label, and precommitment.
 *
 * @param value - Deposit amount
 * @param label - Commitment label (assigned by pool on deposit)
 * @param precommitmentHash - Hash from createDepositSecrets
 * @returns Commitment hash
 */
export async function computeCommitmentHash(
  value: bigint,
  label: bigint,
  precommitmentHash: bigint
): Promise<bigint> {
  return poseidonHash([value, label, precommitmentHash])
}

/**
 * Computes the nullifier hash for spending a commitment.
 *
 * @param nullifier - The commitment's nullifier
 * @returns Nullifier hash to submit on-chain
 */
export async function computeNullifierHash(nullifier: bigint): Promise<bigint> {
  return poseidonHash([nullifier])
}

/**
 * Creates withdrawal secrets for spending a commitment and creating a new one.
 *
 * @param masterNullifier - Master nullifier key
 * @param masterSecret - Master secret key
 * @param label - The commitment's label
 * @param index - Withdrawal index for this commitment (0 for first withdrawal)
 * @returns New nullifier and secret for the child commitment
 */
export async function createWithdrawalSecrets(
  masterNullifier: bigint,
  masterSecret: bigint,
  label: bigint,
  index: bigint
): Promise<WithdrawalSecrets> {
  // Generate withdrawal nullifier: Poseidon(masterNullifier, label, index)
  const nullifier = await poseidonHash([masterNullifier, label, index])

  // Generate withdrawal secret: Poseidon(masterSecret, label, index)
  const secret = await poseidonHash([masterSecret, label, index])

  return { nullifier, secret }
}
