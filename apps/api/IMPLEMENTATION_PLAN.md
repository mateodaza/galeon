# Galeon API - Implementation Plan

> AdonisJS 6 Backend Implementation
> Based on: galeon-hackathon-plan.md + architecture.md
> Last updated: 2025-12-27

## Overview

This document outlines the complete file structure, models, controllers, middleware, services, and jobs for the Galeon API backend.

**Authentication:** Stateless JWT via `@maximemrf/adonisjs-jwt` + SIWE (Sign-In With Ethereum)

---

## File Structure

```
apps/api/
├── app/
│   ├── controllers/
│   │   ├── auth_controller.ts         # SIWE + JWT authentication
│   │   ├── ports_controller.ts        # Port CRUD operations
│   │   ├── receipts_controller.ts     # Receipt queries + public verification
│   │   ├── scans_controller.ts        # Scan for claimable payments
│   │   ├── collections_controller.ts  # Collection CRUD
│   │   └── webhooks_controller.ts     # Ponder webhook receiver
│   │
│   ├── models/
│   │   ├── user.ts                    # User model (JWT, no DB tokens)
│   │   ├── port.ts                    # Port model (payment endpoints)
│   │   ├── receipt.ts                 # Receipt model (payments)
│   │   └── collection.ts              # Collection model (collection batches)
│   │
│   ├── middleware/
│   │   ├── auth_middleware.ts         # JWT authentication
│   │   ├── rate_limit_middleware.ts   # Collection rate limiting
│   │   └── silent_auth_middleware.ts  # Optional auth for public routes
│   │
│   ├── services/
│   │   ├── siwe_service.ts            # SIWE message generation/verification
│   │   ├── chain_service.ts           # Chain configuration from env
│   │   ├── stealth_service.ts         # Wrapper for @galeon/stealth
│   │   ├── collection_service.ts      # Collection execution logic
│   │   └── relayer_service.ts         # Transaction signing/sending
│   │
│   ├── validators/
│   │   ├── auth_validator.ts          # Auth request validation
│   │   ├── port_validator.ts          # Port CRUD validation
│   │   └── collect_validator.ts       # Collection validation
│   │
│   ├── jobs/
│   │   ├── process_payment.ts         # Process incoming payment
│   │   ├── scan_port.ts               # Scan port for payments
│   │   ├── reconcile_payments.ts      # Catch missed webhooks
│   │   └── monitor_relayer.ts         # Monitor relayer balance
│   │
│   └── exceptions/
│       └── handler.ts                 # Global exception handler
│
├── config/
│   ├── app.ts                         # App configuration
│   ├── database.ts                    # PostgreSQL configuration
│   ├── redis.ts                       # Redis configuration
│   ├── auth.ts                        # JWT guard configuration
│   ├── transmit.ts                    # SSE configuration
│   └── jobs.ts                        # BullMQ jobs configuration
│
├── database/
│   └── migrations/
│       ├── 0001_create_users_table.ts
│       ├── 0002_create_ports_table.ts
│       ├── 0003_create_receipts_table.ts
│       ├── 0004_create_collections_table.ts
│       └── 0005_create_settings_table.ts
│
├── start/
│   ├── env.ts                         # Environment validation
│   ├── kernel.ts                      # Middleware registration
│   ├── routes.ts                      # Route definitions
│   └── transmit.ts                    # SSE channel authorization
│
├── providers/
│   └── app_provider.ts                # Application provider
│
├── .env                               # Environment variables
├── .env.example                       # Environment template
└── package.json
```

---

## Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "@maximemrf/adonisjs-jwt": "^3.0.0"
  }
}
```

Install:

```bash
pnpm add @maximemrf/adonisjs-jwt
```

---

## Auth Configuration (JWT Guard)

### config/auth.ts

```typescript
import { defineConfig } from '@adonisjs/auth'
import { sessionUserProvider } from '@adonisjs/auth/session'
import { jwtGuard } from '@maximemrf/adonisjs-jwt/jwt_config'
import env from '#start/env'

const userProvider = sessionUserProvider({
  model: () => import('#models/user'),
})

const authConfig = defineConfig({
  default: 'jwt',
  guards: {
    jwt: jwtGuard({
      provider: userProvider,
      tokenExpiresIn: '7d',
      useCookies: false,
      secret: env.get('APP_KEY'),
    }),
  },
})

export default authConfig

declare module '@adonisjs/auth/types' {
  export interface Authenticators extends InferAuthenticators<typeof authConfig> {}
}
```

---

## Chain Configuration (Environment-Based)

### app/services/chain_service.ts

```typescript
import env from '#start/env'

export interface ChainConfig {
  chainId: number
  name: string
  rpcUrl: string
  explorer: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
}

// Supported chains
const CHAINS: Record<number, ChainConfig> = {
  // Mantle Sepolia (Testnet)
  5003: {
    chainId: 5003,
    name: 'Mantle Sepolia',
    rpcUrl: 'https://rpc.sepolia.mantle.xyz',
    explorer: 'https://sepolia.mantlescan.xyz',
    nativeCurrency: { name: 'Mantle', symbol: 'MNT', decimals: 18 },
  },
  // Mantle Mainnet
  5000: {
    chainId: 5000,
    name: 'Mantle',
    rpcUrl: 'https://rpc.mantle.xyz',
    explorer: 'https://mantlescan.xyz',
    nativeCurrency: { name: 'Mantle', symbol: 'MNT', decimals: 18 },
  },
}

// Allowed chain IDs from environment
const ALLOWED_CHAIN_IDS = env
  .get('ALLOWED_CHAIN_IDS', '5003,5000')
  .split(',')
  .map((id) => parseInt(id.trim(), 10))
  .filter((id) => !isNaN(id))

// Default chain ID from environment
const DEFAULT_CHAIN_ID = env.get('CHAIN_ID', 5003)

