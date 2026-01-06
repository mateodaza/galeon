'use client'

/**
 * Deposit Modal for Privacy Pool
 *
 * Allows users to deposit MNT into the privacy pool.
 * Supports both new deposits and merge deposits (O(1) withdrawals).
 * Flow: Enter amount -> Sign (if needed) -> Review (preflight check) -> Confirm
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { parseEther, formatEther } from 'viem'
import { useAccount, useBalance, useChainId } from 'wagmi'
import {
  Loader2,
  Shield,
  AlertCircle,
  Check,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { usePoolContext, type PoolDeposit } from '@/contexts/pool-context'
import { healthApi, type PreflightResult } from '@/lib/api'
import { POOL_CONTRACTS } from '@galeon/pool'

interface DepositModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (txHash: `0x${string}`) => void
}

type Step = 'amount' | 'sign' | 'review' | 'confirm' | 'pending' | 'success'
type DepositType = 'new' | 'merge'

export function DepositModal({ open, onOpenChange, onSuccess }: DepositModalProps) {
  const { address } = useAccount()
  const chainId = useChainId()
  const { data: balance } = useBalance({ address })
  const {
    hasPoolKeys,
    derivePoolKeys,
    deposit,
    mergeDeposit,
    deposits,
    isDerivingKeys,
    isDepositing,
    isMergeDepositing,
    error: poolError,
  } = usePoolContext()

  const [step, setStep] = useState<Step>('amount')
  const [amount, setAmount] = useState('')
  const [selectedDeposit, setSelectedDeposit] = useState<PoolDeposit | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)
  const [progressMessage, setProgressMessage] = useState<string>('')

  // Preflight state for merge deposits
  const [preflight, setPreflight] = useState<PreflightResult | null>(null)
  const [isLoadingPreflight, setIsLoadingPreflight] = useState(false)
  const [preflightError, setPreflightError] = useState<string | null>(null)
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null)

  const parsedAmount = amount ? parseEther(amount) : BigInt(0)
  const hasEnoughBalance = balance && parsedAmount <= balance.value
  const hasExistingDeposits = deposits.length > 0

  // Deposit type is now automatic - merge if existing deposits, new otherwise
  const depositType: DepositType = hasExistingDeposits ? 'merge' : 'new'

  // Find the largest existing deposit for auto-selection
  const largestDeposit = useMemo(() => {
    if (deposits.length === 0) return null
    return deposits.reduce((max, d) => (d.value > max.value ? d : max), deposits[0])
  }, [deposits])

  // Get pool address for preflight check
  const poolAddress =
    chainId && chainId in POOL_CONTRACTS
      ? POOL_CONTRACTS[chainId as keyof typeof POOL_CONTRACTS].pool
      : undefined

  const resetModal = useCallback(() => {
    setStep('amount')
    setAmount('')
    setSelectedDeposit(null)
    setError(null)
    setTxHash(null)
    setProgressMessage('')
    setPreflight(null)
    setIsLoadingPreflight(false)
    setPreflightError(null)
    setRetryCountdown(null)
  }, [])

  // Run preflight check for merge deposits
  const runPreflightCheck = useCallback(async () => {
    if (!poolAddress || !selectedDeposit) return

    setIsLoadingPreflight(true)
    setPreflightError(null)
    setRetryCountdown(null)

    try {
      const result = await healthApi.preflight('privatesend', {
        poolAddress,
        depositLabel: selectedDeposit.label.toString(),
      })

      setPreflight(result)

      if (!result.canProceed && result.retryAfterMs) {
        setRetryCountdown(Math.ceil(result.retryAfterMs / 1000))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Preflight check failed'
      setPreflightError(message)
    } finally {
      setIsLoadingPreflight(false)
    }
  }, [poolAddress, selectedDeposit])

  // Countdown timer for retry
  useEffect(() => {
    if (retryCountdown === null || retryCountdown <= 0) return

    const timer = setTimeout(() => {
      setRetryCountdown(retryCountdown - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [retryCountdown])

  // Auto-retry preflight when countdown reaches 0
  useEffect(() => {
    if (retryCountdown === 0 && step === 'review') {
      runPreflightCheck()
    }
  }, [retryCountdown, step, runPreflightCheck])

  // Run preflight when entering review step
  useEffect(() => {
    if (step === 'review' && depositType === 'merge') {
      runPreflightCheck()
    }
  }, [step, depositType, runPreflightCheck])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        resetModal()
      }
      onOpenChange(open)
    },
    [onOpenChange, resetModal]
  )

  const handleContinue = useCallback(async () => {
    setError(null)

    if (step === 'amount') {
      if (!amount || parsedAmount === BigInt(0)) {
        setError('Please enter an amount')
        return
      }
      if (!hasEnoughBalance) {
        setError('Insufficient balance')
        return
      }

      // Auto-select largest deposit for merge (if we have deposits)
      if (hasExistingDeposits) {
        setSelectedDeposit(largestDeposit)
      }

      // Go to sign step if no keys, otherwise continue
      if (!hasPoolKeys) {
        setStep('sign')
      } else if (depositType === 'merge') {
        // Go to review step for merge deposits (preflight check)
        setStep('review')
      } else {
        // For new deposits, go straight to confirm
        setStep('confirm')
      }
    } else if (step === 'sign') {
      try {
        await derivePoolKeys()
        // After signing, auto-select largest deposit for merge (if deposits exist)
        if (hasExistingDeposits) {
          setSelectedDeposit(largestDeposit)
        }
        if (depositType === 'merge') {
          // Go to review step for merge deposits (preflight check)
          setStep('review')
        } else {
          setStep('confirm')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to derive pool keys')
      }
    } else if (step === 'review') {
      // From review, proceed to confirm (button is disabled until preflight passes)
      setStep('confirm')
    } else if (step === 'confirm') {
      setStep('pending')
      try {
        let hash: `0x${string}`

        if (depositType === 'merge' && selectedDeposit) {
          // Execute merge deposit
          hash = await mergeDeposit(parsedAmount, selectedDeposit, setProgressMessage)
        } else {
          // Execute regular deposit
          hash = await deposit(parsedAmount)
        }

        setTxHash(hash)
        setStep('success')
        onSuccess?.(hash)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Deposit failed')
        setStep('confirm')
      }
    }
  }, [
    step,
    amount,
    parsedAmount,
    hasEnoughBalance,
    hasPoolKeys,
    hasExistingDeposits,
    largestDeposit,
    selectedDeposit,
    depositType,
    derivePoolKeys,
    deposit,
    mergeDeposit,
    onSuccess,
  ])

  const handleSetMax = useCallback(() => {
    if (balance) {
      // Leave some for gas (0.01 MNT)
      const maxAmount = balance.value - parseEther('0.01')
      if (maxAmount > BigInt(0)) {
        setAmount(formatEther(maxAmount))
      }
    }
  }, [balance])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Deposit to Privacy Pool
          </DialogTitle>
          <DialogDescription>
            {step === 'amount' && 'Enter the amount of MNT you want to deposit.'}
            {step === 'sign' && 'Sign a message to derive your pool keys.'}
            {step === 'review' && 'Checking sync status before merge deposit.'}
            {step === 'confirm' && 'Review and confirm your deposit.'}
            {step === 'pending' && 'Processing your deposit...'}
            {step === 'success' && 'Deposit successful!'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Amount Input Step */}
          {step === 'amount' && (
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (MNT)</Label>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pr-16"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 h-7 -translate-y-1/2 text-xs"
                  onClick={handleSetMax}
                >
                  MAX
                </Button>
              </div>
              {balance && (
                <p className="text-muted-foreground text-sm">
                  Balance: {formatEther(balance.value)} MNT
                </p>
              )}
            </div>
          )}

          {/* Sign Step */}
          {step === 'sign' && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm">
                  To deposit to the privacy pool, you need to derive your pool keys by signing a
                  message. This is a one-time action per session.
                </p>
              </div>
              <div className="text-muted-foreground text-center text-sm">
                {isDerivingKeys ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Waiting for signature...
                  </span>
                ) : (
                  'Click continue to sign the message'
                )}
              </div>
            </div>
          )}

          {/* Review Step - Sync check for merge deposits */}
          {step === 'review' && (
            <div className="space-y-4">
              <div className="bg-muted space-y-2 rounded-lg p-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-mono font-medium">{amount} MNT</span>
                </div>
                {selectedDeposit && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Existing Balance</span>
                      <span className="font-mono">{formatEther(selectedDeposit.value)} MNT</span>
                    </div>
                    <div className="border-border mt-2 flex justify-between border-t pt-2">
                      <span className="text-muted-foreground font-medium">New Total</span>
                      <span className="font-mono font-medium">
                        {formatEther(selectedDeposit.value + parsedAmount)} MNT
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Sync Status */}
              <div
                className={`rounded-lg border p-3 ${
                  isLoadingPreflight
                    ? 'border-slate-500/20 bg-slate-500/5'
                    : preflight?.canProceed
                      ? 'border-emerald-500/20 bg-emerald-500/5'
                      : 'border-amber-500/20 bg-amber-500/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isLoadingPreflight ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    ) : preflight?.canProceed ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-amber-500" />
                    )}
                    <span className="text-sm font-medium">
                      {isLoadingPreflight
                        ? 'Checking sync status...'
                        : preflight?.canProceed
                          ? 'Ready to merge deposit'
                          : 'Waiting for sync'}
                    </span>
                  </div>
                  {!isLoadingPreflight && !preflight?.canProceed && (
                    <button
                      onClick={runPreflightCheck}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Refresh
                    </button>
                  )}
                </div>

                {/* Sync check details */}
                {preflight && !isLoadingPreflight && (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      {preflight.checks.indexerSynced ? (
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-amber-500" />
                      )}
                      <span className="text-muted-foreground">Indexer</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {preflight.checks.aspSynced ? (
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-amber-500" />
                      )}
                      <span className="text-muted-foreground">ASP Tree</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {preflight.checks.stateTreeValid ? (
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-amber-500" />
                      )}
                      <span className="text-muted-foreground">State Tree</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {preflight.checks.labelExists ? (
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-amber-500" />
                      )}
                      <span className="text-muted-foreground">Deposit</span>
                    </div>
                  </div>
                )}

                {/* Error/Warning messages */}
                {preflight && !preflight.canProceed && preflight.errors.length > 0 && (
                  <div className="mt-2 text-xs text-amber-400">
                    {preflight.errors[0]}
                    {retryCountdown !== null && retryCountdown > 0 && (
                      <span className="ml-1 text-slate-400">(retry in {retryCountdown}s)</span>
                    )}
                  </div>
                )}

                {preflightError && (
                  <div className="mt-2 text-xs text-red-400">{preflightError}</div>
                )}
              </div>
            </div>
          )}

          {/* Confirm Step */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="bg-muted space-y-2 rounded-lg p-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-mono font-medium">{amount} MNT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium capitalize">{depositType}</span>
                </div>
                {depositType === 'merge' && selectedDeposit && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Existing Balance</span>
                      <span className="font-mono">{formatEther(selectedDeposit.value)} MNT</span>
                    </div>
                    <div className="border-border mt-2 flex justify-between border-t pt-2">
                      <span className="text-muted-foreground font-medium">New Total</span>
                      <span className="font-mono font-medium">
                        {formatEther(selectedDeposit.value + parsedAmount)} MNT
                      </span>
                    </div>
                  </>
                )}
              </div>
              <div className="text-muted-foreground text-sm">
                {depositType === 'merge' ? (
                  <p>
                    Your new deposit will be merged with your existing commitment. This requires
                    generating a ZK proof which may take 30-60 seconds.
                  </p>
                ) : (
                  <p>
                    Your deposit will be added to the privacy pool. You can withdraw your funds at
                    any time by generating a zero-knowledge proof.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Pending Step */}
          {step === 'pending' && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="text-primary h-8 w-8 animate-spin" />
              <p className="text-muted-foreground mt-4 text-center">
                {progressMessage ||
                  (depositType === 'merge'
                    ? 'Generating merge proof...'
                    : 'Submitting deposit transaction...')}
              </p>
              {depositType === 'merge' && (
                <p className="text-muted-foreground/70 mt-2 text-center text-xs">
                  This may take 30-60 seconds
                </p>
              )}
            </div>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full">
                <Check className="h-6 w-6" />
              </div>
              <p className="mt-4 font-medium">Deposit Successful!</p>
              <p className="text-muted-foreground mt-2 text-center text-sm">
                Your {amount} MNT has been deposited to the privacy pool.
              </p>
              {txHash && (
                <a
                  href={`https://sepolia.mantlescan.xyz/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary mt-2 text-sm hover:underline"
                >
                  View transaction
                </a>
              )}
            </div>
          )}

          {/* Error Display */}
          {(error || poolError) && (
            <div className="bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-sm">{error || poolError}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'success' ? (
            <Button onClick={() => handleOpenChange(false)}>Done</Button>
          ) : step === 'pending' ? null : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  if (step === 'amount') {
                    handleOpenChange(false)
                  } else if (step === 'sign') {
                    setStep('amount')
                  } else if (step === 'review') {
                    setStep('amount')
                  } else if (step === 'confirm') {
                    if (depositType === 'merge') {
                      setStep('review')
                    } else {
                      setStep('amount')
                    }
                  }
                }}
                disabled={isDerivingKeys || isDepositing || isMergeDepositing || isLoadingPreflight}
              >
                {step === 'amount' ? 'Cancel' : 'Back'}
              </Button>
              <Button
                onClick={handleContinue}
                disabled={
                  (step === 'amount' && (!amount || !hasEnoughBalance)) ||
                  (step === 'review' && (isLoadingPreflight || !preflight?.canProceed)) ||
                  isDerivingKeys ||
                  isDepositing ||
                  isMergeDepositing
                }
              >
                {isDerivingKeys || isDepositing || isMergeDepositing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isDerivingKeys
                      ? 'Signing...'
                      : isMergeDepositing
                        ? 'Merging...'
                        : 'Depositing...'}
                  </>
                ) : step === 'review' && isLoadingPreflight ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : step === 'review' && !preflight?.canProceed ? (
                  <>
                    <Clock className="h-4 w-4" />
                    Waiting for Sync...
                  </>
                ) : step === 'confirm' ? (
                  depositType === 'merge' ? (
                    'Merge Deposit'
                  ) : (
                    'Deposit'
                  )
                ) : (
                  'Continue'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
