# Galeon: Private Business Payments with Verifiable Receipts

## Mantle Global Hackathon 2025 - Project Plan

**Project Name:** Galeon
**Tagline:** "Your payments. Your treasure. Hidden in plain sight."
**Team:** Mateo & Carlos (Barranquilla, Colombia)
**Submission Deadline:** January 15, 2026
**Demo Day:** February 1, 2026
**Hackathon:** [Mantle Global Hackathon 2025](https://www.hackquest.io/hackathons/Mantle-Global-Hackathon-2025)

---

## The Name: Why "Galeon"

In 1708, the Spanish galleon *San José* sank off the coast of Cartagena, Colombia—carrying what's now estimated at **$20 billion in gold and emeralds**. For over 300 years, this treasure has remained hidden beneath the Caribbean waves, visible to no one.

**Galeon** embodies this story:
- 💰 **Hidden treasure** — Your payments exist, but only you can see them
- 🇨🇴 **Colombian roots** — Built by a Colombian developer, inspired by Colombian history
- 🚢 **Safe passage** — Your funds arrive safely, privately, with proof

*"Like the San José's gold—your payments are real, valuable, and hidden from prying eyes."*

---

## Executive Summary

Galeon is private B2B payment infrastructure enabling vendors (freelancers, contractors, SMBs) to receive crypto payments **without publicly exposing their income**, while maintaining **verifiable receipts** for tax compliance and accounting.

**Core Innovation:** Combining EIP-5564 stealth addresses with on-chain receipt anchoring to solve the "privacy vs. compliance" dilemma.

---

## Problem Statement

### The Visibility Problem

Every crypto payment a vendor receives is **permanently public**:

```
WHAT EVERYONE CAN SEE:
├── maria.eth received $5,000 from client-a.eth
├── maria.eth received $3,000 from client-b.eth
├── maria.eth received $8,000 from client-c.eth
├── maria.eth total income: $16,000 this month
└── Competitors, clients, and tax authorities all know this
```

### Pain Points

| Stakeholder | Pain |
|-------------|------|
| **Freelancers** | Competitors see rates, clients see what they charge others |
| **SMBs** | Revenue visible to competitors, employees see all financials |
| **Contractors** | Income profiling before tax filing |
| **All Vendors** | Negotiation disadvantage, security risks (targeting high earners) |

### Why Current Solutions Fail

| Solution | Problem |
|----------|---------|
| **Mixers (Tornado Cash)** | No receipts, sanctioned, looks like money laundering |
| **Multiple wallets** | Still linkable over time, accounting nightmare |
| **Traditional banking** | 3-5% fees, multi-day delays, requires bank account |
| **Privacy coins** | Limited liquidity, regulatory issues, no EVM compatibility |

---

## Solution: Galeon

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   BEFORE GALEON:                                                │
│   ──────────────                                                │
│   Client pays $5,000 → maria.eth                                │
│   PUBLIC: Everyone sees Maria got $5,000 from this client       │
│                                                                 │
│   AFTER GALEON:                                                 │
│   ─────────────                                                 │
│   Client pays $5,000 → 0x7f3a...random (stealth address)        │
│   PUBLIC: Someone paid $5,000 to some address                   │
│   MARIA: Payment received! Here's your signed receipt.          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

1. **Stealth Addresses (EIP-5564):** One-time addresses only the recipient can detect and spend from
2. **Receipt System:** Cryptographically signed payment confirmations with on-chain anchoring
3. **Vendor Dashboard:** Scan for payments, manage receipts, export for accounting
4. **Payer Flow:** Simple payment link with automatic receipt generation

---

## Multi-Track Submission Strategy

### Track Selections (8 Tracks)

| Track | Select | Narrative Angle |
|-------|--------|-----------------|
| **Grand Prize** | ✅ | Full vision: privacy infrastructure for real-world commerce |
| **RWA / RealFi** | ✅ PRIMARY | Receipts = real business compliance, tax-ready infrastructure |
| **ZK & Privacy** | ✅ SECONDARY | Stealth addresses = cryptographic privacy primitive |
| **Infrastructure & Tooling** | ✅ | Payment infrastructure developers can build on |
| **Best Mantle Integration** | ✅ | Native MNT + USDC, leverages low fees |
| **Best UX/Demo** | ✅ | Polished payment flow, clear value prop |
| **Community Choice** | ✅ | Compelling story, real problem |
| **Incubation Grants** | ✅ | Clear roadmap, real market need |

### Track-Specific Framing

#### RWA / RealFi (Primary)
> "Galeon bridges crypto payments to real-world business requirements. Every payment generates an **auditable receipt anchored on-chain**—tax-ready, auditor-friendly, legally defensible. **Privacy without mixers** for professional commerce."

**Key talking points:**
- **Auditable receipts on-chain**: timestamped, immutable, verifiable
- Export to JSON/CSV with COP conversion for accountants
- Dual signatures (payer + vendor) for dispute resolution
- Aligns with Mantle's RWA narrative

#### ZK & Privacy (Secondary)
> "Galeon uses **EIP-5564 stealth addresses** for **privacy without mixers or pools**. Each payment goes to a unique one-time address that only the recipient can detect. No mixing, no sanctions risk—just cryptographic unlinkability."

**Key talking points:**
- Stealth addresses use ECDH (Diffie-Hellman key exchange)
- Recipient anonymity: payer can't be linked to recipient's main wallet
- Payment unlinkability: multiple payments can't be correlated
- **Privacy WITHOUT mixers**: no Tornado Cash, no regulatory concerns

**Honest framing:** "We use stealth addresses (cryptographic privacy), not ZK proofs. The privacy guarantees come from unlinkability, not zero-knowledge circuits."

#### Infrastructure & Tooling
> "Galeon provides **payment infrastructure** with **auditable receipts on-chain** as a primitive. Private payments that any dApp can integrate—with proof that payments happened."

**Key talking points:**
- Reusable stealth address library
- Receipt generation/verification utilities
- Smart contract for any project to use
- Mantle's ~$0.02 per payment roundtrip makes this economically viable

#### Best Mantle Integration
> "Galeon is **built native to Mantle**. Each stealth payment requires 3 on-chain operations—~$0.02 total on Mantle vs $5+ on Ethereum. This fee structure makes private B2B payments viable for real businesses."

**Key talking points:**
- Payment roundtrip: transfer + ephemeral key + receipt anchor = ~$0.02
- Deployed exclusively on Mantle (testnet → mainnet)
- Supports MNT (native) and USDC
- Fee economics enable the receipt anchoring model

### Prize Probability Analysis

| Prize | Amount | Probability | Expected Value |
|-------|--------|-------------|----------------|
| Grand Prize | $30,000 | 3-5% | $1,200 |
| RWA / RealFi | $15,000 | 20-25% | $3,375 |
| ZK & Privacy | $15,000 | 10-15% | $1,875 |
| Infrastructure | $15,000 | 12-18% | $2,250 |
| Best UX/Demo | $5,000 | 15-20% | $875 |
| Best Mantle Integration | $4,000 | 10-15% | $500 |
| Community Choice | $6,000 | 5-10% | $450 |
| Incubation | $15,000 | 15-20% | $2,625 |

**Total Expected Value:** ~$13,150
**Probability of winning AT LEAST ONE prize:** 55-65%

---

## Technical Architecture

### Stealth Address Implementation (EIP-5564)

```
VENDOR SETUP (Once):
├── Generate spending keypair: (sk_spend, K_spend)
├── Generate viewing keypair: (sk_view, K_view)
├── Publish stealth meta-address: (K_spend, K_view)
└── Share payment link: galeon.xyz/vendor-name

PAYMENT FLOW:
├── Payer gets vendor's meta-address
├── Payer generates ephemeral key: r (random)
├── Payer computes stealth address: P = K_spend + hash(r·K_view)·G
├── Payer sends funds to P
├── Payer publishes R = r·G (ephemeral public key) on-chain
└── Payer signs receipt with payment details

RECEIVING FLOW:
├── Vendor scans for ephemeral keys (R) on-chain
├── For each R: compute P' = K_spend + hash(sk_view·R)·G
├── If P' has balance → payment detected
├── Derive private key: p = sk_spend + hash(sk_view·R)
└── Claim funds + store receipt
```

### Receipt Structure

```typescript
interface GaleonReceipt {
  // Public metadata
  receipt_id: string;          // "GR-2025-001234"
  amount: string;              // "5000.00"
  currency: string;            // "USDC" | "MNT"
  timestamp: string;           // ISO 8601
  description: string;         // "Website development - Phase 1"

  // Privacy-preserving linkage
  stealth_address: string;     // The one-time address
  ephemeral_pubkey: string;    // R value for recipient to detect

  // Signatures for verification
  payer_signature: string;     // Payer attests to payment
  payer_address: string;       // Payer's public address

  // On-chain anchor
  receipt_hash: string;        // keccak256(receipt) anchored on-chain
  tx_hash: string;             // Payment transaction hash
  anchor_block: number;        // Block where anchored
}
```

### Smart Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract GaleonRegistry {
    using SafeERC20 for IERC20;

    // Receipt hash → timestamp (proves receipt existed at time T)
    mapping(bytes32 => uint256) public receiptTimestamps;

    // Vendor stealth meta-address registry
    mapping(address => bytes) public stealthMetaAddresses;

    // Events for indexing
    event ReceiptAnchored(
        bytes32 indexed receiptHash,
        uint256 timestamp
    );

    event StealthPayment(
        address indexed stealthAddress,
        bytes32 indexed receiptHash,
        bytes ephemeralPubKey,
        uint256 amount,
        address token  // address(0) for native MNT
    );

    event MetaAddressRegistered(
        address indexed owner,
        bytes metaAddress
    );

    /// @notice Register vendor's stealth meta-address
    function registerMetaAddress(bytes calldata metaAddress) external {
        stealthMetaAddresses[msg.sender] = metaAddress;
        emit MetaAddressRegistered(msg.sender, metaAddress);
    }

    /// @notice Pay native MNT with receipt
    function payNative(
        address stealthAddress,
        bytes calldata ephemeralPubKey,
        bytes32 receiptHash
    ) external payable {
        require(msg.value > 0, "No payment");
        require(receiptTimestamps[receiptHash] == 0, "Receipt exists");

        // Transfer to stealth address
        (bool success, ) = stealthAddress.call{value: msg.value}("");
        require(success, "Transfer failed");

        // Anchor receipt
        receiptTimestamps[receiptHash] = block.timestamp;

        emit StealthPayment(
            stealthAddress,
            receiptHash,
            ephemeralPubKey,
            msg.value,
            address(0)
        );
    }

    /// @notice Pay ERC20 (USDC) with receipt
    function payERC20(
        address token,
        address stealthAddress,
        uint256 amount,
        bytes calldata ephemeralPubKey,
        bytes32 receiptHash
    ) external {
        require(amount > 0, "No payment");
        require(receiptTimestamps[receiptHash] == 0, "Receipt exists");

        // Transfer tokens
        IERC20(token).safeTransferFrom(msg.sender, stealthAddress, amount);

        // Anchor receipt
        receiptTimestamps[receiptHash] = block.timestamp;

        emit StealthPayment(
            stealthAddress,
            receiptHash,
            ephemeralPubKey,
            amount,
            token
        );
    }

    /// @notice Verify a receipt was anchored
    function verifyReceipt(bytes32 receiptHash)
        external
        view
        returns (bool exists, uint256 timestamp)
    {
        timestamp = receiptTimestamps[receiptHash];
        exists = timestamp > 0;
    }

    /// @notice Get vendor's meta-address
    function getMetaAddress(address vendor)
        external
        view
        returns (bytes memory)
    {
        return stealthMetaAddresses[vendor];
    }
}
```

### Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Blockchain** | Mantle L2 | Low fees, EVM compatible |
| **Cryptography** | @noble/secp256k1, @noble/hashes | Audited, browser-compatible |
| **Smart Contracts** | Solidity + Hardhat | Standard tooling |
| **Frontend** | Next.js 14 + TypeScript | App router, fast iteration |
| **Styling** | Tailwind CSS | Rapid UI development |
| **Wallet** | wagmi v2 + viem | Modern, type-safe |
| **State** | Zustand | Lightweight, simple |
| **Backend** | Next.js API Routes | No separate server, simpler deployment |
| **Indexer** | Ponder | Real-time blockchain indexing, GraphQL API |
| **Database** | PostgreSQL + Drizzle ORM | Type-safe, simple migrations |
| **Hosting** | Vercel (web) + Railway (Ponder + DB) | Quick deployment |

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         GALEON ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    NEXT.JS (Vercel)                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │   │
│  │  │   Frontend  │  │ API Routes  │  │  Stealth Crypto │  │   │
│  │  │   (React)   │  │  /api/*     │  │   (client-side) │  │   │
│  │  └─────────────┘  └──────┬──────┘  └─────────────────┘  │   │
│  └──────────────────────────┼──────────────────────────────┘   │
│                             │                                   │
│         ┌───────────────────┼───────────────────┐              │
│         │                   │                   │              │
│         ▼                   ▼                   ▼              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │  PostgreSQL │    │   Ponder    │    │   Mantle    │        │
│  │  (Railway)  │    │  (Railway)  │    │  Blockchain │        │
│  │             │    │  GraphQL    │    │             │        │
│  │  - vendors  │    │  - payments │    │  - contract │        │
│  │  - receipts │    │  - events   │    │  - events   │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Data flow:**
- **Vendor/receipt data** → PostgreSQL (via Next.js API routes)
- **On-chain events** → Ponder indexes → GraphQL API
- **Stealth crypto** → Client-side (browser)

### Database Schema

```sql
-- Vendors table
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  name VARCHAR(255),
  slug VARCHAR(100) UNIQUE NOT NULL,  -- for galeon.xyz/slug
  stealth_meta_address TEXT NOT NULL, -- encoded (K_spend, K_view)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Receipts table
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id VARCHAR(50) UNIQUE NOT NULL,  -- "GR-2025-001234"
  vendor_id UUID REFERENCES vendors(id),

  -- Payment details
  amount DECIMAL(36, 18) NOT NULL,
  currency VARCHAR(10) NOT NULL,  -- "MNT", "USDC"
  description TEXT,

  -- Blockchain data
  stealth_address VARCHAR(42) NOT NULL,
  ephemeral_pubkey TEXT NOT NULL,
  tx_hash VARCHAR(66),
  anchor_block BIGINT,
  receipt_hash VARCHAR(66) NOT NULL,

  -- Signatures
  payer_address VARCHAR(42) NOT NULL,
  payer_signature TEXT NOT NULL,
  vendor_signature TEXT,  -- Added when vendor acknowledges

  -- Status
  status VARCHAR(20) DEFAULT 'pending',  -- pending, confirmed, claimed
  detected_at TIMESTAMP,
  claimed_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_receipts_vendor ON receipts(vendor_id);
