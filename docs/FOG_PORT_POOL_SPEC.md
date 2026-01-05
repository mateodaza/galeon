# Galeon Privacy Pool v2: Account Model Architecture

**Status:** Draft Specification (Revised after audit)
**Author:** Claude (AI) + Mateo
**Date:** 2026-01-04
**Version:** 0.2.0

---

## Executive Summary

This specification describes a scalable privacy pool architecture using an "Account Model" that enables:

- **O(1) withdrawals** regardless of deposit history
- **Unlimited deposits** with constant-time access to funds
- **Full compliance** via Registry gating + ASP integration
- **Ragequit support** for emergency fund recovery
- **Preserved provenance** - verifiedBalance consumed at each deposit

The key innovation is merge-on-deposit: each new deposit merges into the user's existing commitment rather than creating a new one, while preserving the original label for ragequit eligibility.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Architecture Overview](#2-architecture-overview)
3. [Account Model Concept](#3-account-model-concept)
4. [Circuit Specifications](#4-circuit-specifications)
5. [Contract Changes](#5-contract-changes)
6. [Frontend Flow](#6-frontend-flow)
7. [Security Analysis](#7-security-analysis)
8. [Compliance & Registry Gating](#8-compliance--registry-gating)
9. [Ragequit Mechanism](#9-ragequit-mechanism)
10. [Recovery & Key Rotation](#10-recovery--key-rotation)
11. [Concurrency Handling](#11-concurrency-handling)
12. [Migration Path](#12-migration-path)
13. [Open Questions](#13-open-questions)

---

## 1. Problem Statement

### Current Design Limitations

| Issue                                     | Impact                        |
| ----------------------------------------- | ----------------------------- |
| Each deposit creates a new commitment     | Accumulation problem          |
| N deposits = N commitments                | O(N) withdrawal time          |
| 1M deposits = hours of proof generation   | Unacceptable for business use |
| Multi-input circuits limited to 64 inputs | Still requires consolidation  |

### Requirements

1. **Scalability:** 1M+ deposits with constant withdrawal time
2. **Privacy:** No linkability between deposits and withdrawals
3. **Compliance:** Registry gating (verifiedBalance) + ASP enforcement
4. **UX:** Simple "collect to pool" action
5. **Recovery:** Ragequit for emergency withdrawal
6. **Provenance:** Clean funds guarantee preserved

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER WALLET                              │
│                    (Connected via WalletConnect)                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      STEALTH LAYER (EIP-5564)                    │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                          │
│  │ Port A  │  │ Port B  │  │ Port C  │  ...                     │
│  │(receive)│  │(receive)│  │(receive)│                          │
│  │         │  │         │  │         │                          │
│  │ vBal:10 │  │ vBal:5  │  │ vBal:3  │  ← verifiedBalance       │
│  └────┬────┘  └────┬────┘  └────┬────┘                          │
│       │            │            │                                │
│       └────────────┴────────────┴────────────────────┐          │
│                                                       │          │
│                    Direct deposit (merge)             │          │
└───────────────────────────────────────────────────────┼──────────┘
                                                        │
                                                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                       PRIVACY POOL                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    SINGLE COMMITMENT                         ││
│  │              (Merged from all Port deposits)                 ││
│  │                                                              ││
│  │    Value: 18 (10+5+3)    Label: L (from first deposit)      ││
│  │    Nullifier: derived    Secret: derived                    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  State Tree: [C_user, C_other_1, C_other_2, ...]                │
│  ASP Tree: [label_user, label_other_1, label_other_2, ...]      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     WITHDRAWAL (Any Amount)                      │
│                                                                  │
│    Single-input proof → Any recipient → ~30 sec always          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Account Model Concept

### Mental Model

Think of the pool commitment as an **account balance**, not a UTXO:

| UTXO Model (Current)               | Account Model (Proposed)      |
| ---------------------------------- | ----------------------------- |
| Each deposit = new commitment      | Each deposit = balance update |
| N deposits = N commitments         | N deposits = 1 commitment     |
| Withdraw requires selecting inputs | Withdraw from single balance  |
| Complex multi-input proofs         | Simple single-input proofs    |

### Key Properties

| Property                 | Value                                 |
| ------------------------ | ------------------------------------- |
| Commitments per user     | 1 (after first merge)                 |
| Label                    | Persistent (from first deposit)       |
| Depositor (for ragequit) | Original depositor address            |
| Balance                  | Sum of all deposits minus withdrawals |

### How It Works

1. **First Deposit:** Creates commitment with label L, depositor = Port A address
2. **Subsequent Deposits:** Merge into existing commitment, same label L
3. **Withdrawals:** Spend from single commitment, remainder keeps label L
4. **Ragequit:** Original depositor can always recover (label L → depositor mapping)

---

## 4. Circuit Specifications

### 4.1 Merge Deposit Circuit

**Purpose:** Add funds to existing pool balance, preserving label.

**File:** `packages/0xbow/packages/circuits/circuits/mergeDeposit.circom`

```circom
template MergeDeposit(maxTreeDepth) {
  //////////////////////// PUBLIC SIGNALS ////////////////////////
  signal input depositValue;           // New funds being added
  signal input stateRoot;              // Current state merkle root
  signal input stateTreeDepth;         // Current tree depth
  signal input ASPRoot;                // Current ASP root (for label check)
  signal input ASPTreeDepth;           // ASP tree depth
  signal input context;                // keccak256(MergeDepositData, scope)

  //////////////////////// PRIVATE SIGNALS ////////////////////////
  signal input label;                  // SAME label (preserved)
  signal input existingValue;          // Current commitment value
  signal input existingNullifier;      // Current nullifier
  signal input existingSecret;         // Current secret
  signal input newNullifier;           // New nullifier (must differ)
  signal input newSecret;              // New secret
  signal input stateSiblings[maxTreeDepth];
  signal input stateIndex;
  signal input ASPSiblings[maxTreeDepth];
  signal input ASPIndex;

  //////////////////////// OUTPUT SIGNALS ////////////////////////
  signal output newCommitmentHash;     // Commitment with value + depositValue
  signal output existingNullifierHash; // To mark old commitment spent

  //////////////////////// CONSTRAINTS ////////////////////////
  // 1. Verify existing commitment is in state tree
  // 2. Verify label is in ASP tree (user not banned)
  // 3. Compute mergedValue = existingValue + depositValue
  // 4. Range check: no overflow, depositValue > 0
  // 5. Ensure newNullifier != existingNullifier
  // 6. Compute new commitment with SAME label
  // 7. Output nullifier hash and new commitment
}
```

### 4.2 First Deposit (No Proof Required)

First deposit uses existing `deposit()` function - no merge proof needed:

```solidity
function deposit(address _depositor, uint256 _value, uint256 _precommitment)
    external payable returns (uint256 _commitment)
{
    // Create label from scope + nonce
    uint256 _label = hash(SCOPE, ++nonce);
    depositors[_label] = _depositor;  // For ragequit

    // Create commitment
    _commitment = hash(_value, _label, _precommitment);
    _insert(_commitment);
}
```

### 4.3 Withdraw Circuit (Unchanged)

The existing single-input withdraw circuit works as-is:

- User proves ownership of ONE commitment
- Withdraws any amount up to balance
- Creates new commitment for remainder (same label)

---

## 5. Contract Changes

### 5.1 GaleonPrivacyPool Additions

```solidity
// New verifier for merge deposits
IVerifier public MERGE_DEPOSIT_VERIFIER;

// New event
event MergeDeposited(
    address indexed depositor,
    uint256 indexed newCommitment,
    uint256 depositValue,
    uint256 existingNullifierHash
);

/// @notice Merge a new deposit into an existing commitment
/// @param _depositValue Amount being deposited
/// @param _proof Merge deposit proof
function mergeDeposit(
    uint256 _depositValue,
    ProofLib.MergeDepositProof calldata _proof
) external payable nonReentrant returns (uint256 _newCommitment) {
    // 1. Check deposits are enabled
    if (dead) revert PoolIsDead();

    // 2. Check deposit value is valid
    if (_depositValue == 0) revert InvalidDepositValue();
    if (_depositValue >= type(uint128).max) revert InvalidDepositValue();

    // 3. COMPLIANCE: Check caller has verifiedBalance (Registry gating)
    address registryAsset = ASSET == Constants.NATIVE_ASSET ? address(0) : ASSET;
    if (galeonRegistry.verifiedBalance(msg.sender, registryAsset) < _depositValue) {
        revert InsufficientVerifiedBalance();
    }

    // 4. COMPLIANCE: Consume verified balance
    galeonRegistry.consumeVerifiedBalance(msg.sender, registryAsset, _depositValue);

    // 5. Verify ASP root is current
    if (_proof.ASPRoot() != ENTRYPOINT.latestRoot()) revert IncorrectASPRoot();

    // 6. Verify the merge proof
    if (!MERGE_DEPOSIT_VERIFIER.verifyProof(
        _proof.pA, _proof.pB, _proof.pC, _proof.pubSignals
    )) revert InvalidProof();

    // 7. Check depositValue in proof matches
    if (_proof.depositValue() != _depositValue) revert DepositValueMismatch();

    // 8. Mark old commitment as spent
    _spend(_proof.existingNullifierHash());

    // 9. Insert new commitment
    _newCommitment = _proof.newCommitmentHash();
    _insert(_newCommitment);

    // 10. Pull funds from caller
    _pull(msg.sender, _depositValue);

    emit MergeDeposited(msg.sender, _newCommitment, _depositValue, _proof.existingNullifierHash());
}
```

### 5.2 ProofLib Additions

```solidity
struct MergeDepositProof {
    uint256[2] pA;
    uint256[2][2] pB;
    uint256[2] pC;
    uint256[8] pubSignals;
    // pubSignals layout:
    // [0] depositValue
    // [1] stateRoot
    // [2] stateTreeDepth
    // [3] ASPRoot
    // [4] ASPTreeDepth
    // [5] context
    // [6] newCommitmentHash (output)
    // [7] existingNullifierHash (output)
}

function depositValue(MergeDepositProof memory _proof) internal pure returns (uint256) {
    return _proof.pubSignals[0];
}

function newCommitmentHash(MergeDepositProof memory _proof) internal pure returns (uint256) {
    return _proof.pubSignals[6];
}

function existingNullifierHash(MergeDepositProof memory _proof) internal pure returns (uint256) {
    return _proof.pubSignals[7];
}

function ASPRoot(MergeDepositProof memory _proof) internal pure returns (uint256) {
    return _proof.pubSignals[3];
}
```

### 5.3 Verifier Upgrade

Add to `_upgradeVerifiers`:

```solidity
function _upgradeVerifiers(
    address _newWithdrawalVerifier,
    address _newRagequitVerifier,
    address _newMergeDepositVerifier  // NEW
) internal {
    // ... existing code ...
    MERGE_DEPOSIT_VERIFIER = IVerifier(_newMergeDepositVerifier);
}
```

---

## 6. Frontend Flow

### 6.1 "Collect to Pool" UX

From user's perspective:

```
[Port A: 10 MNT] [Port B: 5 MNT] [Port C: 3 MNT]
         │              │              │
         ▼              ▼              ▼
     [Collect]      [Collect]      [Collect]
         │              │              │
         └──────────────┴──────────────┘
                        │
                        ▼
              [Pool Balance: 18 MNT]
```

### 6.2 Implementation

```typescript
async function collectToPool(port: ScannedPayment) {
  // 1. Check if user has existing pool commitment
  const existingCommitment = await recoverLatestCommitment()

  // 2. Get stealth address key for this port
  const stealthKey = await deriveStealthKey(port)

  if (existingCommitment) {
    // MERGE DEPOSIT: Add to existing commitment

    // 3. Generate merge proof
    const proof = await generateMergeDepositProof({
      depositValue: port.value,
      existingCommitment,
      poolKeys,
    })

    // 4. Call mergeDeposit from port's stealth address
    const tx = await pool.connect(stealthKey).mergeDeposit(port.value, proof)
    await tx.wait()
  } else {
    // FIRST DEPOSIT: Create new commitment

    // 3. Generate precommitment
    const { precommitment, nullifier, secret } = generateCommitmentSecrets()

    // 4. Call deposit from port's stealth address
    const tx = await entrypoint.connect(stealthKey).deposit(precommitment, { value: port.value })
    await tx.wait()
  }

  // 5. Update local state
  await refreshPoolBalance()
}
```

### 6.3 Loading States

```
First deposit:
  Step 1: "Depositing to pool..." (on-chain tx)
  Step 2: "Done! Pool balance: X MNT"

Merge deposit:
  Step 1: "Generating merge proof..." (~30 seconds)
  Step 2: "Depositing to pool..." (on-chain tx)
  Step 3: "Done! Pool balance: X MNT"
```

---

## 7. Security Analysis

### 7.1 Privacy Guarantees

| Scenario          | Observer Knowledge              | Privacy       |
| ----------------- | ------------------------------- | ------------- |
| Port A deposit    | Random stealth address deposits | ✅ Unlinkable |
| Port B merge      | Different random address merges | ✅ Unlinkable |
| Pool → Withdrawal | Anonymous ZK proof              | ✅ Unlinkable |

### 7.2 Attack Vectors & Mitigations

**Attack 1: Timing Correlation**

- Risk: Observer correlates Port payment with pool deposit
- Mitigation: UI encourages batching multiple payments before depositing
- Recommendation: "Collect multiple payments, deposit together"

**Attack 2: Amount Correlation**

- Risk: 1.234 MNT payment = 1.234 MNT deposit
- Mitigation: Merge multiple payments, deposit combined amount
- Natural: The merge model encourages this behavior

**Attack 3: Label Manipulation**

- Risk: User tries to change label to escape ASP ban
- Mitigation: Circuit enforces `old.label === new.label`
- Result: Impossible - label is preserved

**Attack 4: Double-Spend via Race**

- Risk: Two merge proofs on same commitment
- Mitigation: Nullifier prevents double-spend; second tx reverts
- Frontend: Retry with fresh state on failure

**Attack 5: Dirty Fund Injection**

- Risk: Deposit funds not from Port (bypass compliance)
- Mitigation: verifiedBalance consumed at each deposit
- Result: Only Port-received funds can be deposited

### 7.3 Formal Properties

1. **Soundness:** Cannot create commitment without valid proof
2. **Balance Invariant:** newValue = oldValue + depositValue (circuit-enforced)
3. **Label Preservation:** Label never changes after first deposit
4. **Nullifier Uniqueness:** Each commitment spendable exactly once
5. **Clean Funds:** Only verifiedBalance can enter pool

---

## 8. Compliance & Registry Gating

### 8.1 Dual-Layer Compliance

| Layer    | When                | Check                     | Action          |
| -------- | ------------------- | ------------------------- | --------------- |
| Registry | Deposit time        | verifiedBalance >= amount | Consume balance |
| ASP      | Withdraw/Merge time | label in ASP tree         | Allow operation |

### 8.2 Registry Flow (Deposit Gating)

```
1. External payer → Port A (via GaleonRegistry.payNative)
2. Registry: verifiedBalance[PortA][native] += amount
3. Registry: isPortStealthAddress[PortA] = true

4. User initiates deposit/merge from Port A
5. Pool: check galeonRegistry.verifiedBalance(PortA, asset) >= amount ✓
6. Pool: galeonRegistry.consumeVerifiedBalance(PortA, asset, amount)
7. Pool: execute deposit/merge
```

### 8.3 ASP Flow (Withdrawal Gating)

```
1. ASP monitors deposits, adds labels to tree
2. User tries to withdraw
3. Circuit: verify label in ASP tree
4. If label not in tree → proof fails → user frozen

Banning flow:
1. ASP identifies bad actor
2. ASP removes label from tree
3. ASP publishes new root
4. User's next withdraw/merge fails
```

### 8.4 Compliance Properties

- **Clean Entry:** Only verified Port payments can deposit
- **Continuous Monitoring:** ASP can freeze at any withdrawal
- **Single Ban Target:** One label per user = one entity to ban
- **Provenance Preserved:** Each deposit traced to Port → payer

### 8.5 ASP Auto-Approve Service

For the system to work, an off-chain service must maintain the ASP tree and update the on-chain root.

**Architecture:**

```
┌─────────────┐     SSE/Poll      ┌─────────────┐
│   Indexer   │ ───────────────→  │ ASP Service │
│  (Ponder)   │  new deposits     │   (API)     │
└─────────────┘                   └──────┬──────┘
                                         │
                                         │ updateRoot()
                                         ▼
                                  ┌─────────────┐
                                  │ Entrypoint  │
                                  │  Contract   │
                                  └─────────────┘
```

**Implementation:** `apps/api/app/services/asp_service.ts`

```typescript
import { LeanIMT } from '@zk-kit/lean-imt'
import { poseidon2 } from 'poseidon-lite'

class ASPService {
  private tree: LeanIMT<bigint>
  private approvedLabels: Set<string> = new Set()

  async initialize() {
    // Rebuild tree from existing deposits via indexer
    const deposits = await ponderService.getAllDeposits()
    for (const d of deposits) {
      this.tree.insert(BigInt(d.label))
      this.approvedLabels.add(d.label)
    }
    await this.syncRootIfNeeded()
  }

  async onNewDeposit(label: string) {
    if (this.approvedLabels.has(label)) return

    this.tree.insert(BigInt(label))
    this.approvedLabels.add(label)
    await this.updateOnChainRoot()
  }

  private async updateOnChainRoot() {
    const root = this.tree.root
    // ASP_POSTMAN wallet calls entrypoint.updateRoot()
    const tx = await entrypoint.updateRoot(root, PLACEHOLDER_CID)
    await tx.wait()
  }

  // For proof generation - get merkle proof for a label
  getMerkleProof(label: string) {
    const index = this.tree.indexOf(BigInt(label))
    return this.tree.generateProof(index)
  }
}
```

**Key Requirements:**

| Requirement      | Implementation                                  |
| ---------------- | ----------------------------------------------- |
| ASP_POSTMAN role | Wallet with role granted by Entrypoint owner    |
| Tree persistence | Rebuild from indexer on startup (stateless)     |
| Update frequency | On each new deposit (real-time)                 |
| Proof data       | Expose `getMerkleProof()` for withdrawal proofs |

**Endpoints needed:**

- `GET /api/asp/proof/:label` - Returns merkle proof for label
- `GET /api/asp/root` - Returns current ASP root
- `POST /api/asp/sync` - Force sync with indexer (admin)

---

## 9. Ragequit Mechanism

### 9.1 Purpose

Ragequit allows original depositor to withdraw with a simpler proof (no full ZK withdrawal), sacrificing privacy for convenience. Unlike normal withdrawals, ragequit reveals the depositor's identity but still requires ASP approval to prevent banned users from escaping.

### 9.2 Implementation (ASP-Gated)

```solidity
function ragequit(RagequitProof memory _proof) external {
    uint256 _label = _proof.label();

    // Check: Is caller the original depositor?
    require(depositors[_label] == msg.sender, "Not original depositor");

    // Verify proof - INCLUDES ASP check (label must be in ASP tree)
    require(RAGEQUIT_VERIFIER.verifyProof(...), "Invalid proof");

    // Check commitment exists
    require(_isInState(_proof.commitmentHash()), "Invalid commitment");

    // Check ASP root is current
    require(_proof.ASPRoot() == ENTRYPOINT.latestRoot(), "Stale ASP root");

    // Spend and transfer
    _spend(_proof.nullifierHash());
    _push(msg.sender, _proof.value());
}
```

### 9.3 Policy Decision: Ragequit Requires ASP ✅

**DECIDED:** Ragequit checks ASP tree (Option B)

| Scenario              | Behavior                                    |
| --------------------- | ------------------------------------------- |
| User in good standing | Can ragequit (label in ASP tree)            |
| Banned user           | Cannot ragequit (label removed from tree)   |
| Wrongly banned user   | ASP unbans → can ragequit/withdraw normally |

**Rationale:**

- Bad actors cannot escape via ragequit
- Legitimate users protected: ASP can always unban
- Full compliance: one ban = complete freeze
- Ragequit still useful: reveals identity but no ZK withdrawal proof needed

### 9.4 Depositor Binding with Merges

| Event                     | depositors[label] | Can Ragequit? |
| ------------------------- | ----------------- | ------------- |
| First deposit from Port A | Port A address    | Port A ✓      |
| Merge from Port B         | Still Port A      | Port A ✓      |
| Merge from Port C         | Still Port A      | Port A ✓      |
| After 1000 merges         | Still Port A      | Port A ✓      |

**Note:** The original depositor (Port A) can always ragequit, regardless of which Ports were used for subsequent merges. This is by design - the label owner has emergency access.

---

## 10. Recovery

### 10.1 Normal Recovery

User recovers pool state from wallet signature:

```typescript
async function recoverPoolState(walletSignature: string) {
  // 1. Derive pool keys from signature
  const { masterNullifier, masterSecret } = derivePoolMasterKeys(walletSignature)

  // 2. Scan for deposit events
  const deposits = await scanDepositEvents()

  // 3. For each deposit, check if user owns it
  const userDeposits = deposits.filter((d) => canDeriveSecrets(d, masterNullifier))

  // 4. Find latest non-nullified commitment
  const nullifiers = await scanNullifierEvents()
  const activeCommitment = findActiveCommitment(userDeposits, nullifiers)

  // 5. Derive secrets
  const secrets = deriveCommitmentSecrets(masterNullifier, masterSecret, activeCommitment)

  return { activeCommitment, secrets }
}
```

### 10.2 Key Loss Fallback

If pool keys are lost but original stealth key is accessible:

- Original depositor address can call ragequit
- Reveals identity but recovers funds

---

## 11. Concurrency Handling

### 11.1 Race Condition

Two merge proofs generated against the same commitment will race:

- First tx succeeds, nullifies commitment
- Second tx reverts (nullifier already spent)

### 11.2 Frontend Handling

```typescript
async function mergeDeposit(port: ScannedPayment) {
  const MAX_RETRIES = 3

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // 1. Fetch LATEST commitment state
      const commitment = await recoverLatestCommitment()

      // 2. Fetch LATEST roots
      const stateRoot = await pool.latestStateRoot()
      const aspRoot = await entrypoint.latestRoot()

      // 3. Generate proof with fresh data
      const proof = await generateMergeDepositProof({
        commitment,
        stateRoot,
        aspRoot,
        depositValue: port.value,
      })

      // 4. Submit transaction
      const tx = await pool.mergeDeposit(port.value, proof)
      await tx.wait()

      return // Success
    } catch (error) {
      if (error.message.includes('NullifierAlreadySpent')) {
        console.log('Race condition, retrying with fresh state...')
        continue
      }
      throw error
    }
  }

  throw new Error('Failed after max retries - please try again later')
}
```

### 11.3 Backend Considerations

- Indexer must track latest commitment per user
- WebSocket/SSE for real-time nullifier updates
- Lock mechanism to prevent concurrent proof generation

---

## 12. Migration Path

### 12.1 For New Users

No migration needed - start fresh with account model.

### 12.2 For Existing Users (Multiple Commitments)

**Option A: Withdraw and Re-deposit**

1. Withdraw all from old commitments (one by one)
2. Make fresh deposit to start with single commitment
3. Future deposits merge automatically

**Option B: Multi-Input Consolidation (Future)**

1. Build multi-input withdraw circuit
2. Consolidate all commitments → single output
3. That becomes the "account"

**Option C: Parallel Support**

1. Support both old and new deposit methods
2. Old commitments withdraw normally
3. New deposits go through merge
4. Eventually old commitments depleted

**Recommendation:** Option A for simplicity, with UI guidance.

### 12.3 Contract Compatibility

| Component            | Action                      |
| -------------------- | --------------------------- |
| Existing commitments | Still valid, withdrawable   |
| Existing nullifiers  | Still valid                 |
| New verifier         | Deploy alongside existing   |
| Pool contract        | Add mergeDeposit() function |
| No state migration   | Backward compatible         |

---

## 13. Open Questions

### 13.1 Resolved

| Question                         | Resolution                                                              |
| -------------------------------- | ----------------------------------------------------------------------- |
| How to preserve verifiedBalance? | Direct Port → Pool, consume at each deposit                             |
| Does ragequit work with merges?  | Yes, label preserved, original depositor tracked                        |
| Does banning work?               | Yes, ASP removes single label                                           |
| Tree growth?                     | Acknowledged, O(1) for proofs; chain state grows log(n) per insert      |
| Ragequit ASP policy?             | ✅ Requires ASP (banned = frozen, ASP can unban)                        |
| Depositor binding?               | Label bound to first depositor forever; ragequit only from that address |

### 13.2 To Be Decided

| Question                   | Options           | Recommendation          |
| -------------------------- | ----------------- | ----------------------- |
| ~~Ragequit check ASP?~~    | ~~Yes/No~~        | ✅ Yes (decided)        |
| Multi-input consolidation? | Build/Skip        | Skip for v1             |
| Batching UI?               | Required/Optional | Optional but encouraged |

### 13.3 Implementation Priority

**Phase 1: Core Infrastructure**

1. **P0:** ASP auto-approve service (unblocks current withdrawals)
2. **P0:** MergeDeposit circuit + verifier
3. **P0:** Contract upgrade (mergeDeposit function)
4. **P0:** ProofLib additions

**Phase 2: Integration** 5. **P1:** Update prover for merge proofs 6. **P1:** Frontend merge deposit flow 7. **P1:** Indexer endpoint: latest commitment per label

**Phase 3: Hardening** 8. **P2:** Security tests (balance invariants, label binding) 9. **P2:** Gas benchmarking on Mantle 10. **P2:** Production trusted setup ceremony

---

## Appendix A: Gas Estimates

| Operation               | Current                | Account Model       |
| ----------------------- | ---------------------- | ------------------- |
| First deposit           | ~150k                  | ~150k (unchanged)   |
| Subsequent deposit      | ~150k (new commitment) | ~300k (merge proof) |
| Withdrawal              | ~250k                  | ~250k (unchanged)   |
| Total per merge deposit | N/A                    | ~300k               |

**Tradeoff:** ~150k more gas per subsequent deposit, but O(1) withdrawal regardless of history.

---

## Appendix B: ASP Root Freshness

### Update Cadence

For hackathon: ASP root updated on each new deposit (real-time via ASP service).

For production: Consider batching (e.g., every 5 minutes or every N deposits) to reduce gas costs.

### Client Retry Logic

```typescript
async function generateProofWithFreshRoot(params: ProofParams) {
  const MAX_RETRIES = 3

  for (let i = 0; i < MAX_RETRIES; i++) {
    // Always fetch latest roots
    const aspRoot = await entrypoint.latestRoot()
    const stateRoot = await pool.latestStateRoot()

    const proof = await generateProof({ ...params, aspRoot, stateRoot })

    try {
      await submitTransaction(proof)
      return
    } catch (e) {
      if (e.message.includes('IncorrectASPRoot') || e.message.includes('StaleRoot')) {
        console.log('Root changed, retrying with fresh root...')
        continue
      }
      throw e
    }
  }
  throw new Error('Failed after max retries')
}
```

### Root Staleness Window

- Proofs must use `latestRoot()` - no historical roots accepted
- If ASP updates between proof generation and submission, tx reverts
- Solution: Retry with fresh root (typically succeeds on 2nd attempt)

---

## Appendix C: Migration Detection

### Detecting Legacy Commitments

```typescript
async function detectUserCommitments(poolKeys: PoolKeys) {
  // Scan all deposit events
  const deposits = await indexer.getDeposits()

  // Find deposits belonging to this user
  const userDeposits = deposits.filter((d) => canDeriveSecrets(d.label, poolKeys))

  // Check which are still active (not nullified)
  const nullifiers = await indexer.getNullifiers()
  const activeCommitments = userDeposits.filter((d) => !nullifiers.has(computeNullifierHash(d)))

  return {
    total: activeCommitments.length,
    isLegacy: activeCommitments.length > 1,
    commitments: activeCommitments,
  }
}
```

### Migration Prompt

```typescript
if (userState.isLegacy) {
  showMigrationPrompt({
    message: `You have ${userState.total} separate commitments.
              For best UX, withdraw all and make a fresh deposit
              to consolidate into one.`,
    action: 'Start Migration',
  })
}
```

### Migration Flow

1. User has N legacy commitments
2. UI shows "Migrate to Account Model" button
3. User withdraws from each commitment (N transactions)
4. User makes single fresh deposit
5. Future deposits auto-merge into that commitment

---

## Appendix D: Tree Growth & Capacity

### Current Limits

| Parameter      | Value              | Notes                 |
| -------------- | ------------------ | --------------------- |
| Max tree depth | 32                 | Hardcoded in circuits |
| Max leaves     | 2^32 ≈ 4.3 billion | Per pool              |
| Gas per insert | ~O(log n)          | Grows with tree size  |

### Growth Rate

Each merge deposit inserts 1 new leaf (the updated commitment). The old commitment is nullified but not removed from tree.

Example growth:

- 1M users, 10 deposits each = 10M leaves
- At depth 32, this uses ~24 levels (still plenty of room)

### Rollover Strategy (Future)

If approaching capacity or gas becomes prohibitive:

1. **New Pool Deployment**
   - Deploy fresh pool with empty tree
   - Migrate balances via withdraw/redeposit

2. **Checkpoint/Archive**
   - Snapshot current tree state
   - Allow proofs against archived roots for withdrawals
   - New deposits go to fresh tree

3. **Tree Compaction (Research)**
   - Remove nullified leaves
   - Requires new circuit design

**For v1:** Not a concern. 4.3B leaves is sufficient for years of operation.

---

## Appendix E: Circuit Constraints Estimate

| Circuit      | Constraints | Proof Time |
| ------------ | ----------- | ---------- |
| MergeDeposit | ~50,000     | ~30 sec    |
| Withdraw     | ~50,000     | ~30 sec    |
| Ragequit     | ~30,000     | ~20 sec    |

All circuits similar size, predictable performance.

---

## Appendix F: Comparison to Previous "Fog Port" Design

| Aspect               | Fog Port (v0.1)  | Account Model (v0.2) |
| -------------------- | ---------------- | -------------------- |
| Intermediate address | Yes (Fog Port)   | No                   |
| verifiedBalance      | Broken           | Preserved ✓          |
| Provenance           | Lost at fog step | Direct tracing ✓     |
| Complexity           | Higher           | Lower ✓              |
| Mental model         | UTXO routing     | Account balance ✓    |

---

## Revision History

| Version | Date       | Changes                                              |
| ------- | ---------- | ---------------------------------------------------- |
| 0.1.0   | 2026-01-04 | Initial draft (Fog Port model)                       |
| 0.2.0   | 2026-01-04 | Revised after audit: Account Model, removed Fog Port |

---

**End of Specification**
