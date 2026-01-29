'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { m, AnimatePresence } from 'motion/react'
import {
  ChevronLeft,
  ChevronRight,
  Check,
  ExternalLink,
  Anchor,
  Shield,
  FileText,
  Zap,
  Code,
  Play,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Glassmorphic slide container
function SlideContainer({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-3xl border border-white/10 bg-slate-950/70 p-10 shadow-2xl backdrop-blur-xl sm:p-14 ${className}`}
    >
      {children}
    </div>
  )
}

// Optimized 6-slide structure for 5-minute Demo Day pitch
const slides = [
  { id: 'hook', component: HookSlide },
  { id: 'solution', component: SolutionSlide },
  { id: 'built', component: BuiltSlide },
  { id: 'differentiator', component: DifferentiatorSlide },
  { id: 'demo', component: DemoSlide },
  { id: 'closing', component: ClosingSlide },
]

export default function DemoPitchPage() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [direction, setDirection] = useState(0)

  const goToSlide = useCallback(
    (index: number) => {
      if (index >= 0 && index < slides.length) {
        setDirection(index > currentSlide ? 1 : -1)
        setCurrentSlide(index)
      }
    },
    [currentSlide]
  )

  const nextSlide = useCallback(() => {
    if (currentSlide < slides.length - 1) {
      setDirection(1)
      setCurrentSlide((prev) => prev + 1)
    }
  }, [currentSlide])

  const prevSlide = useCallback(() => {
    if (currentSlide > 0) {
      setDirection(-1)
      setCurrentSlide((prev) => prev - 1)
    }
  }, [currentSlide])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        nextSlide()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prevSlide()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nextSlide, prevSlide])

  const CurrentSlideComponent = slides[currentSlide].component

  return (
    <main className="relative flex h-screen flex-col overflow-hidden">
      {/* Header */}
      <header className="absolute left-0 right-0 top-0 z-50 flex items-center justify-between bg-slate-950/60 px-6 py-4 backdrop-blur-md">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold tracking-widest text-white"
        >
          <Image
            src="/galeon-logo.png"
            alt="Galeon"
            width={28}
            height={28}
            className="drop-shadow-lg"
          />
          <span className="drop-shadow-lg">Galeon</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-cyan-100/60">
            {currentSlide + 1} / {slides.length}
          </span>
          <Badge variant="outline" className="border-cyan-500/50 text-cyan-400">
            Demo Day
          </Badge>
          <Button variant="ghost" size="sm" asChild className="text-cyan-100/70 hover:text-white">
            <Link href="/">Exit</Link>
          </Button>
        </div>
      </header>

      {/* Slide content */}
      <div className="relative flex flex-1 items-center justify-center px-6 pb-24 pt-24">
        <AnimatePresence mode="wait" custom={direction}>
          <m.div
            key={currentSlide}
            custom={direction}
            initial={{ opacity: 0, x: direction * 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -100 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="w-full max-w-5xl"
          >
            <CurrentSlideComponent />
          </m.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className="text-cyan-100/70 hover:text-white disabled:opacity-30"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>

        {/* Progress dots */}
        <div className="flex gap-2">
          {slides.map((slide, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide
                  ? 'w-8 bg-cyan-400'
                  : 'w-2 bg-cyan-100/30 hover:bg-cyan-100/50'
              }`}
              aria-label={`Go to slide ${index + 1}: ${slide.id}`}
            />
          ))}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={nextSlide}
          disabled={currentSlide === slides.length - 1}
          className="text-cyan-100/70 hover:text-white disabled:opacity-30"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </nav>
    </main>
  )
}

// =============================================================================
// SLIDES - Optimized for 5-minute Demo Day presentation
// =============================================================================

// SLIDE 1: Hook + Problem (30 seconds)
function HookSlide() {
  return (
    <SlideContainer className="mx-auto max-w-4xl text-center">
      <Image
        src="/galeon-logo.png"
        alt="Galeon"
        width={120}
        height={120}
        className="mx-auto mb-4 drop-shadow-2xl"
      />
      <h1 className="text-5xl font-bold tracking-wide text-white sm:text-6xl">Galeon</h1>
      <p className="mt-4 text-xl text-cyan-100/90 sm:text-2xl">
        Private payments for public blockchains
      </p>

      <div className="mt-8 border-t border-white/10 pt-8">
        <p className="mt-4 text-xl leading-relaxed text-cyan-100/80">
          Every transaction on a public blockchain is visible.
          <br />
          Payroll, invoices, treasury operations. All public record.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-5">
            <p className="text-lg font-medium text-red-400">Payroll exposed</p>
            <p className="mt-2 text-base text-white/70">Every salary on-chain</p>
          </div>
          <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-5">
            <p className="text-lg font-medium text-red-400">B2B deals visible</p>
            <p className="mt-2 text-base text-white/70">Suppliers know your margins</p>
          </div>
          <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-5">
            <p className="text-lg font-medium text-red-400">Treasury tracked</p>
            <p className="mt-2 text-base text-white/70">Competitors watch your moves</p>
          </div>
        </div>

        <p className="mt-8 text-2xl font-semibold text-white">
          Real businesses need privacy. They also need compliance.
        </p>
      </div>
    </SlideContainer>
  )
}