CREATE INDEX idx_receipts_stealth ON receipts(stealth_address);
CREATE INDEX idx_vendors_slug ON vendors(slug);
```

### API Endpoints

```typescript
// Next.js API Routes (app/api/*)

// === VENDORS ===

// Register new vendor
POST /api/vendors
Body: { walletAddress, name, slug, stealthMetaAddress }
Response: { vendor, paymentLink }

// Get vendor by slug (public - for payers)
GET /api/vendors/:slug
Response: { name, slug, stealthMetaAddress }

// Get vendor profile (authenticated)
GET /api/vendors/me
Headers: { Authorization: "Bearer <signature>" }
Response: { vendor, stats }

// === RECEIPTS ===

// Create receipt (called by payer after payment)
POST /api/receipts
Body: {
  vendorSlug, amount, currency, description,
  stealthAddress, ephemeralPubkey, txHash,
  receiptHash, payerAddress, payerSignature
}
Response: { receipt }

// Get receipts for vendor (authenticated)
GET /api/vendors/me/receipts
Headers: { Authorization: "Bearer <signature>" }
Query: { status?, page?, limit? }
Response: { receipts, pagination }

// Get single receipt (public - for verification)
GET /api/receipts/:receiptId
Response: { receipt, verification }

// Vendor acknowledges/signs receipt
POST /api/receipts/:receiptId/sign
Headers: { Authorization: "Bearer <signature>" }
Body: { vendorSignature }
Response: { receipt }

