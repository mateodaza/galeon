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
Private payments with built-in compliance on EVM

**What are you building?** (2000 chars)

Galeon is privacy infrastructure for on-chain finance. We combine stealth addresses (EIP-5564/6538) with Privacy Pools and a compliance layer so that payments can be private without being opaque to regulators.

The problem: every on-chain transaction is public. Payroll, vendor payments, treasury moves — all visible to competitors, employees, and anyone with a block explorer. Businesses can't operate like this. Existing privacy tools (Tornado Cash, mixers) solved this by making everything anonymous, which made them unusable for legitimate use and got them sanctioned.

Privacy Pools, based on the 2023 paper co-authored by Vitalik Buterin and Chainalysis's Jacob Illum, proved you can have both: users deposit into a pool and prove their funds come from a compliant set (an Association Set Provider tree) without revealing which specific deposit is theirs. Privacy for the user, auditability for the system.

Galeon implements this end-to-end:

- Ports: stealth addresses that give receivers a unique address per payment, so no one can link multiple payments to the same recipient.
- Privacy Pool: ZK-based sender privacy where only ASP-verified funds can enter. Withdrawals use a relayer so the receiver's address never appears in the transaction.
- Shipwreck: tax compliance reports generated on demand, with PDF export for US and Colombian jurisdictions. Built-in, not bolted on.

The full flow works on mainnet today: create a Port, share the link, payer sends to a stealth address, funds enter the pool, receiver withdraws privately, tax report ready. All ZK proofs generated client-side.

We're migrating to a cheaper EVM chain for lower gas costs, and the protocol is chain-agnostic by design — standard Solidity contracts, EVM-native ZK verification, no chain-specific dependencies.

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

Outside of jobs: I co-founded Ethereum Colombia, organized 20+ events, and supported operations for Devcon VI Bogota. Two-time ETHGlobal finalist (Blobscan, the first blob explorer for EIP-4844, and Sippy, a WhatsApp-native stablecoin wallet). Won the Mantle Global Hackathon 2025, RWA Track, with Galeon.

That track record matters because Galeon requires someone who can work across the full stack and ship fast. Carlos and I built the entire protocol ourselves: stealth address library, ZK privacy pool contracts, backend API with SIWE auth, relayer service, indexer, compliance reports, and the frontend. No contractors, no outsourced code. I understand Poseidon hashing, BN254 curves, and the Powers of Tau trust model, and I also understand why tax compliance and ASP economics matter for real adoption. Most privacy teams are cryptographers who ignore compliance, or fintech people who don't touch ZK. We bridge both.

I'm building Galeon because financial privacy should be infrastructure, not a feature. That's a decade-long commitment and I'm here for it.

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

After Koombea, I joined Giveth for 4 years as a backend engineer, referred by Mateo. Giveth is a zero-fee multi-chain donation platform funding public goods globally. I integrated multi-chain wallets, smart contracts, and web3 APIs to extend the platform's capabilities. That's where I learned to build crypto-native infrastructure with real users and real money flowing through it.

Outside of work, I co-founded Quillalabs, organizing 10+ events to build a web3 community in Barranquilla. We cooperated with other communities across Colombia, which led to the creation of Ethereum Colombia.

This versatility matters because Galeon requires a team that can architect production-grade applications end to end. Mateo and I built the entire protocol — stealth addresses, ZK privacy pool contracts, backend API, relayer, indexer, and frontend — in record time for the Mantle Hackathon and won the RWA Track. A product like this demands a team that works across multiple stacks and delivers fast. We are that team, built on trust forged over years of working together since university.

We are committed to building Galeon. Privacy and compliance are a constant challenge in web3 that needs to be addressed, and that is our mission.

---

## Team Details

**How did founders meet and duration working together full-time?** (3000 chars)

Mateo and Carlos met at Universidad del Norte in Barranquilla around 2014 and have been close friends since. The working relationship started at Giveth, where Mateo referred Carlos and they spent about four years together building open-source donation infrastructure. Giveth wasn't a side project — it was a zero-fee donation platform that processed $4M+ in crypto donations from 6,000+ unique donors across 2,600+ projects. Mateo led engineering and shipped multi-chain donation infrastructure across Ethereum, Gnosis Chain, Optimism, and Polygon, plus a token rewards system that distributed $900K+ to donors. Carlos worked alongside him through that entire build. That's where we learned to ship real crypto products with real users and real money flowing through them.

