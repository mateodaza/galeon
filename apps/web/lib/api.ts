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

/** Indexer API URL - Ponder indexer for on-chain data (Ponder REST API runs on 42069) */
export const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL || 'http://localhost:42069'

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

export interface SyncResponse {
  ports: number
  synced: number
  existing: number
  scanned: number
  errors?: string[]
}

export const portsApi = {
  list: (params?: { page?: number; limit?: number; includeArchived?: boolean }) => {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.includeArchived) query.set('includeArchived', 'true')
    const queryString = query.toString()
    return api.get<PortsListResponse>(`/api/v1/ports${queryString ? `?${queryString}` : ''}`)
  },

  /**
   * Fetch ALL ports across all pages.
   * Handles pagination automatically to ensure no ports are missed.
   */
  listAll: async (params?: { includeArchived?: boolean }): Promise<PortResponse[]> => {
    const allPorts: PortResponse[] = []
    let page = 1
    const limit = 100

    while (true) {
      const response = await portsApi.list({
        page,
        limit,
        includeArchived: params?.includeArchived,
      })
      allPorts.push(...response.data)

      // Stop if we've fetched all pages
      if (page >= response.meta.lastPage) {
        break
      }
      page++
    }

    return allPorts
  },

  get: (id: string) => api.get<PortResponse>(`/api/v1/ports/${id}`),

  create: (data: CreatePortRequest) => api.post<PortResponse>('/api/v1/ports', data),

  update: (id: string, data: UpdatePortRequest) =>
    api.patch<PortResponse>(`/api/v1/ports/${id}`, data),

  delete: (id: string) => api.delete<{ message: string }>(`/api/v1/ports/${id}`),

  /**
   * Sync all receipts from on-chain announcements.
   * Should be called on session start/refresh.
   */
  sync: () => api.post<SyncResponse>('/api/v1/ports/sync'),
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
// Receipts API (protected - requires auth)
// ============================================================

export interface MarkCollectedResponse {
  updated: number
}

export interface RecalculateTotalsResponse {
  message: string
  portsChecked: number
  portsUpdated: number
}

