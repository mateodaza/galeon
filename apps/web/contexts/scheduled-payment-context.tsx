'use client'

/**
 * Scheduled payment and hop context for Galeon.
 *
 * Manages scheduled payments and hops for timing privacy.
 * Both are stored in localStorage and executed after a delay.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { useAccount } from 'wagmi'
import { useStealthContext } from './stealth-context'
import { useFogContext } from './fog-context'
import { useFogPayment } from '@/hooks/use-fog-payment'
import type { ScheduledPayment, ScheduledHop, ScheduledPaymentContextValue } from '@/types/fog'

// ============================================================
// Storage
// ============================================================

const PAYMENTS_STORAGE_KEY_PREFIX = 'galeon-scheduled-payments-'
const HOPS_STORAGE_KEY_PREFIX = 'galeon-scheduled-hops-'

function getPaymentsStorageKey(address: string): string {
  return `${PAYMENTS_STORAGE_KEY_PREFIX}${address.toLowerCase()}`
}

function getHopsStorageKey(address: string): string {
  return `${HOPS_STORAGE_KEY_PREFIX}${address.toLowerCase()}`
}

function loadScheduledPayments(address: string): ScheduledPayment[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(getPaymentsStorageKey(address))
    if (!stored) return []
    return JSON.parse(stored)
  } catch {
    return []
  }
}

function saveScheduledPayments(address: string, payments: ScheduledPayment[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(getPaymentsStorageKey(address), JSON.stringify(payments))
  } catch (err) {
    console.error('[Scheduled] Failed to save payments:', err)
  }
}

function loadScheduledHops(address: string): ScheduledHop[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(getHopsStorageKey(address))
    if (!stored) return []
    return JSON.parse(stored)
  } catch {
    return []
  }
}

function saveScheduledHops(address: string, hops: ScheduledHop[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(getHopsStorageKey(address), JSON.stringify(hops))
  } catch (err) {
    console.error('[Scheduled] Failed to save hops:', err)
  }
}

// ============================================================
// Context
// ============================================================

const ScheduledPaymentContext = createContext<ScheduledPaymentContextValue | null>(null)

interface ScheduledPaymentProviderProps {
  children: ReactNode
}

/**
 * Provider component for scheduled payments and hops.
 * Must be wrapped inside StealthProvider and FogProvider.
 */
