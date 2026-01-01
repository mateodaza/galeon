# Galeon Privacy Pools Specification

> Compliant Privacy Mixing for Private Payments

## Overview

Privacy Pools is a mixing protocol that allows Galeon users to break the link between receiving and sending payments, while maintaining full compliance capability.

**Key Innovation**: Port-only deposits mean all funds are "pre-vetted" - they came from covenant signers paying each other.

**The Galeon Covenant**: Users sign a compliance agreement to join, creating a self-policing community of good actors.

**Core Principle**: Privacy from the public, not from law enforcement.

---

## Phased Implementation

### Phase 1: MVP (v0)

| Component         | v0 Implementation                  | Upgrade Path                              |
| ----------------- | ---------------------------------- | ----------------------------------------- |
| **Pool Deposits** | Port addresses only                | Add external deposits with chain analysis |
| **ASP**           | Simple ban list (owner-controlled) | DAO governance + chain analysis APIs      |
| **Shipwreck**     | Owner-only reports                 | Community reporting with reputation       |
| **ZK Proofs**     | Commit-reveal with timelock        | Full Groth16 ZK proofs                    |
| **Withdrawals**   | To stealth addresses only          | Add relayer for gas-free withdrawals      |

### v0 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      GALEON v0 - PORT-ONLY POOL                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│   FLOW: Receive → Pool → Withdraw → Pay                              │
│                                                                       │
│   ┌──────────────────┐                                               │
│   │  PORT RECEIVES   │  ← Someone pays your payment link             │
│   │  PAYMENT         │                                               │
│   └────────┬─────────┘                                               │
│            │                                                          │
│            ▼                                                          │
│   ┌──────────────────┐                                               │
│   │  DEPOSIT TO      │  ← Fixed denomination (1 MNT)                 │
│   │  PRIVACY POOL    │  ← Must be from Port stealth address          │
│   └────────┬─────────┘                                               │
│            │                                                          │
│            │  Wait for anonymity set to grow                         │
│            ▼                                                          │
│   ┌──────────────────┐                                               │
│   │  WITHDRAW TO     │  ← Commit-reveal (v0) or ZK proof (v1)        │
│   │  FOG WALLET      │  ← Breaks link between receive and send       │
│   └────────┬─────────┘                                               │
│            │                                                          │
│            ▼                                                          │
│   ┌──────────────────┐                                               │
│   │  PAY FROM        │  ← Private payment to any address             │
│   │  FOG WALLET      │                                               │
│   └──────────────────┘                                               │
│                                                                       │
│   WHY PORT-ONLY:                                                      │
│   • All deposits traced to covenant signers                          │
│   • No need for complex chain analysis                               │
│   • "Clean by design" - funds came from verified users               │
│   • Simpler ASP logic (just check ban list)                          │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Phase 2: Full Vision

- External deposits with Chainalysis/TRM Labs integration
- ZK proofs for withdrawal privacy
- Community Shipwreck reporting with reputation system
- DAO-controlled ASP governance
- Multi-denomination pools
- Relayer network for gas-free withdrawals

---

## The Galeon Covenant

### Core Concept

> "Private payments for good actors."

When users join Galeon, they sign the **Galeon Covenant** - a cryptographic agreement that:

1. Attests they're not a bad actor
2. Commits to reporting if they discover bad actors
3. Accepts that Galeon may exclude violators

**This is the "catch"** - you can't just use the privacy pool anonymously. You must sign in.

### Why This Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    THE GALEON FLYWHEEL                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐                                              │
│   │ User wants   │                                              │
│   │ privacy      │                                              │
│   └──────┬───────┘                                              │
│          │                                                       │
│          ▼                                                       │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │
│   │ Signs        │────▶│ Creates      │────▶│ Joins        │   │
│   │ Covenant     │     │ Port         │     │ Privacy Pool │   │
│   └──────────────┘     └──────────────┘     └──────────────┘   │
│          │                                          │            │
│          │                                          ▼            │
│          │                                  ┌──────────────┐    │
│          │                                  │ Anonymity    │    │
│          │                                  │ set grows    │    │
│          │                                  └──────┬───────┘    │
│          │                                         │            │
│          ▼                                         ▼            │
│   ┌──────────────────────────────────────────────────────┐     │
│   │            BETTER PRIVACY FOR EVERYONE                │     │
│   └──────────────────────────────────────────────────────┘     │
│                                                                  │
│   BAD ACTORS:                                                    │
│   • Must sign covenant (creates liability)                      │
│   • Will eventually be reported by counterparties               │
│   • Get excluded from pool (funds stuck)                        │
│   • Pool survives (unlike Tornado Cash)                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Covenant Data Structure

```typescript
// EIP-712 Typed Data for Covenant Signature
const COVENANT_TYPES = {
  GaleonCovenant: [
    { name: 'signer', type: 'address' },
    { name: 'stealthMetaAddress', type: 'string' },
    { name: 'attestations', type: 'Attestations' },
    { name: 'version', type: 'uint256' },
    { name: 'timestamp', type: 'uint256' },
  ],
  Attestations: [
    { name: 'notSanctioned', type: 'bool' },
    { name: 'fundsLegitimate', type: 'bool' },
    { name: 'willReport', type: 'bool' },
    { name: 'acceptsTerms', type: 'bool' },
  ],
}

interface GaleonCovenant {
  // Identity
  signer: `0x${string}` // Main wallet address
  stealthMetaAddress: string // Their st:mnt:... address

  // Attestations (all must be true to sign)
  attestations: {
    notSanctioned: true // "I'm not on OFAC/UN/EU sanctions lists"
    fundsLegitimate: true // "My funds are not from illegal activities"
    willReport: true // "I'll report if I discover my counterparty is bad"
    acceptsTerms: true // "I accept Galeon's terms and exclusion rights"
  }

  // Metadata
  version: 1 // Covenant version (for upgrades)
  timestamp: number // When signed (Unix ms)

  // The signature
  signature: `0x${string}` // EIP-712 typed signature
}
```

### Covenant Storage

