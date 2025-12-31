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

/**
 * Validator for creating a pending receipt
 * Frontend sends txHash and portId after making on-chain donation
 */
export const createReceiptValidator = vine.compile(
  vine.object({
    transactionHash: vine
      .string()
      .regex(/^0x[a-fA-F0-9]{64}$/)
      .transform((value) => value.toLowerCase()),
    portId: vine.string().uuid(),
    chainId: vine.number().positive(),
  })
)
