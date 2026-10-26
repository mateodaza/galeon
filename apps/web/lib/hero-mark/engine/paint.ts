/**
 * Painting: every pass fills ribbons whose width carries the tone, in one colour.
 * All coordinates are CSS px; the caller sets the backing-store transform.
 */
import { cutStartOf, hoistAt, T_CUT_END, TL, type FrameState } from './formation'
import { fieldAt, THS, type Geometry } from './geometry'
import { A_L, A_R, O, PATH_CRESCENT, PATH_SAILS, TAU } from './mark'
import { easeSine, sstep, swell } from './tone'

/** Idle drift of the water band: amplitude in pitches, period in seconds. */
const DRIFT = 0.13
const DRIFT_PERIOD = 10

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

export type InkMode = 'full' | 'static' | 'band'

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

/** Ink: the wound threads inside the crescent, darkening behind the front, and the sails. */
export function paintInk(
  c: CanvasRenderingContext2D,
  G: Geometry,
  P: Paths,
  S: Scratch,
  st: FrameState,
  T: number,
  mode: InkMode,
  avoid: Path2D | null = null
): void {
  const L = G.L
  const { ku, ox, oy, p, minW, maxW } = L
  const Ox = ox + O.x * ku
  const Oy = oy + O.y * ku
  const span = maxW - minW
  const tw = threadWidth(G, st)
  const capL = A_L - 0.04
  const capR = A_R - 0.04
  const ph = (TAU * T) / DRIFT_PERIOD
  if (st.aL + st.aR > 1e-4) {
    c.save()
    c.clip(P.crescent)
    c.beginPath()
    for (const th of G.threads) {
      const r = th.r
      for (const rn of th.runs) {
        const d = rn.d
        for (let i = 0; i < rn.n; i++) {
          const o = i * THS
          const bw = d[o + 5]
          let keep = true
          if (mode === 'band') keep = rn.band[i] === 1
          else if (mode === 'static') {
            const prev = i > 0 && d[o - THS + 5] > 1e-3
            const next = i < rn.n - 1 && d[o + THS + 5] > 1e-3
            keep = !(bw > 1e-3 && prev && next)
          }
          const left = d[o + 3] > 0.5
          const cc = left ? st.aL - Math.min(d[o + 4], capL) : st.aR - Math.min(d[o + 4], capR)
          let w = 0
          if (keep && cc > 0) {
            const toneW = minW + span * d[o + 2]
            w = (tw + (toneW - tw) * sstep(0, st.lag, cc)) * st.ink
            if (bw > 0)
              w *= 1 + 0.12 * bw * st.drift * Math.sin(r * d[o + 6] * 0.42 - 0.8 * ph + 2.1)
          }
          const rr =
            (r +
              (bw > 0
                ? DRIFT * p * bw * st.drift * Math.sin(r * d[o + 6] * 0.3 - ph + r * 0.9)
                : 0)) *
            ku
          S.X[i] = Ox + rr * d[o]
          S.Y[i] = Oy + rr * d[o + 1]
          S.NX[i] = d[o]
          S.NY[i] = d[o + 1]
          S.W[i] = w
        }
        emit(c, S, rn.n)
      }
    }
    c.fill()
    c.restore()
  }
  if (mode === 'band') return
  paintSails(c, G, P, S, st, T, avoid)
}

function paintSails(
  c: CanvasRenderingContext2D,
  G: Geometry,
  P: Paths,
  S: Scratch,
  st: FrameState,
  T: number,
  avoid: Path2D | null
): void {
  const L = G.L
  const { ku, ox, oy, minW, maxW } = L
  const A = st.swell * L.p
  c.save()
  c.clip(P.sails)
  if (avoid) {
    const out = new Path2D()
    out.rect(-10, -10, L.W + 20, L.H + 20)
    out.addPath(avoid)
    c.clip(out, 'evenodd')
  }
  c.beginPath()
  for (const row of G.sails) {
    // a waterline row's ghost lifts away with the row; its piece of sail is then inked in place
    const ghost = row.sheaf ? st.ghost * (1 - st.lift) : st.ghost
    const amt = Math.max(ghost, hoistAt(row.order, st.t)) * st.ink
    if (amt <= 0.002) continue
    const Ar = row.sheaf ? A * st.lam : A
    for (let i = 0; i < row.n; i++) {
      const x = row.xs[i]
      S.X[i] = ox + x * ku
      S.Y[i] = oy + (row.y + (Ar > 1e-4 ? Ar * swell(x, row.y, T) : 0)) * ku
      S.NX[i] = 0
      S.NY[i] = 1
      S.W[i] = (minW + (maxW - minW) * row.tone[i]) * amt
    }
    emit(c, S, row.n)
  }
  // the heads: where the cloth is narrower than the hatching, it is cut as one tapering line
  for (const sp of G.spines) {
    for (let i = 0; i < sp.n; i++) {
      const amt = Math.max(st.ghost, hoistAt(sp.order[i], st.t)) * st.ink
      const w = sp.w[i] * amt
      const y = sp.y[i]
      S.X[i] = ox + (sp.luff + (sp.dir * w) / 2) * ku
      S.Y[i] = oy + (y + (A > 1e-4 ? A * swell(sp.luff, y, T) : 0)) * ku
      S.NX[i] = 1
      S.NY[i] = 0
      S.W[i] = w * ku
    }
    emit(c, S, sp.n)
  }
  c.fill()
  c.restore()
}

/** The water band's box in CSS px (with room for the drift and line width). */
export function bandBox(G: Geometry): { x: number; y: number; w: number; h: number } {
  const { ku, ox, oy } = G.L
  return { x: ox + 7.5 * ku, y: oy + 33 * ku, w: 55 * ku, h: 27.5 * ku }
}
