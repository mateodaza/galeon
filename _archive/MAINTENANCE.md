# Galeon Maintenance & Operations Guide

**Version:** 1.1.0
**Last Updated:** 2026-01-04

This document covers the complete operational lifecycle from initial deployment to ongoing maintenance.

---

## Table of Contents

1. [Deployment Sequence](#1-deployment-sequence)
2. [Post-Deployment Setup](#2-post-deployment-setup)
3. [ASP Service Operations](#3-asp-service-operations)
4. [User Flows](#4-user-flows)
5. [Admin Operations](#5-admin-operations)
6. [Monitoring & Alerts](#6-monitoring--alerts)
7. [Emergency Procedures](#7-emergency-procedures)
8. [Capacity Upgrade](#8-capacity-upgrade)
9. [Scaling Reality Check](#9-scaling-reality-check)
10. [Operational Pressure Points](#10-operational-pressure-points)

---

## 1. Deployment Sequence

### 1.1 Prerequisites

| Item              | Description                        |
| ----------------- | ---------------------------------- |
| Deployer wallet   | Funded with MNT for gas            |
| RPC endpoint      | Mantle Sepolia or Mainnet          |
| Circuit artifacts | Compiled `.wasm` and `.zkey` files |
| Environment vars  | See `.env.example`                 |

### 1.2 Contract Deployment Order

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: Deploy Infrastructure                                   │
├─────────────────────────────────────────────────────────────────┤
│  1.1 ERC5564Announcer (if not already deployed)                 │
│  1.2 ERC6538Registry (if not already deployed)                  │
│  1.3 GaleonRegistry (links to 1.1 and 1.2)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: Deploy Verifiers                                        │
├─────────────────────────────────────────────────────────────────┤
│  2.1 WithdrawalVerifier                                          │
│  2.2 RagequitVerifier                                            │
│  2.3 MergeDepositVerifier (v2)                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: Deploy Privacy Pool                                     │
├─────────────────────────────────────────────────────────────────┤
│  3.1 GaleonEntrypoint (proxy + implementation)                   │
│  3.2 GaleonPrivacyPoolSimple (proxy + implementation)            │
│      - Constructor args: entrypoint, verifiers, asset            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 4: Link Contracts                                          │
├─────────────────────────────────────────────────────────────────┤
│  4.1 Pool.setGaleonRegistry(registryAddress)                     │
│  4.2 Registry.setAuthorizedPool(poolAddress, true)               │
│  4.3 Entrypoint.grantRole(ASP_POSTMAN, aspServiceWallet)         │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Deployment Commands

```bash
# From packages/contracts directory
cd packages/contracts

# 1. Deploy infrastructure (if needed)
npx hardhat run scripts/deploy-infrastructure.ts --network mantleSepolia

# 2. Deploy verifiers
npx hardhat run scripts/deploy-verifiers.ts --network mantleSepolia

# 3. Deploy pool
npx hardhat run scripts/deploy-pool.ts --network mantleSepolia

# 4. Link contracts
npx hardhat run scripts/link-contracts.ts --network mantleSepolia

# Verify all contracts
npx hardhat run scripts/verify-all.ts --network mantleSepolia
```

### 1.4 Deployment Checklist

- [ ] All contracts deployed
- [ ] All contracts verified on explorer
- [ ] GaleonRegistry linked to Pool
- [ ] Pool authorized in Registry
- [ ] ASP_POSTMAN role granted
- [ ] Contract addresses saved to `deployments/<network>.json`
- [ ] Environment variables updated in all apps

---

## 2. Post-Deployment Setup

### 2.1 Backend Configuration

```bash
# apps/api/.env
GALEON_REGISTRY_ADDRESS=0x...
GALEON_POOL_ADDRESS=0x...
GALEON_ENTRYPOINT_ADDRESS=0x...
ASP_POSTMAN_PRIVATE_KEY=0x...  # KEEP SECURE
```

### 2.2 Frontend Configuration

```bash
# apps/web/.env
NEXT_PUBLIC_GALEON_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_GALEON_POOL_ADDRESS=0x...
NEXT_PUBLIC_GALEON_ENTRYPOINT_ADDRESS=0x...
```

### 2.3 Indexer Configuration

```bash
# apps/indexer/ponder.config.ts
# Update contract addresses and start blocks
```

### 2.4 Start Services

```bash
# Terminal 1: Start indexer
pnpm --filter indexer dev

# Terminal 2: Start API (includes ASP service)
pnpm --filter api dev

# Terminal 3: Start frontend
pnpm --filter web dev
```

### 2.5 Verification Steps

| Check                | Command/Action                            | Expected            |
| -------------------- | ----------------------------------------- | ------------------- |
| Registry linked      | `pool.galeonRegistry()`                   | Registry address    |
| Pool authorized      | `registry.authorizedPools(pool)`          | `true`              |
| ASP role             | `entrypoint.hasRole(ASP_POSTMAN, wallet)` | `true`              |
| Indexer synced       | Check indexer logs                        | "Synced to block X" |
| ASP tree initialized | `GET /api/asp/root`                       | Non-zero root       |

---

## 3. ASP Service Operations

### 3.1 Service Startup

The ASP service runs as part of the API server. On startup:

1. Fetches all historical deposits from indexer
2. Rebuilds LeanIMT tree with all labels
3. Syncs root to on-chain if different
4. Subscribes to new deposit events

### 3.2 Normal Operation

```
New Deposit Event
       │
       ▼
┌──────────────────┐
│ ASP Service      │
│ 1. Extract label │
│ 2. Insert to tree│
│ 3. Update root   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Entrypoint       │
│ updateRoot(root) │
└──────────────────┘
```

### 3.3 API Endpoints

| Endpoint                | Method | Description                     |
| ----------------------- | ------ | ------------------------------- |
| `/api/asp/root`         | GET    | Current ASP root                |
| `/api/asp/proof/:label` | GET    | Merkle proof for label          |
| `/api/asp/sync`         | POST   | Force sync with indexer (admin) |
| `/api/asp/status`       | GET    | Service health status           |

### 3.4 Monitoring

```bash
# Check ASP service status
curl http://localhost:3333/api/asp/status

# Expected response:
{
  "status": "healthy",
  "treeSize": 1234,
  "latestRoot": "0x...",
  "onChainRoot": "0x...",
  "synced": true
}
```

### 3.5 Manual Root Update

If ASP service is down, manually update root:

```typescript
// Using ethers.js
const entrypoint = new Contract(ENTRYPOINT_ADDRESS, abi, signer)
await entrypoint.updateRoot(newRoot, 'ipfs://placeholder')
```

---

## 4. User Flows

### 4.1 Create Port (Merchant/Recipient)

```
┌─────────────────────────────────────────────────────────────────┐
│  USER ACTION: Create Port                                        │
├─────────────────────────────────────────────────────────────────┤
│  1. Connect wallet                                               │
│  2. Sign message to derive stealth meta-address                  │
│  3. Enter Port name (e.g., "Freelance Income")                   │
│  4. Click "Create Port"                                          │
│                                                                  │
│  TRANSACTION: GaleonRegistry.registerPort(portId, name, meta)    │
│                                                                  │
│  RESULT: Port created, user can share payment link               │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Send Payment (Payer)

```
┌─────────────────────────────────────────────────────────────────┐
│  USER ACTION: Pay to Port                                        │
├─────────────────────────────────────────────────────────────────┤
│  1. Open payment link or scan QR                                 │
│  2. Connect wallet                                               │
│  3. Enter amount                                                 │
│  4. Click "Pay"                                                  │
│                                                                  │
│  FRONTEND STEPS:                                                 │
│  - Fetch Port's stealth meta-address                             │
│  - Generate ephemeral keypair                                    │
│  - Derive stealth address                                        │
│  - Compute view tag                                              │
│                                                                  │
│  TRANSACTION: GaleonRegistry.payNative(portId, stealth, ...)     │
│                                                                  │
│  RESULT: Funds sent to stealth address, announcement emitted     │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Receive Payment (Port Owner)

```
┌─────────────────────────────────────────────────────────────────┐
│  USER ACTION: Check Payments                                     │
├─────────────────────────────────────────────────────────────────┤
│  1. Open app, connect wallet                                     │
│  2. App scans announcements (filtered by view tag)               │
│  3. App derives stealth keys, checks balances                    │
│  4. Displays received payments                                   │
│                                                                  │
│  BACKEND: Indexer provides filtered announcements via API        │
│                                                                  │
│  RESULT: User sees list of payments with amounts and timestamps  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 Deposit to Pool (First Deposit)

```
┌─────────────────────────────────────────────────────────────────┐
│  USER ACTION: Collect to Pool (First Time)                       │
├─────────────────────────────────────────────────────────────────┤
│  1. Select payment to collect                                    │
│  2. Click "Collect to Pool"                                      │
│                                                                  │
│  FRONTEND STEPS:                                                 │
│  - Derive stealth private key for that payment                   │
│  - Generate commitment secrets (nullifier, secret)               │
│  - Compute precommitment hash                                    │
│                                                                  │
│  TRANSACTION: Entrypoint.deposit(precommitment, {value: amount}) │
│               (sent from stealth address)                        │
│                                                                  │
│  RESULT: Commitment created with label, funds in pool            │
│  ASP: Auto-approves new label                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 4.5 Deposit to Pool (Merge Deposit)

```
┌─────────────────────────────────────────────────────────────────┐
│  USER ACTION: Collect to Pool (Subsequent)                       │
├─────────────────────────────────────────────────────────────────┤
│  1. Select payment to collect                                    │
│  2. Click "Collect to Pool"                                      │
│                                                                  │
│  FRONTEND STEPS:                                                 │
│  - Recover existing commitment from pool                         │
│  - Fetch latest state root and ASP root                          │
│  - Generate merge deposit proof (~30 sec)                        │
│                                                                  │
│  TRANSACTION: Pool.mergeDeposit(amount, proof)                   │
│               (sent from stealth address)                        │
│                                                                  │
│  RESULT: Funds merged into existing commitment, same label       │
└─────────────────────────────────────────────────────────────────┘
```

### 4.6 Withdraw from Pool

```
┌─────────────────────────────────────────────────────────────────┐
│  USER ACTION: Withdraw                                           │
├─────────────────────────────────────────────────────────────────┤
│  1. Enter withdrawal amount                                      │
│  2. Enter recipient address (any address)                        │
│  3. Click "Withdraw"                                             │
│                                                                  │
│  FRONTEND STEPS:                                                 │
│  - Recover current commitment                                    │
│  - Fetch latest roots                                            │
│  - Generate withdrawal proof (~30 sec)                           │
│                                                                  │
│  TRANSACTION: Pool.withdraw(withdrawal, proof)                   │
│               (can be sent from any address)                     │
│                                                                  │
│  RESULT: Funds sent to recipient, new commitment for remainder   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.7 Ragequit (Emergency)

```
┌─────────────────────────────────────────────────────────────────┐
│  USER ACTION: Emergency Withdrawal (Ragequit)                    │
├─────────────────────────────────────────────────────────────────┤
│  1. Click "Emergency Withdraw"                                   │
│  2. Confirm identity will be revealed                            │
│                                                                  │
│  REQUIREMENTS:                                                   │
│  - Must be original depositor (first deposit address)            │
│  - Must not be banned by ASP                                     │
│                                                                  │
│  TRANSACTION: Pool.ragequit(proof)                               │
│               (must be sent from original depositor address)     │
│                                                                  │
│  RESULT: All funds returned to original depositor                │
│  PRIVACY: Identity revealed (depositor → funds link public)      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Admin Operations

### 5.1 Upgrade Verifiers (Circuit Update)

When new circuits are deployed:

```solidity
// Step 1: Deploy new verifiers
WithdrawalVerifierV2 newWithdrawal = new WithdrawalVerifierV2();
RagequitVerifierV2 newRagequit = new RagequitVerifierV2();
MergeDepositVerifierV2 newMerge = new MergeDepositVerifierV2();

// Step 2: Call upgrade function (owner only)
pool.upgradeVerifiers(
    address(newWithdrawal),
    address(newRagequit),
    address(newMerge)
);

// Emits: VerifiersUpgraded(newWithdrawal, newRagequit, newVersion)
```

### 5.2 Freeze Stealth Address

For compliance or when port is deactivated:

```solidity
// Owner only
registry.setFrozenStealthAddress(stealthAddress, true);

// Effect: Address cannot deposit to pool
// User can still withdraw if not ASP-banned
```

### 5.3 Update Deposit Blocklist

Block specific addresses from depositing:

```solidity
// Owner only (via entrypoint or direct)
pool.updateBlocklist(depositorAddress, true);  // Block
pool.updateBlocklist(depositorAddress, false); // Unblock
```

### 5.4 Wind Down Pool

Permanently disable new deposits (emergency only):

```solidity
// Entrypoint owner only
entrypoint.windDown(poolAddress);

// Effect: No new deposits, withdrawals still work
// IRREVERSIBLE
```

### 5.5 Authorize New Pool

When deploying additional pools:

```solidity
// Step 1: Deploy new pool
// Step 2: Authorize in registry
registry.setAuthorizedPool(newPoolAddress, true);

// Step 3: Link registry to pool
newPool.setGaleonRegistry(registryAddress);
```

### 5.6 Transfer Ownership

```solidity
// For GaleonRegistry (Ownable)
registry.transferOwnership(newOwner);

// For Entrypoint (AccessControl)
entrypoint.grantRole(DEFAULT_ADMIN_ROLE, newAdmin);
entrypoint.revokeRole(DEFAULT_ADMIN_ROLE, oldAdmin);
```

---

## 6. Monitoring & Alerts

### 6.1 Key Metrics

| Metric              | Source                      | Alert Threshold |
| ------------------- | --------------------------- | --------------- |
| ASP tree size       | ASP service                 | N/A (info)      |
| ASP root sync       | Compare on-chain vs service | Desync > 5 min  |
| Deposit count       | Indexer                     | N/A (info)      |
| Pool TVL            | RPC balance query           | Large changes   |
| Failed transactions | Indexer                     | Any failures    |
| Service health      | Health endpoints            | Any unhealthy   |

### 6.2 Health Check Endpoints

```bash
# API health
curl http://localhost:3333/health

# ASP service health
curl http://localhost:3333/api/asp/status

# Indexer health
curl http://localhost:42069/health
```

### 6.3 Log Monitoring

```bash
# Watch API logs
pnpm --filter api dev 2>&1 | grep -E "(ERROR|WARN|ASP)"

# Watch indexer logs
pnpm --filter indexer dev 2>&1 | grep -E "(ERROR|reorg|sync)"
```

### 6.4 On-Chain Monitoring

Monitor these events:

| Event             | Contract   | Significance         |
| ----------------- | ---------- | -------------------- |
| `Deposited`       | Pool       | New deposit          |
| `Withdrawn`       | Pool       | Withdrawal           |
| `MergeDeposited`  | Pool       | Merge deposit (v2)   |
| `Ragequit`        | Pool       | Emergency withdrawal |
| `PoolDied`        | Pool       | Pool wind-down       |
| `RootUpdated`     | Entrypoint | ASP root change      |
| `PortRegistered`  | Registry   | New port             |
| `PortDeactivated` | Registry   | Port closed          |

---

## 7. Emergency Procedures

### 7.1 ASP Service Down

**Symptoms:** Withdrawals fail with "IncorrectASPRoot"

**Immediate Actions:**

1. Check API service logs
2. Restart API service: `pnpm --filter api dev`
3. If tree is corrupted, force sync: `POST /api/asp/sync`

**Manual Override:**

```typescript
// Rebuild tree from indexer and update root manually
const deposits = await indexer.getAllDeposits()
const tree = new LeanIMT(poseidon2)
for (const d of deposits) tree.insert(BigInt(d.label))
await entrypoint.updateRoot(tree.root, 'emergency')
```

### 7.2 Indexer Behind / Reorg

**Symptoms:** Missing recent transactions, incorrect balances

**Actions:**

1. Check indexer sync status
2. If reorg detected, indexer auto-handles
3. For manual resync: restart indexer with lower start block

### 7.3 Compromised ASP Wallet

**Symptoms:** Unauthorized root updates

**Immediate Actions:**

1. Revoke ASP_POSTMAN role: `entrypoint.revokeRole(ASP_POSTMAN, compromisedWallet)`
2. Deploy new ASP wallet
3. Grant role to new wallet
4. Update API with new private key
5. Sync ASP tree and update root

### 7.4 Smart Contract Bug

**For upgradeable contracts (UUPS):**

1. Prepare patched implementation
2. Deploy new implementation
3. Call `upgradeTo(newImplementation)` from proxy admin

**For non-critical bugs:**

1. Document workaround
2. Plan upgrade in next release

**For critical bugs affecting funds:**

1. Wind down pool if necessary
2. Deploy fixed version
3. Communicate migration path to users

### 7.5 User Banned Incorrectly

**Actions:**

1. Verify ban was incorrect
2. Re-add label to ASP tree
3. Update on-chain root
4. User can now withdraw/ragequit normally

```typescript
aspService.addLabel(userLabel)
await aspService.updateOnChainRoot()
```

---

## 8. Capacity Upgrade

### 8.1 When to Upgrade

| Indicator      | Threshold              | Action           |
| -------------- | ---------------------- | ---------------- |
| Tree depth     | Approaching 30 (of 32) | Plan upgrade     |
| Leaf count     | > 1 billion            | Plan upgrade     |
| Gas per insert | > 500k                 | Consider upgrade |

### 8.2 Upgrade Process

```
┌─────────────────────────────────────────────────────────────────┐
│  Phase 1: Prepare New Circuits                                   │
├─────────────────────────────────────────────────────────────────┤
│  1. Update circuit templates: maxTreeDepth = 40 (or higher)      │
│  2. Compile new circuits                                         │
│  3. Generate new trusted setup (ceremony for production)         │
│  4. Deploy new verifiers                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 2: Deploy New Pool                                        │
├─────────────────────────────────────────────────────────────────┤
│  1. Deploy new GaleonPrivacyPoolSimple with new verifiers        │
│  2. Authorize new pool in Registry                               │
│  3. Link Registry to new pool                                    │
│  4. Update ASP service to track both pools                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 3: Migration                                              │
├─────────────────────────────────────────────────────────────────┤
│  1. Announce migration period to users                           │
│  2. Users withdraw from old pool                                 │
│  3. Users deposit to new pool                                    │
│  4. Old pool remains operational for withdrawals only            │
│  5. Optionally wind down old pool after migration complete       │
└─────────────────────────────────────────────────────────────────┘
```

### 8.3 Circuit Changes Required

```circom
// OLD: packages/0xbow/packages/circuits/circuits/withdraw.circom
template Withdraw(maxTreeDepth) {  // maxTreeDepth = 32
    ...
}

// NEW: Increase maxTreeDepth
template Withdraw(maxTreeDepth) {  // maxTreeDepth = 40
    ...
}
```

### 8.4 Backward Compatibility

| Component   | Old Pool             | New Pool   |
| ----------- | -------------------- | ---------- |
| Deposits    | Disabled (wind down) | Enabled    |
| Withdrawals | Enabled              | Enabled    |
| Ragequit    | Enabled              | Enabled    |
| ASP Tree    | Maintained           | Fresh tree |
| User Labels | Cannot migrate       | New labels |

**Note:** Users get new labels in the new pool. Old pool labels/commitments remain valid for withdrawal only.

### 8.5 Communication Template

```markdown
## Galeon Pool Migration Notice

We're upgrading to a higher-capacity pool to support continued growth.

**Timeline:**

- Migration begins: [DATE]
- Old pool deposit cutoff: [DATE]
- Recommended migration deadline: [DATE]

**What you need to do:**

1. Withdraw all funds from the old pool
2. Deposit to the new pool
3. Your pool balance and privacy are preserved

**What happens if you don't migrate:**

- Your funds remain safe in the old pool
- You can withdraw at any time
- No new deposits to old pool after cutoff

**Questions?** Contact support or visit [LINK]
```

---

## 9. Scaling Reality Check

### 9.1 Current Design vs Card Networks

This section provides an honest assessment of Galeon's scalability compared to traditional payment networks.

| Metric              | Galeon (Current)              | Visa/Mastercard              |
| ------------------- | ----------------------------- | ---------------------------- |
| Tree capacity       | 4.29 billion leaves           | N/A (no Merkle tree)         |
| Peak TPS            | ~10-100 tx/s (chain limited)  | ~24,000 TPS (published peak) |
| Theoretical TPS     | ~100 tx/s (50M gas blocks)    | ~65,000 TPS                  |
| Annual transactions | ~315M-3.15B (theoretical max) | 150-200 billion              |

### 9.2 The Math

**Tree Exhaustion Timeline:**

```
At 10 tx/s sustained:
  → 315M tx/year
  → Tree full in ~13.6 years

At 100 tx/s sustained:
  → 3.15B tx/year
  → Tree full in ~1.4 years

At 1,000 tx/s (Visa-like):
  → 31.5B tx/year
  → Tree full in ~50 days
  → BUT: Chain can't handle this anyway
```

**On-Chain Throughput Bottleneck:**

```
Merge deposit gas:     ~250-300k gas
Block gas limit:       ~50M (generous estimate)
Block time:            ~2 seconds

Max merge deposits:    50M / 300k = ~166 per block
Max TPS:               166 / 2 = ~83 tx/s

Reality: DA limits, other transactions, and network congestion
         reduce this significantly. Expect 10-50 tx/s practical.
```

### 9.3 What This Means

| Use Case                    | Feasibility     | Notes                                   |
| --------------------------- | --------------- | --------------------------------------- |
| Hackathon demo              | ✅ Excellent    | Unlimited for demo purposes             |
| Early startup               | ✅ Excellent    | Years of runway                         |
| Growing business (1M users) | ✅ Good         | Still years of capacity                 |
| Regional payment network    | ⚠️ Challenging  | Need upgrades within 1-2 years          |
| Visa-scale global network   | ❌ Not feasible | Fundamental architecture changes needed |

### 9.4 Path to Higher Scale

If Galeon ever approaches payment network volumes, these changes would be required:

**Phase 1: Deeper Trees (10x capacity)**

- Increase `maxTreeDepth` from 32 to 40
- New circuits, new trusted setup, pool migration
- Gets to ~1 trillion leaves

**Phase 2: Off-Chain Batching (100x throughput)**

- Batch multiple deposits into single on-chain tx
- Validity proofs for batch correctness
- Similar to zkRollup architecture

**Phase 3: Dedicated Rollup (1000x+ throughput)**

- Deploy Galeon as its own L2/L3
- Custom DA layer optimized for privacy pool operations
- Settle proofs to L1/L2

**Phase 4: Sharded Pools (unlimited)**

- Multiple pools per asset/region
- Cross-pool transfers via bridges
- Horizontal scaling

### 9.5 Honest Assessment

**This design is appropriate for:**

- Hackathon demonstration
- MVP/beta launch
- First 1-5 years of operation
- Up to millions of users with normal usage patterns

**This design is NOT appropriate for:**

- Competing with Visa/Mastercard throughput
- High-frequency trading or DeFi-style volume
- Billions of annual transactions

**Bottom line:** The current architecture is orders of magnitude below card-network throughput. This is intentional for a hackathon project. Scaling to payment network levels would require fundamental changes to:

1. Tree depth (deeper trees)
2. DA throughput (off-chain batching/rollups)
3. State growth management (pruning, archiving)
4. Multi-pool architecture (sharding)

These are solvable problems but represent significant engineering effort beyond hackathon scope.

---

## 10. Operational Pressure Points

Beyond tree capacity, several operational bottlenecks will emerge before Visa-scale:

### 10.1 Prover Throughput

| Concern                          | Impact                                  | Mitigation                           |
| -------------------------------- | --------------------------------------- | ------------------------------------ |
| Groth16 proofs are CPU-intensive | Single server caps at ~10-50 proofs/min | Prover fleet with autoscaling        |
| Concurrent proof requests        | Queue backlog, user timeouts            | Job queue with priority, SLOs        |
| GPU acceleration                 | 10x speedup possible                    | Invest in GPU provers for production |

**Production architecture:**

```
User Request → API → Proof Queue (Redis/BullMQ) → Prover Workers (n)
                                ↓
                         Autoscale on queue depth
```

### 10.2 ASP Root Freshness

| Update Frequency | Pros           | Cons                               |
| ---------------- | -------------- | ---------------------------------- |
| Every deposit    | Bans instant   | Proofs stale quickly, more retries |
| Every 5 minutes  | Less staleness | Bans delayed by 5 min              |
| Every N deposits | Predictable    | Variable delay                     |

**Recommended:** Batch updates every 2-5 minutes OR every 10 deposits, whichever comes first.

**Client retry logic is essential** - see Appendix B in spec.

### 10.3 Indexer/Database Load

| Component         | Bottleneck                  | Mitigation                             |
| ----------------- | --------------------------- | -------------------------------------- |
| Write throughput  | High deposit rate           | Sharded DB, async writes               |
| Read latency      | Recovery scans all deposits | Pagination, caching, indexed queries   |
| Real-time updates | SSE/WS connection limits    | Horizontal scaling, connection pooling |
| Recovery queries  | Full table scans            | Materialized views, bloom filters      |

**Production needs:**

- Read replicas for query load
- Redis caching for hot paths (latest commitment per user)
- SSE fan-out service for real-time updates

### 10.4 Registry Bottlenecks

```
Current: Each deposit → verifiedBalance read + consume → 2 contract calls
At scale: Thousands of deposits/hour → registry becomes bottleneck
```

**Mitigations:**

1. Batch deposits where possible (user queues multiple Ports, single tx)
2. Off-chain balance tracking with periodic on-chain sync
3. Merkle proofs for balance verification (future)

### 10.5 Concurrency & Race Conditions

**Current design:** One active commitment per user
**Problem:** Two concurrent operations → second reverts (nullifier spent)

| Scenario           | Frequency  | Impact                   |
| ------------------ | ---------- | ------------------------ |
| User double-clicks | Common     | Wasted gas, retry works  |
| Two browser tabs   | Occasional | One fails, confusion     |
| Automated systems  | At scale   | Thrashing, wasted proofs |

**Mitigations:**

1. **Frontend:** Disable buttons during pending operations
2. **Backend:** Server-side lock per user/label (Redis lock)
3. **API:** Reject concurrent proof requests for same label

```typescript
// Server-side locking
const lockKey = `proof:lock:${userId}:${label}`
const acquired = await redis.set(lockKey, '1', 'NX', 'EX', 300) // 5 min lock
if (!acquired) {
  throw new Error('Operation already in progress')
}
```

### 10.6 Trusted Setup & Governance

| Circuit Change  | Setup Required | Operational Cost            |
| --------------- | -------------- | --------------------------- |
| Bug fix         | Yes            | High (ceremony or dev keys) |
| New feature     | Yes            | High                        |
| Parameter tweak | Yes            | High                        |

**Production considerations:**

- Use dev keys for testing, production ceremony for mainnet
- Consider PLONK/Halo2 for universal setup (one-time cost)
- Governance timelock for verifier upgrades (prevent rug)
- Multi-sig for upgrade authorization

### 10.7 Multi-Asset Multiplication

| Assets                         | Pools | State | Ops Load |
| ------------------------------ | ----- | ----- | -------- |
| 1 (MNT)                        | 1     | 1x    | 1x       |
| 5 (MNT, USDC, USDT, ETH, WBTC) | 5     | 5x    | 5x       |
| 20 (all popular tokens)        | 20    | 20x   | 20x      |

**Each asset requires:**

- Separate pool contract
- Separate ASP tree
- Separate indexer handlers
- Separate prover keys (if different circuits)

**Recommendation:** Start with 1-3 assets, add carefully.

### 10.8 Tree Lifecycle Management

Even before 4.3B leaves, performance degrades:

| Leaves | Insert Gas | Storage | Query Time |
| ------ | ---------- | ------- | ---------- |
| 1M     | ~150k      | ~32 MB  | Fast       |
| 100M   | ~180k      | ~3.2 GB | Moderate   |
| 1B     | ~200k      | ~32 GB  | Slow       |
| 4B     | ~220k      | ~128 GB | Very slow  |

**Rollover triggers:**

1. Insert gas exceeds threshold (e.g., 250k)
2. Leaf count exceeds 1B
3. Query latency exceeds SLO

**Rollover procedure:** See Section 8 (Capacity Upgrade)

### 10.9 Observability Requirements

**Must-have metrics:**

| Category  | Metrics                                                |
| --------- | ------------------------------------------------------ |
| Proofs    | Generation time p50/p95/p99, queue depth, failure rate |
| ASP       | Root update latency, staleness window, retry rate      |
| Indexer   | Sync lag, query latency, error rate                    |
| Contracts | Gas used, revert rate, TVL                             |
| User      | Deposit/withdraw latency, error rate                   |

**Alerting thresholds:**

| Alert              | Threshold    | Severity |
| ------------------ | ------------ | -------- |
| Proof queue depth  | > 100        | Warning  |
| Proof queue depth  | > 500        | Critical |
| ASP root staleness | > 10 min     | Warning  |
| Indexer lag        | > 100 blocks | Critical |
| Revert rate        | > 5%         | Warning  |
| Relayer balance    | < 0.1 MNT    | Critical |

### 10.10 Production Readiness Checklist

Before scaling beyond hackathon:

- [ ] Prover service with autoscaling
- [ ] ASP update batching with cadence
- [ ] Read replicas for indexer DB
- [ ] Redis caching layer
- [ ] Server-side concurrency locks
- [ ] Governance timelock for upgrades
- [ ] Multi-sig for admin operations
- [ ] Comprehensive monitoring/alerting
- [ ] Load testing at 10x expected volume
- [ ] Incident response runbook
- [ ] Tree rollover automation

---

## Appendix: Contract Addresses

### Mantle Sepolia (Testnet)

| Contract                | Address |
| ----------------------- | ------- |
| ERC5564Announcer        | `0x...` |
| ERC6538Registry         | `0x...` |
| GaleonRegistry          | `0x...` |
| GaleonEntrypoint        | `0x...` |
| GaleonPrivacyPoolSimple | `0x...` |
| WithdrawalVerifier      | `0x...` |
| RagequitVerifier        | `0x...` |
| MergeDepositVerifier    | `0x...` |

### Mantle Mainnet

| Contract           | Address |
| ------------------ | ------- |
| _Not yet deployed_ | -       |

---

## Appendix: Environment Variables

```bash
# ===== CONTRACTS =====
GALEON_REGISTRY_ADDRESS=
GALEON_POOL_ADDRESS=
GALEON_ENTRYPOINT_ADDRESS=
ERC5564_ANNOUNCER_ADDRESS=
ERC6538_REGISTRY_ADDRESS=

# ===== CHAIN =====
CHAIN_ID=5003
RPC_URL=https://rpc.sepolia.mantle.xyz

# ===== ASP SERVICE =====
ASP_POSTMAN_PRIVATE_KEY=  # SENSITIVE - wallet with ASP_POSTMAN role

# ===== INDEXER =====
PONDER_RPC_URL=
DATABASE_URL=

# ===== FRONTEND =====
NEXT_PUBLIC_GALEON_REGISTRY_ADDRESS=
NEXT_PUBLIC_GALEON_POOL_ADDRESS=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

---

## Revision History

| Version | Date       | Changes                                                     |
| ------- | ---------- | ----------------------------------------------------------- |
| 1.0.0   | 2026-01-04 | Initial version                                             |
| 1.1.0   | 2026-01-04 | Added scaling reality check and operational pressure points |

---

**End of Maintenance Guide**
