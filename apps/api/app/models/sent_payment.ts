import type { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

/**
 * Payment source indicates where the funds came from
 * - wallet: Direct payment from connected wallet (Direct Pay)
 * - port: Payment from collected stealth funds (Stealth Pay)
 * - pool: Payment from privacy pool with ZK proof (Private Send)
 */
export type PaymentSource = 'wallet' | 'port' | 'pool'

export type SentPaymentStatus = 'pending' | 'confirmed' | 'failed'

/**
 * SentPayment tracks outgoing payments made by users.
 * Used for payment history and tax compliance reporting.
 */
export default class SentPayment extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: number

  @column()
  declare txHash: string

  @column()
  declare chainId: number

  @column()
  declare recipientAddress: string // The stealth address paid to

  @column()
  declare recipientPortName: string | null // Port name if paying to a port

  @column()
  declare amount: string // bigint as string

  @column()
  declare currency: string // MNT, ETH, USDC, etc.

  @column()
  declare tokenAddress: string | null // null for native token

  @column()
  declare source: PaymentSource // wallet, port, or pool

  @column()
  declare memo: string | null

  @column()
  declare status: SentPaymentStatus

  @column()
  declare blockNumber: string | null

  @column()
  declare verificationAttempts: number

  @column()
  declare verificationError: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relationships
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
