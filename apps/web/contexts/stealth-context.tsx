'use client'

/**
 * Stealth keys context for the Galeon application.
 *
 * Stores derived stealth keys in memory for the session.
 * Keys are derived from wallet signature and used for:
 * - Generating stealth meta-addresses for Ports
 * - Scanning announcements for payments
 * - Deriving spending keys to collect funds
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { useSignMessage } from 'wagmi'
import { deriveStealthKeys, formatStealthMetaAddress, type StealthKeys } from '@galeon/stealth'

/** Message for deriving stealth keys - domain-specific for security */
const KEY_DERIVATION_MESSAGE = `Galeon Stealth Key Derivation

Sign this message to unlock your stealth keys.
This signature stays local and does NOT authorize transactions.

App: Galeon
Action: Derive stealth keys
Version: 1`

interface StealthContextValue {
  /** Derived stealth keys (null if not yet derived) */
  keys: StealthKeys | null
  /** Master signature used for key derivation (needed for port-specific keys) */
  masterSignature: `0x${string}` | null
  /** Formatted stealth meta-address for sharing */
  metaAddress: string | null
  /** Whether key derivation is in progress */
  isDerivingKeys: boolean
  /** Error message if derivation failed */
  error: string | null
  /** Derive keys from wallet signature */
  deriveKeys: () => Promise<StealthKeys>
  /** Clear keys (on disconnect) */
  clearKeys: () => void
  /** Whether keys have been derived */
  hasKeys: boolean
}

const StealthContext = createContext<StealthContextValue | null>(null)

interface StealthProviderProps {
  children: ReactNode
}

/**
 * Provider component for stealth keys.
 * Wrap your app with this to access stealth functionality.
 */
export function StealthProvider({ children }: StealthProviderProps) {
  const { signMessageAsync } = useSignMessage()
  const [keys, setKeys] = useState<StealthKeys | null>(null)
  const [masterSignature, setMasterSignature] = useState<`0x${string}` | null>(null)
  const [metaAddress, setMetaAddress] = useState<string | null>(null)
  const [isDerivingKeys, setIsDerivingKeys] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deriveKeys = useCallback(async () => {
    setIsDerivingKeys(true)
    setError(null)

    try {
      // Request signature from wallet
      const signature = await signMessageAsync({
        message: KEY_DERIVATION_MESSAGE,
      })

      // Store master signature for port key derivation
      setMasterSignature(signature as `0x${string}`)

      // Derive stealth keys from signature
      const derivedKeys = deriveStealthKeys(signature)
      setKeys(derivedKeys)

      // Format meta-address for display/sharing
      const formatted = formatStealthMetaAddress(
        derivedKeys.spendingPublicKey,
        derivedKeys.viewingPublicKey,
        'mnt' // Use Mantle prefix
      )
      setMetaAddress(formatted)

      return derivedKeys
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to derive keys'
      setError(message)
      throw err
    } finally {
      setIsDerivingKeys(false)
    }
  }, [signMessageAsync])

  const clearKeys = useCallback(() => {
    setKeys(null)
    setMasterSignature(null)
    setMetaAddress(null)
    setError(null)
  }, [])

  return (
    <StealthContext.Provider
      value={{
        keys,
        masterSignature,
        metaAddress,
        isDerivingKeys,
        error,
        deriveKeys,
        clearKeys,
        hasKeys: keys !== null,
      }}
    >
      {children}
    </StealthContext.Provider>
  )
}

/**
 * Hook to access stealth keys context.
 * Must be used within a StealthProvider.
 */
export function useStealthContext() {
  const context = useContext(StealthContext)
  if (!context) {
    throw new Error('useStealthContext must be used within a StealthProvider')
  }
  return context
}