| Location     | Data                      | Purpose                              |
| ------------ | ------------------------- | ------------------------------------ |
| On-chain     | `covenantHash`            | Proof user signed (can't deny later) |
| Backend      | Full covenant + signature | Verification, legal compliance       |
| LocalStorage | Signature only            | Quick re-verification                |

### Covenant On-Chain Registry

```solidity
// contracts/GaleonCovenantRegistry.sol
contract GaleonCovenantRegistry {
    // Mapping from address to covenant hash
    mapping(address => bytes32) public covenantHashes;

    // Mapping from address to timestamp
    mapping(address => uint256) public signedAt;

    // Events
    event CovenantSigned(address indexed signer, bytes32 covenantHash, uint256 timestamp);
    event CovenantRevoked(address indexed signer, string reason);

    /**
     * @notice Register a signed covenant
     * @param covenantHash Hash of the full covenant data
     */
    function registerCovenant(bytes32 covenantHash) external {
        require(covenantHashes[msg.sender] == bytes32(0), "Already signed");

        covenantHashes[msg.sender] = covenantHash;
        signedAt[msg.sender] = block.timestamp;

        emit CovenantSigned(msg.sender, covenantHash, block.timestamp);
    }

    /**
     * @notice Check if an address has signed the covenant
     */
    function hasCovenant(address account) external view returns (bool) {
        return covenantHashes[account] != bytes32(0);
    }
}
```

---

## Viral Growth Mechanics

### The Payment Link Flywheel

```
┌─────────────────────────────────────────────────────────────────┐
│                    GALEON VIRAL LOOP                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   FREELANCER                                                     │
│   "I want to get paid without revealing my wallet"               │
│         │                                                        │
│         ▼                                                        │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  1. Signs Covenant                                       │   │
│   │  2. Creates Port (payment link)                          │   │
│   │  3. Shares: "Pay me at galeon.xyz/pay/alice"            │   │
│   └─────────────────────────────────────────────────────────┘   │
│         │                                                        │
│         │ Shares link with clients                               │
│         ▼                                                        │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  CLIENT WANTS TO PAY                                     │   │
│   │  └── "I want to pay privately too!"                     │   │
│   │  └── Signs Covenant                                      │   │
│   │  └── Creates their own Port                              │   │
│   │  └── Joins Privacy Pool                                  │   │
│   └─────────────────────────────────────────────────────────┘   │
│         │                                                        │
│         │ Client shares with their network                       │
│         ▼                                                        │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  NETWORK EFFECT                                          │   │
│   │  └── More users = better anonymity set                  │   │
│   │  └── Better privacy attracts more users                 │   │
│   │  └── Cycle repeats                                       │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### User Acquisition Channels

| User Type           | Motivation                     | Entry Point            |
| ------------------- | ------------------------------ | ---------------------- |
| Freelancers         | Private payments from clients  | Payment link           |
| Privacy enthusiasts | Maximum transaction privacy    | Privacy Pool           |
| DAOs                | Anonymous contributor payments | Port creation          |
| Businesses          | Compliant payroll privacy      | Covenant = audit trail |
| Crypto natives      | Hide wallet balances           | Fog wallets            |

### The "Catch" That Makes It Work

> **You must sign the Covenant to use Galeon.**

This means:

1. **No anonymous bad actors** - Everyone has signed identity on record
2. **Self-policing community** - Users report suspicious activity
3. **Regulatory defensibility** - "We require compliance attestation"
4. **Pool survival** - Unlike Tornado, we can exclude bad actors

---

## Shipwreck Reporting System

### What is Shipwreck?

"Shipwreck" is Galeon's compliance and reporting system. The metaphor:

- **Ships** = Transactions in the privacy pool
- **Wrecks** = Bad actors discovered and excluded
- **Lighthouse** = The reporting system that protects the fleet

### Report Types

```typescript
type ShipwreckReportType =
  | 'suspected_stolen' // Funds may be from theft/hack
  | 'counterparty_admitted' // Other party revealed illicit source
  | 'sanctions_match' // Address matches sanctions list
  | 'chain_analysis' // On-chain patterns suggest illicit
  | 'legal_request' // Law enforcement request
  | 'other' // Custom reason
```

### Report Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SHIPWRECK REPORT FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  STEP 1: USER SUBMITS REPORT                                     │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Report Suspicious Activity                                 ││
│  │                                                             ││
│  │  Transaction: 0x1234...5678                                 ││
│  │  Type: ○ Suspected stolen funds                            ││
│  │        ● Counterparty revealed illicit source              ││
│  │        ○ Sanctions match                                    ││
│  │                                                             ││
│  │  Evidence:                                                  ││
│  │  ┌─────────────────────────────────────────────────────┐   ││
│  │  │ They mentioned in our chat that this was from...   │   ││
│  │  └─────────────────────────────────────────────────────┘   ││
│  │                                                             ││
│  │  [Submit Report]                                            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  STEP 2: GALEON REVIEWS                                          │
│  • Cross-reference with sanctions databases                      │
│  • Check chain analysis (Chainalysis, TRM Labs APIs)            │
│  • Review evidence provided                                      │
│  • Multiple reports = higher priority                            │
│                                                                  │
│  STEP 3: DECISION                                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  IF CONFIRMED BAD ACTOR:                                    ││
│  │  • Exclude all their deposits from ASP tree                ││
│  │  • Update on-chain ASP root                                 ││
│  │  • Their funds are stuck (can't withdraw with valid proof) ││
│  │  • Reporter gets reputation boost                           ││
│  │                                                             ││
│  │  IF FALSE REPORT:                                           ││
│  │  • No action taken                                          ││
│  │  • If malicious, reporter loses reputation                  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  STEP 4: TRANSPARENCY                                            │
│  • Publish exclusion reason (without doxxing reporter)          │
│  • Community can verify bad actor was real                      │
│  • Pool continues operating (not sanctioned like Tornado)       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Report Data Structure

```typescript
interface ShipwreckReport {
  id: string

  // Reporter (kept confidential)
  reporterAddress: `0x${string}`
  reporterCovenantHash: `0x${string}`

  // Subject
  suspectedAddress: `0x${string}`
  relatedTxHash?: `0x${string}`
  relatedDepositCommitment?: `0x${string}`

  // Details
  reportType: ShipwreckReportType
  evidence: string

  // Metadata
  submittedAt: number
  status: 'pending' | 'investigating' | 'confirmed' | 'rejected'

  // Resolution (if any)
  resolution?: {
    decision: 'exclude' | 'dismiss'
    reason: string
    decidedAt: number
    aspRootUpdated?: `0x${string}` // New ASP root after exclusion
  }
}
```

### ASP Exclusion Process

```typescript
class GaleonASP {
  private excludedAddresses: Set<Address> = new Set()
  private associationTree: MerkleTree

  /**
   * Called when a Shipwreck report is confirmed
   */
  async excludeBadActor(report: ShipwreckReport): Promise<void> {
    const { suspectedAddress } = report

    // 1. Add to exclusion list
    this.excludedAddresses.add(suspectedAddress)

    // 2. Find all their deposits in the pool
    const theirDeposits = await this.findDepositsFrom(suspectedAddress)

    // 3. Remove from association tree
    for (const deposit of theirDeposits) {
      this.associationTree.remove(deposit.commitment)
    }

    // 4. Update on-chain root
    const newRoot = this.associationTree.root
    await this.contract.updateASPRoot(newRoot)

    // 5. Log for transparency
    await this.publishExclusion({
      address: suspectedAddress,
      reason: report.reportType,
      excludedAt: Date.now(),
      depositsAffected: theirDeposits.length,
      newAspRoot: newRoot,
    })

    console.log(
      `[Shipwreck] Excluded ${suspectedAddress}, ${theirDeposits.length} deposits affected`
    )
  }

  /**
   * Check if new deposit should be included
   */
  async isDepositGood(depositAddress: Address): Promise<boolean> {
    // Already excluded?
    if (this.excludedAddresses.has(depositAddress)) {
      return false
    }

    // On sanctions list?
    if (await this.checkSanctions(depositAddress)) {
      return false
    }

    // From a Port (covenant signer)?
    const isFromPort = await this.isPortAddress(depositAddress)
    if (isFromPort) {
      // Extra trust - they signed the covenant
      return true
    }

    // External deposit - run chain analysis
    const riskScore = await this.chainAnalysis(depositAddress)
    return riskScore < RISK_THRESHOLD
  }
}
```

---

## Onboarding Flow

### First-Time User Experience

```
┌─────────────────────────────────────────────────────────────────┐
│                    GALEON ONBOARDING                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  STEP 1: LANDING                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │              🛡️ GALEON                                      ││
│  │         Private payments for good actors                    ││
│  │                                                             ││
│  │  • Receive payments without revealing your wallet          ││
│  │  • Send with maximum privacy                                ││
│  │  • Compliant by design                                      ││
│  │                                                             ││
│  │              [Connect Wallet]                               ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  STEP 2: COVENANT SIGNING                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │              The Galeon Covenant                            ││
│  │                                                             ││
│  │  To use Galeon's privacy features, please confirm:         ││
│  │                                                             ││
│  │  ☑️ I am not on any government sanctions list              ││
│  │     (OFAC, UN, EU, or similar)                             ││
│  │                                                             ││
│  │  ☑️ My funds are not from illegal activities               ││
│  │     (theft, fraud, terrorism, etc.)                        ││
│  │                                                             ││
│  │  ☑️ I will report suspicious activity                      ││
│  │     (if I discover my counterparty is a bad actor)        ││
│  │                                                             ││
│  │  ☑️ I accept that Galeon may exclude bad actors            ││
│  │     (violators lose access to privacy pool)               ││
│  │                                                             ││
│  │  By signing, you join our community of good actors.        ││
│  │  The more people join, the better privacy for everyone.   ││
│  │                                                             ││
│  │              [Sign with Wallet]                             ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  STEP 3: STEALTH KEYS                                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │              Generate Your Stealth Keys                     ││
│  │                                                             ││
│  │  Sign one more message to generate your privacy keys.      ││
│  │  These never leave your browser.                           ││
│  │                                                             ││
│  │              [Generate Keys]                                ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  STEP 4: READY                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │              ✅ You're in!                                  ││
│  │                                                             ││
│  │  Your stealth address:                                      ││
│  │  st:mnt:0x1234...5678                                      ││
│  │                                                             ││
│  │  What's next?                                               ││
│  │                                                             ││
│  │  ┌──────────────────┐  ┌──────────────────┐                ││
│  │  │  📥 Receive      │  │  📤 Send         │                ││
│  │  │  ──────────────  │  │  ──────────────  │                ││
│  │  │  Create payment  │  │  Create fog      │                ││
│  │  │  links           │  │  wallets         │                ││
│  │  └──────────────────┘  └──────────────────┘                ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Compliance & Law Enforcement Cooperation

### The Doxxing Capability

> **Privacy is not anonymity. Galeon provides privacy from the public, not from law enforcement.**

When required by law or for confirmed bad actors, Galeon can reveal user identity through multiple mechanisms:

### What We Retain (Compliance Data)

| Data Type                      | Stored Where        | Links To                  |
| ------------------------------ | ------------------- | ------------------------- |
| **Covenant Signature**         | On-chain + Backend  | Signer EOA address        |
| **Stealth Meta Address**       | Covenant registry   | EOA that generated it     |
| **Port Registrations**         | Backend database    | EOA + meta address        |
| **Fog Wallet Derivation Path** | Backend (encrypted) | Master signature hash     |
| **Pool Deposits**              | On-chain            | Source address (Port/EOA) |
| **Pool Withdrawals**           | On-chain            | Recipient stealth address |
| **Shipwreck Reports**          | Backend             | Reporter + subject        |
| **IP Addresses**               | Backend logs        | All actions (optional)    |

### Identity Resolution Chain

```
┌─────────────────────────────────────────────────────────────────────┐
│                    IDENTITY RESOLUTION CHAIN                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Given: A suspicious Fog wallet stealth address                       │
│                                                                       │
│  STEP 1: Stealth Address → Meta Address                               │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Fog wallet was created with ephemeral key from masterSignature  │ │
│  │  + stealth meta address. We can trace back via:                  │ │
│  │    • Pool withdrawal records (if from pool)                       │ │
│  │    • Port transfer records (if from Port)                         │ │
│  │    • Fog wallet metadata (stored encrypted)                       │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  STEP 2: Meta Address → Covenant                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Every meta address is registered in the Covenant:                │ │
│  │    covenant.stealthMetaAddress = "st:mnt:..."                     │ │
│  │    covenant.signer = "0xABC..." ← EOA REVEALED                    │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  STEP 3: EOA → Real Identity                                          │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  EOA can be traced through:                                       │ │
│  │    • CEX KYC records (if funded from exchange)                    │ │
│  │    • ENS / social recovery / linked accounts                      │ │
│  │    • On-chain transaction history                                 │ │
│  │    • Subpoena to wallet providers                                 │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  RESULT: Full identity disclosure possible when legally required.     │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Law Enforcement Request Process

```typescript
interface LawEnforcementRequest {
  // Request metadata
  id: string
  requestedAt: number
  requestingAgency: string // "FBI", "SEC", "Europol", etc.
  jurisdiction: string // "US", "EU", etc.
  legalBasis: string // Court order reference, subpoena ID

  // Target information
  targetType: 'address' | 'transaction' | 'meta_address' | 'port_name'
  targetValue: string // The address/tx/name being investigated

  // What they want
  requestedData: (
    | 'identity' // Covenant signer address
    | 'transaction_history' // All pool deposits/withdrawals
    | 'linked_addresses' // All stealth addresses from same meta
    | 'port_registry' // Port registration details
    | 'ip_logs' // IP addresses (if retained)
    | 'full_disclosure' // Everything
  )[]

  // Response
  status: 'pending' | 'fulfilled' | 'rejected' | 'partial'
  responseData?: ComplianceResponse
  fulfilledAt?: number
  rejectionReason?: string // "Invalid jurisdiction", "Insufficient legal basis"
}

interface ComplianceResponse {
  // Covenant data
  covenantSigner?: `0x${string}`
  covenantSignedAt?: number
  covenantHash?: `0x${string}`

  // Meta address data
  stealthMetaAddress?: string
  derivedAddresses?: `0x${string}`[] // All known stealth addresses

  // Transaction data
  poolDeposits?: PoolDeposit[]
  poolWithdrawals?: PoolWithdrawal[]
  portTransfers?: PortTransfer[]

  // Fog wallet data (if disclosure authorized)
  fogWallets?: {
    stealthAddress: `0x${string}`
    createdAt: number
    fundingSource: string
    outgoingTxs?: `0x${string}`[]
  }[]
}
```

### Compliance Levels

| Level         | Privacy                        | When Applied                      |
| ------------- | ------------------------------ | --------------------------------- |
| **Normal**    | Full privacy from public       | Default for all users             |
| **Flagged**   | Monitored, no action yet       | Shipwreck report pending          |
| **Frozen**    | Can't withdraw from pool       | Confirmed bad actor               |
| **Disclosed** | Identity revealed to requester | Valid law enforcement request     |
| **Public**    | Identity published             | Court order for public disclosure |

### What Makes This Different From Nocturne

| Capability                 | Nocturne     | Galeon                            |
| -------------------------- | ------------ | --------------------------------- |
| **Covenant with EOA link** | ❌ No        | ✅ Yes - signed with main wallet  |
| **Meta address registry**  | ❌ No        | ✅ Yes - covenant stores it       |
| **Transaction tracing**    | ❌ No        | ✅ Yes - Port/Pool records        |
| **Shipwreck reporting**    | ❌ No        | ✅ Yes - community enforcement    |
| **Law enforcement API**    | ❌ No        | ✅ Yes - formal process           |
| **Selective disclosure**   | ❌ No        | ✅ Yes - reveal one user, not all |
| **Pool survival**          | ❌ Shut down | ✅ Exclude bad actor, continue    |

### Technical Disclosure Implementation

```solidity
// contracts/GaleonComplianceRegistry.sol
contract GaleonComplianceRegistry {
    // Only Galeon multisig can disclose (after legal verification)
    address public complianceOfficer;

    // Frozen addresses (can't withdraw from pool)
    mapping(address => bool) public isFrozen;
    mapping(address => string) public freezeReason;

    // Disclosed addresses (public record)
    mapping(address => bool) public isDisclosed;
    mapping(address => string) public disclosureReference; // Court order ID

    event AddressFrozen(address indexed target, string reason, uint256 timestamp);
    event AddressDisclosed(address indexed target, string legalReference, uint256 timestamp);
    event FreezeLifted(address indexed target, uint256 timestamp);

    /**
     * @notice Freeze an address (prevent pool withdrawals)
     * @param target The address to freeze
     * @param reason Why (e.g., "Shipwreck report #123 confirmed")
     */
    function freezeAddress(address target, string calldata reason) external {
        require(msg.sender == complianceOfficer, "Not authorized");
        isFrozen[target] = true;
        freezeReason[target] = reason;
        emit AddressFrozen(target, reason, block.timestamp);
    }

    /**
     * @notice Public disclosure (after court order)
     * @param target The address being disclosed
     * @param legalReference Court order or legal reference
     */
    function discloseAddress(address target, string calldata legalReference) external {
        require(msg.sender == complianceOfficer, "Not authorized");
        isDisclosed[target] = true;
        disclosureReference[target] = legalReference;
        emit AddressDisclosed(target, legalReference, block.timestamp);
    }
}
```

### Backend Compliance API

```typescript
// apps/api/app/controllers/compliance_controller.ts

export default class ComplianceController {
  /**
   * Handle law enforcement data request
   * Requires valid API key + legal documentation
   */
  async handleLawEnforcementRequest({ request, response }: HttpContext) {
    // 1. Verify requester is authorized agency
    const apiKey = request.header('X-LE-API-Key')
    const agency = await this.verifyAgency(apiKey)
    if (!agency) {
      return response.unauthorized({ error: 'Invalid agency credentials' })
    }

    // 2. Validate legal basis
    const { legalBasis, targetType, targetValue, requestedData } = request.body()
    const legalDoc = await this.validateLegalBasis(legalBasis)
    if (!legalDoc.valid) {
      return response.badRequest({ error: 'Invalid or expired legal basis' })
    }

    // 3. Log request (all requests logged for audit)
    await this.logRequest(agency, legalBasis, targetType, targetValue)

    // 4. Resolve identity chain
    const identityChain = await this.resolveIdentity(targetType, targetValue)

    // 5. Gather requested data
    const responseData: ComplianceResponse = {}

    if (requestedData.includes('identity')) {
      responseData.covenantSigner = identityChain.covenantSigner
      responseData.covenantSignedAt = identityChain.covenantSignedAt
    }

    if (requestedData.includes('transaction_history')) {
      responseData.poolDeposits = await this.getPoolDeposits(identityChain.addresses)
      responseData.poolWithdrawals = await this.getPoolWithdrawals(identityChain.addresses)
    }

    if (requestedData.includes('linked_addresses')) {
      responseData.derivedAddresses = await this.getAllDerivedAddresses(identityChain.metaAddress)
    }

    // 6. Return data
    return response.ok({
      requestId: crypto.randomUUID(),
      fulfilledAt: Date.now(),
      data: responseData,
    })
  }

  /**
   * Resolve any identifier to full identity chain
   */
  private async resolveIdentity(type: string, value: string): Promise<IdentityChain> {
    switch (type) {
      case 'address':
        // Stealth address → find which meta address derived it
        const fogWallet = await FogWallet.findBy('stealthAddress', value)
        if (fogWallet) {
          const covenant = await Covenant.findBy('stealthMetaAddress', fogWallet.metaAddress)
          return {
            stealthAddress: value,
            metaAddress: fogWallet.metaAddress,
            covenantSigner: covenant.signer,
            covenantSignedAt: covenant.signedAt,
          }
        }
        break

      case 'meta_address':
        const covenant = await Covenant.findBy('stealthMetaAddress', value)
        return {
          metaAddress: value,
          covenantSigner: covenant.signer,
          covenantSignedAt: covenant.signedAt,
          addresses: await this.getAllDerivedAddresses(value),
        }

      case 'port_name':
        const port = await Port.findBy('name', value)
        return {
          portName: value,
          metaAddress: port.stealthMetaAddress,
          covenantSigner: port.ownerAddress,
          // ... etc
        }
    }
  }
}
```

### Privacy vs Compliance Balance

```
┌─────────────────────────────────────────────────────────────────────┐
│                   GALEON'S PRIVACY MODEL                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│   WHAT THE PUBLIC SEES:                                               │
│   ──────────────────────                                              │
│   • Deposits into pool (amount, not source identity)                  │
│   • Withdrawals from pool (destination address only)                  │
│   • NO link between deposits and withdrawals                          │
│   • NO way to trace payments                                          │
│   → MAXIMUM PRIVACY FROM PUBLIC                                       │
│                                                                       │
│   ─────────────────────────────────────────────────────────────────  │
│                                                                       │
│   WHAT GALEON KNOWS:                                                  │
│   ───────────────────                                                 │
│   • Covenant signer (EOA) for every user                              │
│   • Which meta address belongs to which EOA                           │
│   • Which Ports belong to which user                                  │
│   • Pool deposit/withdrawal records                                   │
│   → CAN REVEAL WHEN LEGALLY REQUIRED                                  │
│                                                                       │
│   ─────────────────────────────────────────────────────────────────  │
│                                                                       │
│   WHEN DISCLOSURE HAPPENS:                                            │
│   ─────────────────────────                                           │
│   1. Confirmed Shipwreck report → Freeze + optional disclosure       │
│   2. Valid law enforcement request → Targeted disclosure              │
│   3. Court order → Full disclosure + public record                    │
│                                                                       │
│   ─────────────────────────────────────────────────────────────────  │
│                                                                       │
│   THE PROMISE:                                                        │
│   ─────────────                                                       │
│   "Your transactions are private from the world.                      │
│    But if you're a criminal, we can and will reveal you."            │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Why This Beats Tornado Cash

| Aspect                   | Tornado Cash            | Galeon Privacy Pools          |
| ------------------------ | ----------------------- | ----------------------------- |
| **Entry**                | Anonymous               | Covenant required             |
| **Bad actors**           | Welcome                 | Excluded                      |
| **Reporting**            | None                    | Built-in Shipwreck            |
| **Regulatory status**    | Sanctioned              | Compliant by design           |
| **If bad actor found**   | Pool sanctioned         | Actor excluded, pool survives |
| **User accountability**  | Zero                    | Signed attestation            |
| **Privacy quality**      | Maximum (all mixed)     | High (good actors only)       |
| **Sustainability**       | Dead (sanctioned)       | Alive (self-policing)         |
| **Law enforcement**      | No cooperation possible | Full cooperation capability   |
| **Selective disclosure** | Impossible              | Target one user, not all      |

### The Key Insight

> Tornado Cash was sanctioned because it couldn't exclude bad actors **or cooperate with law enforcement**.
>
> Galeon can exclude bad actors **and** reveal identities when legally required.
>
> Users get privacy from the public. Law enforcement gets cooperation. The pool survives.

---

## Architecture Summary

### v0 Architecture (MVP)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GALEON PRIVACY POOLS v0                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   PORT-ONLY DEPOSITS (Clean by Design)                               │
│   ─────────────────────────────────────                              │
│                                                                      │
│   ┌──────────────┐                                                   │
│   │    PORT      │  ← Only source (covenant signers)                 │
│   │  Reception   │  ← Verified on-chain via GaleonRegistry           │
│   └──────┬───────┘                                                   │
│          │                                                           │
│          │ deposit(commitment) - must be from Port stealth address   │
│          ▼                                                           │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │   PRIVACY POOL V0 (Commit-Reveal)                             │  │
│   │   ─────────────────────────────────                           │  │
│   │                                                               │  │
│   │   • Fixed 1 MNT denomination                                  │  │
│   │   • Commit-reveal (not ZK for MVP)                            │  │
│   │   • 2-hour minimum timelock                                   │  │
│   │   • Owner-controlled ban list (ASP v0)                        │  │
│   │   • Port-only deposits (on-chain enforced)                    │  │
│   │   • Stealth-only withdrawals (on-chain enforced)              │  │
│   └──────────────────────────────────────────────────────────────┘  │
│          │                                                           │
│          │ withdraw(secret, recipient) - after timelock              │
│          ▼                                                           │
│   ┌──────────────┐                                                   │
│   │  FOG WALLET  │  ← Registered via registerWithdrawalAddress()    │
│   │  (stealth)   │  ← Ephemeral key validated on-chain               │
│   └──────┬───────┘                                                   │
│          │                                                           │
│          │ Ready to pay (link to Port broken)                        │
│          ▼                                                           │
│   ┌──────────────┐                                                   │
│   │   PAYMENT    │  ← Private payment from Fog wallet                │
│   └──────────────┘                                                   │
│                                                                      │
│   KEY INSIGHT: Fog/Hop complexity eliminated.                        │
│   Pool provides mixing. Port funds are "pre-vetted".                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### On-Chain Verification

**Port-Only Deposits** (GaleonRegistry v2):

```solidity
// GaleonRegistry tracks stealth addresses when payments are made
mapping(address => bool) public isPortStealthAddress;

// Updated in payNative/payToken:
isPortStealthAddress[stealthAddress] = true;

// Pool queries this:
require(galeonRegistry.isValidPortAddress(msg.sender), "Must deposit from Port");
```

**Fog Wallet Withdrawals** (Pool contract):

```solidity
// Users must register their Fog wallet address before withdrawing
function registerWithdrawalAddress(
    address stealthAddress,
    bytes calldata ephemeralPubKey,  // 33 bytes, compressed
    bytes1 viewTag
) external {
    require(ephemeralPubKey[0] == 0x02 || ephemeralPubKey[0] == 0x03);
    isValidWithdrawalAddress[stealthAddress] = true;
}

// Pool enforces (ensures withdrawal goes to a valid Fog wallet):
require(isValidWithdrawalAddress[recipient], "Must withdraw to Fog wallet");
```

### Full Vision Architecture (Future)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GALEON PRIVACY POOLS (Full Vision)                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   FUNDING SOURCES                                                    │
│   ───────────────                                                    │
│                                                                      │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐        │
│   │    PORT      │     │   EXTERNAL   │     │     CEX      │        │
│   │  (Preferred) │     │   Wallet     │     │  Withdrawal  │        │
│   └──────┬───────┘     └──────┬───────┘     └──────┬───────┘        │
│          │                    │                    │                 │
│          └────────────────────┼────────────────────┘                 │
│                               ▼                                      │
│                    ┌──────────────────────┐                          │
│                    │   PRIVACY POOL       │                          │
│                    │   (ZK-based)         │                          │
│                    │                      │                          │
│                    │  • Fixed denominations│                         │
│                    │  • Merkle tree of    │                          │
│                    │    deposits          │                          │
│                    │  • Association sets  │                          │
│                    │  • Chain analysis    │                          │
│                    └──────────┬───────────┘                          │
│                               │                                      │
│                               │ ZK Proof (Groth16)                   │
│                               ▼                                      │
│                    ┌──────────────────────┐                          │
│                    │   STEALTH ADDRESS    │                          │
│                    │   Ready to Pay       │                          │
│                    └──────────────────────┘                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Existing Infrastructure

### What We Have

| Component            | Status      | Location                                          |
| -------------------- | ----------- | ------------------------------------------------- |
| Stealth Addresses    | ✅ Complete | `packages/stealth/`                               |
| Ports (Receive)      | ✅ Complete | `apps/web/app/receive/`                           |
| Fog Wallets          | ✅ Complete | `apps/web/contexts/fog-context.tsx`               |
| Scheduled Payments   | ✅ Complete | `apps/web/contexts/scheduled-payment-context.tsx` |
| Scheduled Hops       | ✅ Complete | Same as above                                     |
| Privacy Calculations | ✅ Complete | `apps/web/lib/fog-privacy.ts`                     |
| Entry → Hop Flow     | ✅ Complete | Manual via AddHopModal                            |
| Auto-Hop on Funding  | 🔄 Planned  | In simplified UX plan                             |

### What We Need for v0

| Component                      | Priority | Complexity | Notes                               |
| ------------------------------ | -------- | ---------- | ----------------------------------- |
| GaleonRegistry v2              | High     | Low        | Add `isPortStealthAddress` tracking |
| GaleonPrivacyPoolV0 Contract   | High     | Medium     | Commit-reveal, not ZK               |
| Port → Pool Deposit UI         | High     | Low        | Simple modal                        |
| Pool → Stealth Withdrawal UI   | High     | Low        | Register + withdraw                 |
| Note Management (localStorage) | High     | Low        | Encrypted secret storage            |

### What We Need for Full Vision (Future)

| Component                      | Priority | Complexity |
| ------------------------------ | -------- | ---------- |
| ZK Circuit (Withdrawal Proof)  | Future   | High       |
| Association Set Provider (ASP) | Future   | Medium     |
| Chain Analysis Integration     | Future   | Medium     |
| Relayer Network                | Future   | High       |
| Multi-denomination Pools       | Future   | Medium     |

---

## Smart Contract Specification

### GaleonRegistry v2 Changes

To support on-chain Port verification, extend the existing `GaleonRegistry.sol`:

```solidity
// Add to GaleonRegistry.sol state:
/// @notice Track stealth addresses that received Port payments
mapping(address => bool) public isPortStealthAddress;

// Add view function:
/// @notice Check if an address received a Port payment
function isValidPortAddress(address addr) external view returns (bool) {
    return isPortStealthAddress[addr];
}

// Update payNative function - add before existing emit:
isPortStealthAddress[stealthAddress] = true;

// Update payToken function - add before existing emit:
isPortStealthAddress[stealthAddress] = true;
```

### GaleonPrivacyPoolV0.sol (MVP - Commit-Reveal)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IGaleonRegistry {
    function isValidPortAddress(address addr) external view returns (bool);
}

