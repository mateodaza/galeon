# Galeon

Private payments using EIP-5564 stealth addresses on Mantle.

## Overview

Galeon enables private payments using stealth addresses. Payers send funds to one-time addresses derived from the recipient's public keys, ensuring payment privacy while maintaining on-chain verifiability.

### Key Features

- **Private Payments**: Recipients receive funds at stealth addresses that can't be linked to their identity
- **Port System**: Users create "Ports" - named payment endpoints with unique stealth keys
- **Privacy Pool**: ZK mixing for sender privacy (0xbow fork) - deposit from Port, withdraw directly to recipient
- **Shipwreck**: Compliance reports with cryptographic proofs for auditors
- **On-Chain Receipts**: Payment metadata is anchored on-chain for verifiable receipts
- **Mantle L2**: Low fees and fast finality on Mantle network

## Architecture

```
galeon/
├── apps/
│   ├── web/          # Next.js frontend (wallet connection, payments, collection)
│   └── api/          # AdonisJS backend (indexing, receipts, SIWE auth)
├── packages/
│   ├── stealth/      # Stealth address cryptography (EIP-5564/6538)
│   └── contracts/    # Solidity contracts (GaleonRegistry, Announcer)
└── tooling/
    └── eslint-config # Shared ESLint configuration
```

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 10.6+

### Installation

```bash
# Clone and install
git clone https://github.com/your-org/galeon.git
cd galeon
pnpm install

# Set up environment variables
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with your WalletConnect project ID
```

### Development

```bash
# Start all apps in dev mode
pnpm dev

# Or run specific apps
pnpm --filter web dev      # Frontend only
pnpm --filter api dev      # Backend only
```

### Build & Test

```bash
pnpm build        # Build all packages
pnpm typecheck    # TypeScript validation
pnpm lint         # ESLint check
pnpm test         # Run tests
```

## Packages

### [@galeon/stealth](./packages/stealth)

Core stealth address library implementing EIP-5564 and EIP-6538:

- Key derivation from wallet signatures (`deriveStealthKeys`, `derivePortKeys`)
- Stealth address generation (`generateStealthAddress`)
- Payment preparation for EOA and stealth recipients (`prepareEOAPayment`, `prepareStealthPayment`)
- Payment scanning and collection with view tag filtering
- Per-port key isolation for privacy

### [@galeon/contracts](./packages/contracts)

Solidity smart contracts deployed on Mantle:

**Base Contracts:**

- `GaleonRegistry`: Port registration, payments, verifiedBalance tracking, stealth address freezing
- `ERC5564Announcer`: Stealth payment announcements
- `ERC6538Registry`: Stealth meta-address registry

**Privacy Pool v1 (0xbow fork):**

- `GaleonEntrypoint`: Pool registry, ASP roots, deposit routing
- `GaleonPrivacyPoolSimple`: Native currency (MNT/ETH) mixing pool
- `GaleonPrivacyPoolComplex`: ERC-20 token mixing pool
- Port-only deposits, verifiedBalance gating, UUPS upgradeable

## Smart Contracts (Mantle Mainnet)

| Contract         | Address                                      |
| ---------------- | -------------------------------------------- |
| GaleonRegistry   | `0x9bcDb96a9Ff9b492e07f9E4909DF143266271e9D` |
| ERC5564Announcer | `0x8C04238c49e22EB687ad706bEe645698ccF41153` |
| ERC6538Registry  | `0xE6586103756082bf3E43D3BB73f9fE479f0BDc22` |

## How It Works

### 1. Setup (Vendor)

1. Connect wallet and sign a message to derive stealth keys
2. Create a "Port" with a name (e.g., "Main Store")
3. Share the Port's payment link with customers

### 2. Payment (Payer)

1. Visit payment link (e.g., `/pay/[portId]`)
2. Connect wallet, enter amount and optional memo
3. Submit payment - funds go to a fresh stealth address

### 3. Collection (Vendor)

1. Scan blockchain for payments to your Ports
2. Derive private keys for each stealth address
3. Collect funds to your main wallet

### 4. Privacy Pool (Sender Privacy)

1. Deposit funds from Port to Privacy Pool
2. Generate ZK proof and withdraw directly to recipient
3. ZK proof breaks all links between deposit and withdrawal
4. Generate Shipwreck compliance reports if needed

## Environment Variables

### Frontend (`apps/web/.env.local`)

```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=xxx  # Required for wallet connection
NEXT_PUBLIC_ALCHEMY_API_KEY=xxx           # Optional, for better RPC limits
```

### Backend (`apps/api/.env`)

```bash
DATABASE_URL=postgresql://...
SESSION_SECRET=xxx
```

## Tech Stack

| Layer     | Technology                                  |
| --------- | ------------------------------------------- |
| Frontend  | Next.js 16, React 19, Tailwind v4, wagmi v3 |
| Wallet    | Reown AppKit, WalletConnect                 |
| Backend   | AdonisJS 6, Lucid ORM, Transmit SSE         |
| Contracts | Solidity 0.8.24, Hardhat 2.28               |
| Crypto    | @noble/curves, @noble/hashes                |
| Monorepo  | Turborepo, pnpm workspaces                  |

## Security

- Spending keys are never stored - derived on-demand from wallet signatures
- Per-port key isolation prevents cross-port linkability
- Privacy Pool notes encrypted in localStorage with AES-GCM
- Frontend interacts directly with contracts (backend API for indexing/SIWE)
- Secrets excluded from version control

**Privacy Pool Hardening:**

- Port-only deposits via `canDeposit()` check
- `verifiedBalance` prevents dirty sends and double-deposits
- Stealth address freezing for compliance/port deactivation
- UUPS upgradeable with verifier swapping for circuit upgrades

## Contributing

1. Follow conventional commits (`feat:`, `fix:`, `chore:`, etc.)
2. Run `pnpm lint:fix` before committing
3. Keep files under 300 LOC, functions under 50 LOC
4. Use strict TypeScript - no `any`

## License

| Package              | License    | Notes                                                                             |
| -------------------- | ---------- | --------------------------------------------------------------------------------- |
| `apps/web`           | MIT        | Galeon frontend (original work)                                                   |
| `apps/api`           | MIT        | Galeon backend (original work)                                                    |
| `packages/stealth`   | MIT        | Stealth address library (original work)                                           |
| `packages/contracts` | Apache-2.0 | Privacy Pool adapted from [0xbow](https://github.com/0xbow-io/privacy-pools-core) |

All components are licensed for commercial use. See individual package LICENSE files for details.

---

Built for the Mantle Hackathon 2025
