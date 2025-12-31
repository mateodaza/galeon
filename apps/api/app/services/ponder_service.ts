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
   * Find announcement by transaction hash and optional chainId
   */
  async findAnnouncementByTxHash(
    txHash: string,
    chainId?: number
  ): Promise<PonderAnnouncement | null> {
    const query = db
      .connection(this.connection)
      .from('announcements')
      .where('transactionHash', txHash.toLowerCase())

    if (chainId !== undefined) {
      query.where('chainId', chainId)
    }

    const result = await query.first()
    return result ? this.mapAnnouncement(result) : null
  }

  /**
   * Find announcement by receipt hash and optional chainId
   */
  async findAnnouncementByReceiptHash(
    receiptHash: string,
    chainId?: number
  ): Promise<PonderAnnouncement | null> {
    const query = db
      .connection(this.connection)
      .from('announcements')
      .where('receiptHash', receiptHash.toLowerCase())

    if (chainId !== undefined) {
      query.where('chainId', chainId)
    }

    const result = await query.first()
    return result ? this.mapAnnouncement(result) : null
  }

  /**
   * Find receipt anchored by transaction hash and optional chainId
   */
  async findReceiptAnchoredByTxHash(
    txHash: string,
    chainId?: number
  ): Promise<PonderReceiptAnchored | null> {
    const query = db
      .connection(this.connection)
      .from('receipts_anchored')
      .where('transactionHash', txHash.toLowerCase())

    if (chainId !== undefined) {
      query.where('chainId', chainId)
    }

    const result = await query.first()
    return result ? this.mapReceiptAnchored(result) : null
  }

  /**
   * Find receipt anchored by receipt hash and optional chainId
   */
  async findReceiptAnchoredByReceiptHash(
    receiptHash: string,
    chainId?: number
  ): Promise<PonderReceiptAnchored | null> {
    const query = db
      .connection(this.connection)
      .from('receipts_anchored')
      .where('receiptHash', receiptHash.toLowerCase())

    if (chainId !== undefined) {
      query.where('chainId', chainId)
    }

    const result = await query.first()
    return result ? this.mapReceiptAnchored(result) : null
  }

  /**
   * Check if an announcement exists in the indexer
   */
  async announcementExists(txHash: string, chainId?: number): Promise<boolean> {
    const announcement = await this.findAnnouncementByTxHash(txHash, chainId)
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
