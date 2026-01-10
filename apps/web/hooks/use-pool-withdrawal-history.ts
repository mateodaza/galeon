'use client'

/**
 * Hook to reconstruct pool withdrawal history client-side.
 *
 * Privacy-preserving design:
 * - Withdrawal history is computed locally using the user's master keys
 * - The backend cannot track which withdrawals belong to which user
 * - This is the privacy guarantee: "So private even we can't track it"
 *
 * How it works:
 * 1. Recover ALL original deposits from the indexer (same as pool context does)
 * 2. For each original deposit, trace through the chain of withdrawals/merges
 * 3. Collect all withdrawal events where funds left the pool
 */

import { useState, useCallback } from 'react'
import { usePoolContext } from '@/contexts/pool-context'
import { nullifierApi, poolDepositsApi } from '@/lib/api'
import {
  poseidonHash,
  recoverPoolDeposits,
  createWithdrawalSecrets,
  type RecoveredDeposit,
} from '@galeon/pool'

/** A withdrawal event with reconstructed details */
export interface PoolWithdrawal {
  /** Transaction hash */
  txHash: string
  /** Recipient address */
  recipient: string
  /** Net amount received by user (in wei) - gross value minus relayer fee */
  amount: string
  /** Fee paid to relayer (if any) */
  feeAmount: string | null
  /** Block timestamp */
  blockTimestamp: string
  /** Block number */
  blockNumber: string
  /** Chain ID */
  chainId: number
  /** Whether this was a full or partial withdrawal */
  isPartial: boolean
}

interface UsePoolWithdrawalHistoryReturn {
  /** List of reconstructed withdrawals */
  withdrawals: PoolWithdrawal[]
  /** Whether history is being loaded */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Refresh the withdrawal history */
  refresh: () => Promise<void>
}

/**
 * Recursively trace a deposit chain and collect all withdrawal events.
 * This traces through partial withdrawals to find ALL withdrawals from an original deposit.
 */
async function traceWithdrawalsFromDeposit(
  deposit: RecoveredDeposit,
  masterNullifier: bigint,
  masterSecret: bigint,
  chainId: number,
  collected: PoolWithdrawal[],
  visitedNullifiers: Set<string>,
  currentDepth: number = 0,
  maxDepth: number = 50
): Promise<void> {
  if (currentDepth >= maxDepth) return

  // Compute nullifierHash = Poseidon(nullifier)
  const nullifierHash = await poseidonHash([deposit.nullifier])
  const nullifierHashHex = `0x${nullifierHash.toString(16).padStart(64, '0')}`

  // Avoid processing same nullifier twice
  if (visitedNullifiers.has(nullifierHashHex)) return
  visitedNullifiers.add(nullifierHashHex)

  // Check how the nullifier was spent
  const spendInfo = await nullifierApi.check(nullifierHashHex, chainId)

  if (!spendInfo.spent) {
    // Not spent yet - this is an active deposit, no withdrawal to record
    return
  }

  if (spendInfo.spentBy === 'withdrawal' && spendInfo.withdrawal) {
    const withdrawal = spendInfo.withdrawal
    const zeroCommitment = '0x0000000000000000000000000000000000000000000000000000000000000000'
    const isPartial = withdrawal.newCommitment !== zeroCommitment

    // Record this withdrawal (funds left the pool)
    if (withdrawal.recipient) {
      // Calculate net amount = gross value - relayer fee
      const grossValue = BigInt(withdrawal.value)
      const fee = withdrawal.feeAmount ? BigInt(withdrawal.feeAmount) : BigInt(0)
      const netAmount = grossValue - fee

      collected.push({
        txHash: withdrawal.transactionHash,
        recipient: withdrawal.recipient,
        amount: netAmount.toString(), // Net amount received by user
        feeAmount: withdrawal.feeAmount,
        blockTimestamp: withdrawal.blockTimestamp,
        blockNumber: withdrawal.blockNumber,
        chainId: withdrawal.chainId,
        isPartial,
      })
    }

    // If partial withdrawal, trace the change commitment
    if (isPartial) {
      // Derive the change commitment secrets
      // The change uses childIndex = currentDepth + 1
      const changeSecrets = await createWithdrawalSecrets(
        masterNullifier,
        masterSecret,
        deposit.label,
        BigInt(currentDepth + 1)
      )

      // Compute precommitmentHash = Poseidon(nullifier, secret)
      const changePrecommitmentHash = await poseidonHash([
        changeSecrets.nullifier,
        changeSecrets.secret,
      ])

      // Create a pseudo-deposit representing the change
      const changeDeposit: RecoveredDeposit = {
        index: deposit.index,
        nullifier: changeSecrets.nullifier,
        secret: changeSecrets.secret,
        precommitmentHash: changePrecommitmentHash,
        // Change value = original value - withdrawn value
        value: deposit.value - BigInt(withdrawal.value),
        label: deposit.label,
        blockNumber: BigInt(withdrawal.blockNumber),
        txHash: withdrawal.transactionHash as `0x${string}`,
      }

      // Recursively trace the change
      await traceWithdrawalsFromDeposit(
        changeDeposit,
        masterNullifier,
        masterSecret,
        chainId,
        collected,
        visitedNullifiers,
        currentDepth + 1,
        maxDepth
      )
    }
  }

  if (spendInfo.spentBy === 'merge' && spendInfo.mergeDeposit) {
    // Merge doesn't withdraw funds, but we need to trace the merged commitment
    // The merged commitment uses childIndex = currentDepth + 1
    const mergeSecrets = await createWithdrawalSecrets(
      masterNullifier,
      masterSecret,
      deposit.label,
      BigInt(currentDepth + 1)
    )

    // Compute precommitmentHash = Poseidon(nullifier, secret)
    const mergePrecommitmentHash = await poseidonHash([mergeSecrets.nullifier, mergeSecrets.secret])

    // New value = existing + deposited
    const newValue = deposit.value + BigInt(spendInfo.mergeDeposit.depositValue)

    const mergedDeposit: RecoveredDeposit = {
      index: deposit.index,
      nullifier: mergeSecrets.nullifier,
      secret: mergeSecrets.secret,
      precommitmentHash: mergePrecommitmentHash,
      value: newValue,
      label: deposit.label,
      blockNumber: BigInt(spendInfo.mergeDeposit.blockNumber),
      txHash: spendInfo.mergeDeposit.transactionHash as `0x${string}`,
    }

    // Recursively trace the merged commitment
    await traceWithdrawalsFromDeposit(
      mergedDeposit,
      masterNullifier,
      masterSecret,
      chainId,
      collected,
      visitedNullifiers,
      currentDepth + 1,
      maxDepth
    )
  }
}