export default class ChainService {
  /**
   * Get the default chain configuration
   */
  static getDefaultChain(): ChainConfig {
    const config = CHAINS[DEFAULT_CHAIN_ID]
    if (!config) {
      throw new Error(`Default chain ${DEFAULT_CHAIN_ID} not configured`)
    }
    return config
  }

  /**
   * Get chain configuration by ID
   */
  static getChain(chainId: number): ChainConfig {
    const config = CHAINS[chainId]
    if (!config) {
      throw new Error(`Chain ${chainId} not supported`)
    }
    return config
  }

  /**
   * Check if a chain ID is allowed
   */
  static isAllowedChain(chainId: number): boolean {
    return ALLOWED_CHAIN_IDS.includes(chainId)
  }

  /**
   * Get all allowed chain IDs
   */
  static getAllowedChainIds(): number[] {
    return ALLOWED_CHAIN_IDS
  }

  /**
   * Get the default chain ID
   */
  static getDefaultChainId(): number {
    return DEFAULT_CHAIN_ID
  }
}
```

---

## Database Migrations

### 0001_create_users_table.ts

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('wallet_address', 42).notNullable().unique()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

### 0002_create_ports_table.ts

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'ports'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.string('port_id', 66).notNullable().unique() // bytes32 hex
      table.string('name', 255).notNullable()
      table.enum('type', ['permanent', 'recurring', 'one-time', 'burner']).notNullable()
      table.text('stealth_meta_address').notNullable()
      table.text('viewing_key_encrypted').notNullable()
      table.boolean('active').notNullable().defaultTo(true)
      table.boolean('archived').notNullable().defaultTo(false)
      table.decimal('total_received', 78, 0).notNullable().defaultTo(0) // wei
      table.decimal('total_collected', 78, 0).notNullable().defaultTo(0) // wei
      table.integer('payment_count').notNullable().defaultTo(0)
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
      table.timestamp('archived_at', { useTz: true }).nullable()

      table.index(['user_id', 'active'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

### 0003_create_collections_table.ts

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'collections'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.string('recipient_wallet', 42).notNullable()
      table
        .enum('status', ['pending', 'processing', 'completed', 'failed'])
        .notNullable()
        .defaultTo('pending')
      table.integer('total_receipts').notNullable()
      table.integer('processed_receipts').notNullable().defaultTo(0)
      table.decimal('total_amount', 78, 0).notNullable().defaultTo(0) // wei
      table.jsonb('token_amounts').notNullable().defaultTo('{}') // { tokenAddress: amount }
      table.string('tx_hash', 66).nullable() // final collection tx
      table.text('error_message').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
      table.timestamp('completed_at', { useTz: true }).nullable()

      table.index(['user_id', 'status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

### 0004_create_receipts_table.ts

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'receipts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('port_id').notNullable().references('id').inTable('ports').onDelete('CASCADE')
      table
        .uuid('collection_id')
        .nullable()
        .references('id')
        .inTable('collections')
        .onDelete('SET NULL')
      table.string('receipt_hash', 66).notNullable().unique() // bytes32 hex
      table.string('stealth_address', 42).notNullable()
      table.string('payer_address', 42).notNullable()
      table.decimal('amount', 78, 0).notNullable() // wei
      table.string('currency', 10).notNullable() // MNT, ETH, USDC, etc.
      table.string('token_address', 42).nullable() // null for native
      table.text('memo').nullable()
      table.string('tx_hash', 66).notNullable()
      table.bigInteger('block_number').notNullable()
      table.integer('chain_id').notNullable()
      table.enum('status', ['pending', 'confirmed', 'collected']).notNullable().defaultTo('pending')
      table.timestamp('collected_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.index(['port_id', 'status'])
      table.index(['collection_id'])
      table.index(['stealth_address'])
      table.index(['tx_hash'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

### 0005_create_settings_table.ts

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'settings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('key', 255).notNullable().unique()
      table.text('value').notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

---

## Models

### app/models/user.ts

```typescript
import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Port from '#models/port'
import Collection from '#models/collection'

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
}
```

### app/models/port.ts

```typescript
import { DateTime } from 'luxon'
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
```

### app/models/receipt.ts

```typescript
import { DateTime } from 'luxon'
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
```

### app/models/collection.ts

```typescript
import { DateTime } from 'luxon'
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
```

---

## Validators

### app/validators/auth_validator.ts

```typescript
import vine from '@vinejs/vine'

export const nonceValidator = vine.compile(
  vine.object({
    walletAddress: vine.string().regex(/^0x[a-fA-F0-9]{40}$/),
    chainId: vine.number().optional(), // Optional, defaults to env CHAIN_ID
  })
)

export const verifyValidator = vine.compile(
  vine.object({
    message: vine.string().minLength(1),
    signature: vine.string().regex(/^0x[a-fA-F0-9]+$/),
  })
)
```

### app/validators/port_validator.ts

```typescript
import vine from '@vinejs/vine'

export const createPortValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(1).maxLength(255),
    type: vine.enum(['permanent', 'recurring', 'one-time', 'burner']),
    viewingKeyEncrypted: vine.string().minLength(1),
    stealthMetaAddress: vine.string().regex(/^st:eth:0x[a-fA-F0-9]{132}$/),
    portId: vine.string().regex(/^0x[a-fA-F0-9]{64}$/),
  })
)

export const updatePortValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(1).maxLength(255).optional(),
    active: vine.boolean().optional(),
  })
)
```

### app/validators/collect_validator.ts

```typescript
import vine from '@vinejs/vine'

export const scanValidator = vine.compile(
  vine.object({
    portIds: vine.array(vine.string().uuid()).minLength(1).maxLength(50),
  })
)

