# @galeon/web

Next.js frontend for Galeon - private payments on Mantle.

## Features

- Wallet connection via Reown AppKit (WalletConnect)
- Stealth key derivation from wallet signatures
- Port management (create, view, share payment links)
- Payment processing with stealth addresses
- Fund collection with scanning
- Receipt verification

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10.6+
- WalletConnect Project ID (get one at [cloud.walletconnect.com](https://cloud.walletconnect.com))

### Installation

```bash
# From the monorepo root
pnpm install

# Set up environment
cp .env.example .env.local
```

### Environment Variables

```bash
# Required - WalletConnect project ID for wallet connection
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Optional - Alchemy API key for better RPC limits (no 50k block restriction)
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key
```

### Development

```bash
# From monorepo root
pnpm --filter web dev

# Or from this directory
pnpm dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Project Structure

```
apps/web/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Landing page
│   ├── setup/              # Onboarding flow
│   ├── dashboard/          # Main dashboard
│   │   └── ports/          # Port management
│   ├── pay/[portId]/       # Payment page
│   ├── collect/            # Fund collection
│   └── verify/             # Receipt verification
├── components/
│   ├── providers.tsx       # AppKit + Query providers
│   ├── wallet-button.tsx   # Connect/disconnect button
│   ├── network-guard.tsx   # Wrong-network warning
│   ├── port-card.tsx       # Port display
│   └── ...
├── contexts/
│   └── stealth-context.tsx # Stealth key management
├── hooks/
│   ├── use-ports.ts        # Port CRUD operations
│   ├── use-payment.ts      # Payment submission
│   └── use-collection.ts   # Fund scanning/collection
└── lib/
    ├── wagmi.ts            # Wagmi + chain configuration
    ├── chains.ts           # Mantle chain definitions
    └── contracts.ts        # Contract ABIs and addresses
```

## Pages

| Route              | Description                             |
| ------------------ | --------------------------------------- |
| `/`                | Landing page                            |
| `/setup`           | First-time setup - create initial Port  |
| `/dashboard`       | Main dashboard with Port overview       |
| `/dashboard/ports` | Manage Ports (create, view, copy links) |
| `/pay/[portId]`    | Public payment page for a Port          |
| `/collect`         | Scan and collect received payments      |
| `/verify`          | Verify payment receipts (coming soon)   |

## Key Concepts

### Stealth Context

The app derives stealth keys from a wallet signature. Keys are stored in React context and used for:

- Generating Port-specific keypairs
- Scanning for incoming payments
- Collecting funds from stealth addresses

```typescript
const { keys, isUnlocked, unlock } = useStealthContext()
```

### Ports

Ports are named payment endpoints. Each Port has:

- Unique ID (derived from name + random)
- Name (e.g., "Main Store", "Donations")
- Stealth meta-address (spending + viewing public keys)
- Per-port key isolation (different keys per Port index)

```typescript
const { ports, isLoading } = usePorts()
const { createPort } = useCreatePort()
```

### Network Guard

The app only works on Mantle. A network guard component shows a warning banner when connected to unsupported chains.

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **React**: React 19
- **Styling**: Tailwind CSS v4
- **Wallet**: Reown AppKit + wagmi v3
- **State**: TanStack Query for async data
- **Crypto**: `@galeon/stealth` for stealth addresses

## Scripts

```bash
pnpm dev        # Start dev server with Turbopack
pnpm build      # Production build
pnpm start      # Start production server
pnpm lint       # ESLint check
pnpm typecheck  # TypeScript validation
```

## Configuration

### Wagmi Adapter

The app uses `@reown/appkit-adapter-wagmi` for wallet connection:

- Cookie storage for SSR hydration
- Mantle mainnet and Sepolia testnet
- Custom Alchemy RPC for better block range support

### AppKit Theme

AppKit is configured with Galeon branding:

- Dark mode
- Emerald accent color (#10b981)
- Analytics enabled, social logins disabled

## Notes

- **No backend auth**: SIWE authentication is handled by the API package
- **Event-based data**: Currently reads Ports from chain events (will migrate to Ponder indexer)
- **Gas on Mantle**: L2 gas model requires ~0.002 MNT minimum for collection
