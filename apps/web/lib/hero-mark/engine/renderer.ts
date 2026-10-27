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
import { paintThreads } from './threads'

export interface Renderer {
  /** Re-reads the canvas size and rebuilds the cut; coarsen widens the pitch (slow devices). */
  resize(coarsen: number): void
  /** The formation at (t, scroll); `alive` lets the settled lines keep their travelling wave. */
  full(t: number, sc: number, T: number, alive?: boolean): void
  /** The settled ink under the closing mark's front and light. */
  ink(T: number, fx: InkFx): void
  idle(T: number): void
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
    canvas.width = cache.width = Math.max(1, Math.round(W * rs))
    canvas.height = cache.height = Math.max(1, Math.round(H * rs))
    G = buildGeometry(makeLayout(W, H, dpr, rs, box(W, H), coarsen))
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

  function ink(T: number, fx: InkFx): void {
    if (!G || !P) return
    idleBase = false
    ctx.setTransform(rs, 0, 0, rs, 0, 0)
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = color
    paintInk(ctx, G, P, S, SETTLED, T, 'full', null, fx)
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

/**
 * Draws one frame at time t (formation or reveal clock) and scroll s; T drives the drift. While
 * `alive()` holds, the settled hero is drawn whole every frame so its wave can travel; otherwise
 * it comes from the cache with only the water band redrawn.
 */
export function painter(R: Renderer, reveal: boolean, light: Light, alive: () => boolean) {
  return (t: number, s: number, T: number): void => {
    if (!reveal) {
      if (alive()) R.full(t, s, T, true)
      else if (t >= T_SETTLED && s < 0.001) R.idle(T)
      else R.full(t, s, T)
      return
    }
    const L = R.geometry()?.L
    if (t <= 0 || !L) R.clear()
    else if (t >= T_REVEAL && light.strength() < 2e-3) R.idle(T)
    else R.ink(T, light.fx(frontAt(t), T, L.sp, L.minW))
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
