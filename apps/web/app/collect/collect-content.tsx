'use client'

/**
 * Collection overview - read-only view that shows payments grouped by port.
 * Users click on a port to collect from that specific port.
 */

import Link from 'next/link'
import { useEffect, useRef, useState, useMemo } from 'react'
import { formatEther } from 'viem'
import {
  Loader2,
  AlertTriangle,
  Wallet,
  Anchor,
  ChevronRight,
  ChevronDown,
  RefreshCw,
} from 'lucide-react'
import { AppShell, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

/** Group payments by port */
interface PortGroup {
  portId: string
  portLabel: string
  payments: CollectablePayment[]
  totalBalance: bigint
  totalVerifiedBalance: bigint
}

export default function CollectContent() {
  const {
    payments,
    dustPayments,
    totalBalanceFormatted,
    totalVerifiedBalanceFormatted,
    totalDustBalanceFormatted,
    minimumCollectableFormatted,
    isScanning,
    scanError,
    scan,
    hasKeys,
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

  return (
    <AppShell>
      <PageHeader
        title="Collect Payments"
        description="Sweep funds from your stealth addresses"
        actions={
          hasKeys && !isScanning && payments.length > 0 ? (
            <Button variant="outline" size="sm" onClick={scan}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Rescan
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-6">
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
                <CardContent className="p-5">
                  <p className="text-muted-foreground text-sm">Total Balance</p>
                  <p className="text-2xl font-bold">{totalBalanceFormatted}</p>
                  <p className="text-muted-foreground text-xs">MNT</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-muted-foreground text-sm">Verified</p>
                  <p className="text-2xl font-bold">{totalVerifiedBalanceFormatted}</p>
                  <p className="text-muted-foreground text-xs">pool-eligible</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-muted-foreground text-sm">Ports</p>
                  <p className="text-2xl font-bold">{portGroups.length}</p>
                  <p className="text-muted-foreground text-xs">with payments</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-muted-foreground text-sm">Addresses</p>
                  <p className="text-2xl font-bold">{payments.length}</p>
                  <p className="text-muted-foreground text-xs">stealth</p>
                </CardContent>
              </Card>
            </div>

            {/* Port groups - clickable to collect */}
            <Card>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Select a Port to Collect</h3>
                  <p className="text-muted-foreground text-sm">Click to proceed</p>
                </div>
                <div className="space-y-2">
                  {portGroups.map((group) => (
                    <Link
                      key={group.portId}
                      href={`/collect/${group.portId}`}
                      className="bg-muted/50 hover:bg-muted hover:border-primary/50 flex items-center justify-between rounded-lg border border-transparent p-4 transition-all"
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
                          <p className="font-medium">{formatMnt(group.totalBalance)} MNT</p>
                          <p className="text-muted-foreground text-xs">
                            {formatMnt(group.totalVerifiedBalance)} pool-eligible
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
                <CardContent className="p-5">
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
          </>
        )}
      </div>
    </AppShell>
  )
}