export const receiptsApi = {
  /**
   * Mark receipts as collected after pool deposit or wallet collect.
   * Updates receipt status and port totals.
   */
  markCollected: async (stealthAddresses: string[]): Promise<MarkCollectedResponse> => {
    return api.post<MarkCollectedResponse>('/api/v1/receipts/mark-collected', { stealthAddresses })
  },

  /**
   * Force recalculate port totals from receipts.
   * Call this if totals are out of sync.
   */
  recalculateTotals: async (): Promise<RecalculateTotalsResponse> => {
    return api.post<RecalculateTotalsResponse>('/api/v1/receipts/recalculate-totals', {})
  },
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

// ============================================================
// Nullifier API (public - check if nullifier is spent)
// ============================================================

export interface NullifierWithdrawal {
  id: string
  pool: string
  processooor: string
  value: string
  spentNullifier: string
  newCommitment: string
  recipient: string | null
  relayer: string | null
  asset: string | null
  feeAmount: string | null
  blockNumber: string
  blockTimestamp: string
  transactionHash: string
  chainId: number
}

export interface NullifierMergeDeposit {
  id: string
  pool: string
  depositor: string
  depositValue: string
  existingNullifierHash: string
  newCommitment: string
  blockNumber: string
  blockTimestamp: string
  transactionHash: string
  chainId: number
}

export interface NullifierCheckResponse {
  spent: boolean
  spentBy: 'withdrawal' | 'merge' | null
  withdrawal: NullifierWithdrawal | null
  mergeDeposit: NullifierMergeDeposit | null
}

export const nullifierApi = {
  /**
   * Check if a nullifier has been spent.
   * Uses the backend API which checks both withdrawals and merge deposits.
   * @param nullifierHex - The nullifier as a hex string (0x-prefixed, 64 chars)
   */
  isSpent: async (nullifierHex: string): Promise<boolean> => {
    const result = await nullifierApi.check(nullifierHex)
    return result.spent
  },

  /**
   * Check a nullifier and get full details about how it was spent.
   * @param nullifierHex - The nullifier as a hex string (0x-prefixed, 64 chars)
   * @param chainId - Optional chain ID filter
   */
  check: async (nullifierHex: string, chainId?: number): Promise<NullifierCheckResponse> => {
    const query = chainId !== undefined ? `?chainId=${chainId}` : ''
    const url = `${API_BASE_URL}/api/v1/nullifiers/${nullifierHex}${query}`
    const response = await fetch(url)

    if (!response.ok) {
      // If error, assume not spent
      console.warn(`Nullifier check failed: ${response.statusText}`)
      return { spent: false, spentBy: null, withdrawal: null, mergeDeposit: null }
    }

    return response.json()
  },

  /**
   * Check multiple nullifiers in parallel.
   * @param nullifierHexes - Array of nullifier hex strings
   * @returns Map of nullifier -> full check result
   */
  checkMultiple: async (nullifierHexes: string[]): Promise<Map<string, NullifierCheckResponse>> => {
    const results = await Promise.all(
      nullifierHexes.map(async (hex) => {
        const result = await nullifierApi.check(hex)
        return [hex, result] as [string, NullifierCheckResponse]
      })
    )
    return new Map(results)
  },
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
// Merge Deposits Types (from Ponder indexer via backend)
// ============================================================

export interface MergeDepositResponse {
  id: string
  pool: string
  depositor: string
  depositValue: string
  existingNullifierHash: string
  newCommitment: string
  blockNumber: string
  blockTimestamp: string
  transactionHash: string
  logIndex: number
  chainId: number
}

export interface MergeDepositsListResponse {
  data: MergeDepositResponse[]
  hasMore: boolean
  limit: number
  offset: number
}

// ============================================================
// Merge Deposits API (public - for deposit recovery)
// ============================================================

export const mergeDepositsApi = {
  /**
   * Fetch a single page of merge deposits from the backend.
   * @param params - Optional filters and pagination
   */
  listPage: async (params?: {
    pool?: string
    depositor?: string
    chainId?: number
    limit?: number
    offset?: number
  }): Promise<MergeDepositsListResponse> => {
    const query = new URLSearchParams()
    if (params?.pool) query.set('pool', params.pool)
    if (params?.depositor) query.set('depositor', params.depositor)
    if (params?.chainId !== undefined) query.set('chainId', String(params.chainId))
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.offset) query.set('offset', String(params.offset))
    const queryString = query.toString()

    const url = `${API_BASE_URL}/api/v1/deposits/merges${queryString ? `?${queryString}` : ''}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Merge deposits API error: ${response.statusText}`)
    }

    return response.json()
  },

  /**
   * Fetch all merge deposits by paginating through all pages.
   * @param params - Optional filters (pool, depositor, chainId)
   */
  list: async (params?: {
    pool?: string
    depositor?: string
    chainId?: number
    limit?: number
  }): Promise<MergeDepositResponse[]> => {
    const pageSize = Math.min(params?.limit ?? 500, 1000)
    const allMerges: MergeDepositResponse[] = []
    let offset = 0
    let hasMore = true

    while (hasMore) {
      const page = await mergeDepositsApi.listPage({
        pool: params?.pool,
        depositor: params?.depositor,
        chainId: params?.chainId,
        limit: pageSize,
        offset,
      })

      allMerges.push(...page.data)
      hasMore = page.hasMore
      offset += pageSize
    }

    return allMerges
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

// ============================================================
// ASP Types (Association Set Provider)
// ============================================================

export interface ASPStatusResponse {
  success: boolean
  data: {
    configured: boolean
    treeSize: number
    treeDepth: number
    localRoot: string
    onChainRoot: string | null
    synced: boolean
    lastProcessedBlock: string
    entrypointAddress: string | null
  }
}

export interface ASPProofResponse {
  success: boolean
  data: {
    root: string
    leaf: string
    index: string
    siblings: string[]
    depth: number
  }
  error?: string
}

export interface ASPRebuildResponse {
  success: boolean
  data: {
    labelsAdded: number
    root: string
    onChainUpdate: {
      updated: boolean
      txHash?: string
      newRoot: string
    } | null
  }
}

// ============================================================
// ASP API (public - needed for withdrawal proofs)
// ============================================================

// ============================================================
// Merkle Leaves Types (from Ponder indexer via backend API)
// ============================================================

export interface MerkleLeafResponse {
  id: string
  pool: string
  leafIndex: string
  leaf: string
  root: string
  blockNumber: string
  blockTimestamp: string
  transactionHash: string
  logIndex: number
  chainId: number
}

export interface MerkleLeavesListResponse {
  data: MerkleLeafResponse[]
  hasMore: boolean
  limit: number
  offset: number
}

// ============================================================
// Merkle Leaves API (public - fetch all tree leaves via backend)
// ============================================================

export const merkleLeavesApi = {
  /**
   * Fetch a single page of merkle leaves for a pool via the backend API.
   * This includes BOTH deposit commitments AND withdrawal change commitments.
   * Must be used for building the state tree (not poolDepositsApi which only has deposits).
   *
   * @param pool - Pool address
   * @param options - Pagination options
   */
  listPage: async (
    pool: string,
    options?: { limit?: number; offset?: number; chainId?: number }
  ): Promise<MerkleLeavesListResponse> => {
    const query = new URLSearchParams()
    query.set('pool', pool)
    if (options?.chainId !== undefined) query.set('chainId', String(options.chainId))
    if (options?.limit) query.set('limit', String(options.limit))
    if (options?.offset) query.set('offset', String(options.offset))

    const url = `${API_BASE_URL}/api/v1/deposits/leaves?${query.toString()}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Merkle leaves API error: ${response.statusText}`)
    }

    return response.json()
  },

  /**
   * Fetch all merkle leaves for a pool by paginating through all pages.
   *
   * @param pool - Pool address
   * @param limit - Max results per page (default 1000, max 5000)
   */
  list: async (pool: string, limit = 1000): Promise<MerkleLeafResponse[]> => {
    const pageSize = Math.min(limit, 5000)
    const allLeaves: MerkleLeafResponse[] = []
    let offset = 0
    let hasMore = true

    while (hasMore) {
      const page = await merkleLeavesApi.listPage(pool, { limit: pageSize, offset })
      allLeaves.push(...page.data)
      hasMore = page.hasMore
      offset += pageSize
    }

    return allLeaves
  },

  /**
   * Get all commitment values for building the state tree.
   * Returns leaves ordered by leafIndex for correct tree construction.
   *
   * @param pool - Pool address
   */
  getCommitments: async (pool: string): Promise<bigint[]> => {
    const leaves = await merkleLeavesApi.list(pool)
    // Sort by leafIndex to ensure correct order
    leaves.sort((a, b) => Number(a.leafIndex) - Number(b.leafIndex))
    return leaves.map((l) => BigInt(l.leaf))
  },
}

