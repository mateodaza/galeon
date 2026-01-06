'use client'

/**
 * Collection content component - loaded dynamically to avoid SSR BigInt issues.
 */

import Link from 'next/link'
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
  Anchor,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import { AppShell, PageHeader } from '@/components/layout'
import { getTxExplorerUrl } from '@/lib/chains'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useCollection, type CollectablePayment } from '@/hooks/use-collection'

/** Group payments by port */
interface PortGroup {
  portId: string
  portLabel: string
  payments: CollectablePayment[]
  totalBalance: bigint
  totalVerifiedBalance: bigint
}

export default function CollectContent() {
  const { address: connectedAddress } = useAccount()
  const {
    payments,
    dustPayments,
    totalBalanceFormatted,
    totalVerifiedBalanceFormatted,
    hasPoolDepositable,
    totalDustBalanceFormatted,
    minimumCollectableFormatted,
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
    calculatePoolDepositStats,
  } = useCollection()

  // Group payments by port
  const portGroups = useMemo(() => {
    const groups = new Map<string, PortGroup>()

    for (const payment of payments) {
      const existing = groups.get(payment.portId)
      if (existing) {
        existing.payments.push(payment)
        existing.totalBalance += payment.balance
        existing.totalVerifiedBalance += payment.verifiedBalance
      } else {
        groups.set(payment.portId, {
          portId: payment.portId,
          portLabel: payment.portLabel,
          payments: [payment],
          totalBalance: payment.balance,
          totalVerifiedBalance: payment.verifiedBalance,
        })
      }
    }

    return Array.from(groups.values()).sort((a, b) => (b.totalBalance > a.totalBalance ? 1 : -1))
  }, [payments])

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

  // Calculate max based on destination (pool max accounts for gas costs)
  const maxForPool = parseFloat(poolStats.totalMaxDepositFormatted) || 0
  const maxForExternal = parseFloat(totalBalanceFormatted) || 0

  // Validate amount input
  const isValidAddress = !externalAddress || isAddress(externalAddress)
  const _enteredAmount = parseFloat(amountInput) || 0

  // Handle collect action
  const handleCollect = async () => {
    // If no amount specified, collect all
    const amount = amountInput ? parseFloat(amountInput) : undefined

    if (destination === 'pool') {
      await collectToPool(amount)
    } else {
      const recipient = externalAddress || connectedAddress
      if (recipient && isAddress(recipient)) {
        await collectAll(recipient as `0x${string}`, amount)
      }
    }
  }

  // Calculate effective verified balance (cap at actual balance)
  const effectiveVerified = useMemo(() => {
    return payments.reduce((sum, p) => {
      const capped = p.verifiedBalance > p.balance ? p.balance : p.verifiedBalance
      return sum + capped
    }, 0n)
  }, [payments])

  // Calculate unverified balance
  const unverifiedBalance = useMemo(() => {
    const total = payments.reduce((sum, p) => sum + p.balance, 0n)
    return total - effectiveVerified
  }, [payments, effectiveVerified])

  // Check if we can proceed with pool deposit
  const canProceedWithPool =
    !willMergeDeposit || // First deposit doesn't need preflight
    (preflight?.canProceed ?? false)

  // Validation for submit button
  const canSubmit =
    (destination === 'external' && isValidAddress && !isCollecting) ||
    (destination === 'pool' &&
      hasPoolDepositable &&
      hasPoolKeys &&
      !isDepositingToPool &&
      canProceedWithPool)

  // Success state
  if (collectTxHashes.length > 0) {
    return (
      <AppShell>
        <PageHeader title="Funds Collected!" />
        <div className="mx-auto max-w-2xl space-y-6">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-center">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              </div>
              <p className="text-center text-lg">
                Successfully collected funds to{' '}
                {destination === 'pool' ? 'Privacy Pool' : 'your wallet'}!
              </p>
              <div className="space-y-2">
                {collectTxHashes.map((hash, i) => (
                  <a
                    key={hash}
                    href={getTxExplorerUrl(hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 text-sm text-blue-500 hover:underline"
                  >
                    Transaction {i + 1} <ExternalLink className="h-4 w-4" />
                  </a>
                ))}
              </div>
              <div className="flex gap-4 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    hasScanned.current = false
                    scan()
                  }}
                >
                  Scan Again
                </Button>
                <Link href="/pool" className="flex-1">
                  <Button className="w-full">View Pool Balance</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <PageHeader title="Collect Payments" description="Sweep funds from your stealth addresses" />

      <div className="mx-auto max-w-4xl space-y-6">
        {/* Scan status */}
        {!hasKeys ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-muted-foreground flex flex-col items-center gap-4 text-center">
                <Wallet className="h-12 w-12 opacity-50" />
                <p>Connect your wallet and sign in to scan for payments</p>
              </div>
            </CardContent>
          </Card>
        ) : isScanning ? (
          <Card>
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-muted-foreground">Scanning for payments...</p>
              </div>
            </CardContent>
          </Card>
        ) : scanError ? (
          <Card className="border-destructive">
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-4">
                <AlertTriangle className="text-destructive h-8 w-8" />
                <p className="text-destructive">{scanError}</p>
                <Button variant="outline" onClick={scan}>
                  Retry Scan
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : payments.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-muted-foreground flex flex-col items-center gap-4 text-center">
                <Anchor className="h-12 w-12 opacity-50" />
                <div>
                  <p>No payments found</p>
                  <p className="mt-1 text-sm">
                    Payments need a minimum of {minimumCollectableFormatted} MNT to appear here
                  </p>
                </div>
                <Button variant="outline" onClick={scan}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Scan Again
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-muted-foreground text-sm">Total Balance</p>
                  <p className="text-2xl font-bold">{totalBalanceFormatted}</p>
                  <p className="text-muted-foreground text-xs">MNT</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-muted-foreground text-sm">Verified</p>
                  <p className="text-2xl font-bold">{totalVerifiedBalanceFormatted}</p>
                  <p className="text-muted-foreground text-xs">pool-eligible</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-muted-foreground text-sm">Ports</p>
                  <p className="text-2xl font-bold">{portGroups.length}</p>
                  <p className="text-muted-foreground text-xs">with payments</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-muted-foreground text-sm">Addresses</p>
                  <p className="text-2xl font-bold">{payments.length}</p>
                  <p className="text-muted-foreground text-xs">stealth</p>
                </CardContent>
              </Card>
            </div>

            {/* Port groups */}
            <Card>
              <CardContent className="space-y-4 pt-6">
                <h3 className="font-semibold">Payments by Port</h3>
                <div className="space-y-2">
                  {portGroups.map((group) => (
                    <Link
                      key={group.portId}
                      href={`/collect/${group.portId}`}
                      className="bg-muted/50 hover:bg-muted flex items-center justify-between rounded-lg p-4 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{group.portLabel}</p>
                        <p className="text-muted-foreground text-sm">
                          {group.payments.length} payment
                          {group.payments.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium">{formatEther(group.totalBalance)} MNT</p>
                          <p className="text-muted-foreground text-xs">
                            {formatEther(group.totalVerifiedBalance)} pool-eligible
                          </p>
                        </div>
                        <ChevronRight className="text-muted-foreground h-5 w-5" />
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Dust payments */}
            {dustPayments.length > 0 && (
              <Card className="border-dashed">
                <CardContent className="pt-6">
                  <button
                    onClick={() => setIsDustExpanded(!isDustExpanded)}
                    className="flex w-full items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">
                        {dustPayments.length} dust payment
                        {dustPayments.length !== 1 ? 's' : ''} ({totalDustBalanceFormatted} MNT)
                      </span>
                    </div>
                    {isDustExpanded ? (
                      <ChevronDown className="text-muted-foreground h-4 w-4" />
                    ) : (
                      <ChevronRight className="text-muted-foreground h-4 w-4" />
                    )}
                  </button>
                  {isDustExpanded && (
                    <div className="text-muted-foreground mt-4 space-y-2 text-sm">
                      <p>
                        These payments are too small to collect (below {minimumCollectableFormatted}{' '}
                        MNT minimum).
                      </p>
                      {dustPayments.map((p) => (
                        <div
                          key={p.stealthAddress}
                          className="flex justify-between font-mono text-xs"
                        >
                          <span>
                            {p.stealthAddress.slice(0, 10)}...{p.stealthAddress.slice(-8)}
                          </span>
                          <span>{p.balanceFormatted} MNT</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Collection form */}
            <Card>
              <CardContent className="space-y-6 pt-6">
                <h3 className="font-semibold">Collect All Payments</h3>

                {/* Destination toggle */}
                <div className="flex gap-2">
                  <Button
                    variant={destination === 'pool' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setDestination('pool')}
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Privacy Pool
                  </Button>
                  <Button
                    variant={destination === 'external' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setDestination('external')}
                  >
                    <Wallet className="mr-2 h-4 w-4" />
                    External Wallet
                  </Button>
                </div>

                {/* Pool-specific info */}
                {destination === 'pool' && (
                  <div className="space-y-4">
                    {/* Preflight status */}
                    {willMergeDeposit && (
                      <div
                        className={`rounded-lg p-4 ${
                          preflight?.canProceed
                            ? 'border border-green-500/20 bg-green-500/10'
                            : isLoadingPreflight
                              ? 'bg-muted'
                              : 'border border-yellow-500/20 bg-yellow-500/10'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {isLoadingPreflight ? (
                            <Loader2 className="mt-0.5 h-5 w-5 animate-spin" />
                          ) : preflight?.canProceed ? (
                            <CheckCircle className="mt-0.5 h-5 w-5 text-green-500" />
                          ) : (
                            <Clock className="mt-0.5 h-5 w-5 text-yellow-500" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium">
                              {isLoadingPreflight
                                ? 'Checking pool status...'
                                : preflight?.canProceed
                                  ? 'Pool ready for deposit'
                                  : 'Pool sync in progress'}
                            </p>
                            {!isLoadingPreflight && preflight && (
                              <p className="text-muted-foreground mt-1 text-sm">
                                {preflight.canProceed
                                  ? 'All systems are synced. You can proceed with your deposit.'
                                  : preflight.errors.length > 0
                                    ? preflight.errors.join('. ')
                                    : preflight.warnings.join('. ') ||
                                      'Please wait for sync to complete.'}
                              </p>
                            )}
                            {retryCountdown !== null && retryCountdown > 0 && (
                              <p className="text-muted-foreground mt-2 text-sm">
                                Auto-retry in {retryCountdown}s...
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {!hasPoolKeys && (
                      <div className="bg-muted rounded-lg p-4">
                        <p className="text-muted-foreground text-sm">
                          Sign in to access Privacy Pool features
                        </p>
                      </div>
                    )}

                    {!hasPoolDepositable && hasPoolKeys && (
                      <div className="bg-muted rounded-lg p-4">
                        <p className="text-muted-foreground text-sm">
                          No verified payments available for pool deposit
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* External wallet address */}
                {destination === 'external' && (
                  <div>
                    <label className="text-sm font-medium">Recipient Address</label>
                    <Input
                      className="mt-1.5 font-mono"
                      placeholder={connectedAddress || '0x...'}
                      value={externalAddress}
                      onChange={(e) => setExternalAddress(e.target.value)}
                    />
                    {!isValidAddress && (
                      <p className="text-destructive mt-1 text-xs">Invalid address</p>
                    )}
                    <p className="text-muted-foreground mt-1 text-xs">
                      Leave empty to send to connected wallet
                    </p>
                  </div>
                )}

                {/* Amount input */}
                <div>
                  <label className="text-sm font-medium">Amount (MNT)</label>
                  <div className="mt-1.5 flex gap-2">
                    <Input
                      type="number"
                      placeholder={`Max: ${
                        destination === 'pool' ? maxForPool.toFixed(4) : maxForExternal
                      }`}
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      step="0.001"
                      min="0"
                      max={destination === 'pool' ? maxForPool : maxForExternal}
                    />
                    <Button
                      variant="outline"
                      onClick={() =>
                        setAmountInput(
                          destination === 'pool' ? maxForPool.toFixed(4) : maxForExternal.toString()
                        )
                      }
                    >
                      Max
                    </Button>
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Leave empty to collect maximum available
                  </p>

                  {/* Info about destination */}
                  {destination === 'pool' && (
                    <p className="text-muted-foreground text-xs">
                      Deposits to the Privacy Pool allow you to withdraw anonymously later using ZK
                      proofs. Only verified payments (max {totalVerifiedBalanceFormatted} MNT) can
                      be deposited.
                    </p>
                  )}

                  {/* All ports notice */}
                  <p className="text-muted-foreground mt-2 flex items-center gap-1 text-xs">
                    <Anchor className="h-3 w-3" />
                    <span>
                      <strong>All ports:</strong> This will pick funds from any of your{' '}
                      {portGroups.length} port{portGroups.length !== 1 ? 's' : ''}. Click on a
                      specific port above to collect from just that port.
                    </span>
                  </p>
                </div>

                {/* Pool balance info */}
                {destination === 'pool' && hasPoolKeys && (
                  <div className="bg-muted/50 space-y-2 rounded-lg p-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pool-eligible (verified)</span>
                      <span className="font-medium">{formatEther(effectiveVerified)} MNT</span>
                    </div>
                    {unverifiedBalance > 0n && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Not eligible (unverified)</span>
                        <span className="text-muted-foreground">
                          {formatEther(unverifiedBalance)} MNT
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Error message */}
                {collectError && (
                  <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg p-4">
                    <XCircle className="h-5 w-5" />
                    <p className="text-sm">{collectError}</p>
                  </div>
                )}

                {/* Submit button */}
                <Button size="lg" className="w-full" onClick={handleCollect} disabled={!canSubmit}>
                  {isCollecting || isDepositingToPool ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {destination === 'pool' ? 'Depositing to Pool...' : 'Collecting...'}
                    </>
                  ) : (
                    <>
                      {destination === 'pool' ? (
                        <>
                          <Shield className="mr-2 h-4 w-4" />
                          Deposit to Privacy Pool
                        </>
                      ) : (
                        <>
                          <Wallet className="mr-2 h-4 w-4" />
                          Collect to Wallet
                        </>
                      )}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  )
}
