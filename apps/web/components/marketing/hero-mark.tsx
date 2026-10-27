'use client'

import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { T_SETTLED } from '@/lib/hero-mark/engine'
import { plateBox, reducedFlag, usePlateEngine, type PlateEngine } from './use-plate-engine'

/** How far the moon turns, in degrees, as the hero scrolls away. */
const TURN = -9

const heroOf = (stage: HTMLElement) => stage.closest<HTMLElement>('[data-hero]')

/**
 * Set once the formation has played in this page load. It lives in memory, so
 * a reload plays the formation again, while coming back to / from another page
 * of the site (a client-side navigation) starts settled.
 */
let formed = false

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
    startAt: late || formed ? T_SETTLED : 0,
    onSettle: () => {
      formed = true
    },
    // settled, a slow wave keeps rolling round the moon's lines
    alive: true,
    idleFps: 30,
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

/** Eases out: the turn starts with the scroll and slows as the hero leaves. */
const easeOut = (p: number) => 1 - (1 - p) * (1 - p)

/**
 * As the hero scrolls away the moon turns a few degrees about its centre
 * (transform only, nothing else moves), while the engine unwinds its upper
 * horn back toward the sea; the two read as one gesture. Off under reduced
 * motion and the `#reduced` flag.
 */
function useHeroTurn(stageRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const stage = stageRef.current
    const hero = stage && heroOf(stage)
    if (!stage || !hero) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let raf = 0
    const frame = () => {
      raf = 0
      const p = motion.matches || reducedFlag() ? 0 : heroProgress(hero)
      stage.style.transform = p > 0.001 ? `rotate(${(TURN * easeOut(p)).toFixed(2)}deg)` : ''
    }
    const request = () => {
      if (!raf) raf = requestAnimationFrame(frame)
    }
    request()
    window.addEventListener('scroll', request, { passive: true })
    window.addEventListener('hashchange', request)
    motion.addEventListener('change', request)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', request)
      window.removeEventListener('hashchange', request)
      motion.removeEventListener('change', request)
      stage.style.transform = ''
    }
  }, [stageRef])
}

/**
 * The hero's engraved mark: the engine on a canvas, fed the hero's scroll
 * progress, with the static SVG (`children`) as its fallback. The formation
 * plays on every page load; a client-side return to / starts settled. Once
 * settled, the lines keep a slow travelling wave. The engine reads the review
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
  useHeroTurn(stageRef)

  return (
    <div ref={stageRef} className="plate" role="img" aria-label={label}>
      {children}
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  )
}
