/**
 * Layout and the precomputed cut: every sea row, every thread (the circles about O
 * the waterline rows wind onto) and every sail row, with positions and base tone.
 * Frames only set widths and assemble paths.
 */
import { A_L, A_R, D2R, HPI, O, PLATE, R_IN } from './mark'
import { sailRows, spines, type SailRow, type Spine } from './sails'
import { bandWeight, crescentSd, crescentTone, sstep } from './tone'

export type { SailRow, Spine }

/** The plate square in canvas CSS px: the mark's 2.16 R square, centred on its ink. */
export interface Box {
  readonly x: number
  readonly y: number
  readonly size: number
}

export interface Layout {
  readonly W: number
  readonly H: number
  readonly dpr: number
  /** backing pixels per CSS px (2x supersampling below DPR 1.5). */
  readonly rs: number
  /** CSS px per unit, and the CSS px position of the unit origin. */
  readonly ku: number
  readonly ox: number
  readonly oy: number
  /** line pitch in units and in CSS px. */
  readonly p: number
  readonly sp: number
  readonly minW: number
  readonly maxW: number
  /** the public sea's hairline, CSS px. */
  readonly seaW: number
  /** the sea dissolves over this many CSS px at the canvas edges. */
  readonly fade: number
  /** and between these distances from O, in units. */
  readonly fieldIn: number
  readonly fieldOut: number
}

export interface SeaRow {
  readonly y: number
  /** index of the thread this row becomes, or -1. */
  readonly sheaf: number
  /** 0 for the top row, 1 for the bottom: the order of the cut. */
  readonly order: number
  readonly x0: number
  readonly x1: number
  readonly n: number
  readonly xs: Float32Array
  /** field weight and distance from O, per sample. */
  readonly fw: Float32Array
  readonly rho: Float32Array
}

/** Per thread sample: cos, sin, tone, side (1 left of the bottom), angle from the bottom, band weight, angle. */
export const THS = 7
export interface ThreadRun {
  readonly n: number
  readonly d: Float32Array
  /** 1 where the sample lies in the drifting band (or next to it). */
  readonly band: Uint8Array
}
export interface Thread {
  readonly r: number
  readonly runs: readonly ThreadRun[]
  /** how far its sea row reaches left and right of O, in units. */
  readonly halfL: number
  readonly halfR: number
}

export interface Geometry {
  readonly L: Layout
  readonly rows: readonly SeaRow[]
  readonly threads: readonly Thread[]
  readonly sails: readonly SailRow[]
  readonly spines: readonly Spine[]
  /** farthest field point from O, units. */
  readonly rhoMax: number
  /** longest sample run, for scratch buffers. */
  readonly longest: number
}

/** The round-4 plate's pitch rule: fine on retina, wider at 1x so lines stay a few pixels apart. */
export function pitchCss(Rpx: number, dpr: number): number {
  return dpr >= 1.5
    ? Math.max(2.3, Math.min(3.6, Rpx / 92))
    : Math.max(3.4, Math.min(4.6, Rpx / 78))
}

export function makeLayout(
  W: number,
  H: number,
  dpr: number,
  rs: number,
  box: Box,
  coarsen: number
): Layout {
  const ku = box.size / PLATE.size
  const Rpx = O.r * ku
  const sp = pitchCss(Rpx, dpr) * coarsen
  const fill = 0.6 + 0.12 * (1 - Math.min(1, Math.max(0, (Rpx - 60) / 160)))
  return {
    W,
    H,
    dpr,
    rs,
    ku,
    ox: box.x - PLATE.x * ku,
    oy: box.y - PLATE.y * ku,
    p: sp / ku,
    sp,
    minW: dpr >= 1.5 ? 0.24 : 0.62,
    maxW: sp * fill,
    seaW: dpr >= 1.5 ? 0.42 : 0.56,
    fade: Math.max(18, box.size * 0.15),
    fieldIn: O.r * 0.98,
    fieldOut: O.r * 1.55,
  }
}

/** Weight of the sea at a point: dissolves at the canvas edges and away from O. */
export function fieldAt(L: Layout, xpx: number, ypx: number, rho: number): number {
  const f = L.fade
  return (
    sstep(0, f, xpx) *
    sstep(0, f, L.W - xpx) *
    sstep(0, f, ypx) *
    sstep(0, f, L.H - ypx) *
    (1 - sstep(L.fieldIn, L.fieldOut, rho))
  )
}

