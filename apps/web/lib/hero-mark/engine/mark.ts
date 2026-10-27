/**
 * The Galeon master mark, inlined from logo/final/constants.json (cuts.master).
 *
 * Units are the 64-unit logo box, y down. Angles are atan2(dy, dx) in radians,
 * so they increase clockwise on screen, measured from 3 o'clock.
 */

export interface Circle {
  readonly x: number
  readonly y: number
  readonly r: number
}

export type Point = readonly [number, number]
export type Cubic = readonly [Point, Point, Point, Point]

export const D2R = Math.PI / 180
export const TAU = Math.PI * 2
export const HPI = Math.PI / 2

/** Outer edge of the moon. */
export const O: Circle = { x: 33.375, y: 31.0, r: 28.0 }
/** Inner edge of the moon (the bowl). */
export const I: Circle = { x: 39.0771, y: 27.7079, r: 23.0842 }
/** Lower edge of the wave slit, top edge of the wave band. */
export const S: Circle = { x: 32.63, y: 27.3383, r: 29.4 }
/** Upper edge of the wave slit. */
export const X: Circle = { x: 31.6607, y: 28.5423, r: 27.9 }
/** I pulled in by the 1.5-unit gap: the sails stand on it. */
export const SAIL_LINE: Circle = { x: 39.0771, y: 27.7079, r: 21.5842 }

/** The opening's axis, up and to the right. */
export const AXIS = -30 * D2R
/** Deepest point of the wall, measured from O. */
export const R_IN = I.r - Math.hypot(I.x - O.x, I.y - O.y)
/** The slit ends here (angle from O); it starts at the lower horn. */
export const SLIT_END = 120.077 * D2R
/** Left half of the moon: from the bottom round the back and over the top to the upper horn U. */
export const A_L = (293 - 90) * D2R
/** Right half: from the bottom up to the lower horn Lh. */
export const A_R = (90 - 7) * D2R

export const PATH_CRESCENT =
  'M44.315 5.226A28 28 0 1 0 61.166 34.412A29.4 29.4 0 0 1 20.094 53.932A27.9 27.9 0 0 0 53.869 45.43A23.084 23.084 0 1 1 44.315 5.226Z'
export const PATH_JIB =
  'M31.125 23.72L31.125 47.774A21.584 21.584 0 0 1 26.697 45.389C27.593 38.145 29.107 30.734 31.125 23.72Z'
export const PATH_MAIN =
  'M32.625 18.4L32.625 48.305A21.584 21.584 0 0 0 49.21 46.766C38.834 45.858 33.817 35.445 32.625 18.4Z'
export const PATH_SAILS = `${PATH_JIB} ${PATH_MAIN}`
/** The whole mark as one path: mark.svg. */
export const PATH_MARK = `${PATH_CRESCENT} ${PATH_SAILS}`

/**
 * The plate square: centred on the ink box, 2.16 R wide. The engine places
 * the mark exactly here, so a static SVG with this viewBox lines up with it.
 */
export const PLATE = { x: 3.031, y: 0.76, size: 60.48 } as const
export const PLATE_VIEWBOX = `${PLATE.x} ${PLATE.y} ${PLATE.size} ${PLATE.size}`
export const INK_BOX = { x0: 5.375, y0: 3.0, x1: 61.1663, y1: 59.0 } as const

/** The slot between the luffs: the mast. It stays paper. */
export const MAST = { left: 31.125, right: 32.625 } as const

export interface Sail {
  readonly id: 'main' | 'jib'
  /** x of the luff (the mast side). */
  readonly luff: number
  /** +1 when the cloth runs right of the luff, -1 when left. */
  readonly dir: 1 | -1
  readonly head: number
  /** y where the luff meets the sail line. */
  readonly foot: number
  /** y of the clew (main) or tack (jib), where the leech meets the sail line. */
  readonly corner: number
  /** lowest y of the cloth. */
  readonly low: number
  /** greatest distance of the cloth from the luff. */
  readonly width: number
  readonly leech: Cubic
  /** tone at the luff and at the leech, 0..1. */
  readonly toneLuff: number
  readonly toneLeech: number
}

export const SAILS: readonly Sail[] = [
  {
    id: 'main',
    luff: 32.625,
    dir: 1,
    head: 18.4,
    foot: 48.3052,
    corner: 46.7656,
    low: SAIL_LINE.y + SAIL_LINE.r,
    width: 16.585,
    leech: [
      [49.2103, 46.7656],
      [38.8338, 45.8578],
      [33.8169, 35.4448],
      [32.625, 18.4],
    ],
    toneLuff: 0.6,
    toneLeech: 0.3,
  },
  {
    id: 'jib',
    luff: 31.125,
    dir: -1,
    head: 23.72,
    foot: 47.7738,
    corner: 45.3887,
    low: 47.7738,
    width: 4.428,
    leech: [
      [26.6969, 45.3887],
      [27.5926, 38.1454],
      [29.1072, 30.734],
      [31.125, 23.72],
    ],
    toneLuff: 0.5,
    toneLeech: 0.62,
  },
]
export const SAIL_TOP = 18.4
export const SAIL_BOTTOM = SAIL_LINE.y + SAIL_LINE.r

/** x on a leech at height y. The leech falls monotonically from its corner to the head, so bisect. */
function leechX(P: Cubic, y: number): number {
  let lo = 0
  let hi = 1
  let t = 0.5
  for (let k = 0; k < 26; k++) {
    t = (lo + hi) / 2
    const u = 1 - t
    const by =
      u * u * u * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t * t * t * P[3][1]
    if (by > y) lo = t
    else hi = t
  }
  const u = 1 - t
  return (
    u * u * u * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t * t * t * P[3][0]
  )
}

/** The cloth of a sail at height y, as [near (luff side), far] x, or null above or below it. */
export function sailSpan(sl: Sail, y: number): [number, number] | null {
  if (y < sl.head || y > sl.low) return null
  const C = SAIL_LINE
  const h = Math.sqrt(Math.max(0, C.r * C.r - (y - C.y) * (y - C.y)))
  let near = sl.luff
  const far = y <= sl.corner ? leechX(sl.leech, y) : sl.dir > 0 ? C.x + h : C.x - h
  if (y > sl.foot) near = sl.dir > 0 ? Math.max(sl.luff, C.x - h) : Math.min(sl.luff, C.x + h)
  if ((far - near) * sl.dir <= 0) return null
  return [near, far]
}