// SLIDE 2: Solution - Three Pillars (45 seconds)
function SolutionSlide() {
  return (
    <SlideContainer className="mx-auto max-w-4xl">
      <div className="flex items-center gap-3">
        <Badge className="bg-cyan-500/20 text-cyan-400">The Solution</Badge>
        <Badge className="bg-emerald-500/20 text-emerald-400">EIP-5564 Standard</Badge>
      </div>
      <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
        Confidential transactions. Full compliance.
      </h2>
      <p className="mt-2 text-lg text-cyan-100/70">
        Privacy infrastructure for real-world finance. Built on Ethereum standards.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        <Card className="border-cyan-500/30 bg-slate-800/60">
          <CardContent className="p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-500/20">
              <Anchor className="h-6 w-6 text-cyan-400" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-white">Ports</h3>
            <p className="text-sm font-medium text-cyan-400">Receiver Privacy</p>
            <p className="mt-2 text-base text-cyan-100/80">
              Stealth addresses generate unique payment destinations. One public link, infinite
              private addresses.
            </p>
          </CardContent>
        </Card>

        <Card className="border-cyan-500/30 bg-slate-800/60">
          <CardContent className="p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-500/20">
              <Shield className="h-6 w-6 text-cyan-400" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-white">Privacy Pool</h3>
            <p className="text-sm font-medium text-cyan-400">Sender Privacy</p>
            <p className="mt-2 text-base text-cyan-100/80">
              ZK proofs break on-chain links. Deposit and withdraw without traceable connection.
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30 bg-slate-800/60">
          <CardContent className="p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/20">
              <FileText className="h-6 w-6 text-emerald-400" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-white">Shipwreck</h3>
            <p className="text-sm font-medium text-emerald-400">Compliance Layer</p>
            <p className="mt-2 text-base text-cyan-100/80">
              Tax-ready reports with cryptographic proof. Selective disclosure for auditors, KYC,
              and regulatory requirements.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5">
        <p className="text-center text-lg font-medium text-emerald-400">
          Confidential operations. Regulatory compliance. The missing layer for on-chain finance.
        </p>
      </div>
    </SlideContainer>
  )
}

