'use client'

/**
 * Per-port collection page.
 *
 * Uses dynamic import to avoid SSR BigInt issues with zk-kit dependencies.
 */

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { AppShell } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'

// Dynamic import with ssr: false to avoid BigInt issues during SSR
const CollectPortContent = dynamic(() => import('./collect-port-content'), {
  ssr: false,
  loading: () => (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  ),
})

export default function CollectPortPage() {
  return <CollectPortContent />
}
