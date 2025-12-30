'use client'

import { m } from 'motion/react'
import { Ship, Send, Wallet, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { GlassCard, GlassCardContent } from '@/components/ui/glass-card'
import { staggerContainer, staggerItem, useAnimationsEnabled } from '@/lib/animations'

const steps = [
  {
    number: '01',
    icon: Ship,
    title: 'Create a Port',
    description:
      'Set up a named payment endpoint. Share a simple link with anyone who needs to pay you.',
    detail: 'Your stealth meta-address is registered on-chain.',
  },
  {
    number: '02',
    icon: Send,
    title: 'Receive Payment',
    description:
      'Payer sends funds to a freshly generated one-time address derived from your meta-address.',
    detail: 'Each payment goes to a unique stealth address.',
  },
  {
    number: '03',
    icon: Wallet,
    title: 'Collect Privately',
    description:
      'Only you can compute the private key to spend from that address. No one else can link it to you.',
    detail: 'Funds appear in your wallet, unlinkable to your identity.',
  },
]

/**
 * Visual "How it works" diagram showing the stealth address flow.
 */
export function HowItWorks() {
  const animationsEnabled = useAnimationsEnabled()

  return (
    <section id="how-it-works" className="mx-auto w-full max-w-6xl px-6 py-16">
      {/* Section header */}
      <div className="mb-12 text-center">
        <p className="mb-2 text-sm font-medium uppercase tracking-wider text-cyan-400">
          How Galeon works
        </p>
        <h2 className="text-3xl font-bold text-white sm:text-4xl">Privacy in three steps</h2>
      </div>

      {/* Privacy comparison */}
      <div className="mb-12 flex flex-col items-center justify-center gap-8 sm:flex-row">
        <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
          <Eye className="h-5 w-5 text-red-400" />
          <div>
            <p className="text-sm font-medium text-red-300">Traditional</p>
            <p className="text-xs text-red-200/60">Same address = traceable history</p>
          </div>
        </div>
        <ArrowRight className="hidden h-5 w-5 text-cyan-500/50 sm:block" />
        <div className="flex items-center gap-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-4 py-3">
          <EyeOff className="h-5 w-5 text-cyan-400" />
          <div>
            <p className="text-sm font-medium text-cyan-300">With Galeon</p>
            <p className="text-xs text-cyan-200/60">Fresh address = unlinkable</p>
          </div>
        </div>
      </div>

      {/* Steps */}
      {animationsEnabled ? (
        <m.div
          className="grid gap-6 md:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          {steps.map((step, index) => (
            <m.div key={step.number} variants={staggerItem}>
              <StepCard step={step} isLast={index === steps.length - 1} />
            </m.div>
          ))}
        </m.div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <StepCard key={step.number} step={step} isLast={index === steps.length - 1} />
          ))}
        </div>
      )}
    </section>
  )
}

function StepCard({ step, isLast }: { step: (typeof steps)[0]; isLast: boolean }) {
  const Icon = step.icon

  return (
    <div className="relative">
      <GlassCard variant="default" className="h-full">
        <GlassCardContent className="pt-6">
          {/* Step number */}
          <div className="mb-4 flex items-center justify-between">
            <span className="text-4xl font-bold text-cyan-500/30">{step.number}</span>
            <Icon className="h-8 w-8 text-cyan-300" />
          </div>

          {/* Content */}
          <h3 className="mb-2 text-xl font-semibold text-white">{step.title}</h3>
          <p className="mb-4 text-sm text-cyan-100/70">{step.description}</p>

          {/* Technical detail */}
          <div className="rounded border border-cyan-500/10 bg-cyan-500/5 px-3 py-2">
            <p className="text-xs text-cyan-200/60">{step.detail}</p>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Connector arrow (hidden on last card and mobile) */}
      {!isLast && (
        <div className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 md:block">
          <ArrowRight className="h-6 w-6 text-cyan-500/30" />
        </div>
      )}
    </div>
  )
}
