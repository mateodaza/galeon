/**
 * Announcement scanning for EIP-5564.
 *
 * Recipients scan on-chain announcements to find payments sent to them.
 * View tags provide O(1) filtering to skip 255/256 irrelevant announcements.
 */

import { bytesToHex, hexToBytes, validateBytes } from './utils'
import type { Announcement, ScannedPayment } from './types'
import { computeViewTag, deriveStealthPrivateKey } from './address'

/** Minimum metadata length (view tag only) */
const MIN_METADATA_LENGTH = 1

/** Metadata length for native payments: viewTag (1) + receiptHash (32) + portId (32) */
const NATIVE_METADATA_LENGTH = 65

/** Metadata length for token payments: viewTag (1) + receiptHash (32) + portId (32) + token (20) + amount (32) */
const TOKEN_METADATA_LENGTH = 117

/**
 * Validate an announcement has required fields.
 *
 * @param announcement - Announcement to validate
 * @returns true if valid, false if malformed (skip silently)
 */
function isValidAnnouncement(announcement: Announcement): boolean {
  // Must have metadata with at least a view tag
  if (!announcement.metadata || announcement.metadata.length < MIN_METADATA_LENGTH) {
    return false
  }

  // Must have valid ephemeral public key (33 bytes compressed)
  if (!announcement.ephemeralPubKey || announcement.ephemeralPubKey.length !== 33) {
    return false
  }

  // Must have stealth address
  if (!announcement.stealthAddress) {
    return false
  }

  return true
}

/**
 * Scan announcements to find payments belonging to a viewing key.
 *
 * This function:
 * 1. Validates announcement format (skips malformed)
 * 2. Quick-filters using view tags (skips ~99.6% of announcements)
 * 3. For matching view tags, derives the stealth address
 * 4. Compares derived address with announcement address
 * 5. If match, extracts the stealth private key and payment details
 *
 * @param announcements - List of on-chain announcements to scan
 * @param spendingPrivateKey - Port's spending private key (32 bytes)
 * @param viewingPrivateKey - Port's viewing private key (32 bytes)
 * @returns List of payments belonging to this Port
 * @throws Error if private keys have invalid length
 *
 * @example
 * ```ts
 * const announcements = await fetchAnnouncements(fromBlock, toBlock)
 * const payments = scanAnnouncements(
 *   announcements,
 *   port.spendingPrivateKey,
 *   port.viewingPrivateKey
 * )
 * console.log(`Found ${payments.length} payments`)
 * ```
 */
export function scanAnnouncements(
  announcements: Announcement[],
  spendingPrivateKey: Uint8Array,
  viewingPrivateKey: Uint8Array
): ScannedPayment[] {
  // Validate key lengths
  validateBytes(spendingPrivateKey, 32, 'Spending private key')
  validateBytes(viewingPrivateKey, 32, 'Viewing private key')

  const payments: ScannedPayment[] = []

  for (const announcement of announcements) {
    // Skip malformed announcements
    if (!isValidAnnouncement(announcement)) {
      continue
    }

    // Wrap crypto operations in try/catch to handle invalid curve points
    // A malformed ephemeralPubKey could crash secp256k1 operations
    try {
      // Quick filter: check view tag first (skips ~99.6% of announcements)
      const announcementViewTag = announcement.metadata[0]
      const expectedViewTag = computeViewTag(announcement.ephemeralPubKey, viewingPrivateKey)

      if (announcementViewTag !== expectedViewTag) {
        continue // Not for us, skip
      }

      // View tag matches - try to derive the stealth address
      const { stealthAddress, stealthPrivateKey } = deriveStealthPrivateKey(
        announcement.ephemeralPubKey,
        spendingPrivateKey,
        viewingPrivateKey
      )

      // Compare addresses (case-insensitive)
      if (stealthAddress.toLowerCase() !== announcement.stealthAddress.toLowerCase()) {
        // View tag collision (1/256 chance) - not actually for us
        continue
      }

      // This payment is for us! Parse metadata and build payment record
      const payment = parsePaymentFromAnnouncement(announcement, stealthAddress, stealthPrivateKey)

      if (payment !== null) {
        payments.push(payment)
      }
    } catch {
      // Invalid curve point or other crypto error - skip this announcement
      // This prevents adversarial announcements from crashing the scan
      continue
    }
  }

  return payments
}

