'use client'

/**
 * Privacy Pool test page.
 *
 * Allows testing deposit, recovery, and balance tracking.
 * This is a development page for testing the pool integration.
 */

import { useState } from 'react'
import { formatEther, parseEther } from 'viem'
import { useAccount } from 'wagmi'
import { usePoolContext } from '@/contexts/pool-context'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function PoolPage() {
  const { address: _address, isConnected } = useAccount()
  const {
    hasPoolKeys,
    isDerivingKeys,
    isRestoring,
    deposits,
    totalBalance,
    poolScope,
    error,
    derivePoolKeys,
    deposit,
    recoverDeposits,
    clearPoolSession,
    isDepositing,
    isRecovering,
    contracts,
  } = usePoolContext()

  const [depositAmount, setDepositAmount] = useState('0.01')
  const [lastTxHash, setLastTxHash] = useState<string | null>(null)

  const handleDeposit = async () => {
    try {
      const amount = parseEther(depositAmount)
      const txHash = await deposit(amount)
      setLastTxHash(txHash)
    } catch (err) {
      console.error('Deposit failed:', err)
    }
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <GlassCard className="p-6 text-center">
          <h1 className="mb-4 text-2xl font-bold">Privacy Pool</h1>
          <p className="text-gray-400">Connect your wallet to continue</p>
          <appkit-button />
        </GlassCard>
      </div>
    )
  }

  if (isRestoring) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <GlassCard className="p-6 text-center">
          <p className="text-gray-400">Restoring session...</p>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold text-white">Privacy Pool</h1>

      {/* Contract Info */}
      <GlassCard className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Contract Info</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Entrypoint:</span>
            <code className="text-cyan-400">{contracts?.entrypoint || 'Not deployed'}</code>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Pool:</span>
            <code className="text-cyan-400">{contracts?.pool || 'Not deployed'}</code>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Pool Scope:</span>
            <code className="text-cyan-400">
              {poolScope ? `0x${poolScope.toString(16).slice(0, 16)}...` : 'Loading...'}
            </code>
          </div>
        </div>
      </GlassCard>

      {/* Pool Keys */}
      <GlassCard className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Pool Keys</h2>
        {hasPoolKeys ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-green-400">Keys derived</span>
            </div>
            <Button variant="outline" size="sm" onClick={clearPoolSession}>
              Clear Session
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Sign a message to derive your pool keys. This enables deposits and recovery.
            </p>
            <Button onClick={derivePoolKeys} disabled={isDerivingKeys}>
              {isDerivingKeys ? 'Signing...' : 'Derive Pool Keys'}
            </Button>
          </div>
        )}
      </GlassCard>

      {/* Deposit */}
      {hasPoolKeys && (
        <GlassCard className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Deposit</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount (MNT)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.01"
              />
              <p className="mt-1 text-xs text-gray-400">Minimum: 0.01 MNT</p>
            </div>
            <Button onClick={handleDeposit} disabled={isDepositing} className="w-full">
              {isDepositing ? 'Depositing...' : 'Deposit to Pool'}
            </Button>
            {lastTxHash && (
              <div className="text-sm">
                <span className="text-gray-400">Last TX: </span>
                <a
                  href={`https://mantlescan.xyz/tx/${lastTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline"
                >
                  {lastTxHash.slice(0, 10)}...{lastTxHash.slice(-8)}
                </a>
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {/* Recovery */}
      {hasPoolKeys && (
        <GlassCard className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Recovery</h2>
          <p className="mb-4 text-sm text-gray-400">
            Scan the chain for deposits made with your keys.
          </p>
          <Button onClick={recoverDeposits} disabled={isRecovering} variant="outline">
            {isRecovering ? 'Scanning...' : 'Recover Deposits'}
          </Button>
        </GlassCard>
      )}

      {/* Balance & Deposits */}
      {hasPoolKeys && (
        <GlassCard className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Balance & Deposits</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Total Balance:</span>
              <span className="text-2xl font-bold text-cyan-400">
                {formatEther(totalBalance)} MNT
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Deposits:</span>
              <span className="text-white">{deposits.length}</span>
            </div>
            {deposits.length > 0 && (
              <div className="mt-4 space-y-2">
                <h3 className="text-sm font-medium text-gray-400">Recent Deposits</h3>
                {deposits
                  .slice(-5)
                  .reverse()
                  .map((d, i) => (
                    <div key={i} className="rounded bg-white/5 p-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">#{d.index.toString()}</span>
                        <span className="text-white">{formatEther(d.value)} MNT</span>
                      </div>
                      <a
                        href={`https://mantlescan.xyz/tx/${d.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-cyan-400 hover:underline"
                      >
                        {d.txHash.slice(0, 10)}...
                      </a>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {/* Error */}
      {error && (
        <GlassCard className="border-red-500/50 p-6">
          <h2 className="mb-2 text-lg font-semibold text-red-400">Error</h2>
          <p className="text-sm text-red-300">{error}</p>
        </GlassCard>
      )}
    </div>
  )
}
