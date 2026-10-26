/** The sails: horizontal rows on the plate's grid from each luff, and each head cut as one tapering line. */
import type { Layout } from './geometry'
import { O, SAILS, SAIL_BOTTOM, SAIL_TOP, sailSpan } from './mark'
import { sailTone, sstep } from './tone'

export interface SailRow {
  readonly y: number
  readonly n: number
  readonly xs: Float32Array
  readonly tone: Float32Array
  /** 0 at the foot, 1 at the head: the order of the hoist. */
  readonly order: number
  /** this row also belongs to the waterline sheaf. */
  readonly sheaf: boolean
}

/** A sail's head, cut as one tapering line where the cloth is narrower than the hatching. */
export interface Spine {
  readonly luff: number
  readonly dir: 1 | -1
  readonly n: number
  readonly y: Float32Array
  /** width of the line, units, and the hoist order at each height. */
  readonly w: Float32Array
  readonly order: Float32Array
}

export function sailRows(L: Layout, sheafRows: Set<number>): SailRow[] {
  const { p, ku } = L
  const step = 2.4 / ku
  const marg = 1.2 / ku
  const out: SailRow[] = []
  const j0 = Math.ceil((O.r - (SAIL_BOTTOM - O.y)) / p - 0.5)
  const j1 = Math.floor((O.r - (SAIL_TOP - O.y)) / p - 0.5)
  for (let j = j0; j <= j1; j++) {
    const y = O.y + O.r - (j + 0.5) * p
    for (const sl of SAILS) {
      const span = sailSpan(sl, y)
      if (!span) continue
      const a = Math.min(span[0], span[1]) - marg
      const b = Math.max(span[0], span[1]) + marg
      const n = Math.max(2, Math.ceil((b - a) / step) + 1)
      const xs = new Float32Array(n)
      const tone = new Float32Array(n)
      for (let i = 0; i < n; i++) {
        const x = a + ((b - a) * i) / (n - 1)
        xs[i] = x
        tone[i] = sailTone(sl, x, y)
      }
      const order = (SAIL_BOTTOM - y) / (SAIL_BOTTOM - SAIL_TOP)
      out.push({ y, n, xs, tone, order, sheaf: sheafRows.has(j) })
    }
  }
  return out
}

export function spines(L: Layout): Spine[] {
  const out: Spine[] = []
  const dy = 1.2 / L.ku
  for (const sl of SAILS) {
    const ys: number[] = []
    const ws: number[] = []
    let yEnd = sl.head
    for (let y = sl.head; y < sl.low; y += dy) {
      const span = sailSpan(sl, y)
      const w = span ? Math.abs(span[1] - span[0]) : 0
      ys.push(y)
      ws.push(w)
      yEnd = y
      if (w >= 2.2 * L.p) break
    }
    const n = ys.length
    if (n < 3) continue
    const y = Float32Array.from(ys)
    const w = new Float32Array(n)
    const order = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      w[i] = ws[i] * (1 - sstep(sl.head, yEnd, ys[i]))
      order[i] = (SAIL_BOTTOM - ys[i]) / (SAIL_BOTTOM - SAIL_TOP)
    }
    out.push({ luff: sl.luff, dir: sl.dir, n, y, w, order })
  }
  return out
}
