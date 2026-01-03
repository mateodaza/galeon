# Backend + Ponder Model Design

> Architecture for syncing blockchain indexer (Ponder) with AdonisJS backend
> Last updated: 2025-12-29

## Overview

This document defines how the **Ponder indexer** (public blockchain data) and **AdonisJS backend** (private user data) work together while maintaining privacy boundaries.

### MVP Scope Alignment

**Target Network:** Mantle Mainnet (5000) only. Sepolia (5003) has placeholder addresses and is not supported for production.

**Contract Addresses (Mainnet):**

```typescript
const CONTRACTS = {
  announcer: '0x8C04238c49e22EB687ad706bEe645698ccF41153', // ERC5564Announcer
  registry: '0xE6586103756082bf3E43D3BB73f9fE479f0BDc22', // ERC6538Registry
  galeon: '0x85F23B63E2a40ba74cD418063c43cE19bcbB969C', // GaleonRegistry
  tender: '0x29D52d01947d91e241e9c7A4312F7463199e488c', // GaleonTender
}
```

**What's MVP (Hackathon):**

- Ponder indexes blockchain events
- Backend stores port viewing keys (encrypted) + links events to users
- **Privacy Pool deposits tracked** (Port → Pool flow)
- Shipwreck reports are **client-generated** (JSON export)
- Collection recording is **client-reported** (optional backend tracking)

**What's Deferred (Post-Hackathon):**

- Backend-generated Shipwreck reports
- PDF export (MVP is JSON only)

> **Note:** The original "fog wallet" scheduled payments design has been replaced with the Privacy Pool architecture. See [FOG-SHIPWRECK-PLAN.md](./FOG-SHIPWRECK-PLAN.md) for the current approach using ZK proofs instead of backend-executed payments.

### Core Principles

1. **Ponder is public** - Anyone can query indexed blockchain events
2. **Backend is private** - Links events to users, stores **port** viewing keys, handles sessions
3. **Direct DB access** - Backend connects directly to Ponder's Postgres database (no webhooks)
4. **Session-based keys** - Port viewing keys encrypted with session-derived key
5. **Pool-based privacy** - Privacy Pool uses ZK proofs for sender privacy (no backend custody)

### Trust Model

| Component               | Trust Level  | Notes                               |
| ----------------------- | ------------ | ----------------------------------- |
| Port operations         | Self-custody | Keys never leave browser            |
| Privacy Pool deposit    | Self-custody | User signs transaction directly     |
| Privacy Pool withdrawal | Self-custody | ZK proof generated in browser       |
| Backend (Ponder sync)   | Read-only    | Only indexes public blockchain data |

> **Privacy Pool vs Old Fog Design:** The old "fog wallet" approach required backend custody for scheduled payments. The new Privacy Pool architecture keeps all keys client-side - the backend only indexes public events for UI convenience.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BLOCKCHAIN (Mantle)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ERC5564       │  │ERC6538       │  │GaleonRegistry│  │GaleonTender  │     │
│  │Announcer     │  │Registry      │  │              │  │              │     │
│  └──────┬───────┘  └──────────────┘  └──────┬───────┘  └──────────────┘     │
│         │ Announcement                      │ PortRegistered                │
│         │ events                            │ ReceiptAnchored               │
└─────────┼───────────────────────────────────┼───────────────────────────────┘
          │                                   │
          ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PONDER INDEXER (Public)                             │
│                                                                             │
│  PostgreSQL Database                                                        │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                   │
│  │ announcements │  │ ports         │  │ receipts      │                   │
│  │ (raw events)  │  │ (on-chain)    │  │ (anchored)    │                   │
│  └───────────────┘  └───────────────┘  └───────────────┘                   │
│                                                                             │
│  GraphQL API (public, read-only)                                            │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          │ Direct DB connection (read-only)
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ADONISJS BACKEND (Private)                           │
│                                                                             │
│  PostgreSQL Database (separate)                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌─────────────┐  │
│  │ users         │  │ ports         │  │ receipts      │  │ sessions    │  │
│  │ (wallet auth) │  │ (user-linked) │  │ (enriched)    │  │ (auth)      │  │
│  └───────────────┘  └───────────────┘  └───────────────┘  └─────────────┘  │
│                                                                             │
│  REST API (authenticated)                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          │ SSE (Transmit) for real-time updates
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Next.js)                                │
│  - Collection: scans payments using viewing key                             │
│  - Payment: generates stealth addresses, signs transactions                 │
│  - Pool: deposits to Privacy Pool, generates ZK proofs for withdrawal       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Ponder Schema (Public)

Ponder indexes raw blockchain events. Anyone can query these.

### `announcements` table

Indexed from `ERC5564Announcer.Announcement` events.

