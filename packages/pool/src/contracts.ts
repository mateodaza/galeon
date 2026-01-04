/**
 * Pool Contracts
 *
 * Re-exports pool contracts and ABIs from @galeon/config.
 */

// Re-export pool-specific items from centralized config
export {
  getPoolContracts,
  entrypointAbi,
  poolAbi,
  type PoolContracts,
  type SupportedChainId,
} from '@galeon/config'

// Backwards compatibility: POOL_CONTRACTS renamed from getPoolContracts
import { CONTRACTS } from '@galeon/config'

/**
 * @deprecated Use getPoolContracts(chainId) from @galeon/config instead
 */
export const POOL_CONTRACTS = {
  5000: CONTRACTS[5000].pool,
  5003: CONTRACTS[5003].pool,
} as const

export type PoolChainId = keyof typeof POOL_CONTRACTS
