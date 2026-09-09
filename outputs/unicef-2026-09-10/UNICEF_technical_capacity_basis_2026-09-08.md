# Galeon: internal basis for the funded-year capacity plan

Updated 9 September 2026 with the agreed operator, acceptance-testing and assurance clarifications. Planning estimate, not a security audit or measured delivery rate. Mateo is the development lead. The confirmed all-in role budgets and milestone percentages are unchanged. This note supports the PM memo; it is not an attachment or technical answer to send to UNICEF.

## Decision

There is enough existing implementation to propose a focused year for two engineers and one operations lead. There is not enough evidence to promise that the complete reference flow is ready for external value in Q2. The proposed baseline is Q1 feasibility and testnet integration, Q2 an integrated candidate and initial independent review, Q3 review closure and capped real-USDC use, and Q4 sustained activity and independent deployment.

Use month 9 for the proposed external launch, with at least 14 days of observed activity before Q3 closes. Internally target the end of month 8, leaving approximately the first half of month 9 for the last acceptance work. A launch on the last day of Q3 cannot satisfy that observation requirement. Proposed participant/inflow targets are Q3 10 / USD 2,500 and Q4 40 / USD 10,000 cumulative. The separate Q4 USD 5,000 30-day-median balance remains resource-dependent, not implied by cumulative inflows. These are proposals for UNICEF's agreement, not accepted amendments.

The purpose of this exercise is to make the funded year credible, not to settle the Q1 architecture today. Implementation decisions remain bounded, dated deliverables. No estimate from Carlos is a prerequisite: Mateo owns the integrated estimate and schedule, Carlos contributes protocol implementation estimates, and Fabio owns partner and operating-resource readiness.

## What the source supports

The following observations inform effort; they do not prove production readiness:

| Area                 | Existing work to reuse                                                           | Remaining work included in the estimate                                                                                                      |
| -------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| ASP                  | Tree construction, deposit ingestion, root submission, Redis/indexer integration | Versioned decisions, removal/correction that survives rebuild, separated signer, reproducible snapshots, backup/restore and handover tests   |
| Relayer              | Pool quote, validation, submission and transaction-receipt handling              | Asset-aware configuration, independent deployment/endpoint choice, failure handling and operator documentation                               |
| Browser proving      | Prover client and worker modules                                                 | Worker build and UI integration, cancellation/lifecycle tests, artifact caching and physical-device checks                                   |
| Wallet/payment state | Wallet connection, note recovery and some payment verification                   | Protected local secrets, intentional lock/unlock, durable interrupted-transaction reconciliation and field recovery                          |
| Governance and exits | Existing privileged functions and an original-depositor ragequit primitive       | Complete authority policy, timelock wiring and tests, eligible-keyholder exit UI, direct submission with privacy/gas warnings                |
| Disclosure           | Commitment primitive and transaction history; existing tax-report feature        | A new, precisely scoped provenance construction, consent/export, independent verifier and adversarial tests; not an extension of a PDF alone |
| Tests                | Contract/API/stealth/indexer CI jobs already exist                               | Pool/browser critical-flow tests and release evidence; the inspected pool and web package scripts do not define their own test commands      |

Important boundaries: the scheduler checks every 15 seconds and updates when the root changes; this is not proof of a root change every 15 seconds. The ASP key fallback permits sharing a relayer credential, but source alone does not establish current key holders. Viewing-key storage gives the server visibility when that option is used; it is not the same claim as custody of spending keys. In the checked implementation, ragequit requires the original depositor and a valid unspent-note proof: it is not an unconditional beneficiary exit.

## Bottom-up estimate for the control and PWA work

Convention: one engineer-day is a full working day of one engineer; one planning person-month is 20 days. Ranges are judgement-based, not statistical confidence intervals. Working estimates include implementation, task-specific tests and documentation. They exclude independent reviewers' own time, new cryptographic research, a custom-circuit ceremony, and the separately allocated Q3 physical-device/recovery acceptance work.

