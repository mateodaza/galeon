import { ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getAddressExplorerUrl } from '@/lib/chains'

/** "Built on Standards": the standards grid and the deployed contract addresses. */
export function AboutStandards() {
  return (
    <section className="mt-16">
      <h2 className="text-2xl font-bold text-white">Built on Standards</h2>
      <div className="mt-6 space-y-4 leading-relaxed text-cyan-100/70">
        <p>
          We didn&apos;t invent new cryptography. We assembled established standards into one
          privacy system.
        </p>
      </div>

      {/* Standards Grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-slate-800/30 p-5">
          <h3 className="font-semibold text-white">Stealth Addresses</h3>
          <p className="mt-2 text-sm text-cyan-100/70">
            <strong className="text-cyan-400">EIP-5564</strong> for announcements and{' '}
            <strong className="text-cyan-400">EIP-6538</strong> for meta-address registry. The
            Ethereum standards for receiver privacy.
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
            <code className="rounded bg-slate-800 px-1 text-xs text-cyan-400">@noble/curves</code>{' '}
            and{' '}
            <code className="rounded bg-slate-800 px-1 text-xs text-cyan-400">@noble/hashes</code>{' '}
            for audited secp256k1 and hashing implementations.
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-slate-800/30 p-5">
          <h3 className="font-semibold text-white">Deployed on Mantle</h3>
          <p className="mt-2 text-sm text-cyan-100/70">
            Ethereum L2 with low fees and fast finality. Privacy on mainnet costs $20-40 per tx. On
            Mantle, it costs cents.
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
