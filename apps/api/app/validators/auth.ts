import vine from '@vinejs/vine'

/**
 * Ethereum address regex pattern (0x followed by 40 hex characters)
 */
const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/

/**
 * Validator for requesting a SIWE nonce
 */
export const getNonceValidator = vine.compile(
  vine.object({
    walletAddress: vine.string().regex(ethereumAddressRegex),
    chainId: vine.number().positive().optional(),
  })
)

/**
 * Validator for verifying SIWE signature and authenticating
 */
export const verifySignatureValidator = vine.compile(
  vine.object({
    message: vine.string().minLength(1),
    signature: vine.string().regex(/^0x[a-fA-F0-9]+$/),
  })
)

/**
 * Validator for refreshing JWT token
 * Note: Refresh tokens are opaque DB tokens (rt_<random>), not JWTs
 */
export const refreshTokenValidator = vine.compile(
  vine.object({
    refreshToken: vine.string().minLength(1),
  })
)