| Work package                                                               | Primary implementation owner      | Low days | Working days | High days |
| -------------------------------------------------------------------------- | --------------------------------- | -------: | -----------: | --------: |
| ASP policy, correction, persistent decisions, snapshots and handover core  | Carlos                            |        8 |           12 |        16 |
| Governance, timelock, privileged-path and root-policy implementation/tests | Carlos                            |        6 |            8 |        12 |
| Self-hostable pool relayer and endpoint configuration                      | Carlos, with Mateo integration    |        3 |            5 |         7 |
| Eligible-keyholder exit UI and deliberate direct submission                | Mateo, with Carlos contract tests |        5 |            7 |        10 |
| Worker integration, artifact loading/cache and cancellation                | Mateo                             |        3 |            5 |         7 |
| Local secret protection, lock/unlock and selected viewing-key boundary     | Mateo                             |        6 |            8 |        12 |
| Interrupted-transaction journal and state reconciliation                   | Mateo, with Carlos API support    |        6 |            8 |        12 |
| Cross-component fixtures, deployment runbook and reproducibility           | Both                              |        5 |            7 |        10 |
| **Total**                                                                  |                                   |   **42** |       **60** |    **86** |

The 60-day working estimate is approximately 34 Carlos / 26 Mateo days, with cross-review already included. It is a replacement planning estimate for the auditor's 45-day allocation, not a claim that either developer has already agreed these task estimates.

Start 12 days of this bundle in Q1 M2, after the day-30 decisions: six Carlos days for the policy/state and governance foundations, and six Mateo days for worker and local-key foundations. The remaining working estimate is 28 Carlos / 20 Mateo days. Q2 M2 reserves 33 Carlos / 21 Mateo days, or **54 days / 2.7 person-months**. Thus the same bundle has 66 allocated days across Q1 and Q2 against a 60-day working estimate. Do not count the Q1 foundations twice.

The original 2.25 person-month figure was an allocation, not evidence. Exceeding it does not automatically decide a launch month. The proposed month-9 baseline follows the whole release path: disclosure, operator controls, browser integration, independent review, remediation, mobile acceptance and operating resources.

The 86-day high case exceeds the 66-day allocation by 20 days. It is not automatically covered by the plan. Re-estimate at day 30 and after the Q1 disclosure demonstrator; use remaining explicit contingency or rebalance work before accepting another feature. If the core claim still does not fit, propose a scope/date amendment instead of calling an incomplete milestone passed.

## Capacity that is actually available

Two engineers provide 120 nominal planning days per quarter, or 480 for the year. This is not 480 days of feature coding. The PM memo's per-person percentages allocate all paid project time, including lead duties, review, tests and contingency.

- Reserve six Mateo days per quarter for technical leadership: priorities, architecture decisions, integration/review coordination and release evidence. This is inside M5, not a second salary or additional time allocation.
- Protect six days per engineer per quarter for defects, disruption and rework: 12 combined days, or 10% of quarterly engineering capacity, also inside M5. Known testing and planned remediation are not all pushed into this reserve. Planned absences must be reflected in available days; no overtime is assumed.
- The remaining M5 capacity is six / three / twelve / twelve engineer-days in Q1–Q4 respectively, for validation and reviewer work. Task-specific tests also sit within their implementation packages. Q2's small remainder means initial review, not guaranteed closure of every finding in Q2.
- Fabio has 60 nominal operations days per quarter. His milestones cover partner resources, operator/evaluator recruitment, participation follow-up, procurement, commercial validation and reporting. He is not counted as a third engineer, lawyer or independent security reviewer.

Q2 reconciles as follows:

| Q2 milestone                                                            | Carlos days | Mateo days | Combined days |
| ----------------------------------------------------------------------- | ----------: | ---------: | ------------: |
| M1: disclosure implementation and verifier                              |          12 |         21 |            33 |
| M2: integrated control and PWA core                                     |          33 |         21 |            54 |
| M3: privacy-policy review support, measurement and testnet activity     |           3 |          3 |             6 |
| M4: operating-resource and procurement support                          |           3 |          3 |             6 |
| M5: technical lead, validation, review intake and protected contingency |           9 |         12 |            21 |
| **Total**                                                               |      **60** |     **60** |       **120** |

Q2 acceptance work uses existing allocations, not extra time. Within the seven control/PWA days already estimated for cross-component fixtures, runbook and reproducibility, plan three days for preparation (one Carlos, two Mateo) and four for integrated execution/evidence (two each). These are part of Q2 M2's 54 days, not its six-day margin or the contingency reserve. Unit and feature tests remain in their implementation tasks.

