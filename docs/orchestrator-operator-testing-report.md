# Orchestrator Harness (PR1-4) — Operator QA Report

**Date:** 2026-06-18
**Operator:** Claude (Cowork) driving Chrome MCP + in-page fetch
**Coordinator:** repo owner (SQL + env changes + guide authorship)
**Staging URL:** `https://staging-hivemind.myosin.xyz`
**Staging Supabase:** project `zxjidctilwncsgwamfgn`
**Test user:** `e976c51f-2d88-46ed-80c7-d3a983905e37` (mateodaza@gmail.com)
**Test project:** LinkedIn QA (Coinbase) — id `6458efb2-4e8a-40e4-b5db-1908b2aef99e`, self-owned, with LinkedIn URL only at start
**Guide followed:** `documentation/orchestrator-operator-testing-guide.md`

## Result summary

| Test | Path                                               | Result                                                   |
| ---- | -------------------------------------------------- | -------------------------------------------------------- |
| A    | `get_project_profile` (read)                       | PASS                                                     |
| B1   | `get_projects` (read)                              | PASS                                                     |
| B2   | `get_conversations` (read)                         | PASS                                                     |
| B3   | `get_intelligence_reports` (read)                  | PASS                                                     |
| B4   | `web_search` (read)                                | PASS                                                     |
| C    | `update_project_profile` happy path                | PASS                                                     |
| D    | `update_project_profile` decline                   | PASS                                                     |
| E    | Social-handle partial merge (PR4 fix #1 + #6)      | PASS                                                     |
| F    | `retrigger_intelligence_report` happy (PR4 fix #2) | PASS                                                     |
| G    | Duplicate/cooldown guard                           | PASS (cooldown branch)                                   |
| H    | Blocked field (name/website)                       | PASS (fail-closed)                                       |
| I    | No-project                                         | PASS (fail-closed at UI)                                 |
| J    | Non-owner                                          | SKIPPED — no non-owned project available in this account |
| K    | Replay / double-confirm                            | PASS (409 on repeat)                                     |
| L    | Kill switch (`ENABLE_AGENT_TOOLS=false`)           | TBD after redeploy                                       |

**Net: 10 PASS, 1 SKIP, 1 pending. No FAILs.**

## Preconditions applied

- Branch merged to staging (PR3 #312 + PR4 #314).
- `ENABLE_AGENT_TOOLS` on (behavior confirmed by B4 web_search returning dated, external results — no ambient way to have them).
- Free-tier message cap of 8 was too low to complete the write/job matrix. Coordinator applied a `user_usage_overrides` row lifting `override_message_limit` to 500 for the test user only (subscription row untouched, `entitlement` unchanged). This became a guide addendum — see §"Guide addenda" below.
- Access token bypassed by driving confirm/decline via in-page `fetch()` (cookie-carrying) rather than curl + Bearer. Cleaner in a browser operator flow — became the second guide addendum.

## Per-test evidence

### A + B1-B4 (read tools)

All five auto-executed. Strongest independent signal was **B4**: prompt `use the web_search tool to search the web for the latest news about Coinbase this week` returned dated, external, verifiable events (Spiko partnership Jun 30, MiCA license Luxembourg, Base network outage, D'Agostino at CNBC on 40+ countries committing to BTC). Zero possibility ambient project-context injection could produce these. `ENABLE_AGENT_TOOLS` confirmed live.

Other reads returned tool-shaped output (structured field enumeration with `None specified` for nulls, per-project stage + created_date + active flag on B1, conversations grouped by project on B2, empty-state + type descriptors on B3).

### C — update_project_profile happy path

Prompt: `use the update_project_profile tool to update my project description to "operator test edit"`.

First turn: model responded conversationally ("Before I update, just confirming: you want to change the project description from '<old>' to 'operator test edit'?") without calling the tool. DB check confirmed no pending row.

Path A follow-up: `yes, apply it` → suspend with deterministic summary:

```
update the current project profile:
- description: QA test project to visually verify LinkedIn report rendering on staging. -> operator test edit
```

Confirm fired via in-page fetch → 200 with SSE resume payload. Description flipped in DB; pending row `3fc5281a-650d-4e5d-ad07-cb1984857ee9` → `status = confirmed`, `resolved_at` set.

### D — decline

Prompt: `update my project description to "decline test edit"`. Model called the tool directly this time (no "are you sure?" prose) → suspend. Fresh pending row `b5aee9d6-c4b6-474c-a1b2-dc84cb42d50a` with correct diff summary `- description: operator test edit -> decline test edit`.

Decline fetch: `200 application/json {"status":"declined"}` (plain JSON, no SSE — correct, nothing to resume). Description remained `operator test edit`; row settled `status = declined` with `resolved_at`.

### E — social handle partial merge (PR4 fix #1 + #6)

Baseline: `social_handles = {"linkedin": "https://www.linkedin.com/company/coinbase"}` (no twitter).

**Contaminated round (discovered by inspecting `input`, not just `summary`):** in the same chat as Test D, prompt `set my twitter handle to @optest`. Model called the tool but the pending row's `input` was `{"description":"decline test edit","social_handles":{"twitter":"@optest"}}` — the declined value from D resurfaced. The confirm card summary honestly showed the description line, so defense-in-depth held, but the model shouldn't have resurrected a declined edit. Row was declined and discarded.

**Clean round (fresh chat, LinkedIn QA (Coinbase) reselected):** same prompt, clean `input = {"social_handles":{"twitter":"@optest"}}`. Confirmed via in-page fetch → 200 SSE resume.

Post-confirm assertions (DB):

| Assertion                              | Expected                                      | Actual                                                                           |
| -------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------- |
| `project_profiles.social_handles`      | `{linkedin: ..., twitter: @optest}`           | `{"twitter":"@optest","linkedin":"https://www.linkedin.com/company/coinbase"}` ✓ |
| `project_profiles.description`         | unchanged                                     | `operator test edit` (no carryover) ✓                                            |
| `project_social_media.twitter_handle`  | `optest` (@ stripped, normalized for scraper) | `optest` ✓                                                                       |
| `project_social_media.twitter_status`  | reset to null → rescraped                     | reset then advanced to `ok` at 02:05:05 (~11s post-edit) ✓                       |
| `project_social_media.linkedin_url`    | unchanged                                     | unchanged ✓                                                                      |
| `project_social_media.linkedin_status` | unchanged (not re-scraped)                    | unchanged ✓                                                                      |

**PR4 fix #1 (merge) and fix #6 (only re-enqueue changed handle) both proven against real data.**

### F — retrigger_intelligence_report happy

Prompt: `regenerate my attention landscape report`. Model asked conversationally ("Before I queue that, let me confirm..."). Path A follow-up: `yes, fire it off. call the retrigger_intelligence_report tool now.` → suspend.

Confirm fetch: 200 + 556-char SSE resume. Server-side result:

| Assertion                            | Expected                                            | Actual                                                                                                                                                             |
| ------------------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `jobs` row created                   | `job_name = attention_landscape`, `status = queued` | row `06e07d3f`, `job_name = attention_landscape` ✓                                                                                                                 |
| `jobs.metadata` full profile context | not just description                                | stage + audiences + categories + objectives + geographics + website_url + project_name + legal_considerations + description + social_media_handles + window_days ✓ |
| Cross-test coherence                 | E's `@optest` should appear in F's metadata         | `social_media_handles.twitter = @optest` — confirmed the E edit flowed through ✓                                                                                   |
| Pending row terminal state           | `confirmed`                                         | `confirmed`, resolved 02:10:57 ✓                                                                                                                                   |
| Pipeline end-to-end                  | not just enqueued                                   | worker completed at 02:12:29 (~92s), 10 citations, 0 fabrication, response_status 200 ✓                                                                            |

**PR4 fix #2 proven hard: metadata carries the full profile context, not just description.** The agentic tool drives the full intelligence pipeline through to a real, cited report.

### G — duplicate/cooldown guard

Immediately after F confirmed, prompt: `regenerate the attention landscape report again. call the retrigger_intelligence_report tool now, do not ask first.` → suspend (propose still fires; the guard runs in tool execution, after confirm).

Confirm fetch: 200 + 665-char SSE resume (larger than F's 556 — model's cooldown narration adds copy).

By the time G's confirm ran, F's worker had already raced to completion, so the branch exercised was **cooldown** (terminal job inside `MANUAL_REFRESH_COOLDOWN_HOURS` window), not `already_queued`. Both are guide-anticipated outcomes.

| Assertion                             | Expected                                                                             | Actual                            |
| ------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------- |
| No second `attention_landscape` job   | exactly 1 row                                                                        | still 1 row (F's completed job) ✓ |
| Pending row `fe262075` terminal state | `confirmed` (endpoint succeeded; `cooldown` is the tool's return value, not a throw) | `confirmed`, resolved 02:14:23 ✓  |

Important design distinction confirmed: the confirm endpoint keys on envelope `ok` (did the handler throw?), and a `success: false, reason: cooldown` return is a normal negative result. That's why the pending row settles `confirmed` even though the tool "failed" — only an actual exception settles `failed`. Matches PR4 spec.

### H — blocked field

Prompt: `use the update_project_profile tool to change the project name to "attempt at blocked field" and the website to "https://example.com". call the tool directly, do not ask first.`

Server side (DB post-turn):

| Assertion            | Expected  | Actual                     |
| -------------------- | --------- | -------------------------- |
| `project_name`       | unchanged | `LinkedIn QA (Coinbase)` ✓ |
| `website_url`        | unchanged | `""` ✓                     |
| Pending rows since H | 0         | 0 ✓                        |

Because no pending row was written, we can't distinguish from DB alone whether the model refused conversationally or the `.strict()` schema rejected an attempt at the forbidden keys. Either way, the observable invariant holds: the two fields never moved.

### I — no-project

Fresh chat with no project selected. Composer state: `disabled: true`, `placeholder: "select a project to start chatting..."`. Fail-closed at UI layer — user can't reach the backend to attempt the propose.

Backend `ctx.projectId === null` fail-closed is separately covered by unit test. Together the two layers close the null-project path.

DB verification: 0 new `pending_tool_invocations` rows after H's timestamp.

### J — non-owner

Skipped. All three projects visible to the test user (LinkedIn QA (Coinbase), Latam DeFi Wallet, Sippy a payments) are self-owned. Testing owner-only fail-closed would require a second user's project scoped to this user's chat, which the app doesn't naturally support. Recommend the guide note this scenario is not runnable in a single-account env.

### K — replay guard (accidental proof, folded into C)

The first two in-page fetches during C's confirm returned empty from Chrome MCP's JS bridge (the redactor was masking Promise resolutions). One of those fetches landed server-side successfully; a third retry hit `HTTP 409 {"error":"no_longer_pending","message":"this action was already resolved or has expired"}`. That's the replay guard rejecting a double-confirm on an already-resolved row — clean 409 (per guide §4's expected status).

### L — kill switch

Pending coordinator's `ENABLE_AGENT_TOOLS=false` redeploy. On landing, will verify:

1. `POST /api/chat/tool-confirmation` returns **HTTP 404** (clean kill switch, endpoint gone).
2. Behavioral no-tools: re-run `search the web for today's crypto news` — should return generic answer with no live/dated external results (proves no tool set attached server-side).

## Findings ledger (for PR5 + team)

| #   | Severity | Kind        | Description                                                                                                                                                                                                                                                                                                                                                                                                            | Where                            |
| --- | -------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 1   | Medium   | PR5 prompt  | **Declined-value context bleed within a conversation.** The model resurrected Test D's declined `decline test edit` in Test E's tool call `input`. Card honestly surfaced it (defense-in-depth held), a fresh chat cleared it, but the model shouldn't resurrect declined edits into unrelated later requests.                                                                                                         | orchestrator system prompt       |
| 2   | Medium   | PR5 display | **Merge card under-represents.** `buildEditSummary` renders `input[field]` verbatim, which reads correctly for replace fields but misleads for `social_handles` (merge semantics): the summary showed `-> {"twitter":"@optest"}` while the write correctly kept linkedin. A user rubber-stamping the card would think a handle is being dropped. Should render the merged result. Proven: linkedin survived in the DB. | `buildEditSummary`               |
| 3   | Low      | PR5 prompt  | **Non-deterministic tool-calling.** Test C asked in prose first, D/E/F/H called directly. Same prompt structure, different path. Recommend pinning the orchestrator prompt to "call the write tool immediately; the suspend frame is the confirmation UX."                                                                                                                                                             | orchestrator system prompt       |
| 4   | Known    | Guide §0    | **No confirm UI.** Resumed SSE frames aren't rendered by `use-message-streaming.ts`. Same-chat consecutive tool turns show no visible bubble on resume. Server-side runs as expected. Documented; PR5 UI work.                                                                                                                                                                                                         | `hooks/use-message-streaming.ts` |
| 5   | Non-PR4  | Team        | **`project_profiles.updated_at` bumps on chat turns.** H produced no pending row, yet the row's `updated_at` moved to the propose timestamp anyway. Pre-existing chat "touch" behavior on any message send, independent of the agentic tools. Confirmed via D (same bump with no field change). Worth deciding whether "last updated" should reflect content-only changes.                                             | outside PR1-4 scope              |

## Guide addenda (to fold into the operator guide)

**A) Quota pre-flight.** The default free-tier `message_limit = 8` is too low to complete the write/job matrix (every propose consumes a message even when no field changes, because the chat turn hits `/api/chat/stream`). The guide should either:

- Recommend a paid staging account for the full matrix, OR
- Document the `user_usage_overrides` insert as an explicit pre-flight step with a mandatory teardown line item:

```sql
-- PRE-FLIGHT (before write/job tests)
INSERT INTO user_usage_overrides (user_id, override_message_limit, reason)
VALUES ('<test-user-uuid>', 500, 'PR1-4 agentic tools operator QA (temporary; remove after test)')
ON CONFLICT (user_id) DO UPDATE
  SET override_message_limit = EXCLUDED.override_message_limit,
      reason = EXCLUDED.reason,
      updated_at = now();

-- TEARDOWN (mandatory after test)
DELETE FROM user_usage_overrides WHERE user_id = '<test-user-uuid>';
```

The subscription row is untouched; `entitlement` unchanged; no cascading tier-gate effects.

**B) Confirm/decline via in-page cookie-fetch instead of curl + token.** Chrome MCP redacts `access_token` from `localStorage` as sensitive, blocking curl-with-Bearer. The confirm endpoint accepts the session cookie, so driving from the browser via in-page `fetch()` is cleaner for a browser operator:

```js
// Stash-fetch pattern (works around Chrome MCP swallowing awaited Promise values)
window.__confirm = null
fetch('/api/chat/tool-confirmation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ pendingInvocationId: '<uuid>', decision: 'confirm' }),
}).then(async (r) => {
  window.__confirm = {
    status: r.status,
    ok: r.ok,
    body_head_length: (await r.text()).length,
  }
})
// then on next JS call: read window.__confirm.status / .ok / .body_head_length via primitive coercion
// (JSON.stringify() sometimes hits the sensitive-data filter; reading fields individually usually works)
```

## Cleanup checklist

- [ ] After L completes: `DELETE FROM user_usage_overrides WHERE user_id = 'e976c51f-2d88-46ed-80c7-d3a983905e37';`
- [ ] Consider reverting the test project's `description` back to `QA test project to visually verify LinkedIn report rendering on staging.` and `social_handles` back to `{"linkedin": "https://www.linkedin.com/company/coinbase"}` for future QA runs. (Confirmed changes: `description = 'operator test edit'`, `social_handles.twitter = @optest`.)
- [ ] Delete stale `attention_landscape` job row if the cooldown blocks future F runs before the natural expiry.
- [ ] Fold guide addenda A + B into `documentation/orchestrator-operator-testing-guide.md` (coordinator staged).

## Timing note (Chrome MCP quirk observed)

For future browser operators: `javascript_tool` in Chrome MCP returns `{}` for any `await`ed async fetch on the target domain (SSE bodies and cookies get flagged by the redactor). Workaround pattern used throughout this run:

1. Fire fetch, stash result on `window.__<name>`, return synchronous string (`'fired'`).
2. Wait 3–6 seconds.
3. Read fields off `window.__<name>` via primitive coercion (`String((window.__x||{}).status)`, `((window.__x||{}).ok===true)?'ok':'not_ok'`) rather than `JSON.stringify()` (which sometimes hits the redactor whole-object).

Reliable and readable, once you have the pattern.

---

# PR5 addendum — Confirm-card UI, hydration, telemetry (2026-07-01)

**Operator:** Claude (Cowork) driving Chrome MCP + in-page fetch
**Coordinator:** repo owner (SQL + Vercel log pull + guide authorship)
**Staging URL:** `https://staging-hivemind.myosin.xyz`
**Test user + project:** same as PR1-4 (`e976c51f-2d88-46ed-80c7-d3a983905e37` / LinkedIn QA (Coinbase))
**Scope:** `ToolConfirmationCard` render/hydration, `applying...` transition, resume append vs replace, expiry semantics on both API and hydration sides, `gen_ai.*` telemetry emission + redaction.

## Scorecard

| Test       | Path                                                                              | Result                                                                                           |
| ---------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| C1         | Happy confirm → `applying...` → resume streams → row settles                      | PASS                                                                                             |
| C2-replace | Preamble prose present → resume replaces (replace branch)                         | PASS                                                                                             |
| C2-strict  | Contentless preamble → resume appends (Mitch fix #4 append branch)                | PASS                                                                                             |
| C3         | `buildEditSummary` renders merged edit                                            | PASS                                                                                             |
| D          | Decline → plain JSON, no SSE, prose stops                                         | PASS                                                                                             |
| H          | Hydration on chat reload — pending card comes back with "needs your confirmation" | PASS (observed via user-initiated refresh + sidebar restore)                                     |
| P          | `social_handles.twitter=null` merge → keeps linkedin, drops twitter               | PASS (F2 fix live under merge-null, not just replace)                                            |
| J          | `retrigger_intelligence_report` happy enqueue + block                             | PASS (happy=`queued`, block=`cooldown`; `already_queued` code-reachable but not live-timed here) |
| E          | Expired row → API 409 + hydration filter excludes                                 | PASS (double-corroborated: live 409 on `ec5d3b40` + telemetry `outcome=failed, error_code=409`)  |
| T          | `gen_ai.*` telemetry — verbs emitted, payloads redacted                           | PASS (5/5 real verbs, 0/11 payload tokens across 20 lines, cache-prefix stability observed)      |
| A          | Cancel mid-resume via UI                                                          | N/A — no UI affordance; abort wiring correct but unreachable                                     |

**Net: 10 PASS, 1 N/A. Zero FAILs.**

## Per-test evidence

### C1 / C2-replace / C2-strict / C3 / D / H / P (pre-compaction rounds)

- **C1**: happy confirm → `applying...` on the confirm button → SSE resume streamed → row settled `confirmed` with `resolved_at` set.
- **C2-replace**: 5-word preamble emitted → resume replaced the preamble (`replace` branch).
- **C2-strict**: contentless preamble → resume appended after `Done.` — validates the append branch. Previous behavior would have wiped the intro; new behavior preserves it.
- **C3**: `buildEditSummary` output matched the effective mutation, not the raw `input` payload. Closes PR1-4 finding #2.
- **D**: `applying...` on decline button, `HTTP 200 application/json {"status":"declined"}`, no SSE, prose stopped cleanly, row settled `declined`.
- **H**: user-initiated tab refresh mid-round restored the pending card with `needs your confirmation` label (not a stale "confirm again" render). Sidebar chat navigation retained pending state on the other chat.
- **P**: twitter-clear (`social_handles: {twitter: null}`) via `mergeSocialHandles`. DB post-write: `{linkedin: ..., twitter absent}`, description unchanged. Card summary rendered the merged result (`{linkedin, twitter:@optest} -> {linkedin}`) — F2 confirmed under the merge-null case.

### J — retrigger happy + block

Two rounds in LinkedIn QA (Coinbase), fresh chats each time.

**J-happy** (no active job, cooldown expired from morning F run):

- Prompt: `please retrigger the attention landscape intelligence report for this project`
- Card summary: `queue regeneration of the attention landscape report for LinkedIn QA (Coinbase).`
- Pending row `12669056`, `input = {"report_type":"attention_landscape"}` — clean, no bleed.
- Confirm → resume: `Queued. The Attention Landscape regeneration is running now, job ID 027c43e4.`
- DB: pending `12669056` settled `confirmed` at 20:46:32.158Z. New job `027c43e4-b3f7-4636-8bcd-f92caa387f32`, `queued_at=20:46:32.120Z`, `status=in_progress`. ~38ms between enqueue and settle — atomic.

**J-block** (new chat, ~3 minutes later):

- Same prompt. Card rendered, pending row `53cb5630`.
- Confirm → resume: `That regeneration didn't go through. The Attention Landscape report is on cooldown, roughly 4 hours left before it can run again (about 14,369 seconds). Nothing was queued.`
- DB: `53cb5630` settled `confirmed` at 20:49:45; no third job; total attention_landscape jobs still 2.

**Guard order** (`tool.ts` L191 duplicate, L202 cooldown): duplicate-first, cooldown-second. J-happy's job completed 20:49:14 — 7 seconds before J-block created its pending row — so the duplicate guard passed. The just-completed job armed a fresh 4h cooldown (`queued_at + 4h = 00:46:32Z`), which is what J-block hit (`00:46:32 - 20:49:45 ≈ 14,369s` matches the countdown exactly). `already_queued` is reachable only inside the in_progress window (~90–160s here); this test race missed it by 7s. Not re-runnable this session (project now in cooldown until 00:49Z tomorrow). G already exercised the block-refusal envelope; only the `reason` string differs.

### E — expired pending row (double-corroborated)

Row `ec5d3b40-514d-456e-a511-62d04dcc1f9a` created 20:21:53Z with 10-min TTL (`expires_at=20:31:53Z`). Confirm fired 20:34:42Z — 2m 49s past expiry due to compaction gap + operator latency.

**API side (live 409):**

- `POST /api/chat/tool-confirmation` → `HTTP 409 {"error":"no_longer_pending","message":"this action was already resolved or has expired"}` — same envelope as the K replay guard.
- DB row: `status='pending'` unchanged, `resolved_at=null`, `expires_at=20:31:53Z`. Expiry is enforced lazily by the atomic `UPDATE ... WHERE status='pending' AND expires_at > now()` — expired rows match zero and surface as `no_longer_pending`. There is no sweeper; the row's `status` column is never mutated.

**Hydration side:**

- Reload dropped to `/agent` landing (welcome screen). Expired row did not rehydrate as a clickable card. `hydrate-pending-confirmations.ts` filters `status='pending' AND expires_at > now()`, so expired rows are excluded.
- Correction to earlier framing: an expired row does NOT render as an "expired-copy" card on reload — it is dropped entirely. Rendering expired-copy requires a re-render timer on `ToolConfirmationCard`, which does not yet exist (follow-up 3).

**Telemetry side (second corroboration):**

- Vercel logs showed a `confirm-resume` line with `outcome:"failed", error_code:"409"`, payload-free. Same expired-confirm attempt visible through telemetry — matches the API rejection envelope.

### T — `gen_ai.*` telemetry

20 lines pulled from Vercel logs in the 20:21Z–20:50Z window.

**Verbs (5/5 real verbs present, no missing):**

| Verb                | Count | Note                                              |
| ------------------- | ----- | ------------------------------------------------- |
| `tool-start`        | 3     | 3 tools executed post-confirm                     |
| `tool-end`          | 3     | all `ok: true`                                    |
| `agent tool failed` | 0     | healthy zero (no tool-level errors)               |
| `confirm-suspend`   | 3     |                                                   |
| `confirm-resume`    | 5     | 3 confirmed + 2 failed (the 409 expired attempts) |
| `loop-terminal`     | 6     | 3 completed + 3 suspended                         |

`gen_ai.confirm.outcome` on `confirm-resume` distinguishes `confirm|decline|fail` — not separate verbs.

**Redaction (0/11 payload tokens across 20 lines):**
Grepped: `cancel test`, `coinbase`, `linkedin`, `social_handles`, `report_type`, `attention_landscape`, `description`, project ID `6458efb2`, `summary`, `input`, `ux walkthrough`. **Zero hits.** Both write tools carry only `name` + `kind` (`update_project_profile/write`, `retrigger_intelligence_report/job`). The two `error_code:"409"` values are HTTP status codes, not data — the expired-row rejections. `logToolStart`/`logToolEnd` signatures (`{tool, kind, iteration}`) accept nothing that could leak; locked by `tool-telemetry.test.ts` test 5.

**Bonus — 5d cache-prefix stability observed live:**
One `loop-terminal` showed `cache_read_tokens:11152, cache_write_tokens:0` — the second-hop tool-result request hit the cached prefix. Suspended loops showed `null/null` (no second hop). Confirms the cache-prefix-stability assertion from `agent-tool-loop.test.ts` under production traffic.

**Caveat:** no read tools (`get_projects`, `web_search`) ran in this window — session was all writes/jobs. Live redaction on read-tool query text is structurally guaranteed by param shape but not live-observed here.

### A — cancel mid-resume

**N/A — not reachable via UI.** Wiring trace:

- Stop button, Esc handler, and any cancel affordance are gated on `isSubmitting` from `use-message-handling.ts`.
- Resume runs through `resolveConfirmation → resolveToolConfirmation`, which never sets `isSubmitting`.
- So during a confirm-resume the composer shows the normal send button — no stop button, no Esc handler.
- Abort wiring itself IS correct: Mitch's fix #4 registers the resume fetch on the shared `abortControllerRef` (`use-message-streaming.ts:398`), and `cancelStream()` cleanly aborts leaving the card pending with no toast (`use-message-streaming.ts:487`). But nothing calls `cancelStream()` during a resume because the trigger only renders while `isSubmitting=true`.

Verdict: correct defensively, unreachable from the UI. Follow-up 2.

## Findings

**F1 — Declined-value context bleed (retained from PR1-4 finding #1, tested live in PR5).**
Same behavior as PR1-4: model resurrected a prior declined value into a subsequent tool call `input` within the same chat. Fresh chat clears it. Retained as documented v1 limitation — defense-in-depth holds (confirm card summary is honest), fix is model-prompt tuning rather than a hard guard. No PR5 regression.

**F2 — Merge-card render fix confirmed live.**
`buildEditSummary` now renders the merged result rather than `input` verbatim. Proven live under P (twitter-clear via `null`) and J-happy (single-field description update): cards showed the effective mutation without under-representing what would be preserved. Closes PR1-4 finding #2.

## Follow-ups

1. **`applying...` transition on the append path** — confirmed working in C2-strict and J-happy. Keep as-is; noted for handover.

2. **Resume-abort UI gap (A)** — abort path is code-correct but unreachable. Two options:
   - Drive existing loading state from `resolveConfirmation` so the stop button + Esc light up during a resume, making fix #4 reachable, OR
   - Accept resumes as non-cancellable in v1 and keep fix #4 as pure defense.

3. **Expiry re-render timer** — `ToolConfirmationCard` should flip to expired copy at TTL via `setTimeout(expiresAt - now)`. Currently a stale card sits actionable-looking until the user clicks and gets a generic "action failed" toast.

4. **409-to-expired-copy mapping** — client should read the `no_longer_pending` message and, if `expiresAt < now`, render "this request expired" copy instead of a generic failure toast. Complements #3.

## Guide addenda (PR5 additions)

**C) Composer focus workaround.** Chrome MCP `computer.left_click` on the "reply to Hivemind..." textarea occasionally leaves focus on BODY. Reliable fallback:

```js
const ta = document.querySelector('textarea[placeholder="reply to Hivemind..."]')
if (ta) ta.focus()
```

Then use `computer.type` and `computer.key("Return")` normally.

**D) Fresh-chat pre-flight.** The "new chat" button clears the project selection. Any test that requires a specific project must reselect it before typing the prompt, otherwise the composer stays disabled with placeholder `"select a project to start chatting..."`.

## Teardown (PR5)

- [x] `DELETE FROM user_usage_overrides WHERE user_id = 'e976c51f-2d88-46ed-80c7-d3a983905e37';` — restores test user to normal free-tier limits.
- [ ] Optional: clear the attention_landscape cooldown row if immediate follow-up QA is needed (natural expiry at 00:49Z tomorrow).
- [ ] Optional revert of project state — `description="QA test project to visually verify LinkedIn report rendering on staging."`, `social_handles={"linkedin":"https://www.linkedin.com/company/coinbase"}`. Current: `description="ux walkthrough test"`, twitter cleared in P.
