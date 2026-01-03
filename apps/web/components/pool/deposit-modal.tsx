'use client'

/**
 * Deposit Modal for Privacy Pool
 *
 * Allows users to deposit MNT into the privacy pool.
 * Flow: Enter amount -> Sign for pool keys (if needed) -> Confirm deposit
 */

import { useState, useCallback } from 'react'
import { parseEther, formatEther } from 'viem'
import { useAccount, useBalance } from 'wagmi'
import { Loader2, Shield, AlertCircle, Check } from 'lucide-react'
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
import { usePoolContext } from '@/contexts/pool-context'

interface DepositModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (txHash: `0x${string}`) => void
}

type Step = 'amount' | 'sign' | 'confirm' | 'pending' | 'success'

export function DepositModal({ open, onOpenChange, onSuccess }: DepositModalProps) {
  const { address } = useAccount()
  const { data: balance } = useBalance({ address })
  const {
    hasPoolKeys,
    derivePoolKeys,
    deposit,
    isDerivingKeys,
    isDepositing,
    error: poolError,
  } = usePoolContext()

  const [step, setStep] = useState<Step>('amount')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)

  const parsedAmount = amount ? parseEther(amount) : BigInt(0)
  const hasEnoughBalance = balance && parsedAmount <= balance.value

  const resetModal = useCallback(() => {
    setStep('amount')
    setAmount('')
    setError(null)
    setTxHash(null)
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

      // Check if we need to derive pool keys
      if (!hasPoolKeys) {
        setStep('sign')
      } else {
        setStep('confirm')
      }
    } else if (step === 'sign') {
      try {
        await derivePoolKeys()
        setStep('confirm')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to derive pool keys')
      }
    } else if (step === 'confirm') {
      setStep('pending')
      try {
        const hash = await deposit(parsedAmount)
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
    derivePoolKeys,
    deposit,
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

          {/* Confirm Step */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-mono font-medium">{amount} MNT</span>
                </div>
              </div>
              <div className="text-muted-foreground text-sm">
                <p>
                  Your deposit will be added to the privacy pool. You can withdraw your funds at any
                  time by generating a zero-knowledge proof.
                </p>
              </div>
            </div>
          )}

          {/* Pending Step */}
          {step === 'pending' && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="text-primary h-8 w-8 animate-spin" />
              <p className="text-muted-foreground mt-4">Submitting deposit transaction...</p>
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
          ) : (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleContinue}
                disabled={
                  (step === 'amount' && (!amount || !hasEnoughBalance)) ||
                  isDerivingKeys ||
                  isDepositing
                }
              >
                {isDerivingKeys || isDepositing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isDerivingKeys ? 'Signing...' : 'Depositing...'}
                  </>
                ) : step === 'confirm' ? (
                  'Deposit'
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
