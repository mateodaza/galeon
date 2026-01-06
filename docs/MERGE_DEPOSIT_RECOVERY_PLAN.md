# Merge Deposit Recovery Plan

> Updated: 2026-01-04

## Problem Statement

After a merge deposit, the recovery logic fails to find the user's balance because:

1. **Current recovery flow**:
   - Fetches `Deposited` events from indexer
   - Matches `precommitmentHash` to user's derived secrets (`createDepositSecrets`)
   - Filters out spent deposits via `filterUnspentDeposits` (checks nullifier spent)

2. **What happens after merge**:
   - Original deposit nullifier is **spent** (via merge, not withdrawal)
   - New merged commitment uses **different secrets** (`createWithdrawalSecrets`)
   - No `Deposited` event for merged commitment - it's a `MergeDeposited` event
   - Recovery only looks at `Deposited` events → **misses merged commitment entirely**

3. **Critical Bug Found**:
   - `nullifierApi.isSpent()` only checks `poolWithdrawals.spentNullifier`
   - Merge deposits also spend nullifiers via `poolMergeDeposits.existingNullifierHash`
   - **Fix required**: Check BOTH tables when determining if nullifier is spent

## Key Insight: Label Persistence

The **label** is the key to tracking merge chains:

```
Original Deposit (label=X, childIndex=0)
    ↓ merge deposit (spends nullifier_0)
Merged Commitment (label=X, childIndex=1, value=V0+merge1)
    ↓ merge deposit (spends nullifier_1)
Merged Commitment (label=X, childIndex=2, value=V0+merge1+merge2)
    ↓ ...
```

**Secrets derivation**:

- Original: `createDepositSecrets(masterNullifier, masterSecret, scope, depositIndex)` → precommitment
- Merged: `createWithdrawalSecrets(masterNullifier, masterSecret, label, childIndex)` → new secrets

The **label is assigned on first deposit** and **preserved through all merges**.

## Implementation Plan

### Step 1: Fix Nullifier Check (Critical Bug)

**File**: `apps/indexer/src/api/index.ts`

The current nullifier endpoint only checks withdrawals:

```typescript
// CURRENT (BUG):
const result = await db
  .select()
  .from(schema.poolWithdrawals)
  .where(eq(schema.poolWithdrawals.spentNullifier, nullifier))
```

**Fix**: Check BOTH withdrawals AND merge deposits:

```typescript
// GET /nullifiers/:hex - Check if nullifier has been spent (via withdrawal OR merge)
app.get('/nullifiers/:hex', async (c) => {
  const nullifier = c.req.param('hex').toLowerCase() as `0x${string}`

  // Check withdrawals
  const withdrawal = await db
    .select()
    .from(schema.poolWithdrawals)
    .where(eq(schema.poolWithdrawals.spentNullifier, nullifier))
    .limit(1)

  if (withdrawal.length > 0) {
    return c.json({
      spent: true,
      spentVia: 'withdrawal',
      withdrawal: serializeBigInts(withdrawal[0]),
    })
  }

  // Check merge deposits
  const merge = await db
    .select()
    .from(schema.poolMergeDeposits)
    .where(eq(schema.poolMergeDeposits.existingNullifierHash, nullifier))
    .limit(1)

  if (merge.length > 0) {
    return c.json({
      spent: true,
      spentVia: 'merge',
      merge: serializeBigInts(merge[0]),
    })
  }

  return c.json({ spent: false })
})
```

---

### Step 2: Add Merge Deposits API Endpoint

**File**: `apps/indexer/src/api/index.ts`

