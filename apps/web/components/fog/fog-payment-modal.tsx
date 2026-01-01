'use client'

/**
 * Modal for making payments from a fog wallet.
 *
 * Features:
 * - Recipient input with auto-detection (EOA vs stealth)
 * - Amount input with balance display
 * - Memo field
 * - Privacy warnings
 * - Schedule payment for timing privacy
 * - Confirmation step
 */

import { useState, useCallback, useMemo } from 'react'
import {
  Loader2,
  Send,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Clock,
  Calendar,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { PrivacyIndicator, RecipientTypeIndicator } from '@/components/fog/privacy-indicator'
import { useFogPayment, usePaymentPreview } from '@/hooks/use-fog-payment'
import { useFogWallet } from '@/hooks/use-fog-wallet'
import { useScheduledPaymentContext } from '@/contexts/scheduled-payment-context'
import { detectRecipientType, getRecipientPrivacyMessage, getTimingStatus } from '@/lib/fog-privacy'
import { getTxExplorerUrl } from '@/lib/chains'
import { cn } from '@/lib/utils'

// ============================================================
// Delay Options
// ============================================================

const DELAY_OPTIONS = [
  { value: 2, label: '2 hours', description: 'Good timing protection' },
  { value: 6, label: '6 hours', description: 'Excellent timing protection' },
  { value: 24, label: '24 hours', description: 'Maximum timing protection' },
] as const

// ============================================================
// Types
// ============================================================

interface FogPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fogIndex: number
  onSuccess?: () => void
}

// ============================================================
// Component
// ============================================================

