import { HERO, META } from '@/content/landing'
import { OG_CONTENT_TYPE, OG_SIZE, renderOg } from '@/lib/og/render'

export const alt = META.title
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return renderOg({
    eyebrow: HERO.eyebrow,
    lines: [
      ['Privacy', 0],
      ['at the level', 0.6],
      ['you need.', 1.4],
    ],
  })
}
