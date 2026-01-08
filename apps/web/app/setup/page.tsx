'use client'

/**
 * Onboarding page for new users.
 *
 * Uses SignInModal for the complete authentication flow:
 * 1. Connect wallet
 * 2. SIWE authentication
 * 3. Stealth key derivation
 */

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'
import * as m from 'motion/react-m'
import { useReducedMotion } from 'motion/react'
import { AppShell } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SignInModal } from '@/components/sign-in-modal'
import { useSignIn } from '@/hooks/use-sign-in'
import { useStealthContext } from '@/contexts/stealth-context'
import { cn } from '@/lib/utils'

export default function SetupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isConnected, isAuthenticated, hasKeys, isFullySignedIn, isLoading } = useSignIn()
  const { metaAddress } = useStealthContext()
  const prefersReducedMotion = useReducedMotion()
  const [showModal, setShowModal] = useState(false)

  // Get callback URL from query params (for redirect after setup)
  const callbackUrl = searchParams.get('callback') || '/dashboard'

  // Determine current step for progress indicator
  const currentStep = !isConnected
    ? 'connect'
    : !isAuthenticated
      ? 'siwe'
      : !hasKeys
        ? 'keys'
        : 'ready'

  // Auto-show modal when not fully signed in (after initial load)
  useEffect(() => {
    if (!isLoading && !isFullySignedIn) {
      setShowModal(true)
    }
  }, [isLoading, isFullySignedIn])

  // Animation props - disabled when user prefers reduced motion
  const fadeInUp = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4 },
      }

  const scaleTransition = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 0.3 },
      }

  const springScale = prefersReducedMotion
    ? {}
    : {
        initial: { scale: 0 },
        animate: { scale: 1 },
        transition: { type: 'spring' as const, stiffness: 200, damping: 15 },
      }

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <AppShell maxWidth="lg" className="items-center justify-center">
        <div className="flex flex-1 flex-col items-center justify-center">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
          <p className="text-muted-foreground mt-4">Loading...</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell maxWidth="lg" className="items-center justify-center">
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <m.div {...fadeInUp} className="w-full max-w-lg">
          {/* Progress indicator - only shown after completion */}
          {isFullySignedIn && (
            <div className="mb-8 flex items-center justify-center gap-2">
              <Step
                number={1}
                label="Connect"
                active={currentStep === 'connect'}
                completed={isConnected}
                reduceMotion={!!prefersReducedMotion}
              />
              <div className="bg-border h-px w-8" />
              <Step
                number={2}
                label="Sign In"
                active={currentStep === 'siwe'}
                completed={isAuthenticated}
                reduceMotion={!!prefersReducedMotion}
              />
              <div className="bg-border h-px w-8" />
              <Step
                number={3}
                label="Unlock Keys"
                active={currentStep === 'keys'}
                completed={hasKeys}
                reduceMotion={!!prefersReducedMotion}
              />
            </div>
          )}

          {/* Card */}
          <Card>
            <CardContent className="p-8">
              {!isFullySignedIn ? (
                // Not fully signed in - show prompt to open modal
                <div className="text-center">
                  <h1 className="text-foreground text-2xl font-bold">Welcome to Galeon</h1>
                  <p className="text-muted-foreground mt-2">
                    Connect your wallet and sign in to get started with private payments.
                  </p>
                  <Button onClick={() => setShowModal(true)} size="lg" className="mt-6 w-full">
                    Get Started
                  </Button>
                </div>
              ) : (
                // Fully signed in - show success
                <m.div {...scaleTransition}>
                  <div className="flex items-center gap-3">
                    <m.div
                      {...springScale}
                      className="bg-accent text-primary flex h-12 w-12 items-center justify-center rounded-full"
                    >
                      <Check className="h-6 w-6" />
                    </m.div>
                    <div>
                      <h1 className="text-foreground text-2xl font-bold">You&apos;re Ready!</h1>
                      <p className="text-muted-foreground text-sm">
                        Your wallet is connected and keys are unlocked
                      </p>
                    </div>
                  </div>

                  <div className="bg-muted mt-6 rounded-lg p-4">
                    <p className="text-muted-foreground text-xs font-medium">
                      Your Stealth Meta-Address
                    </p>
                    <p className="text-foreground mt-1 font-mono text-xs">
                      {metaAddress && (
                        <>
                          <span className="text-muted-foreground">st:mnt:</span>
                          {metaAddress.slice(7, 17)}...{metaAddress.slice(-8)}
                        </>
                      )}
                    </p>
                  </div>

                  <Button
                    onClick={() => router.push(callbackUrl)}
                    size="lg"
                    className="mt-6 w-full"
                  >
                    {callbackUrl === '/dashboard' ? 'Go to Dashboard' : 'Continue'}
                  </Button>
                </m.div>
              )}
            </CardContent>
          </Card>
        </m.div>
      </div>

      {/* Sign-in modal */}
      <SignInModal
        open={showModal}
        onOpenChange={setShowModal}
        onComplete={() => router.push(callbackUrl)}
      />
    </AppShell>
  )
}

function Step({
  number,
  label,
  active,
  completed,
  reduceMotion,
}: {
  number: number
  label: string
  active: boolean
  completed: boolean
  reduceMotion: boolean
}) {
  const containerAnimation = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { delay: number * 0.1 },
      }

  const pulseAnimation = reduceMotion
    ? {}
    : { animate: active ? { scale: [1, 1.1, 1] } : {}, transition: { duration: 0.3 } }

  return (
    <m.div className="flex flex-col items-center gap-1" {...containerAnimation}>
      <m.div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300',
          completed
            ? 'bg-primary text-primary-foreground'
            : active
              ? 'bg-accent text-primary ring-primary ring-2'
              : 'bg-muted text-muted-foreground'
        )}
        {...pulseAnimation}
      >
        {completed ? <Check className="h-4 w-4" /> : number}
      </m.div>
      <span
        className={cn('text-xs', active || completed ? 'text-foreground' : 'text-muted-foreground')}
      >
        {label}
      </span>
    </m.div>
  )
}
