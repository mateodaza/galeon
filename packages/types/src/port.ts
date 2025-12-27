/**
 * Port domain types.
 *
 * A Port is Galeon's core privacy primitive - a payment endpoint with
 * its own unique stealth meta-address. Each Port provides cryptographic
 * isolation: if one Port's viewing key is compromised, other Ports remain
 * completely private.
 */

import type { WeiString, Bytes32Hex, StealthMetaAddress } from './common'

/** Port types for different use cases */
export type PortType = 'permanent' | 'recurring' | 'one-time' | 'burner'

/** Port status */
export type PortStatus = 'active' | 'archived'

/**
 * Port entity stored in the database (internal).
 */
export interface Port {
  /** UUID primary key */
  id: string
  /** Foreign key to User */
  ownerId: number
  /** On-chain identifier (keccak256 of name + random) */
  portId: Bytes32Hex
  /** User-defined label */
  name: string
  /** Port type for UX categorization */
  type: PortType
  /** Public stealth meta-address (spending + viewing pubkeys) */
  stealthMetaAddress: StealthMetaAddress
  /** Current status */
  status: PortStatus
  /** Total native currency received (wei as string) */
  totalReceived: WeiString
  /** Number of payments received */
  paymentCount: number
  /** Creation timestamp */
  createdAt: Date
  /** Archive timestamp (null if active) */
  archivedAt: Date | null
}

/**
 * Minimal Port info for lists and summaries (API response).
 */
export interface PortSummary {
  id: string
  name: string
  type: PortType
  status: PortStatus
  stealthMetaAddress: StealthMetaAddress
  totalReceived: WeiString
  paymentCount: number
}

/**
 * Port with pending payment info for collection UI (API response).
 */
export interface PortWithPending extends PortSummary {
  /** Pending payments waiting to be collected */
  pendingPayments: number
  /** Total pending amount (wei as string) */
  pendingAmount: WeiString
}
