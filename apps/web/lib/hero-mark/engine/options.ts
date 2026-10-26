/** The engine's public types, its URL flags and layout helpers. */
import type { Box } from './geometry'
import { PATH_MARK, PLATE_VIEWBOX } from './mark'

export interface Bleed {
  readonly top: number
  readonly right: number
  readonly bottom: number
  readonly left: number
}

export interface HeroMarkOptions {
  /** Ink colour. Default: the canvas's `--plate-ink` custom property, else #1D5C5E. */
  readonly color?: string
  /** How far the canvas reaches past the plate square on each side, as a share of the square. */
  readonly bleed?: number | Bleed
  /** Where the plate square sits in the canvas (CSS px). Overrides `bleed`. */
  readonly layout?: (width: number, height: number) => Box
  /** Freeze the formation at this many seconds (the #t flag). */
  readonly freezeAt?: number | null
  /** Draw the settled mark and never animate the formation (the #still flag). */
  readonly still?: boolean
  /** Start the formation this many seconds in; T_SETTLED starts settled (late hydration). */
  readonly startAt?: number
  /** Force scroll progress (the #scroll flag). */
  readonly scroll?: number | null
  /** Force reduced motion (the #reduced flag). The media query is always honoured. */
  readonly reduced?: boolean
  /** Read #t, #still, #scroll and #reduced from location.hash, and follow hashchange. Default true. */
  readonly urlFlags?: boolean
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
  readonly governor: 'ok' | 'coarse' | 'skipped'
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

export function boxFromBleed(W: number, H: number, b: Bleed): Box {
  const sw = 1 + b.left + b.right
  const sh = 1 + b.top + b.bottom
  const size = Math.max(1, Math.min(W / sw, H / sh))
  return { x: b.left * size + (W - size * sw) / 2, y: b.top * size + (H - size * sh) / 2, size }
}

export const p90 = (a: readonly number[]): number =>
  [...a].sort((x, y) => x - y)[Math.floor(a.length * 0.9)] ?? 0

/** The static fallback: mark.svg on the plate's viewBox, so it lines up with the canvas. */
export function fallbackSvg(color = '#1D5C5E'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${PLATE_VIEWBOX}" aria-hidden="true" focusable="false"><path fill="${color}" d="${PATH_MARK}"/></svg>`
}