export const executeValidator = vine.compile(
  vine.object({
    receiptIds: vine.array(vine.string().uuid()).minLength(1).maxLength(50),
    recipientWallet: vine.string().regex(/^0x[a-fA-F0-9]{40}$/),
    signature: vine.string().regex(/^0x[a-fA-F0-9]+$/), // Spending key derivation signature
  })
)
```

---

## Middleware

### app/middleware/auth_middleware.ts

```typescript
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'

export default class AuthMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { guards?: (keyof Authenticators)[] } = {}
  ) {
    await ctx.auth.authenticateUsing(options.guards || ['jwt'])
    return next()
  }
}
```

### app/middleware/rate_limit_middleware.ts

```typescript
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import redis from '@adonisjs/redis/services/main'

const RATE_LIMITS = {
  collectionsPerDay: 5,
  collectionsPerHour: 2,
}

export default class RateLimitMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user!
    const now = new Date()
    const dayKey = `collections:daily:${user.id}:${now.toISOString().slice(0, 10)}`
    const hourKey = `collections:hourly:${user.id}:${now.toISOString().slice(0, 13)}`

    // Check daily limit
    const dailyCount = await redis.incr(dayKey)
    if (dailyCount === 1) {
      await redis.expire(dayKey, 86400)
    }
    if (dailyCount > RATE_LIMITS.collectionsPerDay) {
      return ctx.response.tooManyRequests({
        error: 'Daily collection limit reached',
        limit: RATE_LIMITS.collectionsPerDay,
      })
    }

    // Check hourly limit
    const hourlyCount = await redis.incr(hourKey)
    if (hourlyCount === 1) {
      await redis.expire(hourKey, 3600)
    }
    if (hourlyCount > RATE_LIMITS.collectionsPerHour) {
      return ctx.response.tooManyRequests({
        error: 'Hourly collection limit reached',
        limit: RATE_LIMITS.collectionsPerHour,
      })
    }

    return next()
  }
}
```

### app/middleware/silent_auth_middleware.ts

```typescript
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class SilentAuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    await ctx.auth.check()
    return next()
  }
}
```

---

## Services

### app/services/siwe_service.ts

```typescript
import { SiweMessage } from 'siwe'
import redis from '@adonisjs/redis/services/main'
import { randomUUID } from 'node:crypto'
import env from '#start/env'
import ChainService from '#services/chain_service'

const NONCE_TTL = 300 // 5 minutes
const ISSUANCE_WINDOW = 5 * 60 * 1000 // 5 minutes in ms

export default class SiweService {
  /**
   * Get SIWE domain from environment
   */
  private static getDomain(): string {
    return env.get('SIWE_DOMAIN', 'galeon.xyz')
  }

  /**
   * Get SIWE URI from environment
   */
  private static getUri(): string {
    return env.get('SIWE_URI', 'https://api.galeon.xyz')
  }

  /**
   * Generate a SIWE nonce and message
   * @param walletAddress - The wallet address requesting auth
   * @param chainId - Optional chain ID (defaults to env CHAIN_ID)
   */
  static async generateNonce(
    walletAddress: string,
    chainId?: number
  ): Promise<{ nonce: string; message: string; chainId: number }> {
    const nonce = randomUUID()

    // Use provided chainId or default from env
    const selectedChainId = chainId ?? ChainService.getDefaultChainId()

    // Validate chain is allowed
    if (!ChainService.isAllowedChain(selectedChainId)) {
      throw new Error(
        `Chain ${selectedChainId} is not allowed. Allowed chains: ${ChainService.getAllowedChainIds().join(', ')}`
      )
    }

    // Store nonce in Redis with wallet address AND chain ID for validation
    const nonceData = JSON.stringify({
      walletAddress: walletAddress.toLowerCase(),
      chainId: selectedChainId,
      createdAt: Date.now(),
    })
    await redis.setex(`siwe:nonce:${nonce}`, NONCE_TTL, nonceData)

    const domain = this.getDomain()
    const uri = this.getUri()

    // Build SIWE message
    const siweMessage = new SiweMessage({
      domain,
      address: walletAddress,
      statement: 'Sign in to Galeon',
      uri,
      version: '1',
      chainId: selectedChainId,
      nonce,
      issuedAt: new Date().toISOString(),
    })

    return {
      nonce,
      message: siweMessage.prepareMessage(),
      chainId: selectedChainId,
    }
  }

  /**
   * Verify a SIWE signature with full validation
   * @param message - The SIWE message that was signed
   * @param signature - The signature from the wallet
   * @returns The verified wallet address
   */
  static async verify(message: string, signature: string): Promise<string> {
    const siweMessage = new SiweMessage(message)

    // 1. Retrieve and validate nonce from Redis
    const nonceDataRaw = await redis.get(`siwe:nonce:${siweMessage.nonce}`)
    if (!nonceDataRaw) {
      throw new Error('Invalid or expired nonce')
    }

    const nonceData = JSON.parse(nonceDataRaw) as {
      walletAddress: string
      chainId: number
      createdAt: number
    }

    // 2. Validate wallet address matches nonce request
    if (nonceData.walletAddress !== siweMessage.address.toLowerCase()) {
      throw new Error('Nonce address mismatch')
    }

    // 3. Validate chain ID matches nonce request
    if (nonceData.chainId !== siweMessage.chainId) {
      throw new Error(
        `Chain ID mismatch. Expected ${nonceData.chainId}, got ${siweMessage.chainId}`
      )
    }

    // 4. Validate chain ID is allowed
    if (!ChainService.isAllowedChain(siweMessage.chainId)) {
      throw new Error(`Chain ${siweMessage.chainId} is not allowed`)
    }

    // 5. Validate domain matches our expected domain
    const expectedDomain = this.getDomain()
    if (siweMessage.domain !== expectedDomain) {
      throw new Error(`Invalid domain. Expected ${expectedDomain}, got ${siweMessage.domain}`)
    }

    // 6. Validate URI matches our expected URI
    const expectedUri = this.getUri()
    if (siweMessage.uri !== expectedUri) {
      throw new Error(`Invalid URI. Expected ${expectedUri}, got ${siweMessage.uri}`)
    }

    // 7. Validate issuedAt is within acceptable window
    if (siweMessage.issuedAt) {
      const issuedAt = new Date(siweMessage.issuedAt).getTime()
      const now = Date.now()
      if (now - issuedAt > ISSUANCE_WINDOW) {
        throw new Error('Message issuedAt is too old')
      }
      if (issuedAt > now + 60000) {
        // Allow 1 minute clock skew
        throw new Error('Message issuedAt is in the future')
      }
    }

    // 8. Validate expirationTime if present
    if (siweMessage.expirationTime) {
      const expirationTime = new Date(siweMessage.expirationTime).getTime()
      if (Date.now() > expirationTime) {
        throw new Error('Message has expired')
      }
    }

    // 9. Verify the signature cryptographically
    const result = await siweMessage.verify({
      signature,
      domain: expectedDomain,
      nonce: siweMessage.nonce,
    })

    if (!result.success) {
      throw new Error(`Signature verification failed: ${result.error?.type || 'Unknown error'}`)
    }

    // 10. Delete nonce (one-time use, prevents replay)
    await redis.del(`siwe:nonce:${siweMessage.nonce}`)

    return siweMessage.address
  }
}
```

### app/services/stealth_service.ts

```typescript
// Wrapper for @galeon/stealth package
// TODO: Implement when @galeon/stealth package is ready

