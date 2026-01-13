'use client'

/**
 * Privacy Health Card
 *
 * Displays the current privacy strength of the pool based on anonymity set metrics.
 * Shows recommendations for improving privacy.
 */

import { useEffect, useState } from 'react'
import { Shield, AlertTriangle, CheckCircle2, Info, RefreshCw } from 'lucide-react'
import { useChainId } from 'wagmi'
import { healthApi, type PoolPrivacyHealth, type PrivacyStrength } from '@/lib/api'
import { getPoolContracts, DEFAULT_CHAIN_ID, type SupportedChainId } from '@/lib/contracts'

const strengthConfig: Record<
  PrivacyStrength,
  { label: string; color: string; bgColor: string; icon: typeof Shield; tooltip: string }
> = {
  strong: {
    label: 'Strong',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10 border-emerald-500/30',
    icon: CheckCircle2,
    tooltip: 'Your withdrawal blends in with many others.',
  },
  moderate: {
    label: 'Moderate',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 border-blue-500/30',
    icon: Shield,
    tooltip: 'Good privacy. More deposits would make it stronger.',
  },
  weak: {
    label: 'Weak',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10 border-amber-500/30',
    icon: AlertTriangle,
    tooltip: 'Limited pool activity. Privacy improves as more people use the pool.',
  },
  minimal: {
    label: 'Minimal',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10 border-red-500/30',
    icon: AlertTriangle,
    tooltip: 'Very few deposits yet. Consider waiting for more pool activity.',
  },
}

export function PrivacyHealthCard() {
  const chainId = useChainId()
  const [health, setHealth] = useState<PoolPrivacyHealth | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get pool address from centralized config
  const effectiveChainId = (chainId ?? DEFAULT_CHAIN_ID) as SupportedChainId
  const poolAddress = getPoolContracts(effectiveChainId)?.pool

  const fetchHealth = async () => {
    if (!poolAddress) {
      setError('Pool not configured for this chain')
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const data = await healthApi.getPoolPrivacy(poolAddress)
      setHealth(data)
    } catch (err) {
      console.error('[PrivacyHealthCard] Failed to fetch:', err)
      setError('Unable to check pool privacy')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
    // Refresh every 5 minutes
    const interval = setInterval(fetchHealth, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [poolAddress])

  if (isLoading) {
    return (
      <div className="text-muted-foreground mt-4 flex items-center gap-2 text-xs">
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span>Checking pool privacy...</span>
      </div>
    )
  }

  if (error || !health) {
    return (
      <div className="text-muted-foreground mt-4 flex items-center gap-2 text-xs">
        <Info className="h-3 w-3" />
        <span>{error || 'Privacy check unavailable'}</span>
        <button onClick={fetchHealth} className="hover:text-foreground ml-1">
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>
    )
  }

  const config = strengthConfig[health.strength]
  const Icon = config.icon

  return (
    <div className="mt-4 flex items-center gap-4 text-xs">
      {/* Strength indicator */}
      <div className="flex cursor-help items-center gap-1.5" title={config.tooltip}>
        <Icon className={`h-3.5 w-3.5 ${config.color}`} />
        <span className={`font-medium ${config.color}`}>{config.label} Privacy</span>
      </div>

      {/* Compact metrics */}
      <div className="text-muted-foreground flex items-center gap-3">
        <span>
          <span className="text-foreground font-mono font-medium">{health.anonymitySetSize}</span>{' '}
          deposits
        </span>
        <span className="text-muted-foreground/50">·</span>
        <span>
          <span className="text-foreground font-mono font-medium">{health.uniqueDepositors}</span>{' '}
          depositors
        </span>
      </div>

      {/* Info link + Refresh button */}
      <div className="ml-auto flex items-center gap-2">
        <a
          href="/about#privacy-metrics"
          className="text-muted-foreground hover:text-foreground"
          title="How we measure privacy"
        >
          <Info className="h-3 w-3" />
        </a>
        <button
          onClick={fetchHealth}
          className="text-muted-foreground hover:text-foreground"
          title="Refresh"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}
