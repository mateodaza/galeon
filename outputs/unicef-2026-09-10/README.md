# Galeon × UNICEF — final team-review package

Prepared for the 10 September 2026 submission deadline. **Proposal for final team review; not an awarded investment or a production-readiness claim.** Publishing this package to the repository does not send the application to UNICEF.

This directory is the **only current review and submission package**. Update these six files in place; do not create parallel `final`, `v2` or email copies. The PM readiness memo and technical capacity basis support this same proposal; they are not alternative plans.

Earlier root-level UNICEF documents, July demo decks, August workplans and intermediate September drafts are historical; they do not add commitments to this proposal. Superseded local drafts and generated inspection files have been moved to a recoverable archive outside the checkout, so this directory contains only the six current files below.

## Review order

| File                                                                                      | Purpose                                                                                                   | Send to UNICEF?                                                          |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [Email reply](UNICEF_email_reply_2026-09.md)                                              | Read first: scope, quarterly progression and answers to Livia's six questions.                            | Paste the approved text into the reply; do not attach the Markdown file. |
| [Template 3 — workplan](Annex_C_Template_3_Galeon_PrivacyProtocol_2026-09.xlsx)           | 20 milestones and 40 measurable activities, with named quarterly staffing allocations.                    | Yes, as a separate Excel attachment.                                     |
| [Template 7 — financial proposal](Annex_C_Template_7_Galeon_Budget_USD70000_2026-09.xlsx) | USD 70,000 across four quarters, eight cost categories and the company budget. Funding requested in USDC. | Yes, as a separate Excel attachment.                                     |
| [Decision and readiness memo](UNICEF_PM_readiness_review_2026-09-08.md)                   | Team rationale, responsibilities, risks and the final verification record.                                | No. Team-review material only.                                           |
| [Technical capacity basis](UNICEF_technical_capacity_basis_2026-09-08.md)                 | Optional appendix for Carlos and Mateo: scope, engineering allocations and release dependencies.          | No. Team-review material only.                                           |

Download the Excel files to inspect the full workbook. Each workbook retains its reviewed filename and SHA-256 below; only the Markdown navigation and preparation notes have been made repository-portable.

## Agreed baseline

- Twelve months and four grant-relative quarters. Mateo leads development; Carlos owns protocol implementation; Fabio owns operations and partnerships. All three have full-time allocations.
- Mateo confirmed all-in annual role budgets of USD 16,000 for himself, USD 16,000 for Carlos and USD 8,000 for Fabio. These are company role costs, not net salaries or evidence of cash already received.
- Q1: feasibility, dated technical decisions and testnet integration. Q2: integrated candidate and initial independent review. Q3: review closure and capped real-USDC use by mid-month 9, leaving at least 14 days of observed use. Q4: sustained activity, hardening and independent deployment.
- One privacy protocol and mobile-first reference PWA, one production reference integration, and a bounded second-EVM full-stack test across Q3–Q4. No separate aid-delivery platform, native Android app or second production pool in the baseline.
- Q3 targets: 10 independent participants/completed reference flows and USD 2,500 cumulative new external inflows. Q4 targets: 40 and USD 10,000 cumulatively.
- **Separate Q4 liquidity target:** USD 5,000 median externally sourced active balance over the final 30 days. External resources are required and are not secured or funded by the grant. Cumulative inflows do not establish this balance or guarantee anonymity.
- A beneficiary cohort is partner-operated and conditional on resources and readiness gates. A staff rehearsal does not substitute for a pilot or an adoption target. The previously shared expressions of interest do not themselves commit staff, users or principal.

## Budget cross-check

| USD                 |         Q1 |         Q2 |         Q3 |         Q4 |      Total |
| ------------------- | ---------: | ---------: | ---------: | ---------: | ---------: |
| Personnel           |     10,000 |     10,000 |     10,000 |     10,000 |     40,000 |
| Other project costs |      5,900 |     11,300 |      7,450 |      5,350 |     30,000 |
| **Total**           | **15,900** | **21,300** | **17,450** | **15,350** | **70,000** |

These are cost allocations, not confirmed tranche amounts or dates. Company income is the explicitly conditional UNICEF proposal; no founder contribution, in-kind financing or speculative revenue is used to balance it.

## Review status and remaining actions

The independent proposal reviewer reported the 8 September review closed after personnel-budget confirmation. On 9 September, Mateo approved Carlos's targeted clarifications: conditional initial ASP operation by Cartagena, eligible-depositor exits, optional merging, explicit mobile gates and clearer resource/testing assumptions. The email was simplified. The budget, staffing percentages and targets are unchanged; final team sign-off is still required. This is not the independent security/privacy review planned within the funded year.

Checked in the exported workbooks:

- 40 one-to-one activity titles and 20 matching milestone titles.
- No blank C–F activity cells in Template 3; numeric activity targets; each person's activity shares sum to the milestone and to 100% per quarter.
- Activity costs, personnel allocations, eight category totals, quarter totals and company income/expense reconcile to USD 70,000.
- Template 3 D97 contains cumulative inflows; D98 separately states the final-30-day median and external-resource requirement.
- The 9 September pass changed only 12 Template 3 text cells and their row heights. All other cell values/formulas are unchanged; Template 7 is byte-identical. Saved formula caches, reconciliation checks, visual inspection of affected rows and a LibreOffice open/save check passed. This was not a Microsoft Excel application test or a production/security audit.

The clean email retains four questions for UNICEF: the reviewed privacy operating-floor approach, testnet portability, general-administration eligibility, and the anticipated start/first-tranche timing. None is presented as already approved.

The hosting statement is an observation **as of 8 September 2026**, not a fresh live status claim. Change the date only after another check. The 81 deposits / 14 users are historical figures, not current traction.

Before sending: obtain final team sign-off, check that the actual outgoing email has only the two intended Excel attachments, and use the approved email text. The expressions of interest were already shared; signed letters, raw correspondence, older drafts, temporary renders, inspection dumps and uncommitted circuit work are not included in this repository review package. They have not been deleted locally.

## Workbook integrity

```text
b8fe20248375e08b39b667de30ac2a7a133634267d0f66a9c6d90ba652719d5c  Annex_C_Template_3_Galeon_PrivacyProtocol_2026-09.xlsx
3815fe40e310a533b96bb6f7a4fe7bbf1a1d19a52d4805e1cd48e89a106b844a  Annex_C_Template_7_Galeon_Budget_USD70000_2026-09.xlsx
```

The quoted source observations were made against the existing prototype. Implementation and deployed-state facts can change; the dated proposal does not establish that its planned features have already shipped.