```typescript
// ponder/schema.ts
import { createSchema } from '@ponder/core'

export default createSchema((p) => ({
  announcements: p.createTable({
    // Primary key: txHash + logIndex
    id: p.string(),

    // Event data (from topics)
    schemeId: p.bigint(),
    stealthAddress: p.hex(),
    caller: p.hex(), // payer address

    // Event data (from log data)
    ephemeralPubKey: p.hex(), // 33 bytes compressed
    metadata: p.hex(), // viewTag (1) + receiptHash (32) + optional token data

    // Parsed metadata
    viewTag: p.int(), // first byte of metadata (0-255)
    receiptHash: p.hex().optional(), // bytes 1-33 of metadata

    // Block context
    blockNumber: p.bigint(),
    blockTimestamp: p.bigint(),
    transactionHash: p.hex(),
    logIndex: p.int(),

    // Chain
    chainId: p.int(),
  }),

  ports: p.createTable({
    // Primary key: portId (bytes32)
    id: p.hex(), // portId from chain

    // Event data
    owner: p.hex(),
    name: p.string(),
    stealthMetaAddress: p.hex(), // 66 bytes
    active: p.boolean(),

    // Block context
    blockNumber: p.bigint(),
    blockTimestamp: p.bigint(),
    transactionHash: p.hex(),

    chainId: p.int(),
  }),

  receiptsAnchored: p.createTable({
    // Primary key: txHash + logIndex
    id: p.string(),

    // Event data
    stealthAddress: p.hex(),
    receiptHash: p.hex(), // bytes32
    payer: p.hex(),
    amount: p.bigint(),
    token: p.hex(), // address(0) for native
    timestamp: p.bigint(),

    // Block context
    blockNumber: p.bigint(),
    transactionHash: p.hex(),
    logIndex: p.int(),

    chainId: p.int(),
  }),
}))
```

### Ponder Event Handlers

```typescript
// ponder/src/GaleonRegistry.ts
import { ponder } from '@/generated'

ponder.on('ERC5564Announcer:Announcement', async ({ event, context }) => {
  const { schemeId, stealthAddress, caller, ephemeralPubKey, metadata } = event.args

  // Parse metadata
  const viewTag = parseInt(metadata.slice(0, 4), 16) // first byte
  const receiptHash = metadata.length >= 68 ? `0x${metadata.slice(4, 68)}` : undefined

  await context.db.announcements.create({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    schemeId,
    stealthAddress,
    caller,
    ephemeralPubKey,
    metadata,
    viewTag,
    receiptHash,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    chainId: context.network.chainId,
  })
})

ponder.on('GaleonRegistry:PortRegistered', async ({ event, context }) => {
  const { owner, portId, name, stealthMetaAddress } = event.args

  await context.db.ports.create({
    id: portId,
    owner,
    name,
    stealthMetaAddress,
    active: true,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    chainId: context.network.chainId,
  })
})

ponder.on('GaleonRegistry:PortDeactivated', async ({ event, context }) => {
  const { portId } = event.args

  await context.db.ports.update({
    id: portId,
    data: { active: false },
  })
})

ponder.on('GaleonRegistry:ReceiptAnchored', async ({ event, context }) => {
  const { stealthAddress, receiptHash, payer, amount, token, timestamp } = event.args

  await context.db.receiptsAnchored.create({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    stealthAddress,
    receiptHash,
    payer,
    amount,
    token,
    timestamp,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    chainId: context.network.chainId,
  })
})
```

---

## Backend Schema (Private)

Backend stores user-linked data and enriched receipts.

### Database Migrations

```typescript
// apps/api/database/migrations/*_users.ts (existing table)
// Already has: id, wallet_address, created_at, updated_at
// Note: All keys stay client-side - backend only indexes public blockchain data

// Note: JWT refresh tokens already stored in jwt_refresh_tokens table via AdonisJS auth

// apps/api/database/migrations/*_ports.ts
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('ports', (table) => {
      table.uuid('id').primary()
      table.integer('user_id').notNullable().references('users.id').onDelete('CASCADE')

      // Chain data (from Ponder)
      table.string('port_id').notNullable().unique() // bytes32 hex from chain
      table.string('stealth_meta_address').notNullable()
      table.bigInteger('chain_id').notNullable().defaultTo(5000)

      // User metadata (not on chain)
      table.string('name').notNullable()
      table.enum('type', ['permanent', 'recurring', 'one-time', 'burner']).defaultTo('permanent')

      // Encrypted viewing key (user can decrypt with session)
      table.text('viewing_key_encrypted').notNullable()
      table.text('viewing_key_nonce').notNullable()

      // Status
      table.boolean('active').defaultTo(true)
      table.boolean('archived').defaultTo(false)
      table.timestamp('archived_at').nullable()

      // Stats (aggregated from receipts)
      table.decimal('total_received', 78, 0).defaultTo(0) // wei
      table.decimal('total_collected', 78, 0).defaultTo(0)
      table.integer('payment_count').defaultTo(0)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Index for fast lookups
      table.index(['user_id'])
      table.index(['port_id'])
    })
  }
}

// apps/api/database/migrations/*_receipts.ts
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('receipts', (table) => {
      table.uuid('id').primary()
      table.uuid('port_id').nullable().references('ports.id').onDelete('SET NULL')
      table.uuid('collection_id').nullable().references('collections.id').onDelete('SET NULL')
      table.integer('user_id').nullable().references('users.id').onDelete('SET NULL') // For pool withdrawals

      // Chain data (from Ponder)
      table.string('receipt_hash').notNullable().unique() // bytes32 from ReceiptAnchored
      table.string('stealth_address').notNullable()
      table.string('ephemeral_pub_key').notNullable()
      table.integer('view_tag').notNullable() // 0-255
      table.string('payer_address').notNullable()
      table.decimal('amount', 78, 0).notNullable() // wei
      table.string('currency').notNullable() // 'MNT' or 'ERC20'
      table.string('token_address').nullable()
      table.string('tx_hash').notNullable().unique()
      table.bigInteger('block_number').notNullable()
      table.bigInteger('chain_id').notNullable().defaultTo(5000)

      // User metadata (not on chain)
      table.text('memo').nullable() // Decrypted memo if available
      table.boolean('is_pool_withdrawal').defaultTo(false) // Privacy Pool withdrawal indicator

      // Status
      table.enum('status', ['pending', 'confirmed', 'collected']).defaultTo('pending')
      table.timestamp('collected_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Indexes
      table.index(['port_id'])
      table.index(['user_id'])
      table.index(['status'])
      table.index(['payer_address'])
    })
  }
}

// apps/api/database/migrations/*_collections.ts
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('collections', (table) => {
      table.uuid('id').primary()
      table.integer('user_id').notNullable().references('users.id').onDelete('CASCADE')

      table.string('recipient_wallet').notNullable()
      table.enum('status', ['pending', 'processing', 'completed', 'failed']).defaultTo('pending')

      table.integer('total_receipts').defaultTo(0)
      table.integer('processed_receipts').defaultTo(0)
      table.decimal('total_amount', 78, 0).defaultTo(0)
      table.jsonb('token_amounts').defaultTo('{}') // { tokenAddress: amount }

      table.string('tx_hash').nullable()
      table.text('error_message').nullable()

      table.timestamp('completed_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }
}
```

