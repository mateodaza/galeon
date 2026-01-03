# Privacy Pool + Shipwreck Implementation Plan

> Sender privacy with compliance accountability
> Target: Hackathon submission (Jan 15, 2026)

---

## Executive Summary

Two new features for Galeon:

1. **Privacy Pool** - ZK mixing for sender privacy (0xbow fork)
2. **Shipwreck** - Generate compliance reports with cryptographic proof

**Architecture (Pool-Only Model):**

Privacy Pool handles ALL mixing via ZK proofs. No intermediate "fog wallets" needed:

- **Flow:** Port → Pool (deposit) → Recipient (withdraw with ZK proof)
- **Variable amounts** - Deposit any amount, withdraw same amount
- **Direct payment** - Withdraw goes directly to recipient (no intermediate address)

```
┌──────────┐     ┌──────────┐     ┌──────────────┐
│  Port    │────▶│  Pool    │────▶│  Recipient   │
│ (funds)  │     │ (notes)  │     │  (payment)   │
└──────────┘     └──────────┘     └──────────────┘
     │                │                   │
     │  Deposit       │  ZK proof         │  Direct
     │  any amount    │  breaks link      │  withdrawal
```

**Why NO intermediate fog/stealth wallet:**

- Pre-withdrawing to a "private balance" creates linkable identity
- Pool withdrawal should go directly to payment recipient
- ZK proof already breaks all links - no need for extra step

**Hackathon Scope:**

- ZK circuits for deposit/withdraw proofs
- Note management (encrypted in localStorage)
- Direct withdrawal to recipient addresses
- JSON export only for Shipwreck (no PDF generation)

Both leverage existing infrastructure:

- Frontend: React hooks, stealth library, wagmi, snarkjs
- Contracts: GaleonPrivacyPool (0xbow fork) + GaleonRegistry
- Backend: Note backup/sync (optional)

---

## Security & Trust Model

### Note Management (Pool Deposits)

Pool notes are encrypted in localStorage using AES-GCM:

```typescript
interface PoolNote {
  id: string // UUID for UI
  commitment: `0x${string}` // hash(nullifier, secret, amount) - in Merkle tree
  nullifier: `0x${string}` // Private - needed to withdraw
  secret: `0x${string}` // Private - needed to withdraw
  amount: bigint // Variable amount deposited
  leafIndex: number // Position in Merkle tree
  depositedAt: number // Timestamp
  depositTxHash: `0x${string}` // Reference
  sourcePortName?: string // Optional: "From Freelance port" (UX only)
  spent: boolean // Already withdrawn?
  spentTxHash?: `0x${string}` // Withdrawal tx if spent
}

interface EncryptedNoteStore {
  notes: Array<{
    iv: string // 12-byte IV, base64
    ciphertext: string // AES-GCM encrypted PoolNote, base64
    tag: string // 16-byte auth tag, base64
  }>
  version: 1
}
```

**Critical: Notes contain withdrawal secrets.** They must be:

- Encrypted at rest (AES-GCM with session key)
- Backed up by user (export functionality)
- Recoverable via chain scanning (expensive but possible)

### Session Key Derivation

```typescript
const SESSION_MESSAGE = `Galeon Privacy Pool v1

Sign to access your pool notes.
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

If localStorage is cleared or notes are lost:

1. **Funds are NOT immediately lost** - Notes can be recovered
2. **Recovery flow:**
   - User signs session message to derive encryption key
   - If backup exists: Import encrypted backup file
   - If no backup: Scan chain for deposits to user's Port addresses
   - Expensive but possible to reconstruct notes from chain data

### Trust Assumptions

| Component            | Trust Level | Notes                                      |
| -------------------- | ----------- | ------------------------------------------ |
| Browser localStorage | Low         | Encrypted notes, secrets protected         |
| Session key (memory) | Medium      | Cleared on lock/tab close                  |
| Master signature     | High        | Required to derive session encryption key  |
| RPC provider         | Medium      | Can see Pool contract calls, not note data |
| Pool contract        | High        | Holds funds, verifies ZK proofs            |

### ~~Backend Custody for Scheduled Payments~~ - DEPRECATED

> ⚠️ **DEPRECATED:** This section describes the old "fog wallet" scheduled payments design.
> The Privacy Pool architecture (above) replaces this with client-side ZK proofs - no backend custody needed.
> Keys always stay in the browser.

<details>
<summary>Archived fog delegation design (click to expand)</summary>

> **⚠️ Opt-in Trade-off:** Scheduled payments require temporary key custody by the backend.

When users create a scheduled payment:

1. Fog keys are encrypted to backend's public key (ECIES + AES-256-GCM)
2. Backend holds encrypted keys until session expires (max 30 days)
3. Backend executes payment at scheduled time using decrypted keys
4. User can cancel anytime before execution

