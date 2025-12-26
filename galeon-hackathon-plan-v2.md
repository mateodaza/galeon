# Galeon v2: Private Business Payments with Verifiable Receipts

## Mantle Global Hackathon 2025 - Project Plan (AdonisJS Edition)

**Project Name:** Galeon
**Tagline:** "Your payments. Your treasure. Hidden in plain sight."
**Team:** Mateo & Carlos (Barranquilla, Colombia)
**Submission Deadline:** January 15, 2026
**Demo Day:** February 1, 2026
**Hackathon:** [Mantle Global Hackathon 2025](https://www.hackquest.io/hackathons/Mantle-Global-Hackathon-2025)

---

## What Changed from v1

| Aspect | v1 (Next.js Only) | v2 (AdonisJS + Next.js) |
|--------|-------------------|-------------------------|
| **Backend** | Next.js API Routes (serverless) | AdonisJS (dedicated server) |
| **Real-time** | Polling Ponder every 10s | Transmit SSE (instant notifications) |
| **Background Jobs** | None (serverless limits) | BullMQ workers |
| **Database** | Drizzle ORM | Lucid ORM (AdonisJS native) |
| **Auth** | Signature-based headers | Access tokens + wallet signatures |
| **Deployment** | Vercel only | Railway (API) + Vercel (frontend) |

**Why the change:** Serverless limitations (timeouts, no WebSockets, no background jobs) made real-time payment detection and future scaling difficult.

---

## Technical Architecture v2

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      GALEON ARCHITECTURE v2                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    NEXT.JS (Vercel)                             │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐   │ │
│  │  │   Frontend  │  │   wagmi +   │  │   Stealth Crypto     │   │ │
│  │  │   (React)   │  │    viem     │  │   (client-side)      │   │ │
│  │  └─────────────┘  └─────────────┘  └──────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    ADONISJS (Railway)                           │ │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌────────────────┐ │ │
│  │  │ Transmit  │ │  BullMQ   │ │  Vendors  │ │   Receipts     │ │ │
│  │  │   (SSE)   │ │  Workers  │ │    API    │ │      API       │ │ │
│  │  └───────────┘ └───────────┘ └───────────┘ └────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│         │                │                   │                       │
│         ▼                ▼                   ▼                       │
│  ┌─────────────┐  ┌─────────────┐    ┌─────────────┐                │
│  │    Redis    │  │  PostgreSQL │    │   Ponder    │                │
│  │  (queues +  │  │  (Railway)  │    │  (Railway)  │                │
│  │   pub/sub)  │  │             │    │   GraphQL   │                │
│  └─────────────┘  └─────────────┘    └─────────────┘                │
│                                              │                       │
│                                              ▼                       │
│                                       ┌─────────────┐               │
│                                       │   Mantle    │               │
│                                       │  Blockchain │               │
│                                       └─────────────┘               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Payment Detection:**
   - Ponder indexes `StealthPayment` event from Mantle
   - Ponder webhook → AdonisJS endpoint
   - AdonisJS broadcasts via Transmit SSE → Frontend dashboard updates instantly

2. **Vendor/Receipt Data:**
   - Frontend → AdonisJS API → PostgreSQL (via Lucid ORM)

3. **Stealth Crypto:**
   - Runs client-side in browser (keypair generation, stealth address computation)

---

## Tech Stack v2

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Blockchain** | Mantle L2 | Low fees, EVM compatible |
| **Cryptography** | @noble/secp256k1, @noble/hashes | Audited, browser-compatible |
| **Smart Contracts** | Solidity + Hardhat | Standard tooling |
| **Frontend** | Next.js 15 + TypeScript | App router, React 19 |
| **Styling** | Tailwind CSS v4 | Rapid UI development |
| **Wallet** | wagmi v2 + viem | Modern, type-safe |
| **Backend** | AdonisJS 6 | Full-featured, TypeScript-first |
| **Real-time** | AdonisJS Transmit (SSE) | Native, scales with Redis |
| **Background Jobs** | adonisjs-jobs (BullMQ) | Reliable queue processing |
| **ORM** | Lucid (AdonisJS native) | Active Record, migrations |
| **Database** | PostgreSQL | Railway hosted |
| **Cache/Queues** | Redis | Railway hosted |
| **Indexer** | Ponder | Real-time blockchain indexing |
| **Hosting** | Vercel (web) + Railway (API, DB, Redis, Ponder) | Quick deployment |

---

## Project Structure v2 (Separate Repositories)

Each component lives in its own GitHub repository for independent deployment and versioning.

### Repositories Overview

| Repository | Description | Deploy To |
|------------|-------------|-----------|
| `galeon-api` | AdonisJS 6 backend | Railway |
| `galeon-web` | Next.js 15 frontend | Vercel |
| `galeon-indexer` | Ponder blockchain indexer | Railway |
| `galeon-contracts` | Solidity smart contracts | Mantle |

---

### 1. galeon-api (AdonisJS Backend)

```
galeon-api/
├── ace.js                        # CLI entry point
├── adonisrc.ts                   # AdonisJS configuration
├── tsconfig.json                 # TypeScript config
├── package.json                  # Dependencies + subpath imports
├── .env                          # Environment variables
├── .env.example                  # Environment template
├── .gitignore
│
├── app/                          # Domain logic
│   ├── controllers/
│   │   ├── vendors_controller.ts
│   │   ├── receipts_controller.ts
│   │   ├── auth_controller.ts
│   │   └── webhooks_controller.ts
│   ├── models/
│   │   ├── vendor.ts
│   │   └── receipt.ts
│   ├── jobs/
│   │   ├── process_payment.ts
│   │   └── fetch_fx_rate.ts
│   ├── validators/
│   │   ├── vendor.ts
│   │   └── receipt.ts
│   ├── middleware/
│   │   └── wallet_auth.ts
│   ├── services/                 # Business logic
│   │   ├── stealth_service.ts
│   │   └── receipt_service.ts
│   └── exceptions/               # Custom exceptions
│       └── auth_exception.ts
│
├── config/                       # Runtime configuration
│   ├── app.ts
│   ├── database.ts
│   ├── redis.ts
│   ├── transmit.ts
│   ├── auth.ts
│   └── jobs.ts
│
├── database/
│   ├── migrations/
│   │   ├── 001_create_vendors_table.ts
│   │   ├── 002_create_receipts_table.ts
│   │   └── 003_create_vendor_access_tokens_table.ts
│   └── seeders/
│       └── demo_vendor_seeder.ts
│
├── start/                        # Boot lifecycle files
│   ├── env.ts                    # Environment validation
│   ├── kernel.ts                 # Middleware registration
│   ├── routes.ts                 # Route definitions
│   └── transmit.ts               # SSE channel authorization
│
├── providers/                    # Service providers
├── commands/                     # Custom Ace commands
├── tests/                        # Test files
│   ├── bootstrap.ts
│   ├── unit/
│   └── functional/
├── types/                        # TypeScript interfaces
├── public/                       # Static assets
└── tmp/                          # Temporary files (gitignored)
```

---

### 2. galeon-web (Next.js Frontend)

```
galeon-web/
├── package.json
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── .env.local
├── .env.example
├── .gitignore
│
├── app/
│   ├── layout.tsx
│   ├── page.tsx                  # Landing
│   ├── setup/
│   │   └── page.tsx              # Vendor onboarding
│   ├── dashboard/
│   │   └── page.tsx              # Vendor dashboard
│   ├── pay/
│   │   └── [slug]/
│   │       └── page.tsx          # Payer flow
│   └── receipt/
│       └── [id]/
│           └── page.tsx          # Receipt viewer
│
├── components/
│   ├── ui/                       # Shadcn components
│   ├── WalletConnect.tsx
│   ├── PaymentForm.tsx
│   ├── ReceiptCard.tsx
│   └── DashboardStats.tsx
│
├── lib/
│   ├── wagmi.ts                  # Wallet config
│   ├── api.ts                    # AdonisJS API client
│   ├── transmit.ts               # SSE client
│   └── stealth/                  # Core crypto (EIP-5564)
│       ├── index.ts
│       ├── keys.ts
│       ├── address.ts
│       └── types.ts
│
├── hooks/
│   ├── useVendor.ts
│   ├── useReceipts.ts
│   ├── useStealth.ts
│   └── usePaymentStream.ts       # Transmit SSE hook
│
├── types/
│   └── index.ts
│
└── public/
    └── images/
```

---

### 3. galeon-indexer (Ponder)

```
galeon-indexer/
├── package.json
├── ponder.config.ts
├── ponder.schema.ts
├── tsconfig.json
├── .env
├── .env.example
├── .gitignore
│
└── src/
    └── index.ts                  # Event handlers
```

---

### 4. galeon-contracts (Solidity)

```
galeon-contracts/
├── package.json
├── hardhat.config.ts
├── tsconfig.json
├── .env
├── .env.example
├── .gitignore
│
├── contracts/
│   └── GaleonRegistry.sol
│
├── scripts/
│   └── deploy.ts
│
└── test/
    └── GaleonRegistry.test.ts
```

---

## Setup Instructions

### Prerequisites

- Node.js 22.x+ (LTS) or 23.x+
- pnpm 9.x+
- Railway account (free tier works for dev)
- GitHub account

---

### 1. Create galeon-api (AdonisJS Backend)

```bash
# Create AdonisJS project
npm init adonisjs@latest galeon-api -- --kit=api --db=postgres --auth-guard=access_tokens

cd galeon-api

# Install additional packages
pnpm add @adonisjs/redis @adonisjs/transmit @adonisjs/limiter ioredis
pnpm add adonisjs-jobs

# Configure packages
node ace add @adonisjs/redis
node ace add @adonisjs/transmit
node ace add @adonisjs/limiter
node ace configure adonisjs-jobs

# Initialize git (if not already)
git init
git add .
git commit -m "Initial AdonisJS setup"

# Push to GitHub
gh repo create galeon-api --private --source=. --push
```

---

### 2. Create galeon-web (Next.js Frontend)

```bash
# Create Next.js project
pnpm create next-app galeon-web --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-pnpm

cd galeon-web

# Install dependencies
pnpm add wagmi viem @tanstack/react-query
pnpm add @noble/secp256k1 @noble/hashes
pnpm add @adonisjs/transmit-client

# Push to GitHub
gh repo create galeon-web --private --source=. --push
```

---

### 3. Create galeon-indexer (Ponder)

```bash
# Create Ponder project
pnpm create ponder galeon-indexer

cd galeon-indexer
pnpm install

# Push to GitHub
gh repo create galeon-indexer --private --source=. --push
```

---

### 4. Create galeon-contracts (Solidity)

```bash
mkdir galeon-contracts && cd galeon-contracts
pnpm init

# Install Hardhat
pnpm add -D hardhat @nomicfoundation/hardhat-toolbox typescript ts-node
pnpm add @openzeppelin/contracts

# Initialize Hardhat
npx hardhat init

# Push to GitHub
gh repo create galeon-contracts --private --source=. --push
```

---

## AdonisJS Configuration

### Environment Variables (.env)

```env
# apps/api/.env
TZ=UTC
PORT=3333
HOST=0.0.0.0
LOG_LEVEL=info
APP_KEY=your-app-key-here
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_DATABASE=galeon

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Transmit (SSE)
TRANSMIT_REDIS_HOST=localhost
TRANSMIT_REDIS_PORT=6379

# Ponder webhook secret
PONDER_WEBHOOK_SECRET=your-webhook-secret

# Mantle RPC
MANTLE_RPC_URL=https://rpc.testnet.mantle.xyz
```

### Database Configuration

```typescript
// apps/api/config/database.ts
import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'

const dbConfig = defineConfig({
  connection: 'postgres',
  connections: {
    postgres: {
      client: 'pg',
      connection: {
        host: env.get('DB_HOST'),
        port: env.get('DB_PORT'),
        user: env.get('DB_USER'),
        password: env.get('DB_PASSWORD'),
        database: env.get('DB_DATABASE'),
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
    },
  },
})

export default dbConfig
```

### Redis Configuration

```typescript
// apps/api/config/redis.ts
import env from '#start/env'
import { defineConfig } from '@adonisjs/redis'

const redisConfig = defineConfig({
  connection: 'main',
  connections: {
    main: {
      host: env.get('REDIS_HOST'),
      port: env.get('REDIS_PORT'),
      password: env.get('REDIS_PASSWORD', ''),
      db: 0,
      keyPrefix: 'galeon:',
    },
  },
})

export default redisConfig
```

### Transmit Configuration (SSE)

```typescript
// apps/api/config/transmit.ts
import env from '#start/env'
import { defineConfig } from '@adonisjs/transmit'
import { redis } from '@adonisjs/transmit/transports'

export default defineConfig({
  pingInterval: '30s',
  transport: {
    driver: redis({
      host: env.get('TRANSMIT_REDIS_HOST'),
      port: env.get('TRANSMIT_REDIS_PORT'),
      password: env.get('REDIS_PASSWORD', ''),
      keyPrefix: 'transmit:',
    }),
  },
})
```

### Jobs Configuration (BullMQ)

```typescript
// apps/api/config/jobs.ts
import env from '#start/env'
import { defineConfig } from 'adonisjs-jobs'

export default defineConfig({
  connection: {
    host: env.get('REDIS_HOST'),
    port: env.get('REDIS_PORT'),
    password: env.get('REDIS_PASSWORD', ''),
  },
  queues: ['default', 'payments', 'fx-rates'],
  defaultQueue: 'default',
})
```

---

## Database Models (Lucid ORM)

### Vendor Model

```typescript
// apps/api/app/models/vendor.ts
import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Receipt from '#models/receipt'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'

export default class Vendor extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare walletAddress: string

  @column()
  declare name: string | null

  @column()
  declare slug: string

  @column()
  declare stealthMetaAddress: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => Receipt)
  declare receipts: HasMany<typeof Receipt>

  static accessTokens = DbAccessTokensProvider.forModel(Vendor, {
    expiresIn: '30 days',
    prefix: 'gln_',
    table: 'vendor_access_tokens',
    type: 'auth_token',
    tokenSecretLength: 40,
  })
}
```

### Receipt Model

```typescript
// apps/api/app/models/receipt.ts
import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Vendor from '#models/vendor'

export default class Receipt extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare receiptId: string // "GR-2025-001234"

  @column()
  declare vendorId: number

  @column()
  declare amount: string

  @column()
  declare currency: string // "MNT" | "USDC"

  @column()
  declare description: string | null

  @column()
  declare stealthAddress: string

  @column()
  declare ephemeralPubkey: string

  @column()
  declare txHash: string | null

  @column()
  declare anchorBlock: number | null

  @column()
  declare receiptHash: string

  @column()
  declare payerAddress: string

  @column()
  declare payerSignature: string

  @column()
  declare vendorSignature: string | null

  @column()
  declare status: 'pending' | 'confirmed' | 'claimed'

  @column.dateTime()
  declare detectedAt: DateTime | null

  @column.dateTime()
  declare claimedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Vendor)
  declare vendor: BelongsTo<typeof Vendor>
}
```

---

## Database Migrations

### Vendors Migration

```typescript
// apps/api/database/migrations/001_create_vendors_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'vendors'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('wallet_address', 42).notNullable().unique()
      table.string('name', 255).nullable()
      table.string('slug', 100).notNullable().unique()
      table.text('stealth_meta_address').notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })

    this.schema.createIndex(this.tableName, ['slug'])
    this.schema.createIndex(this.tableName, ['wallet_address'])
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

### Receipts Migration

```typescript
// apps/api/database/migrations/002_create_receipts_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'receipts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('receipt_id', 50).notNullable().unique()
      table.integer('vendor_id').unsigned().references('id').inTable('vendors').onDelete('CASCADE')

      // Payment details
      table.decimal('amount', 36, 18).notNullable()
      table.string('currency', 10).notNullable()
      table.text('description').nullable()

      // Blockchain data
      table.string('stealth_address', 42).notNullable()
      table.text('ephemeral_pubkey').notNullable()
      table.string('tx_hash', 66).nullable()
      table.bigInteger('anchor_block').nullable()
      table.string('receipt_hash', 66).notNullable()

      // Signatures
      table.string('payer_address', 42).notNullable()
      table.text('payer_signature').notNullable()
      table.text('vendor_signature').nullable()

      // Status
      table.enum('status', ['pending', 'confirmed', 'claimed']).defaultTo('pending')
      table.timestamp('detected_at').nullable()
      table.timestamp('claimed_at').nullable()

      table.timestamp('created_at')
    })

    this.schema.createIndex(this.tableName, ['vendor_id'])
    this.schema.createIndex(this.tableName, ['stealth_address'])
    this.schema.createIndex(this.tableName, ['status'])
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