After Giveth, 2025 and 2026 became our entrepreneurship years. We started competing in hackathons together, and the pattern held: we build fast, we ship, we iterate. We won the Mantle Global Hackathon 2025, RWA Track, with Galeon. That was the moment the idea clicked into something worth committing to full-time. We decided to go independent.

The friendship matters because we trust each other's judgment under pressure. We've proven we can build together for extended periods without burning out. Four years at Giveth shipping to thousands of real users, then a hackathon season, now Galeon. We know how each other works.

What we've shipped together on Galeon:

- A stealth address library implementing EIP-5564/6538 with per-port key derivation (34 tests, documented, audited internally).
- Privacy Pool smart contracts with Poseidon/BN254 ZK verification, ASP inclusion/exclusion trees, relayer support, and ragequit capability (216 tests, deployed to Mantle mainnet).
- A full backend API: SIWE authentication, JWT refresh tokens, port lifecycle management, fog payment tracking, on-chain verification jobs (145 tests).
- A Ponder indexer for event processing with merkle leaves API for correct state tree reconstruction.
- A relayer service that submits withdrawals on behalf of users so their address never appears on-chain.
- ASP auto-approve service that validates and approves deposits into the inclusion tree every 30 seconds.
- Shipwreck tax compliance reports with PDF export for US and Colombian jurisdictions.
- A Next.js frontend with the complete flow: onboarding, port creation, payment links, stealth address payments, pool deposits, private withdrawals, payment history, and a vendor dashboard.

We work well together because we're both technical and both ship. There's no "business guy waiting for the technical guy to finish." We pair on architecture decisions and split implementation. The 395+ tests across the codebase reflect how we work: build it, prove it works, move on.

We're based in Barranquilla, Colombia. Both committed full-time.

**All founders committed full-time?**
Yes

**Current location of founders** (300 chars)
Barranquilla, Colombia (both founders). Available for 1-month NYC residency.

**How will you spend $500k if selected?** (3000 chars)

Security audit: $80K. Our ZK circuits and smart contracts need a professional audit before we can credibly serve businesses. This is the single most important spend.

ZK consultant: $35K for a 3-month engagement. We built the circuits ourselves, but an external review focused on audit preparation and circuit optimization would catch issues we're too close to see.

Founder salaries: $192K (2 founders, $8K/month, 12 months). We're based in Colombia where cost of living is low. $8K/month lets us focus entirely on Galeon without side work.

Relayer infrastructure: $15K. Cloud hosting, monitoring, and gas reserves for the relayer service that enables private withdrawals. As we migrate to a cheaper chain, gas costs drop significantly.

Legal and operations: $28K. Entity setup, compliance review, and accounting. We need a proper legal structure before onboarding pilot customers.

Buffer: $150K. Runway extension or unexpected costs. Building privacy infrastructure involves unknowns — audit findings that require rework, gas economics that change, compliance requirements in new jurisdictions. The buffer gives us room to handle what comes up without rushing.

Total: $500K for 12 months of runway to hit three milestones: audit complete, relayer MVP with decentralized architecture, and 3 pilot customers with real usage. Those milestones make us seed-ready.

The Nitro program specifically helps with the gap between "working protocol" and "used product." We have the protocol. Product teardowns, UX audits, and growth experiments during the NYC month would directly accelerate the path to pilot customers.

---

## Problem

**What problem are you solving and why?** (3000 chars)

On-chain finance is fully transparent by default. Every transaction, every balance, every counterparty relationship is visible to anyone with a block explorer. For individuals this is a privacy issue. For businesses it's an operational risk.

A company paying employees on-chain exposes every salary to the entire org. A DAO paying a vendor reveals the contract size to competitors. A fund moving capital telegraphs strategy before execution. Payroll providers, treasury tools, and RWA platforms all face this: the moment money moves on-chain, operational confidentiality disappears.

