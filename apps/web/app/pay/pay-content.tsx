'use client'

/**
 * Pay content component - loaded dynamically to avoid SSR BigInt issues.
 */

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { isAddress, formatEther } from 'viem'
import {
  Shield,
  QrCode,
  EyeOff,
  Lock,
  RefreshCw,
  Loader2,
  Info,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import { AppShell, PageHeader } from '@/components/layout'
import { getTxExplorerUrl } from '@/lib/chains'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { usePoolContext } from '@/contexts/pool-context'
import { useCollection } from '@/hooks/use-collection'
import { WithdrawModal } from '@/components/pool/withdraw-modal'
import { healthApi, type PoolPrivacyHealth } from '@/lib/api'

type PayMode = 'stealth' | 'private'

export default function PayContent() {
  const router = useRouter()
  const [mode, setMode] = useState<PayMode>('stealth')
  const [recipient, setRecipient] = useState('')
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [stealthAmount, setStealthAmount] = useState('')
  // Track successful stealth payment for success screen
  const [stealthPaySuccess, setStealthPaySuccess] = useState<{
    txHashes: string[]
    recipient: string
    amount: string
  } | null>(null)

  const {
    hasPoolKeys,
    deposits,
    totalBalance: poolBalance,
    isDerivingKeys,
    derivePoolKeys,
    contracts,
  } = usePoolContext()

  // Privacy health state for private send tab
  const [privacyHealth, setPrivacyHealth] = useState<PoolPrivacyHealth | null>(null)

  const {
    payments,
    totalBalanceFormatted: stealthBalanceFormatted,
    isScanning,
    isCollecting,
    isConfirmingCollect,
    scan,
    collectAll,
    collectError,
    collectTxHashes,
    hasKeys,
    getStealthPaySummary,
    calculatePoolDepositStats,
    hasPoolKeys: hasStealthPoolKeys,
  } = useCollection()

  const isValidRecipient = recipient.length === 0 || isAddress(recipient)
  const poolBalanceFormatted = formatEther(poolBalance)
  const hasPoolBalance = poolBalance > 0n

  // Calculate available amount after gas (consistent with navbar)
  const stealthStats = calculatePoolDepositStats(payments)
  const availableStealthFormatted = hasStealthPoolKeys
    ? stealthStats.totalMaxDepositFormatted
    : stealthBalanceFormatted
  const hasStealthBalance = parseFloat(availableStealthFormatted) > 0

  // Get stealth pay summary for amount input
  const stealthPaySummary = getStealthPaySummary(stealthAmount, payments)

  // Track if we've scanned in this render cycle to prevent double-scan
  const hasMountedRef = useRef(false)

  // Auto-scan for stealth payments on mount - ALWAYS scan to get fresh data
  // Each useCollection() call has its own state, so we need fresh data on mount
  useEffect(() => {
    if (hasKeys && !isScanning && !hasMountedRef.current) {
      hasMountedRef.current = true
      scan()
    }
  }, [hasKeys, isScanning, scan])

  // Fetch privacy health when switching to private mode
  useEffect(() => {
    if (mode === 'private' && contracts?.pool) {
      healthApi
        .getPoolPrivacy(contracts.pool)
        .then(setPrivacyHealth)
        .catch(() => setPrivacyHealth(null))
    }
  }, [mode, contracts?.pool])

  // Track pending payment info for success screen
  const pendingPaymentRef = useRef<{ recipient: string; amount: string } | null>(null)

  // Watch for successful transaction completion
  useEffect(() => {
    if (
      pendingPaymentRef.current &&
      collectTxHashes.length > 0 &&
      !isCollecting &&
      !isConfirmingCollect
    ) {
      setStealthPaySuccess({
        txHashes: [...collectTxHashes],
        recipient: pendingPaymentRef.current.recipient,
        amount: pendingPaymentRef.current.amount,
      })
      pendingPaymentRef.current = null
    }
  }, [collectTxHashes, isCollecting, isConfirmingCollect])

  const handleStealthPay = async () => {
    if (!recipient || !isAddress(recipient)) return

    const amount = stealthAmount ? parseFloat(stealthAmount) : undefined

    // Store payment info for success screen
    pendingPaymentRef.current = { recipient, amount: stealthAmount }

    await collectAll(recipient as `0x${string}`, amount)

    // Rescan after successful payment to ensure balances are accurate
    await scan()

    // Notify navbar to rescan (since it has separate state)
    window.dispatchEvent(new CustomEvent('galeon:rescan-payments'))
  }

  // Success screen for stealth pay
  if (stealthPaySuccess) {
    return (
      <AppShell requireAuth requireKeys>
        <div className="flex flex-1 flex-col items-center justify-center p-4">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20">
              <CheckCircle2 className="h-7 w-7 text-amber-500" />
            </div>
            <h1 className="text-foreground mt-3 text-xl font-bold">Payment Sent!</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Sent{' '}
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {stealthPaySuccess.amount} MNT
              </span>{' '}
              to{' '}
              <span className="text-foreground font-mono text-xs">
                {stealthPaySuccess.recipient.slice(0, 6)}...{stealthPaySuccess.recipient.slice(-4)}
              </span>
            </p>
            <div className="mt-4 space-y-2">
              {stealthPaySuccess.txHashes.map((hash, i) => (
                <a
                  key={hash}
                  href={getTxExplorerUrl(hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 flex items-center justify-center gap-1 text-sm"
                >
                  Tx {i + 1}: {hash.slice(0, 10)}...
                  <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setStealthPaySuccess(null)
                  setRecipient('')
                  setStealthAmount('')
                }}
              >
                Send Another
              </Button>
              <Button className="flex-1" onClick={() => router.push('/history')}>
                View History
              </Button>
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell requireAuth requireKeys>
      <PageHeader title="Pay" description="Choose your privacy level for sending payments." />

      {/* Mode Selector - Two Options */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Stealth Pay */}
        <button
          type="button"
          onClick={() => setMode('stealth')}
          className={`flex flex-col gap-2 rounded-xl border p-4 text-left backdrop-blur-sm transition-all ${
            mode === 'stealth'
              ? 'border-amber-500 bg-amber-500/10 shadow-lg ring-2 ring-amber-500/20'
              : 'border-slate-200/60 bg-white/50 hover:border-amber-500/50 hover:bg-amber-500/5 dark:border-white/10 dark:bg-slate-900/50'
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
                {parseFloat(availableStealthFormatted).toFixed(4)} MNT
              </span>
            )}
          </div>
        </button>

        {/* Private Send */}
        <button
          type="button"
          onClick={() => setMode('private')}
          className={`flex flex-col gap-2 rounded-xl border p-4 text-left backdrop-blur-sm transition-all ${
            mode === 'private'
              ? 'border-emerald-500 bg-emerald-500/10 shadow-lg ring-2 ring-emerald-500/20'
              : 'border-slate-200/60 bg-white/50 hover:border-emerald-500/50 hover:bg-emerald-500/5 dark:border-white/10 dark:bg-slate-900/50'
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

      {/* Stealth Pay Mode */}
      {mode === 'stealth' && (
        <Card variant="glass" className="mt-6 border-amber-500/30">
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
                      {parseFloat(availableStealthFormatted).toFixed(4)} MNT
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
                  <label className="text-foreground text-sm font-medium">Amount</label>
                  <div className="mt-1.5 flex gap-2">
                    <Input
                      type="number"
                      value={stealthAmount}
                      onChange={(e) => setStealthAmount(e.target.value)}
                      placeholder="0.00"
                      className={`${
                        stealthAmount && !stealthPaySummary.canSend
                          ? 'border-destructive focus-visible:ring-destructive'
                          : ''
                      }`}
                      step="0.0001"
                      min="0"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setStealthAmount(parseFloat(availableStealthFormatted).toFixed(4))
                      }
                      className="shrink-0"
                    >
                      Max
                    </Button>
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Available: {parseFloat(availableStealthFormatted).toFixed(4)} MNT
                  </p>
                  {/* Show summary message */}
                  <p
                    className={`mt-1.5 text-xs ${
                      stealthPaySummary.canSend ? 'text-muted-foreground' : 'text-destructive'
                    }`}
                  >
                    {stealthPaySummary.message}
                  </p>
                  {/* Show selected address for single mode */}
                  {stealthPaySummary.mode === 'single' && stealthPaySummary.selectedPayment && (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                      Using address: {stealthPaySummary.selectedPayment.stealthAddress.slice(0, 10)}
                      ...
                      {stealthPaySummary.selectedPayment.stealthAddress.slice(-8)}
                    </p>
                  )}
                </div>

                {collectError && (
                  <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
                    {collectError}
                  </div>
                )}

                {/* Show pending/confirming state */}
                {isConfirmingCollect && collectTxHashes.length > 0 && (
                  <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>
                      Confirming transaction...{' '}
                      <a
                        href={`https://mantlescan.xyz/tx/${collectTxHashes[0]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        View on explorer
                      </a>
                    </span>
                  </div>
                )}

                {/* Show success only after confirmation complete */}
                {!isCollecting && !isConfirmingCollect && collectTxHashes.length > 0 && (
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
                    !recipient ||
                    !isValidRecipient ||
                    !stealthAmount ||
                    isCollecting ||
                    isConfirmingCollect ||
                    !stealthPaySummary.canSend
                  }
                  size="lg"
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  {isCollecting && !isConfirmingCollect ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : isConfirmingCollect ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Confirming...
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
        <Card variant="glass" className="mt-6 border-emerald-500/30">
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

                {/* Privacy health indicator - subtle inline style */}
                {privacyHealth && (
                  <div className="text-muted-foreground flex items-center gap-3 text-xs">
                    <div
                      className="flex cursor-help items-center gap-1.5"
                      title={
                        privacyHealth.strength === 'strong'
                          ? 'Your withdrawal blends in with many others.'
                          : privacyHealth.strength === 'moderate'
                            ? 'Good privacy. More deposits would make it stronger.'
                            : 'Limited pool activity. Privacy improves as more people use the pool.'
                      }
                    >
                      <Shield
                        className={`h-3.5 w-3.5 ${
                          privacyHealth.strength === 'strong'
                            ? 'text-emerald-500'
                            : privacyHealth.strength === 'moderate'
                              ? 'text-blue-500'
                              : 'text-amber-500'
                        }`}
                      />
                      <span
                        className={`font-medium ${
                          privacyHealth.strength === 'strong'
                            ? 'text-emerald-500'
                            : privacyHealth.strength === 'moderate'
                              ? 'text-blue-500'
                              : 'text-amber-500'
                        }`}
                      >
                        {privacyHealth.strength === 'strong'
                          ? 'Strong'
                          : privacyHealth.strength === 'moderate'
                            ? 'Moderate'
                            : 'Limited'}{' '}
                        Privacy
                      </span>
                    </div>
                    <span className="text-muted-foreground/50">·</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help">
                          <span className="text-foreground font-medium">
                            {privacyHealth.anonymitySetSize}
                          </span>{' '}
                          <span className="underline decoration-dotted underline-offset-2">
                            deposits
                          </span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[250px]">
                        <p>Anonymity set size. More deposits = harder to trace your withdrawal.</p>
                      </TooltipContent>
                    </Tooltip>
                    <span className="text-muted-foreground/50">·</span>
                    <span>
                      <span className="text-foreground font-medium">
                        {privacyHealth.uniqueDepositors}
                      </span>{' '}
                      depositors
                    </span>
                    <a
                      href="/about#privacy-metrics"
                      className="text-muted-foreground hover:text-foreground ml-1"
                      title="How we measure privacy"
                    >
                      <Info className="h-3 w-3" />
                    </a>
                  </div>
                )}

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
      <Card variant="glass" className="mt-6">
        <CardContent className="pt-6">
          <h3 className="text-foreground text-sm font-medium">Privacy Comparison</h3>
          <div className="mt-3 space-y-2 text-xs">
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
