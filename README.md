# Galeon

Private payments using EIP-5564 stealth addresses on Mantle.

## Overview

Galeon enables private payments using stealth addresses. Payers send funds to one-time addresses derived from the recipient's public keys, ensuring payment privacy while maintaining on-chain verifiability.

### Key Features

- **Private Payments**: Recipients receive funds at stealth addresses that can't be linked to their identity
- **Port System**: Users create "Ports" - named payment endpoints with unique stealth keys
- **Fog Mode**: Sender privacy via pre-funded stealth wallets (breaks temporal correlation)
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
- Fog wallet key derivation with domain separation (`deriveFogKeys`)
- Stealth address generation (`generateStealthAddress`)
- Payment preparation for EOA and stealth recipients (`prepareEOAPayment`, `prepareStealthPayment`)
- Payment scanning and collection with view tag filtering
- Per-port and per-fog-wallet key isolation

### [@galeon/contracts](./packages/contracts)

Solidity smart contracts deployed on Mantle:

- `GaleonRegistry`: Port registration and payment processing
- `GaleonTender`: Native token sweeping from stealth addresses
- `ERC5564Announcer`: Stealth payment announcements
- `ERC6538Registry`: Stealth meta-address registry

## Smart Contracts (Mantle Mainnet)

| Contract         | Address                                      |
| ---------------- | -------------------------------------------- |
| GaleonRegistry   | `0x85F23B63E2a40ba74cD418063c43cE19bcbB969C` |
| GaleonTender     | `0x29D52d01947d91e241e9c7A4312F7463199e488c` |
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

### 4. Fog Mode (Sender Privacy)

1. Fund pre-funded stealth wallets ("fog reserve")
2. Pay from fog wallets to break temporal correlation
3. Generate Shipwreck compliance reports if needed

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
- Fog wallets use separate HKDF domain from Ports (cryptographic isolation)
- Fog wallet data encrypted in localStorage with AES-GCM
- Frontend interacts directly with contracts (backend API planned for indexing/SIWE)
- Secrets excluded from version control

### Scheduled Payments (Opt-in Custody)

Fog scheduled payments require **temporary custody** of fog wallet spending keys by the backend. This is an opt-in feature with explicit consent: when scheduling a payment, the frontend encrypts the fog wallet's private key with the backend's ECIES public key and stores it server-side. The backend executes the payment at the scheduled time and immediately deletes the key material. Users who prefer full self-custody can use instant fog payments instead.

## Contributing

1. Follow conventional commits (`feat:`, `fix:`, `chore:`, etc.)
2. Run `pnpm lint:fix` before committing
3. Keep files under 300 LOC, functions under 50 LOC
4. Use strict TypeScript - no `any`

## License

MIT

---

Built for the Mantle Hackathon 2025
