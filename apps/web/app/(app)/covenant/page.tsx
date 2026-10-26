import Link from 'next/link'
import { ExternalLink, Shield, Eye, EyeOff, Lock, Scale, AlertTriangle } from 'lucide-react'
import { FloatingNav } from '@/components/layout/floating-nav'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export const metadata = {
  title: 'Covenant | Galeon',
  description: 'Our public commitment to users: what we store, what we see, and what we promise',
}

export default function CovenantPage() {
  return (
    <>
      <main className="relative flex min-h-screen flex-col">
        <FloatingNav />

        {/* Content */}
        <div className="mx-auto w-full max-w-3xl px-6 pb-16 pt-40">
          {/* Glass container */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 p-8 shadow-2xl backdrop-blur-xl sm:p-12">
            {/* Hero */}
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-cyan-400" />
              <h1 className="text-4xl font-bold text-white sm:text-5xl">
                The Galeon <span className="text-cyan-400">Covenant</span>
              </h1>
            </div>
            <p className="mt-4 text-lg text-cyan-100/70">
              Our public commitment to you. What we store, what we see, what we promise.
            </p>

            {/* TL;DR */}
            <div className="mt-8">
              <p className="mb-4 text-sm font-medium text-cyan-400">TL;DR</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-4">
                  <p className="text-sm font-medium text-emerald-400">What We Promise</p>
                  <ul className="mt-2 space-y-1 text-sm text-emerald-100/80">
                    <li>Your spending keys never leave your device</li>
                    <li>ZK proofs hide withdrawal destinations</li>
                    <li>Ragequit guarantees you can always exit</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-amber-500/30 bg-amber-950/30 p-4">
                  <p className="text-sm font-medium text-amber-400">What You Accept</p>
                  <ul className="mt-2 space-y-1 text-sm text-amber-100/80">
                    <li>Your funds come from legitimate sources</li>
                    <li>You&apos;re not a sanctioned person or entity</li>
                    <li>You&apos;ll handle your own tax obligations</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Preamble */}
            <section className="mt-12">
              <div className="rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-6">
                <p className="leading-relaxed text-cyan-100/80">
                  Privacy is choosing what you share. By using Galeon, you confirm your funds are
                  legitimate. In return, we commit to full transparency about your data.
                </p>
                <p className="mt-4 text-sm text-cyan-100/60">
                  Inspired by the{' '}
                  <a
                    href="https://blog.ethereum.org/en/2025/10/08/privacy-commitment"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300"
                  >
                    Ethereum Foundation&apos;s Privacy Commitment
                  </a>{' '}
                  and the{' '}
                  <a
                    href="https://trustlessness.eth.limo/general/2025/11/11/the-trustless-manifesto.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300"
                  >
                    Trustless Manifesto
                  </a>
                  .
                </p>
              </div>
            </section>

            {/* What We Store */}
            <section className="mt-16">
              <div className="flex items-center gap-3">
                <Lock className="h-6 w-6 text-emerald-400" />
                <h2 className="text-2xl font-bold text-white">What We Store</h2>
              </div>
              <div className="mt-6 space-y-4">
                <CovenantCard
                  icon={<Eye className="h-5 w-5 text-amber-400" />}
                  title="Encrypted Viewing Keys"
                  description="We store your viewing keys encrypted with our server key (APP_KEY). This allows us to detect incoming payments to your Ports. Without these keys, we couldn't tell you when you've been paid."
                  implication="Galeon can see incoming payments to your Ports and link them to your account."
                />
                <CovenantCard
                  icon={<EyeOff className="h-5 w-5 text-emerald-400" />}
                  title="Never: Spending Keys"
                  description="Your spending keys are derived from your wallet signature during each session. They exist only in your browser's memory and are cleared when you close the tab. We never transmit, store, or have access to spending keys."
                  implication="Galeon cannot move your funds. Only you can authorize withdrawals."
                />
                <CovenantCard
                  icon={<Lock className="h-5 w-5 text-cyan-400" />}
                  title="Session Data"
                  description="We store your wallet address, Port configurations, and session tokens (JWTs). Payment receipts are stored to enable Shipwreck Reports for tax compliance."
                  implication="Standard account data for service functionality."
                />
              </div>
            </section>

            {/* What We Can See */}
            <section className="mt-16">
              <div className="flex items-center gap-3">
                <Eye className="h-6 w-6 text-amber-400" />
                <h2 className="text-2xl font-bold text-white">What We Can See</h2>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <VisibilityCard
                  title="Incoming Payments"
                  canSee={true}
                  description="When someone pays your Port, we detect it to notify you and update your balance."
                />
                <VisibilityCard
                  title="Deposit Amounts"
                  canSee={true}
                  description="When you deposit to the Privacy Pool, the amount is visible on-chain and to us."
                />
                <VisibilityCard
                  title="Withdrawal Destinations"
                  canSee={false}
                  description="ZK proofs hide which deposit you're withdrawing. We cannot link withdrawals to deposits."
                />
                <VisibilityCard
                  title="Who You Pay From Pool"
                  canSee={false}
                  description="When you withdraw to pay someone, only you know the recipient. The relayer sees the destination but cannot link it to you."
                />
              </div>
            </section>

            {/* ASP Policy */}
            <section className="mt-16">
              <div className="flex items-center gap-3">
                <Scale className="h-6 w-6 text-cyan-400" />
                <h2 className="text-2xl font-bold text-white">ASP Policy</h2>
              </div>
              <div className="mt-6 space-y-4 leading-relaxed text-cyan-100/70">
                <p>
                  The <strong className="text-white">Association Set Provider (ASP)</strong>{' '}
                  controls which deposits can be withdrawn from the Privacy Pool. Our policy:
                </p>
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-6">
                  <h3 className="font-semibold text-emerald-400">Default: Auto-Approve</h3>
                  <p className="mt-2 text-sm text-emerald-100/70">
                    All deposits from verified Port addresses are automatically approved for
                    withdrawal. No vetting period, no manual review. Privacy by default.
                  </p>
                </div>
                <div className="rounded-lg border border-amber-500/20 bg-amber-950/20 p-6">
                  <h3 className="font-semibold text-amber-400">Future: Sanctions Screening</h3>
                  <p className="mt-2 text-sm text-amber-100/70">
                    <strong className="text-white">Current (Hackathon):</strong> All deposits from
                    verified Port addresses are auto-approved without sanctions checking.
                  </p>
                  <p className="mt-2 text-sm text-amber-100/70">
                    <strong className="text-white">Planned (Production):</strong> Addresses on OFAC
                    or equivalent sanctions lists will be blocked from depositing. We will never
                    retroactively block withdrawals for deposits that were accepted. If you
                    deposited, you can withdraw.
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-800/30 p-6">
                  <h3 className="font-semibold text-white">Ragequit Guarantee</h3>
                  <p className="mt-2 text-sm text-cyan-100/70">
                    Even if blocked from standard withdrawal, you can always{' '}
                    <strong className="text-white">ragequit</strong>: withdraw your exact deposit
                    back to the original depositing address. This sacrifices privacy but guarantees
                    you can never lose access to your funds.
                  </p>
                </div>
              </div>
            </section>

            {/* Compliance Acknowledgment */}
            <section className="mt-16">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-amber-400" />
                <h2 className="text-2xl font-bold text-white">Your Responsibilities</h2>
              </div>
              <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-950/30 p-6">
                <p className="leading-relaxed text-amber-100/80">
                  By using Galeon, you represent and warrant that:
                </p>
                <ul className="mt-4 space-y-3 text-sm text-amber-100/70">
                  <li className="flex gap-2">
                    <span className="text-amber-400">1.</span>
                    <span>
                      Your funds come from{' '}
                      <strong className="text-white">legitimate sources</strong> and are not the
                      proceeds of illegal activity.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-amber-400">2.</span>
                    <span>
                      You are not a{' '}
                      <strong className="text-white">Specially Designated National (SDN)</strong> or
                      otherwise subject to sanctions under applicable law, and you are not acting on
                      behalf of any such person or entity.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-amber-400">3.</span>
                    <span>
                      You will comply with all applicable{' '}
                      <strong className="text-white">tax and reporting obligations</strong> in your
                      jurisdiction. Shipwreck Reports are provided to assist with this.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-amber-400">4.</span>
                    <span>
                      You understand that privacy is not anonymity. Galeon provides{' '}
                      <strong className="text-white">financial privacy</strong> for legitimate use
                      cases, not a tool for evading legal obligations.
                    </span>
                  </li>
                </ul>
              </div>
            </section>

            {/* Trustless Principles */}
            <section className="mt-16">
              <div className="flex items-center gap-3">
                <Lock className="h-6 w-6 text-cyan-400" />
                <h2 className="text-2xl font-bold text-white">Trustless Principles</h2>
              </div>
              <p className="mt-4 text-cyan-100/70">
                Following the{' '}
                <a
                  href="https://trustlessness.eth.limo/general/2025/11/11/the-trustless-manifesto.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300"
                >
                  Trustless Manifesto
                </a>
                , we measure success not by transactions per second, but by{' '}
                <strong className="text-white">trust reduced per transaction</strong>.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <TrustlessCard
                  title="Self-Sovereignty"
                  description="You authorize your own actions exclusively. Spending keys never leave your device."
                  status="achieved"
                />
                <TrustlessCard
                  title="Verifiability"
                  description="All contracts verified on-chain. Public data enables confirmation of outcomes."
                  status="achieved"
                />
                <TrustlessCard
                  title="Walkaway Test"
                  description="Ragequit guarantees exit without our approval. You can always recover funds."
                  status="achieved"
                />
                <TrustlessCard
                  title="Censorship Resistance"
                  description="Direct contract interaction always available. Relayer is convenience, not requirement."
                  status="achieved"
                />
                <TrustlessCard
                  title="No Indispensable Intermediaries"
                  description="Permissionless relayer network. Anyone can run a relayer and compete."
                  status="planned"
                />
                <TrustlessCard
                  title="No Critical Secrets"
                  description="Decentralized ASP with multiple independent operators."
                  status="planned"
                />
              </div>
              <p className="mt-6 text-sm text-cyan-100/60">
                <strong className="text-white">Delegation may exist. Dependence must not.</strong>{' '}
                We offer convenience through relayers and hosted scanning, but permissionless
                protocol access is always available.
              </p>
            </section>

            {/* Our Promises */}
            <section className="mt-16">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-emerald-400" />
                <h2 className="text-2xl font-bold text-white">Our Promises</h2>
              </div>
              <div className="mt-6 space-y-4">
                <PromiseCard
                  number="01"
                  title="No Subjective Blocking"
                  description="We will never block deposits or withdrawals based on politics, personal beliefs, or pressure from non-governmental entities. Only legally required sanctions compliance."
                />
                <PromiseCard
                  number="02"
                  title="No Data Sales"
                  description="We will never sell, share, or monetize your transaction data. Your privacy is the product, not your data."
                />
                <PromiseCard
                  number="03"
                  title="Transparent Operations"
                  description="All smart contracts are verified and open source. ASP root updates are published on-chain. You can verify everything."
                />
                <PromiseCard
                  number="04"
                  title="Self-Custody Always"
                  description="Your funds are always under your control. We cannot freeze, seize, or move your assets. The ragequit function guarantees exit even if we disappear."
                />
                <PromiseCard
                  number="05"
                  title="Progressive Decentralization"
                  description="We're actively working to remove ourselves as a trusted party. Permissionless relayers, decentralized ASP, and time-locked governance are on the roadmap."
                />
              </div>
            </section>

            {/* Contract Verification */}
            <section className="mt-16">
              <h2 className="text-2xl font-bold text-white">Verify Yourself</h2>
              <p className="mt-4 text-cyan-100/70">
                Don&apos;t trust, verify. All contracts are verified on Mantle Mainnet:
              </p>
              <div className="mt-6 space-y-2 text-sm">
                <ContractLink
                  name="Privacy Pool"
                  description="Deposits, withdrawals, ZK proofs"
                  address="0xE271335D1FCa02b6c219B9944f0a4921aFD559C0"
                />
                <ContractLink
                  name="Entrypoint"
                  description="Pool registry, ASP roots"
                  address="0x8633518fbbf23E78586F1456530c3452885efb21"
                />
                <ContractLink
                  name="Registry"
                  description="Stealth addresses, payments"
                  address="0x9bcDb96a9Ff9b492e07f9E4909DF143266271e9D"
                />
              </div>
              <p className="mt-4 text-xs text-cyan-100/50">
                View full contract list on{' '}
                <Link href="/about" className="text-cyan-400 hover:text-cyan-300">
                  About page
                </Link>
              </p>
            </section>

            {/* CTA */}
            <section className="mt-16 text-center">
              <h2 className="text-2xl font-bold text-white">Questions?</h2>
              <p className="mt-2 text-cyan-100/70">
                Privacy and compliance, not privacy vs compliance.
              </p>
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Button size="lg" asChild>
                  <Link href="/setup">Get Started</Link>
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  asChild
                  className="border border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="/about">Learn More</Link>
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
          <Link href="/roadmap" className="text-cyan-100/70 transition-colors hover:text-cyan-300">
            Roadmap
          </Link>
          <span className="mx-2">·</span>
          Built for Mantle Global Hackathon 2025
        </footer>
      </main>
    </>
  )
}

