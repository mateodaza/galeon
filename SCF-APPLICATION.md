# SCF Community Fund — Interest Form Submission

> Submitted Feb 2026. Approved for SCF Build Award (SCF #42). Full submission deadline: **March 15, 2026 EOD**.

---

## 1. Project Description

Galeon is a compliant privacy infrastructure for payments. We combine stealth-style one-time receiving addresses (receiver privacy), Privacy Pools (sender privacy), and a compliance/reporting layer for selective disclosure.

Receivers get a unique one-time destination per payment to reduce public linkability across transactions. Senders deposit into a Privacy Pool where zero-knowledge proofs break on-chain links, with policy-gated pool entry for compliance-oriented operation. Tax/compliance reports are generated on demand via Shipwreck (our selective-disclosure reporting module for audit/tax evidence).

Galeon is live on Mantle mainnet (EVM) with stealth payments, Privacy Pool account-model flow (multiple deposits, single-proof withdrawal path), client-side proof generation, relayer-assisted withdrawals, and compliance reporting. We plan to implement a Soroban version on Stellar.

We have not identified a production Stellar protocol combining all three components in one stack: stealth receiving, Privacy Pool sender privacy, and integrated compliance reporting.

## 2. Project Category

Financial protocols

## 3. Current Traction

- Mantle Global Hackathon 2025 — RWA Track finalist (Top 30 Finalist of 500+ submissions)
- Full stack contracts deployed on Mantle mainnet
- Open source: github.com/mateodaza/galeon
- Working features: stealth payments, ZK-verified Privacy Pool flow, relayer, compliance reports
- Current test status: @galeon/stealth 34/34 passing, @galeon/contracts 194 passing
- Pre-product stage (no users/TVL yet)

## 4. Website

https://www.galeon.finance/

## 5. Planned Stellar Integration

Galeon will port its Mantle privacy stack to Soroban: stealth-style one-time receiving addresses, a Privacy Pool, and compliance reporting. We plan to use Protocol 25 primitives, including BN254 host functions for Groth16 proof verification and Poseidon/Poseidon2 hashing for commitments and Merkle paths. Existing Circom circuits will be adapted to Soroban-compatible verifier/input flows based on Stellar Privacy Pools prototype patterns. We will implement custom stealth derivation/scanning logic, integrate Stellar SDK for signing/tx handling, and index data through RPC events (plus Horizon where needed for classic transaction data). Deliverables: Soroban stealth module, Groth16-enabled Privacy Pool contracts, Stellar relayer adaptation, Shipwreck report generation from Stellar transactions and Soroban events, and a user-facing web app on Stellar for receive, private send, and report export (demo-ready). Benchmarks suggest verifier execution is feasible but instruction-budget sensitive.

## 6. Build Track

Open track (net-new protocol primitives and infrastructure)

## 7. Project Thumbnail

_(image)_

## 8. Team Information

**Submitter type:** Team of individuals

### Team Description

3-person technical team.

- **Fabio Anaya** — xx
- **Mateo Daza** — Full-stack & smart contract engineer. Twitter: @mateodazab | Telegram: @mateodaza
- **Carlos Quintero** — Backend & cryptography engineer. Telegram: @cquinterom096

The team previously shipped Galeon on Mantle (stealth payments, Privacy Pool circuits/contracts, relayer, compliance layer) in hackathon timelines.

---

## Supporting Copy

### Strategic Framing

Privacy isn't a nice-to-have. It's a missing piece. Institutions are already tokenizing assets and settling on-chain, but full transparency keeps their most sensitive operations off of it. Payroll, treasury moves, supplier payments, none of that works when every counterparty and competitor can watch in real time. Privacy is not the only barrier, but it's one that has no workaround. Galeon removes it.

### One-Paragraph Description

Galeon is privacy infrastructure for on-chain finance. Receivers get a fresh, unlinkable address for every payment. Senders break the on-chain trail through privacy pools, not mixers. And when compliance matters, a selective disclosure layer called Shipwreck generates tax-ready reports on demand. The goal is to let businesses transact on-chain without broadcasting their financial data to the world, while giving auditors exactly the visibility they need.

### Discord

Interesting thread on transaction privacy. One thing we keep running into with institutional use cases is that the privacy vs. compliance tension isn't theoretical. It's the actual blocker. We've been building around selective disclosure keys, where privacy is the default but you can hand an auditor a scoped view when you need to. Working well so far.

Re: ZK proofs and gas costs. We went deep on this. Right now withdrawals work with individual proofs per deposit. We're working on a model that would make withdrawals constant-time regardless of deposit history, but that's still in development.

### Twitter / X

**Hook 1:**
Every payment you make on a public chain is a press release you didn't consent to. Payroll, treasury moves, supplier invoices, all visible to anyone watching. We're building compliant privacy infrastructure to fix that.

**Hook 2:**
On-chain payments with the privacy of a bank wire, where auditors can still verify everything on demand. Galeon makes both possible at the same time.

**Hook 3:**
Mixers hide everything. Privacy pools let you prove your funds are clean without revealing who you are. One is a blunt tool, the other is financial infrastructure. We're building the second one.

### Ecosystem Outreach

We're the team behind Galeon, a compliant privacy infrastructure protocol. We built stealth addresses for receiver privacy, privacy pools for sender anonymity, and a compliance layer called Shipwreck for on-demand tax reporting. The architecture is proven and we're looking to bring it to new ecosystems.

Our thesis is simple. The next wave of institutional and enterprise adoption needs a native privacy layer that doesn't compromise on compliance. We see this as a core protocol primitive, something other builders can plug into to create more sophisticated payment applications. We'd love to explore how this fits into what you're building.
