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
      className={`rounded-2xl border border-white/10 bg-slate-950/70 p-8 shadow-2xl backdrop-blur-xl sm:p-12 ${className}`}
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
      <div className="relative flex flex-1 items-center justify-center px-6 pb-24 pt-16">
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
    <SlideContainer className="mx-auto max-w-3xl text-center">
      <Image
        src="/galeon-logo.png"
        alt="Galeon"
        width={140}
        height={140}
        className="mx-auto mb-6 drop-shadow-2xl"
      />
      <h1 className="text-5xl font-bold tracking-wide text-white sm:text-6xl lg:text-7xl">
        Galeon
      </h1>
      <p className="mt-6 text-2xl text-cyan-100/90 sm:text-3xl">
        Private payments for the public blockchain
      </p>

      <div className="mt-10 border-t border-white/10 pt-8">
        <p className="text-xl leading-relaxed text-cyan-100/80">
          Every on-chain payment is <span className="font-semibold text-red-400">public</span>. Your
          salary, your business deals — anyone can trace it all.
        </p>
        <p className="mt-4 text-lg font-medium text-white">
          Your financial history is an open book.
        </p>
      </div>
    </SlideContainer>
  )
}

// SLIDE 2: Solution - Three Pillars (45 seconds)
function SolutionSlide() {
  return (
    <SlideContainer className="mx-auto max-w-4xl">
      <Badge className="bg-cyan-500/20 text-cyan-400">The Solution</Badge>
      <h2 className="mt-4 text-4xl font-bold text-white sm:text-5xl">
        Your treasure, hidden in plain sight.
      </h2>

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        <Card className="border-cyan-500/30 bg-slate-800/60">
          <CardContent className="p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-500/20">
              <Anchor className="h-6 w-6 text-cyan-400" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-white">Ports</h3>
            <p className="mt-2 text-base text-cyan-100/80">
              Stealth addresses hide <strong className="text-cyan-300">receivers</strong>. Every
              payment goes to a unique address only you can access.
            </p>
          </CardContent>
        </Card>

        <Card className="border-cyan-500/30 bg-slate-800/60">
          <CardContent className="p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-500/20">
              <Shield className="h-6 w-6 text-cyan-400" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-white">Privacy Pool</h3>
            <p className="mt-2 text-base text-cyan-100/80">
              ZK proofs hide <strong className="text-cyan-300">senders</strong>. Deposit to the
              pool, withdraw anywhere — the on-chain link is broken.
            </p>
          </CardContent>
        </Card>

        <Card className="border-cyan-500/30 bg-slate-800/60">
          <CardContent className="p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-500/20">
              <FileText className="h-6 w-6 text-cyan-400" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-white">Shipwreck</h3>
            <p className="mt-2 text-base text-cyan-100/80">
              Compliance proofs when you need them. Taxes, audits —{' '}
              <strong className="text-cyan-300">reveal only what you choose</strong>.
            </p>
          </CardContent>
        </Card>
      </div>

      <p className="mt-8 text-center text-xl font-medium text-cyan-400">
        Privacy when you receive. Privacy when you send. Compliance when you need it.
      </p>
    </SlideContainer>
  )
}

