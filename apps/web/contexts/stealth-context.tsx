'use client'

/**
 * Stealth keys context for the Galeon application.
 *
 * Stores derived stealth keys with localStorage persistence for session continuity.
 * Keys are derived from wallet signature and used for:
 * - Generating stealth meta-addresses for Ports
 * - Scanning announcements for payments
 * - Deriving spending keys to collect funds
 *
 * TODO: Security improvements for production:
 * - Consider encrypted localStorage with Web Crypto API
 * - Add secure session invalidation mechanisms
 */

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useSignMessage, useAccount } from 'wagmi'
import { deriveStealthKeys, formatStealthMetaAddress, type StealthKeys } from '@galeon/stealth'

/** Message for deriving stealth keys - domain-specific for security */
const KEY_DERIVATION_MESSAGE = `Galeon - Unlock Stealth Keys (2/2)

This signature unlocks your private payment keys.
Your session will remain active for 7 days.

IMPORTANT:
- Keys are stored locally in your browser only
- This does NOT authorize any blockchain transactions
- You can clear your session anytime via browser settings

App: Galeon
Action: Derive stealth keys
Version: 1`

/** Session duration: 7 days in milliseconds */
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000

/** Storage key prefix */
const STORAGE_KEY = 'galeon-stealth-session'

/** Stored session structure */
interface StealthSession {
  masterSignature: `0x${string}`
  walletAddress: string
  expiresAt: number
}

/**
 * Get storage key for a specific wallet address
 */
function getStorageKey(address: string): string {
  return `${STORAGE_KEY}-${address.toLowerCase()}`
}

/**
 * Load session from localStorage
 */
function loadSession(address: string): StealthSession | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(getStorageKey(address))
    if (!stored) return null

    const session: StealthSession = JSON.parse(stored)

    // Validate session
    if (session.walletAddress.toLowerCase() !== address.toLowerCase()) {
      return null
    }

    // Check expiration
    if (Date.now() >= session.expiresAt) {
      localStorage.removeItem(getStorageKey(address))
      return null
    }

    return session
  } catch {
    return null
  }
}

/**
 * Save session to localStorage
 */
function saveSession(address: string, masterSignature: `0x${string}`): void {
  if (typeof window === 'undefined') return

  const session: StealthSession = {
    masterSignature,
    walletAddress: address.toLowerCase(),
    expiresAt: Date.now() + SESSION_DURATION_MS,
  }

  localStorage.setItem(getStorageKey(address), JSON.stringify(session))
}

/**
 * Clear session from localStorage
 */
function clearSession(address: string): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(getStorageKey(address))
}

interface StealthContextValue {
  /** Derived stealth keys (null if not yet derived) */
  keys: StealthKeys | null
  /** Master signature used for key derivation (needed for port-specific keys) */
  masterSignature: `0x${string}` | null
  /** Formatted stealth meta-address for sharing */
  metaAddress: string | null
  /** Whether key derivation is in progress */
  isDerivingKeys: boolean
  /** Whether we're restoring from storage on mount */
  isRestoring: boolean
  /** Error message if derivation failed */
  error: string | null
  /** Derive keys from wallet signature (prompts wallet) */
  deriveKeys: () => Promise<StealthKeys>
  /** Derive keys from existing signature (no wallet prompt) */
  deriveKeysFromSignature: (signature: `0x${string}`) => StealthKeys
  /** Clear keys and session (on disconnect/logout) */
  clearKeys: () => void
  /** Whether keys have been derived */
  hasKeys: boolean
  /** Whether there's a valid stored session (can restore without signing) */
  hasStoredSession: boolean
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
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const [keys, setKeys] = useState<StealthKeys | null>(null)
  const [masterSignature, setMasterSignature] = useState<`0x${string}` | null>(null)
  const [metaAddress, setMetaAddress] = useState<string | null>(null)
  const [isDerivingKeys, setIsDerivingKeys] = useState(false)
  const [isRestoring, setIsRestoring] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasStoredSession, setHasStoredSession] = useState(false)

  /**
   * Derive keys from a signature (no wallet prompt)
   */
  const deriveKeysFromSignature = useCallback(
    (signature: `0x${string}`): StealthKeys => {
      const derivedKeys = deriveStealthKeys(signature)

      setMasterSignature(signature)
      setKeys(derivedKeys)

      const formatted = formatStealthMetaAddress(
        derivedKeys.spendingPublicKey,
        derivedKeys.viewingPublicKey,
        'mnt'
      )
      setMetaAddress(formatted)

      // Save to localStorage if we have an address
      if (address) {
        saveSession(address, signature)
      }

      return derivedKeys
    },
    [address]
  )

  /**
   * Check for existing session on mount and when wallet changes
   */
  useEffect(() => {
    console.log('[Stealth] Checking for stored session...', { address })

    if (!address) {
      console.log('[Stealth] No address, skipping restoration')
      setIsRestoring(false)
      setHasStoredSession(false)
      return
    }

    const session = loadSession(address)

    if (session) {
      console.log('[Stealth] Found stored session, restoring keys...')
      setHasStoredSession(true)
      // Auto-restore keys from stored signature
      try {
        deriveKeysFromSignature(session.masterSignature)
        console.log('[Stealth] Keys restored successfully')
      } catch (err) {
        // Invalid stored signature, clear it
        console.log('[Stealth] Failed to restore keys:', err)
        clearSession(address)
        setHasStoredSession(false)
      }
    } else {
      console.log('[Stealth] No stored session found')
      setHasStoredSession(false)
    }

    setIsRestoring(false)
  }, [address, deriveKeysFromSignature])

  /**
   * Clear keys when wallet disconnects
   */
  useEffect(() => {
    if (!isConnected) {
      setKeys(null)
      setMasterSignature(null)
      setMetaAddress(null)
      setHasStoredSession(false)
      // Note: We don't clear localStorage here - session persists for reconnection
    }
  }, [isConnected])

  /**
   * Derive keys with wallet signature (prompts user)
   */
  const deriveKeys = useCallback(async () => {
    setIsDerivingKeys(true)
    setError(null)

    try {
      const signature = await signMessageAsync({
        message: KEY_DERIVATION_MESSAGE,
      })

      return deriveKeysFromSignature(signature as `0x${string}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to derive keys'
      setError(message)
      throw err
    } finally {
      setIsDerivingKeys(false)
    }
  }, [signMessageAsync, deriveKeysFromSignature])

  /**
   * Clear keys and stored session
   */
  const clearKeys = useCallback(() => {
    setKeys(null)
    setMasterSignature(null)
    setMetaAddress(null)
    setError(null)
    setHasStoredSession(false)

    if (address) {
      clearSession(address)
    }
  }, [address])

  return (
    <StealthContext.Provider
      value={{
        keys,
        masterSignature,
        metaAddress,
        isDerivingKeys,
        isRestoring,
        error,
        deriveKeys,
        deriveKeysFromSignature,
        clearKeys,
        hasKeys: keys !== null,
        hasStoredSession,
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
