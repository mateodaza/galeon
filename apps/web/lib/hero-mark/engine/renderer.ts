/**
 * Draws frames into the canvas: the full formation at (t, scroll), the settled ink under the
 * closing mark's effects, or the settled plate from a cache with only the water band's box
 * redrawn. Owns sizing, the ink colour and the precomputed geometry.
 */
import { SETTLED, stateAt, T_SETTLED } from './formation'
import { buildGeometry, makeLayout, type Box, type Geometry } from './geometry'
import { bandBox, paintInk } from './ink'
import { makePaths, makeScratch, paintSea, paintTips, type Paths, type Scratch } from './paint'
import { frontAt, T_REVEAL, type InkFx, type Light } from './reveal'
import {
  BANDS,
  FINE,
  glitchTears,
  hash,
  slicesIdle,
  slicesIntro,
  T_SLICES,
  type SliceAt,
  type Tear,
} from './slices'
import { INK_BOX } from './mark'
import { paintThreads } from './threads'

export interface Renderer {
  /** Re-reads the canvas size and rebuilds the cut; coarsen widens the pitch (slow devices). */
  resize(coarsen: number): void
  /** The formation at (t, scroll); `alive` lets the settled lines keep their travelling wave. */
  full(t: number, sc: number, T: number, alive?: boolean): void
  /** The settled ink under the closing mark's front and light, with the wave's share. */
  ink(T: number, fx: InkFx, wave?: number): void
  idle(T: number): void
  /**
   * Redraws the frame just painted in horizontal slices, each shifted and faded as `at` says,
   * with streaks; `fine` cuts thinner slices.
   */
  shift(at: SliceAt, fine?: boolean): void
  /** Draws vertical hairlines over the frame just painted. */
  tears(list: readonly Tear[]): void
  /** Blank paper. */
  clear(): void
  /** A new ink colour (the theme changed): true if it differs, and the next frame repaints everything. */
  setColor(color: string): boolean
  /** The next idle frame repaints the whole canvas, not just the band. */
  rebase(): void
  readonly size: () => { W: number; H: number; dpr: number; rs: number }
  readonly geometry: () => Geometry | null
}

