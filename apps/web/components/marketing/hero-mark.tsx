'use client'

import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { T_SETTLED } from '@/lib/hero-mark/engine'
import { plateBox, reducedFlag, usePlateEngine, type PlateEngine } from './use-plate-engine'

/** Share of the scroll the mark holds back: it rises at 0.7 of the page's speed. */
const PARALLAX = 0.3
/** Space kept between the sinking mark and whatever comes after it, and the least room worth moving in, CSS px. */
const GAP = 12
const MIN_ROOM = 24

const heroOf = (stage: HTMLElement) => stage.closest<HTMLElement>('[data-hero]')

/** Set once the formation has played in this tab, so a later return to / starts settled. */
const FORMED = 'galeon-hero-formed'

function formedThisTab(): boolean {
  try {
    return window.sessionStorage.getItem(FORMED) === '1'
  } catch {
    return false
  }
}

function markFormed(): void {
  try {
    window.sessionStorage.setItem(FORMED, '1')
  } catch {
    // storage blocked: the formation plays again on the next visit
  }
}

/** Hero scroll progress: 0 in place, 1 once the hero has scrolled away. */
function heroProgress(hero: HTMLElement | null): number {
  if (!hero) return 0
  return Math.min(1, Math.max(0, window.scrollY / (hero.offsetTop + hero.offsetHeight)))
}

const HERO_ENGINE: PlateEngine = {
  // start settled rather than from blank paper when the static mark already faded in (late
  // hydration) or the formation has played in this tab; the URL flags still win in the engine
  options: (stage, canvas, late) => ({
    layout: () => plateBox(stage, canvas),
    startAt: late || formedThisTab() ? T_SETTLED : 0,
    onSettle: markFormed,
  }),
  // the lines loosen as the hero scrolls away
  attach(handle, stage) {
    const hero = heroOf(stage)
    const onScroll = () => handle.setScroll(heroProgress(hero))
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  },
}

/** Follows d one to one, then eases into the room it has and never passes it. */
function sink(d: number, room: number): number {
  if (room <= 0) return 0
  const knee = room * 0.6
  return d <= knee ? d : knee + (room - knee) * (1 - Math.exp(-(d - knee) / (room - knee)))
}

/**
 * How far the mark may sink before it meets what follows it: the next item
 * in its column (the actions, on phones) or the next section. Measured from
 * the plate square plus half the canvas's reach below it, without the shift.
 */
function roomBelow(stage: HTMLElement, hero: HTMLElement, shift: number): number {
  const plate = stage.getBoundingClientRect()
  const cr = stage.querySelector('canvas')?.getBoundingClientRect()
  const canvas = cr && cr.height > 0 ? cr : plate
  const bottom = (plate.bottom + canvas.bottom) / 2 - shift
  const cell = stage.parentElement
  const after = [...(cell?.parentElement?.children ?? [])].filter((el) => el !== cell)
  if (hero.nextElementSibling) after.push(hero.nextElementSibling)
  let room = Infinity
  for (const el of after) {
    const r = el.getBoundingClientRect()
    const across = r.left < canvas.right && r.right > canvas.left
    // only what lies below the plate square; the headline and lede sit beside or above it
    if (r.height > 0 && across && r.top >= plate.bottom - shift - 1)
      room = Math.min(room, r.top - bottom)
  }
  // too little room (a single column, with the actions right below): no parallax at all
  room -= GAP
  return Number.isFinite(room) && room >= MIN_ROOM ? room : 0
}

/**
 * Parallax on the hero mark only: as the hero scrolls away the mark sinks
 * against the page (transform only, eased into the room below it), while the
 * engine loosens its lines; the two read as one gesture. Off under reduced
 * motion and the `#reduced` flag.
 */
function useHeroParallax(stageRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const stage = stageRef.current
    const hero = stage && heroOf(stage)
    if (!stage || !hero) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let shift = 0
    let room = -1
    let raf = 0
    const apply = (y: number) => {
      if (Math.abs(y - shift) < 0.1) return
      shift = y
      stage.style.transform = y > 0.05 ? `translate3d(0, ${y.toFixed(1)}px, 0)` : ''
    }
    const frame = () => {
      raf = 0
      if (motion.matches || reducedFlag()) {
        stage.style.willChange = ''
        return apply(0)
      }
      if (room < 0) room = roomBelow(stage, hero, shift)
      const range = hero.offsetTop + hero.offsetHeight
      stage.style.willChange = room > 0 ? 'transform' : ''
      apply(sink(PARALLAX * Math.min(window.scrollY, range), room))
    }
    const request = () => {
      if (!raf) raf = requestAnimationFrame(frame)
    }
    const remeasure = () => {
      room = -1
      request()
    }
    const ro = new ResizeObserver(remeasure)
    ro.observe(hero)
    if (hero.nextElementSibling) ro.observe(hero.nextElementSibling)
    request()
    window.addEventListener('scroll', request, { passive: true })
    window.addEventListener('hashchange', remeasure)
    motion.addEventListener('change', remeasure)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('scroll', request)
      window.removeEventListener('hashchange', remeasure)
      motion.removeEventListener('change', remeasure)
      stage.style.transform = ''
      stage.style.willChange = ''
    }
  }, [stageRef])
}

/**
 * The hero's engraved mark: the engine on a canvas, fed the hero's scroll
 * progress, with the static SVG (`children`) as its fallback. The formation
 * plays once per tab; later mounts start settled. The engine reads the review
 * flags itself (`#t=3.8`, `#still`, `#scroll=0.4`) and follows hashchange;
 * everything visual lives in `lib/hero-mark/engine`.
 *
 * The canvas reaches past the plate square (the bleed insets in styles/hero.css) so
 * the sea can dissolve; the plate square is read from the DOM, so the CSS
 * alone decides where the mark sits.
 */
export function HeroMark({ label, children }: { label: string; children: ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  usePlateEngine(stageRef, canvasRef, HERO_ENGINE)
  useHeroParallax(stageRef)

  return (
    <div ref={stageRef} className="plate" role="img" aria-label={label}>
      {children}
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  )
}
