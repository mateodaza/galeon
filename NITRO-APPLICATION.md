# Nitro Accelerator — Application Draft

> Deadline: March 14, 2026
> Apply at: https://nitroacc.xyz/apply
> Character limits noted per field. Draft answers below.

---

## Company Information

**Company / Project name** (100 chars)
Galeon

**Email**
mateodaza@gmail.com

**One-line description** (50 chars)
On-chain private payments with built-in compliance

**What are you building?** (2000 chars)

Galeon is privacy infrastructure for on-chain finance. We combine stealth addresses (EIP-5564/6538) with Privacy Pools and a compliance layer so that payments can be private without being opaque to regulators.

The problem is that every on-chain transaction is public, so payroll, vendor payments, and treasury moves are all visible to competitors, employees, and anyone with a block explorer, making it impossible for businesses to operate normally. Existing privacy tools (Tornado Cash, mixers) solved this by making everything anonymous, which made them unusable for legitimate use and got them sanctioned.

Privacy Pools, based on the 2023 paper co-authored by Vitalik Buterin and Chainalysis's Jacob Illum, proved you can have both: users deposit into a pool and prove their funds come from a compliant set (an Association Set Provider tree) without revealing which specific deposit is theirs, giving the user privacy while keeping the system auditable.

Galeon implements this end-to-end:

- Ports: stealth addresses that give receivers a unique address per payment, so no one can link multiple payments to the same recipient.
- Privacy Pool: ZK-based sender privacy where only ASP-verified funds can enter. Withdrawals use a relayer so the receiver's address never appears in the transaction.
- Shipwreck: tax compliance reports generated on demand, with PDF export for US and Colombian jurisdictions, integrated directly into the protocol.

The full flow works on Mantle mainnet today: create a Port, share the link, payer sends to a stealth address, funds enter the pool, receiver withdraws privately, tax report ready, with all ZK proofs generated client-side.

We're currently on Mantle, where gas costs for ZK proof verification are higher than ideal, so we're migrating to a cheaper EVM chain. The protocol is chain-agnostic by design with standard Solidity contracts, EVM-native ZK verification, and no chain-specific dependencies.

---

## Founders

### Founder 1

**Full Name**: Mateo Daza
**Role in the company**: Co-founder
**X Handle**: @mateodazab
**LinkedIn username**: mateo-daza-448469170
**Telegram**: @mateodaza
**GitHub username**: mateodaza

**Why are you the right founder to build this?** (2000 chars)

7+ years shipping Web3 products, not research or theory.

At Asymmetry Finance I led frontend for a DeFi protocol that reached $30M TVL, shipping 4 products in under 2 years. At Giveth I led engineering for a zero-fee donation platform that processed $4M+ in crypto donations from 6,000+ unique donors across 2,600+ projects, built multi-chain infrastructure across Ethereum, Gnosis, Optimism, and Polygon, and shipped a token rewards system that distributed $900K+ to donors. At DexFreight I built the mobile app for a blockchain logistics startup that went through 500 Startups Miami.

Outside of my regular work, I co-founded Ethereum Colombia, organized 20+ events, and supported operations for Devcon VI Bogota. I'm a two-time ETHGlobal finalist (Blobscan, the first blob explorer for EIP-4844, and Sippy, a WhatsApp-native stablecoin wallet) and won the Mantle Global Hackathon 2025 RWA Track with Galeon.

That track record matters because Galeon requires someone who can work across the full stack and ship fast. Carlos and I built the entire protocol ourselves: stealth address library, ZK privacy pool contracts, backend API with SIWE auth, relayer service, indexer, compliance reports, and the frontend. No contractors, no outsourced code. I understand Poseidon hashing, BN254 curves, and the Powers of Tau trust model, and I also understand why tax compliance and ASP economics matter for real adoption. Most privacy teams are cryptographers who ignore compliance, or fintech people who don't touch ZK. We bridge both.

I'm building Galeon because financial privacy should be infrastructure, not a feature, and that's a decade-long commitment I'm here for.