export function createRenderer(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  ink0: string,
  box: (w: number, h: number) => Box
): Renderer | null {
  const cache = document.createElement('canvas')
  const c1 = cache.getContext('2d')
  if (!c1) return null
  // the slice pass copies the painted frame here, then draws it back band by band
  const buf = document.createElement('canvas')
  const c2 = buf.getContext('2d')
  if (!c2) return null
  const bctx: CanvasRenderingContext2D = c2
  let bands: [number, number][] = []
  let fine: [number, number][] = []
  const cctx: CanvasRenderingContext2D = c1
  let color = ink0
  let G: Geometry | null = null
  let P: Paths | null = null
  let S: Scratch = makeScratch(512)
  let W = 0
  let H = 0
  let dpr = 1
  let rs = 1
  let cacheOk = false
  let idleBase = false

  function resize(coarsen: number): void {
    const rect = canvas.getBoundingClientRect()
    W = Math.max(1, rect.width)
    H = Math.max(1, rect.height)
    dpr = window.devicePixelRatio || 1
    // below DPR 1.5 the plate is cut at twice the screen's density, which keeps hairlines clean
    rs = dpr < 1.5 ? 2 * dpr : Math.min(dpr, 3)
    if (W * H * rs * rs > 7.5e6) rs = Math.sqrt(7.5e6 / (W * H))
    canvas.width = cache.width = buf.width = Math.max(1, Math.round(W * rs))
    canvas.height = cache.height = buf.height = Math.max(1, Math.round(H * rs))
    G = buildGeometry(makeLayout(W, H, dpr, rs, box(W, H), coarsen))
    bands = cut(BANDS, G.L.sp * rs, canvas.height, 0)
    fine = cut(FINE, G.L.sp * rs, canvas.height, 17)
    P = makePaths(G)
    S = makeScratch(Math.max(G.longest, 512) + 8)
    cacheOk = false
    idleBase = false
  }

  function full(t: number, sc: number, T: number, alive = false): void {
    if (!G || !P) return
    idleBase = false
    const st = stateAt(t, sc)
    ctx.setTransform(rs, 0, 0, rs, 0, 0)
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = ctx.strokeStyle = color
    if (st.q < 1 || sc > 0.001) paintSea(ctx, G, S, st, T)
    const free = paintThreads(ctx, G, P, S, st, T)
    paintTips(ctx, G, st, T)
    paintInk(ctx, G, P, S, st, T, 'full', free, null, alive ? st.drift : 0)
  }

  function ink(T: number, fx: InkFx, wave = 0): void {
    if (!G || !P) return
    idleBase = false
    ctx.setTransform(rs, 0, 0, rs, 0, 0)
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = color
    paintInk(ctx, G, P, S, SETTLED, T, 'full', null, fx, wave)
  }

  function tears(list: readonly Tear[]): void {
    if (!G || !list.length) return
    const { ku, ox, oy } = G.L
    ctx.setTransform(rs, 0, 0, rs, 0, 0)
    ctx.fillStyle = color
    const w = Math.max(1, Math.round(0.6 * rs)) / rs
    for (const [x, y0, y1, a] of list) {
      ctx.globalAlpha = a
      ctx.fillRect(ox + x * ku, oy + y0 * ku, w, (y1 - y0) * ku)
    }
    ctx.globalAlpha = 1
  }

  function shift(at: SliceAt, thin = false): void {
    if (!G) return
    idleBase = false
    const { ku, ox, oy } = G.L
    const cw = canvas.width
    bctx.setTransform(1, 0, 0, 1, 0, 0)
    bctx.clearRect(0, 0, cw, buf.height)
    bctx.drawImage(canvas, 0, 0)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, cw, canvas.height)
    ctx.fillStyle = color
    const xl = (ox + INK_BOX.x0 * ku) * rs
    const xr = (ox + INK_BOX.x1 * ku) * rs
    const hair = Math.max(1, Math.round(0.6 * rs))
    const slices = thin ? fine : bands
    for (let i = 0; i < slices.length; i++) {
      const [y0, y1] = slices[i]
      const y = ((y0 + y1) / 2 / rs - oy) / ku
      const [dx, a, streak, cuts] = at(i, y)
      if (a <= 0.002) continue
      const d = Math.round(dx * ku * rs)
      ctx.globalAlpha = a
      ctx.drawImage(buf, 0, y0, cw, y1 - y0, d, y0, cw, y1 - y0)
      // the spans hidden from this slice
      if (cuts)
        for (const [c0, c1] of cuts) {
          const x0 = Math.round((ox + c0 * ku) * rs)
          ctx.clearRect(x0, y0, Math.round((ox + c1 * ku) * rs) - x0, y1 - y0)
        }
      // the streak trails behind the band, from the mark's edge it is moving away from
      if (streak > 0.05 && y > INK_BOX.y0 && y < INK_BOX.y1) {
        const len = streak * ku * rs
        const sx = dx > 0 ? xl + d - len : xr + d
        ctx.globalAlpha = a * 0.55
        ctx.fillRect(sx, Math.round((y0 + y1) / 2), len, hair)
      }
    }
    ctx.globalAlpha = 1
  }

  function clear(): void {
    idleBase = false
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  // Settled frames: the still plate is cached once; afterwards only the water band's box is redrawn.
  function idle(T: number): void {
    if (!G || !P) return
    if (!cacheOk) {
      cctx.setTransform(1, 0, 0, 1, 0, 0)
      cctx.clearRect(0, 0, cache.width, cache.height)
      cctx.setTransform(rs, 0, 0, rs, 0, 0)
      cctx.fillStyle = color
      paintInk(cctx, G, P, S, SETTLED, 0, 'static')
      cacheOk = true
      idleBase = false
    }
    const b = bandBox(G)
    const bx = Math.max(0, Math.floor(b.x * rs))
    const by = Math.max(0, Math.floor(b.y * rs))
    const bw = Math.min(canvas.width, Math.ceil((b.x + b.w) * rs)) - bx
    const bh = Math.min(canvas.height, Math.ceil((b.y + b.h) * rs)) - by
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    if (!idleBase) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(cache, 0, 0)
      idleBase = true
    } else if (bw > 0 && bh > 0) {
      ctx.clearRect(bx, by, bw, bh)
      ctx.drawImage(cache, bx, by, bw, bh, bx, by, bw, bh)
    }
    if (bw <= 0 || bh <= 0) return
    ctx.save()
    ctx.beginPath()
    ctx.rect(bx, by, bw, bh)
    ctx.clip()
    ctx.setTransform(rs, 0, 0, rs, 0, 0)
    ctx.fillStyle = color
    paintInk(ctx, G, P, S, SETTLED, T, 'band')
    ctx.restore()
  }

  return {
    resize,
    full,
    ink,
    shift,
    tears,
    idle,
    clear,
    setColor: (c: string) => {
      if (c === color) return false
      color = c
      cacheOk = false
      idleBase = false
      return true
    },
    rebase: () => {
      idleBase = false
    },
    size: () => ({ W, H, dpr, rs }),
    geometry: () => G,
  }
}

