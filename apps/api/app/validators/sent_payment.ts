import vine from '@vinejs/vine'

export const createSentPaymentValidator = vine.compile(
  vine.object({
    txHash: vine.string().regex(/^0x[a-fA-F0-9]{64}$/),
    chainId: vine.number().positive(),
    recipientAddress: vine.string().regex(/^0x[a-fA-F0-9]{40}$/),
    recipientPortName: vine.string().maxLength(255).optional(),
    amount: vine.string().regex(/^\d+$/), // Must be a valid uint256
    currency: vine.string().maxLength(10),
    tokenAddress: vine
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/)
      .nullable()
      .optional(),
    source: vine.enum(['wallet', 'port', 'pool'] as const),
    memo: vine.string().maxLength(500).optional(),
  })
)

export const listSentPaymentsValidator = vine.compile(
  vine.object({
    page: vine.number().positive().optional(),
    limit: vine.number().positive().max(100).optional(),
    source: vine.enum(['wallet', 'port', 'pool'] as const).optional(),
    status: vine.enum(['pending', 'confirmed', 'failed'] as const).optional(),
  })
)

export type CreateSentPaymentInput = Awaited<ReturnType<typeof createSentPaymentValidator.validate>>