---

## Data Flow

### 1. Port Registration Flow

```
┌──────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────┐
│ Frontend │────▶│ Backend  │────▶│ Blockchain   │────▶│ Ponder   │
│          │     │          │     │              │     │          │
│ 1. Create│     │ 2. Store │     │ 3. Emit      │     │ 4. Index │
│    Port  │     │   locally│     │ PortRegistered    │   event  │
└──────────┘     └──────────┘     └──────────────┘     └──────────┘
                      ▲                                      │
                      │         5. Verify & update          │
                      └──────────────────────────────────────┘
```

**Step by step:**

1. Frontend generates stealth keys, encrypts viewing key with session key
2. Backend creates Port record with `viewing_key_encrypted`
3. Frontend sends `registerPort` transaction to GaleonRegistry
4. Ponder indexes `PortRegistered` event
5. Backend periodically verifies ports against Ponder (or on-demand)

### 2. Payment Flow

```
┌──────────┐     ┌──────────────┐     ┌──────────┐     ┌──────────┐
│ Payer    │────▶│ Blockchain   │────▶│ Ponder   │────▶│ Backend  │
│          │     │              │     │          │     │          │
│ 1. Send  │     │ 2. Emit      │     │ 3. Index │     │ 4. Match │
│  payment │     │ Announcement │     │   event  │     │  to port │
│          │     │ +ReceiptAnch.│     │          │     │          │
└──────────┘     └──────────────┘     └──────────┘     └──────────┘
                                                             │
                                                             ▼
                                                       ┌──────────┐
                                                       │ Notify   │
                                                       │ vendor   │
                                                       │ (if sess)│
                                                       └──────────┘
```

**Step by step:**

1. Payer calls `payNative` or `payToken` on GaleonRegistry
2. Contract emits `Announcement` (ERC5564) and `ReceiptAnchored` (Galeon)
3. Ponder indexes both events
4. Backend reads new events from Ponder DB, matches `receiptHash` to ports
5. If vendor has active session, send SSE notification

### 3. Collection Flow (Frontend Executes, Backend Records)

```
┌──────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────┐
│ Frontend │────▶│ Ponder   │────▶│ Frontend     │────▶│ Backend  │
│          │     │ GraphQL  │     │              │     │          │
│ 1. Query │     │          │     │ 2. Scan with │     │ 5. Record│
│  announce│     │          │     │  viewing key │     │  for     │
│          │     │          │     │              │     │ Shipwreck│
└──────────┘     └──────────┘     │ 3. Sign txs  │     └──────────┘
                                   │  & collect  │
                                   └──────────────┘
                                         │
                                         ▼
                                   ┌──────────────┐
                                   │ 4. Blockchain│
                                   │ GaleonTender │
                                   └──────────────┘
```

**Frontend executes, Backend records:**

1. Frontend queries Ponder for announcements
2. Frontend decrypts viewing key from session, scans payments
3. Frontend derives stealth private keys, signs collection transaction
4. Batch collect via GaleonTender (or individual transfers)
5. **Frontend reports collection to backend for Shipwreck tracking**

The backend doesn't execute collections (no private keys server-side), but it **must record** them for:

- Shipwreck compliance reports
- Collection history/stats
- Receipt status updates (`status: 'collected'`)

---

## Session & Viewing Key Management

### Current Auth Flow (JWT + SIWE)

The auth system already uses JWT with SIWE. From `auth_controller.ts`:

