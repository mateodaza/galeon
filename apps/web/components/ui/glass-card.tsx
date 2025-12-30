import * as React from 'react'
import { cn } from '@/lib/utils'

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Visual variant of the glass card.
   * @default 'default'
   */
  variant?: 'default' | 'elevated' | 'wood-accent' | 'hero'
  /**
   * Intensity of the blur effect.
   * @default 'medium'
   */
  blur?: 'light' | 'medium' | 'heavy'
  /**
   * Whether to add a subtle cyan glow on hover.
   * @default false
   */
  glowOnHover?: boolean
}

/**
 * A card with glassmorphism effect.
 *
 * Uses CSS backdrop-filter for the frosted glass look.
 * Best used on solid color or gradient backgrounds.
 *
 * @example
 * ```tsx
 * <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-8">
 *   <GlassCard>
 *     <h3>Your content here</h3>
 *   </GlassCard>
 * </div>
 * ```
 */
const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = 'default', blur = 'medium', glowOnHover = false, ...props }, ref) => {
    const blurMap = {
      light: 'backdrop-blur-md',
      medium: 'backdrop-blur-lg',
      heavy: 'backdrop-blur-xl',
    }

    // Per Josh W. Comeau: use very low opacity (10-20%) for background
    // so the backdrop-filter blur can actually show through
    const variantStyles = {
      default: 'bg-white/20 border-white/30 shadow-[var(--shadow-caustic)]',
      elevated: 'bg-white/30 border-white/40 shadow-lg',
      'wood-accent': 'bg-white/20 border-[rgba(184,160,122,0.3)] shadow-[var(--shadow-caustic)]',
      hero: 'bg-cyan-500/10 border-cyan-300/30 shadow-[var(--shadow-caustic)]',
    }

    return (
      <div
        ref={ref}
        className={cn(
          // Base glass effect
          'rounded-lg border shadow-sm',
          blurMap[blur],
          variantStyles[variant],
          // Hover glow effect (cyan caustic)
          glowOnHover && 'transition-shadow hover:shadow-[var(--shadow-caustic-hover)]',
          className
        )}
        {...props}
      />
    )
  }
)
GlassCard.displayName = 'GlassCard'

/**
 * Header section for GlassCard.
 */
const GlassCardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  )
)
GlassCardHeader.displayName = 'GlassCardHeader'

/**
 * Title for GlassCard header.
 */
const GlassCardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('text-foreground text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
)
GlassCardTitle.displayName = 'GlassCardTitle'

/**
 * Description for GlassCard header.
 */
const GlassCardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-muted-foreground text-sm', className)} {...props} />
  )
)
GlassCardDescription.displayName = 'GlassCardDescription'

/**
 * Content section for GlassCard.
 */
const GlassCardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
)
GlassCardContent.displayName = 'GlassCardContent'

/**
 * Footer section for GlassCard.
 */
const GlassCardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  )
)
GlassCardFooter.displayName = 'GlassCardFooter'

export {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
  GlassCardFooter,
}
