/**
 * Stealth address generation for EIP-5564.
 *
 * When a payer wants to send funds to a recipient, they use the recipient's
 * stealth meta-address to generate a one-time stealth address that only
 * the recipient can control.
 */

import { secp256k1 } from '@noble/curves/secp256k1.js'
import { keccak_256 } from '@noble/hashes/sha3.js'
import { bytesToHex, hexToBytes, validateBytes } from './utils'
import type { StealthAddressResult, StealthMetaAddress } from './types'
import { parseStealthMetaAddress } from './keys'

/** secp256k1 curve order */
const CURVE_ORDER = secp256k1.Point.Fn.ORDER

/**
 * Convert bytes to a scalar (bigint mod curve order).
 */
function bytesToScalar(bytes: Uint8Array): bigint {
  let scalar = 0n
  for (const byte of bytes) {
    scalar = (scalar << 8n) + BigInt(byte)
  }
  return scalar % CURVE_ORDER
}

/**
 * Convert scalar to 32-byte array.
 */
function scalarToBytes(scalar: bigint): Uint8Array {
  const hex = scalar.toString(16).padStart(64, '0')
  return hexToBytes(hex)
}

/**
 * Generate a stealth address for a payment.
 *
 * This function:
 * 1. Generates a random ephemeral key pair
 * 2. Computes ECDH shared secret with recipient's viewing key
 * 3. Derives the stealth address from spending key + shared secret
 * 4. Computes a view tag for efficient scanning
 *
 * Supports both st:eth: and st:mnt: prefixes.
 *
 * @param stealthMetaAddress - Recipient's stealth meta-address
 * @returns Stealth address, ephemeral public key, and view tag
 *
 * @example
 * ```ts
 * const result = generateStealthAddress(recipient.stealthMetaAddress)
 * // Send funds to result.stealthAddress
 * // Include result.ephemeralPublicKey and result.viewTag in announcement
 * ```
 */
export function generateStealthAddress(
  stealthMetaAddress: StealthMetaAddress
): StealthAddressResult {
  const { spendingPublicKey, viewingPublicKey } = parseStealthMetaAddress(stealthMetaAddress)

  // Generate random ephemeral key pair
  const ephemeralPrivateKey = secp256k1.utils.randomSecretKey()
  const ephemeralPublicKey = secp256k1.getPublicKey(ephemeralPrivateKey, true)

  // Compute shared secret: ECDH(ephemeral_private, viewing_public)
  const sharedPoint = secp256k1.getSharedSecret(ephemeralPrivateKey, viewingPublicKey)
  // Hash the x-coordinate (remove 0x04 prefix from uncompressed point)
  const sharedSecret = keccak_256(sharedPoint.slice(1))

  // Derive stealth public key: P_stealth = P_spending + hash(shared_secret) * G
  const sharedScalar = bytesToScalar(sharedSecret)
  const sharedPoint2 = secp256k1.Point.BASE.multiply(sharedScalar)
  const spendingPoint = secp256k1.Point.fromHex(bytesToHex(spendingPublicKey))
  const stealthPoint = spendingPoint.add(sharedPoint2)

  // Get uncompressed stealth public key (65 bytes with 0x04 prefix)
  const stealthPubKeyUncompressed = stealthPoint.toBytes(false)

  // Derive Ethereum address: last 20 bytes of keccak256(pubkey without prefix)
  const addressHash = keccak_256(stealthPubKeyUncompressed.slice(1))
  const stealthAddress = `0x${bytesToHex(addressHash.slice(-20))}` as `0x${string}`

  // Compute view tag: first byte of shared secret (for efficient scanning)
  const viewTag = sharedSecret[0]

  return {
    stealthAddress,
    ephemeralPublicKey,
    viewTag,
  }
}

/**
 * Validate that a private key is in the valid range [1, n-1].
 *
 * @param privateKey - 32-byte private key
 * @param name - Name for error messages
 * @throws Error if private key is 0 or >= curve order
 */
function validatePrivateKeyRange(privateKey: Uint8Array, name: string): void {
  // Convert to scalar
  let scalar = 0n
  for (const byte of privateKey) {
    scalar = (scalar << 8n) + BigInt(byte)
  }

  if (scalar === 0n) {
    throw new Error(`${name} cannot be zero`)
  }
  if (scalar >= CURVE_ORDER) {
    throw new Error(`${name} must be less than curve order`)
  }
}

/**
 * Generate a stealth address with a specific ephemeral private key.
 *
 * This is useful for testing or when you need deterministic output.
 * In production, use generateStealthAddress() which uses secure randomness.
 *
 * Supports both st:eth: and st:mnt: prefixes.
 *
 * @param stealthMetaAddress - Recipient's stealth meta-address
 * @param ephemeralPrivateKey - 32-byte ephemeral private key (must be in [1, n-1])
 * @returns Stealth address, ephemeral public key, and view tag
 * @throws Error if ephemeral private key is not 32 bytes or out of valid range
 */
