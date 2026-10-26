import { ROADMAP } from '@/content/roadmap'
import { OG_CONTENT_TYPE, OG_SIZE, renderOg } from '@/lib/og/render'

export const alt = ROADMAP.meta.title
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return renderOg({ eyebrow: ROADMAP.label, lines: ROADMAP.og, fontSize: 64 })
}
