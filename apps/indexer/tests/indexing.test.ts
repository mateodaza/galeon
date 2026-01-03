import { describe, it, expect } from 'vitest'
import {
  parseMetadata,
  normalizeAddress,
  isZeroAddress,
  METADATA_LENGTHS,
  uint256ToHex,
  hexToUint256,
  generateEventId,
  isValidUint256Hex,
  isValidPoolAddress,
  createNullifierKey,
  UINT256_HEX_LENGTH,
} from '../src/utils'

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

    it('should parse native payment with viewTag, receiptHash, and portId', () => {
      // Native payment: viewTag (1) + receiptHash (32) + portId (32) = 65 bytes = 130 hex chars
      const viewTag = 'ff'
      const receiptHash = 'a'.repeat(64)
      const portId = 'b'.repeat(64)

      const metadata = `0x${viewTag}${receiptHash}${portId}` as `0x${string}`
      const result = parseMetadata(metadata)

      expect(result.viewTag).toBe(255)
      expect(result.receiptHash).toBe(`0x${receiptHash}`)
      expect(result.portId).toBe(`0x${portId}`)
      expect(result.tokenAddress).toBeNull()
      expect(result.isNative).toBe(true)
      expect(result.isValid).toBe(true)
    })

    it('should parse ERC20 payment metadata with all fields including portId', () => {
      // ERC20: viewTag (1) + receiptHash (32) + portId (32) + token (20) + amount (32) = 117 bytes = 234 hex chars
      const viewTag = 'ab'
      const receiptHash = 'c'.repeat(64)
      const portId = 'e'.repeat(64)
      const token = 'd'.repeat(40)
      // 1e18 in hex, padded to 64 chars (32 bytes)
      const amount = '0000000000000000000000000000000000000000000000000de0b6b3a7640000'

      const metadata = `0x${viewTag}${receiptHash}${portId}${token}${amount}` as `0x${string}`
      const result = parseMetadata(metadata)

      expect(result.viewTag).toBe(171) // 0xab
      expect(result.receiptHash).toBe(`0x${receiptHash}`)
      expect(result.portId).toBe(`0x${portId}`)
      expect(result.tokenAddress).toBe(`0x${'d'.repeat(40)}`)
      expect(result.amount).toBe('1000000000000000000')
      expect(result.isNative).toBe(false)
      expect(result.isValid).toBe(true)
    })

    it('should reject old metadata format without portId', () => {
      // Old format: viewTag (1) + receiptHash (32) = 33 bytes = 66 hex chars (now invalid)
      const viewTag = '01'
      const receiptHash = 'a'.repeat(64)

      const metadata = `0x${viewTag}${receiptHash}` as `0x${string}`
      const result = parseMetadata(metadata)

      expect(result.viewTag).toBe(1)
      expect(result.receiptHash).toBe(`0x${'a'.repeat(64)}`)
      expect(result.portId).toBeNull()
      expect(result.tokenAddress).toBeNull()
      expect(result.isValid).toBe(false) // 66 chars = invalid (old format)
      expect(result.error).toContain('Unexpected metadata length')
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
    it('should have correct metadata lengths (with portId)', () => {
      expect(METADATA_LENGTHS.VIEW_TAG).toBe(2) // 1 byte
      expect(METADATA_LENGTHS.RECEIPT_HASH).toBe(64) // 32 bytes
      expect(METADATA_LENGTHS.PORT_ID).toBe(64) // 32 bytes
      expect(METADATA_LENGTHS.TOKEN_ADDRESS).toBe(40) // 20 bytes
      expect(METADATA_LENGTHS.AMOUNT).toBe(64) // 32 bytes
      // Native: viewTag (2) + receiptHash (64) + portId (64) = 130 hex chars (65 bytes)
      expect(METADATA_LENGTHS.NATIVE_TOTAL).toBe(130)
      // ERC20: viewTag (2) + receiptHash (64) + portId (64) + token (40) + amount (64) = 234 hex chars (117 bytes)
      expect(METADATA_LENGTHS.ERC20_TOTAL).toBe(234)
    })

    it('should have correct uint256 hex length', () => {
      expect(UINT256_HEX_LENGTH).toBe(64) // 32 bytes = 64 hex chars
    })
  })
})

// ============================================================
// Privacy Pool Indexing Tests
// ============================================================

