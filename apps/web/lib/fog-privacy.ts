/**
 * Privacy calculation utilities for Fog Mode.
 *
 * Privacy is determined by (in order of importance):
 * 1. Hop depth - Multi-hop is ESSENTIAL (must be >= 1 for meaningful privacy)
 * 2. Time separation - Important for timing protection (visible, non-blocking)
 * 3. Funding source - External funding > self-funding
 * 4. Amount correlation - Payment vs funding amount similarity
 *
 * Time separation is IMPORTANT for best privacy but doesn't block payments.
 * Users are nudged: "For best privacy, wait a few hours before paying."
 */

import type {
  PrivacyLevel,
  PrivacyRisk,
  RecipientType,
  FogWalletMetadata,
  PrivacyIndicatorData,
  TimingStatus,
} from '@/types/fog'

// ============================================================
// Constants
// ============================================================

/** Amount correlation threshold (80%) */
const AMOUNT_CORRELATION_THRESHOLD = 0.8

/** Time thresholds for privacy (IMPORTANT for timing protection) */
const TIME_THRESHOLDS = {
  /** Minimum time for "good" timing privacy (2 hours) */
  GOOD: 2 * 60 * 60 * 1000,
  /** Time for "excellent" timing privacy (6 hours) */
  EXCELLENT: 6 * 60 * 60 * 1000,
  /** Time for maximum timing privacy (24 hours) */
  MAXIMUM: 24 * 60 * 60 * 1000,
}

/** Privacy level labels for UI */
const PRIVACY_LABELS: Record<PrivacyLevel, string> = {
  low: 'Low Privacy',
  medium: 'Medium Privacy',
  high: 'High Privacy',
}

/**
 * Privacy level descriptions for tooltips.
 * Multi-hop is essential, time separation is important.
 */
const PRIVACY_DESCRIPTIONS: Record<PrivacyLevel, string> = {
  low: 'Single-hop - add an intermediate hop for privacy',
  medium: 'Multi-hop achieved - wait for better timing protection',
  high: 'Multi-hop with good timing - strong privacy protection',
}

// ============================================================
// Multi-hop Privacy (ESSENTIAL)
// ============================================================

/**
 * Calculate privacy level based on hop depth, time, and funding source.
 *
 * Multi-hop is ESSENTIAL for privacy:
 * - hopDepth = 0: Entry point (no mixing yet) = low privacy
 * - hopDepth >= 1: At least one hop = medium or high based on time + funding
 *
 * Time separation is IMPORTANT:
 * - < 2 hours: Timing correlation possible
 * - 2-6 hours: Good timing privacy
 * - > 6 hours: Excellent timing privacy
 *
 * Funding source:
 * - self: Funded from connected wallet (links identity)
 * - external: Funded from unknown source (no identity link)
 *
 * @param hopDepth - Depth in the hop chain (0 = entry, 1+ = intermediate)
 * @param fundingSource - Whether funded by self or externally
 * @param fundedAt - Timestamp when last hop was funded (for time calculation)
 * @returns Privacy level
 */
export function calculatePrivacyLevel(
  hopDepth: number,
  fundingSource: 'self' | 'external' | null,
  fundedAt?: number | null
): PrivacyLevel {
  // Single-hop (entry point) = always low privacy
  if (hopDepth === 0) {
    return 'low'
  }

  // Multi-hop achieved (hopDepth >= 1)
  // Now consider time and funding source for medium vs high

  // External funding gives high privacy regardless of timing
  if (fundingSource === 'external') {
    return 'high'
  }

  // Self-funded: time matters for privacy level
  if (fundedAt) {
    const timeSinceHop = Date.now() - fundedAt
    if (timeSinceHop >= TIME_THRESHOLDS.EXCELLENT) {
      return 'high' // Good timing protection achieved
    }
  }

  // Multi-hop but self-funded with recent timing = medium
  return 'medium'
}

// ============================================================
// Time-Based Privacy (IMPORTANT)
// ============================================================

/**
 * Get timing privacy status based on time since last hop.
 *
 * @param fundedAt - Timestamp when wallet was funded/hopped
 * @returns Timing status
 */
export function getTimingStatus(fundedAt: number | null): TimingStatus {
  if (fundedAt === null) {
    return 'ready' // Unfunded wallet
  }

  const elapsed = Date.now() - fundedAt

  if (elapsed >= TIME_THRESHOLDS.MAXIMUM) {
    return 'maximum'
  }
  if (elapsed >= TIME_THRESHOLDS.EXCELLENT) {
    return 'excellent'
  }
  if (elapsed >= TIME_THRESHOLDS.GOOD) {
    return 'good'
  }

  return 'ready'
}

/**
 * Get timing recommendation for user.
 *
 * @param fundedAt - Timestamp when wallet was funded/hopped
 * @returns Recommendation message and urgency
 */
