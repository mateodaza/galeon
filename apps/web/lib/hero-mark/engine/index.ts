/**
 * Galeon hero mark: "the sea becomes the ship".
 *
 * A public sea of identical hairlines is cut across the plate. The swell calms and the sails
 * show faintly in it. The waterline rows lift and wind onto circle O like thread taken up on a
 * drum; every row shares one wrap angle on concentric circles, so no two lines ever cross. The
 * rows crossing the sails take ink in place and the rest of the sea withdraws. Nothing arrives
 * from outside: the private mark is the same public lines, held differently. Settled, it is the
 * master mark engraved in the round-4 plate's language (tone carried by line width), and only
 * the water band drifts. Scroll unwinds the upper horn back toward the sea, reversibly. The
 * formation reads at about 3.8 s and settles at 5.5 s (formation.ts).
 *
 * The site's hero uses the 'slices' intro instead (slices.ts): the settled mark is disclosed in
 * eight glitched pieces, then every few seconds a small cluster of blocks of it glitches out,
 * stays hidden for a moment, and glitches back in.
 *
 * The same engine draws the closing mark (mode 'reveal', reveal.ts): the settled engraving, inked
 * once from the waterline up or shown whole and still, under a light or shade set by the page;
 * with `ambient`, a slow light walks the water band and the sails when the page sets none.
 *
 *   const hero = mount(canvas, options)   // -> { destroy(), setScroll(p), setLight(x, y, k, shade) }
 *
 * The module never touches the DOM beyond drawing into the canvas: no styles, no attributes,
 * no window access at import time, so it is safe to import into a client component and mount
 * in an effect. It pauses off-screen and in a hidden tab, coarsens or skips to settled on slow
 * devices (the governor), and re-reads its ink when the theme changes. URL flags (location.hash,
 * combine with &), re-read on hashchange; in reveal mode t counts on the reveal:
 *   #t=<s> freeze at t seconds · #still settled frame · #scroll=<0..1> force scroll · #reduced
 *
 * Modules: mark (constants from logo/final/constants.json), tone (tone fields and maths),
 * geometry (layout and the precomputed cut), sails, formation (the timeline as pure functions
 * of t and scroll), slices (the hero's intro and glitches), reveal (the closing mark's front,
 * light and shade), ambient (its idle light),
 * paint (sea), threads, ink,
 * renderer, governor (slow devices), theme (the ink follows it), options (types and URL flags),
 * and this runtime.
 * The static SVG fallback uses `lib/hero-mark/mark.ts`, which shares the plate's viewBox.
 */
import { createAmbient } from './ambient'
import { T_SETTLED } from './formation'
import { PATH_MARK, PLATE_VIEWBOX } from './mark'
import { createGovernor } from './governor'
import { bleedOf, boxFromBleed, fallbackSvg, NOOP, readHash, type Flags } from './options'
import type { HeroMarkInstance, HeroMarkOptions } from './options'
import { createRenderer, painter, watchSize } from './renderer'
import { createLight, T_REVEAL } from './reveal'
import { T_SLICES } from './slices'
import { watchTheme } from './theme'

export type { Box } from './geometry'
export type {
  Bleed,
  HeroMarkHandle,
  HeroMarkInfo,
  HeroMarkInstance,
  HeroMarkOptions,
} from './options'
export { T_SETTLED, T_REVEAL, T_SLICES, PLATE_VIEWBOX, PATH_MARK, fallbackSvg }

