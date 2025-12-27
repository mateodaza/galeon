/**
 * Common primitive types used across the package.
 *
 * These handle serialization concerns between domain models,
 * API DTOs, and JSON wire format.
 */

/**
 * ISO 8601 date string for JSON serialization.
 * Use this for all API response date fields.
 *
 * @example "2025-12-27T14:30:00.000Z"
 */
export type ISODateString = string

/**
 * Wei amount as string for JSON serialization.
 * bigint doesn't serialize to JSON, so external types use strings.
 *
 * @example "1000000000000000000" (1 ETH in wei)
 */
export type WeiString = string

/**
 * Hex-encoded bytes (0x-prefixed).
 * Base type for all hex strings.
 */
export type HexString = `0x${string}`

/**
 * Hex-encoded 33-byte compressed public key.
 * Used for ephemeral public keys in announcements.
 *
 * @example "0x02..." (66 hex chars after 0x)
 */
export type CompressedPublicKeyHex = `0x${string}`

/**
 * Hex-encoded 32-byte hash.
 * Used for receipt hashes, tx hashes, etc.
 *
 * @example "0xabc..." (64 hex chars after 0x)
 */
export type Bytes32Hex = `0x${string}`

/**
 * Ethereum address (checksummed).
 */
export type Address = `0x${string}`

/**
 * Stealth meta-address chain prefix.
 *
 * - "eth" = Ethereum-compatible (EIP-5564 standard, works everywhere)
 * - "mnt" = Mantle-branded (same crypto, just different prefix for UX)
 */
export type StealthChainPrefix = 'eth' | 'mnt'

/**
 * Stealth meta-address format.
 * Contains spending + viewing public keys.
 *
 * Supports both standard EIP-5564 prefix (st:eth:) and Mantle-branded (st:mnt:).
 * Both use the same underlying crypto (secp256k1 scheme ID 0x01).
 *
 * @example "st:eth:0x<66 bytes hex>" - Standard EIP-5564
 * @example "st:mnt:0x<66 bytes hex>" - Mantle-branded
 */
export type StealthMetaAddress = `st:${StealthChainPrefix}:0x${string}`
