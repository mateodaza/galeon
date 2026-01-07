# Sequential Pool Deposit Implementation Plan

## Problem Statement

Each payment to a Port generates a **unique stealth address** (EIP-5564 privacy feature). To deposit multiple payments to the privacy pool, each stealth address must submit a separate transaction because:

1. Each stealth address has its own private key
2. The ZK proof must be signed by the stealth address owner
3. After the first deposit, subsequent deposits must "merge" into the existing commitment

**Current UX**: User must click "Deposit to Pool" multiple times, one per payment.
**Target UX**: User clicks once, all eligible payments are deposited sequentially.

---

## What's Already Implemented

| Feature                                        | Status | Location                                            |
| ---------------------------------------------- | ------ | --------------------------------------------------- |
| Nullifier API merge-aware                      | Done   | `apps/api/app/controllers/nullifiers_controller.ts` |
| API returns `spentBy: 'withdrawal' \| 'merge'` | Done   | `apps/api/app/services/ponder_service.ts`           |
| Web client consumes merge data                 | Done   | `apps/web/lib/api.ts`                               |
| Active commitment tracing (merge chain)        | Done   | `apps/web/hooks/use-collection.ts:727-870`          |
| On-chain nullifier pre-check                   | Done   | `apps/web/hooks/use-collection.ts:1332-1363`        |
| Viem gas estimation (no hardcoded limits)      | Done   | `apps/web/hooks/use-collection.ts:1448-1456`        |
| Per-payment max in UI                          | Done   | `apps/web/app/collect/[id]/page.tsx:89-98`          |

---

## Implementation Plan

### Phase 1: Preflight All Addresses (Fail Fast)

**Goal**: Before starting any transactions, validate ALL eligible payments and surface all issues upfront.

**Location**: `apps/web/hooks/use-collection.ts` - new function `preflightPoolDeposits()`

**Checks per stealth address**:

```typescript
interface PreflightResult {
  address: string
  eligible: boolean
  issues: string[] // Empty if eligible
  verifiedBalance: bigint
  onChainBalance: bigint
  canDeposit: boolean
  hasEnoughGas: boolean // onChainBalance > estimated gas cost
}
```

**Logic**:

1. For each eligible payment, fetch in parallel:
   - `registry.verifiedBalance(address)`
   - `registry.canDeposit(address)`
   - `publicClient.getBalance(address)`
2. Check:
   - `canDeposit === true`
   - `verifiedBalance > 0`
   - `onChainBalance > MIN_GAS_RESERVE` (e.g., 0.001 MNT)
3. Return array of results, UI shows any issues before user confirms

**UI Change**: Show preflight summary before "Deposit All" button is enabled:

```
Ready to deposit:
  - 0xabc...def: 0.19 MNT ✓
  - 0x123...456: 0.20 MNT ✓

Issues (will be skipped):
  - 0x789...xyz: Already deposited (verifiedBalance = 0)
```

---

### Phase 2: Sequential Processing Loop

**Goal**: Process all eligible payments in one user action.

**Location**: `apps/web/hooks/use-collection.ts` - modify `collectToPool()`

**Current flow** (single payment):

```
eligiblePayments.sort(...)
payment = eligiblePayments[0]
// ... process single payment
```

**New flow** (all payments):

```typescript
// Sort: largest first (maximizes first deposit, then merges)
eligiblePayments.sort((a, b) => (b.verifiedBalance > a.verifiedBalance ? 1 : -1))

const results: { address: string; hash: string; success: boolean; error?: string }[] = []

for (let i = 0; i < eligiblePayments.length; i++) {
  const payment = eligiblePayments[i]

  // Update progress UI
  setDepositProgress({
    current: i + 1,
    total: eligiblePayments.length,
    address: payment.stealthAddress,
  })

  try {
    // Refresh pool state before each deposit (except first)
    // This ensures we have the latest commitment to merge into
    if (i > 0) {
      await forceSync()
      // Re-fetch deposits from context after sync
      // The active commitment may have changed
    }

    // Determine: first deposit OR merge
    const shouldMerge = deposits.length > 0 || i > 0

    if (shouldMerge) {
      // Trace to active commitment (existing logic)
      // Generate merge proof
      // Submit mergeDeposit tx
    } else {
      // Generate precommitment
      // Submit deposit tx
    }

    // Wait for confirmation
    await publicClient.waitForTransactionReceipt({ hash })

    results.push({ address: payment.stealthAddress, hash, success: true })

    // Remove from payments list
    setPayments((prev) => prev.filter((p) => p.stealthAddress !== payment.stealthAddress))
  } catch (error) {
    results.push({
      address: payment.stealthAddress,
      hash: '',
      success: false,
      error: extractErrorMessage(error),
    })

    // STOP on first failure - don't continue with remaining payments
    // User can retry after fixing the issue
    break
  }
}

// Show final results
setDepositResults(results)
```

