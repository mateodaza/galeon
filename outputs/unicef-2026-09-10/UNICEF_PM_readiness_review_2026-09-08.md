# Galeon × UNICEF: project-manager readiness review

8 September 2026, updated after the Excel rebuild, Mateo's personnel-budget confirmation and the auditor's reported review closure. Team-review baseline, subsequently prepared for repository publication with Mateo's approval. Submission deadline: 10 September, COB. This memo, the clean email draft and both Excel files describe the same proposal; section 7 records verification and final send preparation. Earlier memos and the external review provide background, not competing commitments. No email was sent and no application code, contracts or production services were changed while preparing this package.

## 1. Decision

**The package is reconciled for final review, not a claim of a finished product before Thursday.** Livia requests a credible, funded development plan. Completed disclosure software, an audit, an independent ASP operator and a beneficiary pilot are grant deliverables or launch conditions, not things she requires us to have already completed before submission.

The plan below is reflected in both rebuilt Excel templates. Its capacity basis has been revised from the current source and scoped work; it is not waiting on an estimate from Carlos. Mateo has confirmed the sustainable all-in personnel-budget basis for the three full-time roles, and the auditor has reported the review closed. Final team sign-off remains; UNICEF's interpretation and payment/eligibility questions are still open. The email describes the proposed funded year, not the detailed technical decisions that belong in Q1.

Readiness has three distinct meanings:

| Decision                       | Required evidence                                                                                                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ready to submit                | One honest scope, dates, staffing and cost model; responses to all six clarification points; measurable activities; explicit dependencies and interpretation questions. |
| Ready to handle external value | Implemented release reviewed and remediated; verified authority, custody/recovery, operator readiness, incident limits and informed participant consent.                |
| Ready for a beneficiary pilot  | The preceding checks plus partner resources, legal/data/safeguarding decisions, adequate assessed privacy and the partner's tested local-value route.                   |

Do not make launch conditions disappear to pass a quarterly milestone. Equally, do not demand completed grant-funded work as a prerequisite to applying.

## 2. Baseline for final team review

- **Duration and team:** twelve months, four grant-relative quarters. Mateo is development lead and accountable for the integrated technical plan, with Carlos owning protocol implementation work and Fabio operations/partnerships. Each is allocated 100% of a full-time schedule. No two additional part-time staff are assumed; lead duties and contingency are inside the allocations below.
- **Personnel budget:** Mateo confirmed annual all-in role budgets of USD 16,000 Carlos, 16,000 Mateo and 8,000 Fabio as sustainable for the three full-time commitments. Monthly averages are USD 1,333.33 / 1,333.33 / 666.67; each quarter allocates USD 4,000 / 4,000 / 2,000. These are total role costs, not agreed net salaries. Engagement documents, actual deductions and applicable company-side treatment still need to reflect this approved budget basis; no additional funding or salary debt is implied.
- **Product:** open-source privacy protocol with stealth addresses, pool, operator/compliance tooling and one mobile-first reference application. No separate aid platform or native Android client in the baseline.
- **Network:** Base/native USDC preferred. Record the full-stack compatibility, upstream and field-cost decision by day 30. A change requires a reasoned decision and consequential scope/cost updates, not an indefinite search for ecosystem funding.
- **Portability:** one full-stack second-EVM test deployment, targeted in Q3 and completed by Q4. Celo remains a candidate subject to compatibility. No second production pool or second liquidity programme. A deferral report is not a completed portability test.
- **Release:** Q1 feasibility/testnet alpha; Q2 integrated candidate and initial independent review; Q3 review closure and capped real-USDC operation; Q4 sustained use, release hardening and independent deployment. Proposed launch is in month 9, no later than its midpoint, with at least 14 days of observed use before Q3 ends. The internal target is the end of month 8, not a separate promise to UNICEF. Confidence is medium for Q1 integration and medium-low for Q2/Q3 timing, conditional on the gates below—not a measured probability.
- **Integration and partners:** one production reference integration, one anchor candidate and two or three validators. Additional integrations are not required baseline outputs.
- **Partner resources:** Mateo confirmed that Fabio must secure them. The four letters establish interest, not staff, principal, users or operator commitments. A beneficiary cohort remains conditional; external protocol adoption remains a separate measurable objective.
- **Funding:** USD 70,000 proposal, requested in USDC. UNICEF handles conversion. Receiving chain/token/entity wallet are agreed before transfer and are distinct from the product's deployment chain.

