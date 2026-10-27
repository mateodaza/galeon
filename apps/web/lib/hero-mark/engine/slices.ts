/**
 * Slices: the hero's glitch, after a poster's displaced scanlines, in one colour. The mark is
 * disclosed, then hidden in part, then disclosed again, so the hero acts out its own idea.
 *
 * Intro: the mark is cut into PIECES (eight) horizontal pieces of uneven height; one after another, in a
 * scrambled order, each glitches in (a few stepped sideways jumps and dropouts) and locks into
 * register, until the whole mark shows. Idle: every few seconds a spot of the mark is redacted,
 * like a word in a classified document: its blocks glitch out one after another, it stays hidden
 * for well under a second, then glitches back in. During each glitch a faint vertical tear
 * or two flashes across it. Pure functions of time, slice and place, so `#t` shows any moment.
 */
import { INK_BOX } from './mark'
import { c01 } from './tone'

/** Spans of a slice cut away (hidden), each [from x, to x] in units. */
export type Cuts = readonly (readonly [number, number])[]
/**
 * A slice's frame: its sideways shift in units, its opacity, the length of its streak in units
 * (0: none), and the spans of it cut away (hidden), if any.
 */
export type SliceFrame = readonly [dx: number, alpha: number, streak: number, cuts?: Cuts]
/** Frame of slice i, whose middle sits at y units. */
export type SliceAt = (i: number, y: number) => SliceFrame
/** A vertical hairline: x, top and bottom in units, and its opacity. */
export type Tear = readonly [x: number, y0: number, y1: number, alpha: number]

/** A fixed share in 0..1 per slice and salt: the same every frame. */
export function hash(i: number, salt = 0): number {
  const v = Math.sin(i * 12.9898 + salt * 78.233 + 1.618) * 43758.5453
  return v - Math.floor(v)
}

/** Slice heights in pitches of the engraving, [least, spread]: the intro's cut, and the idle's finer one. */
export const BANDS: readonly [number, number] = [1, 2]
export const FINE: readonly [number, number] = [1, 2]

const SPAN_Y = INK_BOX.y1 - INK_BOX.y0
const HOLD: SliceFrame = [0, 1, 0]
const GONE: SliceFrame = [0, 0, 0]

/** One glitch moment lasts G seconds, recut every TICK seconds, slices jumping up to AMP units. */
const G = 0.3
const TICK = 0.05
const AMP = 5

/**
 * A slice v seconds into a glitch, on its way in (`entering`) or out: stepped sideways jumps that
 * shrink as it settles, and dropouts, ending shown (in) or gone (out).
 */
function glitching(v: number, i: number, salt: number, entering: boolean): SliceFrame {
  const tick = Math.floor(v / TICK)
  const settle = entering ? 1 - v / G : v / G
  const dx = (hash(i * 7 + tick, salt) * 2 - 1) * AMP * (0.25 + 0.75 * settle)
  const shown =
    hash(i * 3 + tick, salt + 1) > (entering ? 0.25 + 0.5 * settle : 0.25 + 0.6 * (1 - settle))
  const streak = hash(i * 5 + tick, salt + 2) > 0.85 ? AMP * 1.2 * settle : 0
  return [dx, shown ? 1 : 0, streak]
}

/* ---------- intro: the mark disclosed in pieces ---------- */

const PIECES = 8
const START = 0.15
const STEP = 0.26

/** The pieces' lower edges in units, top to bottom, of uneven heights. */
const EDGES: readonly number[] = (() => {
  const w = Array.from({ length: PIECES }, (_, p) => 0.6 + 0.8 * hash(p, 30))
  const total = w.reduce((a, b) => a + b, 0)
  let acc = 0
  return w.map((x) => INK_BOX.y0 + SPAN_Y * (acc += x / total))
})()

/** When each piece glitches in: a scrambled order. */
const ORDER: readonly number[] = (() => {
  const idx = Array.from({ length: PIECES }, (_, p) => p)
  const rank = idx.slice().sort((a, b) => hash(a, 31) - hash(b, 31))
  const at = new Array<number>(PIECES)
  rank.forEach((p, k) => (at[p] = START + STEP * k))
  return at
})()

/** Seconds the intro takes to disclose the whole mark, with a breath after the last piece. */
export const T_SLICES = START + STEP * (PIECES - 1) + G + 0.15

const pieceOf = (y: number): number => {
  for (let p = 0; p < PIECES; p++) if (y <= EDGES[p]) return p
  return PIECES - 1
}

export function slicesIntro(t: number): SliceAt {
  return (i, y) => {
    if (y < INK_BOX.y0 - 1 || y > INK_BOX.y1 + 1) return GONE
    const v = t - ORDER[pieceOf(y)]
    if (v < 0) return GONE
    return v < G ? glitching(v, i, 40, true) : HOLD
  }
}

