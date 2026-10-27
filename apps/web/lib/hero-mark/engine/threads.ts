/**
 * The lifted threads: the waterline rows taken up onto circle O.
 *
 * Each row's wound part lies on its circle. Its free part leaves the wrap point on the tangent
 * and keeps bending the same way, less and less, so the rows lift as a smooth bowl, never a V.
 * The free part is the same curve for every row, scaled about O by the row's radius, and every
 * row shares one wrap angle: the threads are homothetic, so no two of them ever cross. The free
 * part shortens as the row is taken up and ends in a burin's taper. The sea under the sheaf is
 * cleared first, so rising rows never hatch across it: rows stop at the sheaf's edge, as engraved
 * rows stop at a contour.
 */
import type { FrameState } from './formation'
import { fieldAt, type Geometry } from './geometry'
import { A_L, A_R, HPI, O } from './mark'
import { emit, threadWidth, type Paths, type Scratch } from './paint'
import { sstep, swell } from './tone'

/** The free part's bend decays over this many radii. */
const CURL_DECAY = 1.1

/** The free part of a unit circle's thread at one wrap angle, relative to O: positions and outward normals. */
interface Canon {
  n: number
  ds: number
  x: Float32Array
  y: Float32Array
  nx: Float32Array
  ny: Float32Array
}
const canon: [Canon, Canon] = [mkCanon(256), mkCanon(256)]
function mkCanon(n: number): Canon {
  return {
    n: 0,
    ds: 0,
    x: new Float32Array(n),
    y: new Float32Array(n),
    nx: new Float32Array(n),
    ny: new Float32Array(n),
  }
}

/** Traces the canonical free part for one side (1 left, 0 right) up to sigma radii, every ds radii. */
function trace(side: number, a: number, curl: number, sigma: number, ds: number): Canon {
  const m = Math.max(2, Math.ceil(sigma / ds) + 2)
  if (canon[side].x.length < m) canon[side] = mkCanon(m + 64)
  const C = canon[side]
  const ang = side ? HPI + a : HPI - a
  const sgn = side ? 1 : -1
  let x = Math.cos(ang)
  let y = Math.sin(ang)
  let psi = ang + sgn * HPI
  for (let j = 0; j < m; j++) {
    C.x[j] = x
    C.y[j] = y
    C.nx[j] = Math.cos(psi - sgn * HPI)
    C.ny[j] = Math.sin(psi - sgn * HPI)
    const k = curl * Math.exp((-(j + 0.5) * ds) / CURL_DECAY)
    const mid = psi + sgn * k * ds * 0.5
    x += Math.cos(mid) * ds
    y += Math.sin(mid) * ds
    psi += sgn * k * ds
  }
  C.n = m
  C.ds = ds
  return C
}

/** A fixed share in 0..1 per thread: the same every frame, different from its neighbours. */
function stagger(k: number): number {
  const v = Math.sin(k * 12.9898 + 4.1414) * 43758.5453
  return v - Math.floor(v)
}

/** Length (units) of the free part of thread k on one side. */
function tailLength(G: Geometry, st: FrameState, k: number, side: number): number {
  const th = G.threads[k]
  const n = G.threads.length
  // the sheaf's leading end comes to a point, like a burin's exit: the middle threads run furthest,
  // and each row ends at its own length, so the end feathers instead of stopping on one cut
  const prof = (0.45 + 0.55 * Math.sin((Math.PI * (k + 0.5)) / n)) * (0.6 + 0.8 * stagger(k))
  // scrolled away, the unwound threads run out longer, straight on, back toward the sea
  const Lmin = (3 + 9 * Math.pow(1 - st.E, 1.5) + 10 * st.sc) * prof
  const half = side ? th.halfL : th.halfR
  const a = side ? st.aL : st.aR
  const rem = th.r * ((side ? A_L : A_R) - a)
  // the row is taken up, not cut: what is not yet wound stays free, down to a short lead
  return Math.max(0, Math.min(rem, half, Math.max(Lmin, half - th.r * a)))
}

