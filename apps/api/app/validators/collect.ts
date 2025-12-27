import vine from '@vinejs/vine'

/**
 * Ethereum address regex pattern
 */
const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/

/**
 * Ethereum signature regex pattern (65 bytes = 130 hex chars + 0x prefix)
 */
const signatureRegex = /^0x[a-fA-F0-9]{130}$/

/**
 * Validator for initiating a collection
 */
export const initiateCollectionValidator = vine.compile(
  vine.object({
    portIds: vine.array(vine.string().uuid()).minLength(1).maxLength(50),
    recipientAddress: vine.string().regex(ethereumAddressRegex),
  })
)

/**
 * Validator for executing a collection with spending key signature
 */
export const executeCollectionValidator = vine.compile(
  vine.object({
    collectionId: vine.string().uuid(),
    receiptIds: vine.array(vine.string().uuid()).minLength(1).maxLength(100),
    spendingSignature: vine.string().regex(signatureRegex),
  })
)

/**
 * Validator for getting collection status
 */
export const getCollectionValidator = vine.compile(
  vine.object({
    id: vine.string().uuid(),
  })
)

/**
 * Validator for listing collections with pagination
 */
export const listCollectionsValidator = vine.compile(
  vine.object({
    page: vine.number().positive().optional(),
    limit: vine.number().positive().max(100).optional(),
    status: vine.enum(['pending', 'processing', 'completed', 'failed'] as const).optional(),
  })
)
