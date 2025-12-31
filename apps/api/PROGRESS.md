# Backend (apps/api) Progress

> AdonisJS 6 API server
> Last updated: 2025-12-31

## Setup

- [x] Initialize AdonisJS 6
- [x] Configure PostgreSQL (Lucid)
- [x] Configure Redis
- [ ] Set up Transmit SSE
- [ ] Set up adonisjs-jobs (BullMQ)

## Phase 1: Dependencies & Config ✅

- [x] Install `@maximemrf/adonisjs-jwt`
- [x] Install `@adonisjs/redis`
- [x] Configure JWT guard (`config/auth.ts`)
- [x] Configure Redis (`config/redis.ts`)
- [x] Update environment variables (`start/env.ts`)
- [x] Add Redis provider to `adonisrc.ts`

## Phase 2: Database Migrations ✅

- [x] `0001_create_users_table.ts`
- [x] `0002_create_ports_table.ts` (+ `indexer_port_id`, `chain_id`, defaults)
- [x] `0003_create_collections_table.ts`
- [x] `0004_create_receipts_table.ts` (+ `user_id`, `fog_payment_id`, `is_fog_payment`)
- [x] `0005_create_settings_table.ts`
- [x] `0006_create_fog_payments_table.ts`

## Phase 3: Models ✅

- [x] User model (with unit + functional tests)
- [x] Port model (with unit + functional tests)
- [x] Receipt model (with unit + functional tests)
- [x] Collection model (with unit + functional tests)
- [x] FogPayment model (with unit tests, hop chain relationships)

## Phase 4: Services ✅

- [x] ChainService (multi-chain support, Alchemy RPC)
- [x] SiweService (Sign-In With Ethereum, with 14 unit tests)
- [x] StealthService (EIP-5564 stealth address operations)
- [x] CollectionService (batch collection processing)
- [x] RelayerService (on-chain transaction relay)

## Phase 5: Validators ✅

- [x] Auth validators (`auth.ts`)
- [x] Port validators (`port.ts`)
- [x] Collection validators (`collect.ts`)
- [x] Receipt validators (`receipt.ts`)
- [x] Webhook validators (`webhook.ts`)
- [x] Fog payment validators (`fog_payment.ts`)

## Phase 6: Middleware ✅

- [x] AuthMiddleware (JWT) - existing
- [x] RateLimitMiddleware (Redis sliding window)
- [x] SilentAuthMiddleware (optional auth)
- [x] WebhookAuthMiddleware (Alchemy HMAC verification)

## Phase 7: Controllers ✅

- [x] AuthController (SIWE + JWT, with 9 functional tests)
- [x] PortsController (CRUD)
- [x] ReceiptsController (queries + stats)
- [x] CollectionsController (initiate + execute)
- [x] WebhooksController (Alchemy + manual)
- [x] FogPaymentsController (CRUD, cancel, funding, hop-chain)

## Phase 8: Jobs ✅

- [x] Configure BullMQ (`adonisjs-jobs`)
- [x] ProcessPayment (stub)
- [x] ReconcilePayments (stub)
- [x] MonitorRelayer (stub)

> Job logic pending - stubs created with TODO comments

## Phase 9: Routes & Kernel ✅

- [x] Update `start/routes.ts` with RESTful routes (api/v1 versioning)
- [x] Update `start/kernel.ts` with middleware

## Phase 10: Environment ✅

- [x] Create `.env.example`
- [x] Final testing (85 tests passing)

## Test Coverage

**169 tests passing**

- Unit tests: SiweService (14), Models (47), FogPayment (18)
- Functional tests: AuthController (16), PortsController (35), ReceiptsController (24), Models (14+)

## API Endpoints (RESTful)

