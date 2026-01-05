# Galeon API

AdonisJS 6 backend for Galeon - handles authentication, port management, receipts, and collections.

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

## Ports API

Manage stealth address ports for receiving payments.

| Endpoint     | Method | Auth | Description     |
| ------------ | ------ | ---- | --------------- |
| `/ports`     | GET    | Yes  | List user ports |
| `/ports`     | POST   | Yes  | Create port     |
| `/ports/:id` | GET    | Yes  | Get port        |
| `/ports/:id` | PATCH  | Yes  | Update port     |
| `/ports/:id` | DELETE | Yes  | Archive port    |

## Receipts API

Track and manage payment receipts.

| Endpoint          | Method | Auth | Description            |
| ----------------- | ------ | ---- | ---------------------- |
| `/receipts`       | GET    | Yes  | List receipts          |
| `/receipts`       | POST   | Yes  | Create pending receipt |
| `/receipts/stats` | GET    | Yes  | Get statistics         |
| `/receipts/:id`   | GET    | Yes  | Get receipt            |

## Collections API

Track fund collection from stealth addresses.

| Endpoint                   | Method | Auth | Description                  |
| -------------------------- | ------ | ---- | ---------------------------- |
| `/collections`             | POST   | Yes  | Record collection initiation |
| `/collections/:id/execute` | POST   | Yes  | Execute collection           |
| `/collections`             | GET    | Yes  | List user's collections      |
| `/collections/:id`         | GET    | Yes  | Get collection details       |

## Environment Variables

### Required

- `APP_KEY` - Session encryption key
- `DB_*` - PostgreSQL connection

### Optional

- `PONDER_DB_*` - Ponder database connection for blockchain sync

### Pool Relayer

```bash
# Private key for the relayer wallet (pays gas for private withdrawals)
RELAYER_PRIVATE_KEY=0xYOUR_RELAYER_PRIVATE_KEY_HERE

# Fee charged on withdrawals in basis points (100 = 1%)
RELAYER_FEE_BPS=100

# Minimum withdrawal amount in wei (default: 0.01 MNT)
MIN_WITHDRAW_AMOUNT=10000000000000000

# Maximum gas price the relayer will accept (in wei, default: 100 gwei)
MAX_GAS_PRICE=100000000000
```

## Pool Relayer API

Privacy-preserving withdrawal relay for the privacy pool.

| Endpoint           | Method | Auth | Description             |
| ------------------ | ------ | ---- | ----------------------- |
| `/relayer/status`  | GET    | No   | Get relayer status      |
| `/relayer/details` | GET    | No   | Get fee configuration   |
| `/relayer/quote`   | POST   | No   | Get fee quote           |
| `/relayer/request` | POST   | No   | Submit withdrawal relay |

## Architecture

```
app/
├── controllers/
│   ├── auth_controller.ts       # SIWE + JWT auth
│   ├── ports_controller.ts      # Port CRUD
│   ├── receipts_controller.ts   # Receipt management
│   └── collections_controller.ts # Collection tracking
├── models/
│   ├── user.ts                  # User with refresh tokens
│   ├── port.ts                  # Port with encrypted viewing key
│   ├── receipt.ts               # Off-chain receipt data
│   └── collection.ts            # Collection records
├── services/
│   ├── siwe_service.ts          # SIWE verification
│   └── ponder_service.ts        # Ponder DB queries
└── jobs/
    └── verify_receipts.ts       # Receipt verification job
```

## Related Documentation

- [BACKEND-PONDER-PLAN.md](../../docs/BACKEND-PONDER-PLAN.md) - Full architecture plan
