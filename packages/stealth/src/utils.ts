/**
 * Utility functions for hex/bytes conversion.
 *
 * We use our own implementations to avoid TypeScript subpath export issues
 * with @noble/hashes/utils.
 */

/** Valid hex character pattern */
const HEX_PATTERN = /^[0-9a-fA-F]*$/

/**
 * Validate a hex string and return the clean version (no prefix).
 *
 * @param hex - Hex string to validate
 * @param expectedBytes - Optional expected byte length
 * @returns Clean hex string (no 0x prefix)
 * @throws Error if hex is invalid
 */
function validateHex(hex: string, expectedBytes?: number): string {
  if (typeof hex !== 'string') {
    throw new Error('Hex must be a string')
  }

  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex

  if (cleanHex.length === 0) {
    throw new Error('Hex string is empty')
  }

  if (cleanHex.length % 2 !== 0) {
    throw new Error(`Hex string has odd length: ${cleanHex.length}`)
  }

  if (!HEX_PATTERN.test(cleanHex)) {
    throw new Error('Hex string contains invalid characters')
  }

  if (expectedBytes !== undefined && cleanHex.length !== expectedBytes * 2) {
    throw new Error(
      `Expected ${expectedBytes} bytes (${expectedBytes * 2} hex chars), got ${cleanHex.length / 2} bytes`
    )
  }

  return cleanHex
}

/**
 * Convert a hex string to Uint8Array.
 *
 * @param hex - Hex string (with or without 0x prefix)
 * @param expectedBytes - Optional expected byte length for validation
 * @returns Uint8Array of bytes
 * @throws Error if hex is invalid or wrong length
 */
export function hexToBytes(hex: string, expectedBytes?: number): Uint8Array {
  const cleanHex = validateHex(hex, expectedBytes)
  const bytes = new Uint8Array(cleanHex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

/**
 * Convert Uint8Array to hex string (without 0x prefix).
 *
 * @param bytes - Uint8Array to convert
 * @returns Hex string (lowercase, no prefix)
 * @throws Error if input is not a Uint8Array
 */
export function bytesToHex(bytes: Uint8Array): string {
  if (!(bytes instanceof Uint8Array)) {
    throw new Error('Input must be a Uint8Array')
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Convert a bigint scalar to a 32-byte Uint8Array.
 *
 * @param scalar - BigInt value
 * @returns 32-byte Uint8Array
 * @throws Error if scalar is negative
 */
export function scalarToBytes(scalar: bigint): Uint8Array {
  if (typeof scalar !== 'bigint') {
    throw new Error('Scalar must be a bigint')
  }
  if (scalar < 0n) {
    throw new Error('Scalar must be non-negative')
  }
  const hex = scalar.toString(16).padStart(64, '0')
  return hexToBytes(hex)
}

/**
 * Validate that a Uint8Array has the expected length.
 *
 * @param bytes - Uint8Array to validate
 * @param expectedLength - Expected length in bytes
 * @param name - Name for error messages
 * @throws Error if validation fails
 */
export function validateBytes(bytes: Uint8Array, expectedLength: number, name: string): void {
  if (!(bytes instanceof Uint8Array)) {
    throw new Error(`${name} must be a Uint8Array`)
  }
  if (bytes.length !== expectedLength) {
    throw new Error(`${name} must be ${expectedLength} bytes, got ${bytes.length}`)
  }
}
