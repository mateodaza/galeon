'use client'

/**
 * Health Context
 *
 * Provides system health status and operation availability throughout the app.
 * Polls the health API and caches results for efficient access.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import { healthApi, type SystemHealth, type PreflightResult, type HealthStatus } from '@/lib/api'

/** Health poll interval (30 seconds) */
const HEALTH_POLL_INTERVAL_MS = 30_000

/** Cache duration for preflight results (10 seconds) */
const PREFLIGHT_CACHE_MS = 10_000

interface HealthContextValue {
  /** Current system health (null if not yet loaded) */
  health: SystemHealth | null
  /** Whether health is being loaded */
  isLoading: boolean
  /** Last error from health check */
  error: string | null
  /** Overall system status */
  overallStatus: HealthStatus | 'unknown'
  /** Quick pay operation availability */
  canQuickPay: boolean
  /** Stealth pay operation availability */
  canStealthPay: boolean
  /** Private send operation availability */
  canPrivateSend: boolean
  /** Blockers for quick pay */
  quickPayBlockers: string[]
  /** Blockers for stealth pay */
  stealthPayBlockers: string[]
  /** Blockers for private send */
  privateSendBlockers: string[]
  /** Manually refresh health status */
  refresh: () => Promise<void>
  /** Run pre-flight check for private send */
  preflightPrivateSend: (poolAddress: string, depositLabel: string) => Promise<PreflightResult>
}

const HealthContext = createContext<HealthContextValue | null>(null)

interface HealthProviderProps {
  children: ReactNode
  /** Chain ID to check health for */
  chainId?: number
  /** Whether to auto-poll health (default: true) */
  autoPoll?: boolean
}

export function HealthProvider({ children, chainId, autoPoll = true }: HealthProviderProps) {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cache for preflight results
  const preflightCache = useRef<Map<string, { result: PreflightResult; timestamp: number }>>(
    new Map()
  )

  // Fetch health status
  const fetchHealth = useCallback(async () => {
    try {
      const result = await healthApi.getStatus(chainId)
      setHealth(result)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch health status'
      setError(message)
      console.error('[HealthContext] Fetch failed:', message)
    } finally {
      setIsLoading(false)
    }
  }, [chainId])

  // Manual refresh
  const refresh = useCallback(async () => {
    setIsLoading(true)
    await fetchHealth()
  }, [fetchHealth])

  // Pre-flight check for private send with caching
  const preflightPrivateSend = useCallback(
    async (poolAddress: string, depositLabel: string): Promise<PreflightResult> => {
      const cacheKey = `${poolAddress}-${depositLabel}`
      const cached = preflightCache.current.get(cacheKey)

      // Return cached result if still valid
      if (cached && Date.now() - cached.timestamp < PREFLIGHT_CACHE_MS) {
        return cached.result
      }

      // Fetch new result
      const result = await healthApi.preflight('privatesend', {
        poolAddress,
        depositLabel,
        chainId,
      })

      // Cache the result
      preflightCache.current.set(cacheKey, {
        result,
        timestamp: Date.now(),
      })

      return result
    },
    [chainId]
  )

  // Initial fetch and polling
  useEffect(() => {
    fetchHealth()

    if (!autoPoll) return

    const interval = setInterval(fetchHealth, HEALTH_POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchHealth, autoPoll])

  // Derived values
  const overallStatus: HealthStatus | 'unknown' = health?.overall ?? 'unknown'
  const canQuickPay = health?.operations.quickPay.available ?? false
  const canStealthPay = health?.operations.stealthPay.available ?? false
  const canPrivateSend = health?.operations.privateSend.available ?? false
  const quickPayBlockers = health?.operations.quickPay.blockers ?? []
  const stealthPayBlockers = health?.operations.stealthPay.blockers ?? []
  const privateSendBlockers = health?.operations.privateSend.blockers ?? []

  const value: HealthContextValue = {
    health,
    isLoading,
    error,
    overallStatus,
    canQuickPay,
    canStealthPay,
    canPrivateSend,
    quickPayBlockers,
    stealthPayBlockers,
    privateSendBlockers,
    refresh,
    preflightPrivateSend,
  }

  return <HealthContext.Provider value={value}>{children}</HealthContext.Provider>
}

/**
 * Hook to access health context
 */
export function useHealth(): HealthContextValue {
  const context = useContext(HealthContext)
  if (!context) {
    throw new Error('useHealth must be used within a HealthProvider')
  }
  return context
}

/**
 * Hook to check if a specific operation is available
 */
export function useOperationAvailable(operation: 'quickPay' | 'stealthPay' | 'privateSend'): {
  available: boolean
  blockers: string[]
  isLoading: boolean
} {
  const { health, isLoading } = useHealth()

  if (!health) {
    return { available: false, blockers: [], isLoading }
  }

  const operationStatus = health.operations[operation]
  return {
    available: operationStatus.available,
    blockers: operationStatus.blockers,
    isLoading,
  }
}
