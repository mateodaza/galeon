'use client'

/**
 * Sign-in modal with 4-step onboarding flow.
 *
 * Steps:
 * 1. Connect Wallet - uses AppKit modal
 * 2. Sign In (SIWE) - creates secure session
 * 3. Unlock Keys - derives stealth keys locally
 * 4. Pool Keys - derives privacy pool keys
 *
 * Security: Steps 3-4 are gated behind Step 2 completion.
 * Supports light/dark themes via CSS variables.
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { Check, Loader2, Wallet, Shield, Key, AlertCircle, X, Lock } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { useStealthContext } from '@/contexts/stealth-context'
import { usePoolContext } from '@/contexts/pool-context'
import { cn } from '@/lib/utils'

type Step = 'connect' | 'siwe' | 'keys' | 'pool'
type StepStatus = 'pending' | 'active' | 'complete' | 'error'

interface StepConfig {
  id: Step
  title: string
  description: string
  icon: React.ReactNode
}

const steps: StepConfig[] = [
  {
    id: 'connect',
    title: 'Connect Wallet',
    description: 'Select your wallet to get started',
    icon: <Wallet className="h-5 w-5" />,
  },
  {
    id: 'siwe',
    title: 'Verify Ownership',
    description: 'Sign to create a secure 7-day session',
    icon: <Shield className="h-5 w-5" />,
  },
  {
    id: 'keys',
    title: 'Stealth Keys',
    description: 'Generate your private stealth keys',
    icon: <Key className="h-5 w-5" />,
  },
  {
    id: 'pool',
    title: 'Pool Keys',
    description: 'Enable privacy pool deposits',
    icon: <Lock className="h-5 w-5" />,
  },
]

interface SignInModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called when the full sign-in flow completes successfully */
  onComplete?: () => void
}