/// @title GaleonPrivacyPoolV0
/// @notice Privacy pool with commit-reveal mixing (v0, no ZK)
/// @dev Port-only deposits, stealth-only withdrawals, 2-hour timelock
contract GaleonPrivacyPoolV0 is ReentrancyGuard {
    // ============================================================
    // CONSTANTS
    // ============================================================

    uint256 public constant DENOMINATION = 1 ether; // 1 MNT per deposit
    uint256 public constant MIN_TIMELOCK = 2 hours; // Minimum delay for anonymity

    // ============================================================
    // STATE
    // ============================================================

    struct Deposit {
        bytes32 commitment;    // hash(secret)
        uint256 depositedAt;   // timestamp
        bool withdrawn;        // prevent double-withdraw
    }

    // Immutable references
    IGaleonRegistry public immutable galeonRegistry;
    address public owner;

    // Core state
    mapping(uint256 => Deposit) public deposits;
    uint256 public depositCount;

    // ASP v0: Simple ban list (owner-controlled)
    mapping(address => bool) public isBanned;

    // Stealth withdrawal verification
    mapping(address => bool) public isValidWithdrawalAddress;

    // ============================================================
    // EVENTS
    // ============================================================

    event Deposited(
        uint256 indexed index,
        bytes32 commitment,
        address indexed depositor,
        uint256 timestamp
    );

    event Withdrawn(
        uint256 indexed index,
        address indexed recipient,
        uint256 timestamp
    );

    event WithdrawalAddressRegistered(
        address indexed stealthAddress,
        bytes ephemeralPubKey,
        bytes1 viewTag
    );

    event AddressBanned(address indexed target, string reason);
    event AddressUnbanned(address indexed target);

    // ============================================================
    // CONSTRUCTOR
    // ============================================================

    constructor(address _galeonRegistry, address _owner) {
        require(_galeonRegistry != address(0), "Invalid registry");
        require(_owner != address(0), "Invalid owner");
        galeonRegistry = IGaleonRegistry(_galeonRegistry);
        owner = _owner;
    }

    // ============================================================
    // STEALTH WITHDRAWAL REGISTRATION
    // ============================================================

    /// @notice Register a stealth address for withdrawal
    /// @dev Must be called before withdraw(), validates ephemeral key format
    /// @param stealthAddress The stealth address to register
    /// @param ephemeralPubKey The ephemeral public key (33 bytes, compressed)
    /// @param viewTag The view tag for scanning
    function registerWithdrawalAddress(
        address stealthAddress,
        bytes calldata ephemeralPubKey,
        bytes1 viewTag
    ) external {
        require(stealthAddress != address(0), "Invalid stealth address");
        require(ephemeralPubKey.length == 33, "Invalid ephemeral key length");
        require(
            ephemeralPubKey[0] == 0x02 || ephemeralPubKey[0] == 0x03,
            "Invalid pubkey prefix"
        );
        require(!isValidWithdrawalAddress[stealthAddress], "Already registered");

        isValidWithdrawalAddress[stealthAddress] = true;
        emit WithdrawalAddressRegistered(stealthAddress, ephemeralPubKey, viewTag);
    }

    // ============================================================
    // CORE POOL FUNCTIONS
    // ============================================================

    /// @notice Deposit funds into the pool
    /// @dev Only Port stealth addresses can deposit (enforced on-chain)
    /// @param commitment Hash of the secret (keccak256(secret))
    function deposit(bytes32 commitment) external payable nonReentrant {
        require(msg.value == DENOMINATION, "Must deposit exactly 1 MNT");
        require(commitment != bytes32(0), "Invalid commitment");
        require(
            galeonRegistry.isValidPortAddress(msg.sender),
            "Must deposit from Port address"
        );
        require(!isBanned[msg.sender], "Address is banned");

        uint256 index = depositCount++;
        deposits[index] = Deposit({
            commitment: commitment,
            depositedAt: block.timestamp,
            withdrawn: false
        });

        emit Deposited(index, commitment, msg.sender, block.timestamp);
    }

    /// @notice Withdraw funds from the pool
    /// @dev Requires timelock expired, valid secret, and registered stealth address
    /// @param depositIndex The index of the deposit to withdraw
    /// @param secret The original secret (hash must match commitment)
    /// @param recipient The registered stealth address to receive funds
    function withdraw(
        uint256 depositIndex,
        bytes32 secret,
        address payable recipient
    ) external nonReentrant {
        Deposit storage d = deposits[depositIndex];

        require(!d.withdrawn, "Already withdrawn");
        require(
            block.timestamp >= d.depositedAt + MIN_TIMELOCK,
            "Timelock not expired"
        );
        require(
            keccak256(abi.encodePacked(secret)) == d.commitment,
            "Invalid secret"
        );
        require(
            isValidWithdrawalAddress[recipient],
            "Must withdraw to registered stealth address"
        );
        require(!isBanned[recipient], "Recipient is banned");

        d.withdrawn = true;

        (bool success, ) = recipient.call{value: DENOMINATION}("");
        require(success, "Transfer failed");

        emit Withdrawn(depositIndex, recipient, block.timestamp);
    }

    // ============================================================
    // ASP V0: BAN LIST (Owner Only)
    // ============================================================

    /// @notice Ban an address from deposits and withdrawals
    function ban(address target, string calldata reason) external {
        require(msg.sender == owner, "Only owner");
        require(target != address(0), "Invalid address");
        isBanned[target] = true;
        emit AddressBanned(target, reason);
    }

    /// @notice Unban an address
    function unban(address target) external {
        require(msg.sender == owner, "Only owner");
        isBanned[target] = false;
        emit AddressUnbanned(target);
    }

    /// @notice Transfer ownership
    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "Only owner");
        require(newOwner != address(0), "Invalid new owner");
        owner = newOwner;
    }

    // ============================================================
    // VIEW FUNCTIONS
    // ============================================================

    function getDeposit(uint256 index) external view returns (
        bytes32 commitment,
        uint256 depositedAt,
        bool withdrawn
    ) {
        Deposit storage d = deposits[index];
        return (d.commitment, d.depositedAt, d.withdrawn);
    }

    function canWithdraw(uint256 depositIndex) external view returns (bool) {
        Deposit storage d = deposits[depositIndex];
        return !d.withdrawn && block.timestamp >= d.depositedAt + MIN_TIMELOCK;
    }

    function getPoolStats() external view returns (
        uint256 totalDeposits,
        uint256 denomination,
        uint256 timelock
    ) {
        return (depositCount, DENOMINATION, MIN_TIMELOCK);
    }
}
```

### GaleonPrivacyPool.sol (Full Vision - ZK-based)

> **Note**: This is the future full implementation with ZK proofs. Not needed for v0.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IVerifier {
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[4] memory input
    ) external view returns (bool);
}

contract GaleonPrivacyPool is ReentrancyGuard, Ownable {
    // ============================================================
    // CONSTANTS
    // ============================================================

    uint256 public constant DENOMINATION = 1 ether; // 1 MNT per deposit
    uint32 public constant MERKLE_TREE_HEIGHT = 20; // ~1M deposits

    // ============================================================
    // STATE
    // ============================================================

    // Deposit tracking
    bytes32 public depositRoot;
    uint256 public depositCount;
    mapping(uint256 => bytes32) public depositHashes; // index => commitment

    // Association Set Providers
    mapping(address => bytes32) public aspRoots; // ASP address => merkle root
    mapping(address => bool) public isApprovedASP;
    address public defaultASP; // Galeon's ASP

    // Nullifiers (prevent double-spend)
    mapping(bytes32 => bool) public nullifiers;

    // Verifiers
    IVerifier public depositVerifier;
    IVerifier public withdrawVerifier;

    // ============================================================
    // EVENTS
    // ============================================================

    event Deposit(
        bytes32 indexed commitment,
        uint256 leafIndex,
        uint256 timestamp
    );

    event Withdrawal(
        address indexed recipient,
        bytes32 nullifierHash,
        address asp,
        uint256 timestamp
    );

    event ASPRootUpdated(
        address indexed asp,
        bytes32 newRoot,
        uint256 timestamp
    );

    // ============================================================
    // DEPOSIT
    // ============================================================

    /**
     * @notice Deposit MNT into the pool
     * @param commitment Hash of (secret, nullifier)
     */
    function deposit(bytes32 commitment) external payable nonReentrant {
        require(msg.value == DENOMINATION, "Invalid deposit amount");
        require(commitment != bytes32(0), "Invalid commitment");

        // Add to merkle tree
        uint256 leafIndex = depositCount;
        depositHashes[leafIndex] = commitment;
        depositRoot = _insertLeaf(commitment);
        depositCount++;

        emit Deposit(commitment, leafIndex, block.timestamp);
    }

    // ============================================================
    // WITHDRAWAL
    // ============================================================

    /**
     * @notice Withdraw from the pool with ZK proof
     * @param proof ZK proof of valid deposit in association set
     * @param nullifierHash Unique identifier to prevent double-spend
     * @param recipient Address to receive funds
     * @param asp Association Set Provider to use (0 = default)
     */
    function withdraw(
        bytes calldata proof,
        bytes32 nullifierHash,
        address payable recipient,
        address asp
    ) external nonReentrant {
        require(!nullifiers[nullifierHash], "Already withdrawn");
        require(recipient != address(0), "Invalid recipient");

        // Use default ASP if none specified
        address effectiveASP = asp == address(0) ? defaultASP : asp;
        require(isApprovedASP[effectiveASP], "ASP not approved");

        bytes32 aspRoot = aspRoots[effectiveASP];
        require(aspRoot != bytes32(0), "ASP has no root");

        // Verify ZK proof
        // Public inputs: [depositRoot, aspRoot, nullifierHash, recipient]
        bool valid = _verifyWithdrawProof(
            proof,
            depositRoot,
            aspRoot,
            nullifierHash,
            recipient
        );
        require(valid, "Invalid proof");

        // Mark nullifier as used
        nullifiers[nullifierHash] = true;

        // Transfer funds
        (bool success, ) = recipient.call{value: DENOMINATION}("");
        require(success, "Transfer failed");

        emit Withdrawal(recipient, nullifierHash, effectiveASP, block.timestamp);
    }

    // ============================================================
    // ASP MANAGEMENT
    // ============================================================

    /**
     * @notice Update ASP's association set root
     * @param newRoot New merkle root of "good" deposits
     */
    function updateASPRoot(bytes32 newRoot) external {
        require(isApprovedASP[msg.sender], "Not an approved ASP");
        aspRoots[msg.sender] = newRoot;
        emit ASPRootUpdated(msg.sender, newRoot, block.timestamp);
    }

    function approveASP(address asp) external onlyOwner {
        isApprovedASP[asp] = true;
    }

    function revokeASP(address asp) external onlyOwner {
        isApprovedASP[asp] = false;
    }

    function setDefaultASP(address asp) external onlyOwner {
        require(isApprovedASP[asp], "ASP not approved");
        defaultASP = asp;
    }

    // ============================================================
    // VIEW FUNCTIONS
    // ============================================================

    function getDepositRoot() external view returns (bytes32) {
        return depositRoot;
    }

    function getASPRoot(address asp) external view returns (bytes32) {
        return aspRoots[asp];
    }

    function isNullifierUsed(bytes32 nullifier) external view returns (bool) {
        return nullifiers[nullifier];
    }

    // ============================================================
    // INTERNAL
    // ============================================================

    function _insertLeaf(bytes32 leaf) internal returns (bytes32) {
        // Simplified - real implementation uses incremental merkle tree
        // See tornado-core for reference implementation
        return keccak256(abi.encodePacked(depositRoot, leaf, depositCount));
    }

    function _verifyWithdrawProof(
        bytes calldata proof,
        bytes32 _depositRoot,
        bytes32 _aspRoot,
        bytes32 _nullifierHash,
        address _recipient
    ) internal view returns (bool) {
        // Decode and verify using Groth16 verifier
        // Implementation depends on ZK circuit
        return true; // Placeholder
    }
}
```

