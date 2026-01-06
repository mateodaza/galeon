'use client'

/**
 * Per-port collection page.
 * Shows payments for a specific port with the port label at top.
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

export default function CollectPortPage() {
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

  // Get port label from first payment (all payments from same port have same label)
  const portLabel = payments[0]?.portLabel || dustPayments[0]?.portLabel || 'Port'

  // Calculate totals for this port only
  // Cap verified at actual balance (verified can be higher if funds were spent)
  const totalBalance = useMemo(() => payments.reduce((sum, p) => sum + p.balance, 0n), [payments])
  const totalBalanceFormatted = formatEther(totalBalance)

  const totalVerifiedBalance = useMemo(
    () =>
      payments.reduce((sum, p) => {
        const cappedVerified = p.verifiedBalance > p.balance ? p.balance : p.verifiedBalance
        return sum + cappedVerified
      }, 0n),
    [payments]
  )
  const totalVerifiedBalanceFormatted = formatEther(totalVerifiedBalance)

  const totalDustBalance = useMemo(
    () => dustPayments.reduce((sum, p) => sum + p.balance, 0n),
    [dustPayments]
  )
  const totalDustBalanceFormatted = formatEther(totalDustBalance)

  const hasPoolDepositable = payments.some((p) => p.canDepositToPool)

  // Count eligible payments for pool (for UI messaging)
  const eligiblePaymentsCount = useMemo(
    () => payments.filter((p) => p.canDepositToPool && p.verifiedBalance > 0n).length,
    [payments]
  )

  // Destination: 'pool' or 'external'
  const [destination, setDestination] = useState<'pool' | 'external'>('pool')
  const [externalAddress, setExternalAddress] = useState('')
  const [amountInput, setAmountInput] = useState('')
  const [isDustExpanded, setIsDustExpanded] = useState(false)
  const hasScanned = useRef(false)
  const prevHasKeys = useRef(hasKeys)

  // Reset scan flag when keys change (wallet switch)
  useEffect(() => {
    if (prevHasKeys.current && !hasKeys) {
      hasScanned.current = false
    }
    prevHasKeys.current = hasKeys
  }, [hasKeys])

  // Auto-scan on page load when keys are available
  useEffect(() => {
    if (hasKeys && !hasScanned.current && !isScanning) {
      hasScanned.current = true
      scan()
    }
  }, [hasKeys, isScanning, scan])

  // Run preflight when destination is pool and we have merge deposit scenario
  useEffect(() => {
    if (destination === 'pool' && willMergeDeposit && hasPoolDepositable && payments.length > 0) {
      runPoolPreflight()
    }
  }, [destination, willMergeDeposit, hasPoolDepositable, payments.length, runPoolPreflight])

  // Retry countdown for preflight
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null)

  // Start countdown when preflight fails
  useEffect(() => {
    if (preflight && !preflight.canProceed && preflight.retryAfterMs) {
      setRetryCountdown(Math.ceil(preflight.retryAfterMs / 1000))
    } else {
      setRetryCountdown(null)
    }
  }, [preflight])

  // Countdown timer
  useEffect(() => {
    if (retryCountdown === null || retryCountdown <= 0) return
    const timer = setTimeout(() => {
      setRetryCountdown(retryCountdown - 1)
    }, 1000)
    return () => clearTimeout(timer)
  }, [retryCountdown])

  // Auto-retry preflight when countdown reaches 0
  useEffect(() => {
    if (retryCountdown === 0 && destination === 'pool') {
      runPoolPreflight()
    }
  }, [retryCountdown, destination, runPoolPreflight])

  // Calculate pool deposit stats using the hook's utility function
  const poolStats = useMemo(
    () => calculatePoolDepositStats(payments),
    [calculatePoolDepositStats, payments]
  )

  // Calculate max based on destination
  const maxForPool = parseFloat(poolStats.totalMaxDepositFormatted) || 0
  const maxForExternal = parseFloat(totalBalanceFormatted) || 0
  const maxAmount = destination === 'pool' ? maxForPool : maxForExternal

  // Parse and validate amount
  const enteredAmount = parseFloat(amountInput) || 0
  const isValidAmount = amountInput === '' || (enteredAmount > 0 && enteredAmount <= maxAmount)
  const effectiveAmount = amountInput === '' ? maxAmount : enteredAmount

  const isValidAddress = destination === 'pool' || isAddress(externalAddress)

  const handleSend = () => {
    const amount = amountInput ? parseFloat(amountInput) : undefined
    if (destination === 'external' && externalAddress) {
      // Pass portId to only collect from THIS port
      collectAll(externalAddress as `0x${string}`, amount, portId)
    } else if (destination === 'pool') {
      // Pass portId to only collect from THIS port
      collectToPool(amount, portId)
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
            <h1 className="text-foreground mt-4 text-2xl font-bold">
              {destination === 'pool' ? 'Deposited to Pool!' : 'Sent Successfully!'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {collectTxHashes.length} transaction{collectTxHashes.length > 1 ? 's' : ''} sent to{' '}
              {destination === 'pool' ? (
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Privacy Pool
                </span>
              ) : (
                <span className="text-foreground font-mono">
                  {externalAddress.slice(0, 6)}...{externalAddress.slice(-4)}
                </span>
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
              <Link href="/collect">Back to Collection Overview</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell requireAuth requireKeys>
      {/* Back link and port header */}
      <div className="mb-2">
        <Link
          href="/collect"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          All Ports
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="bg-primary/10 rounded-full p-2">
          <Anchor className="text-primary h-6 w-6" />
        </div>
        <div>
          <h1 className="text-foreground text-2xl font-bold">{portLabel}</h1>
          <p className="text-muted-foreground text-sm">Collect payments from this Port</p>
        </div>
      </div>

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
                <p>No pending payments for this Port.</p>
              )}
            </div>
          ) : payments.length === 0 && dustPayments.length > 0 ? (
            <div className="text-muted-foreground mt-4 text-center">
              <p>No collectable payments for this Port.</p>
              <p className="mt-2 text-sm">
                {dustPayments.length} payment{dustPayments.length > 1 ? 's' : ''} below minimum
                threshold (see below).
              </p>
            </div>
          ) : (
            <>
              {/* Payment list */}
              <div className="mt-4 space-y-3">
                {payments.map((payment, i) => (
                  <PaymentCard key={i} payment={payment} hasPoolKeys={hasPoolKeys} />
                ))}
              </div>

              {/* Collect error */}
              {collectError && (
                <div className="bg-destructive/10 text-destructive mt-4 rounded-lg p-3 text-sm">
                  {collectError}
                </div>
              )}

              {/* Send funds section */}
              <div className="mt-6 border-t pt-4">
                {/* Balance summary */}
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                      <Wallet className="h-3.5 w-3.5" />
                      Total Balance
                    </p>
                    <p className="text-foreground mt-1 text-lg font-bold">
                      {totalBalanceFormatted} MNT
                    </p>
                  </div>
                  {hasPoolKeys && (
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                      <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                        <Shield className="h-3.5 w-3.5" />
                        Pool-Depositable
                      </p>
                      <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {totalVerifiedBalanceFormatted} MNT
                      </p>
                    </div>
                  )}
                </div>

                {/* Destination selector */}
                <div className="space-y-3">
                  <p className="text-foreground text-sm font-medium">Send to:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {hasPoolKeys && hasPoolDepositable && (
                      <button
                        type="button"
                        onClick={() => setDestination('pool')}
                        className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-colors ${
                          destination === 'pool'
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : 'border-border hover:border-emerald-500/50 hover:bg-emerald-500/5'
                        }`}
                      >
                        <Shield
                          className={`h-5 w-5 ${destination === 'pool' ? 'text-emerald-500' : 'text-muted-foreground'}`}
                        />
                        <div>
                          <p className="font-medium">Privacy Pool</p>
                          <p className="text-muted-foreground text-xs">ZK withdrawal later</p>
                        </div>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDestination('external')}
                      className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-colors ${
                        destination === 'external'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50 hover:bg-primary/5'
                      } ${!hasPoolKeys || !hasPoolDepositable ? 'col-span-2' : ''}`}
                    >
                      <ExternalLink
                        className={`h-5 w-5 ${destination === 'external' ? 'text-primary' : 'text-muted-foreground'}`}
                      />
                      <div>
                        <p className="font-medium">External Address</p>
                        <p className="text-muted-foreground text-xs">Send to any wallet</p>
                      </div>
                    </button>
                  </div>

                  {/* External address input */}
                  {destination === 'external' && (
                    <div>
                      <Input
                        type="text"
                        value={externalAddress}
                        onChange={(e) => setExternalAddress(e.target.value)}
                        placeholder="0x... (external wallet address)"
                        className={`font-mono ${
                          externalAddress && !isAddress(externalAddress)
                            ? 'border-destructive focus-visible:ring-destructive'
                            : ''
                        }`}
                      />
                      {externalAddress && !isAddress(externalAddress) && (
                        <p className="text-destructive mt-1 text-xs">Invalid address</p>
                      )}

                      {/* Privacy warning when sending to connected wallet */}
                      {externalAddress &&
                        isAddress(externalAddress) &&
                        connectedAddress &&
                        externalAddress.toLowerCase() === connectedAddress.toLowerCase() && (
                          <div className="mt-3 rounded-lg border border-red-500/50 bg-red-500/10 p-3">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
                              <div>
                                <p className="font-medium text-red-600 dark:text-red-400">
                                  Privacy Warning
                                </p>
                                <p className="text-sm text-red-600/80 dark:text-red-400/80">
                                  Sending to your connected wallet creates a traceable link. Anyone
                                  can see these funds came from stealth addresses. For better
                                  privacy, use the Privacy Pool or a fresh wallet.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                      {!(
                        externalAddress &&
                        isAddress(externalAddress) &&
                        connectedAddress &&
                        externalAddress.toLowerCase() === connectedAddress.toLowerCase()
                      ) && (
                        <p className="text-muted-foreground mt-1 text-xs">
                          Use an address that is NOT linked to your identity for better privacy.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Info about destination */}
                  {destination === 'pool' && (
                    <p className="text-muted-foreground text-xs">
                      Deposits to the Privacy Pool allow you to withdraw anonymously later using ZK
                      proofs. Only verified payments (max {totalVerifiedBalanceFormatted} MNT) can
                      be deposited.
                    </p>
                  )}

                  {/* Port-specific notice */}
                  <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-2.5">
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      <span className="font-medium">📍 Port-specific:</span> Using funds only from{' '}
                      <span className="font-semibold">{portLabel}</span>. Go to{' '}
                      <Link href="/collect" className="underline hover:no-underline">
                        /collect
                      </Link>{' '}
                      to use funds from all ports.
                    </p>
                  </div>
                </div>

                {/* Amount input */}
                <div className="mt-4">
                  <label className="text-foreground text-sm font-medium">Amount (MNT)</label>
                  <div className="mt-1.5 flex gap-2">
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      max={maxAmount}
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      placeholder={`Max: ${maxAmount.toFixed(4)}`}
                      className={`font-mono ${
                        amountInput && !isValidAmount
                          ? 'border-destructive focus-visible:ring-destructive'
                          : ''
                      }`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAmountInput(maxAmount.toString())}
                      className="shrink-0"
                    >
                      Max
                    </Button>
                  </div>
                  {amountInput && !isValidAmount && (
                    <p className="text-destructive mt-1 text-xs">
                      Amount must be between 0 and {maxAmount.toFixed(4)} MNT
                    </p>
                  )}
                  <p className="text-muted-foreground mt-1 text-xs">
                    {destination === 'pool'
                      ? poolStats.paymentsCanDeposit > 0
                        ? poolStats.paymentsTooSmall > 0
                          ? `${poolStats.paymentsCanDeposit}/${poolStats.totalPayments} payments can deposit · Max: ${maxForPool.toFixed(4)} MNT (${poolStats.paymentsTooSmall} skipped - too small for ~${poolStats.gasCostPerDepositFormatted} gas)`
                          : `Max: ${maxForPool.toFixed(4)} MNT from ${poolStats.paymentsCanDeposit} payment${poolStats.paymentsCanDeposit > 1 ? 's' : ''} (after ~${poolStats.gasCostPerDepositFormatted} gas each)`
                        : `No payments have enough balance for gas (~${poolStats.gasCostPerDepositFormatted} MNT needed per tx)`
                      : amountInput
                        ? `Sending from 1 stealth address`
                        : `Leave empty to send ALL (${totalBalanceFormatted} MNT) from ${payments.length} address${payments.length > 1 ? 'es' : ''}`}
                  </p>
                </div>

                {/* Sync Status for Pool Deposits (Merge) */}
                {destination === 'pool' && willMergeDeposit && (
                  <div
                    className={`mt-4 rounded-lg border p-3 ${
                      isLoadingPreflight
                        ? 'border-slate-500/20 bg-slate-500/5'
                        : preflight?.canProceed
                          ? 'border-emerald-500/20 bg-emerald-500/5'
                          : 'border-amber-500/20 bg-amber-500/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isLoadingPreflight ? (
                          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                        ) : preflight?.canProceed ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-amber-500" />
                        )}
                        <span className="text-sm font-medium">
                          {isLoadingPreflight
                            ? 'Checking sync status...'
                            : preflight?.canProceed
                              ? 'Ready to merge deposit'
                              : 'Waiting for sync'}
                        </span>
                      </div>
                      {!isLoadingPreflight && !preflight?.canProceed && (
                        <button
                          onClick={runPoolPreflight}
                          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Refresh
                        </button>
                      )}
                    </div>

                    {/* Sync check details */}
                    {preflight && !isLoadingPreflight && (
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          {preflight.checks.indexerSynced ? (
                            <CheckCircle className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-amber-500" />
                          )}
                          <span className="text-muted-foreground">Indexer</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {preflight.checks.aspSynced ? (
                            <CheckCircle className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-amber-500" />
                          )}
                          <span className="text-muted-foreground">ASP Tree</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {preflight.checks.stateTreeValid ? (
                            <CheckCircle className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-amber-500" />
                          )}
                          <span className="text-muted-foreground">State Tree</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {preflight.checks.labelExists ? (
                            <CheckCircle className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-amber-500" />
                          )}
                          <span className="text-muted-foreground">Deposit</span>
                        </div>
                      </div>
                    )}

                    {/* Error/Warning messages */}
                    {preflight && !preflight.canProceed && preflight.errors.length > 0 && (
                      <div className="mt-2 text-xs text-amber-400">
                        {preflight.errors[0]}
                        {retryCountdown !== null && retryCountdown > 0 && (
                          <span className="ml-1 text-slate-400">(retry in {retryCountdown}s)</span>
                        )}
                      </div>
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
                  size="lg"
                  className={`mt-4 w-full ${
                    destination === 'pool' ? 'bg-emerald-600 hover:bg-emerald-700' : ''
                  }`}
                >
                  {isDepositingToPool || isCollecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {destination === 'pool' ? 'Depositing...' : 'Sending...'}
                    </>
                  ) : destination === 'pool' && willMergeDeposit && isLoadingPreflight ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking sync...
                    </>
                  ) : destination === 'pool' && willMergeDeposit && !preflight?.canProceed ? (
                    <>
                      <Clock className="mr-2 h-4 w-4" />
                      Waiting for Sync...
                    </>
                  ) : destination === 'pool' ? (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      {amountInput === '' && eligiblePaymentsCount > 1
                        ? `Deposit All ${totalVerifiedBalanceFormatted} MNT (${eligiblePaymentsCount} payments)`
                        : `Deposit ${effectiveAmount.toFixed(4)} MNT to Pool`}
                    </>
                  ) : (
                    <>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      {amountInput
                        ? `Send ${effectiveAmount.toFixed(4)} MNT to Address`
                        : `Send ALL ${maxForExternal.toFixed(4)} MNT to Address`}
                    </>
                  )}
                </Button>

                {/* Multi-payment deposit progress */}
                {depositProgress && (
                  <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        Depositing to Pool
                      </span>
                      <span className="text-sm text-emerald-600 dark:text-emerald-400">
                        {depositProgress.current} of {depositProgress.total}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 overflow-hidden rounded-full bg-emerald-200 dark:bg-emerald-900">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{
                          width: `${(depositProgress.current / depositProgress.total) * 100}%`,
                        }}
                      />
                    </div>

                    {/* Current payment info */}
                    <div className="mt-3 text-xs text-emerald-600 dark:text-emerald-400">
                      <p className="truncate font-mono">
                        {depositProgress.currentAddress.slice(0, 10)}...
                        {depositProgress.currentAddress.slice(-8)}
                      </p>
                      <p className="mt-1 capitalize">
                        {depositProgress.status === 'preparing' && 'Preparing transaction...'}
                        {depositProgress.status === 'signing' && 'Waiting for signature...'}
                        {depositProgress.status === 'confirming' && 'Confirming on chain...'}
                        {depositProgress.status === 'syncing' && 'Syncing pool state...'}
                      </p>
                    </div>

                    {/* Show completed results */}
                    {depositResults.length > 0 && (
                      <div className="mt-3 border-t border-emerald-500/20 pt-3">
                        <p className="mb-2 text-xs text-emerald-600 dark:text-emerald-400">
                          Completed:
                        </p>
                        <div className="space-y-1">
                          {depositResults.map((result, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              {result.success ? (
                                <CheckCircle className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-500" />
                              )}
                              <span className="text-muted-foreground font-mono">
                                {result.address.slice(0, 6)}...{result.address.slice(-4)}
                              </span>
                              {result.hash && (
                                <a
                                  href={getTxExplorerUrl(result.hash)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-500 hover:underline"
                                >
                                  tx
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!hasPoolKeys && (
                  <div className="bg-muted mt-4 rounded-lg p-3">
                    <p className="text-muted-foreground text-center text-xs">
                      Want better privacy? Go to{' '}
                      <Link href="/pool" className="text-primary underline">
                        /pool
                      </Link>{' '}
                      and derive your pool keys first to access the Privacy Pool.
                    </p>
                  </div>
                )}

                {hasPoolKeys && !hasPoolDepositable && payments.length > 0 && (
                  <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      No verified balance for pool deposit. These payments were likely made directly
                      to stealth addresses, not through GaleonRegistry.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dust payments section - collapsible */}
      {dustPayments.length > 0 && (
        <Card className="mt-6 border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/10">
          <CardContent className="pb-4 pt-4">
            <button
              onClick={() => setIsDustExpanded(!isDustExpanded)}
              className="flex w-full items-center gap-3 text-left"
            >
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                  {dustPayments.length} Payment{dustPayments.length > 1 ? 's' : ''} Below Minimum
                </h3>
                {!isDustExpanded && (
                  <p className="truncate text-xs text-amber-700 dark:text-amber-300/70">
                    Too small to collect economically
                  </p>
                )}
              </div>
              <p className="shrink-0 font-semibold text-amber-800 dark:text-amber-200">
                {totalDustBalanceFormatted} MNT
              </p>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-amber-600 transition-transform dark:text-amber-400 ${
                  isDustExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isDustExpanded && (
              <>
                <p className="mt-3 text-sm text-amber-700 dark:text-amber-300/70">
                  These payments have less than the minimum threshold and would cost more in gas to
                  collect than they&apos;re worth.
                </p>
                <div className="mt-3 space-y-2">
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
              </>
            )}
          </CardContent>
        </Card>
      )}
    </AppShell>
  )
}

/**
 * Individual payment card showing balance breakdown and pool eligibility
 */
function PaymentCard({
  payment,
  hasPoolKeys,
}: {
  payment: CollectablePayment
  hasPoolKeys: boolean
}) {
  const hasVerifiedBalance = payment.verifiedBalance > 0n
  const effectiveVerified =
    payment.verifiedBalance > payment.balance ? payment.balance : payment.verifiedBalance
  const unverifiedBalance = payment.balance - effectiveVerified
  const hasUnverifiedBalance = unverifiedBalance > 0n

  return (
    <div className="bg-muted rounded-lg p-4">
      {/* Address and block info */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-foreground font-mono text-sm">
            {payment.stealthAddress.slice(0, 10)}...{payment.stealthAddress.slice(-8)}
          </p>
          <p className="text-muted-foreground text-xs">Block #{payment.blockNumber.toString()}</p>
        </div>
        <p className="text-foreground text-lg font-semibold">{payment.balanceFormatted} MNT</p>
      </div>

      {/* Balance breakdown */}
      {hasPoolKeys && (
        <div className="mt-3 border-t border-white/10 pt-3">
          <div className="flex items-center gap-4 text-sm">
            {/* Verified (pool-depositable) */}
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${hasVerifiedBalance ? 'bg-emerald-500' : 'bg-gray-400'}`}
              />
              <span className="text-muted-foreground">Pool:</span>
              <span
                className={
                  hasVerifiedBalance
                    ? 'font-medium text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground'
                }
              >
                {formatEther(effectiveVerified)} MNT
              </span>
            </div>

            {/* Unverified (wallet only) */}
            {hasUnverifiedBalance && (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-muted-foreground">Wallet only:</span>
                <span className="text-amber-600 dark:text-amber-400">
                  {formatEther(unverifiedBalance)} MNT
                </span>
              </div>
            )}
          </div>

          {/* Status badge */}
          {payment.canDepositToPool ? (
            <div className="mt-2 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs text-emerald-600 dark:text-emerald-400">
                Eligible for Privacy Pool deposit
              </span>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs text-amber-600 dark:text-amber-400">
                {payment.verifiedBalance === 0n
                  ? 'Not received through GaleonRegistry - wallet collection only'
                  : 'Address frozen or not eligible for pool'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
