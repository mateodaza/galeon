import vine from '@vinejs/vine'

/**
 * Stealth meta address pattern: st:(eth|mnt):0x{66 hex chars for spending pub}{66 hex chars for viewing pub}
 * Total: st:xxx:0x + 132 hex chars = 139 chars after prefix
 */
const stealthMetaAddressRegex = /^st:(eth|mnt):0x[a-fA-F0-9]{132}$/

/**
 * Validator for creating a new port
 */
export const createPortValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(1).maxLength(100).optional(),
    stealthMetaAddress: vine.string().regex(stealthMetaAddressRegex),
    viewingKeyEncrypted: vine.string().minLength(1), // AES-GCM encrypted viewing key
    viewingKeyNonce: vine.string().minLength(1), // IV for AES-GCM decryption
    chainId: vine.number().positive().optional(), // Defaults to 5000 (Mantle)
  })
)

/**
 * Validator for updating a port
 */
export const updatePortValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(1).maxLength(100).optional(),
    archived: vine.boolean().optional(),
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