**Video content or long form writing links** (optional, 2000 chars)
https://www.youtube.com/watch?v=hQtixMfDP1M
https://github.com/mateodaza/galeon

### Founder 2

**Full Name**: Carlos Quintero
**Role in the company**: Co-founder
**X Handle**: @CarlosQ096
**LinkedIn username**: carlos-quintero-076a36153
**Telegram**: @cquinterom096
**GitHub username**: CarlosQ96

**Why are you the right founder to build this?** (2000 chars)

8 years building software across e-commerce, fintech, travel tech, and web3. Backend engineer and DevOps by trade, comfortable across stacks from Ruby on Rails to Node.js, with hands-on experience in Flutter, React Native, and AWS infrastructure.

I spent 4 years at Koombea, one of Colombia's leading software development firms, shipping production applications for real clients. The projects I'm most proud of: DoitCenter, an e-commerce platform for a major supermarket franchise in Panama where I built site functionality and a mobile app; Tuily, a fintech credit card lending platform for small and mid-sized businesses; and Flightlogger, a mobile app for real-time flight itinerary tracking. These taught me to deliver production-grade systems under real constraints.

After Koombea, I joined Giveth for 4 years as a backend engineer, referred by Mateo. Giveth is a zero-fee multi-chain donation platform funding public goods globally. I integrated multi-chain wallets, smart contracts, and web3 APIs to extend the platform's capabilities, and that's where I learned to build crypto-native infrastructure with real users and real money flowing through it.

Outside of work, I co-founded Quillalabs, organizing 10+ events to build a web3 community in Barranquilla. We cooperated with other communities across Colombia, which led to the creation of Ethereum Colombia.

This versatility matters because Galeon requires a team that can architect production-grade applications end to end. Mateo and I built the entire protocol, including stealth addresses, ZK privacy pool contracts, backend API, relayer, indexer, and frontend, in record time for the Mantle Hackathon and won the RWA Track. A product like this demands a team that works across multiple stacks and delivers fast. We are that team, built on trust forged over years of working together since university.

We are committed to building Galeon. Privacy and compliance are a constant challenge in web3 that needs to be addressed, and that is our mission.

---

## Team Details

**How did founders meet and duration working together full-time?** (3000 chars)

We met at Universidad del Norte in Barranquilla around 2014 and have been close friends since. Our working relationship started at Giveth, where Mateo referred Carlos and we spent about four years building open-source donation infrastructure together. Giveth wasn't a side project, it was a zero-fee donation platform that processed $4M+ in crypto donations from 6,000+ unique donors across 2,600+ projects. Mateo led engineering and shipped multi-chain donation infrastructure across Ethereum, Gnosis Chain, Optimism, and Polygon, plus a token rewards system that distributed $900K+ to donors, and Carlos worked alongside him through that entire build. That's where we learned to ship real crypto products with real users and real money flowing through them.

After Giveth, 2025 and 2026 became our entrepreneurship years. We started competing in hackathons together, and the pattern held: we build fast, we ship, we iterate. We won the Mantle Global Hackathon 2025 RWA Track with Galeon, and that was the moment the idea clicked into something worth committing to full-time, so we decided to go independent.

The friendship matters because we trust each other's judgment under pressure, and we've proven we can build together for extended periods without burning out, from four years at Giveth shipping to thousands of real users, through a hackathon season, to Galeon now. We know how each other works.

What we've shipped together on Galeon:

- A stealth address library implementing EIP-5564/6538 with per-port key derivation (34 tests, documented, audited internally).
- Privacy Pool smart contracts with Poseidon/BN254 ZK verification, ASP inclusion/exclusion trees, relayer support, and ragequit capability (216 tests, deployed to Mantle mainnet).
- A full backend API: SIWE authentication, JWT refresh tokens, port lifecycle management, fog payment tracking, on-chain verification jobs (145 tests).
- A Ponder indexer for event processing with merkle leaves API for correct state tree reconstruction.
- A relayer service that submits withdrawals on behalf of users so their address never appears on-chain.
- ASP auto-approve service that validates and approves deposits into the inclusion tree every 30 seconds.
- Shipwreck tax compliance reports with PDF export for US and Colombian jurisdictions.
- A Next.js frontend with the complete flow: onboarding, port creation, payment links, stealth address payments, pool deposits, private withdrawals, payment history, and a vendor dashboard.

