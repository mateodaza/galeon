import db from '@adonisjs/lucid/services/db'

/**
 * Announcement data from Ponder indexer database
 */
export interface PonderAnnouncement {
  id: string
  schemeId: string
  stealthAddress: string
  caller: string // payer address
  ephemeralPubKey: string
  metadata: string
  viewTag: number
  receiptHash: string | null
  blockNumber: string
  blockTimestamp: string
  transactionHash: string
  logIndex: number
  chainId: number
}

/**
 * Receipt anchored data from Ponder indexer database
 */
export interface PonderReceiptAnchored {
  id: string
  stealthAddress: string
  receiptHash: string
  payer: string
  amount: string
  token: string
  timestamp: string
  blockNumber: string
  transactionHash: string
  logIndex: number
  chainId: number
}

/**
 * Service for querying the Ponder indexer PostgreSQL database directly.
 * Uses the 'ponder' connection defined in config/database.ts
 */
export default class PonderService {
  private connection = 'ponder'

  /**
   * Find announcement by transaction hash
   */
  async findAnnouncementByTxHash(txHash: string): Promise<PonderAnnouncement | null> {
    try {
      const result = await db
        .connection(this.connection)
        .from('announcements')
        .where('transactionHash', txHash.toLowerCase())
        .first()

      return result ? this.mapAnnouncement(result) : null
    } catch {
      return null
    }
  }

  /**
   * Find announcement by receipt hash
   */
  async findAnnouncementByReceiptHash(receiptHash: string): Promise<PonderAnnouncement | null> {
    try {
      const result = await db
        .connection(this.connection)
        .from('announcements')
        .where('receiptHash', receiptHash.toLowerCase())
        .first()

      return result ? this.mapAnnouncement(result) : null
    } catch {
      return null
    }
  }

  /**
   * Find receipt anchored by transaction hash
   */
  async findReceiptAnchoredByTxHash(txHash: string): Promise<PonderReceiptAnchored | null> {
    try {
      const result = await db
        .connection(this.connection)
        .from('receipts_anchored')
        .where('transactionHash', txHash.toLowerCase())
        .first()

      return result ? this.mapReceiptAnchored(result) : null
    } catch {
      return null
    }
  }

  /**
   * Find receipt anchored by receipt hash
   */
  async findReceiptAnchoredByReceiptHash(
    receiptHash: string
  ): Promise<PonderReceiptAnchored | null> {
    try {
      const result = await db
        .connection(this.connection)
        .from('receipts_anchored')
        .where('receiptHash', receiptHash.toLowerCase())
        .first()

      return result ? this.mapReceiptAnchored(result) : null
    } catch {
      return null
    }
  }

  /**
   * Check if an announcement exists in the indexer
   */
  async announcementExists(txHash: string): Promise<boolean> {
    const announcement = await this.findAnnouncementByTxHash(txHash)
    return announcement !== null
  }

  /**
   * Map database row to PonderAnnouncement interface
   */
  private mapAnnouncement(row: Record<string, unknown>): PonderAnnouncement {
    return {
      id: String(row.id),
      schemeId: String(row.schemeId),
      stealthAddress: String(row.stealthAddress),
      caller: String(row.caller),
      ephemeralPubKey: String(row.ephemeralPubKey),
      metadata: String(row.metadata),
      viewTag: Number(row.viewTag),
      receiptHash: row.receiptHash ? String(row.receiptHash) : null,
      blockNumber: String(row.blockNumber),
      blockTimestamp: String(row.blockTimestamp),
      transactionHash: String(row.transactionHash),
      logIndex: Number(row.logIndex),
      chainId: Number(row.chainId),
    }
  }

  /**
   * Map database row to PonderReceiptAnchored interface
   */
  private mapReceiptAnchored(row: Record<string, unknown>): PonderReceiptAnchored {
    return {
      id: String(row.id),
      stealthAddress: String(row.stealthAddress),
      receiptHash: String(row.receiptHash),
      payer: String(row.payer),
      amount: String(row.amount),
      token: String(row.token),
      timestamp: String(row.timestamp),
      blockNumber: String(row.blockNumber),
      transactionHash: String(row.transactionHash),
      logIndex: Number(row.logIndex),
      chainId: Number(row.chainId),
    }
  }
}
