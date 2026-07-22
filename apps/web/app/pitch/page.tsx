'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { m, AnimatePresence } from 'motion/react'
import {
  ChevronLeft,
  ChevronRight,
  Check,
  ArrowRight,
  ExternalLink,
  Anchor,
  Shield,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Glassmorphic slide container for better readability
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

// Slide data synced with landing/about/roadmap content
const slides = [
  { id: 'title', component: TitleSlide },
  { id: 'problem', component: ProblemSlide },
  { id: 'comparison', component: ComparisonSlide },
  { id: 'solution', component: SolutionSlide },
  { id: 'why-both', component: WhyBothSlide },
  { id: 'trust', component: TrustSlide },
  { id: 'live', component: LiveSlide },
  { id: 'market', component: MarketSlide },
  { id: 'business', component: BusinessSlide },
  { id: 'roadmap', component: RoadmapSlide },
  { id: 'closing', component: ClosingSlide },
]

export default function PitchPage() {
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
      {/* Uses global DeepSeaGradient from layout.tsx */}

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
        <div className="flex gap-1.5">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide
                  ? 'w-6 bg-cyan-400'
                  : 'w-2 bg-cyan-100/30 hover:bg-cyan-100/50'
              }`}
              aria-label={`Go to slide ${index + 1}`}
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
// SLIDES
// =============================================================================

function TitleSlide() {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <Image
        src="/galeon-logo.png"
        alt="Galeon"
        width={120}
        height={120}
        className="mb-6 drop-shadow-2xl"
      />
      <h1 className="text-6xl font-bold tracking-wide text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.3)] sm:text-7xl lg:text-8xl">
        Galeon
      </h1>
      <div className="mt-8 rounded-2xl border border-white/15 bg-slate-900/40 px-6 py-4 shadow-lg shadow-black/10 backdrop-blur-md">
        <p className="text-2xl text-cyan-100/80 sm:text-3xl">
          Private payments for the public blockchain
        </p>
        <p className="mt-4 text-sm text-cyan-100/50">Mantle Global Hackathon 2025</p>
      </div>
    </div>
  )
}

function ProblemSlide() {
  return (
    <SlideContainer className="mx-auto max-w-3xl">
      <Badge className="bg-red-500/20 text-red-400">The Problem</Badge>
      <h2 className="mt-4 text-4xl font-bold text-white sm:text-5xl">
        Every on-chain payment is <span className="text-red-400">public</span>
      </h2>
      <p className="mt-8 text-xl leading-relaxed text-cyan-100/70">
        Your salary, your donations, your business deals. All of it visible to anyone who looks.
      </p>
      <div className="mt-8 rounded-xl border border-red-500/20 bg-red-950/30 p-6">
        <p className="text-lg font-medium text-red-400">
          Your entire financial history is an open book.
        </p>
      </div>
    </SlideContainer>
  )
}

function ComparisonSlide() {
  return (
    <SlideContainer className="mx-auto max-w-4xl">
      <Badge className="bg-amber-500/20 text-amber-400">Protection Boundaries</Badge>
      <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
        Different layers solve different privacy problems
      </h2>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="border-t-2 border-cyan-400 pt-5">
          <h3 className="text-xl font-semibold text-white">Receiver linkability</h3>
          <p className="mt-3 text-cyan-100/80">
            Ports generate a fresh stealth address for each payment. Timing, amounts, and partner
            records can still create correlations.
          </p>
        </div>
        <div className="border-t-2 border-emerald-400 pt-5">
          <h3 className="text-xl font-semibold text-white">Forward transaction graph</h3>
          <p className="mt-3 text-cyan-100/80">
            The Privacy Pool breaks the public deposit-to-withdrawal link. Protection depends on the
            approved deposit set and user behaviour.
          </p>
        </div>
      </div>

      <div className="mt-10 border-t border-white/10 pt-6">
        <p className="text-lg font-medium text-amber-300">
          The ASP controls private-withdrawal eligibility. The current service auto-approves every
          label; real screening is planned work.
        </p>
      </div>
    </SlideContainer>
  )
}

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
            <h3 className="mt-4 text-lg font-semibold text-white">Ports</h3>
            <p className="mt-2 text-sm text-cyan-100/80">
              Protect receivers with unique stealth addresses for every payment.
            </p>
          </CardContent>
        </Card>

        <Card className="border-cyan-500/30 bg-slate-800/60">
          <CardContent className="p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-500/20">
              <Shield className="h-6 w-6 text-cyan-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">Privacy Pool</h3>
            <p className="mt-2 text-sm text-cyan-100/80">
              Protect senders by breaking the on-chain link with ZK proofs.
            </p>
          </CardContent>
        </Card>

        <Card className="border-cyan-500/30 bg-slate-800/60">
          <CardContent className="p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-500/20">
              <FileText className="h-6 w-6 text-cyan-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">Shipwreck</h3>
            <p className="mt-2 text-sm text-cyan-100/80">
              Export payment records for reconciliation. Humanitarian templates remain planned work.
            </p>
          </CardContent>
        </Card>
      </div>
    </SlideContainer>
  )
}

function WhyBothSlide() {
  return (
    <SlideContainer className="mx-auto max-w-3xl">
      <Badge className="bg-purple-500/20 text-purple-400">Two Privacy Layers</Badge>
      <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
        Receiving privacy and withdrawal privacy are different problems
      </h2>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-white/20 bg-slate-800/60 p-6">
          <h3 className="text-lg font-semibold text-cyan-400">Stealth Addresses</h3>
          <p className="mt-3 text-cyan-100/80">
            Reduce public links between a Port and the fresh addresses used for individual payments.
          </p>
          <p className="mt-4 text-sm text-amber-400">Timing and partner records still matter</p>
        </div>

        <div className="rounded-xl border border-white/20 bg-slate-800/60 p-6">
          <h3 className="text-lg font-semibold text-cyan-400">Privacy Pool</h3>
          <p className="mt-3 text-cyan-100/80">
            Break the public link between an approved pool deposit and a later withdrawal.
          </p>
          <p className="mt-4 text-sm text-emerald-400">Strength depends on the anonymity set</p>
        </div>
      </div>

      <p className="mt-8 text-center text-xl font-medium text-cyan-400">
        Together they reduce linkability; neither guarantees anonymity.
      </p>
    </SlideContainer>
  )
}

function TrustSlide() {
  return (
    <SlideContainer className="mx-auto max-w-3xl">
      <Badge className="bg-emerald-500/20 text-emerald-400">Trust Model</Badge>
      <h2 className="mt-4 text-4xl font-bold text-white sm:text-5xl">
        Cryptography reduces trust; operations still matter
      </h2>

      <div className="mt-10 space-y-6 text-lg text-cyan-100/80">
        <p>
          ZK proofs are generated client-side and verified on-chain. The chain can validate a
          withdrawal without learning which approved deposit funded it.
        </p>
        <p>
          The relayer broadcasts private withdrawals and remains an availability and metadata
          dependency. The ASP determines which deposit labels may use private withdrawal.
        </p>
      </div>

      <div className="mt-10 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-6">
        <p className="text-xl font-medium text-emerald-400">
          The current relayer and auto-approving ASP are disclosed operational dependencies.
        </p>
      </div>
    </SlideContainer>
  )
}

function LiveSlide() {
  const features = [
    'Stealth Payments (EIP-5564/6538)',
    'Privacy Pool with ZK Proofs',
    'Merge Deposits (single proof)',
    'Client-Side Proof Generation',
    'Verified Balance Gating',
    'Shareable Payment Receipts',
    'Shipwreck Reports (PDF export)',
    'Private Withdrawals via Relayer',
  ]

  return (
    <SlideContainer className="mx-auto max-w-4xl">
      <Badge className="bg-emerald-500/20 text-emerald-400">Native Asset Live on Mantle</Badge>
      <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">Current Features</h2>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {features.map((feature) => (
          <div
            key={feature}
            className="flex items-center gap-3 rounded-lg border border-white/20 bg-slate-800/60 px-4 py-3"
          >
            <Check className="h-5 w-5 flex-shrink-0 text-emerald-400" />
            <span className="text-cyan-100/90">{feature}</span>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center font-medium text-cyan-100/80">
        537 automated tests · Mantle mainnet deployment · public repository
      </p>
    </SlideContainer>
  )
}

function MarketSlide() {
  const segments = [
    {
      title: 'Programs & NGOs',
      description: 'Reduce public linkability where public-chain settlement is justified.',
    },
    {
      title: 'Businesses & Treasuries',
      description: 'Limit public exposure of vendor, payroll, and treasury activity.',
    },
    {
      title: 'Developers',
      description: 'Integrate stealth payments and proof-authorized withdrawals.',
    },
    {
      title: 'Program Operators',
      description: 'Reconcile public settlement while controlling private-withdrawal policy.',
    },
  ]

  return (
    <SlideContainer className="mx-auto max-w-4xl">
      <Badge className="bg-blue-500/20 text-blue-400">Target Market</Badge>
      <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">Built for real-world use</h2>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {segments.map((segment) => (
          <Card key={segment.title} className="border-white/20 bg-slate-800/60">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-cyan-400">{segment.title}</h3>
              <p className="mt-2 text-cyan-100/80">{segment.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </SlideContainer>
  )
}

function BusinessSlide() {
  const streams = [
    { name: 'Hosting & Support', model: 'Operational support and service levels' },
    { name: 'ASP Operations', model: 'Policy-aligned attestation and screening service' },
    { name: 'Reporting & Integration', model: 'Program reporting and systems integration' },
  ]

  return (
    <SlideContainer className="mx-auto max-w-3xl">
      <Badge className="bg-green-500/20 text-green-400">Business Model</Badge>
      <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
        Partner-side sustainability hypotheses
      </h2>

      <div className="mt-8 overflow-hidden rounded-xl border border-white/20 bg-slate-800/60">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 bg-cyan-500/20">
              <th className="px-6 py-4 text-left text-sm font-semibold text-white">Channel</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white">Model</th>
            </tr>
          </thead>
          <tbody>
            {streams.map((stream, index) => (
              <tr
                key={stream.name}
                className={index !== streams.length - 1 ? 'border-b border-white/10' : ''}
              >
                <td className="px-6 py-4 font-medium text-cyan-400">{stream.name}</td>
                <td className="px-6 py-4 text-cyan-100/80">{stream.model}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-center text-sm text-cyan-100/70">
        No current revenue is claimed, and no beneficiary withdrawal fee is assumed.
      </p>
    </SlideContainer>
  )
}

function RoadmapSlide() {
  const items = [
    {
      status: 'done',
      title: 'Native-asset protocol live',
      desc: 'Stealth payments and private withdrawal on Mantle',
    },
    {
      status: 'soon',
      title: 'ERC-20 pool deployment',
      desc: 'Deploy and validate the stablecoin path',
    },
    {
      status: 'soon',
      title: 'External delta-audit',
      desc: 'Review Galeon-specific changes and remediate findings',
    },
    {
      status: 'future',
      title: 'Real ASP process',
      desc: 'Partner-agreed screening, review, appeals, and escalation',
    },
    {
      status: 'future',
      title: 'Partner-staff sandbox',
      desc: 'Test the workflow before beneficiaries',
    },
    {
      status: 'future',
      title: 'Controlled pilot',
      desc: 'Validate usability, support, and privacy conditions',
    },
  ]

  return (
    <SlideContainer className="mx-auto max-w-3xl">
      <Badge className="bg-indigo-500/20 text-indigo-400">Roadmap</Badge>
      <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">What&apos;s Next</h2>

      <div className="mt-8 space-y-4">
        {items.map((item) => (
          <div key={item.title} className="flex items-start gap-4 rounded-lg bg-slate-800/40 p-4">
            <div
              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                item.status === 'done'
                  ? 'bg-emerald-500/30 text-emerald-400'
                  : item.status === 'soon'
                    ? 'bg-cyan-500/30 text-cyan-400'
                    : 'bg-slate-500/30 text-slate-400'
              }`}
            >
              {item.status === 'done' ? '✓' : item.status === 'soon' ? '→' : '○'}
            </div>
            <div>
              <h3 className="font-semibold text-white">{item.title}</h3>
              <p className="mt-1 text-sm text-cyan-100/80">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </SlideContainer>
  )
}

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
        Reduce linkability when receiving. Break the deposit-to-withdrawal link.
        <br />
        Apply policy controls to private withdrawal.
      </p>

      <p className="mt-6 text-2xl font-medium text-cyan-400">
        Open-source privacy infrastructure for public-chain payments.
      </p>

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

      <div className="mt-8">
        <Button size="lg" asChild>
          <Link href="/setup">
            Try Galeon
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </div>
    </SlideContainer>
  )
}