### Access Tokens Migration

```typescript
// apps/api/database/migrations/003_create_vendor_access_tokens_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'vendor_access_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('vendor_id').unsigned().references('id').inTable('vendors').onDelete('CASCADE')
      table.string('type').notNullable()
      table.string('name').nullable()
      table.string('hash').notNullable()
      table.text('abilities').notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
      table.timestamp('last_used_at').nullable()
      table.timestamp('expires_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

---

## API Routes

```typescript
// apps/api/start/routes.ts
import router from '@adonisjs/core/services/router'
import transmit from '@adonisjs/transmit/services/main'
import { middleware } from '#start/kernel'
import limiter from '@adonisjs/limiter/services/main'

const VendorsController = () => import('#controllers/vendors_controller')
const ReceiptsController = () => import('#controllers/receipts_controller')
const AuthController = () => import('#controllers/auth_controller')
const WebhooksController = () => import('#controllers/webhooks_controller')

// Register Transmit routes for SSE
transmit.registerRoutes()

// Health check
router.get('/health', async () => ({ status: 'ok' }))

// Auth routes with rate limiting
// Limit: 5 requests per minute per IP for nonce, 3 for verify
router.post('/auth/nonce', [AuthController, 'nonce'])
  .use(limiter.define('auth:nonce', (ctx) => limiter.allowRequests(5).every('1 minute').usingKey(ctx.request.ip())))
