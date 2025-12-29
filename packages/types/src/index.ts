/**
 * @galeon/types
 *
 * Shared domain types for Galeon - private payments using
 * EIP-5564 stealth addresses.
 *
 * @example
 * ```ts
 * import type { Port, Receipt, User } from '@galeon/types'
 * import type { CreatePortRequest, AuthResponse } from '@galeon/types'
 * ```
 */

// Common primitives
export * from './common'

// Core types
export * from './port'
export * from './user'
export * from './receipt'
export * from './payment'
export * from './chain'

// API types
export * from './api'