The month-9 baseline proposes Q3 uptake of 10 participants / USD 2,500 new external inflows. The more cautious Q4 proposal is 40 / USD 10,000 cumulative, replacing the previous 50 / USD 15,000 baseline. Report available Q3 balance observations; apply the separate USD 5,000 30-day-median balance threshold in Q4. This entire structure is offered for UNICEF's agreement, not an automatic fallback for a missed target. Once milestones are agreed, a shortfall remains a shortfall unless UNICEF agrees an amendment.

**Month 1 is funded technical work, not open-ended revision.** By day 30, publish an evidence-backed decision on the multipayment path, upstream version and primary network, with initial authority/wallet/privacy models. Compare source, audit/setup provenance, full-stack compatibility and mobile cost. Preserve repeated receipts and practical withdrawals; no development-key artifact enters the reviewed release. Any custom circuit requires public source, setup provenance, independent review and an affordable schedule before adoption. No upstream V2 feature is assumed. Build the testnet baseline and feasibility prototypes in parallel; finish the disclosure demonstrator by Q1 end.

## 3. Close each of Livia's six points

### 1. ASP control

State the prototype's Cartagena-controlled position openly. For one canonical pool there is one configured authoritative association-set mechanism; every foundation cannot simultaneously hold unilateral control of its root.

Q1 defines current/target powers, policy ownership, routine root signing, emergency action and replacement. Q2 delivers the self-hosting/handover core, separate credentials and at least 15 scenarios covering acceptance, rejection, manual correction, outage, stale roots, rotation, recovery and exits. Corrections must survive restart/rebuild, record a reason and audit trail, and republish the intended root. Automated screening adapters and formal appeals case-management are outside the baseline; a tested manual correction procedure is not deferred.

Before external funds, verify all relevant powers, including registry, blocklist, verifier, fees and upgrades, and test available exit paths. The current ragequit requires the original depositor and valid note proof; it is not available unconditionally to every beneficiary. The reference UI must distinguish eligible-keyholder exit from normal direct withdrawal and disclose gas/privacy consequences. Q3 demonstrates operator replacement with the original services disabled and superseded powers revoked; necessary launch restrictions do not wait for the later demonstration.

The operating organization or qualified operator must accept the actual responsibilities before live use. A self-hostable package is not evidence that an independent operator has already agreed to run it. Legal advice follows the actual key/data/control model; no assumption that non-custody alone eliminates obligations.

### 2. Selective disclosure: use a precise first-release claim

Recommended product wording:

> By Q3, a beneficiary can disclose a provenance package for a supported, completed withdrawal to a chosen verifier. The verifier checks the withdrawal, receiving address, asset and amount, and the connection to identified funding receipts through the supported pool history. The beneficiary previews the source and transaction information being revealed. Spending credentials and unrelated funding lineages remain undisclosed. Institutional identity and purpose assertions are distinguished from verified transaction evidence. The off-ramp decides whether the evidence meets its requirements.

Here, a **funding lineage** means the related deposits, merges and withdrawals needed to explain the chosen payment. Merged funds may require revealing several transactions within that lineage. Do not promise that arbitrary merged history can be verified while revealing only one transaction. Disclosure cannot be made uncopyable or withdrawn from a verifier who already received it.

Q1 must demonstrate the source-to-withdrawal connection, including repeated receipts and partial withdrawals. Q2 implements consent, export and an independently runnable verifier. Q3 includes independent review/remediation and at least five externally verified packages. Q4 repeats regression tests.

The feasibility test has a concrete candidate: the checked-in upstream commitment circuit can expose a commitment, consumed-nullifier hash, value and label without exposing its secret inputs. A possible composition binds a proof for an already-spent note to a finalized withdrawal and its funding history. **This composition is neither implemented nor reviewed.** Matching a label alone is insufficient when merges add another source. The selected upstream version, artifacts and supported history bounds must be validated; older primitives must not be assumed to work unchanged in upstream v2.

Require at least 12 adversarial fixtures, including a genuine receipt attached to the wrong withdrawal; wrong source/amount/asset/recipient; an omitted second source in a merge; missing intermediate history; unfinalized spending; duplicate attribution; unspent-note export; expired challenge; and secret leakage. Unsupported histories must be rejected or clearly marked unsupported, never certified by a PDF. Preserve repeated-receipt/partial-withdrawal usability; do not silently remove the merge UX.