---

## ZK Circuit Specification

### Withdrawal Circuit

**Private Inputs:**

- `secret` - Random value known only to depositor
- `nullifier` - Random value for preventing double-spend
- `pathElements` - Merkle proof elements for deposit tree
- `pathIndices` - Merkle proof path (0 = left, 1 = right)
- `aspPathElements` - Merkle proof elements for ASP tree
- `aspPathIndices` - ASP merkle proof path

**Public Inputs:**

- `depositRoot` - Current deposit merkle root
- `aspRoot` - ASP's association set merkle root
- `nullifierHash` - Hash of nullifier (public for double-spend prevention)
- `recipient` - Withdrawal address

**Constraints:**

```
1. commitment = hash(secret, nullifier)
2. nullifierHash = hash(nullifier)
3. MerkleProof(commitment, pathElements, pathIndices) == depositRoot
4. MerkleProof(commitment, aspPathElements, aspPathIndices) == aspRoot
```

### Circuit Files Needed

| File                         | Purpose                    |
| ---------------------------- | -------------------------- |
| `circuits/withdraw.circom`   | Main withdrawal circuit    |
| `circuits/merkleTree.circom` | Merkle tree verification   |
| `circuits/poseidon.circom`   | Poseidon hash function     |
| `contracts/Verifier.sol`     | Generated Groth16 verifier |

