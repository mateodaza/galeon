/**
 * The closing mark's ambient light, for when nothing on the page lights the plate (no mouse over
 * the band, and always on touch): once the reveal is done, a slow light walks along the water
 * band from the lower horn and climbs the sails, then goes out; one pass every PERIOD seconds,
 * at about a third of the pointer's strength. It is a pure function of the reveal clock, so it
 * pauses with the engine (off-screen, hidden tab) and a frozen frame (#t) shows it exactly.
 */
import type { Light } from './reveal'
import { T_REVEAL } from './reveal'
import { easeSine, sstep } from './tone'

/** Strength, and seconds: the wait after the reveal, one pass, and one pass to the next. */
const K = 0.3
const DELAY = 1.5
const PASS = 6.5
const PERIOD = 11

type Pt = readonly [number, number]

/** Waypoints in plate shares: the lower horn, along the water band, then up the main sail. */
const WAYPOINTS: readonly Pt[] = [
  [0.97, 0.55],
  [0.86, 0.79],
  [0.68, 0.92],
  [0.56, 0.86],
  [0.56, 0.64],
  [0.51, 0.42],
  [0.48, 0.26],
]

/** Catmull-Rom through the waypoints, sampled evenly by length so the light keeps one pace. */
const PATH: readonly Pt[] = (() => {
  const P = WAYPOINTS
  const at = (i: number): Pt => P[Math.max(0, Math.min(P.length - 1, i))]
  const raw: Pt[] = []
  for (let s = 0; s < P.length - 1; s++) {
    const [a, b, c, d] = [at(s - 1), at(s), at(s + 1), at(s + 2)]
    for (let j = 0; j < 16; j++) {
      const t = j / 16
      const cr = (k: 0 | 1): number =>
        0.5 *
        (2 * b[k] +
          (c[k] - a[k]) * t +
          (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t * t +
          (3 * b[k] - a[k] - 3 * c[k] + d[k]) * t * t * t)
      raw.push([cr(0), cr(1)])
    }
  }
  raw.push(P[P.length - 1])
  const len = [0]
  for (let i = 1; i < raw.length; i++)
    len.push(len[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]))
  const total = len[len.length - 1]
  const out: Pt[] = []
  for (let n = 0, i = 1; n <= 64; n++) {
    const want = (total * n) / 64
    while (i < raw.length - 1 && len[i] < want) i++
    const f = (want - len[i - 1]) / Math.max(1e-9, len[i] - len[i - 1])
    const p = raw[i - 1]
    const q = raw[i]
    out.push([p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f])
  }
  return out
})()

function pathAt(f: number): Pt {
  const v = Math.max(0, Math.min(1, f)) * (PATH.length - 1)
  const i = Math.min(PATH.length - 2, Math.floor(v))
  const g = v - i
  return [
    PATH[i][0] + (PATH[i + 1][0] - PATH[i][0]) * g,
    PATH[i][1] + (PATH[i + 1][1] - PATH[i][1]) * g,
  ]
}

/** The ambient light at reveal time t: [x, y] in plate shares and its strength. */
export function ambientAt(t: number): [number, number, number] {
  const a = t - T_REVEAL - DELAY
  if (a < 0) return [...pathAt(0), 0]
  const u = (a % PERIOD) / PASS
  if (u >= 1) return [...pathAt(1), 0]
  const k = K * sstep(0, 0.2, u) * (1 - sstep(0.72, 1, u))
  return [...pathAt(easeSine(u)), k]
}

export interface Ambient {
  /** The page set the light (a mouse, a scroll): the ambient waits until that light is out. */
  yieldTo(): void
  /** Aims the light for reveal time t if the ambient may hold it; true when it does. */
  aim(t: number): boolean
  /** True while the ambient holds the light: it moves slowly, so idle frames are enough. */
  readonly holds: () => boolean
}

export function createAmbient(light: Light): Ambient {
  let holds = false
  let page = false
  return {
    yieldTo() {
      holds = false
      page = true
    },
    aim(t) {
      if (page) {
        if (light.strength() >= 2e-3 || light.moving()) return false
        page = false
      }
      const [x, y, k] = ambientAt(t)
      light.set(x, y, k)
      holds = true
      return true
    },
    holds: () => holds,
  }
}