import Port from '#models/port'

export interface ClaimablePayment {
  stealthAddress: string
  amount: string
  token: string | null
  receiptId: string
  portId: string
}

export default class StealthService {
  /**
   * Scan announcements for a port's viewing key
   * TODO: Implement with @galeon/stealth
   */
  static async scanForPort(_port: Port): Promise<ClaimablePayment[]> {
    // Placeholder - implement with @galeon/stealth
    return []
  }

  /**
   * Derive stealth private key for collection
   * TODO: Implement with @galeon/stealth
   */
  static async deriveStealthPrivateKey(
    _spendingSignature: string,
    _ephemeralPubKey: string
  ): Promise<Uint8Array> {
    // Placeholder - implement with @galeon/stealth
    return new Uint8Array(32)
  }
}
```

### app/services/collection_service.ts

```typescript
import Port from '#models/port'
import Receipt from '#models/receipt'
import StealthService, { type ClaimablePayment } from '#services/stealth_service'

export default class CollectionService {
  /**
   * Scan multiple ports for claimable payments
   */
  static async scanForClaimable(ports: Port[]): Promise<ClaimablePayment[]> {
    const allClaimable: ClaimablePayment[] = []

    for (const port of ports) {
      // Get uncollected receipts
      const _receipts = await Receipt.query().where('portId', port.id).where('status', 'confirmed')

      // Scan using stealth service
      const portClaimable = await StealthService.scanForPort(port)
      allClaimable.push(...portClaimable)
    }

    return allClaimable
  }

  /**
   * Execute collection for stealth addresses
   * TODO: Implement full collection logic
   */
  static async executeCollection(
    _stealthAddresses: string[],
    _recipientWallet: string,
    _spendingSignature: string
  ): Promise<void> {
    // Placeholder - implement with relayer service
  }
}
```

### app/services/relayer_service.ts

```typescript
import { createWalletClient, createPublicClient, http, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mantleSepoliaTestnet, mantle } from 'viem/chains'
import env from '#start/env'
import ChainService from '#services/chain_service'

const RELAYER_PRIVATE_KEY = env.get('RELAYER_PRIVATE_KEY') as `0x${string}`
const LOW_BALANCE_THRESHOLD = parseEther('0.1')

// Map chain IDs to viem chain configs
const VIEM_CHAINS: Record<number, typeof mantleSepoliaTestnet | typeof mantle> = {
  5003: mantleSepoliaTestnet,
  5000: mantle,
}

export default class RelayerService {
  private static account = privateKeyToAccount(RELAYER_PRIVATE_KEY)

  /**
   * Get viem chain config for current environment
   */
  private static getViemChain() {
    const chainId = ChainService.getDefaultChainId()
    const chain = VIEM_CHAINS[chainId]
    if (!chain) {
      throw new Error(`No viem chain config for chain ${chainId}`)
    }
    return chain
  }

  /**
   * Get wallet client for transactions
   */
  private static getWalletClient() {
    return createWalletClient({
      account: this.account,
      chain: this.getViemChain(),
      transport: http(ChainService.getDefaultChain().rpcUrl),
    })
  }

  /**
   * Get public client for reads
   */
  private static getPublicClient() {
    return createPublicClient({
      chain: this.getViemChain(),
      transport: http(ChainService.getDefaultChain().rpcUrl),
    })
  }

  /**
   * Get relayer wallet address
   */
  static getAddress(): string {
    return this.account.address
  }

  /**
   * Check relayer balance
   */
  static async getBalance(): Promise<bigint> {
    const client = this.getPublicClient()
    return client.getBalance({ address: this.account.address })
  }

  /**
   * Check if balance is below threshold
   */
  static async isLowBalance(): Promise<boolean> {
    const balance = await this.getBalance()
    return balance < LOW_BALANCE_THRESHOLD
  }

  /**
   * Send transaction from stealth address
   * TODO: Implement full transaction logic
   */
  static async sendFromStealth(
    _stealthPrivateKey: Uint8Array,
    _to: string,
    _value: bigint
  ): Promise<string> {
    // Placeholder - implement full transaction logic
    return '0x'
  }
}
```

---

## Controllers

### app/controllers/auth_controller.ts

```typescript
import type { HttpContext } from '@adonisjs/core/http'
import { nonceValidator, verifyValidator } from '#validators/auth_validator'
import SiweService from '#services/siwe_service'
import ChainService from '#services/chain_service'
import User from '#models/user'