---

## Association Set Provider (ASP)

### Galeon ASP Service

```typescript
// packages/asp/src/galeon-asp.ts

interface GaleonASP {
  // Core functionality
  isDepositGood(depositAddress: Address): Promise<boolean>
  buildAssociationTree(deposits: Deposit[]): MerkleTree
  getRoot(): bytes32
  getProof(commitment: bytes32): MerkleProof

  // Monitoring
  monitorNewDeposits(): void
  checkSanctionsList(address: Address): boolean
}

// Simple implementation
class GaleonASPService implements GaleonASP {
  private sanctionsList: Set<Address>
  private badActors: Set<Address>
  private goodDeposits: Map<bytes32, Deposit>
  private merkleTree: MerkleTree

  async isDepositGood(depositAddress: Address): Promise<boolean> {
    // Check OFAC sanctions
    if (this.sanctionsList.has(depositAddress.toLowerCase())) {
      return false
    }

    // Check known bad actors
    if (this.badActors.has(depositAddress.toLowerCase())) {
      return false
    }

    // Everything else is good
    return true
  }

  async processNewDeposit(event: DepositEvent): Promise<void> {
    const { commitment, depositor } = event

    if (await this.isDepositGood(depositor)) {
      this.goodDeposits.set(commitment, event)
      this.rebuildTree()
      await this.updateOnChainRoot()
    }
  }

  private rebuildTree(): void {
    const leaves = Array.from(this.goodDeposits.keys())
    this.merkleTree = new MerkleTree(leaves, poseidon)
  }

  private async updateOnChainRoot(): Promise<void> {
    const root = this.merkleTree.root
    await this.contract.updateASPRoot(root)
  }
}
```

