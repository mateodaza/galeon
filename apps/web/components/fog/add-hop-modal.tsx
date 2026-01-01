'use client'

/**
 * AddHopModal component for creating intermediate wallets.
 *
 * This is the key UX component for multi-hop privacy:
 * 1. Shows source wallet and what will happen
 * 2. Visualizes privacy improvement
 * 3. Option to execute now or schedule for timing privacy
 */

import { useState, useEffect } from 'react'
import {
  ArrowRight,
  Loader2,
  AlertTriangle,
  Check,
  Shield,
  Wallet,
  Layers,
  Clock,
  Zap,
  Calendar,
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
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useFogContext } from '@/contexts/fog-context'
import { useStealthContext } from '@/contexts/stealth-context'
import { useScheduledPaymentContext } from '@/contexts/scheduled-payment-context'
import { useFogPayment } from '@/hooks/use-fog-payment'
import { cn } from '@/lib/utils'
import type { FogWallet } from '@/types/fog'

// ============================================================
// Constants
// ============================================================

const DELAY_OPTIONS = [
  { value: 2, label: '2 hours', description: 'Good timing protection' },
  { value: 6, label: '6 hours', description: 'Excellent timing protection' },
  { value: 24, label: '24 hours', description: 'Maximum timing protection' },
] as const

// ============================================================
// Types
// ============================================================

interface AddHopModalProps {
  /** Whether the modal is open */
  open: boolean
  /** Callback when modal open state changes */
  onOpenChange: (open: boolean) => void
  /** Source wallet to add hop from */
  sourceFogIndex: number
}

// ============================================================
// Privacy Improvement Visual
// ============================================================

