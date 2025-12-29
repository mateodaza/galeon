/**
 * @galeon/stealth
 *
 * Shared EIP-5564 stealth address cryptography for Galeon.
 *
 * @example
 * ```ts
 * import { createStealthClient, deriveStealthKeys } from '@galeon/stealth'
 *
 * // Create a chain-specific client
 * const client = createStealthClient(5003) // Mantle Sepolia
 *
 * // Or use functions directly
 * const keys = deriveStealthKeys(signature)
 * const address = generateStealthAddress(keys.stealthMetaAddress)
 * ```
 */

// Re-export all types
export * from './types'

// Re-export key functions
export {
  deriveStealthKeys,
  derivePortKeys,
  deriveFogKeys,
  parseStealthMetaAddress,
  formatStealthMetaAddress,
} from './keys'

// Re-export address functions
export {
  generateStealthAddress,
  generateStealthAddressDeterministic,
  computeViewTag,
  deriveStealthPrivateKey,
  prepareEOAPayment,
  prepareStealthPayment,
  NULL_EPHEMERAL_PUBKEY,
  NULL_VIEW_TAG,
} from './address'

// Re-export scanning functions
export { scanAnnouncements, checkAnnouncement, buildAnnouncementMetadata } from './scan'

// Re-export config functions and constants
export {
  SCHEME_ID,
  chains,
  supportedTokens,
  getChainConfig,
  getContracts,
  getSupportedTokens,
  getTokenByAddress,
  getTokenBySymbol,
  isChainSupported,
  getExplorerTxUrl,
  getExplorerAddressUrl,
  updateContractAddresses,
} from './config'

// Import for createStealthClient
import { getChainConfig, getContracts, SCHEME_ID } from './config'
import { deriveStealthKeys, derivePortKeys, deriveFogKeys } from './keys'
import { generateStealthAddress } from './address'
import { scanAnnouncements } from './scan'
import type {
  ChainConfig,
  StealthKeys,
  StealthAddressResult,
  Announcement,
  ScannedPayment,
  StealthMetaAddress,
  StealthChainPrefix,
} from './types'

/**
 * Options for creating a stealth client.
 */
export interface StealthClientOptions {
  /** Chain prefix for meta-addresses ('mnt' for Mantle, 'eth' for others). Defaults to 'mnt'. */
  chainPrefix?: StealthChainPrefix
}

/**
 * Stealth client for a specific chain.
 *
 * Provides a convenient interface for all stealth operations
 * with chain-specific configuration pre-loaded.
 */
export interface StealthClient {
  /** Chain ID this client is configured for */
  chainId: number

  /** Chain prefix used for meta-addresses */
  chainPrefix: StealthChainPrefix

  /** Chain configuration */
  config: ChainConfig

  /** Contract addresses */
  contracts: ChainConfig['contracts']

  /** EIP-5564 scheme ID */
  schemeId: number

  /**
   * Derive stealth keys from a wallet signature.
   * Uses the client's chainPrefix.
   * @see deriveStealthKeys
   */
  deriveKeys: (signature: `0x${string}`) => StealthKeys

  /**
   * Derive unique keys for a Port.
   * Uses the client's chainPrefix.
   * @see derivePortKeys
   */
  derivePortKeys: (masterSignature: `0x${string}`, portIndex: number) => StealthKeys

  /**
   * Derive unique keys for a Fog wallet.
   * Uses a SEPARATE domain from Ports for cryptographic isolation.
   * Uses the client's chainPrefix.
   * @see deriveFogKeys
   */
  deriveFogKeys: (masterSignature: `0x${string}`, fogIndex: number) => StealthKeys

  /**
   * Generate a stealth address for a payment.
   * @see generateStealthAddress
   */
  generateAddress: (stealthMetaAddress: StealthMetaAddress) => StealthAddressResult

  /**
   * Scan announcements to find payments.
   * @see scanAnnouncements
   */
  scan: (
    announcements: Announcement[],
    spendingPrivateKey: Uint8Array,
    viewingPrivateKey: Uint8Array
  ) => ScannedPayment[]
}

/**
 * Create a chain-specific stealth client.
 *
 * The client provides a convenient interface for all stealth operations
 * with chain configuration and contract addresses pre-loaded.
 *
 * @param chainId - The chain ID to configure for (5003 = Mantle Sepolia, 5000 = Mantle)
 * @param options - Optional configuration (chainPrefix defaults to 'mnt')
 * @returns Configured stealth client
 *
 * @example
 * ```ts
 * const client = createStealthClient(5003) // Mantle Sepolia, uses st:mnt: prefix
 *
 * // Or with explicit prefix
 * const ethClient = createStealthClient(5003, { chainPrefix: 'eth' })
 *
 * // Derive keys from wallet signature
 * const keys = client.deriveKeys(signature)
 *
 * // Generate stealth address for payment
 * const { stealthAddress, ephemeralPublicKey } = client.generateAddress(
 *   recipient.stealthMetaAddress
 * )
 *
 * // Scan for incoming payments
 * const payments = client.scan(announcements, port.spendingKey, port.viewingKey)
 * ```
 */
export function createStealthClient(
  chainId: number,
  options: StealthClientOptions = {}
): StealthClient {
  const config = getChainConfig(chainId)
  const contracts = getContracts(chainId)
  const chainPrefix = options.chainPrefix ?? 'mnt'

  return {
    chainId,
    chainPrefix,
    config,
    contracts,
    schemeId: SCHEME_ID,
    deriveKeys: (sig) => deriveStealthKeys(sig, chainPrefix),
    derivePortKeys: (sig, index) => derivePortKeys(sig, index, chainPrefix),
    deriveFogKeys: (sig, index) => deriveFogKeys(sig, index, chainPrefix),
    generateAddress: generateStealthAddress,
    scan: scanAnnouncements,
  }
}
