import { HERO, META } from '@/content/landing'
import { OG_CONTENT_TYPE, OG_SIZE, renderOg } from '@/lib/og/render'

export const alt = META.title
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return renderOg({
    eyebrow: HERO.eyebrow,
    lines: HERO.title.lines,
  })
}
