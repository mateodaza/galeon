/**
 * API client for Galeon backend.
 *
 * Handles JWT authentication with automatic token refresh.
 *
 * TODO: Security improvements for production:
 * - Move JWT to HttpOnly cookies via Next.js middleware
 * - Consider encrypted localStorage for sensitive data
 */

/** API base URL - defaults to localhost in development */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'

/** Token storage keys */
const ACCESS_TOKEN_KEY = 'galeon-access-token'
const REFRESH_TOKEN_KEY = 'galeon-refresh-token'

/** Token expiry buffer (refresh 1 minute before expiry) */
const EXPIRY_BUFFER_MS = 60 * 1000

/** JWT payload structure */
interface JwtPayload {
  sub: string
  iat: number
  exp: number
}

/** API error response */
export interface ApiError {
  message: string
  code?: string
  errors?: Record<string, string[]>
}

/** User data */
export interface User {
  id: number
  walletAddress: string
  createdAt: string
}

/** Auth tokens from login/refresh */
export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

/** Refresh response includes user data */
export interface RefreshResponse {
  user: User
  accessToken: string
  refreshToken: string
}

/**
 * Parse JWT to get payload (without verification - server's job)
 */
function parseJwt(token: string): JwtPayload | null {
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) return null
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

/**
 * Check if token is expired or about to expire
 */
function isTokenExpired(token: string): boolean {
  const payload = parseJwt(token)
  if (!payload) return true
  const expiryTime = payload.exp * 1000
  return Date.now() >= expiryTime - EXPIRY_BUFFER_MS
}

/**
 * Token storage (localStorage for persistence)
 */
export const tokenStorage = {
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  },

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  },

  setTokens(tokens: AuthTokens): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
  },

  clearTokens(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  },

  hasValidSession(): boolean {
    // Check if we have a refresh token (opaque token, not JWT)
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      console.log('[TokenStorage] No refresh token found')
      return false
    }
    // Refresh tokens are opaque (database-backed), not JWTs
    // We can't check expiry client-side, so we trust the server on refresh
    // If access token exists and is valid, session is definitely good
    const accessToken = this.getAccessToken()
    if (accessToken && !isTokenExpired(accessToken)) {
      return true
    }
    // Access token expired or missing, but we have refresh token - attempt refresh
    console.log('[TokenStorage] Access token expired/missing, will attempt refresh')
    return true
  },
}

/** Refresh promise to prevent concurrent refresh calls */
let refreshPromise: Promise<RefreshResponse | null> | null = null

/**
 * Refresh access token using refresh token
 * Backend expects refresh token in Authorization header
 * Returns user data along with new tokens
 */
export async function refreshSession(): Promise<RefreshResponse | null> {
  const refreshToken = tokenStorage.getRefreshToken()
  if (!refreshToken) return null

  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${refreshToken}`,
        },
      })

      if (!response.ok) {
        tokenStorage.clearTokens()
        return null
      }

      const data: RefreshResponse = await response.json()
      tokenStorage.setTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresIn: 15 * 60,
      })
      return data
    } catch {
      tokenStorage.clearTokens()
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

/**
 * Get valid access token, refreshing if necessary
 */
async function getValidAccessToken(): Promise<string | null> {
  const accessToken = tokenStorage.getAccessToken()

  if (!accessToken) {
    return (await refreshSession())?.accessToken ?? null
  }

  if (!isTokenExpired(accessToken)) {
    return accessToken
  }

  const result = await refreshSession()
  return result?.accessToken ?? null
}

/**
 * API request options
 */
interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  auth?: boolean
}

/**
 * Make an authenticated API request
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = true, headers: customHeaders, ...init } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((customHeaders as Record<string, string>) || {}),
  }

  if (auth) {
    const token = await getValidAccessToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`

  console.log('[API Request]', init.method || 'GET', url, {
    hasAuth: !!headers['Authorization'],
    body: body ? JSON.stringify(body).slice(0, 100) : undefined,
  })

  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (fetchError) {
    console.error('[API Fetch Error]', init.method || 'GET', url, fetchError)
    throw fetchError
  }

  // Handle 401 - try refresh and retry once
  if (response.status === 401 && auth) {
    const result = await refreshSession()
    if (result) {
      headers['Authorization'] = `Bearer ${result.accessToken}`
      const retryResponse = await fetch(url, {
        ...init,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      })
      if (retryResponse.ok) {
        return retryResponse.json()
      }
    }
    tokenStorage.clearTokens()
  }

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      message: response.statusText || 'Request failed',
    }))
    throw new ApiRequestError(error.message, response.status, error)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

