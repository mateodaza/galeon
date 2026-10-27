/** The engine's public types, its URL flags and layout helpers. */
import type { Box } from './geometry'
import type { GovernorState } from './governor'
import { PATH_MARK, PLATE_VIEWBOX } from './mark'

export interface Bleed {
  readonly top: number
  readonly right: number
  readonly bottom: number
  readonly left: number
}

export interface HeroMarkOptions {
  /**
   * 'formation' (default): the hero. 'reveal': the closing mark, the settled engraving inked once
   * from the waterline up when the canvas comes into view (start it at T_REVEAL to skip that),
   * with a light or shade set by `setLight`. Times and flags then count on the reveal.
   */
  readonly mode?: 'formation' | 'reveal'
  /**
   * Formation mode: how the mark arrives. 'formation' (default): the sea becomes the ship.
   * 'slices': the mark is disclosed in eight glitched pieces, then every few seconds a small
   * cluster of blocks of it glitches out, stays hidden for a moment and glitches back in (slices.ts). Times and flags then
   * count on it.
   */
  readonly intro?: 'formation' | 'slices'
  /** Reveal mode: false holds the water band still. Default true. */
  readonly drift?: boolean
  /** Reveal mode: the visible share of the canvas that starts the reveal. Default 0.4. */
  readonly revealAt?: number
  /**
   * Reveal mode: while `setLight` leaves the plate unlit, a slow light walks the water band and
   * climbs the sails, one pass every 11 s (ambient.ts). Default false.
   */
  readonly ambient?: boolean
  /**
   * Ink colour. Default: the canvas's `--plate-ink` custom property, else #1D5C5E, re-read when
   * the theme changes (html[data-theme] or class, or prefers-color-scheme).
   */
  readonly color?: string
  /** How far the canvas reaches past the plate square on each side, as a share of the square. */
  readonly bleed?: number | Bleed
  /** Where the plate square sits in the canvas (CSS px). Overrides `bleed`. */
  readonly layout?: (width: number, height: number) => Box
  /** Freeze the formation at this many seconds (the #t flag). */
  readonly freezeAt?: number | null
  /** Draw the settled mark and never animate the formation (the #still flag). */
  readonly still?: boolean
  /** Start this many seconds in; T_SETTLED (T_REVEAL in reveal mode) starts settled (late hydration). */
  readonly startAt?: number
  /** Force scroll progress (the #scroll flag). */
  readonly scroll?: number | null
  /** Force reduced motion (the #reduced flag). The media query is always honoured. */
  readonly reduced?: boolean
  /** Read #t, #still, #scroll and #reduced from location.hash, and follow hashchange. Default true. */
  readonly urlFlags?: boolean
  /**
   * Formation mode: once settled, a slow wave keeps travelling round the moon's lines and the
   * sails breathe (ink.ts), drawn whole every idle frame. It turns itself off on a device too slow
   * to draw it in time. Default false.
   */
  readonly alive?: boolean
  /** Frame rate of the settled drift. Default 20. */
  readonly idleFps?: number
  /** Slow-device governor: p90 draw time (ms) that coarsens the cut, then skips to settled. Default 12. */
  readonly maxFrameMs?: number
  /** After the first frame is drawn (use it to hide a static fallback). */
  readonly onFirstFrame?: () => void
  /** Once, when the formation has settled. */
  readonly onSettle?: () => void
}

export interface HeroMarkHandle {
  /** Stops every loop, timer and listener. The canvas keeps its last frame. */
  destroy(): void
  /** Hero scroll progress: 0 with the hero in place, 1 once it has scrolled away. */
  setScroll(p: number): void
  /**
   * Reveal mode: where the light should be, as shares of the plate square (0..1, may run past
   * it), and its strength 0..1 (0 puts it out). With `shade` 1 it is a shade instead: the lines
   * round it thin away to nothing. The engine eases toward it.
   */
  setLight(x: number, y: number, strength: number, shade?: number): void
}

export interface HeroMarkInfo {
  readonly W: number
  readonly H: number
  readonly dpr: number
  readonly rs: number
  readonly pitchUnits: number
  readonly pitchCss: number
  readonly rows: number
  readonly threads: number
  readonly sailRows: number
  readonly governor: GovernorState
}

export interface HeroMarkInstance extends HeroMarkHandle {
  /** Draws one frame at (t, scroll) and returns its cost in ms (profiling and frame capture). */
  renderAt(t: number, scroll?: number): number
  info(): HeroMarkInfo
}

export interface Flags {
  t: number | null
  still: boolean
  scroll: number | null
  reduced: boolean
}

export function readHash(): Partial<Flags> {
  const out: Partial<Flags> = {}
  const parts = (typeof location === 'undefined' ? '' : location.hash)
    .replace(/^#/, '')
    .split(/[&,+;]/)
  for (const kv of parts) {
    const [k, v] = kv.split('=')
    const n = v === undefined ? NaN : parseFloat(decodeURIComponent(v))
    if (k === 't' && Number.isFinite(n)) out.t = Math.max(0, n)
    else if (k === 'scroll' && Number.isFinite(n)) out.scroll = Math.min(1, Math.max(0, n))
    else if (k === 'still') out.still = true
    else if (k === 'reduced') out.reduced = true
  }
  return out
}

export const NOOP: HeroMarkInstance = {
  destroy() {},
  setScroll() {},
  setLight() {},
  renderAt: () => 0,
  info: () => ({
    W: 0,
    H: 0,
    dpr: 1,
    rs: 1,
    pitchUnits: 0,
    pitchCss: 0,
    rows: 0,
    threads: 0,
    sailRows: 0,
    governor: 'ok',
  }),
}

export function bleedOf(b: number | Bleed | undefined): Bleed {
  return typeof b === 'number'
    ? { top: b, right: b, bottom: b, left: b }
    : (b ?? { top: 0, right: 0, bottom: 0, left: 0 })
}

export function boxFromBleed(W: number, H: number, b: Bleed): Box {
  const sw = 1 + b.left + b.right
  const sh = 1 + b.top + b.bottom
  const size = Math.max(1, Math.min(W / sw, H / sh))
  return { x: b.left * size + (W - size * sw) / 2, y: b.top * size + (H - size * sh) / 2, size }
}

/** The static fallback: mark.svg on the plate's viewBox, so it lines up with the canvas. Ink follows --plate-ink. */
export function fallbackSvg(color = 'var(--plate-ink, #1D5C5E)'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${PLATE_VIEWBOX}" aria-hidden="true" focusable="false"><path style="fill:${color}" d="${PATH_MARK}"/></svg>`
}
