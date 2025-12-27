import vine from '@vinejs/vine'

/**
 * Validator for listing receipts with filters
 */
export const listReceiptsValidator = vine.compile(
  vine.object({
    portId: vine.string().uuid().optional(),
    status: vine.enum(['pending', 'confirmed', 'collected', 'failed'] as const).optional(),
    page: vine.number().positive().optional(),
    limit: vine.number().positive().max(100).optional(),
  })
)

/**
 * Validator for getting a single receipt
 */
export const getReceiptValidator = vine.compile(
  vine.object({
    id: vine.string().uuid(),
  })
)
