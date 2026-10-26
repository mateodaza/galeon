/**
 * The ink: the wound threads inside the crescent (the moon and the water band) and the sails,
 * with tone carried by line width. Settled, only the water band drifts. CSS px throughout.
 */
import { hoistAt, type FrameState } from './formation'
import { THS, type Geometry, type ThreadRun } from './geometry'
import { A_L, A_R, O, TAU } from './mark'
import { emit, threadWidth, type Paths, type Scratch } from './paint'
import { fxWidth, type InkFx } from './reveal'
import { sstep, swell } from './tone'

/** Idle drift of the water band: amplitude in pitches, period in seconds. */
const DRIFT = 0.13
const DRIFT_PERIOD = 10

export type InkMode = 'full' | 'static' | 'band'

/**
 * Ink: the wound threads inside the crescent, darkening behind the front, and the sails.
 * `fx` (the closing mark) adds the rising front and the light; null leaves the ink as it is.
 */
export function paintInk(
  c: CanvasRenderingContext2D,
  G: Geometry,
  P: Paths,
  S: Scratch,
  st: FrameState,
  T: number,
  mode: InkMode,
  avoid: Path2D | null = null,
  fx: InkFx | null = null
): void {
  if (st.aL + st.aR > 1e-4) {
    c.save()
    c.clip(P.crescent)
    c.beginPath()
    for (const th of G.threads)
      for (const rn of th.runs) paintRun(c, G, S, st, T, mode, fx, th.r, rn)
    c.fill()
    c.restore()
  }
  if (mode === 'band') return
  paintSails(c, G, P, S, st, T, avoid, fx)
}

/** One run of a wound thread (radius r): the tone behind the wrap front, and the water's drift. */
function paintRun(
  c: CanvasRenderingContext2D,
  G: Geometry,
  S: Scratch,
  st: FrameState,
  T: number,
  mode: InkMode,
  fx: InkFx | null,
  r: number,
  rn: ThreadRun
): void {
  const { ku, ox, oy, p, minW, maxW } = G.L
  const Ox = ox + O.x * ku
  const Oy = oy + O.y * ku
  const tw = threadWidth(G, st)
  const ph = (TAU * T) / DRIFT_PERIOD
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
    const cc = left ? st.aL - Math.min(d[o + 4], CAP_L) : st.aR - Math.min(d[o + 4], CAP_R)
    let w = 0
    if (keep && cc > 0) {
      const toneW = minW + (maxW - minW) * d[o + 2]
      w = (tw + (toneW - tw) * sstep(0, st.lag, cc)) * st.ink
      if (bw > 0) w *= 1 + 0.12 * bw * st.drift * Math.sin(r * d[o + 6] * 0.42 - 0.8 * ph + 2.1)
      if (fx) w = fxWidth(fx, w, O.x + r * d[o], O.y + r * d[o + 1])
    }
    const rr =
      (r + (bw > 0 ? DRIFT * p * bw * st.drift * Math.sin(r * d[o + 6] * 0.3 - ph + r * 0.9) : 0)) *
      ku
    S.X[i] = Ox + rr * d[o]
    S.Y[i] = Oy + rr * d[o + 1]
    S.NX[i] = d[o]
    S.NY[i] = d[o + 1]
    S.W[i] = w
  }
  emit(c, S, rn.n)
}

/** The wrap stops just short of each horn. */
const CAP_L = A_L - 0.04
const CAP_R = A_R - 0.04

function paintSails(
  c: CanvasRenderingContext2D,
  G: Geometry,
  P: Paths,
  S: Scratch,
  st: FrameState,
  T: number,
  avoid: Path2D | null,
  fx: InkFx | null
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
      const w = (minW + (maxW - minW) * row.tone[i]) * amt
      S.X[i] = ox + x * ku
      S.Y[i] = oy + (row.y + (Ar > 1e-4 ? Ar * swell(x, row.y, T) : 0)) * ku
      S.NX[i] = 0
      S.NY[i] = 1
      S.W[i] = fx ? fxWidth(fx, w, x, row.y) : w
    }
    emit(c, S, row.n)
  }
  paintSpines(c, G, S, st, T, fx)
  c.fill()
  c.restore()
}

/** The heads: where the cloth is narrower than the hatching, it is cut as one tapering line. */
function paintSpines(
  c: CanvasRenderingContext2D,
  G: Geometry,
  S: Scratch,
  st: FrameState,
  T: number,
  fx: InkFx | null
): void {
  const { ku, ox, oy, p } = G.L
  const A = st.swell * p
  for (const sp of G.spines) {
    for (let i = 0; i < sp.n; i++) {
      const amt = Math.max(st.ghost, hoistAt(sp.order[i], st.t)) * st.ink
      const y = sp.y[i]
      let w = sp.w[i] * amt
      // the effects act on CSS px; the spine's width is in units
      if (fx) w = fxWidth(fx, w * ku, sp.luff, y) / ku
      S.X[i] = ox + (sp.luff + (sp.dir * w) / 2) * ku
      S.Y[i] = oy + (y + (A > 1e-4 ? A * swell(sp.luff, y, T) : 0)) * ku
      S.NX[i] = 1
      S.NY[i] = 0
      S.W[i] = w * ku
    }
    emit(c, S, sp.n)
  }
}

/** The water band's box in CSS px (with room for the drift and line width). */
export function bandBox(G: Geometry): { x: number; y: number; w: number; h: number } {
  const { ku, ox, oy } = G.L
  return { x: ox + 7.5 * ku, y: oy + 33 * ku, w: 55 * ku, h: 27.5 * ku }
}
