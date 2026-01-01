'use client'

/**
 * Privacy indicator component for fog wallets.
 *
 * Displays privacy level based on time correlation and shows warnings.
 */

import { useState } from 'react'
import { Shield, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PrivacyLevel } from '@/types/fog'
import { formatTimeSinceFunding } from '@/lib/fog-privacy'

// ============================================================
// Types
// ============================================================

interface PrivacyIndicatorProps {
  /** Privacy level */
  level: PrivacyLevel
  /** Timestamp when funded (null if unfunded) */
  fundedAt?: number | null
  /** Privacy warnings to display */
  warnings?: string[]
  /** Whether to show expanded details */
  showDetails?: boolean
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Additional class names */
  className?: string
}

// ============================================================
// Styles
// ============================================================

const levelStyles: Record<PrivacyLevel, { bg: string; text: string; icon: string }> = {
  low: {
    bg: 'bg-red-500/10',
    text: 'text-red-500',
    icon: 'text-red-500',
  },
  medium: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-500',
    icon: 'text-yellow-500',
  },
  high: {
    bg: 'bg-green-500/10',
    text: 'text-green-500',
    icon: 'text-green-500',
  },
}

const levelLabels: Record<PrivacyLevel, string> = {
  low: 'Low Privacy',
  medium: 'Medium Privacy',
  high: 'High Privacy',
}

const levelDescriptions: Record<PrivacyLevel, string> = {
  low: 'Recently funded - timing may link sender',
  medium: 'Funded within 7 days - moderate protection',
  high: 'Funded over 7 days ago - strong protection',
}

// ============================================================
// Component
// ============================================================

export function PrivacyIndicator({
  level,
  fundedAt,
  warnings = [],
  showDetails = false,
  size = 'md',
  className,
}: PrivacyIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const styles = levelStyles[level]
  const hasWarnings = warnings.length > 0

  const sizeClasses = {
    sm: 'text-xs gap-1 px-2 py-0.5',
    md: 'text-sm gap-1.5 px-2.5 py-1',
    lg: 'text-base gap-2 px-3 py-1.5',
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  const Icon = level === 'high' ? Shield : Clock

  return (
    <div className={cn('inline-flex flex-col', className)}>
      {/* Badge */}
      <button
        type="button"
        onClick={() => hasWarnings && setIsExpanded(!isExpanded)}
        disabled={!hasWarnings && !showDetails}
        className={cn(
          'inline-flex items-center rounded-full font-medium transition-colors',
          styles.bg,
          styles.text,
          sizeClasses[size],
          hasWarnings && 'cursor-pointer hover:opacity-80'
        )}
      >
        <Icon className={cn(iconSizes[size], styles.icon)} aria-hidden="true" />
        <span>{levelLabels[level]}</span>
        {hasWarnings && (
          <>
            <AlertTriangle className={cn(iconSizes[size], 'text-yellow-500')} aria-hidden="true" />
            {isExpanded ? (
              <ChevronUp className={cn(iconSizes[size])} aria-hidden="true" />
            ) : (
              <ChevronDown className={cn(iconSizes[size])} aria-hidden="true" />
            )}
          </>
        )}
      </button>

      {/* Details (always shown or on expand) */}
      {(showDetails || isExpanded) && (
        <div className="mt-2 space-y-1">
          {/* Time info */}
          {fundedAt !== undefined && (
            <p className="text-muted-foreground text-xs">
              {fundedAt ? `Funded ${formatTimeSinceFunding(fundedAt)}` : 'Not funded yet'}
            </p>
          )}

          {/* Level description */}
          <p className="text-muted-foreground text-xs">{levelDescriptions[level]}</p>

          {/* Warnings */}
          {warnings.length > 0 && (
            <ul className="mt-2 space-y-1">
              {warnings.map((warning, index) => (
                <li key={index} className="flex items-start gap-1.5 text-xs text-yellow-500">
                  <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" aria-hidden="true" />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Compact Badge Variant
// ============================================================

interface PrivacyBadgeProps {
  level: PrivacyLevel
  className?: string
}

/**
 * Simple privacy badge without expandable details.
 */
export function PrivacyBadge({ level, className }: PrivacyBadgeProps) {
  const styles = levelStyles[level]
  const Icon = level === 'high' ? Shield : Clock

  return (
    <Badge
      variant="outline"
      className={cn('gap-1 font-normal', styles.bg, styles.text, 'border-transparent', className)}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {levelLabels[level]}
    </Badge>
  )
}

// ============================================================
// Recipient Type Indicator
// ============================================================

interface RecipientTypeIndicatorProps {
  isStealthRecipient: boolean
  className?: string
}

/**
 * Indicator showing whether recipient is stealth (full privacy) or EOA (partial).
 */
export function RecipientTypeIndicator({
  isStealthRecipient,
  className,
}: RecipientTypeIndicatorProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-normal',
        isStealthRecipient
          ? 'border-green-500/30 bg-green-500/10 text-green-500'
          : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-500',
        className
      )}
    >
      {isStealthRecipient ? (
        <>
          <Shield className="h-3 w-3" aria-hidden="true" />
          Full Privacy
        </>
      ) : (
        <>
          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
          Partial Privacy
        </>
      )}
    </Badge>
  )
}
