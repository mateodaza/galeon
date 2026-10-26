/**
 * Galeon hero mark: "the sea becomes the ship".
 *
 * A public sea of identical hairlines is cut across the plate. The swell calms and the sails
 * show faintly in it. The waterline rows lift and wind onto circle O like thread taken up on a
 * drum; every row shares one wrap angle on concentric circles, so no two lines ever cross. The
 * rows crossing the sails take ink in place and the rest of the sea withdraws. Nothing arrives
 * from outside: the private mark is the same public lines, held differently. Settled, it is the
 * master mark engraved in the round-4 plate's language (tone carried by line width), and only
 * the water band drifts. Scroll unwinds the upper horn back toward the sea, reversibly.
 *
 *   const hero = mount(canvas, options)   // -> { destroy(), setScroll(p) } (+ renderAt, info)
 *
 * The module never touches the DOM beyond drawing into the canvas: no styles, no attributes,
 * no window access at import time, so it is safe to import into a client component and mount
 * in an effect. URL flags (location.hash, combine with &), re-read on hashchange:
 *   #t=<s> freeze at t seconds · #still settled frame · #scroll=<0..1> force scroll · #reduced
 *
 * Modules: mark (constants from logo/final/constants.json), tone (tone fields and maths),
 * geometry (layout and the precomputed cut), sails, formation (the timeline as pure functions
 * of t and scroll), paint, threads, renderer, options (types and URL flags), and this runtime.
 * The static SVG fallback uses `lib/hero-mark/mark.ts`, which shares the plate's viewBox.
 */
import { T_SETTLED } from './formation'
import { PATH_MARK, PLATE_VIEWBOX } from './mark'
import { boxFromBleed, fallbackSvg, p90, readHash, type Bleed, type Flags } from './options'
import type { HeroMarkInfo, HeroMarkInstance, HeroMarkOptions } from './options'
import { createRenderer } from './renderer'

export type { Box } from './geometry'
export type {
  Bleed,
  HeroMarkHandle,
  HeroMarkInfo,
  HeroMarkInstance,
  HeroMarkOptions,
} from './options'
export { T_SETTLED, PLATE_VIEWBOX, PATH_MARK, fallbackSvg }

const NOOP: HeroMarkInstance = {
  destroy() {},
  setScroll() {},
  renderAt: () => 0,
  info: () => ({
    W: 0,
    H: 0,
    dpr: 1,
    rs: 1,
    pitchUnits: 0,
    pitchCss: 0,
    rows: 0,
    threads: 0,
    sailRows: 0,
    governor: 'ok',
  }),
}

