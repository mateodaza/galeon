# Backend (apps/api) Progress

> AdonisJS 6 API server
> Last updated: 2026-01-04

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
- [x] Final testing

## Test Coverage

- Unit tests: SiweService (14), Models (40+)
- Functional tests: AuthController (16), PortsController (35), ReceiptsController (24)

## API Endpoints (RESTful)

| Resource      | Method | Path                              | Auth      | Description                    |
| ------------- | ------ | --------------------------------- | --------- | ------------------------------ |
| Health        | GET    | `/`                               | Public    | Health check                   |
| Announcements | GET    | `/api/v1/announcements`           | Public    | List announcements (paginated) |
| Auth          | GET    | `/api/v1/auth/nonce`              | Public    | Get SIWE nonce                 |
| Auth          | POST   | `/api/v1/auth/verify`             | Public    | Login (access + refresh JWT)   |
| Auth          | POST   | `/api/v1/auth/refresh`            | Public    | Refresh access token           |
| Auth          | POST   | `/api/v1/auth/logout`             | JWT       | Logout (blacklist + revoke)    |
| Ports         | GET    | `/api/v1/ports`                   | JWT       | List ports                     |
| Ports         | POST   | `/api/v1/ports`                   | JWT       | Create port                    |
| Ports         | GET    | `/api/v1/ports/:id`               | JWT       | Get port                       |
| Ports         | PATCH  | `/api/v1/ports/:id`               | JWT       | Update port                    |
| Ports         | DELETE | `/api/v1/ports/:id`               | JWT       | Archive port                   |
| Receipts      | GET    | `/api/v1/receipts`                | JWT       | List receipts                  |
| Receipts      | POST   | `/api/v1/receipts`                | JWT       | Create pending receipt         |
| Receipts      | GET    | `/api/v1/receipts/stats`          | JWT       | Receipt statistics             |
| Receipts      | GET    | `/api/v1/receipts/:id`            | JWT       | Get receipt                    |
| Collections   | GET    | `/api/v1/collections`             | JWT       | List collections               |
| Collections   | POST   | `/api/v1/collections`             | JWT       | Initiate collection            |
| Collections   | GET    | `/api/v1/collections/:id`         | JWT       | Get collection                 |
| Collections   | POST   | `/api/v1/collections/:id/execute` | JWT       | Execute collection             |
| Webhooks      | POST   | `/api/v1/webhooks/alchemy`        | Webhook\* | Alchemy events                 |
| Webhooks      | POST   | `/api/v1/webhooks/manual`         | Webhook\* | Manual announcement            |

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

**Flow:** Frontend claims → API stores pending → Job verifies → Confirmed/Rejected

## Announcements API (2026-01-03)

- [x] `GET /api/v1/announcements` - Public endpoint for payment scanning
- [x] Pagination support (limit/offset with max 1000, default 500)
- [x] Query filters: `viewTag`, `stealthAddress`, `chainId`
- [x] Returns `{ data, hasMore, limit, offset }` for frontend auto-pagination
- [x] AnnouncementsController with PonderService integration

## Port Creation Intent Pattern (2025-12-31)

Frontend-backend integration for port creation:

1. **Frontend creates intent** → `POST /api/v1/ports` with `stealthMetaAddress`, `viewingKey`
2. **Backend stores pending** → Port created with `status: 'pending'`
3. **Frontend sends on-chain tx** → `registerPort(portId, name, metaAddressBytes)`
4. **Frontend waits for receipt** → `waitForTransactionReceipt`
5. **Frontend confirms** → `PATCH /api/v1/ports/:id` with `txHash`, `status: 'confirmed'`, `indexerPortId`

**Port Status Lifecycle:**

- `pending` - Created in backend, awaiting on-chain confirmation
- `confirmed` - Transaction confirmed, `indexerPortId` stored

**Future:** Reconciliation job to verify pending ports against Ponder indexer.

## Phase 12: ASP Auto-Approve Service (2026-01-04)

### Overview

The ASP (Association Set Provider) service auto-approves deposit labels into a Merkle tree and updates the on-chain root. This enables O(1) withdrawals by proving membership in the ASP tree.

### Implementation

- [x] Add `poseidon-lite` and `@zk-kit/lean-imt` dependencies
- [x] Create `ASPService` (`app/services/asp_service.ts`)
  - LeanIMT tree with Poseidon hash
  - Rebuild from existing deposits on startup
  - Process new deposits and add labels
  - Update on-chain root via `Entrypoint.updateRoot()`
  - Generate ASP Merkle proofs for withdrawal circuits
- [x] Create `UpdateASPRoot` job (`app/jobs/update_asp_root.ts`)
- [x] Schedule job every 30 seconds
- [x] Add env variables: `ENTRYPOINT_ADDRESS`, `ASP_POSTMAN_PRIVATE_KEY`

### Configuration

```env
# ASP service (requires ASP_POSTMAN role on Entrypoint contract)
ENTRYPOINT_ADDRESS=0x54BA91d29f84B8bAd161880798877e59f2999f7a

# Optional: Falls back to RELAYER_PRIVATE_KEY if not set
# ASP_POSTMAN_PRIVATE_KEY=0x...
```

> **Note**: If `ASP_POSTMAN_PRIVATE_KEY` is not set, the service will use `RELAYER_PRIVATE_KEY` as a fallback. This works when the same account has both roles (typical for hackathon setup).

### Flow

1. Scheduler triggers `UpdateASPRoot` job every 30 seconds
2. On first run, rebuilds tree from all existing deposits (via PonderService)
3. On subsequent runs, processes only new deposits since last check
4. For hackathon: auto-approves ALL labels (no blocklist check)
5. Production: would check depositor addresses against sanctions lists
6. If tree root changed, calls `Entrypoint.updateRoot(root, ipfsCID)`

### API Endpoints

The ASP service exposes these public endpoints for withdrawal proofs:

| Method | Endpoint                   | Description                            |
| ------ | -------------------------- | -------------------------------------- |
| GET    | `/api/v1/asp/status`       | Get ASP tree status and sync info      |
| GET    | `/api/v1/asp/proof/:label` | Get Merkle proof for a deposit label   |
| POST   | `/api/v1/asp/rebuild`      | Force rebuild tree and update on-chain |

### Notes

- Singleton ASP service instance persists tree state between job runs
- Uses `poseidon-lite` (pure JS, Node.js compatible) instead of `maci-crypto` (browser-only)
- IPFS CID is placeholder for hackathon; production would store actual tree data
- ASP_POSTMAN_PRIVATE_KEY falls back to RELAYER_PRIVATE_KEY if not set

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
- CORS configured with all methods including PATCH for frontend integration
