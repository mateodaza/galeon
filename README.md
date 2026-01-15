# Galeon

**Private payments for everyone.** Receive privately. Send privately. Prove what you need.

Umbra hides receivers. Railgun hides senders. Galeon hides both — with compliance built in.

## Overview

On-chain payments are public by default. Galeon makes them private.

**Receiving?** Payers send to one-time stealth addresses - no one can link payments to your wallet.

**Sending?** Withdraw through our Privacy Pool - ZK proofs break the trail between you and the recipient.

**Need compliance?** Generate Shipwreck reports to prove specific transactions without exposing your full history.

Whether you're a freelancer, business, DAO, or individual - Galeon gives you financial privacy without sacrificing compliance.

### Key Features

- **Receive Privately**: Funds go to one-time stealth addresses that can't be linked to your identity
- **Send Privately**: ZK mixing breaks the link between sender and recipient (Privacy Pool, built upon 0xbow)
- **Port System**: Create named payment endpoints ("Donations", "Invoices") with unique keys
- **Shipwreck**: Generate compliance reports to prove specific transactions when needed
- **On-Chain Receipts**: Anchor payment metadata for verifiable records
- **Mantle L2**: Low fees and fast finality

## Architecture

```
galeon/
├── apps/
│   ├── web/          # Next.js frontend (wallet connection, payments, collection)
│   ├── api/          # AdonisJS backend (indexing, receipts, SIWE auth)
│   └── indexer/      # Ponder blockchain indexer (event scanning)
├── packages/
│   ├── stealth/      # Stealth address cryptography (EIP-5564/6538)
│   ├── contracts/    # Solidity contracts (GaleonRegistry, Announcer, Privacy Pool)
│   ├── pool/         # Privacy Pool SDK (ZK proofs, Merkle trees)
│   ├── config/       # Shared chain & contract configuration
│   └── types/        # Shared TypeScript types
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
pnpm --filter indexer dev  # Indexer only
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

**Tests**: 34 passing

### [@galeon/contracts](./packages/contracts)

Solidity smart contracts deployed on Mantle:

**Base Contracts:**

- `GaleonRegistry`: Port registration, payments, verifiedBalance tracking, stealth address freezing
- `ERC5564Announcer`: Stealth payment announcements with trusted relayer system
- `ERC6538Registry`: Stealth meta-address registry

**Privacy Pool v1 (built upon 0xbow):**

- `GaleonEntrypoint`: Pool registry, ASP roots, deposit routing
- `GaleonPrivacyPoolSimple`: Native currency (MNT/ETH) mixing pool
- `GaleonPrivacyPoolComplex`: ERC-20 token mixing pool
- Port-only deposits, verifiedBalance gating, UUPS upgradeable

**Tests**: 421 passing (205 base + 216 privacy pool)

### [@galeon/pool](./packages/pool)

Privacy Pool SDK for ZK proof generation:

- `prover.ts` - SNARK proof generation (main thread & worker)
- `merkle.ts` - Merkle tree operations with @zk-kit/lean-imt
- `commitments.ts` - ZK commitment generation
- `keys.ts` - Key derivation for privacy pool
- `recovery.ts` - Fund recovery mechanisms

### [@galeon/config](./packages/config)

Centralized chain and contract configuration:

- Chain definitions (Mantle 5000, Mantle Sepolia 5003)
- Contract addresses per chain
- Contract ABIs (ERC5564, ERC6538, GaleonRegistry, Pool contracts)
- Helper functions: `getChain()`, `getRpcUrl()`, `getAddressExplorerUrl()`

## Smart Contracts (Mantle Mainnet)

| Contract                | Address                                      |
| ----------------------- | -------------------------------------------- |
| GaleonRegistry          | `0x9bcDb96a9Ff9b492e07f9E4909DF143266271e9D` |
| ERC5564Announcer        | `0x8C04238c49e22EB687ad706bEe645698ccF41153` |
| ERC6538Registry         | `0xE6586103756082bf3E43D3BB73f9fE479f0BDc22` |
| GaleonEntrypoint        | `0x8633518fbbf23E78586F1456530c3452885efb21` |
| GaleonPrivacyPoolSimple | `0xE271335D1FCa02b6c219B9944f0a4921aFD559C0` |
| WithdrawalVerifier      | `0x4894F811D370d987B55bE4e5eeA48588d6545a32` |
| RagequitVerifier        | `0xAE1126645a26bC30B9A29D9c216e8F6B51B82803` |
| MergeDepositVerifier    | `0x05DB69e37b8c7509E9d97826249385682CE9b29d` |

## How It Works

### 1. Setup

1. Connect wallet and sign a message to derive stealth keys
2. Create a "Port" with a name (e.g., "Donations", "Invoices")
3. Share the Port's payment link

### 2. Pay

1. Visit payment link (e.g., `/pay/[portId]`)
2. Connect wallet, enter amount and optional memo
3. Submit payment - funds go to a fresh stealth address

### 3. Collect

1. Scan blockchain for payments to your Ports
2. Derive private keys for each stealth address
3. Collect funds to your main wallet

### 4. Privacy Pool

1. Deposit collected funds to Privacy Pool
2. Generate ZK proof and withdraw to any address
3. ZK proof breaks the link between deposit and withdrawal
4. Generate Shipwreck compliance reports if needed

## Apps

### Web (`apps/web`)

Next.js 16 frontend with React 19 and Tailwind v4:

- `/` - Landing page with wallet connect
- `/setup` - Onboarding with stealth key derivation
- `/dashboard` - Main dashboard with mode switching
- `/receive` - Port management (create/manage payment endpoints)
- `/send` - Payment initiation page
- `/pay/[portId]` - Payment flow with stealth addresses
- `/collect` - Scan blockchain and collect payments
- `/pool` - Privacy Pool interface
- `/reports` - Shipwreck tax compliance reports with PDF export
- `/history` - Payment history with filter tabs

### API (`apps/api`)

AdonisJS 6 backend with PostgreSQL:

- SIWE authentication with JWT tokens
- Port management and verification
- Receipt anchoring and verification
- Announcement listing from Ponder indexer
- Real-time updates via Transmit SSE

**Tests**: 145+ passing

### Indexer (`apps/indexer`)

Ponder blockchain indexer for Mantle:

- `ERC5564Announcer.Announcement` - Payment announcements
- `GaleonRegistry.PortRegistered` - Port creation events
- `GaleonRegistry.ReceiptAnchored` - Receipt anchoring events

## Environment Variables

### Frontend (`apps/web/.env.local`)

```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=xxx  # Required for wallet connection
NEXT_PUBLIC_ALCHEMY_API_KEY=xxx           # Optional, for better RPC limits
```

### Backend (`apps/api/.env`)

```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
SESSION_SECRET=xxx
JWT_SECRET=xxx
```

### Indexer (`apps/indexer/.env.local`)

```bash
PONDER_RPC_URL_5000=https://rpc.mantle.xyz
```

## Tech Stack

| Layer     | Technology                                  |
| --------- | ------------------------------------------- |
| Frontend  | Next.js 16, React 19, Tailwind v4, wagmi v3 |
| Wallet    | Reown AppKit, WalletConnect                 |
| Backend   | AdonisJS 6, Lucid ORM, Transmit SSE, BullMQ |
| Indexer   | Ponder, PostgreSQL                          |
| Contracts | Solidity 0.8.24, Hardhat 2.28, OpenZeppelin |
| Crypto    | @noble/curves, @noble/hashes, snarkjs       |
| Monorepo  | Turborepo, pnpm workspaces                  |

## Security

- Spending keys are never stored - derived on-demand from wallet signatures
- Per-port key isolation prevents cross-port linkability
- Privacy Pool notes encrypted in localStorage with AES-GCM
- Frontend interacts directly with contracts (backend API for indexing/SIWE)
- Secrets excluded from version control

**Privacy Pool Hardening:**

- Port-only deposits via `canDeposit()` check
- `verifiedBalance` prevents unverified deposits and double-spending
- Stealth address freezing for compliance/port deactivation
- UUPS upgradeable with verifier swapping for circuit upgrades
- ReentrancyGuard on all value transfers
- SafeERC20 for token operations

**Smart Contract Security:**

- Trusted relayer system to prevent announcement spoofing
- Input validation on all external functions
- NatSpec documentation on all public functions

## Contributing

1. Follow conventional commits (`feat:`, `fix:`, `chore:`, etc.)
2. Run `pnpm lint:fix` before committing
3. Keep files under 300 LOC, functions under 50 LOC
4. Use strict TypeScript - no `any`

## License

| Package              | License    | Notes                                                                     |
| -------------------- | ---------- | ------------------------------------------------------------------------- |
| `apps/web`           | MIT        | Galeon frontend                                                           |
| `apps/api`           | MIT        | Galeon backend                                                            |
| `apps/indexer`       | MIT        | Galeon indexer                                                            |
| `packages/stealth`   | MIT        | Stealth address library                                                   |
| `packages/pool`      | Apache-2.0 | Privacy Pool SDK, includes code from [0xbow](https://github.com/0xbow-io) |
| `packages/contracts` | Apache-2.0 | Smart contracts, includes code from [0xbow](https://github.com/0xbow-io)  |

All components are licensed for commercial use. See individual package LICENSE files for details.

---

Built for the Mantle Global Hackathon 2025

## Pitch

**Problem**: Public blockchains expose every transaction. Businesses and individuals can't use crypto for real-world payments without revealing their entire financial history to competitors, stalkers, and bad actors.

**Solution**: Galeon provides compliance-ready privacy for payments. Hide who sends, who receives, and prove fund sources when needed with ZK proofs. Full privacy without sacrificing regulatory compliance.

**Business Model**:

- Relayer fees: Small percentage on private withdrawals (users can self-custody for free)
- Premium compliance reports for enterprises
- White-label API for businesses integrating privacy payments

**Roadmap**:

1. Multi-token support (USDC, USDT, WMNT)
2. Optimized ZK circuits with larger Merkle trees for better scalability
3. Mobile app with biometric key derivation
4. Enterprise API with batch payments
5. Cross-chain privacy via LayerZero/Wormhole

## Compliance Declaration

Galeon does not handle regulated assets (securities, tokenized RWAs, or derivatives). It is privacy infrastructure for native token payments on Mantle L2. Users can generate compliance reports (Shipwreck) to prove fund sources for tax or audit purposes. The Privacy Pool architecture is based on 0xBow's design, which was developed with regulatory compatibility in mind.

## Team

**Mateo Daza** — Full Stack & Web3 Engineer

- 7+ years experience
- Lead Frontend at Asymmetry Finance (DeFi)
- 4+ years at Giveth (decentralized donations)
- Co-founder of Ethereum Colombia
- [GitHub](https://github.com/mateodaza) · [LinkedIn](https://linkedin.com/in/mateo-daza-448469170)

**Carlos Quintero** — Backend Engineer

- 8+ years experience
- Lead Backend at Giveth
- Previously at Koombea (fintech, e-commerce)
- Co-founder of Ethereum Colombia
- [GitHub](https://github.com/CarlosQ96) · [LinkedIn](https://linkedin.com/in/carlos-quintero-076a36153)
