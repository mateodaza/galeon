/**
 * Shared maths and the plate's tone fields (as the round-4 plate): mark units in,
 * 0..1 out. Tone is carried by line width, never by colour.
 */
import { AXIS, I, O, S, SLIT_END, X, type Circle, type Sail } from './mark'

export const c01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)

export function sstep(a: number, b: number, v: number): number {
  const t = c01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}

export const easeSine = (t: number): number => 0.5 - 0.5 * Math.cos(Math.PI * t)

/** CSS-style cubic-bezier easing. */
export function bezierEase(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  return (t: number): number => {
    if (t <= 0) return 0
    if (t >= 1) return 1
    let u = t
    for (let i = 0; i < 8; i++) {
      const x = ((ax * u + bx) * u + cx) * u - t
      const d = (3 * ax * u + 2 * bx) * u + cx
      if (Math.abs(x) < 1e-6 || Math.abs(d) < 1e-6) break
      u -= x / d
    }
    return ((ay * u + by) * u + cy) * u
  }
}

/** A smooth minimum: follows a, then eases onto the ceiling b. */
export const softmin = (a: number, b: number, k: number): number =>
  b - k * Math.log1p(Math.exp((b - a) / k))

function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

export function vnoise(x: number, y: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash(xi, yi)
  const b = hash(xi + 1, yi)
  const c = hash(xi, yi + 1)
  const d = hash(xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

/** From O along the unit (dx, dy): distance to the far edge of a circle that contains O. */
function far(C: Circle, dx: number, dy: number): number {
  const Dx = O.x - C.x
  const Dy = O.y - C.y
  const b = Dx * dx + Dy * dy
  return -b + Math.sqrt(Math.max(0, b * b + C.r * C.r - (Dx * Dx + Dy * Dy)))
}

/** The swell: two slow, incommensurate sines, in units. Wavelengths stay above six pitches. */
export function swell(x: number, y: number, T: number): number {
  return (
    0.62 * Math.sin(x / 8.3 + y * 0.36 - 1.1 * T) +
    0.38 * Math.sin(x / 19.7 - y * 0.17 + 0.7 * T + 1.3)
  )
}

/** Approximate signed distance to the crescent (moon and wave band), positive inside. */
export function crescentSd(x: number, y: number): number {
  const dO = O.r - Math.hypot(x - O.x, y - O.y)
  const dI = Math.hypot(x - I.x, y - I.y) - I.r
  let d = Math.min(dO, dI)
  const th = Math.atan2(y - O.y, x - O.x)
  if (th > -0.2 && th <= SLIT_END) {
    const slit = Math.min(S.r - Math.hypot(x - S.x, y - S.y), Math.hypot(x - X.x, y - X.y) - X.r)
    d = Math.min(d, -slit)
  }
  return d
}

/** Moon wall: rim-heavy, darkest opposite the opening, thinning to hairlines at the horns. */
export function wallTone(x: number, y: number): number {
  const dx = x - O.x
  const dy = y - O.y
  const rho = Math.hypot(dx, dy) || 1e-6
  const cs = dx / rho
  const sn = dy / rho
  const inner = far(I, cs, sn)
  const outer = Math.min(O.r, far(X, cs, sn))
  const tw = outer - inner
  if (tw <= 0) return 0
  const u = c01((rho - inner) / tw)
  const light = 0.5 + 0.5 * Math.cos(Math.atan2(dy, dx) - AXIS)
  let t = (0.3 + 0.7 * Math.pow(u, 1.15)) * (0.45 + 0.55 * Math.pow(1 - light, 0.9))
  t *= sstep(0, 7, tw)
  t += 0.05 * (vnoise(x * 0.9, y * 0.9) - 0.5)
  return c01(t)
}

/** Water: fullest where the band is deepest, fading at both tips. */
export function bandTone(x: number, y: number): number {
  const dx = x - O.x
  const dy = y - O.y
  const rho = Math.hypot(dx, dy) || 1e-6
  const tb = O.r - far(S, dx / rho, dy / rho)
  if (tb <= 0) return 0
  const v = c01((rho - (O.r - tb)) / tb)
  return c01((0.42 + 0.34 * v) * sstep(0, 1.6, tb))
}

export function crescentTone(x: number, y: number): number {
  const k = sstep(-0.25, 0.25, Math.hypot(x - S.x, y - S.y) - S.r)
  if (k <= 0) return wallTone(x, y)
  if (k >= 1) return bandTone(x, y)
  return wallTone(x, y) * (1 - k) + bandTone(x, y) * k
}

/** Sails: flat cloth, tone set by distance from the luff and darkening toward the foot. */
export function sailTone(sl: Sail, x: number, y: number): number {
  const fx = c01(((x - sl.luff) * sl.dir) / sl.width)
  const foot = 0.7 + 0.3 * sstep(sl.head, sl.head + 0.75 * (sl.low - sl.head), y)
  return c01((sl.toneLuff * (1 - fx) + sl.toneLeech * fx) * foot)
}

/** Weight of the idle drift: inside the water, away from both tips. thDeg is the angle from O. */
export function bandWeight(x: number, y: number, thDeg: number): number {
  const dS = Math.hypot(x - S.x, y - S.y) - S.r
  return sstep(0, 0.35, dS) * sstep(10, 30, thDeg) * (1 - sstep(102, 130, thDeg))
}
