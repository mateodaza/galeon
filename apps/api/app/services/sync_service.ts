import Port from '#models/port'
import Receipt from '#models/receipt'
import PonderService, { type PonderAnnouncement } from '#services/ponder_service'
import { computeViewTag } from '@galeon/stealth'

/**
 * SyncService - Syncs receipts from Ponder indexer to local database
 *
 * This service scans on-chain announcements for a given port and creates
 * receipt records for any payments that haven't been recorded yet.
 * Called on-demand when user session starts or refreshes.
 *
 * Uses view tag filtering:
 * 1. Get viewing private key from encrypted storage
 * 2. For each announcement, compute expected view tag using ephemeral pub key
 * 3. If view tag matches, it's likely for this port (~99.6% accuracy)
 * 4. Create receipt records for matching announcements
 */

export interface SyncResult {
  synced: number
  existing: number
  scanned: number
  errors: string[]
}

export default class SyncService {
  private ponderService: PonderService

  constructor(ponderService?: PonderService) {
    this.ponderService = ponderService ?? new PonderService()
  }

  /**
   * Sync all ports for a user
   * Returns aggregate results across all ports
   */
  async syncUserPorts(userId: number): Promise<{ ports: number; total: SyncResult }> {
    const ports = await Port.query()
      .where('userId', userId)
      .where('status', 'confirmed')
      .where('archived', false)

    const total: SyncResult = { synced: 0, existing: 0, scanned: 0, errors: [] }

    for (const port of ports) {
      try {
        const result = await this.syncPort(port)
        total.synced += result.synced
        total.existing += result.existing
        total.scanned += result.scanned
        total.errors.push(...result.errors)
      } catch (error) {
        total.errors.push(
          `Port ${port.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    return { ports: ports.length, total }
  }

  /**
   * Sync a single port - scan announcements and create missing receipts
   */
  async syncPort(port: Port): Promise<SyncResult> {
    const result: SyncResult = { synced: 0, existing: 0, scanned: 0, errors: [] }

    // Port must be confirmed with a stealth meta address
    if (port.status !== 'confirmed' || !port.stealthMetaAddress) {
      return result
    }

    // Get viewing key for filtering announcements
    const viewingKeyHex = port.decryptViewingKey()
    if (!viewingKeyHex) {
      result.errors.push('No viewing key available')
      return result
    }

    // Convert viewing key hex to Uint8Array
    const viewingPrivateKey = this.hexToBytes(viewingKeyHex)

    // Get all existing receipt tx hashes AND receipt hashes for this port to avoid duplicates
    const existingReceipts = await Receipt.query()
      .where('portId', port.id)
      .select('txHash', 'receiptHash')
    const existingTxHashes = new Set(existingReceipts.map((r) => r.txHash.toLowerCase()))
    const existingReceiptHashes = new Set(
      existingReceipts.filter((r) => r.receiptHash).map((r) => r.receiptHash!.toLowerCase())
    )
    result.existing = existingTxHashes.size

    // Paginate through all announcements for this chain
    let offset = 0
    const limit = 500
    let hasMore = true

    while (hasMore) {
      const response = await this.ponderService.listAnnouncements({
        chainId: port.chainId,
        limit,
        offset,
      })

      result.scanned += response.data.length

      for (const announcement of response.data) {
        // Skip if we already have this receipt (check both txHash and receiptHash)
        if (existingTxHashes.has(announcement.transactionHash.toLowerCase())) {
          continue
        }
        if (
          announcement.receiptHash &&
          existingReceiptHashes.has(announcement.receiptHash.toLowerCase())
        ) {
          continue
        }

        // Check if this announcement is for our port using view tag
        const isForPort = this.checkAnnouncementViewTag(announcement, viewingPrivateKey)

        if (!isForPort) {
          continue
        }

        // Create receipt for this announcement
        try {
          await this.createReceiptFromAnnouncement(port, announcement)
          result.synced++
          existingTxHashes.add(announcement.transactionHash.toLowerCase())
          if (announcement.receiptHash) {
            existingReceiptHashes.add(announcement.receiptHash.toLowerCase())
          }
        } catch (error) {
          // Ignore duplicate key errors (race condition or already synced)
          const errorMsg = error instanceof Error ? error.message : 'Unknown'
          if (!errorMsg.includes('duplicate key')) {
            result.errors.push(`tx ${announcement.transactionHash}: ${errorMsg}`)
          }
        }
      }

      hasMore = response.hasMore
      offset += limit
    }

    // Always update port totals to ensure consistency
    // This recalculates from receipts, picking up any status changes (e.g., collected)
    await this.updatePortTotals(port)

    return result
  }

  /**
   * Check if an announcement's view tag matches our viewing key
   */
  private checkAnnouncementViewTag(
    announcement: PonderAnnouncement,
    viewingPrivateKey: Uint8Array
  ): boolean {
    try {
      // Convert ephemeral public key from hex to bytes
      const ephemeralPubKey = this.hexToBytes(announcement.ephemeralPubKey)

      // Ephemeral key should be 33 bytes (compressed)
      if (ephemeralPubKey.length !== 33) {
        return false
      }

      // Compute expected view tag
      const expectedViewTag = computeViewTag(ephemeralPubKey, viewingPrivateKey)

      // Compare with announcement's view tag
      return announcement.viewTag === expectedViewTag
    } catch {
      // Invalid ephemeral key or crypto error
      return false
    }
  }

  /**
   * Create a receipt record from a Ponder announcement
   */
  private async createReceiptFromAnnouncement(
    port: Port,
    announcement: PonderAnnouncement
  ): Promise<Receipt> {
    // Try to get amount from receipts_anchored table
    const receiptAnchored = await this.ponderService.findReceiptAnchoredByTxHash(
      announcement.transactionHash,
      announcement.chainId
    )

    let amount = '0'
    let tokenAddress: string | null = null
    let currency = port.chainId === 5000 ? 'MNT' : 'ETH'

    if (receiptAnchored) {
      amount = receiptAnchored.amount
      tokenAddress =
        receiptAnchored.token === '0x0000000000000000000000000000000000000000'
          ? null
          : receiptAnchored.token
      currency =
        receiptAnchored.token === '0x0000000000000000000000000000000000000000'
          ? port.chainId === 5000
            ? 'MNT'
            : 'ETH'
          : 'ERC20'
    }

    return Receipt.create({
      portId: port.id,
      txHash: announcement.transactionHash,
      chainId: announcement.chainId,
      status: 'confirmed',
      receiptHash: announcement.receiptHash ?? '',
      stealthAddress: announcement.stealthAddress,
      ephemeralPubKey: announcement.ephemeralPubKey,
      viewTag: announcement.viewTag,
      payerAddress: announcement.caller,
      amount,
      currency,
      tokenAddress,
      blockNumber: announcement.blockNumber,
    })
  }

  /**
   * Update port's totalReceived based on confirmed receipts
   */
  private async updatePortTotals(port: Port): Promise<void> {
    const receipts = await Receipt.query()
      .where('portId', port.id)
      .whereIn('status', ['confirmed', 'collected'])

    let totalReceived = BigInt(0)
    let totalCollected = BigInt(0)

    for (const receipt of receipts) {
      const amount = BigInt(receipt.amount ?? '0')
      totalReceived += amount
      if (receipt.status === 'collected') {
        totalCollected += amount
      }
    }

    port.totalReceived = totalReceived.toString()
    port.totalCollected = totalCollected.toString()
    port.paymentCount = receipts.length
    await port.save()
  }

  /**
   * Convert hex string to Uint8Array
   */
  private hexToBytes(hex: string): Uint8Array {
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex
    const bytes = new Uint8Array(cleanHex.length / 2)
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Number.parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16)
    }
    return bytes
  }
}