router.post('/auth/verify', [AuthController, 'verify'])
  .use(limiter.define('auth:verify', (ctx) => limiter.allowRequests(3).every('1 minute').usingKey(ctx.request.ip())))
router.delete('/auth/logout', [AuthController, 'logout']).use(middleware.auth())

// Public vendor routes
router.get('/vendors/:slug', [VendorsController, 'show'])

// Protected vendor routes
router.group(() => {
  router.get('/me', [VendorsController, 'me'])
  router.put('/me', [VendorsController, 'update'])
  router.get('/me/receipts', [ReceiptsController, 'index'])
  router.get('/me/receipts/export', [ReceiptsController, 'export'])
}).prefix('/vendors').use(middleware.auth())

// Vendor registration (no auth required)
router.post('/vendors', [VendorsController, 'store'])

// Receipt routes
router.post('/receipts', [ReceiptsController, 'store'])
router.get('/receipts/:id', [ReceiptsController, 'show'])
router.post('/receipts/:id/sign', [ReceiptsController, 'sign']).use(middleware.auth())

// Verification
router.post('/verify', [ReceiptsController, 'verify'])

// Ponder webhook (payment detection)
router.post('/webhooks/ponder', [WebhooksController, 'ponder'])

// Jobs dashboard (protected)
router.jobs('/admin/jobs').use(middleware.auth())
```

---

## Controllers

### Auth Controller

```typescript
// apps/api/app/controllers/auth_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import redis from '@adonisjs/redis/services/main'
import Vendor from '#models/vendor'
import { verifyMessage } from 'viem'
import { randomBytes } from 'node:crypto'