/** The canonical curve at sigma radii (unit circle, relative to O), interpolated. */
function canonAt(C: Canon, sigma: number): [number, number] {
  const f = Math.min(C.n - 1.001, sigma / C.ds)
  const j = Math.floor(f)
  const t = f - j
  return [C.x[j] + (C.x[j + 1] - C.x[j]) * t, C.y[j] + (C.y[j + 1] - C.y[j]) * t]
}

/** Point of the canonical curve at sigma radii, scaled to radius r, offset along the normal by off (units). */
function pointAt(C: Canon, sigma: number, r: number, off: number): [number, number] {
  const q = canonAt(C, sigma)
  const j = Math.min(C.n - 1, Math.floor(sigma / C.ds))
  return [O.x + r * q[0] + C.nx[j] * off, O.y + r * q[1] + C.ny[j] * off]
}

/**
 * Clears the sea under the sheaf: the wound sector of the annulus (the sails keep their rows) and
 * the free parts. Returns the free parts' outline, which the sails' ghost also avoids.
 */
function clearUnder(
  c: CanvasRenderingContext2D,
  G: Geometry,
  P: Paths,
  st: FrameState,
  lens: Float32Array,
  cs: readonly Canon[]
): Path2D {
  const { ku, ox, oy, p } = G.L
  const n = G.threads.length
  const Ox = ox + O.x * ku
  const Oy = oy + O.y * ku
  const r0 = G.threads[0].r
  const r1 = G.threads[n - 1].r
  const sector = new Path2D()
  sector.arc(Ox, Oy, (r0 + 0.5 * p) * ku, HPI - st.aR, HPI + st.aL)
  sector.arc(Ox, Oy, (r1 - 0.5 * p) * ku, HPI + st.aL, HPI - st.aR, true)
  sector.closePath()
  const free = new Path2D()
  for (let side = 0; side < 2; side++) {
    const C = cs[side]
    const go = (q: [number, number], move = false): void =>
      move
        ? free.moveTo(ox + q[0] * ku, oy + q[1] * ku)
        : free.lineTo(ox + q[0] * ku, oy + q[1] * ku)
    const s0 = lens[side] / r0
    const s1 = lens[(n - 1) * 2 + side] / r1
    go(pointAt(C, 0, r0, 0.5 * p), true)
    for (let j = 1; j * C.ds < s0; j++) go(pointAt(C, j * C.ds, r0, 0.5 * p))
    for (let k = 0; k < n; k++)
      go(
        pointAt(
          C,
          lens[k * 2 + side] / G.threads[k].r,
          G.threads[k].r,
          k === 0 ? 0.5 * p : k === n - 1 ? -0.5 * p : 0
        )
      )
    for (let j = Math.floor(s1 / C.ds); j >= 0; j--) go(pointAt(C, j * C.ds, r1, -0.5 * p))
    free.closePath()
  }
  c.globalCompositeOperation = 'destination-out'
  // while the sea is still there; settled and scrolled, the sea only comes back outside the moon
  if (st.q < 1) {
    c.save()
    c.clip(P.notSails, 'evenodd')
    c.fill(sector)
    c.restore()
  }
  c.fill(free)
  c.globalCompositeOperation = 'source-over'
  return free
}

/**
 * Each thread is one ribbon from its left tip, along the free part, round the wound arc and out
 * along the right free part, so there is no seam where the parts meet. Where the wound arc crosses
 * the bowl it thins away; inside the crescent the ink pass covers it.
 */