```typescript
// Existing flow - POST /auth/verify
async verify({ request, response, auth }: HttpContext) {
  const { message, signature } = await verifySignatureValidator.validate(request.body())

  // Verify the SIWE signature
  const walletAddress = await SiweService.verify(message, signature)

  // Find or create user
  let user = await User.findBy('walletAddress', walletAddress.toLowerCase())
  if (!user) {
    user = await User.create({ walletAddress: walletAddress.toLowerCase() })
  }

  // Generate JWT access token (short-lived)
  const accessToken = await auth.use('jwt').generate(user)

  // Generate refresh token (7 days, stored in jwt_refresh_tokens table)
  const refreshToken = await User.refreshTokens.create(user)

  return response.ok({
    user: { id: user.id, walletAddress: user.walletAddress, createdAt: user.createdAt },
    accessToken: (accessToken as { token: string }).token,
    refreshToken: refreshToken.value!.release(),
  })
}
```

### ~~Fog Keys Storage (Scheduled Payments)~~ - DEPRECATED

> ⚠️ **DEPRECATED:** This section describes the old "fog wallet" scheduled payments design which has been replaced by the Privacy Pool architecture. The backend no longer stores or executes fog payments. See [FOG-SHIPWRECK-PLAN.md](./FOG-SHIPWRECK-PLAN.md) for the current ZK-based approach.

<details>
<summary>Archived fog payments design (click to expand)</summary>

Backend fog key storage enables **scheduled payments**. Each scheduled payment gets its own isolated fog session with encrypted keys specific to that payment.

**Design: Per-Payment Fog Sessions (Option B)**

```
User
 └── FogPayment (for payment 1, keys + payment details, expires after execution)
 └── FogPayment (for payment 2, keys + payment details, expires after execution)
 └── FogPayment (for payment 3, keys + payment details, expires after execution)
```

**Benefits:**

- Each scheduled payment has isolated keys
- Compromise of one doesn't affect others
- Simpler mental model - one record per scheduled payment
- Keys are deleted immediately after execution

**fog_payments table** (each record is one scheduled payment with its own encrypted keys)

```typescript
// apps/api/database/migrations/*_fog_payments.ts
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('fog_payments', (table) => {
      table.uuid('id').primary()
      table.integer('user_id').notNullable().references('users.id').onDelete('CASCADE')

      // Fog wallet info
      table.string('fog_address', 42).notNullable() // The stealth address of fog wallet
      table.integer('fog_index').notNullable() // Index used with deriveFogKeys()

      // Encrypted fog keys for THIS payment only (encrypted with backend's pubkey)
      // Contains: { spendingPrivateKey, viewingPrivateKey, ephemeralPrivateKey }
      table.text('fog_keys_encrypted').notNullable()
      table.text('fog_keys_nonce').notNullable()

      // Recipient details (Bob's stealth address info)
      table.string('recipient_stealth_address', 42).notNullable()
      table.text('recipient_ephemeral_pub_key').notNullable() // 33 bytes hex
      table.smallint('recipient_view_tag').notNullable() // 0-255
      table.string('receipt_hash', 66).notNullable() // bytes32, matches computeReceiptHash()

      // Payment amount
      table.decimal('amount', 78, 0).notNullable() // wei
      table.string('token_address', 42).nullable() // null for native MNT

      // Time bounds
      table.timestamp('send_at', { useTz: true }).notNullable() // When to execute
      table.timestamp('expires_at', { useTz: true }).notNullable() // Max execution time

      // User's signed authorization (proves user authorized this specific payment)
      table.text('user_signature').notNullable()
      table.text('authorization_message').notNullable() // The message that was signed

      // Execution status
      table
        .enum('status', ['pending', 'processing', 'executed', 'failed', 'expired', 'cancelled'])
        .notNullable()
        .defaultTo('pending')
      table.string('tx_hash', 66).nullable() // Set on successful execution
      table.timestamp('executed_at', { useTz: true }).nullable()
      table.text('error_message').nullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      // Indexes
      table.index(['user_id'])
      table.index(['status'])
      table.index(['send_at']) // For job scheduling
      table.index(['status', 'send_at']) // Find pending payments due for execution
    })
  }
}
```

**Key Differences from Previous Design:**

| Aspect        | Old (fog_sessions + fog_delegations)   | New (fog_payments)               |
| ------------- | -------------------------------------- | -------------------------------- |
| Tables        | 2 tables with FK relationship          | 1 table                          |
| Keys per user | Shared across delegations              | Isolated per payment             |
| Key lifetime  | Session duration (7-30 days)           | Until payment executes           |
| Complexity    | Higher (manage sessions + delegations) | Lower (one record = one payment) |
| Security      | Session compromise affects all         | Each payment isolated            |

### Fog Payment Encryption Details

```typescript
// Encryption scheme: ECIES with secp256k1 + AES-256-GCM
// Backend generates a keypair at deploy time (stored in env vars)

interface FogPaymentEncryption {
  // Frontend encrypts fog keys to backend's public key
  scheme: 'ecies-secp256k1-aes256gcm'

  // Per-payment random values
  nonce: Uint8Array // 12 bytes, unique per payment

  // What's encrypted (specific to this fog wallet)
  plaintext: {
    spendingPrivateKey: Uint8Array // 32 bytes - fog wallet spending key
    viewingPrivateKey: Uint8Array // 32 bytes - fog wallet viewing key
    ephemeralPrivateKey: Uint8Array // 32 bytes - used to derive fog stealth address
  }
}

// Backend decryption (in ProcessFogPayment job)
const fogKeys = await CryptoService.decryptFogPayment(
  fogPayment.fogKeysEncrypted,
  fogPayment.fogKeysNonce,
  env.get('FOG_ENCRYPTION_PRIVATE_KEY')
)
```