export default class AuthController {
  /**
   * GET /auth/nonce
   * Generate a SIWE nonce for wallet authentication
   */
  async nonce({ request, response }: HttpContext) {
    const { walletAddress, chainId } = await request.validateUsing(nonceValidator)

    try {
      const result = await SiweService.generateNonce(walletAddress, chainId)
      return response.ok(result)
    } catch (error) {
      return response.badRequest({ error: (error as Error).message })
    }
  }

  /**
   * POST /auth/session
   * Verify SIWE signature and create session (issue JWT)
   */
  async create({ request, response, auth }: HttpContext) {
    const { message, signature } = await request.validateUsing(verifyValidator)

    try {
      const walletAddress = await SiweService.verify(message, signature)

      // Find or create user
      let user = await User.findBy('walletAddress', walletAddress.toLowerCase())
      if (!user) {
        user = await User.create({ walletAddress: walletAddress.toLowerCase() })
      }

      // Generate JWT token
      const token = await auth.use('jwt').generate(user)

      return response.ok({
        token: {
          type: 'bearer',
          value: token.token,
          expiresAt: token.expiresAt,
        },
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
        },
      })
    } catch (error) {
      return response.unauthorized({ error: (error as Error).message })
    }
  }

  /**
   * GET /auth/session
   * Get current session (authenticated user)
   */
  async show({ auth, response }: HttpContext) {
    return response.ok({
      user: {
        id: auth.user!.id,
        walletAddress: auth.user!.walletAddress,
      },
    })
  }

  /**
   * GET /auth/chains
   * Get allowed chains for authentication
   */
  async chains({ response }: HttpContext) {
    const allowedChainIds = ChainService.getAllowedChainIds()
    const chains = allowedChainIds
      .map((id) => {
        try {
          const config = ChainService.getChain(id)
          return {
            chainId: config.chainId,
            name: config.name,
            nativeCurrency: config.nativeCurrency,
          }
        } catch {
          return null
        }
      })
      .filter(Boolean)

    return response.ok({
      defaultChainId: ChainService.getDefaultChainId(),
      chains,
    })
  }
}
```

### app/controllers/ports_controller.ts

```typescript
import type { HttpContext } from '@adonisjs/core/http'
import { createPortValidator, updatePortValidator } from '#validators/port_validator'
import Port from '#models/port'

export default class PortsController {
  /**
   * GET /ports
   * List all ports for authenticated user
   */
  async index({ auth, response }: HttpContext) {
    const ports = await Port.query()
      .where('userId', auth.user!.id)
      .where('archived', false)
      .orderBy('createdAt', 'desc')

    return response.ok({ ports })
  }

  /**
   * POST /ports
   * Create a new port
   */
  async create({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(createPortValidator)

    const port = await Port.create({
      userId: auth.user!.id,
      portId: data.portId,
      name: data.name,
      type: data.type,
      stealthMetaAddress: data.stealthMetaAddress,
      viewingKeyEncrypted: data.viewingKeyEncrypted,
      active: true,
      archived: false,
      totalReceived: '0',
      totalCollected: '0',
      paymentCount: 0,
    })

    return response.created({ port })
  }

  /**
   * GET /ports/:id
   * Get a single port by ID
   */
  async show({ auth, params, response }: HttpContext) {
    const port = await Port.query()
      .where('id', params.id)
      .where('userId', auth.user!.id)
      .firstOrFail()

    return response.ok({ port })
  }

  /**
   * PATCH /ports/:id
   * Update a port
   */
  async update({ auth, params, request, response }: HttpContext) {
    const data = await request.validateUsing(updatePortValidator)

    const port = await Port.query()
      .where('id', params.id)
      .where('userId', auth.user!.id)
      .firstOrFail()

    port.merge(data)
    await port.save()

    return response.ok({ port })
  }

  /**
   * DELETE /ports/:id
   * Archive a port (soft delete)
   */
  async destroy({ auth, params, response }: HttpContext) {
    const port = await Port.query()
      .where('id', params.id)
      .where('userId', auth.user!.id)
      .firstOrFail()

    port.archived = true
    port.active = false
    port.archivedAt = new Date() as any
    await port.save()

    return response.noContent()
  }
}
```

### app/controllers/receipts_controller.ts

```typescript
import type { HttpContext } from '@adonisjs/core/http'
import Receipt from '#models/receipt'
import Port from '#models/port'

export default class ReceiptsController {
  /**
   * GET /receipts
   * List all receipts for authenticated user
   */
  async index({ auth, request, response }: HttpContext) {
    const { status, limit = 50, offset = 0 } = request.qs()

    // Get user's port IDs
    const portIds = await Port.query().where('userId', auth.user!.id).select('id')

    const query = Receipt.query()
      .whereIn(
        'portId',
        portIds.map((p) => p.id)
      )
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset)

    if (status) {
      query.where('status', status)
    }

    const receipts = await query

    return response.ok({ receipts })
  }

  /**
   * GET /ports/:portId/receipts
   * List receipts for a specific port (nested route)
   */
  async indexByPort({ auth, params, request, response }: HttpContext) {
    const { status, limit = 50, offset = 0 } = request.qs()

    // Verify port ownership
    const port = await Port.query()
      .where('id', params.portId)
      .where('userId', auth.user!.id)
      .firstOrFail()

    const query = Receipt.query()
      .where('portId', port.id)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset)

    if (status) {
      query.where('status', status)
    }

    const receipts = await query

