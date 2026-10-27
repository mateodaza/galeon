'use client'

import { m } from 'motion/react'
import { slideUp, useAnimationPreset, useAnimationsEnabled } from '@/lib/animations'
import { SailboatPattern } from './patterns/sailboat-pattern'
import { TreasureChestPattern } from './patterns/treasure-chest-pattern'
import { LighthousePattern } from './patterns/lighthouse-pattern'

interface FlowSection {
  id: string
  title: string
  description: string
  reverse: boolean
}

const sections: FlowSection[] = [
  {
    id: 'send',
    title: 'Send',
    description:
      'Each payment generates a unique stealth address.\nNo two transactions ever share a destination.\nYour payment history stays private.',
    reverse: false,
  },
  {
    id: 'receive',
    title: 'Receive',
    description:
      'Galeon scans for incoming payments automatically. When funds arrive, deposit them to the Privacy Pool to break the link before moving to your wallet.',
    reverse: true,
  },
  {
    id: 'report',
    title: 'Report',
    description:
      'Verify payments on-chain with receipt IDs. Selective disclosure proofs for compliance coming soon.',
    reverse: false,
  },
]

/**
 * Three sections with geometric patterns and glass cards.
 * Navbar-style glass effect for consistent design language.
 */
export function FlowSections() {
  const animationsEnabled = useAnimationsEnabled()
  const slideUpProps = useAnimationPreset(slideUp)
  const Wrapper = animationsEnabled ? m.div : 'div'

  const patterns = [SailboatPattern, TreasureChestPattern, LighthousePattern]

  return (
    <section id="how-it-works" className="relative py-24">
      {/* Header */}
      <div className="mx-auto max-w-6xl px-6 pb-16 text-center">
        <p className="mb-2 inline-block rounded-full border border-white/20 bg-slate-700/50 px-4 py-1.5 text-sm font-medium uppercase tracking-wider text-white/80 backdrop-blur-xl">
          How it works
        </p>
        <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
          Your money, your business
        </h2>
      </div>

      {/* Sections */}
      <div className="mx-auto max-w-6xl space-y-20 px-6">
        {sections.map((section, index) => {
          const PatternComponent = patterns[index]

          return (
            <Wrapper
              key={section.id}
              className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-12`}
              {...(animationsEnabled && {
                ...slideUpProps,
                whileInView: slideUpProps.animate,
                animate: undefined,
                viewport: { once: true, margin: '-100px' },
              })}
            >
              {/* Pattern Side */}
              <div
                className={`flex min-h-[200px] items-center justify-center lg:min-h-[240px] ${section.reverse ? 'lg:order-2' : 'lg:order-1'}`}
              >
                <PatternComponent />
              </div>

              {/* Content Side - glass card like navbar */}
              <div
                className={`flex min-h-[200px] items-center rounded-2xl border border-white/20 bg-slate-900/50 px-8 py-8 shadow-lg shadow-black/10 backdrop-blur-xl lg:min-h-[240px] lg:px-10 ${section.reverse ? 'lg:order-1' : 'lg:order-2'}`}
              >
                <div>
                  <h3 className="text-3xl font-bold text-white lg:text-4xl">{section.title}</h3>
                  <p className="mt-4 max-w-md whitespace-pre-line text-base leading-relaxed text-cyan-100/70 lg:text-lg">
                    {section.description}
                  </p>
                </div>
              </div>
            </Wrapper>
          )
        })}
      </div>
    </section>
  )
}
