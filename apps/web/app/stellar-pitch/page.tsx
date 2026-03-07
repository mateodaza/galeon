'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { m, AnimatePresence } from 'motion/react'
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Anchor,
  Shield,
  FileText,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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

// 1-minute Stellar pitch: Hook → Solution → Traction → Why Stellar → Team → Close
const slides = [
  { id: 'hook', component: HookSlide },
  { id: 'solution', component: SolutionSlide },
  { id: 'traction', component: TractionSlide },
  { id: 'stellar', component: StellarSlide },
  { id: 'team', component: TeamSlide },
  { id: 'closing', component: ClosingSlide },
]

export default function StellarPitchPage() {
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
            SCF Build Award
          </Badge>
          <Button variant="ghost" size="sm" asChild className="text-cyan-100/70 hover:text-white">
            <Link href="/">Exit</Link>
          </Button>
        </div>
      </header>

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
// SLIDES — 1-minute Stellar pitch
// =============================================================================

// SLIDE 1: Hook + Problem (10 seconds)
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
      <p className="mt-4 text-xl text-cyan-100/90 sm:text-2xl">Private payments on Stellar</p>

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

// SLIDE 2: Solution — Three Pillars (15 seconds)
function SolutionSlide() {
  return (
    <SlideContainer className="mx-auto max-w-4xl">
      <div className="flex items-center gap-3">
        <Badge className="bg-cyan-500/20 text-cyan-400">The Solution</Badge>
        <Badge className="bg-emerald-500/20 text-emerald-400">EIP-5564/6538</Badge>
        <Badge className="bg-purple-500/20 text-purple-400">Privacy Pools</Badge>
      </div>
      <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
        Confidential transactions.
        <br />
        Full compliance.
      </h2>
      <p className="mt-2 text-lg text-cyan-100/70">
        Privacy infrastructure for real-world finance. Built on Ethereum standards, now bringing to
        Stellar.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card className="border-cyan-500/30 bg-slate-800/60">
          <CardContent className="p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/20">
              <Anchor className="h-5 w-5 text-cyan-400" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-white">Ports</h3>
            <p className="text-sm font-medium text-cyan-400">Receiver Privacy</p>
            <ul className="mt-2 space-y-1 text-base text-cyan-100/80">
              <li>• Stealth addresses for unique destinations</li>
              <li>• One public link → infinite private addresses</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-cyan-500/30 bg-slate-800/60">
          <CardContent className="p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/20">
              <Shield className="h-5 w-5 text-cyan-400" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-white">Privacy Pool</h3>
            <p className="text-sm font-medium text-cyan-400">Sender Privacy</p>
            <ul className="mt-2 space-y-1 text-base text-cyan-100/80">
              <li>• ZK proofs break on-chain links</li>
              <li>• Only verified stealth funds can enter</li>
              <li>• Unlimited deposits → single proof withdrawal</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30 bg-slate-800/60">
          <CardContent className="p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
              <FileText className="h-5 w-5 text-emerald-400" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-white">Shipwreck</h3>
            <p className="text-sm font-medium text-emerald-400">Compliance Layer</p>
            <ul className="mt-2 space-y-1 text-base text-cyan-100/80">
              <li>• Tax-ready reports with receipt proof</li>
              <li>• Audit trail for regulators</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
        <p className="text-sm font-medium text-emerald-400">Allowlist compliance model</p>
        <p className="mt-1 text-xs text-cyan-100/60">
          Users prove they are vetted before withdrawing. Proactive compliance regulators can trust.
        </p>
      </div>
    </SlideContainer>
  )
}

// SLIDE 3: Traction — What's already built
function TractionSlide() {
  const capabilities = [
    { label: 'Stealth Addresses', detail: 'EIP-5564/6538 standard' },
    { label: 'Privacy Pool', detail: 'Unlinkable sends via ZK' },
    { label: 'Client-Side Proofs', detail: 'Secrets never leave your device' },
    { label: 'Relayer Network', detail: 'Sender address hidden on-chain' },
    { label: 'Compliance Reports', detail: 'Shipwreck tax exports' },
    { label: 'Mainnet Deployed', detail: 'Live on Mantle mainnet' },
  ]

  return (
    <SlideContainer className="mx-auto max-w-4xl">
      <Badge className="bg-emerald-500/20 text-emerald-400">Shipped</Badge>
      <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
        Already built and deployed.
      </h2>
      <p className="mt-2 text-lg text-cyan-100/70">
        Full privacy stack live on EVM. Now bringing it to Stellar.
      </p>

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

// SLIDE 4: Why Stellar — Protocol 25 (20 seconds)
function StellarSlide() {
  return (
    <SlideContainer className="mx-auto max-w-4xl">
      <Badge className="bg-purple-500/20 text-purple-400">Why Stellar</Badge>
      <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
        Protocol 25 unlocks on-chain privacy
      </h2>
      <p className="mt-2 text-lg text-cyan-100/70">
        Soroban now has everything we need natively. Mainnet since January 2026.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-cyan-500/30 bg-slate-800/50 p-5">
          <h3 className="text-lg font-semibold text-white">CAP-0074: BN254</h3>
          <p className="mt-2 text-sm text-cyan-100/70">
            Native elliptic curve host functions, same primitives as Ethereum&apos;s EIP-196/197.
            Enables Groth16 ZK proof verification on-chain.
          </p>
        </div>
        <div className="rounded-xl border border-cyan-500/30 bg-slate-800/50 p-5">
          <h3 className="text-lg font-semibold text-white">CAP-0075: Poseidon</h3>
          <p className="mt-2 text-sm text-cyan-100/70">
            ZK-friendly permutation primitives as host functions. Powers efficient Merkle tree
            hashing inside circuits.
          </p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-slate-800/50 p-5">
          <h3 className="text-lg font-semibold text-white">Groth16 fits the budget</h3>
          <p className="mt-2 text-sm text-cyan-100/70">
            Verification uses ~40M of 100M instruction budget (40%). 60% headroom left for contract
            logic.
          </p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-slate-800/50 p-5">
          <h3 className="text-lg font-semibold text-white">Prior art exists</h3>
          <p className="mt-2 text-sm text-cyan-100/70">
            Nethermind&apos;s stellar-private-payments + SDF&apos;s Privacy Pools prototype. We
            build on proven foundations.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-purple-500/30 bg-purple-950/20 p-4">
        <p className="text-center text-base font-medium text-purple-300">
          Fast finality + low fees + native ZK primitives = viable privacy at scale.
        </p>
      </div>
    </SlideContainer>
  )
}

// SLIDE 5: Team — Founders
function TeamSlide() {
  const team = [
    { name: 'Mateo Daza', role: 'Full Stack Engineer', image: '/mateo.jpeg' },
    { name: 'Carlos Quintero', role: 'Backend & Cryptography Engineer', image: '/carlos.jpeg' },
    { name: 'Fabio Anaya', role: 'Ecosystem Integration Lead', image: '/fabio.jpeg' },
  ]

  return (
    <SlideContainer className="mx-auto max-w-5xl">
      <div className="text-center">
        <Badge className="bg-cyan-500/20 text-cyan-400">Founders</Badge>
        <h2 className="mt-4 text-4xl font-bold text-white sm:text-5xl">Team</h2>
        <p className="mt-2 text-lg text-cyan-100/60">Engineers and Founders building on Stellar</p>
      </div>

      <div className="mt-10 grid grid-cols-3 gap-6">
        {team.map((member) => (
          <div
            key={member.name}
            className="flex flex-col items-center gap-5 rounded-2xl border border-white/10 bg-slate-800/40 px-6 py-8"
          >
            <div className="border-3 h-48 w-48 overflow-hidden rounded-full border-cyan-500/50 shadow-lg shadow-cyan-500/10">
              <Image
                src={member.image}
                alt={member.name}
                width={192}
                height={192}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{member.name}</p>
              <p className="mt-1 text-sm text-cyan-400">{member.role}</p>
            </div>
          </div>
        ))}
      </div>
    </SlideContainer>
  )
}

// SLIDE 6: Closing (10 seconds)
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
      <p className="mt-2 text-lg text-cyan-100/80">The privacy layer for Stellar</p>

      <div className="mt-8 rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-6">
        <p className="text-2xl font-semibold text-white">
          Confidential when you need it. Compliant when you need it.
        </p>
        <p className="mt-2 text-xl font-bold text-cyan-400">
          The privacy layer for real-world finance.
        </p>
      </div>

      <a
        href="https://galeon.finance"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-8 py-4 text-xl font-bold text-slate-950 transition-colors hover:bg-cyan-400"
      >
        galeon.finance
        <ExternalLink className="h-5 w-5" />
      </a>

      <p className="mt-8 text-base text-cyan-100/50">SCF Build Award 2026</p>
    </SlideContainer>
  )
}
