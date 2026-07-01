# PR 6 + PR 8 — Staging billing smoke pass report

**Date:** 2026-06-02
**Operator:** Claude (Cowork) driving Chrome MCP
**Test user:** `e976c51f-2d88-46ed-80c7-d3a983905e37`
**Staging app:** `https://staging-hivemind.myosin.xyz`
**Staging Supabase:** project `zxjidctilwncsgwamfgn`
**PostHog project:** 194109 (`environment: preview`)
**Stripe:** test mode (`acct_1QF8HI1yVAFMJr4H`)

## Result summary

| #                      | Scenario                                | Result                                                                               |
| ---------------------- | --------------------------------------- | ------------------------------------------------------------------------------------ |
| Pre-flight             | Reset to free baseline                  | PASS (2 prior-state UI deviations logged)                                            |
| C                      | Subscribe → Stripe Checkout → complete  | PASS (retried after env fix)                                                         |
| D                      | Manage Billing → Stripe Customer Portal | PASS                                                                                 |
| E                      | Cancel from Stripe Checkout             | PASS (operator-simulated via direct nav to cancel_url, Stripe-side hop unverified)   |
| Past_due               | `paymentIssue: true` UI + chat 403      | PASS                                                                                 |
| Cancellation scheduled | DB transition handler                   | PASS on row state; `subscription_cancellation_scheduled` did **not** land in PostHog |
| Cancelled              | DB churn handler                        | PASS                                                                                 |
| Quota exhausted        | chat 429 + UI + event                   | PASS                                                                                 |
| Unauth guard           | Already covered locally in PR 6 smoke   | N/A                                                                                  |

Net: 7 PASS, 1 partial (`cancellation_scheduled` analytics miss only — DB row + UX correct).

## Event ledger (PostHog 194109)

| Event                                 | Ingested?  | Props PII-clean? | Notes                                                                                                                                                                                   |
| ------------------------------------- | ---------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `subscription_checkout_started`       | YES        | YES              | Required a healthy env; first fired after webhook fix. `had_existing_customer: false`, `plan_key: pro`                                                                                  |
| `subscription_checkout_completed`     | YES        | YES              | Fired from webhook handler. Two events total: first from env-fix replay, second from clean rerun                                                                                        |
| `subscription_portal_opened`          | YES        | YES              | This event was unwired at smoke start; user wired it mid-smoke (~3-line PR). Confirmed live with `stripe_status: past_due`                                                              |
| `subscription_access_blocked`         | YES (×2)   | YES              | Past_due fire + quota_exhausted fire, both observed with full spec props                                                                                                                |
| `subscription_payment_failed`         | NOT TESTED | n/a              | Skipped via $0-invoice CLI roadblock per operator note. Coverage delegated to unit tests                                                                                                |
| `subscription_cancellation_scheduled` | **NO**     | n/a              | Handler transition guard fired correctly (DB row flipped `cancel_at_period_end: true`), but PostHog ingestion never showed the event after 15+ min wait. Real defect — see triage below |
| `subscription_cancelled`              | YES        | YES              | Pre-delete snapshot intact (`plan_key: pro`, `entitlement: paid`). One minor doc nuance on `cancel_at_period_end` — see below                                                           |

## Defects / follow-ups (in priority order)

### 1. `subscription_cancellation_scheduled` not captured by PostHog

