# Fog Mode + Shipwreck Implementation Plan

> Sender privacy with compliance accountability
> Target: Hackathon submission (Jan 15, 2026)

---

## Executive Summary

Two new features for Galeon:

1. **Fog Mode** - Pay from pre-funded stealth wallets for sender privacy
2. **Shipwreck** - Generate compliance reports with cryptographic proof

**Hackathon Scope (Reduced):**

- Client-only fog (no backend delegation for MVP)
- JSON export only (no PDF generation)
- Mainnet only (5003 testnet not functional for fog)

Both leverage existing infrastructure:

- Frontend: React hooks, stealth library, wagmi
- Contracts: No changes needed (existing GaleonRegistry works)
- Backend: Future enhancement for scheduled payments

---

## Security & Trust Model

### Key Derivation Separation

Fog wallets use a **separate derivation domain** from Ports to prevent collision and linkability:

```typescript
// Port keys (existing)
derivePortKeys(masterSignature, portIndex, chainPrefix)
// Domain: "galeon-port-keys-v1"

// Fog keys (new - separate domain)
deriveFogKeys(masterSignature, fogIndex, chainPrefix)
// Domain: "galeon-fog-keys-v1"
```

This ensures:

- Port index 0 and Fog index 0 produce different keys
- Analyzing port keys reveals nothing about fog keys
- Clear separation for audit/compliance

### Encryption at Rest

Fog wallet data is encrypted in localStorage using AES-GCM:

```typescript
interface EncryptedFogStore {
  // Per-wallet encryption (each has unique IV)
  wallets: Array<{
    iv: string // 12-byte IV, base64
    ciphertext: string // AES-GCM encrypted data, base64
    tag: string // 16-byte auth tag, base64
  }>

  // Version for migration
  version: 1
}

// What's encrypted per wallet:
interface FogWalletData {
  fogIndex: number
  stealthAddress: `0x${string}`
  fundedAt: number
  fundingTxHash: `0x${string}`
  // NOTE: No private keys stored!
  // Keys are derived on-demand from masterSignature + fogIndex
}
```

**Critical: No private keys are stored.** Fog wallet private keys are derived on-demand:

```typescript
// When user needs to spend from fog wallet:
const fogKeys = deriveFogKeys(masterSignature, fogIndex)
const privateKey = fogKeys.spendingPrivateKey
// Use immediately, never persist
```

### Session Key Derivation

```typescript
const SESSION_MESSAGE = `Galeon Fog Session v1

Sign to unlock your fog reserve.
This does NOT authorize any transactions.

Chain: Mantle (5000)`

// Derive AES-256 key from signature
const signature = await walletClient.signMessage({ message: SESSION_MESSAGE })
const keyMaterial = keccak256(signature) // 32 bytes
const sessionKey = await crypto.subtle.importKey(
  'raw',
  hexToBytes(keyMaterial.slice(2)),
  { name: 'AES-GCM', length: 256 },
  false,
  ['encrypt', 'decrypt']
)
```

### Recovery Story

If localStorage is cleared or session key is lost:

1. **Funds are NOT lost** - User still controls spending keys via master signature
2. **Recovery flow:**
   - User signs master key derivation message (existing setup flow)
   - App scans chain for announcements to fog addresses
   - Fog wallet indices 0-99 are scanned (deriveFogKeys with each index)
   - Any addresses with balance are recovered to fog reserve

### Gas Reserve Requirements

Each fog wallet needs sufficient MNT for gas:

| Operation       | Estimated Gas | MNT Cost (@0.02 gwei) |
| --------------- | ------------- | --------------------- |
| Native transfer | ~21,000       | ~0.0004 MNT           |
| payNative call  | ~85,000       | ~0.0017 MNT           |
| Buffer (2x)     | -             | ~0.004 MNT            |

**Minimum fog wallet funding: 0.01 MNT + payment amount**

### Trust Assumptions

| Component            | Trust Level | Notes                                |
| -------------------- | ----------- | ------------------------------------ |
| Browser localStorage | Low         | Encrypted, no keys stored            |
| Session key (memory) | Medium      | Cleared on lock/tab close            |
| Master signature     | High        | Required to derive any keys          |
| RPC provider         | Medium      | Can see addresses, not link to user  |
| Backend (future)     | Explicit    | Only for scheduled payments, not MVP |