**Key decisions**:

- **Stop on first failure**: Prevents wasted gas on likely-to-fail subsequent txs
- **forceSync between deposits**: Ensures merge uses correct commitment
- **Sort largest first**: First deposit creates commitment, subsequent merge into it

---

### Phase 3: Progress UI

**Goal**: Clear feedback during multi-tx flow.

**Location**: `apps/web/app/collect/[id]/page.tsx`

**New state**:

```typescript
interface DepositProgress {
  current: number // 1-indexed
  total: number
  address: string // Currently processing
  status: 'pending' | 'confirming' | 'syncing'
}

interface DepositResult {
  address: string
  hash: string
  success: boolean
  error?: string
}

const [depositProgress, setDepositProgress] = useState<DepositProgress | null>(null)
const [depositResults, setDepositResults] = useState<DepositResult[]>([])
```

**UI during deposit**:

```
Depositing to Privacy Pool

[=====>          ] 2 of 5

Currently processing:
0xabc...def (0.19 MNT)

Status: Waiting for confirmation...

Completed:
  ✓ 0x111...222 - 0.20 MNT
```

**UI after completion**:

```
Deposit Complete!

Successfully deposited:
  ✓ 0x111...222 - tx: 0xaaa...
  ✓ 0xabc...def - tx: 0xbbb...

Failed (can retry):
  ✗ 0x333...444 - Insufficient gas

Total deposited: 0.39 MNT
```

---

### Phase 4: Partial Success Handling

**Goal**: Clean recovery from mid-sequence failures.

**Scenarios**:

1. **All succeed**: Show success screen with all tx hashes
2. **First fails**: Show error, no state change needed
3. **N succeed, then fail**:
   - Show partial success: "2 of 3 deposited successfully"
   - List successful txs with hashes
   - Show failed address with error
   - "Retry remaining" button (optional, can just refresh)

**State after partial failure**:

- `payments` list already updated (successful ones removed)
- `deposits` context refreshed via `forceSync()`
- User can click "Deposit to Pool" again to retry remaining

---

## Files to Modify

| File                                 | Changes                                                      |
| ------------------------------------ | ------------------------------------------------------------ |
| `apps/web/hooks/use-collection.ts`   | Add `preflightPoolDeposits()`, modify `collectToPool()` loop |
| `apps/web/app/collect/[id]/page.tsx` | Add progress UI, results display, preflight summary          |
| `apps/web/contexts/pool-context.tsx` | Possibly expose `refreshDeposits()` for mid-sequence refresh |

---

## Edge Cases

### 1. Indexer lag after tx confirmation

**Problem**: `forceSync()` after tx may not see the new commitment yet.
**Solution**: Add retry with exponential backoff (max 3 attempts, 2s/4s/8s delays).

### 2. ASP root changes mid-sequence

**Problem**: Between tx 1 and tx 2, ASP rebuilds and root changes.
**Solution**: Already handled - we fetch fresh roots before each merge proof.

### 3. User closes browser mid-sequence

**Problem**: 2 of 5 deposited, user closes tab.
**Solution**: On next visit, `forceSync()` recovers all deposits. No special handling needed.

### 4. Same nullifier race condition

**Problem**: Two browser tabs try to merge same commitment.
**Solution**: On-chain nullifier check (already implemented) catches this.

### 5. Very small payments (dust)

**Problem**: 0.001 MNT payment costs more in gas than it's worth.
**Solution**: Already filtered by `MINIMUM_COLLECTABLE_BALANCE`. Could add UI toggle "Skip payments under X MNT".

---

## Out of Scope (Future)

- **Relayer/AA**: Hide multiple wallet approvals behind single signature
- **Fan-in circuit**: Batch multiple stealth addresses in one ZK proof (requires circuit changes)
- **Per-port payment cap warning**: Nice-to-have UX guidance
- **Automatic retry on transient failures**: Keep it simple, let user retry

---

## Testing Plan

1. **Single payment**: Verify existing behavior unchanged
2. **Two payments, both succeed**: First deposits, second merges
3. **Three payments, second fails**: Verify first committed, third not attempted, UI shows partial success
4. **Preflight catches issues**: Create payment with `canDeposit=false`, verify it's flagged before deposit starts
5. **Indexer lag simulation**: Add artificial delay in `forceSync()`, verify retry logic works

---

## Implementation Order

1. **Phase 2** (Sequential loop) - Core functionality, unblocks main UX issue
2. **Phase 3** (Progress UI) - Essential feedback for multi-tx flow
3. **Phase 4** (Partial success) - Clean error states
4. **Phase 1** (Preflight) - Nice-to-have, reduces wasted gas

Rationale: Get the core loop working first, then polish the UX. Preflight is valuable but not blocking.
