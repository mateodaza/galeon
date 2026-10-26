import { FloatingNav } from '@/components/layout/floating-nav'
import { LegacyFooter } from './legacy-footer'
import { LEGACY_NAV, LEGACY_PATHS, type LegacyLink } from './legacy-links'

interface LegacyPageShellProps {
  children: React.ReactNode
  footerLinks: LegacyLink[]
}

/**
 * Frame shared by the previous About and Roadmap pages: floating nav, one
 * glass panel for the content, and the footer.
 */
export function LegacyPageShell({ children, footerLinks }: LegacyPageShellProps) {
  return (
    <main className="relative flex min-h-screen flex-col">
      <FloatingNav nav={LEGACY_NAV} homeHref={LEGACY_PATHS.home} />

      <div className="mx-auto w-full max-w-3xl px-6 pb-16 pt-40">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 p-8 shadow-2xl backdrop-blur-xl sm:p-12">
          {children}
        </div>
      </div>

      <LegacyFooter links={footerLinks} className="mt-auto" />
    </main>
  )
}