    return response.ok({ receipts })
  }

  /**
   * GET /receipts/:id
   * Get a single receipt by ID (authenticated)
   */
  async show({ auth, params, response }: HttpContext) {
    const receipt = await Receipt.query().where('id', params.id).preload('port').firstOrFail()

    // Verify ownership
    if (receipt.port.userId !== auth.user!.id) {
      return response.forbidden({ error: 'Not authorized' })
    }

    return response.ok({ receipt })
  }

  /**
   * GET /receipts/:hash
   * Public endpoint to verify a receipt by hash
   */
  async showByHash({ params, response }: HttpContext) {
    const receipt = await Receipt.findBy('receiptHash', params.hash)

    if (!receipt) {
      return response.notFound({ error: 'Receipt not found' })
    }

    return response.ok({
      verified: true,
      receipt: {
        receiptHash: receipt.receiptHash,
        amount: receipt.amount,
        currency: receipt.currency,
        txHash: receipt.txHash,
        blockNumber: receipt.blockNumber,
        chainId: receipt.chainId,
        createdAt: receipt.createdAt,
      },
    })
  }
}
```

### app/controllers/scans_controller.ts

```typescript
import type { HttpContext } from '@adonisjs/core/http'
import { scanValidator } from '#validators/collect_validator'
import CollectionService from '#services/collection_service'
import Port from '#models/port'

export default class ScansController {
  /**
   * POST /scans
   * Scan ports for claimable payments (creates a scan result)
   */
  async create({ auth, request, response }: HttpContext) {
    const { portIds } = await request.validateUsing(scanValidator)

    // Verify ownership
    const ports = await Port.query()
      .whereIn('id', portIds)
      .where('userId', auth.user!.id)
      .where('active', true)

    if (ports.length !== portIds.length) {
      return response.forbidden({ error: 'Invalid port IDs' })
    }

    const claimable = await CollectionService.scanForClaimable(ports)

    return response.ok({ claimable })
  }
}
```

### app/controllers/collections_controller.ts

```typescript
import type { HttpContext } from '@adonisjs/core/http'
import { executeValidator } from '#validators/collect_validator'
import Collection from '#models/collection'

export default class CollectionsController {
  /**
   * GET /collections
   * List all collections for authenticated user
   */
  async index({ auth, response }: HttpContext) {
    const collections = await Collection.query()
      .where('userId', auth.user!.id)
      .orderBy('createdAt', 'desc')

    return response.ok({ collections })
  }

  /**
   * POST /collections
   * Execute collection of funds (create collection)
   */
  async create({ auth, request, response }: HttpContext) {
    const {
      receiptIds,
      recipientWallet,
      signature: _signature,
    } = await request.validateUsing(executeValidator)

    // Create collection record
    const collection = await Collection.create({
      userId: auth.user!.id,
      recipientWallet,
      status: 'pending',
      totalReceipts: receiptIds.length,
      processedReceipts: 0,
      totalAmount: '0',
      tokenAmounts: {},
    })

    // Queue collection job
    // TODO: Dispatch ProcessCollection job
    // await ProcessCollection.dispatch({ collectionId: collection.id, receiptIds, signature })

    return response.accepted({
      collection: {
        id: collection.id,
        status: collection.status,
        totalReceipts: collection.totalReceipts,
      },
    })
  }

  /**
   * GET /collections/:id
   * Get a single collection status
   */
  async show({ auth, params, response }: HttpContext) {
    const collection = await Collection.query()
      .where('id', params.id)
      .where('userId', auth.user!.id)
      .preload('receipts')
      .firstOrFail()

    return response.ok({ collection })
  }
}
```

### app/controllers/webhooks_controller.ts

```typescript
import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import ProcessPayment from '#jobs/process_payment'

export default class WebhooksController {
  /**
   * POST /webhooks/ponder
   * Receive payment events from Ponder indexer
   */
  async ponder({ request, response }: HttpContext) {
    const payload = request.body()

    // Validate webhook secret
    const secret = request.header('X-Webhook-Secret')
    if (secret !== env.get('PONDER_WEBHOOK_SECRET')) {
      return response.unauthorized({ error: 'Invalid webhook secret' })
    }

    // Queue payment processing
    await ProcessPayment.dispatch(payload)

    return response.ok({ received: true })
  }
}
```

---

## Jobs

### app/jobs/process_payment.ts

```typescript
import { Job } from 'adonisjs-jobs'
import Port from '#models/port'
import Receipt from '#models/receipt'
// import transmit from '@adonisjs/transmit/services/main'

interface ProcessPaymentPayload {
  stealthAddress: string
  receiptHash: string
  payerAddress: string
  amount: string
  token: string | null
  txHash: string
  blockNumber: string
  chainId: number
  portId: string
}

export default class ProcessPayment extends Job {
  static get queueName() {
    return 'payments'
  }

  async handle(payload: ProcessPaymentPayload) {
    const {
      stealthAddress,
      receiptHash,
      payerAddress,
      amount,
      token,
      txHash,
      blockNumber,
      chainId,
      portId,
    } = payload

    // Find port by portId
    const port = await Port.findBy('portId', portId)
    if (!port) {
      console.error(`Port not found: ${portId}`)
      return
    }

    // Check if receipt already exists
    const existing = await Receipt.findBy('receiptHash', receiptHash)
    if (existing) {
      console.log(`Receipt already exists: ${receiptHash}`)
      return
    }

    // Create receipt
    await Receipt.create({
      portId: port.id,
      receiptHash,
      stealthAddress,
      payerAddress,
      amount,
      currency: token ? 'TOKEN' : 'MNT',
      tokenAddress: token,
      txHash,
      blockNumber,
      chainId,
      status: 'confirmed',
    })

    // Update port stats
    port.paymentCount += 1
    port.totalReceived = (BigInt(port.totalReceived) + BigInt(amount)).toString()
    await port.save()

    // Broadcast via SSE
    // TODO: Uncomment when transmit is configured
    // transmit.broadcast(`user/${port.userId}/payments`, {
    //   type: 'new_payment',
    //   receipt,
    // })

    console.log(`Processed payment: ${receiptHash}`)
  }
}
```

### app/jobs/reconcile_payments.ts

```typescript
import { Job } from 'adonisjs-jobs'

