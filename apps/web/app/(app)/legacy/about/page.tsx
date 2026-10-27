import type { Metadata } from 'next'
import { LegacyPageShell } from '@/components/legacy/legacy-page-shell'
import { LEGACY_PATHS } from '@/components/legacy/legacy-links'
import { AboutStory } from '@/components/legacy/about/about-story'
import { AboutStandards } from '@/components/legacy/about/about-standards'
import { AboutTrust } from '@/components/legacy/about/about-trust'
import { AboutClosing } from '@/components/legacy/about/about-closing'

export const metadata: Metadata = {
  title: 'About',
  description: 'The story behind Galeon - private payments inspired by the legendary San José',
}

const FOOTER_LINKS = [
  { href: LEGACY_PATHS.home, label: 'Home' },
  { href: LEGACY_PATHS.roadmap, label: 'Roadmap' },
  { href: '/covenant', label: 'Covenant' },
]

/** The previous About page, unchanged apart from links that stay inside /legacy. */
export default function LegacyAboutPage() {
  return (
    <LegacyPageShell footerLinks={FOOTER_LINKS}>
      <AboutStory />
      <AboutStandards />
      <AboutTrust />
      <AboutClosing />
    </LegacyPageShell>
  )
}