---

## Feature 1: Fog Mode (Fog Reserve)

> ⚠️ **Mainnet Only:** Fog Mode is only available on Mantle Mainnet (5000). Testnet (5003) is not supported because fog wallets require real economic activity to provide meaningful privacy.

### Concept

Users pre-fund stealth "fog wallets" during normal activity. Later, they pay from these wallets, breaking the temporal correlation between funding and payment.

```
Day 1: Alice funds Fog A, B, C (looks like normal payments)
Day 7: Alice pays Coffee Shop from Fog B (no link to Day 1)
```

### Architecture (MVP - Client Only)

```
┌─────────────────────────────────────────────────────────────────┐
│                  FOG MODE ARCHITECTURE (MVP)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FRONTEND (Browser)                         BLOCKCHAIN          │
│  ─────────────────                          ──────────          │
│                                                                 │
│  ┌──────────────────┐                                          │
│  │ Session Key      │  User signs to unlock                    │
│  │ (keccak256(sig)) │  ────────────────────►                   │
│  └────────┬─────────┘                                          │
│           │                                                     │
│  ┌────────▼─────────┐                                          │
│  │ Encrypted        │                                          │
│  │ localStorage     │  fogIndex, address, fundedAt             │
│  │ (AES-GCM)        │  (NO private keys stored)                │
│  └────────┬─────────┘                                          │
│           │                                                     │
│  ┌────────▼─────────────────────────────┐                      │
│  │         useFogReserve Hook           │                      │
│  │                                      │                      │
│  │  unlock()     → Sign session msg     │                      │
│  │  createFog()  → deriveFogKeys(index) │                      │
│  │  fundFog()    → Transfer MNT    ─────┼──► Mantle (5000)     │
│  │  payFromFog() → Derive key, sign ────┼──► GaleonRegistry    │
│  │                                      │                      │
│  └──────────────────────────────────────┘                      │
│                                                                 │
│  Note: Scheduled payments (backend delegation) is a future     │
│  enhancement. MVP supports instant payments only.              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Database Schema (Future Enhancement)

> **Note:** Backend delegation is not part of MVP. This schema is for future scheduled payments feature.

<details>
<summary>Click to expand future schema</summary>

```sql
-- Future migration: fog_delegations table
CREATE TABLE fog_delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id),

  -- Fog wallet info
  fog_address VARCHAR(42) NOT NULL,
  fog_index INTEGER NOT NULL,
  encrypted_fog_key TEXT NOT NULL,  -- Encrypted with backend pubkey

  -- Payment details (from signed authorization)
  recipient VARCHAR(42) NOT NULL,
  recipient_ephemeral_pub_key VARCHAR(68) NOT NULL,
  recipient_view_tag VARCHAR(4) NOT NULL,
  receipt_hash VARCHAR(66) NOT NULL,  -- Must match computeReceiptHash() schema
  amount DECIMAL(78, 0) NOT NULL,

  -- Time bounds
  send_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,

  -- User's signed authorization
  user_signature VARCHAR(132) NOT NULL,
  delegation_message TEXT NOT NULL,

  -- Execution status
  status VARCHAR(20) DEFAULT 'pending',
  tx_hash VARCHAR(66),
  executed_at TIMESTAMP,
  error_message TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

</details>

### API Endpoints (Future Enhancement)

> **Note:** MVP is client-only. No backend API for fog delegation.

<details>
<summary>Click to expand future API</summary>

```typescript
// Future routes in apps/api/start/routes.ts
router
  .group(() => {
    router.get('/fog/public-key', [FogController, 'getPublicKey'])
    router.post('/fog/delegate', [FogController, 'createDelegation'])
    router.get('/fog/delegations', [FogController, 'listDelegations'])
    router.delete('/fog/delegations/:id', [FogController, 'cancelDelegation'])
    router.get('/fog/delegations/:id', [FogController, 'getDelegation'])
  })
  .prefix('/api/v1')
  .middleware('auth')
```

