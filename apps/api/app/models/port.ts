import type { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import encryption from '@adonisjs/core/services/encryption'
import User from '#models/user'
import Receipt from '#models/receipt'

export type PortType = 'permanent' | 'recurring' | 'one-time' | 'burner'

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
  declare stealthMetaAddress: string

  @column()
  declare viewingKeyEncrypted: string // Encrypted with APP_KEY

  @column()
  declare chainId: number

  /**
   * Decrypt the viewing key for scanning announcements
   * Only call this when actively scanning - key should not be held in memory
   */
  decryptViewingKey(): string {
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