/* ---------- idle: a cluster of blocks hidden, then shown again ---------- */

/** The first hiding DELAY seconds after the intro; the mark then shows whole for REST to REST + REST_VAR seconds between them. */
const DELAY = 2
const REST = 3
const REST_VAR = 2
/** How long a spot stays hidden, seconds: least and spread (a moment); its blocks start up to STAGGER apart. */
const HIDE = 0.45
const HIDE_VAR = 0.4
const STAGGER = 0.1
/** A cluster: rows of blocks BLOCK_H units tall, two blocks a row at most, each BLOCK_W to BLOCK_W + BLOCK_W_VAR units wide, within REACH_X units of its centre. */
const BLOCK_H = 2.6
const BLOCK_W = 11
const BLOCK_W_VAR = 8
const REACH_X = 9

/** One hiding n: [its whole length, the cluster's centre x and y and half height in units]. */
function hiding(n: number): [number, number, number, number] {
  const half = n % 4 === 3 ? 10 + 3 * hash(n, 41) : 7 + 3 * hash(n, 41)
  const cy = INK_BOX.y0 + 8 + (SPAN_Y - 16) * hash(n, 42)
  const cx = INK_BOX.x0 + 12 + (INK_BOX.x1 - INK_BOX.x0 - 24) * hash(n, 45)
  return [2 * G + STAGGER + HIDE + HIDE_VAR * hash(n, 43), cx, cy, half]
}

/** Which hiding is under way a seconds after the first could start, and how far into it: [n, u], or null while the mark shows whole. */
function hidingAt(a: number): [number, number] | null {
  let start = 0
  for (let n = 0; ; n++) {
    if (a < start) return null
    const [len] = hiding(n)
    if (a < start + len) return [n, a - start]
    start += len + REST + REST_VAR * hash(n, 44)
  }
}

/** Whether block k is cut away u seconds into a hiding of length len, and its sideways jump in units. */
function blockState(k: number, u: number, len: number): [boolean, number] {
  const lag = STAGGER * hash(k, 51)
  const out = u - lag
  const back = u - (len - G - STAGGER) - lag
  const v = back >= 0 ? back : out
  if (out < 0 || back >= G) return [false, 0]
  if (back < 0 && out >= G) return [true, 0]
  const tick = Math.floor(v / TICK)
  const settle = v / G
  const p = hash(k * 3 + tick, back >= 0 ? 52 : 53)
  const cut = back >= 0 ? p > 0.2 + 0.8 * settle : p < 0.2 + 0.8 * settle
  return [cut, (hash(k * 7 + tick, 54) * 2 - 1) * 2.5 * (1 - 0.7 * settle)]
}

/** The idle s seconds after the intro, or null while the mark shows whole. */
export function slicesIdle(s: number): SliceAt | null {
  const at = hidingAt(s - DELAY)
  if (!at) return null
  const [n, u] = at
  const [len, cx, cy, half] = hiding(n)
  return (_i, y) => {
    if (Math.abs(y - cy) > half) return HOLD
    const row = Math.floor((y - (cy - half)) / BLOCK_H)
    const cuts: [number, number][] = []
    for (let j = 0; j < 2; j++) {
      const k = n * 211 + row * 2 + j
      // the blocks overlap into one solid spot, a redaction, with a ragged edge
      if (hash(k, 55) < (j === 0 ? 0.04 : 0.3)) continue
      const [cut, dx] = blockState(k, u, len)
      if (!cut) continue
      const w = BLOCK_W + BLOCK_W_VAR * hash(k, 56)
      const x = cx + (hash(k, 57) * 2 - 1) * REACH_X - w / 2 + dx
      cuts.push([x, x + w])
    }
    return cuts.length ? [0, 1, 0, cuts] : HOLD
  }
}

/** Vertical tears s seconds after the intro: a faint hairline or two across the cluster while it glitches. */
export function glitchTears(s: number): Tear[] {
  const at = hidingAt(s - DELAY)
  if (!at) return []
  const [n, u] = at
  const [len, cx, cy, half] = hiding(n)
  const edge = G + STAGGER
  const v = u < edge ? u : u > len - edge ? u - (len - edge) : -1
  if (v < 0) return []
  const out: Tear[] = []
  const tick = Math.floor(v / (TICK * 2))
  for (let j = 0; j < 2; j++) {
    if (hash(n * 13 + tick * 3 + j, 47) > 0.55) continue
    const x = cx + (hash(n * 13 + tick * 3 + j, 48) * 2 - 1) * (REACH_X + 4)
    const reach = half + 2 + 4 * hash(n * 13 + j, 49)
    out.push([x, cy - reach, cy + reach, 0.45 * c01(1 - Math.abs(v / edge - 0.5) * 2 + 0.3)])
  }
  return out
}
