/**
 * User domain types.
 *
 * Users authenticate via SIWE (Sign-In With Ethereum) and can operate
 * in both Vendor (receive) and User (send) modes.
 */

import type { ISODateString, Address } from './common'

/** User modes for different dashboard views */
export type UserMode = 'vendor' | 'user'

/**
 * User entity stored in the database (internal).
 */
export interface User {
  /** Auto-increment primary key */
  id: number
  /** Ethereum wallet address (checksummed) */
  walletAddress: Address
  /** Current dashboard mode preference */
  preferredMode: UserMode
  /** Port counter for derivation index */
  portCount: number
  /** Last login timestamp */
  lastLoginAt: Date
  /** Account creation timestamp */
  createdAt: Date
  /** Last update timestamp */
  updatedAt: Date
}

/**
 * User profile info for frontend (API response).
 */
export interface UserProfile {
  id: number
  walletAddress: Address
  preferredMode: UserMode
  portCount: number
}

/**
 * Session info returned after authentication (API response).
 */
export interface Session {
  /** Access token for API requests */
  token: string
  /** Token expiration timestamp (ISO 8601) */
  expiresAt: ISODateString
  /** User profile */
  user: UserProfile
}