Q2 M5's 21 engineering days comprise Carlos nine and Mateo twelve. Carlos's six contingency days leave three: plan 1.5 for acceptance/triage and 1.5 for initial reviewer intake. Mateo's six leadership days include review coordination; his other six are protected contingency. This preserves F52/F53: each activity has Carlos 4.5 days (three contingency plus 1.5 validation/intake) and Mateo six (three leadership plus three contingency). Fabio's nine M5 days split 4.5 for tester logistics/feedback and 4.5 for review/evidence administration; he does not substitute for engineering or independent review. The integrated acceptance plan therefore has 5.5 engineering days beyond fixture preparation, plus feature-specific tests elsewhere. This is a planning allocation, not proof it is sufficient. Check it at the day-30 and Q1 demonstrator reviews; if it cannot cover the agreed acceptance matrix, make an explicit trade-off instead of silently consuming protected contingency or claiming Q2 review closure.

Disclosure has an explicit 80-day allocation inside existing milestone totals, replacing the previous 80–90-day range. These shares are planned, not historical time measurements or evidence that the construction is proven:

| Disclosure task and containing milestone                        | Carlos days | Mateo days | Total days |
| --------------------------------------------------------------- | ----------: | ---------: | ---------: |
| Q1 M2: feasibility demonstration and statement design           |           6 |         12 |         18 |
| Q2 M1: implementation, consent/export, verifier and fixtures    |          12 |         21 |         33 |
| Q3 M1: disclosure findings, remediation and release integration |           5 |          7 |         12 |
| Q3 M3: externally checked packages and verification evidence    |           2 |          3 |          5 |
| Q4 M1: disclosure regressions and release documentation         |           4 |          8 |         12 |
| **Total**                                                       |      **29** |     **51** |     **80** |

Q1 M2 has 18 Carlos / 21 Mateo days overall. After six foundation days per engineer and the disclosure shares above, six Carlos / three Mateo days remain for the authority/wallet design. Thus Q1 disclosure is 18 days, not an assumed 25, and neither foundation work nor contingency is counted twice. The Q3 and Q4 disclosure shares likewise sit within their existing milestone budgets; the other work uses the remainder. No added engineer, salary or reviewer time is created by this allocation. If the Q1 demonstrator requires new circuit research or broader merged-history semantics, recost that option explicitly. Tax PDFs are not a substitute.

The 60-day control/PWA estimate does not include native Android, account-abstraction infrastructure, a second production pool, automated compliance-provider integrations, a full appeals case-management system, or custom-circuit assurance. Preserve repeated receipts and practical partial withdrawals; merging remains a Q1 option, not an automatic custom-circuit requirement. Existing artifacts built with development keys cannot enter the reviewed release. A custom circuit remains a D1 option only with public source, trustworthy setup provenance, scoped independent review and an affordable, scheduled route to release.

## Calendar dependencies and assurance

Q1 is active engineering, not a month of planning followed by two idle months. By day 30, record the multipayment/upstream/network decision and the initial authority, wallet and privacy models. In months 2–3, build the testnet flow, disclosure feasibility demonstration, measurement stack and the twelve days of early control/PWA foundations. Fixing the implementation choice does not freeze all later code before it exists.

Q2 completes the integrated candidate, disclosure exporter/verifier, ASP correction/handover core, timelock and relayer packaging, local-key protection and interruption-state reconciliation. The reviewed operating-floor policy and warning behavior are due in Q2. Independent review starts against identifiable implemented commits in late Q2; scope includes Galeon's changes and the enabled services, not just inherited contracts.

Months 7–8 cover final wallet handoff, lost/shared-phone handling, low-end Android acceptance, reviewer remediation and re-review. Require warm-cache proof-generation p95 ≤60 seconds, ≥95% proof-generation completion and the network/cold-start thresholds established by Q1 end, on both selected physical devices; repeat these gates in Q4. Final code added after an earlier review must receive appropriate coverage before external use. Launch is planned no later than mid-month 9, leaving at least fourteen days of observed use. Required authority restrictions and exits for eligible original depositors with the required proof precede launch; fuller alternate-relayer/operator-replacement demonstrations may finish later in Q3 only where safe readiness is established.

