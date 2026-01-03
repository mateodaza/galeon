/**
 * Key derivation for EIP-5564 stealth addresses.
 *
 * Keys are derived deterministically from wallet signatures using HKDF
 * with domain-separated contexts for spending and viewing keys.
 */

import { secp256k1 } from '@noble/curves/secp256k1.js'
import { hkdf } from '@noble/hashes/hkdf.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { keccak_256 } from '@noble/hashes/sha3.js'
import { bytesToHex, hexToBytes } from './utils'
import type { StealthKeys, StealthChainPrefix, StealthMetaAddress } from './types'

/** Default chain prefix for stealth meta-addresses */
const DEFAULT_PREFIX: StealthChainPrefix = 'mnt'

/** secp256k1 curve order */
const CURVE_ORDER = secp256k1.Point.Fn.ORDER

/** Domain separation contexts for HKDF */
const DOMAIN_SPENDING = 'galeon-stealth-spending-v1'
const DOMAIN_VIEWING = 'galeon-stealth-viewing-v1'
const DOMAIN_PORT = 'galeon-port-derivation-v1'

/**
 * Default non-zero salt for HKDF derivation.
 * Using a fixed non-zero salt avoids the "zero salt" footgun and provides
 * better domain separation. This is the SHA-256 hash of "galeon-hkdf-salt-v1".
 */
const DEFAULT_SALT = new Uint8Array([
  0x8a, 0x3f, 0x5c, 0x21, 0x9e, 0x7d, 0x4b, 0x62, 0xc1, 0xf0, 0x83, 0xa6, 0x2d, 0x95, 0xe8, 0x47,
  0xb3, 0x6a, 0x1f, 0xdc, 0x50, 0x89, 0xe4, 0x7c, 0x2b, 0xa3, 0xf6, 0x15, 0x8d, 0xc9, 0x34, 0x7e,
])

/**
 * Derive a valid secp256k1 private key using HKDF.
 *
 * Uses rejection sampling to avoid modular bias (though negligible at ~2^-128).
 */
function derivePrivateKey(
  ikm: Uint8Array,
  domain: string,
  salt: Uint8Array = DEFAULT_SALT
): Uint8Array {
  // Use HKDF-SHA256 for key derivation with proper domain separation
  const info = new TextEncoder().encode(domain)
  const derived = hkdf(sha256, ikm, salt, info, 32)

  // Convert to scalar and ensure it's valid (non-zero, < curve order)
  let scalar = 0n
  for (const byte of derived) {
    scalar = (scalar << 8n) + BigInt(byte)
  }

  // Reduce mod curve order (bias is negligible at ~2^-128)
  scalar = scalar % CURVE_ORDER
  if (scalar === 0n) scalar = 1n

  // Convert back to 32 bytes
  const hex = scalar.toString(16).padStart(64, '0')
  return hexToBytes(hex)
}

/**
 * Derive stealth keys from a wallet signature.
 *
 * Uses HKDF-SHA256 with domain-separated contexts to derive independent
 * spending and viewing key pairs from the signature.
 *
 * @param signature - Wallet signature of a deterministic message (0x-prefixed hex)
 * @param chainPrefix - Chain prefix for meta-address ('mnt' for Mantle, 'eth' for others). Defaults to 'mnt'.
 * @returns Complete stealth key set including meta-address
 *
 * @example
 * ```ts
 * // Sign a deterministic message:
 * // "Galeon Stealth Key Derivation\n\nSign this message to derive your stealth keys.\nThis does NOT authorize any transactions."
 * const sig = await wallet.signMessage(DERIVATION_MESSAGE)
 * const keys = deriveStealthKeys(sig)
 * console.log(keys.stealthMetaAddress) // st:mnt:0x...
 * ```
 */
export function deriveStealthKeys(
  signature: `0x${string}`,
  chainPrefix: StealthChainPrefix = DEFAULT_PREFIX
): StealthKeys {
  // Validate signature format
  if (!signature.startsWith('0x') || signature.length < 4) {
    throw new Error('Invalid signature: must be 0x-prefixed hex')
  }

  const sigBytes = hexToBytes(signature.slice(2))
  if (sigBytes.length < 64) {
    throw new Error('Invalid signature: too short (minimum 64 bytes)')
  }

  // Derive spending key with domain separation
  const spendingPrivateKey = derivePrivateKey(sigBytes, DOMAIN_SPENDING)
  const spendingPublicKey = secp256k1.getPublicKey(spendingPrivateKey, true)

  // Derive viewing key with domain separation
  const viewingPrivateKey = derivePrivateKey(sigBytes, DOMAIN_VIEWING)
  const viewingPublicKey = secp256k1.getPublicKey(viewingPrivateKey, true)

  // Build stealth meta-address: st:<prefix>:0x<spending:33><viewing:33>
  const stealthMetaAddress =
    `st:${chainPrefix}:0x${bytesToHex(spendingPublicKey)}${bytesToHex(viewingPublicKey)}` as StealthMetaAddress

  return {
    spendingPrivateKey,
    spendingPublicKey,
    viewingPrivateKey,
    viewingPublicKey,
    stealthMetaAddress,
  }
}

/**
 * Derive unique keys for a Port from a master signature and port index.
 *
 * Each Port gets cryptographically independent keys, so compromising
 * one Port's viewing key reveals nothing about other Ports.
 *
 * @param masterSignature - User's master stealth signature (0x-prefixed hex)
 * @param portIndex - Unique index for this Port (0, 1, 2, ...)
 * @param chainPrefix - Chain prefix for meta-address ('mnt' for Mantle, 'eth' for others). Defaults to 'mnt'.
 * @returns Port-specific stealth keys
 *
 * @example
 * ```ts
 * const masterSig = await wallet.signMessage("Galeon master key")
 * const port0Keys = derivePortKeys(masterSig, 0)
 * const port1Keys = derivePortKeys(masterSig, 1)
 * // port0Keys and port1Keys are cryptographically independent
 * ```
 */