export const aspApi = {
  /**
   * Get ASP tree status and sync info.
   */
  getStatus: async (): Promise<ASPStatusResponse['data']> => {
    const url = `${API_BASE_URL}/api/v1/asp/status`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`ASP API error: ${response.statusText}`)
    }

    const result: ASPStatusResponse = await response.json()
    return result.data
  },

  /**
   * Get Merkle proof for a specific label in the ASP tree.
   * Required for withdrawal proofs.
   * @param label - The deposit label as a string (bigint)
   */
  getProof: async (
    label: string
  ): Promise<{
    root: bigint
    leaf: bigint
    index: bigint
    siblings: bigint[]
    depth: number
  }> => {
    const url = `${API_BASE_URL}/api/v1/asp/proof/${label}`
    const response = await fetch(url)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || `ASP proof error: ${response.statusText}`)
    }

    const result: ASPProofResponse = await response.json()

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to get ASP proof')
    }

    // Convert string values to bigint
    return {
      root: BigInt(result.data.root),
      leaf: BigInt(result.data.leaf),
      index: BigInt(result.data.index),
      siblings: result.data.siblings.map((s) => BigInt(s)),
      depth: result.data.depth,
    }
  },

  /**
   * Force rebuild the ASP tree and update on-chain root.
   * Used for debugging/testing.
   */
  rebuild: async (): Promise<ASPRebuildResponse['data']> => {
    const url = `${API_BASE_URL}/api/v1/asp/rebuild`
    const response = await fetch(url, { method: 'POST' })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || `ASP rebuild error: ${response.statusText}`)
    }

    const result: ASPRebuildResponse = await response.json()
    return result.data
  },
}

