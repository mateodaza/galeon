import db from '@adonisjs/lucid/services/db'

/**
 * Port data from Ponder indexer database
 */
export interface PonderPort {
  id: string // portId (bytes32)
  owner: string
  name: string
  stealthMetaAddress: string
  active: boolean
  blockNumber: string
  blockTimestamp: string
  transactionHash: string
  chainId: number
}

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
 * Pool deposit data from Ponder indexer database
 */
export interface PonderPoolDeposit {
  id: string
  pool: string
  depositor: string
  commitment: string
  label: string
  value: string
  precommitmentHash: string
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

  /** Maximum allowed limit for announcements query */
  static readonly MAX_ANNOUNCEMENTS_LIMIT = 1000

  /** Default limit for announcements query */
  static readonly DEFAULT_ANNOUNCEMENTS_LIMIT = 500

  /**
   * List all announcements with optional filters and pagination
   * Used by frontend to scan for payments
   */
  async listAnnouncements(options?: {
    viewTag?: number
    stealthAddress?: string
    chainId?: number
    limit?: number
    offset?: number
  }): Promise<{ data: PonderAnnouncement[]; hasMore: boolean }> {
    // Enforce max limit
    const requestedLimit = options?.limit ?? PonderService.DEFAULT_ANNOUNCEMENTS_LIMIT
    const limit = Math.min(requestedLimit, PonderService.MAX_ANNOUNCEMENTS_LIMIT)
    const offset = options?.offset ?? 0

    const query = db
      .connection(this.connection)
      .from('announcements')
      .orderBy('block_number', 'desc')

    if (options?.viewTag !== undefined) {
      query.where('view_tag', options.viewTag)
    }
    if (options?.stealthAddress) {
      query.where('stealth_address', options.stealthAddress.toLowerCase())
    }
    if (options?.chainId !== undefined) {
      query.where('chain_id', options.chainId)
    }

    // Request one extra to check if there are more results
    query.limit(limit + 1).offset(offset)

    const results = await query
    const hasMore = results.length > limit
    const data = results
      .slice(0, limit)
      .map((row: Record<string, unknown>) => this.mapAnnouncement(row))

    return { data, hasMore }
  }

  /**
   * Find announcement by transaction hash and optional chainId
   * Note: Ponder DB uses snake_case column names
   */
  async findAnnouncementByTxHash(
    txHash: string,
    chainId?: number
  ): Promise<PonderAnnouncement | null> {
    const query = db
      .connection(this.connection)
      .from('announcements')
      .where('transaction_hash', txHash.toLowerCase())

    if (chainId !== undefined) {
      query.where('chain_id', chainId)
    }

    const result = await query.first()
    return result ? this.mapAnnouncement(result) : null
  }

  /**
   * Find announcement by receipt hash and optional chainId
   * Note: Ponder DB uses snake_case column names
   */
  async findAnnouncementByReceiptHash(
    receiptHash: string,
    chainId?: number
  ): Promise<PonderAnnouncement | null> {
    const query = db
      .connection(this.connection)
      .from('announcements')
      .where('receipt_hash', receiptHash.toLowerCase())

    if (chainId !== undefined) {
      query.where('chain_id', chainId)
    }

    const result = await query.first()
    return result ? this.mapAnnouncement(result) : null
  }

  /**
   * Find receipt anchored by transaction hash and optional chainId
   * Note: Ponder DB uses snake_case column names
   */
  async findReceiptAnchoredByTxHash(
    txHash: string,
    chainId?: number
  ): Promise<PonderReceiptAnchored | null> {
    const query = db
      .connection(this.connection)
      .from('receipts_anchored')
      .where('transaction_hash', txHash.toLowerCase())

    if (chainId !== undefined) {
      query.where('chain_id', chainId)
    }

    const result = await query.first()
    return result ? this.mapReceiptAnchored(result) : null
  }

