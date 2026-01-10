'use client'

/**
 * Per-port collection content - loaded dynamically to avoid SSR BigInt issues.
 */

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useRef, useState, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { isAddress, formatEther } from 'viem'
import {
  Loader2,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Shield,
  Wallet,
  ArrowLeft,
  Anchor,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
} from 'lucide-react'
import { AppShell } from '@/components/layout'
import { getTxExplorerUrl } from '@/lib/chains'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useCollection, type CollectablePayment } from '@/hooks/use-collection'

/**
 * Format a bigint wei value to a human-readable string with limited decimals.
 */
function formatMnt(wei: bigint, maxDecimals = 4): string {
  const formatted = formatEther(wei)
  const num = parseFloat(formatted)
  if (num === 0) return '0'
  if (num < 0.0001) return '<0.0001'
  return num.toLocaleString('en-US', { maximumFractionDigits: maxDecimals })
}

export default function CollectPortContent() {
  const params = useParams()
  const portId = params.id as string

  const { address: connectedAddress } = useAccount()
  const {
    payments: allPayments,
    dustPayments: allDustPayments,
    isScanning,
    isCollecting,
    isDepositingToPool,
    scanError,
    collectError,
    collectTxHashes,
    scan,
    collectAll,
    collectToPool,
    hasKeys,
    hasPoolKeys,
    willMergeDeposit,
    preflight,
    isLoadingPreflight,
    runPoolPreflight,
    depositProgress,
    depositResults,
    calculatePoolDepositStats,
  } = useCollection()

  // Filter payments for this specific port
  const payments = useMemo(
    () => allPayments.filter((p) => p.portId === portId),
    [allPayments, portId]
  )
  const dustPayments = useMemo(
    () => allDustPayments.filter((p) => p.portId === portId),
    [allDustPayments, portId]
  )

  // Get port label from first payment
  const portLabel = payments[0]?.portLabel || dustPayments[0]?.portLabel || 'Port'

  // Calculate totals for this port only
  const totalBalance = useMemo(() => payments.reduce((sum, p) => sum + p.balance, 0n), [payments])
  const totalBalanceFormatted = formatMnt(totalBalance)

  const totalVerifiedBalance = useMemo(
    () =>
      payments.reduce((sum, p) => {
        const cappedVerified = p.verifiedBalance > p.balance ? p.balance : p.verifiedBalance
        return sum + cappedVerified
      }, 0n),
    [payments]
  )
  const totalVerifiedBalanceFormatted = formatMnt(totalVerifiedBalance)

  const totalDustBalance = useMemo(
    () => dustPayments.reduce((sum, p) => sum + p.balance, 0n),
    [dustPayments]
  )
  const totalDustBalanceFormatted = formatMnt(totalDustBalance)

  const hasPoolDepositable = payments.some((p) => p.canDepositToPool)

  // Destination: 'pool' or 'external'
  const [destination, setDestination] = useState<'pool' | 'external'>('pool')
  const [externalAddress, setExternalAddress] = useState('')
  const [amountInput, setAmountInput] = useState('')
  const [isDustExpanded, setIsDustExpanded] = useState(false)
  const hasScanned = useRef(false)
  const prevHasKeys = useRef(hasKeys)

  // Reset scan flag when keys change
  useEffect(() => {
    if (prevHasKeys.current && !hasKeys) {
      hasScanned.current = false
    }
    prevHasKeys.current = hasKeys
  }, [hasKeys])

  // Auto-scan on page load
  useEffect(() => {
    if (hasKeys && !hasScanned.current && !isScanning) {
      hasScanned.current = true
      scan()
    }
  }, [hasKeys, isScanning, scan])

  // Run preflight for pool deposits
  useEffect(() => {
    if (destination === 'pool' && willMergeDeposit && hasPoolDepositable && payments.length > 0) {
      runPoolPreflight()
    }
  }, [destination, willMergeDeposit, hasPoolDepositable, payments.length, runPoolPreflight])

  // Retry countdown
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null)

  useEffect(() => {
    if (preflight && !preflight.canProceed && preflight.retryAfterMs) {
      setRetryCountdown(Math.ceil(preflight.retryAfterMs / 1000))
    } else {
      setRetryCountdown(null)
    }
  }, [preflight])

  useEffect(() => {
    if (retryCountdown === null || retryCountdown <= 0) return
    const timer = setTimeout(() => setRetryCountdown(retryCountdown - 1), 1000)
    return () => clearTimeout(timer)
  }, [retryCountdown])

  useEffect(() => {
    if (retryCountdown === 0 && destination === 'pool') {
      runPoolPreflight()
    }
  }, [retryCountdown, destination, runPoolPreflight])

  // Pool deposit stats
  const poolStats = useMemo(
    () => calculatePoolDepositStats(payments),
    [calculatePoolDepositStats, payments]
  )

  const maxForPool = parseFloat(poolStats.totalMaxDepositFormatted) || 0
  const maxForExternal = parseFloat(totalBalanceFormatted) || 0
  const maxAmount = destination === 'pool' ? maxForPool : maxForExternal

  const enteredAmount = parseFloat(amountInput) || 0
  const isValidAmount = amountInput === '' || (enteredAmount > 0 && enteredAmount <= maxAmount)
  const effectiveAmount = amountInput === '' ? maxAmount : enteredAmount
  const isValidAddress = destination === 'pool' || isAddress(externalAddress)

  const handleSend = () => {
    const amount = amountInput ? parseFloat(amountInput) : undefined
    if (destination === 'external' && externalAddress) {
      collectAll(externalAddress as `0x${string}`, amount, portId)
    } else if (destination === 'pool') {
      collectToPool(amount, portId)
    }
  }

  // Success screen
  if (collectTxHashes.length > 0) {
    return (
      <AppShell requireAuth requireKeys maxWidth="lg" className="items-center justify-center">
        <div className="flex flex-1 flex-col items-center justify-center p-4">
          <div className="w-full max-w-md text-center">
            <div className="bg-primary/20 mx-auto flex h-14 w-14 items-center justify-center rounded-full">
              <CheckCircle2 className="text-primary h-7 w-7" />
            </div>
            <h1 className="text-foreground mt-3 text-xl font-bold">
              {destination === 'pool' ? 'Deposited to Pool!' : 'Sent Successfully!'}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {collectTxHashes.length} tx sent to{' '}
              {destination === 'pool' ? (
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Privacy Pool
                </span>
              ) : (
                <span className="text-foreground font-mono text-xs">
                  {externalAddress.slice(0, 6)}...{externalAddress.slice(-4)}
                </span>
              )}
            </p>
            <div className="mt-4 space-y-2">
              {collectTxHashes.map((hash, i) => (
                <a
                  key={hash}
                  href={getTxExplorerUrl(hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 flex items-center justify-center gap-1 text-sm"
                >
                  Tx {i + 1}: {hash.slice(0, 10)}...
                  <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
            <Button asChild className="mt-4 w-full">
              <Link href="/collect">Back to Overview</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell requireAuth requireKeys>
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/collect"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="bg-primary/10 rounded-full p-1.5">
          <Anchor className="text-primary h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-foreground text-lg font-bold">{portLabel}</h1>
          <p className="text-muted-foreground text-xs">Collect from this Port</p>
        </div>
      </div>

      {/* Scan error */}
      {scanError && (
        <div className="bg-destructive/10 text-destructive mb-4 rounded-lg p-3 text-sm">
          {scanError}
        </div>
      )}

      {/* Main content */}
      <Card>
        <CardContent className="p-4">
          {payments.length === 0 && dustPayments.length === 0 ? (
            <div className="text-muted-foreground py-6 text-center">
              {isScanning ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="text-primary h-6 w-6 animate-spin" />
                  <p className="text-sm">Scanning...</p>
                </div>
              ) : (
                <p className="text-sm">No pending payments for this Port.</p>
              )}
            </div>
          ) : payments.length === 0 && dustPayments.length > 0 ? (
            <div className="text-muted-foreground py-4 text-center text-sm">
              <p>No collectable payments.</p>
              <p className="mt-1 text-xs">{dustPayments.length} below minimum (see below).</p>
            </div>
          ) : (
            <>
              {/* Balance summary - compact */}
              <div className="mb-4 flex gap-3">
                <div className="bg-muted/50 flex-1 rounded-lg p-3">
                  <p className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Wallet className="h-3 w-3" />
                    Balance
                  </p>
                  <p className="text-foreground text-lg font-bold">{totalBalanceFormatted} MNT</p>
                </div>
                {hasPoolKeys && (
                  <div className="flex-1 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <p className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                      <Shield className="h-3 w-3" />
                      Pool-eligible
                    </p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {totalVerifiedBalanceFormatted} MNT
                    </p>
                  </div>
                )}
              </div>

              {/* Payment list - ultra compact for scalability */}
              <div className="bg-muted/30 mb-4 max-h-48 space-y-px overflow-y-auto rounded-lg">
                {payments.map((payment, i) => (
                  <PaymentCard key={i} payment={payment} hasPoolKeys={hasPoolKeys} />
                ))}
              </div>

              {/* Collect error */}
              {collectError && (
                <div className="bg-destructive/10 text-destructive mb-4 rounded-lg p-2 text-xs">
                  {collectError}
                </div>
              )}

              {/* Send section */}
              <div className="border-t pt-4">
                {/* Amount input - PRIMARY ACTION */}
                <div className="mb-4">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      max={maxAmount}
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      placeholder={`${maxAmount.toFixed(4)} MNT`}
                      className={`h-12 text-lg font-semibold ${amountInput && !isValidAmount ? 'border-destructive' : ''}`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAmountInput(maxAmount.toString())}
                      className="h-12 px-4"
                    >
                      Max
                    </Button>
                  </div>
                  <p className="text-muted-foreground mt-1.5 text-xs">
                    {destination === 'pool'
                      ? poolStats.paymentsCanDeposit > 0
                        ? `Pool-eligible: ${maxForPool.toFixed(4)} MNT (after ~${poolStats.gasCostPerDepositFormatted} gas)`
                        : `Insufficient balance for gas`
                      : amountInput
                        ? `Sending from 1 stealth address`
                        : `All ${totalBalanceFormatted} MNT from ${payments.length} address${payments.length !== 1 ? 'es' : ''}`}
                  </p>
                </div>

                {/* Destination selector - minimal */}
                <div className="bg-muted/50 mb-4 flex gap-1 rounded-lg p-1">
                  {hasPoolKeys && hasPoolDepositable && (
                    <button
                      type="button"
                      onClick={() => setDestination('pool')}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        destination === 'pool'
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Shield className="h-4 w-4" />
                      Pool
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDestination('external')}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      destination === 'external'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <ExternalLink className="h-4 w-4" />
                    External
                  </button>
                </div>

                {/* External address input */}
                {destination === 'external' && (
                  <div className="mb-4">
                    <Input
                      type="text"
                      value={externalAddress}
                      onChange={(e) => setExternalAddress(e.target.value)}
                      placeholder="0x... recipient address"
                      className={`h-10 font-mono text-sm ${
                        externalAddress && !isAddress(externalAddress) ? 'border-destructive' : ''
                      }`}
                    />
                    {externalAddress && !isAddress(externalAddress) && (
                      <p className="text-destructive mt-1 text-xs">Invalid address</p>
                    )}
                    {externalAddress &&
                      isAddress(externalAddress) &&
                      connectedAddress &&
                      externalAddress.toLowerCase() === connectedAddress.toLowerCase() && (
                        <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                          ⚠️ Sending to your wallet creates a traceable link.
                        </p>
                      )}
                  </div>
                )}

                {/* Sync status for merge deposits - compact */}
                {destination === 'pool' && willMergeDeposit && (
                  <div
                    className={`mb-3 flex items-center justify-between rounded-lg border p-2.5 text-sm ${
                      isLoadingPreflight
                        ? 'border-slate-500/20 bg-slate-500/5'
                        : preflight?.canProceed
                          ? 'border-emerald-500/20 bg-emerald-500/5'
                          : 'border-amber-500/20 bg-amber-500/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isLoadingPreflight ? (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      ) : preflight?.canProceed ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-amber-500" />
                      )}
                      <span>
                        {isLoadingPreflight
                          ? 'Checking...'
                          : preflight?.canProceed
                            ? 'Ready'
                            : 'Syncing...'}
                      </span>
                    </div>
                    {!isLoadingPreflight && !preflight?.canProceed && (
                      <button
                        onClick={runPoolPreflight}
                        className="text-muted-foreground hover:text-foreground text-xs"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}

                {/* Action button */}
                <Button
                  onClick={handleSend}
                  disabled={
                    isCollecting ||
                    isDepositingToPool ||
                    payments.length === 0 ||
                    !isValidAddress ||
                    !isValidAmount ||
                    (destination === 'external' && !externalAddress) ||
                    (destination === 'pool' &&
                      willMergeDeposit &&
                      (isLoadingPreflight || !preflight?.canProceed))
                  }
                  className={`w-full ${destination === 'pool' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                >
                  {isDepositingToPool || isCollecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {destination === 'pool' ? 'Depositing...' : 'Sending...'}
                    </>
                  ) : destination === 'pool' ? (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      Deposit{' '}
                      {amountInput === ''
                        ? totalVerifiedBalanceFormatted
                        : effectiveAmount.toFixed(4)}{' '}
                      MNT
                    </>
                  ) : (
                    <>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Send {amountInput ? effectiveAmount.toFixed(4) : totalBalanceFormatted} MNT
                    </>
                  )}
                </Button>

                {/* Deposit progress */}
                {depositProgress && (
                  <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-emerald-700 dark:text-emerald-300">
                        Depositing
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {depositProgress.current}/{depositProgress.total}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-emerald-200 dark:bg-emerald-900">
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{
                          width: `${(depositProgress.current / depositProgress.total) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="mt-2 truncate font-mono text-xs text-emerald-600 dark:text-emerald-400">
                      {depositProgress.currentAddress.slice(0, 10)}...
                      {depositProgress.currentAddress.slice(-6)}
                    </p>
                    {depositResults.length > 0 && (
                      <div className="mt-2 space-y-1 border-t border-emerald-500/20 pt-2">
                        {depositResults.map((r, i) => (
                          <div key={i} className="flex items-center gap-1 text-xs">
                            {r.success ? (
                              <CheckCircle className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <XCircle className="h-3 w-3 text-red-500" />
                            )}
                            <span className="text-muted-foreground font-mono">
                              {r.address.slice(0, 6)}...{r.address.slice(-4)}
                            </span>
                            {r.hash && (
                              <a
                                href={getTxExplorerUrl(r.hash)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-500"
                              >
                                ↗
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Pool keys hint */}
                {!hasPoolKeys && (
                  <p className="text-muted-foreground mt-3 text-center text-xs">
                    Want privacy?{' '}
                    <Link href="/pool" className="text-primary underline">
                      Derive pool keys
                    </Link>{' '}
                    first.
                  </p>
                )}

                {hasPoolKeys && !hasPoolDepositable && payments.length > 0 && (
                  <p className="mt-3 text-center text-xs text-amber-600 dark:text-amber-400">
                    No verified balance for pool. Payments not through GaleonRegistry.
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dust payments - compact */}
      {dustPayments.length > 0 && (
        <Card className="mt-4 border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/10">
          <CardContent className="p-3">
            <button
              onClick={() => setIsDustExpanded(!isDustExpanded)}
              className="flex w-full items-center gap-2 text-left"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="flex-1 text-sm font-medium text-amber-800 dark:text-amber-200">
                {dustPayments.length} below minimum
              </span>
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {totalDustBalanceFormatted} MNT
              </span>
              <ChevronDown
                className={`h-4 w-4 text-amber-600 transition-transform dark:text-amber-400 ${isDustExpanded ? 'rotate-180' : ''}`}
              />
            </button>
            {isDustExpanded && (
              <div className="mt-2 space-y-1.5 border-t border-amber-200 pt-2 dark:border-amber-900/50">
                {dustPayments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="font-mono text-amber-700 dark:text-amber-300">
                      {p.stealthAddress.slice(0, 8)}...{p.stealthAddress.slice(-6)}
                    </span>
                    <span className="text-amber-700 dark:text-amber-300">
                      {p.balanceFormatted} MNT
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </AppShell>
  )
}

/**
 * Ultra-compact payment row for scalability
 */
function PaymentCard({
  payment,
  hasPoolKeys,
}: {
  payment: CollectablePayment
  hasPoolKeys: boolean
}) {
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const effectiveVerified =
    payment.verifiedBalance > payment.balance ? payment.balance : payment.verifiedBalance

  // Lookup receipt ID on mount
  useEffect(() => {
    async function lookupReceipt() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'}/api/v1/receipts/by-stealth/${payment.stealthAddress}`
        )
        if (res.ok) {
          const data = await res.json()
          setReceiptId(data.id)
        }
      } catch {
        // Silently fail - receipt may not exist
      }
    }
    lookupReceipt()
  }, [payment.stealthAddress])

  return (
    <div className="even:bg-muted/50 flex items-center gap-2 px-3 py-2 text-xs">
      {/* Address with receipt link or explorer link */}
      {receiptId ? (
        <Link
          href={`/receipt/${receiptId}`}
          className="text-primary hover:bg-primary/10 flex items-center gap-1.5 rounded px-1.5 py-0.5 font-mono transition-colors"
          title="View shareable receipt"
        >
          <CheckCircle className="h-3 w-3" />
          {payment.stealthAddress.slice(0, 6)}...{payment.stealthAddress.slice(-4)}
        </Link>
      ) : (
        <a
          href={getTxExplorerUrl(payment.txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-primary flex items-center gap-1.5 font-mono transition-colors"
          title="View on explorer"
        >
          <ExternalLink className="h-3 w-3" />
          {payment.stealthAddress.slice(0, 6)}...{payment.stealthAddress.slice(-4)}
        </a>
      )}
      <span className="text-muted-foreground">#{payment.blockNumber.toString()}</span>
      <span className="flex-1" />
      {hasPoolKeys && (
        <>
          {effectiveVerified > 0n ? (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {formatMnt(effectiveVerified)}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {payment.balanceFormatted}
            </span>
          )}
        </>
      )}
      {!hasPoolKeys && (
        <span className="text-foreground font-medium">{payment.balanceFormatted}</span>
      )}
      <span className="text-muted-foreground">MNT</span>
    </div>
  )
}
