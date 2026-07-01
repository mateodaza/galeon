# LinkedIn Reports QA — Staging report

**Date:** 2026-06-17
**Operator:** Claude (Cowork) driving Chrome MCP
**Account:** mateodaza@gmail.com
**Staging URL:** `https://staging-hivemind.myosin.xyz`
**Projects used:**

- Sippy a payments (Twitter URL, no LinkedIn) — Test 1, Test 4
- LinkedIn QA (Coinbase) (LinkedIn URL, no Twitter) — Test 2, Test 3
- Latam DeFi Wallet — Test 5 SKIPPED (operator deferral)

## Result summary

| #   | Test                                       | Result  |
| --- | ------------------------------------------ | ------- |
| 1   | LinkedIn empty state + Twitter still works | PASS    |
| 2   | LinkedIn report opens (main check)         | PASS    |
| 3   | Chat uses LinkedIn report as context       | PASS    |
| 4   | No regression on existing reports          | PASS    |
| 5   | End-to-end create/edit flow (optional)     | SKIPPED |

Net: 4 PASS / 1 SKIPPED / 0 FAIL. No aesthetic findings.

## Per-test detail

### Test 1 — LinkedIn empty state + Twitter still works — PASS

Project: **Sippy a payments** (has Twitter `x.com/SippyLat`, no LinkedIn URL).

Dropdown opened via "view reports" — five entries rendered:

1. attention landscape (enabled)
2. competitive intelligence (enabled)
3. ecosystem dynamics (enabled)
4. twitter (enabled — `opacity: 1, cursor: pointer, pointerEvents: auto`)
5. linkedin (disabled — `opacity: 0.4, cursor: default, pointerEvents: none, disabled: true`)

Disabled state is clearly distinct from enabled. Hover on the greyed `linkedin` row shows tooltip with exact spec text:

> "add a valid LinkedIn URL to your project to get periodic reports"

Tooltip is dark bg with light text, positioned to the right of the row, wraps to 2 lines without clipping.

Twitter modal opens cleanly:

- Heading "twitter report" (lowercase)
- Subline "@SippyLat Last updated June 11, 2026"
- Body: narrative paragraph about a Dec 24, 2025 post — mentions "4 likes, 4 replies, and 369 views" (views is correct for Twitter)
- Close button top-right
- Modal centered, dark bg matching app theme

Close interactions both work:

- Escape closes (verified — modal text gone from DOM after press)
- Close button (top-right) closes (verified — modal text gone, single backdrop element left from app background)

### Test 2 — LinkedIn report opens — PASS

Project: **LinkedIn QA (Coinbase)** (LinkedIn URL `www.linkedin.com/company/coinbase`, no Twitter URL).

Dropdown showed inverted state vs. Test 1 — proves gating is symmetric:

- twitter (disabled — `opacity: 0.4, pointerEvents: none`)
- linkedin (enabled — `opacity: 1, pointerEvents: auto`)

"No reports available" header above the channel rows = analysis reports absent (expected per spec, this is a QA project without analysis runs).

LinkedIn modal contents:

| Assertion                      | Result                                                                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Heading                        | "linkedin report" (lowercase, matches Twitter modal)                                                                         |
| Handle                         | "coinbase" — no `@`, no raw URL                                                                                              |
| Last updated                   | "Last updated June 17, 2026" (today)                                                                                         |
| Markdown renders               | h2 sections "What's working" / "What isn't working" properly styled — no raw `##` or `**` literals                           |
| Engagement metrics             | "351 likes, 44 shares, 24 replies" (high) / "38 likes, 1 share, 5 replies" (low)                                             |
| No "retweets" / "views"        | Confirmed absent                                                                                                             |
| Modal style vs Twitter         | Same width, same header layout, same close-button position, same dark bg                                                     |
| Long body scrolls inside modal | Yes; header and close stay put                                                                                               |
| Real content                   | Coinbase System Update event, tokenized stocks, pre-IPO perpetuals (SpaceX), AI Agents via Claude/ChatGPT, Coinbase One Card |

Modal composition mirrors the Twitter modal from Test 1 perfectly.

### Test 3 — Chat uses LinkedIn report as context — PASS

Question asked verbatim: "What has this project been posting on LinkedIn recently, and what's working?"

Response surfaced specific, real content from the LinkedIn report (cross-referenced with Test 2 modal body):

