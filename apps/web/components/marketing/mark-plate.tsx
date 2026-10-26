import { PLATE } from '@/lib/hero-mark/mark'

/** Line pitch in mark units: the moon and sails, and the finer water. */
const PITCH = 0.42
const WATER_PITCH = 0.3

const MOON_COUNT = Math.ceil((PLATE.wall + 0.15) / PITCH)
/** Moon arcs from the rim inward; the rim carries the heaviest line. */
const MOON_RINGS = Array.from({ length: MOON_COUNT }, (_, k) => {
  const u = 1 - k / Math.max(1, MOON_COUNT - 1)
  return { r: PLATE.O.r - (k + 0.5) * PITCH, w: PITCH * (0.16 + 0.5 * Math.pow(u, 1.15)) }
})
const WATER_RINGS = Array.from(
  { length: Math.ceil(PLATE.wave.depth / WATER_PITCH) },
  (_, j) => PLATE.S.r + (j + 0.5) * WATER_PITCH
)

interface MarkPlateProps {
  /** Prefix for the clip and pattern ids; unique per page. */
  id: string
  className?: string
  /** Literal colours and size, for renderers without CSS (the social cards). */
  ink?: string
  water?: string
  size?: number
}

/** A literal colour as an attribute, or the CSS custom property as a style. */
function paint(prop: 'fill' | 'stroke', literal: string | undefined, cssVar: string) {
  return literal ? { [prop]: literal } : { style: { [prop]: `var(${cssVar})` } }
}

/**
 * The mark as a static line engraving in SVG: concentric arcs in the moon,
 * S-concentric arcs in the water band, horizontal rows in the sails. It is the
 * fallback for the hero canvas (no JavaScript, reduced motion) and the mark on
 * the closing band. Colours come from `--plate-ink` and `--plate-water`. The
 * viewBox matches where the canvas engine places the mark.
 */
export function MarkPlate({ id, className, ink, water, size }: MarkPlateProps) {
  return (
    <svg
      className={className}
      viewBox={PLATE.viewBox}
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={`${id}-moon`}>
          <path d={PLATE.parts.moon} />
        </clipPath>
        <clipPath id={`${id}-water`}>
          <path d={PLATE.parts.water} />
        </clipPath>
        <pattern id={`${id}-rows`} patternUnits="userSpaceOnUse" width="64" height={PITCH}>
          <rect width="64" height={PITCH * 0.42} {...paint('fill', ink, '--plate-ink')} />
        </pattern>
      </defs>
      <g clipPath={`url(#${id}-moon)`} fill="none" {...paint('stroke', ink, '--plate-ink')}>
        {MOON_RINGS.map(({ r, w }) => (
          <circle key={r} cx={PLATE.O.c[0]} cy={PLATE.O.c[1]} r={r} strokeWidth={w} />
        ))}
      </g>
      <g
        clipPath={`url(#${id}-water)`}
        fill="none"
        {...paint('stroke', water ?? ink, '--plate-water')}
      >
        {WATER_RINGS.map((r) => (
          <circle
            key={r}
            cx={PLATE.S.c[0]}
            cy={PLATE.S.c[1]}
            r={r}
            strokeWidth={WATER_PITCH * 0.4}
          />
        ))}
      </g>
      <path d={PLATE.parts.main + PLATE.parts.jib} fill={`url(#${id}-rows)`} />
    </svg>
  )
}
