import { Fragment } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { LegacyLink } from './legacy-links'

interface LegacyFooterProps {
  links: LegacyLink[]
  className?: string
}

/** Footer of the previous site: a dotted row of links and the hackathon credit. */
export function LegacyFooter({ links, className }: LegacyFooterProps) {
  return (
    <footer
      className={cn(
        'border-t border-white/10 bg-slate-950 px-6 py-6 text-center text-sm text-cyan-100/70',
        className
      )}
    >
      {links.map((link) => (
        <Fragment key={link.href}>
          <Link href={link.href} className="text-cyan-100/70 transition-colors hover:text-cyan-300">
            {link.label}
          </Link>
          <span className="mx-2">·</span>
        </Fragment>
      ))}
      Built for Mantle Global Hackathon 2025
    </footer>
  )
}
