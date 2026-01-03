/**
 * Pool Key Derivation
 *
 * Derives pool master keys from wallet signature using @galeon/stealth.
 * The master keys are then used with Poseidon to generate commitments.
 */

import { derivePoolKeys, type PoolKeys } from '@galeon/stealth'
import { bytesToFieldElement } from './crypto.js'

/**
 * Message to sign for pool key derivation.
 * Must be deterministic and unique to Galeon Privacy Pool.
 */
export const POOL_SIGN_MESSAGE = `Galeon Privacy Pool Key Derivation

This signature is used to derive your privacy pool keys.
It does not authorize any transactions or grant access to your funds.

Chain: Mantle
Version: 1`

/**
 * Derives pool master keys from a wallet signature.
 *
 * Uses @galeon/stealth for HKDF-based derivation, then converts
 * to bigint for use with Poseidon hashing.
 *
 * @param signature - Wallet signature from signing POOL_SIGN_MESSAGE
 * @returns Pool master keys as bigints (for Poseidon)
 */
export function derivePoolMasterKeys(signature: `0x${string}`): {
  masterNullifier: bigint
  masterSecret: bigint
} {
  const keys: PoolKeys = derivePoolKeys(signature)

  // Convert Uint8Array to bigint (take first 31 bytes to stay in field)
  const masterNullifier = bytesToFieldElement(keys.masterNullifier.slice(0, 31))
  const masterSecret = bytesToFieldElement(keys.masterSecret.slice(0, 31))

  return { masterNullifier, masterSecret }
}
