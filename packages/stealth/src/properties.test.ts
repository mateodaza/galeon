/**
 * Property-based tests for @galeon/stealth library.
 *
 * Uses fast-check to verify cryptographic invariants hold across random inputs.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  deriveStealthKeys,
  derivePortKeys,
  generateStealthAddressDeterministic,
  deriveStealthPrivateKey,
  computeViewTag,
  parseStealthMetaAddress,
  formatStealthMetaAddress,
} from './index'
import { hexToBytes, bytesToHex } from './utils'

// Arbitrary for valid 32-byte private keys (avoid edge cases like 0 or >= curve order)
const privateKeyArb = fc.uint8Array({ minLength: 32, maxLength: 32 }).filter((arr) => {
  // Ensure not all zeros
  return arr.some((b) => b !== 0)
})

// Arbitrary for valid signatures (65 bytes typical, but we accept 64+)
const signatureArb = fc
  .uint8Array({ minLength: 65, maxLength: 65 })
  .map((arr) => `0x${bytesToHex(arr)}` as `0x${string}`)

// Arbitrary for port indices
const portIndexArb = fc.integer({ min: 0, max: 1000000 })

describe('Property-based Tests', () => {
  describe('Key Derivation Properties', () => {
    it('deriveStealthKeys is deterministic', () => {
      fc.assert(
        fc.property(signatureArb, (sig) => {
          const keys1 = deriveStealthKeys(sig)
          const keys2 = deriveStealthKeys(sig)

          expect(keys1.stealthMetaAddress).toBe(keys2.stealthMetaAddress)
          expect(bytesToHex(keys1.spendingPrivateKey)).toBe(bytesToHex(keys2.spendingPrivateKey))
          expect(bytesToHex(keys1.viewingPrivateKey)).toBe(bytesToHex(keys2.viewingPrivateKey))
        }),
        { numRuns: 50 }
      )
    })

    it('derivePortKeys produces different keys for different indices', () => {
      fc.assert(
        fc.property(signatureArb, portIndexArb, (sig, index) => {
          const keys1 = derivePortKeys(sig, index)
          const keys2 = derivePortKeys(sig, index + 1)

          // Different indices must produce different keys
          expect(keys1.stealthMetaAddress).not.toBe(keys2.stealthMetaAddress)
          expect(bytesToHex(keys1.spendingPrivateKey)).not.toBe(
            bytesToHex(keys2.spendingPrivateKey)
          )
        }),
        { numRuns: 50 }
      )
    })

    it('meta-address round-trips through parse/format', () => {
      fc.assert(
        fc.property(signatureArb, (sig) => {
          const keys = deriveStealthKeys(sig)
          const parsed = parseStealthMetaAddress(keys.stealthMetaAddress)
          const formatted = formatStealthMetaAddress(
            parsed.spendingPublicKey,
            parsed.viewingPublicKey
          )

          expect(formatted).toBe(keys.stealthMetaAddress)
        }),
        { numRuns: 50 }
      )
    })

    it('spending and viewing keys are independent', () => {
      fc.assert(
        fc.property(signatureArb, (sig) => {
          const keys = deriveStealthKeys(sig)

          // Keys should be different
          expect(bytesToHex(keys.spendingPrivateKey)).not.toBe(bytesToHex(keys.viewingPrivateKey))
          expect(bytesToHex(keys.spendingPublicKey)).not.toBe(bytesToHex(keys.viewingPublicKey))
        }),
        { numRuns: 50 }
      )
    })
  })

  describe('Stealth Address Properties', () => {
    it('generate → derive produces matching address (symmetry)', () => {
      fc.assert(
        fc.property(signatureArb, privateKeyArb, (sig, ephemeralKey) => {
          const keys = deriveStealthKeys(sig)

          // Sender generates stealth address
          const generated = generateStealthAddressDeterministic(
            keys.stealthMetaAddress,
            ephemeralKey
          )

          // Recipient derives private key
          const derived = deriveStealthPrivateKey(
            generated.ephemeralPublicKey,
            keys.spendingPrivateKey,
            keys.viewingPrivateKey
          )

          // Addresses MUST match (this is the core security property)
          expect(derived.stealthAddress.toLowerCase()).toBe(generated.stealthAddress.toLowerCase())
        }),
        { numRuns: 100 }
      )
    })

    it('view tag is consistent between generation and computation', () => {
      fc.assert(
        fc.property(signatureArb, privateKeyArb, (sig, ephemeralKey) => {
          const keys = deriveStealthKeys(sig)

          const generated = generateStealthAddressDeterministic(
            keys.stealthMetaAddress,
            ephemeralKey
          )

          const computedTag = computeViewTag(generated.ephemeralPublicKey, keys.viewingPrivateKey)

          expect(computedTag).toBe(generated.viewTag)
        }),
        { numRuns: 100 }
      )
    })

    it('different ephemeral keys produce different stealth addresses', () => {
      fc.assert(
        fc.property(signatureArb, privateKeyArb, privateKeyArb, (sig, eph1, eph2) => {
          // Skip if ephemeral keys are the same
          if (bytesToHex(eph1) === bytesToHex(eph2)) return true

          const keys = deriveStealthKeys(sig)

          const addr1 = generateStealthAddressDeterministic(keys.stealthMetaAddress, eph1)
          const addr2 = generateStealthAddressDeterministic(keys.stealthMetaAddress, eph2)

          // Different ephemeral keys must produce different addresses
          expect(addr1.stealthAddress).not.toBe(addr2.stealthAddress)
          return true
        }),
        { numRuns: 50 }
      )
    })
  })

  describe('View Tag Properties', () => {
    it('view tag is in valid range [0, 255]', () => {
      fc.assert(
        fc.property(signatureArb, privateKeyArb, (sig, ephemeralKey) => {
          const keys = deriveStealthKeys(sig)

          const generated = generateStealthAddressDeterministic(
            keys.stealthMetaAddress,
            ephemeralKey
          )

          expect(generated.viewTag).toBeGreaterThanOrEqual(0)
          expect(generated.viewTag).toBeLessThanOrEqual(255)
        }),
        { numRuns: 100 }
      )
    })

    it('view tag distribution is roughly uniform (sanity check)', () => {
      const tagCounts = new Map<number, number>()
      const sig = `0x${'ab'.repeat(65)}` as `0x${string}`
      const keys = deriveStealthKeys(sig)

      // Generate many view tags with valid ephemeral keys
      for (let i = 0; i < 500; i++) {
        // Create a valid ephemeral key by hashing the index
        // This ensures we get a valid private key (not 0 or >= curve order)
        const ephKey = hexToBytes(
          (BigInt(i + 1) * 0x123456789abcdefn).toString(16).padStart(64, '0').slice(0, 64)
        )

        try {
          const generated = generateStealthAddressDeterministic(keys.stealthMetaAddress, ephKey)

          tagCounts.set(generated.viewTag, (tagCounts.get(generated.viewTag) || 0) + 1)
        } catch {
          // Skip invalid keys (edge cases)
          continue
        }
      }

      // Should have reasonable distribution (not all same tag)
      // With 500 samples, we expect ~2 per bucket on average (500/256)
      // Having at least 50 different tags is very conservative
      expect(tagCounts.size).toBeGreaterThan(50)
    })
  })

  describe('Input Validation Properties', () => {
    it('hexToBytes rejects odd-length strings', () => {
      fc.assert(
        fc.property(
          fc.hexaString({ minLength: 1, maxLength: 100 }).filter((s) => s.length % 2 === 1),
          (oddHex) => {
            expect(() => hexToBytes(oddHex)).toThrow('odd length')
          }
        ),
        { numRuns: 20 }
      )
    })

    it('hexToBytes rejects invalid characters', () => {
      const invalidHexArb = fc.string({ minLength: 2, maxLength: 10 }).filter((s) => {
        // Must have even length
        if (s.length % 2 !== 0) return false
        // Strip 0x prefix if present (like the real function does)
        const clean = s.toLowerCase().startsWith('0x') ? s.slice(2) : s
        // After stripping, must be non-empty and contain invalid chars
        return clean.length > 0 && /[^0-9a-fA-F]/.test(clean)
      })

      fc.assert(
        fc.property(invalidHexArb, (invalidHex) => {
          expect(() => hexToBytes(invalidHex)).toThrow('invalid characters')
        }),
        { numRuns: 20 }
      )
    })

    it('bytesToHex → hexToBytes round-trips', () => {
      fc.assert(
        fc.property(fc.uint8Array({ minLength: 1, maxLength: 100 }), (bytes) => {
          const hex = bytesToHex(bytes)
          const back = hexToBytes(hex)

          expect(bytesToHex(back)).toBe(hex)
        }),
        { numRuns: 50 }
      )
    })
  })
})
