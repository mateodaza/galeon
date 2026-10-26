/**
 * The formation, as pure functions of time t (seconds) and scroll progress sc (0..1).
 *
 *   0.0 to 1.2  the public sea is cut in, row by row, left to right, behind a burin's dark point
 *   0.9 to 2.0  the swell calms; the sails show faintly in the sea (the moon does not)
 *   1.7 to 3.4  the waterline rows lift and wind onto circle O: every row shares one wrap
 *               angle, so no two lines ever cross, and the ink darkens right behind the front
 *   2.3 to 3.8  the sails take ink in place, foot first, from rows that were already there
 *   2.5 to 4.2  the rest of the sea withdraws, farthest first
 *   about 3.8   the mark reads; 4.5 it has landed; 5.5 settled, and only the water band drifts
 *
 * Every beat is BEATS (the round-5 timing) stretched by PACE, so the proportions hold and the
 * pace is one number. Scroll unwinds the upper horn back toward the sea (the wrap angle eases to
 * 65 %), brings the swell back, and thins the ink a little; past a fifth of the hero's scroll,
 * once the mark is visibly sinking, a ring of sea comes back round it. All reversible.
 */
import { A_L, A_R } from './mark'
import { bezierEase, c01, softmin, sstep } from './tone'

/** The beats at the round-5 pace (settled at 3.2 s), in seconds. */
const BEATS = {
  cutStart: 0.04,
  cutSpread: 0.3,
  cutDur: 0.36,
  swellA: 0.55,
  swellB: 1.15,
  ghostA: 0.45,
  ghostB: 1.0,
  wrapStart: 0.98,
  wrapDur: 1.02,
  hoistA: 1.36,
  hoistSpread: 0.42,
  hoistDur: 0.44,
  retireA: 1.45,
  retireB: 2.45,
  bowlA: 1.7,
  bowlB: 2.3,
  settled: 3.2,
} as const

/** How much slower than round 5 the formation runs: long enough to be watched, not waited for. */
export const PACE = 1.72

type Beat = keyof typeof BEATS
export const TL: Readonly<Record<Beat, number>> = Object.freeze(
  Object.fromEntries(Object.entries(BEATS).map(([k, v]) => [k, v * PACE])) as Record<Beat, number>
)

/** Weight of the sails' ghost in the calmed sea. */
const GHOST = 0.34

/** Seconds to the settled mark (5.5): after this only the water band drifts. */
export const T_SETTLED = TL.settled
/** End of the cut-in, when the burin points are gone. */
export const T_CUT_END = TL.cutStart + TL.cutSpread + TL.cutDur

const easeWrap = bezierEase(0.42, 0, 0.3, 1)

export interface FrameState {
  readonly t: number
  readonly sc: number
  /** wrap progress, linear, and the eased wrap share actually wound. */
  readonly u: number
  readonly E: number
  /** wrap angles of the left half (round the back to the upper horn) and the right (to the lower horn). */
  readonly aL: number
  readonly aR: number
  /** swell amplitude in pitches, and the share the waterline rows still carry. */
  readonly swell: number
  readonly lam: number
  /** weight of the sails' ghost in the sea. */
  readonly ghost: number
  /** weight of the whole sea. */
  readonly sea: number
  /** retirement of the sea, 0..1, farthest first. */
  readonly q: number
  /** scroll: the sea comes back round the mark. */
  readonly ring: number
  /** 0..1: the waterline rows have lifted and taken weight. */
  readonly lift: number
  /** how much of each row is still free of the moon: 1 at the start of the wrap. */
  readonly free: number
  /** the ink darkens behind the wrap front over this angle (radians). */
  readonly lag: number
  /** hairlines of the wound circles where they cross the bowl. */
  readonly bowl: number
  /** global ink weight. */
  readonly ink: number
  /** the water band's slow drift, 0 until the wrap is over. */
  readonly drift: number
}

export function stateAt(t: number, sc: number): FrameState {
  const u = c01((t - TL.wrapStart) / TL.wrapDur)
  const wound = easeWrap(u)
  const E = wound * (1 - 0.35 * sc)
  const aL = A_L * E
  const aR = Math.max(0, softmin(aL, A_R, 0.09))
  return {
    t,
    sc,
    u,
    E,
    aL,
    aR,
    swell: 1 - sstep(TL.swellA, TL.swellB, t) + 0.9 * sc,
    lam: 1 - sstep(0, 0.12, u),
    ghost: GHOST * sstep(TL.ghostA, TL.ghostB, t),
    sea: 1 - 0.38 * sstep(TL.wrapStart, TL.wrapStart + 0.6 * PACE, t) * (1 - sc),
    q: sstep(TL.retireA, TL.retireB, t),
    // held back on small scrolls, where a faint ring reads as stray dashes rather than sea
    ring: 0.75 * sstep(0.2, 0.6, sc),
    lift: sstep(0, 0.1, u),
    free: 1 - sstep(0, 0.3, E),
    lag: 0.55 * (1 - sstep(0.6, 1, wound)) + 0.03,
    bowl: 1 - sstep(TL.bowlA, TL.bowlB, t),
    ink: 1 - 0.2 * sc,
    drift: sstep(TL.wrapStart + TL.wrapDur, T_SETTLED, t),
  }
}

/** Hoist of a sail row (0 at the foot, 1 at the head) at time t, 0..1. */
export function hoistAt(order: number, t: number): number {
  const t0 = TL.hoistA + TL.hoistSpread * order
  return sstep(t0, t0 + TL.hoistDur, t)
}

/** Start of the cut of a sea row (0 top, 1 bottom). */
export const cutStartOf = (order: number): number => TL.cutStart + TL.cutSpread * order

/** The settled frame. */
export const SETTLED: FrameState = stateAt(T_SETTLED + 1, 0)