export default class AuthController {
  /**
   * Generate a nonce for wallet signature
   * Nonce is stored in Redis with 5-minute TTL to prevent replay attacks
   */
  async nonce({ request, response }: HttpContext) {
    const { walletAddress } = request.only(['walletAddress'])

    // Generate random nonce
    const nonce = randomBytes(16).toString('hex')
    const issuedAt = new Date().toISOString()

    // EIP-4361 style message (Sign-In With Ethereum inspired)
    const message = [
      'galeon.xyz wants you to sign in with your Ethereum account:',
      walletAddress,
      '',
      'Sign in to Galeon',
      '',
      `URI: https://galeon.xyz`,
      `Version: 1`,
      `Chain ID: 5003`, // Mantle testnet
      `Nonce: ${nonce}`,
      `Issued At: ${issuedAt}`,
    ].join('\n')

    // Store nonce in Redis with 5-minute TTL
    await redis.setex(
      `auth:nonce:${walletAddress.toLowerCase()}`,
      300, // 5 minutes
      JSON.stringify({ nonce, issuedAt, message })
    )

    return response.ok({ message, nonce })
  }

  /**
   * Verify wallet signature and issue access token
   */
  async verify({ request, response }: HttpContext) {
    const { walletAddress, signature } = request.only(['walletAddress', 'signature'])
    const walletLower = walletAddress.toLowerCase()

    // Retrieve stored nonce from Redis
    const storedData = await redis.get(`auth:nonce:${walletLower}`)
    if (!storedData) {
      return response.badRequest({ error: 'Nonce expired or not found. Request a new nonce.' })
    }

    const { message, nonce } = JSON.parse(storedData)

    // Delete nonce immediately to prevent replay
    await redis.del(`auth:nonce:${walletLower}`)

    // Verify the signature against the stored message
    const isValid = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    })

    if (!isValid) {
      return response.unauthorized({ error: 'Invalid signature' })
    }

    // Find vendor
    const vendor = await Vendor.findBy('walletAddress', walletLower)
    if (!vendor) {
      return response.notFound({ error: 'Vendor not found. Please register first.' })
    }

    // Create access token
    const token = await Vendor.accessTokens.create(vendor)

    return response.ok({
      type: 'bearer',
      token: token.value!.release(),
      vendor: {
        id: vendor.id,
        walletAddress: vendor.walletAddress,
        name: vendor.name,
        slug: vendor.slug,
      },
    })
  }

  /**
   * Logout - invalidate current token
   */
  async logout({ auth, response }: HttpContext) {
    const vendor = auth.user!
    await Vendor.accessTokens.delete(vendor, vendor.currentAccessToken.identifier)

    return response.ok({ message: 'Logged out successfully' })
  }
}
```

### Vendors Controller

```typescript
// apps/api/app/controllers/vendors_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import Vendor from '#models/vendor'
import { createVendorValidator, updateVendorValidator } from '#validators/vendor'

