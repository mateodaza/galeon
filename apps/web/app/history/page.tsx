'use client'

/**
 * Payment History Page
 *
 * Shows all payments the user has SENT (outgoing payments).
 * For incoming payments to ports, users can view them on individual port collect pages.
 *
 * Privacy-first design:
 * - Wallet & Port payments: Tracked on backend (user opted to record)
 * - Pool payments: Reconstructed client-side using user's keys (privacy preserved)
 */

import { useState, useEffect, useCallback, useRef, useTransition } from 'react'
import Link from 'next/link'
import { formatEther } from 'viem'
import {
  ArrowUpRight,
  ExternalLink,
  Loader2,
  Wallet,
  EyeOff,
  Lock,
  Info,
  RefreshCw,
  Shield,
} from 'lucide-react'
import { AppShell, PageHeader } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { sentPaymentsApi, type SentPayment, type PaymentSource } from '@/lib/api'
import { getTxExplorerUrl } from '@/lib/chains'
import { usePoolWithdrawalHistory } from '@/hooks/use-pool-withdrawal-history'
import { usePoolContext } from '@/contexts/pool-context'

type FilterType = 'all' | PaymentSource

/** Unified payment type for display */
interface DisplayPayment {
  id: string
  txHash: string
  recipient: string
  recipientName: string | null
  amount: string
  currency: string
  source: PaymentSource
  memo: string | null
  status: 'pending' | 'confirmed' | 'failed'
  timestamp: string
  isClientSide?: boolean
}

