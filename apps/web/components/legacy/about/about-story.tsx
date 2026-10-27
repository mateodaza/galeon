import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/** Opening of the previous About page: the San José story and the three features. */
export function AboutStory() {
  return (
    <>
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
            precious artifacts worth an estimated $4-17 billion USD descended into the Caribbean
            depths, hidden from the world for over three centuries.
          </p>
          <p>
            The San José was the flagship of the Spanish Tierra Firme fleet, making it a prime
            target during the War of Spanish Succession. A British squadron ambushed the fleet, and
            the San José exploded and sank in minutes, taking nearly 600 crew members and its
            legendary cargo to the seafloor.
          </p>
          <p>
            When the Colombian Navy located the wreck in 2015 at a depth of around 600 meters, they
            found something remarkable: the treasure was still there, undisturbed, protected by
            nothing but obscurity and depth.
          </p>
        </div>
      </section>

      {/* The Connection */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold text-white">Hidden in Plain Sight</h2>
        <div className="mt-6 space-y-4 leading-relaxed text-cyan-100/70">
          <p>
            <strong className="text-cyan-400">Galeon</strong> (Spanish for &quot;galleon&quot;)
            draws its name and philosophy from this legendary ship. Just as the San José&apos;s
            treasure lay protected for centuries, visible on sonar but unreachable, your payments on
            Galeon exist on a public blockchain yet remain unlinkable to your identity.
          </p>
          <p>
            We use <strong className="text-white">stealth addresses</strong>, a cryptographic
            technique that generates a unique, one-time address for every payment. Observers can see
            that transactions occurred, but they cannot determine who received them. Your treasure,
            hidden in plain sight.
          </p>
          <p>
            <strong className="text-white">Ports</strong> protect receivers.{' '}
            <strong className="text-white">Privacy Pool</strong> protects senders.{' '}
            <strong className="text-white">Shipwreck Reports</strong> keep you compliant. Privacy
            and compliance, not privacy vs compliance.
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
            description="Create payment links for invoices, freelance work, or donations. Share with clients. Each payment generates a fresh stealth address that only you can access. Separate Ports for separate income streams."
          />
          <FeatureBlock
            number="02"
            title="Privacy Pool (Sender Privacy)"
            description="Pay suppliers, contractors, or vendors without revealing your full treasury. Deposit to the pool, withdraw to any address with a ZK proof, so the withdrawal can't be linked on-chain back to your deposit."
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
            Stealth addresses solve <strong className="text-white">receiving privacy</strong>: no
            one can link payments to your identity. But what happens when you spend those funds? The
            blockchain creates a trail from your stealth address to wherever you send money next.
          </p>
          <p>
            The <strong className="text-cyan-400">Privacy Pool</strong> solves this with{' '}
            <strong className="text-white">sending privacy</strong>. Deposit funds into a shared
            pool, then withdraw to any address using a zero-knowledge proof. The proof
            cryptographically proves you deposited funds without revealing which deposit is yours.
            The link is broken.
          </p>
          <p>
            Built on <strong className="text-white">0xBow&apos;s Privacy Pools protocol</strong>,
            our implementation uses Merkle trees to track deposits and ZK-SNARKs for withdrawals.
            Each withdrawal proves: (1) you have a valid deposit in the tree, and (2) you
            haven&apos;t withdrawn it before. All without revealing which deposit.
          </p>
          <p>
            <strong className="text-white">Comprehensive financial privacy</strong> requires both:
            stealth addresses hide who received a payment, and the Privacy Pool hides what you do
            with that money afterward.
          </p>
        </div>
      </section>
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