export function usePoolWithdrawalHistory(): UsePoolWithdrawalHistoryReturn {
  const { masterNullifier, masterSecret, hasPoolKeys, contracts, poolScope } = usePoolContext()
  const [withdrawals, setWithdrawals] = useState<PoolWithdrawal[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!hasPoolKeys || !masterNullifier || !masterSecret || !poolScope || !contracts?.pool) {
      setWithdrawals([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const chainId = 5000 // Mantle mainnet

      // Step 1: Fetch ALL deposits from indexer (same as pool context does)
      const apiDeposits = await poolDepositsApi.list({
        pool: contracts.pool,
        chainId,
      })

      if (apiDeposits.length === 0) {
        setWithdrawals([])
        return
      }

      // Step 2: Recover original deposits that belong to this user
      const depositEvents = apiDeposits.map((d) => ({
        precommitment: BigInt(d.precommitmentHash),
        value: BigInt(d.value),
        label: BigInt(d.label),
        blockNumber: BigInt(d.blockNumber),
        txHash: d.transactionHash as `0x${string}`,
      }))

      const originalDeposits = await recoverPoolDeposits(
        masterNullifier,
        masterSecret,
        poolScope,
        depositEvents
      )

      if (originalDeposits.length === 0) {
        setWithdrawals([])
        return
      }

      console.log(
        '[PoolWithdrawalHistory] Found',
        originalDeposits.length,
        'original deposits to trace'
      )

      // Step 3: Trace each original deposit through its entire chain
      const collected: PoolWithdrawal[] = []
      const visitedNullifiers = new Set<string>()

      for (const deposit of originalDeposits) {
        await traceWithdrawalsFromDeposit(
          deposit,
          masterNullifier,
          masterSecret,
          chainId,
          collected,
          visitedNullifiers
        )
      }

      console.log('[PoolWithdrawalHistory] Found', collected.length, 'withdrawals')

      // Sort by block timestamp (newest first)
      collected.sort((a, b) => {
        const tsA = BigInt(a.blockTimestamp)
        const tsB = BigInt(b.blockTimestamp)
        return tsB > tsA ? 1 : tsB < tsA ? -1 : 0
      })

      setWithdrawals(collected)
    } catch (err) {
      console.error('[PoolWithdrawalHistory] Failed to reconstruct history:', err)
      setError(err instanceof Error ? err.message : 'Failed to load withdrawal history')
    } finally {
      setIsLoading(false)
    }
  }, [hasPoolKeys, masterNullifier, masterSecret, poolScope, contracts])

  return {
    withdrawals,
    isLoading,
    error,
    refresh,
  }
}
