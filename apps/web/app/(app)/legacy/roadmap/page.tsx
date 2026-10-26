import type { Metadata } from 'next'
import { LegacyPageShell } from '@/components/legacy/legacy-page-shell'
import { LEGACY_PATHS } from '@/components/legacy/legacy-links'
import { RoadmapStatus } from '@/components/legacy/roadmap/roadmap-status'
import { RoadmapVision } from '@/components/legacy/roadmap/roadmap-vision'
import { RoadmapComparison } from '@/components/legacy/roadmap/roadmap-comparison'
import { RoadmapClosing } from '@/components/legacy/roadmap/roadmap-closing'

export const metadata: Metadata = {
  title: 'Roadmap',
  description: "Where we are, where we're going, and the challenges we're solving",
}

const FOOTER_LINKS = [
  { href: LEGACY_PATHS.home, label: 'Home' },
  { href: LEGACY_PATHS.about, label: 'About' },
  { href: '/covenant', label: 'Covenant' },
]

/** The previous Roadmap page, unchanged apart from links that stay inside /legacy. */
export default function LegacyRoadmapPage() {
  return (
    <LegacyPageShell footerLinks={FOOTER_LINKS}>
      <RoadmapStatus />
      <RoadmapVision />
      <RoadmapComparison />
      <RoadmapClosing />
    </LegacyPageShell>
  )
}
