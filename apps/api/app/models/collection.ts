import type { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Receipt from '#models/receipt'

export type CollectionStatus = 'pending' | 'processing' | 'completed' | 'failed'

export default class Collection extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: number

  @column()
  declare recipientWallet: string

  @column()
  declare status: CollectionStatus

  @column()
  declare totalReceipts: number

  @column()
  declare processedReceipts: number

  @column()
  declare totalAmount: string // bigint as string (wei)

  @column()
  declare tokenAmounts: Record<string, string> // { tokenAddress: amount }

  @column()
  declare txHash: string | null

  @column()
  declare errorMessage: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime()
  declare completedAt: DateTime | null

  // Relationships
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => Receipt)
  declare receipts: HasMany<typeof Receipt>
}
