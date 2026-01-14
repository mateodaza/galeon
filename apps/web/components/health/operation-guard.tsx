'use client'

/**
 * Operation Guard
 *
 * Wraps interactive elements to disable them when the required
 * operation is unavailable due to sync issues.
 */

import { type ReactNode, type ReactElement, cloneElement, isValidElement } from 'react'
import { useOperationAvailable } from '@/contexts/health-context'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

type Operation = 'quickPay' | 'stealthPay' | 'privateSend'

interface OperationGuardProps {
  /** The operation required for the child element */
  operation: Operation
  /** The child element to guard (typically a button) */
  children: ReactNode
  /** Custom message to show when operation unavailable */
  unavailableMessage?: string
  /** Whether to show tooltip with blockers (default: true) */
  showTooltip?: boolean
  /** Custom class when disabled */
  disabledClassName?: string
}

/**
 * Get human-readable operation name
 */
function getOperationName(operation: Operation): string {
  switch (operation) {
    case 'quickPay':
      return 'Direct Pay'
    case 'stealthPay':
      return 'Stealth Pay'
    case 'privateSend':
      return 'Private Send'
  }
}

export function OperationGuard({
  operation,
  children,
  unavailableMessage,
  showTooltip = true,
  disabledClassName,
}: OperationGuardProps) {
  const { available, blockers, isLoading } = useOperationAvailable(operation)

  // If loading or available, render children as-is
  if (isLoading || available) {
    return <>{children}</>
  }

  // Build tooltip message
  const operationName = getOperationName(operation)
  const tooltipMessage =
    unavailableMessage ||
    `${operationName} unavailable: ${blockers.length > 0 ? blockers.join(', ') : 'System not ready'}`

  // Clone child element and add disabled state
  const disabledChild = isValidElement(children)
    ? cloneElement(children as ReactElement<{ disabled?: boolean; className?: string }>, {
        disabled: true,
        className: cn(
          (children as ReactElement<{ className?: string }>).props.className,
          'opacity-50 cursor-not-allowed',
          disabledClassName
        ),
      })
    : children

  // Wrap in tooltip if enabled
  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-block">{disabledChild}</span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-sm">{tooltipMessage}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return <>{disabledChild}</>
}

/**
 * Hook to get operation availability with message
 */
export function useOperationGuard(operation: Operation): {
  available: boolean
  blockers: string[]
  isLoading: boolean
  message: string | null
} {
  const { available, blockers, isLoading } = useOperationAvailable(operation)

  const message =
    !available && !isLoading
      ? `${getOperationName(operation)} unavailable: ${blockers.join(', ') || 'System not ready'}`
      : null

  return { available, blockers, isLoading, message }
}

/**
 * Simple component to show operation unavailable status inline
 */
export function OperationStatus({
  operation,
  className,
}: {
  operation: Operation
  className?: string
}) {
  const { available, blockers, isLoading } = useOperationAvailable(operation)

  if (isLoading) {
    return <span className={cn('text-xs text-slate-500', className)}>Checking availability...</span>
  }

  if (available) {
    return <span className={cn('text-xs text-emerald-400', className)}>Available</span>
  }

  return (
    <span className={cn('text-xs text-amber-400', className)}>
      {blockers.length > 0 ? blockers[0] : 'Unavailable'}
    </span>
  )
}
