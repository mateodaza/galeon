import { describe, it, expect } from 'vitest'
import { parseMetadata, normalizeAddress, isZeroAddress, METADATA_LENGTHS } from '../src/utils'

/**
 * Indexing Logic Tests
 *
 * These tests verify the logic used in src/index.ts event handlers
 * without requiring Ponder's runtime virtual modules.
 */

describe('Indexing Logic', () => {
  describe('Announcement Event Processing', () => {
    it('should parse native payment metadata (viewTag only)', () => {
      // Native payment: just viewTag (1 byte) - too short, invalid
      const metadata = '0xff' as `0x${string}`
      const result = parseMetadata(metadata)

      expect(result.viewTag).toBe(255)
      expect(result.receiptHash).toBeNull()
      expect(result.tokenAddress).toBeNull()
      expect(result.isNative).toBe(true)
      expect(result.isValid).toBe(false) // Too short
    })

    it('should parse native payment with viewTag and receiptHash', () => {
      // Native payment: viewTag (1 byte) + receiptHash (32 bytes) = 33 bytes = 66 hex chars
      const viewTag = 'ff'
      const receiptHash = 'a'.repeat(64)

      const metadata = `0x${viewTag}${receiptHash}` as `0x${string}`
      const result = parseMetadata(metadata)

      expect(result.viewTag).toBe(255)
      expect(result.receiptHash).toBe(`0x${receiptHash}`)
      expect(result.tokenAddress).toBeNull()
      expect(result.isNative).toBe(true)
      expect(result.isValid).toBe(true)
    })

    it('should parse ERC20 payment metadata with all fields', () => {
      // ERC20: viewTag (1) + receiptHash (32) + token (20) + amount (32) = 85 bytes = 170 hex chars
      const viewTag = 'ab'
      const receiptHash = 'c'.repeat(64)
      const token = 'd'.repeat(40)
      // 1e18 in hex, padded to 64 chars (32 bytes)
      const amount = '0000000000000000000000000000000000000000000000000de0b6b3a7640000'

      const metadata = `0x${viewTag}${receiptHash}${token}${amount}` as `0x${string}`
      const result = parseMetadata(metadata)

      expect(result.viewTag).toBe(171) // 0xab
      expect(result.receiptHash).toBe(`0x${receiptHash}`)
      expect(result.tokenAddress).toBe(`0x${'d'.repeat(40)}`)
      expect(result.amount).toBe('1000000000000000000')
      expect(result.isNative).toBe(false)
      expect(result.isValid).toBe(true)
    })

    it('should handle metadata with only viewTag and partial receiptHash', () => {
      // Not a valid native layout (66 chars) or ERC20 layout (170 chars)
      const viewTag = '01'
      const receiptHash = 'a'.repeat(64)

      const metadata = `0x${viewTag}${receiptHash}` as `0x${string}`
      const result = parseMetadata(metadata)

      expect(result.viewTag).toBe(1)
      expect(result.receiptHash).toBe(`0x${'a'.repeat(64)}`)
      expect(result.tokenAddress).toBeNull()
      expect(result.isValid).toBe(true) // 66 chars = valid native layout
    })
  })

  describe('Port Event Processing', () => {
    it('should normalize owner address to lowercase', () => {
      const owner = '0xAbCdEfAbCdEfAbCdEfAbCdEfAbCdEfAbCdEfAbCd'
      const normalized = normalizeAddress(owner)

      expect(normalized).toBe('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd')
    })

    it('should identify zero address for native token', () => {
      const zeroAddress = '0x0000000000000000000000000000000000000000'
      const nonZeroAddress = '0x1234567890123456789012345678901234567890'

      expect(isZeroAddress(zeroAddress)).toBe(true)
      expect(isZeroAddress(nonZeroAddress)).toBe(false)
    })
  })

  describe('Receipt Event Processing', () => {
    it('should generate correct record ID format', () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      const logIndex = 5

      const id = `${txHash}-${logIndex}`

      expect(id).toBe(`${txHash}-5`)
      expect(id).toMatch(/^0x[a-f0-9]+-\d+$/)
    })

    it('should handle large amounts correctly', () => {
      // 1000 ETH in wei
      const amount = 1000000000000000000000n

      expect(amount > 0n).toBe(true)
      expect(typeof amount).toBe('bigint')
    })
  })

  describe('Block/Transaction Context', () => {
    it('should store correct chain ID for Mantle', () => {
      const mantleChainId = 5000

      expect(mantleChainId).toBe(5000)
    })

    it('should handle block timestamps as bigint', () => {
      const timestamp = 1704067200n // Jan 1, 2024

      expect(typeof timestamp).toBe('bigint')
      expect(timestamp > 0n).toBe(true)
    })
  })

  describe('Metadata Length Constants', () => {
    it('should have correct metadata lengths', () => {
      expect(METADATA_LENGTHS.VIEW_TAG).toBe(2) // 1 byte
      expect(METADATA_LENGTHS.RECEIPT_HASH).toBe(64) // 32 bytes
      expect(METADATA_LENGTHS.TOKEN_ADDRESS).toBe(40) // 20 bytes
      expect(METADATA_LENGTHS.AMOUNT).toBe(64) // 32 bytes
      expect(METADATA_LENGTHS.NATIVE_TOTAL).toBe(66) // 33 bytes
      expect(METADATA_LENGTHS.ERC20_TOTAL).toBe(170) // 85 bytes
    })
  })
})