export function ScheduledPaymentProvider({ children }: ScheduledPaymentProviderProps) {
  const { address, isConnected } = useAccount()
  const { hasKeys } = useStealthContext()
  const { markAsFunded, refreshBalances, getFogWallet } = useFogContext()
  const { payFromFog, transferToFogWallet } = useFogPayment()

  const [scheduledPayments, setScheduledPayments] = useState<ScheduledPayment[]>([])
  const [scheduledHops, setScheduledHops] = useState<ScheduledHop[]>([])
  const executingPaymentsRef = useRef<Set<string>>(new Set())
  const executingHopsRef = useRef<Set<string>>(new Set())

  // Load scheduled payments and hops on mount
  useEffect(() => {
    if (!address) {
      setScheduledPayments([])
      setScheduledHops([])
      return
    }
    // Load payments
    const payments = loadScheduledPayments(address)
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    const validPayments = payments.filter(
      (p) => p.status === 'pending' || p.status === 'executing' || p.scheduledAt > cutoff
    )
    setScheduledPayments(validPayments)
    console.log(`[Scheduled] Loaded ${validPayments.length} scheduled payments`)

    // Load hops
    const hops = loadScheduledHops(address)
    const validHops = hops.filter(
      (h) => h.status === 'pending' || h.status === 'executing' || h.scheduledAt > cutoff
    )
    setScheduledHops(validHops)
    console.log(`[Scheduled] Loaded ${validHops.length} scheduled hops`)
  }, [address])

  // Save payments to localStorage when they change
  useEffect(() => {
    if (!address) return
    saveScheduledPayments(address, scheduledPayments)
  }, [address, scheduledPayments])

  // Save hops to localStorage when they change
  useEffect(() => {
    if (!address) return
    saveScheduledHops(address, scheduledHops)
  }, [address, scheduledHops])

  // Clear on disconnect
  useEffect(() => {
    if (!isConnected) {
      setScheduledPayments([])
      setScheduledHops([])
    }
  }, [isConnected])

  // ============================================================
  // Auto-execution of scheduled payments
  // ============================================================

  useEffect(() => {
    if (!hasKeys) return

    const checkPayments = async () => {
      const now = Date.now()
      const pendingPayments = scheduledPayments.filter(
        (p) =>
          p.status === 'pending' && p.executeAt <= now && !executingPaymentsRef.current.has(p.id)
      )

      for (const payment of pendingPayments) {
        executingPaymentsRef.current.add(payment.id)

        // Update status to executing
        setScheduledPayments((prev) =>
          prev.map((p) => (p.id === payment.id ? { ...p, status: 'executing' as const } : p))
        )

        try {
          console.log(`[Scheduled] Executing payment ${payment.id}`)
          const result = await payFromFog(
            payment.fogIndex,
            payment.recipientInput,
            payment.amount,
            payment.memo
          )

          setScheduledPayments((prev) =>
            prev.map((p) =>
              p.id === payment.id
                ? { ...p, status: 'completed' as const, txHash: result.txHash }
                : p
            )
          )
          console.log(`[Scheduled] Payment ${payment.id} completed: ${result.txHash}`)
        } catch (err) {
          const error = err instanceof Error ? err.message : 'Payment failed'
          setScheduledPayments((prev) =>
            prev.map((p) => (p.id === payment.id ? { ...p, status: 'failed' as const, error } : p))
          )
          console.error(`[Scheduled] Payment ${payment.id} failed:`, err)
        } finally {
          executingPaymentsRef.current.delete(payment.id)
        }
      }
    }

    // Check every 30 seconds
    const interval = setInterval(checkPayments, 30 * 1000)
    checkPayments()

    return () => clearInterval(interval)
  }, [hasKeys, scheduledPayments, payFromFog])

  // ============================================================
  // Auto-execution of scheduled hops
  // ============================================================

  useEffect(() => {
    if (!hasKeys) return

    const checkHops = async () => {
      const now = Date.now()
      const pendingHops = scheduledHops.filter(
        (h) => h.status === 'pending' && h.executeAt <= now && !executingHopsRef.current.has(h.id)
      )

      for (const hop of pendingHops) {
        executingHopsRef.current.add(hop.id)

        // Update status to executing
        setScheduledHops((prev) =>
          prev.map((h) => (h.id === hop.id ? { ...h, status: 'executing' as const } : h))
        )

        try {
          console.log(`[Scheduled] Executing hop ${hop.id}`)

          // Transfer funds from source to target
          const txHash = await transferToFogWallet(hop.sourceFogIndex, hop.targetAddress)

          // Get source wallet for funding info
          const sourceWallet = getFogWallet(hop.sourceFogIndex)

          // Mark target as funded
          await markAsFunded(
            hop.targetFogIndex,
            'self',
            BigInt(hop.amount),
            txHash,
            sourceWallet?.stealthAddress
          )

          // Refresh balances
          await refreshBalances()

          setScheduledHops((prev) =>
            prev.map((h) => (h.id === hop.id ? { ...h, status: 'completed' as const, txHash } : h))
          )
          console.log(`[Scheduled] Hop ${hop.id} completed: ${txHash}`)
        } catch (err) {
          const error = err instanceof Error ? err.message : 'Hop failed'
          setScheduledHops((prev) =>
            prev.map((h) => (h.id === hop.id ? { ...h, status: 'failed' as const, error } : h))
          )
          console.error(`[Scheduled] Hop ${hop.id} failed:`, err)
        } finally {
          executingHopsRef.current.delete(hop.id)
        }
      }
    }

    // Check every 30 seconds
    const interval = setInterval(checkHops, 30 * 1000)
    checkHops()

    return () => clearInterval(interval)
  }, [hasKeys, scheduledHops, transferToFogWallet, markAsFunded, refreshBalances, getFogWallet])

  // ============================================================
  // Payment Actions
  // ============================================================

  const schedulePayment = useCallback(
    async (
      fogIndex: number,
      fogWalletName: string,
      recipientInput: string,
      amount: string,
      delayHours: number,
      memo?: string
    ): Promise<ScheduledPayment> => {
      const now = Date.now()
      const executeAt = now + delayHours * 60 * 60 * 1000

      const payment: ScheduledPayment = {
        id: `payment-${fogIndex}-${now}-${Math.random().toString(36).slice(2, 8)}`,
        fogIndex,
        fogWalletName,
        recipientInput,
        amount,
        memo,
        scheduledAt: now,
        executeAt,
        status: 'pending',
      }

      setScheduledPayments((prev) => [...prev, payment])
      console.log(`[Scheduled] Payment scheduled for ${new Date(executeAt).toLocaleString()}`)

      return payment
    },
    []
  )

  const cancelPayment = useCallback((id: string) => {
    setScheduledPayments((prev) =>
      prev.map((p) =>
        p.id === id && p.status === 'pending' ? { ...p, status: 'cancelled' as const } : p
      )
    )
    console.log(`[Scheduled] Payment ${id} cancelled`)
  }, [])

  const executePaymentNow = useCallback(
    async (id: string) => {
      const payment = scheduledPayments.find((p) => p.id === id)
      if (!payment || payment.status !== 'pending') return

      executingPaymentsRef.current.add(id)
      setScheduledPayments((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'executing' as const } : p))
      )

      try {
        const result = await payFromFog(
          payment.fogIndex,
          payment.recipientInput,
          payment.amount,
          payment.memo
        )

        setScheduledPayments((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, status: 'completed' as const, txHash: result.txHash } : p
          )
        )
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Payment failed'
        setScheduledPayments((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: 'failed' as const, error } : p))
        )
        throw err
      } finally {
        executingPaymentsRef.current.delete(id)
      }
    },
    [scheduledPayments, payFromFog]
  )

  // ============================================================
  // Hop Actions
  // ============================================================

  const scheduleHop = useCallback(
    async (
      sourceFogIndex: number,
      sourceWalletName: string,
      targetFogIndex: number,
      targetWalletName: string,
      targetAddress: `0x${string}`,
      amount: string,
      delayHours: number
    ): Promise<ScheduledHop> => {
      const now = Date.now()
      const executeAt = now + delayHours * 60 * 60 * 1000

      const hop: ScheduledHop = {
        id: `hop-${sourceFogIndex}-${now}-${Math.random().toString(36).slice(2, 8)}`,
        sourceFogIndex,
        sourceWalletName,
        targetFogIndex,
        targetWalletName,
        targetAddress,
        amount,
        scheduledAt: now,
        executeAt,
        status: 'pending',
      }

      setScheduledHops((prev) => [...prev, hop])
      console.log(`[Scheduled] Hop scheduled for ${new Date(executeAt).toLocaleString()}`)

      return hop
    },
    []
  )

  const cancelHop = useCallback((id: string) => {
    setScheduledHops((prev) =>
      prev.map((h) =>
        h.id === id && h.status === 'pending' ? { ...h, status: 'cancelled' as const } : h
      )
    )
    console.log(`[Scheduled] Hop ${id} cancelled`)
  }, [])

  const executeHopNow = useCallback(
    async (id: string) => {
      const hop = scheduledHops.find((h) => h.id === id)
      if (!hop || hop.status !== 'pending') return

      executingHopsRef.current.add(id)
      setScheduledHops((prev) =>
        prev.map((h) => (h.id === id ? { ...h, status: 'executing' as const } : h))
      )

      try {
        const txHash = await transferToFogWallet(hop.sourceFogIndex, hop.targetAddress)

        // Get source wallet for funding info
        const sourceWallet = getFogWallet(hop.sourceFogIndex)

        // Mark target as funded
        await markAsFunded(
          hop.targetFogIndex,
          'self',
          BigInt(hop.amount),
          txHash,
          sourceWallet?.stealthAddress
        )

        // Refresh balances
        await refreshBalances()

        setScheduledHops((prev) =>
          prev.map((h) => (h.id === id ? { ...h, status: 'completed' as const, txHash } : h))
        )
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Hop failed'
        setScheduledHops((prev) =>
          prev.map((h) => (h.id === id ? { ...h, status: 'failed' as const, error } : h))
        )
        throw err
      } finally {
        executingHopsRef.current.delete(id)
      }
    },
    [scheduledHops, transferToFogWallet, markAsFunded, refreshBalances, getFogWallet]
  )

  // ============================================================
  // Context Value
  // ============================================================

  const hasPendingPayments = useMemo(
    () => scheduledPayments.some((p) => p.status === 'pending'),
    [scheduledPayments]
  )

  const hasPendingHops = useMemo(
    () => scheduledHops.some((h) => h.status === 'pending'),
    [scheduledHops]
  )

  const value: ScheduledPaymentContextValue = {
    scheduledPayments,
    scheduledHops,
    hasPendingPayments,
    hasPendingHops,
    schedulePayment,
    scheduleHop,
    cancelPayment,
    cancelHop,
    executePaymentNow,
    executeHopNow,
  }

  return (
    <ScheduledPaymentContext.Provider value={value}>{children}</ScheduledPaymentContext.Provider>
  )
}

/**
 * Hook to access scheduled payment context.
 * Must be used within a ScheduledPaymentProvider.
 */
export function useScheduledPaymentContext(): ScheduledPaymentContextValue {
  const context = useContext(ScheduledPaymentContext)
  if (!context) {
    throw new Error('useScheduledPaymentContext must be used within a ScheduledPaymentProvider')
  }
  return context
}
