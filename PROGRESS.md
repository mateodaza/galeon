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
| AdonisJS API    | Not Started | -     | User/Port models, SIWE auth                               |
| Stealth library | Done        | -     | 30 tests, audited, documented (README.md)                 |
| Contracts       | Done        | -     | 90 tests, audited, deployed to Mantle Mainnet, documented |
| Ponder indexer  | Not Started | -     | Event handlers + webhook                                  |
| Real-time       | Not Started | -     | Transmit SSE                                              |

**Milestone:** Payment on testnet → Ponder indexes → API receives webhook → SSE broadcasts

---

### Phase 2: Frontend + Full Flow

**Goal:** Complete user journey from setup to collection

| Task             | Status      | Owner | Notes                |
| ---------------- | ----------- | ----- | -------------------- |
| Next.js setup    | Not Started | -     | wagmi, API client    |
| /setup           | Not Started | -     | Onboarding flow      |
| /dashboard/ports | Not Started | -     | Port management      |
| /pay/[portId]    | Not Started | -     | Payment flow         |
| /collect         | Not Started | -     | Collection interface |
| /dashboard       | Not Started | -     | Vendor dashboard     |
| /verify          | Not Started | -     | Receipt verification |

**Milestone:** Full flow: Setup → Create Port → Share Link → Pay → Detect → Collect

---

### Phase 3: Polish + Submission

**Goal:** Production-ready for hackathon demo

| Task            | Status      | Owner | Notes                  |
| --------------- | ----------- | ----- | ---------------------- |
| Error handling  | Not Started | -     | User-friendly messages |
| Smoke tests     | Not Started | -     | E2E on Mantle Sepolia  |
| Evidence bundle | Not Started | -     | Screenshots, video     |
| README          | Not Started | -     | Setup instructions     |
| Submission      | Not Started | -     | Hackathon write-up     |

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
