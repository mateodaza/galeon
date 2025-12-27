# Backend (apps/api) Progress

> AdonisJS 6 API server
> Last updated: 2025-12-27

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
- [x] `0002_create_ports_table.ts`
- [x] `0003_create_collections_table.ts`
- [x] `0004_create_receipts_table.ts`
- [x] `0005_create_settings_table.ts`

## Phase 3: Models ✅

- [x] User model (with unit + functional tests)
- [x] Port model (with unit + functional tests)
- [x] Receipt model (with unit + functional tests)
- [x] Collection model (with unit + functional tests)

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

**85 tests passing**

- Unit tests: SiweService (14), Models (47)
- Functional tests: AuthController (10), Models (14)

## API Endpoints (RESTful)

| Resource    | Method | Path                              | Auth      | Description                  |
| ----------- | ------ | --------------------------------- | --------- | ---------------------------- |
| Health      | GET    | `/`                               | Public    | Health check                 |
| Auth        | GET    | `/api/v1/auth/nonce`              | Public    | Get SIWE nonce               |
| Auth        | POST   | `/api/v1/auth/verify`             | Public    | Login (access + refresh JWT) |
| Auth        | POST   | `/api/v1/auth/refresh`            | Public    | Refresh access token         |
| Auth        | POST   | `/api/v1/auth/logout`             | JWT       | Logout (blacklist + revoke)  |
| Ports       | GET    | `/api/v1/ports`                   | JWT       | List ports                   |
| Ports       | POST   | `/api/v1/ports`                   | JWT       | Create port                  |
| Ports       | GET    | `/api/v1/ports/:id`               | JWT       | Get port                     |
| Ports       | PATCH  | `/api/v1/ports/:id`               | JWT       | Update port                  |
| Ports       | DELETE | `/api/v1/ports/:id`               | JWT       | Archive port                 |
| Receipts    | GET    | `/api/v1/receipts`                | JWT       | List receipts                |
| Receipts    | GET    | `/api/v1/receipts/stats`          | JWT       | Receipt statistics           |
| Receipts    | GET    | `/api/v1/receipts/:id`            | JWT       | Get receipt                  |
| Collections | GET    | `/api/v1/collections`             | JWT       | List collections             |
| Collections | POST   | `/api/v1/collections`             | JWT       | Initiate collection          |
| Collections | GET    | `/api/v1/collections/:id`         | JWT       | Get collection               |
| Collections | POST   | `/api/v1/collections/:id/execute` | JWT       | Execute collection           |
| Webhooks    | POST   | `/api/v1/webhooks/alchemy`        | Webhook\* | Alchemy events               |
| Webhooks    | POST   | `/api/v1/webhooks/manual`         | Webhook\* | Manual announcement          |

\*Webhook auth middleware pending

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