/**
 * API request error with status and details
 */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: ApiError
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

/**
 * API client with typed methods
 */
export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', body }),

  delete: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
}

// ============================================================
// Port Types
// ============================================================

export type PortStatus = 'pending' | 'confirmed'

export interface PortResponse {
  id: string
  indexerPortId: string | null
  name: string
  stealthMetaAddress: string
  chainId: number
  status: PortStatus
  txHash: string | null
  totalReceived: string
  totalCollected: string
  archived: boolean
  createdAt: string
  updatedAt?: string
}

export interface PortsListResponse {
  data: PortResponse[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
  }
}

/** Step 1: Create port (just name/chain, stealth keys added in step 2) */
export interface CreatePortRequest {
  name?: string
  chainId?: number
}

/** Step 2: Update port (includes adding stealth keys after deriving from port.id) */
export interface UpdatePortRequest {
  name?: string
  archived?: boolean
  txHash?: string
  status?: PortStatus
  indexerPortId?: string
  stealthMetaAddress?: string
  viewingKey?: string
}

// ============================================================
// Port API
// ============================================================

export const portsApi = {
  list: (params?: { page?: number; limit?: number; includeArchived?: boolean }) => {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.includeArchived) query.set('includeArchived', 'true')
    const queryString = query.toString()
    return api.get<PortsListResponse>(`/api/v1/ports${queryString ? `?${queryString}` : ''}`)
  },

  get: (id: string) => api.get<PortResponse>(`/api/v1/ports/${id}`),

  create: (data: CreatePortRequest) => api.post<PortResponse>('/api/v1/ports', data),

  update: (id: string, data: UpdatePortRequest) =>
    api.patch<PortResponse>(`/api/v1/ports/${id}`, data),

  delete: (id: string) => api.delete<{ message: string }>(`/api/v1/ports/${id}`),
}

// ============================================================
// Announcement Types (from Ponder indexer via backend)
// ============================================================

export interface AnnouncementResponse {
  id: string
  schemeId: string
  stealthAddress: string
  caller: string
  ephemeralPubKey: string
  metadata: string
  viewTag: number
  receiptHash: string | null
  blockNumber: string
  blockTimestamp: string
  transactionHash: string
  logIndex: number
  chainId: number
}

// ============================================================
// Announcements API (public - no auth required)
// ============================================================

export interface AnnouncementsListResponse {
  data: AnnouncementResponse[]
  hasMore: boolean
  limit: number
  offset: number
}

export const announcementsApi = {
  /**
   * Fetch a single page of announcements from the backend.
   * @param params - Optional filters and pagination (viewTag, stealthAddress, chainId, limit, offset)
   */
  listPage: async (params?: {
    viewTag?: number
    stealthAddress?: string
    chainId?: number
    limit?: number
    offset?: number
  }): Promise<AnnouncementsListResponse> => {
    const query = new URLSearchParams()
    if (params?.viewTag !== undefined) query.set('viewTag', String(params.viewTag))
    if (params?.stealthAddress) query.set('stealthAddress', params.stealthAddress)
    if (params?.chainId !== undefined) query.set('chainId', String(params.chainId))
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.offset) query.set('offset', String(params.offset))
    const queryString = query.toString()

    const url = `${API_BASE_URL}/api/v1/announcements${queryString ? `?${queryString}` : ''}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Announcements API error: ${response.statusText}`)
    }

    return response.json()
  },

  /**
   * Fetch all announcements by paginating through all pages.
   * @param params - Optional filters (viewTag, stealthAddress, chainId)
   * @param pageSize - Results per page (default 500, max 1000)
   */
  list: async (params?: {
    viewTag?: number
    stealthAddress?: string
    chainId?: number
    limit?: number // kept for backward compat, now pageSize
  }): Promise<AnnouncementResponse[]> => {
    const pageSize = Math.min(params?.limit ?? 500, 1000)
    const allAnnouncements: AnnouncementResponse[] = []
    let offset = 0
    let hasMore = true

    while (hasMore) {
      const page = await announcementsApi.listPage({
        viewTag: params?.viewTag,
        stealthAddress: params?.stealthAddress,
        chainId: params?.chainId,
        limit: pageSize,
        offset,
      })

      allAnnouncements.push(...page.data)
      hasMore = page.hasMore
      offset += pageSize
    }

    return allAnnouncements
  },
}

