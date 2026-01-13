'use client'

/**
 * Pay page - unified payment interface.
 *
 * Uses dynamic import to avoid SSR BigInt issues with zk-kit dependencies.
 */

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { AppShell, PageHeader } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'

// Dynamic import with ssr: false to avoid BigInt issues during SSR
const PayContent = dynamic(() => import('./pay-content'), {
  ssr: false,
  loading: () => (
    <AppShell>
      <PageHeader title="Pay" description="Choose your privacy level for sending payments." />

      {/* Mode Selector Skeleton - matches pay-content layout */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex animate-pulse flex-col gap-2 rounded-xl border border-slate-200/60 bg-white/50 p-4 dark:border-white/10 dark:bg-slate-900/50"
          >
            <div className="flex items-center gap-3">
              <div className="bg-muted h-9 w-9 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <div className="bg-muted h-4 w-20 rounded" />
                <div className="bg-muted h-3 w-16 rounded" />
              </div>
            </div>
            <div className="bg-muted h-3 w-28 rounded" />
          </div>
        ))}
      </div>

      {/* Content Card Skeleton */}
      <Card variant="glass" className="mt-6">
        <CardContent className="py-8">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            <p className="text-muted-foreground text-sm">Loading payment options...</p>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  ),
})

export default function PayPage() {
  return <PayContent />
}
