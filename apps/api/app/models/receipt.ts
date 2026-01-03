import type { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Port from '#models/port'
import Collection from '#models/collection'

export type ReceiptStatus = 'pending' | 'confirmed' | 'collected' | 'failed'

export default class Receipt extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare portId: string

  @column()
  declare collectionId: string | null

  @column()
  declare receiptHash: string | null // bytes32 hex - nullable for two-step flow

  @column()
  declare stealthAddress: string | null // nullable for two-step flow

  @column()
  declare ephemeralPubKey: string | null // nullable for two-step flow

  @column()
  declare viewTag: number | null // 0-255 - nullable for two-step flow

  @column()
  declare payerAddress: string | null // nullable for two-step flow

  @column()
  declare amount: string | null // bigint as string - nullable for two-step flow

  @column()
  declare currency: string | null // nullable for two-step flow

  @column()
  declare tokenAddress: string | null

  @column()
  declare memo: string | null

  @column()
  declare txHash: string

  @column()
  declare blockNumber: string | null // bigint as string - nullable for two-step flow

  @column()
  declare chainId: number

  @column()
  declare status: ReceiptStatus

  @column()
  declare verificationAttempts: number

  @column()
  declare verificationError: string | null

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
