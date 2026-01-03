/**
 * Pool Recovery
 *
 * Functions for recovering pool deposits from chain events.
 * This enables "no notes needed" - users can recover all deposits
 * by scanning the chain and matching precommitments to derived secrets.
 */

import { createDepositSecrets } from './commitments.js'
import type { DepositEvent, RecoveredDeposit } from './types.js'

/** Maximum consecutive misses before stopping scan */
const MAX_CONSECUTIVE_MISSES = 10

/**
 * Recover pool deposits by scanning chain events.
 *
 * This is the core of "no notes needed" - we can reconstruct all deposits
 * by scanning the chain and matching precommitments to derived secrets.
 *
 * Algorithm:
 * 1. Create a map of precommitment -> event for O(1) lookup
 * 2. Try deposit indices starting from 0
 * 3. For each index, generate the expected precommitment
 * 4. Check if it matches any on-chain event
 * 5. Stop after MAX_CONSECUTIVE_MISSES to handle failed txs
 *
 * @param masterNullifier - Master nullifier from wallet signature
 * @param masterSecret - Master secret from wallet signature
 * @param scope - Pool scope
 * @param depositEvents - Array of deposit events from the chain
 * @returns Matched deposits with their secrets
 */
export async function recoverPoolDeposits(
  masterNullifier: bigint,
  masterSecret: bigint,
  scope: bigint,
  depositEvents: DepositEvent[]
): Promise<RecoveredDeposit[]> {
  const foundDeposits: RecoveredDeposit[] = []

  // Create a map for fast O(1) lookup by precommitment
  const depositMap = new Map<string, DepositEvent>()
  for (const event of depositEvents) {
    depositMap.set(event.precommitment.toString(), event)
  }

  let consecutiveMisses = 0

  // Try indices starting from 0
  for (let index = BigInt(0); ; index++) {
    const { nullifier, secret, hash } = await createDepositSecrets(
      masterNullifier,
      masterSecret,
      scope,
      index
    )

    const event = depositMap.get(hash.toString())

    if (!event) {
      consecutiveMisses++
      if (consecutiveMisses >= MAX_CONSECUTIVE_MISSES) {
        break
      }
      continue
    }

    // Found a deposit!
    consecutiveMisses = 0
    foundDeposits.push({
      index,
      nullifier,
      secret,
      precommitmentHash: hash,
      value: event.value,
      label: event.label,
      blockNumber: event.blockNumber,
      txHash: event.txHash,
    })
  }

  return foundDeposits
}

/**
 * Create a pool account state from wallet signature.
 *
 * @param masterNullifier - Master nullifier key
 * @param masterSecret - Master secret key
 * @returns Empty pool account state ready for deposits
 */
export function createPoolAccount(
  masterNullifier: bigint,
  masterSecret: bigint
): {
  masterNullifier: bigint
  masterSecret: bigint
  deposits: Map<bigint, unknown[]>
} {
  return {
    masterNullifier,
    masterSecret,
    deposits: new Map(),
  }
}
