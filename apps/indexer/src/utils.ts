// ============================================================
// Constants
// ============================================================
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const

// Metadata layout lengths (in hex chars, 2 chars = 1 byte)
export const METADATA_LENGTHS = {
  VIEW_TAG: 2, // 1 byte
  RECEIPT_HASH: 64, // 32 bytes
  TOKEN_ADDRESS: 40, // 20 bytes
  AMOUNT: 64, // 32 bytes (uint256)
  // Total for native payment: 1 + 32 = 33 bytes (66 hex chars)
  NATIVE_TOTAL: 66,
  // Total for ERC20 payment: 1 + 32 + 20 + 32 = 85 bytes (170 hex chars)
  ERC20_TOTAL: 170,
} as const

// ============================================================
// Validation Helpers
// ============================================================

export function isZeroAddress(address: string): boolean {
  return address.toLowerCase() === ZERO_ADDRESS
}

export function normalizeAddress(address: string): `0x${string}` {
  return address.toLowerCase() as `0x${string}`
}

// ============================================================
// Metadata Parsing
// ============================================================

export interface ParsedMetadata {
  viewTag: number
  receiptHash: `0x${string}` | null
  tokenAddress: `0x${string}` | null
  amount: string // Decimal string (wei)
  isNative: boolean
  isValid: boolean
  error?: string
}

/**
 * Parse announcement metadata.
 *
 * Metadata layouts:
 * - Native: viewTag (1) + receiptHash (32) = 33 bytes
 * - ERC20:  viewTag (1) + receiptHash (32) + token (20) + amount (32) = 85 bytes
 */
export function parseMetadata(metadata: `0x${string}`): ParsedMetadata {
  const hex = metadata.slice(2) // Remove 0x prefix

  // Minimum: viewTag (1 byte = 2 hex chars)
  if (hex.length < METADATA_LENGTHS.VIEW_TAG) {
    return {
      viewTag: 0,
      receiptHash: null,
      tokenAddress: null,
      amount: '0',
      isNative: true,
      isValid: false,
      error: `Metadata too short: ${hex.length} chars, need at least ${METADATA_LENGTHS.VIEW_TAG}`,
    }
  }

  // Parse view tag (first byte)
  const viewTag = parseInt(hex.slice(0, METADATA_LENGTHS.VIEW_TAG), 16)
  if (isNaN(viewTag) || viewTag < 0 || viewTag > 255) {
    return {
      viewTag: 0,
      receiptHash: null,
      tokenAddress: null,
      amount: '0',
      isNative: true,
      isValid: false,
      error: `Invalid viewTag: ${hex.slice(0, METADATA_LENGTHS.VIEW_TAG)}`,
    }
  }

  // Check for native payment layout (viewTag + receiptHash = 33 bytes)
  if (hex.length === METADATA_LENGTHS.NATIVE_TOTAL) {
    const receiptHash =
      `0x${hex.slice(METADATA_LENGTHS.VIEW_TAG, METADATA_LENGTHS.NATIVE_TOTAL)}` as `0x${string}`
    return {
      viewTag,
      receiptHash,
      tokenAddress: null,
      amount: '0', // Amount comes from tx.value, not metadata
      isNative: true,
      isValid: true,
    }
  }

  // Check for ERC20 payment layout (viewTag + receiptHash + token + amount = 85 bytes)
  if (hex.length === METADATA_LENGTHS.ERC20_TOTAL) {
    const receiptHashEnd = METADATA_LENGTHS.VIEW_TAG + METADATA_LENGTHS.RECEIPT_HASH
    const tokenEnd = receiptHashEnd + METADATA_LENGTHS.TOKEN_ADDRESS
    const amountEnd = tokenEnd + METADATA_LENGTHS.AMOUNT

    const receiptHash = `0x${hex.slice(METADATA_LENGTHS.VIEW_TAG, receiptHashEnd)}` as `0x${string}`
    const tokenAddress = normalizeAddress(`0x${hex.slice(receiptHashEnd, tokenEnd)}`)
    const amountHex = hex.slice(tokenEnd, amountEnd)

    let amount: string
    try {
      amount = BigInt(`0x${amountHex}`).toString()
    } catch {
      return {
        viewTag,
        receiptHash,
        tokenAddress,
        amount: '0',
        isNative: false,
        isValid: false,
        error: `Invalid amount hex: ${amountHex}`,
      }
    }

    return {
      viewTag,
      receiptHash,
      tokenAddress,
      amount,
      isNative: false,
      isValid: true,
    }
  }

  // Unknown layout - store what we can but flag as potentially invalid
  return {
    viewTag,
    receiptHash:
      hex.length >= METADATA_LENGTHS.NATIVE_TOTAL
        ? (`0x${hex.slice(METADATA_LENGTHS.VIEW_TAG, METADATA_LENGTHS.NATIVE_TOTAL)}` as `0x${string}`)
        : null,
    tokenAddress: null,
    amount: '0',
    isNative: true,
    isValid: false,
    error: `Unexpected metadata length: ${hex.length} chars (expected ${METADATA_LENGTHS.NATIVE_TOTAL} or ${METADATA_LENGTHS.ERC20_TOTAL})`,
  }
}
