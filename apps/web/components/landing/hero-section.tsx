'use client'

import Link from 'next/link'
import { m } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { ConnectButton } from '@/components/wallet-button'
import { Button } from '@/components/ui/button'
import { slideUp, tactilePress, useAnimationPreset, useAnimationsEnabled } from '@/lib/animations'

/**
 * Solution-first hero section with subtle vignette for readability.
 */
export function HeroSection() {
  const animationsEnabled = useAnimationsEnabled()
  const slideUpProps = useAnimationPreset(slideUp)
  const tactileProps = useAnimationPreset(tactilePress)

  const content = (
    <>
      {/* Solution-first headline */}
      <h1 className="max-w-3xl text-4xl font-bold leading-tight text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.3)] sm:text-5xl lg:text-6xl">
        Private payments
        <br />
        <span className="text-cyan-300">for the public blockchain.</span>
      </h1>

      {/* Explanation - glass card */}
      <div className="mt-8 max-w-xl rounded-2xl border border-white/15 bg-slate-900/40 px-6 py-4 shadow-lg shadow-black/10 backdrop-blur-md">
        <p className="text-base leading-relaxed text-cyan-100/80 sm:text-lg">
          Compliance-ready privacy for real-world payments.
        </p>
      </div>

      {/* CTAs */}
      <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
        {animationsEnabled ? (
          <>
            <m.div {...tactileProps}>
              <ConnectButton />
            </m.div>
            <m.div {...tactileProps}>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="gap-2 border-slate-600/50 bg-slate-800/70 text-white backdrop-blur-sm transition-colors hover:bg-slate-700/70 hover:text-white"
              >
                <Link href="#how-it-works">
                  See how it works
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </m.div>
          </>
        ) : (
          <>
            <ConnectButton />
            <Button
              variant="outline"
              size="lg"
              asChild
              className="gap-2 border-slate-600/50 bg-slate-800/70 text-white backdrop-blur-sm transition-colors hover:bg-slate-700/70 hover:text-white"
            >
              <Link href="#how-it-works">
                See how it works
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </>
        )}
      </div>
    </>
  )

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-24 text-center">
      {animationsEnabled ? (
        <m.div {...slideUpProps} className="relative z-10 flex flex-col items-center">
          {content}
        </m.div>
      ) : (
        <div className="relative z-10 flex flex-col items-center">{content}</div>
      )}
    </section>
  )
}
