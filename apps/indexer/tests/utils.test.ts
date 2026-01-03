import { describe, it, expect } from 'vitest'
import {
  parseMetadata,
  isZeroAddress,
  normalizeAddress,
  ZERO_ADDRESS,
  METADATA_LENGTHS,
  uint256ToHex,
  hexToUint256,
  generateEventId,
  isValidUint256Hex,
  calculateRootIndex,
  isValidPoolAddress,
  createNullifierKey,
  UINT256_HEX_LENGTH,
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
    describe('native payments (65 bytes = 130 hex chars)', () => {
      it('parses valid native payment metadata', () => {
        // viewTag (1) + receiptHash (32) + portId (32) = 65 bytes
        const viewTag = '2a'
        const receiptHash = '1'.repeat(64)
        const portId = '2'.repeat(64)
        const metadata = `0x${viewTag}${receiptHash}${portId}` as `0x${string}`

        const result = parseMetadata(metadata)

        expect(result.isValid).toBe(true)
        expect(result.isNative).toBe(true)
        expect(result.viewTag).toBe(42)
        expect(result.receiptHash).toBe(`0x${receiptHash}`)
        expect(result.portId).toBe(`0x${portId}`)
        expect(result.tokenAddress).toBeNull()
        expect(result.amount).toBe('0') // Amount comes from tx.value
      })

      it('parses viewTag of 0', () => {
        const metadata = `0x00${'0'.repeat(64)}${'0'.repeat(64)}` as `0x${string}`
        const result = parseMetadata(metadata)

        expect(result.isValid).toBe(true)
        expect(result.viewTag).toBe(0)
        expect(result.portId).toBe(`0x${'0'.repeat(64)}`)
      })

      it('parses viewTag of 255', () => {
        const metadata = `0xff${'0'.repeat(64)}${'a'.repeat(64)}` as `0x${string}`
        const result = parseMetadata(metadata)

        expect(result.isValid).toBe(true)
        expect(result.viewTag).toBe(255)
        expect(result.portId).toBe(`0x${'a'.repeat(64)}`)
      })
    })

    describe('ERC20 payments (117 bytes = 234 hex chars)', () => {
      it('parses valid ERC20 payment metadata', () => {
        // viewTag (1) + receiptHash (32) + portId (32) + token (20) + amount (32) = 117 bytes
        const viewTag = '2a'
        const receiptHash = 'a'.repeat(64)
        const portId = 'c'.repeat(64)
        const tokenAddress = 'b'.repeat(40)
        const amount = '0de0b6b3a7640000'.padStart(64, '0')

        const metadata =
          `0x${viewTag}${receiptHash}${portId}${tokenAddress}${amount}` as `0x${string}`

        const result = parseMetadata(metadata)

        expect(result.isValid).toBe(true)
        expect(result.isNative).toBe(false)
        expect(result.viewTag).toBe(42)
        expect(result.receiptHash).toBe(`0x${receiptHash}`)
        expect(result.portId).toBe(`0x${portId}`)
        expect(result.tokenAddress).toBe(`0x${tokenAddress}`)
        expect(result.amount).toBe('1000000000000000000')
      })

      it('handles large amounts', () => {
        const viewTag = '01'
        const receiptHash = '0'.repeat(64)
        const portId = 'd'.repeat(64)
        const tokenAddress = '1'.repeat(40)
        const amount = 'f'.repeat(64) // Max uint256

        const metadata =
          `0x${viewTag}${receiptHash}${portId}${tokenAddress}${amount}` as `0x${string}`

        const result = parseMetadata(metadata)

        expect(result.isValid).toBe(true)
        expect(result.portId).toBe(`0x${portId}`)
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
        expect(result.portId).toBeNull()
      })

      it('handles metadata with only viewTag', () => {
        const result = parseMetadata('0x2a' as `0x${string}`)

        expect(result.isValid).toBe(false)
        expect(result.viewTag).toBe(42)
        expect(result.error).toContain('Unexpected metadata length')
      })

      it('handles metadata with unexpected length (old 33-byte format)', () => {
        // 66 hex chars (33 bytes) - old native format without portId
        const result = parseMetadata(`0x${'a'.repeat(66)}` as `0x${string}`)

        expect(result.isValid).toBe(false)
        expect(result.error).toContain('Unexpected metadata length')
      })

      it('handles metadata with unexpected length (old 85-byte format)', () => {
        // 170 hex chars (85 bytes) - old ERC20 format without portId
        const result = parseMetadata(`0x${'a'.repeat(170)}` as `0x${string}`)

        expect(result.isValid).toBe(false)
        expect(result.error).toContain('Unexpected metadata length')
      })
    })
  })

  describe('METADATA_LENGTHS constants', () => {
    it('has correct values', () => {
      expect(METADATA_LENGTHS.VIEW_TAG).toBe(2)
      expect(METADATA_LENGTHS.RECEIPT_HASH).toBe(64)
      expect(METADATA_LENGTHS.PORT_ID).toBe(64)
      expect(METADATA_LENGTHS.TOKEN_ADDRESS).toBe(40)
      expect(METADATA_LENGTHS.AMOUNT).toBe(64)
      // Native: viewTag (2) + receiptHash (64) + portId (64) = 130
      expect(METADATA_LENGTHS.NATIVE_TOTAL).toBe(130)
      // ERC20: viewTag (2) + receiptHash (64) + portId (64) + token (40) + amount (64) = 234
      expect(METADATA_LENGTHS.ERC20_TOTAL).toBe(234)
    })
  })

  describe('UINT256_HEX_LENGTH constant', () => {
    it('has correct value', () => {
      expect(UINT256_HEX_LENGTH).toBe(64) // 32 bytes = 64 hex chars
    })
  })
})

