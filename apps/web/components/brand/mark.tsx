import { MARK_MASTER_PATH, MARK_VIEWBOX } from './paths'
import { brandA11y, type BrandSvgProps } from './svg-props'

/**
 * The master mark: the crescent opening up and to the right, two sails with
 * the mast as the gap between them, and the wave cut into the lower horn.
 * Use it at 64 px and up; below that use `MarkNav`. It inherits `currentColor`.
 */
export function Mark({ title = 'Galeon', ...props }: BrandSvgProps) {
  return (
    <svg viewBox={MARK_VIEWBOX} fill="currentColor" {...brandA11y(title)} {...props}>
      <path d={MARK_MASTER_PATH} />
    </svg>
  )
}