We work well together because we're both technical and both ship. There's no "business guy waiting for the technical guy to finish." We pair on architecture decisions and split implementation, and the 395+ tests across the codebase reflect how we work: build it, prove it works, move on.

We're based in Barranquilla, Colombia. Both committed full-time.

**All founders committed full-time?**
Yes

**Current location of founders** (300 chars)
Barranquilla, Colombia (both founders). Available for 1-month NYC residency.

**How will you spend $500k if selected?** (3000 chars)

Security + ZK audit: $60K. Our Privacy Pool is forked from 0xbow, which has three published audits by Oxorio covering both contracts and ZK circuits. We use 0xbow's circuits as-is but made meaningful contract modifications: deposit gating through GaleonRegistry (Port-only deposits, verified balance tracking, blocklist), UUPS upgradeability for all pool contracts, merge-on-deposit integration, and mutable verifiers for circuit upgrades. On top of that, we built entirely custom components: the stealth address library (EIP-5564/6538), GaleonRegistry (compliance layer), and the ERC-5564 announcer with trusted relayer support. A delta audit scoped to our modifications and custom code, not the already-audited upstream pool and circuits.

Founder salaries: $192K (2 founders, $8K/month, 12 months). We're based in Colombia where cost of living is low, and $8K/month lets us focus entirely on Galeon without side work.

Relayer infrastructure: $15K. Cloud hosting, monitoring, and gas reserves for the relayer service that enables private withdrawals. As we migrate to a cheaper chain, gas costs drop significantly.

Legal and operations: $50K. Entity setup, compliance review, accounting, and regulatory guidance for operating privacy infrastructure across jurisdictions. We need a proper legal structure before onboarding pilot customers.

Go-to-market and partnerships: $83K. Developer documentation, integration guides, conference attendance, pilot customer onboarding, and content production. Privacy infrastructure grows through trust and technical credibility, so this covers the work needed to get Galeon into the hands of integrators and early customers.

Buffer: $100K. Runway extension or unexpected costs like audit findings that require rework, gas economics that change, or compliance requirements in new jurisdictions.

Total: $500K. Within the 3-month Nitro program we aim to hit three milestones: security audit complete, new blockchain deployment live, and first pilot customers onboarded. The remaining runway extends to 12 months, giving us time to grow usage, strengthen and decentralize the ASP through compliance partnerships, decentralize the relayer, and close a seed round from a position of strength rather than desperation.

---

## Problem

**What problem are you solving and why?** (3000 chars)

On-chain finance is fully transparent by default, meaning every transaction, every balance, and every counterparty relationship is visible to anyone with a block explorer. For individuals this is a privacy issue, and for businesses it's an operational risk.

A company paying employees on-chain exposes every salary to the entire org, a DAO paying a vendor reveals the contract size to competitors, and a fund moving capital telegraphs strategy before execution. Payroll providers, treasury tools, and RWA platforms all face this: the moment money moves on-chain, operational confidentiality disappears.

This isn't hypothetical, as tokenized real-world assets have already reached roughly $24B and are projected to grow to $2-16T by 2030 (BCG, McKinsey estimates). As institutions move more financial activity on-chain, the transparency problem scales with them, and while privacy isn't the only barrier to institutional adoption, it's a hard one that, until solved, will keep certain categories of on-chain finance from working.

The existing approaches failed for a clear reason: they treated privacy and compliance as a binary choice.

Tornado Cash chose maximum privacy with zero compliance, and while it worked technically, it got sanctioned because regulators couldn't distinguish legitimate users from illicit ones and the protocol couldn't help them do so.

Traditional financial rails chose compliance with zero privacy, which works for institutions but can't operate on transparent blockchains where every counterparty can see your activity.