export default class ReconcilePayments extends Job {
  static get queueName() {
    return 'reconcile'
  }

  async handle() {
    // TODO: Implement reconciliation logic
    // 1. Get last processed block from settings
    // 2. Query Ponder for events since last block
    // 3. Process any missing receipts
    // 4. Update last processed block

    console.log('Running payment reconciliation...')
  }
}
```

### app/jobs/monitor_relayer.ts

```typescript
import { Job } from 'adonisjs-jobs'
import RelayerService from '#services/relayer_service'

export default class MonitorRelayer extends Job {
  static get queueName() {
    return 'monitoring'
  }

  async handle() {
    const isLow = await RelayerService.isLowBalance()

    if (isLow) {
      const balance = await RelayerService.getBalance()
      const address = RelayerService.getAddress()

      // Send alert (Discord webhook in production)
      console.warn(`Relayer low balance alert!`)
      console.warn(`Address: ${address}`)
      console.warn(`Balance: ${balance}`)

      // TODO: Send Discord webhook
    }
  }
}
```

---

## API Versioning

All API endpoints are versioned using URL path prefixes. This allows for backward-compatible changes and easy migration between API versions.

### Versioning Strategy

| Component | Convention                          | Example                                    |
| --------- | ----------------------------------- | ------------------------------------------ |
| Base path | `/api/v{major}`                     | `/api/v1`, `/api/v2`                       |
| Full URL  | `https://api.galeon.xyz/api/v1/...` | `https://api.galeon.xyz/api/v1/auth/nonce` |

### Version Policy

- **v1** - Initial release (current)
- Breaking changes require a new major version (v2, v3, etc.)
- Deprecated endpoints return `X-API-Deprecated: true` header
- Old versions supported for 6 months after deprecation

### Endpoints Overview (RESTful)

Following Rails-style resourceful routing with SOLID principles:

**Auth Resource** (Session-like)
| Method | Path | Action | Description | Auth |
|--------|------|--------|-------------|------|
| GET | `/api/v1/auth/nonce` | nonce | Get SIWE nonce | No |
| POST | `/api/v1/auth/session` | create | Verify signature, create session (JWT) | No |
| GET | `/api/v1/auth/session` | show | Get current session/user | JWT |
| GET | `/api/v1/auth/chains` | chains | List allowed chains | No |

**Ports Resource** (CRUD)
| Method | Path | Action | Description | Auth |
|--------|------|--------|-------------|------|
| GET | `/api/v1/ports` | index | List user's ports | JWT |
| POST | `/api/v1/ports` | create | Create new port | JWT |
| GET | `/api/v1/ports/:id` | show | Get port details | JWT |
| PATCH | `/api/v1/ports/:id` | update | Update port | JWT |
| DELETE | `/api/v1/ports/:id` | destroy | Archive port | JWT |

**Receipts Resource** (Nested under Ports + standalone)
| Method | Path | Action | Description | Auth |
|--------|------|--------|-------------|------|
| GET | `/api/v1/ports/:portId/receipts` | index | List port's receipts | JWT |
| GET | `/api/v1/receipts` | index | List all user's receipts | JWT |
| GET | `/api/v1/receipts/:id` | show | Get receipt details | JWT |
| GET | `/api/v1/receipts/:hash` | showByHash | Verify receipt by hash (public) | No |

**Scans Resource** (Read-only, for discovering claimable payments)
| Method | Path | Action | Description | Auth |
|--------|------|--------|-------------|------|
| POST | `/api/v1/scans` | create | Scan ports for claimable payments | JWT |

**Collections Resource** (CRUD)
| Method | Path | Action | Description | Auth |
|--------|------|--------|-------------|------|
| GET | `/api/v1/collections` | index | List user's collections | JWT |
| POST | `/api/v1/collections` | create | Execute collection | JWT + Rate |
| GET | `/api/v1/collections/:id` | show | Get collection status | JWT |

**Webhooks** (Unversioned - stable contract)
| Method | Path | Action | Description | Auth |
|--------|------|--------|-------------|------|
| POST | `/webhooks/ponder` | ponder | Receive Ponder events | Secret |

**Health** (Unversioned - infra)
| Method | Path | Action | Description | Auth |
|--------|------|--------|-------------|------|
| GET | `/health` | health | Health check | No |

---

## Routes

### start/routes.ts

Following Rails-style resourceful routing with SOLID principles:

- Each resource has its own controller with standard CRUD actions
- Nested resources for clear relationships
- Custom actions use member/collection routes