export function paintThreads(
  c: CanvasRenderingContext2D,
  G: Geometry,
  P: Paths,
  S: Scratch,
  st: FrameState,
  T: number
): Path2D | null {
  const n = G.threads.length
  if (st.u <= 0 || !n) return null
  const L = G.L
  const { ku, ox, oy } = L
  const tw = threadWidth(G, st)
  const lens = new Float32Array(n * 2)
  let sigma = 0
  for (let k = 0; k < n; k++)
    for (let side = 0; side < 2; side++) {
      lens[k * 2 + side] = tailLength(G, st, k, side)
      sigma = Math.max(sigma, lens[k * 2 + side] / G.threads[k].r)
    }
  // wound, hairlines gone and nothing free: nothing left to draw
  if (st.bowl <= 1e-3 && sigma * G.threads[0].r < 0.05) return null
  // the bend comes in as the rows lift, so the first frame of the wrap is the straight row
  const ds = 3 / (ku * G.threads[0].r)
  const curl = st.lift * (1 - st.sc)
  const cs = [trace(0, st.aR, curl, sigma, ds), trace(1, st.aL, curl, sigma, ds)]
  const free = clearUnder(c, G, P, st, lens, cs)
  const A = st.swell * L.p * st.lam
  const hk = (1 - 0.45 * sstep(0.1, 0.5, st.u)) * st.bowl
  const cap = S.X.length - 2
  c.beginPath()
  for (let k = 0; k < n; k++) {
    const r = G.threads[k].r
    let m = 0
    const put = (x: number, y: number, nx: number, ny: number, w: number): void => {
      if (m >= cap) return
      S.X[m] = ox + x * ku
      S.Y[m] = oy + y * ku
      S.NX[m] = nx
      S.NY[m] = ny
      S.W[m] = w
      m++
    }
    // material at distance s from the bottom of its circle started at x = O.x -/+ s on its row
    const lift = (s: number, side: number): number =>
      A > 1e-4 ? A * swell(side ? O.x - s : O.x + s, O.y + r, T) : 0
    for (let side = 1; side >= 0; side--) {
      const C = cs[side]
      const a = side ? st.aL : st.aR
      const len = lens[k * 2 + side]
      const taper = Math.max(0.01, Math.min(7, len * 0.6))
      const jn = Math.floor(len / r / C.ds)
      const end = canonAt(C, len / r)
      // the left free part runs tip to wrap point, the right one wrap point to tip
      for (let q = 0; q <= jn + 1; q++) {
        const j = side ? jn + 1 - q : q
        const tip = j > jn
        const d = tip ? len : j * C.ds * r
        const jj = Math.min(C.n - 1, j)
        const x = O.x + r * (tip ? end[0] : C.x[j])
        const y = O.y + r * (tip ? end[1] : C.y[j]) + lift(r * a + d, side)
        const w =
          tw *
          fieldAt(L, ox + x * ku, oy + y * ku, Math.hypot(x - O.x, y - O.y)) *
          sstep(0, taper, len - d)
        put(x, y, C.nx[jj], C.ny[jj], w)
      }
      if (side === 0) break
      // the wound arc, from the left front down round the bottom to the right front
      const t0 = HPI + st.aL
      const t1 = HPI - st.aR
      const na = Math.max(1, Math.ceil(((t0 - t1) * r) / (4 / ku)))
      // next to a front that still has a free part, the arc keeps the free part's weight
      const hasL = sstep(0, 1, lens[k * 2 + 1])
      const hasR = sstep(0, 1, lens[k * 2])
      for (let j = 1; j < na; j++) {
        const th = t0 + ((t1 - t0) * j) / na
        const ca = Math.cos(th)
        const sa = Math.sin(th)
        const nearL = t0 - th < th - t1
        const from = (nearL ? t0 - th : th - t1) * r
        const w = tw * (hk + (1 - hk) * (1 - sstep(0, 6, from)) * (nearL ? hasL : hasR))
        const off = th - HPI
        put(O.x + r * ca, O.y + r * sa + lift(Math.abs(off) * r, off > 0 ? 1 : 0), ca, sa, w)
      }
    }
    emit(c, S, m)
  }
  c.fill()
  return free
}
