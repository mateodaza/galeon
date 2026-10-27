'use client'

import { useRef, type CSSProperties, type ReactNode } from 'react'
import { T_REVEAL } from '@/lib/hero-mark/engine'
import { plateBox, usePlateEngine, type PlateEngine } from './use-plate-engine'

/** Nothing is drawn outside the plate square here, so the canvas does not reach past it. */
const NO_BLEED = {
  '--bleed-t': 0,
  '--bleed-r': 0,
  '--bleed-b': 0,
  '--bleed-l': 0,
} as CSSProperties

const CLOSE_ENGINE: PlateEngine = {
  // the engraving shows whole and holds still; the section's glitch moves over it
  options: (stage, canvas) => ({
    mode: 'reveal',
    drift: false,
    layout: () => plateBox(stage, canvas),
    startAt: T_REVEAL,
  }),
}

/**
 * The closing mark: the engraving, whole and still; the section's glitch
 * (glitch-layer.tsx) hides parts of it now and then. `children` is the static
 * SVG: without JavaScript, under reduced motion, or if the engine cannot
 * start. Decorative: the title beside it carries the meaning.
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
