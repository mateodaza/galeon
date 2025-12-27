'use client'

/**
 * Public receipt verification page.
 *
 * Allows anyone to verify a payment by checking:
 * - Receipt hash matches on-chain anchor
 * - Transaction confirmed on Mantle
 * - Amount and timestamp match
 */

import { useState } from 'react'
import Link from 'next/link'

interface VerificationResult {
  verified: boolean
  receiptHash: string
  amount: string
  token: string
  timestamp: Date
  txHash: string
  blockNumber: number
}

export default function VerifyPage() {
  const [receiptId, setReceiptId] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleVerify = async () => {
    if (!receiptId.trim()) return

    setIsVerifying(true)
    setError(null)
    setResult(null)

    try {
      // TODO: Implement verification
      // 1. Fetch receipt from backend by ID
      // 2. Compute expected receiptHash
      // 3. Query on-chain ReceiptAnchored event
      // 4. Compare values

      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Feature not yet implemented
      setError('Verification is coming soon! This feature is under development.')
    } catch {
      setError('Verification failed. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🚢</span>
          <span className="text-xl font-bold text-zinc-100">Galeon</span>
        </Link>
      </header>

      {/* Main content */}
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="text-center">
            <div className="text-5xl">🔍</div>
            <h1 className="mt-4 text-3xl font-bold text-zinc-100">
              Verify Payment
              <span className="ml-2 inline-block rounded-full bg-amber-600/20 px-2 py-0.5 text-sm font-medium text-amber-400">
                Coming Soon
              </span>
            </h1>
            <p className="mt-2 text-zinc-400">Enter a receipt ID to verify the payment on-chain</p>
          </div>

          {/* Verification form */}
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div>
              <label className="block text-sm font-medium text-zinc-300">Receipt ID</label>
              <input
                type="text"
                value={receiptId}
                onChange={(e) => setReceiptId(e.target.value)}
                placeholder="Enter receipt ID or hash"
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-3 text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <button
              onClick={handleVerify}
              disabled={!receiptId.trim() || isVerifying}
              className="mt-4 w-full rounded-xl bg-emerald-600 py-4 text-lg font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
            >
              {isVerifying ? 'Verifying...' : 'Verify Receipt'}
            </button>
          </div>

          {/* Error display */}
          {error && (
            <div className="mt-6 rounded-lg border border-red-800 bg-red-900/20 p-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Result display */}
          {result && (
            <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    result.verified ? 'bg-emerald-600/20' : 'bg-red-600/20'
                  }`}
                >
                  <span className="text-xl">{result.verified ? '✓' : '✗'}</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-100">
                    {result.verified ? 'Payment Verified' : 'Verification Failed'}
                  </h2>
                  <p className="text-sm text-zinc-400">
                    {result.verified
                      ? 'This payment is confirmed on Mantle'
                      : 'Could not verify this payment'}
                  </p>
                </div>
              </div>

              {result.verified && (
                <div className="mt-6 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Amount</span>
                    <span className="font-medium text-zinc-100">
                      {result.amount} {result.token}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Timestamp</span>
                    <span className="font-medium text-zinc-100">
                      {result.timestamp.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Block</span>
                    <span className="font-medium text-zinc-100">#{result.blockNumber}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Transaction</span>
                    <a
                      href={`https://mantlescan.xyz/tx/${result.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-emerald-400 hover:text-emerald-300"
                    >
                      {result.txHash.slice(0, 10)}...{result.txHash.slice(-8)}
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Info */}
          <p className="mt-6 text-center text-sm text-zinc-500">
            Receipts are anchored on-chain and can be independently verified by anyone.
          </p>
        </div>
      </div>
    </main>
  )
}
