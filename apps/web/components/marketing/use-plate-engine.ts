import { useEffect, type RefObject } from 'react'
import {
  mount,
  type Box,
  type HeroMarkInstance,
  type HeroMarkOptions,
} from '@/lib/hero-mark/engine'

/** The `#reduced` review flag: show the static mark, as under reduced motion. */
export const reducedFlag = (): boolean => /(?:^#|&)reduced(?:&|=|$)/.test(window.location.hash)

/** The plate square inside the canvas, read from the DOM, so the CSS alone decides where the mark sits. */
export function plateBox(stage: HTMLElement, canvas: HTMLCanvasElement): Box {
  const c = canvas.getBoundingClientRect()
  const p = stage.getBoundingClientRect()
  return { x: p.left - c.left, y: p.top - c.top, size: p.width }
}

/** How one engraved plate runs: its engine options, and what it listens to on the page. */
export interface PlateEngine {
  /** `late` is true when the static mark already shows (the page hydrated late). */
  options(stage: HTMLElement, canvas: HTMLCanvasElement, late: boolean): HeroMarkOptions
  /** Wires scroll or pointer to the running engine; returns the cleanup. */
  attach?(handle: HeroMarkInstance, stage: HTMLElement): () => void
}

/**
 * Mounts the engine on the stage's canvas. The stage's children include the
 * static SVG (`.fallback`), shown without JavaScript, under reduced motion
 * (or the `#reduced` flag), or if the engine cannot start; `data-state` on the
 * stage tells the CSS which one shows. `spec` must be stable (module level).
 */
export function usePlateEngine(
  stageRef: RefObject<HTMLDivElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  spec: PlateEngine
): void {
  useEffect(() => {
    const stage = stageRef.current
    const canvas = canvasRef.current
    if (!stage || !canvas) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let handle: HeroMarkInstance | null = null
    let detach: (() => void) | null = null
    let staticMark = false

    const start = () => {
      staticMark = motion.matches || reducedFlag()
      if (staticMark) {
        stage.dataset.state = 'static'
        return
      }
      const fallback = stage.querySelector('.fallback')
      const late = !!fallback && parseFloat(getComputedStyle(fallback).opacity) > 0.5
      try {
        handle = mount(canvas, {
          ...spec.options(stage, canvas, late),
          onFirstFrame: () => {
            stage.dataset.state = 'live'
          },
        })
        if (!handle.info().W) stage.dataset.state = 'static'
        else detach = spec.attach?.(handle, stage) ?? null
        // review builds only: the handle for profiling (renderAt) and frame capture
        if (process.env.NODE_ENV === 'development') Reflect.set(canvas, '__mark', handle)
      } catch {
        stage.dataset.state = 'static'
      }
    }
    const stop = () => {
      detach?.()
      detach = null
      handle?.destroy()
      handle = null
    }
    const restart = () => {
      stop()
      delete stage.dataset.state
      start()
    }
    const onHash = () => {
      if (reducedFlag() !== staticMark && !motion.matches) restart()
    }

    start()
    window.addEventListener('hashchange', onHash)
    motion.addEventListener('change', restart)
    return () => {
      stop()
      window.removeEventListener('hashchange', onHash)
      motion.removeEventListener('change', restart)
    }
  }, [stageRef, canvasRef, spec])
}