// Export receipts
GET /api/vendors/me/receipts/export
Headers: { Authorization: "Bearer <signature>" }
Query: { format: "json" | "csv", dateFrom?, dateTo? }
Response: File download

// === VERIFICATION ===

// Verify receipt authenticity
POST /api/verify
Body: { receiptId } | { receiptHash }
Response: { valid, receipt, onChainTimestamp }
```

### Authentication Strategy

Simple signature-based auth (no JWT complexity):

```typescript
// Client signs a message to prove wallet ownership
const message = `Galeon Auth\nTimestamp: ${Date.now()}`;
const signature = await signMessage({ message });

// Send in header
headers: {
  'X-Wallet-Address': address,
  'X-Signature': signature,
  'X-Timestamp': timestamp
}

// Server verifies
const isValid = await verifyMessage({
  address: walletAddress,
  message: `Galeon Auth\nTimestamp: ${timestamp}`,
  signature
});
```

---

## MVP Scope: Must-Have vs Nice-to-Have

### ✅ MUST HAVE (Week 1-2)

| Feature | Priority | Notes |
|---------|----------|-------|
| Stealth address generation | P0 | Core crypto |
| Smart contract deployment | P0 | On Mantle testnet |
| Native MNT payments | P0 | Simplest path |
| Receipt generation + signing | P0 | Core value prop |
| Receipt on-chain anchoring | P0 | Proves existence |
| Vendor dashboard | P0 | Shows payments, analytics |
| Payment link generation | P0 | How payers pay |
| Payer flow UI | P0 | Connect wallet → pay |
| Ponder indexer | P0 | Real-time payment detection |

### 🟡 SHOULD HAVE (Week 3)

| Feature | Priority | Notes |
|---------|----------|-------|
| USDC payments | P1 | ERC20 support |
| Receipt export (JSON/CSV) | P1 | Tax-ready format |
| **COP conversion + manual override** | P1 | DIAN compliance, fallback if API fails |
| Receipt verification UI | P1 | Public receipt verification |
| Smoke tests on Mantle | P1 | E2E validation on testnet |
| **Stealth mode for payers** | P1 | Payer privacy (don't block core flow) |

### ❌ NOT IN MVP

| Feature | Why Not |
|---------|---------|
| DIAN factura electrónica | Complex integration, post-hackathon |
| Invoice generation | Post-hackathon |
| Multi-chain | Mantle only |
| Mobile app | Web only |

---

## User Flows

### Merchant Flow

```
1. SETUP
   └── Connect wallet → Generate stealth keys → Register → Get payment link

