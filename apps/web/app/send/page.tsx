'use client'

/**
 * Send Privately page - Fog Mode for private payments.
 *
 * Features:
 * - Create and manage fog wallets with multi-hop privacy
 * - Add hops to break transaction graph correlation (ESSENTIAL)
 * - Pay from intermediate wallets (hop >= 1) for privacy
 * - Privacy indicators based on hop depth and funding source
 */

import { useState, useMemo } from 'react'
import {
  Plus,
  Wallet,
  Shield,
  Layers,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react'
import { formatEther } from 'viem'
import { AppShell, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  FogWalletCard,
  CreateFogModal,
  FogPaymentModal,
  AddHopModal,
  ScheduledPaymentsList,
} from '@/components/fog'
import { useFogContext } from '@/contexts/fog-context'
import type { FogWallet } from '@/types/fog'

// ============================================================
// Stats Card Component
// ============================================================

interface StatsCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  subtext?: string
  className?: string
}

function StatsCard({ icon, label, value, subtext, className }: StatsCardProps) {
  return (
    <Card className={className}>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">{label}</p>
          <p className="text-foreground text-xl font-bold">{value}</p>
          {subtext && <p className="text-muted-foreground truncate text-xs">{subtext}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// How It Works Section (Multi-hop focused)
// ============================================================

function HowItWorks() {
  const steps = [
    {
      icon: <Wallet className="h-5 w-5" />,
      title: '1. Create Entry Wallet',
      description: 'Generate a stealth address for receiving funds.',
    },
    {
      icon: <ArrowRight className="h-5 w-5" />,
      title: '2. Fund from Any Source',
      description: 'Send MNT from an exchange, friend, or any wallet.',
    },
    {
      icon: <Layers className="h-5 w-5" />,
      title: '3. Add a Hop',
      description: 'Transfer to an intermediate wallet to break the link.',
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: '4. Pay Privately',
      description: 'Send from intermediate wallet for privacy.',
    },
  ]

  return (
    <Card className="border-dashed">
      <CardContent className="py-8">
        <div className="text-center">
          <div className="bg-primary/10 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
            <Sparkles className="text-primary h-6 w-6" />
          </div>
          <h3 className="text-foreground mt-4 text-lg font-semibold">How Fog Mode Works</h3>
          <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
            Fog wallets use multi-hop transfers to break the link between funding and payments. Each
            hop adds a layer of privacy.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              <div className="bg-muted text-muted-foreground mx-auto flex h-10 w-10 items-center justify-center rounded-full">
                {step.icon}
              </div>
              <h4 className="text-foreground mt-3 text-sm font-medium">{step.title}</h4>
              <p className="text-muted-foreground mt-1 text-xs">{step.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Empty State
// ============================================================

interface EmptyStateProps {
  onCreateClick: () => void
}

function EmptyState({ onCreateClick }: EmptyStateProps) {
  return (
    <div className="space-y-6">
      <HowItWorks />
      <div className="text-center">
        <Button onClick={onCreateClick} size="lg" className="gap-2">
          <Plus className="h-4 w-4" />
          Create Your First Fog Wallet
        </Button>
      </div>
    </div>
  )
}

// ============================================================
// Main Page Component
// ============================================================

export default function SendPage() {
  const { fogWallets, isLoading, refreshBalances } = useFogContext()

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [paymentWallet, setPaymentWallet] = useState<FogWallet | null>(null)
  const [addHopWallet, setAddHopWallet] = useState<FogWallet | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filter states
  const [showUnfunded, setShowUnfunded] = useState(true)

  // Computed stats - now based on hop depth (ESSENTIAL for privacy)
  const stats = useMemo(() => {
    const funded = fogWallets.filter((w) => w.status === 'funded')
    const totalBalance = funded.reduce((sum, w) => sum + w.balance, 0n)

    // Ready wallets have hop >= 1 (multi-hop achieved)
    const readyWallets = funded.filter((w) => w.hopDepth >= 1)
    // Entry wallets need a hop added
    const entryWallets = funded.filter((w) => w.hopDepth === 0)

    return {
      totalBalance,
      totalFormatted: formatEther(totalBalance),
      fundedCount: funded.length,
      totalCount: fogWallets.length,
      readyCount: readyWallets.length,
      entryCount: entryWallets.length,
    }
  }, [fogWallets])

  // Filter wallets
  const displayedWallets = useMemo(() => {
    if (showUnfunded) return fogWallets
    return fogWallets.filter((w) => w.status !== 'unfunded')
  }, [fogWallets, showUnfunded])

  // Handlers
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshBalances()
    } finally {
      setIsRefreshing(false)
    }
  }

  const handlePayClick = (wallet: FogWallet) => {
    setPaymentWallet(wallet)
  }

  const handleAddHopClick = (wallet: FogWallet) => {
    setAddHopWallet(wallet)
  }

  // Don't show content until we know if there's a session
  if (isLoading) {
    return (
      <AppShell requireAuth requireKeys>
        <PageHeader title="Send Privately" description="Private payments using Fog Mode" />
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell requireAuth requireKeys>
      <PageHeader title="Send Privately" description="Private payments using Fog Mode" />

      {/* Empty state */}
      {fogWallets.length === 0 ? (
        <EmptyState onCreateClick={() => setShowCreateModal(true)} />
      ) : (
        <div className="space-y-6">
          {/* Stats Row - Updated for multi-hop model */}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatsCard
              icon={<Wallet className="h-5 w-5" />}
              label="Total in Fog"
              value={`${Number(stats.totalFormatted).toFixed(4)} MNT`}
              subtext={`${stats.fundedCount} funded wallet${stats.fundedCount !== 1 ? 's' : ''}`}
            />
            <StatsCard
              icon={<Layers className="h-5 w-5" />}
              label="Ready to Pay"
              value={stats.readyCount}
              subtext={stats.readyCount > 0 ? 'Multi-hop wallets' : 'Add hops to entry wallets'}
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <StatsCard
                      icon={<HelpCircle className="h-5 w-5" />}
                      label="Privacy Tip"
                      value="Hops = Privacy"
                      subtext={
                        stats.entryCount > 0
                          ? `${stats.entryCount} wallet${stats.entryCount !== 1 ? 's' : ''} need hops`
                          : 'All wallets ready'
                      }
                      className="cursor-help"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium">Multi-hop Privacy</p>
                  <p className="mt-1 text-xs">
                    Each hop breaks the link between funding and payment. Entry wallets (yellow)
                    need at least one hop before paying. Green wallets are ready for private
                    payments.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Actions Row */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Entry Wallet
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUnfunded(!showUnfunded)}
                className="gap-2"
              >
                {showUnfunded ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    Hide Unfunded
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Show Unfunded
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Scheduled Payments - show if any exist */}
          <ScheduledPaymentsList />

          {/* Wallet Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayedWallets.map((wallet) => (
              <FogWalletCard
                key={wallet.fogIndex}
                wallet={wallet}
                onPay={() => handlePayClick(wallet)}
                onAddHop={() => handleAddHopClick(wallet)}
              />
            ))}
          </div>

          {/* How it works (collapsed) */}
          <details className="group">
            <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-2 text-sm transition-colors">
              <HelpCircle className="h-4 w-4" />
              How does Fog Mode work?
            </summary>
            <div className="mt-4">
              <HowItWorks />
            </div>
          </details>
        </div>
      )}

      {/* Create Modal */}
      <CreateFogModal open={showCreateModal} onOpenChange={setShowCreateModal} />

      {/* Payment Modal */}
      {paymentWallet && (
        <FogPaymentModal
          open={!!paymentWallet}
          onOpenChange={(open) => !open && setPaymentWallet(null)}
          fogIndex={paymentWallet.fogIndex}
        />
      )}

      {/* Add Hop Modal */}
      {addHopWallet && (
        <AddHopModal
          open={!!addHopWallet}
          onOpenChange={(open) => !open && setAddHopWallet(null)}
          sourceFogIndex={addHopWallet.fogIndex}
        />
      )}
    </AppShell>
  )
}