Allocate 80 engineer-days, or four planning person-months, within the 24 available for disclosure: Q1 18 days, Q2 33, Q3 17 and Q4 12. The capacity note identifies their milestone and per-engineer shares; this replaces the unsupported 80–90-day range without increasing paid time. These are planned allocations, not proof of technical sufficiency or a vendor quote. Re-estimate after the Q1 demonstrator. If the claim cannot be delivered within the budget, seek an explicit scope adjustment rather than substituting tax reports.

### 3. Governance and relayers

Q1 maps every privileged path, including fees, pool removal/wind-down, registry permissions, verifier swaps, upgrades and role administration, plus ASP/relayer credentials, viewing-key access, indexer/RPC dependencies and incident authority. Q2 implements the timelock policy with a proposed 48-hour delay subject to role-specific review. Routine ASP root publication has a separate controlled process; indiscriminately delaying every root would impair operation. Define and test root freshness/exclusion behavior without preselecting an algorithm before the threat model.

At least eight tests cover early execution, authorized execution, cancellation, unauthorized scheduling, verifier replacement, role transfer, delay reduction and emergency limits. No undisclosed instant-upgrade bypass. Review the enabled release, not just inherited contracts.

Q2 provides relayer self-hosting and endpoint selection. Q3's technical deliverable is failover between separately deployed/keyed instances, with at least ten successful submissions through the alternate while the primary is disabled. Operational independence is a separate Q3 target: Fabio owns recruiting a non-team operator, beginning in Q1; none is secured today. Record who actually controls each instance. A team-operated alternative can satisfy the technical failover test, but cannot satisfy the independent-operation target or be labelled decentralisation. Report that target as not achieved if recruitment fails; do not turn the shortfall into a pass through wording.

### 4. Migration and confidence

Acknowledge that Mantle is the prototype baseline and Base/native USDC is a full-stack port and newly integrated use case. ERC-20 support reduces contract work but does not establish service, proving, token-control, recovery or mobile compatibility. The day-30 assessment and dated portability test answer this without claiming the port is already complete.

**Prototype status, checked 8 September 2026:** the Railway production API, indexer and scheduler reported stopped deployments; the worker, Redis and database services reported no current deployment. The hosted backend was paused at that observation. This does not assert that deployed contracts or a separately hosted frontend have been removed. The 81 deposits / 14 users cited in UNICEF's earlier email are historical, not a new activity measurement. The outgoing email and Template 3 retain the explicit 8 September observation date; change it only following a new check. No service was started, stopped or redeployed during this check; no current pool balance or user count was independently recounted.

Drop the contractual Q1 mainnet smoke-test requirement. Testnet/fork evidence is sufficient for the proposed Q1 deliverable; an early real-value test is not needed to demonstrate confidence. Begin review of the implemented candidate in Q2 and finish remediation/re-review before the Q3 external-value release. Material mobile or contract changes after the first review must receive appropriate coverage before being enabled. A Q2 review start is not a claim that a complete release audit has finished.

### 5. Low-end Android

Use one installable PWA with Android as the primary physical-device target and a declared secondary mobile-browser matrix. Installation is not proof of field readiness.

Q1 selects two physical low-end models (3 GB and 4 GB RAM), records OS/browser/network conditions and measures the baseline. Proposed target: warm-cache proof-generation p95 ≤60 seconds and ≥95% proof completion, at least 30 attempts per model, with failures included. These are unvalidated engineering targets, not measured results or a financial-transaction success guarantee. Record cold downloads, memory failures and total withdrawal time separately; establish a dated cold-start target from the Q1 baseline.

Q2 adds worker integration, intentional caching, local-secret protection, lock/unlock and interrupted-transaction reconciliation: no duplicate payment and no false paid state. Months 7–8 complete wallet handoff, lost/shared-phone handling and physical-device acceptance under concurrent deposits/root changes, low memory, connection loss and app restart. All are gates before external use, not post-launch improvements. Q4 includes independent task completion and release regression.

Current source runs withdrawal proving on the main thread and persists sensitive session/note material unencrypted in localStorage. Storage, unlock/lock, shared/lost-phone recovery and cache exclusions are release gates. An app wrapper alone does not solve these issues. No offline settlement or remote collection of spending secrets is promised.

### 6. Minimum anonymity set

