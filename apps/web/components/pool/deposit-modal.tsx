'use client'

/**
 * Deposit Modal for Privacy Pool
 *
 * Allows users to deposit MNT into the privacy pool.
 * Supports both new deposits and merge deposits (O(1) withdrawals).
 * Flow: Enter amount -> Choose type (if existing) -> Sign (if needed) -> Confirm
 */

import { useState, useCallback, useMemo } from 'react'
import { parseEther, formatEther } from 'viem'
import { useAccount, useBalance } from 'wagmi'
import { Loader2, Shield, AlertCircle, Check, Sparkles, Plus, Merge } from 'lucide-react'
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

interface DepositModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (txHash: `0x${string}`) => void
}

type Step = 'amount' | 'type' | 'sign' | 'confirm' | 'pending' | 'success'
type DepositType = 'new' | 'merge'

export function DepositModal({ open, onOpenChange, onSuccess }: DepositModalProps) {
  const { address } = useAccount()
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
  const [depositType, setDepositType] = useState<DepositType>('new')
  const [selectedDeposit, setSelectedDeposit] = useState<PoolDeposit | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)
  const [progressMessage, setProgressMessage] = useState<string>('')

  const parsedAmount = amount ? parseEther(amount) : BigInt(0)
  const hasEnoughBalance = balance && parsedAmount <= balance.value
  const hasExistingDeposits = deposits.length > 0

  // Find the largest existing deposit for auto-selection
  const largestDeposit = useMemo(() => {
    if (deposits.length === 0) return null
    return deposits.reduce((max, d) => (d.value > max.value ? d : max), deposits[0])
  }, [deposits])

  const resetModal = useCallback(() => {
    setStep('amount')
    setAmount('')
    setDepositType('new')
    setSelectedDeposit(null)
    setError(null)
    setTxHash(null)
    setProgressMessage('')
  }, [])

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

      // If user has existing deposits, show type selection
      if (hasExistingDeposits && hasPoolKeys) {
        // Auto-select largest deposit for merge
        setSelectedDeposit(largestDeposit)
        setStep('type')
      } else if (!hasPoolKeys) {
        setStep('sign')
      } else {
        setStep('confirm')
      }
    } else if (step === 'type') {
      if (depositType === 'merge' && !selectedDeposit) {
        setError('Please select a deposit to merge into')
        return
      }
      setStep('confirm')
    } else if (step === 'sign') {
      try {
        await derivePoolKeys()
        // After signing, if user has deposits, show type selection
        if (hasExistingDeposits) {
          setSelectedDeposit(largestDeposit)
          setStep('type')
        } else {
          setStep('confirm')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to derive pool keys')
      }
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
    depositType,
    selectedDeposit,
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
            {step === 'type' && 'Choose how to deposit your funds.'}
            {step === 'sign' && 'Sign a message to derive your pool keys.'}
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

          {/* Type Selection Step */}
          {step === 'type' && (
            <div className="space-y-4">
              <div className="grid gap-3">
                {/* Merge Option - Recommended */}
                <button
                  type="button"
                  onClick={() => setDepositType('merge')}
                  className={`rounded-lg border-2 p-4 text-left transition-colors ${
                    depositType === 'merge'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full ${
                        depositType === 'merge' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}
                    >
                      <Merge className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Merge Deposit</span>
                        <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                          Recommended
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1 text-sm">
                        Combine with your largest deposit (
                        {formatEther(largestDeposit?.value ?? 0n)} MNT). Enables single-transaction
                        withdrawals.
                      </p>
                    </div>
                  </div>
                </button>

                {/* New Deposit Option */}
                <button
                  type="button"
                  onClick={() => setDepositType('new')}
                  className={`rounded-lg border-2 p-4 text-left transition-colors ${
                    depositType === 'new'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full ${
                        depositType === 'new' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <span className="font-medium">New Deposit</span>
                      <p className="text-muted-foreground mt-1 text-sm">
                        Create a separate deposit. Withdrawals will require multiple transactions.
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {depositType === 'merge' && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Sparkles className="h-4 w-4 shrink-0" />
                    <span>
                      After merging, your total balance of{' '}
                      <span className="text-foreground font-mono font-medium">
                        {formatEther((largestDeposit?.value ?? 0n) + parsedAmount)} MNT
                      </span>{' '}
                      can be withdrawn in a single transaction.
                    </span>
                  </p>
                </div>
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
                  } else if (step === 'type') {
                    setStep('amount')
                  } else if (step === 'sign') {
                    setStep('amount')
                  } else if (step === 'confirm') {
                    if (hasExistingDeposits) {
                      setStep('type')
                    } else {
                      setStep('amount')
                    }
                  }
                }}
                disabled={isDerivingKeys || isDepositing || isMergeDepositing}
              >
                {step === 'amount' ? 'Cancel' : 'Back'}
              </Button>
              <Button
                onClick={handleContinue}
                disabled={
                  (step === 'amount' && (!amount || !hasEnoughBalance)) ||
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
