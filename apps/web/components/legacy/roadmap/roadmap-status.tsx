import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/** Opening of the previous Roadmap page: what was working and its known limitations. */
export function RoadmapStatus() {
  return (
    <>
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