/**
 * Check if a single announcement belongs to a viewing key.
 *
 * Use this for real-time checking of individual announcements.
 *
 * @param announcement - Single announcement to check
 * @param spendingPrivateKey - Port's spending private key (32 bytes)
 * @param viewingPrivateKey - Port's viewing private key (32 bytes)
 * @returns Payment details if it belongs to us, null otherwise
 * @throws Error if private keys have invalid length
 */
export function checkAnnouncement(
  announcement: Announcement,
  spendingPrivateKey: Uint8Array,
  viewingPrivateKey: Uint8Array
): ScannedPayment | null {
  // Validate key lengths
  validateBytes(spendingPrivateKey, 32, 'Spending private key')
  validateBytes(viewingPrivateKey, 32, 'Viewing private key')

  // Validate announcement format
  if (!isValidAnnouncement(announcement)) {
    return null
  }

  // Wrap crypto operations in try/catch to handle invalid curve points
  try {
    // Quick filter with view tag
    const announcementViewTag = announcement.metadata[0]
    const expectedViewTag = computeViewTag(announcement.ephemeralPubKey, viewingPrivateKey)

    if (announcementViewTag !== expectedViewTag) {
      return null
    }

    // Try to derive stealth address
    const { stealthAddress, stealthPrivateKey } = deriveStealthPrivateKey(
      announcement.ephemeralPubKey,
      spendingPrivateKey,
      viewingPrivateKey
    )

    if (stealthAddress.toLowerCase() !== announcement.stealthAddress.toLowerCase()) {
      return null
    }

    return parsePaymentFromAnnouncement(announcement, stealthAddress, stealthPrivateKey)
  } catch {
    // Invalid curve point or other crypto error
    return null
  }
}

/**
 * Parse payment details from an announcement and derived keys.
 *
 * Galeon metadata format:
 * - Byte 0: view tag
 * - Bytes 1-32: receipt hash (32 bytes)
 * - Bytes 33-64: port ID (32 bytes)
 * - Bytes 65-84: token address (20 bytes, optional - only for token payments)
 * - Bytes 85-116: amount (32 bytes, optional - only for token payments)
 *
 * @returns Parsed payment or null if metadata is malformed
 */
function parsePaymentFromAnnouncement(
  announcement: Announcement,
  stealthAddress: `0x${string}`,
  stealthPrivateKey: Uint8Array
): ScannedPayment | null {
  const metadata = announcement.metadata

  // Extract receipt hash if present (bytes 1-33), otherwise use zero hash
  // Some contracts may only include viewTag in metadata
  let receiptHash: `0x${string}`
  let portId: `0x${string}` | null = null

  if (metadata.length >= NATIVE_METADATA_LENGTH) {
    // Full Galeon metadata: viewTag (1) + receiptHash (32) + portId (32)
    receiptHash = `0x${bytesToHex(metadata.slice(1, 33))}` as `0x${string}`
    portId = `0x${bytesToHex(metadata.slice(33, 65))}` as `0x${string}`
  } else if (metadata.length >= 33) {
    // Legacy format without portId: viewTag (1) + receiptHash (32)
    receiptHash = `0x${bytesToHex(metadata.slice(1, 33))}` as `0x${string}`
  } else if (metadata.length >= MIN_METADATA_LENGTH) {
    // Minimal metadata: just viewTag - use zero hash as placeholder
    receiptHash = '0x0000000000000000000000000000000000000000000000000000000000000000'
  } else {
    // No metadata at all - skip
    return null
  }

  // Extract token address and amount (if present in full-length token metadata)
  let token: `0x${string}` | null = null
  let amount = 0n

  if (metadata.length >= TOKEN_METADATA_LENGTH) {
    // Token payment: has token address (bytes 65-84) and amount (bytes 85-116)
    token = `0x${bytesToHex(metadata.slice(65, 85))}`
    const amountHex = bytesToHex(metadata.slice(85, 117))
    // Handle empty/zero amount gracefully
    amount = amountHex.length > 0 ? BigInt(`0x${amountHex}`) : 0n
  }
  // Note: We accept partial metadata to support minimal viewTag-only format

  return {
    stealthAddress,
    stealthPrivateKey,
    amount,
    token,
    receiptHash,
    portId,
    txHash: announcement.txHash,
    blockNumber: announcement.blockNumber,
  }
}

