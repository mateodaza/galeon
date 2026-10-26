import Link from 'next/link'

/** "Trust Model & Security": what is trustless, what is trusted, and how privacy is measured. */
export function AboutTrust() {
  return (
    <section className="mt-16">
      <h2 className="text-2xl font-bold text-white">Trust Model &amp; Security</h2>
      <div className="mt-6 space-y-4 leading-relaxed text-cyan-100/70">
        <p>
          We believe privacy tools should minimize trust assumptions. Here&apos;s what you{' '}
          <strong className="text-white">don&apos;t need to trust</strong> and what remains{' '}
          <strong className="text-white">trusted</strong> in the current system.
        </p>

        <div className="mt-6 rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-6">
          <h3 className="font-semibold text-emerald-400">What&apos;s Trustless</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <strong className="text-white">Key management:</strong> Your spending keys are derived
              from your wallet signature and cached locally—never sent to servers. Funds are always
              recoverable with your wallet.
            </li>
            <li>
              <strong className="text-white">Proof generation:</strong> ZK proofs are generated
              client-side in your browser. Your secrets never leave your device.
            </li>
            <li>
              <strong className="text-white">Proof verification:</strong> All ZK proofs are verified
              on-chain by verifier contracts, not trusted from a server.
            </li>
            <li>
              <strong className="text-white">Relayer bypass:</strong> You can always submit
              withdrawals directly to the contract (sacrificing sender privacy but preserving
              self-custody).
            </li>
          </ul>
        </div>

        <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-950/20 p-6">
          <h3 className="font-semibold text-amber-400">Current Trust Assumptions</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <strong className="text-white">ASP (Association Set Provider):</strong> Currently
              operator-controlled for hackathon simplicity. The ASP approves which deposits can
              withdraw (all approved by default). Future: decentralized ASP network with multiple
              independent operators.
            </li>
            <li>
              <strong className="text-white">Contract upgradeability:</strong> Contracts use UUPS
              proxies with admin-controlled upgrades. Plan: time-locked governance.
            </li>
            <li>
              <strong className="text-white">Single relayer:</strong> We operate the only relayer
              for private withdrawals. Plan: permissionless relayer network.
            </li>
            <li>
              <strong className="text-white">Deposit blocklist:</strong> Operators can freeze
              addresses from depositing (compliance requirement). Existing deposits remain
              withdrawable.
            </li>
            <li>
              <strong className="text-white">Local storage:</strong> Keys cached in browser storage.
              Device compromise = key exposure. Use dedicated devices for large amounts.
            </li>
          </ul>
        </div>

        <p className="mt-4">
          This philosophy aligns with the{' '}
          <a
            href="https://trustlessness.eth.limo/general/2025/11/11/the-trustless-manifesto.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300"
          >
            Trustless Manifesto
          </a>
          : measure success by <strong className="text-white">trust reduced per transaction</strong>
          . We&apos;re progressively eliminating each trust assumption as we mature. Read our{' '}
          <Link
            href="/covenant"
            className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300"
          >
            Covenant
          </Link>{' '}
          for our full public commitment.
        </p>

        <div
          id="privacy-metrics"
          className="mt-6 scroll-mt-24 rounded-lg border border-blue-500/20 bg-blue-950/20 p-6"
        >
          <h3 className="font-semibold text-blue-400">How We Measure Privacy</h3>
          <p className="mt-2 text-sm text-blue-100/70">
            The privacy health indicator shows pool activity levels. For everyday transactions like
            paying freelancers or receiving payments, even moderate privacy is plenty. You
            don&apos;t need nation-state level protection to keep your finances private from nosy
            neighbors or curious competitors.
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <strong className="text-white">Deposits:</strong> How many transactions are in the
              pool. More deposits = bigger crowd to blend into.
            </li>
            <li>
              <strong className="text-white">Depositors:</strong> How many different addresses have
              used the pool.
            </li>
            <li>
              <strong className="text-white">Privacy strength:</strong> Our estimate of how well
              your transaction blends in. Even &quot;moderate&quot; privacy is good for most use
              cases.
            </li>
          </ul>
          <p className="mt-3 text-xs text-blue-100/50">
            Technical note: These counts include historical activity and are meant as general
            guidance. For most users, any activity in the pool provides meaningful privacy for
            everyday transactions.
          </p>
        </div>
      </div>
    </section>
  )
}