  /**
   * Find receipt anchored by receipt hash and optional chainId
   * Note: Ponder DB uses snake_case column names
   */
  async findReceiptAnchoredByReceiptHash(
    receiptHash: string,
    chainId?: number
  ): Promise<PonderReceiptAnchored | null> {
    const query = db
      .connection(this.connection)
      .from('receipts_anchored')
      .where('receipt_hash', receiptHash.toLowerCase())

    if (chainId !== undefined) {
      query.where('chain_id', chainId)
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
   * Find port by transaction hash and optional chainId
   * Note: Ponder DB uses snake_case column names
   */
  async findPortByTxHash(txHash: string, chainId?: number): Promise<PonderPort | null> {
    const query = db
      .connection(this.connection)
      .from('ports')
      .where('transaction_hash', txHash.toLowerCase())

    if (chainId !== undefined) {
      query.where('chain_id', chainId)
    }

    const result = await query.first()
    return result ? this.mapPort(result) : null
  }

  /**
   * Find port by portId (bytes32)
   * Note: Ponder DB uses snake_case column names
   */
  async findPortById(portId: string, chainId?: number): Promise<PonderPort | null> {
    const query = db.connection(this.connection).from('ports').where('id', portId.toLowerCase())

    if (chainId !== undefined) {
      query.where('chain_id', chainId)
    }

    const result = await query.first()
    return result ? this.mapPort(result) : null
  }

  /**
   * Map database row to PonderPort interface
   * Note: Ponder DB uses snake_case column names
   */
  private mapPort(row: Record<string, unknown>): PonderPort {
    return {
      id: String(row.id),
      owner: String(row.owner),
      name: String(row.name),
      stealthMetaAddress: String(row.stealth_meta_address),
      active: Boolean(row.active),
      blockNumber: String(row.block_number),
      blockTimestamp: String(row.block_timestamp),
      transactionHash: String(row.transaction_hash),
      chainId: Number(row.chain_id),
    }
  }

  /**
   * Map database row to PonderAnnouncement interface
   * Note: Ponder DB uses snake_case column names
   */
  private mapAnnouncement(row: Record<string, unknown>): PonderAnnouncement {
    return {
      id: String(row.id),
      schemeId: String(row.scheme_id),
      stealthAddress: String(row.stealth_address),
      caller: String(row.caller),
      ephemeralPubKey: String(row.ephemeral_pub_key),
      metadata: String(row.metadata),
      viewTag: Number(row.view_tag),
      receiptHash: row.receipt_hash ? String(row.receipt_hash) : null,
      blockNumber: String(row.block_number),
      blockTimestamp: String(row.block_timestamp),
      transactionHash: String(row.transaction_hash),
      logIndex: Number(row.log_index),
      chainId: Number(row.chain_id),
    }
  }

  /**
   * Map database row to PonderReceiptAnchored interface
   * Note: Ponder DB uses snake_case column names
   */
  private mapReceiptAnchored(row: Record<string, unknown>): PonderReceiptAnchored {
    return {
      id: String(row.id),
      stealthAddress: String(row.stealth_address),
      receiptHash: String(row.receipt_hash),
      payer: String(row.payer),
      amount: String(row.amount),
      token: String(row.token),
      timestamp: String(row.timestamp),
      blockNumber: String(row.block_number),
      transactionHash: String(row.transaction_hash),
      logIndex: Number(row.log_index),
      chainId: Number(row.chain_id),
    }
  }

  /** Maximum allowed limit for pool deposits query */
  static readonly MAX_DEPOSITS_LIMIT = 1000

  /** Default limit for pool deposits query */
  static readonly DEFAULT_DEPOSITS_LIMIT = 500

  /**
   * List all pool deposits with optional filters and pagination
   * Used by frontend to recover pool deposits
   */
  async listPoolDeposits(options?: {
    pool?: string
    chainId?: number
    limit?: number
    offset?: number
  }): Promise<{ data: PonderPoolDeposit[]; hasMore: boolean }> {
    // Enforce max limit
    const requestedLimit = options?.limit ?? PonderService.DEFAULT_DEPOSITS_LIMIT
    const limit = Math.min(requestedLimit, PonderService.MAX_DEPOSITS_LIMIT)
    const offset = options?.offset ?? 0

    const query = db
      .connection(this.connection)
      .from('pool_deposits')
      .orderBy('block_number', 'asc')
      .orderBy('log_index', 'asc')

    if (options?.pool) {
      query.where('pool', options.pool.toLowerCase())
    }
    if (options?.chainId !== undefined) {
      query.where('chain_id', options.chainId)
    }

    // Request one extra to check if there are more results
    query.limit(limit + 1).offset(offset)

    const results = await query
    const hasMore = results.length > limit
    const data = results
      .slice(0, limit)
      .map((row: Record<string, unknown>) => this.mapPoolDeposit(row))

    return { data, hasMore }
  }

  /**
   * Map database row to PonderPoolDeposit interface
   * Note: Ponder DB uses snake_case column names
   */
  private mapPoolDeposit(row: Record<string, unknown>): PonderPoolDeposit {
    return {
      id: String(row.id),
      pool: String(row.pool),
      depositor: String(row.depositor),
      commitment: String(row.commitment),
      label: String(row.label),
      value: String(row.value),
      precommitmentHash: String(row.precommitment_hash),
      blockNumber: String(row.block_number),
      blockTimestamp: String(row.block_timestamp),
      transactionHash: String(row.transaction_hash),
      logIndex: Number(row.log_index),
      chainId: Number(row.chain_id),
    }
  }

  /**
   * List all merge deposits with optional filters and pagination
   */
  async listMergeDeposits(options?: {
    pool?: string
    depositor?: string
    chainId?: number
    limit?: number
    offset?: number
  }): Promise<{ data: PonderPoolMergeDeposit[]; hasMore: boolean }> {
    const requestedLimit = options?.limit ?? PonderService.DEFAULT_DEPOSITS_LIMIT
    const limit = Math.min(requestedLimit, PonderService.MAX_DEPOSITS_LIMIT)
    const offset = options?.offset ?? 0

    const query = db
      .connection(this.connection)
      .from('pool_merge_deposits')
      .orderBy('block_number', 'asc')
      .orderBy('log_index', 'asc')

    if (options?.pool) {
      query.where('pool', options.pool.toLowerCase())
    }
    if (options?.depositor) {
      query.where('depositor', options.depositor.toLowerCase())
    }
    if (options?.chainId !== undefined) {
      query.where('chain_id', options.chainId)
    }

    query.limit(limit + 1).offset(offset)

    const results = await query
    const hasMore = results.length > limit
    const data = results
      .slice(0, limit)
      .map((row: Record<string, unknown>) => this.mapPoolMergeDeposit(row))

    return { data, hasMore }
  }

  /**
   * Map database row to PonderPoolMergeDeposit interface
   */
  private mapPoolMergeDeposit(row: Record<string, unknown>): PonderPoolMergeDeposit {
    return {
      id: String(row.id),
      pool: String(row.pool),
      depositor: String(row.depositor),
      depositValue: String(row.deposit_value),
      existingNullifierHash: String(row.existing_nullifier_hash),
      newCommitment: String(row.new_commitment),
      blockNumber: String(row.block_number),
      blockTimestamp: String(row.block_timestamp),
      transactionHash: String(row.transaction_hash),
      logIndex: Number(row.log_index),
      chainId: Number(row.chain_id),
    }
  }

  /** Maximum allowed limit for merkle leaves query */
  static readonly MAX_MERKLE_LEAVES_LIMIT = 5000

  /** Default limit for merkle leaves query */
  static readonly DEFAULT_MERKLE_LEAVES_LIMIT = 1000

  /**
   * List all merkle leaves for a pool
   * Includes BOTH deposit commitments AND withdrawal change commitments
   * Required for building the state merkle tree correctly
   */
  async listMerkleLeaves(options?: {
    pool?: string
    chainId?: number
    limit?: number
    offset?: number
  }): Promise<{ data: PonderMerkleLeaf[]; hasMore: boolean }> {
    const requestedLimit = options?.limit ?? PonderService.DEFAULT_MERKLE_LEAVES_LIMIT
    const limit = Math.min(requestedLimit, PonderService.MAX_MERKLE_LEAVES_LIMIT)
    const offset = options?.offset ?? 0

    const query = db.connection(this.connection).from('merkle_leaves').orderBy('leaf_index', 'asc')

    if (options?.pool) {
      query.where('pool', options.pool.toLowerCase())
    }
    if (options?.chainId !== undefined) {
      query.where('chain_id', options.chainId)
    }

    query.limit(limit + 1).offset(offset)

    const results = await query
    const hasMore = results.length > limit
    const data = results
      .slice(0, limit)
      .map((row: Record<string, unknown>) => this.mapMerkleLeaf(row))

    return { data, hasMore }
  }

  /**
   * Map database row to PonderMerkleLeaf interface
   */
  private mapMerkleLeaf(row: Record<string, unknown>): PonderMerkleLeaf {
    return {
      id: String(row.id),
      pool: String(row.pool),
      leafIndex: String(row.leaf_index),
      leaf: String(row.leaf),
      root: String(row.root),
      blockNumber: String(row.block_number),
      blockTimestamp: String(row.block_timestamp),
      transactionHash: String(row.transaction_hash),
      logIndex: Number(row.log_index),
      chainId: Number(row.chain_id),
    }
  }

  /**
   * Find a merge deposit by the nullifier hash it spent
   * @param nullifierHash - The existing nullifier hash that was spent
   * @param chainId - Optional chain ID filter
   * @returns The merge deposit record if found, null otherwise
   */
  async findMergeDepositByNullifier(
    nullifierHash: string,
    chainId?: number
  ): Promise<PonderPoolMergeDeposit | null> {
    const query = db
      .connection(this.connection)
      .from('pool_merge_deposits')
      .where('existing_nullifier_hash', nullifierHash.toLowerCase())

    if (chainId !== undefined) {
      query.where('chain_id', chainId)
    }

    const result = await query.first()
    return result ? this.mapPoolMergeDeposit(result) : null
  }

  /**
   * Check if a nullifier has been spent (used in a withdrawal)
   * @param nullifierHash - The nullifier hash as hex string
   * @param chainId - Optional chain ID filter
   * @returns The withdrawal record if spent, null otherwise
   */
  async findWithdrawalByNullifier(
    nullifierHash: string,
    chainId?: number
  ): Promise<PonderPoolWithdrawal | null> {
    const query = db
      .connection(this.connection)
      .from('pool_withdrawals')
      .where('spent_nullifier', nullifierHash.toLowerCase())

    if (chainId !== undefined) {
      query.where('chain_id', chainId)
    }

    const result = await query.first()
    return result ? this.mapPoolWithdrawal(result) : null
  }

  /**
   * Map database row to PonderPoolWithdrawal interface
   */
  private mapPoolWithdrawal(row: Record<string, unknown>): PonderPoolWithdrawal {
    return {
      id: String(row.id),
      pool: String(row.pool),
      processooor: String(row.processooor),
      value: String(row.value),
      spentNullifier: String(row.spent_nullifier),
      newCommitment: String(row.new_commitment),
      recipient: row.recipient ? String(row.recipient) : null,
      relayer: row.relayer ? String(row.relayer) : null,
      asset: row.asset ? String(row.asset) : null,
      feeAmount: row.fee_amount ? String(row.fee_amount) : null,
      blockNumber: String(row.block_number),
      blockTimestamp: String(row.block_timestamp),
      transactionHash: String(row.transaction_hash),
      logIndex: Number(row.log_index),
      chainId: Number(row.chain_id),
    }
  }
}

/**
 * Pool withdrawal data from Ponder indexer database
 */
export interface PonderPoolWithdrawal {
  id: string
  pool: string
  processooor: string
  value: string
  spentNullifier: string
  newCommitment: string
  recipient: string | null
  relayer: string | null
  asset: string | null
  feeAmount: string | null
  blockNumber: string
  blockTimestamp: string
  transactionHash: string
  logIndex: number
  chainId: number
}

/**
 * Merkle leaf data from Ponder indexer database
 * Includes all commitments (deposits + withdrawal changes)
 */
export interface PonderMerkleLeaf {
  id: string
  pool: string
  leafIndex: string
  leaf: string
  root: string
  blockNumber: string
  blockTimestamp: string
  transactionHash: string
  logIndex: number
  chainId: number
}

/**
 * Pool merge deposit data from Ponder indexer database
 */
export interface PonderPoolMergeDeposit {
  id: string
  pool: string
  depositor: string
  depositValue: string
  existingNullifierHash: string
  newCommitment: string
  blockNumber: string
  blockTimestamp: string
  transactionHash: string
  logIndex: number
  chainId: number
}