```typescript
// GET /pools/:address/merge-deposits - Get merge deposits for a pool
app.get('/pools/:address/merge-deposits', async (c) => {
  const address = c.req.param('address')
  const limit = parseInt(c.req.query('limit') || '100')

  const results = await db
    .select()
    .from(schema.poolMergeDeposits)
    .where(eq(schema.poolMergeDeposits.pool, address.toLowerCase() as `0x${string}`))
    .orderBy(schema.poolMergeDeposits.blockNumber)
    .orderBy(schema.poolMergeDeposits.logIndex)
    .limit(limit)

  return c.json(serializeBigInts(results))
})

// GET /merge-deposits/by-nullifier/:hex - Find merge by spent nullifier
app.get('/merge-deposits/by-nullifier/:hex', async (c) => {
  const nullifier = c.req.param('hex')

  const result = await db
    .select()
    .from(schema.poolMergeDeposits)
    .where(
      eq(schema.poolMergeDeposits.existingNullifierHash, nullifier.toLowerCase() as `0x${string}`)
    )
    .limit(1)

  if (result.length === 0) {
    return c.json({ error: 'Merge deposit not found' }, 404)
  }

  return c.json(serializeBigInts(result[0]))
})

// GET /withdrawals/by-nullifier/:hex - Find withdrawal by spent nullifier
app.get('/withdrawals/by-nullifier/:hex', async (c) => {
  const nullifier = c.req.param('hex')

  const result = await db
    .select()
    .from(schema.poolWithdrawals)
    .where(eq(schema.poolWithdrawals.spentNullifier, nullifier.toLowerCase() as `0x${string}`))
    .limit(1)

  if (result.length === 0) {
    return c.json({ error: 'Withdrawal not found' }, 404)
  }

  return c.json(serializeBigInts(result[0]))
})
```

---

### Step 3: Add API Client

**File**: `apps/web/lib/api.ts`

```typescript
// ============================================================
// Merge Deposits API (for recovery after merge)
// ============================================================

export interface MergeDepositResponse {
  id: string
  pool: string
  depositor: string
  depositValue: string
  existingNullifierHash: string
  newCommitment: string
  blockNumber: string
  blockTimestamp: string
  transactionHash: string
  logIndex: number
  chainId: number
}

export const mergeDepositsApi = {
  /**
   * Fetch merge deposits for a pool.
   */
  list: async (pool: string, limit = 100): Promise<MergeDepositResponse[]> => {
    const url = `${INDEXER_URL}/pools/${pool.toLowerCase()}/merge-deposits?limit=${limit}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Merge deposits API error: ${response.statusText}`)
    }
    return response.json()
  },

  /**
   * Find merge deposit by spent nullifier hash.
   * Returns MergeEvent format for traceMergeChain.
   */
  byNullifier: async (nullifierHash: string): Promise<MergeEvent | null> => {
    const url = `${INDEXER_URL}/merge-deposits/by-nullifier/${nullifierHash.toLowerCase()}`
    const response = await fetch(url)
    if (response.status === 404) return null
    if (!response.ok) {
      throw new Error(`Merge deposits API error: ${response.statusText}`)
    }
    const data: MergeDepositResponse = await response.json()
    return {
      existingNullifierHash: data.existingNullifierHash,
      depositValue: BigInt(data.depositValue),
      newCommitment: data.newCommitment,
    }
  },
}

// Update nullifierApi to return spentVia
export interface NullifierCheckResponse {
  spent: boolean
  spentVia?: 'withdrawal' | 'merge'
  withdrawal?: PoolWithdrawalResponse
  merge?: MergeDepositResponse
}

// Update nullifierApi.isSpent to use new response format
export const nullifierApi = {
  /**
   * Check if nullifier is spent (via withdrawal OR merge).
   * Returns spentVia to distinguish between the two.
   */
  check: async (nullifierHash: string): Promise<NullifierCheckResponse> => {
    const url = `${INDEXER_URL}/nullifiers/${nullifierHash.toLowerCase()}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Nullifier API error: ${response.statusText}`)
    }
    return response.json()
  },

  /**
   * Simple spent check (for backwards compatibility).
   */
  isSpent: async (nullifierHash: string): Promise<boolean> => {
    const result = await nullifierApi.check(nullifierHash)
    return result.spent
  },
}

// Helper to get withdrawal by nullifier (for traceMergeChain)
export const withdrawalsApi = {
  /**
   * Find withdrawal by spent nullifier hash.
   * Returns WithdrawalEvent format for traceMergeChain.
   *
   * NOTE: Schema field mapping:
   * - schema.value → withdrawnValue (the amount withdrawn)
   * - schema.newCommitment → newCommitment (0 if full withdrawal)
   */
  byNullifier: async (nullifierHash: string): Promise<WithdrawalEvent | null> => {
    const url = `${INDEXER_URL}/withdrawals/by-nullifier/${nullifierHash.toLowerCase()}`
    const response = await fetch(url)
    if (response.status === 404) return null
    if (!response.ok) {
      throw new Error(`Withdrawals API error: ${response.statusText}`)
    }
    const data: PoolWithdrawalResponse = await response.json()
    return {
      spentNullifier: data.spentNullifier,
      withdrawnValue: BigInt(data.value), // schema uses 'value', not 'withdrawnValue'
      newCommitment: data.newCommitment,
    }
  },
}

interface MergeEvent {
  existingNullifierHash: string
  depositValue: bigint
  newCommitment: string
}

interface WithdrawalEvent {
  spentNullifier: string
  withdrawnValue: bigint
  newCommitment: string
}
```

