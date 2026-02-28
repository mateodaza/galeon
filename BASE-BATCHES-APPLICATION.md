# Base Batches 003: Start-up Track — Application Draft

> Deadline: February 23, 2026
> Apply at: https://devfolio.co (Base Batches 003)

---

## Company Information

**Company Name**
Galeon

**Website / Product URL**
https://www.galeon.finance/

**If your GitHub repo is private, have you added "devfolio-judge" as a collaborator?**
Yes

**Describe what your company does (~50 characters or less)**
On-chain private payments with built-in compliance

**What is your product's unique value proposition?**

Galeon is the only protocol that combines EIP-5564/6538 stealth addresses, Privacy Pools (allowlist-based compliance), and integrated tax reporting in a single implementation.

Stealth addresses give receivers a unique one-time address per payment, so no one can link multiple payments to the same person. The Privacy Pool lets senders deposit into a ZK-verified pool where only ASP-approved funds can enter, and withdrawals use a relayer so the receiver's address never appears on-chain. Shipwreck generates tax compliance reports on demand with PDF export.

The result: payments can be private without being opaque to regulators. Privacy is a right, compliance is a responsibility — we deliver both as a protocol primitive.

Architecturally, we use an allowlist model (prove you ARE in a compliant set) rather than a blocklist model (prove you're NOT on a bad list), which aligns with the Privacy Pools paper by Vitalik Buterin and Chainalysis's Jacob Illum and with emerging regulatory direction.

**Where are you located now, and where would the company be based after the program?**

Barranquilla, Colombia (both founders). After the program, we'd remain remote-first from Colombia with flexibility to be present in SF or NYC for key milestones. Colombia gives us low cost of living and firsthand experience with cross-border payment friction — but the product is for anyone transacting on-chain.

**Founder(s) Names & Contact Information**

Mateo Daza — Co-founder
X: @mateodazab | Telegram: @mateodaza | GitHub: mateodaza | Email: mateodaza@gmail.com

Carlos Quintero — Co-founder
X: @CarlosQ096 | Telegram: @cquinterom096 | GitHub: CarlosQ96 | Email: carlos.quintero096@gmail.com

**Please enter the URL of a ~1-minute unlisted video introducing the founder(s) & what you're building**

https://www.youtube.com/watch?v=hQtixMfDP1M

_(Note: this is our full demo video from the Mantle Hackathon. We should record a shorter 1-min founder intro specifically for this application.)_

---

## Users & Traction

**Do you have users or customers? If yes: how many active users/customers, how many are paying, who pays you the most and how much?**

No external users yet. The protocol is live on Mantle mainnet with the full flow working end-to-end: stealth address payments, pool deposits, private withdrawals, and tax report generation. We're pre-launch — we built the protocol first because in privacy infrastructure you can't fake the cryptography. Now that it works, we're migrating to Base and preparing for user onboarding.

Demand is validated externally: 0xbow shipped Privacy Pools on Ethereum in March 2025, has ~$6M in volume and 1,500+ users, and raised $3.5M from Coinbase Ventures. Railgun processes significant volume. The category is proven, we're building the product layer on top of it.

**Please include any Dune analytics dashboards and/or public smart contract addresses you've deployed as part of your project**

Deployed on Mantle mainnet. Contract addresses available in our GitHub repo: https://github.com/mateodaza/galeon

Dune dashboard in development — contracts are not yet decoded on Dune.

**Anything else you'd like us to know?**

We won the Mantle Global Hackathon 2025 (RWA Track). We're migrating to Base as our primary chain — the technical reasoning is detailed in our "Why Base Batches" answer, but the short version: we researched every major EVM chain and Base won on gas costs, user base, and ZK precompile support.

Open source from day one. 395+ tests across the stack (216 contract tests, 145 API tests, 34 stealth library tests). No contractors, no outsourced code — everything built by the two founders.

---

## Product & Market

**What is your ideal customer profile?**

Three segments, ordered by go-to-market priority:

1. Privacy-conscious DeFi users who want to use on-chain finance without their entire portfolio being trackable. This segment already exists — Railgun and 0xbow have proven demand.

2. DAO treasuries and contributor payments. DAOs pay contributors on-chain, making every payment visible to everyone. Galeon gives each recipient a unique stealth address and breaks the on-chain link through the pool.

3. Crypto payroll providers (Deel, Request Network, Franklin) who need a privacy layer for on-chain salary payments. Privacy isn't optional for payroll — it's a legal requirement in many jurisdictions.

**Which category best describes your company?**

DeFi / Privacy Infrastructure

---

## Team

**Who writes code or handles technical development? Was any of this work done by non-founders?**

Both founders write code. Mateo leads frontend, stealth address cryptography, and ZK integration. Carlos leads backend, infrastructure, and smart contract development. All code was written by the two of us — no contractors, no outsourced work.

The full stack: stealth address library (EIP-5564/6538), Privacy Pool contracts with Poseidon/BN254 ZK verification, AdonisJS backend API with SIWE auth, Ponder indexer, relayer service, ASP auto-approve service, Shipwreck tax reports, and a Next.js frontend with the complete payment flow.

**How long have the founders known each other and how did you meet?**

Since ~2014 at Universidad del Norte in Barranquilla. We spent four years building together at Giveth, a zero-fee donation platform that processed $4M+ in crypto donations from 6,000+ unique donors across 2,600+ projects. Mateo led engineering (multi-chain infrastructure across Ethereum, Gnosis, Optimism, Polygon + a token rewards system distributing $900K+ to donors), Carlos worked alongside as backend engineer (multi-chain wallets, smart contracts, web3 APIs). After Giveth, we co-founded Quillalabs (10+ web3 events in Barranquilla) which led to Ethereum Colombia (20+ events, Devcon VI Bogota support).

We've been building together for over a decade. We know how each other works.

---

## Progress

**How far along are you?**

MVP/demo exists. Full protocol live on Mantle mainnet. Migrating to Base.

What's shipped:

- Stealth address library (EIP-5564/6538, per-port key derivation, 34 tests)
- Privacy Pool contracts (Poseidon/BN254 ZK verification, ASP inclusion trees, relayer support, ragequit, 216 tests)
- Backend API (SIWE auth, JWT refresh, port management, payment tracking, 145 tests)
- Ponder indexer for event processing
- Relayer service for anonymous withdrawals
- ASP auto-approve service
- Shipwreck tax compliance (PDF export, US + Colombian jurisdictions)
- Next.js frontend with full flow: onboarding → port creation → payment links → stealth payments → pool deposits → private withdrawals → tax reports

What's next: Base deployment, security audit, first users.

**How long have you been working on this? How much of that time full-time vs part-time?**

Started building for the Mantle Global Hackathon in late 2025. Won the RWA Track. Committed full-time since the hackathon win. Both founders are full-time, no side work.

---

## Motivation & Fundraising

**Why do you want to join Base Batches?**

We have a working protocol with no users. The gap between "technically complete" and "people depend on it" is where we need help.

Base Batches maps to exactly where we are:

1. We're already migrating to Base — this decision predates this application. We researched every major EVM chain and Base won on the three things that matter most for a ZK privacy protocol: gas costs (~$0.003 per Groth16 proof verification vs dollars on other chains), user base size (larger anonymity sets = stronger privacy guarantees), and confirmed BN254 precompile support (ecAdd, ecMul, ecPairing — required for our on-chain ZK verification). Our contracts are standard Solidity with no chain-specific dependencies, so migration is a redeployment, not a rewrite.

2. We need structured support for go-to-market. Privacy products historically have terrible UX and cold-start problems (anonymity sets improve with more users, but early users get the weakest privacy). We need mentorship and peer feedback to nail the first user experience.

We've been shipping without funding, without a token, and without hype.

**Revenue (if any): monthly / last few months / sources**

$0. Pre-launch, no revenue.

**Who referred you to this program?**

_(leave blank or fill in if someone referred you)_

---

## Checklist Before Submitting

- [ ] Record 1-minute founder intro video (current video is the full demo, need a shorter version)
- [ ] Add devfolio-judge as GitHub collaborator
- [ ] Verify all character limits on actual form
- [ ] Submit before February 23
