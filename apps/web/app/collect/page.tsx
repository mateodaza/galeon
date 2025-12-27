'use client'

/**
 * Collection page for withdrawing funds from stealth addresses.
 *
 * Supports:
 * - Collect All: Scans all Ports and collects all pending payments
 * - Collect by Port: Select specific Ports to collect from
 */

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppKitAccount } from '@reown/appkit/react'
import { useAccount } from 'wagmi'
import { isAddress } from 'viem'
import { WalletButton } from '@/components/wallet-button'
import { useCollection } from '@/hooks/use-collection'
import { useStealthContext } from '@/contexts/stealth-context'

export default function CollectPage() {
  const router = useRouter()
  const { isConnected } = useAppKitAccount()
  const { address: connectedAddress } = useAccount()
  const { hasKeys } = useStealthContext()
  const {
    payments,
    dustPayments,
    totalBalanceFormatted,
    totalDustBalanceFormatted,
    minimumCollectableFormatted,
    isScanning,
    isCollecting,
    scanError,
    collectError,
    collectTxHashes,
    scan,
    collectAll,
  } = useCollection()

  const [useCustomRecipient, setUseCustomRecipient] = useState(false)
  const [customRecipient, setCustomRecipient] = useState('')

  const isValidRecipient = !useCustomRecipient || isAddress(customRecipient)
  const recipientAddress =
    useCustomRecipient && customRecipient ? customRecipient : connectedAddress

  const handleCollect = () => {
    if (useCustomRecipient && customRecipient) {
      collectAll(customRecipient as `0x${string}`)
    } else {
      collectAll()
    }
  }

  // Redirect to setup if not connected or keys not derived
  useEffect(() => {
    if (!isConnected) {
      router.push('/setup')
    } else if (!hasKeys) {
      router.push('/setup')
    }
  }, [isConnected, hasKeys, router])

  if (!isConnected || !hasKeys) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <p className="mb-4 text-zinc-400">Redirecting to setup...</p>
      </main>
    )
  }

  // Show success screen after collection
  if (collectTxHashes.length > 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600/20 text-3xl">
            ✓
          </div>
          <h1 className="mt-4 text-2xl font-bold text-zinc-100">Collection Complete!</h1>
          <p className="mt-2 text-zinc-400">
            {collectTxHashes.length} transaction{collectTxHashes.length > 1 ? 's' : ''} sent to{' '}
            {recipientAddress ? (
              <span className="font-mono text-zinc-300">
                {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}
              </span>
            ) : (
              'your wallet'
            )}
          </p>

          <div className="mt-6 space-y-3">
            {collectTxHashes.map((hash, i) => (
              <div key={hash} className="rounded-lg bg-zinc-800/50 p-4">
                <p className="text-sm text-zinc-400">Transaction {i + 1}</p>
                <p className="mt-1 break-all font-mono text-xs text-zinc-100">{hash}</p>
                <a
                  href={`https://mantlescan.xyz/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm text-emerald-400 hover:text-emerald-300"
                >
                  View on Mantlescan →
                </a>
              </div>
            ))}
          </div>

          <Link
            href="/dashboard"
            className="mt-6 block rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-500"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🚢</span>
            <span className="text-xl font-bold text-zinc-100">Galeon</span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink href="/dashboard">Dashboard</NavLink>
            <NavLink href="/dashboard/ports">Ports</NavLink>
            <NavLink href="/collect" active>
              Collect
            </NavLink>
          </nav>
        </div>
        <WalletButton />
      </header>

      {/* Main content */}
      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-bold text-zinc-100">Collect Funds</h1>
          <p className="mt-1 text-zinc-400">
            Scan your Ports for pending payments and withdraw to your wallet.
          </p>

          {/* Scan section */}
          <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">Scan for Payments</h2>
                <p className="text-sm text-zinc-400">
                  Check all your Ports for uncollected payments
                </p>
              </div>
              <button
                onClick={scan}
                disabled={isScanning}
                className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-700 disabled:opacity-50"
              >
                {isScanning ? 'Scanning...' : 'Scan Now'}
              </button>
            </div>

            {/* Scan error */}
            {scanError && (
              <div className="mt-4 rounded-lg bg-red-900/20 p-3 text-sm text-red-400">
                {scanError}
              </div>
            )}
          </div>

          {/* Results section */}
          <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="text-lg font-semibold text-zinc-100">Available to Collect</h2>

            {payments.length === 0 && dustPayments.length === 0 ? (
              <div className="mt-4 text-center text-zinc-500">
                {isScanning ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-500" />
                    <p>Scanning announcements...</p>
                  </div>
                ) : (
                  <p>No pending payments found. Click &quot;Scan Now&quot; to check.</p>
                )}
              </div>
            ) : payments.length === 0 && dustPayments.length > 0 ? (
              <div className="mt-4 text-center text-zinc-500">
                <p>No collectable payments found.</p>
                <p className="mt-2 text-sm">
                  {dustPayments.length} payment{dustPayments.length > 1 ? 's' : ''} below minimum
                  threshold (see below).
                </p>
              </div>
            ) : (
              <>
                {/* Payment list */}
                <div className="mt-4 space-y-2">
                  {payments.map((payment, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-zinc-800/50 p-3"
                    >
                      <div>
                        <p className="font-mono text-sm text-zinc-100">
                          {payment.stealthAddress.slice(0, 10)}...{payment.stealthAddress.slice(-8)}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Block #{payment.blockNumber.toString()}
                        </p>
                      </div>
                      <p className="font-semibold text-zinc-100">{payment.balanceFormatted} MNT</p>
                    </div>
                  ))}
                </div>

                {/* Collect error */}
                {collectError && (
                  <div className="mt-4 rounded-lg bg-red-900/20 p-3 text-sm text-red-400">
                    {collectError}
                  </div>
                )}

                {/* Total and collect button */}
                <div className="mt-6 border-t border-zinc-800 pt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-zinc-400">Total Available</p>
                    <p className="text-xl font-bold text-zinc-100">{totalBalanceFormatted} MNT</p>
                  </div>

                  {/* Recipient toggle */}
                  <div className="mt-4">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={useCustomRecipient}
                        onChange={(e) => setUseCustomRecipient(e.target.checked)}
                        className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-zinc-400">Send to different address</span>
                    </label>

                    {useCustomRecipient && (
                      <div className="mt-3">
                        <input
                          type="text"
                          value={customRecipient}
                          onChange={(e) => setCustomRecipient(e.target.value)}
                          placeholder="0x..."
                          className={`w-full rounded-lg border bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 ${
                            customRecipient && !isValidRecipient
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                              : 'border-zinc-700 focus:border-emerald-500 focus:ring-emerald-500'
                          }`}
                        />
                        {customRecipient && !isValidRecipient && (
                          <p className="mt-1 text-xs text-red-400">Invalid address</p>
                        )}
                        {customRecipient && isValidRecipient && (
                          <p className="mt-1 text-xs text-zinc-500">
                            Funds will be sent to this address
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleCollect}
                    disabled={isCollecting || payments.length === 0 || !isValidRecipient}
                    className="mt-4 w-full rounded-xl bg-emerald-600 py-4 text-lg font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {isCollecting ? 'Collecting...' : 'Collect All'}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Dust payments section - below minimum threshold */}
          {dustPayments.length > 0 && (
            <div className="mt-6 rounded-xl border border-amber-900/50 bg-amber-900/10 p-6">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-200">
                    {dustPayments.length} Payment{dustPayments.length > 1 ? 's' : ''} Below Minimum
                  </h3>
                  <p className="mt-1 text-sm text-amber-300/70">
                    These payments have less than {minimumCollectableFormatted} MNT and would cost
                    more in gas to collect than they&apos;re worth on Mantle L2.
                  </p>
                </div>
                <p className="font-semibold text-amber-200">{totalDustBalanceFormatted} MNT</p>
              </div>

              <div className="mt-4 space-y-2">
                {dustPayments.map((payment, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-amber-900/20 p-3"
                  >
                    <div>
                      <p className="font-mono text-sm text-amber-200/80">
                        {payment.stealthAddress.slice(0, 10)}...{payment.stealthAddress.slice(-8)}
                      </p>
                      <p className="text-xs text-amber-300/50">
                        Block #{payment.blockNumber.toString()}
                      </p>
                    </div>
                    <p className="font-semibold text-amber-200/80">
                      {payment.balanceFormatted} MNT
                    </p>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-xs text-amber-300/50">
                Tip: Send at least {minimumCollectableFormatted} MNT per payment to cover
                Mantle&apos;s L1 data costs.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

function NavLink({
  href,
  children,
  active = false,
}: {
  href: string
  children: React.ReactNode
  active?: boolean
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
      }`}
    >
      {children}
    </Link>
  )
}