export default function HistoryPage() {
  const [backendPayments, setBackendPayments] = useState<SentPayment[]>([])
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [stats, setStats] = useState<{
    wallet: { total: string; count: number }
    port: { total: string; count: number }
    pool: { total: string; count: number }
    grandTotal: string
  } | null>(null)

  // Use transition for smooth filter changes
  const [isPending, startTransition] = useTransition()
  // Track if we're refreshing (for refresh button state)
  const isRefreshingRef = useRef(false)

  // Client-side pool withdrawal history
  const {
    withdrawals: poolWithdrawals,
    isLoading: isLoadingPool,
    refresh: refreshPool,
  } = usePoolWithdrawalHistory()
  const { hasPoolKeys } = usePoolContext()

  // Fetch ALL backend payments once, then filter client-side
  const fetchPayments = useCallback(async () => {
    setError(null)
    try {
      const [paymentsRes, statsRes] = await Promise.all([
        sentPaymentsApi.list({ limit: 50 }), // Fetch all, filter client-side
        sentPaymentsApi.getStats(),
      ])
      // Filter out pool payments from backend (we reconstruct those client-side)
      const nonPoolPayments = paymentsRes.data.filter((p) => p.source !== 'pool')
      setBackendPayments(nonPoolPayments)
      setStats({
        ...statsRes.bySource,
        grandTotal: statsRes.grandTotal,
      })
    } catch (err) {
      console.error('Failed to fetch payments:', err)
      setError('Failed to load payment history')
    } finally {
      setIsInitialLoad(false)
      isRefreshingRef.current = false
    }
  }, [])

  // Fetch backend payments on mount only (not on filter change)
  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  // Handle filter changes with transition for smooth UI
  const handleFilterChange = useCallback((newFilter: FilterType) => {
    startTransition(() => {
      setFilter(newFilter)
    })
  }, [])

  // Fetch pool withdrawals when pool keys are available
  useEffect(() => {
    if (hasPoolKeys) {
      refreshPool()
    }
  }, [hasPoolKeys, refreshPool])

  // Merge backend payments with client-side pool withdrawals
  const allPayments: DisplayPayment[] = [
    // Backend payments (wallet, port)
    ...backendPayments.map(
      (p): DisplayPayment => ({
        id: p.id,
        txHash: p.txHash,
        recipient: p.recipientAddress,
        recipientName: p.recipientPortName,
        amount: p.amount,
        currency: p.currency,
        source: p.source,
        memo: p.memo,
        status: p.status,
        timestamp: p.createdAt,
        isClientSide: false,
      })
    ),
    // Client-side pool withdrawals (use index to avoid key collision for batched txs)
    ...poolWithdrawals.map(
      (w, idx): DisplayPayment => ({
        id: `pool-${w.txHash}-${idx}`,
        txHash: w.txHash,
        recipient: w.recipient,
        recipientName: null,
        amount: w.amount,
        currency: 'MNT',
        source: 'pool' as const,
        memo: null,
        status: 'confirmed',
        timestamp: new Date(Number(w.blockTimestamp) * 1000).toISOString(),
        isClientSide: true,
      })
    ),
  ]
    // Filter by source if needed
    .filter((p) => filter === 'all' || p.source === filter)
    // Sort by timestamp (newest first)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // Calculate pool stats from client-side data
  const poolStats = {
    total: poolWithdrawals.reduce((sum, w) => sum + BigInt(w.amount), BigInt(0)).toString(),
    count: poolWithdrawals.length,
  }

  const formatAmount = (wei: string) => {
    const num = parseFloat(formatEther(BigInt(wei)))
    if (num === 0) return '0'
    if (num < 0.0001) return '<0.0001'
    return num.toLocaleString('en-US', { maximumFractionDigits: 4 })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const shortenAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  const getSourceIcon = (source: PaymentSource) => {
    switch (source) {
      case 'wallet':
        return <Wallet className="h-4 w-4" />
      case 'port':
        return <EyeOff className="h-4 w-4" />
      case 'pool':
        return <Lock className="h-4 w-4" />
    }
  }

  const getSourceLabel = (source: PaymentSource) => {
    switch (source) {
      case 'wallet':
        return 'Quick Pay'
      case 'port':
        return 'Stealth Pay'
      case 'pool':
        return 'Private Send'
    }
  }

  const getSourceColor = (source: PaymentSource) => {
    switch (source) {
      case 'wallet':
        return 'text-cyan-500 bg-cyan-500/10'
      case 'port':
        return 'text-amber-500 bg-amber-500/10'
      case 'pool':
        return 'text-emerald-500 bg-emerald-500/10'
    }
  }

  const handleRefresh = async () => {
    isRefreshingRef.current = true
    await Promise.all([fetchPayments(), hasPoolKeys ? refreshPool() : Promise.resolve()])
  }

  // Show refresh spinner only when explicitly refreshing, not during initial load
  const isRefreshing = isRefreshingRef.current || isLoadingPool

  return (
    <AppShell requireAuth requireKeys>
      <PageHeader
        title="Payment History"
        description="Your outgoing payments. Incoming payments to ports are shown in each port's collect page."
      />

      {/* Privacy Notice */}
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <Shield className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
        <div className="text-sm">
          <p className="text-foreground font-medium">Privacy-First History</p>
          <p className="text-muted-foreground mt-1">
            <strong>Private Send</strong> payments are so private that even we can't track them.
            They're reconstructed client-side using your keys.{' '}
            {!hasPoolKeys && (
              <Link href="/pool" className="text-emerald-500 hover:underline">
                Unlock your pool keys
              </Link>
            )}
            {hasPoolKeys && ' Your pool history is being computed locally.'}
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-cyan-500" />
        <div className="text-sm">
          <p className="text-foreground font-medium">About Payment History</p>
          <p className="text-muted-foreground mt-1">
            This page shows payments you've <strong>sent</strong> from your wallet, stealth funds,
            or privacy pool. To see payments you've <strong>received</strong>, go to{' '}
            <Link href="/receive" className="text-cyan-500 hover:underline">
              Receive
            </Link>{' '}
            and check each port's collection page.
          </p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Quick Pay"
            icon={<Wallet className="h-5 w-5 text-cyan-500" />}
            value={`${formatAmount(stats.wallet.total)} MNT`}
            count={stats.wallet.count}
            color="cyan"
          />
          <StatCard
            label="Stealth Pay"
            icon={<EyeOff className="h-5 w-5 text-amber-500" />}
            value={`${formatAmount(stats.port.total)} MNT`}
            count={stats.port.count}
            color="amber"
          />
          <StatCard
            label="Private Send"
            icon={<Lock className="h-5 w-5 text-emerald-500" />}
            value={`${formatAmount(poolStats.total)} MNT`}
            count={poolStats.count}
            color="emerald"
            isClientSide
          />
        </div>
      )}

      {/* Filter & Refresh */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex gap-2">
          <FilterButton active={filter === 'all'} onClick={() => handleFilterChange('all')}>
            All
          </FilterButton>
          <FilterButton active={filter === 'wallet'} onClick={() => handleFilterChange('wallet')}>
            <Wallet className="mr-1 h-3 w-3" />
            Quick
          </FilterButton>
          <FilterButton active={filter === 'port'} onClick={() => handleFilterChange('port')}>
            <EyeOff className="mr-1 h-3 w-3" />
            Stealth
          </FilterButton>
          <FilterButton active={filter === 'pool'} onClick={() => handleFilterChange('pool')}>
            <Lock className="mr-1 h-3 w-3" />
            Private
          </FilterButton>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`mr-1 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Payments List */}
      <Card className="mt-4">
        <CardContent className="p-0">
          {/* Only show full loader on initial load, not during filter transitions */}
          {isInitialLoad ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="text-primary h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-destructive py-12 text-center">{error}</div>
          ) : allPayments.length === 0 ? (
            <div className="py-12 text-center">
              <ArrowUpRight className="text-muted-foreground mx-auto h-12 w-12" />
              <h3 className="text-foreground mt-4 font-semibold">No Payments Yet</h3>
              <p className="text-muted-foreground mt-2 text-sm">
                {filter === 'all'
                  ? "You haven't sent any payments yet."
                  : `No ${getSourceLabel(filter as PaymentSource)} payments found.`}
              </p>
              <Link href="/pay">
                <Button className="mt-4">Send Your First Payment</Button>
              </Link>
            </div>
          ) : (
            <div
              className={`divide-border divide-y transition-opacity duration-150 ${isPending ? 'opacity-70' : 'opacity-100'}`}
            >
              {allPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="hover:bg-muted/50 flex items-center gap-4 p-4 transition-colors"
                >
                  {/* Source Icon */}
                  <div className={`rounded-lg p-2 ${getSourceColor(payment.source)}`}>
                    {getSourceIcon(payment.source)}
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground font-medium">
                        {payment.recipientName || shortenAddress(payment.recipient)}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${getSourceColor(payment.source)}`}
                      >
                        {getSourceLabel(payment.source)}
                      </span>
                      {payment.isClientSide && (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-500">
                          Local
                        </span>
                      )}
                      {payment.status === 'pending' && (
                        <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-600">
                          Pending
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
                      <span>{formatDate(payment.timestamp)}</span>
                      <span>·</span>
                      <a
                        href={getTxExplorerUrl(payment.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-cyan-500 hover:underline"
                      >
                        {shortenAddress(payment.txHash)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    {payment.memo && (
                      <p className="text-muted-foreground mt-1 truncate text-xs">
                        Memo: {payment.memo}
                      </p>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    <p className="text-foreground font-semibold">
                      -{formatAmount(payment.amount)} {payment.currency}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  )
}

function StatCard({
  label,
  icon,
  value,
  count,
  color,
  isClientSide,
}: {
  label: string
  icon: React.ReactNode
  value: string
  count: number
  color: 'cyan' | 'amber' | 'emerald'
  isClientSide?: boolean
}) {
  const colorClasses = {
    cyan: 'border-cyan-500/20 bg-cyan-500/5',
    amber: 'border-amber-500/20 bg-amber-500/5',
    emerald: 'border-emerald-500/20 bg-emerald-500/5',
  }

  return (
    <Card className={`border ${colorClasses[color]}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <div className="flex items-center gap-1">
              <p className="text-muted-foreground text-xs">{label}</p>
              {isClientSide && <span className="text-[10px] text-emerald-500">(local)</span>}
            </div>
            <p className="text-foreground font-semibold">{value}</p>
            <p className="text-muted-foreground text-xs">
              {count} payment{count !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      }`}
    >
      {children}
    </button>
  )
}
