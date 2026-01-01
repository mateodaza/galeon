'use client'

/**
 * FogWalletCard component for displaying a fog wallet.
 *
 * Features:
 * - Hop-aware actions (Add Hop vs Pay)
 * - Visual pipeline indicator (Entry → Ready)
 * - Privacy level based on hop depth
 * - Funding source indicator
 * - Collapsible stealth address
 */

import { useState, useCallback } from 'react'
import {
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Send,
  Wallet,
  ArrowRight,
  Layers,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import * as m from 'motion/react-m'
import { useReducedMotion } from 'motion/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PrivacyBadge } from '@/components/fog/privacy-indicator'
import { cn } from '@/lib/utils'
import { formatTimeSinceFunding, getTimingStatus, getTimingRecommendation } from '@/lib/fog-privacy'
import type { FogWallet } from '@/types/fog'

// ============================================================
// Types
// ============================================================

interface FogWalletCardProps {
  wallet: FogWallet
  /** Whether this wallet is selected for payment */
  isSelected?: boolean
  /** Callback when card is clicked (select for payment) */
  onSelect?: () => void
  /** Callback when "Pay" button is clicked */
  onPay?: () => void
  /** Callback when "Add Hop" button is clicked */
  onAddHop?: () => void
  /** Show compact view */
  compact?: boolean
  className?: string
}

// ============================================================
// Hop Indicator Component
// ============================================================

function HopIndicator({ hopDepth }: { hopDepth: number }) {
  const isEntry = hopDepth === 0
  const isReady = hopDepth >= 1

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
        isEntry && 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
        isReady && 'bg-green-500/10 text-green-600 dark:text-green-400'
      )}
    >
      {isEntry ? (
        <>
          <Wallet className="h-3 w-3" />
          Entry
        </>
      ) : (
        <>
          <Layers className="h-3 w-3" />
          Hop {hopDepth}
        </>
      )}
    </div>
  )
}

// ============================================================
// Component
// ============================================================