/** Cuts the canvas height (device px) into slices of [least, spread] pitches, each its own height. */
function cut(
  [least, spread]: readonly [number, number],
  pitch: number,
  height: number,
  salt: number
): [number, number][] {
  const out: [number, number][] = []
  for (let y = 0, i = 0; y < height; i++) {
    const h = Math.max(1, Math.round(pitch * (least + Math.floor(hash(i, salt) * (spread + 1)))))
    out.push([y, Math.min(height, y + h)])
    y += h
  }
  return out
}

/**
 * Draws one frame at time t (formation or reveal clock) and scroll s; T drives the drift. With
 * `slices`, the hero is disclosed in glitched pieces, then hides a few blocks of it now and then (slices.ts). While `alive()`
 * holds the settled mark is drawn whole every frame so its wave can travel, otherwise it comes from
 * the cache with only the water band redrawn. Without `drift` the closing plate holds still.
 */
export function painter(
  R: Renderer,
  reveal: boolean,
  light: Light,
  alive: () => boolean,
  slices = false,
  drift = true
) {
  return (t: number, s: number, T: number): void => {
    if (slices) {
      if (t < T_SLICES) {
        R.full(T_SETTLED + 1, s, T, alive())
        R.shift(slicesIntro(t))
        return
      }
      if (!alive()) return R.idle(T)
      R.full(T_SETTLED + 1, s, T, true)
      const glitch = slicesIdle(t - T_SLICES)
      if (glitch) R.shift(glitch, true)
      R.tears(glitchTears(t - T_SLICES))
      return
    }
    if (!reveal) {
      if (alive()) R.full(t, s, T, true)
      else if (t >= T_SETTLED && s < 0.001) R.idle(T)
      else R.full(t, s, T)
      return
    }
    // a still plate keeps its water band where it is
    const Tw = drift ? T : 0
    const L = R.geometry()?.L
    if (t <= 0 || !L) R.clear()
    else if (t >= T_REVEAL && light.strength() < 2e-3) R.idle(Tw)
    else R.ink(Tw, light.fx(frontAt(t), Tw, L.sp, L.minW))
  }
}

/** Calls back, at most once a frame, when the canvas's CSS size or the device pixel ratio changes. */
export function watchSize(canvas: HTMLCanvasElement, R: Renderer, changed: () => void): () => void {
  if (typeof ResizeObserver === 'undefined') return () => {}
  let pending = 0
  const ro = new ResizeObserver(() => {
    if (pending) return
    pending = requestAnimationFrame(() => {
      pending = 0
      const r = canvas.getBoundingClientRect()
      const z = R.size()
      const same =
        Math.abs(r.width - z.W) < 0.5 &&
        Math.abs(r.height - z.H) < 0.5 &&
        (window.devicePixelRatio || 1) === z.dpr
      if (!same) changed()
    })
  })
  ro.observe(canvas)
  return () => {
    if (pending) cancelAnimationFrame(pending)
    ro.disconnect()
  }
}
