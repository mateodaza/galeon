'use client'

/**
 * Pool Management content - loaded dynamically to avoid SSR BigInt issues.
 */

import { useState } from 'react'
import Link from 'next/link'
import { formatEther } from 'viem'
import { useAccount } from 'wagmi'
import { ArrowLeft, Settings, RefreshCw, Shield, ExternalLink } from 'lucide-react'
import { usePoolContext } from '@/contexts/pool-context'
import { AppShell, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { WithdrawModal } from '@/components/pool/withdraw-modal'
import { PrivacyHealthCard } from '@/components/pool/privacy-health-card'

export default function PoolContent() {
  const { isConnected } = useAccount()
  const {
    hasPoolKeys,
    isDerivingKeys,
    isRestoring,
    deposits,
    totalBalance,
    poolScope,
    error,
    derivePoolKeys,
    recoverDeposits,
    forceSync,
    clearPoolSession,
    isRecovering,
    contracts,
  } = usePoolContext()

  const [showWithdrawModal, setShowWithdrawModal] = useState(false)

  if (!isConnected) {
    return (
      <AppShell>
        <Card className="mt-6 p-6 text-center">
          <Shield className="text-muted-foreground mx-auto h-12 w-12" />
          <h1 className="text-foreground mt-4 text-xl font-bold">Pool Management</h1>
          <p className="text-muted-foreground mt-2">Connect your wallet to continue</p>
        </Card>
      </AppShell>
    )
  }

  if (isRestoring) {
    return (
      <AppShell>
        <Card className="mt-6 p-6 text-center">
          <RefreshCw className="text-muted-foreground mx-auto h-8 w-8 animate-spin" />
          <p className="text-muted-foreground mt-4">Restoring session...</p>
        </Card>
      </AppShell>
    )
  }

  const actions = (
    <Button variant="outline" asChild>
      <Link href="/pay">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Pay
      </Link>
    </Button>
  )

  return (
    <AppShell requireAuth requireKeys>
      <PageHeader
        title="Pool Management"
        description="Recovery, contract info, and deposit history."
        actions={actions}
      />

      {/* Quick Actions */}
      {hasPoolKeys && totalBalance > 0n && (
        <Card variant="glass" className="mt-6 border-emerald-500/30 bg-emerald-500/10">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">Pool Balance</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatEther(totalBalance)} MNT
                </p>
              </div>
              <Button
                onClick={() => setShowWithdrawModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Shield className="mr-2 h-4 w-4" />
                Private Send
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Privacy Health */}
      <PrivacyHealthCard />

      {/* Pool Keys Status */}
      <Card variant="glass" className="mt-6">
        <CardContent className="p-5">
          <div className="flex items-center gap-2">
            <Settings className="text-muted-foreground h-5 w-5" />
            <Tooltip>
              <TooltipTrigger asChild>
                <h2 className="text-foreground cursor-help font-semibold underline decoration-dotted underline-offset-2">
                  Pool Keys
                </h2>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[280px]">
                <p>
                  Keys that let you prove ownership of deposits and generate ZK proofs for private
                  withdrawals.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          {hasPoolKeys ? (
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-sm text-emerald-600 dark:text-emerald-400">Keys derived</span>
              </div>
              <Button variant="outline" size="sm" onClick={clearPoolSession}>
                Clear Session
              </Button>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-muted-foreground text-sm">
                Sign a message to derive your pool keys.
              </p>
              <Button onClick={derivePoolKeys} disabled={isDerivingKeys} className="mt-3">
                {isDerivingKeys ? 'Signing...' : 'Derive Pool Keys'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync & Recovery */}
      {hasPoolKeys && (
        <Card variant="glass" className="mt-6">
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <RefreshCw className="text-muted-foreground h-5 w-5" />
              <h2 className="text-foreground font-semibold">Sync & Recovery</h2>
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              Keep your local state in sync with the blockchain. Force Sync traces through all
              transactions and merges to find your current active deposits.
            </p>
            <div className="mt-4 flex gap-2">
              <Button onClick={forceSync} disabled={isRecovering} variant="default">
                {isRecovering ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Force Sync
                  </>
                )}
              </Button>
              <Button onClick={recoverDeposits} disabled={isRecovering} variant="outline">
                {isRecovering ? 'Scanning...' : 'Quick Recover'}
              </Button>
            </div>
            <p className="text-muted-foreground mt-2 text-xs">
              Use <strong>Force Sync</strong> if private sends fail. It re-traces all transaction
              chains to find your current balance.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Deposit History */}
      {hasPoolKeys && deposits.length > 0 && (
        <Card variant="glass" className="mt-6">
          <CardContent className="p-5">
            <h2 className="text-foreground font-semibold">Deposit History ({deposits.length})</h2>
            <div className="mt-4 space-y-2">
              {deposits
                .slice()
                .reverse()
                .map((d, i) => (
                  <div
                    key={i}
                    className="bg-muted flex items-center justify-between rounded-lg p-3"
                  >
                    <div>
                      <p className="text-foreground text-sm font-medium">
                        {formatEther(d.value)} MNT
                      </p>
                      <p className="text-muted-foreground text-xs">Index #{d.index.toString()}</p>
                    </div>
                    <a
                      href={`https://mantlescan.xyz/tx/${d.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 flex items-center gap-1 text-xs"
                    >
                      View TX
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contract Info (collapsed by default for advanced users) */}
      <Card variant="glass" className="mt-6">
        <CardContent className="p-5">
          <details>
            <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-sm">
              Contract Info (Advanced)
            </summary>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Entrypoint:</span>
                <code className="text-primary text-xs">
                  {contracts?.entrypoint || 'Not deployed'}
                </code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pool:</span>
                <code className="text-primary text-xs">{contracts?.pool || 'Not deployed'}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pool Scope:</span>
                <code className="text-primary text-xs">
                  {poolScope ? `0x${poolScope.toString(16).slice(0, 16)}...` : 'Loading...'}
                </code>
              </div>
            </div>
          </details>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-destructive mt-6">
          <CardContent className="p-5">
            <p className="text-destructive text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Withdraw Modal */}
      <WithdrawModal open={showWithdrawModal} onOpenChange={setShowWithdrawModal} />
    </AppShell>
  )
}
