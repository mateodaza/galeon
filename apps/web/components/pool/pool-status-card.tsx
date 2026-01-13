'use client'

/**
 * Pool Status Card
 *
 * Displays the user's privacy pool status including:
 * - Total balance in pool
 * - Number of deposits
 * - Quick actions (deposit, private send)
 */

import { useState } from 'react'
import { formatEther } from 'viem'
import { Shield, Plus, ArrowUpRight, RefreshCw, Loader2, Lock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { usePoolContext } from '@/contexts/pool-context'
import { DepositModal } from './deposit-modal'
import { WithdrawModal } from './withdraw-modal'

interface PoolStatusCardProps {
  className?: string
}

export function PoolStatusCard({ className }: PoolStatusCardProps) {
  const {
    hasPoolKeys,
    isRestoring,
    deposits,
    totalBalance,
    derivePoolKeys,
    recoverDeposits,
    isDerivingKeys,
    isRecovering,
    contracts,
  } = usePoolContext()

  const [showDepositModal, setShowDepositModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)

  const isPoolDeployed =
    contracts && contracts.pool !== '0x0000000000000000000000000000000000000000'

  // Show skeleton while restoring
  if (isRestoring) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-12 w-24" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Pool not deployed state
  if (!isPoolDeployed) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy Pool
          </CardTitle>
          <CardDescription>ZK-powered private sends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-4 text-center">
            <Lock className="text-muted-foreground mx-auto h-8 w-8" />
            <p className="text-muted-foreground mt-2 text-sm">
              Privacy Pool contracts are not deployed on this network yet.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Not signed in to pool state
  if (!hasPoolKeys) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy Pool
          </CardTitle>
          <CardDescription>ZK-powered private sends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-muted-foreground text-sm">
                Sign in to access your privacy pool deposits.
              </p>
            </div>
            <Button onClick={derivePoolKeys} disabled={isDerivingKeys} className="w-full">
              {isDerivingKeys ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  Sign in to Pool
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy Pool
              </CardTitle>
              <CardDescription>ZK-powered private sends</CardDescription>
            </div>
            <Badge variant="secondary">{deposits.length} deposits</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Balance Display */}
            <div>
              <p className="text-muted-foreground text-sm">Pool Balance</p>
              <p className="font-mono text-3xl font-bold">
                {formatEther(totalBalance)} <span className="text-lg">MNT</span>
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={() => setShowDepositModal(true)} className="flex-1">
                <Plus className="h-4 w-4" />
                Deposit
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowWithdrawModal(true)}
                className="flex-1"
                disabled={totalBalance === BigInt(0)}
              >
                <ArrowUpRight className="h-4 w-4" />
                Private Send
              </Button>
            </div>

            {/* Recovery Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={recoverDeposits}
              disabled={isRecovering}
              className="w-full"
            >
              {isRecovering ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Scanning chain...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Recover Deposits
                </>
              )}
            </Button>

            {/* Deposits List */}
            {deposits.length > 0 && (
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm font-medium">Recent Deposits</p>
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {deposits
                    .slice(-5)
                    .reverse()
                    .map((deposit) => (
                      <div
                        key={deposit.txHash}
                        className="bg-muted flex items-center justify-between rounded-lg p-3"
                      >
                        <div>
                          <p className="font-mono text-sm font-medium">
                            {formatEther(deposit.value)} MNT
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Block {deposit.blockNumber.toString()}
                          </p>
                        </div>
                        <a
                          href={`https://sepolia.mantlescan.xyz/tx/${deposit.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary text-xs hover:underline"
                        >
                          View
                        </a>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <DepositModal open={showDepositModal} onOpenChange={setShowDepositModal} />
      <WithdrawModal open={showWithdrawModal} onOpenChange={setShowWithdrawModal} />
    </>
  )
}
