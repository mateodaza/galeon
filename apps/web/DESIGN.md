# Galeon public site: design record

Updated 26 October 2026. Covers the public site (`/`, `/about`, `/roadmap`), the brand assets and the SEO setup. The wallet app under `app/(app)` keeps its own styling; only its logo comes from here.

The "chart room" direction (contours, compass rose, Fraunces, brass) and the ring-and-sail G mark were rejected on 24 October 2026 and have been removed.

## Direction: paper, ink and sea

Approved on 25 October 2026 as the round-4 prototype: Plain Sight's quiet, ruled structure with Intaglio's engraved mark as the one living object, at Aztec scale. Restraint everywhere except the mark and the display type.

- One artistic moment: the master mark engraved in lines in the hero (canvas), and again as a static engraving on the closing band.
- Very large light display type with hanging lines; few words per screen.
- Content in ruled rows and columns: facts row, three steps with line diagrams, a who-sees-what table, a dated trust ledger with a plan beside each gap.
- Full-bleed bands for the problem (ink), the creed (sea) and the close (sea).
- No dark mode yet. No cookies or trackers.

## Colour

Tokens live on `.site` in `app/(marketing)/site.css`.

| Token                    | Value                      | Role                                   |
| ------------------------ | -------------------------- | -------------------------------------- |
| `--paper`                | `#F2EEE6`                  | Page ground                            |
| `--ink`                  | `#0E1A26`                  | Text, nav lockup, the ink band         |
| `--ink-2` / `--ink-3`    | `#474F56` / `#656A6F`      | Body and muted text (AA on paper)      |
| `--sea`                  | `#1D5C5E`                  | The big mark, sea bands, small accents |
| `--sea-dk`               | `#93C6C7`                  | Sea on the ink band                    |
| `--rule` / `--rule-2`    | ink at 13% / 30%           | Rules                                  |
| `--plate-ink` / `-water` | sea on paper, paper on sea | The engraved mark (one colour)         |

Never red, never gilt, nothing on the crescent's vertical axis (Red Crescent and star rules in the logo's `usage_locks`). White only as a hover on dark grounds.

## Type

- **Switzer** (Indian Type Foundry, ITF Free Font License), self-hosted from `app/fonts/` through `next/font/local`, weights 300, 400 and 500. Display is 300 with -0.045em tracking; body 400; labels and buttons 500.
- **Fragment Mono** through `next/font/google`, 400, for the step footers and diagram labels only.
- Both load in `app/(marketing)/layout.tsx` only, so the wallet app never downloads them. The wallet app keeps its system stack (`Inter`, then `system-ui`) as on `main`.
- Display sizes: `DisplayTitle` sets `--dk` (desktop size against a 1344 px column) and `--ph` (phone size against 390 px) from `content/*.ts`. Each headline has a desktop set of hanging lines and a phone break; screen readers get the sentence once.

## Layout

- 12 columns, 48 px gutters (32 px under 1100, 20 px under 760), max 1440 px.
- The nav is solid paper and sticky; under 900 px the section links move into a `<details>` menu that works without JavaScript.
- Every section is a server component and reads in full without JavaScript. The only client components are the menu (`components/marketing/site-menu.tsx`) and the hero canvas (`components/marketing/hero-mark.tsx`).
- On a 390 x 844 phone the hero mark sits at y 379 to 695, inside the first screen.

## The hero mark

The sea becomes the ship. A field of identical teal hairlines is cut across the plate, left to right, behind a burin's dark point. The swell calms and the two sails show faintly in it. From 1.0 s the waterline rows lift and wind onto the moon's outer circle like thread taken up on a drum: every row shares one wrap angle, so no two lines cross. The sails take ink in place, foot first, and the rest of the sea withdraws. The mark lands at about 2.4 s and settles at 3.2 s; after that only the water band drifts, at 20 frames a second. As the hero scrolls away the upper horn unwinds a little toward the sea and the sea returns round the mark, never across it. All of it is reversible. Captions and comments should say "the same public lines, held differently", never "raising the galleon".

`components/marketing/hero-mark.tsx` is thin. It mounts the engine from `lib/hero-mark/engine/`, feeds it the hero's scroll progress, and hands over to a static SVG (`components/marketing/mark-plate.tsx`) when there is no JavaScript, under reduced motion (the engine is never mounted), with `#reduced`, if the engine cannot start, or if it has not drawn within 2.5 s. If the static mark is already showing when the component hydrates, the engine starts settled.

Engine contract (`lib/hero-mark/engine/index.ts`):

```ts
mount(canvas: HTMLCanvasElement, options?: HeroMarkOptions)
  => { destroy(): void; setScroll(p: number): void; renderAt(t, scroll?): number; info(): HeroMarkInfo }
```

- The engine owns its loop (rAF while forming, a 20 fps timer once settled, redrawing only when something changed), sizing (ResizeObserver), pausing (IntersectionObserver and `visibilitychange`) and a slow-device governor (coarser cut, then a jump to the settled mark, if the p90 draw time passes 12 ms). It never writes styles or attributes.
- Colour comes from the canvas's computed `--plate-ink`.
- The canvas reaches past the plate square so the sea can dissolve. The bleed is set only in `site.css` (`--bleed-t`, `--bleed-r`, `--bleed-b`, `--bleed-l` on `.plate`); the component passes the engine a `layout` that reads the plate square from the DOM. The bleed is short on the headline's side.
- The engine's geometry is in `engine/mark.ts`, inlined from the logo's `constants.json`. The static SVG reads `lib/hero-mark/mark.ts`, generated from the same file, and both use the viewBox `3.031 0.76 60.48 60.48`, so they line up.
- Review flags in the URL hash, combined with `&` and followed on hashchange: `#t=1.5` freezes the formation at 1.5 s, `#still` shows the settled frame, `#scroll=0.4` forces scroll progress, `#reduced` shows the static mark.
- Cost on the production build in headless Chrome: 1.6 ms median and 3.1 ms p90 per frame at 1440 x 900 on DPR 2; 0.6 ms and 1.6 ms on a 390 x 844 phone at DPR 3, and 5.8 ms p90 with the CPU throttled six times.

