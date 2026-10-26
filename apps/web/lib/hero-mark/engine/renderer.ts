/**
 * Draws frames into the canvas: the full formation at (t, scroll), or the settled plate from a
 * cache with only the water band's box redrawn. Owns sizing and the precomputed geometry.
 */
import { SETTLED, stateAt } from './formation'
import { buildGeometry, makeLayout, type Box, type Geometry } from './geometry'
import {
  bandBox,
  makePaths,
  makeScratch,
  paintInk,
  paintSea,
  paintTips,
  type Paths,
  type Scratch,
} from './paint'
import { paintThreads } from './threads'

export interface Renderer {
  /** Re-reads the canvas size and rebuilds the cut; coarsen widens the pitch (slow devices). */
  resize(coarsen: number): void
  full(t: number, sc: number, T: number): void
  idle(T: number): void
  /** The next idle frame repaints the whole canvas, not just the band. */
  rebase(): void
  readonly size: () => { W: number; H: number; dpr: number; rs: number }
  readonly geometry: () => Geometry | null
}

export function createRenderer(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  color: string,
  box: (w: number, h: number) => Box
): Renderer | null {
  const cache = document.createElement('canvas')
  const c1 = cache.getContext('2d')
  if (!c1) return null
  const cctx: CanvasRenderingContext2D = c1
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

  function full(t: number, sc: number, T: number): void {
    if (!G || !P) return
    idleBase = false
    const st = stateAt(t, sc)
    ctx.setTransform(rs, 0, 0, rs, 0, 0)
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = ctx.strokeStyle = color
    if (st.q < 1 || sc > 0.001) paintSea(ctx, G, S, st, T)
    const free = paintThreads(ctx, G, P, S, st, T)
    paintTips(ctx, G, st, T)
    paintInk(ctx, G, P, S, st, T, 'full', free)
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
    idle,
    rebase: () => {
      idleBase = false
    },
    size: () => ({ W, H, dpr, rs }),
    geometry: () => G,
  }
}
