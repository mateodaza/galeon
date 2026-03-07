# SCF AWARD — SUBMISSION FORM

---

## Submission Information

**Project:** Galeon

**Round:** SCF #42

**Build Award Track:** Open Track

**Submission Title:** Stealth Addresses, Privacy Pools, and Compliance Reporting for Stellar

**Project Type:** Financial Protocol / Infrastructure

**Project URL:** https://www.galeon.finance/

**Technical Architecture Document:** https://github.com/mateodaza/galeon/blob/main/STELLAR-ARCHITECTURE.md

Supplementary (full protocol litepaper): https://github.com/mateodaza/galeon/blob/main/LITEPAPER.md

**GitHub URL:** https://github.com/mateodaza/galeon

**Video URL:** _(TBD — <3 min demo video, 16:9, 1920x1080, upload to YouTube or Vimeo before submission)_

---

## Products & Services

Galeon is a production privacy stack deployed on EVM (Mantle mainnet). This project brings it to Stellar using Protocol 25 primitives — BN254 host functions (CAP-0074), Poseidon permutations (CAP-0075), and Stellar Asset Contracts.

1. **Stealth Address Module** — One-time receiving addresses so no payment can be linked to the recipient. Stellar: ed25519 key derivation, contract-held balance model, event-based scanning via RPC `getEvents`. Impact: Receiver privacy for Stellar payments — no address reuse, no public payment history.

2. **Privacy Pool** — ZK-proven withdrawals that break the on-chain link between deposit and withdrawal. Stellar: Groth16 verification via BN254 host functions (CAP-0074), Poseidon commitments via CAP-0075. Impact: Sender privacy with compliance — users prove funds are clean without revealing which deposit is theirs.

3. **Shipwreck Compliance Layer** — On-demand tax/audit reports from on-chain activity. Stellar: Reads Soroban events + Horizon data to reconstruct transaction history. Impact: Makes privacy compatible with regulation — selective disclosure without exposing full history.

4. **Relayer** — Submits withdrawals on behalf of users so their address never appears on-chain. Stellar: Adapted for Stellar transaction construction and fee model. Impact: Eliminates the metadata leak that would otherwise deanonymize private withdrawals.

5. **Web App** — Full user flow: connect wallet, receive stealth payments, private send, export compliance reports. Stellar: Built for Stellar wallets (Freighter, Lobstr) and Soroban interaction. Impact: Accessible interface for non-technical users to use privacy infrastructure on Stellar.

---

## Traction Evidence

- Full-stack production deployment on Mantle mainnet: stealth payments, Privacy Pool with ZK verification, relayer-assisted withdrawals, Shipwreck compliance reports
- Mantle Global Hackathon 2025 — 2nd place, RWA Track (Top 30 of 500+ submissions)
- Test coverage: @galeon/stealth 34 tests passing, @galeon/contracts 289 tests passing, @galeon/api 265 tests passing
- Working features on EVM: stealth address derivation + scanning, Privacy Pool deposit/withdraw with Groth16 proofs, Merkle tree ASP membership proofs, nullifier tracking (no double-spend), relayer service for private withdrawals, Shipwreck tax report generation with PDF export
- Stellar-specific architecture document mapping every component to Protocol 25 primitives: https://github.com/mateodaza/galeon/blob/main/STELLAR-ARCHITECTURE.md
- Open-source repository: https://github.com/mateodaza/galeon
- Published litepaper: https://github.com/mateodaza/galeon/blob/main/LITEPAPER.md
- Pre-product stage on Stellar (no external users or TVL yet — the protocol works on EVM and is ready to port)

---

## Resubmission Feedback

_(first-time submission)_

## Ambassador Affiliation

None

## Thumbnail

_(Attach 16:9 image)_

---

## Team Members

- **Mateo Daza** — Full-stack & smart contract engineer. Soroban contracts, frontend, integration. Twitter: @mateodazab | Telegram: @mateodaza
- **Carlos Quintero** — Backend & cryptography engineer. Relayer, indexing, crypto primitives. Telegram: @cquinterom096
- **Fabio Anaya** — Ecosystem integration lead. Wallet integration testing (Freighter, Lobstr), developer documentation, user testing coordination, ASP operator setup. Telegram: @CryptoRhinoo