Do not revive the unsupported “20 plausible origins” floor. State directly that the prototype has not established a defensible numerical privacy guarantee. Propose a Q1 threat model and candidate-set method, followed in Q2 by independent review, an operating-floor policy and user/operator warnings before sensitive use. Publish the configured threshold, assumptions and uncertainty. Headcount and pool balance are not anonymity guarantees.

At least eight tests cover small sets, distinctive amounts/timing, known common control, changed roots, stale data, unknown ownership and recovery. Show below-floor, unassessed or stale states without trapping exits. Do not infer assessed privacy from a passed growth target.

Ask UNICEF explicitly whether it accepts this reviewed pre-use operating-floor deliverable instead of an unsupported guarantee now. The proposal can be submitted with this interpretation question; do not mark their acceptance as already obtained.

## 4. Capacity: Mateo owns the technical plan

Percentages are each person's average share of their full-time quarter, including leadership, tests and contingency. Every person totals 100% in each quarter. Preserve the template's validation/feedback milestone. Split milestone costs between its two activities when rebuilding Template 7; do not count repeated staffing percentages twice. These are proposed staffing commitments, not measured historical time.

| Quarter / milestone | Accountable output                                                                              | Carlos | Mateo | Fabio |
| ------------------- | ----------------------------------------------------------------------------------------------- | -----: | ----: | ----: |
| Q1 M1               | Day-30 multipayment/upstream/network decision and testnet integration                           |    35% |   25% |    5% |
| Q1 M2               | Authority/wallet design, disclosure feasibility and early control/PWA foundations               |    30% |   35% |   10% |
| Q1 M3               | Pool measurement, privacy threat model and recruitment pipeline                                 |    10% |   15% |   35% |
| Q1 M4               | Partner, operator, evaluator and legal/resource plan                                            |     5% |    5% |   35% |
| Q1 M5               | Technical lead, validation, devices and review preparation                                      |    20% |   20% |   15% |
| Q2 M1               | Disclosure implementation, consent/export, verifier and fixtures                                |    20% |   35% |    5% |
| Q2 M2               | ASP correction/handover core, governance, relayer and protected PWA state                       |    55% |   35% |   15% |
| Q2 M3               | Testnet participation, measurement and reviewed operating-floor policy                          |     5% |    5% |   35% |
| Q2 M4               | Partner resources, offers and procurement/reporting                                             |     5% |    5% |   30% |
| Q2 M5               | Technical lead, integrated validation and initial review intake                                 |    15% |   20% |   15% |
| Q3 M1               | Review closure and capped real-USDC launch in month 9                                           |    20% |   25% |    5% |
| Q3 M2               | Handover, alternate-relayer failover, operator-independence target and mobile readiness         |    30% |   25% |   15% |
| Q3 M3               | External pool use, privacy evaluation and at least five externally verified disclosure packages |    20% |   20% |   35% |
| Q3 M4               | Partner/business/DPG work and portability preparation                                           |     5% |    5% |   30% |
| Q3 M5               | Technical lead, staff rehearsal, external validation and re-review                              |    25% |   25% |   15% |
| Q4 M1               | Release hardening, disclosure and Android regressions                                           |    20% |   20% |    5% |
| Q4 M2               | Independent clean deployment and portability completion                                         |    25% |   20% |   15% |
| Q4 M3               | Retention, pool health and final activity evidence                                              |    15% |   15% |   30% |
| Q4 M4               | Sustainability, DPG and final reporting                                                         |    15% |   20% |   30% |
| Q4 M5               | Technical lead, independent acceptance and conditional cohort evaluation                        |    25% |   25% |   20% |

Mateo is development lead, owns architecture priorities, the integrated estimate, disclosure/product/mobile delivery and release decisions. Carlos owns assigned protocol/security implementation; both cross-review. Fabio owns recruitment, resource coordination, procurement, commercial validation and reporting. Outside specialists review defined outputs; they are not unbudgeted delivery staff.

Using 20 working days per planning month gives 120 combined engineering days per quarter. M5 contains six Mateo days for technical leadership and six days per engineer for contingency each quarter. The remaining M5 time covers validation/reviewer work; implementation-specific tests are also included in their own packages. No overtime or third engineer is assumed. The personnel-budget basis is confirmed; actual working calendars and engagement documents must reflect it before signing.

