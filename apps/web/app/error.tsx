'use client'

/**
 * Route-level error boundary.
 *
 * Catches render/runtime errors thrown anywhere below the root layout so a
 * single throw degrades gracefully instead of white-screening the whole app.
 * The root layout (including the ocean gradient background) stays mounted.
 */

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/glass-card'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[App error boundary]', error)
  }, [error])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <GlassCard className="w-full max-w-md">
        <GlassCardHeader className="items-center text-center">
          <div className="bg-destructive/10 mb-2 flex size-12 items-center justify-center rounded-full">
            <AlertTriangle className="text-destructive size-6" />
          </div>
          <GlassCardTitle>Something went wrong</GlassCardTitle>
          <GlassCardDescription>
            {error.message || 'An unexpected error occurred. Please try again.'}
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent className="flex justify-center">
          <Button onClick={() => reset()}>Try again</Button>
        </GlassCardContent>
      </GlassCard>
    </main>
  )
}
