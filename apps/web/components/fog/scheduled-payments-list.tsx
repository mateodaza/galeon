'use client'

/**
 * ScheduledPaymentsList component for displaying scheduled payments and hops.
 *
 * Shows pending, executing, and recent completed/failed items.
 * Allows cancelling pending items and viewing transaction links.
 */

import { useMemo } from 'react'
import {
  Clock,
  X,
  ExternalLink,
  Loader2,
  Check,
  AlertTriangle,
  Calendar,
  ArrowRight,
  Send,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useScheduledPaymentContext } from '@/contexts/scheduled-payment-context'
import { cn } from '@/lib/utils'
import type { ScheduledPayment, ScheduledHop } from '@/types/fog'

// ============================================================
// Helper Functions
// ============================================================

function formatTimeUntil(executeAt: number): string {
  const now = Date.now()
  const diff = executeAt - now

  if (diff <= 0) return 'Executing soon...'

  const hours = Math.floor(diff / (60 * 60 * 1000))
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000))

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

function formatExecutionTime(executeAt: number): string {
  return new Date(executeAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function truncateAddress(address: string): string {
  if (address.startsWith('st:')) {
    return address.slice(0, 12) + '...' + address.slice(-6)
  }
  return address.slice(0, 6) + '...' + address.slice(-4)
}

// ============================================================
// Status Badge Component
// ============================================================

function StatusBadge({
  status,
  executeAt,
}: {
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled'
  executeAt: number
}) {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className="gap-1 border-blue-500/30 text-blue-500">
          <Clock className="h-3 w-3" />
          {formatTimeUntil(executeAt)}
        </Badge>
      )
    case 'executing':
      return (
        <Badge variant="outline" className="gap-1 border-yellow-500/30 text-yellow-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          Executing...
        </Badge>
      )
    case 'completed':
      return (
        <Badge variant="outline" className="gap-1 border-green-500/30 text-green-500">
          <Check className="h-3 w-3" />
          Done
        </Badge>
      )
    case 'failed':
      return (
        <Badge variant="outline" className="gap-1 border-red-500/30 text-red-500">
          <AlertTriangle className="h-3 w-3" />
          Failed
        </Badge>
      )
    case 'cancelled':
      return (
        <Badge variant="outline" className="text-muted-foreground gap-1">
          <X className="h-3 w-3" />
          Cancelled
        </Badge>
      )
  }
}

// ============================================================
// Payment Item Component
// ============================================================