export function mount(canvas: HTMLCanvasElement, options: HeroMarkOptions = {}): HeroMarkInstance {
  const c0 = canvas.getContext('2d')
  if (!c0 || typeof Path2D === 'undefined' || typeof DOMMatrix === 'undefined') return NOOP
  const opt = options
  const reveal = opt.mode === 'reveal'
  const slices = !reveal && opt.intro === 'slices'
  const settleAt = reveal ? T_REVEAL : slices ? T_SLICES : T_SETTLED
  const readInk = (): string =>
    opt.color || getComputedStyle(canvas).getPropertyValue('--plate-ink').trim() || '#1D5C5E'
  const bleed = bleedOf(opt.bleed)
  const R = createRenderer(
    canvas,
    c0,
    readInk(),
    opt.layout ?? ((w, h) => boxFromBleed(w, h, bleed))
  )
  if (!R) return NOOP
  const light = createLight()
  // the ambient light holds the plate whenever the page's light is out
  const amb = reveal && opt.ambient ? createAmbient(light) : null
  // the living wave costs a whole frame each time: a device that cannot afford it keeps the drift
  let alive = !reveal && !!opt.alive
  let aliveCost = 0
  let aliveFrames = 0
  const paint = painter(R, reveal, light, () => alive, slices, opt.drift !== false)
  const drawIdle = R.idle
  const rebase = R.rebase
  const idleMs = 1000 / Math.max(1, opt.idleFps ?? 20)
  const revealAt = Math.min(1, Math.max(0.01, opt.revealAt ?? 0.4))
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
    frozenT = f.t !== null ? f.t : f.still ? settleAt + 1 : null
    forcedScroll = f.scroll
    if (frozenT === null) return
    amb?.aim(frozenT)
    light.snap()
  }
  applyFlags()
  const gov = createGovernor(opt.maxFrameMs ?? 12)
  const resize = (): void => R.resize(gov.coarsen())

  /* ---------- the loop: rAF while forming, a 20 fps timer once settled, redraws only when dirty ---------- */
  let scroll = 0
  let clock = Math.max(0, opt.startAt ?? 0)
  // the reveal waits for its band; the formation runs from mount
  let armed = !reveal || clock >= T_REVEAL
  let last = 0
  let raf = 0
  let timer: ReturnType<typeof setTimeout> | 0 = 0
  let onScreen = true
  let destroyed = false
  let settledFired = false
  let firstFired = false
  let dirty = true
  let drawnScroll = -1
  let lastIdle = -1e9

  const sc = (): number => (forcedScroll !== null ? forcedScroll : scroll)
  const live = (): boolean =>
    !destroyed && armed && onScreen && !document.hidden && !reduced && frozenT === null

  function govern(ms: number): void {
    const next = gov.record(ms)
    if (!next) return
    if (next === 'skipped') clock = Math.max(clock, settleAt)
    resize()
  }

  function draw(): void {
    const s = sc()
    if (reduced) drawIdle(0)
    else if (frozenT !== null) paint(frozenT, s, frozenT)
    else if (armed && clock < settleAt) {
      const t0 = performance.now()
      paint(clock, s, clock)
      govern(performance.now() - t0)
    } else {
      if (armed && !settledFired) {
        settledFired = true
        opt.onSettle?.()
      }
      const t0 = performance.now()
      paint(clock, s, clock)
      if (alive) {
        aliveCost = aliveFrames
          ? aliveCost * 0.9 + (performance.now() - t0) * 0.1
          : performance.now() - t0
        if (++aliveFrames > 20 && aliveCost > (opt.maxFrameMs ?? 12)) {
          alive = false
          rebase()
        }
      }
    }
    drawnScroll = s
    dirty = false
    if (!firstFired) {
      firstFired = true
      opt.onFirstFrame?.()
    }
  }

  function tick(now: number): void {
    raf = 0
    if (!live()) return
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0
    last = now
    clock += dt
    const forming = clock < settleAt
    amb?.aim(clock)
    const easing = light.step(dt)
    // settled frames change only with the drift: draw them at the idle rate, or at once when dirty
    if (forming || easing || dirty || sc() !== drawnScroll || now - lastIdle >= idleMs - 4) {
      if (!forming) lastIdle = now
      draw()
    }
    schedule()
  }

  function schedule(): void {
    if (raf || timer || !live()) return
    // the page's light follows at the full frame rate; the ambient one is slow enough for idle frames
    const lightMoves = light.moving() && !amb?.holds()
    if (clock < settleAt || dirty || lightMoves) raf = requestAnimationFrame(tick)
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
      // frozen, reduced, paused or waiting: draw now if anyone can see it, else when it comes back
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

  const unwatchSize = watchSize(canvas, R, () => {
    resize()
    invalidate()
  })
  let io: IntersectionObserver | null = null
  if (typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver(
      (es) => {
        const e = es[es.length - 1]
        onScreen = e ? e.isIntersecting : true
        // the reveal starts once enough of the plate is in view (or it fills the viewport)
        const vh = e?.rootBounds?.height ?? 0
        if (
          e &&
          !armed &&
          (e.intersectionRatio >= revealAt || e.intersectionRect.height > vh * 0.6)
        )
          armed = true
        if (onScreen) invalidate()
        else stop()
      },
      { threshold: reveal ? [0, revealAt / 2, revealAt] : 0 }
    )
    io.observe(canvas)
  } else armed = true
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
  const unwatch = opt.color ? () => {} : watchTheme(() => R.setColor(readInk()) && invalidate())
  schedule()

  return {
    destroy() {
      destroyed = true
      stop()
      unwatchSize()
      io?.disconnect()
      unwatch()
      document.removeEventListener('visibilitychange', onVis)
      mq?.removeEventListener('change', onFlags)
      window.removeEventListener('hashchange', onHash)
    },
    setScroll(p: number) {
      const v = Math.min(1, Math.max(0, Number.isFinite(p) ? p : 0))
      if (reveal || Math.abs(v - scroll) < 1e-4) return
      scroll = v
      if (reduced || forcedScroll !== null) return
      invalidate()
    },
    setLight(x: number, y: number, k: number, shade = 0) {
      if (!reveal || reduced || ![x, y, k, shade].every(Number.isFinite)) return
      amb?.yieldTo()
      light.set(x, y, k, shade)
      if (!light.moving()) return
      if (!live()) light.snap()
      invalidate()
    },
    renderAt(t: number, s = 0) {
      const t0 = performance.now()
      paint(t, s, t)
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
        governor: gov.state(),
      }
    },
  }
}