---

## Implementation Phases

### v0 Implementation (MVP)

#### Phase 1: Smart Contracts (2-3 days)

**Deliverables:**

- [ ] Update `GaleonRegistry.sol` with `isPortStealthAddress` tracking
- [ ] Create `GaleonPrivacyPoolV0.sol` (commit-reveal)
- [ ] Deployment scripts for Mantle Sepolia
- [ ] Basic tests

**Checkpoints:**

- [ ] GaleonRegistry tracks stealth addresses on payment
- [ ] Pool only accepts deposits from tracked Port addresses
- [ ] Commitment stored correctly
- [ ] Timelock enforced (2 hours)
- [ ] Secret validation works
- [ ] Stealth address registration works
- [ ] Ban/unban functions work

#### Phase 2: Frontend Integration (2-3 days)

**Files to create:**
| File | Purpose |
|------|---------|
| `apps/web/contexts/pool-context.tsx` | Pool state + operations |
| `apps/web/hooks/use-pool-deposit.ts` | Deposit from Port |
| `apps/web/hooks/use-pool-withdraw.ts` | Withdraw to stealth |
| `apps/web/components/pool/deposit-modal.tsx` | Deposit UI |
| `apps/web/components/pool/withdraw-modal.tsx` | Withdraw UI |
| `apps/web/components/pool/pool-status-card.tsx` | Pool stats |

**Checkpoints:**

- [ ] User can deposit from Port UI
- [ ] Secret stored encrypted in localStorage
- [ ] User can see pending deposits + timelock countdown
- [ ] User can register withdrawal stealth address
- [ ] User can withdraw after timelock
- [ ] Full flow works end-to-end

#### Phase 3: Note Management (1 day)

**Secret storage:**

```typescript
interface PoolNote {
  depositIndex: number
  secret: `0x${string}`
  commitment: `0x${string}`
  depositedAt: number
  withdrawn: boolean
}

// Encrypted in localStorage with session key
const POOL_NOTES_KEY = 'galeon-pool-notes-{address}'
```

**Checkpoints:**

- [ ] Secrets encrypted at rest
- [ ] Backup/restore flow works
- [ ] Note format is exportable

#### Phase 4: Testing & Deploy (1 day)

**Checkpoints:**

- [ ] Deposit from Port succeeds
- [ ] Deposit from non-Port fails
- [ ] Withdrawal before timelock fails
- [ ] Withdrawal with wrong secret fails
- [ ] Withdrawal after timelock succeeds
- [ ] Banned address can't deposit/withdraw
- [ ] Testnet deployment verified

---

### Full Vision Implementation (Future)

> These phases are deferred until after v0 is working.

#### Phase A: ZK Circuits

**Deliverables:**

