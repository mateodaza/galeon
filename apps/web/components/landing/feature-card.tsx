'use client'

import { m } from 'motion/react'
import { GlassCard, GlassCardContent } from '@/components/ui/glass-card'
import {
  underwaterHover,
  iconFloat,
  useAnimationPreset,
  useAnimationsEnabled,
} from '@/lib/animations'

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  variant?: 'default' | 'elevated' | 'wood-accent' | 'hero'
}

/**
 * Feature card with glass effect and micro-interactions.
 * Icon floats subtly, card lifts on hover.
 */
export function FeatureCard({ icon, title, description, variant = 'default' }: FeatureCardProps) {
  const animationsEnabled = useAnimationsEnabled()
  const hoverProps = useAnimationPreset(underwaterHover)
  const floatProps = useAnimationPreset(iconFloat)

  const content = (
    <GlassCard variant={variant} className="h-full">
      <GlassCardContent className="flex h-full flex-col pt-6">
        {animationsEnabled ? (
          <m.div {...floatProps} className="text-cyan-300">
            {icon}
          </m.div>
        ) : (
          <div className="text-cyan-300">{icon}</div>
        )}
        <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm text-cyan-100/70">{description}</p>
      </GlassCardContent>
    </GlassCard>
  )

  if (!animationsEnabled) {
    return content
  }

  return <m.div {...hoverProps}>{content}</m.div>
}
