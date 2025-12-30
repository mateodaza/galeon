'use client'

/**
 * PortCard component for displaying a Port with its stealth address.
 *
 * Features:
 * - Port name and ID display
 * - Active/inactive status indicator
 * - Collapsible stealth meta-address
 * - Copy payment link and meta-address buttons
 * - Motion animations on hover
 */

import { useState, useCallback } from 'react'
import { Copy, Check, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import * as m from 'motion/react-m'
import { useReducedMotion } from 'motion/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Port } from '@/hooks/use-ports'

interface PortCardProps {
  port: Port
  /** Show external link to payment page */
  showPaymentLink?: boolean
  /** Callback when card is clicked */
  onClick?: () => void
  className?: string
}

export function PortCard({ port, showPaymentLink = true, onClick, className }: PortCardProps) {
  const [copied, setCopied] = useState<'link' | 'address' | null>(null)
  const [showMeta, setShowMeta] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  // Animation props - disabled when user prefers reduced motion
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

  const copyPaymentLink = useCallback(() => {
    const link = `${window.location.origin}/pay/${port.portId}`
    navigator.clipboard.writeText(link)
    setCopied('link')
    setTimeout(() => setCopied(null), 2000)
  }, [port.portId])

  const copyMetaAddress = useCallback(() => {
    navigator.clipboard.writeText(port.stealthMetaAddress)
    setCopied('address')
    setTimeout(() => setCopied(null), 2000)
  }, [port.stealthMetaAddress])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onClick()
    }
  }

  return (
    <m.div
      {...hoverLift}
      className={className}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <Card className={cn(onClick && 'cursor-pointer')}>
        <CardContent className="pt-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="text-foreground truncate text-lg font-semibold">{port.name}</h3>
              <p className="text-muted-foreground mt-1 font-mono text-xs">
                {port.portId.slice(0, 10)}...{port.portId.slice(-8)}
              </p>
            </div>
            <div className="ml-2 flex items-center gap-2">
              <div
                className={cn(
                  'h-2 w-2 rounded-full',
                  port.isActive ? 'bg-primary' : 'bg-muted-foreground'
                )}
                title={port.isActive ? 'Active' : 'Inactive'}
              />
            </div>
          </div>

          {/* Stealth meta-address (collapsible) */}
          <div className="mt-4">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMeta(!showMeta)
              }}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
              aria-expanded={showMeta}
              aria-label={showMeta ? 'Hide stealth address' : 'Show stealth address'}
            >
              {showMeta ? (
                <ChevronUp className="h-3 w-3" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3 w-3" aria-hidden="true" />
              )}
              {showMeta ? 'Hide' : 'Show'} stealth address
            </button>

            {showMeta && (
              <m.div {...expandAnimation} className="bg-muted mt-2 overflow-hidden rounded-lg p-3">
                <p className="text-muted-foreground break-all font-mono text-xs leading-relaxed">
                  {port.stealthMetaAddress}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    copyMetaAddress()
                  }}
                  className="text-primary hover:text-primary/80 mt-2 inline-flex items-center gap-1 text-xs transition-colors"
                  aria-label={
                    copied === 'address' ? 'Copied stealth address' : 'Copy stealth meta-address'
                  }
                >
                  {copied === 'address' ? (
                    <>
                      <Check className="h-3 w-3" aria-hidden="true" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" aria-hidden="true" />
                      Copy full address
                    </>
                  )}
                </button>
              </m.div>
            )}
          </div>

          {/* Actions */}
          {showPaymentLink && (
            <div className="mt-4 flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation()
                  copyPaymentLink()
                }}
                aria-label={
                  copied === 'link' ? 'Copied payment link' : `Copy payment link for ${port.name}`
                }
              >
                {copied === 'link' ? (
                  <>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    Copy Link
                  </>
                )}
              </Button>
              <Button variant="outline" size="icon" asChild onClick={(e) => e.stopPropagation()}>
                <a
                  href={`/pay/${port.portId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open payment page for ${port.name}`}
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </m.div>
  )
}