**Lifecycle:**

1. User creates fog wallet (frontend), funds it
2. User schedules payment → encrypts fog keys → `POST /fog/payments`
3. Backend stores `fog_payments` record with encrypted keys
4. Job executes at `send_at` → decrypts keys → sends payment
5. On success: status = 'executed', keys can be deleted
6. On failure: status = 'failed', user notified, can retry or cancel

### Fog Payment Funding Validation

Before executing a fog payment, the job validates the fog wallet has sufficient balance:

```typescript
// In ProcessFogPayment job
async validateFunding(fogPayment: FogPayment): Promise<{ valid: boolean; reason?: string }> {
  const fogAddress = fogPayment.fogAddress as `0x${string}`

  // Get current balance
  const balance = await publicClient.getBalance({ address: fogAddress })

  // Estimate gas for payment
  const gasEstimate = await publicClient.estimateGas({
    account: fogAddress,
    to: GALEON_REGISTRY_ADDRESS,
    value: BigInt(fogPayment.amount),
    data: encodeFunctionData({
      abi: galeonRegistryAbi,
      functionName: 'payNative',
      args: [/* ... */]
    })
  })

  const gasCost = gasEstimate * (await publicClient.getGasPrice())
  const requiredBalance = BigInt(fogPayment.amount) + gasCost

  if (balance < requiredBalance) {
    return {
      valid: false,
      reason: `Insufficient balance. Need ${formatEther(requiredBalance)} MNT, have ${formatEther(balance)} MNT`
    }
  }

  return { valid: true }
}

// If validation fails, mark fog payment as 'failed' and notify user
```

**Fog payment statuses:**

- `pending` - Waiting for `sendAt` time
- `processing` - Job is executing
- `executed` - Payment successful (has `txHash`)
- `failed` - Execution failed (has `errorMessage`)
- `expired` - Passed `expiresAt` without execution
- `cancelled` - User cancelled before execution

</details>

### Viewing Key Encryption (Frontend)

```typescript
// Frontend: Derive session key from wallet signature
async function deriveSessionKey(wallet: WalletClient): Promise<CryptoKey> {
  const message = 'Galeon Session Key Derivation v1'
  const signature = await wallet.signMessage({ message })

  // Use signature as key material for HKDF
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    hexToBytes(signature),
    { name: 'HKDF' },
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      salt: new Uint8Array(16),
      info: new TextEncoder().encode('galeon-session-v1'),
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// Encrypt viewing key before sending to backend
async function encryptViewingKey(
  viewingKey: Uint8Array,
  sessionKey: CryptoKey
): Promise<{ ciphertext: string; nonce: string }> {
  const nonce = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    sessionKey,
    viewingKey
  )

  return {
    ciphertext: bytesToHex(new Uint8Array(ciphertext)),
    nonce: bytesToHex(nonce),
  }
}
```

### Decrypting Viewing Key (Frontend)

```typescript
// Frontend: Decrypt viewing key when needed
async function decryptViewingKey(
  ciphertext: string,
  nonce: string,
  sessionKey: CryptoKey
): Promise<Uint8Array> {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: hexToBytes(nonce) },
    sessionKey,
    hexToBytes(ciphertext)
  )

  return new Uint8Array(plaintext)
}
```

---

## Pool Withdrawal Identification

Backend tracks Privacy Pool withdrawals for Shipwreck compliance reports.

### On-Chain Identification

```solidity
// Pool withdrawals emit events from the PrivacyPool contract
// The nullifier hash is public (prevents double-spend)
// The recipient stealth address is visible
// But the link to the deposit is cryptographically hidden (ZK proof)
```

### Backend Identification

```typescript
// Privacy Pool withdrawals are identified by the contract address
// Backend indexes PrivacyPool.Withdrawal events from Ponder

// Check if a payment came from Privacy Pool
async function isPoolWithdrawal(txHash: string): Promise<boolean> {
  // Check if tx interacted with PrivacyPool contract
  const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` })
  return receipt.to?.toLowerCase() === PRIVACY_POOL_ADDRESS.toLowerCase()
}
```

### Receipt Metadata

```typescript
// Backend: When creating receipt from Ponder sync
const isPoolWithdrawal = await isPoolWithdrawal(announcement.transactionHash)

const receipt = await Receipt.create({
  // ... other fields
  isPoolWithdrawal,
  // Note: For pool withdrawals, we don't know the original depositor (by design)
})
```

---

## Receipt Hash Schema Alignment

> **CRITICAL:** The receipt hash computation must be consistent across all implementations.

### Receipt Hash Computation

```typescript
import { keccak256, encodePacked } from 'viem'

function computeReceiptHash(
  memo: string,
  amount: bigint, // in wei
  portId?: `0x${string}` // Optional but recommended
): `0x${string}` {
  const memoOrDefault = memo || 'Galeon Payment'

  if (portId) {
    // With portId (recommended)
    return keccak256(
      encodePacked(['string', 'uint256', 'bytes32'], [memoOrDefault, amount, portId])
    )
  }

  // Without portId (legacy)
  return keccak256(encodePacked(['string', 'uint256'], [memoOrDefault, amount]))
}
```

### Metadata Format (Announcements)

| Bytes | Field       | Description                                |
| ----- | ----------- | ------------------------------------------ |
| 0     | viewTag     | Single byte for efficient scanning (0-255) |
| 1-32  | receiptHash | 32-byte keccak256 hash                     |
| 33-52 | token       | (Token payments only) ERC-20 address       |
| 53-84 | amount      | (Token payments only) uint256 amount       |

**Alignment with PRIVATE-SEND-SPEC:** When enriching receipts from Ponder, use the same `computeReceiptHash` function to verify receipt integrity.

---

## Backend-Ponder Sync Service

### Direct Database Access

```typescript
// apps/api/providers/ponder_provider.ts
import { Knex, knex } from 'knex'