export function derivePortKeys(
  masterSignature: `0x${string}`,
  portIndex: number,
  chainPrefix: StealthChainPrefix = DEFAULT_PREFIX
): StealthKeys {
  // Validate inputs
  if (!masterSignature.startsWith('0x') || masterSignature.length < 4) {
    throw new Error('Invalid signature: must be 0x-prefixed hex')
  }
  if (!Number.isInteger(portIndex) || portIndex < 0) {
    throw new Error('Port index must be a non-negative integer')
  }

  const sigBytes = hexToBytes(masterSignature.slice(2))
  if (sigBytes.length < 64) {
    throw new Error('Invalid signature: too short (minimum 64 bytes)')
  }

  // Use port index as salt for HKDF derivation
  // This ensures each port gets completely independent keys
  const portSalt = new Uint8Array(32)
  new DataView(portSalt.buffer).setUint32(0, portIndex, false)

  // Derive port-specific spending key
  const spendingPrivateKey = derivePrivateKey(sigBytes, `${DOMAIN_PORT}-spending`, portSalt)
  const spendingPublicKey = secp256k1.getPublicKey(spendingPrivateKey, true)

  // Derive port-specific viewing key
  const viewingPrivateKey = derivePrivateKey(sigBytes, `${DOMAIN_PORT}-viewing`, portSalt)
  const viewingPublicKey = secp256k1.getPublicKey(viewingPrivateKey, true)

  // Build stealth meta-address
  const stealthMetaAddress =
    `st:${chainPrefix}:0x${bytesToHex(spendingPublicKey)}${bytesToHex(viewingPublicKey)}` as StealthMetaAddress

  return {
    spendingPrivateKey,
    spendingPublicKey,
    viewingPrivateKey,
    viewingPublicKey,
    stealthMetaAddress,
  }
}

/**
 * Parse a stealth meta-address into its component public keys.
 *
 * Supports both st:eth: and st:mnt: prefixes.
 *
 * @param stealthMetaAddress - Meta-address in format st:<eth|mnt>:0x<spending:33><viewing:33>
 * @returns Spending and viewing public keys, plus the chain prefix
 */
export function parseStealthMetaAddress(stealthMetaAddress: StealthMetaAddress): {
  spendingPublicKey: Uint8Array
  viewingPublicKey: Uint8Array
  chainPrefix: StealthChainPrefix
} {
  // Validate and extract prefix
  if (!stealthMetaAddress.startsWith('st:')) {
    throw new Error('Invalid stealth meta-address: must start with "st:"')
  }

  let chainPrefix: StealthChainPrefix
  let hexPart: string

  if (stealthMetaAddress.startsWith('st:eth:0x')) {
    chainPrefix = 'eth'
    hexPart = stealthMetaAddress.slice(9) // Remove "st:eth:0x"
  } else if (stealthMetaAddress.startsWith('st:mnt:0x')) {
    chainPrefix = 'mnt'
    hexPart = stealthMetaAddress.slice(9) // Remove "st:mnt:0x"
  } else {
    throw new Error('Invalid stealth meta-address: prefix must be "st:eth:" or "st:mnt:"')
  }

  const bytes = hexToBytes(hexPart)

  if (bytes.length !== 66) {
    throw new Error(`Invalid stealth meta-address length: expected 66 bytes, got ${bytes.length}`)
  }

  return {
    spendingPublicKey: bytes.slice(0, 33),
    viewingPublicKey: bytes.slice(33, 66),
    chainPrefix,
  }
}

/**
 * Format public keys into a stealth meta-address.
 *
 * @param spendingPublicKey - 33-byte compressed spending public key
 * @param viewingPublicKey - 33-byte compressed viewing public key
 * @param chainPrefix - Chain prefix ('mnt' for Mantle, 'eth' for others). Defaults to 'mnt'.
 * @returns Stealth meta-address in standard format
 */
export function formatStealthMetaAddress(
  spendingPublicKey: Uint8Array,
  viewingPublicKey: Uint8Array,
  chainPrefix: StealthChainPrefix = DEFAULT_PREFIX
): StealthMetaAddress {
  if (spendingPublicKey.length !== 33 || viewingPublicKey.length !== 33) {
    throw new Error('Public keys must be 33 bytes (compressed)')
  }

  return `st:${chainPrefix}:0x${bytesToHex(spendingPublicKey)}${bytesToHex(viewingPublicKey)}`
}

// ============================================================
// Utility Functions for Web App
// ============================================================

/**
 * Generate a cryptographically secure random private key.
 *
 * Uses secp256k1.utils.randomSecretKey() from @noble/curves.
 *
 * @returns 32-byte random private key
 */
export function generateRandomPrivateKey(): Uint8Array {
  return secp256k1.utils.randomSecretKey()
}

/**
 * Hash data using keccak256.
 *
 * Uses keccak_256 from @noble/hashes.
 *
 * @param data - Data to hash (Uint8Array or hex string with 0x prefix)
 * @returns 32-byte hash as Uint8Array
 */
export function keccak256Hash(data: Uint8Array | `0x${string}`): Uint8Array {
  const bytes = typeof data === 'string' ? hexToBytes(data.slice(2)) : data
  return keccak_256(bytes)
}
