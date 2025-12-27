/**
 * Tests for @galeon/stealth library.
 */

import { describe, it, expect } from 'vitest'
import {
  deriveStealthKeys,
  derivePortKeys,
  parseStealthMetaAddress,
  formatStealthMetaAddress,
  generateStealthAddress,
  generateStealthAddressDeterministic,
  deriveStealthPrivateKey,
  computeViewTag,
  scanAnnouncements,
  checkAnnouncement,
  buildAnnouncementMetadata,
  createStealthClient,
  getChainConfig,
  SCHEME_ID,
  type Announcement,
} from './index'
import { hexToBytes } from './utils'

// Test signature (deterministic for reproducible tests)
const TEST_SIGNATURE =
  '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12' as `0x${string}`

describe('Key Derivation', () => {
  it('should derive stealth keys from signature', () => {
    const keys = deriveStealthKeys(TEST_SIGNATURE)

    expect(keys.spendingPrivateKey).toBeInstanceOf(Uint8Array)
    expect(keys.spendingPrivateKey.length).toBe(32)
    expect(keys.spendingPublicKey).toBeInstanceOf(Uint8Array)
    expect(keys.spendingPublicKey.length).toBe(33)
    expect(keys.viewingPrivateKey).toBeInstanceOf(Uint8Array)
    expect(keys.viewingPrivateKey.length).toBe(32)
    expect(keys.viewingPublicKey).toBeInstanceOf(Uint8Array)
    expect(keys.viewingPublicKey.length).toBe(33)
    expect(keys.stealthMetaAddress).toMatch(/^st:(eth|mnt):0x[0-9a-f]{132}$/)
  })

  it('should produce deterministic keys', () => {
    const keys1 = deriveStealthKeys(TEST_SIGNATURE)
    const keys2 = deriveStealthKeys(TEST_SIGNATURE)

    expect(keys1.stealthMetaAddress).toBe(keys2.stealthMetaAddress)
    expect(keys1.spendingPrivateKey).toEqual(keys2.spendingPrivateKey)
    expect(keys1.viewingPrivateKey).toEqual(keys2.viewingPrivateKey)
  })

  it('should derive independent port keys', () => {
    const port0 = derivePortKeys(TEST_SIGNATURE, 0)
    const port1 = derivePortKeys(TEST_SIGNATURE, 1)

    expect(port0.stealthMetaAddress).not.toBe(port1.stealthMetaAddress)
    expect(port0.spendingPrivateKey).not.toEqual(port1.spendingPrivateKey)
    expect(port0.viewingPrivateKey).not.toEqual(port1.viewingPrivateKey)
  })

  it('should parse stealth meta-address', () => {
    const keys = deriveStealthKeys(TEST_SIGNATURE)
    const parsed = parseStealthMetaAddress(keys.stealthMetaAddress)

    expect(parsed.spendingPublicKey).toEqual(keys.spendingPublicKey)
    expect(parsed.viewingPublicKey).toEqual(keys.viewingPublicKey)
  })

  it('should format stealth meta-address', () => {
    const keys = deriveStealthKeys(TEST_SIGNATURE)
    const formatted = formatStealthMetaAddress(keys.spendingPublicKey, keys.viewingPublicKey)

    expect(formatted).toBe(keys.stealthMetaAddress)
  })
})

describe('Stealth Address Generation', () => {
  it('should generate stealth address', () => {
    const keys = deriveStealthKeys(TEST_SIGNATURE)
    const result = generateStealthAddress(keys.stealthMetaAddress)

    expect(result.stealthAddress).toMatch(/^0x[0-9a-f]{40}$/)
    expect(result.ephemeralPublicKey).toBeInstanceOf(Uint8Array)
    expect(result.ephemeralPublicKey.length).toBe(33)
    expect(result.viewTag).toBeGreaterThanOrEqual(0)
    expect(result.viewTag).toBeLessThanOrEqual(255)
  })

  it('should generate different addresses each time', () => {
    const keys = deriveStealthKeys(TEST_SIGNATURE)
    const result1 = generateStealthAddress(keys.stealthMetaAddress)
    const result2 = generateStealthAddress(keys.stealthMetaAddress)

    expect(result1.stealthAddress).not.toBe(result2.stealthAddress)
    expect(result1.ephemeralPublicKey).not.toEqual(result2.ephemeralPublicKey)
  })

  it('should generate deterministic address with fixed ephemeral key', () => {
    const keys = deriveStealthKeys(TEST_SIGNATURE)
    const ephemeralKey = hexToBytes(
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    )

    const result1 = generateStealthAddressDeterministic(keys.stealthMetaAddress, ephemeralKey)
    const result2 = generateStealthAddressDeterministic(keys.stealthMetaAddress, ephemeralKey)

    expect(result1.stealthAddress).toBe(result2.stealthAddress)
    expect(result1.ephemeralPublicKey).toEqual(result2.ephemeralPublicKey)
    expect(result1.viewTag).toBe(result2.viewTag)
  })
})

describe('Stealth Private Key Derivation', () => {
  it('should derive stealth private key for recipient', () => {
    const keys = deriveStealthKeys(TEST_SIGNATURE)
    const ephemeralKey = hexToBytes(
      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
    )

    // Sender generates stealth address
    const generated = generateStealthAddressDeterministic(keys.stealthMetaAddress, ephemeralKey)

    // Recipient derives private key
    const derived = deriveStealthPrivateKey(
      generated.ephemeralPublicKey,
      keys.spendingPrivateKey,
      keys.viewingPrivateKey
    )

    // Derived address should match generated address
    expect(derived.stealthAddress.toLowerCase()).toBe(generated.stealthAddress.toLowerCase())
    expect(derived.stealthPrivateKey).toBeInstanceOf(Uint8Array)
    expect(derived.stealthPrivateKey.length).toBe(32)
  })
})