function PrivacyImprovement({
  fromLevel,
  toLevel,
}: {
  fromLevel: 'low' | 'medium' | 'high'
  toLevel: 'low' | 'medium' | 'high'
}) {
  const levelColors = {
    low: 'text-yellow-500',
    medium: 'text-blue-500',
    high: 'text-green-500',
  }

  const levelBgColors = {
    low: 'bg-yellow-500',
    medium: 'bg-blue-500',
    high: 'bg-green-500',
  }

  const levelLabels = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
  }

  return (
    <div className="bg-muted rounded-lg p-4">
      <p className="text-muted-foreground mb-3 text-center text-sm font-medium">
        Privacy Improvement
      </p>
      <div className="flex items-center justify-center gap-4">
        <div className="text-center">
          <div
            className={cn(
              'mx-auto flex h-10 w-10 items-center justify-center rounded-full',
              fromLevel === 'low' ? 'bg-yellow-500/10' : 'bg-blue-500/10'
            )}
          >
            <Wallet className={cn('h-5 w-5', levelColors[fromLevel])} />
          </div>
          <p className={cn('mt-1 text-sm font-medium', levelColors[fromLevel])}>
            {levelLabels[fromLevel]}
          </p>
        </div>

        <ArrowRight className="text-muted-foreground h-5 w-5" />

        <div className="text-center">
          <div
            className={cn(
              'mx-auto flex h-10 w-10 items-center justify-center rounded-full',
              toLevel === 'high' ? 'bg-green-500/10' : 'bg-blue-500/10'
            )}
          >
            <Layers className={cn('h-5 w-5', levelColors[toLevel])} />
          </div>
          <p className={cn('mt-1 text-sm font-medium', levelColors[toLevel])}>
            {levelLabels[toLevel]}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 flex gap-1">
        <div className={cn('h-1.5 flex-1 rounded-full', levelBgColors.low)} />
        <div
          className={cn(
            'h-1.5 flex-1 rounded-full',
            toLevel === 'low' ? 'bg-muted-foreground/20' : levelBgColors.medium
          )}
        />
        <div
          className={cn(
            'h-1.5 flex-1 rounded-full',
            toLevel === 'high' ? levelBgColors.high : 'bg-muted-foreground/20'
          )}
        />
      </div>
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================

export function AddHopModal({ open, onOpenChange, sourceFogIndex }: AddHopModalProps) {
  const { getFogWallet, createIntermediateWallet, markAsFunded, refreshBalances } = useFogContext()
  const { masterSignature } = useStealthContext()
  const { scheduleHop } = useScheduledPaymentContext()
  const { transferToFogWallet } = useFogPayment()

  const [step, setStep] = useState<
    'confirm' | 'creating' | 'transferring' | 'done' | 'scheduled' | 'error'
  >('confirm')
  const [error, setError] = useState<string | null>(null)
  const [newWallet, setNewWallet] = useState<FogWallet | null>(null)

  // Scheduling state
  const [isScheduled, setIsScheduled] = useState(false)
  const [delayHours, setDelayHours] = useState(2)

  // Get source wallet
  const sourceWallet = getFogWallet(sourceFogIndex)

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep('confirm')
      setError(null)
      setNewWallet(null)
      setIsScheduled(false)
      setDelayHours(2)
    }
  }, [open])

  // Calculate privacy improvement
  const currentLevel = sourceWallet?.privacyLevel || 'low'
  const newLevel = sourceWallet?.fundingSource === 'external' ? 'high' : 'medium'

  // Handle the add hop action (immediate)
  const handleAddHopNow = async () => {
    if (!sourceWallet || !masterSignature) return

    try {
      setError(null)

      // Step 1: Create intermediate wallet
      setStep('creating')
      const intermediate = await createIntermediateWallet(sourceFogIndex)
      setNewWallet(intermediate)

      // Step 2: Transfer funds from source to intermediate
      setStep('transferring')
      const txHash = await transferToFogWallet(sourceFogIndex, intermediate.stealthAddress)

      // Step 3: Mark as funded
      await markAsFunded(
        intermediate.fogIndex,
        'self', // Internal transfer
        sourceWallet.balance,
        txHash,
        sourceWallet.stealthAddress
      )

      // Refresh balances
      await refreshBalances()

      setStep('done')
    } catch (err) {
      console.error('[AddHop] Failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to add hop')
      setStep('error')
    }
  }

  // Handle scheduled hop
  const handleScheduleHop = async () => {
    if (!sourceWallet || !masterSignature) return

    try {
      setError(null)

      // Step 1: Create intermediate wallet (but don't transfer yet)
      setStep('creating')
      const intermediate = await createIntermediateWallet(sourceFogIndex)
      setNewWallet(intermediate)

      // Step 2: Schedule the transfer
      await scheduleHop(
        sourceFogIndex,
        sourceWallet.name,
        intermediate.fogIndex,
        intermediate.name,
        intermediate.stealthAddress,
        sourceWallet.balance.toString(),
        delayHours
      )

      setStep('scheduled')
    } catch (err) {
      console.error('[AddHop] Failed to schedule:', err)
      setError(err instanceof Error ? err.message : 'Failed to schedule hop')
      setStep('error')
    }
  }

  // Handle add hop (either immediate or scheduled)
  const handleAddHop = async () => {
    if (isScheduled) {
      await handleScheduleHop()
    } else {
      await handleAddHopNow()
    }
  }

  const handleClose = () => {
    if (step === 'creating' || step === 'transferring') {
      // Don't allow closing during transfer
      return
    }
    onOpenChange(false)
  }

  if (!sourceWallet) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Add Hop for Privacy
          </DialogTitle>
          <DialogDescription>
            Transfer funds to a new intermediate wallet to break the link between funding and
            payment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Confirm step */}
          {step === 'confirm' && (
            <>
              {/* Source wallet info */}
              <div className="bg-muted rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{sourceWallet.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {sourceWallet.balanceFormatted} MNT
                    </p>
                  </div>
                  <div className="rounded-full bg-yellow-500/10 px-2 py-1 text-xs font-medium text-yellow-500">
                    Entry Wallet
                  </div>
                </div>
              </div>

              {/* Privacy improvement */}
              <PrivacyImprovement fromLevel={currentLevel} toLevel={newLevel} />

              {/* What will happen */}
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">This will:</p>
                <ul className="text-muted-foreground list-inside list-disc space-y-1">
                  <li>Create a new intermediate wallet</li>
                  <li>Transfer all {sourceWallet.balanceFormatted} MNT to it</li>
                  <li>Allow you to pay with improved privacy</li>
                </ul>
              </div>

              {/* Schedule toggle */}
              <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <Label
                      htmlFor="schedule-hop-toggle"
                      className="text-sm font-medium text-blue-900 dark:text-blue-100"
                    >
                      Schedule for timing privacy
                    </Label>
                  </div>
                  <Switch
                    id="schedule-hop-toggle"
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
                    For best privacy, schedule the hop to break timing correlation between funding
                    and hop.
                  </p>
                )}
              </div>
            </>
          )}

          {/* Creating step */}
          {step === 'creating' && (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="text-primary h-8 w-8 animate-spin" />
              <p className="text-muted-foreground mt-4 text-sm">Creating intermediate wallet...</p>
            </div>
          )}

          {/* Transferring step */}
          {step === 'transferring' && (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="text-primary h-8 w-8 animate-spin" />
              <p className="text-muted-foreground mt-4 text-sm">Transferring funds...</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Please confirm the transaction in your wallet
              </p>
            </div>
          )}

          {/* Done step (immediate transfer completed) */}
          {step === 'done' && newWallet && (
            <div className="flex flex-col items-center py-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <Check className="h-6 w-6 text-green-500" />
              </div>
              <p className="text-foreground mt-4 text-lg font-medium">Hop Added!</p>
              <p className="text-muted-foreground mt-1 text-center text-sm">
                Your funds are now in <strong>{newWallet.name}</strong>.
              </p>

              <PrivacyImprovement fromLevel={currentLevel} toLevel={newLevel} />

              {/* Timing nudge - IMPORTANT for best privacy */}
              <div className="mt-4 w-full space-y-3">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/50">
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        For best privacy, wait a few hours before paying.
                      </p>
                      <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                        Time separation breaks timing correlation. 2+ hours is good, 6+ hours is
                        excellent.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-center">
                  <div className="bg-border h-px flex-1" />
                  <span className="text-muted-foreground text-xs">or</span>
                  <div className="bg-border h-px flex-1" />
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/50">
                  <div className="flex items-start gap-3">
                    <Zap className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                        Pay now if urgent
                      </p>
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                        Multi-hop provides structural privacy. You can pay immediately with medium
                        privacy.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Scheduled step */}
          {step === 'scheduled' && newWallet && (
            <div className="flex flex-col items-center py-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                <Calendar className="h-6 w-6 text-blue-500" />
              </div>
              <p className="text-foreground mt-4 text-lg font-medium">Hop Scheduled!</p>
              <p className="text-muted-foreground mt-1 text-center text-sm">
                Transfer to <strong>{newWallet.name}</strong> will execute in {delayHours} hours.
              </p>

              <div className="mt-4 w-full rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/50">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700 dark:text-blue-300">Amount</span>
                    <span className="font-medium text-blue-900 dark:text-blue-100">
                      {sourceWallet.balanceFormatted} MNT
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700 dark:text-blue-300">Scheduled for</span>
                    <span className="font-medium text-blue-900 dark:text-blue-100">
                      {new Date(Date.now() + delayHours * 60 * 60 * 1000).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700 dark:text-blue-300">Privacy boost</span>
                    <span className="font-medium text-blue-900 dark:text-blue-100">
                      {delayHours >= 6 ? 'Excellent' : 'Good'} timing protection
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-muted-foreground mt-4 text-center text-xs">
                Keep this tab open or return later. The hop will execute automatically.
              </p>
            </div>
          )}

          {/* Error step */}
          {step === 'error' && (
            <div className="flex flex-col items-center py-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <p className="text-foreground mt-4 text-lg font-medium">Failed to Add Hop</p>
              <p className="text-muted-foreground mt-1 text-center text-sm">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'confirm' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleAddHop} className="gap-2">
                {isScheduled ? (
                  <>
                    <Calendar className="h-4 w-4" />
                    Schedule Hop
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    Add Hop Now
                  </>
                )}
              </Button>
            </>
          )}

          {step === 'done' && (
            <div className="flex w-full gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Wait & Pay Later
              </Button>
              <Button
                onClick={() => {
                  handleClose()
                  // Payment modal will be triggered from wallet card
                }}
                className="flex-1"
              >
                Pay Now
              </Button>
            </div>
          )}

          {step === 'scheduled' && (
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          )}

          {step === 'error' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={handleAddHop}>Try Again</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
