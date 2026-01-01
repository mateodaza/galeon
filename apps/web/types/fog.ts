/**
 * Type definitions for Fog Mode (Send Privately).
 *
 * Fog wallets are stealth addresses that break sender-recipient correlation.
 * Users pre-fund fog wallets and pay from them later for privacy.
 */

// ============================================================
// Core Types
// ============================================================

/**
 * Privacy level based on hop count, time, and funding source.
 *
 * Multi-hop is ESSENTIAL for privacy:
 * - low: Single hop (entry point)
 * - medium: Multi-hop but self-funded with recent timing
 * - high: Multi-hop with good timing OR externally funded
 */
export type PrivacyLevel = 'low' | 'medium' | 'high'

/** Privacy risk factors for display */
export type PrivacyRisk =
  | 'self-funded' // Funded from connected wallet (links identity)
  | 'single-hop' // No intermediate hop (weak mixing)
  | 'amount-correlation' // Payment close to funding amount
  | 'recent-funding' // Hopped recently - timing correlation risk

/** Funding source identification */
export type FundingSource = 'self' | 'external'

/** Recipient type detection result */
export type RecipientType = 'eoa' | 'stealth' | 'invalid'

/** Fog wallet status */
export type FogWalletStatus = 'unfunded' | 'funded' | 'spent'

// ============================================================
// Storage Types (localStorage)
// ============================================================

/**
 * Fog wallet metadata stored in encrypted localStorage.
 * Private keys are NEVER stored - derived on-demand from masterSignature + fogIndex.
 *
 * Multi-hop structure:
 * - parentFogIndex tracks the chain (A -> B -> recipient)
 * - hopDepth indicates position in chain (0 = entry point, 1+ = intermediate)
 */
export interface FogWalletMetadata {
  /** Unique derivation index for this fog wallet */
  fogIndex: number
  /** User-friendly name */
  name: string
  /** Generated stealth address (funding destination) */
  stealthAddress: `0x${string}`
  /** Stealth meta-address for verification */
  stealthMetaAddress: string
  /** Ephemeral public key used to generate stealthAddress (needed for key derivation) */
  ephemeralPublicKey: string
  /** View tag for efficient scanning */
  viewTag: number
  /** Timestamp when funded (null if unfunded) */
  fundedAt: number | null
  /** How the wallet was funded */
  fundingSource: FundingSource | null
  /** Original funding amount in wei */
  fundingAmount: string | null
  /** Address that funded this wallet (if known) */
  fundingAddress: `0x${string}` | null
  /** Funding transaction hash */
  fundingTxHash: `0x${string}` | null
  /** Timestamp when created */
  createdAt: number

  // === Multi-hop tracking (ESSENTIAL for privacy) ===

  /** Parent fog wallet index if this is an intermediate hop (null = entry point) */
  parentFogIndex: number | null
  /** Depth in hop chain (0 = entry point, 1 = first hop, 2+ = deeper) */
  hopDepth: number
  /** Whether this wallet is designated as final payment source */
  isPaymentWallet: boolean
}

/**
 * Encrypted fog session stored in localStorage.
 */
export interface FogSessionStorage {
  /** Encrypted fog wallet metadata array */
  encrypted: string
  /** AES-GCM nonce (12 bytes, base64) */
  nonce: string
  /** Session expiration timestamp */
  expiresAt: number
  /** Storage format version for migrations */
  version: number
}

// ============================================================
// Runtime Types
// ============================================================

/**
 * Fog wallet with runtime data (balance, privacy indicators).
 * Extended from stored metadata.
 */
export interface FogWallet extends FogWalletMetadata {
  /** Current balance in wei */
  balance: bigint
  /** Formatted balance for display */
  balanceFormatted: string
  /** Privacy level based on hop depth and funding source */
  privacyLevel: PrivacyLevel
  /** Active privacy warnings */
  privacyWarnings: string[]
  /** Privacy risk factors */
  privacyRisks: PrivacyRisk[]
  /** Wallet status */
  status: FogWalletStatus
}