describe('View Tag', () => {
  it('should compute view tag correctly', () => {
    const keys = deriveStealthKeys(TEST_SIGNATURE)
    const ephemeralKey = hexToBytes(
      'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
    )

    const generated = generateStealthAddressDeterministic(keys.stealthMetaAddress, ephemeralKey)

    const computedViewTag = computeViewTag(generated.ephemeralPublicKey, keys.viewingPrivateKey)

    expect(computedViewTag).toBe(generated.viewTag)
  })
})

describe('Announcement Scanning', () => {
  it('should find matching announcement', () => {
    const keys = deriveStealthKeys(TEST_SIGNATURE)
    const ephemeralKey = hexToBytes(
      'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd'
    )

    // Generate stealth address
    const generated = generateStealthAddressDeterministic(keys.stealthMetaAddress, ephemeralKey)

    // Build metadata
    const receiptHash =
      '0x1111111111111111111111111111111111111111111111111111111111111111' as `0x${string}`
    const metadata = buildAnnouncementMetadata(generated.viewTag, receiptHash)

    // Create announcement
    const announcement: Announcement = {
      stealthAddress: generated.stealthAddress,
      ephemeralPubKey: generated.ephemeralPublicKey,
      metadata,
      txHash: '0x2222222222222222222222222222222222222222222222222222222222222222' as `0x${string}`,
      blockNumber: 12345n,
    }

    // Scan for payments
    const payments = scanAnnouncements(
      [announcement],
      keys.spendingPrivateKey,
      keys.viewingPrivateKey
    )

    expect(payments.length).toBe(1)
    expect(payments[0].stealthAddress.toLowerCase()).toBe(generated.stealthAddress.toLowerCase())
    expect(payments[0].receiptHash).toBe(receiptHash)
  })

  it('should not find non-matching announcement', () => {
    const keys1 = deriveStealthKeys(TEST_SIGNATURE)
    const keys2 = derivePortKeys(TEST_SIGNATURE, 1) // Different keys

    const ephemeralKey = hexToBytes(
      'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    )

    // Generate for keys1
    const generated = generateStealthAddressDeterministic(keys1.stealthMetaAddress, ephemeralKey)

    const receiptHash =
      '0x3333333333333333333333333333333333333333333333333333333333333333' as `0x${string}`
    const metadata = buildAnnouncementMetadata(generated.viewTag, receiptHash)

    const announcement: Announcement = {
      stealthAddress: generated.stealthAddress,
      ephemeralPubKey: generated.ephemeralPublicKey,
      metadata,
      txHash: '0x4444444444444444444444444444444444444444444444444444444444444444' as `0x${string}`,
      blockNumber: 12346n,
    }

    // Scan with keys2 (should not find)
    const payments = scanAnnouncements(
      [announcement],
      keys2.spendingPrivateKey,
      keys2.viewingPrivateKey
    )

    expect(payments.length).toBe(0)
  })

  it('should check single announcement', () => {
    const keys = deriveStealthKeys(TEST_SIGNATURE)
    const ephemeralKey = hexToBytes(
      '1111111111111111111111111111111111111111111111111111111111111111'
    )

    const generated = generateStealthAddressDeterministic(keys.stealthMetaAddress, ephemeralKey)

    const receiptHash =
      '0x5555555555555555555555555555555555555555555555555555555555555555' as `0x${string}`
    const metadata = buildAnnouncementMetadata(generated.viewTag, receiptHash)

    const announcement: Announcement = {
      stealthAddress: generated.stealthAddress,
      ephemeralPubKey: generated.ephemeralPublicKey,
      metadata,
      txHash: '0x6666666666666666666666666666666666666666666666666666666666666666' as `0x${string}`,
      blockNumber: 12347n,
    }

    const payment = checkAnnouncement(announcement, keys.spendingPrivateKey, keys.viewingPrivateKey)

    expect(payment).not.toBeNull()
    expect(payment!.stealthAddress.toLowerCase()).toBe(generated.stealthAddress.toLowerCase())
  })
})

describe('Configuration', () => {
  it('should return scheme ID', () => {
    expect(SCHEME_ID).toBe(1)
  })

  it('should get chain config', () => {
    const config = getChainConfig(5003)
    expect(config.chainId).toBe(5003)
    expect(config.name).toBe('Mantle Sepolia')
    expect(config.nativeCurrency.symbol).toBe('MNT')
  })

  it('should throw for unsupported chain', () => {
    expect(() => getChainConfig(999999)).toThrow('Unsupported chain')
  })
})

describe('Stealth Client', () => {
  it('should create stealth client', () => {
    const client = createStealthClient(5003)

    expect(client.chainId).toBe(5003)
    expect(client.schemeId).toBe(1)
    expect(client.config.name).toBe('Mantle Sepolia')
    expect(typeof client.deriveKeys).toBe('function')
    expect(typeof client.generateAddress).toBe('function')
    expect(typeof client.scan).toBe('function')
  })

  it('should derive keys via client', () => {
    const client = createStealthClient(5003)
    const keys = client.deriveKeys(TEST_SIGNATURE)

    expect(keys.stealthMetaAddress).toMatch(/^st:(eth|mnt):0x/)
  })
})
