'use client'

/**
 * Payment page for payers.
 *
 * Allows anyone to pay to a Port's stealth address.
 * Generates a new stealth address for each payment.
 */

import { use, useState, useEffect, useRef } from 'react'
import { useAppKitAccount } from '@reown/appkit/react'
import { useAccount } from 'wagmi'
import { parseEther } from 'viem'
import { Loader2, ExternalLink, CheckCircle2, XCircle } from 'lucide-react'
import { ConnectButton } from '@/components/wallet-button'
import { AppShell } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getTxExplorerUrl } from '@/lib/chains'
import { usePortMetaAddress, usePayNative } from '@/hooks/use-payment'
import { sentPaymentsApi } from '@/lib/api'

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

  // Track if we've recorded this payment to avoid duplicates
  const recordedTxRef = useRef<string | null>(null)
  // Store payment data at send time (before inputs can change)
  const paymentDataRef = useRef<{
    stealthAddress: `0x${string}`
    amount: string
    memo: string
  } | null>(null)

  // Record sent payment when transaction succeeds
  useEffect(() => {
    if (isSuccess && txHash && recordedTxRef.current !== txHash && paymentDataRef.current) {
      recordedTxRef.current = txHash
      const { stealthAddress, amount: paymentAmount, memo: paymentMemo } = paymentDataRef.current

      // Record the sent payment (fire-and-forget, don't block UI)
      sentPaymentsApi
        .create({
          txHash,
          chainId: chain?.id ?? 5000,
          recipientAddress: stealthAddress, // Use the actual stealth address, not portId
          recipientPortName: portName,
          amount: parseEther(paymentAmount).toString(),
          currency: 'MNT',
          source: 'wallet',
          memo: paymentMemo || undefined, // Use memo from send time, not current state
        })
        .then(() => {
          console.log('[QuickPay] Sent payment recorded:', txHash)
        })
        .catch((err) => {
          // Non-blocking - just log the error
          console.warn('[QuickPay] Failed to record sent payment:', err)
        })
    }
  }, [isSuccess, txHash, chain?.id, portName])

  const handlePay = async () => {
    if (!amount || !isConnected || !metaAddress) return

    setPaymentError(null)

    try {
      // payNative returns the stealth address that received the payment
      const stealthAddress = await payNative(metaAddress, amount, memo, portId as `0x${string}`)
      // Store all payment data at send time for recording after tx confirms
      paymentDataRef.current = { stealthAddress, amount, memo }
    } catch (error) {
      console.error('Payment failed:', error)
      setPaymentError(error instanceof Error ? error.message : 'Payment failed')
    }
  }

  // Show loading while fetching port
  if (isLoadingPort) {
    return (
      <AppShell maxWidth="lg" className="items-center justify-center">
        <div className="flex flex-1 flex-col items-center justify-center p-6">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
          <p className="text-muted-foreground mt-4">Loading port...</p>
        </div>
      </AppShell>
    )
  }

  // Port not found
  if (!portExists) {
    return (
      <AppShell maxWidth="lg" className="items-center justify-center">
        <div className="flex flex-1 flex-col items-center justify-center p-6">
          <XCircle className="text-muted-foreground h-16 w-16" />
          <h1 className="text-foreground mt-4 text-2xl font-bold">Port Not Found</h1>
          <p className="text-muted-foreground mt-2">This payment link may be invalid or expired.</p>
        </div>
      </AppShell>
    )
  }

  if (isSuccess && txHash) {
    return (
      <AppShell maxWidth="lg" className="items-center justify-center">
        <div className="flex flex-1 flex-col items-center justify-center p-6">
          <div className="w-full max-w-md text-center">
            <div className="bg-primary/20 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
              <CheckCircle2 className="text-primary h-8 w-8" />
            </div>
            <h1 className="text-foreground mt-4 text-2xl font-bold">Payment Sent!</h1>
            <p className="text-muted-foreground mt-2">
              Your payment has been submitted to the network.
            </p>

            <Card className="mt-6">
              <CardContent className="pt-4">
                <p className="text-muted-foreground text-sm">Transaction Hash</p>
                <p className="text-foreground mt-1 break-all font-mono text-sm">{txHash}</p>
              </CardContent>
            </Card>

            <a
              href={getTxExplorerUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 mt-4 inline-flex items-center gap-1"
            >
              View on Explorer
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell maxWidth="lg" className="items-center justify-center">
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <h1 className="text-foreground text-2xl font-bold">Pay to {portName}</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  Port ID: {portId.slice(0, 8)}...
                </p>
              </div>

              {!isConnected ? (
                <div className="mt-8 text-center">
                  <p className="text-muted-foreground mb-4">
                    Connect your wallet to make a payment
                  </p>
                  <ConnectButton />
                </div>
              ) : (
                <div className="mt-8 space-y-4">
                  {/* Amount input */}
                  <div>
                    <label className="text-foreground block text-sm font-medium">
                      Amount (MNT)
                    </label>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="mt-1 text-lg"
                    />
                  </div>

                  {/* Memo input */}
                  <div>
                    <label className="text-foreground block text-sm font-medium">
                      Memo (optional)
                    </label>
                    <Input
                      type="text"
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      placeholder="What's this payment for?"
                      className="mt-1"
                    />
                  </div>

                  {/* Network info */}
                  <div className="bg-muted flex items-center justify-between rounded-lg p-3 text-sm">
                    <span className="text-muted-foreground">Network</span>
                    <span className="text-foreground flex items-center gap-2">
                      <span className="bg-primary h-2 w-2 rounded-full" />
                      {chain?.name ?? 'Unknown'}
                    </span>
                  </div>

                  {/* Error display */}
                  {(paymentError || txError) && (
                    <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
                      {paymentError || txError?.message || 'Payment failed'}
                    </div>
                  )}

                  {/* Confirming state */}
                  {isConfirming && (
                    <div className="bg-primary/10 text-primary rounded-lg p-3 text-sm">
                      Waiting for confirmation...
                    </div>
                  )}

                  {/* Pay button */}
                  <Button
                    onClick={handlePay}
                    disabled={!amount || isProcessing}
                    size="lg"
                    className="w-full"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Confirm in wallet...
                      </>
                    ) : isConfirming ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      `Pay ${amount || '0'} MNT`
                    )}
                  </Button>

                  <p className="text-muted-foreground text-center text-xs">
                    Payment is sent to a stealth address for privacy
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
