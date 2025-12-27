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

import Link from 'next/link'
import { useState } from 'react'
import { useAppKitAccount } from '@reown/appkit/react'
import { WalletButton } from '@/components/wallet-button'

type Mode = 'vendor' | 'user'

export default function DashboardPage() {
  const { isConnected } = useAppKitAccount()
  const [mode, setMode] = useState<Mode>('vendor')

  if (!isConnected) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <p className="mb-4 text-zinc-400">Please connect your wallet to access the dashboard.</p>
        <WalletButton />
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🚢</span>
            <span className="text-xl font-bold text-zinc-100">Galeon</span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink href="/dashboard" active>
              Dashboard
            </NavLink>
            <NavLink href="/dashboard/ports">Ports</NavLink>
            <NavLink href="/collect">Collect</NavLink>
          </nav>
        </div>
        <WalletButton />
      </header>

      {/* Main content */}
      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-6xl">
          {/* Mode switch */}
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-zinc-100">Dashboard</h1>
            <div className="flex rounded-lg bg-zinc-800 p-1">
              <button
                onClick={() => setMode('vendor')}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  mode === 'vendor'
                    ? 'bg-emerald-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Vendor Mode
              </button>
              <button
                onClick={() => setMode('user')}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  mode === 'user'
                    ? 'bg-emerald-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                User Mode
              </button>
            </div>
          </div>

          {mode === 'vendor' ? <VendorDashboard /> : <UserDashboard />}
        </div>
      </div>
    </main>
  )
}

function VendorDashboard() {
  return (
    <>
      {/* Stats grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Received" value="0 MNT" subtitle="0 payments" />
        <StatCard label="Active Ports" value="0" subtitle="Create your first Port" />
        <StatCard label="Available to Collect" value="0 MNT" subtitle="Nothing pending" />
      </div>

      {/* Quick actions */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/ports"
          className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 transition-colors hover:border-zinc-700"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-600/20 text-2xl">
            🚢
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">Manage Ports</h3>
            <p className="text-sm text-zinc-400">Create and manage payment endpoints</p>
          </div>
        </Link>
        <Link
          href="/collect"
          className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 transition-colors hover:border-zinc-700"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-600/20 text-2xl">
            💰
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">Collect Funds</h3>
            <p className="text-sm text-zinc-400">Withdraw from your stealth addresses</p>
          </div>
        </Link>
      </div>

      {/* Recent activity */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-zinc-100">Recent Payments</h2>
        <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
          <p>No payments yet</p>
          <p className="mt-1 text-sm">Create a Port and share the payment link to get started</p>
        </div>
      </div>
    </>
  )
}

function UserDashboard() {
  return (
    <>
      {/* Stats grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Sent" value="0 MNT" subtitle="0 payments" />
        <StatCard label="This Month" value="0 MNT" subtitle="No spending" />
        <StatCard label="Pending" value="0" subtitle="All confirmed" />
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <Link
          href="/pay"
          className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 transition-colors hover:border-zinc-700"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-600/20 text-2xl">
            💸
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">Send Payment</h3>
            <p className="text-sm text-zinc-400">Pay to a Port or stealth address</p>
          </div>
        </Link>
      </div>

      {/* Payment history */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-zinc-100">Payment History</h2>
        <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
          <p>No payments sent yet</p>
        </div>
      </div>
    </>
  )
}

function StatCard({ label, value, subtitle }: { label: string; value: string; subtitle: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-zinc-100">{value}</p>
      <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
    </div>
  )
}

function NavLink({
  href,
  children,
  active = false,
}: {
  href: string
  children: React.ReactNode
  active?: boolean
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
      }`}
    >
      {children}
    </Link>
  )
}