**Safeguards:**

- Time-bound sessions (default 7 days, max 30 days)
- Per-delegation amount limits (configurable)
- User signature required on each delegation
- Audit logging of all operations
- Instant revocation via "End Session" or "Cancel Delegation"

**UI Consent Flow:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Schedule Payment                                               │
│                                                                 │
│  ⚠️ Backend Custody Notice                                      │
│                                                                 │
│  To schedule this payment, your fog wallet keys will be         │
│  shared with Galeon's backend for 7 days.                       │
│                                                                 │
│  • Backend will execute the payment at the scheduled time       │
│  • You can cancel anytime before execution                      │
│  • Keys are encrypted and deleted after session expires         │
│                                                                 │
│  [ Cancel ]                    [ I Understand, Continue ]       │
└─────────────────────────────────────────────────────────────────┘
```

For instant payments (client-only), keys never leave the browser.

</details>

---

## Feature 1: Privacy Pool

> ⚠️ **Mainnet Only:** Privacy Pool is only available on Mantle Mainnet (5000). Testnet (5003) is not supported because meaningful privacy requires real economic activity.

### Concept

Privacy Pool provides ZK mixing for private payments. No intermediate addresses needed:

```
Flow:
1. Deposit funds to Privacy Pool (from Port) → get note
2. When paying: Withdraw directly to recipient with ZK proof
3. ZK proof proves "I own a deposit" without revealing which one

Key insight:
- NO intermediate "fog wallet" or "private balance"
- Withdraw goes DIRECTLY to payment recipient
- Variable amounts (deposit any amount, withdraw same amount)
```

**Why No Intermediate Address:**

- Pre-withdrawing to a "private balance" creates linkable identity
- ZK proof already breaks all links - extra hop is unnecessary
- Direct withdrawal = simpler + better privacy

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  PRIVACY POOL ARCHITECTURE                       │
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
│  │ Encrypted Notes  │  commitment, nullifier, secret,          │
│  │ localStorage     │  amount, leafIndex, spent                │
│  │ (AES-GCM)        │                                          │
│  └────────┬─────────┘                                          │
│           │                                                     │
│  ┌────────▼─────────────────────────────┐                      │
│  │         usePrivacyPool Hook          │                      │
│  │                                      │                      │
│  │  unlock()   → Sign session msg       │                      │
│  │  deposit()  → Port → Pool ───────────┼──► PrivacyPool.sol   │
│  │  withdraw() → ZK proof → recipient ──┼──► Direct to payee   │
│  │  getNotes() → List unspent notes     │                      │
│  │                                      │                      │
│  └──────────────────────────────────────┘                      │
│                                                                 │
│  ZK proof generation happens in browser (snarkjs web worker)   │
│  Proof: "I know secrets for a commitment in the Merkle tree"   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Database Schema (Note Backup - Optional)

```sql
-- Migration: pool_note_backups table
-- Optional server-side encrypted backup of user notes
CREATE TABLE pool_note_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Notes encrypted with user's session key (server can't decrypt)
  encrypted_notes TEXT NOT NULL,
  encryption_nonce TEXT NOT NULL,

  -- Metadata (not sensitive)
  note_count INTEGER NOT NULL,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_pool_note_backups_user_id ON pool_note_backups(user_id);
```

**Key point:** Server stores encrypted notes but CANNOT decrypt them. Only the user with their session key can decrypt. This is purely for backup/sync across devices.

### API Endpoints (Note Backup)

```typescript
// Routes in apps/api/start/routes.ts
router
  .group(() => {
    // Note backup (optional - encrypted, server can't read)
    router.post('/pool/notes/backup', [PoolController, 'backupNotes'])
    router.get('/pool/notes/backup', [PoolController, 'getBackup'])
  })
  .prefix('/api/v1')
  .use(middleware.auth())
```

### Frontend Implementation

#### New Files

```
apps/web/
├── hooks/
│   ├── use-privacy-pool.ts     # Main pool hook
│   ├── use-pool-deposit.ts     # Deposit from Port
│   ├── use-pool-withdraw.ts    # ZK proof + withdraw
│   └── use-pool-session.ts     # Session key management
├── contexts/
│   └── pool-context.tsx        # Note state management
├── components/
│   └── pool/
│       ├── PoolDashboard.tsx      # Pool overview
│       ├── DepositModal.tsx       # Deposit from Ports
│       ├── WithdrawModal.tsx      # Pay with ZK proof
│       ├── NotesList.tsx          # Display notes
│       └── UnlockPrompt.tsx       # Sign to unlock session
├── lib/
│   ├── pool-crypto.ts          # AES-GCM encryption
│   └── zk-prover.ts            # snarkjs integration
└── app/
    └── pool/
        └── page.tsx            # /pool - Privacy Pool dashboard
