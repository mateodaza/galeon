# PR 6 — Billing surfaces visual smoke pass

**Date:** 2026-05-30
**Operator:** Claude (Cowork) driving Chrome MCP
**Test user:** `e976c51f-2d88-46ed-80c7-d3a983905e37`
**Environment:** `localhost:3000` against staging Supabase (`zxjidctilwncsgwamfgn`)
**Stripe state notes:** `cus_TEST` / `sub_TEST` planted via SQL — real Stripe round-trips deferred

## Result summary

| #   | Scenario                           | Status                                                  |
| --- | ---------------------------------- | ------------------------------------------------------- |
| A   | Healthy active paid user           | PASS (1 cosmetic note)                                  |
| B   | Free user, no Stripe customer      | PASS                                                    |
| C   | Subscribe flow to Stripe Checkout  | SKIPPED (live Stripe)                                   |
| D   | Manage Billing to Stripe Portal    | SKIPPED (live Stripe)                                   |
| E   | Checkout cancel path               | SKIPPED (live Stripe)                                   |
| F   | Quota exhausted + preservation     | PASS (1 UX deviation)                                   |
| G   | Past-due priority over quota       | PASS                                                    |
| H   | Grace period active (non-blocking) | PASS                                                    |
| I   | Grace expired, no Stripe sub       | PASS                                                    |
| J   | Portal no-customer fallback        | **FAIL** — env-config gate fires before structured code |
| K   | Onboarding upload blocked          | PASS                                                    |
| L   | Unauth network guard               | PASS                                                    |

Net: 8 PASS, 1 FAIL, 3 SKIPPED. Two action items below.

---

## Findings to triage

### 1. J — `/api/stripe/portal` returns the wrong error in misconfigured env

Posting to `/api/stripe/portal` with no `stripe_customer_id` on the row returned:

```json
HTTP 500
{"error": "App URL not configured"}
```

Expected per spec:

```json
HTTP 400
{"error": "no_stripe_customer"}
```

The route is evaluating the `APP_URL` (or equivalent) env guard **before** the
stripe-customer guard. Two interpretations:

- Local `.env.local` is missing `APP_URL` — won't repro in staging/prod, but
  hides the structured code locally and during dev.
- Route ordering is wrong — the customer-presence check should run first so
  consumers see a stable structured code regardless of env state.

