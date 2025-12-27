/**
 * Receipt domain types.
 *
 * Receipts are verifiable proofs of payment. The receipt hash is
 * anchored on-chain via the GaleonRegistry contract.
 */

import type { WeiString, Bytes32Hex, Address } from './common'
import type { SupportedChainId } from './chain'

/** Receipt status tracking */
export type ReceiptStatus = 'pending' | 'confirmed' | 'collected' | 'failed'

/** Supported currencies */
export type Currency = 'MNT' | 'ETH' | 'USDT' | 'USDC' | 'USDe'

/**
 * Receipt entity stored in the database (internal).
 *
 * The receiptHash is computed from receipt data and anchored on-chain
 * for verifiable proof of payment.
 */
export interface Receipt {
  /** UUID primary key */
  id: string
  /** keccak256 of receipt data (anchored on-chain) */
  receiptHash: Bytes32Hex
  /** Foreign key to Port that received payment */
  portId: string
  /** Payment amount (wei/smallest unit as string) */
  amount: WeiString
  /** Currency symbol */
  currency: Currency
  /** Token contract address (null for native) */
  tokenAddress: Address | null
  /** Vendor's main wallet address */
  vendorAddress: Address
  /** Payer's wallet address */
  payerAddress: Address
  /** Stealth address that received funds */
  stealthAddress: Address
  /** Optional payment memo */
  memo: string | null
  /** Payment timestamp (Unix seconds) */
  timestamp: number
  /** Transaction hash */
  txHash: Bytes32Hex
  /** Block number */
  blockNumber: number
  /** Chain ID */
  chainId: SupportedChainId
  /** Current status */
  status: ReceiptStatus
  /** Collection transaction hash (if collected) */
  collectionTxHash: Bytes32Hex | null
  /** Creation timestamp */
  createdAt: Date
  /** Last update timestamp */
  updatedAt: Date
}

/**
 * Receipt summary for lists (API response).
 */
export interface ReceiptSummary {
  id: string
  receiptHash: Bytes32Hex
  amount: WeiString
  currency: Currency
  payerAddress: Address
  timestamp: number
  status: ReceiptStatus
  txHash: Bytes32Hex
}

/**
 * Receipt verification result from on-chain data (API response).
 */
export interface ReceiptVerification {
  /** Whether the receipt is verified on-chain */
  verified: boolean
  /** On-chain receipt hash matches computed hash */
  hashMatches: boolean
  /** Amount confirmed on-chain */
  confirmedAmount: WeiString
  /** Payer address from on-chain event */
  confirmedPayer: Address
  /** Block timestamp */
  confirmedTimestamp: number
  /** Explorer URL for the transaction */
  explorerUrl: string
}