The Privacy Pools model, formalized in a 2023 paper by Vitalik Buterin, Jacob Illum (Chainalysis), and others, proved there's a third path: users prove their funds belong to a compliant set without revealing which specific funds are theirs, so the protocol enforces compliance while the user retains privacy and regulators can verify the system works without surveilling individuals.

Galeon builds on this research to deliver a complete infrastructure layer: receiver privacy through stealth addresses, sender privacy through ZK proofs, and compliance through ASP-gated inclusion trees and on-demand tax reports, delivering both privacy and compliance as a protocol primitive.

**Closest comparables and competitive insight** (3000 chars)

Railgun is the closest comparable, offering privacy on EVM using ZK proofs. They've processed significant volume and proved demand exists. They have Private Proofs of Innocence (PPOI) for compliance, 0zk addresses for receiver privacy, and Koinly tax exports. The key difference is architectural: Railgun uses a blocklist model (prove you're NOT on a bad list) while Galeon uses Privacy Pools, an allowlist model (prove you ARE in a compliant set via ASP attestation), which aligns more closely with the Privacy Pools paper and emerging regulatory direction. Railgun also requires shielding into a monolithic pool contract, while Galeon uses EIP-5564 stealth addresses that generate standard Ethereum addresses composable with existing DeFi without wrapping or unwrapping.

0xbow built Privacy Pools on Ethereum, directly implementing the Privacy Pools paper. Vitalik was one of the first depositors, and they've processed ~$6M in volume with 1,500+ users since March 2025, and raised a $3.5M seed led by Starbloom Capital with participation from Coinbase Ventures. 0xbow is the primitive, the pool mechanism with ASP-gated inclusion trees. Galeon builds on top of this architecture and adds the layers that make it usable end-to-end: stealth addresses for receiver privacy (EIP-5564/6538), a relayer for on-chain sender anonymity, and Shipwreck for tax compliance. We're not competing with 0xbow; we're building the product layer that makes their research usable for businesses.

Aztec is building a privacy-first L2 with full programmable privacy, which is ambitious and technically impressive but constitutes a separate ecosystem that isn't EVM-native. Projects building on Ethereum, Mantle, Base, or any EVM chain can't use Aztec's privacy without migrating to their rollup, while Galeon deploys as standard Solidity contracts on any EVM chain with no ecosystem switch required.

Zcash pioneered ZK-based privacy at the protocol level but lives in its own chain with limited DeFi and no EVM compatibility, so while the privacy tech is proven, the ecosystem remains isolated.

Our competitive insight: no other protocol combines EIP-5564/6538 stealth addresses, Privacy Pools (allowlist-based compliance), and integrated tax reporting in a single implementation. Railgun has privacy + compliance + tax exports, but uses a different architecture (blocklist model, monolithic shielded pool, proprietary address format). 0xbow has the Privacy Pools primitive but not the product layer. We assembled the specific combination that the Privacy Pools paper envisioned into end-to-end infrastructure that a business can actually use.

Our moat comes from the integration, not any single standard. Combining these primitives correctly requires understanding ZK circuits, on-chain verification, stealth address cryptography, ASP economics, and tax compliance across jurisdictions simultaneously. We've already done this work.

---

## Solution

**Product development stage**
MVP/demo exists

**Product Link** (500 chars)
https://galeon.finance
https://github.com/mateodaza/galeon

**What changed in tech/market timing?** (2000 chars)

Three things converged in the last twelve months that made Galeon possible and timely.

First, the standards arrived: EIP-5564 (stealth addresses) and EIP-6538 (stealth meta-address registry) gave the ecosystem a shared specification for receiver privacy on EVM. Before these, every stealth address implementation was custom and incompatible, but now there's a standard to build on.

Second, the Privacy Pools model was validated: the 2023 paper by Buterin, Illum, and others showed that compliance-compatible privacy was theoretically possible. In March 2025, 0xbow shipped it on Ethereum mainnet. The momentum accelerated in late 2025 when the Ethereum Foundation launched Kohaku, a privacy wallet SDK, and created a 47-member Privacy Cluster to make privacy a first-class network property. Then in January 2026, the Ethereum leadership declared this the year to take back lost ground on self-sovereignty, backed by $45M in ETH committed to open-source security and privacy projects. The ecosystem moved from "privacy is nice to have" to "privacy is core infrastructure."

