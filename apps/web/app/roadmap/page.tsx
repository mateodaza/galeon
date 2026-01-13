import Link from 'next/link'
import { FloatingNav } from '@/components/layout/floating-nav'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata = {
  title: 'Roadmap | Galeon',
  description: "Where we are, where we're going, and the challenges we're solving",
}

export default function RoadmapPage() {
  return (
    <>
      <main className="relative flex min-h-screen flex-col">
        <FloatingNav />

        {/* Content */}
        <div className="mx-auto w-full max-w-3xl px-6 pb-16 pt-40">
          {/* Glass container */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 p-8 shadow-2xl backdrop-blur-xl sm:p-12">
            {/* Hero */}
            <h1 className="text-4xl font-bold text-white sm:text-5xl">
              Roadmap & <span className="text-cyan-400">Vision</span>
            </h1>
            <p className="mt-4 text-lg text-cyan-100/70">
              Compliance-ready privacy for real-world payments. Here&apos;s where we are and where
              we&apos;re headed.
            </p>

            {/* Current Status */}
            <section className="mt-16">
              <div className="flex items-center gap-3">
                <Badge className="bg-emerald-500/20 text-emerald-400">Live on Mantle</Badge>
                <span className="text-sm text-cyan-100/50">Hackathon MVP</span>
              </div>
              <h2 className="mt-4 text-2xl font-bold text-white">What&apos;s Working Today</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <StatusCard
                  title="Stealth Payments"
                  description="EIP-5564 stealth addresses with Ports for isolated payment identities"
                />
                <StatusCard
                  title="Privacy Pool"
                  description="Deposit, withdraw with ZK proofs, and ragequit support (UI coming soon)"
                />
                <StatusCard
                  title="Private Withdrawals"
                  description="Relayer broadcasts transactions so your address stays hidden"
                />
                <StatusCard
                  title="Verified Balance Gating"
                  description="Only verified stealth address funds can enter the pool"
                />
                <StatusCard
                  title="Merge Deposits"
                  description="Combine multiple deposits into one. Withdraw everything with a single proof, no matter how many times you deposited"
                />
                <StatusCard
                  title="Client-Side Proof Generation"
                  description="ZK proofs generated in your browser. Your secrets never leave your device"
                />
                <StatusCard
                  title="Shipwreck Reports"
                  description="Tax compliance reports with PDF export. US and Colombia jurisdiction support"
                />
              </div>
            </section>

            {/* Current Limitations */}
            <section className="mt-16">
              <h2 className="text-2xl font-bold text-white">Current Limitations</h2>
              <p className="mt-4 text-cyan-100/70">Areas we&apos;re actively improving:</p>
              <div className="mt-6 space-y-4">
                <LimitationCard
                  title="Single Relayer"
                  current="We operate the only relayer for private withdrawals"
                  why="Hackathon scope. Users CAN bypass the relayer (direct withdrawal), but lose sender privacy."
                  planned="Permissionless relayer network - anyone can run a relayer, compete on fees"
                />
                <LimitationCard
                  title="Gas Costs"
                  current="Gas varies by operation: deposits ~150k, withdrawals ~300k on Mantle"
                  why="ZK proof verification is computationally expensive on-chain"
                  planned="Batched proofs, recursive SNARKs, and L3 exploration for cheaper verification"
                />
                <LimitationCard
                  title="Merkle Tree Depth"
                  current="Fixed at 32 levels (~4.3B max commitments per pool)"
                  why="Circuit constraints require fixed tree depth at compile time"
                  planned="Dynamic tree expansion or pool migration strategies for long-term growth"
                />
                <LimitationCard
                  title="Centralized ASP"
                  current="We operate the only ASP (Association Set Provider) that approves deposits"
                  why="MVP scope — a single trusted operator is simpler to deploy and maintain"
                  planned="Decentralized ASP network with multiple independent operators and on-chain governance"
                />
              </div>
            </section>

            {/* Account Model - Already Implemented */}
            <section className="mt-16">
              <Badge className="bg-emerald-500/20 text-emerald-400">Implemented</Badge>
              <h2 className="mt-4 text-2xl font-bold text-white">
                Single Balance, Unlimited Deposits
              </h2>
              <div className="mt-6 space-y-4 leading-relaxed text-cyan-100/70">
                <p>
                  Deposit as many times as you want. Your balance accumulates automatically. When
                  you withdraw, it&apos;s always a{' '}
                  <strong className="text-white">single proof</strong> — no matter how many deposits
                  you&apos;ve made.
                </p>
                <div className="rounded-lg border border-white/10 bg-slate-800/50 p-6">
                  <p className="font-mono text-sm text-cyan-100/80">
                    <span className="text-cyan-400">// How it works</span>
                    <br />
                    Deposit 10 MNT → Balance: 10
                    <br />
                    Deposit 5 MNT → Balance: 15
                    <br />
                    Deposit 3 MNT → Balance: 18
                    <br />
                    <span className="text-emerald-400">
                      Withdraw any amount: Single proof, ~30-60 sec
                    </span>
                  </p>
                </div>
                <p>
                  Behind the scenes, deposits are merged into a single commitment using ZK proofs.
                  You don&apos;t need to think about it — the app handles everything automatically.
                </p>
              </div>
            </section>

            {/* Future Vision */}
            <section className="mt-16">
              <h2 className="text-2xl font-bold text-white">What&apos;s Next</h2>
              <div className="mt-8 space-y-4">
                <VisionCard
                  number="01"
                  title="Permissionless Relayer Network"
                  description="Anyone can run a relayer and earn fees. Users choose based on price, speed, and reputation. No single point of failure or censorship."
                />
                <VisionCard
                  number="02"
                  title="Sub-Second Proof Generation"
                  description="GPU-accelerated proving, potentially moving to faster proof systems. Target: <5 second proofs on mobile devices."
                />
                <VisionCard
                  number="03"
                  title="Cross-Chain Privacy"
                  description="Bridge privacy pools across chains. Deposit on Ethereum, withdraw on Mantle with the same privacy guarantees."
                />
                <VisionCard
                  number="04"
                  title="Privacy-Preserving Compliance Proofs"
                  description="Selective disclosure ZK proofs to prove income, ownership, or non-sanction status without revealing your identity. Currently: on-chain receipt verification. Planned: full ZK compliance proofs."
                />
              </div>
            </section>

            {/* Technical Comparison */}
            <section className="mt-16">
              <h2 className="text-2xl font-bold text-white">Built on Giants: 0xbow Comparison</h2>
              <div className="mt-6 space-y-4 leading-relaxed text-cyan-100/70">
                <p>
                  Galeon extends the{' '}
                  <a
                    href="https://privacypools.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300"
                  >
                    0xbow Privacy Pools protocol
                  </a>
                  . Here&apos;s what we added:
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left">
                        <th className="pb-3 pr-4 font-medium text-white">Feature</th>
                        <th className="pb-3 pr-4 font-medium text-white">0xbow</th>
                        <th className="pb-3 font-medium text-white">Galeon</th>
                      </tr>
                    </thead>
                    <tbody className="text-cyan-100/70">
                      <tr className="border-b border-white/5">
                        <td className="py-3 pr-4">Deposit source</td>
                        <td className="py-3 pr-4">Any address</td>
                        <td className="py-3 text-cyan-400">Port-only (stealth addresses)</td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="py-3 pr-4">Balance verification</td>
                        <td className="py-3 pr-4">None</td>
                        <td className="py-3 text-cyan-400">Verified balance gating</td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="py-3 pr-4">Address freezing</td>
                        <td className="py-3 pr-4">None</td>
                        <td className="py-3 text-cyan-400">Compliance freezing</td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="py-3 pr-4">Upgradeability</td>
                        <td className="py-3 pr-4">Immutable</td>
                        <td className="py-3 text-cyan-400">UUPS proxies</td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="py-3 pr-4">Withdrawal scaling</td>
                        <td className="py-3 pr-4">O(N) deposits</td>
                        <td className="py-3 text-cyan-400">O(1) with Account Model</td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="py-3 pr-4">ASP approval time</td>
                        <td className="py-3 pr-4">~7 days</td>
                        <td className="py-3 text-cyan-400">Instant (MVP)</td>
                      </tr>
                      <tr>
                        <td className="py-3 pr-4">Contract size</td>
                        <td className="py-3 pr-4">186 lines</td>
                        <td className="py-3">409 lines (more features)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-4 text-sm">
                  Built for real-world use: freelancers, businesses, and anyone who needs privacy
                  without sacrificing compliance.
                </p>
              </div>
            </section>

            {/* CTA */}
            <section className="mt-16 text-center">
              <h2 className="text-2xl font-bold text-white">Join the Journey</h2>
              <p className="mt-2 text-cyan-100/70">
                We&apos;re building privacy infrastructure for the long term.
              </p>
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Button size="lg" asChild>
                  <Link href="/setup">Try Galeon</Link>
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  asChild
                  className="border border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  <a
                    href="https://github.com/galeon-privacy/galeon"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Source
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  asChild
                  className="border border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="/covenant">Our Covenant</Link>
                </Button>
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-auto border-t border-white/10 bg-slate-950 px-6 py-6 text-center text-sm text-cyan-100/70">
          <Link href="/" className="text-cyan-100/70 transition-colors hover:text-cyan-300">
            Home
          </Link>
          <span className="mx-2">·</span>
          <Link href="/about" className="text-cyan-100/70 transition-colors hover:text-cyan-300">
            About
          </Link>
          <span className="mx-2">·</span>
          <Link href="/covenant" className="text-cyan-100/70 transition-colors hover:text-cyan-300">
            Covenant
          </Link>
          <span className="mx-2">·</span>
          Built for Mantle Global Hackathon 2025
        </footer>
      </main>
    </>
  )
}

function StatusCard({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-white/10 bg-slate-800/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          {/* Pulsing status dot */}
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <h3 className="font-semibold text-white">{title}</h3>
        </div>
        <p className="mt-1.5 text-sm text-cyan-100/70">{description}</p>
      </CardContent>
    </Card>
  )
}

function LimitationCard({
  title,
  current,
  why,
  planned,
}: {
  title: string
  current: string
  why: string
  planned: string
}) {
  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-950/20 p-6">
      <h3 className="font-semibold text-amber-400">{title}</h3>
      <div className="mt-3 space-y-2 text-sm">
        <p>
          <span className="text-cyan-100/50">Current:</span>{' '}
          <span className="text-cyan-100/80">{current}</span>
        </p>
        <p>
          <span className="text-cyan-100/50">Why:</span>{' '}
          <span className="text-cyan-100/70">{why}</span>
        </p>
        <p>
          <span className="text-cyan-100/50">Planned:</span>{' '}
          <span className="text-emerald-400">{planned}</span>
        </p>
      </div>
    </div>
  )
}

function VisionCard({
  number,
  title,
  description,
}: {
  number: string
  title: string
  description: string
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-800/30 p-6">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-sm text-cyan-500/60">{number}</span>
        <h3 className="font-semibold text-white">{title}</h3>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-cyan-100/70">{description}</p>
    </div>
  )
}
