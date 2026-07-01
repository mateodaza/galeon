---
name: staging-billing-smoke-blocker
description: 'PR 6+8 staging smoke parked 2026-06-02 — staging never receives Stripe webhooks AND PostHog project 194109 has never ingested a subscription_* event from any env. Diagnosis + next steps for when env is fixed.'
metadata:
  type: project
---

PR 6 (`feat/billing-entry-points-ui`, merged) + PR 8 (`feat/billing-analytics-events`, merged) live on staging. Started the agreed live smoke 2026-06-02; got through pre-flight reset + scenario C browser flow (Checkout completed with `HIVEMIND-MEMBER` promo, redirected to `/agent?checkout=success`), but **both server-side analytics paths are dark on staging**:

- `stripe_webhook_events` on staging Supabase (project `zxjidctilwncsgwamfgn`): **0 rows ever** (`SELECT COUNT(*) FROM stripe_webhook_events` returned 0, with `MAX(received_at) = NULL`). Webhook never reaches the app.
- PostHog project 194109: event registry has **zero matches for `subscription_*` from any env, ever**. Server-side capture never fired (`subscription_checkout_started` would have fired pre-redirect if the route's PostHog call worked — it didn't).

Subscription row stayed at the reset baseline (`entitlement=free`, no Stripe IDs) because no webhook ever landed.

**Why:** environmental gaps on staging deploy, NOT code defects. PRs landed clean and unit-tested.

**Three candidate causes (rough likelihood, descending):**

1. Stripe webhook endpoint not registered in test mode pointing at `https://staging-hivemind.myosin.xyz/api/stripe/webhook` — staging needs the endpoint + signing secret in `STRIPE_WEBHOOK_SECRET` env var
2. Staging Vercel env has wrong/missing `POSTHOG_API_KEY` (server-only; do NOT use `NEXT_PUBLIC_POSTHOG_HOST` — its `/ingest` default breaks posthog-node)
3. Both — independent misconfigs that happen to surface together

**Concrete signals to look for:**

- Stripe Dashboard (test mode) → Developers → Webhooks: endpoint exists for staging URL? Recent delivery attempts? Status codes?
- Vercel staging logs grep: `Missing STRIPE_WEBHOOK_SECRET` or any 5xx on `/api/stripe/webhook` → endpoint registered but failing
- Vercel staging logs grep: `PostHog server analytics disabled — no API key set` → `POSTHOG_API_KEY` missing in staging env

**Exact code paths verified:**

- Webhook route: `app/api/stripe/webhook/route.ts`
- `STRIPE_WEBHOOK_SECRET` consumed at `lib/stripe/client.ts:19-21` — throws if absent
- PostHog server-side: `lib/analytics/posthog-server.ts:45-46` reads `POSTHOG_API_KEY` (primary) with `NEXT_PUBLIC_POSTHOG_KEY` fallback; `POSTHOG_HOST` defaults to `https://us.i.posthog.com`

**Side findings from the partial smoke pass (worth a separate triage):**

- Pre-flight reset to `entitlement='free', status='inactive', message_limit=5` returns `access.canChat: false, canCreateProject: false, canRunAnalysis: false` on staging — spec expected all three `true` for a free user with quota remaining. Status route appears to treat `status='inactive'` as "no active subscription → block everything" regardless of `entitlement='free'` having quota left.
- BillingBanner above input renders **"Payment issue needs attention."** + Manage Billing button for the freshly-reset free user (`stripeStatus: null, paymentIssue: false, actions.portal: false`). Banner selector / button visibility isn't respecting `actions.portal` for this state.

**How to apply (when smoke is unblocked):** rerun the [Operator Guide](operator-guide-pr6-pr8-staging-smoke.md) — start at the pre-flight reset SQL (already templated for user `e976c51f-2d88-46ed-80c7-d3a983905e37` against project `zxjidctilwncsgwamfgn`). Don't trust the existing `subscriptions` row — re-reset to clean baseline before re-running scenario C.

Linked: [[stripe-billing-sprint]], [[pr6-staging-followups]]
