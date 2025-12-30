'use client'

import { m } from 'motion/react'
import { cn } from '@/lib/utils'
import { bentoContainer, bentoItem, useAnimationsEnabled } from '@/lib/animations'

interface BentoGridProps {
  children: React.ReactNode
  className?: string
}

/**
 * Animated bento grid container.
 * Uses CSS Grid with staggered entrance animations.
 */
export function BentoGrid({ children, className }: BentoGridProps) {
  const animationsEnabled = useAnimationsEnabled()

  if (!animationsEnabled) {
    return (
      <div
        className={cn(
          'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4',
          'auto-rows-[minmax(180px,auto)]',
          className
        )}
      >
        {children}
      </div>
    )
  }

  return (
    <m.div
      className={cn(
        'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4',
        'auto-rows-[minmax(180px,auto)]',
        className
      )}
      variants={bentoContainer}
      initial="hidden"
      animate="visible"
    >
      {children}
    </m.div>
  )
}

interface BentoItemProps {
  children: React.ReactNode
  colSpan?: 1 | 2 | 3 | 4
  rowSpan?: 1 | 2
  className?: string
}

/**
 * Grid item wrapper with span control.
 * Animates as part of the bento grid stagger.
 */
export function BentoItem({ children, colSpan = 1, rowSpan = 1, className }: BentoItemProps) {
  const animationsEnabled = useAnimationsEnabled()

  const spanClasses = cn(
    colSpan === 2 && 'md:col-span-2',
    colSpan === 3 && 'lg:col-span-3',
    colSpan === 4 && 'col-span-full',
    rowSpan === 2 && 'row-span-2',
    className
  )

  if (!animationsEnabled) {
    return <div className={spanClasses}>{children}</div>
  }

  return (
    <m.div className={spanClasses} variants={bentoItem}>
      {children}
    </m.div>
  )
}
