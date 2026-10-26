/** Feature comparison with the 0xbow Privacy Pools protocol. */
export function RoadmapComparison() {
  return (
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
          Built for real-world use: freelancers, businesses, and anyone who needs privacy without
          sacrificing compliance.
        </p>
      </div>
    </section>
  )
}