function CovenantCard({
  icon,
  title,
  description,
  implication,
}: {
  icon: React.ReactNode
  title: string
  description: string
  implication: string
}) {
  return (
    <Card className="border-white/10 bg-slate-800/50">
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="font-semibold text-white">{title}</h3>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-cyan-100/70">{description}</p>
        <p className="mt-3 text-sm text-cyan-400">
          <span className="text-cyan-100/50">Implication:</span> {implication}
        </p>
      </CardContent>
    </Card>
  )
}

function VisibilityCard({
  title,
  canSee,
  description,
}: {
  title: string
  canSee: boolean
  description: string
}) {
  return (
    <div
      className={`rounded-lg border p-5 ${
        canSee ? 'border-amber-500/20 bg-amber-950/20' : 'border-emerald-500/20 bg-emerald-950/20'
      }`}
    >
      <div className="flex items-center gap-2">
        {canSee ? (
          <Eye className="h-4 w-4 text-amber-400" />
        ) : (
          <EyeOff className="h-4 w-4 text-emerald-400" />
        )}
        <h3 className="font-semibold text-white">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-cyan-100/70">{description}</p>
      <p className={`mt-2 text-xs font-medium ${canSee ? 'text-amber-400' : 'text-emerald-400'}`}>
        {canSee ? 'Visible to Galeon' : 'Hidden from Galeon'}
      </p>
    </div>
  )
}