```

#### Types

```typescript
// apps/web/types/pool.ts

interface PoolNote {
  id: string // UUID
  commitment: `0x${string}` // hash(nullifier, secret, amount)
  nullifier: `0x${string}` // Private - needed to withdraw
  secret: `0x${string}` // Private - needed to withdraw
  amount: bigint // Variable amount
  leafIndex: number // Position in Merkle tree
  depositedAt: number // Timestamp
  depositTxHash: `0x${string}` // Reference
  sourcePortName?: string // Optional UX metadata
  spent: boolean // Already withdrawn?
  spentTxHash?: `0x${string}` // If spent
}

interface UsePrivacyPoolReturn {
  // State
  notes: PoolNote[]
  unspentNotes: PoolNote[]
  totalBalance: bigint
  isUnlocked: boolean
  isLoading: boolean
  error: string | null

  // Session actions
  unlock: () => Promise<void> // Sign to decrypt notes
  lock: () => void // Clear session

  // Pool actions
  deposit: (
    portAddress: `0x${string}`, // Port stealth address to deposit from
    amount: bigint,
    sourcePortName?: string // Optional: for UX tracking
  ) => Promise<`0x${string}`> // Returns tx hash

  withdraw: (
    noteId: string, // Which note to spend
    recipientAddress: `0x${string}`, // Where to send funds
    amount: bigint // Must match note amount
  ) => Promise<`0x${string}`> // Returns tx hash (generates ZK proof internally)

  // Recovery
  recoverNotes: () => Promise<PoolNote[]> // Scan chain for deposits
}

export function usePrivacyPool(): UsePrivacyPoolReturn {
  // Implementation uses:
  // - usePoolSession() for AES encryption key
  // - localStorage for encrypted notes (no private keys!)
  // - snarkjs for ZK proof generation
  // - wagmi for chain interactions
}
```

#### Hook: usePoolSession

```typescript
// apps/web/hooks/use-pool-session.ts

const SESSION_MESSAGE = `Galeon Privacy Pool v1

Sign to access your pool notes.
This does NOT authorize any transactions.

Chain: Mantle (5000)`

interface UsePoolSessionReturn {
  sessionKey: CryptoKey | null
  isUnlocked: boolean

  unlock: () => Promise<void>
  lock: () => void
}

