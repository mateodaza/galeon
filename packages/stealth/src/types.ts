/**
 * Stealth address types for EIP-5564 implementation.
 */

/**
 * Stealth meta-address chain prefix.
 *
 * - "eth" = Standard EIP-5564 (Ethereum mainnet, Arbitrum, etc.)
 * - "mnt" = Mantle-branded (same crypto, just different prefix for UX)
 */
export type StealthChainPrefix = 'eth' | 'mnt'

/**
 * Stealth meta-address format.
 * Supports both standard EIP-5564 prefix (st:eth:) and Mantle-branded (st:mnt:).
 */
export type StealthMetaAddress = `st:${StealthChainPrefix}:0x${string}`

/** Stealth key pair containing spending and viewing keys */
export interface StealthKeys {
  spendingPrivateKey: Uint8Array
  spendingPublicKey: Uint8Array
  viewingPrivateKey: Uint8Array
  viewingPublicKey: Uint8Array
  stealthMetaAddress: StealthMetaAddress
}

/** Result of generating a stealth address for payment */
export interface StealthAddressResult {
  stealthAddress: `0x${string}`
  ephemeralPublicKey: Uint8Array
  viewTag: number
}

/** On-chain announcement event data */
export interface Announcement {
  stealthAddress: `0x${string}`
  ephemeralPubKey: Uint8Array
  metadata: Uint8Array
  txHash: `0x${string}`
  blockNumber: bigint
}

/** Payment found during scanning */
export interface ScannedPayment {
  stealthAddress: `0x${string}`
  stealthPrivateKey: Uint8Array
  amount: bigint
  token: `0x${string}` | null
  receiptHash: `0x${string}`
  txHash: `0x${string}`
  blockNumber: bigint
}

/** Chain configuration */
export interface ChainConfig {
  chainId: number
  name: string
  rpcUrl: string
  explorer: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  contracts: {
    announcer: `0x${string}`
    registry: `0x${string}`
    galeon: `0x${string}`
  }
}

/** Supported token configuration */
export interface TokenConfig {
  address: `0x${string}`
  symbol: string
  decimals: number
}