function seaRows(L: Layout, threadsWanted: number[]): { rows: SeaRow[]; rhoMax: number } {
  const { ku, ox, oy, p } = L
  const yu0 = -oy / ku
  const yu1 = (L.H - oy) / ku
  const xu0 = -ox / ku
  const xu1 = (L.W - ox) / ku
  const step = 10 / ku
  const jHi = Math.ceil((O.r - (Math.max(yu0, O.y - L.fieldOut) - O.y)) / p - 0.5)
  const jLo = Math.floor((O.r - (Math.min(yu1, O.y + L.fieldOut) - O.y)) / p - 0.5)
  const rows: SeaRow[] = []
  let rhoMax = O.r
  for (let j = jHi; j >= jLo; j--) {
    const y = O.y + O.r - (j + 0.5) * p
    const dy = y - O.y
    const half = Math.sqrt(Math.max(0, L.fieldOut * L.fieldOut - dy * dy))
    const x0 = Math.max(xu0, O.x - half)
    const x1 = Math.min(xu1, O.x + half)
    const r = O.r - (j + 0.5) * p
    const sheaf = j >= 0 && r >= R_IN - 0.35 * p ? j : -1
    // the public sea runs at twice the plate's pitch; the waterline rows that become the moon at its pitch
    if (sheaf < 0 && j % 2 !== 0) continue
    if (x1 - x0 < 2 * step) continue
    const n = Math.ceil((x1 - x0) / step) + 1
    const xs = new Float32Array(n)
    const fw = new Float32Array(n)
    const rho = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const x = i === n - 1 ? x1 : x0 + i * step
      xs[i] = x
      rho[i] = Math.hypot(x - O.x, dy)
      fw[i] = fieldAt(L, ox + x * ku, oy + y * ku, rho[i])
    }
    rhoMax = Math.max(rhoMax, rho[0], rho[n - 1])
    rows.push({ y, sheaf, order: 0, x0, x1, n, xs, fw, rho })
    if (sheaf >= 0) threadsWanted[sheaf] = rows.length - 1
  }
  const last = Math.max(1, rows.length - 1)
  return { rows: rows.map((rw, i) => ({ ...rw, order: i / last })), rhoMax }
}

function threadRuns(L: Layout, r: number): ThreadRun[] {
  const step = 2.4 / L.ku
  const marg = 1.4 / L.ku
  const dth = step / r
  const t0 = HPI - A_R - 0.05
  const t1 = HPI + A_L + 0.05
  const runs: ThreadRun[] = []
  let run: number[] = []
  const flush = (): void => {
    if (run.length >= 2 * THS) {
      const n = run.length / THS
      const d = Float32Array.from(run)
      const band = new Uint8Array(n)
      for (let q = 0; q < n; q++) {
        const near = (i: number): boolean => i >= 0 && i < n && d[i * THS + 5] > 1e-3
        band[q] = near(q) || near(q - 1) || near(q + 1) ? 1 : 0
      }
      runs.push({ n, d, band })
    }
    run = []
  }
  for (let th = t0; th <= t1; th += dth) {
    const cs = Math.cos(th)
    const sn = Math.sin(th)
    const x = O.x + r * cs
    const y = O.y + r * sn
    if (crescentSd(x, y) > -marg) {
      const off = th - HPI
      run.push(
        cs,
        sn,
        crescentTone(x, y),
        off > 0 ? 1 : 0,
        Math.abs(off),
        bandWeight(x, y, th / D2R),
        th
      )
    } else if (run.length) flush()
  }
  flush()
  return runs
}

export function buildGeometry(L: Layout): Geometry {
  const wanted: number[] = []
  const { rows, rhoMax } = seaRows(L, wanted)
  const threads: Thread[] = []
  const sheafJ = new Set<number>()
  for (let k = 0; ; k++) {
    const r = O.r - (k + 0.5) * L.p
    if (r < R_IN - 0.35 * L.p) break
    sheafJ.add(k)
    const ri = wanted[k]
    const row = ri !== undefined ? rows[ri] : undefined
    const ok = row !== undefined && row.sheaf === k
    threads.push({
      r,
      runs: threadRuns(L, r),
      halfL: ok ? Math.max(0, O.x - row.x0) : 0,
      halfR: ok ? Math.max(0, row.x1 - O.x) : 0,
    })
  }
  const sails = sailRows(L, sheafJ)
  let longest = 64
  for (const rw of rows) longest = Math.max(longest, rw.n)
  for (const th of threads) for (const rn of th.runs) longest = Math.max(longest, rn.n)
  for (const s of sails) longest = Math.max(longest, s.n)
  // a whole thread as one ribbon: both free parts and the wound arc
  let half = 0
  for (const th of threads) half = Math.max(half, th.halfL, th.halfR)
  longest = Math.max(
    longest,
    Math.ceil(((A_L + A_R) * O.r * L.ku) / 4) + 2 * Math.ceil((half * L.ku) / 3) + 16
  )
  const sp = spines(L)
  for (const q of sp) longest = Math.max(longest, q.n)
  return { L, rows, threads, sails, spines: sp, rhoMax, longest }
}