export function generateStealthAddressDeterministic(
  stealthMetaAddress: StealthMetaAddress,
  ephemeralPrivateKey: Uint8Array
): StealthAddressResult {
  // Validate ephemeral private key length
  validateBytes(ephemeralPrivateKey, 32, 'Ephemeral private key')
  // Validate ephemeral private key is in valid range [1, n-1]
  validatePrivateKeyRange(ephemeralPrivateKey, 'Ephemeral private key')

  const { spendingPublicKey, viewingPublicKey } = parseStealthMetaAddress(stealthMetaAddress)

  // Use provided ephemeral private key
  const ephemeralPublicKey = secp256k1.getPublicKey(ephemeralPrivateKey, true)

  // Compute shared secret
  const sharedPoint = secp256k1.getSharedSecret(ephemeralPrivateKey, viewingPublicKey)
  const sharedSecret = keccak_256(sharedPoint.slice(1))

  // Derive stealth public key
  const sharedScalar = bytesToScalar(sharedSecret)
  const sharedPoint2 = secp256k1.Point.BASE.multiply(sharedScalar)
  const spendingPoint = secp256k1.Point.fromHex(bytesToHex(spendingPublicKey))
  const stealthPoint = spendingPoint.add(sharedPoint2)

  // Get stealth address
  const stealthPubKeyUncompressed = stealthPoint.toBytes(false)
  const addressHash = keccak_256(stealthPubKeyUncompressed.slice(1))
  const stealthAddress = `0x${bytesToHex(addressHash.slice(-20))}` as `0x${string}`

  // Compute view tag
  const viewTag = sharedSecret[0]

  return {
    stealthAddress,
    ephemeralPublicKey,
    viewTag,
  }
}

/**
 * Compute just the view tag for an ephemeral key and viewing public key.
 *
 * This is useful for quick filtering during scanning.
 *
 * @param ephemeralPublicKey - 33-byte compressed ephemeral public key
 * @param viewingPrivateKey - 32-byte viewing private key
 * @returns Single-byte view tag (0-255)
 * @throws Error if keys have invalid lengths
 */
export function computeViewTag(
  ephemeralPublicKey: Uint8Array,
  viewingPrivateKey: Uint8Array
): number {
  // Validate inputs
  validateBytes(ephemeralPublicKey, 33, 'Ephemeral public key')
  validateBytes(viewingPrivateKey, 32, 'Viewing private key')

  const sharedPoint = secp256k1.getSharedSecret(viewingPrivateKey, ephemeralPublicKey)
  const sharedSecret = keccak_256(sharedPoint.slice(1))
  return sharedSecret[0]
}

/**
 * Derive the stealth private key from recipient's keys and ephemeral public key.
 *
 * This allows the recipient to control funds sent to a stealth address.
 *
 * @param ephemeralPublicKey - 33-byte compressed ephemeral public key from announcement
 * @param spendingPrivateKey - Recipient's 32-byte spending private key
 * @param viewingPrivateKey - Recipient's 32-byte viewing private key
 * @returns Object containing stealth address and private key
 * @throws Error if keys have invalid lengths
 */
export function deriveStealthPrivateKey(
  ephemeralPublicKey: Uint8Array,
  spendingPrivateKey: Uint8Array,
  viewingPrivateKey: Uint8Array
): { stealthAddress: `0x${string}`; stealthPrivateKey: Uint8Array } {
  // Validate inputs
  validateBytes(ephemeralPublicKey, 33, 'Ephemeral public key')
  validateBytes(spendingPrivateKey, 32, 'Spending private key')
  validateBytes(viewingPrivateKey, 32, 'Viewing private key')

  // Compute shared secret using viewing key
  const sharedPoint = secp256k1.getSharedSecret(viewingPrivateKey, ephemeralPublicKey)
  const sharedSecret = keccak_256(sharedPoint.slice(1))

  // Derive stealth private key: k_stealth = k_spending + hash(shared_secret) mod n
  const spendingScalar = bytesToScalar(spendingPrivateKey)
  const sharedScalar = bytesToScalar(sharedSecret)
  const stealthScalar = (spendingScalar + sharedScalar) % CURVE_ORDER

  // Convert scalar to bytes
  const stealthPrivateKey = scalarToBytes(stealthScalar)

  // Get stealth public key and derive address
  const stealthPubKey = secp256k1.getPublicKey(stealthPrivateKey, false)
  const addressHash = keccak_256(stealthPubKey.slice(1))
  const stealthAddress = `0x${bytesToHex(addressHash.slice(-20))}` as `0x${string}`

  return { stealthAddress, stealthPrivateKey }
}