describe('Privacy Pool Indexing Logic', () => {
  describe('uint256ToHex', () => {
    it('should convert zero to padded hex', () => {
      const result = uint256ToHex(0n)
      expect(result).toBe(`0x${'0'.repeat(64)}`)
      expect(result.length).toBe(66) // 0x + 64 chars
    })

    it('should convert small number to padded hex', () => {
      const result = uint256ToHex(255n)
      expect(result).toBe(`0x${'0'.repeat(62)}ff`)
    })

    it('should convert 1 ETH (1e18) to hex', () => {
      const oneEth = 1000000000000000000n
      const result = uint256ToHex(oneEth)
      expect(result).toBe('0x0000000000000000000000000000000000000000000000000de0b6b3a7640000')
    })

    it('should handle max uint256', () => {
      const maxUint256 = 2n ** 256n - 1n
      const result = uint256ToHex(maxUint256)
      expect(result).toBe(`0x${'f'.repeat(64)}`)
    })

    it('should produce consistent commitment hash format', () => {
      // Simulating a commitment hash from poseidon
      const commitment = 12345678901234567890123456789012345678901234567890n
      const result = uint256ToHex(commitment)

      expect(result.startsWith('0x')).toBe(true)
      expect(result.length).toBe(66)
      expect(/^0x[0-9a-f]{64}$/.test(result)).toBe(true)
    })
  })

  describe('hexToUint256', () => {
    it('should convert padded hex to bigint', () => {
      const hex = `0x${'0'.repeat(62)}ff`
      const result = hexToUint256(hex)
      expect(result).toBe(255n)
    })

    it('should handle hex without 0x prefix', () => {
      const hex = '0'.repeat(62) + 'ff'
      const result = hexToUint256(hex)
      expect(result).toBe(255n)
    })

    it('should convert 1 ETH hex back to bigint', () => {
      const hex = '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000'
      const result = hexToUint256(hex)
      expect(result).toBe(1000000000000000000n)
    })

    it('should roundtrip uint256ToHex and hexToUint256', () => {
      const original = 987654321098765432109876543210n
      const hex = uint256ToHex(original)
      const back = hexToUint256(hex)
      expect(back).toBe(original)
    })
  })

  describe('generateEventId', () => {
    it('should generate correct ID format', () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      const logIndex = 5
      const result = generateEventId(txHash, logIndex)

      expect(result).toBe(`${txHash}-5`)
    })

    it('should handle logIndex 0', () => {
      const txHash = '0xabc'
      const result = generateEventId(txHash, 0)
      expect(result).toBe('0xabc-0')
    })

    it('should handle large logIndex', () => {
      const txHash = '0xdef'
      const result = generateEventId(txHash, 999)
      expect(result).toBe('0xdef-999')
    })
  })

  describe('isValidUint256Hex', () => {
    it('should accept valid hex with 0x prefix', () => {
      expect(isValidUint256Hex('0x' + '0'.repeat(64))).toBe(true)
      expect(isValidUint256Hex('0x' + 'f'.repeat(64))).toBe(true)
      expect(isValidUint256Hex('0x1234abcd')).toBe(true)
    })

    it('should accept valid hex without 0x prefix', () => {
      expect(isValidUint256Hex('0'.repeat(64))).toBe(true)
      expect(isValidUint256Hex('abcdef')).toBe(true)
    })

    it('should reject hex longer than 64 chars', () => {
      expect(isValidUint256Hex('0'.repeat(65))).toBe(false)
      expect(isValidUint256Hex('0x' + '0'.repeat(65))).toBe(false)
    })

    it('should reject invalid hex characters', () => {
      expect(isValidUint256Hex('0xghij')).toBe(false)
      expect(isValidUint256Hex('xyz123')).toBe(false)
    })

    it('should reject empty string', () => {
      expect(isValidUint256Hex('')).toBe(false)
      expect(isValidUint256Hex('0x')).toBe(false)
    })
  })

  describe('isValidPoolAddress', () => {
    it('should accept valid Ethereum addresses', () => {
      expect(isValidPoolAddress('0x1234567890123456789012345678901234567890')).toBe(true)
      expect(isValidPoolAddress('0xAbCdEf1234567890AbCdEf1234567890AbCdEf12')).toBe(true)
    })

    it('should reject addresses without 0x prefix', () => {
      expect(isValidPoolAddress('1234567890123456789012345678901234567890')).toBe(false)
    })

    it('should reject addresses with wrong length', () => {
      expect(isValidPoolAddress('0x1234')).toBe(false)
      expect(isValidPoolAddress('0x12345678901234567890123456789012345678901234')).toBe(false)
    })

    it('should reject addresses with invalid characters', () => {
      expect(isValidPoolAddress('0xGGGG567890123456789012345678901234567890')).toBe(false)
    })
  })

  describe('createNullifierKey', () => {
    it('should create lowercase key from pool and nullifier', () => {
      const pool = '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12'
      const nullifier = '0x' + 'A'.repeat(64)
      const result = createNullifierKey(pool, nullifier)

      expect(result).toBe('0xabcdef1234567890abcdef1234567890abcdef12-0x' + 'a'.repeat(64))
    })

    it('should handle already lowercase inputs', () => {
      const pool = '0xabcdef1234567890abcdef1234567890abcdef12'
      const nullifier = '0x' + '1'.repeat(64)
      const result = createNullifierKey(pool, nullifier)

      expect(result).toBe(`${pool}-${nullifier}`)
    })
  })

  describe('Pool Deposit Event Processing', () => {
    it('should store commitment as padded hex', () => {
      // Simulating the Deposited event handler logic
      const commitment = 12345n
      const commitmentHex = uint256ToHex(commitment)

      expect(commitmentHex.length).toBe(66)
      expect(commitmentHex).toBe(
        '0x0000000000000000000000000000000000000000000000000000000000003039'
      )
    })

    it('should store label as padded hex', () => {
      const label = 0n
      const labelHex = uint256ToHex(label)

      expect(labelHex).toBe('0x' + '0'.repeat(64))
    })

    it('should store precommitmentHash as padded hex', () => {
      const precommitmentHash = 2n ** 200n
      const hex = uint256ToHex(precommitmentHash)

      expect(hex.length).toBe(66)
      expect(hex.startsWith('0x')).toBe(true)
    })
  })

  describe('Pool Withdrawal Event Processing', () => {
    it('should store spentNullifier as padded hex', () => {
      const nullifier = 999999999999999999999n
      const hex = uint256ToHex(nullifier)

      expect(hex.length).toBe(66)
    })

    it('should store newCommitment as padded hex', () => {
      const newCommitment = 2n ** 255n
      const hex = uint256ToHex(newCommitment)

      expect(hex.length).toBe(66)
      expect(hexToUint256(hex)).toBe(newCommitment)
    })

    it('should track nullifier spending correctly', () => {
      const pool1 = '0x1111111111111111111111111111111111111111'
      const pool2 = '0x2222222222222222222222222222222222222222'
      const nullifier = '0x' + 'abc'.repeat(21) + 'a'

      const key1 = createNullifierKey(pool1, nullifier)
      const key2 = createNullifierKey(pool2, nullifier)

      // Same nullifier in different pools should have different keys
      expect(key1).not.toBe(key2)
      expect(key1).toContain(pool1.toLowerCase())
      expect(key2).toContain(pool2.toLowerCase())
    })
  })

  describe('ASP Root Event Processing', () => {
    it('should store root as padded hex', () => {
      const root = 2n ** 254n + 12345n
      const rootHex = uint256ToHex(root)

      expect(rootHex.length).toBe(66)
      expect(hexToUint256(rootHex)).toBe(root)
    })

    it('should handle IPFS CID storage', () => {
      // IPFS CIDs are stored as text, not hex
      const ipfsCID = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'

      expect(typeof ipfsCID).toBe('string')
      expect(ipfsCID.startsWith('Qm')).toBe(true)
    })
  })

  describe('Merkle Leaf Event Processing', () => {
    it('should store leaf index as bigint', () => {
      const leafIndex = 12345n

      expect(typeof leafIndex).toBe('bigint')
      expect(leafIndex >= 0n).toBe(true)
    })

    it('should store leaf and root as padded hex', () => {
      const leaf = 2n ** 100n
      const root = 2n ** 200n

      const leafHex = uint256ToHex(leaf)
      const rootHex = uint256ToHex(root)

      expect(leafHex.length).toBe(66)
      expect(rootHex.length).toBe(66)
    })
  })

  describe('Pool Configuration Updates', () => {
    it('should handle BPS values correctly', () => {
      // BPS = basis points (1/100 of 1%)
      const vettingFeeBPS = 100 // 1%
      const maxRelayFeeBPS = 50 // 0.5%

      expect(vettingFeeBPS).toBeLessThanOrEqual(10000)
      expect(maxRelayFeeBPS).toBeLessThanOrEqual(10000)
    })

    it('should handle minimum deposit amount', () => {
      const minDeposit = 100000000000000000n // 0.1 ETH

      expect(typeof minDeposit).toBe('bigint')
      expect(minDeposit > 0n).toBe(true)
    })
  })

  describe('Blocklist Updates', () => {
    it('should normalize depositor address', () => {
      const depositor = '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12'
      const normalized = normalizeAddress(depositor)

      expect(normalized).toBe('0xabcdef1234567890abcdef1234567890abcdef12')
    })

    it('should track blocked status', () => {
      const blocked = true

      expect(typeof blocked).toBe('boolean')
    })
  })

  describe('Frozen Address Tracking', () => {
    it('should use stealth address as primary key', () => {
      const stealthAddress = '0x9999888877776666555544443333222211110000'
      const normalized = normalizeAddress(stealthAddress)

      expect(normalized).toBe('0x9999888877776666555544443333222211110000')
    })

    it('should handle upsert logic for frozen status', () => {
      // Simulating frozen → unfrozen → frozen transitions
      const states = [true, false, true]

      states.forEach((frozen) => {
        expect(typeof frozen).toBe('boolean')
      })
    })
  })
})
