import {
  createStealthClient,
  scanAnnouncements,
  checkAnnouncement,
  deriveStealthPrivateKey,
  parseStealthMetaAddress,
  generateStealthAddress,
  computeViewTag,
} from '@galeon/stealth'
import type {
  StealthClient,
  Announcement,
  ScannedPayment,
  StealthMetaAddress,
  StealthAddressResult,
} from '@galeon/stealth'
import ChainService from '#services/chain_service'

export interface ClaimablePayment {
  receiptId: string
  portId: string
  stealthAddress: string
  ephemeralPubKey: string
  viewTag: number
  amount: string
  currency: string
  tokenAddress: string | null
  stealthPrivateKey: Uint8Array
}

export default class StealthService {
  private static client: StealthClient | null = null

  /**
   * Get the stealth client for the default chain
   */
  static getClient(): StealthClient {
    if (!this.client) {
      this.client = createStealthClient(ChainService.getDefaultChainId())
    }
    return this.client
  }

  /**
   * Scan announcements to find payments belonging to a port
   *
   * @param announcements - On-chain announcements to scan
   * @param spendingPrivateKey - Port's spending private key (32 bytes)
   * @param viewingPrivateKey - Port's viewing private key (32 bytes)
   * @returns List of payments found
   */
  static scanAnnouncements(
    announcements: Announcement[],
    spendingPrivateKey: Uint8Array,
    viewingPrivateKey: Uint8Array
  ): ScannedPayment[] {
    return scanAnnouncements(announcements, spendingPrivateKey, viewingPrivateKey)
  }

  /**
   * Check a single announcement against a port's keys
   *
   * @param announcement - Single announcement to check
   * @param spendingPrivateKey - Port's spending private key (32 bytes)
   * @param viewingPrivateKey - Port's viewing private key (32 bytes)
   * @returns Payment if it belongs to this port, null otherwise
   */
  static checkAnnouncement(
    announcement: Announcement,
    spendingPrivateKey: Uint8Array,
    viewingPrivateKey: Uint8Array
  ): ScannedPayment | null {
    return checkAnnouncement(announcement, spendingPrivateKey, viewingPrivateKey)
  }

  /**
   * Derive the stealth private key for a payment
   *
   * @param ephemeralPublicKey - 33-byte compressed ephemeral public key
   * @param spendingPrivateKey - 32-byte spending private key
   * @param viewingPrivateKey - 32-byte viewing private key
   * @returns Stealth address and private key
   */
  static deriveStealthPrivateKey(
    ephemeralPublicKey: Uint8Array,
    spendingPrivateKey: Uint8Array,
    viewingPrivateKey: Uint8Array
  ): { stealthAddress: `0x${string}`; stealthPrivateKey: Uint8Array } {
    return deriveStealthPrivateKey(ephemeralPublicKey, spendingPrivateKey, viewingPrivateKey)
  }

  /**
   * Parse a stealth meta address into its components
   *
   * @param stealthMetaAddress - Format: st:(eth|mnt):0x{spending_pub}{viewing_pub}
   * @returns Parsed components
   */
  static parseStealthMetaAddress(stealthMetaAddress: StealthMetaAddress): {
    spendingPublicKey: Uint8Array
    viewingPublicKey: Uint8Array
  } {
    return parseStealthMetaAddress(stealthMetaAddress)
  }

  /**
   * Generate a new stealth address for receiving a payment
   *
   * @param stealthMetaAddress - The recipient's stealth meta address
   * @returns Generated stealth address with ephemeral data
   */
  static generateStealthAddress(stealthMetaAddress: StealthMetaAddress): StealthAddressResult {
    return generateStealthAddress(stealthMetaAddress)
  }

  /**
   * Compute the view tag for fast filtering
   *
   * @param ephemeralPublicKey - 33-byte compressed ephemeral public key
   * @param viewingPrivateKey - 32-byte viewing private key
   * @returns View tag (0-255)
   */
  static computeViewTag(ephemeralPublicKey: Uint8Array, viewingPrivateKey: Uint8Array): number {
    return computeViewTag(ephemeralPublicKey, viewingPrivateKey)
  }

  /**
   * Convert hex string to Uint8Array
   */
  static hexToBytes(hex: string): Uint8Array {
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex
    const bytes = new Uint8Array(cleanHex.length / 2)
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16)
    }
    return bytes
  }

  /**
   * Convert Uint8Array to hex string
   */
  static bytesToHex(bytes: Uint8Array, prefix = true): string {
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    return prefix ? `0x${hex}` : hex
  }
}
