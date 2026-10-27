import type { SVGProps } from 'react'

export interface BrandSvgProps extends Omit<SVGProps<SVGSVGElement>, 'viewBox' | 'children'> {
  /** Accessible name. Pass an empty string when the mark sits beside its name. */
  title?: string
}

/** A labelled image, or hidden from assistive tech when decorative. */
export function brandA11y(title: string) {
  return title === ''
    ? ({ 'aria-hidden': true, focusable: false } as const)
    : ({ role: 'img', 'aria-label': title } as const)
}