The team shipped the full Galeon stack on Mantle (stealth payments, Privacy Pool circuits/contracts, relayer, compliance layer) in hackathon timelines. All core protocol logic exists and is tested — this is a port to Stellar, not a build from scratch. 3-person technical team submitting as a team of individuals.

---

## SCF Build Tranche Deliverables

**Total Budget Request:** $88,000 (USD equivalent in XLM)

**Duration:** 4 months (April–July 2026)

**Tranche Structure:** T0 10% ($8,800) on approval | T1 20% ($17,600) | T2 30% ($26,400) | T3 40% ($35,200)

**Critical path:** BN254 verifier feasibility → stealth module → testnet end-to-end flow. Mainnet polish, indexing, and UX follow only after core primitives are validated on testnet.

---

### Tranche #1 Deliverables — Contracts on Testnet

**Completion Date:** 30/04/2026

[Deliverable 1] Soroban development environment and CI pipeline

- Testnet accounts, automated test and deployment pipeline, reproducible builds
- Measure: CI passing on GitHub with testnet deployment step

[Deliverable 2] Stealth address module deployed on Stellar testnet

- Soroban contract implementing stealth address derivation on ed25519 (adapted from secp256k1/EIP-5564), one-time address generation, contract-held balance model, and real-time scanning via RPC `getEvents`
- Measure: Deployed testnet contract address on GitHub, unit tests passing, transaction link showing a stealth payment received and scanned on testnet
- Note: T1/T2 scanning and reporting use Soroban RPC `getEvents` directly (default node retention ~24hrs; up to 7 days on supported providers). Testnet activity is low-volume and tightly bounded, so this covers dev needs. The production indexer (Mercury/SubQuery) for long-term historical data is delivered in T3.

[Deliverable 3] Groth16 verifier contract deployed on Stellar testnet

- Proof verification contract using BN254 host functions from CAP-0074
- Includes feasibility validation: measured BN254 instruction costs, confirmed Poseidon parameter compatibility with existing Circom circuits
- Measure: Deployed testnet contract address, unit tests passing, transaction link showing a proof verified on-chain, published instruction budget report
- Fallback: if BN254 costs exceed budget, pivot to BLS12-381 (proven on Soroban via SDF prototype) with circuit recompilation

**Budget:** $17,600 (20%)

---

### Tranche #2 Deliverables — Full Testnet Flow

**Completion Date:** 31/05/2026

[Deliverable 1] Poseidon commitment scheme

- Sponge construction over CAP-0075 Poseidon permutation primitives, compatible with existing Circom circuits
- Measure: Commitment generation matches expected outputs from EVM implementation

[Deliverable 2] Full deposit flow on testnet

- Client-side proof generation (WebAssembly), deposit transaction with commitment stored on-chain
- Measure: Testnet transaction links showing deposits with valid commitments

[Deliverable 3] Full Privacy Pool withdrawal flow

- ZK proof generation, nullifier tracking (no double-spend), relayed withdrawal
- Measure: Testnet transaction showing a withdrawal where the user's address does not appear on-chain

[Deliverable 4] Merkle tree with ASP membership proofs

- Association Set Provider allowlist Merkle tree, membership proof verification for compliant withdrawals
- Measure: On-chain proof verification passing for deposits included in the ASP allowlist

[Deliverable 5] Stellar relayer service

- Submits withdrawal transactions on behalf of users for fee abstraction
- Measure: Relayed withdrawal transaction on testnet where submitter is the relayer, not the user

[Deliverable 6] Shipwreck compliance module

- Report generation from Soroban events (via RPC `getEvents`) and Horizon transaction data, PDF export
- Measure: Generated report matching testnet transaction history, exported as PDF

End-to-end acceptance test: Deposit -> client-side proof generation -> relayed withdrawal -> compliance report export. All steps documented with testnet transaction links.

