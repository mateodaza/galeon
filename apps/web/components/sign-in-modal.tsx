'use client'

/**
 * Sign-in modal with 3-step onboarding flow.
 *
 * Steps:
 * 1. Connect Wallet - uses AppKit modal
 * 2. Sign In (SIWE) - creates secure session
 * 3. Unlock Keys - derives stealth keys locally
 *
 * Security: Step 3 is gated behind Step 2 completion.
 * Supports light/dark themes via CSS variables.
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { Check, Loader2, Wallet, Shield, Key, AlertCircle, X } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { useStealthContext } from '@/contexts/stealth-context'
import { cn } from '@/lib/utils'

type Step = 'connect' | 'siwe' | 'keys'
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
    title: 'Unlock Keys',
    description: 'Generate your private stealth keys',
    icon: <Key className="h-5 w-5" />,
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

  const [currentStep, setCurrentStep] = useState<Step>('connect')
  const [stepError, setStepError] = useState<string | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [awaitingConnection, setAwaitingConnection] = useState(false)
  const prevConnected = useRef(isConnected)

  // Detect wallet connection changes and advance step
  useEffect(() => {
    if (!prevConnected.current && isConnected && open) {
      // Just connected - advance to SIWE step
      setAwaitingConnection(false)
      setCurrentStep('siwe')
    }
    prevConnected.current = isConnected
  }, [isConnected, open])

  // Handle modal close - prevent closing while awaiting wallet connection
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      // If trying to close while awaiting connection, ignore
      if (!newOpen && awaitingConnection && !isConnected) {
        return
      }
      onOpenChange(newOpen)
    },
    [awaitingConnection, isConnected, onOpenChange]
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
    return 'pending'
  }

  // Auto-advance steps based on state
  useEffect(() => {
    if (!open) return

    if (!isConnected) {
      setCurrentStep('connect')
    } else if (!isAuthenticated) {
      setCurrentStep('siwe')
    } else if (!hasKeys) {
      setCurrentStep('keys')
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
  }, [open, isConnected, isAuthenticated, hasKeys, onOpenChange, onComplete])

  // Clear errors when step changes
  useEffect(() => {
    setStepError(null)
  }, [currentStep])

  // Auto-open wallet picker when modal opens and not connected
  useEffect(() => {
    if (open && !isConnected && currentStep === 'connect') {
      // Small delay to let modal render first
      const timer = setTimeout(() => {
        setAwaitingConnection(true)
        openAppKit()
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [open, isConnected, currentStep, openAppKit])

  // Handle connect wallet
  const handleConnect = useCallback(() => {
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

  // Get current step action
  const getCurrentAction = () => {
    switch (currentStep) {
      case 'connect':
        return handleConnect
      case 'siwe':
        return handleSignIn
      case 'keys':
        return handleDeriveKeys
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
        return 'Unlock Keys'
    }
  }

  const isLoading = isAuthenticating || isDerivingKeys
  const currentStepConfig = steps.find((s) => s.id === currentStep)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="border-border bg-card text-card-foreground backdrop-blur-xl sm:max-w-md dark:border-white/10 dark:bg-slate-900/95"
        showCloseButton={false}
      >
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
        <div className="flex items-center justify-between py-4">
          {steps.map((step, index) => {
            const status = getStepStatus(step.id)
            const isLast = index === steps.length - 1

            return (
              <div key={step.id} className="flex flex-1 items-center">
                {/* Step circle */}
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all',
                    status === 'complete' && 'border-primary bg-primary text-primary-foreground',
                    status === 'active' && 'border-primary bg-primary/20 text-primary',
                    status === 'error' && 'border-destructive bg-destructive/20 text-destructive',
                    status === 'pending' && 'border-border bg-muted/50 text-muted-foreground'
                  )}
                >
                  {status === 'complete' ? (
                    <Check className="h-4 w-4" />
                  ) : status === 'active' && (isAuthenticating || isDerivingKeys) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : status === 'error' ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-medium">{index + 1}</span>
                  )}
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div
                    className={cn(
                      'mx-2 h-0.5 flex-1 transition-colors',
                      status === 'complete' ? 'bg-primary' : 'bg-border'
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Step labels */}
        <div className="flex justify-between text-xs">
          {steps.map((step) => {
            const status = getStepStatus(step.id)
            return (
              <div
                key={step.id}
                className={cn(
                  'flex-1 text-center transition-colors',
                  status === 'complete' && 'text-primary',
                  status === 'active' && 'text-foreground',
                  status === 'error' && 'text-destructive',
                  status === 'pending' && 'text-muted-foreground'
                )}
              >
                {step.title}
              </div>
            )
          })}
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
              {(currentStep === 'siwe' || currentStep === 'keys') && !stepError && (
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
              Your wallet is connected and your stealth keys are ready.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