export function FogPaymentModal({ open, onOpenChange, fogIndex, onSuccess }: FogPaymentModalProps) {
  const { fogWallet } = useFogWallet(fogIndex)
  const { payFromFog, isPending, isConfirming, txHash, error, reset } = useFogPayment()
  const { schedulePayment } = useScheduledPaymentContext()

  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [step, setStep] = useState<'form' | 'confirm' | 'success' | 'scheduled'>('form')

  // Scheduling state
  const [isScheduled, setIsScheduled] = useState(false)
  const [delayHours, setDelayHours] = useState(2)

  // Check if wallet has good timing (no need to schedule)
  const timingStatus = fogWallet ? getTimingStatus(fogWallet.fundedAt) : 'ready'
  const hasGoodTiming = timingStatus === 'excellent' || timingStatus === 'maximum'

  // Preview data
  const preview = usePaymentPreview(fogIndex, recipient, amount)

  const handleClose = useCallback(() => {
    setRecipient('')
    setAmount('')
    setMemo('')
    setStep('form')
    setIsScheduled(false)
    setDelayHours(2)
    reset()
    onOpenChange(false)
  }, [onOpenChange, reset])

  const handleConfirm = useCallback(() => {
    if (!preview.isValid) return
    setStep('confirm')
  }, [preview.isValid])

  const handlePay = useCallback(async () => {
    if (!fogWallet) return

    // If scheduling, use schedule function instead
    if (isScheduled) {
      try {
        await schedulePayment(
          fogIndex,
          fogWallet.name,
          recipient,
          amount,
          delayHours,
          memo || undefined
        )
        setStep('scheduled')
        onSuccess?.()
      } catch {
        // Error is handled by the context
      }
      return
    }

    // Immediate payment
    try {
      await payFromFog(fogIndex, recipient, amount, memo || undefined)
      setStep('success')
      onSuccess?.()
    } catch {
      // Error is handled by the hook
    }
  }, [
    fogWallet,
    isScheduled,
    schedulePayment,
    fogIndex,
    recipient,
    amount,
    delayHours,
    memo,
    payFromFog,
    onSuccess,
  ])

  const handleBack = useCallback(() => {
    setStep('form')
    reset()
  }, [reset])

  // Validate amount
  const amountError = useMemo(() => {
    if (!amount) return null
    try {
      const amountNum = parseFloat(amount)
      if (isNaN(amountNum) || amountNum <= 0) {
        return 'Enter a valid amount'
      }
      if (fogWallet && amountNum > parseFloat(fogWallet.balanceFormatted)) {
        return 'Insufficient balance'
      }
    } catch {
      return 'Invalid amount'
    }
    return null
  }, [amount, fogWallet])

  const canProceed = preview.isValid && amount && !amountError

  if (!fogWallet) {
    return null
  }

  // Success state
  if (step === 'success' && txHash) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center py-6 text-center">
            <div className="bg-primary/20 flex h-16 w-16 items-center justify-center rounded-full">
              <CheckCircle2 className="text-primary h-8 w-8" />
            </div>
            <h2 className="text-foreground mt-4 text-xl font-semibold">Payment Sent!</h2>
            <p className="text-muted-foreground mt-2">
              Your payment has been submitted to the network.
            </p>

            <Card className="mt-6 w-full">
              <CardContent className="pt-4">
                <p className="text-muted-foreground text-xs">Transaction Hash</p>
                <p className="text-foreground mt-1 break-all font-mono text-sm">{txHash}</p>
              </CardContent>
            </Card>

            <a
              href={getTxExplorerUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 mt-4 inline-flex items-center gap-1"
            >
              View on Explorer
              <ExternalLink className="h-4 w-4" />
            </a>

            <Button className="mt-6 w-full" onClick={handleClose}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Scheduled state
  if (step === 'scheduled') {
    const executeAt = new Date(Date.now() + delayHours * 60 * 60 * 1000)
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/20">
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
            <h2 className="text-foreground mt-4 text-xl font-semibold">Payment Scheduled!</h2>
            <p className="text-muted-foreground mt-2">
              Your payment will be sent automatically for better timing privacy.
            </p>

            <Card className="mt-6 w-full">
              <CardContent className="space-y-2 pt-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="text-foreground font-medium">{amount} MNT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scheduled for</span>
                  <span className="text-foreground font-medium">
                    {executeAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delay</span>
                  <span className="text-foreground">{delayHours} hours</span>
                </div>
              </CardContent>
            </Card>

            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-left dark:border-blue-800 dark:bg-blue-950/50">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Keep this tab open or return later. The payment will execute automatically when the
                time comes.
              </p>
            </div>

            <Button className="mt-6 w-full" onClick={handleClose}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Confirm state
  if (step === 'confirm') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
            <DialogDescription>Review your payment details before sending.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Summary */}
            <Card>
              <CardContent className="space-y-3 pt-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">From</span>
                  <span className="text-foreground font-medium">{fogWallet.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">To</span>
                  <span className="text-foreground font-mono text-sm">
                    {recipient.slice(0, 10)}...{recipient.slice(-8)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="text-foreground font-semibold">{amount} MNT</span>
                </div>
                {memo && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Memo</span>
                    <span className="text-foreground">{memo}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Privacy info */}
            <div className="flex items-center justify-between">
              <PrivacyIndicator
                level={preview.privacyLevel}
                fundedAt={fogWallet.fundedAt}
                warnings={preview.warnings}
                showDetails
              />
              <RecipientTypeIndicator isStealthRecipient={preview.isStealthRecipient} />
            </div>

            {/* Warnings */}
            {preview.warnings.length > 0 && (
              <div className="rounded-lg bg-yellow-500/10 p-3">
                <p className="mb-2 flex items-center gap-1 text-sm font-medium text-yellow-500">
                  <AlertTriangle className="h-4 w-4" />
                  Privacy Warnings
                </p>
                <ul className="space-y-1">
                  {preview.warnings.map((warning, index) => (
                    <li key={index} className="text-xs text-yellow-500">
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Schedule payment toggle - show if timing is not excellent */}
            {!hasGoodTiming && (
              <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <Label
                      htmlFor="schedule-toggle"
                      className="text-sm font-medium text-blue-900 dark:text-blue-100"
                    >
                      Schedule for better timing
                    </Label>
                  </div>
                  <Switch
                    id="schedule-toggle"
                    checked={isScheduled}
                    onCheckedChange={setIsScheduled}
                  />
                </div>

                {isScheduled && (
                  <div className="grid grid-cols-3 gap-2">
                    {DELAY_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setDelayHours(option.value)}
                        className={cn(
                          'rounded-lg border p-2 text-center transition-colors',
                          delayHours === option.value
                            ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/50'
                            : 'border-blue-200 hover:border-blue-300 dark:border-blue-800'
                        )}
                      >
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          {option.label}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          {option.description}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {!isScheduled && (
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    For best privacy, wait a few hours before paying. Schedule to automate this.
                  </p>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleBack}
                disabled={isPending || isConfirming}
              >
                Back
              </Button>
              <Button className="flex-1" onClick={handlePay} disabled={isPending || isConfirming}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Confirm in wallet...
                  </>
                ) : isConfirming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Confirming...
                  </>
                ) : isScheduled ? (
                  <>
                    <Calendar className="h-4 w-4" />
                    Schedule Payment
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Now
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Form state
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Pay from {fogWallet.name}
          </DialogTitle>
          <DialogDescription>Available: {fogWallet.balanceFormatted} MNT</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipient */}
          <div>
            <label className="text-foreground block text-sm font-medium">Recipient</label>
            <Input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x... or st:mnt:..."
              className="mt-1 font-mono"
            />
            {recipient && (
              <p
                className={`mt-1 text-xs ${
                  preview.isValid ? 'text-muted-foreground' : 'text-destructive'
                }`}
              >
                {preview.isValid
                  ? getRecipientPrivacyMessage(detectRecipientType(recipient))
                  : 'Invalid address format'}
              </p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="text-foreground block text-sm font-medium">Amount</label>
            <div className="relative mt-1">
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                step="0.01"
                min="0"
                className={amountError ? 'border-destructive pr-16' : 'pr-16'}
              />
              <span className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 text-sm">
                MNT
              </span>
            </div>
            {amountError && <p className="text-destructive mt-1 text-xs">{amountError}</p>}
            <button
              type="button"
              onClick={() => setAmount(fogWallet.balanceFormatted)}
              className="text-primary hover:text-primary/80 mt-1 text-xs"
            >
              Use max
            </button>
          </div>

          {/* Memo */}
          <div>
            <label className="text-foreground block text-sm font-medium">Memo (optional)</label>
            <Input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="What's this payment for?"
              className="mt-1"
            />
            <p className="text-muted-foreground mt-1 text-xs">
              Memo is hashed on-chain, not stored in plain text
            </p>
          </div>

          {/* Continue button */}
          <Button className="w-full" onClick={handleConfirm} disabled={!canProceed}>
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