Keep two relayer results separate: a Q3 technical failover demonstration, with ten successful alternate submissions while the primary is disabled, and the Q3 independent-operator recruitment target owned by Fabio. Different deployments/keys do not establish independent control. A team-run alternate demonstrates resilience only; if no independent operator is recruited, report the independence target as not achieved. This distinction is offered in the plan, not used to relabel a missed agreed outcome afterwards.

Cartagena On Chain is the proposed initial ASP operator, including if no independent alternative joins, subject to Q1 legal/role assessment and the release gates. Record actual ASP and relayer powers and accepted operating responsibilities before use. The team may operate relayer instances under reviewed controls without claiming independence. A beneficiary programme remains partner-operated; the proposed ASP role does not appoint Cartagena to run it or establish a licensing exemption. If a required legal or operating condition fails, a self-hostable package alone does not authorize launch.

Q4 is sustained operation, fixes and documented independent deployment—not the first point at which safe recovery or provenance becomes available. The bounded second-EVM test deployment starts with compatibility preparation in Q3 and completes in Q4. It does not require a second production pool or divide liquidity.

Independent review remains an estimated USD 15,000 envelope across Q1 scoping (USD 1,500), Q2 implemented-scope review (USD 8,000), Q3 remediation/mobile re-review (USD 3,500) and Q4 release/regression review (USD 2,000). Scope includes modified contracts/governance, selected circuit/disclosure claims, privacy policy, ASP/relayer and PWA secret/state handling. These amounts do not establish vendor availability or sufficient specialist coverage. Team implementation/test time is already in personnel. A new custom ceremony is not automatically funded by this allowance: scope, price and schedule it before adopting that path. No signed quote is newly required before submission. The USD 5,000 legal estimate must cover the actual initial-operator model and selected jurisdiction; Q1 procurement validates both professional-service scopes. Staff costs remain USD 40,000 and the total USD 70,000; no allocation or funding source is added.

## What belongs in the email

Explain the funded product, four-quarter progression, named staffing, dated answers to Livia's six points, real-use and pool-health evidence, partner-resource responsibility, USDC preference and necessary interpretation questions. Do not include engineer-day tables, a selection of root algorithms, circuit internals, detailed key-management design or an implication that UNICEF must solve those choices for the team.

Month 1 can be described as a bounded technical assessment with a testnet baseline and published decisions. The complete implementation comparison stays internal; material dependencies and present-versus-planned capabilities remain explicit in the workplan.

## Evidence and limits

- [ASP implementation](../../apps/api/app/services/asp_service.ts), [scheduler](../../apps/api/start/scheduler.ts#L57), [pool relayer](../../apps/api/app/services/pool_relay_service.ts).
- [Prover client](../../packages/pool/src/prover-client.ts), [worker](../../packages/pool/src/prover.worker.ts), [UI integration](../../apps/web/components/pool/withdraw-modal.tsx#L654).
- [Local session/note storage](../../apps/web/contexts/pool-context.tsx#L139), [server viewing-key option](../../apps/api/app/models/port.ts#L48), [original-depositor exit](../../packages/contracts/contracts/privacy-pool/GaleonPrivacyPool.sol#L241).
- [CI workflow](../../.github/workflows/ci.yml), [pool package scripts](../../packages/pool/package.json), [web package scripts](../../apps/web/package.json).
- [Recorded development-key status](../../packages/contracts/PROGRESS.md#L333), local submodule untracked circuit files, and the revised external review supplied by Mateo. The raw review and uncommitted circuit work are retained locally and are not included in this public package; the findings relevant to the proposal are summarized above.
- Hosting status checked read-only on 8 September with `railway service status --all --environment production --json`: API, indexer and scheduler reported stopped deployments; worker, Redis and both databases had no current deployment. This supports “hosted backend paused,” not a claim about the frontend, deployed contracts or current balances. The earlier 81 deposits / 14 users are historical figures from UNICEF's email, not a fresh count. See the [shutdown history](../../docs/railway-shutdown-status.md) for context.

Source inspection, arithmetic and the read-only hosting-status check described above. No contract change, deployment, secret inspection, live key-holder verification, benchmark, test-suite run, legal determination or vendor quote was performed in this pass. The independent review is evidence to consider, not operational authorization. Primary upstream release/ceremony comparisons remain Q1 work; no unverified V2 capability is assumed.