</details>

### Frontend Implementation

#### New Files (MVP)

```
apps/web/
├── hooks/
│   ├── use-fog-reserve.ts      # Main fog reserve hook
│   └── use-fog-session.ts      # Session key management
├── components/
│   ├── fog/
│   │   ├── FogReservePanel.tsx    # Reserve overview
│   │   ├── FogWalletCard.tsx      # Individual wallet display
│   │   ├── FogFundModal.tsx       # Fund new fog wallet
│   │   ├── FogPaymentFlow.tsx     # Pay from fog
│   │   └── FogUnlockPrompt.tsx    # Sign to unlock session
├── lib/
│   └── fog-crypto.ts           # AES-GCM encryption utilities
└── app/
    └── fog/
        └── page.tsx            # /fog - Fog Reserve management
```

#### Hook: useFogReserve

```typescript
// apps/web/hooks/use-fog-reserve.ts

interface FogWallet {
  id: string // Unique ID (fogIndex as string)
  fogIndex: number // Derivation index
  stealthAddress: `0x${string}` // Derived address
  balance: bigint // Current balance (fetched)
  fundedAt: number // Timestamp when funded
  fundingTxHash: `0x${string}` // Funding transaction
  status: 'ready' | 'spent' // MVP: no 'delegated' state
}

interface UseFogReserveReturn {
  // State
  fogWallets: FogWallet[]
  totalBalance: bigint
  isUnlocked: boolean
  isLoading: boolean
  error: string | null

  // Session actions
  unlock: () => Promise<void> // Sign to decrypt localStorage
  lock: () => void // Clear session key

  // Fog wallet actions
  createFogWallet: () => Promise<FogWallet>
  fundFogWallet: (fogIndex: number, amount: bigint) => Promise<`0x${string}`>
  refreshBalances: () => Promise<void>

  // Payment (instant only in MVP)
  payFromFog: (
    fogIndex: number,
    recipientMetaAddress: string, // st:mnt:... format
    amount: bigint,
    memo: string
  ) => Promise<`0x${string}`> // Returns tx hash

  // Recovery
  recoverFogWallets: () => Promise<FogWallet[]> // Scan chain for lost wallets
}

export function useFogReserve(): UseFogReserveReturn {
  // Implementation uses:
  // - useFogSession() for AES encryption key
  // - localStorage for encrypted fog metadata (no keys!)
  // - deriveFogKeys() from @galeon/stealth for on-demand key derivation
  // - wagmi for chain interactions
}
```

#### Hook: useFogSession

```typescript
// apps/web/hooks/use-fog-session.ts

const SESSION_MESSAGE = `Galeon Fog Session v1

Sign to unlock your fog reserve.
This does NOT authorize any transactions.

Chain: Mantle (5000)`

interface UseFogSessionReturn {
  sessionKey: CryptoKey | null
  isUnlocked: boolean

  unlock: () => Promise<void>
  lock: () => void
}

export function useFogSession(): UseFogSessionReturn {
  const { data: walletClient } = useWalletClient()
  const [sessionKey, setSessionKey] = useState<CryptoKey | null>(null)

  const unlock = useCallback(async () => {
    if (!walletClient) throw new Error('Wallet not connected')

    // User signs deterministic message
    const signature = await walletClient.signMessage({ message: SESSION_MESSAGE })

    // Derive AES key from signature
    const keyMaterial = keccak256(signature)
    const key = await crypto.subtle.importKey(
      'raw',
      hexToBytes(keyMaterial.slice(2)),
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    )

    setSessionKey(key)
  }, [walletClient])

  const lock = useCallback(() => {
    setSessionKey(null)
  }, [])

  return {
    sessionKey,
    isUnlocked: sessionKey !== null,
    unlock,
    lock,
  }
}
```

---

## Feature 2: Shipwreck (Compliance Mode)

### Concept

Users can generate cryptographically-signed reports proving ownership and usage of fog wallets. This enables:

