import type { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import Port from '#models/port'
import Collection from '#models/collection'
import Receipt from '#models/receipt'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare walletAddress: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relationships
  @hasMany(() => Port)
  declare ports: HasMany<typeof Port>

  @hasMany(() => Collection)
  declare collections: HasMany<typeof Collection>

  @hasMany(() => Receipt)
  declare receipts: HasMany<typeof Receipt>

  // Refresh tokens provider for JWT
  static refreshTokens = DbAccessTokensProvider.forModel(User, {
    prefix: 'rt_',
    table: 'jwt_refresh_tokens',
    type: 'jwt_refresh_token',
    tokenSecretLength: 40,
    expiresIn: '7 days', // Refresh token expires after 7 days
  })
}