If the UI ever did call portal with `actions.portal: false` (it currently
doesn't), the silent fallback path described in the spec wouldn't fire. The
UI's gate (`actions.portal: true`) prevents the user-visible bug today, but
the route contract is incorrect.

**Action:** Move the customer-presence check above the env-derived URL
construction in the portal route handler.

### 2. F — `+ new project` button is not pre-gated

Spec F says the projects-page `+ new project` button should be visually
dimmed and clicking it should fire an info toast (`Subscribe or wait until
your quota resets to create a new project.`). Verified in two states:

- F (quota exhausted, `canCreateProject: false`)
- I (grace expired, `canCreateProject: false`)

Reality in both: the button renders at normal contrast (`disabled: false`,
`opacity: 1`, `pointerEvents: auto`, `aria-disabled: null`) and clicking it
navigates straight to `/onboarding`. No toast.

The upload-side gate at `/onboarding` catches the real attempt (K passed
cleanly), so this is not a security hole — only a UX miss vs. the documented
spec. The friction happens one step too late.

Same deviation observed on the sidebar `new chat` button in F state (silently
navigates to a fresh chat with no toast). Out of scope of the literal F spec,
but spec author may want to gate this too if chats consume quota.

**Action:** Wire the same `canCreateProject` gate into `ProjectsPage` /
`agent-empty-state` / `project-selector` (per spec author's earlier note
linking the gate hooks). Add the dim class + click handler that fires the
`Subscribe or wait until your quota resets...` toast.

### 3. A — reset date renders in local TZ, not UTC

Cosmetic. `current_period_end='2026-07-01T00:00:00Z'` renders as
`"Resets Jun 30"` because the formatter uses local time (the test was run on
a machine west of UTC). Spec calls for `"Resets Jul 1"`.

**Action:** Force `timeZone: 'UTC'` (or display the same date the row stores)
in the reset-label formatter so the UI mirrors the period-end exactly.

---

## Per-scenario detail

### A — Healthy active paid user — PASS (with note above)

SQL: scenario A reset with `cus_TEST` + `sub_TEST` planted.

API payload after hard refresh:

```json
{
  "plan": "pro",
  "planLabel": "HiveMind Pro",
  "stripeStatus": "active",
  "quota": { "limit": 300, "used": 10, "remaining": 290, "resetAt": "2026-07-01T00:00:00+00:00" },
  "access": {
    "canChat": true,
    "canCreateProject": true,
    "canManageBilling": true,
    "canRunAnalysis": true
  },
  "actions": { "checkout": false, "portal": true },
  "isFreeMember": false,
  "inGracePeriod": false,
  "needsCheckout": false,
  "paymentIssue": false
}
```

UI assertions:

- Pill `HiveMind Pro` (yellow/selected variant) — pass
- Usage `10/300 messages` — pass
- Reset label `Resets Jun 30` (spec said Jul 1 — TZ formatter bug, value is correct in source)
- Action row: Manage Billing only (Subscribe absent because `sub_TEST` exists → `actions.checkout: false`) — pass
- No banner above input — pass
- Composer enabled, placeholder `"Reply to HiveMind..."` — pass

Portal click skipped per standing note (cus_TEST would 404 in Stripe).

### B — Free user, no Stripe customer — PASS

SQL: `entitlement='free'`, `plan_key='free'`, `message_limit=5`, no
customer/sub, no grace.

API payload:

```json
{
  "plan": "free",
  "planLabel": "Free",
  "stripeStatus": null,
  "quota": { "limit": 5, "used": 0, "remaining": 5, "resetAt": null },
  "access": {
    "canChat": true,
    "canCreateProject": true,
    "canManageBilling": false,
    "canRunAnalysis": true
  },
  "actions": { "checkout": true, "portal": false },
  "isFreeMember": false,
  "inGracePeriod": false,
  "needsCheckout": false,
  "paymentIssue": false
}
```

UI assertions:

- Pill `Free` (gray/standard variant, not yellow) — pass
- Usage `0/5 messages`, no Resets line (both date fields null) — pass
- Action row: Subscribe only (no Manage Billing — `actions.portal: false`) — pass
- No banner — pass
- Composer enabled (free quota remaining) — pass

Confirms the `resolvePlan` legacy-tier branch returns `'free'` cleanly when
`entitlement='free' + plan_key='free' + null stripe_status`.

### F — Quota exhausted + preservation — PASS (with F-deviation)

SQL: scenario A reset, then bumped `billing_message_count = message_limit`
mid-test while operator held the composer with text + attachment.

**Preservation sequence — the critical assertion of this PR:**

1. Hard refresh `/agent` to load fresh `canChat: true` into React Query.
2. Composer state primed:
   - Typed `"Preservation smoke test message — should survive billing block"`
   - Attached `smoke-test.png` (70-byte 1×1 PNG) via paperclip
   - Chip rendered: `smoke-... ×` with badge `1/5 files · 70B/8.0MB`
3. SQL applied server-side to exhaust quota (client cache stays stale).
4. Hit send.

What survived (all four preservation criteria):

- Typed text remained in composer (`textarea.value.length === 62`)
- Attachment chip stayed attached, chip × button still present
- No empty/stale user bubble in conversation history (welcome screen
  untouched — optimistic echo reverted)
- `<BillingBanner>` rendered above input with destructive variant + exact
  copy: `"300 messages used this period — resets Jun 30."` + `Manage Billing`
  button

Disabled-state assertions after the bounce:

- `textarea.disabled === true`
- `textarea.placeholder === "Manage billing to continue chatting."`
- Toast fired: `"Failed to generate response / Monthly message limit reached"`

API refetch after the 429:

```json
{
  "access": {
    "canChat": false,
    "canCreateProject": false,
    "canManageBilling": true,
    "canRunAnalysis": false
  },
  "actions": { "checkout": false, "portal": true },
  "quota": { "limit": 300, "used": 300, "remaining": 0, "resetAt": "2026-07-01T00:00:00+00:00" },
  "paymentIssue": false,
  "needsCheckout": false,
  "stripeStatus": "active"
}
```

**Deviation:** `+ new project` button (verified in two states — see "Findings
to triage" §2).

### G — Past-due priority over quota — PASS

SQL: `stripe_status='past_due'` AND `billing_message_count == message_limit`
simultaneously. The priority showdown.

API payload:

```json
{
  "plan": "pro",
  "stripeStatus": "past_due",
  "quota": { "used": 300, "remaining": 0 },
  "access": {
    "canChat": false,
    "canCreateProject": false,
    "canRunAnalysis": false,
    "canManageBilling": true
  },
  "actions": { "checkout": false, "portal": true },
  "paymentIssue": true,
  "inGracePeriod": false,
  "needsCheckout": false
}
```

Banner above input:

- Variant: destructive (red/destructive tint, verified in DOM)
- Copy: `"Payment issue — please update your payment method."`
- Button: `Update Payment` (route to portal)
- Does **NOT** show the quota copy even though `quota.remaining === 0` — priority order proven.

Dropdown:

- Pill: HiveMind Pro (payment state doesn't affect plan badge)
- Usage: 300/300 messages, Resets Jun 30
- Single action button: `Update Payment` (Subscribe correctly hidden by the
  past-due branch in `selectBillingActions`; portal action is relabeled to
  match the failure mode)

Composer: disabled, placeholder `"Manage billing to continue chatting."`.

### H — Grace period active (non-blocking) — PASS

SQL: `grace_period_ends_at = now() + interval '14 days'` (resolves to
`2026-06-13T23:33:58+00:00`), `stripe_status='active'`,
`billing_message_count=0`.

API payload:

```json
{
  "inGracePeriod": true,
  "graceEndsAt": "2026-06-13T23:33:58+00:00",
  "access": {
    "canChat": true,
    "canCreateProject": true,
    "canRunAnalysis": true,
    "canManageBilling": true
  },
  "actions": { "checkout": false, "portal": true },
  "needsCheckout": false,
  "paymentIssue": false,
  "stripeStatus": "active"
}
```

Banner above input:

- Tailwind: `border-primary/40 bg-primary/5` — **info** variant (primary
  tint, not destructive red) — verified
- Copy: `"Beta access ends Jun 13 — set up your subscription to continue."`
- Subscribe button rendered

Dropdown:

- Pill: `"HiveMind Pro · Beta"` (the `· Beta` suffix only renders while
  `inGracePeriod === true`) — pass
- Usage: 0/300 messages, Resets Jun 30
- `<GracePeriodNotice>` inner card present:
  `space-y-2 rounded-md border border-primary/40 bg-primary/5 p-3` — exact spec match
- Notice copy + small Subscribe button inside the notice
- Action row below notice: Manage Billing (the in-notice Subscribe acts as
  the grace-specific CTA; `actions.checkout: false` because `sub_TEST` exists)

Composer: `disabled: false`, placeholder `"Reply to HiveMind..."` — grace is
non-blocking, chat usable.

### I — Grace expired, no Stripe sub — PASS

SQL: `grace_period_ends_at = now() - interval '1 day'`,
`stripe_subscription_id`/`stripe_customer_id`/`stripe_status` all NULL.

API payload:

```json
{
  "graceEndsAt": "2026-05-29T23:37:23+00:00",
  "inGracePeriod": false,
  "needsCheckout": true,
  "paymentIssue": false,
  "stripeStatus": null,
  "access": {
    "canChat": false,
    "canCreateProject": false,
    "canManageBilling": false,
    "canRunAnalysis": false
  },
  "actions": { "checkout": true, "portal": false }
}
```

Banner above input:

- Tailwind: `border-destructive/40 bg-destructive/5` — destructive variant
- Copy: `"Subscribe to continue using HiveMind."` (NOT the grace-ending info
  variant — grace is in the past)
- Button: `Subscribe`

Dropdown:

- Pill: `"HiveMind Pro"` plain — **no** `· Beta` suffix (grace expired
  flipped `inGracePeriod` to false)
- Usage: 0/300 messages, Resets Jun 30
- **No** `<GracePeriodNotice>` block (only renders while
  `inGracePeriod: true`)
- Action row: Subscribe only (no Manage Billing — `actions.portal: false`)

Composer: `disabled: true`, placeholder `"Manage billing to continue
chatting."`.

Isolates the `needs-checkout` branch by itself — mid-priority between past-due
(G) and quota (F).

### J — Portal no-customer fallback — **FAIL**

See "Findings to triage" §1. The route returns
`HTTP 500 {error: "App URL not configured"}` instead of the spec'd
`HTTP 400 {error: "no_stripe_customer"}`.

### K — Onboarding upload blocked — PASS

State: scenario F (quota exhausted), navigated to `/onboarding` from the
projects page.

Action: file-upload smoke-test.png onto the upload input.

Result:

- Toast (info variant, blue check icon):

  > **Subscribe to create a new project**
  > Your subscription needs attention before uploading project files. Open
  > Manage Billing from the account menu to continue.

- Exact copy match — not the old `"Upload failed: billing_error"` string
- No placeholder file chip lingered in the composer
- API `canChat: false, canCreateProject: false, used: 300, limit: 300` —
  sidebar usage refreshed within the wait window

### L — Unauth network guard — PASS

Procedure (no incognito tab available):

1. Cleared all cookies + localStorage + sessionStorage on `localhost:3000`
2. Cleared network capture buffer
3. Navigated to `/auth/login`
4. Waited for page render
5. Re-read network capture, filtered by `/api/subscription/status`

Result: **zero** matching requests. Login page rendered cleanly. The
`enabled: !!userId` guard on the React Query hook holds.

After login the request fires automatically (verified earlier in the run —
every other scenario started with a fresh login + status fetch).

---

## What was NOT covered (skipped)

- **C** — Subscribe → Stripe Checkout: needs Stripe CLI listen forwarding to
  localhost (or staging webhook firing back) so the post-redirect state
  syncs the real `cus_...`. Without that, checkout "succeeds" but the row
  never receives the customer id.
- **D** — Manage Billing → Customer Portal: depends on C populating a real
  customer first.
- **E** — Checkout cancel path: cheap to add once C is wired (just back-arrow
  on the Stripe Checkout page and confirm `?checkout=cancel` toast).

These three primarily validate Stripe wiring that was already shipped — the
new PR-6 delta (preservation, banner priority, grace card, onboarding gate)
is fully covered above.

## Recommended next commits

1. **Backend / routes / docs** — reorder the portal handler so the customer
   check fires before the env-derived URL string; add unit test asserting
   `no_stripe_customer` is returned when the row has no customer.
2. **UI billing surfaces** — gate `+ new project` (projects page) and
   `new chat` (sidebar) on `canCreateProject`/`canChat`; dim button + emit
   the spec'd info toast on click; force-UTC the period-end date formatter.
3. **Chat / project gating tests** — add a Playwright spec mirroring F's
   preservation sequence and K's upload-time toast so this never regresses
   silently.