export function usePoolSession(): UsePoolSessionReturn {
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

Users can generate cryptographically-signed reports proving ownership and usage of Privacy Pool deposits. This enables:

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
│  │  1. Select Pool deposits to disclose                     │  │
│  │  2. Select date range                                    │  │
│  │  3. Generate proof of ownership (note disclosure)        │  │
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

  // Disclosed pool deposits
  poolDeposits: Array<{
    noteId: string
    commitment: `0x${string}`

    // Deposit info
    deposit: {
      txHash: `0x${string}`
      fromPort: `0x${string}` // Source Port stealth address
      amount: string
      timestamp: number
    }

    // Withdrawal info (if spent)
    withdrawal?: {
      txHash: `0x${string}`
      to: `0x${string}` // Recipient address
      amount: string
      timestamp: number
    }
  }>

  // Summary
  summary: {
    totalDeposits: number
    totalDeposited: string
    totalWithdrawn: string
    totalWithdrawals: number
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
│   │   ├── NoteSelector.tsx       # Select pool notes to disclose
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
    noteIds: string[] // Pool notes to disclose
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

## Implementation Timeline

### Week 1: Privacy Pool Core (Dec 29 - Jan 4)

| Day        | Task                        | Files                                            |
| ---------- | --------------------------- | ------------------------------------------------ |
| **Dec 29** | Pool contracts (0xbow fork) | `packages/contracts/privacy-pool/`               |
| **Dec 30** | Session management          | `use-pool-session.ts`                            |
| **Dec 31** | Deposit from Port           | `use-privacy-pool.ts` (deposit)                  |
| **Jan 1**  | Encrypted note storage      | AES-GCM persistence                              |
| **Jan 2**  | ZK proof + withdraw         | `use-privacy-pool.ts` (withdraw with snarkjs)    |
| **Jan 3**  | UI components               | `PoolDashboard`, `DepositModal`, `WithdrawModal` |
| **Jan 4**  | E2E testing + recovery      | deposit → withdraw → recover notes               |

### Week 2: Shipwreck (Jan 5 - Jan 11)

| Day        | Task                       | Files                                                  |
| ---------- | -------------------------- | ------------------------------------------------------ |
| **Jan 5**  | Shipwreck report structure | `use-shipwreck.ts` (generate)                          |
| **Jan 6**  | Attestation + signing      | Cryptographic proof of ownership                       |
| **Jan 7**  | Shipwreck UI + JSON export | `ShipwreckWizard`, `ReportPreview`, `ReportExport.tsx` |
| **Jan 8**  | Integration testing        | Full pool → withdraw → shipwreck flow                  |
| **Jan 9**  | Bug fixes, error handling  |                                                        |
| **Jan 10** | UX polish, loading states  |                                                        |
| **Jan 11** | Buffer                     |                                                        |

### Week 3: Polish + Submission (Jan 12 - Jan 15)

| Day        | Task                      |
| ---------- | ------------------------- |
| **Jan 12** | Bug fixes, error handling |
| **Jan 13** | UX polish, loading states |
| **Jan 14** | Demo video, screenshots   |
| **Jan 15** | Submission                |

---

## ~~Backend Implementation Details (Scheduled Payments)~~ - DEPRECATED

> ⚠️ **DEPRECATED:** This section describes the old "fog wallet" scheduled payments backend implementation.
> The Privacy Pool architecture uses client-side ZK proofs instead - no backend execution needed.
> See the Privacy Pool section above for the current implementation.

<details>
<summary>Archived backend fog implementation (click to expand)</summary>

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

## Testing Checklist

### Privacy Pool (Client-Side)

- [ ] Deposit from Port creates commitment in Merkle tree
- [ ] Note encrypted in localStorage with session key (AES-GCM)
- [ ] Per-note IV prevents ciphertext comparison
- [ ] ZK proof generation works in browser
- [ ] Withdraw sends funds directly to recipient
- [ ] Double-spend (same nullifier) fails on-chain
- [ ] Recovery scan finds unspent deposits
- [ ] Session lock clears key from memory
- [ ] Mainnet (5000) only - no testnet

### Shipwreck

- [ ] Select pool notes for report
- [ ] Link deposits to withdrawals
- [ ] Sign attestation
- [ ] Export JSON (with proper formatting)
- [ ] Verify report (independent verification)
- [ ] Verify signature matches report hash

---

## Success Metrics for Hackathon

| Feature       | Demo-Ready Criteria                                 |
| ------------- | --------------------------------------------------- |
| Privacy Pool  | User can deposit to pool, withdraw with ZK proof    |
| Note Recovery | User can recover notes after clearing localStorage  |
| Shipwreck     | Generate and verify a compliance report (JSON)      |
| UX            | Clear flow, no confusing errors                     |
| Security      | Encryption works, no keys stored, signatures verify |

---

## Risk Mitigation

| Risk                 | Mitigation                                        |
| -------------------- | ------------------------------------------------- |
| localStorage cleared | Recovery flow scans chain for Pool deposit events |
| Session key lost     | User re-signs to derive new key, same result      |
| RPC provider down    | Fallback to public Mantle RPC                     |
| Note lost            | Backup/export notes to file, scan chain events    |

---

## Future Enhancements (Post-Hackathon)

### Near-term (P1)

1. **PDF export for Shipwreck** - Professional compliance reports
2. **ENS/DNS Integration** - Human-readable payment addresses
   - `fkey.eth`-style subdomain system (like Fluidkey)
   - `alice.galeon.eth` → resolves to Port stealth meta-address
   - EIP-3668 (CCIP-Read) for off-chain resolution
   - Lower barrier to entry for non-crypto users
3. **Gas Sponsorship (ERC-4337 Paymaster)** - Zero-friction onboarding
   - Sponsor first N transactions for new users
   - Paymaster pays gas, deducts from payment amount
   - Eliminates "need MNT for gas" friction
   - Critical for mainstream adoption

### Medium-term (P2)

4. **Multiple ASP Support** - Decentralized compliance
   - Allow users to choose between multiple Association Set Providers
   - Different ASPs may have different compliance standards
   - User selects ASP based on jurisdiction/requirements
   - Prevents single point of censorship
   - ASP marketplace with reputation scoring
5. **Multi-chain Privacy Pool** - Bridge funds through different L2s
6. **Hardware wallet support** - Ledger/Trezor for signing
7. **Payment requests** - Invoicing and recurring payments

### Long-term (P3)

8. **Institutional features** - Multi-sig pool management, approval workflows
9. **Privacy metrics** - Show anonymity set size, timing recommendations
10. **Pool auto-rotation** - Automatic re-deposits for long-term privacy
11. **Cross-chain stealth addresses** - Same meta-address works across chains

> **Note:** ERC-20 token support is already implemented at the contract level (`GaleonRegistry.payToken()`) with USDT, USDC, and USDe configured. The UI integration for token payments is a future enhancement.
