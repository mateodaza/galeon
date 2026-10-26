import { MARK_MASTER_PATH } from '@/components/brand/paths'
import { PLATE } from '@/lib/hero-mark/mark'

const LINES = PLATE.construction.map((p, i) => {
  if (p.kind === 'circle') return <circle key={i} cx={p.centre[0]} cy={p.centre[1]} r={p.r} />
  if (p.kind === 'line')
    return <line key={i} x1={p.from[0]} y1={p.from[1]} x2={p.to[0]} y2={p.to[1]} />
  return null
})

const POINTS = PLATE.construction.map((p, i) =>
  p.kind === 'point' ? <circle key={i} cx={p.at[0]} cy={p.at[1]} r={0.55} /> : null
)

/**
 * The master mark in sea with its construction drawn over it as hairlines,
 * in the order the logo is built: the moon's two circles and its opening
 * axis, the two circles that cut the wave, the sail line and both luffs, then
 * the points where they meet. Over the ink the hairlines turn to paper.
 */
export function MarkConstruction({ label }: { label: string }) {
  return (
    <svg className="construction" viewBox="-2 -5 68 68" role="img" aria-label={label}>
      <defs>
        <clipPath id="construction-mark">
          <path d={MARK_MASTER_PATH} />
        </clipPath>
      </defs>
      <g className="c-lines">{LINES}</g>
      <path className="c-mark" d={MARK_MASTER_PATH} />
      <g className="c-lines c-lines-on" clipPath="url(#construction-mark)">
        {LINES}
      </g>
      <g className="c-points">{POINTS}</g>
    </svg>
  )
}
