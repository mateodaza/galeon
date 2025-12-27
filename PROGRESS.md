# Galeon - Development Progress

> Global tracker synced with app/package progress files.
> Last updated: 2025-12-27

## Current Phase: 1 - Foundation

### Phase 1: Foundation

**Goal:** Backend + stealth library + contracts deployed

| Task            | Status      | Owner | Notes                                                     |
| --------------- | ----------- | ----- | --------------------------------------------------------- |
| Turborepo setup | Done        | -     | Monorepo structure created                                |
| Railway infra   | Not Started | -     | PostgreSQL + Redis                                        |
| AdonisJS API    | In Progress | -     | Models, SIWE auth, JWT refresh - 85 tests                 |
| Stealth library | Done        | -     | 30 tests, audited, documented (README.md)                 |
| Contracts       | Done        | -     | 90 tests, audited, deployed to Mantle Mainnet, documented |
| Ponder indexer  | Not Started | -     | Event handlers + webhook                                  |
| Real-time       | Not Started | -     | Transmit SSE                                              |

**Milestone:** Payment on testnet → Ponder indexes → API receives webhook → SSE broadcasts

---

### Phase 2: Frontend + Full Flow

**Goal:** Complete user journey from setup to collection

| Task             | Status | Owner | Notes                                    |
| ---------------- | ------ | ----- | ---------------------------------------- |
| Next.js setup    | Done   | -     | wagmi v3, Reown AppKit, Tailwind v4      |
| /setup           | Done   | -     | Onboarding flow with key derivation      |
| /dashboard/ports | Done   | -     | Port management with per-port keys       |
| /pay/[portId]    | Done   | -     | Payment flow with stealth addresses      |
| /collect         | Done   | -     | Collection interface (manual sweeping)   |
| /dashboard       | Done   | -     | Vendor dashboard with stats              |
| /verify          | Done   | -     | Receipt verification (coming soon badge) |
| Network guard    | Done   | -     | Wrong-chain warning banner               |
| Audit fixes      | Done   | -     | Per-port keys, env handling, UX          |

**Milestone:** Full flow: Setup → Create Port → Share Link → Pay → Detect → Collect

---

### Phase 3: Polish + Submission

**Goal:** Production-ready for hackathon demo

| Task            | Status      | Owner | Notes                                    |
| --------------- | ----------- | ----- | ---------------------------------------- |
| Error handling  | Done        | -     | Network guard, graceful env handling     |
| README          | Done        | -     | Root + frontend docs with contract addrs |
| GaleonTender    | Not Started | -     | Batch collection via tender contract     |
| Ponder indexer  | Not Started | -     | Replace event scanning with indexed data |
| Backend API     | Not Started | -     | SIWE auth, port indexing, receipts       |
| Smoke tests     | Not Started | -     | E2E on Mantle Sepolia                    |
| Evidence bundle | Not Started | -     | Screenshots, video                       |
| Submission      | Not Started | -     | Hackathon write-up                       |

**Deadline:** January 15, 2026

---

## Quick Links

| App/Package | Progress File                                                    |
| ----------- | ---------------------------------------------------------------- |
| Frontend    | [apps/web/PROGRESS.md](apps/web/PROGRESS.md)                     |
| Backend     | [apps/api/PROGRESS.md](apps/api/PROGRESS.md)                     |
| Indexer     | [apps/indexer/PROGRESS.md](apps/indexer/PROGRESS.md)             |
| Contracts   | [packages/contracts/PROGRESS.md](packages/contracts/PROGRESS.md) |
| Stealth     | [packages/stealth/PROGRESS.md](packages/stealth/PROGRESS.md)     |
