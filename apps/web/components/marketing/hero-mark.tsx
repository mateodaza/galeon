'use client'

import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { T_SLICES } from '@/lib/hero-mark/engine'
import { plateBox, reducedFlag, usePlateEngine, type PlateEngine } from './use-plate-engine'

/** How far the mark fades as the hero scrolls away. */
const FADE = 0.45

const heroOf = (stage: HTMLElement) => stage.closest<HTMLElement>('[data-hero]')

/**
 * Set once the intro has played in this page load. It lives in memory, so a
 * reload plays the intro again, while coming back to / from another page of
 * the site (a client-side navigation) starts settled.
 */
let formed = false

/** Hero scroll progress: 0 in place, 1 once the hero has scrolled away. */
function heroProgress(hero: HTMLElement | null): number {
  if (!hero) return 0
  return Math.min(1, Math.max(0, window.scrollY / (hero.offsetTop + hero.offsetHeight)))
}

const HERO_ENGINE: PlateEngine = {
  // start settled rather than from blank paper when the static mark already faded in (late
  // hydration) or the intro has played in this page load; the URL flags still win in the engine
  options: (stage, canvas, late) => ({
    layout: () => plateBox(stage, canvas),
    // the mark is disclosed in glitched pieces, then a few blocks of it hide now and then
    intro: 'slices',
    startAt: late || formed ? T_SLICES : 0,
    onSettle: () => {
      formed = true
    },
    // settled, a slow, quiet wave keeps rolling round the moon's lines
    alive: true,
    idleFps: 30,
  }),
}

/**
 * As the hero scrolls away the mark fades a little (opacity only: turning or
 * scaling dense hairlines would moiré). Off under reduced motion and the
 * `#reduced` flag.
 */
function useHeroFade(stageRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const stage = stageRef.current
    const hero = stage && heroOf(stage)
    if (!stage || !hero) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let raf = 0
    const frame = () => {
      raf = 0
      const p = motion.matches || reducedFlag() ? 0 : heroProgress(hero)
      const q = 1 - (1 - p) * (1 - p)
      stage.style.opacity = q > 0.001 ? (1 - FADE * q).toFixed(3) : ''
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
      stage.style.opacity = ''
    }
  }, [stageRef])
}

/**
 * The hero's engraved mark: the engine on a canvas, with the static SVG
 * (`children`) as its fallback. The slices intro plays on every page load; a
 * client-side return to / starts settled. Once settled, the lines keep a slow
 * travelling wave, and now and then a few blocks of it hide. The engine reads the review flags
 * itself (`#t=0.5`, `#still`) and follows hashchange; everything visual lives
 * in `lib/hero-mark/engine`.
 *
 * The canvas reaches past the plate square (the bleed insets in styles/hero.css),
 * so a glitched slice has room to jump; the plate square is read from the DOM,
 * so the CSS alone decides where the mark sits.
 */
export function HeroMark({ label, children }: { label: string; children: ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  usePlateEngine(stageRef, canvasRef, HERO_ENGINE)
  useHeroFade(stageRef)

  return (
    <div ref={stageRef} className="plate" role="img" aria-label={label}>
      {children}
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  )
}
