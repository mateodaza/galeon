import Link from 'next/link'
import { SITE_NAME } from '@/lib/site'

/**
 * Slim notice pinned above the previous site, warning that its old privacy
 * claims overstate what the protocol does. It sits over the old floating nav,
 * so the legacy layout moves that nav down by the banner's height (three
 * lines on phones, two from `sm`, one from `lg`).
 */
export function LegacyBanner() {
  return (
    <div className="fixed inset-x-0 top-0 z-[60] border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <p className="mx-auto flex min-h-8 max-w-6xl flex-wrap items-center justify-center gap-x-2 px-4 py-1.5 text-center text-xs leading-4 text-cyan-100/70 sm:py-0">
        <span>
          This is the previous {SITE_NAME} site, kept as it was. Some of its privacy claims
          overstate what {SITE_NAME} does.
        </span>
        <Link
          href="/#who"
          className="text-cyan-300 underline-offset-2 transition-colors hover:text-cyan-200 hover:underline"
        >
          See who sees what today
        </Link>
      </p>
    </div>
  )
}