export default class VendorsController {
  /**
   * Register a new vendor
   */
  async store({ request, response }: HttpContext) {
    const data = await request.validateUsing(createVendorValidator)

    // Check if wallet already registered
    const existing = await Vendor.findBy('walletAddress', data.walletAddress.toLowerCase())
    if (existing) {
      return response.conflict({ error: 'Wallet already registered' })
    }

    // Check if slug is taken
    const slugExists = await Vendor.findBy('slug', data.slug.toLowerCase())
    if (slugExists) {
      return response.conflict({ error: 'Slug already taken' })
    }

    const vendor = await Vendor.create({
      walletAddress: data.walletAddress.toLowerCase(),
      name: data.name,
      slug: data.slug.toLowerCase(),
      stealthMetaAddress: data.stealthMetaAddress,
    })

    // Create access token
    const token = await Vendor.accessTokens.create(vendor)

    return response.created({
      vendor: {
        id: vendor.id,
        walletAddress: vendor.walletAddress,
        name: vendor.name,
        slug: vendor.slug,
        paymentLink: `https://galeon.xyz/pay/${vendor.slug}`,
      },
      token: {
        type: 'bearer',
        value: token.value!.release(),
      },
    })
  }

  /**
   * Get vendor by slug (public)
   */
  async show({ params, response }: HttpContext) {
    const vendor = await Vendor.findBy('slug', params.slug.toLowerCase())

    if (!vendor) {
      return response.notFound({ error: 'Vendor not found' })
    }

    return response.ok({
      name: vendor.name,
      slug: vendor.slug,
      stealthMetaAddress: vendor.stealthMetaAddress,
    })
  }

