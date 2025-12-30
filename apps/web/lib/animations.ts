'use client'

import { useReducedMotion } from 'motion/react'
import type { Transition, Variants, MotionProps } from 'motion/react'

/**
 * Default easing curves matching CSS variables.
 */
export const easing = {
  default: [0.4, 0, 0.2, 1] as const,
  in: [0.4, 0, 1, 1] as const,
  out: [0, 0, 0.2, 1] as const,
  bounce: [0.34, 1.56, 0.64, 1] as const,
}

/**
 * Duration presets in seconds.
 */
export const duration = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
}

/**
 * Fade in animation preset.
 */
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: duration.normal },
} satisfies MotionProps

/**
 * Slide up with fade animation preset.
 */
export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.3, ease: easing.default },
} satisfies MotionProps

/**
 * Slide down with fade animation preset.
 */
export const slideDown = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
  transition: { duration: 0.3, ease: easing.default },
} satisfies MotionProps

/**
 * Scale in animation preset (for modals, dialogs).
 */
export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: duration.normal },
} satisfies MotionProps

/**
 * Card hover animation (lift effect).
 */
export const cardHover = {
  whileHover: {
    y: -4,
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.1)',
  },
  transition: { duration: duration.normal },
} satisfies MotionProps

/**
 * Glass card hover animation (cyan caustic glow).
 */
export const glassHover = {
  whileHover: {
    y: -2,
    boxShadow: 'var(--shadow-caustic-hover)',
  },
  transition: { duration: duration.normal },
} satisfies MotionProps

/**
 * Underwater card hover (subtle lift).
 */
export const underwaterHover = {
  whileHover: {
    y: -4,
    transition: { duration: 0.2, ease: easing.out },
  },
} satisfies MotionProps

/**
 * Tactile button press (fast feedback).
 */
export const tactilePress = {
  whileTap: { scale: 0.97 },
  transition: { duration: duration.fast },
} satisfies MotionProps

/**
 * Icon float animation (subtle ambient motion).
 */
export const iconFloat = {
  animate: { y: [0, -3, 0] },
  transition: {
    duration: 2.5,
    repeat: Infinity,
    ease: 'easeInOut',
  },
} satisfies MotionProps

/**
 * Button tap animation (subtle press).
 */
export const buttonTap = {
  whileTap: { scale: 0.98 },
  transition: { duration: duration.fast },
} satisfies MotionProps

/**
 * Stagger children animation variants.
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: easing.default },
  },
}

/**
 * Bento grid stagger variants (orchestration).
 */
export const bentoContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

export const bentoItem: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: easing.default },
  },
}

/**
 * Page transition preset.
 */
export const pageTransition: Transition = {
  type: 'tween',
  ease: easing.default,
  duration: duration.slow,
}

/**
 * Hook to get animation preset with reduced motion support.
 * Returns empty object if user prefers reduced motion.
 */
export function useAnimationPreset<T extends MotionProps>(preset: T): T | Record<string, never> {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return {}
  }

  return preset
}

/**
 * Hook to check if animations should be enabled.
 */
export function useAnimationsEnabled(): boolean {
  const prefersReducedMotion = useReducedMotion()
  return !prefersReducedMotion
}