export default class PonderProvider {
  private ponderDb: Knex

  constructor() {
    this.ponderDb = knex({
      client: 'pg',
      connection: {
        host: env.get('PONDER_DB_HOST'),
        port: env.get('PONDER_DB_PORT'),
        user: env.get('PONDER_DB_USER'),
        password: env.get('PONDER_DB_PASSWORD'),
        database: env.get('PONDER_DB_NAME'),
      },
      pool: { min: 0, max: 5 },
    })
  }

  // Query announcements since last sync
  async getNewAnnouncements(sinceBlock: bigint): Promise<PonderAnnouncement[]> {
    return this.ponderDb('announcements')
      .where('blockNumber', '>', sinceBlock.toString())
      .orderBy('blockNumber', 'asc')
      .orderBy('logIndex', 'asc')
  }

  // Query receipts anchored since last sync
  async getNewReceipts(sinceBlock: bigint): Promise<PonderReceipt[]> {
    return this.ponderDb('receiptsAnchored')
      .where('blockNumber', '>', sinceBlock.toString())
      .orderBy('blockNumber', 'asc')
  }

  // Get port by on-chain ID
  async getPort(portId: string): Promise<PonderPort | null> {
    return this.ponderDb('ports').where('id', portId).first()
  }
}
```

### Sync Job

```typescript
// apps/api/jobs/sync_ponder_job.ts
export default class SyncPonderJob {
  async handle() {
    const ponder = await app.container.make('ponder')
    const lastBlock = await this.getLastSyncedBlock()

    // Get new receipts from Ponder
    const newReceipts = await ponder.getNewReceipts(lastBlock)

    for (const ponderReceipt of newReceipts) {
      // Check if we already have this receipt
      const existing = await Receipt.findBy('receiptHash', ponderReceipt.receiptHash)
      if (existing) continue

      // Find matching announcement
      const announcement = await ponder.getAnnouncementByTx(ponderReceipt.transactionHash)
      if (!announcement) continue

      // Try to match to a port
      const port = await this.matchToPort(announcement, ponderReceipt)

      // Create receipt in backend
      await Receipt.create({
        receiptHash: ponderReceipt.receiptHash,
        stealthAddress: ponderReceipt.stealthAddress,
        ephemeralPubKey: announcement.ephemeralPubKey,
        viewTag: announcement.viewTag,
        payerAddress: ponderReceipt.payer,
        amount: ponderReceipt.amount.toString(),
        currency:
          ponderReceipt.token === '0x0000000000000000000000000000000000000000' ? 'MNT' : 'ERC20',
        tokenAddress:
          ponderReceipt.token === '0x0000000000000000000000000000000000000000'
            ? null
            : ponderReceipt.token,
        txHash: ponderReceipt.transactionHash,
        blockNumber: ponderReceipt.blockNumber.toString(),
        chainId: ponderReceipt.chainId,
        portId: port?.id,
        status: 'confirmed',
      })

      // Notify if vendor has active session
      if (port) {
        await this.notifyVendor(port, ponderReceipt)
      }
    }

    await this.updateLastSyncedBlock(newReceipts)
  }

  private async matchToPort(
    announcement: PonderAnnouncement,
    receipt: PonderReceipt
  ): Promise<Port | null> {
    // The receiptHash links the payment to a specific port
    // This hash was generated by frontend before payment

    // Option 1: Look up by receiptHash if frontend registered it
    const preRegistered = await Receipt.query()
      .where('receiptHash', receipt.receiptHash)
      .whereNull('txHash') // Pre-registered but not yet confirmed
      .first()

    if (preRegistered) {
      return Port.find(preRegistered.portId)
    }

    // Option 2: This is an unexpected payment (no pre-registration)
    // We can still track it but can't link to a port without more info
    return null
  }
}
```

---

## Notification Flow

### Real-time SSE (Active Sessions Only)

```typescript
// apps/api/services/notification_service.ts
export default class NotificationService {
  @inject()
  declare transmit: Transmit