// ============================================================
// Health Types (System health and pre-flight checks)
// ============================================================

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy'

export interface ComponentHealth {
  component: 'indexer' | 'asp' | 'stateTree' | 'chain'
  status: HealthStatus
  details: {
    lastBlock?: number
    chainHead?: number
    blocksBehind?: number
    localRoot?: string
    onChainRoot?: string
    rootSynced?: boolean
    error?: string
  }
}

export interface OperationAvailability {
  available: boolean
  blockers: string[]
}

export interface SystemHealth {
  overall: HealthStatus
  components: ComponentHealth[]
  operations: {
    quickPay: OperationAvailability
    stealthPay: OperationAvailability
    privateSend: OperationAvailability
  }
  timestamp: number
}

export interface PreflightChecks {
  indexerSynced: boolean
  aspSynced: boolean
  stateTreeValid: boolean
  labelExists: boolean
}

export interface PreflightResult {
  canProceed: boolean
  checks: PreflightChecks
  errors: string[]
  warnings: string[]
  retryAfterMs?: number
}

export interface IndexerHealth {
  status: HealthStatus
  lastBlock: number | null
  chainHead: number | null
  blocksBehind: number | null
  timestamp: number
}

// ============================================================
// Health API (public - sync status and pre-flight checks)
// ============================================================

export const healthApi = {
  /**
   * Get overall system health status.
   * @param chainId - Optional chain ID
   */
  getStatus: async (chainId?: number): Promise<SystemHealth> => {
    const query = chainId !== undefined ? `?chainId=${chainId}` : ''
    const url = `${API_BASE_URL}/api/v1/health/status${query}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Health API error: ${response.statusText}`)
    }

    return response.json()
  },

  /**
   * Run pre-flight check for an operation.
   * @param operation - Operation type: 'quickpay', 'stealthpay', or 'privatesend'
   * @param params - Operation-specific params (poolAddress, depositLabel for privatesend)
   */
  preflight: async (
    operation: 'quickpay' | 'stealthpay' | 'privatesend',
    params?: {
      poolAddress?: string
      depositLabel?: string
      chainId?: number
    }
  ): Promise<PreflightResult> => {
    const query = new URLSearchParams()
    if (params?.poolAddress) query.set('poolAddress', params.poolAddress)
    if (params?.depositLabel) query.set('depositLabel', params.depositLabel)
    if (params?.chainId !== undefined) query.set('chainId', String(params.chainId))
    const queryString = query.toString()

    const url = `${API_BASE_URL}/api/v1/health/preflight/${operation}${queryString ? `?${queryString}` : ''}`
    const response = await fetch(url)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || `Preflight check failed: ${response.statusText}`)
    }

    return response.json()
  },

  /**
   * Get indexer sync status specifically.
   * @param chainId - Optional chain ID
   */
  getIndexerStatus: async (chainId?: number): Promise<IndexerHealth> => {
    const query = chainId !== undefined ? `?chainId=${chainId}` : ''
    const url = `${API_BASE_URL}/api/v1/health/indexer${query}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Indexer health API error: ${response.statusText}`)
    }

    return response.json()
  },

  /**
   * Check if system is healthy enough for a specific operation.
   * Convenience method that combines getStatus + operation check.
   */
  canPerformOperation: async (
    operation: 'quickPay' | 'stealthPay' | 'privateSend',
    chainId?: number
  ): Promise<{ available: boolean; blockers: string[] }> => {
    const health = await healthApi.getStatus(chainId)
    return health.operations[operation]
  },
}