function ScheduledPaymentItem({
  payment,
  onCancel,
  onExecuteNow,
}: {
  payment: ScheduledPayment
  onCancel: () => void
  onExecuteNow: () => void
}) {
  const isPending = payment.status === 'pending'
  const isExecuting = payment.status === 'executing'
  const isCompleted = payment.status === 'completed'
  const isFailed = payment.status === 'failed'
  const isCancelled = payment.status === 'cancelled'

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border p-3',
        isPending && 'border-blue-500/20 bg-blue-500/5',
        isExecuting && 'border-yellow-500/20 bg-yellow-500/5',
        isCompleted && 'border-green-500/20 bg-green-500/5',
        isFailed && 'border-red-500/20 bg-red-500/5',
        isCancelled && 'border-muted bg-muted/50 opacity-50'
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Send className="text-muted-foreground h-3 w-3" />
          <span className="text-foreground text-sm font-medium">{payment.amount} MNT</span>
          <span className="text-muted-foreground text-xs">
            to {truncateAddress(payment.recipientInput)}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">From {payment.fogWalletName}</span>
          {isPending && (
            <span className="text-muted-foreground">
              at {formatExecutionTime(payment.executeAt)}
            </span>
          )}
        </div>
        {isFailed && payment.error && <p className="mt-1 text-xs text-red-500">{payment.error}</p>}
      </div>

      <div className="flex items-center gap-2">
        <StatusBadge status={payment.status} executeAt={payment.executeAt} />

        {isPending && (
          <>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={onExecuteNow}>
              Pay Now
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground h-8 w-8 hover:text-red-500"
              onClick={onCancel}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        )}

        {isCompleted && payment.txHash && (
          <a
            href={`https://explorer.mantle.xyz/tx/${payment.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Hop Item Component
// ============================================================

function ScheduledHopItem({
  hop,
  onCancel,
  onExecuteNow,
}: {
  hop: ScheduledHop
  onCancel: () => void
  onExecuteNow: () => void
}) {
  const isPending = hop.status === 'pending'
  const isExecuting = hop.status === 'executing'
  const isCompleted = hop.status === 'completed'
  const isFailed = hop.status === 'failed'
  const isCancelled = hop.status === 'cancelled'

  // Format amount for display
  const amountFormatted = (BigInt(hop.amount) / BigInt(10 ** 18)).toString()

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border p-3',
        isPending && 'border-purple-500/20 bg-purple-500/5',
        isExecuting && 'border-yellow-500/20 bg-yellow-500/5',
        isCompleted && 'border-green-500/20 bg-green-500/5',
        isFailed && 'border-red-500/20 bg-red-500/5',
        isCancelled && 'border-muted bg-muted/50 opacity-50'
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <ArrowRight className="text-muted-foreground h-3 w-3" />
          <span className="text-foreground text-sm font-medium">Hop: {amountFormatted} MNT</span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">
            {hop.sourceWalletName} → {hop.targetWalletName}
          </span>
          {isPending && (
            <span className="text-muted-foreground">at {formatExecutionTime(hop.executeAt)}</span>
          )}
        </div>
        {isFailed && hop.error && <p className="mt-1 text-xs text-red-500">{hop.error}</p>}
      </div>

      <div className="flex items-center gap-2">
        <StatusBadge status={hop.status} executeAt={hop.executeAt} />

        {isPending && (
          <>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={onExecuteNow}>
              Hop Now
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground h-8 w-8 hover:text-red-500"
              onClick={onCancel}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        )}

        {isCompleted && hop.txHash && (
          <a
            href={`https://explorer.mantle.xyz/tx/${hop.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================

interface ScheduledPaymentsListProps {
  /** Whether to show in compact mode */
  compact?: boolean
  /** Maximum number of items to show */
  maxItems?: number
  className?: string
}

export function ScheduledPaymentsList({
  compact = false,
  maxItems = 10,
  className,
}: ScheduledPaymentsListProps) {
  const {
    scheduledPayments,
    scheduledHops,
    cancelPayment,
    cancelHop,
    executePaymentNow,
    executeHopNow,
  } = useScheduledPaymentContext()

  // Combine and sort all scheduled items
  type ScheduledItem =
    | { type: 'payment'; data: ScheduledPayment }
    | { type: 'hop'; data: ScheduledHop }

  const displayItems = useMemo(() => {
    const items: ScheduledItem[] = [
      ...scheduledPayments.map((p) => ({ type: 'payment' as const, data: p })),
      ...scheduledHops.map((h) => ({ type: 'hop' as const, data: h })),
    ]

    // Sort: pending/executing first, then by scheduled time
    const sorted = items.sort((a, b) => {
      const aStatus = a.data.status
      const bStatus = b.data.status

      // Pending/executing first
      if (aStatus === 'pending' && bStatus !== 'pending') return -1
      if (aStatus !== 'pending' && bStatus === 'pending') return 1
      if (aStatus === 'executing' && bStatus !== 'executing') return -1
      if (aStatus !== 'executing' && bStatus === 'executing') return 1

      // Then by scheduled time (newest first)
      return b.data.scheduledAt - a.data.scheduledAt
    })

    return sorted.slice(0, maxItems)
  }, [scheduledPayments, scheduledHops, maxItems])

  // Count pending
  const pendingCount = useMemo(() => {
    const pendingPayments = scheduledPayments.filter((p) => p.status === 'pending').length
    const pendingHops = scheduledHops.filter((h) => h.status === 'pending').length
    return pendingPayments + pendingHops
  }, [scheduledPayments, scheduledHops])

  if (displayItems.length === 0) {
    return null
  }

  const renderItem = (item: ScheduledItem) => {
    if (item.type === 'payment') {
      return (
        <ScheduledPaymentItem
          key={item.data.id}
          payment={item.data}
          onCancel={() => cancelPayment(item.data.id)}
          onExecuteNow={() => executePaymentNow(item.data.id)}
        />
      )
    } else {
      return (
        <ScheduledHopItem
          key={item.data.id}
          hop={item.data}
          onCancel={() => cancelHop(item.data.id)}
          onExecuteNow={() => executeHopNow(item.data.id)}
        />
      )
    }
  }

  if (compact) {
    return <div className={cn('space-y-2', className)}>{displayItems.map(renderItem)}</div>
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4" />
          Scheduled Transfers
          {pendingCount > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {pendingCount} pending
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">{displayItems.map(renderItem)}</CardContent>
    </Card>
  )
}
