import { ABOUT } from '@/content/about'
import { OG_CONTENT_TYPE, OG_SIZE, renderOg } from '@/lib/og/render'

export const alt = ABOUT.meta.title
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return renderOg({ eyebrow: ABOUT.label, lines: ABOUT.og, fontSize: 64 })
}
