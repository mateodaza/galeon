# Galeon Private Send (Fog Mode)

> Sender privacy through stealth address chains using EIP-5564

**Status:** MVP Specification
**Author:** Galeon Team
**Last Updated:** 2025-12-29

**MVP Scope:**

- Client-only fog (no backend delegation)
- Mainnet only (Mantle 5000)
- JSON export for Shipwreck (no PDF)

**Related Documents:**

- [Implementation Plan](./FOG-SHIPWRECK-PLAN.md) - Technical implementation details
- [Shipwreck Compliance](#shipwreck-compliance-mode) - Regulatory accountability feature

---

## Problem Statement

When Alice pays Bob using standard Ethereum transactions:

- Bob sees Alice's wallet address
- Bob can view Alice's entire balance and transaction history
- Bob knows Alice's ENS name, NFTs, token holdings, etc.

This is the "Coffee Shop Problem" — paying for a $5 coffee exposes your $100K savings.

**Vitalik Buterin (April 2024):** "Privacy should be normal."

## Solution Overview

Use stealth addresses bidirectionally — not just to protect the recipient (Bob), but to protect the sender (Alice).

### Core Insight

EIP-5564 stealth addresses provide **ownership privacy**: observers can see transactions TO an address, but cannot prove WHO CONTROLS that address without the private keys.

By chaining stealth addresses, we create **sender deniability**:

```
Alice (main wallet) → Stealth A (Alice's) → Bob's Port
```

Alice can always claim: "I paid someone at address A. I don't control it."

---

## Supported Networks

| Chain          | Chain ID | Status                 | Contract Addresses |
| -------------- | -------- | ---------------------- | ------------------ |
| Mantle Mainnet | 5000     | Production             | See below          |
| Mantle Sepolia | 5003     | Testnet (placeholders) | Not deployed       |

### Mantle Mainnet Contract Addresses

```typescript
const CONTRACTS = {
  announcer: '0x8C04238c49e22EB687ad706bEe645698ccF41153', // ERC5564Announcer
  registry: '0xE6586103756082bf3E43D3BB73f9fE479f0BDc22', // ERC6538Registry
  galeon: '0x85F23B63E2a40ba74cD418063c43cE19bcbB969C', // GaleonRegistry
  tender: '0x29D52d01947d91e241e9c7A4312F7463199e488c', // GaleonTender
}
```

---

## Technical Flow

### Step 1: Alice Creates a "Fog Wallet"

Alice generates a stealth address for herself using `deriveFogKeys` with a **separate derivation domain** from Ports.

```typescript
import {
  deriveFogKeys, // Separate domain from derivePortKeys
  generateStealthAddressDeterministic,
} from '@galeon/stealth'
import { secp256k1 } from '@noble/curves/secp256k1'

// Alice's master signature (from StealthContext, must be persisted)
const masterSignature: `0x${string}` = aliceContext.masterSignature

// Generate fog-specific keys using deriveFogKeys (NOT derivePortKeys!)
// Uses domain 'galeon-fog-keys-v1' to ensure fog index 0 ≠ port index 0
const fogIndex = nextFogWalletId // 0, 1, 2, ...

const fogKeys = deriveFogKeys(masterSignature, fogIndex, 'mnt')

// Generate ephemeral keypair for the stealth address
const ephemeralPrivateKey = secp256k1.utils.randomSecretKey()

// Generate stealth address A for Alice herself
const {
  stealthAddress: addressA,
  ephemeralPublicKey,
  viewTag,
} = generateStealthAddressDeterministic(fogKeys.stealthMetaAddress, ephemeralPrivateKey)
```

**Important:** `deriveFogKeys` uses a different derivation domain than `derivePortKeys`, ensuring:

- Port index 0 and Fog index 0 produce different keys
- Analyzing port keys reveals nothing about fog keys
- Clear separation for audit/compliance

### Step 2: Alice Funds Fog Wallet

Alice sends the payment amount (+ gas buffer) to Stealth A:

```typescript
import { parseEther } from 'viem'

// Calculate gas buffer for the outbound payment
// Mantle uses ~21000 gas for ETH transfer, ~100000 for contract call
// Current gas price on Mantle is very low (~0.02 gwei)
const GAS_BUFFER = parseEther('0.01') // ~0.01 MNT covers multiple txs

const fundingAmount = paymentAmount + GAS_BUFFER

// Simple transfer from Alice's main wallet to Stealth A
await walletClient.sendTransaction({
  to: addressA,
  value: fundingAmount,
})
```

**Self-Announcement Trade-off:**

Standard EIP-5564 flow would announce this payment. **However:**

```typescript
// SKIP THIS for maximum sender privacy:
// await announcer.announce(SCHEME_ID, addressA, ephemeralPublicKey, metadata)
//
// Why: This emits caller=Alice, linking Alice to A in announcer logs
// Instead: Store fog wallet metadata locally
```

**On-chain visibility (without announcement):**

- Transaction: `Alice → Stealth A` (visible)
- No announcement event linking Alice to A's stealth meta-address

### Step 3: Pay from Fog Wallet

Alice derives the private key for Stealth A and pays Bob:

```typescript
import { deriveStealthPrivateKey, generateStealthAddress } from '@galeon/stealth'
import { privateKeyToAccount, createWalletClient, http } from 'viem'
import { mantle } from 'viem/chains'
import { bytesToHex } from '@galeon/stealth/utils'

// Derive private key for Stealth A
// NOTE: Argument order is (ephemeralPubKey, spendingKey, viewingKey)
const { stealthAddress: derivedAddress, stealthPrivateKey } = deriveStealthPrivateKey(
  ephemeralPublicKey, // 33 bytes - the ephemeral pubkey used to create A
  fogKeys.spendingPrivateKey, // 32 bytes - from derivePortKeys
  fogKeys.viewingPrivateKey // 32 bytes - from derivePortKeys
)

// Verify we derived the correct address
if (derivedAddress.toLowerCase() !== addressA.toLowerCase()) {
  throw new Error('Stealth address derivation mismatch')
}

// Create wallet client for Stealth A (the Fog wallet)
const fogAccount = privateKeyToAccount(`0x${bytesToHex(stealthPrivateKey)}`)
const fogWallet = createWalletClient({
  account: fogAccount,
  chain: mantle,
  transport: http('https://rpc.mantle.xyz'),
})

// Generate stealth address for Bob's Port (random ephemeral key)
const bobStealthResult = generateStealthAddress(bobPortMetaAddress)

// Build receipt hash (must match contract expectation - see Receipt Hash Schema)
const receiptHash = computeReceiptHash(memo, paymentAmount, bobPortId)

// Pay Bob's Port via GaleonRegistry
await fogWallet.writeContract({
  address: '0x85F23B63E2a40ba74cD418063c43cE19bcbB969C', // GaleonRegistry
  abi: galeonRegistryAbi,
  functionName: 'payNative',
  args: [
    bobStealthResult.stealthAddress,
    `0x${bytesToHex(bobStealthResult.ephemeralPublicKey)}`,
    `0x${bobStealthResult.viewTag.toString(16).padStart(2, '0')}`,
    receiptHash,
  ],
  value: paymentAmount,
})
```

**On-chain visibility:**

- Transaction: `Stealth A → GaleonRegistry → Bob's stealth` (visible)
- Announcement: `caller=A, stealthAddress=Bob's stealth` (visible)
- **Alice's identity: NOT visible in this transaction**

---

## Receipt Hash Schema

The receipt hash allows verification that a specific payment was made with specific parameters.

**Alignment Note:** This `computeReceiptHash` function MUST be used consistently across:

- Frontend (`apps/web/hooks/use-payment.ts`)
- Backend (if/when delegation is implemented)
- Shipwreck report verification

Any implementation that computes or verifies receipt hashes must use this exact schema.

### Current Implementation

```typescript
import { keccak256, encodePacked } from 'viem'

function computeReceiptHash(
  memo: string,
  amount: bigint, // in wei
  portId?: `0x${string}`
): `0x${string}` {
  const memoOrDefault = memo || 'Galeon Payment'

  if (portId) {
    // With portId (recommended for Fog mode payments)
    return keccak256(
      encodePacked(['string', 'uint256', 'bytes32'], [memoOrDefault, amount, portId])
    )
  }

  // Without portId (legacy)
  return keccak256(encodePacked(['string', 'uint256'], [memoOrDefault, amount]))
}
```

### Metadata Encoding (Announcements)

Metadata stored in announcements follows this format:

| Bytes | Field       | Description                                |
| ----- | ----------- | ------------------------------------------ |
| 0     | viewTag     | Single byte for efficient scanning (0-255) |
| 1-32  | receiptHash | 32-byte keccak256 hash                     |
| 33-52 | token       | (Token payments only) ERC-20 address       |
| 53-84 | amount      | (Token payments only) uint256 amount       |

**Total:** 33 bytes (native) or 85 bytes (token)

---

## Mantle-Specific Considerations

### Gas Configuration

```typescript
const MANTLE_GAS_CONFIG = {
  // Mantle has very low gas prices (~0.02 gwei typical)
  maxFeePerGas: parseGwei('0.05'),
  maxPriorityFeePerGas: parseGwei('0.02'),

  // Gas limits
  ethTransferGas: 21_000n,
  contractCallGas: 100_000n, // Safe upper bound for payNative

  // Buffer for fog wallet funding
  recommendedBuffer: parseEther('0.01'),
}
```

### RPC Endpoints

```typescript
const MANTLE_RPC = {
  mainnet: [
    'https://rpc.mantle.xyz', // Official
    'https://mantle.drpc.org', // DRPC
    'https://mantle-mainnet.public.blastapi.io', // Blast
  ],
  sepolia: [
    'https://rpc.sepolia.mantle.xyz', // Official testnet
  ],
}
```

### Transaction Type

Mantle supports EIP-1559 transactions (preferred) and legacy transactions:

```typescript
// Preferred: EIP-1559
await fogWallet.sendTransaction({
  to: recipient,
  value: amount,
  maxFeePerGas: parseGwei('0.05'),
  maxPriorityFeePerGas: parseGwei('0.02'),
})
```

---

## Persistence Requirements

### What Must Be Stored

Fog wallets require storing the following to reconstruct the private key later:

```typescript
interface FogWalletStorage {
  // Unique identifier
  id: string

  // For deriving fog keys via derivePortKeys(masterSig, fogIndex)
  fogIndex: number

  // For deriving stealth private key (SENSITIVE - encrypt at rest)
  ephemeralPrivateKey: Uint8Array

  // Derived (can be recomputed but cached for convenience)
  stealthAddress: `0x${string}`
  viewTag: number

  // State tracking
  status: 'pending' | 'funded' | 'spent' | 'abandoned'
  fundedAt?: number // Unix timestamp
  fundingTxHash?: `0x${string}`
  spentTxHash?: `0x${string}`
  balance?: bigint
}
```

### Storage Options

| Option                     | Pros                       | Cons                         |
| -------------------------- | -------------------------- | ---------------------------- |
| **Memory only** (current)  | No persistence complexity  | Lost on tab close            |
| **localStorage**           | Simple, survives refresh   | Plaintext, single device     |
| **IndexedDB + encryption** | Encrypted, larger capacity | More complex                 |
| **Backend API**            | Multi-device, backup       | Requires auth, trust backend |

### Current Limitation

**The app currently keeps keys in memory only (StealthContext).** Users must:

1. Keep the browser tab open while fog payment completes
2. Or re-derive keys before spending (requires master signature still in context)

**Recommended for MVP:** Store `fogIndex` + `ephemeralPrivateKey` encrypted in localStorage.

---

## Privacy Model

### What Observers See

| Data Point                    | Visible              | Can Prove Ownership |
| ----------------------------- | -------------------- | ------------------- |
| Alice funded address A        | Yes                  | No                  |
| A is a stealth address        | Maybe (if announced) | -                   |
| A paid Bob's stealth address  | Yes                  | No                  |
| Alice controls A              | No                   | No                  |
| Payment originated from Alice | No                   | No                  |

### Deniability Claim

Alice can truthfully state:

> "I sent funds to address A. I don't know who controls it — it's a stealth address."

This is cryptographically true. Without Alice's spending key, no one can prove she controls A.

### Privacy Level: Heuristic, Not Cryptographic

| Property                    | Status                          |
| --------------------------- | ------------------------------- |
| Transaction traceability    | Traceable (A → B visible)       |
| Ownership provability       | Not provable (stealth property) |
| Plausible deniability       | Yes                             |
| Cryptographic unlinkability | No                              |

**Analogy:** Like cash — the bills can be traced, but ownership is deniable.

---

## Threat Model

### Protected Against

- **Curious merchants** — Cannot see Alice's balance or history
- **Competitors** — Cannot trace business payment flows
- **Casual observers** — Cannot link payment to Alice's identity
- **Chain explorers** — See transactions but not ownership

### NOT Protected Against

- **Sophisticated chain analysis** with timing/amount correlation
- **Legal subpoenas** that compel key disclosure
- **Long-term pattern analysis** of repeated behavior
- **Nation-state adversaries** with full chain visibility

---

## Known Weaknesses

### 1. Timing Correlation

If A → Bob happens immediately after Alice → A, it's suspicious.

**Mitigation:** Introduce random delay (1-24 hours) between funding and payment.

### 2. Amount Correlation

If Alice → A is 1.5 MNT and A → Bob is 1.45 MNT, it's traceable.

**Mitigation:**

- Split into multiple payments
- Add random small amounts
- Leave dust in intermediate addresses

### 3. Gas Funding Link

Stealth A needs gas to send transactions.

**Current approach:** Fund with extra during initial transfer.
**Correlation risk:** Exact `payment + gas` amount is a signal.

**Future mitigation:** ERC-4337 paymaster for gas sponsorship.

### 4. Self-Announcement Leak

If Alice announces the self-payment, `caller=Alice` appears in announcer logs.

**Mitigation:** Skip announcement for self-funding; store fog metadata locally.

### 5. Pattern Analysis

If Alice repeatedly funds addresses that immediately forward...

**Mitigation:**

- Vary timing and amounts
- Use multiple intermediate hops
- Mix with legitimate stealth receives

### 6. Small Anonymity Set

If few users use Fog Mode, Alice's transactions stand out.

**Mitigation:** Grow user base; encourage all payments through stealth addresses.

---

## Implementation Checklist

### P0: Must Have (MVP)

- [ ] `useFogWallet` hook using `derivePortKeys(sig, FOG_INDEX_OFFSET + id)`
- [ ] Single hop (Alice → A → Bob)
- [ ] Gas buffer included in funding
- [ ] Skip self-announcement (for privacy)
- [ ] Ephemeral key storage in localStorage (encrypted)
- [ ] UI: "Pay with Fog" toggle on payment page

### P1: Should Have

- [ ] Timing delay option (1h, 6h, 24h)
- [ ] Amount variance (±1-5% random)
- [ ] Recovery flow if tab closed mid-payment
- [ ] Dedicated `deriveFogKeys()` with separate domain

### P2: Nice to Have

- [ ] Multiple hops (A → B → C → Bob)
- [ ] ERC-4337 paymaster for gas sponsorship
- [ ] Cross-chain hop via bridge

### P3: Future Research

- [ ] ZK proof of solvency
- [ ] Commit-reveal scheme
- [ ] Shared fog pool for larger anonymity set

---

## API Reference

### Existing Functions (from @galeon/stealth)

```typescript
// Derive keys for a fog wallet (using port key derivation)
derivePortKeys(
  masterSignature: `0x${string}`,
  portIndex: number,              // Use FOG_INDEX_OFFSET + fogId
  chainPrefix?: 'mnt' | 'eth'     // Default: 'mnt'
): StealthKeys

// Generate stealth address with specific ephemeral key
generateStealthAddressDeterministic(
  stealthMetaAddress: StealthMetaAddress,
  ephemeralPrivateKey: Uint8Array  // 32 bytes
): StealthAddressResult

// Derive private key to spend from stealth address
// NOTE: Order is (ephemeralPubKey, spendingKey, viewingKey)
deriveStealthPrivateKey(
  ephemeralPublicKey: Uint8Array,   // 33 bytes (compressed)
  spendingPrivateKey: Uint8Array,   // 32 bytes
  viewingPrivateKey: Uint8Array     // 32 bytes
): { stealthAddress: `0x${string}`; stealthPrivateKey: Uint8Array }

// Generate random stealth address (for Bob's payment)
generateStealthAddress(
  stealthMetaAddress: StealthMetaAddress
): StealthAddressResult
```

### Types

```typescript
interface StealthKeys {
  spendingPrivateKey: Uint8Array // 32 bytes
  spendingPublicKey: Uint8Array // 33 bytes (compressed)
  viewingPrivateKey: Uint8Array // 32 bytes
  viewingPublicKey: Uint8Array // 33 bytes (compressed)
  stealthMetaAddress: StealthMetaAddress
}

interface StealthAddressResult {
  stealthAddress: `0x${string}`
  ephemeralPublicKey: Uint8Array // 33 bytes (compressed)
  viewTag: number // 0-255
}

type StealthMetaAddress = `st:${'eth' | 'mnt'}:0x${string}`
// Format: st:<prefix>:0x<spendingPubKey:33bytes><viewingPubKey:33bytes>
// Total hex after 0x: 132 chars (66 bytes)
```

---

## Security Considerations

### Private Key Handling

Fog wallet private keys are derived from:

1. User's master signature (from wallet, stored in StealthContext)
2. Fog index (stored with fog wallet metadata)
3. Ephemeral keypair (generated per-fog, must be stored)

**Risk:** If ephemeral private key is compromised, Fog wallet funds are at risk.

**Mitigation:**

- Encrypt ephemeral keys at rest (use Web Crypto API)
- Clear from memory after spending
- Never transmit to backend

### Master Signature Persistence

The master signature is currently in React context (memory). For fog wallets to be recoverable across sessions:

- Store master signature encrypted in localStorage, OR
- Re-prompt user to sign derivation message when recovering

---

## Comparison with Alternatives

| Solution             | Privacy Level | Regulatory Risk | Complexity | UX      |
| -------------------- | ------------- | --------------- | ---------- | ------- |
| **Galeon Fog**       | Deniability   | Low (no mixing) | Low        | Good    |
| Tornado Cash         | Cryptographic | High (OFAC)     | Medium     | Medium  |
| Railgun              | Cryptographic | Medium          | High       | Complex |
| Fresh Wallet via CEX | Deniability   | Low             | Low        | Poor    |
| ZK Payments          | Cryptographic | Medium          | Very High  | Poor    |

**Galeon Fog's advantage:** Standards-compliant (EIP-5564), no mixer, no new tokens, simple UX.

---

## Open Questions

1. **Should fog wallets be persistent or one-time?**
   - One-time: Better privacy, more gas
   - Persistent: Worse privacy, less gas

2. **How to handle failed payments?**
   - Funds stuck in fog wallet need recovery mechanism
   - Derive key again with stored fogIndex + ephemeralPrivateKey

3. **Multi-hop vs single-hop default?**
   - Single: Simpler, cheaper (recommended for MVP)
   - Multi: Better privacy, more complex

4. **Should delay be mandatory or optional?**
   - Mandatory: Better privacy for all
   - Optional: User choice, but may weaken anonymity set

---

## Fog Reserve Model (Recommended)

Instead of on-demand fog wallet creation, users pre-fund a "Fog Reserve":

### Why Pre-Funding is Better

```
On-Demand (weaker privacy):
T+0:    Alice → Fog A (funding)     ← Visible correlation
T+0:    Fog A → Bob (payment)       ← Immediate link

Pre-Funded Reserve (stronger privacy):
T-7d:   Alice → Fog A (funding)     ← Looks like normal activity
T-5d:   Alice → Fog B (funding)     ← Mixed with other transactions
T+0:    Fog B → Bob (payment)       ← No temporal correlation
```

### Fog Reserve UX

```
┌─────────────────────────────────────────────────────────────┐
│  FOG RESERVE                                                │
│                                                             │
│  Available fog wallets: 3                                   │
│  Total balance: 15.5 MNT                                    │
│                                                             │
│  ┌──────────┬──────────┬──────────┐                        │
│  │  Fog #1  │  Fog #2  │  Fog #3  │   [ + Add Fog Wallet ] │
│  │  5.0 MNT │  5.2 MNT │  5.3 MNT │                        │
│  │  Ready   │  Ready   │  Ready   │                        │
│  └──────────┴──────────┴──────────┘                        │
│                                                             │
│  Tip: Fund fog wallets during normal activity.              │
│       Use them days later for maximum privacy.              │
└─────────────────────────────────────────────────────────────┘
```

### Session Management

Fog Reserve uses wallet-signature-as-key pattern for secure persistence:

```typescript
// User signs to unlock fog reserve
const SESSION_MESSAGE = `Galeon Fog Session v1

Sign to unlock your fog reserve.
This does NOT authorize any transactions.

Chain: Mantle (5000)`

// Signature hash becomes AES-256 encryption key
const sessionKey = keccak256(signature)

// localStorage stores encrypted fog wallet METADATA only
// No private keys are ever stored - they're derived on-demand from masterSignature + fogIndex
```

**Security Properties:**

| Property          | Implementation                                              |
| ----------------- | ----------------------------------------------------------- |
| Encryption        | AES-256-GCM with per-wallet random IV                       |
| Key derivation    | keccak256(wallet signature) → 32-byte key                   |
| What's stored     | fogIndex, stealthAddress, fundedAt, fundingTxHash           |
| What's NOT stored | Private keys, spending keys, ephemeral keys                 |
| Recovery          | If localStorage cleared, scan chain for fog wallet balances |

**Critical:** Fog wallet private keys are derived on-demand when needed for spending:

```typescript
// When spending from fog wallet:
const fogKeys = deriveFogKeys(masterSignature, fogIndex, 'mnt')
const privateKey = fogKeys.spendingPrivateKey // Use immediately, never persist
```

### Optional: Scheduled Payments (Future Enhancement)

> **Note:** Scheduled payments via backend delegation are NOT part of MVP. MVP supports instant payments only.

For scheduled payments, user delegates to backend with time-bound authorization:

```typescript
interface FogDelegation {
  fogAddress: `0x${string}`
  recipient: `0x${string}`
  amount: bigint

  // Time bounds (cryptographically signed)
  sendAt: number // Earliest execution time
  expiresAt: number // Latest execution time

  // User signs all parameters - backend cannot deviate
  userSignature: `0x${string}`
}
```

Backend can only execute within the signed time window. If it deviates, user's signature proves misbehavior.

---

## Shipwreck: Compliance Mode

"When the ship goes down, the cargo surfaces."

Shipwreck allows users to generate compliance reports proving fog wallet ownership and usage.

### Why This Matters

| Concern          | Tornado Cash           | Galeon + Shipwreck        |
| ---------------- | ---------------------- | ------------------------- |
| Regulatory       | Sanctioned by OFAC     | Compliant by design       |
| Auditability     | Cannot prove ownership | Cryptographic proof       |
| Tax reporting    | Impossible             | Full transaction history  |
| Legal protection | None                   | "I can prove my payments" |

### Report Structure

```typescript
interface ShipwreckReport {
  // What's being disclosed
  fogWallets: Array<{
    stealthAddress: `0x${string}`
    derivationProof: { masterPubKey; fogIndex; expectedAddress }
    fundingTx: { txHash; from; amount; timestamp }
    payments: Array<{ txHash; to; amount; timestamp }>
  }>

  // Cryptographic attestation
  attestation: {
    message: string // "I controlled these fog wallets..."
    reportHash: `0x${string}` // Hash of report data
    signature: `0x${string}` // User's signature
  }
}
```

### Verification

Any third party can verify a Shipwreck report:

1. **Check signature** - User signed the report hash
2. **Verify derivation** - `derivePortKeys(masterPubKey, fogIndex)` matches disclosed addresses
3. **Check on-chain** - Transactions exist with correct parameters

The user cannot fake ownership of wallets they don't control.

### UX Flow

```
1. User opens /compliance
2. Selects fog wallets to disclose
3. Selects date range
4. System generates derivation proofs
5. User reviews and signs attestation
6. Export PDF/JSON for auditor
```

---

## References

- [EIP-5564: Stealth Addresses](https://eips.ethereum.org/EIPS/eip-5564)
- [EIP-6538: Stealth Meta-Address Registry](https://eips.ethereum.org/EIPS/eip-6538)
- [Vitalik's Stealth Address Guide](https://vitalik.eth.limo/general/2023/01/20/stealth.html)
- [Kohaku Privacy Roadmap](https://ethereum.org/en/roadmap/privacy/)
- [@galeon/stealth README](../packages/stealth/README.md)
- [Implementation Plan](./FOG-SHIPWRECK-PLAN.md)