---

### Step 4: Add Recovery Function to Pool Package

**File**: `packages/pool/src/recovery.ts`

```typescript
import { createWithdrawalSecrets, computeCommitmentHash } from './commitments.js'
import { poseidonHash } from './crypto.js'
import type { RecoveredDeposit } from './types.js'

/** Maximum childIndex to try when tracing merge chain */
const MAX_CHILD_INDEX = 50

/**
 * Represents a merge event in the chain.
 */
export interface MergeEvent {
  existingNullifierHash: string
  depositValue: bigint
  newCommitment: string
}

/**
 * Represents a withdrawal event (for value tracking).
 */
export interface WithdrawalEvent {
  spentNullifier: string
  withdrawnValue: bigint
  newCommitment: string // 0 if full withdrawal
}

/**
 * Trace commitment chain for a label to find the active commitment.
 *
 * IMPORTANT: Both merges AND partial withdrawals continue the chain!
 * - Merge: spends old nullifier, creates new commitment with value += depositValue
 * - Partial withdrawal: spends old nullifier, creates new commitment with value -= withdrawnValue
 * - Full withdrawal: spends old nullifier, no new commitment (chain ends)
 *
 * Algorithm:
 * 1. Start with original deposit (childIndex = 0)
 * 2. For each childIndex, derive secrets and compute nullifier hash
 * 3. Check if that nullifier was spent (via merge or withdrawal)
 * 4. If spent via merge: value += depositValue, try next childIndex
 * 5. If spent via withdrawal:
 *    - If newCommitment == 0 (full withdrawal): chain ends, return null
 *    - If newCommitment != 0 (partial): value -= withdrawnValue, try next childIndex
 * 6. If unspent: this is the active commitment
 *
 * @param masterNullifier - Master nullifier key
 * @param masterSecret - Master secret key
 * @param label - The label to trace
 * @param originalValue - Value of the original deposit
 * @param checkNullifier - Function to check if nullifier is spent (returns spentVia + details)
 * @param getMergeByNullifier - Function to get merge event by nullifier
 * @param getWithdrawalByNullifier - Function to get withdrawal event by nullifier
 * @returns Active commitment with current value, or null if fully spent
 */
export async function traceMergeChain(
  masterNullifier: bigint,
  masterSecret: bigint,
  label: bigint,
  originalValue: bigint,
  checkNullifier: (hash: string) => Promise<{ spent: boolean; spentVia?: 'withdrawal' | 'merge' }>,
  getMergeByNullifier: (hash: string) => Promise<MergeEvent | null>,
  getWithdrawalByNullifier: (hash: string) => Promise<WithdrawalEvent | null>
): Promise<RecoveredDeposit | null> {
  let currentValue = originalValue

  for (let childIndex = 0n; childIndex < BigInt(MAX_CHILD_INDEX); childIndex++) {
    // Derive secrets for this childIndex
    const secrets = await createWithdrawalSecrets(masterNullifier, masterSecret, label, childIndex)

    // Compute nullifier hash (what gets stored on-chain)
    const nullifierHash = await poseidonHash([secrets.nullifier])
    const nullifierHex = `0x${nullifierHash.toString(16).padStart(64, '0')}`

    // Check if this nullifier was spent
    const result = await checkNullifier(nullifierHex)

    if (!result.spent) {
      // Found the active commitment!
      const precommitment = await poseidonHash([secrets.nullifier, secrets.secret])

      return {
        index: childIndex,
        nullifier: secrets.nullifier,
        secret: secrets.secret,
        precommitmentHash: precommitment,
        value: currentValue,
        label,
        blockNumber: 0n, // Not tracked for chain commitments
        txHash: '0x' as `0x${string}`,
      }
    }

    if (result.spentVia === 'merge') {
      // Spent via merge - accumulate value and continue
      const merge = await getMergeByNullifier(nullifierHex)
      if (merge) {
        currentValue += merge.depositValue
      }
      continue
    }

    // Spent via withdrawal
    const withdrawal = await getWithdrawalByNullifier(nullifierHex)
    if (!withdrawal) {
      console.warn(`[traceMergeChain] Withdrawal not found for nullifier ${nullifierHex}`)
      return null
    }

    // Check if full or partial withdrawal
    if (withdrawal.newCommitment === '0x' + '0'.repeat(64) || withdrawal.newCommitment === '0x0') {
      // Full withdrawal - chain ends, nothing left
      return null
    }

    // Partial withdrawal - subtract value and continue chain
    currentValue -= withdrawal.withdrawnValue
    if (currentValue <= 0n) {
      // Edge case: somehow withdrew everything
      return null
    }
  }

  // Exceeded max iterations - shouldn't happen in practice
  console.warn(`[traceMergeChain] Exceeded max childIndex for label ${label}`)
  return null
}
```