2. RECEIVE PAYMENT
   └── Client pays → Ponder indexes → Dashboard shows payment

3. MANAGE
   └── View analytics → Export receipts (JSON/CSV with COP) → Verify receipts
```

### Client Flow (Standard)

```
1. PAY
   └── Click payment link → Enter amount/description → Pay to stealth address

2. RECEIPT
   └── Sign receipt → Download/share receipt
```

### Client Flow (Stealth Mode - Private Payer)

```
1. ENABLE STEALTH MODE
   └── Toggle "Pay Anonymously" → Generate ephemeral wallet in-browser

2. FUND EPHEMERAL WALLET
   └── Transfer funds from main wallet → Ephemeral wallet

3. PAY ANONYMOUSLY
   └── Pay from ephemeral wallet → Merchant's stealth address

4. CLEANUP
   └── Ephemeral wallet discarded (or sweep remaining funds back)
```

**Privacy levels:**

| Mode | Client Privacy | Merchant Privacy |
|------|----------------|------------------|
| Standard | 🟡 Visible (pays from main wallet) | ✅ Full (receives to stealth) |
| Stealth | ✅ Full (pays from ephemeral) | ✅ Full (receives to stealth) |

---

## Tax Compliance (DIAN-Ready)

### Receipt Fields for Export

```typescript
interface ExportableReceipt {
  // Core identifiers
  receipt_id: string;           // "GR-2025-001234"
  date: string;                 // ISO 8601

  // Amounts
  amount: string;               // "500.00"
  currency: string;             // "USDC" | "MNT"
  amount_cop: string;           // "2,150,000.00" (converted)
  exchange_rate: string;        // "4300.00" (COP per token)
  rate_source: string;          // "CoinGecko"
  rate_timestamp: string;       // When rate was fetched

  // Parties
  vendor_name: string;
  vendor_wallet: string;        // Public wallet (for NIT mapping)
  payer_wallet: string;         // Or "Anonymous" if stealth mode

  // Description
  description: string;          // "Diseño de logo - Proyecto X"

  // Verification
  tx_hash: string;
  receipt_hash: string;
  on_chain_timestamp: string;
  payer_signature: string;
  vendor_signature: string;
}
```

### Export Formats

**JSON Export:**
```json
{
  "export_date": "2025-01-15T10:00:00Z",
  "vendor": "Maria's Design Studio",
  "period": "2025-01",
  "total_cop": "15,450,000.00",
  "receipts": [...]
}
```

**CSV Export:**
```csv
receipt_id,date,amount,currency,amount_cop,description,payer_wallet,tx_hash
GR-2025-001234,2025-01-10,500.00,USDC,2150000.00,Diseño de logo,0x1234...abcd,0xabc...
```

### COP Conversion

```typescript
// lib/prices.ts
import { getCoinPrice } from './coingecko';

