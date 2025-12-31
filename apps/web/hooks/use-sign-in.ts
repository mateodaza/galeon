'use client'

/**
 * Combined sign-in hook for Galeon.
 *
 * Provides sign-in status and sign-out functionality.
 * The actual sign-in flow is handled by SignInModal.
 */

import { useCallback, useState } from 'react'
import { useAccount } from 'wagmi'
import { useAuth } from '@/contexts/auth-context'
import { useStealthContext } from '@/contexts/stealth-context'

interface UseSignInResult {
  /** Combined sign-out: clear both sessions */
  signOut: () => Promise<void>
  /** Whether sign-out is in progress */
  isSigningOut: boolean
  /** Whether any signing operation is in progress */
  isSigningIn: boolean
  /** Error from either auth or stealth flow */
  error: string | null
  /** Whether fully signed in (auth + keys) */
  isFullySignedIn: boolean
  /** Whether still loading/restoring sessions */
  isLoading: boolean
  /** Whether wallet is connected */
  isConnected: boolean
  /** Whether authenticated with backend (SIWE complete) */
  isAuthenticated: boolean
  /** Whether stealth keys are derived */
  hasKeys: boolean
}

/**
 * Hook for accessing sign-in state and sign-out functionality.
 *
 * Use SignInModal for the actual sign-in flow.
 */
export function useSignIn(): UseSignInResult {
  const { isConnected } = useAccount()

  const {
    isAuthenticated,
    isLoading: isAuthLoading,
    isAuthenticating,
    signOut: authSignOut,
    error: authError,
  } = useAuth()

  const {
    hasKeys,
    isRestoring,
    isDerivingKeys,
    clearKeys,
    error: stealthError,
  } = useStealthContext()

  const [isSigningOut, setIsSigningOut] = useState(false)

  /**
   * Combined sign-out flow
   */
  const signOut = useCallback(async () => {
    setIsSigningOut(true)

    try {
      // Clear stealth keys first (synchronous)
      clearKeys()

      // Then logout from backend (async)
      await authSignOut()
    } finally {
      setIsSigningOut(false)
    }
  }, [authSignOut, clearKeys])

  // Combine errors from all sources
  const error = authError || stealthError

  // Combine loading states
  const isLoading = isAuthLoading || isRestoring
  const isSigningIn = isAuthenticating || isDerivingKeys

  // Fully signed in = authenticated with backend + have stealth keys
  const isFullySignedIn = isAuthenticated && hasKeys

  return {
    signOut,
    isSigningOut,
    isSigningIn,
    error,
    isFullySignedIn,
    isLoading,
    isConnected,
    isAuthenticated,
    hasKeys,
  }
}
