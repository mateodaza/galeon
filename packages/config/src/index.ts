/**
 * @galeon/config - Centralized configuration for Galeon.
 *
 * Chain definitions, contract addresses, and ABIs for all supported networks.
 *
 * Usage:
 *   import { getContracts, DEFAULT_CHAIN_ID, galeonRegistryAbi } from '@galeon/config'
 *
 *   const contracts = getContracts(5000)
 *   console.log(contracts.stealth.galeonRegistry)
 */

// Chain configuration
export {
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
} from './chains.js'

// Contract addresses
export {
  CONTRACTS,
  getContracts,
  getStealthContracts,
  getPoolContracts,
  NATIVE_TOKEN,
  SCHEME_ID,
  type ChainContracts,
  type StealthContracts,
  type PoolContracts,
} from './contracts.js'

// ABIs
export { galeonRegistryAbi, announcerAbi, registryAbi, entrypointAbi, poolAbi } from './abis.js'
