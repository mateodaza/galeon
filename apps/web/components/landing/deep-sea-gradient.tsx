'use client'

import { useState, useEffect } from 'react'
import { MeshGradient } from '@mesh-gradient/react'

type GradientVariant = 'ocean' | 'teal' | 'driftwood'
type GradientIntensity = 'subtle' | 'vibrant' | 'calm'

// Subtle palettes - darker at top, brighter at bottom (deep sea effect)
const subtlePalettes: Record<GradientVariant, [string, string, string, string]> = {
  ocean: ['#0f172a', '#0c4a6e', '#0891b2', '#06b6d4'],
  teal: ['#042f2e', '#0f766e', '#14b8a6', '#2dd4bf'],
  driftwood: ['#292524', '#57534e', '#78716c', '#a8a29e'],
}

// Vibrant palettes - punchy, eye-catching
const vibrantPalettes: Record<GradientVariant, [string, string, string, string]> = {
  ocean: ['#0284c7', '#06b6d4', '#22d3ee', '#67e8f9'],
  teal: ['#0f766e', '#14b8a6', '#2dd4bf', '#5eead4'],
  driftwood: ['#57534e', '#78716c', '#a8a29e', '#d6d3d1'],
}

// Calm palettes - light surface to deep (looking down into ocean)
const calmPalettes: Record<GradientVariant, [string, string, string, string]> = {
  ocean: ['#67e8f9', '#06b6d4', '#0c4a6e', '#020617'],
  teal: ['#5eead4', '#14b8a6', '#0f766e', '#042f2e'],
  driftwood: ['#d6d3d1', '#a8a29e', '#57534e', '#292524'],
}

// CSS gradient fallbacks for low-performance mode
const staticGradients: Record<GradientVariant, Record<GradientIntensity, string>> = {
  ocean: {
    calm: 'linear-gradient(180deg, #67e8f9 0%, #06b6d4 30%, #0c4a6e 70%, #020617 100%)',
    subtle: 'linear-gradient(180deg, #0f172a 0%, #0c4a6e 40%, #0891b2 80%, #06b6d4 100%)',
    vibrant: 'linear-gradient(180deg, #0284c7 0%, #06b6d4 40%, #22d3ee 80%, #67e8f9 100%)',
  },
  teal: {
    calm: 'linear-gradient(180deg, #5eead4 0%, #14b8a6 30%, #0f766e 70%, #042f2e 100%)',
    subtle: 'linear-gradient(180deg, #042f2e 0%, #0f766e 40%, #14b8a6 80%, #2dd4bf 100%)',
    vibrant: 'linear-gradient(180deg, #0f766e 0%, #14b8a6 40%, #2dd4bf 80%, #5eead4 100%)',
  },
  driftwood: {
    calm: 'linear-gradient(180deg, #d6d3d1 0%, #a8a29e 30%, #57534e 70%, #292524 100%)',
    subtle: 'linear-gradient(180deg, #292524 0%, #57534e 40%, #78716c 80%, #a8a29e 100%)',
    vibrant: 'linear-gradient(180deg, #57534e 0%, #78716c 40%, #a8a29e 80%, #d6d3d1 100%)',
  },
}

/**
 * Detect if device should use reduced motion/performance mode.
 * Checks: prefers-reduced-motion, device memory, hardware concurrency
 */
function useReducedPerformance(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    // Check prefers-reduced-motion media query
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Check device memory (< 4GB suggests lower-end device)
    const lowMemory =
      'deviceMemory' in navigator && (navigator as { deviceMemory?: number }).deviceMemory
        ? (navigator as { deviceMemory: number }).deviceMemory < 4
        : false

    // Check hardware concurrency (< 4 cores suggests lower-end device)
    const lowCores = navigator.hardwareConcurrency ? navigator.hardwareConcurrency < 4 : false

    // Check for save-data header hint
    const saveData =
      'connection' in navigator &&
      (navigator as { connection?: { saveData?: boolean } }).connection?.saveData

    setReduced(prefersReducedMotion || lowMemory || lowCores || saveData || false)
  }, [])

  return reduced
}

interface DeepSeaGradientProps {
  variant?: GradientVariant
  intensity?: GradientIntensity
  className?: string
  /** Force static gradient (no WebGL) */
  forceStatic?: boolean
}

/**
 * Animated mesh gradient background with variant and intensity support.
 * Uses WebGL for smooth, GPU-accelerated animation.
 * Automatically falls back to static CSS gradient on low-performance devices.
 */
export function DeepSeaGradient({
  variant = 'ocean',
  intensity = 'vibrant',
  className = '',
  forceStatic = false,
}: DeepSeaGradientProps) {
  const reducedPerformance = useReducedPerformance()
  const useStaticGradient = forceStatic || reducedPerformance

  // Static CSS gradient fallback for low-performance devices
  if (useStaticGradient) {
    return (
      <div
        className={`absolute inset-0 -z-10 ${className}`}
        style={{
          width: '100%',
          height: '100%',
          background: staticGradients[variant][intensity],
        }}
      />
    )
  }

  const palettes =
    intensity === 'calm' ? calmPalettes : intensity === 'subtle' ? subtlePalettes : vibrantPalettes

  // Calm: gentle movement, subtle: balanced, vibrant: active
  const animationSpeed = intensity === 'calm' ? 0.15 : intensity === 'subtle' ? 0.25 : 0.35
  const frequency =
    intensity === 'calm'
      ? { x: 0.00012, y: 0.00018, delta: 0.00006 }
      : intensity === 'subtle'
        ? { x: 0.00012, y: 0.0002, delta: 0.00008 }
        : { x: 0.00025, y: 0.00025, delta: 0.00004 }

  return (
    <MeshGradient
      className={`absolute inset-0 -z-10 ${className}`}
      style={{ width: '100%', height: '100%' }}
      options={{
        colors: palettes[variant],
        animationSpeed,
        frequency,
        seed: variant === 'ocean' ? 42 : variant === 'teal' ? 123 : 456,
        pauseOnOutsideViewport: true,
        appearance: 'default',
        appearanceDuration: 100,
      }}
    />
  )
}
