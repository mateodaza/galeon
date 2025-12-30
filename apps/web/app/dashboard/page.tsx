'use client'

/**
 * Main dashboard page.
 *
 * Shows:
 * - Mode switch (Vendor/User)
 * - Summary stats
 * - Quick actions
 * - Recent activity
 */

import { useState } from 'react'
import Link from 'next/link'
import { Anchor, Send, ArrowDownToLine } from 'lucide-react'
import * as m from 'motion/react-m'
import { useReducedMotion } from 'motion/react'
import { AppShell, PageHeader } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Mode = 'vendor' | 'user'

export default function DashboardPage() {
  const [mode, setMode] = useState<Mode>('vendor')

  const modeSwitch = (
    <div className="bg-secondary flex rounded-lg p-1">
      <button
        onClick={() => setMode('vendor')}
        className={cn(
          'rounded-md px-4 py-2 text-sm font-medium transition-colors',
          mode === 'vendor'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Vendor Mode
      </button>
      <button
        onClick={() => setMode('user')}
        className={cn(
          'rounded-md px-4 py-2 text-sm font-medium transition-colors',
          mode === 'user'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        User Mode
      </button>
    </div>
  )

  return (
    <AppShell requireAuth>
      <PageHeader title="Dashboard" actions={modeSwitch} />
      {mode === 'vendor' ? <VendorDashboard /> : <UserDashboard />}
    </AppShell>
  )
}

function VendorDashboard() {
  const prefersReducedMotion = useReducedMotion()

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

  return (
    <>
      {/* Stats grid */}
      <m.div {...fadeInUp} className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Received" value="0 MNT" subtitle="0 payments" />
        <StatCard label="Active Ports" value="0" subtitle="Create your first Port" />
        <StatCard label="Available to Collect" value="0 MNT" subtitle="Nothing pending" />
      </m.div>

      {/* Quick actions */}
      <m.div {...fadeInUpDelayed(0.1)} className="mb-8 grid gap-4 sm:grid-cols-2">
        <Link href="/dashboard/ports">
          <m.div {...hoverLift}>
            <Card className="hover:border-primary/50 h-full transition-all hover:shadow-md">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="bg-accent text-primary flex h-12 w-12 items-center justify-center rounded-lg">
                  <Anchor className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-foreground text-lg font-semibold">Manage Ports</h3>
                  <p className="text-muted-foreground text-sm">
                    Create and manage payment endpoints
                  </p>
                </div>
              </CardContent>
            </Card>
          </m.div>
        </Link>
        <Link href="/collect">
          <m.div {...hoverLift}>
            <Card className="hover:border-primary/50 h-full transition-all hover:shadow-md">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="bg-accent text-primary flex h-12 w-12 items-center justify-center rounded-lg">
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
      </m.div>

      {/* Recent activity */}
      <m.div {...fadeInUpDelayed(0.2)}>
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground flex flex-col items-center justify-center py-8">
              <p>No payments yet</p>
              <p className="mt-1 text-sm">
                Create a Port and share the payment link to get started
              </p>
            </div>
          </CardContent>
        </Card>
      </m.div>
    </>
  )
}

function UserDashboard() {
  const prefersReducedMotion = useReducedMotion()

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

  return (
    <>
      {/* Stats grid */}
      <m.div {...fadeInUp} className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Sent" value="0 MNT" subtitle="0 payments" />
        <StatCard label="This Month" value="0 MNT" subtitle="No spending" />
        <StatCard label="Pending" value="0" subtitle="All confirmed" />
      </m.div>

      {/* Quick actions */}
      <m.div {...fadeInUpDelayed(0.1)} className="mb-8">
        <Link href="/pay">
          <m.div {...hoverLift}>
            <Card className="hover:border-primary/50 transition-all hover:shadow-md">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="bg-accent text-primary flex h-12 w-12 items-center justify-center rounded-lg">
                  <Send className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-foreground text-lg font-semibold">Send Payment</h3>
                  <p className="text-muted-foreground text-sm">Pay to a Port or stealth address</p>
                </div>
              </CardContent>
            </Card>
          </m.div>
        </Link>
      </m.div>

      {/* Payment history */}
      <m.div {...fadeInUpDelayed(0.2)}>
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground flex flex-col items-center justify-center py-8">
              <p>No payments sent yet</p>
            </div>
          </CardContent>
        </Card>
      </m.div>
    </>
  )
}

function StatCard({ label, value, subtitle }: { label: string; value: string; subtitle: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-muted-foreground text-sm">{label}</p>
        <p className="text-foreground mt-1 text-2xl font-bold">{value}</p>
        <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>
      </CardContent>
    </Card>
  )
}
