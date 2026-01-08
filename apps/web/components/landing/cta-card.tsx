'use client'

import Link from 'next/link'
import { m } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { GlassCard, GlassCardContent } from '@/components/ui/glass-card'
import { tactilePress, slideUp, useAnimationPreset, useAnimationsEnabled } from '@/lib/animations'

/**
 * Call-to-action card with wood accent variant.
 */
export function CtaCard() {
  const animationsEnabled = useAnimationsEnabled()
  const slideUpProps = useAnimationPreset(slideUp)
  const tactileProps = useAnimationPreset(tactilePress)

  const content = (
    <GlassCard
      variant="hero"
      blur="heavy"
      glowOnHover
      className="mx-auto max-w-4xl border-cyan-400/30 bg-slate-900/40 shadow-[0_0_30px_rgba(6,182,212,0.15)]"
    >
      <GlassCardContent className="flex flex-col items-center gap-6 py-12 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <h2 className="text-2xl font-bold text-white">Ready to get paid privately?</h2>
          <p className="mt-2 text-cyan-100/70">
            Freelancers, creators, and businesses — set up your first Port in minutes.
          </p>
        </div>
        {animationsEnabled ? (
          <m.div {...tactileProps} className="shrink-0">
            <Link
              href="/setup"
              className="flex cursor-pointer items-center gap-2 rounded-full bg-cyan-600/80 px-6 py-3 text-base font-medium text-white shadow-lg shadow-cyan-600/20 transition-all hover:bg-cyan-500/80 hover:shadow-cyan-500/30"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </m.div>
        ) : (
          <Link
            href="/setup"
            className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full bg-cyan-600/80 px-6 py-3 text-base font-medium text-white shadow-lg shadow-cyan-600/20 transition-all hover:bg-cyan-500/80 hover:shadow-cyan-500/30"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </GlassCardContent>
    </GlassCard>
  )

  if (!animationsEnabled) {
    return <section className="px-6 py-16">{content}</section>
  }

  return (
    <m.section className="px-6 py-16" {...slideUpProps}>
      {content}
    </m.section>
  )
}