// ============================================================
// Pool Deposit Types (from Ponder indexer via backend)
// ============================================================

export interface PoolDepositResponse {
  id: string
  pool: string
  depositor: string
  commitment: string
  label: string
  value: string
  precommitmentHash: string
  blockNumber: string
  blockTimestamp: string
  transactionHash: string
  logIndex: number
  chainId: number
}

// ============================================================
// Pool Deposits API (public - no auth required)
// ============================================================

export interface PoolDepositsListResponse {
  data: PoolDepositResponse[]
  hasMore: boolean
  limit: number
  offset: number
}

export const poolDepositsApi = {
  /**
   * Fetch a single page of pool deposits from the backend.
   * @param params - Optional filters and pagination (pool, chainId, limit, offset)
   */
  listPage: async (params?: {
    pool?: string
    chainId?: number
    limit?: number
    offset?: number
  }): Promise<PoolDepositsListResponse> => {
    const query = new URLSearchParams()
    if (params?.pool) query.set('pool', params.pool)
    if (params?.chainId !== undefined) query.set('chainId', String(params.chainId))
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.offset) query.set('offset', String(params.offset))
    const queryString = query.toString()

    const url = `${API_BASE_URL}/api/v1/deposits${queryString ? `?${queryString}` : ''}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Deposits API error: ${response.statusText}`)
    }

    return response.json()
  },

  /**
   * Fetch all pool deposits by paginating through all pages.
   * @param params - Optional filters (pool, chainId)
   * @param pageSize - Results per page (default 500, max 1000)
   */
  list: async (params?: {
    pool?: string
    chainId?: number
    limit?: number
  }): Promise<PoolDepositResponse[]> => {
    const pageSize = Math.min(params?.limit ?? 500, 1000)
    const allDeposits: PoolDepositResponse[] = []
    let offset = 0
    let hasMore = true

    while (hasMore) {
      const page = await poolDepositsApi.listPage({
        pool: params?.pool,
        chainId: params?.chainId,
        limit: pageSize,
        offset,
      })

      allDeposits.push(...page.data)
      hasMore = page.hasMore
      offset += pageSize
    }

    return allDeposits
  },
}

// ============================================================
// Registry Types (verified balance data via backend)
// ============================================================

export interface VerifiedBalanceInfo {
  stealthAddress: string
  verifiedBalance: string
  canDeposit: boolean
}

export interface VerifiedBalancesResponse {
  data: VerifiedBalanceInfo[]
}

// ============================================================
// Registry API (protected - requires auth)
// ============================================================

export const registryApi = {
  /**
   * Fetch verified balances for multiple stealth addresses.
   * @param addresses - Array of stealth addresses to check
   * @param chainId - Chain ID (optional, default: 5000 for Mantle)
   * @param asset - Asset address (optional, default: native token)
   */
  getVerifiedBalances: async (
    addresses: string[],
    chainId?: number,
    asset?: string
  ): Promise<VerifiedBalanceInfo[]> => {
    const result = await api.post<VerifiedBalancesResponse>('/api/v1/registry/verified-balances', {
      addresses,
      chainId,
      asset,
    })
    return result.data
  },
}
