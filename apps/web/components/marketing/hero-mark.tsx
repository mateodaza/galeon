'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { mount, T_SETTLED, type Box, type HeroMarkInstance } from '@/lib/hero-mark/engine'

/** The `#reduced` review flag: show the static mark, as under reduced motion. */
const reducedFlag = () => /(?:^#|&)reduced(?:&|=|$)/.test(window.location.hash)

/**
 * Mounts the hero mark engine on a canvas and feeds it the hero's scroll
 * progress. `children` is the static SVG shown without JavaScript, under
 * reduced motion, or if the engine cannot start. The engine reads the other
 * review flags itself (`#t=1.6`, `#still`, `#scroll=0.4`) and follows
 * hashchange; everything visual lives in `lib/hero-mark/engine`.
 *
 * The canvas reaches past the plate square (the bleed insets in site.css) so
 * the sea can dissolve; the plate square is read from the DOM, so the CSS
 * alone decides where the mark sits.
 */
export function HeroMark({ label, children }: { label: string; children: ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const stage = stageRef.current
    const canvas = canvasRef.current
    if (!stage || !canvas) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const hero = stage.closest<HTMLElement>('[data-hero]')
    let handle: HeroMarkInstance | null = null
    let staticMark = false

    const layout = (): Box => {
      const c = canvas.getBoundingClientRect()
      const p = stage.getBoundingClientRect()
      return { x: p.left - c.left, y: p.top - c.top, size: p.width }
    }
    const progress = () => {
      if (!hero) return 0
      return Math.min(1, Math.max(0, window.scrollY / (hero.offsetTop + hero.offsetHeight)))
    }
    const start = () => {
      staticMark = motion.matches || reducedFlag()
      if (staticMark) {
        stage.dataset.state = 'static'
        return
      }
      // hydrated after the static mark faded in: start settled rather than from blank paper
      const fallback = stage.querySelector('.fallback')
      const late = !!fallback && parseFloat(getComputedStyle(fallback).opacity) > 0.5
      try {
        handle = mount(canvas, {
          layout,
          startAt: late ? T_SETTLED : 0,
          onFirstFrame: () => {
            stage.dataset.state = 'live'
          },
        })
        if (!handle.info().W) stage.dataset.state = 'static'
        else handle.setScroll(progress())
      } catch {
        stage.dataset.state = 'static'
      }
    }
    const stop = () => {
      handle?.destroy()
      handle = null
    }
    const restart = () => {
      stop()
      delete stage.dataset.state
      start()
    }
    const onScroll = () => handle?.setScroll(progress())
    const onHash = () => {
      if (reducedFlag() !== staticMark && !motion.matches) restart()
    }

    start()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('hashchange', onHash)
    motion.addEventListener('change', restart)
    return () => {
      stop()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('hashchange', onHash)
      motion.removeEventListener('change', restart)
    }
  }, [])

  return (
    <div ref={stageRef} className="plate" role="img" aria-label={label}>
      {children}
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  )
}
