import vine from '@vinejs/vine'

/**
 * Ethereum address pattern: 0x followed by 40 hex characters
 */
const addressRegex = /^0x[a-fA-F0-9]{40}$/

/**
 * Tx hash pattern: 0x followed by 64 hex characters
 */
const txHashRegex = /^0x[a-fA-F0-9]{64}$/

/**
 * Validator for scheduling a fog payment
 */
export const scheduleFogPaymentValidator = vine.compile(
  vine.object({
    // Fog wallet info
    fogAddress: vine.string().regex(addressRegex),
    fogIndex: vine.number().min(0),

    // Encrypted fog keys (encrypted with backend's pubkey)
    fogKeysEncrypted: vine.string().minLength(1),
    fogKeysNonce: vine.string().minLength(1),

    // Recipient details
    recipientStealthAddress: vine.string().regex(addressRegex),
    recipientEphemeralPubKey: vine.string().minLength(1), // hex-encoded compressed pubkey
    recipientViewTag: vine.number().min(0).max(255),
    receiptHash: vine.string().regex(txHashRegex), // bytes32 hash

    // Payment amount
    amount: vine.string().minLength(1), // bigint as string (wei)
    tokenAddress: vine.string().regex(addressRegex).nullable().optional(),

    // Time bounds
    sendAt: vine.date(),
    expiresAt: vine.date(),

    // Authorization
    userSignature: vine.string().minLength(1),
    authorizationMessage: vine.string().minLength(1),

    // Optional: funding info (for hop chains)
    fundingTxHash: vine.string().regex(txHashRegex).nullable().optional(),
    fundingFrom: vine.string().regex(addressRegex).nullable().optional(),
    fundingAmount: vine.string().nullable().optional(),
    parentFogPaymentId: vine.string().uuid().nullable().optional(),
  })
)

/**
 * Validator for fog payment ID parameter
 */
export const fogPaymentIdValidator = vine.compile(
  vine.object({
    id: vine.string().uuid(),
  })
)

/**
 * Validator for listing fog payments with pagination and filters
 */
export const listFogPaymentsValidator = vine.compile(
  vine.object({
    page: vine.number().positive().optional(),
    limit: vine.number().positive().max(100).optional(),
    status: vine
      .enum(['pending', 'processing', 'executed', 'failed', 'expired', 'cancelled'])
      .optional(),
  })
)

/**
 * Validator for cancelling a fog payment
 */
export const cancelFogPaymentValidator = vine.compile(
  vine.object({
    reason: vine.string().maxLength(500).optional(),
  })
)

/**
 * Validator for updating funding info after user funds the fog wallet
 */
export const updateFundingValidator = vine.compile(
  vine.object({
    fundingTxHash: vine.string().regex(txHashRegex),
    fundingFrom: vine.string().regex(addressRegex),
    fundingAmount: vine.string().minLength(1), // bigint as string (wei)
  })
)