- Regulatory compliance on request
- Tax reporting
- Audit trails
- Legal protection ("I can prove my payments")

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SHIPWRECK ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FRONTEND (Browser)                                             │
│  ─────────────────                                              │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Shipwreck Report Generator                              │  │
│  │                                                          │  │
│  │  1. Select fog wallets to disclose                       │  │
│  │  2. Select date range                                    │  │
│  │  3. Generate derivation proofs                           │  │
│  │  4. User signs attestation                               │  │
│  │  5. Export JSON (PDF future enhancement)                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  No backend needed - all client-side!                          │
│  (Backend storage optional for report history)                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Report Structure

```typescript
interface ShipwreckReport {
  // Header
  version: '1.0'
  generatedAt: number // Unix timestamp
  generatedBy: `0x${string}` // User's main wallet address

  // Scope
  dateRange: {
    from: number
    to: number
  }

  // Disclosed fog wallets
  fogWallets: Array<{
    fogIndex: number
    stealthAddress: `0x${string}`

    // Derivation proof (auditor can verify)
    derivationProof: {
      masterPublicKey: `0x${string}` // User's stealth spending pubkey
      fogIndex: number
      expectedAddress: `0x${string}` // Derived address (should match)
    }

    // Funding transaction
    funding: {
      txHash: `0x${string}`
      from: `0x${string}` // User's main wallet
      amount: string
      timestamp: number
    }

    // Outgoing payments from this fog wallet
    payments: Array<{
      txHash: `0x${string}`
      to: `0x${string}` // Recipient stealth address
      amount: string
      timestamp: number
      memo?: string
    }>
  }>

  // Summary
  summary: {
    totalFogWallets: number
    totalFunded: string
    totalSpent: string
    totalPayments: number
  }

  // Cryptographic attestation
  attestation: {
    message: string // Human-readable statement
    signature: `0x${string}` // User's signature on the report hash
    reportHash: `0x${string}` // keccak256 of report data
  }
}
```

### Frontend Implementation (MVP)

#### New Files

```
apps/web/
├── hooks/
│   └── use-shipwreck.ts           # Report generation hook
├── components/
│   ├── shipwreck/
│   │   ├── ShipwreckWizard.tsx    # Step-by-step report creation
│   │   ├── FogWalletSelector.tsx  # Select wallets to disclose
│   │   ├── DateRangePicker.tsx    # Select time range
│   │   ├── ReportPreview.tsx      # Preview before signing
│   │   └── ReportExport.tsx       # JSON export (MVP)
└── app/
    └── compliance/
        └── page.tsx               # /compliance - Shipwreck UI
```

#### Hook: useShipwreck

```typescript
// apps/web/hooks/use-shipwreck.ts

interface UseShipwreckReturn {
  // State
  isGenerating: boolean
  isSigning: boolean
  report: ShipwreckReport | null
  error: string | null

  // Actions
  generateReport: (options: {
    fogIndices: number[]
    dateRange: { from: Date; to: Date }
  }) => Promise<ShipwreckReport>

  signReport: (report: ShipwreckReport) => Promise<ShipwreckReport>

  // Export (JSON only for MVP)
  exportJSON: (report: ShipwreckReport) => string
  downloadJSON: (report: ShipwreckReport) => void // Triggers browser download

  // Verification (can be done by anyone with the report)
  verifyReport: (report: ShipwreckReport) => Promise<{
    valid: boolean
    errors: string[]
  }>
}
```

---

## Implementation Timeline (MVP Scope)

> Reduced scope: Client-only fog, JSON export only, mainnet only

### Week 1: Fog Mode Core (Dec 29 - Jan 4)

| Day        | Task                       | Files                                              |
| ---------- | -------------------------- | -------------------------------------------------- |
| **Dec 29** | deriveFogKeys + fog-crypto | `packages/stealth`, `fog-crypto.ts`                |
| **Dec 30** | Session management         | `use-fog-session.ts`                               |
| **Dec 31** | Fog wallet creation        | `use-fog-reserve.ts` (create, fund)                |
| **Jan 1**  | Encrypted localStorage     | AES-GCM persistence                                |
| **Jan 2**  | Instant fog payment        | `use-fog-reserve.ts` (payFromFog)                  |
| **Jan 3**  | UI components              | `FogReservePanel`, `FogWalletCard`, `FogFundModal` |
| **Jan 4**  | E2E testing + recovery     | create → fund → pay → recover                      |

