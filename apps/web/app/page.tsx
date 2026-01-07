import Link from 'next/link'
import { FloatingNav } from '@/components/layout/floating-nav'
import { HeroSection } from '@/components/landing/hero-section'
import { FlowSections } from '@/components/landing/flow-sections'
import { FaqSection } from '@/components/landing/faq-section'
import { CtaCard } from '@/components/landing/cta-card'
import { DeepSeaGradient } from '@/components/landing/deep-sea-gradient'

export default function Home() {
  return (
    <>
      {/* Global animated gradient background - fixed to viewport */}
      <div className="fixed inset-0 -z-10">
        <DeepSeaGradient variant="ocean" intensity="calm" />
      </div>

      <main className="relative flex min-h-screen flex-col">
        {/* Floating Navigation */}
        <FloatingNav />

        {/* Hero Section */}
        <HeroSection />

        {/* Flow Sections */}
        <FlowSections />

        {/* FAQ + CTA Section */}
        <div className="relative">
          <FaqSection />
          <CtaCard />
        </div>

        {/* Footer */}
        <footer className="border-t border-white/10 bg-slate-950 px-6 py-6 text-center text-sm text-cyan-100/70">
          <Link href="/about" className="text-cyan-100/70 transition-colors hover:text-cyan-300">
            About
          </Link>
          <span className="mx-2">·</span>
          <Link href="/roadmap" className="text-cyan-100/70 transition-colors hover:text-cyan-300">
            Roadmap
          </Link>
          <span className="mx-2">·</span>
          Built for Mantle Global Hackathon 2025
        </footer>
      </main>
    </>
  )
}
