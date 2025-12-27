/**
 * Payment and Collection domain types.
 *
 * Payments flow from payers to stealth addresses.
 * Collections flow from stealth addresses to the vendor's main wallet.
 */

import type { ISODateString, WeiString, Address, Bytes32Hex, StealthMetaAddress } from './common'
import type { SupportedChainId } from './chain'
import type { Currency } from './receipt'

/** Collection batch status */
export type CollectionStatus = 'pending' | 'processing' | 'completed' | 'failed'

/**
 * A payment that can be collected from a stealth address (API response).
 * All amounts are strings for JSON serialization.
 */
export interface CollectablePayment {
  /** Stealth address holding the funds */
  stealthAddress: Address
  /** Amount in wei/smallest unit (string for JSON) */
  amount: WeiString
  /** Token address (null for native MNT/ETH) */
  token: Address | null
  /** Token symbol for display */
  tokenSymbol: string
  /** Source Port ID */
  portId: string
  /** Source Port name */
  portName: string
  /** Receipt hash for reference */
  receiptHash: Bytes32Hex
}

/**
 * Collection preview shown before executing (API response).
 */
export interface CollectionPreview {
  /** Total collectable payments */
  totalPayments: number
  /** Breakdown by token */
  byToken: Array<{
    token: Address | null
    symbol: string
    amount: WeiString
    count: number
  }>
  /** Number of transaction batches required */
  batchCount: number
  /** Estimated gas cost (relayer pays for hackathon) */
  estimatedGas: WeiString
}

/**
 * Collection batch for processing (API response).
 */
export interface CollectionBatch {
  /** Batch ID */
  id: string
  /** Collection ID this batch belongs to */
  collectionId: string
  /** Batch index (1, 2, 3...) */
  batchIndex: number
  /** Payments in this batch */
  payments: CollectablePayment[]
  /** Current status */
  status: CollectionStatus
  /** Transaction hash (once submitted) */
  txHash: Bytes32Hex | null
  /** Error message (if failed) */
  error: string | null
}

/**
 * Full collection operation tracking (API response).
 */
export interface Collection {
  /** Collection ID */
  id: string
  /** User ID initiating collection */
  userId: number
  /** Recipient wallet address */
  recipientAddress: Address
  /** Chain ID */
  chainId: SupportedChainId
  /** Total batches */
  totalBatches: number
  /** Completed batches */
  completedBatches: number
  /** Overall status */
  status: CollectionStatus
  /** Batches */
  batches: CollectionBatch[]
  /** Created timestamp (ISO 8601) */
  createdAt: ISODateString
  /** Completed timestamp (ISO 8601) */
  completedAt: ISODateString | null
}

/**
 * Collection result summary (API response).
 */
export interface CollectionResult {
  /** Collection ID */
  collectionId: string
  /** Whether fully successful */
  success: boolean
  /** Total collected by token */
  collected: Array<{
    token: Address | null
    symbol: string
    amount: WeiString
    count: number
  }>
  /** Transaction hashes */
  txHashes: Bytes32Hex[]
  /** Any errors encountered */
  errors: string[]
}

/**
 * Payment info for the payer flow (API response).
 */
export interface PaymentRequest {
  /** Port to pay */
  portId: Bytes32Hex
  /** Port name for display */
  portName: string
  /** Port's stealth meta-address */
  stealthMetaAddress: StealthMetaAddress
  /** Suggested amount (null = any amount) */
  suggestedAmount: WeiString | null
  /** Currency to pay in */
  currency: Currency
  /** Optional memo from vendor */
  memo: string | null
}

/**
 * Payment result after successful transaction (API response).
 */
export interface PaymentResult {
  /** Generated stealth address */
  stealthAddress: Address
  /** Transaction hash */
  txHash: Bytes32Hex
  /** Receipt hash for verification */
  receiptHash: Bytes32Hex
  /** Amount paid */
  amount: WeiString
  /** Currency paid */
  currency: Currency
}