- [ ] `withdraw.circom` - Withdrawal circuit
- [ ] `merkleTree.circom` - Merkle proof verification
- [ ] Trusted setup ceremony (or use existing)
- [ ] `Verifier.sol` - Generated verifier contract
- [ ] Circuit tests

**Checkpoints:**

- [ ] Circuit compiles with circom
- [ ] Witness generation works
- [ ] Proof generation < 30 seconds
- [ ] Proof verification on-chain succeeds
- [ ] Invalid proofs are rejected

#### Phase B: ASP Backend

**Deliverables:**

- [ ] ASP service in `apps/api/`
- [ ] Deposit event listener
- [ ] Sanctions list integration (OFAC API)
- [ ] Association tree maintenance
- [ ] On-chain root updates
- [ ] REST API for proof generation

**Checkpoints:**

- [ ] ASP detects new deposits within 1 minute
- [ ] Good deposits added to association tree
- [ ] Bad deposits excluded
- [ ] Root updates on-chain
- [ ] API returns valid merkle proofs

#### Phase C: Full Pool Contract

**Deliverables:**

- [ ] `GaleonPrivacyPool.sol` with ZK verification
- [ ] `MerkleTreeLib.sol` - Incremental merkle tree
- [ ] `PoseidonHasher.sol` - ZK-friendly hash
- [ ] Multi-ASP support
- [ ] Multi-denomination pools

#### Phase D: Relayer Network

**Deliverables:**

- [ ] Relayer smart contract
- [ ] Gas station network integration
- [ ] Relayer fee mechanism
- [ ] Frontend integration for gas-free withdrawals

---

## Frontend Components

### New Components Needed

| Component                 | Purpose                                  |
| ------------------------- | ---------------------------------------- |
| `PoolDepositModal.tsx`    | Deposit from Port to Pool                |
| `PoolWithdrawModal.tsx`   | Withdraw from Pool to Fog                |
| `PoolStatusCard.tsx`      | Show pool stats (deposits, your pending) |
| `PrivacyPoolProvider.tsx` | Context for pool state                   |

### User Flow: Port → Pool → Fog

```
┌─────────────────────────────────────────────────────────────────┐
│  /send page                                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  FUND YOUR FOG WALLETS                                      ││
│  │  ─────────────────────                                      ││
│  │                                                             ││
│  │  Choose how to fund:                                        ││
│  │                                                             ││
│  │  ┌──────────────────┐  ┌──────────────────┐                ││
│  │  │  FROM PORT       │  │  FROM POOL       │                ││
│  │  │  ────────────    │  │  ────────────    │                ││
│  │  │  Quick & simple  │  │  Maximum privacy │                ││
│  │  │                  │  │                  │                ││
│  │  │  • Use received  │  │  • ZK mixing     │                ││
│  │  │    payments      │  │  • No link to    │                ││
│  │  │  • Already clean │  │    any wallet    │                ││
│  │  │                  │  │  • 2-hour delay  │                ││
│  │  │  [Select Port]   │  │  [Use Pool]      │                ││
│  │  └──────────────────┘  └──────────────────┘                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  YOUR FOG WALLETS                                               │
│  ─────────────────                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ Fog #1       │ │ Fog #2       │ │ + New Wallet │            │
│  │ 1.5 MNT      │ │ Activating...│ │              │            │
│  │ Ready        │ │ 2hr left     │ │              │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Pool Deposit Flow

```
Step 1: Select Source Port
┌─────────────────────────────────────┐
│  Deposit to Privacy Pool            │
│  ─────────────────────              │
│                                     │
│  Select a Port with funds:          │
│                                     │
│  ○ Port #1 - 2.5 MNT               │
│  ● Port #3 - 1.2 MNT  ← Selected   │
│  ○ Port #5 - 0.8 MNT               │
│                                     │
│  Amount: 1 MNT (fixed)             │
│                                     │
│  [Continue]                         │
└─────────────────────────────────────┘

Step 2: Generate Commitment
┌─────────────────────────────────────┐
│  Generating your deposit...         │
│  ─────────────────────              │
│                                     │
│  ⏳ Creating secret...              │
│  ✅ Secret generated                │
│  ⏳ Creating commitment...          │
│  ✅ Commitment ready                │
│                                     │
│  ⚠️ SAVE THIS NOTE                  │
│  ┌─────────────────────────────┐   │
│  │ galeon-note:1:0x1234...     │   │
│  │                   [Copy]    │   │
│  └─────────────────────────────┘   │
│                                     │
│  You need this to withdraw later!  │
│                                     │
│  [I've saved it - Continue]        │
└─────────────────────────────────────┘

Step 3: Confirm Deposit
┌─────────────────────────────────────┐
│  Confirm Deposit                    │
│  ─────────────────────              │
│                                     │
│  From: Port #3                      │
│  Amount: 1 MNT                      │
│  Pool: Galeon Privacy Pool          │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ After depositing, wait for  │   │
│  │ more users to deposit for   │   │
│  │ better anonymity set.       │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Cancel]  [Deposit 1 MNT]         │
└─────────────────────────────────────┘
```

### Pool Withdrawal Flow

```
Step 1: Enter Note
┌─────────────────────────────────────┐
│  Withdraw from Privacy Pool         │
│  ─────────────────────              │
│                                     │
│  Paste your deposit note:           │
│  ┌─────────────────────────────┐   │
│  │ galeon-note:1:0x1234...     │   │
│  └─────────────────────────────┘   │
│                                     │
│  ✅ Valid note found                │
│  Deposited: 2 hours ago            │
│  Anonymity set: 47 deposits        │
│                                     │
│  [Continue]                         │
└─────────────────────────────────────┘

Step 2: Choose Destination
┌─────────────────────────────────────┐
│  Where to withdraw?                 │
│  ─────────────────────              │
│                                     │
│  ○ Existing Fog Wallet             │
│    └─ Fog #1 (0.5 MNT)             │
│                                     │
│  ● New Fog Wallet                  │
│    └─ Creates fresh stealth address│
│                                     │
│  [Continue]                         │
└─────────────────────────────────────┘

Step 3: Confirm Withdrawal (v0)
┌─────────────────────────────────────┐
│  Confirm Withdrawal                 │
│  ─────────────────────              │
│                                     │
│  Amount: 1 MNT                      │
│  To: New Fog Wallet                 │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🛡️ Privacy Level: High       │   │
│  │ • Timelock mixing (2+ hours)│   │
│  │ • Link to Port broken       │   │
│  │ • Ready to pay privately    │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Cancel]  [Withdraw]               │
└─────────────────────────────────────┘

Note: Full vision will add ZK proof generation step here.
```

---

## Data Types

### New Types in `types/fog.ts`

```typescript
// Privacy Pool types
export interface PoolDeposit {
  id: string
  commitment: `0x${string}`
  note: string // Encrypted note for user
  leafIndex: number
  depositedAt: number
  txHash: `0x${string}`
  sourcePortIndex?: number // If deposited from Port
  status: 'pending' | 'confirmed' | 'spent'
}

export interface PoolWithdrawal {
  id: string
  nullifierHash: `0x${string}`
  recipient: `0x${string}`
  withdrawnAt: number
  txHash: `0x${string}`
  fogIndex: number // Fog wallet it funded
  aspUsed: `0x${string}`
}

export interface PoolStats {
  totalDeposits: number
  totalWithdrawals: number
  pendingDeposits: number // Yours
  anonymitySet: number // Current unique deposits
  aspRoot: `0x${string}`
  lastUpdated: number
}

