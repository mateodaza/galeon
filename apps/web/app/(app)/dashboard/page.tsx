'use client'

/**
 * Main dashboard page.
 *
 * Uses dynamic import to avoid SSR BigInt issues with pool/collection dependencies.
 */

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { AppShell, PageHeader } from '@/components/layout'

// Dynamic import with ssr: false to avoid BigInt issues during SSR
const DashboardContent = dynamic(() => import('./dashboard-content'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="text-primary h-8 w-8 animate-spin" />
    </div>
  ),
})

export default function DashboardPage() {
  return (
    <AppShell requireAuth>
      <PageHeader title="Dashboard" />
      <DashboardContent />
    </AppShell>
  )
}