---

### Step 5: Update Pool Context Recovery

**File**: `apps/web/contexts/pool-context.tsx`

```typescript
// In the auto-recovery effect, BEFORE filterUnspentDeposits:

// Step 1: Recover original deposits (existing logic)
const recovered = await recoverPoolDeposits(masterNullifier, masterSecret, poolScope, depositEvents)

// Step 2: Separate into unspent and spent
const unspent: PoolDeposit[] = []
const spentViaWithdrawal: PoolDeposit[] = []
const spentViaMerge: PoolDeposit[] = []

for (const deposit of recovered) {
  const nullifierHash = await poseidonHash([deposit.nullifier])
  const nullifierHex = `0x${nullifierHash.toString(16).padStart(64, '0')}`

  const result = await nullifierApi.check(nullifierHex) // Updated to return spentVia

  if (!result.spent) {
    unspent.push(deposit)
  } else if (result.spentVia === 'merge') {
    spentViaMerge.push(deposit)
  } else {
    spentViaWithdrawal.push(deposit)
  }
}

// Step 3: For deposits with spent nullifiers, trace the chain to find active commitment
// IMPORTANT: Both merges AND partial withdrawals continue the chain!
const chainRecovered: PoolDeposit[] = []
const processedLabels = new Set<string>() // Avoid duplicate processing

for (const deposit of [...spentViaMerge, ...spentViaWithdrawal]) {
  const labelKey = deposit.label.toString()
  if (processedLabels.has(labelKey)) continue
  processedLabels.add(labelKey)

  const active = await traceMergeChain(
    masterNullifier,
    masterSecret,
    deposit.label,
    deposit.value,
    nullifierApi.check,
    mergeDepositsApi.byNullifier,
    withdrawalsApi.byNullifier // NEW: handle partial withdrawals
  )

  if (active) {
    chainRecovered.push(active)
  }
}

// Step 4: Combine results
const allDeposits = [...unspent, ...chainRecovered]
setDeposits(allDeposits)
```

---

## Value Tracking Flow

### Example 1: Merge Chain