This isn't hypothetical. Tokenized real-world assets have reached roughly $24B and are projected to grow to $2-16T by 2030 (BCG, McKinsey estimates). As institutions move more financial activity on-chain, the transparency problem scales with them. Privacy isn't the only barrier to institutional adoption, but it's a hard one — and until it's solved, certain categories of on-chain finance simply can't work.

The existing approaches failed for a clear reason: they treated privacy and compliance as a binary choice.

Tornado Cash chose maximum privacy, zero compliance. It worked technically but got sanctioned because regulators couldn't distinguish legitimate users from illicit ones. The protocol couldn't help them do so.

Traditional financial rails chose compliance, zero privacy. They work for institutions but they can't operate on transparent blockchains where every counterparty can see your activity.

The Privacy Pools model, formalized in a 2023 paper by Vitalik Buterin, Jacob Illum (Chainalysis), and others, proved there's a third path: users prove their funds belong to a compliant set without revealing which specific funds are theirs. The protocol enforces compliance. The user retains privacy. Regulators can verify the system works without surveilling individuals.

Galeon builds on this research to deliver a complete infrastructure layer: receiver privacy through stealth addresses, sender privacy through ZK proofs, and compliance through ASP-gated inclusion trees and on-demand tax reports. Not privacy OR compliance. Both, as a protocol primitive.

**Closest comparables and competitive insight** (3000 chars)

Railgun is the closest comparable — privacy on EVM using ZK proofs. They've processed significant volume and proved demand exists. Where they differ: Railgun focuses on shielded transfers and DeFi interactions. It doesn't have a built-in compliance layer, stealth addresses for receiver privacy, or tax reporting. For individual privacy-conscious users, Railgun works. For businesses that need both privacy and compliance documentation, it's incomplete.

0xbow built Privacy Pools on Ethereum, directly implementing the Buterin et al. paper. Vitalik was one of the first depositors. They've processed ~$6M in volume with 1,500+ users since March 2025 and raised $3.5M from Coinbase Ventures. 0xbow is the primitive — the pool mechanism with ASP-gated inclusion trees. Galeon builds on top of this architecture and adds the layers that make it usable end-to-end: stealth addresses for receiver privacy (EIP-5564/6538), a relayer for on-chain sender anonymity, and Shipwreck for tax compliance. We're not competing with 0xbow; we're building the product layer that makes their research usable for businesses.

Aztec is building a privacy-first L2 with full programmable privacy. It's ambitious and technically impressive, but it's a separate ecosystem — not EVM-native. Projects building on Ethereum, Mantle, Base, or any EVM chain can't use Aztec's privacy without migrating to their rollup. Galeon deploys as standard Solidity contracts on any EVM chain. No ecosystem switch required.

Zcash pioneered ZK-based privacy at the protocol level but lives in its own chain with limited DeFi and no EVM compatibility. The privacy tech is proven but the ecosystem is isolated.

Our competitive insight: the combination of stealth addresses (EIP-5564/6538) + Privacy Pools + compliance reporting in a single protocol doesn't exist yet. Each piece exists separately — 0xbow has the pools, various wallets experiment with stealth addresses, compliance tools exist as separate services. Nobody has assembled them into end-to-end infrastructure that a business can actually use. That's the gap we fill.

The moat isn't any single standard — it's the integration. Combining these primitives correctly requires understanding ZK circuits, on-chain verification, stealth address cryptography, ASP economics, and tax compliance across jurisdictions simultaneously. We've already done this work.

---

## Solution

**Product development stage**
MVP/demo exists

**Product Link** (500 chars)
https://galeon.finance
https://github.com/mateodaza/galeon

**What changed in tech/market timing?** (2000 chars)

Three things converged in the last 18 months that made Galeon possible and timely.

First, the standards arrived. EIP-5564 (stealth addresses) and EIP-6538 (stealth meta-address registry) were finalized, giving the ecosystem a shared specification for receiver privacy on EVM. Before these, every stealth address implementation was custom and incompatible. Now there's a standard to build on.

