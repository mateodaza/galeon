/**
 * Health Service
 *
 * Monitors sync status of all components required for payment operations.
 * Checks indexer lag, ASP sync, state tree validity, and chain connectivity.
 */

import { createPublicClient, http, defineChain, type Address } from 'viem'
import db from '@adonisjs/lucid/services/db'
import ChainService from '#services/chain_service'
import ASPService, { getSharedASPService } from '#services/asp_service'
import env from '#start/env'
import { getPoolContracts, type SupportedChainId } from '@galeon/config'

// Pool contract ABI (minimal for health checks)
const POOL_ABI = [
  {
    name: 'currentRoot',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

/**
 * Get pool address from centralized config for a chain
 */
function getPoolAddress(chainId: number): Address | undefined {
  try {
    const contracts = getPoolContracts(chainId as SupportedChainId)
    const pool = contracts?.pool
    // Return undefined if pool is zero address
    if (pool === '0x0000000000000000000000000000000000000000') return undefined
    return pool as Address
  } catch {
    return undefined
  }
}

// Ponder indexer HTTP URL (for /ready health check)
const INDEXER_URL = env.get('INDEXER_URL')

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy'

export interface ComponentHealth {
  component: 'indexer' | 'asp' | 'stateTree' | 'chain'
  status: HealthStatus
  details: {
    lastBlock?: number
    chainHead?: number
    blocksBehind?: number
    localRoot?: string
    onChainRoot?: string
    rootSynced?: boolean
    error?: string
  }
}

export interface OperationAvailability {
  available: boolean
  blockers: string[]
}

export interface SystemHealth {
  overall: HealthStatus
  components: ComponentHealth[]
  operations: {
    quickPay: OperationAvailability
    stealthPay: OperationAvailability
    privateSend: OperationAvailability
  }
  timestamp: number
}

export type PrivacyStrength = 'strong' | 'moderate' | 'weak' | 'minimal'

export interface PoolPrivacyHealth {
  strength: PrivacyStrength
  anonymitySetSize: number
  uniqueDepositors: number
  totalDeposits: number
  avgDepositAge: number // hours since avg deposit
  recommendations: string[]
  timestamp: number
}

export default class HealthService {
  private ponderConnection = 'ponder'

  /**
   * Get viem public client for chain queries
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
   * Get current chain head block number
   */
  async getChainHead(chainId: number): Promise<bigint> {
    const client = this.getPublicClient(chainId)
    return client.getBlockNumber()
  }

  /**
   * Check if Ponder indexer is ready via /ready endpoint.
   * Returns true if historical indexing is complete.
   */
  async checkIndexerReady(): Promise<boolean> {
    if (!INDEXER_URL) {
      console.warn('[HealthService] INDEXER_URL not configured, falling back to DB check')
      return this.checkIndexerReadyViaDB()
    }

    try {
      const response = await fetch(`${INDEXER_URL}/ready`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })
      return response.ok
    } catch (error) {
      console.error('[HealthService] Indexer /ready check failed:', error)
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
   * Get latest indexed block from Ponder DB (for informational purposes)
   */
  async getLatestIndexedBlock(): Promise<number> {
    try {
      const result = await db
        .connection(this.ponderConnection)
        .from('merkle_leaves')
        .orderBy('block_number', 'desc')
        .first()

      if (result) {
        return Number(result.block_number)
      }

      const depositResult = await db
        .connection(this.ponderConnection)
        .from('pool_deposits')
        .orderBy('block_number', 'desc')
        .first()

      return depositResult ? Number(depositResult.block_number) : 0
    } catch {
      return 0
    }
  }

  /**
   * Get on-chain state tree root from Pool contract
   */
  async getOnChainStateRoot(chainId: number): Promise<bigint | null> {
    const poolAddress = getPoolAddress(chainId)
    if (!poolAddress) return null

    try {
      const client = this.getPublicClient(chainId)
      const root = await client.readContract({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'currentRoot',
      })
      return root as bigint
    } catch {
      return null
    }
  }

  /**
   * Check indexer health using Ponder's /ready endpoint.
   * This properly reflects Ponder's sync state, not just the last indexed event.
   */
  async checkIndexerHealth(chainId: number): Promise<ComponentHealth> {
    try {
      const [isReady, latestBlock, chainHead] = await Promise.all([
        this.checkIndexerReady(),
        this.getLatestIndexedBlock(),
        this.getChainHead(chainId),
      ])

      const status: HealthStatus = isReady ? 'healthy' : 'unhealthy'

      return {
        component: 'indexer',
        status,
        details: {
          lastBlock: latestBlock,
          chainHead: Number(chainHead),
          // Note: blocksBehind only meaningful for event-based comparison,
          // the real check is the /ready endpoint
          blocksBehind: isReady ? 0 : undefined,
        },
      }
    } catch (error) {
      return {
        component: 'indexer',
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Failed to check indexer',
        },
      }
    }
  }

  /**
   * Check ASP service health
   */
  async checkASPHealth(): Promise<ComponentHealth> {
    try {
      if (!ASPService.isConfigured()) {
        return {
          component: 'asp',
          status: 'unhealthy',
          details: { error: 'ASP service not configured' },
        }
      }

      const aspService = getSharedASPService()
      // Initialize from Redis if not already done
      await aspService.initialize()
      const aspStatus = await aspService.getStatus()

      const status: HealthStatus = aspStatus.synced
        ? 'healthy'
        : aspStatus.treeSize > 0
          ? 'degraded'
          : 'unhealthy'

      return {
        component: 'asp',
        status,
        details: {
          localRoot: aspStatus.localRoot,
          onChainRoot: aspStatus.onChainRoot ?? undefined,
          rootSynced: aspStatus.synced,
        },
      }
    } catch (error) {
      return {
        component: 'asp',
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Failed to check ASP',
        },
      }
    }
  }

  /**
   * Check chain RPC health
   */
  async checkChainHealth(chainId: number): Promise<ComponentHealth> {
    try {
      const chainHead = await this.getChainHead(chainId)

      return {
        component: 'chain',
        status: 'healthy',
        details: {
          chainHead: Number(chainHead),
        },
      }
    } catch (error) {
      return {
        component: 'chain',
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Failed to connect to chain',
        },
      }
    }
  }

  /**
   * Check state tree health (merkle leaves match on-chain root)
   */
  async checkStateTreeHealth(chainId: number): Promise<ComponentHealth> {
    try {
      const onChainRoot = await this.getOnChainStateRoot(chainId)

      if (onChainRoot === null) {
        return {
          component: 'stateTree',
          status: 'degraded',
          details: { error: 'Could not fetch on-chain state root' },
        }
      }

      // For now, just check if we can query merkle leaves
      // Full validation would require building the tree which is expensive
      const leafCount = await db
        .connection(this.ponderConnection)
        .from('merkle_leaves')
        .count('* as count')
        .first()

      const count = Number(leafCount?.count ?? 0)

      return {
        component: 'stateTree',
        status: count > 0 ? 'healthy' : 'degraded',
        details: {
          onChainRoot: onChainRoot.toString(),
        },
      }
    } catch (error) {
      return {
        component: 'stateTree',
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Failed to check state tree',
        },
      }
    }
  }

  /**
   * Get pool privacy health metrics
   * Analyzes the anonymity set to determine privacy strength
   *
   * IMPORTANT: These metrics are HEURISTICS and may overstate real-world privacy:
   * - anonymitySetSize counts ALL merkle leaves (including spent commitments)
   * - uniqueDepositors counts stealth addresses, not unique users
   * - merge deposits are not counted separately from original deposits
   *
   * The UI displays these as informational guidance, not guarantees.
   *
   * @param poolAddress - Pool address (required - should come from @galeon/config via caller)
   * @param chainId - Chain ID (defaults to Mantle mainnet)
   */
  async getPoolPrivacyHealth(poolAddress?: string, chainId?: number): Promise<PoolPrivacyHealth> {
    const effectiveChainId = chainId ?? ChainService.getDefaultChainId()
    // Use passed pool address, or fall back to config
    const pool = poolAddress ?? getPoolAddress(effectiveChainId)
    const recommendations: string[] = []

    if (!pool) {
      return {
        strength: 'minimal',
        anonymitySetSize: 0,
        uniqueDepositors: 0,
        totalDeposits: 0,
        avgDepositAge: 0,
        recommendations: ['Pool not configured for this chain.'],
        timestamp: Date.now(),
      }
    }

    try {
      // Count unique commitments (anonymity set size)
      const leafCount = await db
        .connection(this.ponderConnection)
        .from('merkle_leaves')
        .where('pool', pool.toLowerCase())
        .count('* as count')
        .first()

      const anonymitySetSize = Number(leafCount?.count ?? 0)

      // Count unique depositors
      const depositorCount = await db
        .connection(this.ponderConnection)
        .from('pool_deposits')
        .where('pool', pool.toLowerCase())
        .countDistinct('depositor as count')
        .first()

      const uniqueDepositors = Number(depositorCount?.count ?? 0)

      // Count total deposits
      const totalDepositsResult = await db
        .connection(this.ponderConnection)
        .from('pool_deposits')
        .where('pool', pool.toLowerCase())
        .count('* as count')
        .first()

      const totalDeposits = Number(totalDepositsResult?.count ?? 0)

      // Get average deposit age (only if we have deposits)
      let avgDepositAge = 0
      if (totalDeposits > 0) {
        const avgBlockResult = await db
          .connection(this.ponderConnection)
          .from('pool_deposits')
          .where('pool', pool.toLowerCase())
          .avg('block_number as avg_block')
          .first()

        const avgBlockNum = Number(avgBlockResult?.avg_block ?? 0)
        if (avgBlockNum > 0) {
          const latestBlock = await this.getLatestIndexedBlock()
          const blocksBehind = latestBlock - avgBlockNum
          // Rough estimate: ~2 seconds per block on Mantle
          avgDepositAge = Math.max(0, (blocksBehind * 2) / 3600) // hours
        }
      }

      // Determine privacy strength
      let strength: PrivacyStrength = 'minimal'

      if (anonymitySetSize >= 100 && uniqueDepositors >= 20) {
        strength = 'strong'
      } else if (anonymitySetSize >= 50 && uniqueDepositors >= 10) {
        strength = 'moderate'
      } else if (anonymitySetSize >= 10 && uniqueDepositors >= 3) {
        strength = 'weak'
      }

      // Generate recommendations
      if (anonymitySetSize < 10) {
        recommendations.push('Pool has very few deposits. Privacy is limited.')
      } else if (anonymitySetSize < 50) {
        recommendations.push('Consider waiting for more deposits to strengthen anonymity.')
      }

      if (uniqueDepositors < 5) {
        recommendations.push('Few unique depositors. Timing correlation risk is higher.')
      }

      if (avgDepositAge < 1) {
        recommendations.push('Most deposits are recent. Wait for more time to pass.')
      }

      if (strength === 'strong') {
        recommendations.push('Good anonymity set. Timing and amount patterns can still correlate.')
      }

      return {
        strength,
        anonymitySetSize,
        uniqueDepositors,
        totalDeposits,
        avgDepositAge: Math.round(avgDepositAge * 10) / 10,
        recommendations,
        timestamp: Date.now(),
      }
    } catch (error) {
      console.error('[HealthService] Pool privacy health check failed:', error)
      return {
        strength: 'minimal',
        anonymitySetSize: 0,
        uniqueDepositors: 0,
        totalDeposits: 0,
        avgDepositAge: 0,
        recommendations: ['Unable to check pool privacy health. Indexer may be unavailable.'],
        timestamp: Date.now(),
      }
    }
  }

  /**
   * Get full system health status
   */
  async getSystemHealth(chainId?: number): Promise<SystemHealth> {
    const effectiveChainId = chainId ?? ChainService.getDefaultChainId()

    const [indexerHealth, aspHealth, chainHealth, stateTreeHealth] = await Promise.all([
      this.checkIndexerHealth(effectiveChainId),
      this.checkASPHealth(),
      this.checkChainHealth(effectiveChainId),
      this.checkStateTreeHealth(effectiveChainId),
    ])

    const components = [indexerHealth, aspHealth, chainHealth, stateTreeHealth]

    // Determine overall status
    const hasUnhealthy = components.some((c) => c.status === 'unhealthy')
    const hasDegraded = components.some((c) => c.status === 'degraded')

    let overall: HealthStatus = 'healthy'
    if (hasUnhealthy) overall = 'unhealthy'
    else if (hasDegraded) overall = 'degraded'

    // Determine operation availability
    const quickPayBlockers: string[] = []
    const stealthPayBlockers: string[] = []
    const privateSendBlockers: string[] = []

    // Quick Pay only needs chain connectivity
    if (chainHealth.status === 'unhealthy') {
      quickPayBlockers.push('Chain RPC unavailable')
    }

    // Stealth Pay needs chain + indexer (for verified balances)
    if (chainHealth.status === 'unhealthy') {
      stealthPayBlockers.push('Chain RPC unavailable')
    }
    if (indexerHealth.status === 'unhealthy') {
      stealthPayBlockers.push('Indexer not synced')
    }

    // Private Send needs everything
    if (chainHealth.status === 'unhealthy') {
      privateSendBlockers.push('Chain RPC unavailable')
    }
    if (indexerHealth.status === 'unhealthy') {
      privateSendBlockers.push('Indexer not ready')
    }
    if (aspHealth.status === 'unhealthy') {
      privateSendBlockers.push('ASP service unavailable')
    } else if (aspHealth.status === 'degraded') {
      privateSendBlockers.push('ASP root syncing')
    }
    if (stateTreeHealth.status === 'unhealthy') {
      privateSendBlockers.push('State tree unavailable')
    }

    return {
      overall,
      components,
      operations: {
        quickPay: {
          available: quickPayBlockers.length === 0,
          blockers: quickPayBlockers,
        },
        stealthPay: {
          available: stealthPayBlockers.length === 0,
          blockers: stealthPayBlockers,
        },
        privateSend: {
          available: privateSendBlockers.length === 0,
          blockers: privateSendBlockers,
        },
      },
      timestamp: Date.now(),
    }
  }
}