The internal working estimate for the disputed control/PWA bundle is **60 engineer-days, with a judgement range of 42–86**. Start 12 foundation days in Q1 M2 and allocate 54 in Q2 M2, rather than treating the auditor's 45-day allocation as a fixed limit. This provides 66 allocated days for the bundle before separate quarterly contingency. The [capacity basis](UNICEF_technical_capacity_basis_2026-09-08.md) records scope, assumptions and source evidence; those details do not belong in the outgoing email.

Q2 is the highest-risk quarter. Independent review begins against the implemented candidate, with closure and final mobile coverage budgeted into Q3 before launch. Re-estimate at the day-30 decision and Q1 demonstrator, not by waiting for Carlos's approval of one number. No native client, extra production integration or new circuit programme consumes capacity without a costed trade-off. A later launch or missed adoption target requires a proposed amendment, not an automatic pass.

## 5. Budget proposal without invented founder financing

The rebuilt company sheet shows USD 70,000 of planned costs and USD 70,000 of proposed UNICEF funding, conditional on selection. The earlier USD 71,200 version and its unconfirmed USD 1,200 founder contribution have been replaced. No cash reserve, founder financing, in-kind contribution or speculative revenue is claimed.

The USD 1,200 administration estimate is now inside the USD 70,000 request. This is the team's proposal to UNICEF, not an award or a ruling on eligible costs.

| USD cost category                     |         Q1 |         Q2 |         Q3 |         Q4 |       Year |
| ------------------------------------- | ---------: | ---------: | ---------: | ---------: | ---------: |
| Core team                             |     10,000 |     10,000 |     10,000 |     10,000 |     40,000 |
| Security/privacy review and re-review |      1,500 |      8,000 |      3,500 |      2,000 |     15,000 |
| Legal and ASP operating advice        |      2,500 |      1,500 |      1,000 |          0 |      5,000 |
| Infrastructure and device testing     |      1,000 |        700 |        650 |        650 |      3,000 |
| Participation activation              |        400 |        400 |      1,200 |      1,200 |      3,200 |
| Partner preparation/evaluation        |        200 |        300 |        600 |        500 |      1,600 |
| DPG/documentation                     |          0 |        100 |        200 |        700 |      1,000 |
| General administration                |        300 |        300 |        300 |        300 |      1,200 |
| **Total**                             | **15,900** | **21,300** | **17,450** | **15,350** | **70,000** |

Personnel cost per quarter is Carlos USD 4,000, Mateo USD 4,000 and Fabio USD 2,000. A milestone's personnel amount is each person's quarterly cost multiplied by their allocation; Q1 M1 therefore costs USD 2,500 and Q2 M2 USD 3,900 in personnel. Every quarter still totals USD 10,000 in personnel; the year and cost-category budget are unchanged. Annual figures control monthly rounding.

Template 7 personnel reconciliation, derived from the percentages above; these amounts are portions of the existing budget, not additional costs:

| Quarter | M1 personnel | M2 personnel | M3 personnel | M4 personnel | M5 personnel | Personnel total | Non-personnel | Quarter total |
| ------- | -----------: | -----------: | -----------: | -----------: | -----------: | --------------: | ------------: | ------------: |
| Q1      |        2,500 |        2,800 |        1,700 |        1,100 |        1,900 |          10,000 |         5,900 |        15,900 |
| Q2      |        2,300 |        3,900 |        1,100 |        1,000 |        1,700 |          10,000 |        11,300 |        21,300 |
| Q3      |        1,900 |        2,500 |        2,300 |        1,000 |        2,300 |          10,000 |         7,450 |        17,450 |
| Q4      |        1,700 |        2,100 |        1,800 |        2,000 |        2,400 |          10,000 |         5,350 |        15,350 |

Non-personnel amounts are allocated by category and actual activity in Template 7 column E, not split evenly merely to make activity totals match. Each quarterly category total and the USD 70,000 annual total have been checked.

This reduces both activation and partner preparation by 20%. Cost the smaller programme explicitly: four onboarding cohorts and follow-up, one integration, gas support, partner workshops and external evaluation. These budgets do not supply liquidity principal. Device access/purchase must fit infrastructure; external evaluation and DPG help must fit their existing allocations. Do not duplicate internal salaries as external services.

Assurance and legal amounts remain estimates, not booked engagements. Q1 procurement must validate scope and affordability, including disclosure composition, privacy, operator controls and enabled services. If estimates fail, reduce breadth or seek an agreed revision; do not silently reduce assurance.

