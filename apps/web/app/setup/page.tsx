'use client'

/**
 * Onboarding page for new users.
 *
 * Guides users through:
 * 1. Connecting their wallet
 * 2. Signing key derivation message
 * 3. Going to dashboard
 */

import { useRouter } from 'next/navigation'
import { useAppKitAccount } from '@reown/appkit/react'
import { ConnectButton, WalletButton } from '@/components/wallet-button'
import { useStealthContext } from '@/contexts/stealth-context'

export default function SetupPage() {
  const router = useRouter()
  const { isConnected, address } = useAppKitAccount()
  const { hasKeys, metaAddress, isDerivingKeys, error, deriveKeys } = useStealthContext()

  // Determine current step
  const currentStep = !isConnected ? 'connect' : !hasKeys ? 'unlock' : 'ready'

  const handleDeriveKeys = async () => {
    try {
      await deriveKeys()
    } catch {
      // Error is handled in context
    }
  }

  return (
    <main className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🚢</span>
          <span className="text-xl font-bold text-zinc-100">Galeon</span>
        </div>
        <WalletButton />
      </header>

      {/* Main content */}
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="w-full max-w-lg">
          {/* Progress indicator */}
          <div className="mb-8 flex items-center justify-center gap-2">
            <Step
              number={1}
              label="Connect"
              active={currentStep === 'connect'}
              completed={currentStep !== 'connect'}
            />
            <div className="h-px w-8 bg-zinc-700" />
            <Step
              number={2}
              label="Unlock Keys"
              active={currentStep === 'unlock'}
              completed={currentStep === 'ready'}
            />
            <div className="h-px w-8 bg-zinc-700" />
            <Step number={3} label="Dashboard" active={currentStep === 'ready'} completed={false} />
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8">
            {currentStep === 'connect' && (
              <>
                <h1 className="text-2xl font-bold text-zinc-100">Welcome to Galeon</h1>
                <p className="mt-2 text-zinc-400">
                  Connect your wallet to get started with private payments.
                </p>
                <div className="mt-6">
                  <ConnectButton className="w-full" />
                </div>
              </>
            )}

            {currentStep === 'unlock' && (
              <>
                <h1 className="text-2xl font-bold text-zinc-100">Unlock Your Keys</h1>
                <p className="mt-2 text-zinc-400">
                  Sign a message to derive your stealth keys. This signature stays local and does
                  NOT authorize any transactions.
                </p>
                <p className="mt-4 text-sm text-zinc-500">
                  Connected as: {address?.slice(0, 6)}...{address?.slice(-4)}
                </p>

                {error && (
                  <div className="mt-4 rounded-lg bg-red-900/20 p-3 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleDeriveKeys}
                  disabled={isDerivingKeys}
                  className="mt-6 w-full rounded-xl bg-emerald-600 py-4 text-lg font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isDerivingKeys ? 'Waiting for signature...' : 'Sign & Unlock Keys'}
                </button>
              </>
            )}

            {currentStep === 'ready' && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600/20 text-2xl">
                    ✓
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-zinc-100">Keys Unlocked!</h1>
                    <p className="text-sm text-zinc-400">Your stealth keys are ready to use</p>
                  </div>
                </div>

                <div className="mt-6 rounded-lg bg-zinc-800/50 p-4">
                  <p className="text-xs font-medium text-zinc-400">Your Stealth Meta-Address</p>
                  <p className="mt-1 break-all font-mono text-xs text-zinc-300">
                    {metaAddress?.slice(0, 50)}...
                  </p>
                </div>

                <button
                  onClick={() => router.push('/dashboard')}
                  className="mt-6 w-full rounded-xl bg-emerald-600 py-4 text-lg font-semibold text-white transition-colors hover:bg-emerald-500"
                >
                  Go to Dashboard
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

function Step({
  number,
  label,
  active,
  completed,
}: {
  number: number
  label: string
  active: boolean
  completed: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
          completed
            ? 'bg-emerald-600 text-white'
            : active
              ? 'bg-emerald-600/20 text-emerald-400 ring-2 ring-emerald-600'
              : 'bg-zinc-800 text-zinc-500'
        }`}
      >
        {completed ? '✓' : number}
      </div>
      <span className={`text-xs ${active || completed ? 'text-zinc-300' : 'text-zinc-600'}`}>
        {label}
      </span>
    </div>
  )
}
