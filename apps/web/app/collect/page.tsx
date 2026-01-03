'use client'

/**
 * Collection page for withdrawing funds from stealth addresses.
 *
 * Supports:
 * - Collect All: Scans all Ports and collects all pending payments
 * - Collect by Port: Select specific Ports to collect from
 */

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useAccount } from 'wagmi'
import { isAddress } from 'viem'
import { Loader2, ExternalLink, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { AppShell, PageHeader } from '@/components/layout'
import { getTxExplorerUrl } from '@/lib/chains'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useCollection } from '@/hooks/use-collection'

export default function CollectPage() {
  const { address: connectedAddress } = useAccount()
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
    hasKeys,
  } = useCollection()

  const [useCustomRecipient, setUseCustomRecipient] = useState(false)
  const hasScanned = useRef(false)

  // Auto-scan on page load when keys are available
  useEffect(() => {
    if (hasKeys && !hasScanned.current && !isScanning) {
      hasScanned.current = true
      scan()
    }
  }, [hasKeys, isScanning, scan])
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

  // Show success screen after collection
  if (collectTxHashes.length > 0) {
    return (
      <AppShell requireAuth requireKeys maxWidth="lg" className="items-center justify-center">
        <div className="flex flex-1 flex-col items-center justify-center p-6">
          <div className="w-full max-w-md text-center">
            <div className="bg-primary/20 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
              <CheckCircle2 className="text-primary h-8 w-8" />
            </div>
            <h1 className="text-foreground mt-4 text-2xl font-bold">Collection Complete!</h1>
            <p className="text-muted-foreground mt-2">
              {collectTxHashes.length} transaction{collectTxHashes.length > 1 ? 's' : ''} sent to{' '}
              {recipientAddress ? (
                <span className="text-foreground font-mono">
                  {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}
                </span>
              ) : (
                'your wallet'
              )}
            </p>

            <div className="mt-6 space-y-3">
              {collectTxHashes.map((hash, i) => (
                <Card key={hash}>
                  <CardContent className="pt-4">
                    <p className="text-muted-foreground text-sm">Transaction {i + 1}</p>
                    <p className="text-foreground mt-1 break-all font-mono text-xs">{hash}</p>
                    <a
                      href={getTxExplorerUrl(hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 mt-2 inline-flex items-center gap-1 text-sm"
                    >
                      View on Explorer
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button asChild className="mt-6 w-full">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell requireAuth requireKeys>
      <PageHeader
        title="Collect Funds"
        description="View pending payments and withdraw to your wallet."
      />

      {/* Scan error */}
      {scanError && (
        <Card className="border-destructive/50 mt-8">
          <CardContent className="pt-6">
            <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
              {scanError}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results section */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <h2 className="text-foreground text-lg font-semibold">Available to Collect</h2>

          {payments.length === 0 && dustPayments.length === 0 ? (
            <div className="text-muted-foreground mt-4 text-center">
              {isScanning ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="text-primary h-8 w-8 animate-spin" />
                  <p>Scanning announcements...</p>
                </div>
              ) : (
                <p>No pending payments found.</p>
              )}
            </div>
          ) : payments.length === 0 && dustPayments.length > 0 ? (
            <div className="text-muted-foreground mt-4 text-center">
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
                    className="bg-muted flex items-center justify-between rounded-lg p-3"
                  >
                    <div>
                      <p className="text-foreground font-mono text-sm">
                        {payment.stealthAddress.slice(0, 10)}...{payment.stealthAddress.slice(-8)}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Block #{payment.blockNumber.toString()}
                      </p>
                    </div>
                    <p className="text-foreground font-semibold">{payment.balanceFormatted} MNT</p>
                  </div>
                ))}
              </div>

              {/* Collect error */}
              {collectError && (
                <div className="bg-destructive/10 text-destructive mt-4 rounded-lg p-3 text-sm">
                  {collectError}
                </div>
              )}

              {/* Total and collect button */}
              <div className="mt-6 border-t pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">Total Available</p>
                  <p className="text-foreground text-xl font-bold">{totalBalanceFormatted} MNT</p>
                </div>

                {/* Recipient toggle */}
                <div className="mt-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={useCustomRecipient}
                      onChange={(e) => setUseCustomRecipient(e.target.checked)}
                      className="border-input bg-background text-primary focus:ring-primary h-4 w-4 rounded"
                    />
                    <span className="text-muted-foreground text-sm">Send to different address</span>
                  </label>

                  {useCustomRecipient && (
                    <div className="mt-3">
                      <Input
                        type="text"
                        value={customRecipient}
                        onChange={(e) => setCustomRecipient(e.target.value)}
                        placeholder="0x..."
                        className={`font-mono ${
                          customRecipient && !isValidRecipient
                            ? 'border-destructive focus-visible:ring-destructive'
                            : ''
                        }`}
                      />
                      {customRecipient && !isValidRecipient && (
                        <p className="text-destructive mt-1 text-xs">Invalid address</p>
                      )}
                      {customRecipient && isValidRecipient && (
                        <p className="text-muted-foreground mt-1 text-xs">
                          Funds will be sent to this address
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleCollect}
                  disabled={isCollecting || payments.length === 0 || !isValidRecipient}
                  size="lg"
                  className="mt-4 w-full"
                >
                  {isCollecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Collecting...
                    </>
                  ) : (
                    'Collect All'
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dust payments section - below minimum threshold */}
      {dustPayments.length > 0 && (
        <Card className="mt-6 border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                  {dustPayments.length} Payment{dustPayments.length > 1 ? 's' : ''} Below Minimum
                </h3>
                <p className="mt-1 text-sm text-amber-700 dark:text-amber-300/70">
                  These payments have less than {minimumCollectableFormatted} MNT and would cost
                  more in gas to collect than they&apos;re worth on Mantle L2.
                </p>
              </div>
              <p className="font-semibold text-amber-800 dark:text-amber-200">
                {totalDustBalanceFormatted} MNT
              </p>
            </div>

            <div className="mt-4 space-y-2">
              {dustPayments.map((payment, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-amber-100 p-3 dark:bg-amber-900/20"
                >
                  <div>
                    <p className="font-mono text-sm text-amber-800 dark:text-amber-200/80">
                      {payment.stealthAddress.slice(0, 10)}...{payment.stealthAddress.slice(-8)}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-300/50">
                      Block #{payment.blockNumber.toString()}
                    </p>
                  </div>
                  <p className="font-semibold text-amber-800 dark:text-amber-200/80">
                    {payment.balanceFormatted} MNT
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-amber-600 dark:text-amber-300/50">
              Tip: Send at least {minimumCollectableFormatted} MNT per payment to cover
              Mantle&apos;s L1 data costs.
            </p>
          </CardContent>
        </Card>
      )}
    </AppShell>
  )
}