export async function convertToCOP(
  amount: number,
  currency: 'MNT' | 'USDC'
): Promise<{ cop: number; rate: number; timestamp: Date }> {
  // Get token price in USD
  const usdPrice = await getCoinPrice(currency);

  // Get USD/COP rate
  const copRate = await getCoinPrice('USD', 'COP'); // ~4300 COP

  return {
    cop: amount * usdPrice * copRate,
    rate: usdPrice * copRate,
    timestamp: new Date(),
  };
}
```

**Rate sources (fallback chain):**
1. CoinGecko API (primary)
2. CoinMarketCap API (backup)
3. Manual entry (if APIs fail)

---

## Development Plan

### Project Structure

```
galeon/
├── apps/
│   ├── web/                    # Next.js (frontend + API routes)
│   │   ├── app/
│   │   │   ├── page.tsx              # Landing
│   │   │   ├── setup/
│   │   │   │   └── page.tsx          # Vendor onboarding
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx          # Vendor dashboard
│   │   │   ├── pay/
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx      # Payer flow
│   │   │   ├── receipt/
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx      # Receipt viewer
│   │   │   └── api/                  # API routes (backend)
│   │   │       ├── vendors/
│   │   │       │   ├── route.ts          # POST /api/vendors
│   │   │       │   ├── [slug]/
│   │   │       │   │   └── route.ts      # GET /api/vendors/:slug
│   │   │       │   └── me/
│   │   │       │       ├── route.ts      # GET /api/vendors/me
│   │   │       │       └── receipts/
│   │   │       │           └── route.ts  # GET /api/vendors/me/receipts
│   │   │       ├── receipts/
│   │   │       │   ├── route.ts          # POST /api/receipts
│   │   │       │   └── [id]/
│   │   │       │       └── route.ts      # GET /api/receipts/:id
│   │   │       └── verify/
│   │   │           └── route.ts          # POST /api/verify
│   │   ├── components/
│   │   │   ├── ui/                   # Shadcn components
│   │   │   ├── WalletConnect.tsx
│   │   │   ├── PaymentForm.tsx
│   │   │   ├── ReceiptCard.tsx
│   │   │   └── DashboardStats.tsx
│   │   ├── lib/
│   │   │   ├── wagmi.ts              # Wallet config
│   │   │   ├── ponder.ts             # Ponder GraphQL client
│   │   │   ├── db/                   # Drizzle ORM
│   │   │   │   ├── schema.ts
│   │   │   │   └── index.ts
│   │   │   └── stealth/              # Core crypto (EIP-5564)
│   │   │       ├── index.ts
│   │   │       ├── keys.ts           # Keypair generation
│   │   │       ├── address.ts        # Stealth address math
│   │   │       └── types.ts
│   │   ├── hooks/
│   │   │   ├── useVendor.ts
│   │   │   ├── useReceipts.ts
│   │   │   ├── useStealth.ts
│   │   │   └── usePayments.ts        # Query Ponder for payments
│   │   └── package.json
│   │
│   └── indexer/                # Ponder (blockchain indexing)
│       ├── ponder.config.ts          # RPC, contracts config
│       ├── ponder.schema.ts          # Indexed data schema
│       ├── src/
│       │   └── index.ts              # Event handlers
│       └── package.json
│
├── packages/
│   └── contracts/              # Solidity + Hardhat
│       ├── contracts/
│       │   └── GaleonRegistry.sol
│       ├── test/
│       ├── scripts/
│       │   └── deploy.ts
│       ├── hardhat.config.ts
│       └── package.json
│
├── galeon-hackathon-plan.md
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

### apps/web - Next.js (Frontend + API)

Everything in one deployment:
- **Pages:** `/`, `/setup`, `/dashboard`, `/pay/[slug]`, `/receipt/[id]`
- **API Routes:** `/api/vendors`, `/api/receipts`, `/api/verify`
- **Stealth Crypto:** `lib/stealth/` (client-side)

### apps/indexer - Ponder (Blockchain Indexer)

Indexes on-chain events in real-time:

```typescript
// apps/indexer/ponder.schema.ts
import { onchainTable } from "ponder";

export const stealthPayments = onchainTable("stealth_payments", (t) => ({
  id: t.text().primaryKey(),
  stealthAddress: t.hex().notNull(),
  ephemeralPubKey: t.hex().notNull(),
  amount: t.bigint().notNull(),
  token: t.hex().notNull(),           // address(0) for MNT
  receiptHash: t.hex().notNull(),
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
}));

export const metaAddresses = onchainTable("meta_addresses", (t) => ({
  id: t.text().primaryKey(),
  owner: t.hex().notNull(),
  metaAddress: t.hex().notNull(),
  registeredAt: t.bigint().notNull(),
}));
```

```typescript
// apps/indexer/src/index.ts
import { ponder } from "ponder:registry";
import { stealthPayments, metaAddresses } from "ponder:schema";

ponder.on("GaleonRegistry:StealthPayment", async ({ event, context }) => {
  await context.db.insert(stealthPayments).values({
    id: event.log.id,
    stealthAddress: event.args.stealthAddress,
    ephemeralPubKey: event.args.ephemeralPubKey,
    amount: event.args.amount,
    token: event.args.token,
    receiptHash: event.args.receiptHash,
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
  });
});

ponder.on("GaleonRegistry:MetaAddressRegistered", async ({ event, context }) => {
  await context.db.insert(metaAddresses).values({
    id: event.log.id,
    owner: event.args.owner,
    metaAddress: event.args.metaAddress,
    registeredAt: event.block.timestamp,
  });
});
```