### Week 2: Shipwreck + Polish (Jan 5 - Jan 11)

| Day        | Task                       | Files                              |
| ---------- | -------------------------- | ---------------------------------- |
| **Jan 5**  | Shipwreck report structure | `use-shipwreck.ts` (generate)      |
| **Jan 6**  | Derivation proofs          | On-chain verification logic        |
| **Jan 7**  | Report signing             | Attestation signature flow         |
| **Jan 8**  | JSON export + download     | `ReportExport.tsx`                 |
| **Jan 9**  | Shipwreck UI               | `ShipwreckWizard`, `ReportPreview` |
| **Jan 10** | Verification UI            | Independent report verification    |
| **Jan 11** | Integration testing        | Full fog → shipwreck flow          |

### Week 3: Polish + Submission (Jan 12 - Jan 15)

| Day        | Task                      |
| ---------- | ------------------------- |
| **Jan 12** | Bug fixes, error handling |
| **Jan 13** | UX polish, loading states |
| **Jan 14** | Demo video, screenshots   |
| **Jan 15** | Submission                |

---

## Backend Implementation Details (Future Enhancement)

> **Note:** Backend delegation is NOT part of MVP. These are reference implementations for future scheduled payments feature.

<details>
<summary>Click to expand backend code</summary>

### FogController

```typescript
// apps/api/app/controllers/fog_controller.ts

import { HttpContext } from '@adonisjs/core/http'
import FogDelegation from '#models/fog_delegation'
import { createDelegationValidator, cancelDelegationValidator } from '#validators/fog'
import { decrypt } from '#services/crypto_service'
import env from '#start/env'

export default class FogController {
  /**
   * Get backend's public key for client-side encryption
   */
  async getPublicKey({ response }: HttpContext) {
    const publicKey = env.get('FOG_ENCRYPTION_PUBLIC_KEY')
    return response.json({ publicKey })
  }

  /**
   * Create a new fog payment delegation
   */
  async createDelegation({ request, auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const data = await request.validateUsing(createDelegationValidator)

    // Verify user's signature on the delegation message
    const isValid = await this.verifyDelegationSignature(
      data.delegationMessage,
      data.userSignature,
      user.walletAddress
    )

    if (!isValid) {
      return response.badRequest({ error: 'Invalid delegation signature' })
    }

    // Verify time bounds
    const now = Date.now()
    if (data.sendAt <= now) {
      return response.badRequest({ error: 'sendAt must be in the future' })
    }
    if (data.expiresAt <= data.sendAt) {
      return response.badRequest({ error: 'expiresAt must be after sendAt' })
    }

    // Create delegation record
    const delegation = await FogDelegation.create({
      userId: user.id,
      fogAddress: data.fogAddress,
      fogIndex: data.fogIndex,
      encryptedFogKey: data.encryptedFogKey,
      recipient: data.recipient,
      recipientEphemeralPubKey: data.recipientEphemeralPubKey,
      recipientViewTag: data.recipientViewTag,
      receiptHash: data.receiptHash,
      amount: data.amount,
      sendAt: new Date(data.sendAt),
      expiresAt: new Date(data.expiresAt),
      userSignature: data.userSignature,
      delegationMessage: data.delegationMessage,
      status: 'pending',
    })

    // Queue the job
    await queue.dispatch(
      'process_fog_payment',
      {
        delegationId: delegation.id,
      },
      {
        delay: data.sendAt - now, // Delay until sendAt
      }
    )

    return response.created({
      id: delegation.id,
      status: delegation.status,
      sendAt: delegation.sendAt,
      expiresAt: delegation.expiresAt,
    })
  }

  /**
   * List user's delegations
   */
  async listDelegations({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { status, page = 1, limit = 20 } = request.qs()

    const query = FogDelegation.query().where('userId', user.id).orderBy('createdAt', 'desc')

    if (status) {
      query.where('status', status)
    }

    const delegations = await query.paginate(page, limit)

    return response.json(delegations)
  }

  /**
   * Cancel a pending delegation
   */
  async cancelDelegation({ params, auth, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const delegation = await FogDelegation.query()
      .where('id', params.id)
      .where('userId', user.id)
      .where('status', 'pending')
      .first()

    if (!delegation) {
      return response.notFound({ error: 'Delegation not found or not cancellable' })
    }

    delegation.status = 'cancelled'
    await delegation.save()

    return response.json({ status: 'cancelled' })
  }

  /**
   * Get delegation details
   */
  async getDelegation({ params, auth, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const delegation = await FogDelegation.query()
      .where('id', params.id)
      .where('userId', user.id)
      .first()

    if (!delegation) {
      return response.notFound({ error: 'Delegation not found' })
    }

    return response.json(delegation)
  }

  private async verifyDelegationSignature(
    message: string,
    signature: string,
    expectedAddress: string
  ): Promise<boolean> {
    // Use viem to recover address from signature
    const { verifyMessage } = await import('viem')
    const recoveredAddress = await verifyMessage({
      message,
      signature: signature as `0x${string}`,
    })
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase()
  }
}
```

