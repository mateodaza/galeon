'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { FloatingNav, dashboardNav } from './floating-nav'
import { useSignIn } from '@/hooks/use-sign-in'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: React.ReactNode
  /**
   * Whether authentication is required.
   * @default false
   */
  requireAuth?: boolean
  /**
   * Whether stealth keys are required.
   * @default false
   */
  requireKeys?: boolean
  /**
   * Maximum width of the content area.
   * @default '6xl'
   */
  maxWidth?: 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full'
  /**
   * Additional className for the main content area.
   */
  className?: string
}

const maxWidthMap = {
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
}

/**
 * Main application shell with header, optional auth checks, and content area.
 */
export function AppShell({
  children,
  requireAuth = false,
  requireKeys = false,
  maxWidth = '6xl',
  className,
}: AppShellProps) {
  const router = useRouter()
  const { isConnected, hasKeys, isLoading } = useSignIn()

  // Redirect if auth/keys required but not available (only after loading completes)
  useEffect(() => {
    if (isLoading) return // Wait for session restoration

    if (requireAuth && !isConnected) {
      router.push('/setup')
    } else if (requireKeys && !hasKeys) {
      router.push('/setup')
    }
  }, [requireAuth, requireKeys, isConnected, hasKeys, isLoading, router])

  // Show loading state while restoring session or checking auth
  if (isLoading || (requireAuth && !isConnected) || (requireKeys && !hasKeys)) {
    return (
      <main className="bg-background flex min-h-screen flex-col items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <p className="text-muted-foreground mt-4">{isLoading ? 'Loading...' : 'Redirecting...'}</p>
      </main>
    )
  }

  return (
    <main className="bg-background flex min-h-screen flex-col">
      <FloatingNav nav={dashboardNav} variant="light" />
      <div className="flex-1 px-6 pb-8 pt-28">
        <div className={cn('mx-auto', maxWidthMap[maxWidth], className)}>{children}</div>
      </div>
    </main>
  )
}
