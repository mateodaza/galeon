import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind classes with conflict resolution.
 * Use this instead of template literals for conditional classes.
 *
 * @example
 * cn('px-4 py-2', isActive && 'bg-primary', className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format an Ethereum address for display.
 * Shows first 6 and last 4 characters.
 */
export function formatAddress(address: string, chars = 4): string {
  if (!address) return ''
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

/**
 * Format a balance with appropriate decimal places.
 */
export function formatBalance(balance: bigint, decimals = 18, displayDecimals = 4): string {
  const divisor = BigInt(10 ** decimals)
  const whole = balance / divisor
  const fraction = balance % divisor

  const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, displayDecimals)

  // Remove trailing zeros
  const trimmedFraction = fractionStr.replace(/0+$/, '')

  if (trimmedFraction) {
    return `${whole}.${trimmedFraction}`
  }
  return whole.toString()
}

/**
 * Copy text to clipboard with fallback.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const success = document.execCommand('copy')
    document.body.removeChild(textarea)
    return success
  }
}