export function SignInModal({ open, onOpenChange, onComplete }: SignInModalProps) {
  const { open: openAppKit } = useAppKit()
  const { isConnected } = useAppKitAccount()
  const { isAuthenticated, isAuthenticating, signIn: authSignIn, error: authError } = useAuth()
  const { hasKeys, isDerivingKeys, deriveKeys } = useStealthContext()
  const { hasPoolKeys, isDerivingKeys: isDerivingPoolKeys, derivePoolKeys } = usePoolContext()

  const [currentStep, setCurrentStep] = useState<Step>('connect')
  const [stepError, setStepError] = useState<string | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [_awaitingConnection, setAwaitingConnection] = useState(false)
  const prevConnected = useRef(isConnected)
  // Track if we've already opened AppKit for this modal session
  const hasOpenedAppKit = useRef(false)

  // Detect wallet connection changes and advance step
  useEffect(() => {
    if (!prevConnected.current && isConnected && open) {
      // Just connected - advance to SIWE step
      setAwaitingConnection(false)
      setCurrentStep('siwe')
    }
    prevConnected.current = isConnected
  }, [isConnected, open])

  // Handle modal close
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      // Reset awaiting state when closing
      if (!newOpen) {
        setAwaitingConnection(false)
      }
      onOpenChange(newOpen)
    },
    [onOpenChange]
  )

  // Determine step statuses
  const getStepStatus = (step: Step): StepStatus => {
    if (step === 'connect') {
      if (isConnected) return 'complete'
      if (currentStep === 'connect') return 'active'
      return 'pending'
    }
    if (step === 'siwe') {
      if (isAuthenticated) return 'complete'
      if (currentStep === 'siwe' && isAuthenticating) return 'active'
      if (currentStep === 'siwe') return stepError ? 'error' : 'active'
      if (isConnected && !isAuthenticated) return 'pending'
      return 'pending'
    }
    if (step === 'keys') {
      if (hasKeys) return 'complete'
      if (currentStep === 'keys' && isDerivingKeys) return 'active'
      if (currentStep === 'keys') return stepError ? 'error' : 'active'
      if (isAuthenticated && !hasKeys) return 'pending'
      return 'pending'
    }
    if (step === 'pool') {
      if (hasPoolKeys) return 'complete'
      if (currentStep === 'pool' && isDerivingPoolKeys) return 'active'
      if (currentStep === 'pool') return stepError ? 'error' : 'active'
      if (hasKeys && !hasPoolKeys) return 'pending'
      return 'pending'
    }
    return 'pending'
  }

  // Auto-advance steps based on state
  useEffect(() => {
    if (!open) return

    if (!isConnected) {
      setCurrentStep('connect')
      setIsComplete(false) // Reset complete state when going back
    } else if (!isAuthenticated) {
      setCurrentStep('siwe')
      setIsComplete(false)
    } else if (!hasKeys) {
      setCurrentStep('keys')
      setIsComplete(false)
    } else if (!hasPoolKeys) {
      setCurrentStep('pool')
      setIsComplete(false)
    } else {
      // All complete
      setIsComplete(true)
      // Auto-close after success and call onComplete
      const timer = setTimeout(() => {
        onOpenChange(false)
        setIsComplete(false)
        onComplete?.()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [open, isConnected, isAuthenticated, hasKeys, hasPoolKeys, onOpenChange, onComplete])

  // Clear errors when step changes
  useEffect(() => {
    setStepError(null)
  }, [currentStep])

  // Reset hasOpenedAppKit when modal closes or wallet disconnects
  useEffect(() => {
    if (!open || !isConnected) {
      hasOpenedAppKit.current = false
    }
  }, [open, isConnected])

  // Auto-open wallet picker when modal opens and not connected
  useEffect(() => {
    if (open && !isConnected && currentStep === 'connect' && !hasOpenedAppKit.current) {
      // Small delay to let modal render first
      const timer = setTimeout(() => {
        hasOpenedAppKit.current = true
        setAwaitingConnection(true)
        openAppKit()
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [open, isConnected, currentStep, openAppKit])

  // Handle connect wallet
  const handleConnect = useCallback(() => {
    hasOpenedAppKit.current = true
    setAwaitingConnection(true)
    openAppKit()
  }, [openAppKit])

  // Handle SIWE sign-in
  const handleSignIn = useCallback(async () => {
    setStepError(null)
    try {
      const success = await authSignIn()
      if (!success) {
        setStepError(authError || 'Authentication failed. Please try again.')
      }
    } catch (err) {
      setStepError(err instanceof Error ? err.message : 'Authentication failed')
    }
  }, [authSignIn, authError])

  // Handle stealth key derivation (GATED behind SIWE)
  const handleDeriveKeys = useCallback(async () => {
    // Security gate: must be authenticated first
    if (!isAuthenticated) {
      setStepError('Please complete sign-in first')
      setCurrentStep('siwe')
      return
    }

    setStepError(null)
    try {
      await deriveKeys()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Key derivation failed'
      // User rejection is not an error
      if (message.includes('User rejected') || message.includes('cancelled')) {
        setStepError('Cancelled. Click to try again.')
      } else {
        setStepError(message)
      }
    }
  }, [isAuthenticated, deriveKeys])

  // Handle pool key derivation (GATED behind stealth keys)
  const handleDerivePoolKeys = useCallback(async () => {
    // Security gate: must have stealth keys first
    if (!hasKeys) {
      setStepError('Please derive stealth keys first')
      setCurrentStep('keys')
      return
    }

    setStepError(null)
    try {
      await derivePoolKeys()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Pool key derivation failed'
      // User rejection is not an error
      if (message.includes('User rejected') || message.includes('cancelled')) {
        setStepError('Cancelled. Click to try again.')
      } else {
        setStepError(message)
      }
    }
  }, [hasKeys, derivePoolKeys])

  // Get current step action
  const getCurrentAction = () => {
    switch (currentStep) {
      case 'connect':
        return handleConnect
      case 'siwe':
        return handleSignIn
      case 'keys':
        return handleDeriveKeys
      case 'pool':
        return handleDerivePoolKeys
    }
  }

  // Get current step button text
  const getButtonText = () => {
    if (isComplete) return 'All set!'

    switch (currentStep) {
      case 'connect':
        return 'Select Wallet'
      case 'siwe':
        if (isAuthenticating) return 'Waiting for signature...'
        if (stepError) return 'Try Again'
        return 'Sign Message'
      case 'keys':
        if (isDerivingKeys) return 'Waiting for signature...'
        if (stepError) return 'Try Again'
        return 'Unlock Stealth Keys'
      case 'pool':
        if (isDerivingPoolKeys) return 'Waiting for signature...'
        if (stepError) return 'Try Again'
        return 'Unlock Pool Keys'
    }
  }

  const isLoading = isAuthenticating || isDerivingKeys || isDerivingPoolKeys
  const currentStepConfig = steps.find((s) => s.id === currentStep)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent variant="glass" className="sm:max-w-md" showCloseButton={false}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-foreground text-lg font-semibold">
            {isComplete ? 'Welcome to Galeon' : 'Get Started'}
          </h2>
          <button
            onClick={() => handleOpenChange(false)}
            className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-full p-1.5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-4 py-4">
          <div className="relative flex items-center justify-between">
            {/* Line container - spans full width, circles will cover the ends */}
            <div className="pointer-events-none absolute inset-x-0 top-4 mx-4">
              {/* Background line */}
              <div className="bg-border h-0.5 w-full" />
              {/* Progress line overlay */}
              {(() => {
                const completedCount = steps.filter(
                  (s) => getStepStatus(s.id) === 'complete'
                ).length
                if (completedCount === 0) return null
                const progressPercent = Math.min(completedCount / (steps.length - 1), 1) * 100
                return (
                  <div
                    className="bg-primary absolute left-0 top-0 h-0.5 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                )
              })()}
            </div>

            {/* Steps */}
            {steps.map((step, index) => {
              const status = getStepStatus(step.id)

              return (
                <div key={step.id} className="relative z-10 flex flex-col items-center">
                  {/* Step circle - solid background to cover the line */}
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all',
                      status === 'complete' && 'border-primary bg-primary text-primary-foreground',
                      status === 'active' &&
                        'border-primary text-primary bg-white dark:bg-slate-900',
                      status === 'error' &&
                        'border-destructive text-destructive bg-white dark:bg-slate-900',
                      status === 'pending' &&
                        'border-border text-muted-foreground bg-white dark:bg-slate-900'
                    )}
                  >
                    {status === 'complete' ? (
                      <Check className="h-4 w-4" />
                    ) : status === 'active' &&
                      (isAuthenticating || isDerivingKeys || isDerivingPoolKeys) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : status === 'error' ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : (
                      <span className="text-xs font-medium">{index + 1}</span>
                    )}
                  </div>

                  {/* Step label */}
                  <span
                    className={cn(
                      'mt-2 whitespace-nowrap text-[10px] font-medium transition-colors',
                      status === 'complete' && 'text-primary',
                      status === 'active' && 'text-foreground',
                      status === 'error' && 'text-destructive',
                      status === 'pending' && 'text-muted-foreground'
                    )}
                  >
                    {step.title}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Current step content */}
        {!isComplete && currentStepConfig && (
          <div className="border-border bg-muted/30 mt-6 rounded-xl border p-6 dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-col items-center text-center">
              {/* Icon */}
              <div
                className={cn(
                  'mb-4 flex h-14 w-14 items-center justify-center rounded-full',
                  stepError ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : stepError ? (
                  <AlertCircle className="h-6 w-6" />
                ) : (
                  currentStepConfig.icon
                )}
              </div>

              {/* Title & Description */}
              <h3 className="text-foreground mb-2 text-lg font-medium">
                {currentStepConfig.title}
              </h3>
              <p className="text-muted-foreground mb-4 text-sm">{currentStepConfig.description}</p>

              {/* Extra info for signature steps */}
              {(currentStep === 'siwe' || currentStep === 'keys' || currentStep === 'pool') &&
                !stepError && (
                  <p className="text-primary/80 mb-4 text-xs">
                    This is a signature, not a transaction. No gas fees.
                  </p>
                )}

              {/* Error message */}
              {stepError && <p className="text-destructive mb-4 text-sm">{stepError}</p>}

              {/* Action button */}
              <Button onClick={getCurrentAction()} disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {getButtonText()}
              </Button>

              {/* Help text */}
              {currentStep === 'keys' && !stepError && (
                <p className="text-muted-foreground mt-4 text-xs">
                  Your keys are stored locally and never leave your device.
                </p>
              )}
              {currentStep === 'pool' && !stepError && (
                <p className="text-muted-foreground mt-4 text-xs">
                  Pool keys enable anonymous ZK withdrawals from the privacy pool.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Success state */}
        {isComplete && (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="bg-primary/20 mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <Check className="text-primary h-8 w-8" />
            </div>
            <h3 className="text-foreground mb-2 text-xl font-medium">You&apos;re all set!</h3>
            <p className="text-muted-foreground text-sm">
              Your wallet is connected, stealth keys unlocked, and privacy pool enabled.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