Third, the market pressure materialized as tokenized RWAs crossed $24B. Institutional players entering on-chain finance are discovering that full transparency is a dealbreaker for operations like payroll, vendor payments, and treasury management, and the demand for private-but-compliant transactions went from theoretical to urgent.

Two years ago you couldn't build Galeon because the standards didn't exist, the research wasn't proven, and the market wasn't ready. One year from now the window for first-movers who assemble these primitives into working infrastructure starts closing, and we're building at the right time.

**Dune Dashboard link** (optional)
_(leave blank)_

**Analytics dashboard link** (optional)
_(leave blank)_

---

## Market

**Target segment for next 3-6 months** (3000 chars)

Our immediate target is crypto-native users and organizations that already operate on-chain and feel the transparency pain today. Specifically:

DAO treasuries and contributor payments. DAOs pay contributors, contractors, and grant recipients on-chain, making every payment visible to every other contributor and to the public, so compensation effectively becomes a public record. DAOs with treasury management tools (like Gnosis Safe, Utopia, Parcel) need a way to pay privately while maintaining internal accountability. Galeon's Ports give each recipient a unique stealth address, the pool breaks the on-chain link, and Shipwreck generates the compliance trail the DAO needs.

Crypto payroll providers. Companies like Deel, Request Network, and Franklin are processing payroll on-chain. Their clients are discovering that on-chain payroll means every employee can see what every other employee earns, and privacy isn't optional for payroll since it's a legal requirement in many jurisdictions. We're targeting integration partnerships with these providers: they handle the payroll logic, we provide the privacy layer.