- Real recent posts: June 4, 8, 10 teasers; June 16 "System Update" event; June 17 recap
- Real products mentioned: tokenized stocks, pre-IPO perpetuals starting with SpaceX, crypto options, prediction markets, Coinbase Advisor
- Specific high-engagement: "Bitcoin-backed mortgage post with Better (June 4) topped at 351 likes, 44 shares, 24 replies" — exact numbers match Test 2 modal
- Specific low-engagement: "June 17 stablecoin-demand note bottomed out at 38 likes" — exact match
- Strategic insight mirroring report's "What's working" section: "real-world integration stories outperform"
- Proactive follow-up question on institutional vs retail tonal direction

No refusal patterns (`I don't have that` etc.) detected. No invented content. Response formatting clean (paragraphs, no raw markdown, no overflow).

Sources panel at bottom of response showed knowledge-base context pulled in addition to the project report:

- Variant: Founder-Led Content & Social Strategy Engine
- Spexi/Layerdrone GTM Strategy and Token Launch
- Pudgy Penguins: "Face of Crypto" Case Study (2024–2025)
- Case Study: Anthropic "Claude is a Space to Think"
- Dogecoin Case Study: The Accidental Mainstream Success

The LinkedIn channel report is being used as context AND additional knowledge base entries are being referenced — clean multi-source synthesis.

### Test 4 — No regression on existing reports — PASS

Verified on **Sippy a payments**. Each of the four legacy report types opens cleanly:

| Report                   | Sections rendered                                                                                             | Modal style consistent |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- | ---------------------- |
| attention landscape      | What Shifted / Current Meta & Narrative Velocity / Consumer Tensions / Cultural Voices & Formats / References | Yes                    |
| competitive intelligence | Direct Competitors / Indirect Competitors / Threat Ranking / Positioning POV / References                     | Yes                    |
| ecosystem dynamics       | Slow-Culture & Policy Forces / References                                                                     | Yes                    |
| twitter (Test 1 reuse)   | Single narrative paragraph                                                                                    | Yes                    |

All five modals (4 above + LinkedIn from Test 2) share the same composition:

- Header: bold title + close button (top right) + (analysis-only) edit button (top right, yellow)
- Subline with bold tagline (analysis reports only) and "Report generated/updated on <date>"
- Body: rendered markdown — h2 sections, **bold** entity names, inline category tags like `[Category]` / `[Culture]` / `[Consumer]`
- References section where applicable
- Inline citation numbers (`[1]`, `[2]`) styled as muted superscript

The only deliberate UX difference: analysis reports have an extra **edit** button in the header; channel reports (Twitter, LinkedIn) do not. Not a regression.

### Test 5 — End-to-end create/edit flow — SKIPPED

Optional per spec. Operator deferred to focus on the four core verification tests. The create/edit → scrape integration affects only this scenario; if it fails, it does not invalidate Tests 1–4 since the QA project is pre-seeded.

## Aesthetic findings (Part 0 audit)

Carried Part 0's visual checklist across every screen. **No findings** worth raising:

- Alignment & spacing: clean across all modal headers, dropdown items, sidebar context, chat composer
- Overflow & truncation: long report body wraps properly; project name "LinkedIn QA (Coinb..." truncates with ellipsis only when sidebar is narrow (acceptable)
- Modal sizing: centered, doesn't exceed viewport, long content scrolls inside modal (page behind doesn't scroll)
- Typography: LinkedIn modal style is identical to Twitter modal (same fonts, casing, spacing)
- Colors & contrast: dark bg with light text reads cleanly; disabled vs enabled is a clear 0.4 vs 1.0 opacity delta
- Hover/click states: dropdown items respond, tooltip appears reliably on the disabled `linkedin` row, close button + Escape both dismiss
- Responsive: not exhaustively shrunk, but viewport at 1456×829 and 1512×805 rendered cleanly with no overlap
- Loading/empty states: "hivemind is thinking..." spinner showed during Test 3, then cleanly replaced by the rendered response. No "undefined" / "null" leakage anywhere

## Recommendations / follow-ups

- **None blocking** for this round.
- Consider whether Test 5's scraper trigger has its own QA path; if a separate operator covers it, this report is complete as-is.
- The "Sources" attribution in Test 3's chat response shows the LinkedIn channel report being merged with knowledge-base case studies — worth confirming with product that this multi-source synthesis matches the intended UX (it looks correct; just flagging for verification).
