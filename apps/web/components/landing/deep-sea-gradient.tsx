'use client'

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

interface DeepSeaGradientProps {
  variant?: GradientVariant
  intensity?: GradientIntensity
  className?: string
}

/**
 * Animated mesh gradient background with variant and intensity support.
 * Uses WebGL for smooth, GPU-accelerated animation.
 */
export function DeepSeaGradient({
  variant = 'ocean',
  intensity = 'vibrant',
  className = '',
}: DeepSeaGradientProps) {
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
        appearance: 'default', // Use default to minimize fade-in flicker
        appearanceDuration: 100, // Very short transition
      }}
    />
  )
}