// ============================================================
// Compliance Types (Tax reports and compliance data)
// ============================================================

export type PeriodType = 'annual' | 'quarterly' | 'monthly' | 'custom'

export type Jurisdiction = 'US' | 'CO'

export interface TaxSummaryParams {
  period: PeriodType
  year?: number
  quarter?: number // 1-4
  month?: number // 1-12
  startDate?: string // YYYY-MM-DD
  endDate?: string // YYYY-MM-DD
  portId?: string
  jurisdiction?: Jurisdiction // US = English/USD, CO = Spanish/COP
}

export interface PeriodInfo {
  type: PeriodType
  year?: number
  quarter?: number
  month?: number
  startDate: string
  endDate: string
  label: string
}

export interface TokenSummary {
  token: string
  symbol: string
  decimals: number
  totalWei: string
  totalFormatted: string
  totalCop: number
  transactionCount: number
  rateCop: number
}

export interface PortSummary {
  portId: string
  portName: string
  type: string
  chainId: number
  totalReceived: string
  totalReceivedCop: number
  transactionCount: number
  status: string
}

export interface TransactionDetail {
  id: string
  portId: string
  portName: string | undefined
  receiptHash: string | null
  stealthAddress: string | null
  payerAddress: string | null
  amount: string | null
  amountFormatted: string
  amountCop: number
  currency: string | null
  tokenAddress: string | null
  txHash: string
  blockNumber: string | null
  timestamp: string | null
  status: string
}

export interface SentPaymentDetail {
  id: string
  recipientAddress: string
  recipientPortName: string | null
  amount: string
  amountFormatted: string
  amountCop: number
  currency: string
  tokenAddress: string | null
  source: 'wallet' | 'port' | 'pool'
  sourceLabel: string
  txHash: string
  chainId: number
  timestamp: string | null
  status: string
  memo: string | null
}

export interface TaxSummaryReport {
  reportId: string
  reportType: string
  generatedAt: string
  period: PeriodInfo
  user: { walletAddress: string }
  ports: PortSummary[]
  transactions: TransactionDetail[]
  sentPayments: SentPaymentDetail[]
  summary: {
    totalTransactions: number
    totalReceivedByToken: TokenSummary[]
    grandTotalReceivedCop: number
    totalSentTransactions: number
    totalSentByToken: TokenSummary[]
    grandTotalSentCop: number
    netBalanceCop: number
  }
  compliance: {
    jurisdiction: string
    uiafThreshold: number
    transactionsAboveThreshold: number
    note: string
  }
  metadata: {
    ratesUsed: Record<string, number>
    rateSource: string
    generatedBy: string
  }
}

// ============================================================
// Compliance API (protected - requires auth)
// ============================================================

// ============================================================
// Sent Payment Types (payment history)
// ============================================================

export type PaymentSource = 'wallet' | 'port' | 'pool'
export type SentPaymentStatus = 'pending' | 'confirmed' | 'failed'

export interface SentPayment {
  id: string
  txHash: string
  chainId: number
  recipientAddress: string
  recipientPortName: string | null
  amount: string
  currency: string
  tokenAddress: string | null
  source: PaymentSource
  memo: string | null
  status: SentPaymentStatus
  blockNumber: string | null
  createdAt: string
}

