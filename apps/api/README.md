# Galeon API

AdonisJS 6 backend for Galeon - handles authentication, port management, receipts, and fog scheduled payments.

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
node ace migration:run

# Start development server
pnpm dev
```

## Authentication

Uses SIWE (Sign-In with Ethereum) + JWT tokens. See [auth_controller.ts](./app/controllers/auth_controller.ts).

| Endpoint        | Method | Description                       |
| --------------- | ------ | --------------------------------- |
| `/auth/nonce`   | GET    | Get SIWE nonce for wallet address |
| `/auth/verify`  | POST   | Verify SIWE signature, get tokens |
| `/auth/refresh` | POST   | Exchange refresh token            |
| `/auth/logout`  | POST   | Logout and blacklist tokens       |

## Fog Delegation API (Scheduled Payments)

Fog scheduled payments enable users to schedule payments from fog wallets for future execution. This feature requires **temporary custody** of the fog wallet's spending key.

### Trust Model

- User explicitly opts in by scheduling a payment
- Frontend encrypts the fog wallet's private key with the backend's ECIES public key
- Backend holds the encrypted key only until execution time
- Key material is deleted immediately after payment execution
- Users can cancel pending delegations at any time

### Endpoints

| Endpoint               | Method | Auth | Description                    |
| ---------------------- | ------ | ---- | ------------------------------ |
| `/fog/encryption-key`  | GET    | No   | Get backend's ECIES public key |
| `/fog/delegations`     | POST   | Yes  | Schedule a fog payment         |
| `/fog/delegations`     | GET    | Yes  | List user's scheduled payments |
| `/fog/delegations/:id` | GET    | Yes  | Get delegation details         |
| `/fog/delegations/:id` | DELETE | Yes  | Cancel pending delegation      |

### Request: Schedule Payment

```json
POST /fog/delegations
Authorization: Bearer <access_token>

{
  "fogWalletIndex": 0,
  "encryptedSpendingKey": "04abc...encrypted-with-backend-pubkey",
  "recipientAddress": "0x...",
  "amount": "1000000000000000000",
  "token": null,
  "scheduledAt": "2025-01-15T10:00:00Z",
  "memo": "Monthly subscription"
}
```

### Response

```json
{
  "id": "uuid",
  "status": "pending",
  "fogWalletIndex": 0,
  "recipientAddress": "0x...",
  "amount": "1000000000000000000",
  "token": null,
  "scheduledAt": "2025-01-15T10:00:00Z",
  "createdAt": "2025-01-01T12:00:00Z"
}
```

### Delegation Status Values

| Status      | Description                               |
| ----------- | ----------------------------------------- |
| `pending`   | Scheduled, waiting for execution time     |
| `executing` | Currently being processed                 |
| `completed` | Successfully executed, txHash available   |
| `failed`    | Execution failed, error message available |
| `cancelled` | User cancelled before execution           |

## Collections API

Track fund collection from stealth addresses (for Shipwreck compliance).

| Endpoint                    | Method | Auth | Description                  |
| --------------------------- | ------ | ---- | ---------------------------- |
| `/collections`              | POST   | Yes  | Record collection initiation |
| `/collections/:id/complete` | POST   | Yes  | Mark collection as complete  |
| `/collections`              | GET    | Yes  | List user's collections      |

## Environment Variables

See [.env.example](./.env.example) for all configuration options.

### Required

- `APP_KEY` - Session encryption key
- `DB_*` - PostgreSQL connection

### Optional (Fog Delegation)

- `FOG_ENCRYPTION_PUBLIC_KEY` - ECIES public key for key encryption
- `FOG_ENCRYPTION_PRIVATE_KEY` - ECIES private key for key decryption
- `PONDER_DB_*` - Ponder database connection for blockchain sync

## Architecture

```
app/
├── controllers/
│   ├── auth_controller.ts      # SIWE + JWT auth
│   ├── ports_controller.ts     # Port CRUD
│   ├── receipts_controller.ts  # Receipt management
│   ├── collections_controller.ts # Collection tracking
│   └── fog_controller.ts       # Fog delegation
├── models/
│   ├── user.ts                 # User with refresh tokens
│   ├── port.ts                 # Port with encrypted viewing key
│   ├── receipt.ts              # Off-chain receipt data
│   ├── collection.ts           # Collection records
│   ├── fog_session.ts          # Fog session metadata
│   └── fog_delegation.ts       # Scheduled payments
├── services/
│   ├── siwe_service.ts         # SIWE verification
│   ├── ponder_service.ts       # Ponder DB queries
│   └── fog_executor_service.ts # Delegation execution
└── jobs/
    └── execute_fog_delegation.ts # Background job
```

## Related Documentation

- [BACKEND-PONDER-PLAN.md](../../docs/BACKEND-PONDER-PLAN.md) - Full architecture plan
- [FOG-SHIPWRECK-PLAN.md](../../docs/FOG-SHIPWRECK-PLAN.md) - Fog mode specification