// SLIDE 3: What's Live
function BuiltSlide() {
  const capabilities = [
    { label: 'Stealth Addresses', detail: 'EIP-5564/6538 standard' },
    { label: 'Privacy Pool', detail: 'ZK proofs via 0xbow' },
    { label: 'Client-Side Proofs', detail: 'Secrets never leave your device' },
    { label: 'Relayer Network', detail: 'Sender address hidden on-chain' },
    { label: 'Compliance Reports', detail: 'Shipwreck tax exports' },
    { label: 'Mainnet Deployed', detail: 'Live on Mantle today' },
  ]

  return (
    <SlideContainer className="mx-auto max-w-4xl">
      <Badge className="bg-emerald-500/20 text-emerald-400">Live</Badge>
      <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">Ready to use.</h2>
      <p className="mt-2 text-lg text-cyan-100/70">
        Full privacy stack deployed on Mantle Mainnet.
      </p>

      {/* Capabilities grid */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {capabilities.map((cap) => (
          <div
            key={cap.label}
            className="flex items-center gap-4 rounded-xl border border-cyan-500/20 bg-slate-800/40 px-6 py-5"
          >
            <Check className="h-6 w-6 flex-shrink-0 text-emerald-400" />
            <div>
              <p className="text-lg font-medium text-white">{cap.label}</p>
              <p className="text-base text-cyan-100/60">{cap.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </SlideContainer>
  )
}

// SLIDE 4: Differentiator (30 seconds)
function DifferentiatorSlide() {
  return (
    <SlideContainer className="mx-auto max-w-4xl">
      <Badge className="bg-purple-500/20 text-purple-400">Why Galeon</Badge>
      <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
        Complete privacy. Full compliance.
        <br />
        <span className="text-cyan-400">No tradeoffs.</span>
      </h2>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {/* Left column - What makes us different */}
        <div className="space-y-4">
          <div className="rounded-xl border border-cyan-500/30 bg-slate-800/50 p-5">
            <div className="flex items-center gap-3">
              <Zap className="h-6 w-6 text-cyan-400" />
              <h3 className="text-lg font-semibold text-white">Both Sides Protected</h3>
            </div>
            <p className="mt-3 text-base text-cyan-100/80">
              Stealth addresses + Privacy Pool = complete transaction privacy. Most protocols only
              protect one side.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-slate-800/50 p-5">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-emerald-400" />
              <h3 className="text-lg font-semibold text-white">Compliance Built-In</h3>
            </div>
            <p className="mt-3 text-base text-cyan-100/80">
              Shipwreck generates tax-ready reports with cryptographic proof. Businesses stay
              private and compliant.
            </p>
          </div>

          <div className="rounded-xl border border-cyan-500/30 bg-slate-800/50 p-5">
            <div className="flex items-center gap-3">
              <Code className="h-6 w-6 text-cyan-400" />
              <h3 className="text-lg font-semibold text-white">Ethereum Standards</h3>
            </div>
            <p className="mt-3 text-base text-cyan-100/80">
              EIP-5564/6538. Ethereum Foundation supported. Not a privacy coin. No regulatory
              stigma.
            </p>
          </div>
        </div>

        {/* Right column - Why it matters */}
        <div className="h-fit rounded-xl border border-white/10 bg-slate-800/30 p-6">
          <h3 className="text-sm font-medium uppercase tracking-wider text-cyan-100/60">
            Why It Matters
          </h3>
          <div className="mt-6 space-y-5">
            <div className="flex items-start gap-3">
              <span className="text-lg text-emerald-400">→</span>
              <p className="text-base text-cyan-100/80">
                <span className="font-medium text-white">Businesses</span> can operate on-chain
                without exposing operations
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg text-emerald-400">→</span>
              <p className="text-base text-cyan-100/80">
                <span className="font-medium text-white">Payroll</span> stays confidential while
                remaining tax-compliant
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg text-emerald-400">→</span>
              <p className="text-base text-cyan-100/80">
                <span className="font-medium text-white">Treasury</span> movements invisible to
                competitors
              </p>
            </div>
            <div className="mt-5 border-t border-white/10 pt-5">
              <p className="text-base font-medium text-emerald-400">
                Privacy that regulators can work with.
              </p>
            </div>
          </div>
        </div>
      </div>
    </SlideContainer>
  )
}

// SLIDE 5: Live Demo (2 minutes)
function DemoSlide() {
  const steps = [
    {
      num: 1,
      action: 'Create Port',
      detail: 'Generate stealth-enabled payment link',
      privacy: 'Receiver hidden',
    },
    {
      num: 2,
      action: 'Receive Payment',
      detail: 'Funds arrive at unique stealth address',
      privacy: 'Destination unlinkable',
    },
    {
      num: 3,
      action: 'Deposit to Pool',
      detail: 'Move funds into privacy pool',
      privacy: 'Source mixed',
    },
    {
      num: 4,
      action: 'Private Send',
      detail: 'ZK proof + relayer',
      privacy: 'Sender hidden',
    },
  ]

  return (
    <SlideContainer className="mx-auto max-w-5xl !p-8 sm:!p-10">
      <div className="flex items-center justify-between">
        <Badge className="animate-pulse bg-green-500/30 text-green-400">Live Demo</Badge>
        <a
          href="https://galeon.finance"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-400 transition-colors hover:bg-cyan-500/30"
        >
          <Play className="h-4 w-4" />
          galeon.finance
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
        Watch: Complete privacy flow in 4 steps
      </h2>

      {/* 2x2 Grid flow diagram */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        {steps.map((step) => (
          <div key={step.num} className="rounded-xl border border-cyan-500/30 bg-slate-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/30 text-base font-bold text-cyan-400">
                {step.num}
              </div>
              <div>
                <p className="text-base font-semibold text-white">{step.action}</p>
                <p className="text-sm text-cyan-100/60">{step.detail}</p>
              </div>
            </div>
            <Badge className="mt-3 bg-emerald-500/20 text-sm text-emerald-400">
              {step.privacy}
            </Badge>
          </div>
        ))}
      </div>

      {/* Key insight */}
      <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
        <p className="text-center text-lg font-medium text-white">
          <span className="text-emerald-400">Result:</span> No on-chain link between sender and
          receiver.
          <br />
          <span className="text-base text-cyan-100/70">
            Blockchain explorers see nothing. Compliance proofs available on demand.
          </span>
        </p>
      </div>
    </SlideContainer>
  )
}

// SLIDE 6: Closing (15 seconds)
function ClosingSlide() {
  return (
    <SlideContainer className="mx-auto max-w-4xl text-center">
      <Image
        src="/galeon-logo.png"
        alt="Galeon"
        width={72}
        height={72}
        className="mx-auto mb-3 drop-shadow-2xl"
      />
      <h1 className="text-4xl font-bold tracking-wide text-white sm:text-5xl">Galeon</h1>
      <p className="mt-2 text-lg text-cyan-100/80">Private payments for public blockchains</p>

      {/* One-liner value prop */}
      <div className="mt-8 rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-6">
        <p className="text-2xl font-semibold text-white">
          Confidential when you need it. Compliant when you need it.
        </p>
        <p className="mt-2 text-2xl font-bold text-cyan-400">
          The privacy layer for real-world finance.
        </p>
      </div>

      {/* CTA */}
      <a
        href="https://galeon.finance"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-8 py-4 text-xl font-bold text-slate-950 transition-colors hover:bg-cyan-400"
      >
        Try it live: galeon.finance
        <ExternalLink className="h-5 w-5" />
      </a>

      {/* Footer */}
      <p className="mt-8 text-base text-cyan-100/50">Mantle Global Hackathon 2025</p>
    </SlideContainer>
  )
}
