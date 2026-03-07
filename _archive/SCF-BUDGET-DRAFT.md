# SCF Build Award — Budget Draft

> $80K ask, 4 months, Open Track. Audit provided by SCF at T3 — not in budget.

---

## Budget Summary

| Category                 | Amount      | %     |
| ------------------------ | ----------- | ----- |
| Team compensation (4 mo) | $64,000     | 80%   |
| Infrastructure (4 mo)    | $4,000      | 5%    |
| Deployment               | $2,000      | 2.5%  |
| Contingency              | $10,000     | 12.5% |
| **Total**                | **$80,000** | 100%  |

---

## Team Compensation — $64,000

| Person          | Role                                     | Monthly | Months | Total   |
| --------------- | ---------------------------------------- | ------- | ------ | ------- |
| Mateo Daza      | Soroban contracts, frontend, integration | $7,000  | 4      | $28,000 |
| Carlos Quintero | Backend, relayer, indexing, crypto       | $7,000  | 4      | $28,000 |
| Fabio Anaya     | ZK circuit adaptation, research          | $2,000  | 4      | $8,000  |

Rates reflect specialized work: porting production ZK circuits to a new Rust-based runtime using freshly-live Protocol 25 primitives (CAP-0074 / CAP-0075). US market rate for this scope is $12–16K/mo; these rates are well below that.

---

## Infrastructure — $4,000

| Item                                      | Monthly | Months | Total  |
| ----------------------------------------- | ------- | ------ | ------ |
| Stellar RPC (Quicknode or equivalent)     | $200    | 4      | $800   |
| Event indexer (Mercury or SubQuery)       | $300    | 4      | $1,200 |
| Hosting — API, relayer, web app (Railway) | $300    | 4      | $1,200 |
| CI/CD + testing infrastructure            | $200    | 4      | $800   |

Note: Stellar's pull-based event model (RPC `getEvents`) avoids the continuous polling costs common on EVM. Actual spend expected $200–400/mo; budget provides headroom.

---

## Deployment — $2,000

| Item                                               | Cost   |
| -------------------------------------------------- | ------ |
| Testnet deployment + iteration cycles              | $500   |
| Mainnet contract deployment (storage fees)         | $1,000 |
| Soroban resource fees (instruction budget testing) | $500   |

---

## Contingency — $10,000

Covers: BN254 instruction cost surprises (CAP-0074 cost calibration still TBD), circuit optimization sprint if instruction budget is tighter than the ~40M benchmark, Stellar learning curve, unexpected complexity in Poseidon sponge construction.

---

## Monthly Burn Rate

| Month                               | Team    | Infra  | Total       |
| ----------------------------------- | ------- | ------ | ----------- |
| 1 (April)                           | $16,000 | $1,000 | $17,000     |
| 2 (May)                             | $16,000 | $1,000 | $17,000     |
| 3 (June)                            | $16,000 | $1,000 | $17,000     |
| 4 (July)                            | $16,000 | $1,000 | $17,000     |
| One-time (deployment + contingency) | —       | —      | $12,000     |
| **Total**                           |         |        | **$80,000** |

---

## Cash Flow & Payroll Schedule (Option A)

> Assumes approval ~April 1. T0 lands day 1. Partial salaries in Month 1 to avoid personal bridge financing — deferred balance paid when T1 lands.

| Date   | Event                                           | Cash in  | Cash out | Balance     |
| ------ | ----------------------------------------------- | -------- | -------- | ----------- |
| Apr 1  | T0 released                                     | +$8,000  | —        | $8,000      |
| Apr 1  | Partial April salaries + infra                  | —        | -$7,000  | $1,000      |
| Apr 30 | T1 released                                     | +$16,000 | —        | $17,000     |
| Apr 30 | Deferred April salaries                         | —        | -$9,000  | $8,000      |
| May 31 | T2 released + full May salaries                 | +$24,000 | -$17,000 | $15,000     |
| Jun 30 | Full June salaries                              | —        | -$17,000 | **-$2,000** |
| Jul 31 | T3 released                                     | +$32,000 | —        | $30,000     |
| Jul 31 | Full July salaries + deferred June + deployment | —        | -$21,000 | **~$9,000** |

End balance ≈ $9K (contingency reserve, spent only if needed on unknowns).

### April Payroll Detail (Option A)

**April 1 — paid immediately from T0 ($7,000):**

| Person    | April advance | Deferred   |
| --------- | ------------- | ---------- |
| Mateo     | $2,500        | $4,500     |
| Carlos    | $2,500        | $4,500     |
| Fabio     | $1,000        | $0         |
| Infra     | $1,000        | $0         |
| **Total** | **$7,000**    | **$9,000** |

