'use client'

import { m } from 'motion/react'
import { slideUp, useAnimationPreset, useAnimationsEnabled } from '@/lib/animations'

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
      'Your wallet scans for incoming payments automatically. When funds arrive, you can move them to any address you control.',
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
 * SVG Pattern Components - Centered shapes, no background
 */
function SailboatPattern() {
  return (
    <svg
      className="h-64 w-80"
      viewBox="0 0 280 200"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sailStroke" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
        <linearGradient id="mastStroke" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0c4a6e" />
        </linearGradient>
      </defs>

      {/* Hull - elegant curved line */}
      <path
        d="M40,175 Q140,185 240,175"
        fill="none"
        stroke="url(#mastStroke)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Left sail - outline with sail lines */}
      <path
        d="M70,170 L70,80 L100,170"
        fill="none"
        stroke="url(#sailStroke)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <line
        x1="70"
        y1="100"
        x2="92"
        y2="170"
        stroke="#22d3ee"
        strokeWidth="0.75"
        strokeOpacity="0.5"
      />
      <line
        x1="70"
        y1="120"
        x2="86"
        y2="170"
        stroke="#22d3ee"
        strokeWidth="0.5"
        strokeOpacity="0.3"
      />

      {/* Center mast */}
      <line
        x1="140"
        y1="25"
        x2="140"
        y2="175"
        stroke="url(#mastStroke)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Center sail (main) - largest, with horizontal reef lines */}
      <path
        d="M140,30 L140,165 L205,165"
        fill="none"
        stroke="url(#sailStroke)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <line
        x1="140"
        y1="60"
        x2="185"
        y2="165"
        stroke="#22d3ee"
        strokeWidth="0.75"
        strokeOpacity="0.4"
      />
      <line
        x1="140"
        y1="90"
        x2="170"
        y2="165"
        stroke="#22d3ee"
        strokeWidth="0.5"
        strokeOpacity="0.3"
      />
      <line
        x1="140"
        y1="120"
        x2="155"
        y2="165"
        stroke="#22d3ee"
        strokeWidth="0.5"
        strokeOpacity="0.2"
      />

      {/* Right sail - triangular, outline */}
      <path
        d="M180,170 L210,60 L240,170"
        fill="none"
        stroke="url(#sailStroke)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <line
        x1="210"
        y1="95"
        x2="232"
        y2="170"
        stroke="#22d3ee"
        strokeWidth="0.75"
        strokeOpacity="0.5"
      />
      <line
        x1="210"
        y1="120"
        x2="225"
        y2="170"
        stroke="#22d3ee"
        strokeWidth="0.5"
        strokeOpacity="0.3"
      />

      {/* Small flag at top of mast */}
      <path
        d="M140,25 L155,32 L140,39"
        fill="none"
        stroke="#67e8f9"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TreasureChestPattern() {
  return (
    <svg
      className="h-64 w-80"
      viewBox="0 0 280 200"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="chestGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
      </defs>

      {/* Chest lid - curved top */}
      <path
        d="M80,90 Q140,60 200,90"
        fill="none"
        stroke="url(#chestGrad)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Lid sides */}
      <line x1="80" y1="90" x2="80" y2="105" stroke="url(#chestGrad)" strokeWidth="2" />
      <line x1="200" y1="90" x2="200" y2="105" stroke="url(#chestGrad)" strokeWidth="2" />

      {/* Lid band */}
      <path
        d="M80,97 Q140,70 200,97"
        fill="none"
        stroke="#22d3ee"
        strokeWidth="1"
        strokeOpacity="0.5"
      />

      {/* Chest body */}
      <rect
        x="75"
        y="105"
        width="130"
        height="70"
        rx="3"
        fill="none"
        stroke="url(#chestGrad)"
        strokeWidth="2"
      />

      {/* Horizontal bands on body */}
      <line
        x1="75"
        y1="125"
        x2="205"
        y2="125"
        stroke="#22d3ee"
        strokeWidth="1"
        strokeOpacity="0.4"
      />
      <line
        x1="75"
        y1="155"
        x2="205"
        y2="155"
        stroke="#22d3ee"
        strokeWidth="1"
        strokeOpacity="0.4"
      />

      {/* Center lock/clasp */}
      <rect
        x="130"
        y="98"
        width="20"
        height="22"
        rx="2"
        fill="none"
        stroke="url(#chestGrad)"
        strokeWidth="1.5"
      />
      <circle
        cx="140"
        cy="112"
        r="3"
        fill="none"
        stroke="#22d3ee"
        strokeWidth="1"
        strokeOpacity="0.6"
      />

      {/* Corner reinforcements */}
      <line
        x1="75"
        y1="105"
        x2="85"
        y2="105"
        stroke="#22d3ee"
        strokeWidth="1.5"
        strokeOpacity="0.5"
      />
      <line
        x1="75"
        y1="105"
        x2="75"
        y2="115"
        stroke="#22d3ee"
        strokeWidth="1.5"
        strokeOpacity="0.5"
      />
      <line
        x1="195"
        y1="105"
        x2="205"
        y2="105"
        stroke="#22d3ee"
        strokeWidth="1.5"
        strokeOpacity="0.5"
      />
      <line
        x1="205"
        y1="105"
        x2="205"
        y2="115"
        stroke="#22d3ee"
        strokeWidth="1.5"
        strokeOpacity="0.5"
      />

      {/* Sparkles floating above - incoming funds */}
      <circle
        cx="100"
        cy="55"
        r="3"
        fill="none"
        stroke="#67e8f9"
        strokeWidth="1"
        strokeOpacity="0.6"
      />
      <circle
        cx="140"
        cy="42"
        r="4"
        fill="none"
        stroke="#67e8f9"
        strokeWidth="1.5"
        strokeOpacity="0.7"
      />
      <circle
        cx="175"
        cy="50"
        r="2.5"
        fill="none"
        stroke="#67e8f9"
        strokeWidth="1"
        strokeOpacity="0.5"
      />
      <circle
        cx="115"
        cy="35"
        r="2"
        fill="none"
        stroke="#22d3ee"
        strokeWidth="0.75"
        strokeOpacity="0.4"
      />
      <circle
        cx="160"
        cy="30"
        r="2"
        fill="none"
        stroke="#22d3ee"
        strokeWidth="0.75"
        strokeOpacity="0.35"
      />

      {/* Small sparkle highlights */}
      <circle cx="108" cy="45" r="1" fill="#ffffff" fillOpacity="0.5" />
      <circle cx="148" cy="35" r="1" fill="#ffffff" fillOpacity="0.4" />
    </svg>
  )
}

function LighthousePattern() {
  return (
    <svg
      className="h-64 w-80"
      viewBox="0 0 280 200"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="towerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
        <linearGradient id="beamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Light beams - selective illumination */}
      <path d="M140,45 L240,20 L220,55 Z" fill="url(#beamGrad)" opacity="0.4" />
      <path d="M140,45 L250,60 L230,85 Z" fill="url(#beamGrad)" opacity="0.3" />
      <path d="M140,45 L240,95 L215,105 Z" fill="url(#beamGrad)" opacity="0.2" />

      {/* Lighthouse tower */}
      <path
        d="M120,180 L125,70 L155,70 L160,180 Z"
        fill="none"
        stroke="url(#towerGrad)"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Horizontal stripes on tower */}
      <line
        x1="124"
        y1="100"
        x2="156"
        y2="100"
        stroke="#22d3ee"
        strokeWidth="1"
        strokeOpacity="0.5"
      />
      <line
        x1="123"
        y1="130"
        x2="157"
        y2="130"
        stroke="#22d3ee"
        strokeWidth="1"
        strokeOpacity="0.4"
      />
      <line
        x1="122"
        y1="160"
        x2="158"
        y2="160"
        stroke="#22d3ee"
        strokeWidth="1"
        strokeOpacity="0.3"
      />

      {/* Lantern room */}
      <rect
        x="118"
        y="50"
        width="44"
        height="22"
        rx="2"
        fill="none"
        stroke="url(#towerGrad)"
        strokeWidth="2"
      />

      {/* Light source glow */}
      <circle cx="140" cy="61" r="6" fill="#ffffff" fillOpacity="0.7" />
      <circle cx="140" cy="61" r="10" fill="#67e8f9" fillOpacity="0.3" />

      {/* Dome/cap */}
      <path
        d="M118,50 Q140,35 162,50"
        fill="none"
        stroke="url(#towerGrad)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Base platform */}
      <path d="M105,180 L175,180" stroke="url(#towerGrad)" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M110,180 L115,175 L165,175 L170,180"
        fill="none"
        stroke="#22d3ee"
        strokeWidth="1"
        strokeOpacity="0.5"
      />

      {/* Waves at base */}
      <path
        d="M60,185 Q80,180 100,185 Q120,190 140,185 Q160,180 180,185 Q200,190 220,185"
        fill="none"
        stroke="#0891b2"
        strokeWidth="1.5"
        strokeOpacity="0.4"
        strokeLinecap="round"
      />
      <path
        d="M50,193 Q70,188 90,193 Q110,198 130,193 Q150,188 170,193 Q190,198 210,193 Q230,188 250,193"
        fill="none"
        stroke="#06b6d4"
        strokeWidth="1"
        strokeOpacity="0.3"
        strokeLinecap="round"
      />
    </svg>
  )
}

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