  /**
   * Get authenticated vendor profile
   */
  async me({ auth, response }: HttpContext) {
    const vendor = auth.user!

    await vendor.load('receipts', (query) => {
      query.orderBy('createdAt', 'desc').limit(5)
    })

    // Use Database.raw from Lucid services for raw SQL expressions
    const db = (await import('@adonisjs/lucid/services/db')).default
    const stats = await vendor.related('receipts').query()
      .select(
        db.raw('COUNT(*) as total_receipts'),
        db.raw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as pending', ['pending']),
        db.raw('SUM(amount) as total_amount')
      )
      .first()

    return response.ok({
      vendor: {
        id: vendor.id,
        walletAddress: vendor.walletAddress,
        name: vendor.name,
        slug: vendor.slug,
        paymentLink: `https://galeon.xyz/pay/${vendor.slug}`,
        createdAt: vendor.createdAt,
      },
      stats,
      recentReceipts: vendor.receipts,
    })
  }

  /**
   * Update vendor profile
   */
  async update({ auth, request, response }: HttpContext) {
    const vendor = auth.user!
    const data = await request.validateUsing(updateVendorValidator)

    if (data.slug && data.slug !== vendor.slug) {
      const slugExists = await Vendor.query()
        .where('slug', data.slug.toLowerCase())
        .whereNot('id', vendor.id)
        .first()

      if (slugExists) {
        return response.conflict({ error: 'Slug already taken' })
      }
    }

    vendor.merge({
      name: data.name ?? vendor.name,
      slug: data.slug?.toLowerCase() ?? vendor.slug,
    })

    await vendor.save()

    return response.ok({ vendor })
  }
}
```

### Webhooks Controller (Ponder Integration)

```typescript
// apps/api/app/controllers/webhooks_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import transmit from '@adonisjs/transmit/services/main'
import Vendor from '#models/vendor'
import Receipt from '#models/receipt'
import env from '#start/env'
import ProcessPayment from '#jobs/process_payment'

export default class WebhooksController {
  /**
   * Handle Ponder webhook for new payments
   */
  async ponder({ request, response }: HttpContext) {
    // Verify webhook secret
    const secret = request.header('x-ponder-secret')
    if (secret !== env.get('PONDER_WEBHOOK_SECRET')) {
      return response.unauthorized({ error: 'Invalid webhook secret' })
    }

    const { event, data } = request.only(['event', 'data'])

    if (event === 'StealthPayment') {
      const { stealthAddress, ephemeralPubKey, amount, token, receiptHash, txHash, blockNumber, timestamp } = data

      // Find receipt by hash
      const receipt = await Receipt.findBy('receiptHash', receiptHash)

      if (receipt) {
        // Idempotency check: skip if already confirmed
        if (receipt.status !== 'pending') {
          return response.ok({ received: true, skipped: true, reason: 'already_processed' })
        }

        // Update receipt with blockchain data
        receipt.merge({
          txHash,
          anchorBlock: blockNumber,
          status: 'confirmed',
          detectedAt: new Date(timestamp * 1000),
        })
        await receipt.save()

        // Load vendor for notification
        await receipt.load('vendor')

        // Broadcast to vendor's dashboard via SSE
        transmit.broadcast(`vendor/${receipt.vendor.id}/payments`, {
          type: 'payment_confirmed',
          receipt: {
            id: receipt.receiptId,
            amount: receipt.amount,
            currency: receipt.currency,
            status: receipt.status,
            txHash: receipt.txHash,
          },
        })

        // Queue background job for additional processing
        await ProcessPayment.dispatch({
          receiptId: receipt.id,
          txHash,
        })
      }
    }

    return response.ok({ received: true })
  }
}
```

---

## Background Jobs

### Process Payment Job

```typescript
// apps/api/app/jobs/process_payment.ts
import { Job } from 'adonisjs-jobs'
import Receipt from '#models/receipt'

interface ProcessPaymentPayload {
  receiptId: number
  txHash: string
}

export default class ProcessPayment extends Job {
  static queue = 'payments'

  async handle({ receiptId, txHash }: ProcessPaymentPayload) {
    const receipt = await Receipt.find(receiptId)
    if (!receipt) return

    // Fetch additional data from chain if needed
    // e.g., verify transaction, get block confirmations

    console.log(`Processing payment ${receipt.receiptId} with tx ${txHash}`)

    // Could also trigger FX rate fetch job here
  }
}
```

### Fetch FX Rate Job

```typescript
// apps/api/app/jobs/fetch_fx_rate.ts
import { Job } from 'adonisjs-jobs'

interface FetchFxRatePayload {
  currency: 'MNT' | 'USDC'
  receiptId: number
}

export default class FetchFxRate extends Job {
  static queue = 'fx-rates'

