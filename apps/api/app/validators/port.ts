import vine from '@vinejs/vine'

/**
 * Stealth meta address pattern: st:(eth|mnt):0x{66 hex chars for spending pub}{66 hex chars for viewing pub}
 * Total: st:xxx:0x + 132 hex chars = 139 chars after prefix
 */
const stealthMetaAddressRegex = /^st:(eth|mnt):0x[a-fA-F0-9]{132}$/

/**
 * Validator for creating a new port (step 1 of two-step flow)
 * Only name and chainId required - stealth keys added via PATCH after ID is known
 */
export const createPortValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(1).maxLength(100).optional(),
    chainId: vine.number().positive().optional(), // Defaults to 5000 (Mantle)
  })
)

/**
 * Validator for updating a port (includes step 2 of creation: adding stealth keys)
 */
export const updatePortValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(1).maxLength(100).optional(),
    archived: vine.boolean().optional(),
    txHash: vine
      .string()
      .regex(/^0x[a-fA-F0-9]{64}$/)
      .optional(), // Transaction hash (32 bytes)
    status: vine.enum(['pending', 'confirmed']).optional(),
    indexerPortId: vine
      .string()
      .regex(/^0x[a-fA-F0-9]{64}$/)
      .optional(), // On-chain portId (keccak256 hash)
    stealthMetaAddress: vine.string().regex(stealthMetaAddressRegex).optional(), // Step 2: add stealth keys
    viewingKey: vine
      .string()
      .regex(/^0x[a-fA-F0-9]{64}$/)
      .optional(), // Step 2: 32-byte private key as hex
  })
)

/**
 * Validator for port ID parameter
 */
export const portIdValidator = vine.compile(
  vine.object({
    id: vine.string().uuid(),
  })
)

/**
 * Validator for listing ports with pagination
 */
export const listPortsValidator = vine.compile(
  vine.object({
    page: vine.number().positive().optional(),
    limit: vine.number().positive().max(100).optional(),
    includeArchived: vine.boolean().optional(),
  })
)
