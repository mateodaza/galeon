'use client'

/**
 * Pay page - unified payment interface.
 *
 * Three modes with increasing privacy levels:
 * 1. Quick Pay - send from wallet to someone's Port (sender visible)
 * 2. Stealth Pay - send from collected stealth funds to a Port (obfuscated sender)
 * 3. Private Send - withdraw from privacy pool anonymously (full ZK privacy)
 */

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { isAddress, formatEther } from 'viem'
import { AlertTriangle } from 'lucide-react'
import {
  Shield,
  QrCode,
  Wallet,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { AppShell, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { usePoolContext } from '@/contexts/pool-context'
import { useCollection } from '@/hooks/use-collection'
import { WithdrawModal } from '@/components/pool/withdraw-modal'

type PayMode = 'quick' | 'stealth' | 'private'

export default function PayPage() {
  const router = useRouter()
  const [mode, setMode] = useState<PayMode>('quick')
  const [recipient, setRecipient] = useState('')
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [stealthAmount, setStealthAmount] = useState('')

  const {
    hasPoolKeys,
    deposits,
    totalBalance: poolBalance,
    isDerivingKeys,
    derivePoolKeys,
  } = usePoolContext()

  const {
    payments,
    totalBalance: stealthBalance,
    totalBalanceFormatted: stealthBalanceFormatted,
    isScanning,
    isCollecting,
    scan,
    collectAll,
    collectError,
    collectTxHashes,
    hasKeys,
    getStealthPaySummary,
  } = useCollection()

  const isValidRecipient = recipient.length === 0 || isAddress(recipient)
  const poolBalanceFormatted = formatEther(poolBalance)
  const hasPoolBalance = poolBalance > 0n
  const hasStealthBalance = stealthBalance > 0n

  // Get stealth pay summary for UI feedback
  const stealthPaySummary = useMemo(
    () => getStealthPaySummary(stealthAmount, payments),
    [getStealthPaySummary, stealthAmount, payments]
  )

  // Auto-scan for stealth payments when switching to stealth mode
  useEffect(() => {
    if (mode === 'stealth' && hasKeys && payments.length === 0 && !isScanning) {
      scan()
    }
  }, [mode, hasKeys, payments.length, isScanning, scan])

  const handleQuickPay = () => {
    if (recipient && isAddress(recipient)) {
      router.push(`/pay/${recipient}`)
    }
  }

  const handleStealthPay = async () => {
    if (!recipient || !isAddress(recipient)) return

    const amount = stealthAmount ? parseFloat(stealthAmount) : undefined
    await collectAll(recipient as `0x${string}`, amount)
  }

  return (
    <AppShell requireAuth requireKeys>
      <PageHeader title="Pay" description="Choose your privacy level for sending payments." />

      {/* Mode Selector - Three Options */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Quick Pay */}
        <button
          type="button"
          onClick={() => setMode('quick')}
          className={`flex flex-col gap-2 rounded-xl border p-4 text-left transition-all ${
            mode === 'quick'
              ? 'border-primary bg-primary/10 ring-primary/20 ring-2'
              : 'border-border hover:border-primary/50 hover:bg-primary/5'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${mode === 'quick' ? 'bg-primary/20' : 'bg-muted'}`}>
              <Wallet
                className={`h-5 w-5 ${mode === 'quick' ? 'text-primary' : 'text-muted-foreground'}`}
              />
            </div>
            <div className="flex-1">
              <p className={`font-medium ${mode === 'quick' ? 'text-primary' : 'text-foreground'}`}>
                Quick Pay
              </p>
              <p className="text-muted-foreground text-xs">From wallet</p>
            </div>
            <Eye
              className={`h-4 w-4 ${mode === 'quick' ? 'text-primary/60' : 'text-muted-foreground/60'}`}
            />
          </div>
          <p className="text-muted-foreground text-xs">Sender visible on-chain</p>
        </button>

        {/* Stealth Pay */}
        <button
          type="button"
          onClick={() => setMode('stealth')}
          className={`flex flex-col gap-2 rounded-xl border p-4 text-left transition-all ${
            mode === 'stealth'
              ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20'
              : 'border-border hover:border-amber-500/50 hover:bg-amber-500/5'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`rounded-lg p-2 ${mode === 'stealth' ? 'bg-amber-500/20' : 'bg-muted'}`}
            >
              <EyeOff
                className={`h-5 w-5 ${mode === 'stealth' ? 'text-amber-500' : 'text-muted-foreground'}`}
              />
            </div>
            <div className="flex-1">
              <p
                className={`font-medium ${mode === 'stealth' ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}
              >
                Stealth Pay
              </p>
              <p className="text-muted-foreground text-xs">From received funds</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-xs">Sender obfuscated</p>
            {hasStealthBalance && (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                {parseFloat(stealthBalanceFormatted).toFixed(4)} MNT
              </span>
            )}
          </div>
        </button>

        {/* Private Send */}
        <button
          type="button"
          onClick={() => setMode('private')}
          className={`flex flex-col gap-2 rounded-xl border p-4 text-left transition-all ${
            mode === 'private'
              ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20'
              : 'border-border hover:border-emerald-500/50 hover:bg-emerald-500/5'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`rounded-lg p-2 ${mode === 'private' ? 'bg-emerald-500/20' : 'bg-muted'}`}
            >
              <Lock
                className={`h-5 w-5 ${mode === 'private' ? 'text-emerald-500' : 'text-muted-foreground'}`}
              />
            </div>
            <div className="flex-1">
              <p
                className={`font-medium ${mode === 'private' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}
              >
                Private Send
              </p>
              <p className="text-muted-foreground text-xs">From privacy pool</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-xs">Full ZK privacy</p>
            {hasPoolBalance && (
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {parseFloat(poolBalanceFormatted).toFixed(4)} MNT
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Quick Pay Mode */}
      {mode === 'quick' && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <label className="text-foreground text-sm font-medium">Recipient Address</label>
                <div className="mt-1.5 flex gap-2">
                  <Input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="0x... (Port ID or wallet address)"
                    className={`font-mono ${
                      recipient && !isValidRecipient
                        ? 'border-destructive focus-visible:ring-destructive'
                        : ''
                    }`}
                  />
                  <Button variant="outline" size="icon" disabled title="Scan QR (coming soon)">
                    <QrCode className="h-4 w-4" />
                  </Button>
                </div>
                {recipient && !isValidRecipient && (
                  <p className="text-destructive mt-1 text-xs">Invalid address format</p>
                )}
                <p className="text-muted-foreground mt-1.5 text-xs">
                  Send to a <strong>Port ID</strong> (stealth - recipient is private) or a regular{' '}
                  <strong>wallet address</strong> (public - recipient visible on-chain).
                </p>
              </div>

              <Button
                onClick={handleQuickPay}
                disabled={!recipient || !isValidRecipient}
                size="lg"
                className="w-full"
              >
                <Wallet className="mr-2 h-4 w-4" />
                Continue to Payment
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <div className="mt-6 border-t pt-4">
              <div className="flex items-start gap-2">
                <Eye className="text-muted-foreground mt-0.5 h-4 w-4" />
                <p className="text-muted-foreground text-xs">
                  <strong className="text-foreground">Privacy level: Low.</strong> Your wallet
                  address is visible as the sender. If sending to a Port, recipient receives funds
                  at a stealth address only they can detect.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stealth Pay Mode */}
      {mode === 'stealth' && (
        <Card className="mt-6 border-amber-500/20">
          <CardContent className="pt-6">
            {!hasKeys ? (
              <div className="text-center">
                <EyeOff className="text-muted-foreground mx-auto h-12 w-12" />
                <h3 className="text-foreground mt-4 font-semibold">Keys Required</h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  Connect your wallet and derive keys to use stealth payments.
                </p>
              </div>
            ) : isScanning ? (
              <div className="py-8 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber-500" />
                <p className="text-muted-foreground mt-4">Scanning for received payments...</p>
              </div>
            ) : !hasStealthBalance ? (
              <div className="text-center">
                <EyeOff className="text-muted-foreground mx-auto h-12 w-12" />
                <h3 className="text-foreground mt-4 font-semibold">No Stealth Funds</h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  You don't have any collected stealth payments yet. Receive payments first, then
                  use them for stealth sending.
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <Button variant="outline" onClick={() => router.push('/receive')}>
                    Go to Receive
                  </Button>
                  <Button variant="outline" onClick={() => scan()}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Rescan
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg bg-amber-500/10 p-4">
                  <div>
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Available Stealth Funds
                    </p>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {parseFloat(stealthBalanceFormatted).toFixed(4)} MNT
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground text-xs">
                      {payments.length} payment{payments.length !== 1 ? 's' : ''}
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs text-amber-600 dark:text-amber-400"
                      onClick={() => scan()}
                      disabled={isScanning}
                    >
                      {isScanning ? 'Scanning...' : 'Refresh'}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-foreground text-sm font-medium">Recipient Address</label>
                  <div className="mt-1.5 flex gap-2">
                    <Input
                      type="text"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      placeholder="0x... (Port ID or wallet address)"
                      className={`font-mono ${
                        recipient && !isValidRecipient
                          ? 'border-destructive focus-visible:ring-destructive'
                          : ''
                      }`}
                    />
                    <Button variant="outline" size="icon" disabled title="Scan QR (coming soon)">
                      <QrCode className="h-4 w-4" />
                    </Button>
                  </div>
                  {recipient && !isValidRecipient && (
                    <p className="text-destructive mt-1 text-xs">Invalid address format</p>
                  )}
                  <p className="text-muted-foreground mt-1.5 text-xs">
                    Send to a <strong>Port ID</strong> (stealth - recipient is private) or a regular{' '}
                    <strong>wallet address</strong> (public - recipient visible).
                  </p>
                </div>

                <div>
                  <label className="text-foreground text-sm font-medium">Amount (optional)</label>
                  <Input
                    type="number"
                    value={stealthAmount}
                    onChange={(e) => setStealthAmount(e.target.value)}
                    placeholder={`Max: ${parseFloat(stealthBalanceFormatted).toFixed(4)} MNT`}
                    className={`mt-1.5 ${
                      stealthAmount && !stealthPaySummary.canSend
                        ? 'border-amber-500 focus-visible:ring-amber-500'
                        : ''
                    }`}
                    step="0.0001"
                    min="0"
                  />
                  <p className="text-muted-foreground mt-1 text-xs">{stealthPaySummary.message}</p>
                </div>

                {/* Show available addresses when amount exceeds single address */}
                {stealthAmount && !stealthPaySummary.canSend && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-4 w-4" />
                      Available addresses:
                    </div>
                    <div className="space-y-1">
                      {stealthPaySummary.availableAddresses.map((addr) => (
                        <div
                          key={addr.address}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-muted-foreground font-mono">
                            {addr.address.slice(0, 10)}...{addr.address.slice(-8)}
                          </span>
                          <span
                            className={
                              addr.canCover
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-muted-foreground'
                            }
                          >
                            {addr.balance} MNT
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                      Reduce amount to send from a single address (preserves privacy)
                    </p>
                  </div>
                )}

                {collectError && (
                  <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
                    {collectError}
                  </div>
                )}

                {collectTxHashes.length > 0 && (
                  <div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400">
                    Payment sent successfully!{' '}
                    <a
                      href={`https://mantlescan.xyz/tx/${collectTxHashes[0]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      View transaction
                    </a>
                  </div>
                )}

                <Button
                  onClick={handleStealthPay}
                  disabled={
                    !recipient || !isValidRecipient || isCollecting || !stealthPaySummary.canSend
                  }
                  size="lg"
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  {isCollecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <EyeOff className="mr-2 h-4 w-4" />
                      Send from Stealth
                    </>
                  )}
                </Button>

                <div className="border-t pt-4">
                  <div className="flex items-start gap-2">
                    <EyeOff className="mt-0.5 h-4 w-4 text-amber-500" />
                    <p className="text-muted-foreground text-xs">
                      <strong className="text-foreground">Privacy level: Medium.</strong> Funds are
                      sent from one-time stealth addresses, not your main wallet. The link between
                      sender and recipient is obfuscated.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Private Send Mode */}
      {mode === 'private' && (
        <Card className="mt-6 border-emerald-500/20">
          <CardContent className="pt-6">
            {!hasPoolKeys ? (
              <div className="text-center">
                <Shield className="text-muted-foreground mx-auto h-12 w-12" />
                <h3 className="text-foreground mt-4 font-semibold">Pool Keys Required</h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  Sign a message to derive your pool keys and access your privacy pool balance.
                </p>
                <Button
                  onClick={derivePoolKeys}
                  disabled={isDerivingKeys}
                  className="mt-4 bg-emerald-600 hover:bg-emerald-700"
                >
                  {isDerivingKeys ? 'Signing...' : 'Derive Pool Keys'}
                </Button>
              </div>
            ) : !hasPoolBalance ? (
              <div className="text-center">
                <Lock className="text-muted-foreground mx-auto h-12 w-12" />
                <h3 className="text-foreground mt-4 font-semibold">No Pool Balance</h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  You don't have any funds in the privacy pool yet. Collect payments and deposit
                  them to the pool first.
                </p>
                <Button variant="outline" onClick={() => router.push('/receive')} className="mt-4">
                  Go to Receive
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 p-4">
                  <div>
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">
                      Privacy Pool Balance
                    </p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {parseFloat(poolBalanceFormatted).toFixed(4)} MNT
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground text-xs">
                      {deposits.length} deposit{deposits.length !== 1 ? 's' : ''}
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs text-emerald-600 dark:text-emerald-400"
                      onClick={() => router.push('/pool')}
                    >
                      Manage Pool →
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={() => setShowWithdrawModal(true)}
                  size="lg"
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  <Lock className="mr-2 h-4 w-4" />
                  Private Send from Pool
                </Button>

                <div className="border-t pt-4">
                  <div className="flex items-start gap-2">
                    <Lock className="mt-0.5 h-4 w-4 text-emerald-500" />
                    <p className="text-muted-foreground text-xs">
                      <strong className="text-foreground">Privacy level: Maximum.</strong> Uses ZK
                      proofs to completely break the link between deposits and withdrawals. No one
                      can trace where the funds came from.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Privacy Comparison */}
      <Card className="bg-muted/30 mt-6">
        <CardContent className="pt-6">
          <h3 className="text-foreground text-sm font-medium">Privacy Comparison</h3>
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Quick Pay</span>
              <div className="flex gap-1">
                <div className="bg-primary h-2 w-8 rounded-full" />
                <div className="bg-muted h-2 w-8 rounded-full" />
                <div className="bg-muted h-2 w-8 rounded-full" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Stealth Pay</span>
              <div className="flex gap-1">
                <div className="h-2 w-8 rounded-full bg-amber-500" />
                <div className="h-2 w-8 rounded-full bg-amber-500" />
                <div className="bg-muted h-2 w-8 rounded-full" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Private Send</span>
              <div className="flex gap-1">
                <div className="h-2 w-8 rounded-full bg-emerald-500" />
                <div className="h-2 w-8 rounded-full bg-emerald-500" />
                <div className="h-2 w-8 rounded-full bg-emerald-500" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Withdraw Modal */}
      <WithdrawModal open={showWithdrawModal} onOpenChange={setShowWithdrawModal} />
    </AppShell>
  )
}
