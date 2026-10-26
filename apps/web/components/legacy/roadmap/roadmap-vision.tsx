import { Badge } from '@/components/ui/badge'

/** The account model (already implemented) and the list of what comes next. */
export function RoadmapVision() {
  return (
    <>
      {/* Account Model - Already Implemented */}
      <section className="mt-16">
        <Badge className="bg-emerald-500/20 text-emerald-400">Implemented</Badge>
        <h2 className="mt-4 text-2xl font-bold text-white">Single Balance, Unlimited Deposits</h2>
        <div className="mt-6 space-y-4 leading-relaxed text-cyan-100/70">
          <p>
            Deposit as many times as you want. Your balance accumulates automatically. When you
            withdraw, it&apos;s always a <strong className="text-white">single proof</strong> — no
            matter how many deposits you&apos;ve made.
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
            Behind the scenes, deposits are merged into a single commitment using ZK proofs. You
            don&apos;t need to think about it — the app handles everything automatically.
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
    </>
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
