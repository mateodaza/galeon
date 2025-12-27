import vine from '@vinejs/vine'

/**
 * Ethereum address regex pattern
 */
const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/

/**
 * Transaction hash regex pattern (0x + 64 hex chars)
 */
const txHashRegex = /^0x[a-fA-F0-9]{64}$/

/**
 * Compressed public key regex (0x + 66 hex chars for 33 bytes)
 */
const compressedPubKeyRegex = /^0x[a-fA-F0-9]{66}$/

/**
 * Validator for Alchemy webhook payload (ERC-5564 Announcement event)
 */
export const alchemyWebhookValidator = vine.compile(
  vine.object({
    webhookId: vine.string(),
    id: vine.string(),
    createdAt: vine.string(),
    type: vine.string(),
    event: vine.object({
      network: vine.string(),
      activity: vine.array(
        vine.object({
          blockNum: vine.string(),
          hash: vine.string().regex(txHashRegex),
          fromAddress: vine.string().regex(ethereumAddressRegex),
          toAddress: vine.string().regex(ethereumAddressRegex),
          value: vine.number().optional(),
          asset: vine.string(),
          category: vine.string(),
          rawContract: vine
            .object({
              rawValue: vine.string().optional(),
              address: vine.string().regex(ethereumAddressRegex).optional(),
              decimals: vine.number().optional(),
            })
            .optional(),
          log: vine
            .object({
              address: vine.string().regex(ethereumAddressRegex),
              topics: vine.array(vine.string()),
              data: vine.string(),
              blockNumber: vine.string(),
              transactionHash: vine.string().regex(txHashRegex),
              transactionIndex: vine.string(),
              blockHash: vine.string(),
              logIndex: vine.string(),
              removed: vine.boolean(),
            })
            .optional(),
        })
      ),
    }),
  })
)

/**
 * Validator for manual announcement submission (for testing/recovery)
 */
export const manualAnnouncementValidator = vine.compile(
  vine.object({
    schemeId: vine.number().min(0).max(255),
    stealthAddress: vine.string().regex(ethereumAddressRegex),
    ephemeralPubKey: vine.string().regex(compressedPubKeyRegex),
    viewTag: vine.number().min(0).max(255),
    txHash: vine.string().regex(txHashRegex),
    blockNumber: vine.number().positive(),
    amount: vine.string().minLength(1),
    tokenAddress: vine.string().regex(ethereumAddressRegex).optional(),
  })
)
