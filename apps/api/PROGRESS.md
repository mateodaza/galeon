# Backend (apps/api) Progress

> AdonisJS 6 API server
> Last updated: 2025-12-27

## Setup

- [x] Initialize AdonisJS 6
- [x] Configure PostgreSQL (Lucid)
- [x] Configure Redis
- [ ] Set up Transmit SSE
- [ ] Set up adonisjs-jobs (BullMQ)

## Phase 1: Dependencies & Config

- [x] Install `@maximemrf/adonisjs-jwt`
- [x] Install `@adonisjs/redis`
- [x] Configure JWT guard (`config/auth.ts`)
- [x] Configure Redis (`config/redis.ts`)
- [x] Update environment variables (`start/env.ts`)
- [x] Add Redis provider to `adonisrc.ts`

## Phase 2: Database Migrations

- [x] `0001_create_users_table.ts`
- [x] `0002_create_ports_table.ts`
- [x] `0003_create_collections_table.ts`
- [x] `0004_create_receipts_table.ts`
- [x] `0005_create_settings_table.ts`

## Phase 3: Models

- [ ] User model
- [ ] Port model
- [ ] Receipt model
- [ ] Collection model

## Phase 4: Services

- [ ] ChainService
- [ ] SiweService
- [ ] StealthService
- [ ] CollectionService
- [ ] RelayerService

## Phase 5: Validators

- [ ] Auth validators (`auth_validator.ts`)
- [ ] Port validators (`port_validator.ts`)
- [ ] Collection validators (`collect_validator.ts`)

## Phase 6: Middleware

- [ ] AuthMiddleware (JWT)
- [ ] RateLimitMiddleware
- [ ] SilentAuthMiddleware

## Phase 7: Controllers

- [ ] AuthController (SIWE + JWT)
- [ ] PortsController (CRUD)
- [ ] ReceiptsController (queries + public verification)
- [ ] ScansController (claimable discovery)
- [ ] CollectionsController (CRUD)
- [ ] WebhooksController (Ponder)

## Phase 8: Jobs

- [ ] ProcessPayment
- [ ] ReconcilePayments
- [ ] MonitorRelayer

## Phase 9: Routes & Kernel

- [ ] Update `start/routes.ts` with RESTful routes
- [ ] Update `start/kernel.ts` with middleware

## Phase 10: Environment

- [ ] Create `.env.example`
- [ ] Final testing

## API Endpoints (RESTful)

| Resource    | Method | Path                             | Description             |
| ----------- | ------ | -------------------------------- | ----------------------- |
| Auth        | GET    | `/api/v1/auth/nonce`             | Get SIWE nonce          |
| Auth        | POST   | `/api/v1/auth/session`           | Login (verify + JWT)    |
| Auth        | GET    | `/api/v1/auth/session`           | Current user            |
| Auth        | GET    | `/api/v1/auth/chains`            | List chains             |
| Ports       | GET    | `/api/v1/ports`                  | List ports              |
| Ports       | POST   | `/api/v1/ports`                  | Create port             |
| Ports       | GET    | `/api/v1/ports/:id`              | Get port                |
| Ports       | PATCH  | `/api/v1/ports/:id`              | Update port             |
| Ports       | DELETE | `/api/v1/ports/:id`              | Archive port            |
| Ports       | GET    | `/api/v1/ports/:portId/receipts` | List port receipts      |
| Receipts    | GET    | `/api/v1/receipts`               | List receipts           |
| Receipts    | GET    | `/api/v1/receipts/:id`           | Get receipt             |
| Receipts    | GET    | `/api/v1/receipts/:hash`         | Verify receipt (public) |
| Scans       | POST   | `/api/v1/scans`                  | Scan for claimable      |
| Collections | GET    | `/api/v1/collections`            | List collections        |
| Collections | POST   | `/api/v1/collections`            | Execute collection      |
| Collections | GET    | `/api/v1/collections/:id`        | Get collection          |
| Webhooks    | POST   | `/webhooks/ponder`               | Ponder events           |

## Notes

- JWT authentication via `@maximemrf/adonisjs-jwt` (stateless, no DB tokens)
- SIWE (Sign-In With Ethereum) for wallet authentication
- Chain configuration via environment variables (CHAIN_ID, ALLOWED_CHAIN_IDS)
- All timestamps use `useTz: true` (TIMESTAMPTZ) for timezone awareness
- UUIDs for Port, Receipt, Collection IDs
- Bigints stored as `decimal(78, 0)` to handle wei values
