'use client'

import Link from 'next/link'
import { m } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { GlassCard, GlassCardContent } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
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
          <h2 className="text-2xl font-bold text-white">Ready to accept private payments?</h2>
          <p className="mt-2 text-cyan-100/70">
            Set up your first Port in minutes. No backend required.
          </p>
        </div>
        {animationsEnabled ? (
          <m.div {...tactileProps} className="shrink-0">
            <Button size="lg" asChild>
              <Link href="/setup" className="gap-2">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </m.div>
        ) : (
          <Button size="lg" asChild className="shrink-0">
            <Link href="/setup" className="gap-2">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
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