```typescript
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

// Lazy-load controllers (Single Responsibility)
const AuthController = () => import('#controllers/auth_controller')
const PortsController = () => import('#controllers/ports_controller')
const ReceiptsController = () => import('#controllers/receipts_controller')
const ScansController = () => import('#controllers/scans_controller')
const CollectionsController = () => import('#controllers/collections_controller')
const WebhooksController = () => import('#controllers/webhooks_controller')

// =====================
// Health (unversioned - infra)
// =====================
router.get('/', async () => ({ status: 'ok', service: 'galeon-api', version: 'v1' }))
router.get('/health', async () => ({ status: 'ok' }))

// =====================
// API v1
// =====================
router
  .group(() => {
    // -----------------------
    // Auth Resource (session-like)
    // -----------------------
    router
      .group(() => {
        router.get('/nonce', [AuthController, 'nonce']) // GET /auth/nonce
        router.get('/chains', [AuthController, 'chains']) // GET /auth/chains
        router.post('/session', [AuthController, 'create']) // POST /auth/session (login)
        router
          .get('/session', [AuthController, 'show']) // GET /auth/session (current user)
          .use(middleware.auth({ guards: ['jwt'] }))
      })
      .prefix('/auth')

    // -----------------------
    // Ports Resource (CRUD)
    // -----------------------
    router
      .group(() => {
        router.get('/', [PortsController, 'index']) // GET /ports
        router.post('/', [PortsController, 'create']) // POST /ports
        router.get('/:id', [PortsController, 'show']) // GET /ports/:id
        router.patch('/:id', [PortsController, 'update']) // PATCH /ports/:id
        router.delete('/:id', [PortsController, 'destroy']) // DELETE /ports/:id
        // Nested: Receipts under Ports
        router.get('/:portId/receipts', [ReceiptsController, 'indexByPort']) // GET /ports/:portId/receipts
      })
      .prefix('/ports')
      .use(middleware.auth({ guards: ['jwt'] }))

    // -----------------------
    // Receipts Resource
    // -----------------------
    router
      .group(() => {
        router
          .get('/', [ReceiptsController, 'index']) // GET /receipts
          .use(middleware.auth({ guards: ['jwt'] }))
        router
          .get('/:id', [ReceiptsController, 'show']) // GET /receipts/:id
          .use(middleware.auth({ guards: ['jwt'] }))
        router.get('/:hash', [ReceiptsController, 'showByHash']) // GET /receipts/:hash (public)
      })
      .prefix('/receipts')

    // -----------------------
    // Scans Resource (discover claimable payments)
    // -----------------------
    router
      .post('/scans', [ScansController, 'create']) // POST /scans
      .use(middleware.auth({ guards: ['jwt'] }))

    // -----------------------
    // Collections Resource (CRUD)
    // -----------------------
    router
      .group(() => {
        router.get('/', [CollectionsController, 'index']) // GET /collections
        router
          .post('/', [CollectionsController, 'create']) // POST /collections
          .use(middleware.rateLimit())
        router.get('/:id', [CollectionsController, 'show']) // GET /collections/:id
      })
      .prefix('/collections')
      .use(middleware.auth({ guards: ['jwt'] }))
  })
  .prefix('/api/v1')

// =====================
// Webhooks (unversioned - stable contract with Ponder)
// =====================
router.post('/webhooks/ponder', [WebhooksController, 'ponder'])
```

### start/kernel.ts

```typescript
import router from '@adonisjs/core/services/router'

router.use([
  () => import('@adonisjs/cors/cors_middleware'),
  () => import('@adonisjs/auth/initialize_auth_middleware'),
])

export const middleware = router.named({
  auth: () => import('#middleware/auth_middleware'),
  rateLimit: () => import('#middleware/rate_limit_middleware'),
  silentAuth: () => import('#middleware/silent_auth_middleware'),
})
```

---

## Environment Variables

### .env.example

```env
# App
TZ=UTC
PORT=3333
HOST=0.0.0.0
LOG_LEVEL=info
APP_KEY=your-app-key-here
NODE_ENV=development

# Database
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=galeon
DB_PASSWORD=galeon
DB_DATABASE=galeon

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# SIWE Configuration
SIWE_DOMAIN=galeon.xyz
SIWE_URI=https://api.galeon.xyz

# Chain Configuration
CHAIN_ID=5003
ALLOWED_CHAIN_IDS=5003,5000
RPC_URL=https://rpc.sepolia.mantle.xyz

# Relayer
RELAYER_PRIVATE_KEY=0x...

# Ponder
PONDER_WEBHOOK_SECRET=your-webhook-secret

# Discord Alerts (optional)
DISCORD_ALERT_WEBHOOK=
```

---

## Implementation Order

1. **Dependencies** - Install `@maximemrf/adonisjs-jwt`, `@adonisjs/redis`
2. **Config** - Set up `config/auth.ts` with JWT guard, `config/redis.ts`
3. **Migrations** - Create 5 tables: users, ports, collections, receipts, settings
4. **Models** - User, Port, Collection, Receipt (no access tokens on User)
5. **Services** - ChainService first, then SiweService
6. **Validators** - Auth, Port, Collect validators
7. **Middleware** - Auth, RateLimit, SilentAuth
8. **Controllers** - AuthController first, then Ports, Receipts, Collect, Webhooks
9. **Routes** - Register all routes with JWT guard
10. **Jobs** - ProcessPayment, ReconcilePayments, MonitorRelayer

---

## Key Changes from Previous Version

| Previous                        | Current                                      | Reason                                        |
| ------------------------------- | -------------------------------------------- | --------------------------------------------- |
| `DbAccessTokensProvider`        | `@maximemrf/adonisjs-jwt`                    | Stateless JWT for better scalability          |
| `access_tokens` table           | Removed                                      | JWT tokens not stored in DB                   |
| Hard-coded `chainId: 5003`      | `ChainService` with env config               | Support both testnet and mainnet              |
| Basic SIWE verify               | Full validation (domain, uri, chainId, time) | Security hardening                            |
| `guards: ['api']`               | `guards: ['jwt']`                            | JWT guard naming                              |
| `claims` + `claim_items` tables | `collections` table only                     | Simpler schema, receipts reference collection |

---

## Notes

- **API versioning** uses `/api/v1/` prefix for all endpoints (except health/webhooks)
- **JWT tokens** are stateless - no DB storage, no logout endpoint needed
- **Chain selection** is env-driven with `CHAIN_ID` (default) and `ALLOWED_CHAIN_IDS`
- **SIWE verification** validates domain, uri, chainId, issuedAt, expirationTime
- **Nonce storage** includes wallet address AND chainId for cross-validation
- All bigints stored as `decimal(78, 0)` to handle wei values
- UUIDs used for Port, Receipt, Claim, ClaimItem IDs
- Rate limiting uses Redis for distributed state
- SSE via Transmit for real-time payment notifications
- Health check at `/health` is unversioned for load balancer compatibility
- Webhooks at `/webhooks/ponder` are unversioned (stable contract with Ponder indexer)

---

_Last updated: December 27, 2025_
