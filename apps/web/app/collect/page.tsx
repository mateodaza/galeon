'use client'

/**
 * Collection overview page.
 *
 * Shows all ports with pending payments, linking to per-port collection pages.
 * Also supports collecting all payments at once.
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

export default function CollectPage() {
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

    // Sort by total balance descending
    return Array.from(groups.values()).sort((a, b) => (b.totalBalance > a.totalBalance ? 1 : -1))
  }, [payments])

  // View mode: 'overview' shows port cards, 'all' shows all payments
  const [viewMode, setViewMode] = useState<'overview' | 'all'>('overview')

  // Destination: 'pool' or 'external'
  const [destination, setDestination] = useState<'pool' | 'external'>('pool')
  const [externalAddress, setExternalAddress] = useState('')
  const [amountInput, setAmountInput] = useState('')
  const hasScanned = useRef(false)
  const prevHasKeys = useRef(hasKeys)

  // Reset scan flag when keys change (wallet switch)
  useEffect(() => {
    if (prevHasKeys.current && !hasKeys) {
      // Keys were cleared (wallet switch), reset scan flag
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

  // Calculate max based on destination
  const maxForPool = parseFloat(totalVerifiedBalanceFormatted) || 0
  const maxForExternal = parseFloat(totalBalanceFormatted) || 0
  const maxAmount = destination === 'pool' ? maxForPool : maxForExternal

  // Parse and validate amount
  const enteredAmount = parseFloat(amountInput) || 0
  const isValidAmount = amountInput === '' || (enteredAmount > 0 && enteredAmount <= maxAmount)
  // Use entered amount or max if empty
  const effectiveAmount = amountInput === '' ? maxAmount : enteredAmount

  const isValidAddress = destination === 'pool' || isAddress(externalAddress)

  const handleSend = () => {
    const amount = amountInput ? parseFloat(amountInput) : undefined
    if (destination === 'external' && externalAddress) {
      collectAll(externalAddress as `0x${string}`, amount)
    } else if (destination === 'pool') {
      collectToPool(amount)
    }
  }

  // Show success screen after collection
  if (collectTxHashes.length > 0) {
    const _successDestination = destination === 'pool' ? 'Privacy Pool' : externalAddress
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
          <div className="flex items-center justify-between">
            <h2 className="text-foreground text-lg font-semibold">Available to Collect</h2>
            {payments.length > 0 && portGroups.length > 1 && (
              <div className="flex gap-1 rounded-lg border p-1">
                <button
                  onClick={() => setViewMode('overview')}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    viewMode === 'overview'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  By Port
                </button>
                <button
                  onClick={() => setViewMode('all')}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    viewMode === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All
                </button>
              </div>
            )}
          </div>

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
              {/* Port overview - cards linking to per-port collection */}
              {viewMode === 'overview' && portGroups.length > 0 && (
                <div className="mt-4 space-y-3">
                  {portGroups.map((group) => (
                    <Link
                      key={group.portId}
                      href={`/collect/${group.portId}`}
                      className="bg-muted hover:bg-muted/80 flex items-center justify-between rounded-lg p-4 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 rounded-full p-2">
                          <Anchor className="text-primary h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-foreground font-medium">{group.portLabel}</p>
                          <p className="text-muted-foreground text-sm">
                            {group.payments.length} payment
                            {group.payments.length > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-foreground font-semibold">
                            {formatEther(group.totalBalance)} MNT
                          </p>
                          {hasPoolKeys && group.totalVerifiedBalance > 0n && (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400">
                              {formatEther(group.totalVerifiedBalance)} pool-eligible
                            </p>
                          )}
                        </div>
                        <ChevronRight className="text-muted-foreground h-5 w-5" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* All payments view */}
              {viewMode === 'all' && (
                <div className="mt-4 space-y-3">
                  {payments.map((payment, i) => (
                    <PaymentCard key={i} payment={payment} hasPoolKeys={hasPoolKeys} />
                  ))}
                </div>
              )}

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
                      ? `Max pool deposit: ${totalVerifiedBalanceFormatted} MNT (verified balance)`
                      : amountInput
                        ? `Sending from 1 stealth address`
                        : `Leave empty to send ALL (${totalBalanceFormatted} MNT) from ${payments.length} address${payments.length > 1 ? 'es' : ''}`}
                  </p>
                </div>

                {/* Action button */}
                <Button
                  onClick={handleSend}
                  disabled={
                    isCollecting ||
                    isDepositingToPool ||
                    payments.length === 0 ||
                    !isValidAddress ||
                    !isValidAmount ||
                    (destination === 'external' && !externalAddress)
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
                  ) : destination === 'pool' ? (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      Deposit {effectiveAmount.toFixed(4)} MNT to Pool
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

                {!hasPoolKeys && (
                  <div className="bg-muted mt-4 rounded-lg p-3">
                    <p className="text-muted-foreground text-center text-xs">
                      💡 Want better privacy? Go to{' '}
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
  // Cap verified at actual balance (verified can be higher if funds were spent)
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

      {/* Balance breakdown (only show if pool keys are available and there's any verified balance) */}
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
