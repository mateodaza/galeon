import { LOCKUP_NAV } from './paths'
import { brandA11y, type BrandSvgProps } from './svg-props'

/**
 * The nav lockup: the mid-cut mark and "Galeon" in title case, both as
 * outlines, so it never waits for a font. Size it by height; the width
 * follows the viewBox. It inherits `currentColor`.
 */
export function Lockup({ title = 'Galeon', ...props }: BrandSvgProps) {
  return (
    <svg viewBox={LOCKUP_NAV.viewBox} fill="currentColor" {...brandA11y(title)} {...props}>
      <path transform={LOCKUP_NAV.mark.transform} d={LOCKUP_NAV.mark.d} />
      <path transform={LOCKUP_NAV.word.transform} d={LOCKUP_NAV.word.d} />
    </svg>
  )
}