function PromiseCard({
  number,
  title,
  description,
}: {
  number: string
  title: string
  description: string
}) {
  return (
    <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-6">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-sm text-emerald-500/60">{number}</span>
        <h3 className="font-semibold text-emerald-400">{title}</h3>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-emerald-100/70">{description}</p>
    </div>
  )
}

function ContractLink({
  name,
  description,
  address,
}: {
  name: string
  description: string
  address: string
}) {
  return (
    <div className="flex items-center justify-between rounded border border-white/10 bg-slate-800/30 px-4 py-3">
      <div>
        <span className="font-medium text-white">{name}</span>
        <span className="ml-2 text-cyan-100/50">{description}</span>
      </div>
      <a
        href={`https://mantlescan.xyz/address/${address}#code`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 font-mono text-xs text-cyan-400 hover:text-cyan-300"
      >
        {`${address.slice(0, 6)}...${address.slice(-4)}`}
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  )
}

function TrustlessCard({
  title,
  description,
  status,
}: {
  title: string
  description: string
  status: 'achieved' | 'planned'
}) {
  const isAchieved = status === 'achieved'
  return (
    <div
      className={`rounded-lg border p-5 ${
        isAchieved
          ? 'border-emerald-500/20 bg-emerald-950/20'
          : 'border-amber-500/20 bg-amber-950/20'
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">{title}</h3>
        <span
          className={`text-xs font-medium ${isAchieved ? 'text-emerald-400' : 'text-amber-400'}`}
        >
          {isAchieved ? 'Achieved' : 'Planned'}
        </span>
      </div>
      <p className="mt-2 text-sm text-cyan-100/70">{description}</p>
    </div>
  )
}