Administration remains distinct from legal advice, and its eligibility is an explicit question to UNICEF. If it is ineligible, agree a reallocation or identify a real source for any remaining cost; do not force the budget to balance with invented income. Apart from the clearly conditional UNICEF proposal, no unawarded funding, market-rate salary debt or speculative revenue is assumed.

**Cash timing is still separate.** These quarter totals are costs, not tranche dates or available cash. Ask whether the first tranche is paid at signing or after Q1 acceptance, and the intended start date. No pre-financing commitment is assumed. If work must be paid before funding arrives, the team must establish a real source or negotiate the start/payment terms before accepting that obligation.

## 6. Revised pool targets and partner plan

These are proposed targets with explicit, unvalidated acquisition assumptions. They are not current traction, secured pledges or a privacy guarantee.

| Metric                                                                           | Q1                      | Q2                     | Q3                                                                         | Q4                                  |
| -------------------------------------------------------------------------------- | ----------------------- | ---------------------- | -------------------------------------------------------------------------- | ----------------------------------- |
| Testnet validation                                                               | ≥10 non-founder testers | ≥20 cumulative testers | Regression                                                                 | Final evaluation                    |
| Cumulative independent mainnet participants                                      | Not targeted            | Not targeted           | 10                                                                         | 40                                  |
| Cumulative verified completed real-value reference flows                         | Not targeted            | Testnet only           | At least 10                                                                | At least 40                         |
| Cumulative verified new external inflows                                         | Not targeted            | Not targeted           | USD 2,500                                                                  | USD 10,000                          |
| Externally sourced active balance, 30-day median                                 | Define method           | Test it                | Report available daily observations; median only with a full 30-day window | USD 5,000 over the final 30 days    |
| External reference integration                                                   | Qualify candidate       | One in staging         | One live                                                                   | Same integration with recurring use |
| 30-day repeat use                                                                | Not applicable          | Not applicable         | Report eligible cohort                                                     | ≥25% of eligible cohort             |
| Largest known common-control source share of quarterly verified external inflows | Define method           | Test it                | ≤60%                                                                       | ≤50%                                |
| Cumulative institutional interviews                                              | 5                       | 10                     | 15                                                                         | 20                                  |
| Cumulative qualified opportunities                                               | 2                       | 5                      | 6                                                                          | 8                                   |
| Cumulative fixed-fee implementation/support offers                               | 0                       | 1                      | 2                                                                          | 3                                   |

Acquisition hypothesis: one cohort of 20 places with 50% activation yields 10 distinct Q3 participants. Three further cohorts of 20 places yield another 30 in Q4, for 40 cumulatively. Integration-recruited users may fill those places but are not counted again as an automatic additional ten. The Q3 first-use window must last at least 14 days; a launch at quarter-end is insufficient. Deduplicate across channels. At 30% activation the figures would be 6 and 24, a shortfall—not an alternative successful milestone.

Funding hypothesis: ten external funding sources averaging USD 250 produce the Q3 USD 2,500 inflow target. Reaching USD 10,000 cumulative requires another USD 7,500 of genuine new inflows in Q4, or USD 2,500 per month. These are unvalidated recruitment assumptions, not secured resources. The Q4 USD 5,000 median is retained as a distinct and still demanding liquidity objective: lower cumulative inflows do not make that balance automatically achievable. Fabio's resource plan must assess expected timing, partial withdrawals, replenishment and willingness to keep funds available; principal is not supplied by this grant. No yield, lockup or penalty for leaving is assumed. Q3 balance reporting / Q4 thresholding is proposed up front to UNICEF; a 14-day observation is never labelled a 30-day median.

The review's “4× monthly growth” description mixes observation windows. Under the previous targets, ten participants / USD 2,500 over the minimum two-week Q3 window imply a higher monthly pace than another forty / USD 12,500 across three Q4 months. Neither short-window rate validates a forecast. The reduction to 40 / USD 10,000 is a prudence decision because resources and activation are unproven, not because a fourfold monthly acceleration was mathematically required.

Count a participant only after a genuine completed reference flow through receipt, pool deposit and withdrawal, not a signup or wallet connection. Record weekly successful flows, value throughput, completion time and failed attempts. Count genuine economic activity, excluding team control, project-funded principal and identifiable recycling solely to inflate volume. Tag gas subsidies separately. Repeat use requires another genuine use, not just the withdrawal completing the first round trip; use a denominator with a full 30-day observation period and report numerator/denominator. Publish on-chain aggregates with controlled supporting records for independence and attribution. Unknown ownership is not proof of independence. Q1 must establish a defensible active-balance attribution method and unknown-source treatment; do not claim that every hidden commitment or human owner can be counted publicly.

