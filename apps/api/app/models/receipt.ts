import type { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Port from '#models/port'
import Collection from '#models/collection'

export type ReceiptStatus = 'pending' | 'confirmed' | 'collected'

export default class Receipt extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare portId: string

  @column()
  declare collectionId: string | null

  @column()
  declare receiptHash: string // bytes32 hex

  @column()
  declare stealthAddress: string

  @column()
  declare ephemeralPubKey: string // hex-encoded, needed to derive stealth private key

  @column()
  declare viewTag: number // 0-255, fast scan optimization

  @column()
  declare payerAddress: string

  @column()
  declare amount: string // bigint as string

  @column()
  declare currency: string

  @column()
  declare tokenAddress: string | null

  @column()
  declare memo: string | null

  @column()
  declare txHash: string

  @column()
  declare blockNumber: string // bigint as string

  @column()
  declare chainId: number

  @column()
  declare status: ReceiptStatus

  @column.dateTime()
  declare collectedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relationships
  @belongsTo(() => Port)
  declare port: BelongsTo<typeof Port>

  @belongsTo(() => Collection)
  declare collection: BelongsTo<typeof Collection>
}