| Resource    | Method | Path                                 | Auth      | Description                  |
| ----------- | ------ | ------------------------------------ | --------- | ---------------------------- |
| Health      | GET    | `/`                                  | Public    | Health check                 |
| Auth        | GET    | `/api/v1/auth/nonce`                 | Public    | Get SIWE nonce               |
| Auth        | POST   | `/api/v1/auth/verify`                | Public    | Login (access + refresh JWT) |
| Auth        | POST   | `/api/v1/auth/refresh`               | Public    | Refresh access token         |
| Auth        | POST   | `/api/v1/auth/logout`                | JWT       | Logout (blacklist + revoke)  |
| Ports       | GET    | `/api/v1/ports`                      | JWT       | List ports                   |
| Ports       | POST   | `/api/v1/ports`                      | JWT       | Create port                  |
| Ports       | GET    | `/api/v1/ports/:id`                  | JWT       | Get port                     |
| Ports       | PATCH  | `/api/v1/ports/:id`                  | JWT       | Update port                  |
| Ports       | DELETE | `/api/v1/ports/:id`                  | JWT       | Archive port                 |
| Receipts    | GET    | `/api/v1/receipts`                   | JWT       | List receipts                |
| Receipts    | POST   | `/api/v1/receipts`                   | JWT       | Create pending receipt       |
| Receipts    | GET    | `/api/v1/receipts/stats`             | JWT       | Receipt statistics           |
| Receipts    | GET    | `/api/v1/receipts/:id`               | JWT       | Get receipt                  |
| Collections | GET    | `/api/v1/collections`                | JWT       | List collections             |
| Collections | POST   | `/api/v1/collections`                | JWT       | Initiate collection          |
| Collections | GET    | `/api/v1/collections/:id`            | JWT       | Get collection               |
| Collections | POST   | `/api/v1/collections/:id/execute`    | JWT       | Execute collection           |
| Webhooks    | POST   | `/api/v1/webhooks/alchemy`           | Webhook\* | Alchemy events               |
| Webhooks    | POST   | `/api/v1/webhooks/manual`            | Webhook\* | Manual announcement          |
| FogPayments | GET    | `/api/v1/fog-payments`               | JWT       | List fog payments            |
| FogPayments | POST   | `/api/v1/fog-payments`               | JWT       | Schedule fog payment         |
| FogPayments | GET    | `/api/v1/fog-payments/:id`           | JWT       | Get fog payment              |
| FogPayments | POST   | `/api/v1/fog-payments/:id/cancel`    | JWT       | Cancel pending payment       |
| FogPayments | PATCH  | `/api/v1/fog-payments/:id/funding`   | JWT       | Update funding info          |
| FogPayments | GET    | `/api/v1/fog-payments/:id/hop-chain` | JWT       | Get hop chain for compliance |

\*Webhook auth middleware pending

## Phase 11: Receipt Flow ✅

### Ponder Service ✅

- [x] Create `app/services/ponder_service.ts` (direct PostgreSQL connection)
- [x] Add Ponder DB env variables (`PONDER_DB_HOST`, `PONDER_DB_PORT`, etc.)
- [x] Add `ponder` connection to `config/database.ts`

### Receipt Creation Endpoint ✅

- [x] Add `createReceiptValidator` (validates txHash, portId, chainId)
- [x] Add `ReceiptsController.store` method
- [x] Add route `POST /api/v1/receipts`
- [x] Write tests for receipt creation (24 tests)

### Verification Job ✅

- [x] Create `VerifyReceiptsJob` (`app/jobs/verify_receipts.ts`)
- [x] Query pending receipts
- [x] Verify against Ponder indexer database
- [x] Fill in receipt data (stealthAddress, ephemeralPubKey, viewTag, amount, etc.)
- [x] Update status to confirmed

**Flow:** Frontend donates on-chain → Calls `POST /receipts` with txHash → Cronjob verifies against Ponder DB → Confirmed

### SSE Notifications (TODO)

- [ ] Notify user when receipt confirmed
- [ ] Notify user when receipt rejected

## Notes

- JWT authentication via `@maximemrf/adonisjs-jwt` (stateless, with Redis blacklist for logout)
- Refresh token support (7-day expiry, stored in database, deleted on logout)
- Access token: 15 minutes, Refresh token: 7 days
- SIWE (Sign-In With Ethereum) for wallet authentication
- Chain configuration via environment variables (CHAIN_ID, ALLOWED_CHAIN_IDS)
- All timestamps use `useTz: true` (TIMESTAMPTZ) for timezone awareness
- UUIDs for Port, Receipt, Collection IDs
- Bigints stored as `decimal(78, 0)` to handle wei values
- Alchemy RPC for Mantle mainnet
- Port model: `id` (UUID) is primary key for FK references; `indexerPortId` (bytes32 hex, nullable) links to Ponder indexer
- Viewing keys encrypted with APP_KEY via AdonisJS encryption service