/**
 * Build metadata bytes for an announcement.
 *
 * Galeon metadata format:
 * - Native: viewTag (1) + receiptHash (32) + portId (32) = 65 bytes
 * - Token: viewTag (1) + receiptHash (32) + portId (32) + token (20) + amount (32) = 117 bytes
 *
 * @param viewTag - Single-byte view tag (0-255)
 * @param receiptHash - 32-byte receipt hash (0x-prefixed, 66 chars)
 * @param portId - 32-byte port ID (0x-prefixed, 66 chars)
 * @param token - Token address (null for native currency, 0x-prefixed, 42 chars)
 * @param amount - Payment amount (only included for token payments)
 * @returns Metadata bytes for the announcement
 * @throws Error if viewTag, receiptHash, portId, or token have invalid format/length
 */
export function buildAnnouncementMetadata(
  viewTag: number,
  receiptHash: `0x${string}`,
  portId: `0x${string}`,
  token: `0x${string}` | null = null,
  amount: bigint = 0n
): Uint8Array {
  // Validate viewTag
  if (!Number.isInteger(viewTag) || viewTag < 0 || viewTag > 255) {
    throw new Error('View tag must be an integer between 0 and 255')
  }

  // Validate receiptHash (must be 32 bytes = 64 hex chars + 0x prefix)
  if (!receiptHash.startsWith('0x') || receiptHash.length !== 66) {
    throw new Error('Receipt hash must be 32 bytes (0x + 64 hex chars)')
  }
  const receiptBytes = hexToBytes(receiptHash.slice(2), 32)

  // Validate portId (must be 32 bytes = 64 hex chars + 0x prefix)
  if (!portId.startsWith('0x') || portId.length !== 66) {
    throw new Error('Port ID must be 32 bytes (0x + 64 hex chars)')
  }
  const portIdBytes = hexToBytes(portId.slice(2), 32)

  if (token === null) {
    // Native payment: viewTag (1) + receiptHash (32) + portId (32) = 65 bytes
    const metadata = new Uint8Array(65)
    metadata[0] = viewTag
    metadata.set(receiptBytes, 1)
    metadata.set(portIdBytes, 33)
    return metadata
  }

  // Validate token address (must be 20 bytes = 40 hex chars + 0x prefix)
  if (!token.startsWith('0x') || token.length !== 42) {
    throw new Error('Token address must be 20 bytes (0x + 40 hex chars)')
  }
  const tokenBytes = hexToBytes(token.slice(2), 20)

  // Validate amount
  if (amount < 0n) {
    throw new Error('Amount must be non-negative')
  }

  // Token payment: viewTag (1) + receiptHash (32) + portId (32) + token (20) + amount (32) = 117 bytes
  const metadata = new Uint8Array(117)
  metadata[0] = viewTag
  metadata.set(receiptBytes, 1)
  metadata.set(portIdBytes, 33)
  metadata.set(tokenBytes, 65)

  // Convert amount to 32-byte big-endian
  const amountHex = amount.toString(16).padStart(64, '0')
  metadata.set(hexToBytes(amountHex), 85)

  return metadata
}
