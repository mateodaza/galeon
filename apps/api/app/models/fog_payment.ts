/**
 * @deprecated This model is deprecated. Fog wallets have been replaced by Privacy Pool.
 * See docs/FOG-SHIPWRECK-PLAN.md for the current ZK-based architecture.
 *
 * This file is kept for reference but is not used in the current implementation.
 */

import type { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export type FogPaymentStatus =
  | 'pending'
  | 'processing'
  | 'executed'
  | 'failed'
  | 'expired'
  | 'cancelled'

export default class FogPayment extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: number

  // Fog wallet info
  @column()
  declare fogAddress: string

  @column()
  declare fogIndex: number

  // Funding info (for Shipwreck compliance reports)
  @column()
  declare fundingTxHash: string | null // tx where user funded the fog wallet

  @column()
  declare fundingFrom: string | null // user's main wallet address

  @column()
  declare fundingAmount: string | null // amount funded (wei)

  @column.dateTime()
  declare fundedAt: DateTime | null // when fog wallet was funded

  // Hop chain - if funded from another fog wallet
  @column()
  declare parentFogPaymentId: string | null

  // Encrypted fog keys (cleared after execution)
  @column()
  declare fogKeysEncrypted: string

  @column()
  declare fogKeysNonce: string

  // Recipient details
  @column()
  declare recipientStealthAddress: string

  @column()
  declare recipientEphemeralPubKey: string

  @column()
  declare recipientViewTag: number

  @column()
  declare receiptHash: string

  // Payment amount
  @column()
  declare amount: string // bigint as string (wei)

  @column()
  declare tokenAddress: string | null

  // Time bounds
  @column.dateTime()
  declare sendAt: DateTime

  @column.dateTime()
  declare expiresAt: DateTime

  // Authorization
  @column()
  declare userSignature: string

  @column()
  declare authorizationMessage: string

  // Execution status
  @column()
  declare status: FogPaymentStatus

  @column()
  declare txHash: string | null

  @column.dateTime()
  declare executedAt: DateTime | null

  @column()
  declare errorMessage: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relationships
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  // Self-referential relationship for hop chain tracing
  @belongsTo(() => FogPayment, { foreignKey: 'parentFogPaymentId' })
  declare parentFogPayment: BelongsTo<typeof FogPayment>

  @hasMany(() => FogPayment, { foreignKey: 'parentFogPaymentId' })
  declare childFogPayments: HasMany<typeof FogPayment>
}