export function mount(canvas: HTMLCanvasElement, options: HeroMarkOptions = {}): HeroMarkInstance {
  const c0 = canvas.getContext('2d')
  if (!c0 || typeof Path2D === 'undefined' || typeof DOMMatrix === 'undefined') return NOOP
  const opt = options
  const color =
    opt.color || getComputedStyle(canvas).getPropertyValue('--plate-ink').trim() || '#1D5C5E'
  const bleed: Bleed =
    typeof opt.bleed === 'number'
      ? { top: opt.bleed, right: opt.bleed, bottom: opt.bleed, left: opt.bleed }
      : (opt.bleed ?? { top: 0, right: 0, bottom: 0, left: 0 })
  const R = createRenderer(canvas, c0, color, opt.layout ?? ((w, h) => boxFromBleed(w, h, bleed)))
  if (!R) return NOOP
  const idleMs = 1000 / Math.max(1, opt.idleFps ?? 20)
  const maxFrameMs = opt.maxFrameMs ?? 12
  const mq =
    typeof matchMedia === 'undefined' ? null : matchMedia('(prefers-reduced-motion: reduce)')

  let reduced = false
  let frozenT: number | null = null
  let forcedScroll: number | null = null
  function applyFlags(): void {
    const h = opt.urlFlags === false ? {} : readHash()
    const f: Flags = {
      t: h.t ?? opt.freezeAt ?? null,
      still: h.still ?? opt.still ?? false,
      scroll: h.scroll ?? opt.scroll ?? null,
      reduced: h.reduced ?? opt.reduced ?? false,
    }
    reduced = f.reduced || !!(mq && mq.matches)
    frozenT = f.t !== null ? f.t : f.still ? T_SETTLED + 1 : null
    forcedScroll = f.scroll
  }
  applyFlags()
  let coarsen = 1
  let governor: HeroMarkInfo['governor'] = 'ok'
  const drawFull = R.full
  const drawIdle = R.idle
  const resize = (): void => R.resize(coarsen)

  /* ---------- the loop: rAF while forming, a 20 fps timer once settled, redraws only when dirty ---------- */
  let scroll = 0
  let clock = Math.max(0, opt.startAt ?? 0)
  let last = 0
  let raf = 0
  let timer: ReturnType<typeof setTimeout> | 0 = 0
  let onScreen = true
  let destroyed = false
  let settledFired = false
  let firstFired = false
  let dirty = true
  let drawnScroll = -1
  const costs: number[] = []
  let frames = 0
  let lastIdle = -1e9

  const sc = (): number => (forcedScroll !== null ? forcedScroll : scroll)
  const live = (): boolean =>
    !destroyed && onScreen && !document.hidden && !reduced && frozenT === null

  function first(): void {
    if (firstFired) return
    firstFired = true
    opt.onFirstFrame?.()
  }

  function govern(ms: number): void {
    if (governor === 'skipped' || ++frames <= 4) return
    costs.push(ms)
    if (costs.length < 12) return
    if (p90(costs) > maxFrameMs) {
      if (governor === 'ok') {
        governor = 'coarse'
        coarsen = 1.6
        resize()
      } else {
        // still too slow: skip to the settled plate, cut once at the full pitch and cached
        governor = 'skipped'
        clock = Math.max(clock, T_SETTLED)
        coarsen = 1
        resize()
      }
    }
    costs.length = 0
  }

  function draw(): void {
    const s = sc()
    if (reduced) drawIdle(0)
    else if (frozenT !== null) {
      if (frozenT >= T_SETTLED && s < 0.001) drawIdle(frozenT)
      else drawFull(frozenT, s, frozenT)
    } else if (clock < T_SETTLED) {
      const t0 = performance.now()
      drawFull(clock, s, clock)
      govern(performance.now() - t0)
    } else {
      if (!settledFired) {
        settledFired = true
        opt.onSettle?.()
      }
      if (s < 0.001) drawIdle(clock)
      else drawFull(T_SETTLED + 1, s, clock)
    }
    drawnScroll = s
    dirty = false
    first()
  }

  function tick(now: number): void {
    raf = 0
    if (!live()) return
    const forming = clock < T_SETTLED
    if (last) clock += Math.min(0.1, (now - last) / 1000)
    last = now
    // settled frames change only with the drift: draw them at the idle rate, or at once when dirty
    if (forming || dirty || sc() !== drawnScroll || now - lastIdle >= idleMs - 4) {
      if (!forming) lastIdle = now
      draw()
    }
    schedule()
  }

  function schedule(): void {
    if (raf || timer || !live()) return
    if (clock < T_SETTLED || dirty) raf = requestAnimationFrame(tick)
    else
      timer = setTimeout(() => {
        timer = 0
        if (live()) raf = requestAnimationFrame(tick)
      }, idleMs)
  }

  function stop(): void {
    if (raf) cancelAnimationFrame(raf)
    if (timer) clearTimeout(timer)
    raf = 0
    timer = 0
    last = 0
  }

  function invalidate(): void {
    dirty = true
    if (destroyed) return
    if (!live()) {
      // frozen, reduced or paused: draw now if anyone can see it, else when it comes back
      if (onScreen && !document.hidden) draw()
      return
    }
    if (timer) {
      clearTimeout(timer)
      timer = 0
    }
    schedule()
  }

  resize()
  draw()

  let ro: ResizeObserver | null = null
  let io: IntersectionObserver | null = null
  let pendingResize = 0
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => {
      if (pendingResize) return
      pendingResize = requestAnimationFrame(() => {
        pendingResize = 0
        const r = canvas.getBoundingClientRect()
        const z = R.size()
        if (
          Math.abs(r.width - z.W) < 0.5 &&
          Math.abs(r.height - z.H) < 0.5 &&
          (window.devicePixelRatio || 1) === z.dpr
        )
          return
        resize()
        invalidate()
      })
    })
    ro.observe(canvas)
  }
  if (typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver((es) => {
      const e = es[es.length - 1]
      onScreen = e ? e.isIntersecting : true
      if (onScreen) invalidate()
      else stop()
    })
    io.observe(canvas)
  }
  const onVis = (): void => (document.hidden ? stop() : invalidate())
  document.addEventListener('visibilitychange', onVis)
  const onFlags = (): void => {
    applyFlags()
    stop()
    R.rebase()
    invalidate()
  }
  mq?.addEventListener('change', onFlags)
  const onHash = (): void => {
    if (opt.urlFlags !== false) onFlags()
  }
  window.addEventListener('hashchange', onHash)
  schedule()

  return {
    destroy() {
      destroyed = true
      stop()
      if (pendingResize) cancelAnimationFrame(pendingResize)
      ro?.disconnect()
      io?.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      mq?.removeEventListener('change', onFlags)
      window.removeEventListener('hashchange', onHash)
    },
    setScroll(p: number) {
      const v = Math.min(1, Math.max(0, Number.isFinite(p) ? p : 0))
      if (Math.abs(v - scroll) < 1e-4) return
      scroll = v
      if (reduced || forcedScroll !== null) return
      invalidate()
    },
    renderAt(t: number, s = 0) {
      const t0 = performance.now()
      if (t >= T_SETTLED && s < 0.001) drawIdle(t)
      else drawFull(t, s, t)
      return performance.now() - t0
    },
    info() {
      const G = R.geometry()
      return {
        ...R.size(),
        pitchUnits: G ? G.L.p : 0,
        pitchCss: G ? G.L.sp : 0,
        rows: G ? G.rows.length : 0,
        threads: G ? G.threads.length : 0,
        sailRows: G ? G.sails.length : 0,
        governor,
      }
    },
  }
}
