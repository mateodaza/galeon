/**
 * Painting: every pass fills ribbons whose width carries the tone, in one colour.
 * All coordinates are CSS px; the caller sets the backing-store transform.
 * The sea and the burin's points are here; the ink (moon, water band, sails) is in ink.ts.
 */
import { cutStartOf, T_CUT_END, TL, type FrameState } from './formation'
import { fieldAt, type Geometry } from './geometry'
import { O, PATH_CRESCENT, PATH_SAILS } from './mark'
import { easeSine, sstep, swell } from './tone'

export interface Paths {
  readonly crescent: Path2D
  readonly sails: Path2D
  /** everything but the sails (even-odd), for the hairlines that cross the bowl. */
  readonly notSails: Path2D
}

export interface Scratch {
  readonly X: Float32Array
  readonly Y: Float32Array
  readonly NX: Float32Array
  readonly NY: Float32Array
  readonly W: Float32Array
}

export function makePaths(G: Geometry): Paths {
  const L = G.L
  const M = new DOMMatrix([L.ku, 0, 0, L.ku, L.ox, L.oy])
  const crescent = new Path2D()
  crescent.addPath(new Path2D(PATH_CRESCENT), M)
  const sails = new Path2D()
  sails.addPath(new Path2D(PATH_SAILS), M)
  const notSails = new Path2D()
  notSails.rect(-10, -10, L.W + 20, L.H + 20)
  notSails.addPath(sails)
  return { crescent, sails, notSails }
}

export function makeScratch(n: number): Scratch {
  return {
    X: new Float32Array(n),
    Y: new Float32Array(n),
    NX: new Float32Array(n),
    NY: new Float32Array(n),
    W: new Float32Array(n),
  }
}

/** Adds the outline of every stretch of the ribbon wider than a trace. */
export function emit(c: CanvasRenderingContext2D, S: Scratch, n: number): void {
  const { X, Y, NX, NY, W } = S
  let s0 = -1
  for (let i = 0; i <= n; i++) {
    if (i < n && W[i] > 0.012) {
      if (s0 < 0) s0 = i
      continue
    }
    if (s0 >= 0 && i - s0 > 1) {
      let h = W[s0] / 2
      c.moveTo(X[s0] + NX[s0] * h, Y[s0] + NY[s0] * h)
      for (let a = s0 + 1; a < i; a++) {
        h = W[a] / 2
        c.lineTo(X[a] + NX[a] * h, Y[a] + NY[a] * h)
      }
      for (let a = i - 1; a >= s0; a--) {
        h = W[a] / 2
        c.lineTo(X[a] - NX[a] * h, Y[a] - NY[a] * h)
      }
      c.closePath()
    }
    s0 = -1
  }
}

/** Weight of a lifted thread, CSS px. */
export const threadWidth = (G: Geometry, st: FrameState): number =>
  G.L.seaW * (WATERLINE * st.sea + (1.5 - WATERLINE * st.sea) * st.lift)

/** The waterline rows run at the plate's pitch but finer, so their tone matches the sea's. */
const WATERLINE = 0.62

/** The public sea: identical hairlines, cut in, calmed, then withdrawn from the outside in. */
export function paintSea(
  c: CanvasRenderingContext2D,
  G: Geometry,
  S: Scratch,
  st: FrameState,
  T: number
): void {
  const L = G.L
  const { ku, ox, oy } = L
  const A = st.swell * L.p
  const band = G.rhoMax * 0.42
  const rOut = (1 - st.q) * (G.rhoMax + band)
  // scrolled, the sea comes back round the mark, never across it
  const ring0 = 1.02 * O.r
  const ring1 = 1.3 * O.r
  c.beginPath()
  for (const row of G.rows) {
    const f = (st.t - cutStartOf(row.order)) / TL.cutDur
    if (f <= 0 || (row.sheaf >= 0 && st.u > 0)) continue
    const xe = f >= 1 ? row.x1 : row.x0 + (row.x1 - row.x0) * easeSine(f)
    const Ar = row.sheaf >= 0 ? A * st.lam : A
    let n = 0
    for (let i = 0; i < row.n; i++) {
      const last = row.xs[i] >= xe
      const x = last ? xe : row.xs[i]
      const rho = row.rho[i]
      const k = Math.max(1 - sstep(rOut - band, rOut, rho), st.ring * sstep(ring0, ring1, rho))
      S.X[n] = ox + x * ku
      S.Y[n] = oy + (row.y + (Ar > 1e-4 ? Ar * swell(x, row.y, T) : 0)) * ku
      S.NX[n] = 0
      S.NY[n] = 1
      S.W[n] = L.seaW * (row.sheaf >= 0 ? WATERLINE : 1) * row.fw[i] * k * st.sea
      n++
      if (last) break
    }
    emit(c, S, n)
  }
  c.fill()
}

/** The burin's point at the head of each row while it is cut. */
export function paintTips(
  c: CanvasRenderingContext2D,
  G: Geometry,
  st: FrameState,
  T: number
): void {
  if (st.t >= T_CUT_END) return
  const L = G.L
  const { ku, ox, oy } = L
  const A = st.swell * L.p
  const D = [0, 3, 8, 20, 42]
  const Wt = [0, 1.7, 1.45, 1.0, L.seaW]
  c.beginPath()
  for (const row of G.rows) {
    const f = (st.t - cutStartOf(row.order)) / TL.cutDur
    if (f <= 0 || f >= 1) continue
    const xe = row.x0 + (row.x1 - row.x0) * easeSine(f)
    const xpx = ox + xe * ku
    const k = fieldAt(L, xpx, oy + row.y * ku, Math.hypot(xe - O.x, row.y - O.y))
    if (k < 0.02) continue
    const ypx = (dpx: number): number =>
      oy + (row.y + A * swell((xpx - dpx - ox) / ku, row.y, T)) * ku
    c.moveTo(xpx, ypx(0))
    for (let q = 1; q < D.length; q++) c.lineTo(xpx - D[q], ypx(D[q]) - (Wt[q] * k) / 2)
    for (let q = D.length - 1; q >= 1; q--) c.lineTo(xpx - D[q], ypx(D[q]) + (Wt[q] * k) / 2)
    c.closePath()
  }
  c.globalAlpha = 0.62
  c.fill()
  c.globalAlpha = 1
}
