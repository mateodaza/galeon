'use client'

/**
 * Port management page.
 *
 * Lists all Ports and allows creating new ones.
 * Each Port has its own stealth meta-address for payment isolation.
 */

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppKitAccount } from '@reown/appkit/react'
import { WalletButton } from '@/components/wallet-button'
import { usePorts, useCreatePort, type Port } from '@/hooks/use-ports'
import { useStealthContext } from '@/contexts/stealth-context'

export default function PortsPage() {
  const router = useRouter()
  const { isConnected } = useAppKitAccount()
  const { hasKeys } = useStealthContext()
  const { ports, isLoading, error, refetch } = usePorts()
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Redirect to setup if not connected or keys not derived
  useEffect(() => {
    if (!isConnected) {
      router.push('/setup')
    } else if (!hasKeys) {
      router.push('/setup')
    }
  }, [isConnected, hasKeys, router])

  if (!isConnected || !hasKeys) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <p className="mb-4 text-zinc-400">Redirecting to setup...</p>
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
            <NavLink href="/dashboard">Dashboard</NavLink>
            <NavLink href="/dashboard/ports" active>
              Ports
            </NavLink>
            <NavLink href="/collect">Collect</NavLink>
          </nav>
        </div>
        <WalletButton />
      </header>

      {/* Main content */}
      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-6xl">
          {/* Page header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-100">Ports</h1>
              <p className="mt-1 text-zinc-400">Manage your payment endpoints</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
            >
              + Create Port
            </button>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="rounded-xl border border-red-900 bg-red-900/20 p-4">
              <p className="text-red-400">Error loading ports: {error.message}</p>
              <button onClick={() => refetch()} className="mt-2 text-sm text-red-300 underline">
                Try again
              </button>
            </div>
          )}

          {/* Ports list */}
          {!isLoading && !error && ports.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50 py-16">
              <div className="text-5xl">🚢</div>
              <h2 className="mt-4 text-xl font-semibold text-zinc-100">No Ports yet</h2>
              <p className="mt-2 text-zinc-400">
                Create your first Port to start receiving private payments
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-6 rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-500"
              >
                Create Your First Port
              </button>
            </div>
          ) : !isLoading && !error ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ports.map((port) => (
                <PortCard key={port.portId} port={port} />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Create Port Modal */}
      {showCreateModal && (
        <CreatePortModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            refetch()
            setShowCreateModal(false)
          }}
        />
      )}
    </main>
  )
}

function PortCard({ port }: { port: Port }) {
  const [copied, setCopied] = useState(false)
  const [showMeta, setShowMeta] = useState(false)

  const copyPaymentLink = () => {
    const link = `${window.location.origin}/pay/${port.portId}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyMetaAddress = () => {
    navigator.clipboard.writeText(port.stealthMetaAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">{port.name}</h3>
          <p className="mt-1 font-mono text-xs text-zinc-500">
            {port.portId.slice(0, 10)}...{port.portId.slice(-8)}
          </p>
        </div>
        <div
          className={`h-2 w-2 rounded-full ${port.isActive ? 'bg-emerald-500' : 'bg-zinc-600'}`}
        />
      </div>

      {/* Stealth meta-address (collapsible) */}
      <div className="mt-4">
        <button
          onClick={() => setShowMeta(!showMeta)}
          className="text-xs text-zinc-400 hover:text-zinc-300"
        >
          {showMeta ? 'Hide' : 'Show'} stealth address
        </button>
        {showMeta && (
          <div className="mt-2 rounded-lg bg-zinc-800/50 p-2">
            <p className="break-all font-mono text-xs text-zinc-400">
              {port.stealthMetaAddress.slice(0, 40)}...
            </p>
            <button
              onClick={copyMetaAddress}
              className="mt-1 text-xs text-emerald-400 hover:text-emerald-300"
            >
              {copied ? 'Copied!' : 'Copy full address'}
            </button>
          </div>
        )}
      </div>

      <button
        onClick={copyPaymentLink}
        className="mt-4 w-full rounded-lg bg-zinc-800 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-700"
      >
        {copied ? 'Copied!' : 'Copy Payment Link'}
      </button>
    </div>
  )
}

function CreatePortModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('')
  const { createPort, isPending, isConfirming, isSuccess, error, reset } = useCreatePort()

  const handleCreate = async () => {
    if (!name.trim()) return

    try {
      await createPort(name.trim())
    } catch {
      // Error handled by hook
    }
  }

  // Close modal on success
  useEffect(() => {
    if (isSuccess) {
      onSuccess()
    }
  }, [isSuccess, onSuccess])

  const isLoading = isPending || isConfirming

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-xl font-bold text-zinc-100">Create New Port</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Each Port has its own stealth address for payment isolation.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300">Port Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Main Business, Q1 Invoices"
              disabled={isLoading}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-900/20 p-3 text-sm text-red-400">
              {error.message || 'Failed to create port'}
            </div>
          )}

          {isConfirming && (
            <div className="rounded-lg bg-emerald-900/20 p-3 text-sm text-emerald-400">
              Waiting for confirmation...
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => {
              reset()
              onClose()
            }}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-zinc-700 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || isLoading}
            className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            {isPending ? 'Confirm in wallet...' : isConfirming ? 'Confirming...' : 'Create Port'}
          </button>
        </div>
      </div>
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
