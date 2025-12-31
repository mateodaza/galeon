'use client'

/**
 * Auth guard component for protected routes.
 *
 * Ensures users are fully authenticated (wallet + SIWE + stealth keys)
 * before accessing protected content. Shows sign-in modal if not authenticated.
 */

import { type ReactNode, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { useSignIn } from '@/hooks/use-sign-in'
import { SignInModal } from '@/components/sign-in-modal'
import { Button } from '@/components/ui/button'

interface AuthGuardProps {
  children: ReactNode
  /** Redirect path when not authenticated (default: /) */
  redirectTo?: string
  /** Show sign-in UI instead of redirecting */
  showSignIn?: boolean
  /** Loading component to show while checking auth */
  loadingComponent?: ReactNode
}

/**
 * Skeleton component for loading states.
 */
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-muted animate-pulse rounded ${className}`} />
}

/**
 * Dashboard-style skeleton loading state.
 * Shows a realistic placeholder for the dashboard layout.
 */
function DashboardSkeleton() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header skeleton */}
      <header className="border-border flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-6">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-5 w-20" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-16 rounded-lg" />
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-9 w-36 rounded-full" />
      </header>

      {/* Content skeleton */}
      <main className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-5xl space-y-8">
          {/* Title area */}
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>

          {/* Stats cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card rounded-xl border p-6">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="mt-2 h-8 w-24" />
                <Skeleton className="mt-1 h-3 w-16" />
              </div>
            ))}
          </div>

          {/* Main content area */}
          <div className="bg-card rounded-xl border p-6">
            <Skeleton className="h-6 w-32" />
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-20 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

/**
 * Sign-in prompt UI - triggers the SignInModal
 */
function SignInPrompt() {
  const [showModal, setShowModal] = useState(true)

  return (
    <>
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 px-4">
        <div className="text-center">
          <h2 className="text-foreground text-2xl font-bold">Sign in required</h2>
          <p className="text-muted-foreground mt-2">
            Please sign in with your wallet to access this page.
          </p>
        </div>

        <Button onClick={() => setShowModal(true)} size="lg">
          Sign in with wallet
        </Button>

        <p className="text-muted-foreground max-w-sm text-center text-sm">
          You&apos;ll be asked to sign two messages: one to authenticate with our servers, and one
          to unlock your stealth keys.
        </p>
      </div>

      <SignInModal open={showModal} onOpenChange={setShowModal} />
    </>
  )
}

/**
 * Auth guard that protects routes requiring full authentication.
 *
 * Full authentication means:
 * 1. Wallet connected
 * 2. SIWE authenticated with backend
 * 3. Stealth keys derived
 *
 * @example
 * ```tsx
 * // In a protected page
 * export default function DashboardPage() {
 *   return (
 *     <AuthGuard>
 *       <Dashboard />
 *     </AuthGuard>
 *   )
 * }
 * ```
 */
export function AuthGuard({
  children,
  redirectTo = '/',
  showSignIn = true,
  loadingComponent,
}: AuthGuardProps) {
  const router = useRouter()
  const { isConnected } = useAccount()
  const { isFullySignedIn, isLoading } = useSignIn()

  // Still loading/restoring sessions
  if (isLoading) {
    return <>{loadingComponent || <DashboardSkeleton />}</>
  }

  // Not connected - redirect to home
  if (!isConnected) {
    if (typeof window !== 'undefined') {
      router.replace(redirectTo)
    }
    return <>{loadingComponent || <DashboardSkeleton />}</>
  }

  // Connected but not fully signed in
  if (!isFullySignedIn) {
    if (showSignIn) {
      return <SignInPrompt />
    }

    // Redirect mode
    if (typeof window !== 'undefined') {
      router.replace(redirectTo)
    }
    return <>{loadingComponent || <DashboardSkeleton />}</>
  }

  // Fully authenticated - render children
  return <>{children}</>
}