```
Original Deposit:
  label = X (assigned by pool)
  value = 1.0 MNT
  nullifier_0 = createWithdrawalSecrets(..., label, 0).nullifier

User does mergeDeposit(2.0 MNT):
  → spends nullifier_0 (existingNullifierHash = hash(nullifier_0))
  → creates new commitment with:
      value = 1.0 + 2.0 = 3.0 MNT
      label = X (preserved)
      nullifier_1 = createWithdrawalSecrets(..., label, 1).nullifier

Recovery:
  1. Find original deposit (label=X, value=1.0)
  2. Check nullifier_0 → spent via merge
  3. Get merge event → depositValue = 2.0, currentValue = 1.0 + 2.0 = 3.0
  4. Try childIndex=1, check nullifier_1 → unspent!
  5. Return: { label=X, value=3.0, nullifier=nullifier_1, ... }
```

### Example 2: Partial Withdrawal Chain

```
Original Deposit:
  label = Y
  value = 5.0 MNT
  nullifier_0 = createWithdrawalSecrets(..., label, 0).nullifier

User withdraws 2.0 MNT (partial):
  → spends nullifier_0
  → creates change commitment with:
      value = 5.0 - 2.0 = 3.0 MNT
      label = Y (preserved)
      nullifier_1 = createWithdrawalSecrets(..., label, 1).nullifier

Recovery:
  1. Find original deposit (label=Y, value=5.0)
  2. Check nullifier_0 → spent via withdrawal
  3. Get withdrawal event → withdrawnValue = 2.0, newCommitment != 0
  4. currentValue = 5.0 - 2.0 = 3.0
  5. Try childIndex=1, check nullifier_1 → unspent!
  6. Return: { label=Y, value=3.0, nullifier=nullifier_1, ... }
```

### Example 3: Mixed Chain (Merge + Partial Withdraw)

```
Original: value=1.0, childIndex=0
  ↓ merge (add 2.0)
childIndex=1: value=3.0
  ↓ partial withdraw (take 1.0)
childIndex=2: value=2.0
  ↓ merge (add 1.5)
childIndex=3: value=3.5 ← ACTIVE (unspent nullifier)

Recovery traces: 1.0 +2.0 -1.0 +1.5 = 3.5
```

---

## Files to Modify

| #   | File                                 | Change                                                                                         |
| --- | ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| 1   | `apps/indexer/src/api/index.ts`      | Fix nullifier check to include merges, add merge deposits + withdrawals by-nullifier endpoints |
| 2   | `apps/web/lib/api.ts`                | Add `mergeDepositsApi`, `withdrawalsApi`, update `nullifierApi` with `check()` method          |
| 3   | `packages/pool/src/recovery.ts`      | Add `traceMergeChain` function with merge + withdrawal support                                 |
| 4   | `packages/pool/src/index.ts`         | Export `traceMergeChain` and types                                                             |
| 5   | `apps/web/contexts/pool-context.tsx` | Replace `filterUnspentDeposits` with chain tracing logic                                       |

---

## Testing Checklist

### Merge Chain Recovery

- [ ] Create original deposit (1 MNT)
- [ ] Verify balance shows 1 MNT
- [ ] Merge deposit (2 MNT)
- [ ] Verify balance shows 3 MNT
- [ ] Clear localStorage
- [ ] Reload page, verify balance still shows 3 MNT

### Partial Withdrawal Recovery

- [ ] Start with 3 MNT balance (from above)
- [ ] Withdraw 1 MNT (partial)
- [ ] Verify balance shows 2 MNT
- [ ] Clear localStorage
- [ ] Reload page, verify balance still shows 2 MNT

### Mixed Chain Recovery

- [ ] Merge deposit 0.5 MNT (balance now 2.5 MNT)
- [ ] Withdraw 0.5 MNT (balance now 2.0 MNT)
- [ ] Merge deposit 1.0 MNT (balance now 3.0 MNT)
- [ ] Clear localStorage
- [ ] Reload page, verify balance shows 3 MNT

### Multiple Labels

- [ ] Create second deposit (new label, 1 MNT)
- [ ] Merge first label
- [ ] Withdraw from second label (partial)
- [ ] Clear localStorage
- [ ] Reload, verify BOTH balances correct
