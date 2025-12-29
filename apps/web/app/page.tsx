import Link from 'next/link'
import { WalletButton, ConnectButton } from '@/components/wallet-button'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🚢</span>
          <span className="text-xl font-bold text-zinc-100">Galeon</span>
        </div>
        <WalletButton />
      </header>

      {/* Hero section */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="max-w-3xl text-5xl font-bold leading-tight text-zinc-100 sm:text-6xl">
          Private Payments.
          <br />
          <span className="text-emerald-400">Verifiable Proof.</span>
        </h1>

        <p className="mt-6 max-w-xl text-lg text-zinc-400">
          Your payments. Your treasure. Hidden in plain sight.
          <br />
          Stealth addresses on Mantle for confidential transactions.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <ConnectButton />
          <Link
            href="/dashboard"
            className="rounded-xl border border-zinc-700 bg-zinc-800/50 px-8 py-4 text-lg font-semibold text-zinc-100 transition-all hover:border-zinc-600 hover:bg-zinc-800"
          >
            View Dashboard
          </Link>
        </div>

        {/* Features grid */}
        <div className="mt-20 grid max-w-4xl gap-6 sm:grid-cols-3">
          <FeatureCard
            icon="🔒"
            title="Private Ports"
            description="Create isolated payment endpoints with unique stealth addresses"
          />
          <FeatureCard
            icon="⚡"
            title="Instant Detection"
            description="Real-time payment notifications via blockchain indexing"
          />
          <FeatureCard
            icon="✓"
            title="On-Chain Proofs"
            description="Verifiable receipts anchored on Mantle L2"
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-6 text-center text-sm text-zinc-500">
        Built for Mantle Global Hackathon 2025
      </footer>
    </main>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-left">
      <div className="text-3xl">{icon}</div>
      <h3 className="mt-4 text-lg font-semibold text-zinc-100">{title}</h3>
      <p className="mt-2 text-sm text-zinc-400">{description}</p>
    </div>
  )
}
