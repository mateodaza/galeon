# Frontend (apps/web) Progress

> Next.js 16 + React 19 frontend with Reown AppKit
> Last updated: 2025-12-31

## Setup

- [x] Initialize Next.js 16 with App Router
- [x] Configure Tailwind CSS v4
- [x] Configure wagmi v3.1.3 + viem 2.43.3
- [x] Set up TanStack Query
- [x] Set up Reown AppKit for wallet connection
- [x] Define custom Mantle chains (5000, 5003)
- [x] Configure SSR with cookie storage
- [x] Set up shadcn/ui components
- [x] Create API client for AdonisJS (`lib/api.ts`)
- [ ] Set up Transmit SSE client

## Pages

- [x] Landing page (`/`) - Hero, features, wallet connect
- [x] Setup/onboarding (`/setup`) - Stepper UI, key derivation
- [x] Dashboard (`/dashboard`) - Mode switch, stats, quick actions
- [x] Receive (`/receive`) - Port management with backend integration
- [x] Send (`/send`) - Payment initiation
- [x] Payment flow (`/pay/[portId]`) - Amount input, confirm
- [x] Collection (`/collect`) - Scan, collect all
- [x] Verification (`/verify`) - Receipt ID input, on-chain check
- [ ] Receipt viewer (`/receipt/[id]`)

## Components

- [x] WalletButton - Connect/disconnect with Reown AppKit
- [x] ConnectButton - Larger CTA for landing pages
- [x] Providers - AppKit, Query, Wagmi, Stealth, Auth providers
- [x] NetworkGuard - Wrong-chain warning banner
- [x] PortCard - Port display with status badge, copy link (pending/confirmed)
- [x] CreatePortModal - Port creation with backend intent pattern
- [x] StatCard - Dashboard stat display
- [x] NavLink - Navigation link component
- [x] AuthGuard - Route protection requiring authentication
- [x] SignInModal - SIWE authentication modal
- [x] AppShell - Layout with auth/keys requirements
- [ ] ReceiptCard
- [ ] CollectionPanel (advanced)
- [ ] DashboardStats (advanced)

## Hooks

- [x] useStealth - Stealth key derivation, address generation
- [x] usePorts - Port list from backend API (React Query)
- [x] useCreatePort - Port creation with intent pattern (backend → chain → confirm)
- [x] useCollection - Scan + collect (manual sweeping)
- [x] usePayment - Native payment with stealth addresses
- [x] useSignIn - SIWE authentication flow
- [ ] usePaymentStream - Transmit SSE (needs backend)

## Lib

- [x] chains.ts - Mantle + Mantle Sepolia definitions
- [x] wagmi.ts - WagmiAdapter with cookie storage, graceful env handling
- [x] contracts.ts - ABIs for GaleonRegistry, Announcer, Registry (Tender address defined but not yet used)
- [x] api.ts - API client with JWT auth, auto-refresh, typed endpoints

## Configuration

- [x] .env.local with NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
- [x] tsconfig.json with @/\* path alias

## Notes

**Wallet Connection:**

- Using Reown AppKit (formerly Web3Modal) for best long-term support
- Dark theme with emerald accent color (#10b981)
- SIWE authentication handled by backend API (not frontend)

**Contract Addresses (Mantle Mainnet):**

- GaleonRegistry: 0x85F23B63E2a40ba74cD418063c43cE19bcbB969C
- ERC5564Announcer: 0x8C04238c49e22EB687ad706bEe645698ccF41153
- ERC6538Registry: 0xE6586103756082bf3E43D3BB73f9fE479f0BDc22
- GaleonTender: 0x29D52d01947d91e241e9c7A4312F7463199e488c

## Audit Fixes (2025-12-27)

- [x] Per-port key isolation - `derivePortKeys(masterSignature, portIndex)`
- [x] Network guard - Wrong-chain warning with switch button
- [x] Graceful env handling - Warn instead of crash on missing WalletConnect ID
- [x] Verify page - "Coming Soon" badge added
- [x] Receipt hash - Now includes memo + amount + portId

## Backend Integration (2025-12-31)

- [x] API client with JWT tokens (`lib/api.ts`)
- [x] SIWE authentication flow (`contexts/auth-context.tsx`, `hooks/use-sign-in.ts`)
- [x] Port creation intent pattern (pending → chain tx → confirmed)
- [x] Ports API integration (`portsApi` with typed requests/responses)
- [x] Port status badges (pending/confirmed states)
- [x] Payment link visibility based on confirmed status

**Next Steps:**

1. Integrate GaleonTender for batch collection (gas savings)
2. Add tenderAbi to contracts.ts and update useCollection
3. Replace event scanning with Ponder indexer
4. Add SSE for real-time payment notifications
5. Receipt claim flow (claim → backend verifies via Ponder)