**April 30 — T1 lands, deferred paid same day ($9,000):**

Everyone is made whole by May 1. Maximum personal bridge: **zero**. Maximum deferral: **$9K for 4 weeks**.

### June Gap Note

June ends with a $2K shortfall (no tranche that month). In practice: defer $2K of June salaries ($1K each for Mateo and Carlos) into July. T3 lands July 31 and covers everything. Maximum June deferral: **$2K for 30 days**.

### XLM Volatility Warning

The grant is paid in XLM valued at USD at time of approval. Convert each tranche to stablecoins immediately on receipt to lock the USD value. Do not hold XLM and assume the dollar amount stays the same.

---

## Tranche Breakdown

> Tranche #0 (10% = $8,000) released on approval — no deliverables required.

### Tranche 1 — Contracts on Testnet (20% = $16,000) — End of Month 1 (~April 30, 2026)

Deliberately scoped for 4 weeks. All crypto logic already exists on EVM — this is a port, not greenfield.

**Deliverables:**

- Soroban dev environment, testnet accounts, CI pipeline live
- Stealth address module deployed on testnet (derive, scan, pay one-time addresses)
- Groth16 verifier contract deployed on testnet (BN254 via CAP-0074 host functions)
- Unit tests for both contracts

**How to measure completion:** Deployed testnet contract addresses on GitHub, passing test suite, and a transaction showing a stealth payment received and a deposit proof verified on-chain.

> Submit deliverables a few days before April 30 so SCF can start their review early — tranche verification takes 1-2 weeks and the clock on the May burn starts regardless.

---

### Tranche 2 — Full Testnet Flow (30% = $24,000) — End of Month 2 (~May 31, 2026)

**Deliverables:**

- Poseidon commitment scheme: sponge construction over CAP-0075 primitives, compatible with existing Circom circuits
- Full deposit flow on testnet with client-side proof generation (WebAssembly)
- Full Privacy Pool withdraw flow: ZK proof, nullifier tracking, no double-spend
- Merkle tree: ASP membership and non-membership proofs
- Stellar relayer: submits withdrawal transactions on behalf of users (fee abstraction)
- Shipwreck compliance module: report generation from Soroban events + Horizon data
- Event indexing pipeline live (Mercury or SubQuery)

**How to measure completion:** End-to-end testnet demo — deposit → proof generation → relayed withdrawal → compliance report export. All steps documented with transaction links.

---

### Tranche 3 — Mainnet Launch + UX (40% = $32,000) — End of Month 4 (~July 31, 2026)

**Deliverables:**
**Month 3 (June) — audit-ready hardening:**

- Contract code freeze: no more architecture changes after June 1
- Clean storage layout, access control, event emissions for auditors
- NatSpec / inline comments on all contract logic
- Final integration tests against mainnet-like conditions
- Frontend + onboarding flow built and tested internally

**Month 4 (July) — ship:**

- Mainnet deployment of all Soroban contracts (stealth module, Privacy Pool, verifier, Merkle tree)
- Web app live on mainnet: receive stealth payments, private send, export compliance reports
- Clear onboarding flow: wallet connect → generate receiving address → first payment
- Usability validation: 3–5 external testers
- Open-source release with documentation
- Demo video (<3 min, 16:9)
- SCF-arranged audit runs on deployed contracts (SCF coordinates, not us)

**How to measure completion:** Live mainnet deployment with working web app. Demo video showing full user flow. Public GitHub repo. SCF audit process completed.

---

## Strategic Notes

- **Why $80K, not $150K:** We're new to the Stellar ecosystem. Coming in well below the maximum shows we're building, not grant farming. Follow-on Build Awards are available up to $300K lifetime — this is the first step.
- **Why audit is not in the budget:** SCF provides audit credits as part of Tranche 3 completion. We're treating this as a feature, not a gap.
- **Why T1 at Month 1:** Front-loading the first milestone eliminates long personal bridge gaps. T0 ($8K) + deferred salary model means the team is made whole within 4 weeks of starting, not 2 months.
- **Why this scope is achievable in 4 months:** We're not starting from zero. Working Circom circuits, 216+ contract tests, proven Privacy Pool on EVM, a relayer. This is a port with adaptation. Nethermind's `circom2soroban` and SDF's Privacy Pools prototype de-risk the Stellar-specific unknowns.
- **Main technical risk:** BN254 instruction cost calibration is TBD in CAP-0074. If costs exceed the ~40M BLS12-381 benchmark, we'll reduce circuit complexity or split verification across transactions. Contingency covers this.
