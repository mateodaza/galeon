/**
 * API request/response types.
 *
 * These types define the contract between frontend and backend.
 * All types here are JSON-serializable (no Date, no bigint).
 */

import type { Address, WeiString, Bytes32Hex, CompressedPublicKeyHex } from './common'
import type { PortType, PortSummary, PortWithPending } from './port'
import type { UserProfile, Session } from './user'
import type { ReceiptSummary, ReceiptVerification, Receipt, Currency } from './receipt'
import type { CollectionPreview, CollectionResult, PaymentRequest, PaymentResult } from './payment'

// ============ Auth API ============

/** Request nonce for SIWE */
export interface NonceRequest {
  walletAddress: Address
}

/** Nonce response */
export interface NonceResponse {
  nonce: string
  message: string
}

/** Verify SIWE signature */
export interface VerifyRequest {
  walletAddress: Address
  message: string
  signature: Bytes32Hex
}

/** Auth response with session */
export interface AuthResponse {
  session: Session
}

// ============ Port API ============

/** Create a new Port */
export interface CreatePortRequest {
  name: string
  type: PortType
}

/** Port creation response */
export interface CreatePortResponse {
  port: PortSummary
  /** Signature message for on-chain registration */
  registrationMessage: string
}

/** List ports response */
export interface ListPortsResponse {
  ports: PortSummary[]
}

/** List ports with pending payments (for collection) */
export interface ListPortsWithPendingResponse {
  ports: PortWithPending[]
  totalPending: WeiString
  totalPendingCount: number
}

/** Archive port request */
export interface ArchivePortRequest {
  portId: string
}

// ============ Receipt API ============

/** List receipts query params */
export interface ListReceiptsQuery {
  portId?: string
  status?: string
  limit?: number
  offset?: number
}

/** List receipts response */
export interface ListReceiptsResponse {
  receipts: ReceiptSummary[]
  total: number
}

/** Get receipt details response */
export interface GetReceiptResponse {
  receipt: Receipt
}

/** Verify receipt response */
export interface VerifyReceiptResponse {
  receipt: ReceiptSummary
  verification: ReceiptVerification
}

// ============ Payment API ============

/** Get payment info for a Port (public, no auth) */
export interface GetPaymentInfoResponse {
  paymentRequest: PaymentRequest
}

/**
 * Create payment (called after on-chain tx).
 *
 * Note: ephemeralPublicKey is hex-encoded 33-byte compressed secp256k1 public key.
 */
export interface CreatePaymentRequest {
  portId: Bytes32Hex
  stealthAddress: Address
  /** Hex-encoded 33-byte compressed ephemeral public key */
  ephemeralPublicKey: CompressedPublicKeyHex
  viewTag: number
  amount: WeiString
  currency: Currency
  tokenAddress: Address | null
  txHash: Bytes32Hex
  memo: string | null
}

/** Payment creation response */
export interface CreatePaymentResponse {
  result: PaymentResult
}

// ============ Collection API ============

/** Preview collection for selected ports */
export interface PreviewCollectionRequest {
  portIds: string[]
}

/** Collection preview response */
export interface PreviewCollectionResponse {
  preview: CollectionPreview
}

/** Execute collection */
export interface ExecuteCollectionRequest {
  portIds: string[]
  recipientAddress: Address
  /** Spending key signature for deriving stealth private keys */
  spendingSignature: Bytes32Hex
}

/** Collection execution response */
export interface ExecuteCollectionResponse {
  collectionId: string
  status: 'started' | 'queued'
}

/** Get collection status */
export interface GetCollectionStatusResponse {
  collectionId: string
  status: string
  progress: {
    completed: number
    total: number
  }
  result: CollectionResult | null
}

// ============ Dashboard API ============

/** Dashboard stats response (Vendor mode) */
export interface VendorDashboardResponse {
  user: UserProfile
  /** Total income across all Ports */
  totalIncome: WeiString
  /** Income this month */
  monthlyIncome: WeiString
  /** Number of payments this month */
  monthlyPayments: number
  /** Active Ports count */
  activePorts: number
  /** Pending collections */
  pendingCollections: {
    count: number
    amount: WeiString
  }
  /** Recent receipts */
  recentReceipts: ReceiptSummary[]
}

/** Dashboard stats response (User mode) */
export interface UserDashboardResponse {
  user: UserProfile
  /** Total spending */
  totalSpent: WeiString
  /** Spending this month */
  monthlySpent: WeiString
  /** Number of payments this month */
  monthlyPayments: number
  /** Recent payments */
  recentPayments: ReceiptSummary[]
}

// ============ Generic API Types ============

/** Standard error response */
export interface ApiError {
  error: string
  message: string
  code?: string
  details?: Record<string, unknown>
}

/** Pagination params */
export interface PaginationParams {
  limit?: number
  offset?: number
}

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}
