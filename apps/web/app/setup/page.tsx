'use client'

/**
 * Onboarding page for new users.
 *
 * Guides users through:
 * 1. Connecting their wallet
 * 2. Signing key derivation message
 * 3. Going to dashboard
 */

import { useRouter } from 'next/navigation'
import { useAppKitAccount } from '@reown/appkit/react'
import { Check, Loader2 } from 'lucide-react'
import * as m from 'motion/react-m'
import { AnimatePresence, useReducedMotion } from 'motion/react'
import { ConnectButton } from '@/components/wallet-button'
import { AppShell } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useStealthContext } from '@/contexts/stealth-context'
import { cn } from '@/lib/utils'

export default function SetupPage() {
  const router = useRouter()
  const { isConnected, address } = useAppKitAccount()
  const { hasKeys, metaAddress, isDerivingKeys, error, deriveKeys } = useStealthContext()
  const prefersReducedMotion = useReducedMotion()

  // Determine current step
  const currentStep = !isConnected ? 'connect' : !hasKeys ? 'unlock' : 'ready'

  // Animation props - disabled when user prefers reduced motion
  const fadeInUp = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4 },
      }

  const slideTransition = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, x: -20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 20 },
        transition: { duration: 0.3 },
      }

  const scaleTransition = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 },
        transition: { duration: 0.3 },
      }

  const springScale = prefersReducedMotion
    ? {}
    : {
        initial: { scale: 0 },
        animate: { scale: 1 },
        transition: { type: 'spring' as const, stiffness: 200, damping: 15 },
      }

  const handleDeriveKeys = async () => {
    try {
      await deriveKeys()
    } catch {
      // Error is handled in context
    }
  }

  return (
    <AppShell showNav={false} maxWidth="lg" className="items-center justify-center">
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <m.div {...fadeInUp} className="w-full max-w-lg">
          {/* Progress indicator */}
          <div className="mb-8 flex items-center justify-center gap-2">
            <Step
              number={1}
              label="Connect"
              active={currentStep === 'connect'}
              completed={currentStep !== 'connect'}
              reduceMotion={!!prefersReducedMotion}
            />
            <div className="bg-border h-px w-8" />
            <Step
              number={2}
              label="Unlock Keys"
              active={currentStep === 'unlock'}
              completed={currentStep === 'ready'}
              reduceMotion={!!prefersReducedMotion}
            />
            <div className="bg-border h-px w-8" />
            <Step
              number={3}
              label="Dashboard"
              active={currentStep === 'ready'}
              completed={false}
              reduceMotion={!!prefersReducedMotion}
            />
          </div>

          {/* Card */}
          <Card>
            <CardContent className="p-8">
              <AnimatePresence mode="wait">
                {currentStep === 'connect' && (
                  <m.div key="connect" {...slideTransition}>
                    <h1 className="text-foreground text-2xl font-bold">Welcome to Galeon</h1>
                    <p className="text-muted-foreground mt-2">
                      Connect your wallet to get started with private payments.
                    </p>
                    <div className="mt-6">
                      <ConnectButton className="w-full" />
                    </div>
                  </m.div>
                )}

                {currentStep === 'unlock' && (
                  <m.div key="unlock" {...slideTransition}>
                    <h1 className="text-foreground text-2xl font-bold">Unlock Your Keys</h1>
                    <p className="text-muted-foreground mt-2">
                      Sign a message to derive your stealth keys. This signature stays local and
                      does NOT authorize any transactions.
                    </p>
                    <p className="text-muted-foreground mt-4 text-sm">
                      Connected as: {address?.slice(0, 6)}...{address?.slice(-4)}
                    </p>

                    {error && (
                      <m.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-destructive/10 text-destructive mt-4 rounded-lg p-3 text-sm"
                      >
                        {error}
                      </m.div>
                    )}

                    <Button
                      onClick={handleDeriveKeys}
                      disabled={isDerivingKeys}
                      size="lg"
                      className="mt-6 w-full"
                    >
                      {isDerivingKeys ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Waiting for signature...
                        </>
                      ) : (
                        'Sign & Unlock Keys'
                      )}
                    </Button>
                  </m.div>
                )}

                {currentStep === 'ready' && (
                  <m.div key="ready" {...scaleTransition}>
                    <div className="flex items-center gap-3">
                      <m.div
                        {...springScale}
                        className="bg-accent text-primary flex h-12 w-12 items-center justify-center rounded-full"
                      >
                        <Check className="h-6 w-6" />
                      </m.div>
                      <div>
                        <h1 className="text-foreground text-2xl font-bold">Keys Unlocked!</h1>
                        <p className="text-muted-foreground text-sm">
                          Your stealth keys are ready to use
                        </p>
                      </div>
                    </div>

                    <div className="bg-muted mt-6 rounded-lg p-4">
                      <p className="text-muted-foreground text-xs font-medium">
                        Your Stealth Meta-Address
                      </p>
                      <p className="text-foreground mt-1 break-all font-mono text-xs">
                        {metaAddress?.slice(0, 50)}...
                      </p>
                    </div>

                    <Button
                      onClick={() => router.push('/dashboard')}
                      size="lg"
                      className="mt-6 w-full"
                    >
                      Go to Dashboard
                    </Button>
                  </m.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </m.div>
      </div>
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