// Note format: galeon-note:VERSION:SECRET_HEX:NULLIFIER_HEX
export type PoolNote = `galeon-note:${number}:${string}:${string}`
```

---

## Security Considerations

### Threat Model

| Threat                | Mitigation                                       |
| --------------------- | ------------------------------------------------ |
| Double-spend          | Nullifier tracking on-chain                      |
| Fake proofs           | Groth16 ZK verification                          |
| Deposit front-running | Commitment hash hides secret                     |
| ASP censorship        | Multiple approved ASPs                           |
| ASP collusion         | ASP only sees deposit addresses, not withdrawals |
| Timing attacks        | 2hr auto-hop delay after withdrawal              |
| Amount correlation    | Fixed 1 MNT denomination                         |

### What Galeon ASP Knows

| Data                        | Visible?              |
| --------------------------- | --------------------- |
| Deposit address             | ✅ Yes                |
| Deposit amount              | ✅ Yes (always 1 MNT) |
| Deposit commitment          | ✅ Yes                |
| Withdrawal address          | ❌ No (only on-chain) |
| Which deposit was withdrawn | ❌ No (ZK proof)      |
| User identity               | ❌ No                 |

### What On-Chain Observers Know

| Data                              | Visible?                    |
| --------------------------------- | --------------------------- |
| Someone deposited                 | ✅ Yes                      |
| Someone withdrew                  | ✅ Yes                      |
| Link between deposit & withdrawal | ❌ No                       |
| Deposit from sanctioned address   | ✅ Yes (but can't withdraw) |

### v0 Known Limitations

The commit-reveal v0 has several known limitations compared to the full ZK implementation:

| Issue                                     | Description                                                                                          | Mitigation                                              | Upgrade Path                    |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------- |
| **Gas payment metadata**                  | `registerWithdrawalAddress()` must be called from some EOA that pays gas, creating linkable metadata | Call from burner EOA or Port address                    | Add relayer in v1               |
| **Registration is public**                | `WithdrawalAddressRegistered` events reveal which addresses are Galeon Fog wallets                   | Acceptable for v0 - not a security issue                | Relayer hides this              |
| **Small anonymity sets**                  | With 2-hour timelock, few deposits may occur, limiting privacy                                       | Show pool size in UI, suggest waiting for larger sets   | ZK proofs don't need timelock   |
| **Secret backup critical**                | If user loses localStorage, funds are stuck forever                                                  | Force backup confirmation, derive from master signature | Backend-encrypted backup option |
| **Centralized ban list**                  | Owner-controlled ban list could be abused                                                            | Transparent on-chain, upgrade to DAO                    | DAO governance + multi-ASP      |
| **No nullifiers**                         | Commit-reveal doesn't prevent same secret being used twice if not tracked                            | `d.withdrawn = true` flag prevents double-withdraw      | ZK nullifier hash               |
| **Deposit-withdrawal linkable by timing** | Observer sees deposit, then ~2hrs later a withdrawal                                                 | Pool size provides k-anonymity                          | ZK proofs break timing link     |

### v0 Gas Payment Considerations

**Who pays gas for what:**

| Action                        | Who Calls            | Who Pays Gas     | Privacy Implication           |
| ----------------------------- | -------------------- | ---------------- | ----------------------------- |
| `deposit()`                   | Port stealth address | Port (has funds) | ✅ OK - Port already public   |
| `registerWithdrawalAddress()` | Any EOA              | Caller           | ⚠️ Links caller to Fog wallet |
| `withdraw()`                  | Any EOA              | Caller           | ⚠️ Links caller to withdrawal |

**Recommended flow for maximum privacy:**

1. Generate Fog wallet address client-side
2. Call `registerWithdrawalAddress()` from the Port address (before depositing)
3. Call `deposit()` from the Port address
4. Wait for timelock
5. Call `withdraw()` from a fresh burner EOA (funded via CEX or other source)

**v1 Improvement:** Relayer network will allow gas-free `registerWithdrawalAddress()` and `withdraw()` calls.

---

## Compliance with Privacy Pools Standard

### Comparison with 0xbow Implementation

Galeon's Privacy Pool is inspired by the [Privacy Pools protocol](https://docs.privacypools.com/) and [0xbow's implementation](https://github.com/0xbow-io/privacy-pools-core), but makes deliberate v0 simplifications:

| Feature                    | 0xbow Privacy Pools                   | Galeon v0                   | Galeon Full Vision       |
| -------------------------- | ------------------------------------- | --------------------------- | ------------------------ |
| **Proof System**           | Groth16 ZK-SNARKs (BLS12-381)         | Commit-reveal with timelock | Groth16 ZK-SNARKs        |
| **Commitment Scheme**      | `c = H(H(s,n), poolId)` with Poseidon | `c = keccak256(secret)`     | Poseidon-based           |
| **Nullifiers**             | Required for ZK withdrawal            | Not used (flag-based)       | Required                 |
| **ASP Model**              | Proactive deposit approval            | Reactive ban list           | Proactive + Shipwreck    |
| **Ragequit**               | Yes - public exit if not ASP-approved | Not in v0                   | Yes                      |
| **Partial Withdrawals**    | Supported                             | No - fixed 1 MNT            | Planned                  |
| **Multi-Asset**            | Native + ERC20                        | Native only (MNT)           | Native + ERC20           |
| **Deposit Source**         | Any address                           | Port addresses only         | Port + verified external |
| **Withdrawal Destination** | Any address                           | Registered Fog wallets only | Any (with ZK proof)      |

### Key Differences Explained

**1. Port-Only Deposits (Galeon-specific)**

0xbow allows any address to deposit, relying on ASP to filter bad actors post-deposit. Galeon v0 restricts deposits to Port addresses (covenant signers), making funds "clean by design."

```
0xbow:   Anyone → Pool → ASP filters → Withdrawal
Galeon:  Port only → Pool → Ban list → Fog wallet
```

**2. No Ragequit in v0**

0xbow's ragequit allows users to publicly exit if their deposit isn't ASP-approved. Galeon v0 doesn't need this because:

- All depositors are covenant signers (pre-vetted)
- Ban list is reactive, not proactive
- Funds can always be withdrawn after timelock (unless banned)

**3. Stealth-Only Withdrawals (Galeon-specific)**

0xbow allows withdrawal to any address. Galeon requires registration of Fog wallet addresses with ephemeral key validation, ensuring:

- Withdrawals go to proper stealth addresses
- On-chain audit trail for compliance
- No accidental withdrawal to traceable addresses

### Roadmap to Full Compliance

| Phase | Milestone              | Brings Galeon Closer To Standard    |
| ----- | ---------------------- | ----------------------------------- |
| v0.5  | Add ragequit mechanism | ✅ Exit guarantee                   |
| v1.0  | ZK proofs (Groth16)    | ✅ Cryptographic unlinkability      |
| v1.0  | Poseidon commitments   | ✅ ZK-friendly hashing              |
| v1.0  | Nullifier tracking     | ✅ Standard double-spend prevention |
| v1.5  | Multi-ASP support      | ✅ Decentralized compliance         |
| v2.0  | Relayer network        | ✅ Gas-free withdrawals             |
| v2.0  | Partial withdrawals    | ✅ Flexible amounts                 |

### References

- [Privacy Pools Documentation](https://docs.privacypools.com/) - Official protocol docs
- [0xbow Privacy Pools Core](https://github.com/0xbow-io/privacy-pools-core) - Reference implementation
- [Privacy Pools Paper](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4563364) - Vitalik Buterin et al.
- [0xbow Blog](https://0xbow.io/blog/getting-started-with-privacy-pools) - Getting started guide

---

## Testing Checklist

### Unit Tests

- [ ] Deposit with valid commitment succeeds
- [ ] Deposit with wrong amount fails
- [ ] Deposit with zero commitment fails
- [ ] Withdrawal with valid proof succeeds
- [ ] Withdrawal with invalid proof fails
- [ ] Withdrawal with used nullifier fails
- [ ] ASP root update by approved ASP succeeds
- [ ] ASP root update by non-ASP fails
- [ ] Owner can approve/revoke ASP

### Integration Tests

- [ ] Full deposit → withdraw flow
- [ ] Deposit from Port address
- [ ] Withdraw to Fog wallet address
- [ ] Multiple deposits before withdrawal
- [ ] Withdraw with different ASPs
- [ ] Gas cost within limits

### E2E Tests

- [ ] User deposits from Port UI
- [ ] User saves note successfully
- [ ] User withdraws with note
- [ ] New Fog wallet created from withdrawal
- [ ] Auto-hop triggers after withdrawal
- [ ] Full flow: Port → Pool → Fog → Pay

---

## Gas Estimates

| Operation       | Estimated Gas | Cost @ 0.02 gwei |
| --------------- | ------------- | ---------------- |
| Deposit         | ~200,000      | ~0.004 MNT       |
| Withdrawal      | ~800,000      | ~0.016 MNT       |
| ASP Root Update | ~50,000       | ~0.001 MNT       |

---

## Dependencies

### Smart Contracts

```json
{
  "@openzeppelin/contracts": "^5.0.0",
  "circomlibjs": "^0.1.7",
  "snarkjs": "^0.7.0"
}
```

### ZK Tools

- `circom` 2.1.x - Circuit compiler
- `snarkjs` 0.7.x - Proof generation/verification
- `circomlib` - Standard circuit libraries

### Frontend

```json
{
  "snarkjs": "^0.7.0",
  "ffjavascript": "^0.2.60"
}
```

---

## Timeline

| Week | Focus                 | Deliverables                        |
| ---- | --------------------- | ----------------------------------- |
| 1    | Contracts + Circuits  | Pool contract, ZK circuit, verifier |
| 2    | Backend + Integration | ASP service, frontend components    |
| 3    | Polish + Deploy       | Testing, optimization, mainnet      |

---

## Open Questions

1. **Denomination**: Fixed 1 MNT or multiple tiers (0.1, 1, 10)?
2. **Relayer**: Add relayer for gas-free withdrawals?
3. **Multiple pools**: One pool or separate by denomination?
4. **Note storage**: LocalStorage vs backend vs user responsibility?
5. **ASP decentralization**: Start with Galeon-only or add others?

---

## References

- [Privacy Pools Paper](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4563364) - Vitalik et al.
- [Tornado Cash](https://github.com/tornadocash/tornado-core) - Original implementation
- [Semaphore](https://github.com/semaphore-protocol/semaphore) - ZK identity
- [Poseidon Hash](https://www.poseidon-hash.info/) - ZK-friendly hash