Fabio's Q1 task is to qualify hosts, participants, voluntary funding and one integration, and target a documented partner resource plan. Name the four organizations honestly; Más Music is an anchor candidate, not an appointed operator. The plan must identify staff, chosen workflow, principal/operating-cost requirement, source, funds holder, availability date, approvals and stop authority. Commitments and funds available are separate statuses.

A soft agreement before submission would help: a named contact, defined use case and willingness to attend design/testing sessions. It need not commit money or deployment. It is not a new mandatory attachment. Partner programme principal, cash-out fees and ongoing institutional compliance operations remain outside the grant; reference infrastructure and technical testing use their budgeted allocations. Resource shortfalls cannot be relabelled achieved adoption. One small partner-operated beneficiary cohort remains conditional on the readiness gates.

An opportunity is qualified only when the buyer, use case, jurisdiction, procurement route and next step are recorded. Offers test willingness to pay for open-source implementation and support; record buyer responses and delivery economics, not merely sent proposals. Revenue and follow-on investment are not assumed to finance the year.

## 7. Review closed; final team sign-off and send preparation

Both September Excel files were rebuilt in place against this baseline. The checks pass: 40 matching activities and 20 matching milestone titles; all activity C–F cells completed with a numeric target in D; each person's activity percentages sum to the milestone allocation and to 100% per quarter; all 20 personnel milestone costs match section 5. Column E splits reconcile to eight categories and quarters USD 15,900 / 21,300 / 17,450 / 15,350. Company income and expense each total USD 70,000, with no founder financing or obsolete staff roles.

| Requirement                                            | Rebuilt Template 3 evidence                                                                                                                                                                                     |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ASP control, persistent correction, handover and exits | D12, D40, D68; authority restrictions and tested exits are pre-use gates in D64.                                                                                                                                |
| Selective disclosure                                   | D13 demonstrator; D36–D37 export/verifier and ≥12 fixtures; D72 ≥5 externally verified packages.                                                                                                                |
| Governance and relayers                                | D40 timelocked privileges; D41 self-hosted/selectable relayer; D68 failover and a separately reported independent-operator target.                                                                              |
| Migration, provenance and confidence                   | D8–D9 day-30 decision/testnet; D62–D64 month-9 launch and review closure; B124 prototype status/provenance correction.                                                                                          |
| Android and recovery                                   | D24 physical baselines; D41 protected/interrupted state; D67 two-device acceptance in months 7–8 before external use.                                                                                           |
| Privacy operating floor                                | D16 threat/measurement model; D45 independent review, configured policy and warnings, proposed for UNICEF agreement.                                                                                            |
| Real use and separate liquidity objective              | D71 Q3 participation/inflows; D72 available-window observations; D97 Q4 use/inflows/retention; **D98 a distinct USD 5,000 median over the final 30 consecutive days, explicitly requiring external resources.** |
| Portability and validation                             | D76 starts the bounded full-stack second-EVM test; D94 completes it. All four validation/feedback milestones are retained.                                                                                      |

Saved exports were reopened, formula/error checked and visually inspected in representative changed regions. Independent LibreOffice open/save copies retained the text and agreed formula results (allowing only negligible decimal-serialization differences in percentage ratios); no formula errors or empty formula records remained. A representative input-change test exercised linked quarter/year/company totals and the reconciliation control, then restored the original input. The example company sheet's values/formulas were preserved. This is artifact/content verification, not a cryptographic audit, legal opinion or a Microsoft Excel application test.

Final reviewer file identifiers:

- Template 3 SHA-256: `9f55d4455c66d27d5b2428130e038f99749280d4c336554f84aa79754716620c`
- Template 7 SHA-256: `3815fe40e310a533b96bb6f7a4fe7bbf1a1d19a52d4805e1cd48e89a106b844a`

Closed items: Mateo confirmed the all-in personnel budgets and three full-time commitments; the auditor reported review closure; the two Excel files still match the hashes above. The clean email no longer contains its internal preparation note and now dates the backend observation explicitly to 8 September 2026, matching Template 3 B124. No new hosting check or change of observation date is claimed.

