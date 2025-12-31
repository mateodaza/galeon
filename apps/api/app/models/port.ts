import type { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Receipt from '#models/receipt'

export type PortType = 'permanent' | 'recurring' | 'one-time' | 'burner'

export default class Port extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: number

  @column()
  declare portId: string // bytes32 hex

  @column()
  declare name: string

  @column()
  declare type: PortType

  @column()
  declare stealthMetaAddress: string

  @column()
  declare viewingKeyEncrypted: string

  @column()
  declare viewingKeyNonce: string // IV for AES-GCM decryption

  @column()
  declare chainId: number

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