**Ponder provides:**
- GraphQL API (auto-generated)
- Real-time event indexing
- Query payments by stealth address, time range, etc.

### Week 1: Foundation (Dec 18-24)

**Goal:** Core crypto + contract + Ponder indexer deployed

| Day | Tasks |
|-----|-------|
| 1 | Monorepo setup (pnpm, turbo), Railway PostgreSQL |
| 2 | `lib/stealth/keys.ts` - keypair generation |
| 3 | `lib/stealth/address.ts` - stealth address math |
| 4 | `GaleonRegistry.sol` + tests |
| 5 | Deploy contract to Mantle testnet |
| 6 | Ponder setup, schema, event handlers |
| 7 | Deploy Ponder to Railway, test indexing |

**Week 1 Milestone:**
- Stealth address math works
- Contract deployed on Mantle testnet
- Ponder indexing events in real-time

### Week 2: Frontend + Integration (Dec 25-31)

**Goal:** Full flow working in browser

| Day | Tasks |
|-----|-------|
| 8 | Next.js setup, wagmi config, Drizzle schema |
| 9 | API routes: `/api/vendors`, `/api/receipts` |
| 10 | `/setup` - vendor onboarding (generate keys, register) |
| 11 | `/pay/[slug]` - payment flow (compute stealth, pay) |
| 12 | `/dashboard` - vendor dashboard (query Ponder) |
| 13 | Receipt signing, payment detection via Ponder |
| 14 | E2E testing, bug fixes |

**Week 2 Milestone:**
- Full flow: Setup → Pay → Detect → Receipt
- Dashboard shows payments from Ponder
- Basic UI working

### Week 3: Robustness + Evidence Bundle (Jan 1-7)

**Goal:** Production-quality system with proof package for judges

| Day | Tasks |
|-----|-------|
| 15 | USDC payment support |
| 16 | Manual COP override (fallback for oracle failures) |
| 17 | Receipt verification UI polish, error states |
| 18 | Smoke tests on Mantle testnet (full E2E) |
| 19 | Generate evidence bundle (see below), README |
| 20 | Submission descriptions (8 tracks), final testing |
| 21 | Submit! Buffer for issues |

**Week 3 Milestone:**
- USDC + MNT both working
- Evidence bundle complete
- All 8 tracks submitted

### Deployment Summary

| Service | Platform | URL |
|---------|----------|-----|
| **Next.js** (web + API) | Vercel | galeon.vercel.app |
| **Ponder** (indexer) | Railway | galeon-indexer.railway.app |
| **PostgreSQL** | Railway | (internal connection) |
| **Contract** | Mantle Testnet | explorer.testnet.mantle.xyz |

---

## Judge Walkthrough (Click-Order)

**Time to complete: ~3 minutes**

