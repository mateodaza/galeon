/**
 * Contract ABIs and addresses for Galeon.
 *
 * Re-exports from @galeon/config for backwards compatibility.
 */

// Re-export everything from centralized config
export {
  // Chain config
  SUPPORTED_CHAIN_IDS,
  DEFAULT_CHAIN_ID,
  CHAINS,
  RPC_URLS,
  EXPLORER_URLS,
  CHAIN_NAMES,
  getChain,
  getRpcUrl,
  getTxExplorerUrl,
  getAddressExplorerUrl,
  isSupportedChain,
  type SupportedChainId,
  // Contracts
  CONTRACTS,
  getContracts,
  getStealthContracts,
  getPoolContracts,
  NATIVE_TOKEN,
  SCHEME_ID,
  type ChainContracts,
  type StealthContracts,
  type PoolContracts,
  // ABIs
  galeonRegistryAbi,
  announcerAbi,
  registryAbi,
  entrypointAbi,
  poolAbi,
} from '@galeon/config'

// Backwards compatibility helper
import { CONTRACTS as _CONTRACTS } from '@galeon/config'

/**
 * Get contract addresses for a chain.
 * @deprecated Use getStealthContracts(chainId) from @galeon/config
 */
export function getContractAddresses(chainId: number) {
  const contracts = _CONTRACTS[chainId as keyof typeof _CONTRACTS]
  if (!contracts) {
    throw new Error(`Unsupported chain: ${chainId}`)
  }
  // Return stealth contracts for backwards compatibility
  return contracts.stealth
}
