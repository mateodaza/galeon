/**
 * Pool Recovery
 *
 * Functions for recovering pool deposits from chain events.
 * This enables "no notes needed" - users can recover all deposits
 * by scanning the chain and matching precommitments to derived secrets.
 */

import {
  createDepositSecrets,
  createWithdrawalSecrets,
  computeCommitmentHash,
} from './commitments.js'
import { poseidonHash } from './crypto.js'
import type { DepositEvent, RecoveredDeposit, MergeDepositEvent, WithdrawalEvent } from './types.js'

/** Maximum child index to try when recovering merge deposits */
const MAX_CHILD_INDEX = 100

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

  // Debug: Log first few expected precommitments
  console.log('[recoverPoolDeposits] Trying to match precommitments...')

  // Try indices starting from 0
  for (let index = BigInt(0); ; index++) {
    const { nullifier, secret, hash } = await createDepositSecrets(
      masterNullifier,
      masterSecret,
      scope,
      index
    )

    // Debug: Log first 5 expected precommitments
    if (index < 5n) {
      const hashHex = `0x${hash.toString(16).padStart(64, '0')}`
      console.log(
        `[recoverPoolDeposits] Index ${index}: expected precommitment ${hash.toString()} (hex: ${hashHex})`
      )
    }

    const event = depositMap.get(hash.toString())

    if (!event) {
      consecutiveMisses++
      if (consecutiveMisses >= MAX_CONSECUTIVE_MISSES) {
        console.log(
          `[recoverPoolDeposits] Stopped after ${index} indices (${MAX_CONSECUTIVE_MISSES} consecutive misses)`
        )
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

/**
 * Recover a deposit that was merged into a new commitment.
 *
 * When a merge deposit occurs:
 * 1. The existing commitment's nullifier is spent
 * 2. A new commitment is created with: newValue = existingValue + depositValue
 * 3. The new commitment uses secrets derived via createWithdrawalSecrets
 *
 * This function tries different childIndices to find which one was used,
 * then returns the recovered deposit with correct secrets.
 *
 * @param masterNullifier - Master nullifier key
 * @param masterSecret - Master secret key
 * @param existingDeposit - The deposit that was merged (with its secrets)
 * @param mergeEvent - The merge deposit event from chain
 * @returns Recovered deposit with new secrets, or null if not found
 */
export async function recoverMergeDeposit(
  masterNullifier: bigint,
  masterSecret: bigint,
  existingDeposit: RecoveredDeposit,
  mergeEvent: MergeDepositEvent
): Promise<RecoveredDeposit | null> {
  // Verify this merge event matches the existing deposit
  const existingNullifierHash = await poseidonHash([existingDeposit.nullifier])
  if (existingNullifierHash !== mergeEvent.existingNullifierHash) {
    console.warn('[recoverMergeDeposit] Nullifier hash mismatch - wrong merge event')
    return null
  }

  const newValue = existingDeposit.value + mergeEvent.depositValue

  // Try different child indices to find the correct one
  for (let childIndex = 0n; childIndex < BigInt(MAX_CHILD_INDEX); childIndex++) {
    const { nullifier: newNullifier, secret: newSecret } = await createWithdrawalSecrets(
      masterNullifier,
      masterSecret,
      existingDeposit.label,
      childIndex
    )

    // Compute precommitment hash: Poseidon(newNullifier, newSecret)
    const newPrecommitmentHash = await poseidonHash([newNullifier, newSecret])

    // Compute commitment hash: Poseidon(newValue, label, precommitmentHash)
    const computedCommitment = await computeCommitmentHash(
      newValue,
      existingDeposit.label,
      newPrecommitmentHash
    )

    if (computedCommitment === mergeEvent.newCommitment) {
      console.log(`[recoverMergeDeposit] Found matching commitment at childIndex ${childIndex}`)
      return {
        index: childIndex, // Use childIndex as the new "index" for this merged deposit
        nullifier: newNullifier,
        secret: newSecret,
        precommitmentHash: newPrecommitmentHash,
        value: newValue,
        label: existingDeposit.label,
        blockNumber: mergeEvent.blockNumber,
        txHash: mergeEvent.txHash,
      }
    }
  }

  console.warn(
    `[recoverMergeDeposit] Could not find matching childIndex (tried 0-${MAX_CHILD_INDEX - 1})`
  )
  return null
}

/**
 * Recover a deposit's change commitment after a partial withdrawal.
 *
 * When a partial withdrawal occurs:
 * 1. The existing commitment's nullifier is spent
 * 2. A new commitment is created with: newValue = existingValue - withdrawnValue
 * 3. The new commitment uses secrets derived via createWithdrawalSecrets
 *
 * This function tries different childIndices to find which one was used,
 * then returns the recovered deposit with correct secrets.
 *
 * @param masterNullifier - Master nullifier key
 * @param masterSecret - Master secret key
 * @param existingDeposit - The deposit that was partially withdrawn from (with its secrets)
 * @param withdrawalEvent - The withdrawal event from chain
 * @returns Recovered deposit with new secrets for remaining balance, or null if not found/full withdrawal
 */
export async function recoverWithdrawalChange(
  masterNullifier: bigint,
  masterSecret: bigint,
  existingDeposit: RecoveredDeposit,
  withdrawalEvent: WithdrawalEvent
): Promise<RecoveredDeposit | null> {
  // Verify this withdrawal event matches the existing deposit
  const existingNullifierHash = await poseidonHash([existingDeposit.nullifier])
  if (existingNullifierHash !== withdrawalEvent.spentNullifier) {
    console.warn('[recoverWithdrawalChange] Nullifier hash mismatch - wrong withdrawal event')
    return null
  }

  // Calculate remaining value after withdrawal
  const newValue = existingDeposit.value - withdrawalEvent.withdrawnValue

  // If full withdrawal (no remaining balance), return null
  if (newValue <= 0n) {
    console.log('[recoverWithdrawalChange] Full withdrawal - no change commitment')
    return null
  }

  // newCommitment of 0 means full withdrawal (no change commitment)
  if (withdrawalEvent.newCommitment === 0n) {
    console.log('[recoverWithdrawalChange] newCommitment is 0 - full withdrawal')
    return null
  }

  // Try different child indices to find the correct one
  for (let childIndex = 0n; childIndex < BigInt(MAX_CHILD_INDEX); childIndex++) {
    const { nullifier: newNullifier, secret: newSecret } = await createWithdrawalSecrets(
      masterNullifier,
      masterSecret,
      existingDeposit.label,
      childIndex
    )

    // Compute precommitment hash: Poseidon(newNullifier, newSecret)
    const newPrecommitmentHash = await poseidonHash([newNullifier, newSecret])

    // Compute commitment hash: Poseidon(newValue, label, precommitmentHash)
    const computedCommitment = await computeCommitmentHash(
      newValue,
      existingDeposit.label,
      newPrecommitmentHash
    )

    if (computedCommitment === withdrawalEvent.newCommitment) {
      console.log(`[recoverWithdrawalChange] Found matching commitment at childIndex ${childIndex}`)
      return {
        index: childIndex, // Use childIndex as the new "index" for this change deposit
        nullifier: newNullifier,
        secret: newSecret,
        precommitmentHash: newPrecommitmentHash,
        value: newValue,
        label: existingDeposit.label,
        blockNumber: withdrawalEvent.blockNumber,
        txHash: withdrawalEvent.txHash,
      }
    }
  }

  console.warn(
    `[recoverWithdrawalChange] Could not find matching childIndex (tried 0-${MAX_CHILD_INDEX - 1})`
  )
  return null
}

/**
 * Result from tracing a merge chain - includes the active deposit and how many merges occurred.
 */
export interface TraceMergeChainResult {
  deposit: RecoveredDeposit
  mergeCount: number
}

/**
 * Trace the complete chain of merge deposits starting from an original deposit.
 *
 * Given an original deposit and a list of all merge events, this function
 * follows the chain of merges to find the current active commitment.
 *
 * @param masterNullifier - Master nullifier key
 * @param masterSecret - Master secret key
 * @param originalDeposit - The original deposit that started the chain
 * @param mergeEvents - All merge deposit events from chain
 * @returns The current active deposit at the end of the chain with merge count, or null if chain is broken
 */
export async function traceMergeChain(
  masterNullifier: bigint,
  masterSecret: bigint,
  originalDeposit: RecoveredDeposit,
  mergeEvents: MergeDepositEvent[]
): Promise<TraceMergeChainResult | null> {
  // Create a map of existingNullifierHash -> merge event for fast lookup
  const mergeMap = new Map<string, MergeDepositEvent>()
  for (const event of mergeEvents) {
    mergeMap.set(event.existingNullifierHash.toString(), event)
  }

  let currentDeposit = originalDeposit
  let mergeCount = 0

  // Follow the chain of merges
  while (true) {
    // Compute the nullifier hash of the current deposit
    const nullifierHash = await poseidonHash([currentDeposit.nullifier])

    // Check if this nullifier was spent in a merge
    const mergeEvent = mergeMap.get(nullifierHash.toString())
    if (!mergeEvent) {
      // No more merges - currentDeposit is the active one
      break
    }

    // Recover the next deposit in the chain
    const nextDeposit = await recoverMergeDeposit(
      masterNullifier,
      masterSecret,
      currentDeposit,
      mergeEvent
    )

    if (!nextDeposit) {
      console.error('[traceMergeChain] Failed to recover merge deposit in chain')
      return null
    }

    currentDeposit = nextDeposit
    mergeCount++
  }

  return { deposit: currentDeposit, mergeCount }
}
