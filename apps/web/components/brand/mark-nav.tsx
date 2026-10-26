import { MARK_MID_PATH, MARK_VIEWBOX } from './paths'
import { brandA11y, type BrandSvgProps } from './svg-props'

/**
 * The mid cut of the mark (no wave, wider slots, fuller sails) for 25 to
 * 63 px: nav, footer, avatars. It inherits `currentColor`.
 */
export function MarkNav({ title = 'Galeon', ...props }: BrandSvgProps) {
  return (
    <svg viewBox={MARK_VIEWBOX} fill="currentColor" {...brandA11y(title)} {...props}>
      <path d={MARK_MID_PATH} />
    </svg>
  )
}