**Budget:** $26,400 (30%)

---

### Tranche #3 Deliverables — Mainnet Launch + UX

**Completion Date:** 31/07/2026

**Month 3 (June) — Audit-ready hardening:**

[Deliverable 1] Contract code freeze

- No architecture changes after June 1. Clean storage layout, access control, event emissions, NatSpec comments for auditors
- Measure: Tagged release on GitHub, code review checklist complete

[Deliverable 2] Final integration tests

- Full test suite running against mainnet-like conditions
- Measure: All tests passing, test coverage report published

[Deliverable 3] Event indexing pipeline

- Mercury or SubQuery indexer processing Soroban contract events for stealth scanning, deposits, and withdrawals
- Measure: Indexed data matches on-chain events, API returns correct results

[Deliverable 4] Frontend and onboarding flow

- Web application built and tested internally: wallet connect, Port creation, payment, withdrawal, report export
- Measure: Internal testing complete, screenshots/recordings of full flow

**Month 4 (July) — Ship:**

[Deliverable 5] Mainnet deployment of all Soroban contracts

- Stealth module, Privacy Pool, Groth16 verifier, Merkle tree — all deployed to Stellar mainnet
- Measure: Deployed mainnet contract addresses published on GitHub

[Deliverable 6] Web app live on mainnet

- Receive stealth payments, private send via Privacy Pool, export compliance reports
- Measure: Live URL, working end-to-end flow on mainnet

[Deliverable 7] Onboarding flow

- Wallet connect -> generate receiving address -> first payment, clear for new users
- Measure: Usability validation with 3-5 external testers, feedback documented

[Deliverable 8] Open-source release with documentation

- Public GitHub repo with README, architecture docs, deployment guide
- Measure: Repo is public, documentation covers setup and usage

[Deliverable 9] Demo video

- <3 min, 16:9 (1920x1080), showing full user flow on mainnet
- Measure: Published on YouTube/Vimeo

[Deliverable 10] Audit-ready handoff

- Contracts frozen, documented, and submitted to SCF-arranged security audit.
- Measure: Audit package delivered to SCF (tagged release, NatSpec documentation, test coverage report, deployment addresses). If audit findings arrive during the tranche window, remediation PRs merged.

**Budget:** $35,200 (40%)

---

## Budget Breakdown

| Category          | Amount      | %     |
| ----------------- | ----------- | ----- |
| Team compensation | $72,000     | 82%   |
| Infrastructure    | $4,000      | 4.5%  |
| Deployment        | $2,000      | 2.3%  |
| Contingency       | $10,000     | 11.4% |
| **Total**         | **$88,000** | 100%  |

**Team compensation detail:**

| Person          | Role                                     | Monthly | Months | Total   |
| --------------- | ---------------------------------------- | ------- | ------ | ------- |
| Mateo Daza      | Soroban contracts, frontend, integration | $7,000  | 4      | $28,000 |
| Carlos Quintero | Backend, relayer, indexing, crypto       | $7,000  | 4      | $28,000 |
| Fabio Anaya     | Ecosystem integration lead               | $4,000  | 4      | $16,000 |

Rates reflect specialized work: porting production ZK circuits to a new Rust-based runtime using Protocol 25 primitives (CAP-0074/CAP-0075). US market rate for this scope is $12-16K/mo; these rates are well below that.

**Infrastructure ($4,000):** Stellar RPC, event indexer (Mercury/SubQuery), hosting (API, relayer, web app), CI/CD — estimated $200-400/mo actual spend, budget provides headroom.

**Deployment ($2,000):** Testnet iteration cycles, mainnet contract deployment (storage fees), Soroban instruction budget testing.

**Contingency ($10,000):** BN254 instruction cost surprises (CAP-0074 cost calibration still TBD), circuit optimization sprint if instruction budget is tighter than ~40M benchmark, Stellar learning curve, unexpected complexity in Poseidon sponge construction.

Note: Security audit provided by SCF at Tranche 3 — not included in budget. No marketing or promotion costs included.