- DB transition: `cancel_at_period_end` flipped `false → true` (Vercel webhook log confirms handler ran, `processed_at: 19:21:44.709`, no `processing_error`)
- Expected: handler's transition guard calls `trackCancellationScheduled` → posthog-node capture
- Observed: zero `subscription_cancellation_scheduled` rows in PostHog (`mateodaza@gmail.com`) within ~15 min after click. Typeahead's `LAST SEEN: 17 min ago` is the prior `simon@myosin.xyz` test, not ours.
- Likely culprits (operator's note): posthog-node connection flake, flush() timeout too aggressive (Lambda exits before flush), or a missed call path in `handleSubscriptionUpdated`
- Diagnostic: grep staging Vercel logs around `19:21:31 UTC` for `subscriptionId=sub_1TdxMa1DwxrubnYxPbrLgbOd` and any `PostHog server capture failed` warning

### 2. Doc bug — spec said "expect HTTP 429" for past_due chat block

- Actual behavior is correct and semantically better than spec:
  - past_due → **403** (auth-style: account access denied)
  - quota_exhausted → **429** (rate-limit style: usage cap)
- Spec line in the operator guide should read "expect 403" under the past_due section. 429 stays under quota.

### 3. `subscription_cancelled` event's `cancel_at_period_end: false` is the Stripe-payload value, not user-intent

- Smoke saw `cancel_at_period_end: false` on the cancelled event even though the user had scheduled the cancel before force-deleting it (DB row preserved `cancel_at_period_end: true`).
- Cause: Stripe's `customer.subscription.deleted` payload reflects sub state at deletion time. After immediate cancel, `cancel_at_period_end` is `false` because the sub isn't waiting on a period — it's deleted.
- Decision needed: should the tracker (a) use the DB's preserved `cancel_at_period_end` to reflect user intent, or (b) keep the Stripe value and document the interpretation?
- If (b), product analytics should infer "was user-scheduled" by joining on whether `subscription_cancellation_scheduled` previously fired for the same `user_id`.

### 4. UI billing-banner glitch for inactive-free row

- Free user with `entitlement: free, status: inactive, stripe_status: null` saw banner copy **"Payment issue needs attention."** + a Manage Billing button at staging — even though `paymentIssue: false, actions.portal: false`.
- Resolves automatically once row flips to a paid state, but the cross-state selector is wrong for this pre-Stripe cohort.
- Likely a banner-variant fallthrough that doesn't gate on `actions.portal` before rendering Manage Billing.

### 5. Free user gated entirely from chat on staging

- Spec pre-flight expected free user to retain 5 free messages (`canChat: true`).
- Staging returned `canChat: false, canCreateProject: false, canRunAnalysis: false` for the freshly-reset free user.
- The status route appears to treat `status: 'inactive'` as "no active subscription → block everything", regardless of `entitlement: free` with quota remaining.
- Either the route's quota gate needs to fire before the status gate, or the spec is stale on what free users get.

### 6. Stripe webhook + PostHog env config (FIXED mid-smoke, documenting for closure)

- Smoke was originally hard-blocked: `stripe_webhook_events` empty, `subscription_*` events never ingested at PostHog
- Root cause: staging env was missing `STRIPE_WEBHOOK_SECRET` and `POSTHOG_API_KEY` (server-side capture defaulted to client-side fallback going to wrong project)
- Operator fixed both during smoke, smoke restarted from pre-flight reset. Full diagnostic in `docs/staging-billing-smoke-blocker.md`

## Operational details worth keeping

**Stripe customer / sub for retry runs (test mode):**

- First Checkout session: `cus_TBD` / `sub_1Tdt6L1DwxrubnYxS9wtAcVm` (used for D portal verification)
- Second Checkout session (post-env-fix re-prime): `cus_UdDoz8Qcdnm8ww` / `sub_1TdxMa1DwxrubnYxPbrLgbOd` (used for past_due → cancellation_scheduled → cancelled chain)
- Both can be deleted from Stripe test dashboard for a clean teardown

**Chrome-MCP boundaries hit during smoke:**

- `checkout.stripe.com` — fully blocked (no DOM, no nav, no screenshot)
- `billing.stripe.com` — fully blocked
- `dashboard.stripe.com` — fully blocked
- `posthog.com` — allowed
- Everything Stripe-domain had to be human-driven. Worth noting in any future smoke-runner playbook.

**Where I had to simulate vs. drive live:**

- Scenario E "back from Checkout" cancel: simulated by navigating directly to `/agent?checkout=cancel`. Verifies UI side of cancel handling but does not prove Stripe's cancel button routes to the configured `cancel_url`. Coverage delegated to unit tests + a one-time manual verification on operator's part.
- Failed Payment helper (past_due event chain): SQL-primed `stripe_status='past_due'` directly instead of running Stripe's Failed Payment helper, because of $0-invoice-can't-fail CLI behavior. `subscription_payment_failed` event capture is therefore not observed on staging — only unit-test coverage.

## Recommended next commits / tickets

1. **Wire `subscription_cancellation_scheduled` reliably** — Vercel-logs grep + posthog-node flush() audit. (Defect #1)
2. **Doc fix** — operator guide: past_due returns 403, quota_exhausted returns 429. (Defect #2)
3. **Decide cancel_at_period_end semantics** on `subscription_cancelled` event. (Defect #3)
4. **Banner selector audit** for the `entitlement=free + status=inactive` pre-Stripe cohort. (Defect #4)
5. **Free-user chat gating** — confirm whether spec intent is "5 messages then upgrade" or "must subscribe first". (Defect #5)
6. **Add `subscription_portal_opened` capture call** to `app/api/stripe/portal/route.ts` — already merged mid-smoke; verify it's in the staging deploy.
7. **Supabase support ticket** for the PostgREST 42703 false-positive (operator has the repro brief)

## What's NOT in scope of this report

- Local-dev smoke results (covered separately in `docs/pr-6-billing-smoke-report.md` for PR 6, n/a for PR 8)
- Production rollout sign-off (a separate go-no-go gate)
- Performance / load — not exercised