  async handle({ currency, receiptId }: FetchFxRatePayload) {
    try {
      // Fetch from CoinGecko
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${currency === 'USDC' ? 'usd-coin' : 'mantle'}&vs_currencies=cop`
      )
      const data = await response.json()

      // Store rate with receipt or in separate table
      console.log(`FX rate for ${currency}: ${JSON.stringify(data)}`)
    } catch (error) {
      console.error('Failed to fetch FX rate:', error)
      // Could retry or mark for manual entry
    }
  }
}
```

---

## Real-time with Transmit (SSE)

### Server Setup

```typescript
// apps/api/start/transmit.ts
import transmit from '@adonisjs/transmit/services/main'

// NOTE: transmit.registerRoutes() is called in routes.ts to avoid duplication

// Authorize channel subscriptions
transmit.authorizeChannel<{ vendorId: string }>('vendor/:vendorId/payments', (ctx, { vendorId }) => {
  // Only allow vendor to subscribe to their own channel
  return ctx.auth.user?.id === Number(vendorId)
})
```

### Frontend Client

```typescript
// apps/web/lib/transmit.ts
import { Transmit } from '@adonisjs/transmit-client'

export const transmit = new Transmit({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333',
})

export function subscribeToPayments(vendorId: number, onPayment: (data: any) => void) {
  const subscription = transmit.subscription(`vendor/${vendorId}/payments`)

  subscription.onMessage((data) => {
    onPayment(data)
  })

  subscription.create()

  return () => {
    subscription.delete()
  }
}
```

### React Hook

```typescript
// apps/web/hooks/usePaymentStream.ts
'use client'

import { useEffect, useState } from 'react'
import { subscribeToPayments } from '@/lib/transmit'

interface Payment {
  id: string
  amount: string
  currency: string
  status: string
  txHash: string
}

export function usePaymentStream(vendorId: number | null) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!vendorId) return

    const unsubscribe = subscribeToPayments(vendorId, (data) => {
      if (data.type === 'payment_confirmed') {
        setPayments((prev) => [data.receipt, ...prev])
      }
    })

    setConnected(true)

    return () => {
      unsubscribe()
      setConnected(false)
    }
  }, [vendorId])

  return { payments, connected }
}
```

---

## Validators (VineJS)

```typescript
// apps/api/app/validators/vendor.ts
import vine from '@vinejs/vine'

export const createVendorValidator = vine.compile(
  vine.object({
    walletAddress: vine.string().regex(/^0x[a-fA-F0-9]{40}$/),
    name: vine.string().maxLength(255).optional(),
    slug: vine.string().minLength(3).maxLength(100).regex(/^[a-z0-9-]+$/),
    stealthMetaAddress: vine.string().minLength(100), // Encoded meta-address
  })
)

export const updateVendorValidator = vine.compile(
  vine.object({
    name: vine.string().maxLength(255).optional(),
    slug: vine.string().minLength(3).maxLength(100).regex(/^[a-z0-9-]+$/).optional(),
  })
)
```

```typescript
// apps/api/app/validators/receipt.ts
import vine from '@vinejs/vine'

export const createReceiptValidator = vine.compile(
  vine.object({
    vendorSlug: vine.string(),
    amount: vine.string(),
    currency: vine.enum(['MNT', 'USDC']),
    description: vine.string().maxLength(500).optional(),
    stealthAddress: vine.string().regex(/^0x[a-fA-F0-9]{40}$/),
    ephemeralPubkey: vine.string(),
    receiptHash: vine.string().regex(/^0x[a-fA-F0-9]{64}$/),
    payerAddress: vine.string().regex(/^0x[a-fA-F0-9]{40}$/),
    payerSignature: vine.string(),
  })
)
```

---

## Deployment v2

### Railway Setup

```bash
# Create Railway project
railway login
railway init

# Add services
railway add --name api        # AdonisJS
railway add --name postgres   # PostgreSQL
railway add --name redis      # Redis
railway add --name ponder     # Ponder indexer
```

### Railway Environment Variables

```env
# api service
NODE_ENV=production
PORT=3333
HOST=0.0.0.0
APP_KEY=${{secrets.APP_KEY}}
DB_HOST=${{postgres.RAILWAY_PRIVATE_DOMAIN}}
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=${{postgres.POSTGRES_PASSWORD}}
DB_DATABASE=railway
REDIS_HOST=${{redis.RAILWAY_PRIVATE_DOMAIN}}
REDIS_PORT=6379
PONDER_WEBHOOK_SECRET=${{secrets.PONDER_WEBHOOK_SECRET}}
```

### Deployment Commands

```bash
# Deploy API to Railway
cd apps/api
railway up

# Run migrations
railway run node ace migration:run

# Deploy frontend to Vercel
cd ../web
vercel --prod
```

### Deployment Summary v2

| Service | Platform | URL |
|---------|----------|-----|
| **Next.js** (frontend) | Vercel | galeon.vercel.app |
| **AdonisJS** (API) | Railway | api.galeon.xyz |
| **PostgreSQL** | Railway | (internal) |
| **Redis** | Railway | (internal) |
| **Ponder** (indexer) | Railway | ponder.galeon.xyz |
| **Contract** | Mantle Testnet | explorer.testnet.mantle.xyz |

---

## Development Workflow

### Option A: Use Railway for Dev Databases (Recommended)

Railway provides free PostgreSQL and Redis instances that work great for local dev.

```bash
# 1. Create Railway project with databases
railway login
railway init
railway add --database postgres
railway add --database redis

# 2. Get connection strings
railway variables

# 3. Copy to your galeon-api/.env file
# DB_HOST=xxx.railway.app
# REDIS_HOST=xxx.railway.app
```

### Option B: Install Locally (macOS)

```bash
# Install PostgreSQL
brew install postgresql@16
brew services start postgresql@16

# Create database
createdb galeon

# Install Redis
brew install redis
brew services start redis
```

### Local Development

Open 4 terminal windows, one for each repo:

```bash
# Terminal 1: galeon-api (AdonisJS)
cd galeon-api
node ace serve --watch

# Terminal 2: galeon-web (Next.js)
cd galeon-web
pnpm dev

# Terminal 3: galeon-indexer (Ponder)
cd galeon-indexer
pnpm dev

# Terminal 4: galeon-api job workers (optional)
cd galeon-api
node ace jobs:listen
```

### Environment Variables

Each repo needs its own `.env` file:

**galeon-api/.env** (see full list in "Environment Variables (.env)" section above)
```env
# Backend-specific - no NEXT_PUBLIC_ vars here
PORT=3333
HOST=localhost
DB_HOST=localhost
REDIS_HOST=localhost
# ... see AdonisJS Configuration section for full list
```

**galeon-web/.env.local**
```env
NEXT_PUBLIC_API_URL=http://localhost:3333
```

**galeon-indexer/.env**
```env
GALEON_API_WEBHOOK_URL=http://localhost:3333/webhooks/ponder
PONDER_WEBHOOK_SECRET=your-webhook-secret
```

---

## Week-by-Week Plan v2

### Week 1: Foundation (Dec 18-24)

| Day | Tasks |
|-----|-------|
| 1 | Monorepo setup, Railway PostgreSQL + Redis |
| 2 | AdonisJS project setup, models, migrations |
| 3 | Auth controller (wallet signature), Transmit setup |
| 4 | `lib/stealth/` - keypair generation, stealth address math |
| 5 | `GaleonRegistry.sol` + tests, deploy to Mantle testnet |
| 6 | Ponder setup, webhook to AdonisJS |
| 7 | Integration test: payment → Ponder → webhook → SSE |

**Week 1 Milestone:**
- AdonisJS API running with auth
- Stealth address math works (client-side)
- Contract deployed, Ponder indexing
- Real-time notifications working (Transmit SSE)

### Week 2: Frontend + Full Flow (Dec 25-31)

| Day | Tasks |
|-----|-------|
| 8 | Next.js setup, wagmi config, API client |
| 9 | `/setup` - vendor onboarding (stealth keys, registration) |
| 10 | `/pay/[slug]` - payment flow |
| 11 | `/dashboard` - vendor dashboard with SSE payments |
| 12 | Receipt signing, background jobs |
| 13 | E2E testing on Mantle testnet |
| 14 | Bug fixes, polish |

**Week 2 Milestone:**
- Full flow: Setup → Pay → Instant Detection → Receipt
- Dashboard updates in real-time
- Background jobs processing

### Week 3: Polish + Submission (Jan 1-7)

| Day | Tasks |
|-----|-------|
| 15 | USDC payment support |
| 16 | Receipt export (JSON/CSV), COP conversion |
| 17 | Error handling, loading states, edge cases |
| 18 | Deploy to Railway + Vercel production |
| 19 | Evidence bundle, README |
| 20 | Submission descriptions (8 tracks) |
| 21 | Submit! Buffer for issues |

---

## Key Differences from v1

| Feature | v1 | v2 |
|---------|----|----|
| Payment detection | Poll Ponder every 10s | Instant via SSE |
| Background processing | None | BullMQ workers |
| Scalability | Serverless limits | Horizontal scaling |
| Real-time UX | Delayed updates | Instant notifications |
| Auth | Signature per request | Access tokens (30 day) |
| Database | Drizzle ORM | Lucid ORM (richer features) |

---

## Resources

### AdonisJS
- Docs: https://docs.adonisjs.com
- Transmit (SSE): https://docs.adonisjs.com/guides/digging-deeper/transmit
- Lucid ORM: https://docs.adonisjs.com/guides/database/lucid
- Auth: https://docs.adonisjs.com/guides/authentication/access-tokens-guard

### adonisjs-jobs
- GitHub: https://github.com/kabbouchi/adonisjs-jobs
- Dashboard: Built-in at `/admin/jobs`

### Transmit Client
- npm: @adonisjs/transmit-client
- Docs: https://docs.adonisjs.com/guides/digging-deeper/transmit#transmit-client

---

*Last updated: December 24, 2025*