### ProcessFogPayment Job

```typescript
// apps/api/app/jobs/process_fog_payment.ts

import { Job } from 'adonisjs-jobs'
import FogDelegation from '#models/fog_delegation'
import RelayerService from '#services/relayer_service'
import CryptoService from '#services/crypto_service'
import transmit from '@adonisjs/transmit/services/main'
import { verifyMessage } from 'viem'

interface ProcessFogPaymentPayload {
  delegationId: string
}

export default class ProcessFogPayment extends Job {
  async handle(payload: ProcessFogPaymentPayload) {
    const { delegationId } = payload

    const delegation = await FogDelegation.find(delegationId)
    if (!delegation) {
      this.logger.error(`Delegation ${delegationId} not found`)
      return
    }

    // Check if already processed or cancelled
    if (delegation.status !== 'pending') {
      this.logger.info(`Delegation ${delegationId} is ${delegation.status}, skipping`)
      return
    }

    const now = Date.now()

    // Check time window
    if (now < delegation.sendAt.getTime()) {
      this.logger.info(`Delegation ${delegationId} not ready yet, requeuing`)
      // Requeue with remaining delay
      await this.dispatch(
        {
          delegationId,
        },
        {
          delay: delegation.sendAt.getTime() - now,
        }
      )
      return
    }

    if (now > delegation.expiresAt.getTime()) {
      this.logger.warn(`Delegation ${delegationId} expired`)
      delegation.status = 'expired'
      await delegation.save()

      // Notify user
      await this.notifyUser(delegation.userId, 'fog_payment_expired', {
        delegationId,
        fogAddress: delegation.fogAddress,
      })
      return
    }

    // Verify user signature (defensive check)
    const isValid = await verifyMessage({
      message: delegation.delegationMessage,
      signature: delegation.userSignature as `0x${string}`,
    })

    if (!isValid) {
      this.logger.error(`Invalid signature for delegation ${delegationId}`)
      delegation.status = 'failed'
      delegation.errorMessage = 'Invalid user signature'
      await delegation.save()
      return
    }

    // Mark as processing
    delegation.status = 'processing'
    await delegation.save()

    try {
      // Decrypt fog wallet private key
      const fogPrivateKey = await CryptoService.decryptFogKey(delegation.encryptedFogKey)

      // Execute payment via RelayerService
      const txHash = await RelayerService.sendFromStealth({
        privateKey: fogPrivateKey,
        to: delegation.recipient,
        amount: BigInt(delegation.amount),
        // For GaleonRegistry.payNative call
        contractCall: {
          address: GALEON_REGISTRY_ADDRESS,
          abi: galeonRegistryAbi,
          functionName: 'payNative',
          args: [
            delegation.recipient,
            delegation.recipientEphemeralPubKey,
            delegation.recipientViewTag,
            delegation.receiptHash,
          ],
        },
      })

      // Update status
      delegation.status = 'executed'
      delegation.txHash = txHash
      delegation.executedAt = new Date()
      await delegation.save()

      // Notify user
      await this.notifyUser(delegation.userId, 'fog_payment_executed', {
        delegationId,
        txHash,
        amount: delegation.amount,
      })

      this.logger.info(`Delegation ${delegationId} executed: ${txHash}`)
    } catch (error) {
      this.logger.error(`Delegation ${delegationId} failed:`, error)

      delegation.status = 'failed'
      delegation.errorMessage = error.message
      await delegation.save()

      // Notify user
      await this.notifyUser(delegation.userId, 'fog_payment_failed', {
        delegationId,
        error: error.message,
      })
    }
  }

  private async notifyUser(userId: number, event: string, data: any) {
    // Use Transmit SSE to notify user in real-time
    transmit.broadcast(`user/${userId}`, {
      type: event,
      data,
      timestamp: Date.now(),
    })
  }
}
```