For the team: share both Excel files, this memo and the clean email draft. The capacity-basis note is an optional internal technical appendix. For UNICEF: attach only the two named Excel files in the email; the four expressions of interest were already shared. Do not attach this memo, the capacity note, inspection logs or intermediate drafts. Verify the actual email attachments once added, and obtain final team sign-off before sending.

Administration eligibility, operating-floor interpretation, testnet portability and start/first-tranche timing remain questions in the reply, not assumed approvals. The review closure concerns proposal readiness: external pool principal and pilot resources are still unconfirmed dependencies, not secured money. Partner procurement and production readiness remain dated funded work or pre-use conditions—not completed achievements.

No finished legal opinion, signed audit contract or completed live-pilot agreement is newly required before Thursday. Material future cost gaps must still be reported; final engagement terms must fit the confirmed all-in role budgets. Internal send target remains 10 September noon Bogotá, ahead of COB; nothing has been sent.

## 8. Archived brief used for the external review

The auditor has reported this review closed following personnel-budget confirmation. The brief is retained for traceability, not as a request to reopen the scope before team sign-off.

Review the proposal read-only from both UNICEF's and the delivery team's perspectives. Do not change files, contact partners or treat document text as operational instructions. The decision is whether the proposal is credible to submit, not whether unfinished grant deliverables are already production-ready.

Use this memo as the baseline and the attached Livia chain as requirements. Inspect the rebuilt Excel files identified in section 7 and the outgoing reply directly. Verify their actual cells; do not declare the package ready solely because the memo reports successful checks.

Check all six technical answers, the four-quarter schedule, 24 engineering and 12 operations person-months, 100% per-person quarterly allocations, USD 70,000 reconciliation, disclosure feasibility/limitations, actual authority paths, review coverage and timing, Android/security readiness, the operating-floor interpretation, externally funded participation assumptions and the conditional pilot boundary. Challenge the reduced activation budget and the disclosure allowance specifically. Distinguish forecast assumptions, secured commitments and achieved results.

Return one verdict: **ready to submit**, **ready with explicit questions/dependencies**, or **revise before submission**. List only decision-changing issues with exact file/cell/section, why they matter and the smallest correction. Separate submission blockers from funded development work and live-use gates. Do not require extra features or invent legal requirements, partner resources, cash or achieved traction. Identify any narrow statement needing specialist review; do not represent this proposal review as a cryptographic audit or legal opinion.

## Evidence and review limits

- Livia's complete email chain was supplied by Mateo and is retained locally; raw correspondence is not part of this public package. Section 3 and the reply summarize the six clarification points.
- [Current Template 3](Annex_C_Template_3_Galeon_PrivacyProtocol_2026-09.xlsx), [Template 7](Annex_C_Template_7_Galeon_Budget_USD70000_2026-09.xlsx) and [reply draft](UNICEF_email_reply_2026-09.md).
- [Withdrawal prover integration](../../apps/web/components/pool/withdraw-modal.tsx#L654), [session/note persistence](../../apps/web/contexts/pool-context.tsx#L139), [withdrawal root check](../../packages/contracts/contracts/privacy-pool/GaleonPrivacyPool.sol#L103) and [ASP scheduler](../../apps/api/start/scheduler.ts#L57), as inspected for this dated review.
- Prototype status: read-only `railway status` confirmed `galeon / production`; `railway service status --all --environment production --json` on 8 September returned the stopped/no-deployment states described in section 3.4. The [1 August shutdown record](../../docs/railway-shutdown-status.md) is historical context; the statement is based on the 8 September status check, not that record alone.
- [Candidate commitment circuit](https://github.com/0xbow-io/privacy-pools-core/blob/7bc392dad5fa483f53cf74e25d7ad19f0fc6d85f/packages/circuits/circuits/commitment.circom), [public-input configuration](https://github.com/0xbow-io/privacy-pools-core/blob/7bc392dad5fa483f53cf74e25d7ad19f0fc6d85f/packages/circuits/circuits.json) at the checked-in submodule revision, and [proof signal layout](../../packages/contracts/contracts/privacy-pool/lib/ProofLib.sol#L78).
- Four letter files were located in Downloads. The latest user confirmation establishes that operational resources remain for Fabio to secure. No new signature-authenticity assessment was performed.

The review combined main-agent reconciliation with separate panel, staffing and technical challenges. It did not execute a full security audit, benchmark physical phones, verify live production role holders, establish legal permissions, validate vendor quotations or prove the proposed disclosure construction.