// SLIDE 3: What We Built (30 seconds)
function BuiltSlide() {
  const features = [
    'Stealth Payments (EIP-5564/6538)',
    'Privacy Pool with ZK Proofs',
    'Client-Side Proof Generation',
    'Private Withdrawals via Relayer',
    'Shareable Payment Receipts',
    'Shipwreck Compliance Reports',
  ]

  return (
    <SlideContainer className="mx-auto max-w-4xl">
      <Badge className="bg-emerald-500/20 text-emerald-400">Live on Mantle</Badge>
      <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">Live product features</h2>

      {/* Features grid */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {features.map((feature) => (
          <div
            key={feature}
            className="flex items-center gap-4 rounded-lg border border-white/10 bg-slate-800/40 px-5 py-4"
          >
            <Check className="h-6 w-6 flex-shrink-0 text-emerald-400" />
            <span className="text-lg text-cyan-100/90">{feature}</span>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-cyan-100/60">
        Built on the proven 0xbow Privacy Pools protocol, extended for real-world compliance.
      </p>
    </SlideContainer>
  )
}

// SLIDE 4: Differentiator (30 seconds)
function DifferentiatorSlide() {
  return (
    <SlideContainer className="mx-auto max-w-3xl">
      <Badge className="bg-purple-500/20 text-purple-400">Why Galeon?</Badge>
      <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
        Full privacy + compliance in one protocol
      </h2>

      <div className="mt-8 grid gap-4">
        <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-slate-800/40 p-5">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-cyan-500/20">
            <Zap className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Both Sides Protected</h3>
            <p className="mt-1 text-base text-cyan-100/80">
              Stealth addresses hide receivers. Privacy Pool hides senders. You need both for
              complete privacy, most protocols only do one.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-slate-800/40 p-5">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-cyan-500/20">
            <FileText className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Compliance-Ready</h3>
            <p className="mt-1 text-base text-cyan-100/80">
              Shipwreck generates cryptographic proofs for audits. Keeping privacy and compliance
              aligned.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-slate-800/40 p-5">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-cyan-500/20">
            <Code className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Permissionless</h3>
            <p className="mt-1 text-base text-cyan-100/80">
              ZK proofs generated client-side in your browser. Verified on-chain by smart contracts.
              Your secrets never leave your device.
            </p>
          </div>
        </div>
      </div>
    </SlideContainer>
  )
}

// SLIDE 5: Live Demo (2 minutes)
function DemoSlide() {
  const steps = [
    { num: 1, action: 'Create a Port', detail: 'Reusable payment link with stealth addresses' },
    { num: 2, action: 'Receive Payment', detail: 'Funds go to unique stealth address' },
    { num: 3, action: 'Collect to Pool', detail: 'Deposit into the shared privacy pool' },
    { num: 4, action: 'Private Send', detail: 'ZK proof breaks the on-chain link' },
  ]

  return (
    <SlideContainer className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <Badge className="bg-green-500/20 text-green-400">Live Demo</Badge>
        <a
          href="https://galeon.finance"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300"
        >
          <Play className="h-4 w-4" />
          galeon.finance
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">Steps</h2>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {steps.map((step) => (
          <div
            key={step.num}
            className="flex items-start gap-4 rounded-xl border border-cyan-500/30 bg-slate-800/50 p-5"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/30 text-lg font-bold text-cyan-400">
              {step.num}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{step.action}</h3>
              <p className="mt-1 text-base text-cyan-100/70">{step.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-amber-500/30 bg-amber-950/30 p-4">
        <p className="text-center text-amber-400">
          No direct on-chain link between deposit and withdrawal.
        </p>
      </div>

      <p className="mt-6 text-center text-lg text-cyan-100/80">
        Ports protect receivers. Privacy Pool protects senders.
        <br />
        <span className="font-medium text-white">
          You need both for complete financial privacy.
        </span>
      </p>
    </SlideContainer>
  )
}

// SLIDE 6: Closing (15 seconds)
function ClosingSlide() {
  return (
    <SlideContainer className="mx-auto max-w-2xl text-center">
      <Image
        src="/galeon-logo.png"
        alt="Galeon"
        width={80}
        height={80}
        className="mx-auto mb-4 drop-shadow-2xl"
      />
      <h1 className="text-5xl font-bold tracking-wide text-white sm:text-6xl">Galeon</h1>

      <p className="mt-8 text-xl text-cyan-100/90">
        Privacy when you receive. Privacy when you send.
        <br />
        Compliance when you need it.
      </p>

      <p className="mt-6 text-3xl font-bold text-cyan-400">Your money, your business.</p>

      <a
        href="https://galeon.finance"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 inline-flex items-center gap-2 text-2xl font-bold text-white hover:text-cyan-400"
      >
        galeon.finance
        <ExternalLink className="h-5 w-5" />
      </a>

      <div className="mt-8 flex items-center justify-center gap-2 text-cyan-100/70">
        <span className="text-xl">🇨🇴</span>
        <span>Built with Colombian pride for Mantle Global Hackathon 2025</span>
      </div>
    </SlideContainer>
  )
}