### Environment Variables (for backend delegation)

Add to `.env`:

```bash
# Fog Mode encryption keypair (generate with openssl)
FOG_ENCRYPTION_PUBLIC_KEY=04...   # secp256k1 public key (uncompressed)
FOG_ENCRYPTION_PRIVATE_KEY=...    # secp256k1 private key (keep secret!)
```

Generate keypair:

```bash
# Generate private key
openssl ecparam -name secp256k1 -genkey -noout -out fog_private.pem

# Extract public key
openssl ec -in fog_private.pem -pubout -out fog_public.pem

# Convert to hex for env vars
openssl ec -in fog_private.pem -text -noout
```

</details>

---

## Testing Checklist (MVP)

### Fog Mode

- [ ] `deriveFogKeys` produces different keys than `derivePortKeys` for same index
- [ ] Create fog wallet (client-side derivation)
- [ ] Fund fog wallet from main wallet
- [ ] Encrypt/decrypt localStorage with session key (AES-GCM)
- [ ] Per-wallet IV prevents ciphertext comparison
- [ ] Instant payment from fog reserve
- [ ] Recovery scan finds fog wallets with balance
- [ ] Session lock clears key from memory
- [ ] Mainnet (5000) only - no testnet

### Shipwreck

- [ ] Select fog wallets for report
- [ ] Generate derivation proofs (match on-chain)
- [ ] Sign attestation
- [ ] Export JSON (with proper formatting)
- [ ] Verify report (independent verification)
- [ ] Verify signature matches report hash

---

## Success Metrics for Hackathon (MVP)

| Feature      | Demo-Ready Criteria                                      |
| ------------ | -------------------------------------------------------- |
| Fog Reserve  | User can fund 3 fog wallets, pay from one                |
| Fog Recovery | User can recover fog wallets after clearing localStorage |
| Shipwreck    | Generate and verify a compliance report (JSON)           |
| UX           | Clear flow, no confusing errors                          |
| Security     | Encryption works, no keys stored, signatures verify      |

---

## Risk Mitigation

| Risk                 | Mitigation                                        |
| -------------------- | ------------------------------------------------- |
| localStorage cleared | Recovery flow scans chain for fog wallet balances |
| Session key lost     | User re-signs to derive new key, same result      |
| RPC provider down    | Fallback to public Mantle RPC                     |
| Gas insufficient     | UI warns if fog wallet balance < 0.01 MNT         |

---

## Future Enhancements (Post-Hackathon)

### Near-term (P1)

1. **Backend delegation** - Scheduled payments via time-bound signed authorization
2. **PDF export for Shipwreck** - Professional compliance reports

### Medium-term (P2)

3. **Multi-chain fog wallets** - Bridge funds through different L2s
4. **ERC-4337 paymaster** - Gas sponsorship for fog wallets
5. **Hardware wallet support** - Ledger/Trezor for signing
6. **Payment requests** - Invoicing and recurring payments

### Long-term (P3)

7. **Institutional features** - Multi-sig fog wallets, approval workflows
8. **Privacy metrics** - Show anonymity set size, timing recommendations
9. **Fog wallet rotation** - Automatic re-funding of depleted wallets

> **Note:** ERC-20 token support is already implemented at the contract level (`GaleonRegistry.payToken()`) with USDT, USDC, and USDe configured. The UI integration for token payments is a future enhancement.
