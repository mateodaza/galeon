/**
 * The closing mark: the settled engraving, inked once from the waterline up when its band comes
 * into view. A level front rises through the plate with a slight swell on its edge; lines start
 * as hairlines at the front and take their full weight a few pitches below it, so the plate
 * prints the way it was cut. After that only the water band drifts, and a soft light follows the
 * pointer (or passes once with a scroll, or walks the plate on its own: ambient.ts): the lines it
 * crosses swell a little, as engraved water catches light. The light can also turn into a shade
 * (the pointer's, on the site): an anti-lighthouse, where the lines thin away to nothing round it,
 * so whatever it rests on is hidden. Both are pure functions of the frame; `createLight` eases
 * the light, and its turn into a shade, between them.
 */
import { INK_BOX, PLATE } from './mark'
import { bezierEase, c01, sstep, swell } from './tone'

/** Seconds for the front to rise from below the waterline to above the upper horn. */
export const T_REVEAL = 2

/** The inking edge: lines take their full weight this far below the front, in units. */
const SOFT = 8
const FRONT_FROM = INK_BOX.y1 + 0.5
const FRONT_TO = INK_BOX.y0 - SOFT - 0.5
const easeFront = bezierEase(0.33, 0, 0.25, 1)

/** The light: how much a line swells at its centre, and its half-widths in units (wider than tall, as light lies on water). */
const LIGHT = 0.55
const LIGHT_RX = 15
const LIGHT_RY = 9.5
/** The shade: its radius in units (about a quarter of the plate), and the share of it fully dark. */
const SHADE_R = 15
const SHADE_CORE = 0.3
/** Easing time constants of the light's position and strength, seconds. */
const TAU_POS = 0.42
const TAU_K = 0.55

/** What a frame of the closing mark adds to the settled ink. */
export interface InkFx {
  /** The front, in units (y down): ink lies below it. At or above FRONT_TO the plate is whole. */
  readonly front: number
  /** Time that moves the front's swell. */
  readonly T: number
  /** Light centre in units, and its strength 0..1. */
  readonly lx: number
  readonly ly: number
  readonly lk: number
  /** 0: the light swells the lines it crosses. 1: it is a shade, and hides them. */
  readonly shade: number
  /** Widest a lit line may grow, CSS px (so lines never merge), and the hairline, CSS px. */
  readonly cap: number
  readonly hair: number
}

/** The front at reveal time t. */
export function frontAt(t: number): number {
  return FRONT_FROM + (FRONT_TO - FRONT_FROM) * easeFront(c01(t / T_REVEAL))
}

/** Width (CSS px) of a line sample of width w at (x, y) units under the frame's effects. */
export function fxWidth(fx: InkFx, w: number, x: number, y: number): number {
  let out = w
  if (fx.front > FRONT_TO) {
    const g = (y - fx.front - 0.9 * swell(x, fx.front, fx.T)) / SOFT
    if (g <= 0) return 0
    if (g < 1) {
      const s = sstep(0, 1, g)
      out = w * s + Math.min(w, fx.hair) * (1 - s) * c01(g * 10)
    }
  }
  if (fx.lk > 1e-3) {
    let lit = out
    if (fx.shade < 1) {
      const dx = (x - fx.lx) / LIGHT_RX
      const dy = (y - fx.ly) / LIGHT_RY
      const d2 = dx * dx + dy * dy
      if (d2 < 9) lit = Math.min(Math.max(out, fx.cap), out * (1 + LIGHT * fx.lk * Math.exp(-d2)))
    }
    let shaded = out
    if (fx.shade > 0) {
      const d = Math.hypot(x - fx.lx, y - fx.ly) / SHADE_R
      if (d < 1) shaded = out * (1 - fx.lk * (1 - sstep(SHADE_CORE, 1, d)))
    }
    out = lit + (shaded - lit) * fx.shade
  }
  return out
}

export interface Light {
  /**
   * Sets the target: x and y as shares of the plate square (0..1, may run past it), strength 0..1,
   * and whether it is a shade (1) rather than a light (0).
   */
  set(x: number, y: number, k: number, shade?: number): void
  /** Jumps to the target (frozen frames, no clock). */
  snap(): void
  /** Eases toward the target by dt seconds; true while it is still moving. */
  step(dt: number): boolean
  moving(): boolean
  readonly strength: () => number
  fx(front: number, T: number, sp: number, hair: number): InkFx
}

export function createLight(): Light {
  let x = 0.5
  let y = 0.6
  let k = 0
  let tx = x
  let ty = y
  let tk = 0
  let s = 0
  let ts = 0
  // closer than this the change is invisible: the light snaps and the engine goes back to idle frames
  const moving = (): boolean =>
    Math.abs(tk - k) > 0.01 ||
    (k > 2e-3 && (Math.hypot(tx - x, ty - y) > 1e-3 || Math.abs(ts - s) > 0.01))
  return {
    set(nx, ny, nk, ns = 0) {
      // an unlit light moves at once: it comes up where it is asked, as what it is asked to be,
      // not sliding over from where it went out
      if (k < 2e-3 && tk === 0) {
        x = nx
        y = ny
        s = c01(ns)
      }
      tx = nx
      ty = ny
      tk = c01(nk)
      ts = c01(ns)
    },
    snap() {
      x = tx
      y = ty
      k = tk
      s = ts
    },
    step(dt) {
      if (!moving()) return false
      const a = 1 - Math.exp(-dt / TAU_POS)
      const b = 1 - Math.exp(-dt / TAU_K)
      x += (tx - x) * a
      y += (ty - y) * a
      k += (tk - k) * b
      s += (ts - s) * b
      if (!moving()) {
        x = tx
        y = ty
        k = tk
        s = ts
      }
      return true
    },
    moving,
    strength: () => k,
    fx(front, T, sp, hair) {
      return {
        front,
        T,
        lx: PLATE.x + x * PLATE.size,
        ly: PLATE.y + y * PLATE.size,
        lk: k,
        shade: s,
        cap: sp * 0.9,
        hair,
      }
    },
  }
}