export function FogWalletCard({
  wallet,
  isSelected = false,
  onSelect,
  onPay,
  onAddHop,
  compact = false,
  className,
}: FogWalletCardProps) {
  const [copied, setCopied] = useState(false)
  const [showAddress, setShowAddress] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  // Animation props
  const hoverLift = prefersReducedMotion
    ? {}
    : { whileHover: { y: -4 }, transition: { duration: 0.2 } }
  const expandAnimation = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, height: 0 },
        animate: { opacity: 1, height: 'auto' },
        exit: { opacity: 0, height: 0 },
        transition: { duration: 0.2 },
      }

  const copyAddress = useCallback(() => {
    navigator.clipboard.writeText(wallet.stealthAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [wallet.stealthAddress])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onSelect && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onSelect()
    }
  }

  // Determine wallet type and recommended action
  const isEntryWallet = wallet.hopDepth === 0
  const isReadyToPay = wallet.hopDepth >= 1
  const canAddHop = wallet.status === 'funded' && wallet.balance > 0n
  const canPay = wallet.status === 'funded' && wallet.balance > 0n

  // Status styling - entry wallets have yellow border, ready wallets have green
  const getCardBorderClass = () => {
    if (wallet.status === 'unfunded') return 'border-muted'
    if (wallet.status === 'spent') return 'border-muted-foreground/30'
    if (isReadyToPay) return 'border-green-500/30'
    return 'border-yellow-500/30'
  }

  // Funding source display
  const fundingSourceLabel = wallet.fundingSource === 'external' ? 'External' : 'Self-funded'

  if (compact) {
    return (
      <m.div
        {...hoverLift}
        className={className}
        onClick={onSelect}
        onKeyDown={handleKeyDown}
        role={onSelect ? 'button' : undefined}
        tabIndex={onSelect ? 0 : undefined}
      >
        <Card
          className={cn(
            'transition-colors',
            getCardBorderClass(),
            isSelected && 'ring-primary ring-2',
            onSelect && 'cursor-pointer'
          )}
        >
          <CardContent className="flex items-center justify-between p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <HopIndicator hopDepth={wallet.hopDepth} />
                <span className="text-foreground truncate font-medium">{wallet.name}</span>
              </div>
              <p className="text-muted-foreground mt-1 text-sm">{wallet.balanceFormatted} MNT</p>
            </div>
            <PrivacyBadge level={wallet.privacyLevel} />
          </CardContent>
        </Card>
      </m.div>
    )
  }

  return (
    <m.div
      {...hoverLift}
      className={className}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <Card
        className={cn(
          'transition-colors',
          getCardBorderClass(),
          isSelected && 'ring-primary ring-2',
          onSelect && 'cursor-pointer'
        )}
      >
        <CardContent className="pt-6">
          {/* Header with hop indicator */}
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <HopIndicator hopDepth={wallet.hopDepth} />
                <h3 className="text-foreground truncate font-semibold">{wallet.name}</h3>
              </div>
            </div>
            <PrivacyBadge level={wallet.privacyLevel} />
          </div>

          {/* Balance */}
          <div className="mt-4">
            <p className="text-foreground text-2xl font-bold">{wallet.balanceFormatted} MNT</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {wallet.status === 'unfunded' && (
                <Badge variant="outline" className="text-muted-foreground">
                  Awaiting funds
                </Badge>
              )}
              {wallet.status === 'funded' && wallet.fundingSource && (
                <Badge
                  variant="outline"
                  className={cn(
                    wallet.fundingSource === 'external'
                      ? 'border-green-500/30 text-green-500'
                      : 'border-muted text-muted-foreground'
                  )}
                >
                  {fundingSourceLabel}
                </Badge>
              )}
              {wallet.status === 'spent' && (
                <Badge variant="outline" className="text-muted-foreground">
                  Spent
                </Badge>
              )}
              {/* Show parent wallet if this is an intermediate hop */}
              {wallet.parentFogIndex !== null && (
                <Badge variant="outline" className="text-muted-foreground">
                  From wallet #{wallet.parentFogIndex}
                </Badge>
              )}
            </div>
          </div>

          {/* Funding time */}
          {wallet.fundedAt && (
            <p className="text-muted-foreground mt-2 text-xs">
              Funded {formatTimeSinceFunding(wallet.fundedAt)}
            </p>
          )}

          {/* Entry wallet warning - encourage adding hop */}
          {isEntryWallet && wallet.status === 'funded' && (
            <div className="mt-4 rounded-lg bg-yellow-500/10 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                    Add a hop for privacy
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    Transfer to an intermediate wallet to break the link between funding and
                    payment.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Ready to pay indicator with timing hint */}
          {isReadyToPay &&
            wallet.status === 'funded' &&
            (() => {
              const timingStatus = getTimingStatus(wallet.fundedAt)
              const timingRec = getTimingRecommendation(wallet.fundedAt)
              const hasGoodTiming = timingStatus === 'excellent' || timingStatus === 'maximum'

              return (
                <div
                  className={cn(
                    'mt-4 rounded-lg p-3',
                    hasGoodTiming ? 'bg-green-500/10' : 'bg-blue-500/10'
                  )}
                >
                  <div className="flex items-start gap-2">
                    {hasGoodTiming ? (
                      <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
                    ) : (
                      <Clock className="h-4 w-4 flex-shrink-0 text-blue-500" />
                    )}
                    <div>
                      <p
                        className={cn(
                          'text-sm font-medium',
                          hasGoodTiming
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-blue-600 dark:text-blue-400'
                        )}
                      >
                        {hasGoodTiming
                          ? 'Ready for private payment'
                          : 'Multi-hop ready - wait for best privacy'}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {hasGoodTiming
                          ? `${wallet.hopDepth} hop${wallet.hopDepth > 1 ? 's' : ''} with good timing protection.`
                          : timingRec.message}
                      </p>
                      {!hasGoodTiming && timingRec.waitTimeFormatted && (
                        <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                          Wait ~{timingRec.waitTimeFormatted} for{' '}
                          {timingRec.privacyBoost?.toLowerCase()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}

          {/* Funding address (collapsible) */}
          <div className="mt-4">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowAddress(!showAddress)
              }}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
              aria-expanded={showAddress}
              aria-label={showAddress ? 'Hide funding address' : 'Show funding address'}
            >
              {showAddress ? (
                <ChevronUp className="h-3 w-3" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3 w-3" aria-hidden="true" />
              )}
              {showAddress ? 'Hide' : 'Show'} address
            </button>

            {showAddress && (
              <m.div {...expandAnimation} className="bg-muted mt-2 overflow-hidden rounded-lg p-3">
                <p className="text-muted-foreground break-all font-mono text-xs leading-relaxed">
                  {wallet.stealthAddress}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    copyAddress()
                  }}
                  className="text-primary hover:text-primary/80 mt-2 inline-flex items-center gap-1 text-xs transition-colors"
                  aria-label={copied ? 'Copied address' : 'Copy address'}
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3" aria-hidden="true" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" aria-hidden="true" />
                      Copy address
                    </>
                  )}
                </button>
              </m.div>
            )}
          </div>

          {/* Actions - different based on hop depth */}
          <div className="mt-4 space-y-2">
            {/* Entry wallet: Primary action is Add Hop */}
            {isEntryWallet && canAddHop && onAddHop && (
              <>
                <Button
                  className="w-full gap-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    onAddHop()
                  }}
                >
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  Add Hop for Privacy
                </Button>
                {/* Secondary: Allow paying but with warning */}
                {onPay && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full gap-2 text-yellow-600 hover:text-yellow-500 dark:text-yellow-400"
                    onClick={(e) => {
                      e.stopPropagation()
                      onPay()
                    }}
                  >
                    <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                    Pay without hop (low privacy)
                  </Button>
                )}
              </>
            )}

            {/* Intermediate wallet: Primary action is Pay */}
            {isReadyToPay && canPay && onPay && (
              <>
                <Button
                  className="w-full gap-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    onPay()
                  }}
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Pay from this wallet
                </Button>
                {/* Secondary: Add another hop */}
                {onAddHop && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      onAddHop()
                    }}
                  >
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    Add another hop
                  </Button>
                )}
              </>
            )}

            {/* Unfunded wallet: Copy address to fund */}
            {wallet.status === 'unfunded' && (
              <Button
                variant="secondary"
                className="w-full gap-2"
                onClick={(e) => {
                  e.stopPropagation()
                  copyAddress()
                }}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    Copy address to fund
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </m.div>
  )
}
