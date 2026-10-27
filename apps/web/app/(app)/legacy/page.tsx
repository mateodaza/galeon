import { FloatingNav } from '@/components/layout/floating-nav'
import { HeroSection } from '@/components/landing/hero-section'
import { FlowSections } from '@/components/landing/flow-sections'
import { FaqSection } from '@/components/landing/faq-section'
import { CtaCard } from '@/components/landing/cta-card'
import { LegacyFooter } from '@/components/legacy/legacy-footer'
import { LEGACY_NAV, LEGACY_PATHS } from '@/components/legacy/legacy-links'

const FOOTER_LINKS = [
  { href: LEGACY_PATHS.about, label: 'About' },
  { href: LEGACY_PATHS.roadmap, label: 'Roadmap' },
]

/** The previous landing page, unchanged apart from links that stay inside /legacy. */
export default function LegacyHome() {
  return (
    <main className="relative flex min-h-screen flex-col">
      <FloatingNav nav={LEGACY_NAV} homeHref={LEGACY_PATHS.home} />

      <HeroSection />

      <FlowSections />

      <div className="relative">
        <FaqSection />
        <CtaCard />
      </div>

      <LegacyFooter links={FOOTER_LINKS} />
    </main>
  )
}
