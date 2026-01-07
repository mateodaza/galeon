import vine from '@vinejs/vine'

/**
 * Validator for tax summary report with flexible period types
 */
export const taxSummaryValidator = vine.compile(
  vine.object({
    // Period type (required)
    period: vine.enum(['annual', 'quarterly', 'monthly', 'custom'] as const),

    // For annual, quarterly, monthly
    year: vine.number().min(2020).max(2030).optional(),

    // For quarterly (1-4)
    quarter: vine.number().min(1).max(4).optional(),

    // For monthly (1-12)
    month: vine.number().min(1).max(12).optional(),

    // For custom range (ISO 8601 dates: YYYY-MM-DD)
    startDate: vine
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    endDate: vine
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),

    // Optional port filter
    portId: vine.string().uuid().optional(),
  })
)

export type TaxSummaryInput = Awaited<ReturnType<typeof taxSummaryValidator.validate>>