/** Timing privacy status */
export type TimingStatus = 'ready' | 'good' | 'excellent' | 'maximum'

/** Timing recommendation for user */
export interface TimingRecommendation {
  message: string
  canPayNow: boolean
  waitTimeFormatted: string | null
  privacyBoost: string | null
}

/**
 * Privacy indicator data for UI display.
 *
 * Privacy is determined by:
 * 1. Hop depth - ESSENTIAL (must be >= 1 for meaningful privacy)
 * 2. Time separation - IMPORTANT (wait a few hours for best privacy)
 * 3. Funding source - external > self
 * 4. Amount correlation - secondary concern
 */
export interface PrivacyIndicatorData {
  level: PrivacyLevel
  label: string
  description: string
  warnings: string[]
  risks: PrivacyRisk[]
  /** Hop depth in the chain (0 = entry, 1+ = intermediate/payment) */
  hopDepth: number
  /** Whether funded externally */
  isExternallyFunded: boolean
  amountCorrelationRisk: boolean
  /** Timing privacy status */
  timingStatus: TimingStatus
  /** Timing recommendation for user */
  timingRecommendation: TimingRecommendation
}

// ============================================================
// Payment Types
// ============================================================

/**
 * Payment preparation result from prepareEOAPayment or prepareStealthPayment.
 */
export interface FogPaymentParams {
  /** Recipient address (EOA or generated stealth address) */
  recipient: `0x${string}`
  /** Ephemeral public key (null bytes for EOA) */
  ephemeralPublicKey: Uint8Array
  /** View tag for scanning (0 for EOA) */
  viewTag: number
  /** Whether recipient is a stealth address */
  isStealthRecipient: boolean
  /** Receipt hash for verification */
  receiptHash: `0x${string}`
}

/**
 * Fog payment request from UI.
 */
export interface FogPaymentRequest {
  /** Index of fog wallet to pay from */
  fogIndex: number
  /** Recipient input (EOA address or stealth meta-address) */
  recipientInput: string
  /** Payment amount in MNT */
  amount: string
  /** Optional memo */
  memo?: string
}

/**
 * Fog payment result after transaction.
 */
export interface FogPaymentResult {
  /** Transaction hash */
  txHash: `0x${string}`
  /** Recipient address that received payment */
  recipient: `0x${string}`
  /** Amount sent in wei */
  amount: bigint
  /** Privacy level at time of payment */
  privacyLevel: PrivacyLevel
  /** Whether recipient was stealth (full privacy) */
  isStealthRecipient: boolean
}

// ============================================================
// Context Types
// ============================================================

/**
 * Fog context value provided to components.
 */
export interface FogContextValue {
  /** List of fog wallets with balances */
  fogWallets: FogWallet[]
  /** Total balance across all fog wallets */
  totalBalance: bigint
  /** Formatted total balance */
  totalBalanceFormatted: string
  /** Whether session is unlocked */
  hasSession: boolean
  /** Loading state */
  isLoading: boolean
  /** Restoring from storage */
  isRestoring: boolean
  /** Error message */
  error: string | null

  /** Create a new fog wallet (entry point, hopDepth 0) */
  createFogWallet: (name?: string) => Promise<FogWallet>
  /**
   * Create an intermediate wallet from a source wallet.
   * The new wallet will have hopDepth = source.hopDepth + 1.
   * Returns the new wallet - caller is responsible for doing the transfer.
   */
  createIntermediateWallet: (sourceFogIndex: number, name?: string) => Promise<FogWallet>
  /** Mark fog wallet as funded (after transfer completes) */
  markAsFunded: (
    fogIndex: number,
    source: FundingSource,
    amount: bigint,
    txHash: `0x${string}`,
    fundingAddress?: `0x${string}`
  ) => void
  /** Get a fog wallet by index */
  getFogWallet: (fogIndex: number) => FogWallet | undefined
  /** Remove fog wallet from storage */
  removeFogWallet: (fogIndex: number) => void
  /** Refresh balances from blockchain */
  refreshBalances: () => Promise<void>
  /** Clear session and fog data */
  clearSession: () => void
}