  async notifyPaymentReceived(port: Port, receipt: Receipt) {
    // Check if user has active session
    const session = await Session.query()
      .where('userId', port.userId)
      .where('active', true)
      .where('expiresAt', '>', DateTime.now().toSQL())
      .first()

    if (!session) return // No active session, skip notification

    // Send SSE to user's channel
    this.transmit.broadcast(`user/${port.userId}/payments`, {
      type: 'payment_received',
      data: {
        portId: port.id,
        portName: port.name,
        amount: receipt.amount,
        currency: receipt.currency,
        payer: receipt.payerAddress,
        txHash: receipt.txHash,
      },
    })
  }
}
```

---

## API Endpoints

### Ports

```
POST   /api/v1/ports              Create new port (store locally, user signs tx)
GET    /api/v1/ports              List user's ports
GET    /api/v1/ports/:id          Get port details
PATCH  /api/v1/ports/:id          Update port metadata
DELETE /api/v1/ports/:id          Archive port
```

### Receipts

```
GET    /api/v1/receipts           List receipts for user's ports
GET    /api/v1/receipts/stats     Aggregate stats
GET    /api/v1/receipts/:id       Get receipt details
```

### Collections (Frontend Executes, Backend Records for Shipwreck)

```
GET    /api/v1/collections              List user's collections
POST   /api/v1/collections              Create collection record (before tx)
GET    /api/v1/collections/:id          Get collection details
PATCH  /api/v1/collections/:id          Update status after tx completes
POST   /api/v1/collections/:id/complete Mark as completed with txHash
```

**Collection Flow:**

1. Frontend scans payments, selects receipts to collect
2. `POST /collections` - Backend creates collection record with `status: 'pending'`
3. Frontend signs and submits batch collection tx
4. `POST /collections/:id/complete` - Frontend reports txHash, backend marks `status: 'completed'`
5. Receipts updated to `status: 'collected'` with `collectedAt` timestamp

**Shipwreck uses this data for:**

- Collection history reports
- Proof of fund movement
- Audit trail with tx hashes

### Session

```
POST   /api/v1/auth/nonce         Get SIWE nonce
POST   /api/v1/auth/verify        Verify SIWE and create session
POST   /api/v1/auth/refresh       Refresh access token
POST   /api/v1/auth/logout        End session
```

### ~~Fog (Scheduled Payments)~~ - DEPRECATED

> ⚠️ **DEPRECATED:** Fog payment endpoints have been removed. Use Privacy Pool for sender privacy instead.

<details>
<summary>Archived fog endpoints (click to expand)</summary>

```
GET    /api/v1/fog/public-key          Get backend's encryption public key
POST   /api/v1/fog/payments            Create scheduled fog payment (upload encrypted keys + payment details)
GET    /api/v1/fog/payments            List user's scheduled payments
GET    /api/v1/fog/payments/:id        Get fog payment details
DELETE /api/v1/fog/payments/:id        Cancel pending fog payment
```

**Scheduled Payment Flow:**

1. User creates fog wallet (frontend), funds it with MNT
2. User encrypts fog keys with backend's public key
3. `POST /fog/payments` with encrypted keys + recipient + amount + time bounds + signature
4. Backend stores `fog_payments` record, queues ProcessFogPayment job for `sendAt` time
5. Job decrypts fog keys, executes payment, notifies user via SSE
6. Keys are deleted after execution (success or failure)

### Job Execution & Result Tracking

```typescript
// ProcessFogPayment job execution flow
async handle({ fogPaymentId }: { fogPaymentId: string }) {
  const fogPayment = await FogPayment.find(fogPaymentId)

  // 1. Validate pre-conditions
  if (fogPayment.status !== 'pending') return
  if (Date.now() < fogPayment.sendAt.getTime()) {
    // Requeue with delay
    return this.dispatch({ fogPaymentId }, { delay: fogPayment.sendAt.getTime() - Date.now() })
  }
  if (Date.now() > fogPayment.expiresAt.getTime()) {
    fogPayment.status = 'expired'
    await fogPayment.save()
    await this.clearEncryptedKeys(fogPayment) // Delete keys
    await this.notifyUser(fogPayment.userId, 'fog_payment_expired', { fogPaymentId })
    return
  }

  // 2. Validate funding
  const funding = await this.validateFunding(fogPayment)
  if (!funding.valid) {
    fogPayment.status = 'failed'
    fogPayment.errorMessage = funding.reason
    await fogPayment.save()
    await this.clearEncryptedKeys(fogPayment) // Delete keys
    await this.notifyUser(fogPayment.userId, 'fog_payment_failed', { fogPaymentId, reason: funding.reason })
    return
  }

  // 3. Mark as processing
  fogPayment.status = 'processing'
  await fogPayment.save()

  try {
    // 4. Decrypt fog keys and execute
    const fogKeys = await CryptoService.decryptFogPayment(
      fogPayment.fogKeysEncrypted,
      fogPayment.fogKeysNonce,
      env.get('FOG_ENCRYPTION_PRIVATE_KEY')
    )

    const txHash = await RelayerService.executeFogPayment({
      fogKeys,
      recipientStealthAddress: fogPayment.recipientStealthAddress,
      ephemeralPubKey: fogPayment.recipientEphemeralPubKey,
      viewTag: fogPayment.recipientViewTag,
      receiptHash: fogPayment.receiptHash,
      amount: BigInt(fogPayment.amount),
    })

    // 5. Update status on success
    fogPayment.status = 'executed'
    fogPayment.txHash = txHash
    fogPayment.executedAt = DateTime.now()
    await fogPayment.save()

    // 6. Clear encrypted keys (no longer needed)
    await this.clearEncryptedKeys(fogPayment)

    // 7. Notify user
    await this.notifyUser(fogPayment.userId, 'fog_payment_executed', { fogPaymentId, txHash })

    // 8. Log for audit
    await AuditLog.create({
      userId: fogPayment.userId,
      action: 'fog_payment_executed',
      details: { fogPaymentId, txHash, amount: fogPayment.amount },
    })

  } catch (error) {
    fogPayment.status = 'failed'
    fogPayment.errorMessage = error.message
    await fogPayment.save()
    await this.clearEncryptedKeys(fogPayment) // Delete keys even on failure
    await this.notifyUser(fogPayment.userId, 'fog_payment_failed', { fogPaymentId, reason: error.message })
  }
}