Privacy-conscious DeFi users. Individual users who want to use DeFi without their entire portfolio being trackable. This segment already exists (Railgun, 0xbow's Privacy Pools have demonstrated demand), and Galeon is built as a consumer product these users can start using directly.

For the first 3-6 months we're focused on direct user adoption through galeon.finance while exploring integration partnerships in parallel. We're a consumer app today, and the same protocol can become infrastructure that other projects plug into over time.

No geographic limitation. Privacy is a global need and the product works on any EVM chain from any location. We're based in Colombia, which gives us firsthand experience with cross-border payment friction, but the product is for anyone transacting on-chain who needs privacy with compliance.

**Market entry strategy** (3000 chars)

Our entry strategy has three layers, ordered by time-to-value.

Layer 1 (months 1-2): Direct user adoption through galeon.finance. The product already has a complete user flow — create an account, set up a Port, share a payment link, receive privately, withdraw privately, generate tax reports. The first goal is getting real users through the full flow: privacy-conscious individuals, DAO contributors tired of public salaries, and anyone making on-chain payments who wants privacy with compliance. We'll reach them through crypto communities, content, and direct outreach to DAO operators.

Layer 2 (months 2-4): Pilot customers. We need 3-5 organizations actually using Galeon for real payments, and these won't come from marketing but from relationships built during the Nitro program and direct conversations with DAO operators and crypto-native companies. The Nitro cohort itself is a potential source: 15 teams, many of which probably pay contributors on-chain, and we'd offer to be the privacy layer for the cohort's own payments as a live demonstration.

Layer 3 (months 4-6): Content and ecosystem presence. Technical blog posts on how Privacy Pools work in practice (not theory), how Shipwreck handles multi-jurisdiction tax compliance, and how stealth addresses solve receiver privacy. This content builds credibility with both users and potential integration partners, because privacy products grow through trust and technical depth rather than hype cycles.

What we're not doing: token launches, airdrop campaigns, or incentivized TVL, because privacy infrastructure earns adoption through trust and integration rather than token speculation, and the growth will be slower but more durable.

The Nitro program maps directly to this strategy. Month 1 in NYC: product teardowns and UX audits to make the user experience as frictionless as possible. Months 2-3: growth experiments with the specific segments above. Demo Day: present to 250+ investors with real usage data, not projections.

**Traction achieved so far** (5000 chars)

We're pre-launch with no external users, no revenue, and no LOIs.

What we have: a complete product working end-to-end on Mantle mainnet (395+ tests across the stack), a hackathon win validating the concept, and strong category demand signals — 0xbow and Railgun have collectively proven that users want compliant on-chain privacy.

No design partners yet — that's the honest gap. We built the protocol first because in privacy infrastructure you can't fake the cryptography. Now that it works, the next phase is getting it into people's hands, which is specifically what we're applying to Nitro for.

Open source from day one at github.com/mateodaza/galeon.

**Blockchain selection**
_(select Mantle in dropdown)_

**Company category**
_(select Privacy in dropdown)_

---

## Fundraising

**Previous fundraising experience**
No

**Currently fundraising**
No

**Current runway in months**
0

---

## Application Motivation

**What attracts you to Nitro?** (3000 chars)

We have a working protocol with no users. The transition from "technically complete" to "people depend on it" is where we need structured help, and Nitro maps to exactly where we are. We are really interested in:

- NYC month: product teardowns and UX audits to fix friction points before we push for adoption. Privacy products have historically terrible UX and we need outside eyes on the flow.

- Peer cohort: 14 other teams building on-chain products means 14 potential integration conversations with teams that need a privacy layer but wouldn't build one themselves.

- Investor network: Demo Day in front of 250+ investors who understand infrastructure bets is more valuable than months of cold outreach. Privacy is a long-term play that needs investors who think in 5-10 year timescales.

The anti-hype positioning is what resonates most. We've been shipping without funding, without a token, and without Twitter threads. Nitro seems to value that, and we want to be around founders who work the same way.

**Mentor question selection** (3000 chars)

[RECOMMENDED: Haseeb Qureshi, Dragonfly]

Question: We have a working privacy protocol with no users. Privacy products historically struggle to get the first wave of adoption because the privacy guarantees improve with more users (anonymity sets), but early users get the weakest privacy. How have you seen infrastructure projects break through this cold-start problem, and what would you prioritize in our first 3 months to get from zero to meaningful usage?

[ALTERNATIVE: Maria Shen, Electric Capital]

Electric Capital publishes the most rigorous developer ecosystem data in crypto. Maria understands how infrastructure adoption actually happens.

Question: Electric Capital's developer reports track where builders concentrate, and privacy infrastructure on EVM is still a thin category where most developer activity is in DeFi, L2s, and consumer apps. For infrastructure like Galeon (stealth addresses + privacy pools + compliance), the adoption path runs through integration with existing products rather than direct consumer acquisition. Based on what you've seen in how infrastructure categories go from "interesting but unused" to "default dependency," what's the most reliable early signal that an infra project is on the right trajectory, and what's the most common mistake infra teams make in the gap between "working product" and "ecosystem adoption"?

---

## Program Commitment

**Exclusive participation commitment**
Yes

**Full 1-month NYC residency attendance**
Yes

**What was accomplished last week?** (3000 chars)

Won the Mantle Global Hackathon 2025 (RWA Track) and recorded the full product demo linked above.

Completed a strategic chain review: migrating to Base as our primary deployment for lower gas costs (~$0.003 per Groth16 proof verification vs dollars on other chains), the largest L2 user base for stronger anonymity sets, and confirmed BN254 precompile support. Our contracts are standard Solidity with EVM precompiles, so migration is a redeployment, not a rewrite.

Finalized this Nitro application.

---

## Final Checklist Before Submitting

- [x] Paste demo video link into Founder 1 video/writing field
- [x] Carlos writes his own "why are you the right founder" answer
- [x] Fill in the "how founders met" story
- [x] Decide on target migration chain (Base primary, Mantle current)
- [x] Fill in current runway honestly (0)
- [x] Review all answers against fact-check.md — no unshipped claims
- [ ] Select blockchain in form dropdown (Mantle)
- [ ] Select company category in form dropdown (Infrastructure)
- [ ] Submit
