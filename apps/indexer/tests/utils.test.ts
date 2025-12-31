import { describe, it, expect } from 'vitest'
import {
  parseMetadata,
  isZeroAddress,
  normalizeAddress,
  ZERO_ADDRESS,
  METADATA_LENGTHS,
} from '../src/utils'

describe('Utils', () => {
  describe('isZeroAddress', () => {
    it('returns true for zero address', () => {
      expect(isZeroAddress(ZERO_ADDRESS)).toBe(true)
      expect(isZeroAddress('0x0000000000000000000000000000000000000000')).toBe(true)
    })

    it('returns false for non-zero address', () => {
      expect(isZeroAddress('0x1234567890123456789012345678901234567890')).toBe(false)
    })

    it('handles uppercase addresses', () => {
      expect(isZeroAddress('0x0000000000000000000000000000000000000000')).toBe(true)
    })
  })

  describe('normalizeAddress', () => {
    it('lowercases addresses', () => {
      expect(normalizeAddress('0xABCDEF1234567890ABCDEF1234567890ABCDEF12')).toBe(
        '0xabcdef1234567890abcdef1234567890abcdef12'
      )
    })
  })

  describe('parseMetadata', () => {
    describe('native payments (33 bytes)', () => {
      it('parses valid native payment metadata', () => {
        // viewTag = 0x2a (42), receiptHash = 32 bytes of 0x11
        const viewTag = '2a'
        const receiptHash = '1'.repeat(64)
        const metadata = `0x${viewTag}${receiptHash}` as `0x${string}`

        const result = parseMetadata(metadata)

        expect(result.isValid).toBe(true)
        expect(result.isNative).toBe(true)
        expect(result.viewTag).toBe(42)
        expect(result.receiptHash).toBe(`0x${receiptHash}`)
        expect(result.tokenAddress).toBeNull()
        expect(result.amount).toBe('0') // Amount comes from tx.value
      })

      it('parses viewTag of 0', () => {
        const metadata = `0x00${'0'.repeat(64)}` as `0x${string}`
        const result = parseMetadata(metadata)

        expect(result.isValid).toBe(true)
        expect(result.viewTag).toBe(0)
      })

      it('parses viewTag of 255', () => {
        const metadata = `0xff${'0'.repeat(64)}` as `0x${string}`
        const result = parseMetadata(metadata)

        expect(result.isValid).toBe(true)
        expect(result.viewTag).toBe(255)
      })
    })

    describe('ERC20 payments (85 bytes)', () => {
      it('parses valid ERC20 payment metadata', () => {
        // viewTag = 0x2a (42)
        const viewTag = '2a'
        // receiptHash = 32 bytes
        const receiptHash = 'a'.repeat(64)
        // token address = 20 bytes
        const tokenAddress = 'b'.repeat(40)
        // amount = 1000000000000000000 (1e18 in hex)
        const amount = '0de0b6b3a7640000'.padStart(64, '0')

        const metadata = `0x${viewTag}${receiptHash}${tokenAddress}${amount}` as `0x${string}`

        const result = parseMetadata(metadata)

        expect(result.isValid).toBe(true)
        expect(result.isNative).toBe(false)
        expect(result.viewTag).toBe(42)
        expect(result.receiptHash).toBe(`0x${receiptHash}`)
        expect(result.tokenAddress).toBe(`0x${tokenAddress}`)
        expect(result.amount).toBe('1000000000000000000')
      })

      it('handles large amounts', () => {
        const viewTag = '01'
        const receiptHash = '0'.repeat(64)
        const tokenAddress = '1'.repeat(40)
        // Max uint256
        const amount = 'f'.repeat(64)

        const metadata = `0x${viewTag}${receiptHash}${tokenAddress}${amount}` as `0x${string}`

        const result = parseMetadata(metadata)

        expect(result.isValid).toBe(true)
        expect(result.amount).toBe(
          '115792089237316195423570985008687907853269984665640564039457584007913129639935'
        )
      })
    })

    describe('invalid metadata', () => {
      it('handles empty metadata', () => {
        const result = parseMetadata('0x' as `0x${string}`)

        expect(result.isValid).toBe(false)
        expect(result.error).toContain('too short')
      })

      it('handles metadata with only viewTag', () => {
        const result = parseMetadata('0x2a' as `0x${string}`)

        expect(result.isValid).toBe(false)
        expect(result.viewTag).toBe(42)
        expect(result.error).toContain('Unexpected metadata length')
      })

      it('handles metadata with unexpected length', () => {
        // 50 hex chars (25 bytes) - not 33 or 85
        const result = parseMetadata(`0x${'a'.repeat(50)}` as `0x${string}`)

        expect(result.isValid).toBe(false)
        expect(result.error).toContain('Unexpected metadata length')
      })
    })
  })

  describe('METADATA_LENGTHS constants', () => {
    it('has correct values', () => {
      expect(METADATA_LENGTHS.VIEW_TAG).toBe(2)
      expect(METADATA_LENGTHS.RECEIPT_HASH).toBe(64)
      expect(METADATA_LENGTHS.TOKEN_ADDRESS).toBe(40)
      expect(METADATA_LENGTHS.AMOUNT).toBe(64)
      expect(METADATA_LENGTHS.NATIVE_TOTAL).toBe(66) // 2 + 64
      expect(METADATA_LENGTHS.ERC20_TOTAL).toBe(170) // 2 + 64 + 40 + 64
    })
  })
})