// Clear encrypted keys after execution (security: minimize key lifetime)
async clearEncryptedKeys(fogPayment: FogPayment) {
  fogPayment.fogKeysEncrypted = '' // Clear ciphertext
  fogPayment.fogKeysNonce = ''
  await fogPayment.save()
}
```

**How backend learns execution result:**

- Job directly executes tx via `RelayerService.executeFogPayment()`
- On success: stores `txHash` in fog payment record
- On failure: stores `errorMessage` in fog payment record
- Keys are cleared immediately after execution (win or lose)
- Ponder will later index the resulting Announcement event (independent verification)

</details>

---

## Privacy Considerations

### What's Public (Ponder)

- All blockchain events (Announcement, PortRegistered, ReceiptAnchored)
- stealth addresses
- ephemeral public keys
- receipt hashes
- amounts
- payer addresses
- port on-chain IDs

### What's Private (Backend)

- User ↔ Port relationships (who owns which port)
- Viewing keys (encrypted with session key)
- Port names and metadata
- Memo contents (if decrypted)
- Collection history

### Privacy Techniques

1. **Viewing Key Encryption**: Only frontend can decrypt (session key derived from wallet signature)
2. **No On-Chain User IDs**: Ports identified by bytes32, not user addresses
3. **Stealth Addresses**: Recipients invisible on-chain
4. **Privacy Pool**: ZK proofs break deposit-withdrawal links (client-side only)

---

## Shipwreck Integration

Shipwreck provides compliance reports with cryptographic proofs. Backend data enables:

### Report Data Sources

| Data               | Source                                    | Purpose                          |
| ------------------ | ----------------------------------------- | -------------------------------- |
| Payment receipts   | `receipts` table                          | Proof of payments received       |
| Collection history | `collections` table                       | Proof of fund movement           |
| Pool withdrawals   | `receipts.is_pool_withdrawal`             | Identify sender-private payments |
| Port ownership     | `ports` table                             | Link receipts to vendor          |
| Tx hashes          | `receipts.tx_hash`, `collections.tx_hash` | On-chain verification            |

### Report Endpoint

```typescript
// GET /api/v1/reports/shipwreck?portId=xxx&from=2025-01-01&to=2025-12-31
async shipwreckReport({ request, response, auth }: HttpContext) {
  const user = auth.user!
  const { portId, from, to } = request.qs()

  // Get all receipts for the port in date range
  const receipts = await Receipt.query()
    .whereHas('port', (q) => q.where('userId', user.id))
    .if(portId, (q) => q.where('portId', portId))
    .whereBetween('createdAt', [from, to])
    .preload('collection')

  // Get all collections in date range
  const collections = await Collection.query()
    .where('userId', user.id)
    .whereBetween('createdAt', [from, to])

  return response.ok({
    report: {
      period: { from, to },
      summary: {
        totalReceived: receipts.reduce((sum, r) => sum + BigInt(r.amount), 0n).toString(),
        totalCollected: collections.filter(c => c.status === 'completed')
          .reduce((sum, c) => sum + BigInt(c.totalAmount), 0n).toString(),
        receiptCount: receipts.length,
        collectionCount: collections.length,
        poolWithdrawalCount: receipts.filter(r => r.isPoolWithdrawal).length,
      },
      receipts: receipts.map(r => ({
        receiptHash: r.receiptHash,
        amount: r.amount,
        currency: r.currency,
        txHash: r.txHash,
        blockNumber: r.blockNumber,
        status: r.status,
        isPoolWithdrawal: r.isPoolWithdrawal,
        collectedAt: r.collectedAt,
        collectionTxHash: r.collection?.txHash,
      })),
      collections: collections.map(c => ({
        id: c.id,
        totalAmount: c.totalAmount,
        receiptCount: c.totalReceipts,
        txHash: c.txHash,
        status: c.status,
        completedAt: c.completedAt,
      })),
    },
  })
}
```

---

## Implementation Order

### Phase 1: Core Sync

- [ ] Set up Ponder with schema
- [ ] Backend direct DB connection to Ponder
- [ ] Sync job for new receipts
- [ ] Match receipts to ports

### Phase 2: Pool Events Indexing

- [ ] Add PrivacyPool events to Ponder schema (Deposit, Withdrawal)
- [ ] Index pool deposits and withdrawals
- [ ] Track pool withdrawal flag on receipts (`is_pool_withdrawal`)

### Phase 3: Collection Recording

- [ ] Collection endpoints (create, complete)
- [ ] Link receipts to collections
- [ ] Update receipt status on collection

### Phase 4: Notifications

- [ ] SSE setup with Transmit
- [ ] Payment notification on new receipt
- [ ] Pool deposit/withdrawal notifications
- [ ] Active session check before notify

### Phase 5: Shipwreck Data

- [ ] Shipwreck data endpoint (receipts + collections for date range)
- [ ] Include pool withdrawal metadata
- [ ] Client-generated reports use this data
