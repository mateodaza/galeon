import type { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import encryption from '@adonisjs/core/services/encryption'
import User from '#models/user'
import Receipt from '#models/receipt'

export type PortType = 'permanent' | 'recurring' | 'one-time' | 'burner'
export type PortStatus = 'pending' | 'confirmed'

/**
 * VIEWING KEY CUSTODY TRADE-OFF (Hackathon Decision)
 *
 * Current: Viewing keys encrypted with APP_KEY (AES-256-GCM) and stored in database.
 * This enables background scanning without requiring wallet signatures each time.
 *
 * Risk: Server breach + APP_KEY compromise = viewing key exposure.
 * Mitigation: Wallet signature never stored, so attacker needs both to derive spending keys.
 *
 * Production alternatives:
 * - HSM (Hardware Security Module) for key storage
 * - Client-side encryption with key derived from wallet signature (HKDF)
 * - Store viewing keys only in client, require wallet for each scan
 *
 * Note: Spending keys are NEVER stored. They're derived on-demand from wallet signature.
 */

export default class Port extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: number

  @column()
  declare indexerPortId: string | null // bytes32 hex - links to Ponder indexer port records

  @column()
  declare name: string

  @column()
  declare type: PortType

  @column()
  declare stealthMetaAddress: string | null // Nullable for two-step creation flow

  @column()
  declare viewingKeyEncrypted: string | null // Encrypted with APP_KEY, nullable for two-step flow

  @column()
  declare status: PortStatus // pending until verified by indexer

  @column()
  declare txHash: string | null // Transaction hash for on-chain verification

  @column()
  declare chainId: number

  /**
   * Decrypt the viewing key for scanning announcements
   * Only call this when actively scanning - key should not be held in memory
   * Returns null if viewing key not yet set (two-step creation in progress)
   */
  decryptViewingKey(): string | null {
    if (!this.viewingKeyEncrypted) return null
    return encryption.decrypt(this.viewingKeyEncrypted) as string
  }

  /**
   * Encrypt a viewing key before storing
   * Use this when creating a port
   */
  static encryptViewingKey(viewingKey: string): string {
    return encryption.encrypt(viewingKey)
  }

  @column()
  declare active: boolean

  @column()
  declare archived: boolean

  @column()
  declare totalReceived: string // bigint as string

  @column()
  declare totalCollected: string // bigint as string

  @column()
  declare paymentCount: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime()
  declare archivedAt: DateTime | null

  // Relationships
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => Receipt)
  declare receipts: HasMany<typeof Receipt>
}