// ============================================================
// Scheduled Payment Types
// ============================================================

/**
 * Scheduled payment for timing privacy.
 * Payments can be scheduled to execute after a delay.
 */
export interface ScheduledPayment {
  /** Unique ID for this scheduled payment */
  id: string
  /** Fog wallet index to pay from */
  fogIndex: number
  /** Fog wallet name (for display) */
  fogWalletName: string
  /** Recipient input (EOA or stealth meta-address) */
  recipientInput: string
  /** Payment amount in MNT */
  amount: string
  /** Optional memo */
  memo?: string
  /** When the payment was scheduled */
  scheduledAt: number
  /** When the payment should execute */
  executeAt: number
  /** Status of the scheduled payment */
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled'
  /** Transaction hash (after execution) */
  txHash?: `0x${string}`
  /** Error message (if failed) */
  error?: string
}

/**
 * Scheduled hop for timing privacy.
 * Hops can be scheduled to execute after a delay.
 */
export interface ScheduledHop {
  /** Unique ID for this scheduled hop */
  id: string
  /** Source fog wallet index */
  sourceFogIndex: number
  /** Source fog wallet name (for display) */
  sourceWalletName: string
  /** Target fog wallet index (created when scheduling) */
  targetFogIndex: number
  /** Target fog wallet name */
  targetWalletName: string
  /** Target stealth address */
  targetAddress: `0x${string}`
  /** Amount to transfer */
  amount: string
  /** When the hop was scheduled */
  scheduledAt: number
  /** When the hop should execute */
  executeAt: number
  /** Status of the scheduled hop */
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled'
  /** Transaction hash (after execution) */
  txHash?: `0x${string}`
  /** Error message (if failed) */
  error?: string
}

/**
 * Scheduled payment context value.
 */
export interface ScheduledPaymentContextValue {
  /** List of scheduled payments */
  scheduledPayments: ScheduledPayment[]
  /** List of scheduled hops */
  scheduledHops: ScheduledHop[]
  /** Whether there are pending payments or hops */
  hasPendingPayments: boolean
  hasPendingHops: boolean
  /** Schedule a new payment */
  schedulePayment: (
    fogIndex: number,
    fogWalletName: string,
    recipientInput: string,
    amount: string,
    delayHours: number,
    memo?: string
  ) => Promise<ScheduledPayment>
  /** Schedule a new hop */
  scheduleHop: (
    sourceFogIndex: number,
    sourceWalletName: string,
    targetFogIndex: number,
    targetWalletName: string,
    targetAddress: `0x${string}`,
    amount: string,
    delayHours: number
  ) => Promise<ScheduledHop>
  /** Cancel a scheduled payment */
  cancelPayment: (id: string) => void
  /** Cancel a scheduled hop */
  cancelHop: (id: string) => void
  /** Execute a payment now (manual trigger) */
  executePaymentNow: (id: string) => Promise<void>
  /** Execute a hop now (manual trigger) */
  executeHopNow: (id: string) => Promise<void>
}

// ============================================================
// API Types (Future Backend Integration)
// ============================================================

/**
 * Fog wallet as returned from backend API.
 */
export interface FogWalletResponse {
  id: string
  fogIndex: number
  name: string
  stealthAddress: string
  fundedAt: string | null
  fundingSource: FundingSource | null
  fundingAmount: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Request to create fog wallet on backend.
 */
export interface CreateFogWalletRequest {
  fogIndex: number
  name: string
  stealthAddress: string
  stealthMetaAddress: string
}

/**
 * Request to update fog wallet funding on backend.
 */
export interface UpdateFogFundingRequest {
  fundedAt: string
  fundingSource: FundingSource
  fundingAmount: string
  fundingTxHash: string
}
