'use client'

/**
 * Payment page for payers.
 *
 * Allows anyone to pay to a Port's stealth address.
 * Generates a new stealth address for each payment.
 */

import { use, useState } from 'react'
import { useAppKitAccount } from '@reown/appkit/react'
import { useAccount } from 'wagmi'
import { WalletButton, ConnectButton } from '@/components/wallet-button'
import { usePortMetaAddress, usePayNative } from '@/hooks/use-payment'

interface PayPageProps {
  params: Promise<{
    portId: string
  }>
}

export default function PayPage({ params }: PayPageProps) {
  const { portId } = use(params)
  const { isConnected } = useAppKitAccount()
  const { chain } = useAccount()

  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [paymentError, setPaymentError] = useState<string | null>(null)

  // Fetch port meta-address from chain
  const { metaAddress, isLoading: isLoadingPort } = usePortMetaAddress(portId as `0x${string}`)

  // Payment hook
  const {
    payNative,
    hash: txHash,
    isPending,
    isConfirming,
    isSuccess,
    error: txError,
  } = usePayNative()

  const portExists = !isLoadingPort && !!metaAddress
  const portName = 'Port'
  const isProcessing = isPending || isConfirming

  const handlePay = async () => {
    if (!amount || !isConnected || !metaAddress) return

    setPaymentError(null)

    try {
      await payNative(metaAddress, amount, memo)
    } catch (error) {
      console.error('Payment failed:', error)
      setPaymentError(error instanceof Error ? error.message : 'Payment failed')
    }
  }

  // Show loading while fetching port
  if (isLoadingPort) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        <p className="mt-4 text-zinc-400">Loading port...</p>
      </main>
    )
  }

  // Port not found
  if (!portExists) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="text-5xl">🚫</div>
        <h1 className="mt-4 text-2xl font-bold text-zinc-100">Port Not Found</h1>
        <p className="mt-2 text-zinc-400">This payment link may be invalid or expired.</p>
      </main>
    )
  }

  if (isSuccess && txHash) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600/20 text-3xl">
            ✓
          </div>
          <h1 className="mt-4 text-2xl font-bold text-zinc-100">Payment Sent!</h1>
          <p className="mt-2 text-zinc-400">Your payment has been submitted to the network.</p>

          <div className="mt-6 rounded-lg bg-zinc-800/50 p-4">
            <p className="text-sm text-zinc-400">Transaction Hash</p>
            <p className="mt-1 break-all font-mono text-sm text-zinc-100">{txHash}</p>
          </div>

          <a
            href={`https://mantlescan.xyz/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-emerald-400 hover:text-emerald-300"
          >
            View on Mantlescan →
          </a>
        </div>
      </main>
    )
  }

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

      {/* Main content */}
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-zinc-100">Pay to {portName}</h1>
              <p className="mt-1 text-sm text-zinc-400">Port ID: {portId.slice(0, 8)}...</p>
            </div>

            {!isConnected ? (
              <div className="mt-8 text-center">
                <p className="mb-4 text-zinc-400">Connect your wallet to make a payment</p>
                <ConnectButton />
              </div>
            ) : (
              <div className="mt-8 space-y-4">
                {/* Amount input */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300">Amount (MNT)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-3 text-lg text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Memo input */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300">Memo (optional)</label>
                  <input
                    type="text"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="What's this payment for?"
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Network info */}
                <div className="flex items-center justify-between rounded-lg bg-zinc-800/50 p-3 text-sm">
                  <span className="text-zinc-400">Network</span>
                  <span className="flex items-center gap-2 text-zinc-100">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {chain?.name ?? 'Unknown'}
                  </span>
                </div>

                {/* Error display */}
                {(paymentError || txError) && (
                  <div className="rounded-lg bg-red-900/20 p-3 text-sm text-red-400">
                    {paymentError || txError?.message || 'Payment failed'}
                  </div>
                )}

                {/* Confirming state */}
                {isConfirming && (
                  <div className="rounded-lg bg-emerald-900/20 p-3 text-sm text-emerald-400">
                    Waiting for confirmation...
                  </div>
                )}

                {/* Pay button */}
                <button
                  onClick={handlePay}
                  disabled={!amount || isProcessing}
                  className="w-full rounded-xl bg-emerald-600 py-4 text-lg font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isPending
                    ? 'Confirm in wallet...'
                    : isConfirming
                      ? 'Confirming...'
                      : `Pay ${amount || '0'} MNT`}
                </button>

                <p className="text-center text-xs text-zinc-500">
                  Payment is sent to a stealth address for privacy
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