Second, the Privacy Pools model was validated. The 2023 paper by Buterin, Illum, and others showed that compliance-compatible privacy was theoretically possible. In March 2025, 0xbow shipped it on Ethereum mainnet and Vitalik was one of the first depositors. In late 2025, the Ethereum Foundation launched Kohaku, a privacy wallet SDK, and created a 47-member Privacy Cluster to make privacy a first-class network property. In January 2026, Vitalik declared this the year Ethereum reverses its privacy compromises and committed $45M in ETH to open-source privacy projects. The ecosystem moved from "privacy is nice to have" to "privacy is core infrastructure."

Third, the market pressure materialized. Tokenized RWAs crossed $24B. Institutional players entering on-chain finance are discovering that full transparency is a dealbreaker for operations like payroll, vendor payments, and treasury management. The demand for private-but-compliant transactions went from theoretical to urgent.

Two years ago, you couldn't build Galeon — the standards didn't exist, the research wasn't proven, and the market wasn't ready. One year from now, the window for first-movers who assemble these primitives into working infrastructure starts closing. We're building at the right time.

**Dune Dashboard link** (optional)
_(leave blank)_

**Analytics dashboard link** (optional)
_(leave blank)_

---

## Market

**Target segment for next 3-6 months** (3000 chars)

Our immediate target is crypto-native businesses that already operate on-chain and feel the transparency pain today. Specifically:

DAO treasuries and contributor payments. DAOs pay contributors, contractors, and grant recipients on-chain. Every payment is visible to every other contributor and to the public. Compensation becomes a public record. DAOs with treasury management tools (like Gnosis Safe, Utopia, Parcel) need a way to pay privately while maintaining internal accountability. Galeon's Ports give each recipient a unique stealth address, the pool breaks the on-chain link, and Shipwreck generates the compliance trail the DAO needs.

Crypto payroll providers. Companies like Deel, Request Network, and Franklin are processing payroll on-chain. Their clients are discovering that on-chain payroll means every employee can see what every other employee earns. Privacy isn't optional for payroll — it's a legal requirement in many jurisdictions. We're targeting integration partnerships with these providers: they handle the payroll logic, we provide the privacy layer.