export interface CreateSentPaymentParams {
  txHash: string
  chainId: number
  recipientAddress: string
  recipientPortName?: string
  amount: string
  currency: string
  tokenAddress?: string | null
  source: PaymentSource
  memo?: string
}

export interface SentPaymentsListParams {
  page?: number
  limit?: number
  source?: PaymentSource
  status?: SentPaymentStatus
}

export interface SentPaymentStats {
  totalPayments: number
  confirmedPayments: number
  bySource: {
    wallet: { total: string; count: number }
    port: { total: string; count: number }
    pool: { total: string; count: number }
  }
  grandTotal: string
}

// ============================================================
// Sent Payments API (protected - requires auth)
// ============================================================

export const sentPaymentsApi = {
  /**
   * List sent payments for the authenticated user
   */
  list: async (
    params: SentPaymentsListParams = {}
  ): Promise<{
    data: SentPayment[]
    meta: { total: number; perPage: number; currentPage: number; lastPage: number }
  }> => {
    const query = new URLSearchParams()
    if (params.page) query.set('page', String(params.page))
    if (params.limit) query.set('limit', String(params.limit))
    if (params.source) query.set('source', params.source)
    if (params.status) query.set('status', params.status)

    return api.get(`/api/v1/sent-payments?${query.toString()}`)
  },

  /**
   * Record a new sent payment
   */
  create: async (
    params: CreateSentPaymentParams
  ): Promise<{
    id: string
    txHash: string
    chainId: number
    source: PaymentSource
    status: SentPaymentStatus
    createdAt: string
  }> => {
    return api.post('/api/v1/sent-payments', params)
  },

  /**
   * Get a single sent payment by ID
   */
  get: async (id: string): Promise<SentPayment> => {
    return api.get(`/api/v1/sent-payments/${id}`)
  },

  /**
   * Get sent payment statistics
   */
  getStats: async (): Promise<SentPaymentStats> => {
    return api.get('/api/v1/sent-payments/stats')
  },
}

export const complianceApi = {
  /**
   * Get tax summary report as JSON.
   * @param params - Period and optional filters
   */
  getTaxSummary: async (params: TaxSummaryParams): Promise<TaxSummaryReport> => {
    const query = new URLSearchParams()
    query.set('period', params.period)
    if (params.year !== undefined) query.set('year', String(params.year))
    if (params.quarter !== undefined) query.set('quarter', String(params.quarter))
    if (params.month !== undefined) query.set('month', String(params.month))
    if (params.startDate) query.set('startDate', params.startDate)
    if (params.endDate) query.set('endDate', params.endDate)
    if (params.portId) query.set('portId', params.portId)
    if (params.jurisdiction) query.set('jurisdiction', params.jurisdiction)

    return api.get<TaxSummaryReport>(`/api/v1/compliance/tax-summary?${query.toString()}`)
  },

  /**
   * Download tax summary report as PDF.
   * Returns the PDF as a Blob for download.
   * @param params - Period and optional filters
   */
  getTaxSummaryPdf: async (params: TaxSummaryParams): Promise<Blob> => {
    const query = new URLSearchParams()
    query.set('period', params.period)
    if (params.year !== undefined) query.set('year', String(params.year))
    if (params.quarter !== undefined) query.set('quarter', String(params.quarter))
    if (params.month !== undefined) query.set('month', String(params.month))
    if (params.startDate) query.set('startDate', params.startDate)
    if (params.endDate) query.set('endDate', params.endDate)
    if (params.portId) query.set('portId', params.portId)
    if (params.jurisdiction) query.set('jurisdiction', params.jurisdiction)

    const token = tokenStorage.getAccessToken()
    const response = await fetch(
      `${API_BASE_URL}/api/v1/compliance/tax-summary/pdf?${query.toString()}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    )

    if (!response.ok) {
      throw new Error('Failed to generate PDF')
    }

    return response.blob()
  },
}
