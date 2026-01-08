import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { FloatingNav } from '@/components/layout/floating-nav'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getAddressExplorerUrl } from '@/lib/chains'

export const metadata = {
  title: 'About | Galeon',
  description: 'The story behind Galeon - private payments inspired by the legendary San José',
}

export default function AboutPage() {
  return (
    <>
      <main className="relative flex min-h-screen flex-col">
        <FloatingNav />

        {/* Content */}
        <div className="mx-auto max-w-3xl px-6 pb-16 pt-40">
          {/* Glass container */}
          <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-8 shadow-2xl backdrop-blur-xl sm:p-12">
            {/* Hero */}
            <h1 className="text-4xl font-bold text-white sm:text-5xl">
              The Legend of <span className="text-cyan-400">Galeon</span>
            </h1>
            <p className="mt-4 text-lg text-cyan-100/70">
              Where ancient treasure meets modern cryptography.
            </p>

            {/* The Lore */}
            <section className="mt-16">
              <h2 className="text-2xl font-bold text-white">The San José</h2>
              <div className="mt-6 space-y-4 leading-relaxed text-cyan-100/70">
                <p>
                  On June 8, 1708, the <em className="text-white">San José</em>, a Spanish galleon
                  carrying one of the largest treasure hoards ever assembled, sank off the coast of
                  Cartagena, Colombia. Gold coins, silver bars, emeralds from Colombian mines, and
                  precious artifacts worth an estimated $4-17 billion USD descended into the
                  Caribbean depths, hidden from the world for over three centuries.
                </p>
                <p>
                  The San José was the flagship of the Spanish Tierra Firme fleet, making it a prime
                  target during the War of Spanish Succession. A British squadron ambushed the
                  fleet, and the San José exploded and sank in minutes, taking nearly 600 crew
                  members and its legendary cargo to the seafloor.
                </p>
                <p>
                  When the Colombian Navy located the wreck in 2015 at a depth of around 600 meters,
                  they found something remarkable: the treasure was still there, undisturbed,
                  protected by nothing but obscurity and depth.
                </p>
              </div>
            </section>

            {/* The Connection */}
            <section className="mt-16">
              <h2 className="text-2xl font-bold text-white">Hidden in Plain Sight</h2>
              <div className="mt-6 space-y-4 leading-relaxed text-cyan-100/70">
                <p>
                  <strong className="text-cyan-400">Galeon</strong> (Spanish for
                  &quot;galleon&quot;) draws its name and philosophy from this legendary ship. Just
                  as the San José&apos;s treasure lay protected for centuries, visible on sonar but
                  unreachable, your payments on Galeon exist on a public blockchain yet remain
                  unlinkable to your identity.
                </p>
                <p>
                  We use <strong className="text-white">stealth addresses</strong>, a cryptographic
                  technique that generates a unique, one-time address for every payment. Observers
                  can see that transactions occurred, but they cannot determine who received them.
                  Your treasure, hidden in plain sight.
                </p>
                <p>
                  <strong className="text-white">Ports</strong> protect receivers.{' '}
                  <strong className="text-white">Privacy Pool</strong> protects senders.{' '}
                  <strong className="text-white">Shipwreck Reports</strong> keep you compliant.
                  Privacy and compliance — not privacy vs compliance.
                </p>
              </div>
            </section>

            {/* How It Works */}
            <section className="mt-16">
              <h2 className="text-2xl font-bold text-white">How Galeon Works</h2>
              <div className="mt-8 flex flex-col gap-6">
                <FeatureBlock
                  number="01"
                  title="Ports (Receiver Privacy)"
                  description="Create payment links for invoices, freelance work, or donations. Share with clients — each payment generates a fresh stealth address that only you can access. Separate Ports for separate income streams."
                />
                <FeatureBlock
                  number="02"
                  title="Privacy Pool (Sender Privacy)"
                  description="Pay suppliers, contractors, or vendors without revealing your full treasury. Deposit to the pool, withdraw to any address with a ZK proof. No one can link your payments."
                />
                <FeatureBlock
                  number="03"
                  title="Shipwreck Reports (Compliance)"
                  description="Need to prove income for taxes or audits? Generate cryptographic proofs for specific transactions without exposing your entire financial history."
                />
              </div>
            </section>

            {/* Privacy Pool */}
            <section className="mt-16">
              <h2 className="text-2xl font-bold text-white">Privacy Pool: Breaking the Trail</h2>
              <div className="mt-6 space-y-4 leading-relaxed text-cyan-100/70">
                <p>
                  Stealth addresses solve <strong className="text-white">receiving privacy</strong>{' '}
                  — no one can link payments to your identity. But what happens when you spend those
                  funds? The blockchain creates a trail from your stealth address to wherever you
                  send money next.
                </p>
                <p>
                  The <strong className="text-cyan-400">Privacy Pool</strong> solves this with{' '}
                  <strong className="text-white">sending privacy</strong>. Deposit funds into a
                  shared pool, then withdraw to any address using a zero-knowledge proof. The proof
                  cryptographically proves you deposited funds without revealing which deposit is
                  yours. The link is broken.
                </p>
                <p>
                  Built on{' '}
                  <strong className="text-white">0xBow&apos;s Privacy Pools protocol</strong>, our
                  implementation uses Merkle trees to track deposits and ZK-SNARKs for withdrawals.
                  Each withdrawal proves: (1) you have a valid deposit in the tree, and (2) you
                  haven&apos;t withdrawn it before — all without revealing which deposit.
                </p>
                <p>
                  <strong className="text-white">Comprehensive financial privacy</strong> requires
                  both: stealth addresses hide who received a payment, and the Privacy Pool hides
                  what you do with that money afterward.
                </p>
              </div>
            </section>

            {/* Technical Foundation */}
            <section className="mt-16">
              <h2 className="text-2xl font-bold text-white">Built on Standards</h2>
              <div className="mt-6 space-y-4 leading-relaxed text-cyan-100/70">
                <p>
                  We didn&apos;t invent new cryptography — we assembled battle-tested standards into
                  a complete privacy solution.
                </p>
              </div>

              {/* Standards Grid */}
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-slate-800/30 p-5">
                  <h3 className="font-semibold text-white">Stealth Addresses</h3>
                  <p className="mt-2 text-sm text-cyan-100/70">
                    <strong className="text-cyan-400">EIP-5564</strong> for announcements and{' '}
                    <strong className="text-cyan-400">EIP-6538</strong> for meta-address registry.
                    The Ethereum standards for receiver privacy.
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-800/30 p-5">
                  <h3 className="font-semibold text-white">Privacy Pools</h3>
                  <p className="mt-2 text-sm text-cyan-100/70">
                    Built on{' '}
                    <a
                      href="https://privacypools.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300"
                    >
                      0xBow&apos;s Privacy Pools
                    </a>
                    . Groth16 ZK-SNARKs with Poseidon hashing and Merkle tree commitments.
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-800/30 p-5">
                  <h3 className="font-semibold text-white">Cryptographic Primitives</h3>
                  <p className="mt-2 text-sm text-cyan-100/70">
                    <code className="rounded bg-slate-800 px-1 text-xs text-cyan-400">
                      @noble/curves
                    </code>{' '}
                    and{' '}
                    <code className="rounded bg-slate-800 px-1 text-xs text-cyan-400">
                      @noble/hashes
                    </code>{' '}
                    — audited secp256k1 and hashing implementations.
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-800/30 p-5">
                  <h3 className="font-semibold text-white">Deployed on Mantle</h3>
                  <p className="mt-2 text-sm text-cyan-100/70">
                    Ethereum L2 with low fees and fast finality. Privacy on mainnet costs $50+ per
                    tx. On Mantle, it costs cents.
                  </p>
                </div>
              </div>

              {/* Contract Addresses */}
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <Card className="border-white/10 bg-slate-800/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-white">Stealth Contracts</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 font-mono text-xs">
                    <ContractRow
                      name="GaleonRegistry"
                      address="0x9bcDb96a9Ff9b492e07f9E4909DF143266271e9D"
                    />
                    <ContractRow
                      name="ERC5564Announcer"
                      address="0x8C04238c49e22EB687ad706bEe645698ccF41153"
                    />
                    <ContractRow
                      name="ERC6538Registry"
                      address="0xE6586103756082bf3E43D3BB73f9fE479f0BDc22"
                    />
                  </CardContent>
                </Card>
                <Card className="border-white/10 bg-slate-800/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-white">Privacy Pool Contracts</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 font-mono text-xs">
                    <ContractRow
                      name="GaleonEntrypoint"
                      address="0x8633518fbbf23E78586F1456530c3452885efb21"
                    />
                    <ContractRow
                      name="GaleonPrivacyPool"
                      address="0xE271335D1FCa02b6c219B9944f0a4921aFD559C0"
                    />
                    <ContractRow
                      name="WithdrawalVerifier"
                      address="0x4894F811D370d987B55bE4e5eeA48588d6545a32"
                    />
                    <ContractRow
                      name="RagequitVerifier"
                      address="0xAE1126645a26bC30B9A29D9c216e8F6B51B82803"
                    />
                    <ContractRow
                      name="MergeDepositVerifier"
                      address="0x05DB69e37b8c7509E9d97826249385682CE9b29d"
                    />
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Philosophy */}
            <section className="mt-16">
              <h2 className="text-2xl font-bold text-white">Our Philosophy: Trustless by Design</h2>
              <div className="mt-6 space-y-4 leading-relaxed text-cyan-100/70">
                <p>
                  We believe privacy tools should depend on{' '}
                  <strong className="text-white">
                    math and consensus, never on the goodwill of intermediaries
                  </strong>
                  . Every design decision in Galeon follows this principle.
                </p>
                <p>
                  <strong className="text-white">Server-free key management.</strong> Your spending
                  keys are derived from your wallet signature and cached in your browser&apos;s
                  local storage for convenience — never sent to servers. If Galeon disappeared
                  tomorrow, you could still access your funds with your wallet and the math alone.
                </p>
                <p>
                  <strong className="text-white">No indispensable intermediaries.</strong> Our
                  relayer helps preserve your privacy by broadcasting transactions on your behalf —
                  but you can always bypass it. Every withdrawal can be submitted directly to the
                  smart contract. The relayer can&apos;t steal funds, modify proofs, or censor you.
                  ZK proofs are verified on-chain, not trusted from a server.
                </p>
                <p>
                  <strong className="text-white">No unverifiable outcomes.</strong> Every state
                  change in Galeon is reproducible from public blockchain data. Merkle proofs,
                  nullifiers, commitments — all verifiable by anyone. We don&apos;t ask you to trust
                  us. We ask you to verify.
                </p>
                <p>
                  This philosophy aligns with the{' '}
                  <a
                    href="https://trustlessness.eth.limo/general/2025/11/11/the-trustless-manifesto.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300"
                  >
                    Trustless Manifesto
                  </a>
                  , a call to builders: measure success not by transactions per second, but by{' '}
                  <strong className="text-white">trust reduced per transaction</strong>. Privacy
                  isn&apos;t a feature to add after the fact. It&apos;s the thing itself.
                </p>
              </div>
            </section>

            {/* Colombian Pride */}
            <section className="mt-16 rounded-xl border border-cyan-500/20 bg-cyan-950/30 p-8">
              <div className="flex items-start gap-4">
                <span className="text-4xl">🇨🇴</span>
                <div>
                  <h2 className="text-xl font-bold text-cyan-400">Made with Colombian Pride</h2>
                  <p className="mt-2 text-cyan-100/70">
                    The San José rests in Colombian waters, a treasure that belongs to our heritage.
                    Galeon carries that spirit forward, building technology that protects
                    what&apos;s yours, from a team proud of where we come from.
                  </p>
                </div>
              </div>
            </section>

            {/* CTA */}
            <section className="mt-16 text-center">
              <h2 className="text-2xl font-bold text-white">Ready to sail?</h2>
              <p className="mt-2 text-cyan-100/70">
                Privacy when you send. Privacy when you receive.
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
                  <Link href="/roadmap">View Roadmap</Link>
                </Button>
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-auto border-t border-white/10 bg-slate-950 px-6 py-6 text-center text-sm text-cyan-100/70">
          Built for Mantle Global Hackathon 2025
        </footer>
      </main>
    </>
  )
}

function FeatureBlock({
  number,
  title,
  description,
}: {
  number: string
  title: string
  description: string
}) {
  return (
    <Card className="border-white/10 bg-slate-800/50">
      <CardContent className="pt-6">
        <Badge variant="secondary" className="bg-cyan-500/20 font-bold text-cyan-400">
          {number}
        </Badge>
        <h3 className="mt-3 text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm text-cyan-100/70">{description}</p>
      </CardContent>
    </Card>
  )
}

function ContractRow({ name, address }: { name: string; address: string }) {
  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-cyan-100/70">{name}</span>
      <a
        href={getAddressExplorerUrl(address)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-cyan-100/70 transition-colors hover:text-cyan-400"
        title={address}
      >
        {shortAddress}
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  )
}