// ============================================================
// Privacy Pool Utils Tests
// ============================================================

describe('Privacy Pool Utils', () => {
  describe('uint256ToHex', () => {
    it('converts 0 to padded hex', () => {
      expect(uint256ToHex(0n)).toBe('0x' + '0'.repeat(64))
    })

    it('converts small numbers correctly', () => {
      expect(uint256ToHex(1n)).toBe('0x' + '0'.repeat(63) + '1')
      expect(uint256ToHex(15n)).toBe('0x' + '0'.repeat(63) + 'f')
      expect(uint256ToHex(16n)).toBe('0x' + '0'.repeat(62) + '10')
      expect(uint256ToHex(255n)).toBe('0x' + '0'.repeat(62) + 'ff')
    })

    it('converts 1 ETH correctly', () => {
      const oneEth = 1000000000000000000n
      expect(uint256ToHex(oneEth)).toBe(
        '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000'
      )
    })

    it('converts max uint256 correctly', () => {
      const max = 2n ** 256n - 1n
      expect(uint256ToHex(max)).toBe('0x' + 'f'.repeat(64))
    })

    it('always produces 66-character strings (0x + 64)', () => {
      const values = [0n, 1n, 255n, 1000000n, 2n ** 128n, 2n ** 255n]
      values.forEach((v) => {
        expect(uint256ToHex(v).length).toBe(66)
      })
    })
  })

  describe('hexToUint256', () => {
    it('converts padded hex to bigint', () => {
      expect(hexToUint256('0x' + '0'.repeat(64))).toBe(0n)
      expect(hexToUint256('0x' + '0'.repeat(63) + '1')).toBe(1n)
      expect(hexToUint256('0x' + '0'.repeat(62) + 'ff')).toBe(255n)
    })

    it('handles hex without 0x prefix', () => {
      expect(hexToUint256('0'.repeat(63) + '1')).toBe(1n)
      expect(hexToUint256('ff')).toBe(255n)
    })

    it('converts 1 ETH hex back correctly', () => {
      const hex = '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000'
      expect(hexToUint256(hex)).toBe(1000000000000000000n)
    })

    it('roundtrips with uint256ToHex', () => {
      const values = [0n, 1n, 255n, 1000000n, 2n ** 128n, 2n ** 200n, 2n ** 256n - 1n]
      values.forEach((v) => {
        expect(hexToUint256(uint256ToHex(v))).toBe(v)
      })
    })
  })

  describe('generateEventId', () => {
    it('generates correct format', () => {
      const txHash = '0xabcdef'
      const logIndex = 42
      expect(generateEventId(txHash, logIndex)).toBe('0xabcdef-42')
    })

    it('handles logIndex 0', () => {
      expect(generateEventId('0x123', 0)).toBe('0x123-0')
    })

    it('handles large logIndex', () => {
      expect(generateEventId('0x123', 99999)).toBe('0x123-99999')
    })

    it('handles full transaction hash', () => {
      const fullHash = '0x' + 'a'.repeat(64)
      expect(generateEventId(fullHash, 1)).toBe(fullHash + '-1')
    })
  })

  describe('isValidUint256Hex', () => {
    it('accepts valid hex with 0x prefix', () => {
      expect(isValidUint256Hex('0x0')).toBe(true)
      expect(isValidUint256Hex('0x' + '0'.repeat(64))).toBe(true)
      expect(isValidUint256Hex('0x' + 'f'.repeat(64))).toBe(true)
      expect(isValidUint256Hex('0xabcdef123456')).toBe(true)
    })

    it('accepts valid hex without prefix', () => {
      expect(isValidUint256Hex('0')).toBe(true)
      expect(isValidUint256Hex('0'.repeat(64))).toBe(true)
      expect(isValidUint256Hex('abcdef')).toBe(true)
    })

    it('rejects empty string', () => {
      expect(isValidUint256Hex('')).toBe(false)
      expect(isValidUint256Hex('0x')).toBe(false)
    })

    it('rejects hex longer than 64 chars', () => {
      expect(isValidUint256Hex('0'.repeat(65))).toBe(false)
      expect(isValidUint256Hex('0x' + '0'.repeat(65))).toBe(false)
    })

    it('rejects invalid hex characters', () => {
      expect(isValidUint256Hex('0xggg')).toBe(false)
      expect(isValidUint256Hex('xyz')).toBe(false)
      expect(isValidUint256Hex('0x123g')).toBe(false)
    })

    it('accepts mixed case hex', () => {
      expect(isValidUint256Hex('0xAbCdEf')).toBe(true)
      expect(isValidUint256Hex('ABCDEF')).toBe(true)
    })
  })

  describe('calculateRootIndex', () => {
    it('returns existing count as next index', () => {
      expect(calculateRootIndex(0)).toBe(0)
      expect(calculateRootIndex(1)).toBe(1)
      expect(calculateRootIndex(100)).toBe(100)
    })
  })

  describe('isValidPoolAddress', () => {
    it('accepts valid Ethereum addresses', () => {
      expect(isValidPoolAddress('0x1234567890123456789012345678901234567890')).toBe(true)
      expect(isValidPoolAddress('0xAbCdEf1234567890AbCdEf1234567890AbCdEf12')).toBe(true)
      expect(isValidPoolAddress('0x' + '0'.repeat(40))).toBe(true)
      expect(isValidPoolAddress('0x' + 'f'.repeat(40))).toBe(true)
    })

    it('rejects addresses without 0x prefix', () => {
      expect(isValidPoolAddress('1234567890123456789012345678901234567890')).toBe(false)
    })

    it('rejects addresses with wrong length', () => {
      expect(isValidPoolAddress('0x123')).toBe(false)
      expect(isValidPoolAddress('0x' + '1'.repeat(39))).toBe(false)
      expect(isValidPoolAddress('0x' + '1'.repeat(41))).toBe(false)
    })

    it('rejects addresses with invalid characters', () => {
      expect(isValidPoolAddress('0x' + 'g'.repeat(40))).toBe(false)
      expect(isValidPoolAddress('0x' + 'z'.repeat(40))).toBe(false)
    })
  })

  describe('createNullifierKey', () => {
    it('creates lowercase key', () => {
      const pool = '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12'
      const nullifier = '0x' + 'AB'.repeat(32)
      const key = createNullifierKey(pool, nullifier)

      expect(key).toBe('0xabcdef1234567890abcdef1234567890abcdef12-0x' + 'ab'.repeat(32))
    })

    it('preserves already lowercase inputs', () => {
      const pool = '0xabcdef1234567890abcdef1234567890abcdef12'
      const nullifier = '0x' + '12'.repeat(32)
      const key = createNullifierKey(pool, nullifier)

      expect(key).toBe(`${pool}-${nullifier}`)
    })

    it('creates unique keys for different pools', () => {
      const pool1 = '0x1111111111111111111111111111111111111111'
      const pool2 = '0x2222222222222222222222222222222222222222'
      const nullifier = '0x' + 'aa'.repeat(32)

      const key1 = createNullifierKey(pool1, nullifier)
      const key2 = createNullifierKey(pool2, nullifier)

      expect(key1).not.toBe(key2)
    })

    it('creates unique keys for different nullifiers', () => {
      const pool = '0x1111111111111111111111111111111111111111'
      const nullifier1 = '0x' + 'aa'.repeat(32)
      const nullifier2 = '0x' + 'bb'.repeat(32)

      const key1 = createNullifierKey(pool, nullifier1)
      const key2 = createNullifierKey(pool, nullifier2)

      expect(key1).not.toBe(key2)
    })
  })
})
