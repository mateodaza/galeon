'use client'

/**
 * Sync Status Banner
 *
 * Displays system health status as a banner.
 * Shows warning/error when system is degraded or unhealthy.
 */

import { useHealth } from '@/contexts/health-context'
import { AlertCircle, AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SyncStatusBannerProps {
  /** Show banner even when healthy (default: false) */
  showWhenHealthy?: boolean
  /** Custom class name */
  className?: string
}

export function SyncStatusBanner({ showWhenHealthy = false, className }: SyncStatusBannerProps) {
  const { overallStatus, health, isLoading, refresh, error } = useHealth()

  // Don't show anything while loading (prevent flicker)
  if (isLoading && !health) {
    return null
  }

  // Don't show when healthy unless explicitly requested
  if (overallStatus === 'healthy' && !showWhenHealthy) {
    return null
  }

  // Get appropriate icon and colors
  const getStatusConfig = () => {
    switch (overallStatus) {
      case 'healthy':
        return {
          icon: CheckCircle,
          bgClass: 'bg-emerald-500/10 border-emerald-500/20',
          textClass: 'text-emerald-400',
          message: 'All systems operational',
        }
      case 'degraded':
        return {
          icon: AlertTriangle,
          bgClass: 'bg-amber-500/10 border-amber-500/20',
          textClass: 'text-amber-400',
          message: 'Sync in progress - some operations may be delayed',
        }
      case 'unhealthy':
        return {
          icon: AlertCircle,
          bgClass: 'bg-red-500/10 border-red-500/20',
          textClass: 'text-red-400',
          message: error || 'System unavailable - please try again later',
        }
      default:
        return {
          icon: AlertCircle,
          bgClass: 'bg-slate-500/10 border-slate-500/20',
          textClass: 'text-slate-400',
          message: 'Checking system status...',
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  // Get specific blockers for unhealthy state
  const blockers =
    overallStatus === 'unhealthy'
      ? (health?.components
          .filter((c) => c.status === 'unhealthy')
          .map((c) => c.details.error || `${c.component} unavailable`)
          .filter(Boolean) ?? [])
      : []

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-3',
        config.bgClass,
        className
      )}
    >
      <Icon className={cn('h-5 w-5 flex-shrink-0', config.textClass)} />

      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium', config.textClass)}>{config.message}</p>
        {blockers.length > 0 && (
          <ul className="mt-1 list-inside list-disc text-xs text-slate-400">
            {blockers.slice(0, 3).map((blocker, i) => (
              <li key={i}>{blocker}</li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={refresh}
        disabled={isLoading}
        className={cn(
          'rounded-md p-2 transition-colors hover:bg-white/5',
          isLoading && 'animate-spin'
        )}
        aria-label="Refresh status"
      >
        <RefreshCw className="h-4 w-4 text-slate-400" />
      </button>
    </div>
  )
}

/**
 * Compact version for inline use
 */
export function SyncStatusIndicator({ className }: { className?: string }) {
  const { overallStatus, isLoading } = useHealth()

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="h-2 w-2 animate-pulse rounded-full bg-slate-500" />
        <span className="text-xs text-slate-500">Checking...</span>
      </div>
    )
  }

  const statusConfig = {
    healthy: { color: 'bg-emerald-500', label: 'Synced' },
    degraded: { color: 'bg-amber-500', label: 'Syncing' },
    unhealthy: { color: 'bg-red-500', label: 'Offline' },
    unknown: { color: 'bg-slate-500', label: 'Unknown' },
  }

  const config = statusConfig[overallStatus]

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('h-2 w-2 rounded-full', config.color)} />
      <span className="text-xs text-slate-400">{config.label}</span>
    </div>
  )
}