### Step 1: Verify Contract (30s)
1. [Contract on Mantlescan](https://explorer.testnet.mantle.xyz/address/0x...) → ✅ Source verified
2. Click "Read Contract" → `verifyReceipt("0xabc123...")` → returns timestamp

### Step 2: Make a Test Payment (60s)
1. [galeon.vercel.app/pay/demo-vendor](https://galeon.vercel.app/pay/demo-vendor)
2. Import test wallet (see below) or use your own
3. Pay **0.01 MNT** → observe tx goes to `0x7f3a...` (stealth address)
4. [View tx on Mantlescan](https://explorer.testnet.mantle.xyz/tx/0x...)

### Step 3: See Payment Detected (30s)
1. [galeon.vercel.app/dashboard](https://galeon.vercel.app/dashboard) (connect as demo-vendor)
2. Payment appears in ~10s (Ponder indexing)
3. Click receipt → see signatures, hash, on-chain anchor

### Step 4: Verify Receipt (30s)
1. [galeon.vercel.app/verify](https://galeon.vercel.app/verify)
2. Enter receipt ID: `GR-2025-000001`
3. See: on-chain timestamp, payer signature ✅, vendor signature ✅

### Step 5: Query Ponder GraphQL (30s)
1. [galeon-indexer.railway.app/graphql](https://galeon-indexer.railway.app/graphql)
2. Run query:
```graphql
query { stealthPayments(first: 5) { items { stealthAddress, amount, receiptHash } } }
```
3. See indexed payments from Mantle

### Step 6: Privacy Proof (30s)
1. Look at [stealth address on Mantlescan](https://explorer.testnet.mantle.xyz/address/0x7f3a...)
2. **No history** — this address was just created
3. **Cannot link** to vendor's main wallet `0xvendor...`
4. Yet receipt **proves** vendor received it

---

## Test Wallet (Pre-Funded)

**For judges to test without setup:**

```
Address: 0x... (will be populated before submission)
Private Key: ... (in evidence/test-credentials.md)
Balance: 1 MNT (testnet)
```

**Get more testnet MNT:**
- Faucet: https://faucet.testnet.mantle.xyz
- Enter address → receive 0.5 MNT

**Import to MetaMask:**
1. Settings → Networks → Add Network
2. Network: `Mantle Testnet`
3. RPC: `https://rpc.testnet.mantle.xyz`
4. Chain ID: `5003`
5. Import private key from test-credentials.md

---

## Competitive Landscape

| Project | What It Does | Why Galeon Wins |
|---------|--------------|-----------------|
| **Tornado Cash** | General mixing | No receipts, sanctioned, not for business |
| **Railgun** | Privacy pool | Not payment-focused, no receipt layer |
| **Aztec** | ZK L2 | Separate chain, complex, no receipts |
| **Request Network** | Invoicing | No privacy, payments are public |
| **Umbra (Scopelift)** | Stealth addresses | No receipt system, minimal UX |

**Key Differentiator:** No one combines stealth addresses with business-grade receipts.

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Stealth crypto bugs | 25% | High | Use audited @noble libraries, property tests |
| Mantle testnet issues | 15% | Medium | Have Sepolia fallback ready |
| Time overrun | 40% | High | Cut USDC/polish before core features |
| Oracle/FX API fails | 20% | Medium | Manual COP entry flag |
| Scope creep | 30% | Medium | Strict MVP checklist, say no to features |

---

## Resilience Measures

### Network Failovers

```typescript
// lib/rpc.ts
export const MANTLE_RPCS = [
  process.env.MANTLE_RPC_PRIMARY,    // Alchemy/Infura
  "https://rpc.mantle.xyz",           // Official public
  "https://mantle.drpc.org",          // DRPC fallback
];

// Sepolia mirror for emergencies
export const SEPOLIA_FALLBACK = process.env.SEPOLIA_RPC;
```

**Strategy:**
- Primary RPC via Alchemy/Infura (reliable, rate-limited)
- Public RPC as first fallback
- **Sepolia mirror**: Deploy same contract to Sepolia, switch if Mantle testnet has extended downtime

### FX Rate Fallbacks

```typescript
// lib/prices.ts
export async function getCOPRate(currency: 'MNT' | 'USDC'): Promise<FXResult> {
  try {
    // 1. CoinGecko (primary)
    return await fetchCoinGecko(currency);
  } catch {
    try {
      // 2. CoinMarketCap (backup)
      return await fetchCMC(currency);
    } catch {
      // 3. Return null → triggers manual entry UI
      return { rate: null, requiresManualEntry: true };
    }
  }
}
```

**Manual COP Override UI:**
- If APIs fail, show input field for vendor to enter rate
- Store rate source as "manual" in receipt
- Flag for accountant review

### Stealth Math Property Tests

```typescript
// lib/stealth/__tests__/properties.test.ts
import { fc } from 'fast-check';

describe('Stealth Address Properties', () => {
  it('recipient can always derive private key', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 32, maxLength: 32 }), (seed) => {
        const { spendKey, viewKey } = generateKeypair(seed);
        const { stealthAddress, ephemeralPubKey } = computeStealthAddress(spendKey.publicKey, viewKey.publicKey);
        const derivedPrivKey = deriveStealthPrivateKey(spendKey.privateKey, viewKey.privateKey, ephemeralPubKey);
        const derivedAddress = privateKeyToAddress(derivedPrivKey);
        return derivedAddress === stealthAddress;
      })
    );
  });

  it('different ephemeral keys produce different stealth addresses', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 32, maxLength: 32 }),
        fc.uint8Array({ minLength: 32, maxLength: 32 }),
        (seed1, seed2) => {
          if (seed1.toString() === seed2.toString()) return true; // Skip if same
          const keys = generateKeypair(Buffer.from('vendor-seed'));
          const addr1 = computeStealthAddress(keys.spendKey.publicKey, keys.viewKey.publicKey, seed1);
          const addr2 = computeStealthAddress(keys.spendKey.publicKey, keys.viewKey.publicKey, seed2);
          return addr1.stealthAddress !== addr2.stealthAddress;
        }
      )
    );
  });
});

// lib/stealth/__tests__/vectors.test.ts
// Cross-check against Umbra/EIP-5564 test vectors
describe('EIP-5564 Compatibility', () => {
  it('matches Umbra reference implementation', () => {
    // Test vector from https://github.com/ScopeLift/umbra-protocol
    const UMBRA_VECTOR = {
      spendingPubKey: '0x...',
      viewingPubKey: '0x...',
      ephemeralPrivKey: '0x...',
      expectedStealthAddress: '0x...',
    };
    const result = computeStealthAddress(
      UMBRA_VECTOR.spendingPubKey,
      UMBRA_VECTOR.viewingPubKey,
      UMBRA_VECTOR.ephemeralPrivKey
    );
    expect(result.stealthAddress).toBe(UMBRA_VECTOR.expectedStealthAddress);
  });
});
```

**Run tests:**
```bash
pnpm test              # All tests
pnpm test:stealth      # Stealth math only (property + vector tests)
```

### Ops Playbook (Emergency Procedures)

| Issue | Detection | Response |
|-------|-----------|----------|
| **Mantle RPC down** | API calls fail | Switch to fallback RPC in env vars |
| **Ponder lagging** | Dashboard shows stale data | Show banner "Syncing...", display cached sample receipts |
| **CoinGecko fails** | FX API returns error | Trigger manual COP entry UI |
| **Contract reverts** | Tx fails | Check gas, verify stealth address computation |

```typescript
// Quick env switch for RPC failover
// .env.local
NEXT_PUBLIC_RPC_URL=https://rpc.mantle.xyz  // Switch to backup if primary fails
NEXT_PUBLIC_CHAIN_ID=5003                    // Mantle testnet
// NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/...  // Emergency Sepolia
// NEXT_PUBLIC_CHAIN_ID=11155111
```

---

## Post-Hackathon Roadmap

### Phase 1: Hackathon MVP (Now)
- Core stealth payments + receipts
- Mantle testnet

### Phase 2: Production (Q1 2026)
- Security audit
- Mainnet deployment
- USDC + more tokens

### Phase 3: Features (Q2 2026)
- Invoice generation
- Auto-scanning background service
- Receipt PDF export
- Accounting integrations (QuickBooks, Xero)

### Phase 4: Scale (Q3 2026)
- Multi-chain (Base, Arbitrum)
- Batch payments (payroll!)
- Mobile app
- LatAm fiat on/off ramps

---

## Resources & References

### EIP-5564 (Stealth Addresses)
- Spec: https://eips.ethereum.org/EIPS/eip-5564
- Reference: https://github.com/nerolation/stealth-address-sdk
- Umbra implementation: https://github.com/ScopeLift/umbra-protocol

### Cryptography Libraries
- @noble/secp256k1: https://github.com/paulmillr/noble-secp256k1
- @noble/hashes: https://github.com/paulmillr/noble-hashes
- viem (has some stealth utils): https://viem.sh

### Mantle
- Docs: https://docs.mantle.xyz
- Testnet faucet: https://faucet.testnet.mantle.xyz
- Testnet explorer: https://explorer.testnet.mantle.xyz
- Mainnet explorer: https://explorer.mantle.xyz
- USDC on Mantle: Check official bridge

---

## Submission Checklist

### Before Submission (Jan 15)
- [ ] Working system on Mantle testnet
- [ ] GitHub repo (public)
- [ ] Evidence bundle (proof package)
- [ ] README with setup instructions
- [ ] All 8 tracks selected in form

### Evidence Bundle (Proof Package)

The centerpiece of submission—concrete proof the system works:

```
evidence/
├── README.md                    # Quick start, what each file proves
├── contract.md                  # Contract address + Mantlescan verified link
├── sample-receipts/
│   ├── receipt-001.json         # Full receipt with signatures
│   ├── receipt-002.json
│   └── receipt-003.json
├── transactions.md              # Mantlescan links to stealth payments
├── graphql-queries.md           # Example Ponder queries + results
└── test-credentials.md          # Test wallet with faucet MNT, how to test
```

**Evidence contents:**

| Item | What It Proves |
|------|----------------|
| **Contract address** | Source-verified on Mantlescan |
| **Sample receipt IDs** | `GR-2025-000001`, `GR-2025-000002`, etc. |
| **Receipt hashes** | Can verify on-chain via `verifyReceipt()` |
| **Mantlescan tx links** | Show payments to stealth addresses |
| **Cost breakdown** | Gas used + fee per tx (proves Mantle economics) |
| **GraphQL query** | Ponder indexing works, returns payment data |
| **Test wallet** | Funded with testnet MNT, judges can try it |

**Cost Documentation (Mantle Economics):**
```markdown
## Payment Cost Breakdown

| Operation | Tx Hash | Gas Used | Fee (MNT) | Fee (USD) |
|-----------|---------|----------|-----------|-----------|
| payNative() | 0xabc... | ~85,000 | 0.00017 | ~$0.008 |
| (total roundtrip) | - | ~85,000 | 0.00017 | ~$0.008 |

vs Ethereum Mainnet: ~$5-15 per payment
vs Mantle: ~$0.01-0.02 per payment

**50-500x cheaper** → makes receipt anchoring economically viable
```

### Submission Materials
- [ ] Project name: **Galeon**
- [ ] Tagline: "Your payments. Your treasure. Hidden in plain sight."
- [ ] Track selections (8 tracks)
- [ ] Project description (per-track angles ready)
- [ ] Demo link (deployed frontend)
- [ ] GitHub link
- [ ] Evidence bundle link (in repo or separate zip)

### Per-Track Descriptions

**Grand Prize:**
> Galeon solves the "privacy vs. compliance" dilemma for B2B crypto payments. Vendors receive funds to unlinkable stealth addresses (EIP-5564)—**privacy without mixers**—while every payment generates an **auditable receipt anchored on-chain**. A complete payment roundtrip costs ~$0.02 on Mantle vs $5+ on Ethereum, making private commerce economically viable.

**RWA / RealFi:**
> Galeon bridges crypto to real-world business requirements. Every payment generates a cryptographically signed receipt with **on-chain timestamp anchoring**—tax-ready, auditor-friendly, legally defensible. COP conversion for DIAN compliance. **Auditable receipts on-chain** without sacrificing vendor privacy.

**ZK & Privacy:**
> Galeon uses stealth addresses (EIP-5564) for **privacy without mixers or pools**. Each payment goes to a unique one-time address that only the recipient can detect. No mixing, no sanctions risk, no regulatory concerns—just cryptographic unlinkability. Receipts prove payments happened without revealing the recipient's identity.

**Infrastructure & Tooling:**
> Galeon provides reusable payment infrastructure: stealth address library, receipt generation/verification, and a smart contract any project can integrate. **Auditable receipts on-chain** as a primitive. Mantle's ~$0.02 per payment roundtrip makes this economically viable for high-frequency use.

**Best Mantle Integration:**
> Galeon is **built native to Mantle**. Each stealth payment requires: (1) token transfer, (2) ephemeral key publish, (3) receipt anchor—three operations that cost ~$0.02 total on Mantle vs $5+ on Ethereum. This fee structure makes private B2B payments viable for real businesses. Supports native MNT + USDC.

---

## Contact

- **Builder:** Mateo
- **Location:** Barranquilla, Colombia 🇨🇴
- **Background:** Sippy (WhatsApp payments), Prisma DIDs (Cardano)
- **GitHub:** [TBD]
- **Twitter:** [TBD]

---

*Last updated: December 20, 2025 (final polish)*