export function getTimingRecommendation(fundedAt: number | null): {
  message: string
  canPayNow: boolean
  waitTimeFormatted: string | null
  privacyBoost: string | null
} {
  if (fundedAt === null) {
    return {
      message: 'Fund this wallet first',
      canPayNow: false,
      waitTimeFormatted: null,
      privacyBoost: null,
    }
  }

  const elapsed = Date.now() - fundedAt
  const status = getTimingStatus(fundedAt)

  if (status === 'maximum' || status === 'excellent') {
    return {
      message: 'Excellent timing protection achieved',
      canPayNow: true,
      waitTimeFormatted: null,
      privacyBoost: null,
    }
  }

  if (status === 'good') {
    const remaining = TIME_THRESHOLDS.EXCELLENT - elapsed
    return {
      message: 'Good timing protection. Wait longer for best privacy.',
      canPayNow: true,
      waitTimeFormatted: formatTimeRemaining(remaining),
      privacyBoost: 'Excellent timing',
    }
  }

  // status === 'ready' - just hopped
  const remaining = TIME_THRESHOLDS.GOOD - elapsed
  return {
    message: 'For best privacy, wait a few hours before paying. But you can pay now if urgent.',
    canPayNow: true,
    waitTimeFormatted: formatTimeRemaining(remaining),
    privacyBoost: 'Good timing protection',
  }
}

/**
 * Format remaining time in human-readable format.
 */
function formatTimeRemaining(ms: number): string {
  const hours = Math.ceil(ms / (60 * 60 * 1000))
  if (hours <= 1) {
    const minutes = Math.ceil(ms / (60 * 1000))
    return `${minutes} minute${minutes === 1 ? '' : 's'}`
  }
  return `${hours} hour${hours === 1 ? '' : 's'}`
}

/**
 * Get privacy risks for a fog wallet.
 *
 * @param wallet - Fog wallet metadata
 * @param paymentAmount - Optional payment amount to check correlation
 * @returns Array of privacy risk factors
 */
export function getPrivacyRisks(wallet: FogWalletMetadata, paymentAmount?: bigint): PrivacyRisk[] {
  const risks: PrivacyRisk[] = []

  // Single-hop risk (CRITICAL)
  if (wallet.hopDepth === 0) {
    risks.push('single-hop')
  }

  // Self-funded risk
  if (wallet.fundingSource === 'self') {
    risks.push('self-funded')
  }

  // Amount correlation risk
  if (paymentAmount && wallet.fundingAmount) {
    const fundingBigInt = BigInt(wallet.fundingAmount)
    if (checkAmountCorrelation(paymentAmount, fundingBigInt)) {
      risks.push('amount-correlation')
    }
  }

  // Recent funding/hop risk (IMPORTANT for timing protection)
  if (wallet.fundedAt && Date.now() - wallet.fundedAt < TIME_THRESHOLDS.GOOD) {
    risks.push('recent-funding')
  }

  return risks
}

// ============================================================
// Time Utilities (Secondary)
// ============================================================

/**
 * Get human-readable time since funding.
 *
 * @param fundedAt - Timestamp when wallet was funded
 * @returns Formatted time string (e.g., "2 hours ago", "3 days ago")
 */
