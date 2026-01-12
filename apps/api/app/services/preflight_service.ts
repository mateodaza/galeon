/**
 * Pre-flight Service
 *
 * Validates that all sync dependencies are met before critical operations.
 * Used to prevent failures during ZK proof generation or transaction submission.
 */

import { createPublicClient, http, defineChain, type Address } from 'viem'
import db from '@adonisjs/lucid/services/db'
import ChainService from '#services/chain_service'
import ASPService, { getSharedASPService } from '#services/asp_service'
import env from '#start/env'
import { LeanIMT } from '@zk-kit/lean-imt'
import { poseidon2 } from 'poseidon-lite'

// Pool contract ABI
const POOL_ABI = [
  {
    name: 'currentRoot',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

// Contract addresses
const POOL_ADDRESS = env.get('POOL_ADDRESS') as Address | undefined

// Ponder indexer HTTP URL (for /ready health check)
const INDEXER_URL = env.get('INDEXER_URL')

// Retry delay for failed preflight
const RETRY_DELAY_MS = 15000 // Suggest retry after 15 seconds

export interface PreflightChecks {
  indexerSynced: boolean
  aspSynced: boolean
  stateTreeValid: boolean
  labelExists: boolean
}

export interface PreflightResult {
  canProceed: boolean
  checks: PreflightChecks
  errors: string[]
  warnings: string[]
  retryAfterMs?: number
}

export interface PrivateSendPreflightParams {
  poolAddress: string
  depositLabel: string
  chainId?: number
}

// Poseidon hash for merkle tree
function poseidonHash(a: bigint, b: bigint): bigint {
  return poseidon2([a, b])
}

export default class PreflightService {
  private ponderConnection = 'ponder'

  /**
   * Get viem public client
   */
  private getPublicClient(chainId: number) {
    const chain = ChainService.getChain(chainId)
    const viemChain = defineChain({
      id: chain.chainId,
      name: chain.name,
      nativeCurrency: chain.nativeCurrency,
      rpcUrls: {
        default: { http: [chain.rpcUrl] },
      },
    })
    return createPublicClient({
      chain: viemChain,
      transport: http(chain.rpcUrl),
    })
  }

  /**
   * Check if Ponder indexer is ready via /ready endpoint.
   * Returns true if historical indexing is complete.
   */
  async checkIndexerReady(): Promise<boolean> {
    if (!INDEXER_URL) {
      // Fallback: check if we have indexed data
      return this.checkIndexerReadyViaDB()
    }

    try {
      const response = await fetch(`${INDEXER_URL}/ready`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })
      return response.ok
    } catch (error) {
      console.error('[Preflight] Indexer /ready check failed:', error)
      return false
    }
  }

  /**
   * Fallback: Check indexer readiness via DB (checks if we have data)
   */
  async checkIndexerReadyViaDB(): Promise<boolean> {
    try {
      const result = await db
        .connection(this.ponderConnection)
        .from('merkle_leaves')
        .count('* as count')
        .first()
      return Number(result?.count ?? 0) > 0
    } catch {
      return false
    }
  }

  /**
   * Check if indexer is synced (uses /ready endpoint)
   */
  async checkIndexerSync(_chainId: number): Promise<{ synced: boolean; blocksBehind: number }> {
    const isReady = await this.checkIndexerReady()
    return {
      synced: isReady,
      blocksBehind: isReady ? 0 : -1, // -1 indicates unknown/not synced
    }
  }

  /**
   * Check if ASP is synced (local root matches on-chain)
   */
  async checkASPSync(): Promise<{
    synced: boolean
    localRoot: string
    onChainRoot: string | null
  }> {
    try {
      if (!ASPService.isConfigured()) {
        return { synced: false, localRoot: '0', onChainRoot: null }
      }

      const aspService = getSharedASPService()
      // Initialize from Redis if not already done
      await aspService.initialize()
      const status = await aspService.getStatus()

      return {
        synced: status.synced,
        localRoot: status.localRoot,
        onChainRoot: status.onChainRoot,
      }
    } catch {
      return { synced: false, localRoot: '0', onChainRoot: null }
    }
  }

  /**
   * Check if state tree (merkle leaves) builds to on-chain root
   */
  async checkStateTreeValidity(
    poolAddress: string,
    chainId: number
  ): Promise<{ valid: boolean; localRoot: string; onChainRoot: string }> {
    try {
      const client = this.getPublicClient(chainId)

      // Get on-chain root
      const onChainRoot = (await client.readContract({
        address: (POOL_ADDRESS ?? poolAddress) as Address,
        abi: POOL_ABI,
        functionName: 'currentRoot',
      })) as bigint

      // Fetch all merkle leaves from indexer
      const leaves = await db
        .connection(this.ponderConnection)
        .from('merkle_leaves')
        .where('pool', poolAddress.toLowerCase())
        .orderBy('leaf_index', 'asc')
        .select('leaf')

      if (leaves.length === 0) {
        return {
          valid: false,
          localRoot: '0',
          onChainRoot: onChainRoot.toString(),
        }
      }

      // Build tree from leaves
      const tree = new LeanIMT<bigint>(poseidonHash)
      const leafValues = leaves.map((l) => BigInt(l.leaf))
      tree.insertMany(leafValues)

      const localRoot = tree.root

      return {
        valid: localRoot === onChainRoot,
        localRoot: localRoot.toString(),
        onChainRoot: onChainRoot.toString(),
      }
    } catch (error) {
      console.error('[Preflight] State tree check failed:', error)
      return {
        valid: false,
        localRoot: '0',
        onChainRoot: '0',
      }
    }
  }

  /**
   * Check if a deposit label exists in the ASP tree
   */
  async checkLabelExists(label: string): Promise<boolean> {
    try {
      if (!ASPService.isConfigured()) return false

      const aspService = getSharedASPService()
      // Initialize from Redis if not already done
      await aspService.initialize()
      const labelBigInt = BigInt(label)

      return aspService.hasLabel(labelBigInt)
    } catch {
      return false
    }
  }

  /**
   * Run pre-flight checks for Private Send (pool withdrawal)
   * Includes on-demand ASP sync if the scheduled job hasn't caught up yet.
   */
  async preflightPrivateSend(params: PrivateSendPreflightParams): Promise<PreflightResult> {
    const chainId = params.chainId ?? ChainService.getDefaultChainId()
    const errors: string[] = []
    const warnings: string[] = []

    // Run initial checks in parallel
    const [indexerCheck, initialAspCheck, stateTreeCheck, initialLabelExists] = await Promise.all([
      this.checkIndexerSync(chainId),
      this.checkASPSync(),
      this.checkStateTreeValidity(params.poolAddress, chainId),
      this.checkLabelExists(params.depositLabel),
    ])

    // These may be updated by on-demand sync
    let aspCheck = initialAspCheck
    let labelExists = initialLabelExists

    // On-demand ASP sync if not synced (fallback when scheduled job hasn't run yet)
    if ((!aspCheck.synced || !labelExists) && ASPService.isConfigured()) {
      try {
        console.log('[Preflight] ASP not synced, attempting on-demand sync...')
        const aspService = getSharedASPService()
        // Ensure initialized from Redis
        await aspService.initialize()

        // Process any new deposits and update on-chain root
        const { newLabels } = await aspService.processNewDeposits()
        if (newLabels.length > 0) {
          console.log(`[Preflight] Processed ${newLabels.length} new deposit labels`)
          await aspService.updateOnChainRoot()
        }

        // Re-check ASP sync status
        aspCheck = await this.checkASPSync()

        // Re-check if label exists now
        if (!labelExists) {
          labelExists = aspService.hasLabel(BigInt(params.depositLabel))
        }

        if (aspCheck.synced) {
          warnings.push('ASP synced on-demand')
        }
      } catch (error) {
        console.error('[Preflight] On-demand ASP sync failed:', error)
        warnings.push('Auto-sync attempted but failed')
      }
    }

    const checks: PreflightChecks = {
      indexerSynced: indexerCheck.synced,
      aspSynced: aspCheck.synced,
      stateTreeValid: stateTreeCheck.valid,
      labelExists,
    }

    // Build error messages
    if (!indexerCheck.synced) {
      errors.push('Indexer not ready. Waiting for sync to complete...')
    }

    if (!aspCheck.synced) {
      if (aspCheck.onChainRoot === null) {
        errors.push('ASP service unavailable')
      } else {
        errors.push('ASP tree not synced with on-chain root. Waiting for sync...')
      }
    }

    if (!stateTreeCheck.valid) {
      if (stateTreeCheck.localRoot === '0') {
        errors.push('No merkle leaves found in indexer')
      } else {
        errors.push('State tree root mismatch. Indexer may be syncing...')
      }
    }

    if (!labelExists) {
      errors.push('Deposit label not found in ASP tree. It may not be approved yet.')
    }

    const canProceed = errors.length === 0

    return {
      canProceed,
      checks,
      errors,
      warnings,
      retryAfterMs: canProceed ? undefined : RETRY_DELAY_MS,
    }
  }

  /**
   * Run pre-flight checks for Quick Pay (direct stealth payment)
   */
  async preflightQuickPay(chainId?: number): Promise<PreflightResult> {
    const effectiveChainId = chainId ?? ChainService.getDefaultChainId()
    const errors: string[] = []
    const warnings: string[] = []

    // Quick pay only needs chain connectivity
    try {
      const client = this.getPublicClient(effectiveChainId)
      await client.getBlockNumber()
    } catch {
      errors.push('Chain RPC unavailable')
    }

    return {
      canProceed: errors.length === 0,
      checks: {
        indexerSynced: true, // Not needed for quick pay
        aspSynced: true, // Not needed for quick pay
        stateTreeValid: true, // Not needed for quick pay
        labelExists: true, // Not needed for quick pay
      },
      errors,
      warnings,
    }
  }

  /**
   * Run pre-flight checks for Stealth Pay (sending from stealth addresses)
   */
  async preflightStealthPay(chainId?: number): Promise<PreflightResult> {
    const effectiveChainId = chainId ?? ChainService.getDefaultChainId()
    const errors: string[] = []
    const warnings: string[] = []

    // Stealth pay needs chain and indexer (for verified balances)
    try {
      const client = this.getPublicClient(effectiveChainId)
      await client.getBlockNumber()
    } catch {
      errors.push('Chain RPC unavailable')
    }

    const indexerCheck = await this.checkIndexerSync(effectiveChainId)
    if (!indexerCheck.synced) {
      errors.push('Indexer not ready')
    }

    return {
      canProceed: errors.length === 0,
      checks: {
        indexerSynced: indexerCheck.synced,
        aspSynced: true, // Not needed for stealth pay
        stateTreeValid: true, // Not needed for stealth pay
        labelExists: true, // Not needed for stealth pay
      },
      errors,
      warnings,
      retryAfterMs: errors.length > 0 ? RETRY_DELAY_MS : undefined,
    }
  }
}
