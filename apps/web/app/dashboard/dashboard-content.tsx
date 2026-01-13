'use client'

/**
 * Dashboard content component - loaded dynamically to avoid SSR BigInt issues.
 */

import { useMemo, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Anchor,
  Send,
  ArrowDownToLine,
  FileText,
  Loader2,
  Droplets,
  Clock,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react'
import * as m from 'motion/react-m'
import { useReducedMotion } from 'motion/react'
import { formatUnits } from 'viem'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePorts } from '@/hooks/use-ports'
import { usePoolContext } from '@/contexts/pool-context'
import { useCollection } from '@/hooks/use-collection'
import { receiptsApi, type ReceiptResponse } from '@/lib/api'

export default function DashboardContent() {
  const prefersReducedMotion = useReducedMotion()
  const { ports, isLoading } = usePorts({ enablePolling: true, pollingInterval: 15_000 })
  const { totalBalance: poolBalance, hasPoolKeys } = usePoolContext()
  const {
    totalBalanceFormatted: collectableBalanceFormatted,
    payments: collectablePayments,
    isScanning,
    hasKeys,
    scan,
  } = useCollection()

  // Recent receipts state
  const [recentReceipts, setRecentReceipts] = useState<ReceiptResponse[]>([])
  const [isLoadingReceipts, setIsLoadingReceipts] = useState(false)

  // Auto-scan on mount if keys available
  const hasScanned = useRef(false)
  useEffect(() => {
    if (hasKeys && !hasScanned.current && !isScanning) {
      hasScanned.current = true
      scan()
    }
  }, [hasKeys, isScanning, scan])

  // Fetch recent receipts
  useEffect(() => {
    const fetchReceipts = async () => {
      setIsLoadingReceipts(true)
      try {
        const response = await receiptsApi.list({ limit: 5 })
        setRecentReceipts(response.data)
      } catch (error) {
        console.error('[Dashboard] Failed to fetch receipts:', error)
      } finally {
        setIsLoadingReceipts(false)
      }
    }
    fetchReceipts()
  }, [])

  // Format amounts helper (assuming 18 decimals for MNT)
  const formatAmount = (wei: bigint) => {
    const formatted = formatUnits(wei, 18)
    const num = parseFloat(formatted)
    if (num === 0) return '0'
    if (num < 0.0001) return '<0.0001'
    return num.toLocaleString('en-US', { maximumFractionDigits: 4 })
  }

  // Calculate real stats from ports
  const stats = useMemo(() => {
    if (!ports || ports.length === 0) {
      return {
        totalReceived: '0',
        totalReceivedFormatted: '0',
        activePorts: 0,
        paymentCount: 0,
      }
    }

    let totalReceived = BigInt(0)
    let activePorts = 0
    let paymentCount = 0

    for (const port of ports) {
      if (port.status === 'confirmed' && !port.archived) {
        activePorts++
      }
      totalReceived += BigInt(port.totalReceived || '0')
      paymentCount += port.paymentCount ?? 0
    }

    return {
      totalReceived: totalReceived.toString(),
      totalReceivedFormatted: formatAmount(totalReceived),
      activePorts,
      paymentCount,
    }
  }, [ports])

  // Format pool balance
  const poolBalanceFormatted = hasPoolKeys ? formatAmount(poolBalance) : '0'

  // Animation props - disabled when user prefers reduced motion
  const fadeInUp = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3 },
      }

  const fadeInUpDelayed = (delay: number) =>
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.3, delay },
        }

  const hoverLift = prefersReducedMotion
    ? {}
    : { whileHover: { y: -4 }, transition: { duration: 0.2 } }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <>
      {/* Stats grid */}
      <m.div {...fadeInUp} className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Received"
          value={`${stats.totalReceivedFormatted} MNT`}
          subtitle={
            stats.paymentCount > 0
              ? `${stats.paymentCount} payment${stats.paymentCount !== 1 ? 's' : ''}`
              : 'No payments yet'
          }
        />
        <StatCard
          label="Privacy Pool"
          value={`${poolBalanceFormatted} MNT`}
          subtitle={
            poolBalance && poolBalance > 0n
              ? 'Available to send privately'
              : `${stats.activePorts} active port${stats.activePorts !== 1 ? 's' : ''}`
          }
        />
        <StatCard
          label="Available to Collect"
          value={isScanning ? '...' : `${collectableBalanceFormatted} MNT`}
          subtitle={
            isScanning
              ? 'Scanning...'
              : collectablePayments.length > 0
                ? `${collectablePayments.length} stealth address${collectablePayments.length !== 1 ? 'es' : ''}`
                : 'Nothing pending'
          }
        />
      </m.div>

      {/* Quick actions - 2x2 grid */}
      <m.div {...fadeInUpDelayed(0.1)} className="mb-8 grid gap-4 sm:grid-cols-2">
        <Link href="/receive">
          <m.div {...hoverLift}>
            <Card
              variant="glass"
              className="hover:border-primary/50 h-full transition-all hover:shadow-lg"
            >
              <CardContent className="flex items-center gap-4 p-5">
                <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-lg">
                  <Anchor className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-foreground text-lg font-semibold">Receive Payments</h3>
                  <p className="text-muted-foreground text-sm">
                    Create Ports and share payment links
                  </p>
                </div>
              </CardContent>
            </Card>
          </m.div>
        </Link>
        <Link href="/pay">
          <m.div {...hoverLift}>
            <Card
              variant="glass"
              className="hover:border-primary/50 h-full transition-all hover:shadow-lg"
            >
              <CardContent className="flex items-center gap-4 p-5">
                <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-lg">
                  <Send className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-foreground text-lg font-semibold">Send Payment</h3>
                  <p className="text-muted-foreground text-sm">
                    Pay privately to any Port or address
                  </p>
                </div>
              </CardContent>
            </Card>
          </m.div>
        </Link>
        <Link href="/collect">
          <m.div {...hoverLift}>
            <Card
              variant="glass"
              className="hover:border-primary/50 h-full transition-all hover:shadow-lg"
            >
              <CardContent className="flex items-center gap-4 p-5">
                <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-lg">
                  <ArrowDownToLine className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-foreground text-lg font-semibold">Collect Funds</h3>
                  <p className="text-muted-foreground text-sm">
                    Withdraw from your stealth addresses
                  </p>
                </div>
              </CardContent>
            </Card>
          </m.div>
        </Link>
        <Link href="/pool">
          <m.div {...hoverLift}>
            <Card
              variant="glass"
              className="hover:border-primary/50 h-full transition-all hover:shadow-lg"
            >
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500">
                  <Droplets className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-foreground text-lg font-semibold">Privacy Pool</h3>
                  <p className="text-muted-foreground text-sm">Deposit to enhance sender privacy</p>
                </div>
              </CardContent>
            </Card>
          </m.div>
        </Link>
      </m.div>

      {/* Reports section */}
      <m.div {...fadeInUpDelayed(0.2)} className="mb-8">
        <Link href="/reports">
          <m.div {...hoverLift}>
            <Card
              variant="glass"
              className="border-amber-500/30 bg-amber-500/5 transition-all hover:border-amber-500/50 hover:shadow-lg"
            >
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-foreground text-lg font-semibold">Shipwreck Reports</h3>
                  <p className="text-muted-foreground text-sm">
                    Generate tax compliance reports and export to PDF
                  </p>
                </div>
                <div className="text-amber-500">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </CardContent>
            </Card>
          </m.div>
        </Link>
      </m.div>

      {/* Recent activity */}
      <m.div {...fadeInUpDelayed(0.3)}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            {recentReceipts.length > 0 && (
              <Link
                href="/reports"
                className="text-primary flex items-center gap-1 text-sm hover:underline"
              >
                View all
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {isLoadingReceipts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              </div>
            ) : recentReceipts.length === 0 ? (
              <div className="text-muted-foreground flex flex-col items-center justify-center py-8">
                <p>No payments yet</p>
                <p className="mt-1 text-sm">
                  Create a Port and share the payment link to get started
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentReceipts.map((receipt) => (
                  <Link
                    key={receipt.id}
                    href={`/receipt/${receipt.id}`}
                    className="hover:bg-muted/50 flex items-center justify-between rounded-lg p-3 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          receipt.status === 'pending'
                            ? 'bg-yellow-500/10 text-yellow-500'
                            : receipt.status === 'confirmed'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-green-500/10 text-green-500'
                        }`}
                      >
                        {receipt.status === 'pending' ? (
                          <Clock className="h-4 w-4" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-foreground text-sm font-medium">
                          {receipt.portName || 'Unknown Port'}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {receipt.status === 'pending'
                            ? 'Processing...'
                            : new Date(receipt.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-foreground text-sm font-medium">
                        +{formatAmount(BigInt(receipt.amount || '0'))} {receipt.currency}
                      </p>
                      <p
                        className={`text-xs capitalize ${
                          receipt.status === 'pending'
                            ? 'text-yellow-500'
                            : receipt.status === 'collected'
                              ? 'text-green-500'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {receipt.status}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </m.div>
    </>
  )
}

function StatCard({ label, value, subtitle }: { label: string; value: string; subtitle: string }) {
  return (
    <Card variant="glass">
      <CardContent className="p-5">
        <p className="text-muted-foreground text-sm">{label}</p>
        <p className="text-foreground mt-1 text-2xl font-bold">{value}</p>
        <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>
      </CardContent>
    </Card>
  )
}