## Brand assets

The mark is Mateo's chosen redraw of the January 2026 logo: a crescent opening up and to the right, two sails with the mast as the gap between them, and a wave cut into the lower horn. Built from five circles and two Bézier leeches on a 64-unit grid, in three cuts: master (64 px and up), mid (25 to 63 px, no wave), small (24 px and under).

| File                                                       | Use                                                     |
| ---------------------------------------------------------- | ------------------------------------------------------- |
| `components/brand/paths.ts`                                | Path data for the three cuts and the nav lockup         |
| `components/brand/mark.tsx`                                | `Mark`: master cut, `currentColor`                      |
| `components/brand/mark-nav.tsx`                            | `MarkNav`: mid cut, `currentColor`                      |
| `components/brand/lockup.tsx`                              | `Lockup`: mid cut plus "Galeon" (Jost, outlined)        |
| `public/brand/galeon-*.svg`                                | The logo's SVG set (marks, lockups, app icons, on dark) |
| `public/brand/galeon-icon-{192,512,maskable-512}.png`      | Manifest icons and the JSON-LD logo                     |
| `app/icon.svg`, `app/apple-icon.png`, `public/favicon.ico` | Browser and home-screen icons (small cut, night tiles)  |

Colour rule from the logo: sea `#1D5C5E` for the big mark, ink for anything under 64 px. Source of truth: the logo research folder `research/logo/final/` (`constants.json`, `build.py`), which is not in the repo yet. `paths.ts` and `lib/hero-mark/mark.ts` were generated from it by `research/round5/port/gen.py`; regenerate both if the geometry changes.

## Copy

All words live in `content/landing.ts`, `content/about.ts` and `content/roadmap.ts`. The brand name comes from `SITE_NAME` in `lib/site.ts`. Voice: "you" is the person being paid, "we" is the team, every sentence is true of the code today or marked as intent. Never "mixer", "untraceable", "anonymous", "audited" for our own code, "production-ready" or finance framing; no competitor names; no em dashes in headlines. The roadmap's gaps and plans must match the trust ledger on the landing.

## SEO and sharing

- `app/layout.tsx`: `metadataBase`, title template, description, keywords, canonical, Open Graph, Twitter card, robots, theme colour.
- `lib/page-metadata.ts` builds About and Roadmap metadata; Next replaces nested `openGraph` and `twitter` objects wholesale, so it repeats every field.
- JSON-LD (`Organization`, `WebSite`, `SoftwareSourceCode`) is in `app/(marketing)/layout.tsx`. No `FAQPage`: the site shows no FAQ (`content/faq.ts` is kept for a future one).
- Social cards: `lib/og/render.tsx` draws paper, the engraved mark in sea and the headline in Switzer Light, for `/`, `/about` and `/roadmap`. Satori cannot read WOFF2, so `lib/og/fonts/` holds WOFF copies of Switzer 300 and 400.
- `app/robots.ts`, `app/sitemap.ts`, `app/manifest.ts` read `lib/site.ts`. `app/(app)/layout.tsx` sets `noindex` for the wallet app, and `robots.ts` disallows the same paths.

When the domain changes, set `NEXT_PUBLIC_SITE_URL` (or the default in `lib/site.ts`) and redeploy. Everything else follows.

## Domain

**Decided 24 October 2026: galeonprotocol.org.** Mateo registered it at Namecheap the same day (registry record: created 2026-10-24, expires 2028-10-24, transfer lock on, Namecheap DNS, no records yet). It was preferred over galeon.network because it says which Galeon this is (the name is shared with a yacht builder, a French health-records company and a finance product on Base), .org fits an open-source public good, and it renews at about USD 11 a year against about USD 35. No short alias is planned; galeon.finance does that job as a redirect.

Cutover, in order:

1. Namecheap: turn on auto-renew, keep the transfer lock, and consider registering it to CartagenaOnChain (the DPG Standard asks for clear ownership).
2. Email: add forwarding for hello@galeonprotocol.org the same way galeon.finance does it, plus an SPF record. Forwarding only receives mail; sending from the address needs a mailbox provider and DKIM/DMARC. Keep hello@galeon.finance as the UNICEF contact until the switch is announced from that address. Then set `CONTACT_EMAIL` in `lib/site.ts` so "Write to the team" stops falling back to GitHub issues.
3. Website: when the redesign ships, add galeonprotocol.org to the Vercel project that serves galeon.finance, make it the primary domain, and 301 galeon.finance to it path by path. Then set `NEXT_PUBLIC_SITE_URL=https://galeonprotocol.org` (or change the default in `lib/site.ts`), so canonical URLs, the sitemap and social cards follow. Do not switch the canonical before the domain resolves.
4. Keep galeon.finance renewed through the UNICEF decision and any contract year, so its email and redirects keep working.
