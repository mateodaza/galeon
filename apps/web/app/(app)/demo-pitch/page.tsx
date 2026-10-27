'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, m } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const slides = [
  { id: 'galeon', component: TitleSlide },
  { id: 'team', component: TeamSlide },
  { id: 'privacy', component: PrivacySlide },
  { id: 'demo', component: DemoSlide },
  { id: 'repository', component: RepositorySlide },
  { id: 'boundary', component: BoundarySlide },
  { id: 'anchor', component: AnchorSlide },
  { id: 'funded-path', component: FundedPathSlide },
]

function Glass({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-white/15 bg-slate-950/70 shadow-2xl shadow-black/20 backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  )
}

function Eyebrow({ children, planned = false }: { children: React.ReactNode; planned?: boolean }) {
  return (
    <p
      className={`text-xs font-semibold uppercase ${planned ? 'text-amber-300' : 'text-cyan-300'}`}
    >
      {children}
    </p>
  )
}

export default function DemoPitchPage() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [direction, setDirection] = useState(0)

  const goToSlide = useCallback(
    (index: number) => {
      if (index < 0 || index >= slides.length || index === currentSlide) return
      setDirection(index > currentSlide ? 1 : -1)
      setCurrentSlide(index)
    },
    [currentSlide]
  )

  const nextSlide = useCallback(() => {
    if (currentSlide < slides.length - 1) goToSlide(currentSlide + 1)
  }, [currentSlide, goToSlide])

  const prevSlide = useCallback(() => {
    if (currentSlide > 0) goToSlide(currentSlide - 1)
  }, [currentSlide, goToSlide])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === ' ') {
        event.preventDefault()
        nextSlide()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        prevSlide()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nextSlide, prevSlide])

  const CurrentSlide = slides[currentSlide].component

  return (
    <main className="relative h-screen overflow-y-auto text-white">
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between bg-slate-950/80 px-5 backdrop-blur-md sm:px-8">
        <Link href="/" className="flex items-center gap-3 text-lg font-semibold">
          <Image src="/galeon-logo.png" alt="Galeon" width={30} height={30} />
          <span>Galeon</span>
        </Link>
        <div className="flex items-center gap-4 text-xs text-cyan-100/70">
          <span className="hidden font-semibold text-cyan-200 sm:inline">
            UNICEF TECHNICAL DEMO
          </span>
          <span>
            {currentSlide + 1} / {slides.length}
          </span>
        </div>
      </header>

      <div className="flex min-h-screen items-center justify-center px-5 pb-24 pt-24 sm:px-8">
        <AnimatePresence mode="wait" custom={direction}>
          <m.div
            key={currentSlide}
            custom={direction}
            initial={{ opacity: 0, x: direction * 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -80 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            className="w-full max-w-6xl"
          >
            <CurrentSlide />
          </m.div>
        </AnimatePresence>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-between px-5 sm:px-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className="text-cyan-100/70 hover:text-white disabled:opacity-20"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>

        <div className="flex items-center gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              onClick={() => goToSlide(index)}
              className={`h-2 transition-all ${
                currentSlide === index
                  ? 'w-7 rounded-full bg-cyan-400'
                  : 'w-2 rounded-full bg-cyan-100/30 hover:bg-cyan-100/50'
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
          className="text-cyan-100/70 hover:text-white disabled:opacity-20"
          aria-label="Next slide"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </nav>
    </main>
  )
}

function TitleSlide() {
  return (
    <div className="flex flex-col items-center text-center">
      <Image src="/galeon-logo.png" alt="Galeon" width={118} height={118} priority />
      <h1 className="mt-3 text-6xl font-bold sm:text-7xl">Galeon</h1>
      <p className="mt-4 text-2xl text-cyan-50/90 sm:text-3xl">
        Private payments for public blockchains.
      </p>
      <Glass className="mt-10 w-full max-w-3xl px-6 py-6">
        <p className="text-xl font-semibold sm:text-2xl">
          Public accountability without public beneficiary histories.
        </p>
      </Glass>
      <p className="mt-8 text-sm text-cyan-100/70">
        Open source · Live on Mantle · Built by Mateo Daza and Carlos Quintero
      </p>
    </div>
  )
}

function TeamSlide() {
  return (
    <div>
      <h2 className="max-w-5xl text-4xl font-bold sm:text-5xl">
        Two founders built Galeon. Five people own the funded work.
      </h2>
      <Glass className="mt-8 grid gap-8 p-7 sm:grid-cols-2 sm:p-10">
        <section className="sm:border-r sm:border-white/15 sm:pr-10">
          <Eyebrow>Built by</Eyebrow>
          <Person name="Mateo Daza" role="Product + frontend" />
          <Person name="Carlos Quintero" role="Backend + protocol · Lead developer" />
          <p className="mt-8 border-t border-white/15 pt-6 text-base text-cyan-50/80">
            Cartagena On Chain is the applicant and proposed funded-period operator.
          </p>
        </section>
        <section>
          <Eyebrow>Funded delivery</Eyebrow>
          <Person name="Fabio Anaya" role="Growth + partnerships" />
          <Person name="Juan David Correa" role="Operations" />
          <Person name="Juan José Sanfeliú" role="Marketing + community" />
        </section>
      </Glass>
    </div>
  )
}

function Person({ name, role }: { name: string; role: string }) {
  return (
    <div className="mt-7">
      <h3 className="text-2xl font-semibold">{name}</h3>
      <p className="mt-1 text-lg text-cyan-100/65">{role}</p>
    </div>
  )
}

function PrivacySlide() {
  const layers = [
    {
      number: '01',
      name: 'Ports',
      body: 'A fresh stealth address for every payment.',
      state: 'LIVE',
    },
    {
      number: '02',
      name: 'Privacy Pool',
      body: 'A ZK proof breaks the public deposit-to-withdrawal link.',
      state: 'LIVE · NATIVE MNT',
    },
    {
      number: '03',
      name: 'ASP',
      body: 'A policy gate decides which deposits may withdraw privately.',
      state: 'AUTO-APPROVES TODAY',
      planned: true,
    },
  ]

  return (
    <div>
      <h2 className="text-4xl font-bold sm:text-5xl">Privacy is not one switch.</h2>
      <p className="mt-3 text-xl text-cyan-50/80">
        Galeon separates receiver privacy, transaction privacy, and policy.
      </p>
      <Glass className="mt-8 grid gap-8 p-7 sm:grid-cols-3 sm:p-10">
        {layers.map((layer, index) => (
          <section
            key={layer.number}
            className={index > 0 ? 'sm:border-l sm:border-white/15 sm:pl-8' : ''}
          >
            <p className="text-lg font-semibold text-cyan-300">{layer.number}</p>
            <h3 className="mt-7 text-3xl font-semibold">{layer.name}</h3>
            <p className="mt-6 min-h-20 text-lg text-cyan-50/85">{layer.body}</p>
            <p
              className={`mt-6 text-xs font-semibold ${layer.planned ? 'text-amber-300' : 'text-emerald-300'}`}
            >
              {layer.state}
            </p>
          </section>
        ))}
      </Glass>
      <div className="mt-8">
        <Eyebrow>What UNICEF adds</Eyebrow>
        <p className="mt-3 text-xl font-semibold">
          Safeguarding gates, realistic usage patterns, and a tested incident response.
        </p>
      </div>
    </div>
  )
}

function DemoSlide() {
  return (
    <div>
      <Eyebrow>Live product</Eyebrow>
      <h2 className="mt-5 text-4xl font-bold sm:text-6xl">
        One private withdrawal, verified live.
      </h2>
      <Glass className="mt-12 max-w-4xl p-8 sm:p-12">
        <p className="text-xl text-cyan-100/60">Pre-staged deposit</p>
        <p className="mt-7 text-2xl font-semibold sm:text-3xl">Client-generated ZK proof</p>
        <p className="mt-7 text-2xl font-semibold text-cyan-200 sm:text-3xl">
          Mantlescan shows the relayer, not the depositor
        </p>
      </Glass>
      <p className="mt-10 text-lg text-cyan-50/85 sm:text-xl">
        The recipient and amount remain public. We demonstrate unlinkability, not invisibility.
      </p>
    </div>
  )
}

function RepositorySlide() {
  return (
    <div>
      <h2 className="text-4xl font-bold sm:text-5xl">
        The live product and public repository match.
      </h2>
      <Glass className="mt-9 p-7 sm:p-10">
        <div className="grid gap-8 sm:grid-cols-3">
          <Fact value="537" label="automated tests" />
          <Fact value="3" label="upstream Oxorio audit reports" />
          <Fact value="LIVE" label="native MNT on Mantle" live />
        </div>
        <div className="mt-9 border-t border-white/15 pt-8 font-mono text-base text-cyan-100 sm:text-lg">
          <p>apps / web · api · indexer</p>
          <p className="mt-4">packages / stealth · contracts · pool · config</p>
        </div>
      </Glass>
      <p className="mt-8 text-lg font-semibold">
        Mateo and Carlos built Galeon&apos;s product-specific work. Privacy Pool foundations derive
        from 0xbow.
      </p>
      <p className="mt-3 text-sm text-cyan-100/60">
        MIT for apps and libraries · Apache-2.0 for contracts and pool
      </p>
    </div>
  )
}

function Fact({ value, label, live = false }: { value: string; label: string; live?: boolean }) {
  return (
    <div className="sm:border-r sm:border-white/15 sm:last:border-r-0">
      <p className={`text-5xl font-bold ${live ? 'text-emerald-300' : 'text-cyan-300'}`}>{value}</p>
      <p className="mt-4 text-lg font-semibold text-cyan-50/85">{label}</p>
    </div>
  )
}

function BoundarySlide() {
  return (
    <div>
      <h2 className="max-w-5xl text-4xl font-bold sm:text-5xl">
        The product is real. The humanitarian deployment is not finished.
      </h2>
      <Glass className="mt-8 grid gap-8 p-7 sm:grid-cols-2 sm:p-10">
        <List
          title="Works now"
          items={[
            'Stealth-address payments',
            'Native-MNT privacy pool',
            'Relayed private withdrawal',
            'Public code and licenses',
          ]}
        />
        <List
          title="Funded work"
          planned
          items={[
            'Stablecoin deployment',
            'Real ASP process',
            'External delta-audit',
            'Controlled partner pilot',
          ]}
        />
      </Glass>
      <div className="mt-8">
        <Eyebrow>Proof boundary</Eyebrow>
        <p className="mt-3 text-lg font-semibold sm:text-xl">
          Galeon proves settlement and contract rules. Partners prove eligibility, receipt,
          cash-out, and outcomes.
        </p>
      </div>
    </div>
  )
}

function List({
  title,
  items,
  planned = false,
}: {
  title: string
  items: string[]
  planned?: boolean
}) {
  return (
    <section className="sm:first:border-r sm:first:border-white/15 sm:first:pr-10 sm:last:pl-2">
      <Eyebrow planned={planned}>{title}</Eyebrow>
      <div className="mt-7 space-y-5">
        {items.map((item) => (
          <p key={item} className="text-xl font-semibold">
            {item}
          </p>
        ))}
      </div>
    </section>
  )
}

function AnchorSlide() {
  const anchors = [
    ['Accountable ASP', 'Rules, review, appeals, and public attestations.'],
    ['Active deposit set', 'Meaningful approved participation, not just a pool balance.'],
    ['Partner delivery', 'Enrollment, cash-out, support, and safeguarding.'],
  ]

  return (
    <div>
      <h2 className="max-w-5xl text-4xl font-bold sm:text-5xl">
        Without an institutional anchor, the privacy model is too weak.
      </h2>
      <Glass className="mt-8 grid gap-8 p-7 sm:grid-cols-3 sm:p-10">
        {anchors.map(([title, body], index) => (
          <section
            key={title}
            className={index > 0 ? 'sm:border-l sm:border-white/15 sm:pl-8' : ''}
          >
            <h3 className="text-2xl font-semibold text-cyan-200">{title}</h3>
            <p className="mt-8 text-lg text-cyan-50/85">{body}</p>
          </section>
        ))}
      </Glass>
      <p className="mt-10 text-2xl font-semibold">
        UNICEF can help test all three under real safeguarding constraints.
      </p>
    </div>
  )
}

function FundedPathSlide() {
  const quarters = [
    ['Q1', 'Stablecoin + hardening'],
    ['Q2', 'Audit + real ASP + sandbox'],
    ['Q3', 'Controlled pilot ≤50'],
    ['Q4', 'Evaluate + expand ≤100'],
  ]

  return (
    <div>
      <h2 className="max-w-5xl text-4xl font-bold sm:text-5xl">
        UNICEF can test whether Galeon belongs in a humanitarian cash program.
      </h2>
      <Glass className="mt-8 grid gap-8 p-7 sm:grid-cols-4 sm:p-10">
        {quarters.map(([quarter, work], index) => (
          <section
            key={quarter}
            className={index > 0 ? 'sm:border-l sm:border-white/15 sm:pl-8' : ''}
          >
            <h3 className={`text-3xl font-semibold ${index < 2 ? 'text-cyan-300' : 'text-white'}`}>
              {quarter}
            </h3>
            <p className="mt-8 text-lg font-semibold text-cyan-50/85">{work}</p>
          </section>
        ))}
      </Glass>
      <div className="mt-8">
        <Eyebrow>Sustainability hypotheses</Eyebrow>
        <p className="mt-3 text-xl font-semibold">
          Hosting + support · ASP operations · Reporting + integration
        </p>
        <p className="mt-5 text-base text-cyan-100/60">
          No current revenue is claimed. The funded period tests whether these services are useful
          and sustainable.
        </p>
      </div>
    </div>
  )
}
