/**
 * Versioned Port key derivation.
 *
 * v1 (`derivePortKeys` with `portIndexFromId`): the Port ID is reduced to a
 * 32-bit index, the first four bytes of keccak256 of its text. Two Port IDs
 * can share an index, and then, under the same master signature, share keys.
 *
 * v2 (`derivePortKeysFromId`): the HKDF salt is the full 32-byte keccak256 of
 * the Port ID, under its own derivation domain, so distinct IDs get
 * independent keys. New Ports use v2; Ports created under v1 keep their keys,
 * and `resolvePortKeys` finds which version a Port was created with by
 * matching its published stealth meta-address.
 */

import { keccak_256 } from '@noble/hashes/sha3.js'
import { derivePortKeys, portKeysFromSalt, signatureBytes } from './keys'
import type { StealthChainPrefix, StealthKeys } from './types'

/** Domain of derivation v2; v1's is 'galeon-port-derivation-v1' (keys.ts). */
const DOMAIN_PORT_V2 = 'galeon-port-derivation-v2'

/** Which derivation a Port's keys came from. */
export type PortKeyVersion = 1 | 2

/** The version new Ports are created with. */
export const CURRENT_PORT_KEY_VERSION: PortKeyVersion = 2

/**
 * A Port ID as the derivations hash it: hex IDs (the on-chain bytes32) are
 * lower-cased, so a database that stored them in another case derives the
 * same keys. Any other ID (a backend UUID) is used as it is.
 */
export function normalizePortId(portId: string): string {
  return /^0x[0-9a-fA-F]+$/.test(portId) ? portId.toLowerCase() : portId
}

function idHash(portId: string): Uint8Array {
  if (!portId) throw new Error('Port ID must be a non-empty string')
  return keccak_256(new TextEncoder().encode(normalizePortId(portId)))
}

/**
 * The v1 index of a Port ID: the first four bytes of keccak256 of its text,
 * big-endian. Kept to re-derive the keys of Ports created under v1; two IDs can
 * share an index, so new Ports must not use it.
 */
export function portIndexFromId(portId: string): number {
  const hash = idHash(portId)
  return new DataView(hash.buffer, hash.byteOffset, hash.byteLength).getUint32(0, false)
}

/**
 * Derive a Port's keys from the full Port ID (derivation v2). Distinct IDs get
 * independent keys; the keys never coincide with any v1 derivation (different
 * domain and salt).
 *
 * @param masterSignature - User's master stealth signature (0x-prefixed hex)
 * @param portId - The Port's ID: its on-chain bytes32 (hex), as registered
 * @param chainPrefix - Chain prefix for the meta-address. Defaults to 'mnt'.
 */
export function derivePortKeysFromId(
  masterSignature: `0x${string}`,
  portId: string,
  chainPrefix?: StealthChainPrefix
): StealthKeys {
  if (!masterSignature.startsWith('0x') || masterSignature.length < 4) {
    throw new Error('Invalid signature: must be 0x-prefixed hex')
  }
  return portKeysFromSalt(
    signatureBytes(masterSignature),
    DOMAIN_PORT_V2,
    idHash(portId),
    chainPrefix
  )
}

/** A Port's keys under one derivation version. */
export function derivePortKeysVersioned(
  masterSignature: `0x${string}`,
  portId: string,
  version: PortKeyVersion,
  chainPrefix?: StealthChainPrefix
): StealthKeys {
  return version === 2
    ? derivePortKeysFromId(masterSignature, portId, chainPrefix)
    : derivePortKeys(masterSignature, portIndexFromId(portId), chainPrefix)
}

/** The public-key part of a stealth meta-address, whatever its chain prefix. */
function metaKeys(stealthMetaAddress: string): string {
  return stealthMetaAddress.slice(stealthMetaAddress.lastIndexOf(':') + 1).toLowerCase()
}

/**
 * The keys of a Port whose stealth meta-address is known (registered on-chain,
 * stored by the app): the newest derivation version whose keys produce that
 * meta-address, or null if none does (a different wallet, or another ID).
 */
export function resolvePortKeys(
  masterSignature: `0x${string}`,
  portId: string,
  stealthMetaAddress: string,
  chainPrefix?: StealthChainPrefix
): { keys: StealthKeys; version: PortKeyVersion } | null {
  const want = metaKeys(stealthMetaAddress)
  for (const version of [2, 1] as const) {
    const keys = derivePortKeysVersioned(masterSignature, portId, version, chainPrefix)
    if (metaKeys(keys.stealthMetaAddress) === want) return { keys, version }
  }
  return null
}
