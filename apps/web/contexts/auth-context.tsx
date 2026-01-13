'use client'

/**
 * Authentication context for Galeon.
 *
 * Handles SIWE (Sign-In With Ethereum) authentication with the backend
 * and JWT token management.
 *
 * TODO: Security improvements for production:
 * - Move JWT to HttpOnly cookies via Next.js middleware
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import { useAccount, useChainId, useSignMessage } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import {
  api,
  tokenStorage,
  refreshSession,
  API_BASE_URL,
  portsApi,
  type AuthTokens,
  type User,
} from '@/lib/api'

/** Session duration: 7 days in milliseconds */
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000

/** SIWE message domain */
const SIWE_DOMAIN = typeof window !== 'undefined' ? window.location.host : 'galeon.xyz'

/** SIWE message URI */
const SIWE_URI = typeof window !== 'undefined' ? window.location.origin : 'https://galeon.xyz'

interface AuthContextValue {
  /** Current authenticated user (null if not logged in) */
  user: User | null
  /** Whether authentication is in progress */
  isAuthenticating: boolean
  /** Whether we're checking existing session on mount */
  isLoading: boolean
  /** Error message if auth failed */
  error: string | null
  /** Whether user is authenticated */
  isAuthenticated: boolean
  /** Sign in with SIWE - returns true if successful */
  signIn: () => Promise<boolean>
  /** Sign out and clear session */
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

/**
 * Build SIWE message string (EIP-4361 format)
 */
function buildSiweMessage(params: {
  address: string
  chainId: number
  nonce: string
  issuedAt: string
  expirationTime: string
}): string {
  const { address, chainId, nonce, issuedAt, expirationTime } = params

  // EIP-4361 compliant SIWE message format
  // Statement must be a single line - includes trust acknowledgment
  return `${SIWE_DOMAIN} wants you to sign in with your Ethereum account:
${address}

Sign in to Galeon. I understand Galeon stores my viewing keys (encrypted) to detect incoming payments and operates the ASP for pool withdrawals.

URI: ${SIWE_URI}
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${issuedAt}
Expiration Time: ${expirationTime}`
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { signMessageAsync } = useSignMessage()
  const queryClient = useQueryClient()

  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Track if wallet was ever connected to distinguish initial load from disconnect
  const wasConnectedRef = useRef(false)
  // Track the authenticated address to detect wallet switches
  const authenticatedAddressRef = useRef<string | null>(null)
  // Track previous address for account switch detection (independent of auth state)
  const previousAddressRef = useRef<string | undefined>(undefined)

  /**
   * Check for existing valid session on mount
   * Uses /refresh to get user data + new tokens in one request
   * Also triggers receipt sync in background
   */
  useEffect(() => {
    const checkSession = async () => {
      console.log('[Auth] Checking session...', { hasValidSession: tokenStorage.hasValidSession() })

      if (!tokenStorage.hasValidSession()) {
        console.log('[Auth] No valid session found')
        setIsLoading(false)
        return
      }

      try {
        // Refresh session and get user data in one request
        console.log('[Auth] Attempting to refresh session...')
        const result = await refreshSession()
        if (result) {
          console.log('[Auth] Session restored successfully', { userId: result.user.id })
          setUser(result.user)
          // Track the authenticated address from the restored session
          authenticatedAddressRef.current = result.user.walletAddress

          // Sync receipts in background (don't block session restore)
          portsApi
            .sync()
            .then((syncResult) => {
              console.log('[Auth] Receipt sync completed:', syncResult)
              // Invalidate ports query to refresh with updated totals
              queryClient.invalidateQueries({ queryKey: ['ports'] })
            })
            .catch((err) => {
              console.warn('[Auth] Receipt sync failed (non-blocking):', err)
            })
        } else {
          console.log('[Auth] Refresh returned null, clearing tokens')
          tokenStorage.clearTokens()
        }
      } catch (err) {
        // Session invalid, clear it
        console.log('[Auth] Session refresh failed:', err)
        tokenStorage.clearTokens()
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, [queryClient])

  /**
   * Clear session when wallet actively disconnects (not on initial load)
   * This prevents clearing tokens on page refresh before wallet reconnects
   */
  useEffect(() => {
    if (isConnected) {
      // Mark that wallet has been connected at least once
      wasConnectedRef.current = true
    } else if (wasConnectedRef.current) {
      // Only clear if wallet was previously connected (active disconnect)
      console.log('[Auth] Wallet disconnected, clearing session')
      setUser(null)
      tokenStorage.clearTokens()
      authenticatedAddressRef.current = null
    }
  }, [isConnected])

  /**
   * Auto-logout when wallet address changes (user switches accounts)
   * Handles both:
   * 1. Initial mismatch: session restored for wallet B, but connected to wallet A
   * 2. Account switch: connected to A, user switches to C in the wallet provider
   */
  useEffect(() => {
    // Skip during initial loading to allow session restoration
    if (isLoading) {
      return
    }

    // Check 1: Session restored for different wallet than currently connected
    // This handles the case where user switched wallets before page refresh
    if (
      user &&
      address &&
      authenticatedAddressRef.current &&
      authenticatedAddressRef.current.toLowerCase() !== address.toLowerCase()
    ) {
      console.log('[Auth] Session wallet mismatch, clearing session', {
        sessionWallet: authenticatedAddressRef.current,
        connectedWallet: address,
      })
      setUser(null)
      tokenStorage.clearTokens()
      authenticatedAddressRef.current = null
      previousAddressRef.current = address
      return
    }

    // Check 2: Detect account switch in wallet provider
    if (
      previousAddressRef.current &&
      address &&
      previousAddressRef.current.toLowerCase() !== address.toLowerCase()
    ) {
      console.log('[Auth] Account switched, clearing session', {
        previous: previousAddressRef.current,
        current: address,
      })
      setUser(null)
      tokenStorage.clearTokens()
      authenticatedAddressRef.current = null
    }

    // Update tracking ref
    previousAddressRef.current = address
  }, [address, isLoading, user])

  /**
   * Sign in with SIWE
   */
  const signIn = useCallback(async (): Promise<boolean> => {
    console.log('[Auth] signIn called', { address, isConnected, chainId })

    if (!address || !isConnected) {
      console.log('[Auth] Wallet not connected, aborting')
      setError('Wallet not connected')
      return false
    }

    setIsAuthenticating(true)
    setError(null)

    try {
      // 1. Get nonce from backend
      console.log('[Auth] Fetching nonce...')
      const nonceResponse = await fetch(
        `${API_BASE_URL}/api/v1/auth/nonce?walletAddress=${address}&chainId=${chainId}`
      )

      if (!nonceResponse.ok) {
        console.log('[Auth] Nonce fetch failed:', nonceResponse.status)
        throw new Error('Failed to get nonce')
      }

      const { nonce } = await nonceResponse.json()
      console.log('[Auth] Got nonce:', nonce)

      // 2. Build SIWE message
      const issuedAt = new Date().toISOString()
      const expirationTime = new Date(Date.now() + SESSION_DURATION_MS).toISOString()

      const message = buildSiweMessage({
        address,
        chainId,
        nonce,
        issuedAt,
        expirationTime,
      })
      console.log('[Auth] Built SIWE message, requesting signature...')

      // 3. Sign message with wallet
      const signature = await signMessageAsync({ message })
      console.log('[Auth] Got signature, verifying with backend...')

      // 4. Verify with backend
      const verifyResponse = await fetch(`${API_BASE_URL}/api/v1/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature }),
      })

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json().catch(() => ({}))
        console.log('[Auth] Verification failed:', errorData)
        throw new Error(errorData.error || 'Verification failed')
      }

      const data = await verifyResponse.json()
      console.log('[Auth] SIWE authentication successful!')

      // 5. Store tokens
      const tokens: AuthTokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresIn: SESSION_DURATION_MS / 1000,
      }
      tokenStorage.setTokens(tokens)

      // 6. Set user and track authenticated address
      setUser(data.user)
      authenticatedAddressRef.current = address

      // 7. Sync receipts in background (don't block sign-in)
      portsApi
        .sync()
        .then((syncResult) => {
          console.log('[Auth] Receipt sync completed after sign-in:', syncResult)
          // Invalidate ports query to refresh with updated totals
          queryClient.invalidateQueries({ queryKey: ['ports'] })
        })
        .catch((err) => {
          console.warn('[Auth] Receipt sync failed (non-blocking):', err)
        })

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed'
      console.log('[Auth] signIn error:', message)
      setError(message)
      return false
    } finally {
      setIsAuthenticating(false)
    }
  }, [address, isConnected, chainId, signMessageAsync, queryClient])

  /**
   * Sign out
   */
  const signOut = useCallback(async () => {
    try {
      // Call backend logout to blacklist token
      await api.post('/api/v1/auth/logout')
    } catch {
      // Ignore errors - we're logging out anyway
    } finally {
      tokenStorage.clearTokens()
      setUser(null)
      authenticatedAddressRef.current = null
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticating,
        isLoading,
        error,
        isAuthenticated: user !== null,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to access auth context
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
