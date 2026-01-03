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
    <main className="bg-background flex min-h-screen flex-col">
      <FloatingNav variant="light" />

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 pb-16 pt-24">
        {/* Hero */}
        <h1 className="text-foreground text-4xl font-bold sm:text-5xl">
          The Legend of <span className="text-primary">Galeon</span>
        </h1>
        <p className="text-muted-foreground mt-4 text-lg">
          Where ancient treasure meets modern cryptography.
        </p>

        {/* The Lore */}
        <section className="mt-16">
          <h2 className="text-foreground text-2xl font-bold">The San José</h2>
          <div className="text-muted-foreground mt-6 space-y-4 leading-relaxed">
            <p>
              On June 8, 1708, the <em className="text-foreground">San José</em>, a Spanish galleon
              carrying one of the largest treasure hoards ever assembled, sank off the coast of
              Cartagena, Colombia. Gold coins, silver bars, emeralds from Colombian mines, and
              precious artifacts worth an estimated $4-17 billion USD descended into the Caribbean
              depths, hidden from the world for over three centuries.
            </p>
            <p>
              The San José was the flagship of the Spanish Tierra Firme fleet, making it a prime
              target during the War of Spanish Succession. A British squadron ambushed the fleet,
              and the San José exploded and sank in minutes, taking nearly 600 crew members and its
              legendary cargo to the seafloor.
            </p>
            <p>
              When the Colombian Navy located the wreck in 2015 at a depth of around 600 meters,
              they found something remarkable: the treasure was still there, undisturbed, protected
              by nothing but obscurity and depth.
            </p>
          </div>
        </section>

        {/* The Connection */}
        <section className="mt-16">
          <h2 className="text-foreground text-2xl font-bold">Hidden in Plain Sight</h2>
          <div className="text-muted-foreground mt-6 space-y-4 leading-relaxed">
            <p>
              <strong className="text-primary">Galeon</strong> (Spanish for &quot;galleon&quot;)
              draws its name and philosophy from this legendary ship. Just as the San José&apos;s
              treasure lay protected for centuries, visible on sonar but unreachable, your payments
              on Galeon exist on a public blockchain yet remain unlinkable to your identity.
            </p>
            <p>
              We use <strong className="text-foreground">stealth addresses</strong>, a cryptographic
              technique that generates a unique, one-time address for every payment. Observers can
              see that transactions occurred, but they cannot determine who received them. Your
              treasure, hidden in plain sight.
            </p>
            <p>
              <strong className="text-foreground">Ports</strong> protect receivers.{' '}
              <strong className="text-foreground">Fog Mode</strong> protects senders.{' '}
              <strong className="text-foreground">Shipwreck Reports</strong> let you prove ownership
              when needed.
            </p>
          </div>
        </section>

        {/* How It Works */}
        <section className="mt-16">
          <h2 className="text-foreground text-2xl font-bold">How Galeon Works</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <FeatureBlock
              number="01"
              title="Ports (Receiver Privacy)"
              description="Create named payment endpoints with unique cryptographic keys. Each Port is an isolated identity, so payments to one can never be linked to another."
            />
            <FeatureBlock
              number="02"
              title="Stealth Addresses"
              description="When someone pays you, they generate a fresh address using your public keys. Only you can derive the private key to collect those funds."
            />
            <FeatureBlock
              number="03"
              title="Fog Mode (Sender Privacy)"
              description="Pay from pre-funded stealth wallets to break timing correlation. Instant payments stay on-device; scheduled payments use optional, time-bound backend delegation."
            />
            <FeatureBlock
              number="04"
              title="Shipwreck Reports (Compliance)"
              description="Need to prove ownership? Generate cryptographic proofs that demonstrate you control specific addresses without revealing anything else."
            />
          </div>
        </section>

        {/* Technical Foundation */}
        <section className="mt-16">
          <h2 className="text-foreground text-2xl font-bold">Built on Standards</h2>
          <div className="text-muted-foreground mt-6 space-y-4 leading-relaxed">
            <p>
              Galeon implements <strong className="text-foreground">EIP-5564</strong> (Stealth
              Address Announcements) and <strong className="text-foreground">EIP-6538</strong>{' '}
              (Stealth Meta-Address Registry), the Ethereum standards for stealth addresses.
              We&apos;re deployed on <strong className="text-foreground">Mantle</strong>, an L2 that
              provides low fees and fast finality, which is essential for practical private
              payments.
            </p>
            <p>
              All cryptographic operations use{' '}
              <code className="bg-muted text-primary rounded px-1.5 py-0.5 font-mono text-sm">
                @noble/curves
              </code>{' '}
              and{' '}
              <code className="bg-muted text-primary rounded px-1.5 py-0.5 font-mono text-sm">
                @noble/hashes
              </code>
              , audited implementations of secp256k1 and related primitives. Your keys never touch a
              server. They&apos;re derived on-demand from your wallet signature.
            </p>
          </div>

          {/* Contract Addresses */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-lg">Mantle Mainnet Contracts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 font-mono text-sm">
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
        </section>

        {/* Colombian Pride */}
        <section className="border-primary/20 bg-accent mt-16 rounded-xl border p-8">
          <div className="flex items-start gap-4">
            <span className="text-4xl">🇨🇴</span>
            <div>
              <h2 className="text-primary text-xl font-bold">Made with Colombian Pride</h2>
              <p className="text-muted-foreground mt-2">
                The San José rests in Colombian waters, a treasure that belongs to our heritage.
                Galeon carries that spirit forward, building technology that protects what&apos;s
                yours, from a team proud of where we come from.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-16 text-center">
          <h2 className="text-foreground text-2xl font-bold">Ready to sail?</h2>
          <p className="text-muted-foreground mt-2">
            Privacy when you send. Privacy when you receive.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" asChild>
              <Link href="/setup">Get Started</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="text-muted-foreground mt-auto border-t px-6 py-6 text-center text-sm">
        Built for Mantle Global Hackathon 2025
      </footer>
    </main>
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
    <Card>
      <CardContent className="pt-6">
        <Badge variant="secondary" className="text-primary font-bold">
          {number}
        </Badge>
        <h3 className="text-foreground mt-3 text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground mt-2 text-sm">{description}</p>
      </CardContent>
    </Card>
  )
}

function ContractRow({ name, address }: { name: string; address: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-muted-foreground">{name}</span>
      <a
        href={getAddressExplorerUrl(address)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 truncate transition-colors"
      >
        {address}
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  )
}
