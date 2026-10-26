'use client'

import { useRef, type CSSProperties, type ReactNode } from 'react'
import { T_REVEAL, type HeroMarkInstance } from '@/lib/hero-mark/engine'
import { plateBox, usePlateEngine, type PlateEngine } from './use-plate-engine'

/** Strength of the light a scroll carries across the plate, and how long it lingers, ms. */
const GLINT = 0.7
const GLINT_MS = 240

/** Nothing is drawn outside the plate square here, so the canvas does not reach past it. */
const NO_BLEED = {
  '--bleed-t': 0,
  '--bleed-r': 0,
  '--bleed-b': 0,
  '--bleed-l': 0,
} as CSSProperties

function inView(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect()
  return r.bottom > 0 && r.top < window.innerHeight
}

/**
 * The light: a mouse over the band leads it; otherwise a scroll carries it
 * across the plate, lower left to upper right as the band rises, and it goes
 * out shortly after the scroll stops. Touch only gets the scroll. Whenever
 * this light is out, the engine's ambient light walks the plate on its own.
 */
function attachLight(handle: HeroMarkInstance, stage: HTMLElement): () => void {
  const band = stage.closest('section') ?? stage
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
  let pointer: [number, number] | null = null
  let last: [number, number] = [0.5, 0.6]
  let glint: ReturnType<typeof setTimeout> | undefined

  const toPlate = (cx: number, cy: number): [number, number] => {
    const r = stage.getBoundingClientRect()
    return [(cx - r.left) / r.width, (cy - r.top) / r.height]
  }
  const light = (at: [number, number], k: number) => {
    last = at
    handle.setLight(at[0], at[1], k)
  }
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || !fine.matches) return
    pointer = [e.clientX, e.clientY]
    light(toPlate(e.clientX, e.clientY), 1)
  }
  const onLeave = () => {
    pointer = null
    light(last, 0)
  }
  const onScroll = () => {
    // under a resting mouse the plate moves, so the light is found again
    if (pointer) return light(toPlate(pointer[0], pointer[1]), 1)
    if (!inView(stage)) return
    const r = stage.getBoundingClientRect()
    const q = Math.min(
      1,
      Math.max(0, (window.innerHeight - r.top) / (window.innerHeight + r.height))
    )
    light([0.12 + 0.76 * q, 0.86 - 0.62 * q], GLINT)
    clearTimeout(glint)
    glint = setTimeout(() => light(last, 0), GLINT_MS)
  }

  band.addEventListener('pointermove', onMove, { passive: true })
  band.addEventListener('pointerleave', onLeave)
  window.addEventListener('scroll', onScroll, { passive: true })
  return () => {
    clearTimeout(glint)
    band.removeEventListener('pointermove', onMove)
    band.removeEventListener('pointerleave', onLeave)
    window.removeEventListener('scroll', onScroll)
  }
}

const CLOSE_ENGINE: PlateEngine = {
  // hydrated late with the band already in view: the static mark shows, so start inked
  options: (stage, canvas, late) => ({
    mode: 'reveal',
    ambient: true,
    layout: () => plateBox(stage, canvas),
    startAt: late && inView(stage) ? T_REVEAL : 0,
  }),
  attach: attachLight,
}

/**
 * The closing mark, alive: the engraving inks in once from the waterline up
 * when the band comes into view, then the water band drifts and a soft light
 * follows the mouse, or passes with a scroll, like light on water. With no
 * mouse over the band (always on touch), a slow light walks along the water
 * and up the sails every 11 s. It pauses off-screen and in a hidden tab.
 * `children` is the static SVG: without JavaScript, under reduced motion, or
 * if the engine cannot start. Decorative: the title beside it carries the
 * meaning.
 */
export function ClosingMark({ children }: { children: ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  usePlateEngine(stageRef, canvasRef, CLOSE_ENGINE)

  return (
    <div ref={stageRef} className="plate" style={NO_BLEED} aria-hidden="true">
      {children}
      <canvas ref={canvasRef} />
    </div>
  )
}
