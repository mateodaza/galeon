// ============================================================
// Constants
// ============================================================
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const

// Privacy Pool constants
export const UINT256_HEX_LENGTH = 64 // 32 bytes = 64 hex chars

// Metadata layout lengths (in hex chars, 2 chars = 1 byte)
// Layout: viewTag (1) + receiptHash (32) + portId (32) [+ token (20) + amount (32)]
export const METADATA_LENGTHS = {
  VIEW_TAG: 2, // 1 byte
  RECEIPT_HASH: 64, // 32 bytes
  PORT_ID: 64, // 32 bytes (bytes32)
  TOKEN_ADDRESS: 40, // 20 bytes
  AMOUNT: 64, // 32 bytes (uint256)
  // Total for native payment: 1 + 32 + 32 = 65 bytes (130 hex chars)
  NATIVE_TOTAL: 130,
  // Total for ERC20 payment: 1 + 32 + 32 + 20 + 32 = 117 bytes (234 hex chars)
  ERC20_TOTAL: 234,
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
  portId: `0x${string}` | null
  tokenAddress: `0x${string}` | null
  amount: string // Decimal string (wei)
  isNative: boolean
  isValid: boolean
  error?: string
}

/**
 * Parse announcement metadata.
 *
 * Metadata layouts (updated with portId):
 * - Native: viewTag (1) + receiptHash (32) + portId (32) = 65 bytes (130 hex chars)
 * - ERC20:  viewTag (1) + receiptHash (32) + portId (32) + token (20) + amount (32) = 117 bytes (234 hex chars)
 */
export function parseMetadata(metadata: `0x${string}`): ParsedMetadata {
  const hex = metadata.slice(2) // Remove 0x prefix

  // Minimum: viewTag (1 byte = 2 hex chars)
  if (hex.length < METADATA_LENGTHS.VIEW_TAG) {
    return {
      viewTag: 0,
      receiptHash: null,
      portId: null,
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
      portId: null,
      tokenAddress: null,
      amount: '0',
      isNative: true,
      isValid: false,
      error: `Invalid viewTag: ${hex.slice(0, METADATA_LENGTHS.VIEW_TAG)}`,
    }
  }

  // Check for native payment layout (viewTag + receiptHash + portId = 65 bytes = 130 hex chars)
  if (hex.length === METADATA_LENGTHS.NATIVE_TOTAL) {
    const receiptHashEnd = METADATA_LENGTHS.VIEW_TAG + METADATA_LENGTHS.RECEIPT_HASH
    const portIdEnd = receiptHashEnd + METADATA_LENGTHS.PORT_ID

    const receiptHash = `0x${hex.slice(METADATA_LENGTHS.VIEW_TAG, receiptHashEnd)}` as `0x${string}`
    const portId = `0x${hex.slice(receiptHashEnd, portIdEnd)}` as `0x${string}`

    return {
      viewTag,
      receiptHash,
      portId,
      tokenAddress: null,
      amount: '0', // Amount comes from tx.value, not metadata
      isNative: true,
      isValid: true,
    }
  }

  // Check for ERC20 payment layout (viewTag + receiptHash + portId + token + amount = 117 bytes = 234 hex chars)
  if (hex.length === METADATA_LENGTHS.ERC20_TOTAL) {
    const receiptHashEnd = METADATA_LENGTHS.VIEW_TAG + METADATA_LENGTHS.RECEIPT_HASH
    const portIdEnd = receiptHashEnd + METADATA_LENGTHS.PORT_ID
    const tokenEnd = portIdEnd + METADATA_LENGTHS.TOKEN_ADDRESS
    const amountEnd = tokenEnd + METADATA_LENGTHS.AMOUNT

    const receiptHash = `0x${hex.slice(METADATA_LENGTHS.VIEW_TAG, receiptHashEnd)}` as `0x${string}`
    const portId = `0x${hex.slice(receiptHashEnd, portIdEnd)}` as `0x${string}`
    const tokenAddress = normalizeAddress(`0x${hex.slice(portIdEnd, tokenEnd)}`)
    const amountHex = hex.slice(tokenEnd, amountEnd)

    let amount: string
    try {
      amount = BigInt(`0x${amountHex}`).toString()
    } catch {
      return {
        viewTag,
        receiptHash,
        portId,
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
      portId,
      tokenAddress,
      amount,
      isNative: false,
      isValid: true,
    }
  }

  // Unknown layout - store what we can but flag as potentially invalid
  const receiptHashEnd = METADATA_LENGTHS.VIEW_TAG + METADATA_LENGTHS.RECEIPT_HASH
  return {
    viewTag,
    receiptHash:
      hex.length >= receiptHashEnd
        ? (`0x${hex.slice(METADATA_LENGTHS.VIEW_TAG, receiptHashEnd)}` as `0x${string}`)
        : null,
    portId: null,
    tokenAddress: null,
    amount: '0',
    isNative: true,
    isValid: false,
    error: `Unexpected metadata length: ${hex.length} chars (expected ${METADATA_LENGTHS.NATIVE_TOTAL} or ${METADATA_LENGTHS.ERC20_TOTAL})`,
  }
}

// ============================================================
// Privacy Pool Helpers
// ============================================================

/**
 * Convert a bigint (uint256) to a 0x-prefixed hex string with proper padding.
 * Used for storing commitment hashes, nullifiers, roots, etc.
 */
export function uint256ToHex(value: bigint): `0x${string}` {
  return `0x${value.toString(16).padStart(UINT256_HEX_LENGTH, '0')}` as `0x${string}`
}

/**
 * Convert a hex string back to bigint.
 * Handles both 0x-prefixed and unprefixed hex strings.
 */
export function hexToUint256(hex: string): bigint {
  const cleanHex = hex.startsWith('0x') ? hex : `0x${hex}`
  return BigInt(cleanHex)
}

/**
 * Generate a unique ID for event records.
 * Format: txHash-logIndex
 */
export function generateEventId(txHash: string, logIndex: number): string {
  return `${txHash}-${logIndex}`
}

/**
 * Validate that a hex string represents a valid uint256.
 * Returns true if the value is a valid 256-bit unsigned integer.
 */
export function isValidUint256Hex(hex: string): boolean {
  try {
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex
    if (cleanHex.length > UINT256_HEX_LENGTH) return false
    if (!/^[0-9a-fA-F]*$/.test(cleanHex)) return false
    const value = BigInt(`0x${cleanHex}`)
    return value >= 0n && value < 2n ** 256n
  } catch {
    return false
  }
}

/**
 * Calculate the ASP root index from ordered events.
 * In production, this should be derived from contract state or event ordering.
 */
export function calculateRootIndex(existingCount: number): number {
  return existingCount
}

/**
 * Validate pool address format.
 */
export function isValidPoolAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/i.test(address)
}

/**
 * Parse withdrawal context to extract pool-specific data.
 * The context hash is computed from pool address + withdrawal data.
 */
export interface WithdrawalContext {
  pool: `0x${string}`
  processooor: `0x${string}`
  value: bigint
  nullifier: `0x${string}`
  newCommitment: `0x${string}`
}

/**
 * Create a nullifier lookup key.
 * Used for checking if a nullifier has been spent.
 */
export function createNullifierKey(pool: string, nullifier: string): string {
  return `${normalizeAddress(pool)}-${nullifier.toLowerCase()}`
}