Privacy-conscious DeFi users. Individual users who want to use DeFi without their entire portfolio being trackable. This segment already exists (Railgun, 0xbow's Privacy Pools have demonstrated demand), and it serves as early adoption while we build the B2B pipeline.

For the first 3-6 months, the focus is integration partnerships over direct consumer adoption. We're infrastructure, not a consumer app. The path to users runs through projects that already have users and need privacy added to their stack.

Geographic focus: Latin America and global remote-first teams. We're based in Colombia and understand the cross-border payment friction firsthand. Crypto payroll is already common in LatAm. Privacy for cross-border payments is a real, felt need.

**Market entry strategy** (3000 chars)

Our entry strategy has three layers, ordered by time-to-value.

Layer 1 (months 1-2): Developer-facing documentation and integration examples. Galeon is open source. We'll publish integration guides showing how existing payment tools can route transactions through Galeon's stealth addresses and privacy pool. The target is 2-3 integration partners evaluating Galeon as a privacy module for their existing product. We'll reach these through direct outreach to teams building treasury tools, payroll, and payment infrastructure on EVM chains.

Layer 2 (months 2-4): Pilot customers. We need 3-5 organizations actually using Galeon for real payments. These won't come from marketing — they'll come from relationships built during the Nitro program and direct conversations with DAO operators and crypto-native companies. The Nitro cohort itself is a potential source: 15 teams, many of which probably pay contributors on-chain. We'd offer to be the privacy layer for the cohort's own payments as a live demonstration.

Layer 3 (months 4-6): Content and ecosystem presence. Technical blog posts on how Privacy Pools work in practice (not theory), how Shipwreck handles multi-jurisdiction tax compliance, how stealth addresses solve receiver privacy. This is long-cycle content that builds credibility with infrastructure-minded teams. We won't grow through crypto Twitter threads — we'll grow through technical depth that earns trust from the teams that need to evaluate our code before integrating it.

What we're not doing: token launches, airdrop campaigns, or incentivized TVL. Privacy infrastructure earns adoption through trust and integration, not through token speculation. The growth will be slower but more durable.

The Nitro program maps directly to this strategy. Month 1 in NYC: product teardowns and UX audits to make the integration experience as frictionless as possible. Months 2-3: growth experiments with the specific segments above. Demo Day: present to 250+ investors with real pilot data, not projections.

**Traction achieved so far** (5000 chars)

We'll be direct: we have a working product with no external users yet. Here's what we've built and where we stand.

What's deployed and working on mainnet:

Full protocol stack. Stealth address library (EIP-5564/6538) with per-port key derivation, 34 tests. Privacy Pool contracts with Poseidon/BN254 ZK verification, ASP inclusion/exclusion trees, relayer support, and ragequit emergency exit (216 tests). Backend API with SIWE authentication, port lifecycle management, and on-chain verification (145 tests). Ponder indexer for event processing. Total: 395+ tests across the codebase.

Complete user flow. A user can: create an account (SIWE), set up their stealth keys, create a Port (stealth address endpoint), share a payment link, receive a payment to a unique stealth address, have the payment automatically detected, deposit into the privacy pool, withdraw privately through the relayer (sender address never appears on-chain), and generate a tax compliance report. This entire flow works on mainnet today.

Relayer service. Private withdrawals where the user's address never appears in the on-chain transaction. The relayer submits the withdrawal proof on behalf of the user.

ASP auto-approve. Deposits are automatically validated and approved into the Association Set Provider's inclusion tree every 30 seconds.

Shipwreck compliance. Tax reports with PDF export supporting US and Colombian jurisdictions. Tracks unique payer thresholds ($600 for US), generates documentation that a business would need for tax filing.

Nullifier tracking. Spent deposits are filtered from balances via the indexer, preventing double-spend attempts.

What we haven't shipped:

Account model / merge-on-deposit (O(1) withdrawals regardless of deposit count). The spec is written and internally reviewed, but implementation hasn't started. This is Phase 4 of our roadmap.

Decentralized relayer network. The current relayer is centralized (operated by us). Decentralizing it is a post-audit milestone.

External users. No one outside the team has used Galeon for a real payment. This is the honest gap. We've been heads-down building the protocol and haven't yet done the distribution work to get it into people's hands.

Signals beyond code:

Won the Mantle Global Hackathon 2025, RWA Track. Evaluated by judges from the Mantle ecosystem against other teams building real-world asset infrastructure.

Open source from day one. The entire codebase is public at github.com/mateodaza/galeon. We're not asking anyone to trust claims — the code is readable.

This is a pre-traction application, and we know that's a weakness. We built the protocol first because in privacy infrastructure, the protocol has to actually work — there's no "fake it until you make it" with ZK proofs and stealth addresses. The next phase is getting it into the hands of real users and integrators. That's specifically what we're applying to Nitro for.

**Blockchain selection**
[TODO: select current chain (Mantle) + target migration chain. Consider: Base, Arbitrum, or whatever you decide to migrate to.]

**Company category**
[TODO: select from dropdown — likely "Infrastructure" or "DeFi"]

---

## Fundraising

**Previous fundraising experience**
No

**Currently fundraising**
Yes

**Current runway in months**
0

---

## Application Motivation

**What attracts you to Nitro?** (3000 chars)

We've spent the last several months building a privacy protocol that works. The cryptography is correct, the contracts are tested, the user flow runs on mainnet. What we haven't done is the equally hard work of turning a working protocol into a used product. That transition — from "technically complete" to "people depend on it" — is where we need structured help.

Nitro's program design maps to exactly where we are.

The NYC month matters most. Product teardowns and UX audits from people who've shipped successful products would directly address our biggest risk: that we've built something technically sound but with friction points that prevent adoption. Privacy products have historically terrible UX. We need outside eyes on the flow before we push for integrations.

The peer cohort matters because privacy is a coordination problem. The more builders who understand compliance-compatible privacy, the more likely it becomes default infrastructure rather than a niche tool. Being in a room with 14 other teams building on-chain products means 14 potential integration conversations — teams building DeFi, payments, or treasury tools that need a privacy layer but wouldn't build one themselves.

The investor network matters for what comes after. Paradigm, Dragonfly, Electric Capital, and Castle Island understand infrastructure bets. Privacy infrastructure is a long-term play — it needs investors who think in 5-10 year timescales, not teams looking for quick token launches. Demo Day in front of 250+ investors who already understand this category is more valuable than months of cold outreach.

But honestly, the biggest thing that attracts us is the anti-hype positioning. "Execution over raise fast, ship slow." We've been shipping without funding, without a token, without Twitter threads. We built 395+ tests worth of working infrastructure while other projects published roadmaps. Nitro seems to value that, and we want to be around other founders who work the same way.

We're building privacy infrastructure for on-chain finance, and we're building it for the long term. Privacy won't be solved in one product cycle — it needs to become a protocol-level primitive the way HTTPS became default for the web. That's a decade of work. We're looking for a program that thinks on that timescale.

**Mentor question selection** (3000 chars)

[RECOMMENDED: Haseeb Qureshi, Dragonfly]

Haseeb has thought deeply about the intersection of privacy, regulation, and crypto's long-term viability. He understands both the technical and the political dimensions.

Question: Privacy Pools prove that compliance-compatible privacy is technically possible — users can demonstrate fund legitimacy without revealing transaction details. But technical possibility doesn't guarantee adoption. Tornado Cash had millions in TVL despite (or because of) zero compliance. Railgun has users despite no regulatory framework supporting it. Meanwhile, the compliance-first approach that Galeon and 0xbow take assumes institutions and regulators will engage with the system as designed. What's your honest read on whether the regulated world will actually adopt on-chain privacy infrastructure, or whether the demand will remain primarily from users who don't care about compliance regardless? And if adoption does come from the regulated side, what's the forcing function that makes an institution choose compliant on-chain privacy over just keeping those transactions off-chain entirely?

[ALTERNATIVE: Maria Shen, Electric Capital]

Electric Capital publishes the most rigorous developer ecosystem data in crypto. Maria understands how infrastructure adoption actually happens.

Question: Electric Capital's developer reports track where builders concentrate. Privacy infrastructure on EVM is still a thin category — most developer activity is in DeFi, L2s, and consumer apps. For infrastructure like Galeon (stealth addresses + privacy pools + compliance), the adoption path runs through integration with existing products rather than direct consumer acquisition. Based on what you've seen in how infrastructure categories go from "interesting but unused" to "default dependency," what's the most reliable early signal that an infra project is on the right trajectory — and what's the most common mistake infra teams make in the gap between "working product" and "ecosystem adoption"?

---

## Program Commitment

**Exclusive participation commitment**
Yes

**Full 1-month NYC residency attendance**
Yes

**What was accomplished last week?** (3000 chars)

Won the Mantle Global Hackathon 2025, RWA Track. Galeon was selected as the winner among teams building real-world asset infrastructure on Mantle, evaluated on technical depth, product completeness, and market relevance.

Recorded a product demo video showing the full Galeon flow on mainnet: port creation, stealth address payment, privacy pool deposit, relayer-based private withdrawal, and Shipwreck tax report generation.

Completed a strategic review of our chain deployment. We're migrating from Mantle to Base as our primary chain — lower gas costs (Groth16 proof verification drops from dollars to fractions of a cent), larger user base for anonymity sets, and alignment with Coinbase Ventures' 2026 privacy infrastructure investment thesis. Our contracts are standard Solidity with EVM precompiles (BN254 at 0x06/0x07/0x08), so migration is a redeployment, not a rewrite.

Researched and mapped the competitive landscape: Railgun (privacy, no compliance), 0xbow (Privacy Pools primitive, expanding to BNB Chain Q1 2026), Aztec (separate L2, not EVM-native). Confirmed that no other protocol combines EIP-5564 stealth addresses, Privacy Pools, and tax compliance reporting in a single working implementation.

Finalized and submitted this Nitro application.

---

## Final Checklist Before Submitting

- [x] Paste demo video link into Founder 1 video/writing field
- [x] Carlos writes his own "why are you the right founder" answer
- [x] Fill in the "how founders met" story
- [x] Decide on target migration chain (Base primary, Mantle current)
- [x] Fill in current runway honestly (0)
- [ ] Create Dune dashboard (optional)
- [ ] Select blockchain in form dropdown (Mantle)
- [ ] Select company category in form dropdown (Infrastructure)
- [ ] Review all answers against fact-check.md — no unshipped claims
- [ ] Submit
