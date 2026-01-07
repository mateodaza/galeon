# Galeon - Development Progress

> Global tracker synced with app/package progress files.
> Last updated: 2026-01-04

## Current Phase: 3 - Polish + Submission

### Phase 1: Foundation ✅

**Goal:** Backend + stealth library + contracts deployed

| Task            | Status  | Owner | Notes                                                    |
| --------------- | ------- | ----- | -------------------------------------------------------- |
| Turborepo setup | Done    | -     | Monorepo structure created                               |
| Railway infra   | Done    | -     | PostgreSQL + Redis configured                            |
| AdonisJS API    | Done    | -     | Models, SIWE auth, JWT refresh, Fog payments - 145 tests |
| Stealth library | Done    | -     | 34 tests, audited, documented (README.md)                |
| Contracts       | Done    | -     | 216 tests (Privacy Pool v1), deployed to Mantle Mainnet  |
| Ponder indexer  | Done    | -     | Event handlers, schema, REST API (direct DB access)      |
| Port Intent     | Done    | -     | Frontend creates intent → chain tx → backend confirms    |
| Receipt Claim   | Pending | -     | Frontend claims → API verifies via Ponder → user linked  |
| Real-time       | Pending | -     | Transmit SSE                                             |

**Milestone:** Payment on chain → Frontend claims → API verifies → User notified

---

### Phase 2: Frontend + Full Flow

**Goal:** Complete user journey from setup to collection

| Task              | Status | Owner | Notes                                    |
| ----------------- | ------ | ----- | ---------------------------------------- |
| Next.js setup     | Done   | -     | wagmi v3, Reown AppKit, Tailwind v4      |
| /setup            | Done   | -     | Onboarding flow with key derivation      |
| /receive          | Done   | -     | Port management with backend integration |
| /send             | Done   | -     | Payment initiation page                  |
| /pay/[portId]     | Done   | -     | Payment flow with stealth addresses      |
| /collect          | Done   | -     | Collection interface (manual sweeping)   |
| /dashboard        | Done   | -     | Vendor dashboard with stats              |
| /verify           | Done   | -     | Receipt verification (coming soon badge) |
| Network guard     | Done   | -     | Wrong-chain warning banner               |
| SIWE auth         | Done   | -     | API client, JWT tokens, auto-refresh     |
| Port backend sync | Done   | -     | Intent pattern with status lifecycle     |
| Audit fixes       | Done   | -     | Per-port keys, env handling, UX          |

**Milestone:** Full flow: Setup → Create Port → Share Link → Pay → Detect → Collect

---

### Phase 3: Polish + Submission

**Goal:** Production-ready for hackathon demo

| Task                   | Status      | Owner | Notes                                                 |
| ---------------------- | ----------- | ----- | ----------------------------------------------------- |
| Error handling         | Done        | -     | Network guard, graceful env handling                  |
| README                 | Done        | -     | Root + frontend docs with contract addrs              |
| Ponder indexer         | Done        | -     | Replace event scanning with indexed data + pagination |
| Backend API            | Done        | -     | SIWE auth, port sync, fog payments - 145 tests        |
| Wallet state           | Done        | -     | Address-keyed remounting, pool recovery race fix      |
| **Relayer service**    | **Done**    | -     | Private withdrawals - user address hidden on-chain    |
| **Nullifier tracking** | **Done**    | -     | Spent deposits filtered from balance via indexer      |
| **State tree sync**    | **Done**    | -     | Merkle leaves API for correct tree reconstruction     |
| Receipt claim          | Pending     | -     | Frontend claim → API verify via Ponder                |
| Smoke tests            | Not Started | -     | E2E on Mantle Sepolia                                 |
| Evidence bundle        | Not Started | -     | Screenshots, video                                    |
| Submission             | Not Started | -     | Hackathon write-up                                    |

**Deadline:** January 15, 2026

**Recent Fixes (Jan 4):**

- Relayer service for private withdrawals (`apps/api/app/services/pool_relay_service.ts`)
- Nullifier hash computation fix (contract stores `Poseidon(nullifier)`, not raw nullifier)
- `merkleLeavesApi` added to fetch ALL tree leaves (deposits + withdrawal change commitments)
- State tree mismatch resolved - frontend now builds tree from merkle leaves, not deposits

---

### Phase 4: Privacy Pool v2 - Account Model

**Goal:** O(1) withdrawals regardless of deposit history

**Spec:** [docs/FOG_PORT_POOL_SPEC.md](docs/FOG_PORT_POOL_SPEC.md)

| Task                     | Status      | Owner | Notes                                                           |
| ------------------------ | ----------- | ----- | --------------------------------------------------------------- |
| Spec document            | Done        | -     | Account Model v0.2.0, audited                                   |
| ASP auto-approve service | Not Started | -     | Unblocks current withdrawals                                    |
| MergeDeposit circuit     | Draft       | -     | `packages/0xbow/packages/circuits/circuits/mergeDeposit.circom` |
| Verifier generation      | Not Started | -     | Dev keys for testing                                            |
| Contract upgrade         | Not Started | -     | Add `mergeDeposit()` function                                   |
| ProofLib additions       | Not Started | -     | MergeDepositProof struct                                        |
| Prover integration       | Not Started | -     | Merge proof generation                                          |
| Frontend merge flow      | Not Started | -     | Auto-merge on deposit                                           |
| Indexer endpoint         | Not Started | -     | Latest commitment per label                                     |
| Security tests           | Not Started | -     | Balance invariants, label binding                               |
| Gas benchmarking         | Not Started | -     | Measure on Mantle                                               |

**Key Features:**

- Merge-on-deposit: each deposit merges into single commitment
- O(1) withdrawal: always 1 proof, ~30 sec, any amount
- Label preserved: ragequit always works
- ASP-gated: ragequit requires ASP approval (banned = frozen)

**Architecture:**

```
Port A ──┐
Port B ──┼──→ Pool ──→ Single Commitment ──→ Withdraw any amount
Port C ──┘        (merge)              (1 proof, 30s)
```

---

## Known Limitations / Future Improvements

| Issue                      | Status      | Notes                                                                                                                                                                                                                                                               |
| -------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Port labels are public** | Known Issue | Port names (e.g., "Freelance", "Donations") are stored on-chain and visible to anyone. To make them private, we'd need to store only a hash on-chain and keep the actual name encrypted in the backend/client. Users should be informed of this privacy limitation. |

---

## Quick Links

| App/Package | Progress File                                                    |
| ----------- | ---------------------------------------------------------------- |
| Frontend    | [apps/web/PROGRESS.md](apps/web/PROGRESS.md)                     |
| Backend     | [apps/api/PROGRESS.md](apps/api/PROGRESS.md)                     |
| Indexer     | [apps/indexer/PROGRESS.md](apps/indexer/PROGRESS.md)             |
| Contracts   | [packages/contracts/PROGRESS.md](packages/contracts/PROGRESS.md) |
| Stealth     | [packages/stealth/PROGRESS.md](packages/stealth/PROGRESS.md)     |