export function formatTimeSinceFunding(fundedAt: number | null): string {
  if (fundedAt === null) {
    return 'Not funded'
  }

  const elapsed = Date.now() - fundedAt
  const seconds = Math.floor(elapsed / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days} day${days === 1 ? '' : 's'} ago`
  }
  if (hours > 0) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  }
  return 'Just now'
}

// ============================================================
// Amount Correlation
// ============================================================

/**
 * Check if payment amount correlates with funding amount.
 *
 * High correlation (payment > 80% of funding) weakens privacy
 * because observers can match funding to payment by amount.
 *
 * @param paymentAmount - Amount being paid (wei)
 * @param fundingAmount - Original funding amount (wei, null if unknown)
 * @returns true if amount correlation risk exists
 */
export function checkAmountCorrelation(
  paymentAmount: bigint,
  fundingAmount: bigint | null
): boolean {
  if (fundingAmount === null || fundingAmount === 0n) {
    return false
  }

  // Calculate ratio: payment / funding
  // Use precision factor to avoid bigint division issues
  const precision = 10000n
  const ratio = (paymentAmount * precision) / fundingAmount

  // Check if ratio > 80%
  return ratio > BigInt(Math.floor(AMOUNT_CORRELATION_THRESHOLD * Number(precision)))
}

// ============================================================
// Privacy Warnings
// ============================================================

/** Warning messages for each risk type */
const RISK_WARNINGS: Record<PrivacyRisk, string> = {
  'single-hop': 'Single-hop transaction - add an intermediate wallet for privacy',
  'self-funded': 'Self-funded from connected wallet - links your identity',
  'amount-correlation': 'Payment amount is similar to funding - consider partial payments',
  'recent-funding': 'Recently hopped - wait a few hours for better timing protection',
}

/**
 * Generate privacy warnings for a fog wallet.
 *
 * @param wallet - Fog wallet metadata
 * @param paymentAmount - Optional payment amount to check correlation
 * @returns Array of warning messages
 */
export function getPrivacyWarnings(wallet: FogWalletMetadata, paymentAmount?: bigint): string[] {
  const risks = getPrivacyRisks(wallet, paymentAmount)
  return risks.map((risk) => RISK_WARNINGS[risk])
}

/**
 * Get complete privacy indicator data for UI display.
 *
 * Privacy is determined by:
 * 1. Hop depth - ESSENTIAL (must be >= 1 for meaningful privacy)
 * 2. Time separation - IMPORTANT (wait a few hours for best privacy)
 * 3. Funding source - external > self
 *
 * @param wallet - Fog wallet metadata
 * @param paymentAmount - Optional payment amount to check correlation
 * @returns Privacy indicator data
 */
export function getPrivacyIndicatorData(
  wallet: FogWalletMetadata,
  paymentAmount?: bigint
): PrivacyIndicatorData {
  const level = calculatePrivacyLevel(wallet.hopDepth, wallet.fundingSource, wallet.fundedAt)
  const risks = getPrivacyRisks(wallet, paymentAmount)
  const warnings = risks.map((risk) => RISK_WARNINGS[risk])
  const timingStatus = getTimingStatus(wallet.fundedAt)
  const timingRecommendation = getTimingRecommendation(wallet.fundedAt)

  const amountCorrelationRisk =
    paymentAmount && wallet.fundingAmount
      ? checkAmountCorrelation(paymentAmount, BigInt(wallet.fundingAmount))
      : false

  return {
    level,
    label: PRIVACY_LABELS[level],
    description: PRIVACY_DESCRIPTIONS[level],
    warnings,
    risks,
    hopDepth: wallet.hopDepth,
    isExternallyFunded: wallet.fundingSource === 'external',
    amountCorrelationRisk,
    timingStatus,
    timingRecommendation,
  }
}

// ============================================================
// Recipient Type Detection
// ============================================================

/** Regex for Ethereum address (0x + 40 hex chars) */
const EOA_REGEX = /^0x[0-9a-fA-F]{40}$/

/** Regex for stealth meta-address (st:mnt: or st:eth: + 0x + 132 hex chars) */
const STEALTH_META_REGEX = /^st:(mnt|eth):0x[0-9a-fA-F]{132}$/

/**
 * Detect recipient type from input string.
 *
 * @param input - User input (address or stealth meta-address)
 * @returns Detected recipient type
 */
export function detectRecipientType(input: string): RecipientType {
  const trimmed = input.trim()

  if (EOA_REGEX.test(trimmed)) {
    return 'eoa'
  }

  if (STEALTH_META_REGEX.test(trimmed)) {
    return 'stealth'
  }

  return 'invalid'
}

/**
 * Check if input is a valid recipient (EOA or stealth).
 *
 * @param input - User input
 * @returns true if valid
 */
export function isValidRecipient(input: string): boolean {
  return detectRecipientType(input) !== 'invalid'
}

/**
 * Get privacy message based on recipient type.
 *
 * @param recipientType - Type of recipient
 * @returns Privacy message for UI
 */
export function getRecipientPrivacyMessage(recipientType: RecipientType): string {
  switch (recipientType) {
    case 'eoa':
      return 'Partial privacy: Your identity is hidden, but recipient address is public'
    case 'stealth':
      return 'Full privacy: Both sender and recipient identities are hidden'
    case 'invalid':
      return 'Invalid recipient format'
  }
}

// ============================================================
// Funding Source Detection
// ============================================================

/**
 * Determine if funding came from user's own wallet.
 *
 * @param fundingAddress - Address that funded the fog wallet
 * @param userAddress - User's connected wallet address
 * @returns 'self' if same address, 'external' otherwise
 */
export function detectFundingSource(
  fundingAddress: `0x${string}` | null,
  userAddress: `0x${string}` | undefined
): 'self' | 'external' | null {
  if (!fundingAddress) {
    return null
  }

  if (!userAddress) {
    return 'external'
  }

  return fundingAddress.toLowerCase() === userAddress.toLowerCase() ? 'self' : 'external'
}

// ============================================================
// Legacy Time-Based Privacy (deprecated, kept for reference)
// ============================================================

/**
 * @deprecated Use calculatePrivacyLevel() instead.
 * Time-based privacy is secondary to multi-hop.
 */
export function calculateTimePrivacy(fundedAt: number | null): PrivacyLevel {
  if (fundedAt === null) {
    return 'high'
  }

  const timeSinceFunding = Date.now() - fundedAt
  const SIX_HOURS = 6 * 60 * 60 * 1000
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000

  if (timeSinceFunding < SIX_HOURS) {
    return 'low'
  }

  if (timeSinceFunding < SEVEN_DAYS) {
    return 'medium'
  }

  return 'high'
}
